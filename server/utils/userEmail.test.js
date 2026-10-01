const test = require('node:test')
const assert = require('node:assert')
const { Op } = require('sequelize')

const { buildEmailWhere, isSameEmail } = require('./userEmail')

const and = (where) => where[Op.and]

test('email сравнивается без учёта регистра', () => {
    assert.ok(isSameEmail('Foo@Test.ru', 'foo@test.ru'))
    assert.ok(isSameEmail('FOO@TEST.RU', 'foo@test.ru'))
    assert.ok(!isSameEmail('foo@test.ru', 'bar@test.ru'))
})

test('нечисловые значения не роняют сравнение', () => {
    assert.ok(isSameEmail(undefined, undefined))
    assert.ok(!isSameEmail(undefined, 'foo@test.ru'))
})

test('where строится по lower(email)', () => {
    const [condition] = and(buildEmailWhere('Foo@Test.ru'))
    assert.strictEqual(condition.attribute.fn, 'lower')
    assert.strictEqual(condition.attribute.args[0].col, 'email')
    assert.strictEqual(condition.comparator, '=')
    assert.strictEqual(condition.logic, 'foo@test.ru')
})

test('свой аккаунт исключается из проверки', () => {
    const [, exclude] = and(buildEmailWhere('foo@test.ru', 7))
    assert.deepStrictEqual(exclude, { id: { [Op.ne]: 7 } })
})

test('без excludeUserId условие остаётся одно', () => {
    assert.strictEqual(and(buildEmailWhere('foo@test.ru')).length, 1)
})