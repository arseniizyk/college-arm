// Снимок схемы, зафиксированный по состоянию базы до появления миграций.
// DDL заморожен и не зависит от models.js: правка модели не должна переписывать
// уже применённую миграцию. Порядок таблиц — по зависимостям FK.
//
// На существующей базе не выполняется: `npm run migrate -- --baseline` помечает
// её выполненной, дальше применяются только 002–007.

const TABLES = [
    `CREATE TABLE IF NOT EXISTS specialties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        qualification VARCHAR(255) NOT NULL,
        duration_years INTEGER NOT NULL DEFAULT 4,
        duration_months INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        document_name VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS "groups" (
        id SERIAL PRIMARY KEY,
        group_number VARCHAR(255) NOT NULL,
        enroll_date TIMESTAMPTZ NOT NULL,
        payment_type enum_groups_payment_type NOT NULL DEFAULT 'платной',
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "specialtyId" INTEGER REFERENCES specialties (id) ON UPDATE CASCADE ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        last_name VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255) DEFAULT '',
        "userId" INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        last_name VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255) DEFAULT '',
        order_number VARCHAR(255) NOT NULL,
        enroll_date TIMESTAMPTZ NOT NULL,
        expell_date TIMESTAMPTZ,
        "userId" INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "groupId" INTEGER REFERENCES "groups" (id) ON UPDATE CASCADE ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS supervisors (
        id SERIAL PRIMARY KEY,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "groupId" INTEGER REFERENCES "groups" (id) ON UPDATE CASCADE ON DELETE SET NULL,
        "teacherId" INTEGER REFERENCES teachers (id) ON UPDATE CASCADE ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        status enum_requests_status DEFAULT 'pending',
        description VARCHAR(255),
        "isViewed" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "documentId" INTEGER REFERENCES documents (id) ON UPDATE CASCADE ON DELETE SET NULL,
        "userId" INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body VARCHAR(255),
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "userId" INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
        "requestId" INTEGER
    )`,

    `CREATE TABLE IF NOT EXISTS student_requests (
        id SERIAL PRIMARY KEY,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "studentId" INTEGER REFERENCES students (id) ON UPDATE CASCADE ON DELETE CASCADE,
        "requestId" INTEGER REFERENCES requests (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "student_requests_studentId_requestId_key" UNIQUE ("studentId", "requestId")
    )`
]

// У CREATE TYPE нет IF NOT EXISTS, поэтому тип создаётся через pg_catalog:
// повторный запуск на базе, где тип уже есть, должен быть безвредным.
const TYPES = [
    { name: 'enum_groups_payment_type', values: `'платной', 'бесплатной'` },
    { name: 'enum_requests_status', values: `'pending', 'completed', 'cancelled'` }
]

// UNIQUE(group_number) создаёт 002: на пустой базе это тот же результат,
// но решение принимается в одном месте, а не в двух миграциях.

module.exports = {
    async up({ db }) {
        for (const type of TYPES) {
            await db.query(`
                DO $$
                BEGIN
                    CREATE TYPE ${type.name} AS ENUM (${type.values});
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END
                $$;
            `)
        }

        for (const ddl of TABLES) await db.query(ddl)
    },

    async down({ db }) {
        await db.query(`
            DROP TABLE IF EXISTS student_requests, notifications, requests,
                supervisors, students, teachers, "groups", users, documents, specialties;
            DROP TYPE IF EXISTS enum_requests_status;
            DROP TYPE IF EXISTS enum_groups_payment_type;
        `)
    }
}