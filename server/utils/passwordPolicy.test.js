const test = require('node:test')
const assert = require('node:assert/strict')

const { validatePassword, MIN_PASSWORD_LENGTH } = require('./passwordPolicy')

test('минимальная длина пароля — 4 символа', () => {
    assert.equal(MIN_PASSWORD_LENGTH, 4)
})

test('пароль короче минимума отклоняется с текстом про минимум', () => {
    const { error } = validatePassword('abc')
    assert.equal(error.status, 400)
    assert.match(error.message, /минимум 4 символа/)
})

test('пароль пустой или не строка тоже отклоняется', () => {
    assert.equal(validatePassword('').error.status, 400)
    assert.equal(validatePassword(undefined).error.status, 400)
    assert.equal(validatePassword(1234).error.status, 400)
})

test('пароль длиной ровно минимум принимается', () => {
    assert.equal(validatePassword('abcd').error, undefined)
    assert.equal(validatePassword('  ab').error, undefined)
})