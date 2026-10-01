// Уникальность «одна группа = один куратор» объявлена в модели
// (models.js:38-41), но sync({ alter: true }) на существующей таблице
// ограничения не создаёт — на живой базе индекса не было вовсе.
//
// Проверка дублей идёт до ALTER: сообщение об ошибке от самого ADD CONSTRAINT
// не говорит, какие именно группы повторяются, и вынуждает искать их вручную.

module.exports = {
    async up({ db }) {
        const [duplicates] = await db.query(`
            SELECT "groupId", COUNT(*) AS count
            FROM supervisors
            WHERE "groupId" IS NOT NULL
            GROUP BY "groupId"
            HAVING COUNT(*) > 1
        `)

        if (duplicates.length) {
            const list = duplicates.map(d => `${d.groupId} (${d.count})`).join(', ')
            throw new Error(
                `Несколько кураторов на группу: ${list}. ` +
                'Схема не изменилась — удалите лишних кураторов и повторите миграцию.'
            )
        }

        await db.query(
            'ALTER TABLE supervisors ADD CONSTRAINT "supervisors_groupId_key" UNIQUE ("groupId")'
        )
    },

    async down({ db }) {
        await db.query(
            'ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS "supervisors_groupId_key"'
        )
    }
}