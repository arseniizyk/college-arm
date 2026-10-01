# Дипломный проект — автоматизация документооборота колледжа

## Запуск через Docker

Нужны два файла настроек: `.env` в корне (для compose) и `server/.env` (для сервера).

```bash
cp .env.example .env
cp server/.env.example server/.env
```

В `server/.env` обязательно задайте `SECRET_KEY` (по умолчанию это заглушка).
Значения БД в `server/.env` внутри compose перезаписываются, поэтому менять их не нужно.

```bash
docker compose up -d --build
```

| Сервис | Адрес |
|---|---|
| Клиент | http://localhost:8080 |
| API | http://localhost:7000, health — `/api/health` |
| PostgreSQL | `localhost:1111` |

Клиент ждёт `HEALTHCHECK` сервера, сервер — готовности БД, так что порядок старта
разбираться не должен. `CLIENT_ORIGIN` в compose уже совпадает с портом клиента.

Остановить и удалить контейнеры, оставив данные в томе:

```bash
docker compose down
```

Полностью снести вместе с базой:

```bash
docker compose down -v
```

На Linux выставьте владельца каталога бэкапов — сервер работает не от root, и
`pg_dump` иначе падает с `EACCES`:

```bash
SERVER_UID=$(id -u) SERVER_GID=$(id -g) docker compose up -d
```

## Тестовые данные

Скрипт `server/seed.js` создаёт специальности, группы, кураторов, студентов, заявки
и аккаунты всех трёх ролей вместе с первым `ADMIN` (через API его создать нельзя).

```bash
docker compose exec server node seed.js --force
```

| Команда | Что делает |
|---|---|
| `node seed.js` | Пустая база — заполняет; непустая — отказывается и печатает счётчики |
| `node seed.js --force` | **Очищает все таблицы** и заполняет заново |
| `node seed.js --keep` | Дозаполняет, не трогая существующие записи |
| `node seed.js --students=200 --groups=20` | Свой объём данных |
| `node seed.js --seed=42` | Другой набор псевдослучайных данных (по умолчанию `20260930`) |

Без флагов скрипт ничего не удаляет. Пароль у всех созданных аккаунтов —
`password123`: `admin@test.ru` (ADMIN), `teacher1@test.ru` (TEACHER),
`user1@test.ru` (USER).

Схему создаёт сам сервер при старте (`sequelize.sync({ alter: true })`), миграций нет —
правка моделей это немедленный DDL на боевой базе. Подробности — в [issues.md](issues.md).

## Статистика проекта

Подсчёт выполнен 01.10.2026. Считаются все строки файла, включая пустые.
Исключены `node_modules/`, `.git/`, `.idea/`, `client/build/`, `server/backups/`
(дампы с персональными данными), сгенерированные документы `docs/` и временные
отладочные скрипты `server/_*.tmp.js` — это артефакты, а не исходный код.

### По типам файлов

| Категория | Файлов | Строк |
|---|---:|---:|
| Клиентский код (`client/src`, `.js` / `.jsx`) | 45 | 10 492 |
| Шаблоны документов (`server/templates/*.js`) | 13 | 2 309 |
| Серверный код (`server/**`, `.js`, кроме шаблонов) | 39 | 3 431 |
| Стили (`.css`) | 7 | 2 428 |
| Документация и служебное (`.md`, `.txt`, `.gitignore`, `.dockerignore`) | 9 | 1 244 |
| Конфигурация (`.json`, `.env`, `.conf`, `.yml`, `.xml`, `.example`) | 11 | 302 |
| `Dockerfile` | 2 | 59 |
| HTML-шблон (`client/public/index.html`) | 1 | 21 |
| **ВСЕГО** | **127** | **20 286** |

В серверный код входит `server/seed.js` (382 строки) — заполнение базы тестовыми
данными, см. раздел выше.

Бинарных файлов — 4, строки не считались: `client/public/*.png`, `favicon.ico` и
`.docx` с пояснительной запиской (~4.2 МБ). Всего файлов в проекте — 145, из них
2 — `package-lock.json` (16 993 строки, ~726 КБ транзиветных пакетов), 9 — в
`server/backups/` (дампы с ПИ, исключены из подсчёта) и 2 — служебные файлы
`.idea/`. Каталог `docs/` пуст, временных скриптов `server/_*.tmp.js` в проекте
нет — прежние цифры 148 и «ещё 5 файлов» к ним относились.

### По расширениям

| Расширение | Файлов | Строк |
|---|---:|---:|
| `.jsx` | 31 | 8 796 |
| `.js` | 66 | 7 436 |
| `.css` | 7 | 2 428 |
| `.md` (`README.md`, `issues.md`, `issues-solved.md`, `AGENTS.md`) | 4 | 1 159 |
| `.json` (`package.json`, `tsconfig.json`, `manifest.json`, `jsconfig.json`) | 3 | 108 |
| `.yml` (`docker-compose.yml`) | 1 | 68 |
| `.gitignore` | 2 | 61 |
| без расширения (`Dockerfile`) | 2 | 59 |
| `.example` | 3 | 53 |
| `.env` | 3 | 50 |
| `.conf` | 1 | 23 |
| `.html` | 1 | 21 |
| `.dockerignore` | 2 | 21 |
| `.txt` | 1 | 3 |
| **ВСЕГО** | **127** | **20 286** |

### Самые крупные файлы

| Файл | Строк |
|---|---:|
| `server/templates/practiceContractTemplate.js` | 1 038 |
| `client/src/pages/Profile.jsx` | 859 |
| `client/src/pages/Admin.css` | 722 |
| `client/src/components/NavBar.jsx` | 465 |
| `client/src/components/RequestCard.jsx` | 439 |
| `client/src/components/PracticeContractModal.jsx` | 389 |