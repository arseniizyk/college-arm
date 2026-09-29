# issues.md

Аудит репозитория `diplom` (учебная часть колледжа): безопасность, дублирование, мёртвый код, расхождения в бизнес-логике.

**Дата аудита:** 29.09.2026. **Область:** `server/` (Express + Sequelize) и `client/` (React 19 + CRA + MobX).
**Что не проверялось:** тесты и CI в проекте отсутствуют, динамический анализ не проводился. Все находки — статический разбор кода; выводы помечены `[!]`, если требуют подтверждения на живой БД.

---

## Секьюрити (блокер)

### ✅ DONE — S1. Чтение, удаление и пометка заявок полностью без аутентификации
`server/routes/requestRouter.js:7,10,11`

```js
router.get('/', requestController.get)               // без authMiddleware
router.get('/:id', requestController.getOne)         // без authMiddleware
router.patch('/:id/view', requestController.markAsViewed) // без authMiddleware
router.delete('/:id', requestController.delete)      // без authMiddleware
```

`requestController.get` (`controllers/requestController.js:107-144`) отдаёт **все** заявки со всеми связанными сущностями: ФИО, отчество, номер приказа, даты зачисления/отчисления студентов, email и роль пользователей-авторов, статус и описание заявки. Это персональные данные всех студентов колледжа.

`requestController.delete` (`:276-295`) без проверок удаляет заявку вместе со связями `StudentRequest` — неавторизованный запрос `DELETE /api/request/1` стирает данные.

**Фикс:** добавить `authMiddleware` на все четыре маршрута; на `GET /` и `DELETE /:id` дополнительно `checkRoleMiddleware('ADMIN')`.

> **Исправлено.** На все маршруты `requestRouter` добавлен `authMiddleware`, на `GET /` и `DELETE /:id` — также `checkRoleMiddleware('ADMIN')`.
> Побочное следствие, потребовавшее отдельной правки: `GET /api/request` стал доступен только администратору, а `client/src/pages/Profile.jsx` загружал **все** заявки и фильтровал их в браузере — вкладка «мои заявки» перестала бы работать. Поэтому добавлен `GET /api/request/mine` (`requestController.getMine`, фильтр `where: { userId: req.user.id }` на сервере), метод `DataStore.fetchMyRequests()` и переход `Profile.jsx` на него (см. также B2).

### ✅ DONE — S2. IDOR: любой авторизованный пользователь может изменить чужую заявку
`server/routes/requestRouter.js:9` + `server/controllers/requestController.js:146-248`

На `PUT /api/request/:id` стоит только `authMiddleware`. Внутри `update` переменная `userId` объявлена (`:150`), но **нигде не используется** — принадлежность заявки к пользователю не проверяется. В результате пользователь с ролью `USER` может:

- менять `status` любой заявки (`in_progress` / `completed` / `rejected`);
- подменять `documentId` и `description`;
- переписывать список `studentIds` (`:180-193` — полное удаление и пересоздание связей).

**Фикс:** сравнивать `request.userId !== req.user.id` и отклонять запрос, либо разрешать правку статуса только при `checkRoleMiddleware('ADMIN')`.

> **Исправлено.** В `requestController.update` добавлены две проверки: 403 (`ApiError.forbiddenRequest`), если `request.userId !== req.user.id` и роль не `ADMIN`; 403, если передан `status` и роль не `ADMIN`. Роль берётся из `req.user.role` (то есть из токена) — наряду с S8 это остаётся слабым местом: понижение роли в БД не действует до истечения токена.

### ✅ DONE — S3. Command injection при восстановлении из бэкапа
`server/utils/backup.js:102,116` (валидация — `server/controllers/backupController.js:77`)

