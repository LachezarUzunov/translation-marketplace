const cds = require("@sap/cds");

module.exports = class TranslatorService extends cds.ApplicationService {
  init() {
    const { LanguagePairs, Offers, Withdrawals } = this.entities;

    // Собственикът винаги е логнатият потребител
    this.before("CREATE", LanguagePairs, (req) => {
      req.data.translator_ID = req.user.id;
    });

    this.before("CREATE", Withdrawals, (req) => {
      req.data.translator_ID = req.user.id;
    });

    // Оферта може да се създаде само за собствена езикова двойка
    this.before("CREATE", Offers, async (req) => {
      const pair = await SELECT.one
        .from("marketplace.LanguagePairs")
        .where({ ID: req.data.languagePair_ID });

      if (!pair) return req.reject(400, "Language pair not found");
      if (pair.translator_ID !== req.user.id) {
        return req.reject(
          403,
          "You can only add offers to your own language pairs",
        );
      }
    });

    return super.init();
  }
};
