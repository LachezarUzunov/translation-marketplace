using marketplace as db from '../db/schema';

@requires: 'Admin'
service AdminService {
  entity Users         as projection on db.Users;
  entity LanguagePairs as projection on db.LanguagePairs;
  entity Offers        as projection on db.Offers;
  entity Withdrawals   as projection on db.Withdrawals;

  @readonly entity Orders       as projection on db.Orders;
  @readonly entity OrderEvents  as projection on db.OrderEvents;
  @readonly entity Transactions as projection on db.Transactions;
}