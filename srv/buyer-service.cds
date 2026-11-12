using marketplace as db from '../db/schema';

@requires: 'Buyer'
service BuyerService {

  // Каталог: само одобрени и активни оферти на одобрени сайтове
  @readonly
  entity Offers as projection on db.Offers {
    ID,
    type,
    site.url          as siteUrl,
    site.domainRating as domainRating
  } where status = 'Approved' and active = true and site.status = 'Approved';

  // Собственият профил и баланс
  @restrict: [{ grant: 'READ', where: 'ID = $user' }]
  entity Me as projection on db.Users { ID, name, email, creditBalance };

  @restrict: [
    { grant: 'READ', where: 'buyer_ID = $user' },
    { grant: 'CREATE' }
  ]
  entity Orders as projection on db.Orders {
    ID, buyer, offer, status, buyerPrice,
    keywords, anchorText, wordCount, publishedUrl, createdAt
  };

  @restrict: [{ grant: 'READ', where: 'user_ID = $user' }]
  entity Transactions as projection on db.Transactions {
    ID, user, order, type, amount, currency, createdAt
  };
}

annotate BuyerService.Orders with {
  buyer        @readonly;
  status       @readonly;
  buyerPrice   @readonly;
  publishedUrl @readonly;
};