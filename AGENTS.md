# AGENTS.md

Russian-language college document-automation system. Two independent npm apps, no root manifest, no git repo.

```
client/  React 19 + CRA (react-scripts 5) + MobX + react-bootstrap
server/  Express 4 (CommonJS) + Sequelize + PostgreSQL + docx
```

## Git

- **The `archive` branch is off limits.** Do not check it out, read its files, diff against it, merge it, cherry-pick from it, or rebase onto it — no reading and no interaction of any kind. Work on the current branch only. If a task seems to need `archive`, ask the user instead of touching it.

## Commands

Run each app from its own directory; there is no root install.

```bash
cd server && npm install && npm run server   # nodemon index.js, listens on PORT (7000)
cd client && npm install && npm start        # CRA dev server, MUST be localhost:3000
```

- `server`: the script is named `server`, not `start`. `npm run test-backup` references a `testBackup.js` that does not exist.
- `client`: no lint / format / typecheck scripts. `npm test` is CRA's Jest runner, but there are **no test files** in the repo — do not claim tests pass; there is nothing to run.
- The only automated check available is CRA's ESLint on `npm start` / `npm run build`.
- Bootstrap 5 and bootstrap-icons are loaded from **CDN links in `client/public/index.html`**, not imported in JS/CSS. Offline builds lose all styling.

## Database

- `server/.env` and `client/.env` are gitignored but required to boot; `server/.env.example` is the committed template. DB is on port **1111** (not 5432).
- **Never rewrite `.env` (or any file with Cyrillic text) with Windows PowerShell 5.1 cmdlets** — `Set-Content` / `Out-File` write UTF-8 with a BOM and can re-encode text through cp1252, which produces the double-encoded mojibake `Ð›Ð¾ÐºÐ°Ð»ÑŒÐ½Ñ‹Ð¹`. It already did this once to `server/.env`: `COLLEGE_NAME` / `DIRECTOR_NAME` were rewritten into `«Минский государственный колледж цифровых технологий»`-shaped mojibake, and because the `||` fallbacks in `server/templates/layout.js:118` and the order templates only trigger on an *empty* value, every generated document shipped garbled college/director names. It is recoverable: map each character back to its cp1252 byte and decode as UTF-8. `server/.env` is already fixed and matches `.env.example`; if mojibake reappears, fix it that way rather than retyping the values.
- All client HTTP goes through `client/src/http/index.js` (`$host` / `$authHost`). Use `downloadDoc(path, { method, payload, fileName, stamp })` for document downloads — it handles the blob save and error parsing. Note `errorMessage(err, fallback)` to show the server's message: axios throws on non-2xx, so `err.message` alone reads "Request failed with status code 400".
- **No migrations.** `server/index.js` runs `sequelize.sync({ alter: true })` on every boot, so model changes mutate the live schema. Treat model edits as immediate production DDL. See B6 in `issues.md`.
- Open problems live in `issues.md`; closed ones in `issues-solved.md`. New audit findings go to `issues.md` with a short entry: what, where, how to verify, how to fix.
- **No API path to create an `ADMIN`.** Registration hardcodes `role: 'USER'`, so you must `UPDATE "user" SET role='ADMIN'` directly in Postgres.
- **`server/seed.js` (`npm run seed`) fills the DB with fake data** — the script creates the first ADMIN for you, so the manual UPDATE above is only needed if you never seed. It refuses to run on a non-empty DB unless given `--force` (wipe) or `--keep` (append).
- All models live in one file: `server/models/models.js` (Sequelize `define` + associations). Table names are the model keys, snake_case, singular.
- `GET /api/student` returns an envelope `{ students, pagination }` when `limit`/`offset` are passed, but a bare array otherwise. `DataStore.fetchAll` special-cases this; other controllers return plain arrays.
- Backups use `pg_dump`/`psql` from PATH (see below). `.gitignore` now covers `server/backups/*.sql`, but several real dumps with full PII still sit in that directory on disk — don't read, commit, or attach them.
## Backups (operational gotcha)

`server/utils/backupScheduler.js` runs on every server start:

- `BACKUP_ON_START=true` in `.env` means a full `pg_dump` fires at boot. Without Postgres client tools in PATH the scheduler silently disables itself; with them, startup blocks on the dump. (Current `.env` ships `false`.)
- Cron `BACKUP_SCHEDULE` (default `0 3 * * *`) is hardcoded to timezone `Europe/Minsk`.
- Only the newest 7 dumps are kept; the rest are deleted automatically.
- `POST /api/backup/restore` is destructive and re-runs `psql -f` against the live DB.
- `pg_dump` writes straight into `backups/` — no temp dir, no rename. An interrupted dump leaves a `.sql` that `cleanOldBackups` counts as valid and that can evict a good one from the 7-file rotation.

## Shutdown

`server/index.js` handles `SIGTERM`/`SIGINT`: stop the cron task → `server.close()` + `closeAllConnections` → `waitForIdle` (counts in-flight `pg_dump`/`psql` in `utils/backup.js`) → `sequelize.close()` → exit 0. A second signal exits immediately with 1; the whole thing is capped by `SHUTDOWN_TIMEOUT_MS` (20 s). `docker-compose.yml` sets `stop_grace_period: 25s` — if that drops below the cap, compose SIGKILLs the container before shutdown finishes and the ordered steps become pointless.

