# AGENTS.md

Russian-language college document-automation system. Two independent npm apps, no root manifest, no git repo.

```
client/  React 19 + CRA (react-scripts 5) + MobX + react-bootstrap
server/  Express 4 (CommonJS) + Sequelize + PostgreSQL + docx
```

## Git

- **The `archive` branch is off limits.** Do not check it out, read its files, diff against it, merge it, cherry-pick from it, or rebase onto it — no reading and no interaction of any kind. Work on the current branch only. If a task seems to need `archive`, ask the user instead of touching it.

### Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <subject>
```

- **type** — `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `revert`.
- **scope** — optional, the area touched: `client`, `server`, `orders`, `auth`, `db`, `docker`, `agents`. Use it when the change spans more than one file or one layer; omit it for a small local change.
- **subject** — short imperative summary in English, no trailing period, ≤ 72 characters. Lowercase after the type.
- Body / `BREAKING CHANGE:` footer only when they add something the subject cannot say.

Examples from this repository: `fix(client): require explicit student selection for enrollment order and align course calculation with server`, `docs(env): add DIRECTOR_FULL_NAME to .env.example`, `refactor(server): single parameterized order route instead of ten methods`.

## Commands

Run each app from its own directory; there is no root install.

```bash
cd server && npm install && npm run migrate && npm run server   # nodemon index.js, listens on PORT (7000)
cd client && npm install && npm start        # CRA dev server, MUST be localhost:3000
```

- `server`: the script is named `server`, not `start`. `npm run test-backup` references a `testBackup.js` that does not exist.
- `server`: before the first run against a database, `npm run migrate` (see "Database schema"). On an **existing** database created before migrations, run it once as `npm run migrate:baseline` — it marks the frozen snapshot `001` as applied without executing it and applies only the corrective migrations.
- `client`: no lint / format / typecheck scripts. `npm test` is CRA's Jest runner; run it as `CI=true npm test` so it exits instead of watching. Only pure functions are tested — there is no jsdom-based component test, so a component change is verified by `npm run build` and by hand.
- Tests exist for a few pure modules only: `server/utils/*.test.js` and `server/templates/registry.test.js` (`node --test`, run with `npm test` in `server/`) plus `server/routes/*.test.js` (also `node --test`), and `client/src/utils/*.test.js`. A new `*.test.js` sits next to its source in both apps. Rendered `.docx` is not unit-tested; see "Verifying a change to document generation" above.
- The only automated check available is CRA's ESLint on `npm start` / `npm run build`.
- Bootstrap 5 and bootstrap-icons are loaded from **CDN links in `client/public/index.html`**, not imported in JS/CSS. Offline builds lose all styling.

## Database

- `server/.env` and `client/.env` are gitignored but required to boot; `server/.env.example` is the committed template. DB is on port **1111** (not 5432).
- **Never rewrite `.env` (or any file with Cyrillic text) with Windows PowerShell 5.1 cmdlets** — `Set-Content` / `Out-File` write UTF-8 with a BOM and can re-encode text through cp1252, which produces the double-encoded mojibake `Ð›Ð¾ÐºÐ°Ð»ÑŒÐ½Ñ‹Ð¹`. It already did this once to `server/.env`: `COLLEGE_NAME` / `DIRECTOR_NAME` were rewritten into `«Минский государственный колледж цифровых технологий»`-shaped mojibake, and because the `||` fallbacks in `server/templates/layout.js:118` and the order templates only trigger on an *empty* value, every generated document shipped garbled college/director names. It is recoverable: map each character back to its cp1252 byte and decode as UTF-8. `server/.env` is already fixed and matches `.env.example`; if mojibake reappears, fix it that way rather than retyping the values.
- All client HTTP goes through `client/src/http/index.js` (`$host` / `$authHost`). Use `downloadDoc(path, { method, payload, fileName, stamp })` for document downloads — it handles the blob save and error parsing. Note `errorMessage(err, fallback)` to show the server's message: axios throws on non-2xx, so `err.message` alone reads "Request failed with status code 400".
- **Migrations own the schema.** `sequelize.sync()` is gone — `server/index.js` only calls `sequelize.authenticate()`. DDL lives in `server/migrations/*.js` as frozen SQL run by umzug (`npm run migrate`); a migration never imports `models.js`, so editing a model cannot rewrite an applied migration. `001` is the frozen snapshot of the pre-migration schema: on an **existing** database use `npm run migrate:baseline`, which logs `001` as applied and applies only `002`–`007`; plain `npm run migrate` runs `001` too, but its DDL is `IF NOT EXISTS`, so on a database that already has the tables it is a no-op. Add a new numbered file, never edit an applied one. `GET /api/health` returns 503 while migrations are pending, so the compose healthcheck already catches a stale schema.
- **No API path to create an `ADMIN`.** Registration hardcodes `role: 'USER'`, so you must `UPDATE "user" SET role='ADMIN'` directly in Postgres.
- **`server/seed.js` (`npm run seed`) fills the DB with fake data** — the script creates the first ADMIN for you, so the manual UPDATE above is only needed if you never seed. It refuses to run on a non-empty DB unless given `--force` (wipe) or `--keep` (append).
- All models live in one file: `server/models/models.js` (Sequelize `define` + associations). Table names are the **pluralized** model keys (`group` → `groups`, `student_request` → `student_requests`), columns are camelCase and quoted in DDL.
- `GET /api/student` returns an envelope `{ students, pagination }` when `limit`/`offset` are passed, but a bare array otherwise. `DataStore.fetchAll` special-cases this; other controllers return plain arrays.
- Backups use `pg_dump`/`psql` from PATH (see below). `.gitignore` now covers `server/backups/*.sql`, but several real dumps with full PII still sit in that directory on disk — don't read, commit, or attach them.
## Backups (operational gotcha)

