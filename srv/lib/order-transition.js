import { TRANSITIONS, nextStatus } from "./order-workflow.js";

/**
 * Executes a status transition for the order addressed by a bound action.
 * Runs inside the request's DB transaction.
 *
 * @param {object} req      CAP request of the bound action
 * @param {string} action   key of TRANSITIONS
 * @param {object} [opts]
 * @param {object} [opts.set]      extra fields to write together with the status
 * @param {string} [opts.comment]  stored in OrderEvents
 * @returns {Promise<{ ID: string, from: string, to: string, order: object }>}
 */
export async function transitionOrder(req, action, { set = {}, comment } = {}) {
  const ID = orderIdOf(req);

  const order = await SELECT.one
    .from("marketplace.Orders")
    .columns(
      "ID", "status", "buyer_ID", "buyerPrice", "translatorPrice", "commission",
      "offer.languagePair.translator_ID as translator_ID",
    )
    .where({ ID });

  // Not found and "not yours" give the same answer, so we don't
  // reveal that someone else's order exists.
  const owner = TRANSITIONS[action].by === "buyer" ? order?.buyer_ID : order?.translator_ID;
  if (!order || owner !== req.user.id) return req.reject(404, "Order not found");

  const next = nextStatus(action, order.status);
  if (!next.ok) return req.reject(409, next.reason);

  // Optimistic concurrency: the update only succeeds if the status is still
  // the one we read. A parallel transition makes this update 0 rows.
  const updated = await UPDATE("marketplace.Orders")
    .set({ status: next.to, ...set })
    .where({ ID, status: order.status });
  if (updated !== 1) {
    return req.reject(409, "The order was changed by another request. Reload and retry.");
  }

  await INSERT.into("marketplace.OrderEvents").entries({
    order_ID: ID,
    fromStatus: order.status,
    toStatus: next.to,
    comment,
    actor: req.user.id,
  });

  return { ID, from: order.status, to: next.to, order };
}

// Bound action on Orders(<ID>): the key arrives in req.params
function orderIdOf(req) {
  const key = req.params.at(-1);
  return typeof key === "object" ? key.ID : key;
}
