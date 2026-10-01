# issues.md

Актуальные проблемы репозитория `diplom` (учебная часть колледжа). Решённые — в [issues-solved.md](issues-solved.md).

**Дата аудита:** 29.09.2026, **уточнения и порядок работ:** 01.10.2026. **Область:** `server/` (Express + Sequelize) и `client/` (React 19 + CRA + MobX).
**Что не проверялось:** тесты и CI в проекте отсутствуют, динамический анализ не проводился. Все находки — статический разбор кода; выводы помечены `[!]`, если требуют подтверждения на живой БД.
**Сверка с ТЗ:** формулировки B7, B8, B10, S1 сверены с [Пояснительной запиской.docx](Пояснительная%20записка.docx) (далее — `doc.txt:<строка>`).

**Осталось:** 4 в бизнес-логике, 5 в дублировании, 1 в мёртвом коде, 5 в клиенте, 1 недостающая фича, 0 в Docker, 1 из ревью. Этап 1 из 4 закрыт полностью — 12 пунктов перенесены в [issues-solved.md](issues-solved.md).

---

## Замечания по ревью (30.09.2026)

Все проверены по коду и, где возможно, на живом сервере. Вердикт — по фактам, а не по формулировке.

R1, R3, R7, R8 → перенесены в [issues-solved.md](issues-solved.md)

### R2. Изменилось поведение `updateLocal` в `NavBar` — верно по механике, ветка недостижима
`client/src/components/NavBar.jsx:127-128`

`fetch` не бросал исключение на non-2xx, поэтому `updateLocal(..., {isViewed:true})` и запись в `localStorage.viewedRequests` происходили даже при отказе сервера. Теперь axios бросит — локальное состояние не обновится, причина уйдёт только в `console.error`.

**Оговорка:** ветка `notification?.requestId && userRole === 'ADMIN'` **недостижима** — в модели `Notification` поля `requestId` нет, условие всегда ложно (это **B10**). Регрессия реальна, но потенциальная.

**Фикс:** по решению по B10 блок удаляется целиком, поэтому **R2 закрывается вместе с ним** — восстанавливать `try/catch` не нужно. Пункт остаётся открытым только если `requestId` всё же добавят в модель.

### R4. HTML-дамп в сообщении — преувеличено, но ограничения длины нет
`client/src/http/index.js:20-35`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

Измерено на живом сервере:

| Сценарий | Content-Type | Длина сообщения |
|---|---|---|
| 404 неизвестного маршрута | `text/html` | **120 симв.** — «Error Cannot POST /api/…» |
| битый JSON в теле | `application/json` | 22 симв. |
| ошибка без `ApiError` | `application/json` | 22 симв. |

Стек Express в сообщение не попадает: `ErrorHandlingMiddleware` зарегистрирован последним и перехватывает всё, что до него доходит. HTML остаётся только от catch-all 404, и он короткий.

**Уточнение:** в `http/index.js:20-36` теги уже вырезаются (`replace(/<[^>]+>/g, ' ')`) и пробелы схлопываются, поэтому полный HTML-стек Express в сообщение попасть не может — таблица выше это и показывает. Чего действительно нет: ограничения длины; JSON-строка на 5 КБ пройдёт насквозь. `errorMessage` (`:38-42`) не делает даже этого.

**Фикс:** `.slice(0, 300)` в `:34` — одна строка.

### R5. Нет проверки, что ответ действительно docx — кодом не подтверждается
`client/src/http/index.js:65-71`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

Проверено: все 12 отправок документов — это `res.send(buffer)` после `Packer.toBuffer`. Ни одного `res.status(2xx)` перед отправкой буфера, ни одного `res.json` в этих обработчиках. Пути, при котором 2xx может нести не-docx, в коде нет.

**Фикс:** проверка `Content-Type` — защита от будущих изменений, а не от текущей проблемы. Дёшево, но не срочно.

### R6. `payload` молча игнорируется при `GET`, `params` не поддержан — верно, низкий приоритет
`client/src/http/index.js:61`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

Единственный `GET`-вызов — справка с `:requestId` в пути, query-параметров у него нет. Тихая ловушка реальна, но касается только будущих вызовов.

**Фикс:** либо `params` в опциях, либо `throw`, если `payload` передан при `GET`.

---

## Бизнес-логика и целостность данных

### B6. `sequelize.sync({ alter: true })` на каждом старте
`server/index.js:34`

```js
await sequelize.sync({ alter: true })
```

При каждом запуске Sequelize сверяет модель со схемой и может выполнить `ALTER TABLE` по живой базе — в том числе на боевом postgres из контейнера. Схема меняется без миграций и без возможности отката; структура таблиц зависит от состояния, в котором сервер последний раз выключали.

Это же следствие того, что новые колонки (`Student.userId`, `Teacher.userId`) появляются только при ближайшем `sync({ alter: true })` — до этого прогона фичи B1/B12 на живой базе не работают.

**Фикс:** `sync()` только в dev-режиме (по `NODE_ENV`), в production — Sequelize CLI-миграции. Отдельная находка: `DatabaseError` глушится общим `catch` в `index.js` (`console.log(e)`), после чего сервер просто не поднимается без внятного сообщения.

### B7. Три разных значения по умолчанию для `payment_type`
- `server/models/models.js:10-13` — `defaultValue: 'платной'`
- `server/controllers/groupController.js:32` — `payment_type || 'бесплатной'`
- `client/src/utils/tableConfig.js:89` — `payment_type: 'платной'`
- плюс мёртвый фолбэк в `server/templates/studyCertificateTemplate.js:187` — `group.payment_type || 'бесплатной'`

Значение по умолчанию для формы обучения группы зависит от того, каким путём создана группа (UI, API без поля, прямая вставка в БД). Для документа, печатающего основание обучения, это даёт расхождение с фактическими данными.

