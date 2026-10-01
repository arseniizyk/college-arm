const test = require('node:test')
const assert = require('node:assert/strict')

const { validatePaymentType } = require('./paymentType')

test('пропускает оба значения из ENUM модели', () => {
    assert.equal(validatePaymentType('платной'), undefined)
    assert.equal(validatePaymentType('бесплатной'), undefined)
})

test('не считает пустое значение ошибкой — дефолт остаётся в модели', () => {
    assert.equal(validatePaymentType(undefined), undefined)
    assert.equal(validatePaymentType(null), undefined)
    assert.equal(validatePaymentType(''), undefined)
})

test('отвергает значение, которого нет в ENUM, с 400', () => {
    const error = validatePaymentType('блатной')

    assert.ok(error, 'ожидалась ошибка')
    assert.equal(error.status, 400)
    assert.match(error.message, /основ/i)
})