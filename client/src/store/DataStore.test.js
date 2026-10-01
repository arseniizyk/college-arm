jest.mock('../http', () => ({
  $host: { get: jest.fn(), post: jest.fn() },
  $authHost: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

import DataStore from './DataStore'
import { $authHost } from '../http'

const ok = (data) => ({ data })

describe('обновление записи пересоздаёт массив', () => {
  let store

  beforeEach(() => {
    jest.clearAllMocks()
    store = new DataStore()
    store._entities.requests = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'pending' }
    ]
  })

  // Регрессия: элемент заменялся мутацией по индексу, ссылка на массив
  // оставалась прежней, и useMemo в списке заявок возвращал устаревшие
  // объекты — статус менялся только после перезагрузки страницы
  test('updateLocal меняет ссылку на массив', () => {
    const before = store.requests

    store.updateLocal('requests', 1, { status: 'completed' })

    expect(store.requests).not.toBe(before)
    expect(store.requests[0].status).toBe('completed')
    expect(store.requests[1].status).toBe('pending')
  })

  test('update применяет ответ сервера и тоже пересоздаёт массив', async () => {
    $authHost.put.mockResolvedValue(ok({ id: 1, status: 'completed' }))
    const before = store.requests

    await store.update('requests', 1, { status: 'completed' })

    expect(store.requests).not.toBe(before)
    expect(store.requests[0].status).toBe('completed')
  })

  test('смена статуса не меняет количество и порядок записей', () => {
    store.updateLocal('requests', 2, { status: 'cancelled' })

    expect(store.requests.map(r => r.id)).toEqual([1, 2])
  })

  test('неизвестный id не трогает массив', () => {
    const before = store.requests

    store.updateLocal('requests', 999, { status: 'completed' })

    expect(store.requests).toBe(before)
  })

  test('create тоже пересоздаёт массив, а не добавляет в прежний', async () => {
    $authHost.post.mockResolvedValue(ok({ id: 3, status: 'pending' }))
    const before = store.requests

    await store.create('requests', { status: 'pending' })

    expect(store.requests).not.toBe(before)
    expect(store.requests.map(r => r.id)).toEqual([1, 2, 3])
  })

  test('обновление студента синхронизирует _allStudents', () => {
    store._entities.students = [{ id: 5, last_name: 'Иванов' }]
    store._allStudents = [{ id: 5, last_name: 'Иванов' }]

    store.updateLocal('students', 5, { last_name: 'Петров' })

    expect(store._allStudents[0].last_name).toBe('Петров')
  })

  test('silent не поднимает флаг загрузки, обычный запрос поднимает', async () => {
    $authHost.put.mockResolvedValue(ok({ id: 1, status: 'completed' }))

    const seenDuringSilent = []
    $authHost.put.mockImplementation(() => {
      seenDuringSilent.push(store.isLoading('requests'))
      return Promise.resolve(ok({ id: 1, status: 'completed' }))
    })

    await store.update('requests', 1, { status: 'completed' }, { silent: true })
    expect(seenDuringSilent).toEqual([false])

    await store.update('requests', 1, { status: 'completed' })
    expect(seenDuringSilent).toEqual([false, true])
  })
})