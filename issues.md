# issues.md

Аудит репозитория `diplom` (учебная часть колледжа): безопасность, дублирование, мёртвый код, расхождения в бизнес-логике.

**Дата аудита:** 29.09.2026. **Область:** `server/` (Express + Sequelize) и `client/` (React 19 + CRA + MobX).
**Что не проверялось:** тесты и CI в проекте отсутствуют, динамический анализ не проводился. Все находки — статический разбор кода; выводы помечены `[!]`, если требуют подтверждения на живой БД.

---

## Секьюрити (блокер) — закрыто

Блок S закрыт полностью 8 пунктами (S1–S8). Ниже — что было сделано и что осталось осознанно незакрытым.
Детализация исходных находок удалена; проверяется по коду.

| # | Что закрыто | Где смотреть |
|---|---|---|
| S1 | На все маршруты `requestRouter` добавлен `authMiddleware`; на `GET /` и `DELETE /:id` — также `checkRoleMiddleware('ADMIN')` | `server/routes/requestRouter.js:8-13` |
| S2 | В `requestController.update` — 403, если заявка не своя и роль не `ADMIN`; 403, если передан `status` и роль не `ADMIN` | `server/controllers/requestController.js:140-148` |
| S3 | `exec` заменён на `execFile` с массивами аргументов (и `psql`, и `pg_dump`); параметры подключения вынесены в `getDbArgs()`; добавлен `resolveBackupPath()` с whitelist-именем | `server/utils/backup.js:12-33, 64-72, 122-143` |
| S4 | `download` и `restore` проверяют имя whitelist-регулярным выражением `^backup_\d{4}-\d{2}-\d{2}\.sql$`, путь строится через `path.resolve`, проверяется выход за пределы каталога `backups` | `server/controllers/backupController.js:52-61, 84` |
| S5 | `authMiddleware` на `GET /` во всех пяти роутерах: `student`, `group`, `specialty`, `teacher`, `document` | `server/routes/studentRouter.js` и соседние |
| S6 | `defaultScope` с `exclude: ['password']` в модели `User`; заведён именованный scope `USER_WITH_PASSWORD` для `login`, `changePassword`, `changeEmail`, `deleteMyAccount` | `server/models/models.js:70-78`, `server/controllers/userController.js` |
| S7 | `return next()` в `authMiddleware` и `checkRoleMiddleware` | `server/middleware/authMiddleware.js:5`, `server/middleware/checkRoleMiddleware.js:8` |
| S8 | Роль читается из БД в `checkRoleMiddleware`; `userController.check` перевыпускает токен по `User.findByPk` | `server/middleware/checkRoleMiddleware.js:15-28`, `server/controllers/userController.js:45-60` |

Побочные изменения, сделанные вместе с S1: добавлен `GET /api/request/mine` (`requestController.getMine`, фильтр по `req.user.id` на сервере), метод `DataStore.fetchMyRequests()` и переход `Profile.jsx` на него. Это заодно закрывает B2.

### Напоминания

