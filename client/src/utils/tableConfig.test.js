import { getFieldsConfig } from './tableConfig'

const groupField = (modalType, name) => {
  const fields = getFieldsConfig('ADMIN', () => [], modalType).groups
  return fields.find(field => field.name === name)
}

test('преподаватель обязателен при создании группы', () => {
  expect(groupField('create', 'teacherId').required).toBe(true)
})

test('преподаватель не обязателен при правке группы — пустое значение снимает куратора', () => {
  expect(groupField('edit', 'teacherId').required).toBe(false)
})

test('остальные поля группы от типа формы не зависят', () => {
  const names = ['group_number', 'specialtyId', 'enroll_date', 'payment_type']
  names.forEach(name => {
    expect(groupField('create', name).required).toBe(groupField('edit', name).required)
  })
})
