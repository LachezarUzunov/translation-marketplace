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

  @restrict: [
    { grant: 'READ', where: 'buyer_ID = $user' },
    { grant: 'CREATE' }
  ]
  entity Orders as projection on db.Orders {
    ID, buyer, offer, status, wordCount, buyerPrice,
    title, instructions, sourceText, deliveredText, createdAt
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
  function quote(offer : UUID, wordCount : Integer) returns Quote;
}

annotate BuyerService.Orders with {
  buyer         @readonly;
  status        @readonly;
  buyerPrice    @readonly;
  deliveredText @readonly;
};