import fs from 'fs'
import path from 'path'

import { ORDER_DOC_TYPES, orderUrl, practiceContractUrl, studyCertificateUrl } from './consts'

// DocumentsGeneration импортировать нельзя: он тянет за собой axios, MobX и
// все модалки, поэтому проверяем его как исходник — по тексту файла.
// Это ровно тот случай, ради которого в проекте нет тестов компонентов.

// Пути генерации документов — контракт с сервером.
// Сервер отдаёт приказы по POST /api/generate/admin/orders/:docType,
// договор практики — по отдельному маршруту: /api/generate/admin/practice-contract,
// а справку об обучении — по /api/generate/study-certificate.

test('docType приказа попадает в путь без изменений', () => {
  expect(orderUrl('release')).toBe('/api/generate/admin/orders/release')
  expect(orderUrl('student-direction')).toBe('/api/generate/admin/orders/student-direction')
})

test('у договора практики отдельный путь', () => {
  expect(practiceContractUrl()).toBe('/api/generate/admin/practice-contract')
})

test('у справки об обучении отдельный путь', () => {
  expect(studyCertificateUrl()).toBe('/api/generate/study-certificate')
})

test('список типов приказов совпадает с реестром сервера', () => {
  expect(ORDER_DOC_TYPES.sort()).toEqual([
    'duplicate-ticket',
    'enrollment',
    'exam-admission',
    'health',
    'holidays',
    'release',
    'snow-cleaning',
    'stipend',
    'student-direction',
    'transfer',
  ])
})

test('уникальных типов ровно столько же, сколько всего', () => {
  expect(new Set(ORDER_DOC_TYPES).size).toBe(ORDER_DOC_TYPES.length)
})

test('в типах приказов нет договора практики и справки об обучении', () => {
  expect(ORDER_DOC_TYPES).not.toContain('practice-contract')
  expect(ORDER_DOC_TYPES).not.toContain('study-certificate')
})

const documentsGeneration = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'DocumentsGeneration.jsx'),
  'utf8'
)

const cardIds = [
  ...documentsGeneration.matchAll(/\{\s*id:\s*'([a-z-]+)',\s*(?:icon|title):/g),
]
  .map((m) => m[1])
  .filter((id) => id !== 'orders' && id !== 'contracts' && id !== 'certificates')
const orderIds = cardIds.filter((id) => id !== 'practice-contract' && id !== 'study-certificate')

test('id карточек приказов совпадают с типами для сервера', () => {
  expect(orderIds.sort()).toEqual([...ORDER_DOC_TYPES].sort())
})

test('handleGenerate открывает модалку для каждой карточки', () => {
  const handleGenerate = documentsGeneration.slice(
    documentsGeneration.indexOf('const handleGenerate')
  ).split('};')[0]

  for (const id of cardIds) {
    expect(handleGenerate).toContain(`'${id}'`)
  }
})

test('handleGenerate не ссылается на несуществующие карточки', () => {
  const handleGenerate = documentsGeneration.slice(
    documentsGeneration.indexOf('const handleGenerate')
  ).split('};')[0]

  const referenced = [...handleGenerate.matchAll(/docId === '([a-z-]+)'/g)].map((m) => m[1])

  for (const id of referenced) {
    expect(cardIds).toContain(id)
  }
})

test('в компоненте не осталось прежних id вроде subbotnik_order', () => {
  expect(documentsGeneration).not.toMatch(/'(subbotnik|direction|duplicate|exam|release)_order'/)
})
