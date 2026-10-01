// Реестр приказов: ключ docType, шаблон, префикс имени файла.
//
// docType — это сегмент пути в POST /admin/orders/:docType, поэтому реестр
// одновременно является списком маршрутов: приказ нельзя «забыть»,
// потому что он просто не попал бы в реестр.
//
// filePrefix и тексты в errorsContext выписаны дословно из прежних десяти
// методов контроллера. Тест фиксирует их, чтобы случайная правка имени
// файла не прошла молча.

const test = require('node:test')
const assert = require('node:assert')

const { ORDER_REGISTRY } = require('./registry')

test('в реестре ровно десять приказов', () => {
    assert.strictEqual(Object.keys(ORDER_REGISTRY).length, 10)
})

test('договор практики не попал в реестр приказов', () => {
    // У него две копии на студента и свои отступы — общий обработчик
    // к нему неприменим.
    assert.ok(!('practice-contract' in ORDER_REGISTRY))
    assert.ok(!('practiceContract' in ORDER_REGISTRY))
})

test('docType совпадает с сегментом прежнего пути', () => {
    assert.deepStrictEqual(Object.keys(ORDER_REGISTRY).sort(), [
        'duplicate-ticket',
        'enrollment',
        'exam-admission',
        'health',
        'holidays',
        'release',
        'snow-cleaning',
        'stipend',
        'student-direction',
        'transfer',
    ])
})

test('префиксы имён файлов перенесены из прежних методов дословно', () => {
    const prefixes = Object.fromEntries(
        Object.entries(ORDER_REGISTRY).map(([docType, entry]) => [docType, entry.filePrefix])
    )

    assert.deepStrictEqual(prefixes, {
        'exam-admission': 'Приказ_допуск_экзамены',
        holidays: 'Приказ_каникулы',
        stipend: 'Приказ_стипендия',
        'snow-cleaning': 'Приказ_уборка_снега',
        'student-direction': 'Приказ_направление',
        health: 'Приказ_оздоровление',
        transfer: 'Приказ_перевод',
        'duplicate-ticket': 'Приказ_дубликат_билета',
        enrollment: 'Приказ_зачисление',
        release: 'Приказ_освобождение',
    })
})

test('у каникул и стипендии свои тексты ошибки в логе', () => {
    // В прежнем коде именно у этих двух методов текст отличался от
    // общего «Ошибка генерации приказа» — лог не должен потерять это.
    assert.strictEqual(ORDER_REGISTRY.holidays.errorsContext, 'Ошибка генерации приказа о каникулах')
    assert.strictEqual(ORDER_REGISTRY.stipend.errorsContext, 'Ошибка генерации приказа о стипендии')
    assert.strictEqual(ORDER_REGISTRY.release.errorsContext, 'Ошибка генерации приказа')
})

test('у каждой записи есть функция шаблона', () => {
    for (const [docType, entry] of Object.entries(ORDER_REGISTRY)) {
        assert.strictEqual(typeof entry.createTemplate, 'function', `${docType}: createTemplate не функция`)
    }
})

test('шаблон реестра выдаёт непустой массив абзацев', () => {
    // Пустой массив уехал бы в клиент как валидный, но пустой .docx.
    for (const [docType, entry] of Object.entries(ORDER_REGISTRY)) {
        const paragraphs = entry.createTemplate({})
        assert.ok(Array.isArray(paragraphs), `${docType}: шаблон вернул не массив`)
        assert.ok(paragraphs.length > 0, `${docType}: шаблон вернул пустой документ`)
    }
})