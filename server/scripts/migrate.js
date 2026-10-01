require('dotenv').config()

const { Sequelize } = require('sequelize')
const { Umzug, SequelizeStorage } = require('umzug')
const sequelize = require('../db')

const MIGRATIONS_DIR = `${__dirname}/../migrations`

const umzug = new Umzug({
    migrations: {
        glob: ['*.js', { cwd: MIGRATIONS_DIR }],
        resolve: ({ name, path: filepath }) => {
            const migration = require(filepath)
            const inTransaction = (direction) => async () => {
                const t = await sequelize.transaction()
                const db = { query: (sql, opts) => sequelize.query(sql, { transaction: t, ...opts }) }
                try {
                    await migration[direction]({ db, Sequelize })
                    await t.commit()
                } catch (error) {
                    await t.rollback()
                    throw error
                }
            }
            return { name, up: inTransaction('up'), down: inTransaction('down') }
        }
    },
    // Миграции выполняются в транзакции (см. resolve), а DDL пишется обычным
    // query, а не через queryInterface — так видно итоговый SQL.
    context: sequelize,
    storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
    // Только события миграций: SQL-лог Sequelize на каждом ALTER не нужен
    logger: { info: msg => console.log(msg), warn: console.warn, error: console.error, debug: () => {} }
})

const BASELINE = '001-create-schema.js'

async function stampBaseline() {
    const applied = await umzug.executed()
    if (applied.some(m => m.name === BASELINE)) {
        console.log(`${BASELINE} уже отмечена как выполненная`)
        return
    }
    console.log(
        `${BASELINE}: база непустая, миграция помечается выполненной без запуска`
    )
    await umzug.storage.logMigration({ name: BASELINE })
}

async function main() {
    await sequelize.authenticate()

    // 001 — снимок схемы, созданной до миграций. На такой базе её выполнять
    // нельзя: DDL на IF NOT EXISTS поведёт себя непредсказуемо по части
    // ограничений. --baseline помечает её выполненной и применяет только
    // корректирующие миграции. На пустой базе флаг ничего не меняет.
    if (process.argv.slice(2).includes('--baseline')) {
        const [tables] = await sequelize.query(
            `SELECT to_regclass('public.specialties') AS specialties`
        )
        if (tables[0].specialties) {
            await stampBaseline()
        } else {
            console.log(
                `${BASELINE}: таблиц нет, миграция выполнится обычным порядком`
            )
        }
    }

    const pending = await umzug.pending()
    if (!pending.length) {
        console.log('Миграции: нечего применять, схема актуальна')
        return
    }

    console.log(`Миграции к применению: ${pending.map(m => m.name).join(', ')}`)
    await umzug.up()
}

main()
    .then(async () => {
        console.log('Готово.')
        await sequelize.close()
        process.exit(0)
    })
    .catch(async (e) => {
        console.error('Миграция не применена:', e.message || e)
        if (e.stack) console.error(e.stack)
        await sequelize.close().catch(() => {})
        process.exit(1)
    })