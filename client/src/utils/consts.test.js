import { orderUrl, practiceContractUrl, studyCertificateUrl, ORDER_DOC_TYPES } from './consts'

test('orderUrl формирует корректный путь для приказа', () => {
  expect(orderUrl('release')).toBe('/api/generate/admin/orders/release')
})

test('practiceContractUrl формирует корректный путь для договора практики', () => {
  expect(practiceContractUrl()).toBe('/api/generate/admin/practice-contract')
})

test('studyCertificateUrl формирует корректный путь для выписки справки об обучении', () => {
  expect(studyCertificateUrl()).toBe('/api/generate/study-certificate')
})

test('реестр ORDER_DOC_TYPES содержит 10 типов приказов', () => {
  expect(ORDER_DOC_TYPES.length).toBe(10)
})