**Продуктовое решение не требуется — каноническое значение `платной`**, за него говорят: модель (`:11`), дефолт формы (`tableConfig.js:89`), сид (`seed.js:332`) и 70% сгенерированных групп (`seed.js:230`). Расходится только `groupController.js:32`.

**Фикс:** убрать фолбэк из контроллера, значение по умолчанию остаётся в модели. Фолбэк безопасно убрать и в шаблоне: `payment_type` объявлен `allowNull: false`, поэтому в справку всегда попадёт фактическое значение — «на платной основе». Клиентский дефолт приводить в соответствие не нужно, он уже канонический.

### B8. Объём `studentIds` не ограничивается сервером
`client/src/utils/tableConfig.js:121`, `client/src/utils/dataHelpers.js:299`, `client/src/pages/Request.jsx:200`, `client/src/hooks/useAdminLogic.js:151`, сервер — `server/controllers/requestController.js:13-15`

**Продуктовое решение владельца:** роль `TEACHER` — выбор любого числа студентов в рамках группы, как у админа; роль `USER` — выбор ровно одного студента.

Правило зафиксировано только в браузере:
```js
// requestController.js — единственная проверка studentIds
if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return next(ApiError.badRequest('Не выбран ни один студент'));
}
```
Любой пользователь с ролью `USER`, вызвав `POST /api/request` из консоли, отправит массив из десяти произвольных студентов, и сервер это примет. Ограничение держится исключительно на типе поля в форме (`Request.jsx:200`).

Частично снято: `checkStudentsAccess` (B1, B12) ограничивает **состав** студентов — `USER` только на привязанного, `TEACHER` только на свою группу. Но **объём** массива по-прежнему не ограничен, и `role` в `models.js` — свободная строка без ENUM.

**Фикс:** серверная валидация объёма `studentIds` по роли в `requestController.create`; единая функция `canSelectMultipleStudents(userRole)` в `client/src/utils/consts.js` вместо трёх инлайновых проверок (см. C6); `role` сделать ENUM по аналогии с `Request.status`.

### B9, M9 → перенесены в [issues-solved.md](issues-solved.md)

### B10. Неиспользуемая ветка «перейти к заявке» в уведомлениях
`client/src/components/NavBar.jsx:124-147`

```js
if (notification?.requestId && userRole === 'ADMIN') {
    await fetch(`.../api/request/${notification.requestId}/view`, { method: 'PATCH', ... });
```

В модели `Notification` поля `requestId` нет, и при создании уведомлений сервер его не проставляет (`requestController.js:288` — только `userId`, `title`, `body`). Условие всегда ложно — блок с переходом в админ-панель и пометкой заявки просмотренной недостижим. Из этого же следует, что счётчик непрочитанных заявок работает, а переход к конкретной заявке из уведомления — нет.

**Решено по ТЗ:** в таблице «notifications» (`doc.txt:400-423`) поля `requestId` нет, и тело уведомления задано как `Заявка #${request.id}` (`doc.txt:267`) — то есть переход к заявке из уведомления в постановке задачи не предусмотрен.

**Фикс:** удалить блок `NavBar.jsx:124-147` целиком (вместе с записью в `localStorage.viewedRequests`, которая существует только ради него). Тогда **R2 отпадает сам** — восстанавливать `try/catch` не нужно. Если `requestId` всё же решит добавить, R2 придётся чинить отдельно.

### B11. Клиентские проверки прав не имеют серверного эквивалента
`client/src/components/Admin.jsx`, `client/src/hooks/useAdminLogic.js:173-183`

**Прежняя формулировка была преувеличена.** `App.js:18-27` **уже** синхронизирует `UserStore` из `check()` при монтировании и не рендерит ничего до `loading === false`, поэтому «до первого ответа `GET /api/user/auth` пользователь считается анонимом» — неверно: экрана с этим состоянием просто не существует. `checkToken()` смотрит только на наличие ключа в `localStorage` и не декодирует его — это верно, но на состояние до первого ответа это не влияет.

Что действительно остаётся: `handleDelete` (`useAdminLogic.js:173`) запрещает удалять собственный аккаунт только на клиенте, а `userController.delete` (`:172-190`) такой проверки не имеет — `DELETE /api/user/:id` на собственный id проходит. Проверки прав в `AppRouter` — косметика: сервер должен быть единственным источником истины.

**Фикс:** серверная проверка `id === req.user.id` в `userController.delete` с `ApiError.badRequest`. Синхронизация `UserStore` из ответа `/api/user/me` уже есть.

### B12 → перенесено в [issues-solved.md](issues-solved.md)

---

### M6. Три статуса из UI не существуют в модели — это не мусор, а недостающая бизнес-логика
`client/src/components/TableCell.jsx:71-86` — словари содержат `pending`, `approved`, `cancelled`, которых нет в ENUM `Request.status` (`server/models/models.js:49-53`, там только `in_progress | completed | rejected`).

**Прежняя формулировка в issues.md была неверной:** ключи названы «мёртвыми ветками, маскирующими опечатки». Это не опечатки — по решению владельца это **реальные статусы заявки**:

| Ключ | Значение | Как должен работать |
|---|---|---|
| `pending` | заявка пришла администратору, он её ещё не рассмотрел | ← фактически новое имя того, что сейчас `in_progress` |
| `in_progress` | в обработке | остаётся |
| `approved` | администратор одобрил | новое |
| `completed` | завершена | есть |
| `rejected` | отклонена | есть |
| `cancelled` | заявка отменена | новое |