`server/utils/backupScheduler.js` runs on every server start:

- `BACKUP_ON_START=true` in `.env` means a full `pg_dump` fires at boot. Without Postgres client tools in PATH the scheduler silently disables itself; with them, startup blocks on the dump. (Current `.env` ships `false`.)
- Cron `BACKUP_SCHEDULE` (default `0 3 * * *`) is hardcoded to timezone `Europe/Minsk`.
- Only the newest 7 dumps are kept; the rest are deleted automatically.
- `POST /api/backup/restore` is destructive and re-runs `psql -f` against the live DB.
- `pg_dump` writes to `backups/*.sql.tmp` and is renamed to `.sql` only after exit code 0, so an interrupted dump is never mistaken for a finished one. A failed or orphaned `.tmp` is deleted, and `cleanOldBackups` only ever counts strict `backup_ГГГГ-ММ-ДД.sql` names.
- `isValidBackupFileName` in `server/utils/backup.js` is the one place a backup filename is validated — `backupController.download` / `.restore` import it rather than repeating the regex.

## Shutdown

`installGracefulShutdown` (`server/utils/gracefulShutdown.js`) is wired in `server/index.js` and disposes in order: HTTP server → backup scheduler → `sequelize.close()`. Order matters — closing the DB first would break requests still in flight.

- Handled signals are `SIGINT`, `SIGTERM` and `SIGUSR2`. `SIGUSR2` is nodemon's restart signal: after disposing, the process re-sends it to itself instead of calling `process.exit`, so nodemon completes the restart cycle and unmounts the old copy. The listeners are uninstalled **before** that re-send — with a listener still attached the signal is swallowed as a repeat and the process stays alive holding the port.
- Repeated signals are ignored after the first one. A failure in one disposer is logged and does not skip the rest.
- A 10s force-exit timer is armed when shutdown starts, not when the handler is installed — arming it at install time would kill a healthy server that simply outlived the timeout. It is `.unref()`ed, so it never holds the process open, and cleared once every disposer resolves; on expiry the process exits with code 1. `stop_grace_period: 30s` in `docker-compose.yml` leaves headroom above it.
- `uncaughtException` is still unhandled: a synchronous throw kills the process without disposing anything.
- `POST /api/backup/restore` is **not** made transactional. Killing the server mid-`psql -f` leaves the DB partially restored; nothing waits for that child process. Accepted for dev.

## Auth

