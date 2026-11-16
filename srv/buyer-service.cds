using marketplace as db from '../db/schema';

@requires: 'Buyer'
service BuyerService {

  // Каталог: одобрени и активни оферти на одобрени езикови двойки
  @readonly
  entity Offers as projection on db.Offers {
    ID,
    type,
    languagePair.sourceLanguage  as sourceLanguage,
    languagePair.targetLanguage  as targetLanguage,
    languagePair.yearsExperience as yearsExperience,
    pricePerWord,
    languagePair.translator.name as translatorName
  } where status = 'Approved' and active = true and languagePair.status = 'Approved';

  @restrict: [{ grant: 'READ', where: 'ID = $user' }]
  entity Me as projection on db.Users { ID, name, email, creditBalance };

  // Status changes only through bound actions, never through UPDATE.
  @restrict: [
    { grant: ['READ', 'cancel', 'resubmit', 'approve', 'requestRevision'], where: 'buyer_ID = $user' },
    { grant: 'CREATE' }
  ]
  entity Orders as projection on db.Orders {
    ID, buyer, offer, status, wordCount, buyerPrice,
    title, instructions, sourceText, deliveredText, createdAt,
    events
  } actions {
    action cancel(comment : String(1000)) returns Orders;
    // the buyer answers the translator's questions by updating the instructions
    action resubmit(
      @mandatory instructions : String(2000),
      comment : String(1000)
    ) returns Orders;
    action approve(comment : String(1000)) returns Orders;
    action requestRevision(@mandatory comment : String(1000)) returns Orders;
  };

  @readonly
  @restrict: [{ grant: 'READ', where: 'order.buyer_ID = $user' }]
  entity OrderEvents as projection on db.OrderEvents {
    ID, order, fromStatus, toStatus, comment, actor, createdAt
  };

  @restrict: [{ grant: 'READ', where: 'user_ID = $user' }]
  entity Transactions as projection on db.Transactions {
    ID, user, order, type, amount, currency, createdAt
  };

  // Price preview without creating an order.
  // Returns only buyerPrice: the buyer must not see translatorPrice / commission.
  type Quote {
    offer        : UUID;
    wordCount    : Integer;
    pricePerWord : db.PricePerWord;
    buyerPrice   : db.Money;
  }
  function quote(
    @mandatory offer : UUID,
    @mandatory @assert.range: [1, 1000000] wordCount : Integer
  ) returns Quote;

  // Mock payment: adds credits to the buyer's balance (1 credit = 1 USD).
  // In production this would be triggered by a payment provider webhook.
  action topUp(
    @mandatory @assert.range: [1, 10000] amount : db.Money
  ) returns Me;
}

annotate BuyerService.Orders with {
  buyer         @readonly;
  status        @readonly;
  buyerPrice    @readonly;
  deliveredText @readonly;
};