До этого в коде это были синонимы, а на деле делалась одна бизнес-логика: `pending`, `approved` и `in_progress` подписаны одинаково «В обработке» (`TableCell.jsx:72-74`), а `cancelled` повторяет `rejected` («Отклонено», `:77`).

⚠️ **Требует решения владельца, это не механическая правка.** Из шести статусов четыре (`in_progress`, `completed`, `rejected`, `isViewed`-счётчик «новых») уже прошиты бизнес-логикой, и добавление остальных меняет её:
- `Admin.jsx:17-18` считает «новыми» `status === 'in_progress' && !isViewed` — с появлением `pending` надо решить, какой из них считать нерассмотренным, иначе счётчик и бейдж в `NavBar` разойдутся;
- `Profile.jsx:110-115` и `RequestStatistics.jsx:91-99` группируют по трём статусам, `RequestsManagement.jsx:86-97` — счётчики и сортировка (`:50-52`) — тоже по трём;
- `requestController.js:279-282` строит уведомление «Ваша заявка {статус}» из трёх подписей — новые статусы требуют согласования (завершена/одобрена/отменена);
- `RequestCard.jsx:395-426` — кнопки смены статуса, `disabled` при `completed || rejected`; `cancelled` тоже должен быть терминальным;
- `seed.js:270` — массив статусов для сида.

⚠️ **`sync({ alter: true })` не выполнит эту задачу.** Добавление значения в Postgres-ENUM требует `ALTER TYPE ... ADD VALUE`, а `alter: true` так не работает — накатывать надо вручную, до того как модель начнёт писать новое значение (см. **B6**).

**Фикс:** расширить ENUM в модели и Postgres, затем провести единый словарь статусов по всем местам (см. **D5**) — иначе получится ровно то расхождение, из-за которого статус и появился в UI.

---

## Дублирование кода

### D1. Десять копий одного и того же метода генерации приказа
`server/controllers/adminDocumentController.js:70-290`

Методы `generateExamAdmissionOrder`, `generateHolidaysOrder`, `generateStipendOrder`, `generateSnowCleaningOrder`, `generateStudentDirectionOrder`, `generateHealthOrder`, `generateTransferOrder`, `generateDuplicateTicketOrder`, `generateEnrollmentOrder`, `generateReleaseOrder` отличаются друг от друга тремя строками: именем шаблона, именем файла и текстом в `console.error`. Одинаковы: `Packer.toBuffer`, `Content-Type`, `Content-Disposition`, отступы страницы, `try/catch`. Это ~200 строк копипасты.

**Уточнено после D10.** Отступы у всех десяти методов **одинаковы** (`851/851/851/1701`) — колонка `margin` в реестре не нужна. Отличается только `generatePracticeContract`: он перебирает `data.students` и делает **две копии договора на студента** с `pageBreakBefore` плюс разрыв между студентами (юридическое требование), и использует другие отступы (`425/561/425/851`). Его **нельзя** параметризовать вместе с остальными — иначе потеряется требование двойной копии. Оставлять на отдельном пути.

**Фикс:** один `generate(templateFactory, filePrefix)` + таблица `{ routeKey: { template, filePrefix } }` в `documentGeneratorRouter.js`.

### D2. Одиннадцать однотипных POST-маршрутов
`server/routes/documentGeneratorRouter.js:24-69`

Каждый приказ — отдельный блок `router.post` с одинаковыми `authMiddleware` и `checkRoleMiddleware('ADMIN')`. Четыре написаны многострочно, шесть — однострочно (рефакторинг начался и не доведён).

**Риск, который важно понимать:** переход на параметризованный маршрут меняет публичные пути API, на которые завязаны 12 мест в клиенте. Тестов нет, пропущенный путь не поймается. Делать в связке с D1.

### D5. Словари статусов заявки продублированы
- `server/models/models.js:49-53` — ENUM `in_progress | completed | rejected`
- `server/controllers/requestController.js:281-285` — `statusTranslations` (уведомление)
- `client/src/hooks/useAdminLogic.js:131-135` — `statusNames` (тост)
- `client/src/components/TableCell.jsx:71-86` — `statusTranslations` + `statusColors`

**Уточнено после аудита 30.09.2026 — оценка была занижена.** Словарей не 4, а **6** в клиенте плюс ENUM на сервере: дополнительно `RequestCard.jsx:156-166` (тот же словарь, что и в `TableCell`, продублирован ещё раз), `tableConfig.js:131-135` (опции селекта), `SearchAndFilters.jsx:176-178` и `RequestsManagement.jsx:190-192` (сырые `<option>`), `Profile.jsx:143-145` (свои подписи **во множественном числе** и FontAwesome-иконки вместо Bootstrap, принятых в проекте).

**Главная сложность — подписи грамматически разные, и это нельзя схлопнуть в одну карту:** бэкенду нужно `завершена` (нижний регистр, женский род — согласование с «заявка»), таблице `Завершено`, профилю `Завершенные`, справке `первого` (родительный падеж). Наивное объединение отправит в официальный документ неверную форму. Карта должна нести несколько представлений (`label`, `labelPlural`, `labelFemininePast`, `labelGenitive`), а `consts.js` сейчас содержит только маршруты (7 строк).

**Смежное:** в `TableCell.jsx` три ключа — `pending`, `approved`, `cancelled` — отсутствуют в ENUM модели. Это не опечатки, а недостающая бизнес-логика; см. **M6**.

### D7. Логика расчёта курса реализована дважды, по-разному
- `client/src/utils/dataHelpers.js:10-44` — возвращает `'Выпускник'` (с большой буквы)
- `server/controllers/documentGeneratorController.js:152-164` — возвращает `'выпускник'` и словарь `['первого','второго','третьего','четвертого']`

Обе реализации в целом совпадают (учебный год с 1 сентября, `maxCourse` с учётом месяцев), но различаются регистром и набором представлений.

