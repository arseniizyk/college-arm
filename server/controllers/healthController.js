const sequelize = require('../db')
const ApiError = require('../error/ApiError')

const MIGRATIONS_DIR = `${__dirname}/../migrations`

class HealthController {
    // Публичная проверка готовности: без неё healthcheck контейнера
    // считал бы процесс здоровым при недоступной базе.
    async check(req, res, next) {
        try {
            await sequelize.query('SELECT 1')
        } catch (error) {
            return next(ApiError.serviceUnavailable('База данных недоступна'))
        }

        let pending
        try {
            pending = await pendingMigrations()
        } catch (error) {
            // Ожидаемая причина одна: таблицы миграций ещё нет, SequelizeStorage
            // падает на попытке её прочитать. Остальное — неизвестная причина,
            // и называть её «миграции не запускались» было бы враньём.
            if (error?.original?.code === '42P01') {
                return next(ApiError.serviceUnavailable(
                    'Схема не инициализирована: запустите npm run migrate'
                ))
            }
            console.error('Не удалось прочитать состояние миграций:', error.message)
            return next(ApiError.serviceUnavailable('Состояние миграций неизвестно'))
        }

        if (pending.length) {
            return next(ApiError.serviceUnavailable(
                `Не применены миграции: ${pending.join(', ')}. Запустите npm run migrate`
            ))
        }

        return res.json({ status: 'ok', database: 'up' })
    }
}
async function pendingMigrations() {
    const { Umzug, SequelizeStorage } = require('umzug')
    const umzug = new Umzug({
        migrations: { glob: ['*.js', { cwd: MIGRATIONS_DIR }] },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
        logger: undefined
    })
    return (await umzug.pending()).map(m => m.name)
}

module.exports = new HealthController()