using marketplace as db from '../db/schema';

@requires: 'Translator'
service TranslatorService {

  @restrict: [{ grant: 'READ', where: 'ID = $user' }]
  entity Me as projection on db.Users { ID, name, email, cashBalance };

  @restrict: [
    { grant: ['READ', 'UPDATE', 'DELETE'], where: 'translator_ID = $user' },
    { grant: 'CREATE' }
  ]
  entity LanguagePairs as projection on db.LanguagePairs;

  @restrict: [
    { grant: ['READ', 'UPDATE', 'DELETE'], where: 'languagePair.translator_ID = $user' },
    { grant: 'CREATE' }
  ]
  entity Offers as projection on db.Offers;

  @restrict: [{ grant: 'READ', where: 'offer.languagePair.translator_ID = $user' }]
  entity Orders as projection on db.Orders {
    ID, offer, status, wordCount, translatorPrice,
    title, instructions, sourceText, deliveredText, createdAt
  };

  @restrict: [
    { grant: 'READ', where: 'translator_ID = $user' },
    { grant: 'CREATE' }
  ]
  entity Withdrawals as projection on db.Withdrawals;

  @restrict: [{ grant: 'READ', where: 'user_ID = $user' }]
  entity Transactions as projection on db.Transactions {
    ID, user, order, type, amount, currency, createdAt
  };
}

annotate TranslatorService.LanguagePairs with {
  translator @readonly;
  status     @readonly;
};
annotate TranslatorService.Offers with { status @readonly; };
annotate TranslatorService.Withdrawals with {
  translator @readonly;
  status     @readonly;
};