## Auth

- JWT signed with `SECRET_KEY`, TTL 24h, payload `{ id, email, role }`. Token lives in `localStorage.token`.
- `role` is baked into the token. Changing a user's role in the DB has no effect until they re-login or the client calls `GET /api/user/auth` (which re-signs from the token, so it does **not** pick up DB changes either).
- `middleware/checkRoleMiddleware` re-verifies the token and compares `decoded.role`; it does not hit the DB. `middleware/authMiddleware` populates `req.user` — controllers read the user id from there, never from body params.
- `authMiddleware` and `checkRoleMiddleware` both `next()` on `OPTIONS` but forget to `return`, so preflight requests also fall through into the handler. CORS origin comes from `CLIENT_ORIGIN` in `server/index.js` (comma-separated, default `http://localhost:3000`). Every client request shares the axios `baseURL` (`REACT_APP_API_URL`), so a mismatched `CLIENT_ORIGIN` blocks the whole app.
- Client-side route gating (`AppRouter` + `routes.js`) is cosmetic; the server is the only real enforcement. Don't trust it as an authorization check.

## Client architecture

- Two MobX singletons (`UserStore`, `DataStore`) are instantiated once in `src/index.js` and passed through React context named `Context`. **Any component reading a store must be wrapped in `observer()`**, or updates will not render.
- `DataStore` is the single generic CRUD layer keyed by string entity types (`'users'`, `'students'`, …). Adding an entity means adding it to both `ENTITY_TYPES` and `ENDPOINTS` in `src/store/DataStore.js`. Note `'supervisors' -> /api/supervisor`, which has **no server route** — `loadAllData()` therefore always produces one 404.
- Two axios instances in `src/http/index.js`: `$host` (public) and `$authHost` (adds `Bearer` from localStorage). Path style is inconsistent — `userAPI.js` uses relative `'api/user/login'` while `DataStore` uses absolute `'/api/user'`. Keep whichever the file you're editing already uses.
- Admin UI is prop-drilled, not context-based: `pages/Admin.jsx` → `hooks/useAdminLogic.js` → presentational components. Adding an admin tab means touching the tabs in `Admin.jsx`, the state block in `useAdminLogic`, and `utils/tableConfig.js`.

## Adding a document template

Document generation is wired in four places; missing one leaves the feature dead:

1. `server/templates/<name>Template.js` — returns `docx` paragraphs, no I/O.
2. `server/controllers/adminDocumentController.js` — data prep + `Packer.toBuffer`.
3. `server/routes/documentGeneratorRouter.js` — POST route with `authMiddleware` + `checkRoleMiddleware('ADMIN')`.
4. `client/src/components/<Name>OrderModal.jsx` + a button in `components/DocumentsGeneration.jsx`.

Conventions worth matching: `server/utils/declension.js` handles Russian name declension via `petrovich`; `server/utils/orderParser.js` parses `student.order_number` into number/date — do not hand-roll regexes for either.

## Docker

`server/Dockerfile` builds a two-stage image with `postgresql-client-16` from the PGDG repo (so `pg_dump` matches `postgres:16-alpine` in compose), and runs as `USER node` (uid 1000) with `/app` owned by `node`. `npm ci --omit=dev` in the build stage — `bcrypt` is native, so the toolchain stays there but never reaches the image. `.dockerignore` excludes `node_modules`, `.env`, and `backups`. `docker-compose.yml` bind-mounts `./server/backups` over `/app/backups` and sets `user: "${SERVER_UID:-1000}:${SERVER_GID:-1000}"` — the host directory's owner must match that uid or `pg_dump` fails with `EACCES`. Bumping the database major version means bumping `ARG PG_MAJOR` in the Dockerfile too, or backups stop being created. `HEALTHCHECK` probes the public `GET /api/health` (no auth, runs `SELECT 1`, 503 when the DB is down) using Node 20's built-in `fetch`, because `curl` is purged from the runtime layer; compose's `client` waits on `condition: service_healthy`.

## Conventions

- UI text, API error messages, and code comments are **in Russian**. Match the surrounding file.
- **Every `async` route handler must be registered through `wrapController`** (`server/utils/asyncHandler.js`). Express 4 does not catch rejected promises from `async` handlers, so an unwrapped `throw` silently becomes an unhandled rejection and kills the process on Node 26. Routers wire it as `const someController = wrapController(require('../controllers/someController'))`.
- **Keep comments short.** A comment is for what the code does not say on its own — and for *why* it is done that way when the reason isn't obvious. A non-obvious rationale is welcome; it just has to fit in a line or two.
- **Do not put change history in the code.** No dates ("added 30.09.2026"), no issue or commit references, no "previously this did X", no enumeration of everything that was replaced. `git log` already records that, and `issues.md` holds the reasoning at the level of a whole change. The comment describes the present state, not the history that produced it.
- Server code is CommonJS with no semicolon consistency guarantee (mixed). Client is ESM/JSX. Some client files are `.js`, most components `.jsx` — do not rename.
- **Do not edit `README.md` unless explicitly asked.** Nobody reads it yet, so edits are churn on an unverified file. Document findings in `issues.md` / `issues-solved.md` and this file instead.
- `server/error/ApiError.js` factories are the expected way to signal errors; `ErrorHandlingMiddleware` must stay the last registered middleware.
