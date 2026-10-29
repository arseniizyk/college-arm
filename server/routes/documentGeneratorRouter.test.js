// Контракт маршрутов генерации документов.

const test = require('node:test')
const assert = require('node:assert')

const documentGeneratorRouter = require('./documentGeneratorRouter')

const routes = documentGeneratorRouter._router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
        method: Object.keys(layer.route.methods)[0].toUpperCase(),
        path: layer.route.path,
        middleware: layer.route.stack.length,
    }))

const find = (method, path) => routes.find((r) => r.method === method && r.path === path)

test('справка об обучении выписывается администратором через POST /study-certificate', () => {
    assert.ok(find('POST', '/study-certificate'), 'POST /study-certificate не найден')
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
    for (const route of routes) {
        assert.strictEqual(route.middleware, 3, `${route.method} ${route.path}: ${route.middleware} middleware`)
    }
})