**Общего модуля в этом репозитории нет и близко нет:** `client` — ESM (`import`), `server` — CommonJS (`require`), корневого `package.json` нет (нет воркспейса), прецедента разделяемого модуля в проекте нет, тестов нет вообще. Общая часть двух реализаций — около 10 строк, а представления принципиально разные.

**Что реально разошлось и что стоит чинить независимо от объединения:** в серверной версии **нет двух защитных проверок**, которые есть в клиентской — нет `if (!enrollDate) return '-'` и нет клампа `course < 1`. Проверено: при `enroll_date` в будущем месяце получается `course = 0`, затем `courseWords[-1] || '0'` даёт в справке буквальную строку `"0"`, а `null` в `group.enroll_date` молча даёт `NaN`.

**Отложено осознанно:** `'Выпускник'` — рабочая строковая константа в 5 местах сравнения, менять регистр можно только вместе с ними.

### D9. Дубль разметки списка уведомлений
`client/src/components/NavBar.jsx:228-277` и `:384-425`

Список уведомлений продублирован в desktop-`Dropdown` и в мобильном `Offcanvas` (~50 строк JSX). Также `data.fetchAll('notifications')` вызывается в **шести** местах одного компонента и в трёх других файлах (`App.js:24`, `Auth.jsx:76`, `useAdminLogic.js:127`).

Блоки разошлись: desktop использует `Dropdown.Item` (нужен, чтобы меню закрывалось по клику), имеет бейдж «Новое» и `overflow-hidden`; мобильный — обычный `div` с дополнительным `setShowMobileMenu(false)`. Единый компонент потребует 4-5 пропсов, но дубль тела сократится не полностью.

**Фикс:** вынести `<NotificationList notifications={...} onRead={...} />`, автообновление — в один `useEffect` с одной зависимостью.

⚠️ **Меняет объём сетевых запросов:** три вызова идут сразу после действия пользователя (`:94`, `:105`, `:117`), их нельзя схлопнуть без потери свежести.

### D3, D4, D6, D8, D10 → перенесены в [issues-solved.md](issues-solved.md)

---

## Мёртвый код

### M1. `client/src/http/documentAPI.js` и `client/src/http/studentAPI.js`

✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

Ни один файл их не импортирует. Вдобавок обе функции сломаны:
```js
// documentAPI.js:9-11
const { data } = $authHost.post('api/document', document_name)  // нет await → data === undefined
// documentAPI.js:14 / studentAPI.js:14
$authHost.delete('api/document', id)   // id уходит вторым аргументом axios (config), а не в путь
```
**Фикс:** удалить оба файла — вся работа с сущностями идёт через `DataStore`.

### M2. Методы `DataStore` без вызовов
`client/src/store/DataStore.js` — `getStatistics`, `findByField`, `findById`, `clearAllErrors`

*Частично закрыто в составе D6:* `getDropdownOptions` и `getNameById` удалены — см. [issues-solved.md](issues-solved.md). Ниже только то, что осталось.

Проверено grep'ом по всему `client/src`: единственные упоминания — внутри самого файла.

**Найдено сверх issues.md:** мёртвым оказался ещё и метод `filter` (`DataStore.js:332`, 0 вызовов), а также геттеры `entities` (`:250`), `pagination` (`:359`) и `supervisors` (`:287`).

⚠️ **`entities` удалять нельзя, не сняв зависимость C4:** `NavBar.jsx:70` — единственное внешнее обращение к `_entities` в обход публичного API. Пока C4 не закрыт (там нужен новый метод `DataStore.clear`), удаление геттера `entities` оборвёт единственный путь очистки уведомлений. Геттер `supervisors` — заготовка под **S1**, оставить.

⚠️ **`findById` стал мёртвым из-за D6:** после удаления `DataStore.getNameById` он потерял единственного вызывающего. Но `findByField` и `getStatistics` могут понадобиться при добавлении экранов — решение лучше принимать при планировании **D1/D2**, где нагрузка на стор перераспределится.

### M3. `loadAllData()` гарантированно падал на одной сущности
`client/src/store/DataStore.js:14,27` (записи `supervisors`; сам метод удалён)
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

`ENTITY_TYPES` включает `supervisors`, а `ENDPOINTS` отображает его в `/api/supervisor`. Такого маршрута нет ни в `server/routes/index.js`, ни в `server/routes/` вовсе. `Promise.all` в `loadAllData` отклонится по этой причине.

Метод сам по себе не вызывается — единственное совпадение имени `loadAllData` в клиенте это **локальная, затеняющая** функция в `useAdminLogic.js:38` (вызывается на `:59`), которая перечисляет семь сущностей вручную. То есть мёртвый код, который к тому же содержит ошибку.

**Кураторы — не мёртвая сущность, feature не выбрасывается.** `Supervisor` это связка «группа ↔ преподаватель», и она живёт в сервере полностью:
- `server/models/models.js:35` (модель), `:90-91`, `:102-103` (ассоциации `Group.hasOne` / `Supervisor.belongsTo`);
- `server/controllers/groupController.js:36` (создание при создании группы), `:138-146` (`findOrCreate` + смена куратора), `:49`, `:78`, `:156` (включение в `include`), `:182` (удаление вместе с группой);
- `server/utils/supervisorGroup.js` — `findSupervisorGroupId`, на которой держится ограничение `TEACHER` в `requestController.js:54-80`;
- клиент читает вложенный `group.supervisor.teacher` в `TableContent.jsx:130-140`, `ReleaseOrderModal.jsx:44`, `HealthOrderModal.jsx:44`, `StudentDirectionOrderModal.jsx:49`.