- **S5 закрыт не полностью, а с осознанным отклонением.** `checkRoleMiddleware('ADMIN')` на `GET /api/student` **не установлен**: список студентов нужен всем авторизованным для подачи заявки (`Request.jsx`, `Profile.jsx`), при `ADMIN`-ограничении пользователь с ролью `USER` не сможет подать заявку. Анонимный доступ закрыт, но **любой зарегистрированный пользователь по-прежнему видит ФИО, номер приказа и даты зачисления/отчисления всех студентов**. Ограничить выдачу по роли сейчас нечем — связи «пользователь → студент» в модели нет. Порядок: сначала **B1**, затем `GET /api/student/mine` и `checkRoleMiddleware('ADMIN')` на общем `GET /`. В коде отмечено комментарием в `studentRouter.js`.
- **S2 частично опирается на роль из токена.** `requestController.update` берёт `req.user.role`, а `authMiddleware` (`server/middleware/authMiddleware.js:12`) роль по-прежнему читает из JWT, не из БД. Для маршрутов под `checkRoleMiddleware` это не важно (роль пересобирается из БД), но для `PUT /api/request/:id` понижение `ADMIN` → `USER` в БД продолжит действовать до истечения 24-часового токена: бывший админ сможет править чужие заявки и менять статусы. Либо переводить эти решения на `checkRoleMiddleware('ADMIN')`/сверку с БД, либо учитывать это как принятый риск.
- **S8 добавил лишний `SELECT` на каждый admin-запрос** (`User.findByPk` в `checkRoleMiddleware`). Для учебного проекта приемлемо; при росте нагрузки роль стоит кэшировать (например, `redis`, TTL до 60 с).
- **S4 сузил функциональность:** скачивание и восстановление работают только для файлов, названных `backup_ГГГГ-ММ-ДД.sql`. Бэкапы с другими именами вернут 400.
- **S6, важно на будущее:** способ вернуть `password` через `attributes: { include: ['password'] }` в Sequelize 6.37 **не работает** — атрибуты сливаются в `{ exclude, include }`, `exclude` остаётся, пароль не возвращается и `login` падает. Пользоваться только `User.scope(USER_WITH_PASSWORD)`.

---

## Бизнес-логика и целостность данных

### B1. Нет связи «пользователь → студент»
`server/controllers/requestController.js:9-40`, `client/src/pages/Request.jsx`

В модели `User` нет связи со `Student`. Любой зарегистрировавшийся пользователь (роль `USER`) при создании заявки выбирает **произвольного** студента из полного списка и заказывает на него справку об обучении, договор и т.д. Администратор, обрабатывая заявку, не может отличить «свою» заявку от поданной за другого человека.

**Фикс:** добавить `userId` (или `email`) в модель `Student` и валидировать на сервере, что заявка подана на студента, привязанного к `req.user.id`.

> ✅ **Закрыто.** Решение владельца: привязка заполняется администратором вручную в карточке студента. Права на выбор студента: `ADMIN` — любой студент; `TEACHER` — студенты своей группы (см. **B12**, правило пока не реализовано); `USER` — только привязанный к нему студент.
>
> - `server/models/models.js` — в `Student` добавлено nullable-поле `userId`; связи `User.hasOne(Student)` / `Student.belongsTo(User)`. Схема подхватится на ближайшем `sync({ alter: true })`.
> - `server/controllers/studentController.js` — `resolveUserId()`: пустое значение снимает привязку (`userId = null`), несуществующий аккаунт отклоняется, уже занятый другим студентом аккаунт отклоняется. Вызывается из `create` и `update`.
> - `server/controllers/requestController.js` — `ROLES_WITH_ANY_STUDENT = ['ADMIN', 'TEACHER']` и `checkStudentsAccess()`: для остальных ролей все переданные `studentIds` обязаны принадлежать `req.user.id`, иначе 403. Проверка вызывается в `create` и в `update`.
> - `client/src/utils/tableConfig.js` — поле `userId` в `getDefaultFormData.students`, селект «Аккаунт» в форме студента, колонка «Аккаунт» в таблице.
> - `client/src/utils/dataHelpers.js` — кейс `studentUserId` в `getDropdownOptions` (скрывает аккаунты, уже занятые другим студентом; при редактировании исключает текущего студента через `excludeStudentId`), приведение `userId` к числу/`null` в `prepareFormData`.
> - `client/src/components/CRUDModal.jsx` — передаёт `item.id` как `excludeStudentId` для таблицы `students`.
> - `client/src/components/MultiselectStudents.jsx` + `client/src/pages/Request.jsx` — новый проп `allowedStudentIds`; для `USER` форма показывает только привязанного к нему студента, при отсутствии привязки — сообщение вместо пустого списка. Для `TEACHER` проп равен `null` (список не ограничен) — до решения **B12** это означает, что куратору показывается весь список студентов колледжа.
>
> **Осознанные отклонения:**
> - Роль в `checkStudentsAccess` берётся из JWT (`req.user.role`), как и в остальных местах контроллера. Понижение `TEACHER`/`ADMIN` → `USER` в БД продолжит действовать до истечения 24-часового токена — это тот же принятый риск, что описан в блоке «Секьюрити» для S2.
> - Поле nullable, а не обязательное: иначе нельзя отредактировать ни одного из существующих студентов, пока их не привяжут. Студент без привязки не может подать заявку — UI сообщает об этом, сервер отдаёт 403.
> - S5 по-прежнему закрыт не полностью: `GET /api/student` доступен всем авторизованным. `GET /api/student/mine` и `checkRoleMiddleware('ADMIN')` на общем `GET /` не добавлялись, поскольку `Request.jsx` и `Profile.jsx` (в том числе для ролей `ADMIN`/`TEACHER`) продолжают загружать общий список студентов.

