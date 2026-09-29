# Дипломный проект — автоматизация документооборота колледжа

Два независимых приложения без корневого `package.json` и без git-репозитория.

```
client/  React 19 + CRA (react-scripts 5) + MobX + react-bootstrap
server/  Express 4 (CommonJS) + Sequelize + PostgreSQL + docx
```

## Запуск

```bash
cd server && npm install && npm run server   # nodemon index.js, порт 7000
cd client && npm install && npm start        # CRA dev server, строго localhost:3000
```

Перед запуском нужны `server/.env` и `client/.env` (шаблон — `server/.env.example`).
PostgreSQL слушает порт **1111**, а не 5432.

## Статистика проекта

Подсчёт выполнен 29.09.2026. Исключены `node_modules/`, `.git/`, `.idea/` и
`server/backups/` (8 дампов с персональными данными, 1.6 МБ).

### По типам файлов

| Категория | Файлов | Строк |
|---|---:|---:|
| Клиентский код (`client/src`, `.js` / `.jsx`) | 47 | 9 759 |
| Шаблоны документов (`server/templates/*.js`) | 12 | 3 210 |
| Серверный код (`server/**`, `.js`, кроме шаблонов) | 33 | 2 462 |
| Стили (`.css`) | 7 | 2 155 |
| Документация и служебное (`.md`, `.txt`, `.gitignore`, `.dockerignore`, `.iml`) | 7 | 439 |
| Конфигурация (`.json`, `.env`, `.conf`, `.yml`, `.xml`, `.example`) | 11 | 251 |
| `Dockerfile` | 2 | 43 |
| HTML-шаблон (`client/public/index.html`) | 1 | 16 |
| **ВСЕГО** | **120** | **18 335** |

Бинарных файлов (`public/*.png`, `favicon.ico`) — 3, ~18.5 КБ, строки не считались.
Всего файлов в проекте — 125 (из них 2 — `package-lock.json`, они исключены из подсчёта).

`package-lock.json` генерируется npm и в статистику не входит: 2 файла, ~19.7 тыс. строк,
743 КБ — это 1356 транзитивных пакетов в клиенте и 178 в сервере.

### По расширениям

| Расширение | Файлов | Строк |
|---|---:|---:|
| `.jsx` | 31 | 8 320 |
| `.js` | 61 | 7 111 |
| `.json` (`package.json`, `tsconfig.json`, `manifest.json`, `jsconfig.json`) | 3 | 107 |
| `.css` | 7 | 2 155 |
| `.md` | 2 | 365 |
| `.yml` | 1 | 55 |
| `.gitignore` | 2 | 50 |
| без расширения (`Dockerfile`) | 2 | 43 |
| `.example` | 3 | 35 |
| `.env` | 3 | 35 |
| `.dockerignore` | 2 | 21 |
| `.conf` | 1 | 19 |
| `.html` | 1 | 16 |
| `.txt` | 1 | 3 |

### Самые крупные файлы

| Файл | Строк |
|---|---:|
| `server/templates/practiceContractTemplate.js` | 1 013 |
| `client/src/pages/Profile.jsx` | 822 |
| `client/src/pages/Admin.css` | 673 |
| `client/src/components/NavBar.jsx` | 444 |
| `client/src/components/RequestCard.jsx` | 423 |
| `client/src/components/PracticeContractModal.jsx` | 379 |

## Известные проблемы

- `server/.env` содержит испорченный русский текст в `COLLEGE_NAME` / `DIRECTOR_NAME`
  (двойное кодирование, не восстанавливается) — все документы выходят сgarbled-именами.
- 18 мест в клиенте используют сырой `fetch()` с хардкодом `localhost:5000`, тогда как
  сервер работает на 7000; работают только благодаря `REACT_APP_API_URL` в `client/.env`.
- `GET /api/supervisor` в `DataStore` не имеет серверного маршрута — `loadAllData()`
  всегда даёт один 404.
- Миграций нет: `server/index.js` выполняет `sequelize.sync({ alter: true })` при каждом
  запуске, то есть правка моделей — это немедленный DDL на боевой базе.
- Нет seed-скрипта: первого `ADMIN` невозможно создать через API (регистрация жёстко
  выставляет `role: 'USER'`), нужен прямой `UPDATE "user" SET role='ADMIN'`.
- Роль зашита в JWT — смена роли в БД не действует до повторного входа.
- `server/utils/backupScheduler.js` запускается при каждом старте: при
  `BACKUP_ON_START=true` полный `pg_dump` блокирует запуск. Cron жёстко привязан к
  `Europe/Minsk`, хранится 7 последних дампов.

Подробности — в [issues.md](issues.md).

## Соглашения

- Текст интерфейса, сообщения API и комментарии — **на русском**.
- Сервер — CommonJS, клиент — ESM/JSX. Расширения файлов не менять (`.js` / `.jsx`).
- Ошибки сигнализируются фабриками `server/error/ApiError.js`;
  `ErrorHandlingMiddleware` остаётся последним зарегистрированным middleware.
- Скрипты чата: `cd server && npm run server`, `cd client && npm start`.
- Тестов в репозитории нет; единственная автопроверка — ESLint в составе CRA
  (`npm start` / `npm run build`).