Не хватает только двух вещей: отдельного `GET /api/supervisor` (или вкладки в админке) — куратор сейчас назначается косвенно, через поле «Преподаватель» в карточке группы (`tableConfig.js:153`), отдельной сущности для управления им нет. Это **недостающая фича, а не мусор**; см. **S1**.

**Фикс:** удалить только `loadAllData` — он недостижим и при этом единственное место, где ошибка проявляется. Записи `supervisors` в `ENTITY_TYPES`/`ENDPOINTS` и геттер `supervisors` **не трогать**: живых обращений к ним нет (`rg "supervisors" client/src` → только `DataStore.js`), удаление было бы no-op, а заготовка пригодится под S1.

### M4. Неиспользуемые экспорты `declension.js`
`server/utils/declension.js:85,103,121` — `declineLastName`, `declineFirstName`, `declineMiddleName`. В шаблонах используются только `declineFullName`, `declineFullNameAccusative` и `detectGender`.
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

**Фикс:** удалить три функции, оставив составной API.

### M5. `stopBackupScheduler` не вызывается
`server/utils/backupScheduler.js:55-60` — экспортируется, но нигде не импортируется. При этом в `server/index.js` нет обработки `SIGINT`/`SIGTERM`, поэтому планировщик останавливается только вместе с процессом.

⚠️ **Расхождение с AGENTS.md:** там описан развёрнутый порядок остановки (`stopBackupScheduler` → `server.close()` → `waitForIdle` → `sequelize.close()` → выход с кодом 0, потолок `SHUTDOWN_TIMEOUT_MS`, `stop_grace_period: 25s` в compose). В рабочем дереве этого кода нет — единственный process-слушатель в `index.js` это `unhandledRejection`. Актуальная формулировка поведения при остановке — в этом файле, не в AGENTS.md.

**Фикс:** реализовать остановку по `SIGINT`/`SIGTERM` (планировщик → сервер → `sequelize.close()`), а не просто удалить экспорт. Удаление снимет симптом и закрепит невозможность корректно завершиться при `docker compose stop`.

### M7. Ручной 403 в middleware вместо фабрики
`server/middleware/checkRoleMiddleware.js:25`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

**Прежняя формулировка была неверной:** `ApiError.forbiddenRequest` не «не используется» — он вызывается в шести местах `requestController.js` (`:57`, `:74`, `:91`, `:224`, `:229`, `:341`). Нереализована только замена ручного `res.status(403)` в middleware на фабрику; ссылка на `:16` в этом файте тоже устарела, 403 стоит на `:25`.

**Фикс:** `return next(ApiError.forbiddenRequest('Доступ запрещён'))` вместо ручного `res.status(403)`.

### M8. Неиспользуемые импорты
`server/controllers/groupController.js:3` (`const { where } = require('sequelize')`) — не используется: остальные вхождения `where` (`:87`, `:139`, `:182`) — ключи объектных литералов. `server/index.js:5` (`const models = require('./models/models')`) — присваивается, но не используется явно (нужен ради регистрации моделей — заменить на require без присваивания).
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

**Пункт про `requestController.js:1,2` (`uuid`, `path`) уже закрыт** — этих импортов в файле больше нет, ссылки устарели. ESLint-конфига в `server/` нет, поэтому такие вещи не отлавливаются автоматически.

**Фикс:** почистить оставшееся.

### M9 → перенесено в [issues-solved.md](issues-solved.md)

---

## Баги и расхождения в клиенте

### C1. Даты `createdAt` показываются сырым ISO-строкой
`client/src/components/TableCell.jsx:58`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

```js
if (columnKey.toLowerCase().includes('date')) { ... }
```

Колонки «Создан»/«Создана» используют ключ `createdAt` (`tableConfig.js:7,12,20`). `'createdat'.includes('date')` → `false` (внутри `createdAt` нет подпоследовательности `d-a-t-e`), поэтому в таблице выводится `2026-06-25T09:06:30.000Z`. `enroll_date`/`expell_date` форматируются корректно, `updatedAt` не ломается (`"updatedat"` содержит `date` с индекса 2) — но в `tableConfig` его нет.

Тот же формат уже применяют `RequestCard.jsx:119`, `RequestCard.jsx:169-175` (`formatDate`) и `Profile.jsx:746`, поэтому админ-таблицы — единственное место, где дата не отформатирована.

**Фикс:** `if (columnKey.toLowerCase().includes('date') || columnKey === 'createdAt')` — одна строка, меняет вывод только для `createdAt`.

### C2. `useMemo` в админке не мемоизирует ничего (в профиле — работает)
`client/src/hooks/useAdminLogic.js:246`

```js
const tableData = getTableData(activeTab, data);   // вне useMemo, возвращает toJS(...) — новый массив
const filteredData = useMemo(() => filterData(tableData, ...), [tableData, ...]);
```

`getTableData` вызывает `toJS()` и возвращает свежий массив на каждом рендере, поэтому `tableData` всегда новая ссылка и `useMemo` пересчитывает фильтрацию и сортировку каждый раз.

**В `Profile.jsx` претензия неверна:** `userRequests = data.requests` (`:107`) — это сам observable-массив, а не `toJS()`-копия, ссылка стабильна, оба мемо работают.

⚠️ **Предложенный в issues.md фикс «обернуть `getTableData` в `useMemo` по `data.entities[...]`» — регрессия:** `DataStore.create` (`:151`) делает `push` в тот же массив, а `update` (`:175`) заменяет элементы, поэтому ссылка массива не меняется и мемо будет отдавать устаревшие строки. Правильный вариант — убрать бесполезный `useMemo` и считать `filteredData` напрямую.

