// Контракт маршрутов генерации документов.
//
// Тест написан до рефакторинга D1/D2 и падает на текущем коде: одиннадцать
// отдельных POST-маршрутов должны схлопнуться в параметризованный.
// Он же ловит пропущенный или задвоенный маршрут при добавлении приказа.

const test = require('node:test')
const assert = require('node:assert')

const documentGeneratorRouter = require('./documentGeneratorRouter')

// documentGeneratorRouter — это express-приложение (`require('express')`),
// поэтому маршруты лежат в _router.stack, а не в stack.
const routes = documentGeneratorRouter._router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
        method: Object.keys(layer.route.methods)[0].toUpperCase(),
        path: layer.route.path,
        middleware: layer.route.stack.length,
    }))

const find = (method, path) => routes.find((r) => r.method === method && r.path === path)

test('справка об обучении остаётся на отдельном маршруте с параметром', () => {
    assert.ok(find('GET', '/study-certificate/:requestId'), 'GET /study-certificate/:requestId не найден')
})

test('все приказы идут через один параметризованный маршрут', () => {
    assert.ok(find('POST', '/admin/orders/:docType'), 'POST /admin/orders/:docType не найден')
})

test('договор практики остаётся отдельным маршрутом', () => {
    assert.ok(find('POST', '/admin/practice-contract'), 'POST /admin/practice-contract не найден')
})

test('старые одиночные маршруты приказов убраны', () => {
    const legacy = routes
        .map((r) => r.path)
        .filter((p) => /^\/admin\/.*-order$/.test(p))

    assert.deepStrictEqual(legacy, [], 'остались одиночные маршруты приказов')
})

test('маршрутов ровно три', () => {
    assert.strictEqual(routes.length, 3, `ожидались 3 маршрута, получено ${routes.length}`)
})

test('на каждом маршруте ровно три middleware: два проверки доступа и обработчик', () => {
    // authMiddleware + checkRoleMiddleware('ADMIN') + сам обработчик.
    // Меньше двух — потеряна проверка прав, больше — лишняя обёртка,
    // которая после res.send приводит к "headers already sent".
    for (const route of routes) {
        assert.strictEqual(route.middleware, 3, `${route.method} ${route.path}: ${route.middleware} middleware`)
    }
})