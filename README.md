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

Подсчёт выполнен 30.09.2026. Считаются все строки файла, включая пустые.
Исключены `node_modules/`, `.git/`, `.idea/`, `client/build/`, `server/backups/`
(дампы с персональными данными), сгенерированные документы `docs/` и временные
отладочные скрипты `server/_*.tmp.js` — это артефакты, а не исходный код.

### По типам файлов

| Категория | Файлов | Строк |
|---|---:|---:|
| Клиентский код (`client/src`, `.js` / `.jsx`) | 47 | 9 690 |
| Шаблоны документов (`server/templates/*.js`) | 13 | 2 100 |
| Серверный код (`server/**`, `.js`, кроме шаблонов) | 39 | 3 118 |
| Стили (`.css`) | 7 | 2 155 |
| Документация и служебное (`.md`, `.txt`, `.gitignore`, `.dockerignore`) | 9 | 719 |
| Конфигурация (`.json`, `.env`, `.conf`, `.yml`, `.xml`, `.example`) | 11 | 266 |
| `Dockerfile` | 2 | 50 |
| HTML-шблон (`client/public/index.html`) | 1 | 16 |
| **ВСЕГО** | **129** | **18 114** |

В серверный код входит `server/seed.js` (346 строк) — заполнение базы тестовыми
данными, см. раздел выше.

Бинарных файлов — 4, строки не считались: `client/public/*.png`, `favicon.ico` и
`.docx` с пояснительной запиской (~4.2 МБ). Всего файлов в проекте — 148, из них
2 — `package-lock.json` (19 724 строки, ~726 КБ транзитивных пакетов) и ещё 5 —
`docs/_README.txt` и четыре временных скрипта `server/_*.tmp.js`; они в подсчёт
не входят.

### По расширениям

| Расширение | Файлов | Строк |
|---|---:|---:|
| `.jsx` | 31 | 8 142 |
| `.js` | 68 | 6 766 |
| `.css` | 7 | 2 155 |
| `.md` (`README.md`, `issues.md`, `issues-solved.md`, `AGENTS.md`) | 4 | 644 |
| `.json` (`package.json`, `tsconfig.json`, `manifest.json`, `jsconfig.json`) | 3 | 108 |
| `.yml` (`docker-compose.yml`) | 1 | 63 |
| `.gitignore` | 2 | 51 |
| без расширения (`Dockerfile`) | 2 | 50 |
| `.example` | 3 | 41 |
| `.env` | 3 | 35 |
| `.conf` | 1 | 19 |
| `.html` | 1 | 16 |
| `.dockerignore` | 2 | 21 |
| `.txt` | 1 | 3 |
| **ВСЕГО** | **129** | **18 114** |

### Самые крупные файлы

| Файл | Строк |
|---|---:|
| `server/templates/practiceContractTemplate.js` | 1 013 |
| `client/src/pages/Profile.jsx` | 781 |
| `client/src/pages/Admin.css` | 673 |
| `client/src/components/NavBar.jsx` | 439 |
| `client/src/components/RequestCard.jsx` | 409 |
| `client/src/components/PracticeContractModal.jsx` | 363 |