⚠️ **Обратная проблема в `Profile.jsx:110-115`:** мемоизация по ссылке observable-массива небезопасна, потому что `updateLocal` (`DataStore.js:198`) меняет элемент по месту, сохраняя ссылку массива. После `data.updateLocal('requests', id, { isViewed: true })` компонент перерисуется, но `requestsByStatus` отдастся из кеша — состояние «новая/непрочитанная» не обновится до смены ссылки или `fetchMyRequests`. Тот же паттерн в `Admin.jsx:207`.

**Фикс:** в `useAdminLogic.js` считать `filteredData` без `useMemo`; в `Profile.jsx`/`Admin.jsx` перевести мемо на наблюдаемое значение (например, счётчик по `isViewed`), а не на ссылку массива.

### C3. Потеря выбранных студентов при быстрых кликах
`client/src/components/MultiselectStudents.jsx:74`, `:101` и `:107`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

```js
const currentValues = formData[field.name] || [];   // значение из замыкания на момент рендера
newValues = [...currentValues, value];
setFormData(prev => ({ ...prev, [field.name]: newValues }));  // prev не используется
```

Веток с дефектом **три**, а не две: `handleSelectGroup` (`:74`) и обе ветки `handleStudentToggle` (`:101` — чтение снимка, `:107` — снятие значения фильтром по тому же снимку). Одиночный селект (`:95-98`) `formData` не читает и безопасен.

⚠️ **`useAdminLogic.js:163` (`student.id.toString()`) вместе с этим фиксом менять нельзя:** `MultiselectStudents.jsx:219` сравнивает `selectedValues.includes(opt.value.toString())`, перевод формы на числа расчекбоксит всё.

**Фикс:** читать `prev[field.name]` внутри апдейтера — `setFormData(prev => ({ ...prev, [field.name]: [...(prev[field.name] || []), value] }))`, для снятия соответственно `prev[field.name].filter(...)`.

### C4. Прямая мутация приватного поля стора
`client/src/components/NavBar.jsx:70`
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

```js
data._entities.notifications = []
```

Обращение к приватному полю MobX-объекта снаружи стора в обход публичного API.

`configure({ enforceActions })` в клиенте **не вызывается нигде**, так что MobX 6.15 работает в дефолтном `observed`. Но проверка в dev-сборке — это `console.warn`, а не throw, и в production-сборке она вырезается целиком: присваивание срабатывает и перерисовывает корректно. То есть это нарушение инкапсуляции и предупреждение в консоли, а не поломка рантайма.

Подходящего существующего метода нет: `updateLocal` (`:194`) ищет по `id` и для очистки списка бесполезен, `clearError`/`clearAllErrors` трогают `_errors`, а не `_entities`.

**Фикс:** `clear(entityType)` в `DataStore` рядом с `updateLocal` + `data.clear('notifications')` в `NavBar.jsx:70`. Поведение идентично — тот же новый массив, наблюдатели уведомлены.

### C5. Тип `studentIds` плавает между строками и числами (но на проводе всегда `number[]`)
`client/src/hooks/useAdminLogic.js:163` против `:118`

```js
// handleEdit — строки
studentIds: item.students.map(student => student.id.toString())
// handleRequestStatusChange — числа
studentIds: request.students.map(s => s.id)
```

Оба значения уходят в `prepareFormData` (`dataHelpers.js:347-357`), который приводит тип в зависимости от `userRole`.

**Проверено по всем достижимым путям: на проводе тип всегда `number[]`** — ветка по роли на тип не влияет, `parseInt` съедает оба варианта. Так что это вопрос гигиены, а не данных. Реальный дефект рядом: `parseInt(submitData.studentIds)` в ветке `USER` при массиве из нескольких id **молча схлопывает его в первый** (`["7","8"]` → `"7,8"` → `7`, студент 8 теряется без предупреждения). Сегодня недостижимо — `useAdminLogic` монтируется только из `pages/Admin.jsx:87`, — но это мина под следующую страницу.

На сервере строки тоже допускаются (`checkStudentsAccess:49-52` делает `Number(id)`), но ⚠️ **для `ADMIN` функция выходит рано (`:45`), поэтому нечисловые id доходят до `StudentRequest.bulkCreate` и дают 500** — валидацию надо поднять выше раннего возврата (связано с **B8**).

**Фикс:** схлопнуть ветку в один `.map(id => parseInt(id, 10))`. `useAdminLogic.js:118` и `:163` не трогать — см. предостережение в **C3**.

### C6. Разные правила ветвления по роли в соседних файлах
- `client/src/utils/tableConfig.js:121` — `userRole === 'USER' ? 'select' : 'multiselect'`
- `client/src/utils/dataHelpers.js:299` — `if (userRole === 'USER') { ... } else { ... }`
- `client/src/pages/Request.jsx:200` — `userRole === 'ADMIN' || userRole === 'TEACHER' ? 'multiselect' : 'select'`

Первое и второе относят любую новую роль к ветке «несколько студентов», третье — к ветке «один студент». При появлении роли, отличной от `USER`/`ADMIN`/`TEACHER`, страницы будут вести себя по-разному.

**Фикс:** одна функция `canSelectMultipleStudents(userRole)` в `utils/consts.js`. Пересекается с **B8**.

### C7. Размер страницы захардкожен в четырёх местах
`client/src/hooks/useAdminLogic.js:24` (`itemsPerPage = 10`), `client/src/components/TableContent.jsx:89` (`(currentPage - 1) * 10 + index + 1`), `client/src/pages/Profile.jsx:23`, **`client/src/components/RequestsManagement.jsx:19`** (последнее место в исходной формулировке пропущено)
✅ **Закрыто 01.10.2026** — см. [issues-solved.md](issues-solved.md), раздел «Этап 1».

Нумерация строк пересчитывается с константы `10`, а не со значением `itemsPerPage`. `TableContent` вообще не получает `itemsPerPage` ни от `DataManagement`, ни от кого-либо ещё.

