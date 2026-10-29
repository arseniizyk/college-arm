import { RENDERERS, resolveCellContent } from './tableCells'
import { TABLE_COLUMNS } from './tableConfig'
import { getNameById, MISSING_SPECIALTY_LABEL } from './dataHelpers'

const column = (key, render) => ({ key, render })

// Ровно то дерево, которое отдаёт groupController: specialty и
// supervisor.teacher приходят вложенными, поля course в строке нет.
const group = (overrides = {}) => ({
  id: 1,
  group_number: 'Г-1',
  enroll_date: '2024-09-01',
  specialty: { id: 2, name: 'Программирование', duration_years: 4, duration_months: 0 },
  supervisor: { teacher: { last_name: 'Иванов', name: 'Иван', father_name: 'Иванович' } },
  ...overrides
})

test('у всех колонок известный форматтер', () => {
  // Опечатка в render дала бы дефис вместо значения колонки — молча.
  const unknown = []
  for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
    for (const col of columns) {
      if (col.render !== undefined && RENDERERS[col.render] === undefined) {
        unknown.push(`${table}.${col.key} → ${col.render}`)
      }
    }
  }
  expect(unknown).toEqual([])
})

test('у вычисляемых колонок есть форматтер', () => {
  const renderOf = (table, key) =>
    TABLE_COLUMNS[table].find(col => col.key === key)?.render

  expect(renderOf('groups', 'course')).toBe('course')
  expect(renderOf('groups', 'supervisor')).toBe('supervisor')
  expect(renderOf('specialties', 'duration')).toBe('duration')
})

test('неизвестный форматтер падает с именем колонки', () => {
  expect(() => resolveCellContent(column('course', 'kurse'), group())).toThrow(/kurse.*course/)
})

test('колонка без форматтера берёт поле строки как есть', () => {
  expect(resolveCellContent(column('group_number'), group())).toEqual({ text: 'Г-1' })
})

test('пустое поле даёт дефис', () => {
  expect(resolveCellContent(column('expell_date'), { expell_date: null })).toBeNull()
  expect(resolveCellContent(column('expell_date'), {})).toBeNull()
  expect(resolveCellContent(column('expell_date'), { expell_date: '' })).toBeNull()
  expect(resolveCellContent(column('expell_date', 'expellDate'), { expell_date: null })).toBeNull()
})

test('дата отчисления подсвечивается как опасность', () => {
  expect(resolveCellContent(column('expell_date', 'expellDate'), { expell_date: '2025-04-30' }))
    .toEqual({ text: '30.04.2025', variant: 'danger', title: 'Отчислен 30.04.2025' })
  expect(resolveCellContent(column('expell_date', 'expellDate'), { expell_date: '2025-04-30', expell_reason: 'по собственному желанию' }))
    .toEqual({ text: '30.04.2025', variant: 'danger', title: 'Отчислен 30.04.2025\nПричина: по собственному желанию' })
})

test('ноль — не пустое значение', () => {
  expect(resolveCellContent(column('duration_years'), { duration_years: 0 })).toEqual({ text: '0' })
})

test('число не превращается в дату', () => {
  expect(resolveCellContent(column('duration_years'), { duration_years: 2019 })).toEqual({ text: '2019' })
})

test('дата форматируется по-русски, createdAt тоже', () => {
  expect(resolveCellContent(column('enroll_date'), { enroll_date: '2024-09-01' }))
    .toEqual({ text: '01.09.2024' })
  expect(resolveCellContent(column('createdAt'), { createdAt: '2024-09-01' }))
    .toEqual({ text: '01.09.2024' })
})

test('не-дата в колонке даты показывается как есть', () => {
  expect(resolveCellContent(column('order_number'), { order_number: '12' })).toEqual({ text: '12' })
})

test('длинный текст обрезается, полный остаётся в подсказке', () => {
  const long = 'я'.repeat(80)
  const cell = resolveCellContent(column('qualification'), { qualification: long })
  expect(cell.text).toBe(`${'я'.repeat(50)}...`)
  expect(cell.title).toBe(long)
})

test('порядковый номер берётся из контекста и приглушён', () => {
  expect(resolveCellContent(column('id', 'rowNumber'), { id: 42 }, { rowNumber: 7 }))
    .toEqual({ text: '7', muted: true })
})

test('ссылка на другую сущность показывает название, а не id', () => {
  const data = { groups: [{ id: 3, group_number: 'Г-3' }] }
  const names = (key, value) => getNameById(key, value, data)
  expect(resolveCellContent(column('groupId', 'reference'), { groupId: 3 }, { names }))
    .toEqual({ text: 'Г-3' })
})

test('несуществующий id в ссылке не молчит', () => {
  const names = (key, value) => getNameById(key, value, {})
  expect(resolveCellContent(column('groupId', 'reference'), { groupId: 9 }, { names }))
    .toEqual({ text: 'ID: 9' })
})

test('неизвестная роль остаётся как есть', () => {
  expect(resolveCellContent(column('role', 'role'), { role: 'ADMIN' }))
    .toEqual({ text: 'Администратор', variant: 'danger' })
  expect(resolveCellContent(column('role', 'role'), { role: 'ROOT' })).toEqual({ text: 'ROOT' })
})

test('курс считается по вложенной специальности', () => {
  const cell = resolveCellContent(column('course', 'course'), group())
  expect(cell.variant).toBe('primary')
  expect(cell.text).toMatch(/^\d+ курс$/)
})

test('группа без специальности не получает выдуманный курс', () => {
  expect(resolveCellContent(column('course', 'course'), group({ specialty: null })))
    .toEqual({ text: '-', muted: true, title: MISSING_SPECIALTY_LABEL })
})

test('группа без даты зачисления не получает курс', () => {
  expect(resolveCellContent(column('course', 'course'), group({ enroll_date: null }))).toBeNull()
})

test('длительность склеивает годы и месяцы', () => {
  expect(resolveCellContent(column('duration', 'duration'), { duration_years: 4, duration_months: 2 }))
    .toEqual({ text: '4 года 2 месяца' })
  expect(resolveCellContent(column('duration', 'duration'), { duration_years: 1, duration_months: 0 }))
    .toEqual({ text: '1 год' })
})

test('нулевая длительность показывается дефисом', () => {
  expect(resolveCellContent(column('duration', 'duration'), { duration_years: 0, duration_months: 0 }))
    .toEqual({ text: '-' })
})

test('куратор читается из вложенного supervisor.teacher', () => {
  expect(resolveCellContent(column('supervisor', 'supervisor'), group()))
    .toEqual({ text: 'Иванов Иван Иванович' })
})

test('группа без куратора показывает дефис', () => {
  expect(resolveCellContent(column('supervisor', 'supervisor'), group({ supervisor: null }))).toBeNull()
  expect(resolveCellContent(column('supervisor', 'supervisor'), group({ supervisor: {} }))).toBeNull()
})
