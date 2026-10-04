import { validatePracticeContract, PRACTICE_TYPES } from './practiceContract'

const valid = {
  contractDay: '01',
  contractMonth: 'сентября',
  contractYear: '2025',
  contractNumber: '38',
  practiceType: 'учебной',
  groupId: '1',
  studentIds: ['1'],
  periodFrom: '02.09.2025',
  periodTo: '31.12.2025',
  contractEndDate: '31.12.2025',
}

test('заполненный договор проходит валидацию', () => {
  expect(validatePracticeContract(valid)).toBeNull()
})

test('пустое обязательное поле не проходит', () => {
  expect(validatePracticeContract({ ...valid, contractNumber: '' })).toBeTruthy()
})

test('без выбранных студентов не проходит', () => {
  expect(validatePracticeContract({ ...valid, studentIds: [] })).toBeTruthy()
})

test('пустой вид практики не проходит: шаблон верстает блок по его длине', () => {
  expect(validatePracticeContract({ ...valid, practiceType: '' })).toBeTruthy()
})

test('число договора вне диапазона 1–31 не проходит', () => {
  expect(validatePracticeContract({ ...valid, contractDay: '45' })).toBeTruthy()
  expect(validatePracticeContract({ ...valid, contractDay: '0' })).toBeTruthy()
  expect(validatePracticeContract({ ...valid, contractDay: '31' })).toBeNull()
})

test('нечисловое число договора не проходит', () => {
  expect(validatePracticeContract({ ...valid, contractDay: 'abc' })).toBeTruthy()
})

test('год вне диапазона 2000–2100 не проходит', () => {
  expect(validatePracticeContract({ ...valid, contractYear: '1999' })).toBeTruthy()
  expect(validatePracticeContract({ ...valid, contractYear: '2101' })).toBeTruthy()
  expect(validatePracticeContract({ ...valid, contractYear: '2025' })).toBeNull()
})

test('список видов практики совпадает с ожидаемым', () => {
  expect(PRACTICE_TYPES).toEqual(['учебной', 'производственной', 'преддипломной'])
})
