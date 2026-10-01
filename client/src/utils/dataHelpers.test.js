import { prepareFormData } from './dataHelpers'

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

test('для остальных вкладок studentIds не трогается', () => {
  expect(prepareFormData({ studentIds: '7' }, 'students').studentIds).toBe('7')
})

test('userId приводится к числу или null', () => {
  expect(prepareFormData({ userId: '4' }, 'students').userId).toBe(4)
  expect(prepareFormData({ userId: '' }, 'teachers').userId).toBeNull()
})