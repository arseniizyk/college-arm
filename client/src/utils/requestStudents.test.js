import { allowedStudentIds } from './requestStudents'

const STUDENTS = [
  { id: 1, groupId: 10, userId: null },
  { id: 2, groupId: 11, userId: null },
  { id: 3, groupId: 12, userId: 5 },
]

test('администратору доступны все студенты', () => {
  expect(allowedStudentIds(STUDENTS, { role: 'ADMIN' })).toBeNull()
})

test('куратору доступны студенты всех его групп', () => {
  expect(allowedStudentIds(STUDENTS, { role: 'TEACHER', supervisorGroupIds: [10, 11] })).toEqual([1, 2])
})

test('куратору одной группы не видно студентов других групп', () => {
  expect(allowedStudentIds(STUDENTS, { role: 'TEACHER', supervisorGroupIds: [11] })).toEqual([2])
})

test('куратор без групп не выбирает никого', () => {
  expect(allowedStudentIds(STUDENTS, { role: 'TEACHER', supervisorGroupIds: [] })).toEqual([])
  expect(allowedStudentIds(STUDENTS, { role: 'TEACHER' })).toEqual([])
})

test('студент видит только себя', () => {
  expect(allowedStudentIds(STUDENTS, { role: 'USER', userId: 5 })).toEqual([3])
})