# AGENTS.md

Russian-language college document-automation system. Two independent npm apps, no root manifest, no git repo.

```
client/  React 19 + CRA (react-scripts 5) + MobX + react-bootstrap
server/  Express 4 (CommonJS) + Sequelize + PostgreSQL + docx
```

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
- **`server/.env` has corrupted Russian text** in `COLLEGE_NAME` / `DIRECTOR_NAME` (stored as double-encoded mojibake, unrecoverable). Every generated document ships garbled college/director names. Fix the file before trusting document output.
- The client never uses axios for 18 call sites — 11 `*OrderModal.jsx`, `NavBar.jsx`, `RequestCard.jsx`, `Profile.jsx` call raw `fetch()` with a hardcoded `localhost:5000` fallback (server runs on **7000**). They only work because `REACT_APP_API_URL` is set in `client/.env`.
- **No migrations.** `server/index.js` runs `sequelize.sync({ alter: true })` on every boot, so model changes mutate the live schema. Treat model edits as immediate production DDL.
- **No seed script.** There is no way to create the first `ADMIN` through the API (registration hardcodes `role: 'USER'`); you must `UPDATE "user" SET role='ADMIN'` directly in Postgres.
- All models live in one file: `server/models/models.js` (Sequelize `define` + associations). Table names are the model keys, snake_case, singular.
- `GET /api/student` returns an envelope `{ students, pagination }` when `limit`/`offset` are passed, but a bare array otherwise. `DataStore.fetchAll` special-cases this; other controllers return plain arrays.
- Backups use `pg_dump`/`psql` from PATH (see below). `.gitignore` now covers `server/backups/*.sql`, but several real dumps with full PII still sit in that directory on disk — don't read, commit, or attach them.
## Backups (operational gotcha)

`server/utils/backupScheduler.js` runs on every server start:

- `BACKUP_ON_START=true` in `.env` means a full `pg_dump` fires at boot. Without Postgres client tools in PATH the scheduler silently disables itself; with them, startup blocks on the dump. (Current `.env` ships `false`.)
- Cron `BACKUP_SCHEDULE` (default `0 3 * * *`) is hardcoded to timezone `Europe/Minsk`.
- Only the newest 7 dumps are kept; the rest are deleted automatically.
- `POST /api/backup/restore` is destructive and re-runs `psql -f` against the live DB.

## Auth

- JWT signed with `SECRET_KEY`, TTL 24h, payload `{ id, email, role }`. Token lives in `localStorage.token`.
- `role` is baked into the token. Changing a user's role in the DB has no effect until they re-login or the client calls `GET /api/user/auth` (which re-signs from the token, so it does **not** pick up DB changes either).
- `middleware/checkRoleMiddleware` re-verifies the token and compares `decoded.role`; it does not hit the DB. `middleware/authMiddleware` populates `req.user` — controllers read the user id from there, never from body params.
- `authMiddleware` and `checkRoleMiddleware` both `next()` on `OPTIONS` but forget to `return`, so preflight requests also fall through into the handler. CORS origin now comes from `CLIENT_ORIGIN` in `server/index.js` (comma-separated, default `http://localhost:3000`) — but 18 client call sites bypass this entirely by hardcoding their own URL, see above.
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

`server/Dockerfile` (added 29.09.2026) builds a two-stage image with `postgresql-client` so `pg_dump`/`psql` work inside the container. `.dockerignore` excludes `node_modules`, `.env`, and `backups`. Known gaps are listed in `issues.md` (K1–K3): no `USER`, no healthcheck, dev deps shipped to runtime.

## Conventions

- UI text, API error messages, and code comments are **in Russian**. Match the surrounding file.
- Server code is CommonJS with no semicolon consistency guarantee (mixed). Client is ESM/JSX. Some client files are `.js`, most components `.jsx` — do not rename.
- `server/error/ApiError.js` factories are the expected way to signal errors; `ErrorHandlingMiddleware` must stay the last registered middleware.
