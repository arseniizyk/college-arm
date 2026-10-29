module.exports = {
    async up({ db }) {
        // 1. Удаляем таблицы уведомлений, заявок и документов (в порядке FK зависимостей)
        await db.query('DROP TABLE IF EXISTS notifications CASCADE')
        await db.query('DROP TABLE IF EXISTS student_requests CASCADE')
        await db.query('DROP TABLE IF EXISTS requests CASCADE')
        await db.query('DROP TABLE IF EXISTS documents CASCADE')

        // 2. Удаляем enum тип статуса заявок
        await db.query('DROP TYPE IF EXISTS enum_requests_status CASCADE')

        // 3. Удаляем привязку аккаунтов пользователей к студентам и преподавателям
        await db.query('ALTER TABLE students DROP COLUMN IF EXISTS "userId"')
        await db.query('ALTER TABLE teachers DROP COLUMN IF EXISTS "userId"')

        // 4. Устанавливаем дефолт роли ADMIN для пользователей и обновляем существующие записи
        await db.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'ADMIN'")
        await db.query("UPDATE users SET role = 'ADMIN' WHERE role != 'ADMIN'")
    },

    async down() {
        throw new Error('Миграция 009 необратима: удаленные таблицы (requests, notifications, student_requests, documents) и перечисление enum_requests_status не подлежат автоматическому восстановлению')
    }
}
