const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')

const { installGracefulShutdown, SHUTDOWN_SIGNALS } = require('./gracefulShutdown')

// Подменяем process, чтобы не убить тестовый раннер: реальные сигналы в тестах опасны
const createFakeProcess = () => {
    const proc = new EventEmitter()
    proc.exitCodes = []
    proc.killed = []
    proc.exit = (code) => proc.exitCodes.push(code)
    proc.kill = (pid, signal) => proc.killed.push({ pid, signal })
    return proc
}

const createLogger = () => ({ log() {}, error() {} })

const install = (options = {}) => {
    const proc = options.process || createFakeProcess()
    const logger = options.logger || createLogger()
    const handle = installGracefulShutdown({ ...options, process: proc, logger })
    return { ...handle, proc, logger }
}

test('вешает обработчики на SIGINT, SIGTERM и SIGUSR2', () => {
    const { proc, uninstall } = install()

    for (const signal of SHUTDOWN_SIGNALS) {
        assert.equal(proc.listenerCount(signal), 1, `нет обработчика на ${signal}`)
    }

    uninstall()
    for (const signal of SHUTDOWN_SIGNALS) {
        assert.equal(proc.listenerCount(signal), 0)
    }
})

test('вызывает dispose всех ресурсов в порядке регистрации и выходит с кодом 0', async () => {
    const calls = []
    const { proc } = install({
        resources: [
            { name: 'scheduler', dispose: () => calls.push('scheduler') },
            { name: 'server', dispose: () => calls.push('server') },
            { name: 'sequelize', dispose: () => calls.push('sequelize') }
        ]
    })

    proc.emit('SIGTERM')
    await new Promise(resolve => setImmediate(resolve))

    assert.deepEqual(calls, ['scheduler', 'server', 'sequelize'])
    assert.deepEqual(proc.exitCodes, [0])
})

test('дожидается асинхронного dispose', async () => {
    const calls = []
    const { proc } = install({
        resources: [{ name: 'sequelize', dispose: async () => {
            await new Promise(resolve => setTimeout(resolve, 10))
            calls.push('sequelize')
        } }]
    })

    proc.emit('SIGINT')
    await new Promise(resolve => setTimeout(resolve, 30))

    assert.deepEqual(calls, ['sequelize'])
    assert.deepEqual(proc.exitCodes, [0])
})

test('повторный сигнал не запускает dispose второй раз', async () => {
    let disposeCalls = 0
    const { proc } = install({
        resources: [{ name: 'sequelize', dispose: () => { disposeCalls++ } }]
    })

    proc.emit('SIGTERM')
    proc.emit('SIGTERM')
    proc.emit('SIGINT')
    await new Promise(resolve => setImmediate(resolve))

    assert.equal(disposeCalls, 1)
    assert.deepEqual(proc.exitCodes, [0])
    assert.equal(proc.killed.length, 0)
})

test('по SIGUSR2 пересылает сигнал себе вместо process.exit', async () => {
    const { proc } = install({ resources: [{ name: 'server', dispose: () => {} }] })

    proc.emit('SIGUSR2')
    await new Promise(resolve => setImmediate(resolve))

    assert.deepEqual(proc.exitCodes, [])
    assert.deepEqual(proc.killed, [{ pid: proc.pid, signal: 'SIGUSR2' }])
})

test('обработчики снимаются до отправки SIGUSR2, иначе сигнал гасится самим собой', async () => {
    // Регрессия: с установленным обработчиком повторный SIGUSR2 приходит в него же,
    // отбрасывается как повторный, и процесс остаётся жив, удерживая порт
    const { proc } = install({ resources: [{ name: 'server', dispose: async () => {} }] })

    proc.emit('SIGUSR2')
    await new Promise(resolve => setImmediate(resolve))

    assert.equal(proc.listenerCount('SIGUSR2'), 0, 'обработчик SIGUSR2 не снят перед kill')
    assert.equal(proc.listenerCount('SIGTERM'), 0)
    assert.equal(proc.listenerCount('SIGINT'), 0)
})

test('ошибка в одном dispose не отменяет остальные', async () => {
    const calls = []
    const errors = []
    const logger = { log() {}, error: (...args) => errors.push(args) }
    const { proc } = install({
        logger,
        resources: [
            { name: 'broken', dispose: () => { throw new Error('нет доступа') } },
            { name: 'sequelize', dispose: async () => { calls.push('sequelize') } }
        ]
    })

    proc.emit('SIGTERM')
    await new Promise(resolve => setImmediate(resolve))

    assert.deepEqual(calls, ['sequelize'])
    assert.deepEqual(proc.exitCodes, [0])
    assert.equal(errors.length, 1)
    assert.match(String(errors[0][0]), /broken/)
})

test('при зависшем dispose срабатывает страховочный таймер', async () => {
    const { proc } = install({
        timeoutMs: 10,
        resources: [{ name: 'server', dispose: () => new Promise(() => {}) }]
    })

    proc.emit('SIGTERM')
    await new Promise(resolve => setTimeout(resolve, 30))

    assert.deepEqual(proc.exitCodes, [1])
})

test('таймер вооружается только на время остановки, не в нормальной работе', async () => {
    // Регрессия: таймер, вооружённый при установке, убивал процесс через
    // timeoutMs после старта — то есть сервер падал сам, без всякого сигнала
    const { proc } = install({
        timeoutMs: 20,
        resources: [{ name: 'sequelize', dispose: async () => {} }]
    })

    await new Promise(resolve => setTimeout(resolve, 60))

    assert.deepEqual(proc.exitCodes, [], 'процент без сигналов, но процесс завершился')
    assert.equal(proc.listenerCount('SIGTERM'), 1, 'обработчики должны остаться на месте')
})

test('isShuttingDown фиксирует факт начала остановки', async () => {
    const { proc, isShuttingDown } = install({ resources: [] })

    assert.equal(isShuttingDown(), false)
    proc.emit('SIGTERM')
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(isShuttingDown(), true)
})

test('без ресурсов остановка всё равно завершает процесс', async () => {
    const { proc } = install()

    proc.emit('SIGTERM')
    await new Promise(resolve => setImmediate(resolve))

    assert.deepEqual(proc.exitCodes, [0])
})