### B2. «Свои заявки» фильтруются на клиенте
`client/src/pages/Profile.jsx:72` и `:110`

```js
await Promise.all([ data.fetchAll('requests'), ... ]);   // тянет ВСЕ заявки
const userRequests = data.requests.filter(req => req.userId === currentUser?.id);
```

**Фикс:** эндвоинт `GET /api/request/mine`, фильтрация по `req.user.id` на сервере.

> ✅ **Закрыто полностью.** Серверная часть сделана вместе с S1: `GET /api/request/mine` (`requestController.getMine`, `where: { userId: req.user.id }`), `DataStore.fetchMyRequests()`, переход `Profile.jsx` на него. Оставшийся no-op фильтр в `Profile.jsx:110` удалён — `userRequests` теперь это `data.requests` без клиентской фильтрации.

### B3. `ApiError.badRequest` возвращает HTTP 404
`server/error/ApiError.js:9-11`

```js
static badRequest(message) {
    return new ApiError(404, message)   // должно быть 400
}
```

Все сообщения валидации по всему приложению отдаются как «не найдено». Логика и сообщения корректны, код статуса нет — расходится контракт API с семантикой ответов.

**Фикс:** `new ApiError(400, message)`.

> ✅ **Закрыто.** `server/error/ApiError.js:9` — `badRequest` возвращает 400. Ошибки валидации по всему приложению теперь отдаются как «неверный запрос», а не «не найдено».

### B4. Нет транзакции при обновлении заявки
`server/controllers/requestController.js:177-193`

`request.update()` выполняется, затем `StudentRequest.destroy(...)`, затем `Promise.all` на создание новых связей. Если создание хотя бы одной связи упадёт (например, из-за FK), заявка останется со статусом/описанием, изменёнными по запросу, но **без студентов** — при этом `studentIds` в UI не пуст. Аналогично `create` (`:30-40`): заявка создаётся, связи падают → остаётся «висячая» заявка.

**Фикс:** обернуть в `sequelize.transaction()`.

> ✅ **Закрыто.** `server/controllers/requestController.js` — `create` и `update` выполняют запись заявки, пересоздание связей `StudentRequest` и создание `Notification` в одной `sequelize.transaction()` с явным `commit`/`rollback`. Промежуточные `Promise.all` на `create` заменены на `bulkCreate`. Сброс транзакции пробрасывается в общий `catch`, который отдаёт 500.

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

- перестают отображаться у кого-либо — раньше `Profile.jsx:110` фильтровал по `req.userId === currentUser?.id`; после закрытия B2 вкладка работает через `GET /api/request/mine`, и заявки с `userId = null` не показываются никому (связано с B1).
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

