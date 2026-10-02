const test = require('node:test')
const assert = require('node:assert/strict')
const documentGeneratorController = require('./documentGeneratorController')

const makeSampleStudent = (overrides = {}) => ({
    last_name: 'Иванов',
    name: 'Иван',
    father_name: 'Иванович',
    order_number: '№ 12-У от 31.08.2022',
    enroll_date: '2022-08-31',
    ...overrides
})

const makeSampleGroup = (enrollDate = '2022-08-31') => ({
    group_number: 'ПО-41',
    enroll_date: enrollDate
})

const makeSampleSpecialty = (durationYears = 4, durationMonths = 0) => ({
    name: 'Программное обеспечение информационных технологий',
    qualification: 'Техник-программист',
    duration_years: durationYears,
    duration_months: durationMonths
})

test('GENITIVE_MONTHS содержит 12 названий месяцев в родительном падеже', () => {
    const expected = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ]
    assert.deepEqual(documentGeneratorController.GENITIVE_MONTHS, expected)
})

test('зачисление 31 августа не смещает дату окончания на июль (защита от мутации Date)', () => {
    const student = makeSampleStudent()
    const group = makeSampleGroup('2022-08-31')
    const specialty = makeSampleSpecialty(4, 0)

    const data = documentGeneratorController.prepareStudyCertificateData(student, group, specialty)

    // Проверяем дату окончания: строго 30 июня 2026 года (не 30 июля!)
    assert.equal(data.endDateDay, 30)
    assert.equal(data.endDateMonthGenitive, 'июня')
    assert.equal(data.endDateYear, 2026)

    // Проверяем дату зачисления: 31 августа 2022
    assert.equal(data.enrollDateDay, 31)
    assert.equal(data.enrollDateMonthGenitive, 'августа')
    assert.equal(data.enrollDateYear, 2022)
})

test('правильное склонение месяцев в родительном падеже (март, май, август и др.)', () => {
    const testCases = [
        { date: '2023-01-15', expectedDay: 15, expectedMonth: 'января' },
        { date: '2023-02-28', expectedDay: 28, expectedMonth: 'февраля' },
        { date: '2023-03-10', expectedDay: 10, expectedMonth: 'марта' },
        { date: '2023-04-05', expectedDay: 5, expectedMonth: 'апреля' },
        { date: '2023-05-20', expectedDay: 20, expectedMonth: 'мая' },
        { date: '2023-06-01', expectedDay: 1, expectedMonth: 'июня' },
        { date: '2023-07-15', expectedDay: 15, expectedMonth: 'июля' },
        { date: '2023-08-31', expectedDay: 31, expectedMonth: 'августа' },
        { date: '2023-09-01', expectedDay: 1, expectedMonth: 'сентября' },
        { date: '2023-10-18', expectedDay: 18, expectedMonth: 'октября' },
        { date: '2023-11-25', expectedDay: 25, expectedMonth: 'ноября' },
        { date: '2023-12-31', expectedDay: 31, expectedMonth: 'декабря' }
    ]

    for (const { date, expectedDay, expectedMonth } of testCases) {
        const student = makeSampleStudent()
        const group = makeSampleGroup(date)
        const specialty = makeSampleSpecialty(3, 0)

        const data = documentGeneratorController.prepareStudyCertificateData(student, group, specialty)
        assert.equal(data.enrollDateDay, expectedDay, `Неверный день для ${date}`)
        assert.equal(data.enrollDateMonthGenitive, expectedMonth, `Неверный месяц для ${date}`)
    }
})

test('расчёт даты окончания со сроком обучения с месяцами (3 года 10 месяцев)', () => {
    const student = makeSampleStudent()
    const group = makeSampleGroup('2022-09-01')
    const specialty = makeSampleSpecialty(3, 10)

    const data = documentGeneratorController.prepareStudyCertificateData(student, group, specialty)

    assert.equal(data.endDateDay, 30)
    assert.equal(data.endDateMonthGenitive, 'июня')
    assert.equal(data.endDateYear, 2026)
})
