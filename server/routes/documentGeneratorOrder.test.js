// Поведение общего обработчика приказов: неизвестный docType и разбор ошибок.
//
// Проверка идёт через сам обработчик, а не через HTTP: роут навешивает
// checkRoleMiddleware, который ходит в БД за ролью, поэтому HTTP-тест без
// живой базы всегда возвращал бы 401 и ничего не проверял.
// Права (401/403/200) проверяются вживую — см. приёмку.

const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const express = require('express')

const ApiError = require('../error/ApiError')
const errorHandler = require('../middleware/ErrorHandlingMiddleware')
const adminDocumentController = require('../controllers/adminDocumentController')

// Регистрируем обработчик напрямую, без проверки роли.
// express.json() обязателен: без него req.body — undefined, шаблоны
// падают на деструктуризации, и любой тест «проходит» с 500.
const app = express()
app.use(express.json())
app.post('/admin/orders/:docType', adminDocumentController.generateOrder)
app.use(errorHandler)

const post = async (docType, body = {}) => {
    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const { port } = server.address()

    try {
        return await fetch(`http://127.0.0.1:${port}/admin/orders/${docType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    } finally {
        server.close()
    }
}

test('ApiError умеет отдавать 404', () => {
    const err = ApiError.notFound('Неизвестный тип документа')
    assert.ok(err instanceof ApiError)
    assert.strictEqual(err.status, 404)
    assert.strictEqual(err.message, 'Неизвестный тип документа')
})

test('неизвестный docType даёт 404, а не 500', async () => {
    // Без проверки createTemplate был бы undefined и обработчик упал бы
    // в TypeError — клиент получил бы 500 вместо внятного сообщения.
    const res = await post('nesushchestvuyushchiy')

    assert.strictEqual(res.status, 404)
    assert.match(res.headers.get('content-type') || '', /application\/json/)
    assert.match((await res.json()).message, /Неизвестный тип документа/)
})

test('известный docType отдаёт документ', async () => {
    const res = await post('release')

    assert.strictEqual(res.status, 200)
    assert.match(
        res.headers.get('content-type') || '',
        /wordprocessingml\.document/,
        'ожидался MIME типа docx'
    )
})

test('имя файла в Content-Disposition соответствует типу приказа', async () => {
    const res = await post('snow-cleaning')
    const disposition = res.headers.get('content-disposition') || ''

    assert.match(disposition, /^attachment; filename="/)
    // Префикс приходит percent-encoded, поэтому сверяем по куску имени.
    assert.ok(decodeURIComponent(disposition).includes('Приказ_уборка_снега_'), disposition)
})

test('docType с регистром и подчёркиванием не проходит', async () => {
    // Сегмент маршрута не должен подбираться нечувствительно: иначе
    // неизвестное имя могло бы молча попасть в другой шаблон.
    assert.strictEqual((await post('Release')).status, 404)
    assert.strictEqual((await post('release_order')).status, 404)
})

test('все типы из реестра проходят без 404', async () => {
    const { ORDER_REGISTRY } = require('../templates/registry')

    for (const docType of Object.keys(ORDER_REGISTRY)) {
        assert.strictEqual((await post(docType)).status, 200, `${docType} не сгенерировался`)
    }
})