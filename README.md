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
(дампы с персональными данными), сгенерированные документы `docs/`, служебные
`.DS_Store` и временные отладочные скрипты `server/_*.tmp.js` — это артефакты,
а не исходный код.

### По типам файлов

| Категория | Файлов | Строк |
|---|---:|---:|
| Клиентский код (`client/src`, `.js` / `.jsx`) | 48 | 10 604 |
| Шаблоны документов (`server/templates/*.js`) | 15 | 2 456 |
| Серверный код (`server/**`, `.js`, кроме шаблонов) | 45 | 3 458 |
| Стили (`.css`) | 7 | 2 428 |
| Документация и служебное (`.md`, `.txt`, `.gitignore`, `.dockerignore`) | 9 | 1 172 |
| Конфигурация (`.json`, `.env`, `.conf`, `.yml`, `.example`) | 11 | 303 |
| `Dockerfile` | 2 | 59 |
| HTML-шблон (`client/public/index.html`) | 1 | 21 |
| **ВСЕГО** | **138** | **20 501** |

В серверный код входит `server/seed.js` (382 строки) — заполнение базы тестовыми
данными, см. раздел выше. Тестов (`*.test.js`) — 8 файлов, 423 строки; они входят
в клиентский и серверный код вместе с остальным.

Бинарных файлов — 4, строки не считались: `client/public/logo192.png`,
`logo512.png`, `favicon.ico` и `.docx` с пояснительной запиской (~4.2 МБ).
Всего файлов в проекте — 169, из них 138 посчитано выше, 2 — `package-lock.json`
(16 993 строки, ~443 КБ транзитивных пакетов), 9 — в `server/backups/` (дампы с
ПИ, исключены из подсчёта), 12 — в `client/build/`, 1 — `docs/D12_приказ_об_освобождении.docx`,
1 — `.DS_Store` и 2 служебных файла `.idea/`. Временных скриптов `server/_*.tmp.js`
в проекте нет.

### По расширениям

| Расширение | Файлов | Строк |
|---|---:|---:|
| `.jsx` | 31 | 8 809 |
| `.js` | 77 | 7 709 |
| `.css` | 7 | 2 428 |
| `.md` (`README.md`, `issues.md`, `issues-solved.md`, `AGENTS.md`) | 4 | 1 087 |
| `.json` (`server/package.json`, `client/package.json`, `client/public/manifest.json`) | 3 | 109 |
| `.yml` (`docker-compose.yml`) | 1 | 68 |
| `.gitignore` | 2 | 61 |
| без расширения (`Dockerfile`) | 2 | 59 |
| `.example` | 3 | 53 |
| `.env` | 3 | 50 |
| `.conf` (`client/nginx.conf`) | 1 | 23 |
| `.html` | 1 | 21 |
| `.dockerignore` | 2 | 21 |
| `.txt` (`client/public/robots.txt`) | 1 | 3 |
| **ВСЕГО** | **138** | **20 501** |

### Самые крупные файлы

| Файл | Строк |
|---|---:|
| `server/templates/practiceContractTemplate.js` | 1 038 |
| `client/src/pages/Profile.jsx` | 859 |
| `client/src/pages/Admin.css` | 722 |
| `client/src/components/NavBar.jsx` | 465 |
| `client/src/components/RequestCard.jsx` | 439 |
| `server/controllers/requestController.js` | 398 |
| `client/src/components/PracticeContractModal.jsx` | 390 |

`issues-solved.md` — 615 строк, но это журнал решений, а не код, поэтому в таблицу
выше он не попал.