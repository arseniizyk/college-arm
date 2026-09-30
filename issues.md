# issues.md

Актуальные проблемы репозитория `diplom` (учебная часть колледжа). Решённые — в [issues-solved.md](issues-solved.md).

**Дата аудита:** 29.09.2026. **Область:** `server/` (Express + Sequelize) и `client/` (React 19 + CRA + MobX).
**Что не проверялось:** тесты и CI в проекте отсутствуют, динамический анализ не проводился. Все находки — статический разбор кода; выводы помечены `[!]`, если требуют подтверждения на живой БД.

**Осталось:** 6 в бизнес-логике, 5 в дублировании, 9 в мёртвом коде, 8 в клиенте, 1 в Docker, 4 из ревью.

---

## Замечания по ревью (30.09.2026)

Все проверены по коду и, где возможно, на живом сервере. Вердикт — по фактам, а не по формулировке.

R1, R3, R7, R8 → перенесены в [issues-solved.md](issues-solved.md)

### R2. Изменилось поведение `updateLocal` в `NavBar` — верно по механике, ветка недостижима
`client/src/components/NavBar.jsx:127-128`

`fetch` не бросал исключение на non-2xx, поэтому `updateLocal(..., {isViewed:true})` и запись в `localStorage.viewedRequests` происходили даже при отказе сервера. Теперь axios бросит — локальное состояние не обновится, причина уйдёт только в `console.error`.

**Оговорка:** ветка `notification?.requestId && userRole === 'ADMIN'` **недостижима** — в модели `Notification` поля `requestId` нет, условие всегда ложно (это **B10**). Регрессия реальна, но потенциальная.

**Фикс:** зависит от решения по B10. Если `requestId` добавляют — восстанавливать `try/catch` вокруг только `patch`, а локальное обновление выполнять независимо.

### R4. Многословный HTML-дамп в сообщении — преувеличено
`client/src/http/index.js:20-35`

Измерено на живом сервере:

| Сценарий | Content-Type | Длина сообщения |
|---|---|---|
| 404 неизвестного маршрута | `text/html` | **120 симв.** — «Error Cannot POST /api/…» |
| битый JSON в теле | `application/json` | 22 симв. |
| ошибка без `ApiError` | `application/json` | 22 симв. |

Стек Express в сообщение не попадает: `ErrorHandlingMiddleware` зарегистрирован последним и перехватывает всё, что до него доходит. HTML остаётся только от catch-all 404, и он короткий.

**Фикс:** обрезка по длине (например, 300 симв.) — гигиена на будущее, но срочности нет.

### R5. Нет проверки, что ответ действительно docx — кодом не подтверждается
`client/src/http/index.js:69`

Проверено: все 12 отправок документов — это `res.send(buffer)` после `Packer.toBuffer`. Ни одного `res.status(2xx)` перед отправкой буфера, ни одного `res.json` в этих обработчиках. Пути, при котором 2xx может нести не-docx, в коде нет.

**Фикс:** проверка `Content-Type` — защита от будущих изменений, а не от текущей проблемы. Дёшево, но не срочно.

### R6. `payload` молча игнорируется при `GET`, `params` не поддержан — верно, низкий приоритет
`client/src/http/index.js:60`

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
- `client/src/utils/tableConfig.js:86` — `payment_type: 'платной'`

Значение по умолчанию для формы обучения группы зависит от того, каким путём создана группа (UI, API без поля, прямая вставка в БД). Для документа, печатающего основание обучения, это даёт расхождение с фактическими данными.

**Фикс:** одно значение по умолчанию в модели, контроллер без собственного фолбэка.

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

### B9. Незавершённый обработчик `GET /api/request/:id`
`server/controllers/requestController.js:250-252` (маршрут — `routes/requestRouter.js:8`)

Назначение ручки понято верно: **получить данные одной конкретной заявки по `id`** — со студентами, группой, специальностью и автором, в том же составе, что отдаёт `GET /api/request`. Состояние:
```js
async getOne(req, res) {

}
```
Маршрут зарегистрирован, обработчик не делает ничего: не отправляет ответ и не вызывает `next`, поэтому запрос **висит до таймаута соединения** — не 404 и не 500, а «ничего не пришло». Заметить трудно: клиентского вызова ручки нет ни в одном файле `client/src`.

Практически ручка тесно связана с B10: сейчас единственный способ посмотреть заявку — скачать **все** заявки и отфильтровать в браузере, а в админке — копаться в общей таблице.