**Серверного дефолта `limit` нет ни в одном контроллере** — `studentController.js:84` читает `limit` из query и применяет только если он задан, поэтому `fetchAll('students')` без параметров возвращает всех студентов и вся пагинация клиентская. Синхронизировать не с чем, риск нулевой.

**Фикс:** провести `itemsPerPage` пропом через `DataManagement` в `TableContent`; `RequestsManagement.jsx:19` и `Profile.jsx:23` — на общую константу в `utils/consts.js`.

### C8. Поля, которых нет в колонках таблицы
`client/src/utils/tableConfig.js:37` (`supervisor`), `:40` (`course`), `:46` (`duration`) — в исходной формулировке номера строк неверные

Колонки `supervisor`, `course`, `duration` не соответствуют полям API — `TableContent` и `TableCell` обрабатывают их вручную. Работает, но конфигурация перестала быть источником правды: любая новая колонка потребует правки в трёх файлах.

**`supervisor` не мёртвая колонка:** `groupController.get` отдаёт ровно это дерево (`Group.hasOne(Supervisor)` → `Supervisor.belongsTo(Teacher)`), и то же вложенное `group.supervisor.teacher` читают `ReleaseOrderModal.jsx:44`, `HealthOrderModal.jsx:44`, `StudentDirectionOrderModal.jsx:49`. Мёртвая колонка — безобидная `supervisors` в `DataStore.ENTITY_TYPES`, см. **M3**.

`course` и `duration` работают через `value={null}` + передачу всего `item` в `TableCell.jsx:9-39`, причём обе ветки стоят **до** null-guard'а (`:42-44`).

**Фикс:** пометка `{ key: 'course', computed: true }` безопасна и рендера не меняет. Рефакторинг рендера — только вместе с удалением `TableCell.jsx:9-39`, иначе `value={null}` перестанет работать: сам по себе он эти ветки больше ниоткуда не вызывает.

---

---

## Недостающая функциональность

### S1. Нет управления кураторами как отдельной сущностью
`server/routes/` (нет `supervisorRouter.js`), `client/src/components/DataManagement.jsx` (7 вкладок, «Кураторы» нет)

По [Пояснительной записке.docx](Пояснительная%20записка.docx) в списке администрируемых сущностей прямо стоят «пользователей, групп, **кураторов** и форм отчётности» (`doc.txt:28`, `:245`). Сейчас куратор назначается только как побочный эффект выбора преподавателя в группе, отдельного списка кураторов нет.

**Фикс:** `supervisorController` + `supervisorRouter` (`GET /api/supervisor` с `include: [{ model: Group }, { model: Teacher }]`) + вкладка «Кураторы» в `DataManagement`/`tableConfig`. Требует отдельного этапа: это новая функциональность, а не чистка.

⚠️ Один куратор на группу (`Group.hasOne`) — ограничение на уровне схемы не выражено, `groupController.create` (`:36`) создаёт `Supervisor` без `findOrCreate` и потому упадёт на повторе, а `sync({ alter: true })` не добавит уникальный индекс (см. B6).

---

## Рекомендуемый порядок работ

Пункты отсортированы по тому, насколько безопасно их брать **сейчас**: сначала то, что не меняет ни одной достижимой строки кода или меняет только её исправление, затем то, что требует решения владельца, и в конце — то, что трогает публичные контракты и схему БД.

### Этап 1. Механическая чистка — ✅ закрыто 01.10.2026

Все 12 пунктов выполнены, подробности и доказательства — в [issues-solved.md](issues-solved.md), раздел «Этап 1». Кратко: **M1, M3, M4, M7, M8, R4, R5, R6, C1, C3, C4, C7**.

Что осталось за рамками этапа:
- сущность `supervisors` в `DataStore` — заготовка под **S1**, не удалялась;
- геттер `entities` — используется `DataStore.clear` из C4, удалять в этом этапе было бы преждевременно;
- `M2` целиком — в этапе 2.

Проверка после правок: `npx eslint` в `client/` — 0 ошибок (2 предупреждения существовали до изменений), `npm run build` — собрано, все файлы `server/` проходят `node --check`, ответ 403 проверен на живом express-приложении и не изменился.

### Этап 2. Настоящие баги, тоже безопасные

13. **M2** — `DataStore.clear` из C4 позволяет снять зависимость C4 и удалить геттер `entities`. Остальные мёртвые члены (`getStatistics`, `findByField`, `findById`, `clearAllErrors`, `filter`) можно удалять сразу — `supervisors` и `pagination` оставить.
14. **B7** — каноническое `payment_type` — **`платной`**: модель (`models.js:11`), дефолт формы (`tableConfig.js:89`), сид (`seed.js:332`), 70% сида. Расходится только `groupController.js:32`. Убрать его фолбэк безопасно: клиент всегда шлёт поле (`payment_type` — `required: true`, `tableConfig.js:154`), т.е. фолбэк физически недостижим из UI, а `allowNull: false` делает `group.payment_type || 'бесплатной'` в `studyCertificateTemplate.js:187` мёртвым. В справке останется «на платной основе».
15. **C5** — уточнение к формулировке: тип «плавает» только внутри формы, **на проводе всегда `number[]`**; ветка по роли в `prepareFormData` (`dataHelpers.js:347`) на тип не влияет. Реальный дефект рядом: `parseInt(submitData.studentIds)` в ветке `USER` при массиве из нескольких id схлопывает его в первый молча (`["7","8"]` → `7`, студент 8 теряется). Сегодня недостижимо (`useAdminLogic` монтируется только из `pages/Admin.jsx`), но это мина. Фикс — схлопнуть ветку в один `.map(parseInt)`.
16. **B11** — уже, чем записано: `App.js:18-27` **уже** синхронизирует `UserStore` из `check()` при монтировании и не рендерит ничего до `loading === false`, поэтому «до первого ответа пользователь считается анонимом» неверно. Реально остаётся одно: `handleDelete` (`useAdminLogic.js:173`) запрещает удалять себя только на клиенте, а `userController.delete` (`:172`) такой проверки не имеет — `DELETE /api/user/:id` на свой id пройдёт. Фикс — серверная проверка `id === req.user.id`.
17. **B8, C6** — правило подтверждено [Пояснительной запиской.docx](Пояснительная%20записка.docx) (`doc.txt:245`): `USER` — один студент, `TEACHER` — несколько из своей группы, `ADMIN` — все. Значит серверная валидация объёма `studentIds` — **не** новое поведение, а перенос существующего правила с браузера на сервер, и `canSelectMultipleStudents(role)` в `consts.js` — не рефакторинг, а снятие дублирования. ⚠️ Валидацию надо поднять **выше** раннего возврата для `ADMIN` в `checkStudentsAccess` (`:45`): сейчас нечисловые id доходят до Sequelize и дают 500.

