module.exports = {
    async up({ db }) {
        // 1. Удаляем таблицы уведомлений и заявок (в порядке FK зависимостей)
        await db.query('DROP TABLE IF EXISTS notifications CASCADE')
        await db.query('DROP TABLE IF EXISTS student_requests CASCADE')
        await db.query('DROP TABLE IF EXISTS requests CASCADE')

        // 2. Удаляем enum тип статуса заявок
        await db.query('DROP TYPE IF EXISTS enum_requests_status CASCADE')

        // 3. Удаляем привязку аккаунтов пользователей к студентам и преподавателям
        await db.query('ALTER TABLE students DROP COLUMN IF EXISTS "userId"')
        await db.query('ALTER TABLE teachers DROP COLUMN IF EXISTS "userId"')

        // 4. Устанавливаем дефолт роли ADMIN для пользователей и обновляем существующие записи
        await db.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'ADMIN'")
        await db.query("UPDATE users SET role = 'ADMIN' WHERE role != 'ADMIN'")
    },

    async down({ db }) {
        await db.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER'")
        await db.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL')
        await db.query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL')
    }
}
