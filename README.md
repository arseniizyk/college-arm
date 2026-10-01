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

Порядок старта задаёт сам compose: БД должна пройти `pg_isready`, затем
отрабатывает одноразовый сервис `migrate` (применяет миграции и завершается),
и только после его успешного выхода поднимается сервер. Если миграция падает,
сервер не стартует вовсе, а `docker compose up` возвращает ненулевой код.
Клиент ждёт `HEALTHCHECK` сервера. `CLIENT_ORIGIN` в compose уже совпадает с
портом клиента.

Посмотреть, что накатила миграция:

```bash
docker compose logs migrate
```

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

## Миграции

Схемой управляют миграции из `server/migrations/`, а не `sequelize.sync()`: сервер
при старте только проверяет подключение. Правка модели без новой миграции на схему
не влияет — это осознанное расхождение, а не ошибка.

```bash
docker compose run --rm migrate      # применить в контейнере
cd server && npm run migrate         # то же самое локально
```

На пустой базе применяются все миграции. На базе, созданной до миграций, нужен
`npm run migrate:baseline` — он помечает снимок `001` выполненным, не трогая
существующие таблицы, и применяет только корректирующие миграции `002`–`007`.

Подробности — в [issues.md](issues.md) и [issues-solved.md](issues-solved.md).

## Статистика проекта

Подсчёт выполнен 01.10.2026. Считаются все строки файла, включая пустые,
по правилам `wc -l` (77 файлов в проекте не заканчиваются переводом строки —
если считать их последнюю строку целиком, число разойдётся на единицы).
Исключены `node_modules/`, `.git/`, `.idea/`, `client/build/`, `server/backups/`
(дампы с персональными данными) и служебный `.DS_Store` — это артефакты,
а не исходный код.

### По типам файлов

| Категория | Файлов | Строк |
|---|---:|---:|
| Клиентский код (`client/src`, `.js` / `.jsx`) | 56 | 11 014 |
| Шаблоны документов (`server/templates/*.js`) | 15 | 2 454 |
| Серверный код (`server/**`, `.js`, кроме шаблонов) | 65 | 4 746 |
| Стили (`.css`) | 7 | 2 389 |
| Документация и служебное (`.md`, `.txt`, `.gitignore`, `.dockerignore`) | 9 | 1 302 |
| Конфигурация (`.json`, `.env`, `.conf`, `.yml`, `.example`) | 11 | 338 |
| `Dockerfile` | 2 | 59 |
| HTML-шаблон (`client/public/index.html`) | 1 | 20 |
| **ВСЕГО** | **166** | **22 322** |

В серверный код входят `server/seed.js` (395 строк) — заполнение базы тестовыми
данными, см. раздел выше, и подсистема миграций: `server/migrations/*.js` плюс
раннер `server/scripts/migrate.js`, всего 8 файлов и 454 строк. Тестов
(`*.test.js`) — 20 файлов, 1 435 строк; они входят
в клиентский и серверный код вместе с остальным.

Бинарных файлов — 4, строки не считались: `client/public/logo192.png`,
`logo512.png`, `favicon.ico` и `.docx` с пояснительной запиской (~4.2 МБ).
Всего файлов в проекте — 196, из них 166 посчитано выше, 2 — `package-lock.json`
(17 378 строк, ~443 КБ транзитивных пакетов), 4 — бинарные, 1 — `.DS_Store`,
9 — в `server/backups/` (дампы с ПИ, исключены из подсчёта), 12 — в `client/build/`
и 2 служебных файла `.idea/`.

### По расширениям

| Расширение | Файлов | Строк |
|---|---:|---:|
| `.jsx` | 32 | 8 492 |
| `.js` | 104 | 9 722 |
| `.css` | 7 | 2 389 |
| `.md` (`README.md`, `issues.md`, `issues-solved.md`, `AGENTS.md`) | 4 | 1 219 |
| `.json` (`server/package.json`, `client/package.json`, `client/public/manifest.json`) | 3 | 111 |
| `.yml` (`docker-compose.yml`) | 1 | 102 |
| `.gitignore` | 2 | 61 |
| без расширения (`Dockerfile`) | 2 | 59 |
| `.example` | 3 | 53 |
| `.env` | 3 | 49 |
| `.conf` (`client/nginx.conf`) | 1 | 23 |
| `.html` | 1 | 20 |
| `.dockerignore` | 2 | 19 |
| `.txt` (`client/public/robots.txt`) | 1 | 3 |
| **ВСЕГО** | **166** | **22 322** |

### Самые крупные файлы

| Файл | Строк |
|---|---:|
| `server/templates/practiceContractTemplate.js` | 1 038 |
| `client/src/pages/Profile.jsx` | 859 |
| `client/src/pages/Admin.css` | 741 |
| `client/src/components/RequestCard.jsx` | 433 |
| `server/controllers/requestController.js` | 401 |
| `server/seed.js` | 395 |
| `client/src/components/PracticeContractModal.jsx` | 390 |

`issues-solved.md` — 920 строк, но это журнал решений, а не код, поэтому в таблицу
выше он не попал.
