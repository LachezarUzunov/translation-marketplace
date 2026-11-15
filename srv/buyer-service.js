import cds from "@sap/cds";

export default class BuyerService extends cds.ApplicationService {
  init() {
    const { Orders, Offers } = this.entities;

    this.before("CREATE", Orders, async (req) => {
      req.data.buyer_ID = req.user.id;

      // BuyerService.Offers already filters to approved + active offers
      // of approved pairs, so we reuse it as the "catalog" check.
      const offer = await SELECT.one.from(Offers, req.data.offer_ID);
      if (!offer) return req.reject(400, "Offer is not available");
    });

    return super.init();
  }
}
