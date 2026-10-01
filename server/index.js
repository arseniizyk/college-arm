require('dotenv').config()

const express = require('express')
const sequelize = require('./db')
require('./models/models')
const cors = require('cors')
const router = require('./routes/index')
const errorHandler = require('./middleware/ErrorHandlingMiddleware')
const path = require('path')
const { startBackupScheduler, stopBackupScheduler } = require('./utils/backupScheduler')
const { installGracefulShutdown } = require('./utils/gracefulShutdown')

const PORT = process.env.PORT 

const app = express()
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))
app.use(express.json())
app.use(express.static(path.resolve(__dirname, 'static')))

app.use('/api', router)





//Обработчик ошибок, последний Middleware
app.use(errorHandler)

// Падение процесса из-за непойманного rejected promise не должно быть молчаливым
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
})

const start = async () => {
    try {
        await sequelize.authenticate()
        await sequelize.sync({ alter: true }) // Добавляем alter: true для обновления структуры таблиц

        // Запускаем планировщик автоматических бэкапов
        const backupTask = await startBackupScheduler()

        const server = app.listen(PORT, () => console.log(`Server started un port ${PORT}`))

        // Порядок важен: сначала перестаём принимать соединения, потом закрываем БД,
        // иначе запрос в полёте упадёт на разрыве пула соединений
        installGracefulShutdown({
            resources: [
                {
                    name: 'http-сервер',
                    dispose: () => new Promise((resolve, reject) => {
                        server.close(err => (err ? reject(err) : resolve()))
                    })
                },
                { name: 'планировщик бэкапов', dispose: () => stopBackupScheduler(backupTask) },
                { name: 'sequelize', dispose: () => sequelize.close() }
            ]
        })
    } catch (e) {
        console.error('Не удалось запустить сервер:', e.message)
        process.exit(1)
    }
}


start()