**Фикс:** реализовать `getOne` через `Request.findByPk(req.params.id, { include: [...] })`, переиспользовав `include`-дерево из `get`, и возвращать `ApiError.badRequest('Заявка не найдена')` при отсутствии записи. Заодно вынести это дерево в общий хелпер: сейчас три почти одинаковые простыни по 30-40 строк в `get`, `create` и `update`, и они уже разошлись — в `get` есть `order: [['last_name','ASC']]` для студентов, в остальных двух нет.

### B10. Неиспользуемая ветка «перейти к заявке» в уведомлениях
`client/src/components/NavBar.jsx:124-147`

```js
if (notification?.requestId && userRole === 'ADMIN') {
    await fetch(`.../api/request/${notification.requestId}/view`, { method: 'PATCH', ... });
```

В модели `Notification` поля `requestId` нет, и при создании уведомлений сервер его не проставляет. Условие всегда ложно — блок с переходом в админ-панель и пометкой заявки просмотренной недостижим. Из этого же следует, что счётчик непрочитанных заявок работает, а переход к конкретной заявке из уведомления — нет.

**Фикс:** добавить `requestId` в модель `Notification` и заполнять его при создании, либо удалить блок. От этого зависит решение по R2.

### B11. Клиентские проверки прав не имеют серверного эквивалента
`client/src/components/Admin.jsx`, `client/src/hooks/useAdminLogic.js:173-183`

`handleDelete` запрещает удалять собственный аккаунт только на клиенте. `UserStore` не хранит persisted-состояние — `checkToken()` смотрит лишь на наличие ключа в `localStorage` и не декодирует его, поэтому до первого ответа `GET /api/user/auth` в интерфейсе пользователь считается анонимом, а роль доступна как `USER`, если токен ещё не проверен. Проверки прав в `AppRouter` — косметика: сервер должен быть единственным источником истины.

**Фикс:** синхронизировать `UserStore` из ответа `/api/user/me` при монтировании `App`.

### B12 → перенесено в [issues-solved.md](issues-solved.md)

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

**Смежное:** в `TableCell.jsx` три мёртвых ключа — `pending`, `approved`, `cancelled` — которых нет в ENUM модели; см. **M6**.

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

⚠️ **`findById` стал мёртвым из-за D6:** после удаления `DataStore.getNameById` он потерял единственного вызывающего. Но `findByField` и `getStatistics` могут понадобиться при добавлении экранов — решение лучше принимать при планировании **D1/D2**, где нагрузка на стор перераспределится.

### M3. `loadAllData()` гарантированно падает на одной сущности
`client/src/store/DataStore.js:27,338-341`

`ENTITY_TYPES` включает `supervisors`, а `ENDPOINTS` отображает его в `/api/supervisor`. Такого маршрута нет ни в `server/routes/index.js`, ни в `server/models/models.js` (модель `Supervisor` существует, но контроллера/роутера нет). `Promise.all` в `loadAllData` отклонится по этой причине.

Метод сам по себе не вызывается — `useAdminLogic.js:42-50` перечисляет семь сущностей вручную, — то есть мёртвый код, который к тому же содержит ошибку.

**Фикс:** удалить `loadAllData` и `supervisors` из `ENTITY_TYPES`/`ENDPOINTS`, либо добавить `supervisorRouter` + контроллер.

### M4. Неиспользуемые экспорты `declension.js`
`server/utils/declension.js:85,103,121` — `declineLastName`, `declineFirstName`, `declineMiddleName`. В шаблонах используются только `declineFullName`, `declineFullNameAccusative` и `detectGender`.

**Фикс:** удалить три функции, оставив составной API.

### M5. `stopBackupScheduler` не вызывается
`server/utils/backupScheduler.js:55-60` — экспортируется, но нигде не импортируется. При этом в `server/index.js` нет обработки `SIGINT`/`SIGTERM`, поэтому планировщик останавливается только вместе с процессом.

**Фикс:** либо удалить, либо вызвать в обработчике сигналов — с явной остановкой `node-cron` задачи полезнее.

### M6. Статусы, которых нет в модели
`client/src/components/TableCell.jsx:71-86` — словари содержат `pending`, `approved`, `cancelled`, которых нет в ENUM `Request.status`. Мёртвые ветки, маскирующие опечатки в реальных статусах.

**Фикс:** оставить только `in_progress`, `completed`, `rejected` (или вынести словарь на сервер, см. D5).

