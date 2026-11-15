import cds from "@sap/cds";

export default class TranslatorService extends cds.ApplicationService {
  init() {
    const { LanguagePairs, Offers, Withdrawals } = this.entities;

    // The owner is always the logged-in user
    this.before("CREATE", LanguagePairs, (req) => {
      req.data.translator_ID = req.user.id;
    });

    // An offer can only be created for the translator's own language pair
    this.before("CREATE", Offers, async (req) => {
      await assertOwnPair(req, req.data.languagePair_ID);
    });

    this.before("UPDATE", Offers, async (req) => {
      // @restrict's where checks the existing row, not the new values.
      // Without this check an offer could be moved to someone else's pair.
      if ("languagePair_ID" in req.data) {
        return req.reject(400, "The language pair of an offer cannot be changed");
      }

      // A price change needs a new admin approval
      if ("pricePerWord" in req.data) {
        const current = await SELECT.one
          .from("marketplace.Offers", req.data.ID)
          .columns("pricePerWord");
        if (current && Number(current.pricePerWord) !== Number(req.data.pricePerWord)) {
          req.data.status = "Pending";
        }
      }
    });

    this.before("CREATE", Withdrawals, async (req) => {
      req.data.translator_ID = req.user.id;

      const amount = Number(req.data.amount);
      if (!(amount > 0)) return req.reject(400, "Amount must be greater than 0");

      // Available = balance minus withdrawals still waiting for approval,
      // otherwise several requests together could exceed the balance
      const user = await SELECT.one
        .from("marketplace.Users", req.user.id)
        .columns("cashBalance");
      const pending = await SELECT.one
        .from("marketplace.Withdrawals")
        .columns("coalesce(sum(amount), 0) as total")
        .where({ translator_ID: req.user.id, status: "Requested" });

      const available = Number(user?.cashBalance ?? 0) - Number(pending.total);
      if (amount > available) {
        return req.reject(400, `Insufficient balance. Available: ${available.toFixed(2)}`);
      }
    });

    return super.init();
  }
}

async function assertOwnPair(req, pairId) {
  const pair = await SELECT.one.from("marketplace.LanguagePairs", pairId);
  if (!pair) return req.reject(400, "Language pair not found");
  if (pair.translator_ID !== req.user.id) {
    return req.reject(403, "You can only add offers to your own language pairs");
  }
}
