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

test('зачисление до 1 сентября года считается сразу со второго курса', () => {
    assert.equal(calculateCourse('2024-06-01', 4, 0, september), 2)
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
