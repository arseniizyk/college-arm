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

describe('DataStore', () => {
  let store

  beforeEach(() => {
    jest.clearAllMocks()
    store = new DataStore()
    store._entities.users = [
      { id: 1, email: 'admin@test.ru', role: 'ADMIN' },
      { id: 2, email: 'director@test.ru', role: 'ADMIN' }
    ]
  })

  test('updateLocal меняет ссылку на массив', () => {
    const before = store.users

    store.updateLocal('users', 1, { email: 'newadmin@test.ru' })

    expect(store.users).not.toBe(before)
    expect(store.users[0].email).toBe('newadmin@test.ru')
    expect(store.users[1].email).toBe('director@test.ru')
  })

  test('update применяет ответ сервера и тоже пересоздаёт массив', async () => {
    $authHost.put.mockResolvedValue(ok({ id: 1, email: 'updated@test.ru', role: 'ADMIN' }))
    const before = store.users

    await store.update('users', 1, { email: 'updated@test.ru' })

    expect(store.users).not.toBe(before)
    expect(store.users[0].email).toBe('updated@test.ru')
  })

  test('смена поля не меняет количество и порядок записей', () => {
    store.updateLocal('users', 2, { email: 'dir_changed@test.ru' })

    expect(store.users.map(u => u.id)).toEqual([1, 2])
  })

  test('неизвестный id не трогает массив', () => {
    const before = store.users

    store.updateLocal('users', 999, { email: 'unknown@test.ru' })

    expect(store.users).toBe(before)
  })

  test('create тоже пересоздаёт массив, а не добавляет в прежний', async () => {
    $authHost.post.mockResolvedValue(ok({ id: 3, email: 'third@test.ru', role: 'ADMIN' }))
    const before = store.users

    await store.create('users', { email: 'third@test.ru' })

    expect(store.users).not.toBe(before)
    expect(store.users.map(u => u.id)).toEqual([1, 2, 3])
  })

  test('обновление студента синхронизирует _allStudents', () => {
    store._entities.students = [{ id: 5, last_name: 'Иванов' }]
    store._allStudents = [{ id: 5, last_name: 'Иванов' }]

    store.updateLocal('students', 5, { last_name: 'Петров' })

    expect(store._allStudents[0].last_name).toBe('Петров')
  })

  test('silent не поднимает флаг загрузки, обычный запрос поднимает', async () => {
    $authHost.put.mockResolvedValue(ok({ id: 1, email: 'admin@test.ru', role: 'ADMIN' }))

    const seenDuringSilent = []
    $authHost.put.mockImplementation(() => {
      seenDuringSilent.push(store.isLoading('users'))
      return Promise.resolve(ok({ id: 1, email: 'admin@test.ru', role: 'ADMIN' }))
    })

    await store.update('users', 1, { email: 'admin@test.ru' }, { silent: true })
    expect(seenDuringSilent).toEqual([false])

    await store.update('users', 1, { email: 'admin@test.ru' })
    expect(seenDuringSilent).toEqual([false, true])
  })

  test('delete удаляет запись из сущности', async () => {
    $authHost.delete.mockResolvedValue(ok({ success: true }))

    await store.delete('users', 1)

    expect(store.users.map(u => u.id)).toEqual([2])
  })

  test('reset очищает все сущности', () => {
    store._entities.users = [{ id: 1 }]
    store._entities.students = [{ id: 2 }]
    store._allStudents = [{ id: 2 }]

    store.reset()

    expect(store.users).toEqual([])
    expect(store.students).toEqual([])
    expect(store.allStudents).toEqual([])
  })
})
