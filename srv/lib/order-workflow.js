/**
 * Order state machine: the single source of truth for which action
 * may move an order from which status to which status, and who may do it.
 *
 * Pure data + pure function: no database, unit-testable.
 */
export const TRANSITIONS = {
  // translator
  accept:          { by: "translator", from: ["Pending"], to: "Accepted" },
  // not "reject": that name clashes with ApplicationService.reject()
  decline:         { by: "translator", from: ["Pending"], to: "Rejected" },
  requestChanges:  { by: "translator", from: ["Pending"], to: "ChangesRequested" },
  deliver:         { by: "translator", from: ["Accepted", "RevisionRequested"], to: "Delivered" },
  // buyer
  resubmit:        { by: "buyer", from: ["ChangesRequested"], to: "Pending" },
  cancel:          { by: "buyer", from: ["Pending", "ChangesRequested"], to: "Cancelled" },
  approve:         { by: "buyer", from: ["Delivered"], to: "Completed" },
  requestRevision: { by: "buyer", from: ["Delivered"], to: "RevisionRequested" },
};

/**
 * @returns {{ ok: true, to: string } | { ok: false, reason: string }}
 */
export function nextStatus(action, currentStatus) {
  const t = TRANSITIONS[action];
  if (!t) return { ok: false, reason: `Unknown action '${action}'` };
  if (!t.from.includes(currentStatus)) {
    return { ok: false, reason: `Cannot ${action} an order in status ${currentStatus}` };
  }
  return { ok: true, to: t.to };
}
