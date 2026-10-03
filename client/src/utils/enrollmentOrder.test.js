import { validateEnrollmentGroups, buildEnrollmentGroupsPayload } from './enrollmentOrder'

const STUDENTS = [
  { id: 1, last_name: 'Иванов', name: 'Иван', father_name: 'Иванович' },
  { id: 2, last_name: 'Петров', name: 'Пётр', father_name: '' },
  { id: 3, last_name: 'Сидоров', name: 'Сидор', father_name: 'Сидорович' },
]

const getGroupStudents = () => STUDENTS
const getGroupInfo = () => ({ group: { group_number: '12-34' }, specialty: { name: 'Программирование' } })

test('группа без выбранных студентов не проходит валидацию', () => {
  const groups = [{ groupId: '1', selectedStudentIds: [] }]
  expect(validateEnrollmentGroups(groups, getGroupStudents)).toMatch(/студент/i)
})

test('незаполненная группа не проходит валидацию', () => {
  const groups = [{ groupId: '', selectedStudentIds: ['1'] }]
  expect(validateEnrollmentGroups(groups, getGroupStudents)).toMatch(/группу/i)
})

test('группа без студентов не проходит валидацию', () => {
  const groups = [{ groupId: '1', selectedStudentIds: ['1'] }]
  expect(validateEnrollmentGroups(groups, () => [])).toMatch(/нет студентов/i)
})

test('корректный набор групп проходит валидацию', () => {
  const groups = [{ groupId: '1', selectedStudentIds: ['1', '3'] }]
  expect(validateEnrollmentGroups(groups, getGroupStudents)).toBeNull()
})

test('в приказ попадают только выбранные студенты', () => {
  const groups = [{ groupId: '1', selectedStudentIds: ['3'] }]
  const [payload] = buildEnrollmentGroupsPayload(groups, { getGroupStudents, getGroupInfo })
  expect(payload.students).toEqual([
    { lastName: 'Сидоров', firstName: 'Сидор', fatherName: 'Сидорович' },
  ])
})

test('пустой выбор не превращается в зачисление всей группы', () => {
  const groups = [{ groupId: '1', selectedStudentIds: [] }]
  const [payload] = buildEnrollmentGroupsPayload(groups, { getGroupStudents, getGroupInfo })
  expect(payload.students).toEqual([])
})

test('в payload группы попадают номер группы и специальность', () => {
  const groups = [{ groupId: '1', selectedStudentIds: ['1'] }]
  const [payload] = buildEnrollmentGroupsPayload(groups, { getGroupStudents, getGroupInfo })
  expect(payload.groupNumber).toBe('12-34')
  expect(payload.specialtyName).toBe('Программирование')
})
