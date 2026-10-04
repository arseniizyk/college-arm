const test = require('node:test')
const assert = require('node:assert/strict')

const { resolveStudentIds } = require('./studentIds')

test('возвращает ids числами, даже если пришли строками', () => {
    assert.deepEqual(resolveStudentIds(['7', 8], 'ADMIN').ids, [7, 8])
})

test('ADMIN и TEACHER могут выбрать любое число студентов', () => {
    assert.equal(resolveStudentIds([1, 2, 3], 'ADMIN').error, undefined)
    assert.equal(resolveStudentIds([1, 2, 3], 'TEACHER').error, undefined)
})

test('USER может выбрать только одного студента', () => {
    assert.deepEqual(resolveStudentIds([7], 'USER').ids, [7])

    const { error } = resolveStudentIds([7, 8], 'USER')
    assert.equal(error.status, 400)
    assert.match(error.message, /одного студента/)
})

test('неизвестная роль ограничивается одним студентом', () => {
    assert.equal(resolveStudentIds([7, 8], 'GUEST').error.status, 400)
})

test('пустой список и не-массив отклоняются с текстом вызывающего', () => {
    assert.match(resolveStudentIds([], 'ADMIN', 'Не выбран ни один студент').error.message, /Не выбран/)
    assert.match(resolveStudentIds(undefined, 'ADMIN', 'Необходимо выбрать хотя бы одного студента').error.message, /хотя бы одного/)
    assert.equal(resolveStudentIds('7', 'ADMIN').error.status, 400)
})

test('нечисловые id отклоняются для любой роли, включая ADMIN', () => {
    for (const role of ['ADMIN', 'TEACHER', 'USER']) {
        const { error } = resolveStudentIds([1, 'abc'], role)
        assert.equal(error.status, 400, `роль ${role}`)
        assert.match(error.message, /идентификатор студента/)
    }
})

test('дедуплицирует повторяющиеся идентификаторы студентов', () => {
    assert.deepEqual(resolveStudentIds([1, 2, 1, 2], 'ADMIN').ids, [1, 2])
    assert.deepEqual(resolveStudentIds([5, 5, '5'], 'USER').ids, [5])
})