- **Роль `TEACHER` не имеет серверного смысла.** `checkRoleMiddleware` знает только `'ADMIN'`, `role` в `models.js:69` — свободная строка без ENUM. То есть на API преподаватель неотличим от обычного пользователя; ни одна его «привилегия» (мультивыбор) не является привилегией. Роль назначается в UI (`tableConfig.js:109`), отображается бейджем «Преподаватель» (`TableCell.jsx:94`), но на сервере не проверяется нигде. **Частично снято в B1:** роль `TEACHER` теперь различена на сервере в `checkStudentsAccess`. Ограничение по своей группе — см. **B12**.
- **Правило продублировано в трёх местах и уже разошлось** — см. C6: `tableConfig.js` и `dataHelpers.js` ветвятся по `userRole === 'USER'`, а `Request.jsx:200` — по `userRole === 'ADMIN' || userRole === 'TEACHER'`. Любая новая роль поведёт себя в этих трёх точках по-разному.
- **Ограничение «в рамках группы» только клиентское.** В форме заявки студенты фильтруются по группе (`MultiselectStudents.jsx:40`), но сервер не проверяет, что выбранные студенты относятся к одной группе — заявка может связать студентов из разных групп, и при генерации документов это выглядит как ошибка данных. **Это отдельная от «своей группы» задача:** здесь речь о любой группе вообще, в том числе у роли `ADMIN`. Ограничение «только группа своего куратора» — см. **B12**.

**Пометка для пересмотра — обновлено после B1.** Продуктовое решение принято: связь «пользователь → студент» введена (см. B1), привязку проставляет администратор. Правило «пользователь — один студент, куратор — вся группа» обосновано привязкой, но **объём `studentIds` по-прежнему не ограничивается сервером**: `TEACHER` может отправить массив любого размера и любых студентов колледжа (см. **B12**), `USER` ограничен только привязкой (то есть фактически одним студентом). Серверная валидация объёма и единая функция проверки в клиенте остаются отдельной задачей.

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

`handleDelete` запрещает удалять собственный аккаунт только на клиенте. `UserStore` вообще не хранит persisted-состояние — `checkToken()` (`:12-15`) смотрит лишь на наличие ключа в `localStorage` и не декодирует его, поэтому до первого ответа `GET /api/user/auth` в интерфейсе пользователь считается анонимом, а роль доступна как `USER` (не как `ADMIN`), если токен ещё не проверен. Проверки прав в `AppRouter` (`:11-13`) — косметика: сервер всё равно должен быть единственным источником истины (см. S1, S2, S5 в закрытом блоке выше).

**Фикс:** не полагаться на клиентские проверки; синхронизировать `UserStore` из ответа `/api/user/me` при монтировании `App`.

### B12. Куратор заказывает документы для любого студента колледжа
`server/controllers/requestController.js:36-46` (`ROLES_WITH_ANY_STUDENT`, `checkStudentsAccess`), `client/src/pages/Request.jsx:25-30`, `server/controllers/teacherController.js`, `server/models/models.js:38-43`

**Продуктовое решение владельца:** куратор вправе заказывать справки и документы **только для учащихся своей группы**. `ADMIN` — для любых, `USER` — для привязанного к нему студента (см. B1).

Сейчас это правило не обеспечено нигде, и после B1 дыра стала шире, чем была:

```js
// requestController.js — текущее поведение
const ROLES_WITH_ANY_STUDENT = ['ADMIN', 'TEACHER'];
async function checkStudentsAccess(userId, userRole, studentIds) {
    if (ROLES_WITH_ANY_STUDENT.includes(userRole)) {
        return null;               // TEACHER — выход сразу, никакой проверки
    }
    ...
```

Два независимых обрыва:

1. **В данных.** Связи «аккаунт → куратор → группа» не существует. `supervisors.teacherId` указывает на преподавателя, но не на пользователя, поэтому определить по токену, какая группа принадлежит вошедшему, физически нечем. `Teacher` (`models.js:38-43`) состоит из `id`, `last_name`, `name`, `father_name`.
2. **В клиенте.** После B1 `Request.jsx` вычисляет `allowedStudentIds` так, что для `ADMIN` и `TEACHER` получает `null`, то есть фильтр выключен и куратору показывается весь список студентов колледжа.

Раньше (до B1) это было безвредно — роль `TEACHER` ни на чём не давала привилегий (см. B8). Теперь она привилегирована, поэтому отсутствие ограничения превратилось в самостоятельную проблему.

**Фикс:**

