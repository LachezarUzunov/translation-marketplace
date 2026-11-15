import cds from "@sap/cds";
import { calculatePrice } from "./lib/pricing.js";

export default class BuyerService extends cds.ApplicationService {
  init() {
    const { Orders, Offers } = this.entities;

    // BuyerService.Offers already filters to approved + active offers
    // of approved pairs, so we reuse it as the "catalog" check.
    const findAvailableOffer = async (req, offerId) => {
      const offer = await SELECT.one.from(Offers, offerId);
      if (!offer) req.reject(400, "Offer is not available");
      return offer;
    };

    this.on("quote", async (req) => {
      const { offer: offerId, wordCount } = req.data;
      if (!Number.isInteger(wordCount) || wordCount < 1 || wordCount > 1000000) {
        return req.reject(400, "wordCount must be between 1 and 1000000");
      }

      const offer = await findAvailableOffer(req, offerId);
      const { buyerPrice } = calculatePrice(
        offer.pricePerWord,
        wordCount,
        cds.env.marketplace.commission,
      );

      return { offer: offerId, wordCount, pricePerWord: offer.pricePerWord, buyerPrice };
    });

    this.before("CREATE", Orders, async (req) => {
      req.data.buyer_ID = req.user.id;
      await findAvailableOffer(req, req.data.offer_ID);
    });

    return super.init();
  }
}