- JWT signed with `SECRET_KEY`, TTL 24h, payload `{ id, email, role }`. Token lives in `localStorage.token`.
- The token's `role` is **not** the source of truth for authorization. `checkRoleMiddleware` re-verifies the token, then reads the user from the DB and compares `user.role` — so a role change in the DB takes effect on the next request, without re-login. `authMiddleware` only verifies the signature and puts the *token's* claims in `req.user`; controllers that read `req.user.role` see the value from login time. `GET /api/user/auth` также re-reads the DB and re-signs, so it does pick up role changes.
- `authMiddleware` and `checkRoleMiddleware` both `return next()` on `OPTIONS`, so preflight requests stop there. CORS origin comes from `CLIENT_ORIGIN` in `server/index.js` (comma-separated, default `http://localhost:3000`). Every client request shares the axios `baseURL` (`REACT_APP_API_URL`), so a mismatched `CLIENT_ORIGIN` blocks the whole app.
- Client-side route gating (`AppRouter` + `routes.js`) is cosmetic; the server is the only real enforcement. Don't trust it as an authorization check.
- The rule "how many students a role may put into a request" lives in exactly two places: `server/utils/studentIds.js` (`resolveStudentIds` — the server-side source of truth, called from `requestController.create` and `.update`) and `canSelectMultipleStudents` in `client/src/utils/consts.js` (which only picks `select` vs `multiselect` in the UI). `ADMIN` and `TEACHER` may pass any number, everyone else exactly one. Don't add a third copy.
- The minimum password length is `server/utils/passwordPolicy.js` (`validatePassword` — the source of truth, called from `userController.registration`, `.create`, `.update` and `.changePassword`) and `MIN_PASSWORD_LENGTH` in `client/src/utils/consts.js` (form hints only). `login` deliberately does not check length — it compares the hash. Existing short passwords keep working until changed.

## Client architecture

- Two MobX singletons (`UserStore`, `DataStore`) are instantiated once in `src/index.js` and passed through React context named `Context`. **Any component reading a store must be wrapped in `observer()`**, or updates will not render.
- `DataStore` is the single generic CRUD layer keyed by string entity types (`'users'`, `'students'`, …). Adding an entity means adding it to both `ENTITY_TYPES` and `ENDPOINTS` in `src/store/DataStore.js`.
- A curator is not an entity of its own: it is a `Supervisor` row (`groupId`, `teacherId`) reached through the group. One `Supervisor` row per group (`groupId` is unique), but a teacher may curate several groups — `findSupervisorGroupIds` is the only lookup, and both `requestController` and `GET /api/user/me` (`groupIds`) go through it. `client/src/utils/requestStudents.js` mirrors the access rule on the UI side. It is assigned, changed and cleared through `PUT /api/group/:id` — `supervisorRouter` does not exist by design. `parseSupervisorAssignment` (`server/utils/supervisorGroup.js`) is what tells "not sent", "clear" and "assign" apart; do not reintroduce a bare `if (teacherId)`. `teacherId` reaches `prepareFormData` from a `<select>` as a string, and `toGroupFormData` is what maps the nested `supervisor.teacher.id` back into the form on edit.
- Two axios instances in `src/http/index.js`: `$host` (public) and `$authHost` (adds `Bearer` from localStorage). Path style is inconsistent — `userAPI.js` uses relative `'api/user/login'` while `DataStore` uses absolute `'/api/user'`. Keep whichever the file you're editing already uses.
- Admin UI is prop-drilled, not context-based: `pages/Admin.jsx` → `hooks/useAdminLogic.js` → presentational components. Adding an admin tab means touching the tabs in `Admin.jsx`, the state block in `useAdminLogic`, and `utils/tableConfig.js`.
- An admin table column is described only in `TABLE_COLUMNS` (`utils/tableConfig.js`). When the value isn't `item[key]`, the column names a formatter from `RENDERERS` in `utils/tableCells.js` via `render` — `resolveCellContent` returns `{ text, variant?, muted?, title? }` or `null`, and `TableCell` is the only place that turns that into JSX. **Never branch on a column name in `TableContent.jsx` or `TableCell.jsx`**; a new computed column is a new formatter plus one config line. Formatters are pure and tested in `tableCells.test.js`, so keep them free of JSX.

## Adding a document template

An order (приказ) is wired in three places; missing one leaves the feature dead:

