import { canSelectMultipleStudents } from './consts'

test('USER выбирает только одного студента', () => {
  expect(canSelectMultipleStudents('USER')).toBe(false)
})

test('ADMIN и TEACHER могут выбрать нескольких', () => {
  expect(canSelectMultipleStudents('ADMIN')).toBe(true)
  expect(canSelectMultipleStudents('TEACHER')).toBe(true)
})

test('неизвестная роль ограничивается одним студентом', () => {
  expect(canSelectMultipleStudents('GUEST')).toBe(false)
  expect(canSelectMultipleStudents(undefined)).toBe(false)
})