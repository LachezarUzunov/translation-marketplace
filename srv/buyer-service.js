import cds from "@sap/cds";
import { calculatePrice } from "./lib/pricing.js";
import { transitionOrder } from "./lib/order-transition.js";

export default class BuyerService extends cds.ApplicationService {
  init() {
    const { Orders, Offers, Me } = this.entities;

    // BuyerService.Offers already filters to approved + active offers
    // of approved pairs, so we reuse it as the "catalog" check.
    const findAvailableOffer = async (req, offerId) => {
      const offer = await SELECT.one.from(Offers, offerId);
      if (!offer) req.reject(400, "Offer is not available");
      return offer;
    };

    this.on("quote", async (req) => {
      const { offer: offerId, wordCount } = req.data;
      const offer = await findAvailableOffer(req, offerId);
      const { buyerPrice } = calculatePrice(
        offer.pricePerWord,
        wordCount,
        cds.env.marketplace.commission,
      );
      return { offer: offerId, wordCount, pricePerWord: offer.pricePerWord, buyerPrice };
    });

    this.on("topUp", async (req) => {
      const { amount } = req.data;

      // Atomic increment in the database, never read-modify-write in JS
      const updated = await UPDATE("marketplace.Users")
        .with({ creditBalance: { "+=": amount } })
        .where({ ID: req.user.id });
      if (updated !== 1) return req.reject(404, "User profile not found");

      await INSERT.into("marketplace.Transactions").entries({
        user_ID: req.user.id,
        type: "TopUp",
        amount,
        currency: "Credits",
      });

      return SELECT.one.from(Me, req.user.id);
    });

    // We replace the generic CREATE: the order needs fields the buyer's
    // projection does not expose (translatorPrice, commission), plus the
    // balance hold. Everything runs in the request's single DB transaction:
    // if any step fails, all of them are rolled back.
    this.on("CREATE", Orders, async (req) => {
      const { offer_ID, wordCount, title, instructions, sourceText } = req.data;
      const offer = await findAvailableOffer(req, offer_ID);
      const prices = calculatePrice(
        offer.pricePerWord,
        wordCount,
        cds.env.marketplace.commission,
      );

      // 1. Hold the credits. Check and update in ONE statement, so two
      //    parallel orders cannot both pass the balance check.
      const held = await UPDATE("marketplace.Users")
        .with({ creditBalance: { "-=": prices.buyerPrice } })
        .where({ ID: req.user.id, creditBalance: { ">=": prices.buyerPrice } });
      if (held !== 1) {
        return req.reject(400, `Insufficient credits. Required: ${prices.buyerPrice.toFixed(2)}`);
      }

      // 2. The order. Fields are listed explicitly: whatever else the client
      //    sent (status, buyer_ID, prices...) is ignored.
      const ID = cds.utils.uuid();
      await INSERT.into("marketplace.Orders").entries({
        ID,
        buyer_ID: req.user.id,
        offer_ID,
        status: "Pending",
        wordCount,
        ...prices,
        title,
        instructions,
        sourceText,
      });

      // 3. Ledger entry for the hold
      await INSERT.into("marketplace.Transactions").entries({
        user_ID: req.user.id,
        order_ID: ID,
        type: "Hold",
        amount: -prices.buyerPrice,
        currency: "Credits",
      });

      // 4. History: the order was created in status Pending
      await INSERT.into("marketplace.OrderEvents").entries({
        order_ID: ID,
        fromStatus: null,
        toStatus: "Pending",
        actor: req.user.id,
      });

      return SELECT.one.from(Orders, ID);
    });

    // ---------- Status transitions (bound actions) ----------

    // TODO Day 7: refund the held credits on cancel
    this.on("cancel", Orders, async (req) => {
      const { ID } = await transitionOrder(req, "cancel", { comment: req.data.comment });
      return SELECT.one.from(Orders, ID);
    });

    this.on("resubmit", Orders, async (req) => {
      const { instructions, comment } = req.data;
      const { ID } = await transitionOrder(req, "resubmit", { set: { instructions }, comment });
      return SELECT.one.from(Orders, ID);
    });

    // TODO Day 7: release translatorPrice to the translator + commission to the platform
    this.on("approve", Orders, async (req) => {
      const { ID } = await transitionOrder(req, "approve", { comment: req.data.comment });
      return SELECT.one.from(Orders, ID);
    });

    this.on("requestRevision", Orders, async (req) => {
      const { ID } = await transitionOrder(req, "requestRevision", { comment: req.data.comment });
      return SELECT.one.from(Orders, ID);
    });

    return super.init();
  }
}
