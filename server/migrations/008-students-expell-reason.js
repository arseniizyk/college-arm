module.exports = {
    async up({ db }) {
        await db.query(
            'ALTER TABLE students ADD COLUMN IF NOT EXISTS expell_reason TEXT'
        )
    },

    async down({ db }) {
        await db.query(
            'ALTER TABLE students DROP COLUMN IF EXISTS expell_reason'
        )
    }
}
