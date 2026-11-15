Проектът

Translation Marketplace е портфолио проект на SAP CAP (Node.js). Купувачи поръчват преводи от преводачи и плащат с кредити (1 кредит = 1 USD). Кредитите се блокират в поръчката (ескроу) и стигат до преводача само след като купувачът одобри превода. Целта е да се покаже реална бизнес логика: статуси, пари като леджър, права по роли.

Целевата роля е SAP CAP Node.js backend developer (BTP Cloud Foundry). Приоритетът е backend логика, тестове и deploy в BTP. Frontend е на второ място.

Как да работиш с мен
Уча CAP, докато строя проекта. Обяснявай всяка стъпка: какво прави кодът и защо е избран този подход. Където има смисъл, сравнявай с Express или Laravel.
След всяка стъпка задай 1–2 въпроса за проверка на разбирането.
Пиши директно, без увъртания. Ако предложението ми е грешно, кажи го.
Разговаряме на български, а кодът, коментарите в кода и commit съобщенията са на английски.
Всеки ден завършва с commit.
В края на всеки ден: файл с обобщение в d:\SAP-NODE-Project\learning-notes\den-XX.md (извън repo-то), на български, чист Markdown за импорт в Notion. Съдържа научените понятия с дефиниции, обяснения, примери от проекта, сравнения с Express/Laravel, типични въпроси за интервю с отговори и грешките, които направих.
Стек
@sap/cds / @sap/cds-dk 10.x, Node.js 26, Windows + PowerShell
SQLite в паметта локално (cds watch), HANA Cloud или PostgreSQL в BTP
OData V4, mocked auth локално, XSUAA в BTP
Тестове с cds.test
Fiori Elements за админа (по-късно)
Модел (db/schema.cds, namespace marketplace)

Седем entities, всички с cuid, managed от @sap/cds/common. Изключение е Users, който има ключ String.

Entity Ключови полета
Users ID : String (= login ID / $user), role, name, email, creditBalance, cashBalance
LanguagePairs translator, sourceLanguage, targetLanguage, yearsExperience, status (ApprovalStatus)
Offers languagePair, type (Translation / Proofreading / Certified), pricePerWord, active, status
Orders buyer, offer, status, wordCount, translatorPrice, commission, buyerPrice, title, instructions, sourceText, deliveredText; composition на OrderEvents
OrderEvents order, fromStatus, toStatus, comment, actor (времето е createdAt)
Transactions user (null за комисионната), order, type, amount (със знак), currency (Credits / USD)
Withdrawals translator, amount, status (Requested / Approved / Rejected)

OrderStatus: Pending → Accepted → Delivered → Completed. Възможни разклонения: ChangesRequested (обратно към Pending), Rejected, RevisionRequested (обратно към Delivered), Cancelled.

Ключови решения
Пари. Decimal (Money : Decimal(12,2), PricePerWord : Decimal(6,3)), никога Double.
Леджър. Балансът никога не се променя директно. Всяка промяна е запис в Transactions, а балансът се обновява в същата DB транзакция. Сумата на транзакциите на потребител винаги е равна на баланса му. Балансът никога не е отрицателен.
Тегленията са отделен entity. Заявката за теглене не е движение на пари. Транзакция Withdrawal се създава едва когато админът одобри.
Цени.
translatorPrice = round2(pricePerWord × wordCount)
commission = max(translatorPrice × rate, minimum)
buyerPrice = translatorPrice + commission
Конфигурация. Процентът и минимумът са в cds.env.marketplace.commission (rate 0.20, minimum 10), не в кода. Цените се копират в поръчката при създаване и не се променят след това.
Преходи. Статусите се сменят само чрез bound actions на Orders (accept, reject, requestChanges, deliver, approve, requestRevision, cancel, resubmit), никога чрез UPDATE на status. Всеки преход се записва в OrderEvents.
Права.
Три услуги (BuyerService, TranslatorService, AdminService) с @requires.
Права на ниво запис с @restrict + where.
Полетата, които клиентът не бива да задава, са @readonly, а handler-ът ги попълва (owner = req.user.id).
Проекциите изброяват полетата изрично: купувачът не вижда translatorPrice и commission, а преводачът не вижда buyer и buyerPrice.
Проверки в handler-ите четат от db entities (marketplace.X): проекцията може да крие полета или да има where. `await SELECT` отива директно в базата, без @restrict; само this.run / this.read минават през правата. Service entity се ползва нарочно, когато искаме филтъра ѝ (напр. BuyerService.Offers като каталог).
Пари и броячи се променят атомарно в базата: UPDATE(...).with({ creditBalance: { '+=': x } }), условен UPDATE ... WHERE status = 'X' / balance >= x с проверка на броя редове. Никога read-modify-write в JS.
where при @restrict не важи за CREATE. Собствеността при създаване се проверява в before CREATE.
Тестови потребители (mocked, парола pass)

buyer1, buyer2 (Buyer) · translator1, translator2 (Translator) · admin (Admin)

Ръчни заявки: test/requests.http (REST Client).

Научени капани
cds-dk 10: cds init <name> --nodejs. Без --nodejs не се създава package.json.
Анотациите се пишат пред елемента (@assert.range на реда над полето), не между типа и default.
OData lambda: без интервал след двоеточието: offers/any(o:o/active eq true).
cds deploy към in-memory база няма ефект върху работещия cds watch.
Промени в package.json може да изискват ръчен рестарт на cds watch.
Mocked auth пуска непознати потребители без роли: резултатът е 403, не 401.
План и статус
[x] Ден 1–2: setup, основи на OData V4
[x] Ден 3: модел, enums, CSV данни, конфигурация на комисионната
[x] Ден 4: услуги по роли, @requires / @restrict, mocked auth
[ ] Ден 5: handler-и. Започнато: srv/translator-service.js (owner при CREATE, проверка за собственост на офертата). Предстои създаване на поръчка (цени, проверка на баланса, Hold), function quote, TopUp.
[ ] Ден 6: bound actions за преходите + OrderEvents
[ ] Ден 7: Refund, Release + Commission, тегления; атомарност
[ ] Ден 8: тестове с cds.test (целият поток, рефънд, недостатъчен баланс, двойно одобрение, баланс = сума на транзакциите)
[ ] Ден 9: custom Express middleware / REST endpoint, Dockerfile
[ ] Ден 10–11: deploy в BTP trial (Cloud Foundry, mta, XSUAA, HANA Cloud / PostgreSQL)
[ ] Ден 12: Fiori Elements за админа
[ ] Ден 13: README с диаграма на статусите
