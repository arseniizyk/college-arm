import { prepareFormData, toGroupFormData } from './dataHelpers'

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
