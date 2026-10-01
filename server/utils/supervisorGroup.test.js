const test = require('node:test')
const assert = require('node:assert')
const { parseSupervisorAssignment, formatCuratorBlockMessage } = require('./supervisorGroup')

test('отсутствующий teacherId оставляет куратора как есть', () => {
    assert.deepEqual(parseSupervisorAssignment(undefined), { action: 'keep' })
})

test('пустая строка снимает куратора', () => {
    assert.deepEqual(parseSupervisorAssignment(''), { action: 'clear' })
})

test('null снимает куратора', () => {
    assert.deepEqual(parseSupervisorAssignment(null), { action: 'clear' })
})

test('teacherId приходит из select строкой и приводится к числу', () => {
    assert.deepEqual(parseSupervisorAssignment('4'), { action: 'assign', teacherId: 4 })
})

test('числовой teacherId не меняется', () => {
    assert.deepEqual(parseSupervisorAssignment(4), { action: 'assign', teacherId: 4 })
})

test('нечисловой teacherId отклоняется с ошибкой', () => {
    const result = parseSupervisorAssignment('abc')
    assert.equal(result.action, 'error')
    assert.match(result.error, /преподавател/i)
})

test('дробный teacherId отклоняется', () => {
    assert.equal(parseSupervisorAssignment('4.5').action, 'error')
})
test('сообщение о кураторстве называет группу', () => {
    const message = formatCuratorBlockMessage(['12-34'])
    assert.match(message, /12-34/)
    assert.match(message, /снимите/i)
})

test('сообщение о кураторстве перечисляет все группы', () => {
    const message = formatCuratorBlockMessage(['12-34', '56-78'])
    assert.match(message, /12-34/)
    assert.match(message, /56-78/)
})

test('сообщение о кураторстве не упоминает группу при пустом списке', () => {
    assert.equal(formatCuratorBlockMessage([]), '')
})