### M7. `ApiError.forbiddenRequest` не используется
`server/error/ApiError.js:13-15` — 403 отдаётся руками в `checkRoleMiddleware.js:16`.

**Фикс:** использовать фабрику в middleware, чтобы не дублировать магическое число.

### M8. Неиспользуемые импорты
`server/controllers/requestController.js:1,2` (`uuid`, `path`) — не используются. `server/controllers/groupController.js:3` (`const { where } = require('sequelize')`) — не используется. `server/index.js:5` (`const models = require('./models/models')`) — присваивается, но не используется явно (нужен ради регистрации моделей — лучше заменить на require без присваивания).

**Фикс:** почистить; ESLint-конфига в `server/` нет, поэтому такие вещи не отлавливаются автоматически.

### M9. Ручное удаление связей, которое уже делает сама БД
`server/controllers/requestController.js:286`

```js
await StudentRequest.destroy({ where: { requestId: id } });
await request.destroy();
```

В схеме БД стоит `student_requests_requestId_fkey ... ON DELETE CASCADE`, поэтому `request.destroy()` и так удаляет все `StudentRequest` этой заявки. Явный `destroy` — избыточный лишний запрос, который при этом создаёт окно между двумя операциями.

**Фикс:** удалить строку и положиться на `ON DELETE CASCADE`; учитывая, что работа с заявками уже обёрнута в транзакцию (см. B4 в solved).

---

## Баги и расхождения в клиенте

### C1. Даты `createdAt` показываются сырым ISO-строкой
`client/src/components/TableCell.jsx:53`

```js
if (columnKey.toLowerCase().includes('date')) { ... }
```

Колонки «Создан»/«Создана» используют ключ `createdAt`. `'createdat'.includes('date')` → `false` (внутри `createdAt` нет подпоследовательности `d-a-t-e`), поэтому в таблице выводится `2026-06-25T09:06:30.000Z`. При этом `enroll_date`/`expell_date` форматируются корректно.

**Фикс:** проверять набор имён явно: `['enroll_date','expell_date','createdAt','updatedAt'].includes(columnKey)`.

### C2. `useMemo` в админке и профиле не мемоизирует ничего
`client/src/hooks/useAdminLogic.js:246`, `client/src/pages/Profile.jsx:110` и `:113`

```js
const tableData = getTableData(activeTab, data);   // вне useMemo, возвращает toJS(...) — новый массив
const filteredData = useMemo(() => filterData(tableData, ...), [tableData, ...]);
```

`getTableData` вызывает `toJS()` и возвращает свежий массив на каждом рендере, поэтому `tableData` всегда новая ссылка и `useMemo` пересчитывает фильтрацию и сортировку каждый раз.

**Фикс:** обернуть `getTableData(...)` в `useMemo` по `[activeTab, data.entities[...]]`, либо считать `filteredData` без `useMemo`.

### C3. Потеря выбранных студентов при быстрых кликах
`client/src/components/MultiselectStudents.jsx:66` и `:93`

```js
const currentValues = formData[field.name] || [];   // значение из замыкания на момент рендера
newValues = [...currentValues, value];
setFormData(prev => ({ ...prev, [field.name]: newValues }));  // prev не используется
```

`currentValues` берётся из `formData` props (снимок на момент рендера), а не из `prev` внутри апдейтера. Два быстрых переключения чекбоксов до ре-рендера приводят к тому, что второй вызов посчитает значения по устаревшему снимку и потеряет первое изменение.

**Фикс:** `setFormData(prev => ({ ...prev, [field.name]: [...(prev[field.name] || []), value] }))`.

### C4. Прямая мутация приватного поля стора
`client/src/components/NavBar.jsx:69`

```js
data._entities.notifications = []
```

Обращение к приватному полю MobX-объекта снаружи стора в обход публичного API. Присваивание в обход action нарушает инварианты стора (MobX 6 в режиме `enforceActions: "observed"` выдаст предупреждение) и делает состояние неуправляемым.

**Фикс:** добавить в `DataStore` публичный метод `clear(entityType)`.

### C5. Тип `studentIds` плавает между строками и числами
`client/src/hooks/useAdminLogic.js:163` против `:118`

```js
// handleEdit — строки
studentIds: item.students.map(student => student.id.toString())
// handleRequestStatusChange — числа
studentIds: request.students.map(s => s.id)
```

Оба значения уходят в `prepareFormData`, который приводит тип в зависимости от `userRole`.

