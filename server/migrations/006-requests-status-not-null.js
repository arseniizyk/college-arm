// status объявлен NOT NULL в намерении (defaultValue 'pending'), но в модели
// allowNull не задан, поэтому колонка осталась nullable — приложение может
// записать заявку без статуса, и фильтр status = '...' её потеряет.

module.exports = {
    async up({ db }) {
        await db.query(
            "UPDATE requests SET status = 'pending' WHERE status IS NULL"
        )
        await db.query(
            'ALTER TABLE requests ALTER COLUMN status SET NOT NULL'
        )
    },

    async down({ db }) {
        await db.query(
            'ALTER TABLE requests ALTER COLUMN status DROP NOT NULL'
        )
    }
}