# Комплексный аудит проекта College-ARM

> **Цель аудита:** выявление реальных уязвимостей безопасности, расхождений в бизнес-логике, ошибок состояния данных/UI и точек структурного упрощения кодовой базы без стилистических придирок.

---

## 1. Безопасность и контроль доступа (Security & Access Control)

### 1.1. Обход запрета на удаление куратора активных групп из-за регистра связи в Sequelize
* **Файл и строки:** [`server/controllers/teacherController.js:86-98`](file:///c:/folders/test/uchebka/server/controllers/teacherController.js#L86-L98)
* **Проблема:** В модели связь объявлена как `Supervisor.belongsTo(Group)`, поэтому в экземпляре Sequelize поле называется `s.group` (в нижнем регистре). В коде контроллера написано `s.Group && s.Group.group_number`, из-за чего `s.Group` всегда `undefined`, а массив `groupNumbers` всегда пуст.
* **Влияние:** Администратор может беспрепятственно удалить преподавателя, за которым закреплены учебные группы. В БД внешний ключ `teacherId` обнуляется (`SET NULL`), и группы молча остаются без кураторов.
* **Решение:** Заменить `s.Group` на `s.group`.

### 1.2. Broken Access Control: чтение устаревшей роли из JWT вместо актуальной из БД
* **Файл и строки:** [`server/controllers/requestController.js:103, 211, 358`](file:///c:/folders/test/uchebka/server/controllers/requestController.js#L103), [`server/routes/requestRouter.js:8-13`](file:///c:/folders/test/uchebka/server/routes/requestRouter.js#L8-L13)
* **Проблема:** Маршруты заявок защищены только `authMiddleware`, который не ходит в БД и помещает payload токена в `req.user`. В контроллере проверка `userRole === 'ADMIN'` читает роль из токена с 24-часовым TTL.
* **Влияние:** Если роль администратора была понижена до обычного пользователя или преподавателя, он может в течение 24 часов продолжать менять статусы чужих заявок (`PUT /api/request/:id`), читать чужие заявки (IDOR) и сбрасывать счетчики.
* **Решение:** Проверять актуальную роль в БД через `User.findByPk` или актуализировать `req.user` в middleware.

### 1.3. Утечка персональных данных (PII) всех студентов колледжа
* **Файл и строки:** [`server/routes/studentRouter.js:9`](file:///c:/folders/test/uchebka/server/routes/studentRouter.js#L9), [`server/controllers/studentController.js:82-175`](file:///c:/folders/test/uchebka/server/controllers/studentController.js#L82-L175)
* **Проблема:** Маршрут `GET /api/student` открыт для любого авторизованного пользователя (`authMiddleware`). Регистрация в системе публична (`POST /api/user/registration`).
* **Влияние:** Любой зарегистрированный пользователь может выгрузить полный реестр учащихся колледжа со всеми персональными данными: ФИО, датами зачисления/отчисления, номерами приказов и привязками к группам.
* **Решение:** Фильтровать выдачу на бэкенде: `ADMIN` получает всех студентов, `TEACHER` — только студентов своей группы, `USER` — только запись привязанного к нему студента.

### 1.4. Блокировка Event Loop синхронным `bcrypt` и утечка существования пользователей (User Enumeration)
* **Файл и строки:** [`server/controllers/userController.js:50-56, 234, 277, 324`](file:///c:/folders/test/uchebka/server/controllers/userController.js#L50-L56)
* **Проблема:** Использование `bcrypt.compareSync` блокирует главный поток Node.js при операциях аутентификации. Кроме того, при неверном email возвращается 500 «Пользователь не найден», а при неверном пароле — 400 «Неверный пароль».
* **Влияние:** DoS-уязвимость при пачке параллельных запросов входа; возможность автоматического подбора и валидации списка зарегистрированных email-адресов сотрудников/студентов.
* **Решение:** Перевести все вызовы на асинхронный `await bcrypt.compare(...)` и унифицировать ответ при ошибке входа (HTTP 400 «Неверный email или пароль»).

---

## 2. Бизнес-логика и генерация документов (Backend Logic & Documents)

### 2.1. Мутация объекта Date смещает дату окончания обучения с июня на июль
* **Файл и строки:** [`server/controllers/documentGeneratorController.js:158-173`](file:///c:/folders/test/uchebka/server/controllers/documentGeneratorController.js#L158-L173)
* **Проблема:** Если группа зачислена 31 августа (`31.08`), мутация `endDate.setMonth(5)` (июнь) на объекте с днем 31 в JS автоматически переносит дату на `01.07` (в июне 30 дней). Последующий `endDate.setDate(30)` превращает дату в `30 июля`.
* **Влияние:** В официальной справке об обучении печатается искаженный срок завершения: «30 июля» вместо «30 июня».
* **Решение:** Задать день 1 перед изменением месяца или формировать дату через `new Date(endYear, 5, 30)`.

### 2.2. Искажение названий месяцев в справке об обучении (грамматическая ошибка)
* **Файл и строки:** [`server/controllers/documentGeneratorController.js:167, 171`](file:///c:/folders/test/uchebka/server/controllers/documentGeneratorController.js#L167)
* **Проблема:** Регулярное выражение `.replace(/ь$/, 'я')` не обрабатывает месяцы «март», «май», «август».
* **Влияние:** Для зачисленных 31 августа генерируется текст `«31» август 2022 г.` вместо `«31» августа 2022 г.` (аналогично для марта и мая).
* **Решение:** Использовать массив месяцев в родительном падеже `['января', 'февраля', ..., 'декабря'][date.getMonth()]`.

### 2.3. Модификация закрытых и отмененных заявок задним числом
* **Файл и строки:** [`server/controllers/requestController.js:206-255`](file:///c:/folders/test/uchebka/server/controllers/requestController.js#L206-L255)
* **Проблема:** В `requestController.update` отсутствует проверка текущего статуса заявки.
* **Влияние:** Пользователь может отправить `PUT /api/request/:id` на заявку со статусом `completed` или `cancelled`, изменив состав студентов, описание или тип документа задним числом уже после фактической выдачи справки.
* **Решение:** Запретить изменение заявки при статусе `completed` или `cancelled` (`400 Bad Request`).

### 2.4. Сбой расчета курса при зачислении до сентября
* **Файл и строки:** [`server/utils/course.js:27-35`](file:///c:/folders/test/uchebka/server/utils/course.js#L27-L35)
* **Проблема:** Условие `enroll.getMonth() >= ACADEMIC_YEAR_START_MONTH` ложно, если группа зачислена весной или зимой.
* **Влияние:** Студенты таких групп «переводятся» на следующий курс 1 января посреди учебного года вместо 1 сентября.
* **Решение:** Рассчитывать разницу между академическими годами: `nowAcademicYear - enrollAcademicYear + 1`.

### 2.5. Неатомарность операций с группами и кураторами
* **Файл и строки:** [`server/controllers/groupController.js:33-49, 143-172`](file:///c:/folders/test/uchebka/server/controllers/groupController.js#L33-L49)
* **Проблема:** Создание группы (`Group.create`) и привязка куратора (`Supervisor.create`) выполняются последовательно без транзакции.
* **Влияние:** При ошибке на шаге куратора создается группа-сирота без куратора.
* **Решение:** Обернуть вызовы в `sequelize.transaction(...)`.

### 2.6. Ошибка `ERR_HTTP_HEADERS_SENT` при отмене скачивания бэкапа
* **Файл и строки:** [`server/controllers/backupController.js:67-73`](file:///c:/folders/test/uchebka/server/controllers/backupController.js#L67-L73), [`server/middleware/ErrorHandlingMiddleware.js:3-8`](file:///c:/folders/test/uchebka/server/middleware/ErrorHandlingMiddleware.js#L3-L8)
* **Проблема:** При обрыве соединения клиентом callback `res.download` вызывается уже после отправки заголовков. Middleware ошибок не проверяет `res.headersSent` и пытается вызвать `res.status().json()`.
* **Влияние:** Необработанное исключение `ERR_HTTP_HEADERS_SENT` в Node.js.
* **Решение:** Добавить `if (res.headersSent) return next(err);` в `ErrorHandlingMiddleware.js`.

---

## 3. Фронтенд: состояние, авторизация и UI-логика (Client & State)

### 3.1. Зависание на пустой странице при поиске и фильтрации (Pagination Out of Bounds)
* **Файл и строки:** [`client/src/hooks/useAdminLogic.js:80-102, 284-288`](file:///c:/folders/test/uchebka/client/src/hooks/useAdminLogic.js#L80-L102)
* **Проблема:** Функции `handleStudentSearch` и `handle*FilterChange` не сбрасывают `currentPage` на 1.
* **Влияние:** Если администратор был на странице 5 и ввел фильтр, отфильтровавший 2 записи, `currentPage` остается 5, срез `currentItems` возвращает `[]`, а компонент `Pagination.jsx` при `totalPages <= 1` вообще исчезает из DOM. Таблица выглядит пустой («Нет данных»), и вернуться на страницу 1 невозможно.
* **Решение:** Вызывать `setCurrentPage(1)` при изменении любого фильтра/поиска и вычислять безопасную страницу `safePage = Math.min(currentPage, totalPages)`.

### 3.2. Несброшенный выбор студентов при смене группы в модалках приказов
* **Файл и строки:** [`client/src/components/ExamAdmissionOrderModal.jsx:52-55`](file:///c:/folders/test/uchebka/client/src/components/ExamAdmissionOrderModal.jsx#L52-L55), [`HolidaysOrderModal.jsx:143`](file:///c:/folders/test/uchebka/client/src/components/HolidaysOrderModal.jsx#L143), [`StipendOrderModal.jsx:144`](file:///c:/folders/test/uchebka/client/src/components/StipendOrderModal.jsx#L144)
* **Проблема:** При выборе другой группы в `<Form.Select name="groupId">` массив `selectedStudentIds` не очищается.
* **Влияние:** В форме остаются ID студентов из старой группы. При генерации `selectedStudents` оказывается пустым массивом `[]`, и на сервер отправляется пустой/испорченный приказ.
* **Решение:** Очищать `setSelectedStudentIds([])` при смене группы.

### 3.3. «Фантомная авторизация» и отсутствие перехватчика 401
* **Файл и строки:** [`client/src/App.js:18-33`](file:///c:/folders/test/uchebka/client/src/App.js#L18-L33), [`client/src/store/UserStore.js:9-15`](file:///c:/folders/test/uchebka/client/src/store/UserStore.js#L9-L15), [`client/src/http/index.js:18-24`](file:///c:/folders/test/uchebka/client/src/http/index.js#L18-L24)
* **Проблема:** Если сохраненный токен протух (401 при `check()`), `App.js` удаляет токен из `localStorage`, но не вызывает `user.setIsAuth(false)`. Нет response interceptor на 401.
* **Влияние:** Пользователь видит профиль без данных, запросы отправляются с заголовком `Authorization: Bearer null`, приложение не перенаправляет на страницу входа.
* **Решение:** Сбрасывать состояние пользователя в блоке `catch`, проверять `exp` JWT при старте и добавить response interceptor на HTTP 401 для автоматического логаута.

### 3.4. Коллизия данных заявок в `DataStore`: затирание `requests` вызовом `fetchMyRequests`
* **Файл и строки:** [`client/src/store/DataStore.js:114-116, 137-140`](file:///c:/folders/test/uchebka/client/src/store/DataStore.js#L114-L116), [`client/src/pages/Admin.jsx:18`](file:///c:/folders/test/uchebka/client/src/pages/Admin.jsx#L18), [`client/src/pages/Profile.jsx:71`](file:///c:/folders/test/uchebka/client/src/pages/Profile.jsx#L71)
* **Проблема:** И полный список всех заявок системы (`fetchAll('requests')`), и личные заявки пользователя (`fetchMyRequests()`) пишутся в одно и то же свойство `_entities.requests`.
* **Влияние:** Когда администратор открывает профиль, массив заявок заменяется на его личные. При возврате в админку счетчики новых заявок, графики статистики и таблица заявок показывают урезанный список до следующего ручного обновления.
* **Решение:** Разделить хранение в `DataStore`: завести отдельное свойство `myRequests` для личных заявок.

### 3.5. Ошибка синтаксиса Postgres при создании/редактировании заявки с пустым `documentId`
* **Файл и строки:** [`client/src/utils/dataHelpers.js:353-356`](file:///c:/folders/test/uchebka/client/src/utils/dataHelpers.js#L353-L356)
* **Проблема:** Если заявка подается без прикрепленного документа, `documentId` отправляется пустой строкой `""` вместо `null`.
* **Влияние:** Запрос падает с ошибкой PostgreSQL: `invalid input syntax for type integer: ""`.
* **Решение:** Приводить к `null`: `submitData.documentId = submitData.documentId ? parseInt(submitData.documentId, 10) : null;`.

### 3.6. Утечка памяти и сбой таймера уведомлений в `NavBar.jsx`
* **Файл и строки:** [`client/src/components/NavBar.jsx:26-36`](file:///c:/folders/test/uchebka/client/src/components/NavBar.jsx#L26-L36)
* **Проблема:** Массив зависимостей `useEffect` содержит синглтон-объекты `[user, data]`. Метод `user.getIsAuth()` вызывается внутри эффекта, но смена `isAuth` не триггерит перезапуск эффекта.
* **Влияние:** После входа в систему автообновление уведомлений не стартует; после выхода — продолжает слать запросы.
* **Решение:** Добавить примитивное значение `const isAuth = user.getIsAuth()` в массив зависимостей.

---

## 4. Архитектурное упрощение кодовой базы (Codebase Simplification)

### 4.1. Дублирование кода в 11 модальных окнах генерации приказов (~3 350 строк)
* **Файлы:** [`client/src/components/*OrderModal.jsx`](file:///c:/folders/test/uchebka/client/src/components), [`DocumentsGeneration.jsx`](file:///c:/folders/test/uchebka/client/src/components/DocumentsGeneration.jsx#L80-L104)
* **Текущее состояние:** В `DocumentsGeneration.jsx` объявлено 11 boolean-флагов (`showExamModal`, `showHolidaysModal`...), и все 11 модалок одновременно смонтированы в DOM. Внутри каждого файла более 70% кода — дословный дубликат: предзагрузка групп/специальностей, выбор группы, секция из 5 подписантов («Контроль за исполнением», Зам. директора, Главбух, Зав. отделением, Юрисконсульт), обвязка формы и обработка `downloadDoc`.
* **Предложение по упрощению:**
  1. Создать базовую обертку `BaseOrderModal` (единый заголовок, футер, алерт ошибок, спиннер отправки) и переиспользуемую секцию `OrderSignaturesSection`.
  2. В `DocumentsGeneration.jsx` заменить 11 флагов на одно состояние `activeDocType` и рендерить только активное окно.

### 4.2. Дублирование разметки таблиц в `DataManagement.jsx`
* **Файл и строки:** [`client/src/components/DataManagement.jsx:49-226`](file:///c:/folders/test/uchebka/client/src/components/DataManagement.jsx#L49-L226)
* **Текущее состояние:** 7 вкладок копируют один и тот же блок `<TableContent>` с 20+ пропсами.
* **Предложение по упрощению:** Задать конфигурационный массив вкладок и отрендерить через `.map()`, сократив компонент с 254 до ~70 строк.

### 4.3. Устранение избыточного локального состояния в `SearchAndFilters.jsx`
* **Файл и строки:** [`client/src/components/SearchAndFilters.jsx:24-46`](file:///c:/folders/test/uchebka/client/src/components/SearchAndFilters.jsx#L24-L46)
* **Текущее состояние:** Для 4 селектов заведены промежуточные `useState` и 4 хука `useEffect` для зеркалирования пропсов.
* **Предложение по упрощению:** Удалить лишние `useState`/`useEffect`, связав `value` селектов напрямую со входящими пропсами (как уже сделано для поисковой строки).