```js
// backupController.js:77 — единственная проверка
if (!fileName || !fileName.endsWith('.sql')) { ... }
// backup.js:111-116
const backupPath = path.join(backupDir, fileName);
const command = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupPath}"`;
exec(command, { env }, ...);
```

`fileName` из тела запроса подставляется в строку команды через `path.join`, который не экранирует кавычки. Значение вида `x"; whoami; echo ".sql` проходит проверку `endsWith('.sql')` и разрывает кавычки внутри команды — выполняется произвольная команда ОС от имени процесса Node.

**Фикс:** не собирать команду строками — использовать `execFile('psql', [...args])` без shell, либо `spawnSync` с массивом аргументов. Как минимум добавить `path.basename(fileName)` и whitelist регулярным выражением `^backup_\d{4}-\d{2}-\d{2}\.sql$`.

> **Исправлено.** `server/utils/backup.js`: `exec` заменён на `execFile` с массивами аргументов — и для `psql` (восстановление), и для `pg_dump` (создание, там та же строка со сборкой команды); параметры подключения вынесены в `getDbArgs()`. Добавлен `resolveBackupPath()`: whitelist `^backup_\d{4}-\d{2}-\d{2}\.sql$` + проверка, что `path.resolve` не вышел за пределы каталога `backups`. `backupController.restore` теперь тоже проверяет имя регулярным выражением, а не `endsWith('.sql')`.
> Рядом осталась не закрытая этим пунктом дыра в том же файле — см. S4.

### S4. Path traversal при скачивании бэкапа
`server/controllers/backupController.js:50-58`

```js
if (!fileName || !fileName.endsWith('.sql')) { ... }
const backupPath = path.join(__dirname, '../backups', fileName);
res.download(backupPath, fileName, ...)
```

`path.join` нормализует `..`, поэтому `..%2f..%2fetc%2fpasswd.sql` (Express декодирует `%2f` в параметре маршрута) выходит за пределы каталога `backups`. Ограничение по расширению `.sql` сужает, но не закрывает возможность читать произвольные `.sql`-файлы на диске.

**Фикс:** `const safe = path.basename(fileName); if (safe !== fileName) return 400;` плюс `path.resolve` + проверка, что итоговый путь начинается с `backupDir + path.sep`.

### S5. Публичный доступ к персональным данным всех студентов
`server/routes/studentRouter.js:7`

```js
router.get('/', studentController.get)  // без authMiddleware
```

`studentController.get` (`controllers/studentController.js:64-157`) отдаёт ФИО, отчество, номер приказа, даты зачисления и отчисления, группу и специальность **всех** студентов без токена. Скриптовое сканирование одного эндпоинта даёт полную базу студентов.

Публичными (без auth) остаются также `GET /api/group`, `/api/specialty`, `/api/teacher`, `/api/document` — они менее чувствительны, но по той же причине не требуют токен.

**Фикс:** `authMiddleware` на `GET /:resource`; для `/api/student` — `checkRoleMiddleware('ADMIN')`.

### S6. Хеши паролей уходят в ответе API
`server/controllers/userController.js:69` и `:91`

```js
let users = await User.findAll()   // без attributes — отдаёт password
res.json(user)                    // create: тоже без exclude
```

В модели `User` нет `defaultScope` (`server/models/models.js:65-70`), поэтому `findAll` сериализует колонку `password` (bcrypt-хеш). При этом `update` и `getMe` пароль исключают корректно (`:130`, `:54`) — поведение непоследовательно.

**Фикс:** добавить `defaultScope: { attributes: { exclude: ['password'] } }` в модель `User`; в `get`/`create` передавать явный `attributes`.

### S7. `next()` без `return` на preflight-запросах
`server/middleware/authMiddleware.js:4-6`, `server/middleware/checkRoleMiddleware.js:6-8`

```js
if (req.method === "OPTIONS") {
    next()          // выполнение продолжается в try → падение на req.headers.authorization
}
```

Для CORS-preflight вызывается `next()`, после чего код проваливается в `try` и пытается разобрать отсутствующий заголовок → 401 вместо успешного preflight.

**Фикс:** `return next()` в обеих функциях.

### S8. Роль зашивается в токен и не перечитывается из БД
`server/middleware/checkRoleMiddleware.js:14-16`, `server/controllers/userController.js:6-12`

`checkRoleMiddleware` сверяет `decoded.role` из JWT и не обращается к БД. `userController.check` (`:44-47`, эндпоинт `GET /api/user/auth`) перевыпускает токен из данных **самого токена**, а не из записи пользователя. Итог: понижение/повышение роли через админку или вручную в БД не действует, пока пользователь не выполнит вход заново. Для процесса выдачи справок с правами администратора это означает, что отозванный доступ продолжает работать до истечения 24-часового токена.

**Фикс:** в `checkRoleMiddleware` после `jwt.verify` подтягивать пользователя из БД и сверять актуальную роль; в `check` перевыпускать токен по `User.findByPk(req.user.id)`.

---

## Бизнес-логика и целостность данных

### B1. Нет связи «пользователь → студент»
`server/controllers/requestController.js:9-40`, `client/src/pages/Request.jsx`

В модели `User` нет связи со `Student`. Любой зарегистрировавшийся пользователь (роль `USER`) при создании заявки выбирает **произвольного** студента из полного списка и заказывает на него справку об обучении, договор и т.д. Администратор, обрабатывая заявку, не может отличить «свою» заявку от поданной за другого человека.

**Фикс:** добавить `userId` (или `email`) в модель `Student` и валидировать на сервере, что заявка подана на студента, привязанного к `req.user.id`.

### B2. «Свои заявки» фильтруются на клиенте
`client/src/pages/Profile.jsx:72` и `:110`

```js
await Promise.all([ data.fetchAll('requests'), ... ]);   // тянет ВСЕ заявки
const userRequests = data.requests.filter(req => req.userId === currentUser?.id);
```

Браузер пользователя забирает и держит в памяти заявки всех остальных пользователей (см. также S1 — сервер их и так отдаёт всем).

**Фикс:** эндпоинт `GET /api/request/mine`, фильтрация по `req.user.id` на сервере.

### B3. `ApiError.badRequest` возвращает HTTP 404
`server/error/ApiError.js:9-11`

```js
static badRequest(message) {
    return new ApiError(404, message)   // должно быть 400
}
```

Все сообщения валидации по всему приложению отдаются как «не найдено». Логика и сообщения корректны, код статуса нет — расходится контракт API с семантикой ответов.

**Фикс:** `new ApiError(400, message)`.

### B4. Нет транзакции при обновлении заявки
`server/controllers/requestController.js:177-193`

`request.update()` выполняется, затем `StudentRequest.destroy(...)`, затем `Promise.all` на создание новых связей. Если создание хотя бы одной связи упадёт (например, из-за FK), заявка останется со статусом/описанием, изменёнными по запросу, но **без студентов** — при этом `studentIds` в UI не пуст. Аналогично `create` (`:30-40`): заявка создаётся, связи падают → остаётся «висячая» заявка.

**Фикс:** обернуть в `sequelize.transaction()`.

### B5. Удаление группы / специальности / преподавателя обнуляет связи (`ON DELETE SET NULL`)
`server/controllers/groupController.js:163-182`, `specialtyController.js:58-76`, `teacherController.js:56-74`

Механизм проверен по схеме живой БД (`server/backups/backup_2026-06-25.sql`): **все** FK в моделях созданы с `ON DELETE SET NULL`, а колонки `groupId` / `specialtyId` / `teacherId` nullable.

```sql
ALTER TABLE ONLY public.students   ADD CONSTRAINT "students_groupId_fkey"     FOREIGN KEY ("groupId")    REFERENCES public.groups(id)     ON DELETE SET NULL;
ALTER TABLE ONLY public.groups    ADD CONSTRAINT "groups_specialtyId_fkey"   FOREIGN KEY ("specialtyId") REFERENCES public.specialties(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.supervisors ADD CONSTRAINT "supervisors_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id)    ON DELETE SET NULL;
```

То есть это **не** каскадное удаление и не ошибка FK: строки-зависимые не удаляются, у них просто обнуляется ссылка, и операция проходит «успешно» без какого-либо предупреждения. Ни один контроллер не проверяет наличие зависимостей перед `destroy()`.

Последствия по каждому случаю (согласовано с владельцем проекта):

- **Группа — поведение принято как есть.** Уточнение по механике: студенты группы не удаляются, у них `groupId` становится `NULL`. Студент не исчезает из БД, но отваливается от группы: в выпадающих списках получает метку «Без группы» (`client/src/utils/dataHelpers.js:99`), из фильтра по группе выпадает, а в `GET /api/student` возвращается с `groupId: null`. Отдельный неприятный эффект: в `documentGeneratorController.js:63-65` студенты без группы **молча пропускаются** при генерации справки (`if (!group || !specialty) continue`) — они просто не попадут в документ, без ошибки и без записи в лог.
- **Специальность — каскадное поведение НЕ приемлемо, чинить нужно.** `groups.specialtyId` обнуляется у всех групп специальности, сами группы остаются. Дальше: в таблице групп колонка «Специальность» показывает `-` (`TableContent.jsx:159-167` → `getNameById` → `ID: null`), фильтр по специальности их больше не показывает, а `documentGeneratorController.js:63-65` пропускает **всех студентов всех этих групп** при генерации любых документов. Для учебной части это тихая порча выдачи справок, причём испорченные группы ничем в интерфейсе не выделяются.
  **Фикс:** перед `destroy()` в `specialtyController.delete` считать `Group.count({ where: { specialtyId: id } })` и при ненулевом результате отдавать `ApiError.badRequest('Специальность используется в N группах — сначала переведите группы')`; либо явно задать `Specialty.hasMany(Group, { onDelete: 'RESTRICT' })` в `models.js:81`, чтобы БД сама отказывала в удалении.
- **Преподаватель — кейс признан приемлемым.** Фактически `supervisors.teacherId` обнуляется, строка куратора остаётся; `groupController.get:78-85` тянет `Supervisor → Teacher`, и в таблице групп колонка «Куратор» покажет `-` (`TableContent.jsx:130-139`). Оставляем как есть.

**Побочно, тот же `SET NULL` ломает историю заявок при удалении пользователя.** `requests.userId` и `notifications.userId` — тоже `ON DELETE SET NULL`, а удалять пользователей разрешено (`userRouter.js:17` для админа, `userRouter.js:13` самостоятельно через `/delete-my-account`). После удаления пользователя его заявки остаются с `userId = NULL` и:

- перестают отображаться у кого-либо — `Profile.jsx:110` фильтрует по `req.userId === currentUser?.id`, то есть заявки пропадают из интерфейса навсегда (связано с B1/B2);
- при попытке сменить статус такой заявки `requestController.js:206-210` создаст `Notification` с `userId: null` — уведомление без получателя, которое никто никогда не увидит.

**Фикс:** перед удалением пользователя переносить его заявки в архивное состояние либо запрещать удаление при наличии заявок; в любом случае — `onDelete: 'RESTRICT'` для `Request.userId` и `Notification.userId` (`models.js:96,99`).


### B6. `sequelize.sync({ alter: true })` на каждом старте
`server/index.js:34`

```js
await sequelize.sync({ alter: true })
```

При каждом запуске сервера Sequelize сверяет модель со схемой и может выполнить `ALTER TABLE` по живой базе — в том числе на боевом postgres из контейнера. Схема меняется без миграций и без возможности отката; структура таблиц зависит от состояния, в котором сервер последний раз выключали.

**Фикс:** `sync()` только в dev-режиме (по `NODE_ENV`), в production — Sequelize CLI-миграции. Отдельная находка: `sequelize.sync({ alter: true })` в связке с `DatabaseError` глушится общим `catch` в `index.js:40-42` (`console.log(e)`), после чего сервер просто не поднимается без внятного сообщения.

### B7. Три разных значения по умолчанию для `payment_type`
- `server/models/models.js:10-13` — `defaultValue: 'платной'`
- `server/controllers/groupController.js:32` — `payment_type || 'бесплатной'`
- `client/src/utils/tableConfig.js:86` — `payment_type: 'платной'`

Значение по умолчанию для формы обучения группы зависит от того, каким путём создана группа (UI, API без поля, прямая вставка в БД). Для документа, печатающего основание обучения, это даёт расхождение с фактическими данными.

**Фикс:** одно значение по умолчанию в модели, контроллер без собственного фолбэка.

### B8. Правило «сколько студентов можно выбрать» существует только в браузере
`client/src/utils/tableConfig.js:121`, `client/src/utils/dataHelpers.js:299`, `client/src/pages/Request.jsx:200`, `client/src/hooks/useAdminLogic.js:151`, сервер — `server/controllers/requestController.js:13-15`

Задумка (уточнено с владельцем проекта): роль `TEACHER` — выбор любого числа студентов в рамках группы, как у админа; роль `USER` — выбор ровно одного студента. Проблема в том, что это правило нигде не зафиксировано на сервере:

```js
// requestController.js:13-15 — единственная проверка studentIds
if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return next(ApiError.badRequest('Не выбран ни один студент'));
}
```

`studentIds.length === 0` — и всё. Любой пользователь с ролью `USER`, вызвав `POST /api/request` напрямую из консоли или перехватив запрос, отправит массив из десяти произвольных студентов, и сервер это примет. Ограничение «один студент» держится исключительно на типе поля в форме (`Request.jsx:200`), то есть на клиенте.

Смежные расхождения по той же теме:

- **Роль `TEACHER` не имеет серверного смысла.** `checkRoleMiddleware` знает только `'ADMIN'`, `role` в `models.js:69` — свободная строка без ENUM. То есть на API преподаватель неотличим от обычного пользователя; ни одна его «привилегия» (мультивыбор) не является привилегией. Роль назначается в UI (`tableConfig.js:109`), отображается бейджем «Преподаватель» (`TableCell.jsx:94`), но на сервере не проверяется нигде.
- **Правило продублировано в трёх местах и уже разошлось** — см. C6: `tableConfig.js` и `dataHelpers.js` ветвятся по `userRole === 'USER'`, а `Request.jsx:200` — по `userRole === 'ADMIN' || userRole === 'TEACHER'`. Любая новая роль поведёт себя в этих трёх точках по-разному.
- **Ограничение «в рамках группы» тоже только клиентское.** В форме заявки студенты фильтруются по группе (`MultiselectStudents.jsx:40`), но сервер не проверяет, что выбранные студенты относятся к одной группе — заявка может связать студентов из разных групп, и при генерации документов это выглядит как ошибка данных.

**Пометка для пересмотра (по мнению владельца проекта).** Само правило «пользователь — один студент, преподаватель — вся группа» представляется логически бессмысленным и, вероятно, требует пересмотра: связь «пользователь → студент» в модели отсутствует (см. B1), поэтому система не может обосновать, почему этому человеку можно заказывать справку на одного студента, а тому другому — на группу. Рациональные варианты: (а) привязать пользователя к студенту/группе в модели и брать допустимый набор оттуда; (б) снять ограничение и разрешить всем подбор любого числа студентов, оставив админский аудит заявки; (в) оставить как есть, но перенести правило на сервер, чтобы оно хотя бы исполнялось. Решение за владельцем продукта; здесь оно зафиксировано как «осознанное техническое долг, а не баг».

**Фикс (независимо от решения по продукту):** единая функция `canSelectMultipleStudents(userRole)` в `client/src/utils/consts.js` вместо трёх инлайновых проверок, и серверная валидация объёма `studentIds` по роли в `requestController.create`. Дополнительно: сделать `role` ENUM в `models.js:69` по аналогии с `Request.status` и `Group.payment_type`, чтобы недопустимая роль не могла быть записана произвольно.

### B9. Незавершённый обработчик `GET /api/request/:id`
`server/controllers/requestController.js:250-252` (маршрут — `routes/requestRouter.js:8`)

Назначение ручки понято верно: **получить данные одной конкретной заявки по `id`** — со студентами, группой, специальностью и автором, в том же составе, что отдаёт `GET /api/request`. Состояние сейчас следующее:

```js
async getOne(req, res) {

}
```

Маршрут зарегистрирован (`requestRouter.js:8`), обработчик не делает ничего: не отправляет ответ и не вызывает `next`, поэтому запрос **висит до таймауса соединения** — не 404 и не 500, а «ничего не пришло». Заметить это трудно, потому что клиентского вызова ручки нет ни в одном файле `client/src`.

Практически ручка тесно связана с B1/B2: сейчас единственный способ посмотреть заявку — скачать **все** заявки (`Profile.jsx:72`) и отфильтровать в браузере (`:110`), а в админке (`useAdminLogic.js:45`) — копаться в общей таблице. То есть `/:id` — это ровно та недостающая деталь, с которой чинить B1/B2, а не просто «дописать метод»:

- `RequestsManagement` / `RequestCard` смогут открывать карточку заявки по `id` без загрузки всей таблицы (существенно для `Admin.jsx:21-41`, где список перезапрашивается целиком каждую минуту);
- после починки B2 (`GET /api/request/mine`) на её основе можно будет проверять право доступа к конкретной заявке, а не только к списку.

**Фикс:** реализовать `getOne` через `Request.findByPk(req.params.id, { include: [...] })`, переиспользовав `include`-дерево из `get`, и возвращать `ApiError.badRequest('Заявка не найдена')` при отсутствии записи. Заодно вынести это дерево в общий хелпер: сейчас три почти одинаковые простыни по 30-40 строк в `get` (`:109-139`), `create` (`:70-98`) и `update` (`:214-242`), и они уже разошлись — в `get` есть `order: [['last_name','ASC']]` для студентов, в остальных двух нет.

### B10. Неиспользуемая ветка «перейти к заявке» в уведомлениях
`client/src/components/NavBar.jsx:124-147`

```js
if (notification?.requestId && userRole === 'ADMIN') {
    await fetch(`.../api/request/${notification.requestId}/view`, { method: 'PATCH', ... });
```

В модели `Notification` (`server/models/models.js:72-77`) поля `requestId` нет, и при создании уведомлений сервер его не проставляет (`requestController.js:59-65`, `:206-210`). Условие всегда ложно — блок с переходом в админ-панель и пометкой заявки просмотренной недостижим. Из этого же следует, что счётчик непрочитанных заявок в `Admin.jsx:18` работает, а переход к конкретной заявке из уведомления — нет.

**Фикс:** добавить `requestId` в модель `Notification` и заполнять его при создании, либо удалить блок.

### B11. Клиентские проверки прав не имеют серверного эквивалента
`client/src/components/Admin.jsx`, `client/src/hooks/useAdminLogic.js:173-183`

`handleDelete` запрещает удалять собственный аккаунт только на клиенте. `UserStore` вообще не хранит persisted-состояние — `checkToken()` (`:12-15`) смотрит лишь на наличие ключа в `localStorage` и не декодирует его, поэтому до первого ответа `GET /api/user/auth` в интерфейсе пользователь считается анонимом, а роль доступна как `USER` (не как `ADMIN`), если токен ещё не проверен. Проверки прав в `AppRouter` (`:11-13`) — косметика: сервер всё равно должен быть единственным источником истины (см. S1, S2, S5).

**Фикс:** не полагаться на клиентские проверки; синхронизировать `UserStore` из ответа `/api/user/me` при монтировании `App`.

---

## Дублирование кода

### D1. Десять копий одного и того же метода генерации приказа
`server/controllers/adminDocumentController.js:70-290`

Методы `generateExamAdmissionOrder`, `generateHolidaysOrder`, `generateStipendOrder`, `generateSnowCleaningOrder`, `generateStudentDirectionOrder`, `generateHealthOrder`, `generateTransferOrder`, `generateDuplicateTicketOrder`, `generateEnrollmentOrder`, `generateReleaseOrder` отличаются друг от друга тремя строками: именем шаблона, именем файла и текстом в `console.error`. Одинаковы: `Packer.toBuffer`, `Content-Type`, `Content-Disposition`, отступы страницы, `try/catch`. Это ~200 строк копипасты.

**Фикс:** один `generate(templateFactory, filePrefix)` + таблица `{ routeKey: { template, filePrefix, margin } }` в `documentGeneratorRouter.js`.

### D2. Одиннадцать однотипных POST-маршрутов
`server/routes/documentGeneratorRouter.js:24-69`

Каждый приказ — отдельный блок `router.post` с одинаковыми `authMiddleware` и `checkRoleMiddleware('ADMIN')`.

**Фикс:** общий `router.post('/:type', auth, checkRole('ADMIN'), handler)` поверх реестра шаблонов (то же, что решит D1).

### D3. Восемнадцать прямых `fetch()` в обход axios-слоя
`client/src/components/*OrderModal.jsx` (11 файлов), `NavBar.jsx:128`, `RequestCard.jsx:179,209`, `Profile.jsx:60,212,275,338`

Все 18 мест используют шаблон:

```js
fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/...`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
```

Проблемы:
- **Неверный fallback-порт:** `5000` вместо `7000` (`server/.env:1`, `client/.env:1`). Сработает только потому, что `REACT_APP_API_URL` задан в `client/.env`; при его отсутствии или сборке без `.env` все эти запросы уйдут на несуществующий порт.
- Теряются интерсептор авторизации и нормализация ошибок из `client/src/http/index.js`; обработка ошибок в каждом файле своя.
- Двенадцать копий логики скачивания blob (`createObjectURL` → `a.click()` → `revokeObjectURL`) с различающимися именами файлов.

**Фикс:** один хелпер в `client/src/http/index.js` (например, `downloadDoc(path, payload, fileName)` на базе `$authHost`), порядковые маршруты заменить параметризованными.

### D4. Форматирование строк колонок продублировано
`server/controllers/adminDocumentController.js:72-290`, `client/src/components/TableContent.jsx:128-140`, `client/src/components/OrderStudentSelector.jsx:50`, `client/src/components/MultiselectStudents.jsx:17`, `client/src/utils/dataHelpers.js:98,119`

Формат ФИО `${last_name} ${name} ${father_name || ''}`.trim() собирается вручную минимум в шести местах, и уже разошёлся: `TableContent.jsx:135` не делает `.trim()`, `dataHelpers.js:119` — делает. При пустом отчестве в таблице остаётся хвостовой пробел.

**Фикс:** единая функция `formatFio(student)` в `utils/dataHelpers.js`.

### D5. Словари статусов заявки продублированы в четырёх местах
- `server/models/models.js:47-51` — ENUM `in_progress | completed | rejected`
- `server/controllers/requestController.js:197-201` — `statusTranslations` (уведомление)
- `client/src/hooks/useAdminLogic.js:131-135` — `statusNames` (тост)
- `client/src/components/TableCell.jsx:66-81` — `statusTranslations` + `statusColors`

**Фикс:** отдавать подписи и цвета с бэкенда (например, `GET /api/request/statuses`) либо держать один клиентский словарь в `utils/consts.js` и использовать и в `useAdminLogic`, и в `TableCell`.

### D6. `getDropdownOptions` и `getNameById` реализованы дважды
- `client/src/utils/dataHelpers.js:62-104` и `:107-129`
- `client/src/store/DataStore.js:344-350` и `:353-358`

Обе версии строят одинаковые `{ value, label }` и одинаково формируют `ID: ${id}` при отсутствии записи. Расходятся в деталях: `DataStore` для `getNameById` умеет `getNameById(entityType, id, nameField)`, а `dataHelpers` — хардкод по имени поля.

**Фикс:** оставить реализацию в `DataStore` (у неё есть доступ к состоянию) и убрать копию из `dataHelpers`.

### D7. Логика расчёта курса реализована дважды, по-разному
- `client/src/utils/dataHelpers.js:10-44` — возвращает `'Выпускник'` (с большой буквы)
- `server/controllers/documentGeneratorController.js:132-144` — возвращает `'выпускник'` и словарь `['первого','второго','третьего','четвертого']`

Обе реализации в целом совпадают (учебный год с 1 сентября, `maxCourse` с учётом месяцев), но различаются регистром и набором представлений: в админ-таблице значение попадает в таблицу как текст, в справке — как слово в родительном падеже. Расхождение уже сейчас даёт разное отображение одного и того же курса.

**Фикс:** вынести расчёт в общий модуль (например, в шаблон ответа API группы) и переиспользовать.

### D8. Определение пола по отчеству продублировано и уже разошлось
- `server/utils/declension.js:7-17` — `detectGender`, учитывает `овна`, `евна`, **`ична`**
- `server/controllers/documentGeneratorController.js:163` — инлайновый вариант: `father_name.endsWith('овна') || endsWith('евна')`, **без `ична`**

Для отчества на `-ична` (Ильинична, Фоминична) `declineFullName` определит пол правильно, а `genderSuffix` в этой же функции станет `''` вместо `'а'` — в справке появится грамматическая ошибка в согласовании.

**Фикс:** в `documentGeneratorController.js` импортировать `detectGender` из `utils/declension.js` вместо инлайновой проверки.

### D9. Дубль разметки списка уведомлений
`client/src/components/NavBar.jsx:228-277` и `:384-425`

Список уведомлений целиком продублирован в desktop-`Dropdown` и в мобильном `Offcanvas` (~50 строк JSX). Также `data.fetchAll('notifications')` вызывается в трёх местах одного компонента (`:24`, `:35`, `:176`) и в трёх других файлах (`App.js:24`, `Auth.jsx:76`, `useAdminLogic.js:127`).

**Фикс:** вынести `<NotificationList notifications={...} onRead={...} />` в отдельный компонент, автообновление вынести в один `useEffect` с одной зависимостью.

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
`client/src/store/DataStore.js` — `getStatistics` (`:323`), `findByField` (`:311`), `findById` (`:305`), `clearAllErrors` (`:293`), `getDropdownOptions` (`:344`), `getNameById` (`:353`)

Проверено grep'ом по всему `client/src`: единственные упоминания — внутри самого файла. Последние два продублированы в `dataHelpers.js` (см. D6).

**Фикс:** удалить неиспользуемые; для `getDropdownOptions`/`getNameById` выбрать одну реализацию.

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
`client/src/components/TableCell.jsx:66-81` — словари содержат `pending`, `approved`, `cancelled`, которых нет в ENUM `Request.status` (`server/models/models.js:48-50`). Мёртвые ветки, маскирующие опечатки в реальных статусах.

**Фикс:** оставить только `in_progress`, `completed`, `rejected` (или вынести словарь на сервер, см. D5).

### M7. `ApiError.forbiddenRequest` не используется
`server/error/ApiError.js:13-15` — 403 отдаётся руками в `checkRoleMiddleware.js:16`.

**Фикс:** использовать фабрику в middleware, чтобы не дублировать магическое число.

### M8. Неиспользуемые импорты
`server/controllers/requestController.js:1,2` (`uuid`, `path`) — не используются. `userController.js:1` (`ApiError`) используется, в `userController.js:4` `models` — да; `server/controllers/groupController.js:3` (`const { where } = require('sequelize')`) — не используется. `server/index.js:5` (`const models = require('./models/models')`) — присваивается, но не используется явно (нужен ради регистрации моделей — лучше оставить комментарий или заменить на require без присваивания).

**Фикс:** почистить; ESLint-конфига в `server/` нет, поэтому такие вещи не отлавливаются автоматически.

### M9. Ручное удаление связей, которое уже делает сама БД
`server/controllers/requestController.js:286`

```js
await StudentRequest.destroy({ where: { requestId: id } });
await request.destroy();
```

В схеме БД стоит `student_requests_requestId_fkey ... ON DELETE CASCADE` (проверено по `server/backups/backup_2026-06-25.sql`), поэтому `request.destroy()` и так удаляет все `StudentRequest` этой заявки. Явный `destroy` — избыточный лишний запрос, который при этом создаёт окно между двумя операциями: если вторая упадёт, заявка останется, а её связи будут потеряны (см. B4 про отсутствие транзакции).

**Фикс:** удалить строку 286 и положиться на `ON DELETE CASCADE`; при переходе на транзакции (B4) — оборачивать в `sequelize.transaction()`.

---

## Баги и расхождения в клиенте

### C1. Даты `createdAt` показываются сырым ISO-строкой
`client/src/components/TableCell.jsx:53`

```js
if (columnKey.toLowerCase().includes('date')) { ... }
```

Колонки «Создан»/«Создана» используют ключ `createdAt` (`utils/tableConfig.js:7,13,20`). `'createdat'.includes('date')` → `false` (внутри `createdAt` нет подпоследовательности `d-a-t-e`), поэтому форматирование не применяется и в таблице выводится `2026-06-25T09:06:30.000Z`. При этом `enroll_date`/`expell_date` форматируются корректно.

**Фикс:** проверять суффикс/набор имён явно: `['enroll_date','expell_date','createdAt','updatedAt'].includes(columnKey)`.

### C2. `useMemo` в админке и профиле не мемоизирует ничего
`client/src/hooks/useAdminLogic.js:246` и `:293`, `client/src/pages/Profile.jsx:110` и `:113`

```js
const tableData = getTableData(activeTab, data);   // вне useMemo, возвращает toJS(...) — новый массив
const filteredData = useMemo(() => filterData(tableData, ...), [tableData, ...]);
```

`getTableData` вызывает `toJS()` и возвращает свежий массив на каждом рендере, поэтому `tableData` всегда новая ссылка и `useMemo` пересчитывает фильтрацию и сортировку на каждом рендере. Ровно та же схема в `Profile.jsx`: `userRequests` — результат `.filter()`, новый массив каждый раз, зависимость `[userRequests]`.

**Фикс:** обернуть `getTableData(...)` в `useMemo` по `[activeTab, data.entities[...]]`, либо считать `filteredData` без `useMemo`.

### C3. Потеря выбранных студентов при быстрых кликах
`client/src/components/MultiselectStudents.jsx:66` и `:93`

```js
const currentValues = formData[field.name] || [];   // значение из замыкания на момент рендера
newValues = [...currentValues, value];
setFormData(prev => ({ ...prev, [field.name]: newValues }));  // prev не используется
```

`currentValues` берётся из `formData` props (снимок на момент рендера), а не из `prev` внутри апдейтера. Два быстрых переключения чекбоксов до ре-рендера приводят к тому, что второй вызов посчитает значения по устаревшему снимку и потеряет первое изменение. То же в `handleSelectGroup` (`:66`).

**Фикс:** `setFormData(prev => ({ ...prev, [field.name]: [...(prev[field.name] || []), value] }))`.

### C4. Прямая мутация приватного поля стора
`client/src/components/NavBar.jsx:69`

```js
data._entities.notifications = []
```

Обращение к приватному полю MobX-объекта снаружи стора в обход публичного API. Класс объявлен через `makeAutoObservable`, поэтому `_entities` — observable; присваивание в обход action нарушает инварианты стора (MobX 6 в режиме `enforceActions: "observed"` выдаст предупреждение) и делает состояние неуправляемым.

**Фикс:** добавить в `DataStore` публичный метод `clear(entityType)`.

### C5. Тип `studentIds` плавает между строками и числами
`client/src/hooks/useAdminLogic.js:163` против `:118`

```js
// handleEdit — строки
studentIds: item.students.map(student => student.id.toString())
// handleRequestStatusChange — числа
studentIds: request.students.map(s => s.id)
```

Оба значения уходят в `prepareFormData` (`utils/dataHelpers.js:293-316`), который приводит тип в зависимости от `userRole`. Смешение строк и чисел между разными обработчиками одного и того же поля — источник тихих расхождений.

**Фикс:** зафиксировать один тип (числа) на границе стора, преобразование строк — только в обработчиках форм.

### C6. Разные правила ветвления по роли в соседних файлах
- `client/src/utils/tableConfig.js:121` — `userRole === 'USER' ? 'select' : 'multiselect'`
- `client/src/utils/dataHelpers.js:299` — `if (userRole === 'USER') { ... } else { ... }`
- `client/src/pages/Request.jsx:200` — `userRole === 'ADMIN' || userRole === 'TEACHER' ? 'multiselect' : 'select'`

Первое и второе относят любую новую роль к ветке «несколько студентов», третье — к ветке «один студент». При появлении роли, отличной от `USER`/`ADMIN`/`TEACHER`, страницы будут вести себя по-разному.

**Фикс:** одна функция `canSelectMultipleStudents(userRole)` в `utils/consts.js`.

### C7. Размер страницы захардкожен в трёх местах
`client/src/hooks/useAdminLogic.js:24` (`itemsPerPage = 10`), `client/src/components/TableContent.jsx:88` (`(currentPage - 1) * 10 + index + 1`), `client/src/pages/Profile.jsx:21` (`itemsPerPage = 10`)

Нумерация строк в таблице пересчитывается с константой `10`, а не со значением `itemsPerPage`. Смена размера страницы разъедется с нумерацией, и в `Profile` он всё равно останется отдельным значением.

**Фикс:** передавать `itemsPerPage` в `TableContent` как проп.

### C8. Поля, которых нет в колонках таблицы
`client/src/utils/tableConfig.js:36,39,45`

Колонки `supervisor`, `course`, `duration` не соответствуют полям API — `TableContent` (`:102-140`) и `TableCell` (`:9-34`) обрабатывают их вручную. Работает, но конфигурация перестала быть источником правды: любая новая колонка потребует правки в трёх файлах.

**Фикс:** помечать такие колонки флагом `{ key: 'course', computed: true }` и рендерить их одним универсальным кодом.

---

## Docker (новые файлы)

### K1. Контейнер запускается от root
`server/Dockerfile:19-33` — нет инструкции `USER`; процесс `node index.js` работает с правами root. При пробое в приложении (см. S3) это даёт root на хосте.

**Фикс:** создать непривилегированного пользователя (`node`, уже присутствует в образе) и добавить `USER node` перед `CMD`, предварительно `chown` рабочий каталог.

### K2. Нет healthcheck
`server/Dockerfile:34` — контейнер не сообщает о готовности; `docker compose` и оркестраторы будут считать его здоровым с момента старта, хотя приложение слушает порт только после `sequelize.authenticate()` и `sync({ alter: true })` (`server/index.js:31-42`).

**Фикс:** добавить `HEALTHCHECK` на `GET /api/...` (нужен публичный health-эндпоинт, которого сейчас нет).

### K3. `npm ci` в build-стадии с dev-зависимостями
`server/Dockerfile:8-13` — стадия `deps` ставит `nodemon` (devDependency) в `node_modules`, который затем копируется в runtime через `COPY --from=deps`. В итоге в production-образ попадает лишний dev-инструмент.

**Фикс:** `RUN npm ci --omit=dev` в отдельной стадии для runtime либо `npm prune --omit=dev` перед копированием.

### K4. Порядок копирования
`server/Dockerfile:28-29` — `node_modules` копируется раньше исходников, что корректно для слоёв; замечание к самому `.dockerignore` (`:8`) — `!.env.example` исключает шаблон окружения из контекста сборки, что верно, но означает, что `.env.example` попадёт в образ. Небольшая утечка шаблона конфигурации; обычно не критично.

---

## Рекомендуемый порядок работ

1. **S1, S2, S5, S7** — закрыть пробелы в авторизации; это правки на несколько строк в роутерах и дают немедленный эффект.
2. **S3, S4** — заменить строковые `exec` на `execFile`, добавить `path.basename` + whitelist.
3. **S6, S8** — `defaultScope` для `User`, чтение роли из БД в `checkRoleMiddleware`.
4. **B5 (только специальность)** — запретить удаление специальности при наличии групп. Дёшево, а предотвращает тихую порчу выдачи справок; группы и преподаватели по решению владельца не трогаем.
5. **B7, B4, B2, B9, M9** — привести бизнес-правила к единому виду: один дефолт `payment_type`, транзакции на заявках, серверная выборка «своих» заявок и рабочая ручка `/:id` (они закрываются одним куском работы, B9 — её предпосылка).
6. **B8** — сначала продуктовое решение по правилу «один студент / вся группа» (пометка в самом пункте), затем единая функция проверки в `consts.js` + серверная валидация объёма `studentIds`.
7. **D1, D2, D3** — параметризация генерации документов и HTTP-слоя: одна правка снимает ~350 строк копипасты и 18 неверных fallback-URL.
8. **M1–M9** — чистка мёртвого кода; безопасна, делается механически.
9. **B6** — Sequelize CLI-миграции вместо `sync({ alter: true })`; требует отдельного плана и тестовой БД.
10. **C1–C8, K1–K3** — точечные исправления UI и Docker.
