const test = require('node:test')
const assert = require('node:assert/strict')

const { calculateCourse, courseTextGenitive } = require('./course')

// Курс отсчитывается от 1 сентября: в январе группа, зачисленная в сентябре 2024,
// ещё на первом курсе.
const january = { now: new Date(2025, 0, 15) }
const september = { now: new Date(2025, 8, 10) }

test('зачисление в сентябре прошлого года — первый курс до 1 сентября', () => {
    assert.equal(calculateCourse('2024-09-01', 4, 0, january), 1)
})

test('после 1 сентября учебный год переключается', () => {
    assert.equal(calculateCourse('2024-09-01', 4, 0, september), 2)
})

test('зачисление до 1 сентября года переключает курс 1 сентября', () => {
    const september2024 = { now: new Date(2024, 8, 10) }
    assert.equal(calculateCourse('2024-06-01', 4, 0, september2024), 2)
    assert.equal(calculateCourse('2024-06-01', 4, 0, september), 3)
})

test('зачисление весной (февраль/март) — курс переключается 1 сентября, а не 1 января', () => {
    const enrollFeb = '2024-02-15'
    // В весеннем семестре учебного года 2023/2024 — курс 1
    assert.equal(calculateCourse(enrollFeb, 4, 0, { now: new Date(2024, 4, 20) }), 1)
    // Летом до 1 сентября всё ещё учебный год 2023/2024 — курс 1
    assert.equal(calculateCourse(enrollFeb, 4, 0, { now: new Date(2024, 7, 31) }), 1)
    // 1 сентября 2024 наступает учебный год 2024/2025 — курс 2
    assert.equal(calculateCourse(enrollFeb, 4, 0, { now: new Date(2024, 8, 1) }), 2)
    // В январе 2025 посреди учебного года курс не прыгает — остаётся 2
    assert.equal(calculateCourse(enrollFeb, 4, 0, january), 2)
    // 1 сентября 2025 наступает учебный год 2025/2026 — курс 3
    assert.equal(calculateCourse(enrollFeb, 4, 0, september), 3)
})

test('зачисление в марте не переключается 1 января', () => {
    const enrollMarch = '2024-03-01'
    assert.equal(calculateCourse(enrollMarch, 4, 0, { now: new Date(2024, 2, 10) }), 1)
    assert.equal(calculateCourse(enrollMarch, 4, 0, { now: new Date(2024, 11, 31) }), 2)
    assert.equal(calculateCourse(enrollMarch, 4, 0, { now: new Date(2025, 0, 1) }), 2)
})

test('отсутствующая или негодная дата зачисления даёт первый курс', () => {
    assert.equal(calculateCourse(null, 4, 0, september), 1)
    assert.equal(calculateCourse(undefined, 4, 0, september), 1)
    assert.equal(calculateCourse('не дата', 4, 0, september), 1)
})

test('дата зачисления в будущем не даёт нулевого курса', () => {
    assert.equal(calculateCourse('2027-09-01', 4, 0, september), 1)
    assert.equal(courseTextGenitive('2027-09-01', 4, 0, september), 'первого')
})

test('курс прописью по падежам', () => {
    assert.equal(courseTextGenitive('2023-09-01', 4, 0, september), 'третьего')
})

test('«выпускник» наступает после maxCourse', () => {
    // maxCourse = 4 года без месяцев
    assert.equal(courseTextGenitive('2019-09-01', 4, 0, september), 'выпускник')
})

test('срок с месяцами поднимает maxCourse', () => {
    // 4 года 6 месяцев → maxCourse 5, пятый курс ещё не «выпускник», шестой уже да
    assert.equal(courseTextGenitive('2021-09-01', 4, 6, september), '5')
    assert.equal(courseTextGenitive('2020-09-01', 4, 6, september), 'выпускник')
})

test('нулевая длительность обучения даёт «выпускник», а не цифру', () => {
    assert.equal(courseTextGenitive('2024-09-01', 0, 0, september), 'выпускник')
})
