const test = require('node:test')
const assert = require('node:assert')

const { statusLabelFeminine, isKnownStatus } = require('./requestStatus')

test('подпись согласуется со словом «заявка»', () => {
    assert.equal(statusLabelFeminine('completed'), 'завершена')
    assert.equal(statusLabelFeminine('cancelled'), 'отменена')
    assert.equal(statusLabelFeminine('pending'), 'в обработке')
})

test('неизвестный статус проходит через как есть', () => {
    assert.equal(statusLabelFeminine('легаси'), 'легаси')
})

test('белый список совпадает с ключами карты', () => {
    for (const key of ['pending', 'completed', 'cancelled']) {
        assert.equal(isKnownStatus(key), true)
    }
    // Прежние имена и несуществовавшие в UI ключи больше не принимаются
    assert.equal(isKnownStatus('in_progress'), false)
    assert.equal(isKnownStatus('rejected'), false)
    assert.equal(isKnownStatus('approved'), false)
    assert.equal(isKnownStatus(''), false)
    assert.equal(isKnownStatus(undefined), false)
})

test('модуль экспортирует только то, чем пользуются контроллер и сид', () => {
    // Терминальность проверяет клиент, ей статус на сервере не меняется:
    // смена статуса идёт через белый список, поэтому дублировать правило
    // на сервере незачем.
    const exported = Object.keys(require('./requestStatus'))
    assert.deepEqual(exported.sort(), ['isKnownStatus', 'statusLabelFeminine'])
})