1. `server/templates/<name>Template.js` — returns `docx` paragraphs, no I/O.
2. `server/templates/registry.js` — one `ORDER_REGISTRY` entry `{ createTemplate, filePrefix, errorsContext }`. The **key is the route segment**: `exam-admission` → `POST /api/generate/admin/orders/exam-admission`. Do not add a controller method or a route — `adminDocumentController.generateOrder` and the `/admin/orders/:docType` route are generic and cover every entry.
3. `client/src/components/<Name>OrderModal.jsx` calling `orderUrl('<docType>')` from `utils/consts.js`, plus a card in `DocumentsGeneration.jsx` whose `id` is the same `docType`.

`docType` also has to appear in `ORDER_DOC_TYPES` in `client/src/utils/consts.js` — that list is what `docRoutes.test.js` cross-checks against the registry, and it is why a mismatched card id fails a test instead of silently opening nothing.

Two documents are deliberately **not** in the registry and have their own routes: the practice contract (`generatePracticeContract` — two copies per student via `pageBreakBefore`, different page margins) and the study certificate (`documentGeneratorController.generateStudyCertificate` — `GET /study-certificate/:requestId`, reads the DB). Do not fold them into the parameterized route.

Conventions worth matching: `server/utils/declension.js` handles Russian name declension via `petrovich`; `server/utils/orderParser.js` parses `student.order_number` into number/date — do not hand-roll regexes for either.

There is no test for rendered `.docx`, so a change to a template is verified by hand: generate the document, open it, and compare with the previous version. A byte-level harness (`docs/snapshot.js` + `docs/compare.js`) existed once but is not in the repository — if you want that verification back, it has to be rewritten.

## Docker

`server/Dockerfile` builds a two-stage image with `postgresql-client-16` from the PGDG repo (so `pg_dump` matches `postgres:16-alpine` in compose), and runs as `USER node` (uid 1000) with `/app` owned by `node`. `npm ci --omit=dev` in the build stage — `bcrypt` is native, so the toolchain stays there but never reaches the image. `.dockerignore` excludes `node_modules`, `.env`, and `backups`. `docker-compose.yml` bind-mounts `./server/backups` over `/app/backups` and sets `user: "${SERVER_UID:-1000}:${SERVER_GID:-1000}"` — the host directory's owner must match that uid or `pg_dump` fails with `EACCES`. Bumping the database major version means bumping `ARG PG_MAJOR` in the Dockerfile too, or backups stop being created. `HEALTHCHECK` probes the public `GET /api/health` (no auth, runs `SELECT 1`, 503 when the DB is down) using Node 20's built-in `fetch`, because `curl` is purged from the runtime layer; compose's `client` waits on `condition: service_healthy`.

Migrations run in a **separate one-shot `migrate` service**, not in the server container: `restart: "no"`, `command: ["node", "scripts/migrate.js"]`, `healthcheck: disable: true` (the Dockerfile healthcheck probes a server that isn't running there), and `server` depends on `condition: service_completed_successfully`. That ordering is the point — a failing migration leaves `server` and `client` unstarted and `docker compose up` exits 1, instead of a `restart: unless-stopped` loop retrying the DDL forever. Don't fold it back into a `command: sh -c "node scripts/migrate.js && node index.js"`, and don't move it into `index.js` either: with more than one replica, concurrent `ALTER`s race.

## Conventions

- UI text, API error messages, and code comments are **in Russian**. Match the surrounding file.
- **Every `async` route handler must be registered through `wrapController`** (`server/utils/asyncHandler.js`). Express 4 does not catch rejected promises from `async` handlers, so an unwrapped `throw` silently becomes an unhandled rejection and kills the process on Node 26. Routers wire it as `const someController = wrapController(require('../controllers/someController'))`.
- **Keep comments short.** A comment is for what the code does not say on its own — and for *why* it is done that way when the reason isn't obvious. A non-obvious rationale is welcome; it just has to fit in a line or two.
- **Do not put change history in the code.** No dates ("added 30.09.2026"), no issue or commit references, no "previously this did X", no enumeration of everything that was replaced. `git log` already records that, and git commits hold the reasoning at the level of a whole change. The comment describes the present state, not the history that produced it.
- Server code is CommonJS with no semicolon consistency guarantee (mixed). Client is ESM/JSX. Some client files are `.js`, most components `.jsx` — do not rename.
- **Do not edit `README.md` unless explicitly asked.**
- `server/error/ApiError.js` factories are the expected way to signal errors; `ErrorHandlingMiddleware` must stay the last registered middleware.
