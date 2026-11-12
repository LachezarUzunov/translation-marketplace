namespace marketplace;
using { cuid, managed } from '@sap/cds/common';

// ---------- Типове ----------

type Role : String enum { Buyer; Translator; Admin; }

type ApprovalStatus : String enum { Pending; Approved; Rejected; }

type OfferType : String enum { Translation; Proofreading; Certified; }

type LanguageCode : String(2);  // ISO 639-1: en, bg, de...

type OrderStatus : String enum {
  Pending;            // чака преводача
  ChangesRequested;   // преводачът иска уточнение на заданието
  Accepted;           // преводачът работи по нея
  Rejected;           // преводачът отказа -> рефънд
  Delivered;          // чака одобрение от купувача
  RevisionRequested;  // купувачът иска корекция
  Completed;          // одобрена -> изплащане
  Cancelled;          // анулирана от купувача -> рефънд
}

type TransactionType : String enum { TopUp; Hold; Refund; Release; Commission; Withdrawal; }

type Currency : String enum { Credits; USD; }

type WithdrawalStatus : String enum { Requested; Approved; Rejected; }

type Money : Decimal(12,2);
type PricePerWord : Decimal(6,3);   // 0.080 USD на дума

// ---------- Entities ----------

entity Users : managed {
  key ID        : String(100);          // = login ID ($user)
  @assert.range
  role          : Role;
  name          : String(100);
  email         : String(255);
  creditBalance : Money default 0;      // купувач: кредити
  cashBalance   : Money default 0;      // преводач: USD
  languagePairs : Association to many LanguagePairs on languagePairs.translator = $self;
  orders        : Association to many Orders        on orders.buyer             = $self;
}

entity LanguagePairs : cuid, managed {
  translator      : Association to Users;
  sourceLanguage  : LanguageCode;
  targetLanguage  : LanguageCode;
  yearsExperience : Integer;
  @assert.range
  status          : ApprovalStatus default 'Pending';
  offers          : Composition of many Offers on offers.languagePair = $self;
}

entity Offers : cuid, managed {
  languagePair : Association to LanguagePairs;
  @assert.range
  type         : OfferType;
  pricePerWord : PricePerWord;
  active       : Boolean default true;
  @assert.range
  status       : ApprovalStatus default 'Pending';
}

entity Orders : cuid, managed {
  buyer           : Association to Users;
  offer           : Association to Offers;
  @assert.range
  status          : OrderStatus default 'Pending';
  wordCount       : Integer;
  // цените се изчисляват и записват при създаване, после не се променят
  translatorPrice : Money;
  commission      : Money;
  buyerPrice      : Money;
  // заданието и резултатът
  title           : String(200);
  instructions    : String(2000);
  sourceText      : LargeString;
  deliveredText   : LargeString;
  events          : Composition of many OrderEvents on events.order = $self;
}

entity OrderEvents : cuid, managed {
  order      : Association to Orders;
  fromStatus : OrderStatus;
  toStatus   : OrderStatus;
  comment    : String(1000);
  actor      : String(100);
}

entity Transactions : cuid, managed {
  user     : Association to Users;      // null за комисионната на платформата
  order    : Association to Orders;
  @assert.range
  type     : TransactionType;
  amount   : Money;                     // със знак: + влиза, - излиза
  @assert.range
  currency : Currency;
}

entity Withdrawals : cuid, managed {
  translator : Association to Users;
  amount     : Money;
  @assert.range
  status     : WithdrawalStatus default 'Requested';
}