1. `server/models/models.js` — nullable-поле `Teacher.userId` по образцу `Student.userId` из B1 + связи `User.hasOne(Teacher)` / `Teacher.belongsTo(User)`.
2. `server/controllers/teacherController.js` — принимать `userId` в `create`/`update`. Валидацию **не дублировать**: `resolveUserId()` из B1 сейчас живёт внутри `studentController.js` — вынести в `server/utils/` и переиспользовать для обоих, иначе появится вторая копия (см. блок D).
3. `server/controllers/requestController.js` — `checkStudentsAccess` вместо раннего выхода по `ROLES_WITH_ANY_STUDENT` разветвить по роли:
   - `ADMIN` — любой студент;
   - `TEACHER` — найти свою группу (`Supervisor.findOne({ where: { teacher: { userId } } })`); группы нет → 403; иначе все `studentIds` обязаны иметь `groupId` этой группы;
   - остальные — как в B1 (только `student.userId === req.user.id`).
   Проверка уже вызывается и в `create`, и в `update`, правок в вызывающих местах не требуется.
4. Клиент — `tableConfig.js` (селект «Аккаунт» в карточке преподавателя + колонка), `dataHelpers.js` (кейс в `getDropdownOptions`, `prepareFormData` для `teachers.userId`).
5. Чтобы форма не показывала заведомо невалидные варианты, `GET /api/user/me` (`userController.getMe`) дополняется полем `groupId` — заполняется для роли `TEACHER`, когда аккаунт привязан к куратору группы. Отдельный эндпоинт не заводится: одного поля достаточно, `Request.jsx` фильтрует `data.students` по нему через уже существующий `allowedStudentIds`.

**Осознанные отклонения и границы решения:**

- Роль по-прежнему читается из JWT (тот же принятый риск, что для S2 и B1), но проверка самой группы идёт по `Teacher.userId` в БД, поэтому подмена набора студентов не проходит.
- `Group.hasOne(Supervisor)` + `Teacher.hasOne(Supervisor)` в модели не дают одному преподавателю вести несколько групп. Это существующее ограничение схемы, по решению владельца оно остаётся: один преподаватель — куратор одной группы.
- Аккаунт без привязки к куратору группы (новый преподаватель, ещё не назначенный куратором) заявок подавать не сможет — так же, как `USER` без привязки к студенту. UI должен показывать это сообщением, а не пустым списком.


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

1. ~~**S1, S2, S5, S7**~~ — **закрыто**, см. блок «Секьюрити» выше.
2. ~~**S3, S4**~~ — **закрыто**, см. блок «Секьюрити» выше.
3. ~~**S6, S8**~~ — **закрыто**, см. блок «Секьюрити» выше.
4. ~~**B1**~~ — **закрыто**: связь «пользователь → студент» (`Student.userId`, привязка админом, серверная проверка в `requestController`).
5. **B12** — ограничить куратора его группой. Следствие B1: роль `TEACHER` стала привилегированной, а ограничения по группе нет ни в данных, ни на сервере. Требует `Teacher.userId` + ветки в `checkStudentsAccess`; по ходу вынести `resolveUserId` из `studentController` в `server/utils/`, чтобы не плодить копию.
6. **B5 (только специальность)** — запретить удаление специальности при наличии групп. Дёшево, а предотвращает тихую порчу выдачи справок; группы и преподаватели по решению владельца не трогаем.
7. **B7, B9, M9** — привести бизнес-правила к единому виду: один дефолт `payment_type`, рабочая ручка `/:id`. (B2, B3, B4 закрыты.)
8. **B8** — решение по правилу «один студент / одна группа» принято, но исполняется не полностью: объём `studentIds` по роли не ограничен сервером, а `TEACHER` ограничен только в части набора студентов (см. **B12**). Осталось: единая функция `canSelectMultipleStudents(userRole)` в `utils/consts.js` и серверная валидация объёма.
9. **D1, D2, D3** — параметризация генерации документов и HTTP-слоя: одна правка снимает ~350 строк копипасты и 18 неверных fallback-URL.
10. **M1–M9** — чистка мёртвого кода; безопасна, делается механически.
11. **B6** — Sequelize CLI-миграции вместо `sync({ alter: true })`; требует отдельного плана и тестовой БД.
12. **C1–C8, K1–K3** — точечные исправления UI и Docker.