**Фикс:** зафиксировать один тип (числа) на границе стора, преобразование строк — только в обработчиках форм.

### C6. Разные правила ветвления по роли в соседних файлах
- `client/src/utils/tableConfig.js:121` — `userRole === 'USER' ? 'select' : 'multiselect'`
- `client/src/utils/dataHelpers.js:299` — `if (userRole === 'USER') { ... } else { ... }`
- `client/src/pages/Request.jsx:200` — `userRole === 'ADMIN' || userRole === 'TEACHER' ? 'multiselect' : 'select'`

Первое и второе относят любую новую роль к ветке «несколько студентов», третье — к ветке «один студент». При появлении роли, отличной от `USER`/`ADMIN`/`TEACHER`, страницы будут вести себя по-разному.

**Фикс:** одна функция `canSelectMultipleStudents(userRole)` в `utils/consts.js`. Пересекается с **B8**.

### C7. Размер страницы захардкожен в трёх местах
`client/src/hooks/useAdminLogic.js:24` (`itemsPerPage = 10`), `client/src/components/TableContent.jsx:88` (`(currentPage - 1) * 10 + index + 1`), `client/src/pages/Profile.jsx:21` (`itemsPerPage = 10`)

Нумерация строк пересчитывается с константы `10`, а не со значением `itemsPerPage`.

**Фикс:** передавать `itemsPerPage` в `TableContent` как проп.

### C8. Поля, которых нет в колонках таблицы
`client/src/utils/tableConfig.js:36,39,45`

Колонки `supervisor`, `course`, `duration` не соответствуют полям API — `TableContent` и `TableCell` обрабатывают их вручную. Работает, но конфигурация перестала быть источником правды: любая новая колонка потребует правки в трёх файлах.

**Фикс:** помечать такие колонки флагом `{ key: 'course', computed: true }` и рендерить их одним универсальным кодом.

---

## Docker

### K2. Нет healthcheck
`server/Dockerfile` — контейнер не сообщает о готовности; `docker compose` и оркестраторы будут считать его здоровым с момента старта, хотя приложение слушает порт только после `sequelize.authenticate()` и `sync({ alter: true })`.

**Фикс:** добавить `HEALTHCHECK` на `GET /api/...` (нужен публичный health-эндпоинт, которого сейчас нет).

---

## Рекомендуемый порядок работ

1. ~~**B14**~~ — **закрыто**, см. [issues-solved.md](issues-solved.md).
2. ~~**R1, R3, R7, R8**~~ — **закрыто**, см. [issues-solved.md](issues-solved.md). Следующий шаг — **пункт 3**.
3. **B7, B9, M9** — привести бизнес-правила к единому виду: один дефолт `payment_type`, рабочая ручка `/:id`, лишний `destroy`.
4. **B8, C6** — серверная валидация объёма `studentIds` + единая `canSelectMultipleStudents(userRole)`.
5. **B10, R2** — решение по `Notification.requestId`; от него зависит, чинить ли R2.
6. **M1–M8** — чистка мёртвого кода; безопасна, делается механически.
7. **D9** — вынести `<NotificationList>`, схлопнуть автообновление уведомлений. Меняет объём запросов — три вызова после действия пользователя схлопнуть нельзя.
8. **R4, R5, R6** — гигиена: обрезка длинных сообщений, проверка Content-Type, поддержка `params` в `downloadDoc`.
9. **D1, D2** — реестр шаблонов вместо 10 копий метода и 11 однотипных маршрутов. **Самый рискованный пункт:** меняет публичные пути API, на которые завязаны 12 мест в клиенте, тестов нет. Выигрыш выше, чем считалось изначально, потому что вёрстка уже вынесена в `layout.js`. `generatePracticeContract` остаётся на отдельном пути.
10. **B11, D5, C1–C5, C7, C8** — точечные улучшения. D5 требует карты с несколькими грамматическими формами. **K2** — healthcheck: требует публичного health-эндпоинта, поэтому отдельным шагом.
11. **B6** — Sequelize CLI-миграции вместо `sync({ alter: true })`; требует отдельного плана и тестовой БД.
12. **D7** — отложено осознанно: общего модуля между ESM-клиентом и CommonJS-сервером нет, прецедента нет, тестов нет. Отдельно стоит починить две отсутствующие в серверной версии защиты (`enrollDate` пустой и `course < 1` → в справку попадает строка `"0"`), но это B-уровень, а не D.
