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

  // Status changes only through bound actions, never through UPDATE.
  @restrict: [{
    grant: ['READ', 'accept', 'decline', 'requestChanges', 'deliver'],
    where: 'offer.languagePair.translator_ID = $user'
  }]
  entity Orders as projection on db.Orders {
    ID, offer, status, wordCount, translatorPrice,
    title, instructions, sourceText, deliveredText, createdAt,
    events
  } actions {
    action accept(comment : String(1000)) returns Orders;
    action decline(@mandatory comment : String(1000)) returns Orders;
    action requestChanges(@mandatory comment : String(1000)) returns Orders;
    action deliver(
      @mandatory deliveredText : LargeString,
      comment : String(1000)
    ) returns Orders;
  };

  @readonly
  @restrict: [{ grant: 'READ', where: 'order.offer.languagePair.translator_ID = $user' }]
  entity OrderEvents as projection on db.OrderEvents {
    ID, order, fromStatus, toStatus, comment, actor, createdAt
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