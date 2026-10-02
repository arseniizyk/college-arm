const test = require('node:test')
const assert = require('node:assert')
const ApiError = require('../error/ApiError')
const errorHandler = require('./ErrorHandlingMiddleware')

test('ApiError.unauthorized создаёт ошибку со статусом 401', () => {
    const err = ApiError.unauthorized('Пользователь не авторизован')
    assert.ok(err instanceof ApiError)
    assert.strictEqual(err.status, 401)
    assert.strictEqual(err.message, 'Пользователь не авторизован')
})

test('ErrorHandlingMiddleware передаёт ошибку в next(err), если заголовки уже отправлены (res.headersSent)', () => {
    let nextCalledWith = null
    let statusCalled = false
    let jsonCalled = false

    const req = {}
    const res = {
        headersSent: true,
        status() { statusCalled = true; return this },
        json() { jsonCalled = true; return this }
    }
    const next = (err) => { nextCalledWith = err }

    const error = new Error('Client aborted stream')
    errorHandler(error, req, res, next)

    assert.strictEqual(nextCalledWith, error)
    assert.strictEqual(statusCalled, false)
    assert.strictEqual(jsonCalled, false)
})

test('ErrorHandlingMiddleware отдаёт статус и сообщение ApiError, если заголовки не отправлены', () => {
    let responseStatus = null
    let responseBody = null

    const req = {}
    const res = {
        headersSent: false,
        status(code) { responseStatus = code; return this },
        json(data) { responseBody = data; return this }
    }
    const next = () => {}

    const error = ApiError.unauthorized('Сессия истекла')
    errorHandler(error, req, res, next)

    assert.strictEqual(responseStatus, 401)
    assert.deepStrictEqual(responseBody, { message: 'Сессия истекла' })
})