### Этап 3. Требует решения владельца

18. **M6** — `pending` / `approved` / `cancelled` — не опечатки, а недостающая бизнес-логика (см. M6). Требует расширения ENUM в Postgres через `ALTER TYPE ... ADD VALUE` **вручную** — `sync({ alter: true })` этого не делает — и пересмотра счётчика «новых заявок» (`Admin.jsx:17-18`), группировок в `Profile.jsx:110-115` / `RequestStatistics.jsx:91-99` / `RequestsManagement.jsx:86-97`, уведомления в `requestController.js:279-282` и кнопок в `RequestCard.jsx:395-426`. Сделать **после** D5, иначе получится ровно то расхождение, из-за которого статус и появился в UI.
19. **B10, R2** — по [Пояснительной записке.docx](Пояснительная%20записка.docx) в таблице «notifications» (табл. 2.5) поля `requestId` нет и не задумано; тело уведомления — просто `Заявка #${id}` (`doc.txt:267`). Значит решение — **удалить** блок в `NavBar.jsx:124-147` вместе с записью в `localStorage.viewedRequests`, и тогда R2 отпадает сам. Если вместо этого `requestId` всё же добавляют — сначала R2.
20. **D5** — словарей не 4, а 6 в клиенте. Карта должна нести несколько представлений (`label`, `labelPlural`, `labelFemininePast`, `labelGenitive`): бэкенду нужно `завершена`, таблице `Завершено`, профилю `Завершенные`, справке `первого`. Наивное объединение отправит в официальный документ неверную форму.
21. **M5** — остановка по `SIGINT`/`SIGTERM` в `server/index.js` (планировщик → `server.close()` → `sequelize.close()`). В коде её нет, несмотря на описание в AGENTS.md; `docker compose stop` сейчас просто убивает процесс. Отдельно решить, нужен ли `waitForIdle` для незавершённых `pg_dump`.

### Этап 4. Отложено

22. **D1, D2** — реестр шаблонов вместо 10 копий метода и 11 однотипных маршрутов. **Самый рискованный пункт:** меняет публичные пути API, на которые завязаны 12 мест в клиенте, тестов нет. Выигрыш выше, чем считалось изначально, потому что вёрстка уже вынесена в `layout.js`. `generatePracticeContract` остаётся на отдельном пути — он делает две копии договора на студента.
23. **D9** — вынести `<NotificationList>`, схлопнуть автообновление уведомлений. Меняет объём запросов — три вызова после действия пользователя (`:94`, `:105`, `:117`) схлопнуть нельзя.
24. **C8** — `supervisor` (`tableConfig.js:37`), `course` (`:40`), `duration` (`:46`). ⚠️ `supervisor` **живой**: `groupController.get` отдаёт ровно это дерево, и его читают ещё три модалки приказов. Пометка `{ computed: true }` безопасна; рефакторинг рендера — только вместе с удалением веток `TableCell.jsx:9-39`, иначе `value={null}` перестанет работать.
25. **B6** — Sequelize CLI-миграции вместо `sync({ alter: true })`; требует отдельного плана и тестовой БД. **Блокирует M6:** без ручного `ALTER TYPE` новые статусы не появятся.
26. **S1** — `supervisorRouter` + вкладка «Кураторы». Новая функциональность, не чистка; в списке администрируемых сущностей она есть (`doc.txt:28`, `:245`).
27. **D7** — отложено осознанно: общего модуля между ESM-клиентом и CommonJS-сервером нет, прецедента нет, тестов нет. Общая часть двух реализаций — около 10 строк, представления принципиально разные. Отдельно стоит починить две отсутствующие в серверной версии защиты (`documentGeneratorController.js:152-164`: пустой `enrollDate` → `NaN`, `course < 1` → в справку попадает строка `"0"`), но это B-уровень, а не D.

28. **C2** — убрать бесполезный `useMemo` в `useAdminLogic.js:249-293` и перевести мемо в `Profile.jsx:110-123` / `Admin.jsx:207` с ссылки массива на наблюдаемое значение. ⚠️ Предложенный в issues.md фикс «обернуть `getTableData` в `useMemo` по `data.entities[...]`» — регрессия: `create`/`update` не меняют ссылку массива, мемо начнёт отдавать устаревшие строки.

### Закрыто

- ~~**B14**, ~~**R1, R3, R7, R8**, ~~**B9, M9** — см. [issues-solved.md](issues-solved.md).
- **M7** («`ApiError.forbiddenRequest` не используется») — **ошибка issues.md**: у фабрики 6 вызывающих, см. актуальную формулировку выше.
