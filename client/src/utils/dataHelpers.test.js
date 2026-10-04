import { prepareFormData, toGroupFormData, toStudentFormData, formatDateForInput, calculateCourse } from './dataHelpers'

// Набор кейсов повторяет server/utils/course.test.js: правило курса одно,
// расхождение двух реализаций и есть регрессия.
const january = { now: new Date(2025, 0, 15) }
const september = { now: new Date(2025, 8, 10) }

test('зачисление в сентябре прошлого года — первый курс до 1 сентября', () => {
  expect(calculateCourse('2024-09-01', 4, 0, january)).toBe(1)
})

test('после 1 сентября учебный год переключается', () => {
  expect(calculateCourse('2024-09-01', 4, 0, september)).toBe(2)
})

test('зачисление до 1 сентября года переключает курс 1 сентября', () => {
  expect(calculateCourse('2024-06-01', 4, 0, { now: new Date(2024, 8, 10) })).toBe(2)
  expect(calculateCourse('2024-06-01', 4, 0, september)).toBe(3)
})

test('зачисление весной переключает курс 1 сентября, а не 1 января', () => {
  const enrollFeb = '2024-02-15'
  expect(calculateCourse(enrollFeb, 4, 0, { now: new Date(2024, 4, 20) })).toBe(1)
  expect(calculateCourse(enrollFeb, 4, 0, { now: new Date(2024, 7, 31) })).toBe(1)
  expect(calculateCourse(enrollFeb, 4, 0, { now: new Date(2024, 8, 1) })).toBe(2)
  expect(calculateCourse(enrollFeb, 4, 0, january)).toBe(2)
  expect(calculateCourse(enrollFeb, 4, 0, september)).toBe(3)
})

test('зачисление в марте не переключается 1 января', () => {
  expect(calculateCourse('2024-03-01', 4, 0, january)).toBe(2)
  expect(calculateCourse('2024-03-01', 4, 0, september)).toBe(3)
})

test('курс не уезжает за срок обучения', () => {
  expect(calculateCourse('2019-09-01', 4, 0, september)).toBe('Выпускник')
})

test('без даты зачисления курс неизвестен', () => {
  expect(calculateCourse('', 4, 0, september)).toBe('-')
})

test('одиночный id приходит массивом чисел', () => {
  expect(prepareFormData({ studentIds: '7' }, 'requests').studentIds).toEqual([7])
})

test('массив строк не схлопывается в первый элемент', () => {
  expect(prepareFormData({ studentIds: ['7', '8'] }, 'requests').studentIds).toEqual([7, 8])
})

test('пустой массив не превращается в [NaN]', () => {
  expect(prepareFormData({ studentIds: [] }, 'requests').studentIds).toEqual([])
})

test('documentId приводится к числу', () => {
  expect(prepareFormData({ studentIds: ['7'], documentId: '3' }, 'requests').documentId).toBe(3)
})

test('пустой documentId превращается в null', () => {
  expect(prepareFormData({ studentIds: ['7'], documentId: '' }, 'requests').documentId).toBeNull()
  expect(prepareFormData({ studentIds: ['7'], documentId: null }, 'requests').documentId).toBeNull()
})

test('для остальных вкладок studentIds не трогается', () => {
  expect(prepareFormData({ studentIds: '7' }, 'students').studentIds).toBe('7')
})

test('userId приводится к числу или null', () => {
  expect(prepareFormData({ userId: '4' }, 'students').userId).toBe(4)
  expect(prepareFormData({ userId: '' }, 'teachers').userId).toBeNull()
})
test('teacherId группы приводится к числу', () => {
  expect(prepareFormData({ teacherId: '4' }, 'groups').teacherId).toBe(4)
})

test('пустой teacherId группы превращается в null, а не в пустую строку', () => {
  expect(prepareFormData({ teacherId: '' }, 'groups').teacherId).toBeNull()
})

test('вложенный supervisor не уходит на сервер при сохранении группы', () => {
  const submitted = prepareFormData({ group_number: '12-34', supervisor: { teacher: { id: 4 } } }, 'groups')
  expect('supervisor' in submitted).toBe(false)
})

test('teacherId не трогается на других вкладках', () => {
  expect(prepareFormData({ teacherId: '4' }, 'teachers').teacherId).toBe('4')
})

test('куратор группы открывается в форме выбранным преподавателем', () => {
  const form = toGroupFormData({ group_number: '12-34', supervisor: { teacher: { id: 4 } } })
  expect(form.teacherId).toBe(4)
})

test('группа без куратора открывается с пустым выбором', () => {
  expect(toGroupFormData({ group_number: '12-34', supervisor: null }).teacherId).toBe('')
})

test('остальные поля группы не теряются при маппинге куратора', () => {
  expect(toGroupFormData({ group_number: '12-34' }).group_number).toBe('12-34')
})

test('formatDateForInput обрезает ISO дату до YYYY-MM-DD', () => {
  expect(formatDateForInput('2025-09-01T00:00:00.000Z')).toBe('2025-09-01')
  expect(formatDateForInput('2025-09-01')).toBe('2025-09-01')
  expect(formatDateForInput(null)).toBe('')
  expect(formatDateForInput('')).toBe('')
})

test('toStudentFormData нормализует enroll_date и expell_date', () => {
  const student = {
    id: 1,
    last_name: 'Иванов',
    enroll_date: '2025-09-01T00:00:00.000Z',
    expell_date: '2026-06-30T12:00:00.000Z'
  }
  const form = toStudentFormData(student)
  expect(form.enroll_date).toBe('2025-09-01')
  expect(form.expell_date).toBe('2026-06-30')
  expect(form.last_name).toBe('Иванов')
})

test('toGroupFormData нормализует enroll_date', () => {
  const group = {
    group_number: '12-34',
    enroll_date: '2024-09-01T00:00:00.000Z',
    supervisor: { teacher: { id: 5 } }
  }
  const form = toGroupFormData(group)
  expect(form.enroll_date).toBe('2024-09-01')
  expect(form.teacherId).toBe(5)
})
