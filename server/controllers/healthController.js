const sequelize = require('../db')
const ApiError = require('../error/ApiError')

class HealthController {
    // Публичная проверка готовности: без неё healthcheck контейнера
    // считал бы процесс здоровым до завершения sequelize.sync()
    async check(req, res, next) {
        try {
            await sequelize.query('SELECT 1')
            return res.json({ status: 'ok', database: 'up' })
        } catch (error) {
            return next(ApiError.serviceUnavailable('База данных недоступна'))
        }
    }
}

module.exports = new HealthController()
