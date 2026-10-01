// email уникален по смыслу (логин), но в модели уникальность не объявлена —
// ни UNIQUE-констрейнта, ни проверки в userController. Регистр при этом
// игнорировать нельзя: смешанный регистр это тот же человек.
//
// Индекс функциональный, по lower(email): обычный UNIQUE(email) не защищает
// от Foo@ и foo@ одновременно. Проверка дублей — до создания индекса.

module.exports = {
    async up({ db }) {
        const [duplicates] = await db.query(`
            SELECT lower(email) AS email, COUNT(*) AS count
            FROM users
            GROUP BY lower(email)
            HAVING COUNT(*) > 1
        `)

        if (duplicates.length) {
            const list = duplicates
                .map(d => `${d.email} (${d.count})`)
                .join(', ')
            throw new Error(
                `Повторяющиеся email без учёта регистра: ${list}. ` +
                'Схема не изменилась — объедините аккаунты и повторите миграцию.'
            )
        }

        await db.query(
            'CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_key" ON users (lower(email))'
        )
    },

    async down({ db }) {
        await db.query('DROP INDEX IF EXISTS "users_email_lower_key"')
    }
}