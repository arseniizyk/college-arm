// notifications.requestId заведена под ссылку на заявку, но ассоциации
// Notification → Request в моделях не было, поэтому колонка осталась просто
// INTEGER: без FK и без индекса (индекс добавляет 004).
//
// ON DELETE SET NULL, а не CASCADE: заявки в приложении не удаляются
// (delete-эндпоинта у Request нет), а SET NULL согласуется с остальными FK
// схемы и переживает появление удаления в будущем — уведомление переживёт
// заявку, потеряв ссылку.

module.exports = {
    async up({ db }) {
        const [orphans] = await db.query(`
            SELECT n.id
            FROM notifications n
            WHERE n."requestId" IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.id = n."requestId")
        `)

        if (orphans.length) {
            await db.query(
                'UPDATE notifications SET "requestId" = NULL WHERE "requestId" IS NOT NULL'
            )
            console.log(
                `  notifications: обнулено ссылок на несуществующие заявки — ${orphans.length}`
            )
        }

        await db.query(`
            ALTER TABLE notifications
            ADD CONSTRAINT "notifications_requestId_fkey"
            FOREIGN KEY ("requestId") REFERENCES requests (id)
            ON UPDATE CASCADE ON DELETE SET NULL
        `)
    },

    async down({ db }) {
        await db.query(
            'ALTER TABLE notifications DROP CONSTRAINT IF EXISTS "notifications_requestId_fkey"'
        )
    }
}