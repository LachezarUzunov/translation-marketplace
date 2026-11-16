Проектът

Translation Marketplace е портфолио проект на SAP CAP (Node.js). Купувачи поръчват преводи от преводачи и плащат с кредити (1 кредит = 1 USD). Кредитите се блокират в поръчката (ескроу) и стигат до преводача само след като купувачът одобри превода. Целта е да се покаже реална бизнес логика: статуси, пари като леджър, права по роли.

Целевата роля е SAP CAP Node.js backend developer (BTP Cloud Foundry). Приоритетът е backend логика, тестове и deploy в BTP. Frontend е на второ място.

Как работим
Работим като партньори (pair programming). Аз решавам какво строим и одобрявам решенията. Ти предлагаш подход, пишеш код, проверяваш го с реални заявки и тестове и казваш, ако виждаш по-добър вариант или грешка в моето предложение.
Целта е да разбирам всеки ред, който е в repo-то, и да мога да го защитя на интервю. Затова:
- Обяснявай всяка стъпка: какво прави кодът и защо е избран този подход. Където има смисъл, сравнявай с Express или Laravel.
- След всяка стъпка задай 1–2 въпроса за проверка на разбирането и давай честна обратна връзка на отговорите ми.
- Не твърди, че нещо работи, ако не е проверено.
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
Преходи. Статусите се сменят само чрез bound actions на Orders (преводач: accept, decline, requestChanges, deliver; купувач: resubmit, cancel, approve, requestRevision), никога чрез UPDATE на status. Таблицата на преходите е в srv/lib/order-workflow.js (единствен източник на истина), а изпълнението е в srv/lib/order-transition.js: проверка на собственик, optimistic lock (UPDATE ... WHERE status = прочетения), запис в OrderEvents.
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
"type": "module" в package.json изисква import/export в srv/*.js; require хвърля грешка.
Action не може да се казва като метод на ApplicationService (reject, emit, send, run...). CAP дава WARNING при старт. Затова е decline, а не reject.
@restrict с where върху bound action: чужд запис дава 403 от CAP, преди да стигне до handler-а.
Анотацията (@assert.range) е на конкретния елемент, не на името. Параметрите на action/function се анотират отделно.
cds serve стартира за ~7 s; при тестови скриптове изчаквай "server listening" в лога.
План и статус
[x] Ден 1–2: setup, основи на OData V4
[x] Ден 3: модел, enums, CSV данни, конфигурация на комисионната
[x] Ден 4: услуги по роли, @requires / @restrict, mocked auth
[x] Ден 5: handler-и: ESM, валидации (анотации + handler-и), pricing.js (чиста функция, цели центове, node:test), function quote, action topUp, on CREATE Orders (атомарен Hold с условен UPDATE, леджър, OrderEvent)
[x] Ден 6: state machine (order-workflow.js + unit тестове), 8 bound actions, optimistic lock, OrderEvents с история по роли. Refund/Release са TODO за Ден 7. README на английски за работодатели.
[ ] Ден 7: Refund, Release + Commission, тегления; атомарност
[ ] Ден 8: тестове с cds.test (целият поток, рефънд, недостатъчен баланс, двойно одобрение, баланс = сума на транзакциите)
[ ] Ден 9: custom Express middleware / REST endpoint, Dockerfile
[ ] Ден 10–11: deploy в BTP trial (Cloud Foundry, mta, XSUAA, HANA Cloud / PostgreSQL)
[ ] Ден 12: Fiori Elements за админа
[ ] Ден 13: финален README (README с диаграма на статусите вече съществува; обновявай го при всеки завършен ден)
