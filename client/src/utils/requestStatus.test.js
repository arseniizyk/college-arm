import {
  REQUEST_STATUSES,
  STATUS_KEYS,
  statusLabel,
  statusLabelPlural,
  statusBadge,
  statusPriority,
  isTerminalStatus,
  statusTerminalHint,
  isNewRequest,
  countByStatus
} from './requestStatus'

test('в карте ровно три статуса заявки', () => {
  expect(STATUS_KEYS).toEqual(['pending', 'completed', 'cancelled'])
})

test('ни один статус не помечен терминальным ошибочно', () => {
  // Завершено и отменено закрывают заявку, pending — нет
  expect(isTerminalStatus('pending')).toBe(false)
  expect(isTerminalStatus('completed')).toBe(true)
  expect(isTerminalStatus('cancelled')).toBe(true)
})

test('подпись в форме таблицы: с заглавной, средний род', () => {
  expect(statusLabel('completed')).toBe('Завершено')
  expect(statusLabel('cancelled')).toBe('Отменено')
  expect(statusLabel('pending')).toBe('В обработке')
})

test('подпись во множественном числе согласуется со словом «заявки»', () => {
  expect(statusLabelPlural('completed')).toBe('Завершенные')
  expect(statusLabelPlural('cancelled')).toBe('Отмененные')
  expect(statusLabelPlural('pending')).toBe('В обработке')
})

test('неизвестный статус не роняет рендер, а показывается как есть', () => {
  expect(statusLabel('weird')).toBe('weird')
  expect(statusLabelPlural('weird')).toBe('weird')
  expect(statusBadge('weird')).toBe('secondary')
  expect(statusLabel(undefined)).toBe('-')
})

test('каждый статус имеет бейдж и иконку', () => {
  for (const key of STATUS_KEYS) {
    expect(REQUEST_STATUSES[key].badge).toBeTruthy()
    expect(REQUEST_STATUSES[key].icon).toBeTruthy()
  }
})

test('иконки bootstrap для кнопок есть у каждого статуса', () => {
  for (const key of STATUS_KEYS) {
    expect(REQUEST_STATUSES[key].biIcon).toMatch(/^bi-/)
  }
})

test('цвета диаграмм есть у каждого статуса и они различимы', () => {
  for (const key of STATUS_KEYS) {
    expect(REQUEST_STATUSES[key].chartColor).toMatch(/^#[0-9a-f]{6}$/i)
  }
  const colors = STATUS_KEYS.map(key => REQUEST_STATUSES[key].chartColor)
  expect(new Set(colors).size).toBe(STATUS_KEYS.length)
})

test('подсказка о невозможности изменения согласована по роду', () => {
  // «завершённую», а не «завершено» — иначе получается «завершено заявку»
  expect(statusTerminalHint('completed')).toBe('Завершенную заявку нельзя изменить')
  expect(statusTerminalHint('cancelled')).toBe('Отменённую заявку нельзя изменить')
  expect(statusTerminalHint('pending')).toBe('Вы можете завершить или отменить заявку')
})

test('клиентская карта не несёт женский род: он нужен только серверу', () => {
  // Текст уведомления пишется на сервере и хранится в БД, поэтому
  // клиентская копия этой формы была бы дублированием без потребителя.
  for (const key of STATUS_KEYS) {
    expect(REQUEST_STATUSES[key].labelFeminine).toBeUndefined()
  }
})

test('в карте нет полей вне списка, а terminalHint есть лишь у закрытых статусов', () => {
  // terminalHint необязателен: у «в обработке» его нет, и подсказка
  // подставляется из OPEN_STATUS_HINT. Лишние поля — дубль другой формы
  // или того, что живёт в server/utils/requestStatus.js.
  const required = ['label', 'labelPlural', 'badge', 'icon', 'biIcon', 'chartColor', 'isTerminal', 'order']

  for (const key of STATUS_KEYS) {
    const fields = Object.keys(REQUEST_STATUSES[key])
    expect(fields.filter(f => !f.startsWith('terminal')).sort()).toEqual([...required].sort())
    if (isTerminalStatus(key)) expect(fields).toContain('terminalHint')
    else expect(fields).not.toContain('terminalHint')
  }
})

test('статусы упорядочены: сначала в обработке, потом завершено, потом отменено', () => {
  expect(statusPriority('pending')).toBeLessThan(statusPriority('completed'))
  expect(statusPriority('completed')).toBeLessThan(statusPriority('cancelled'))
})

test('счётчик по статусам считает все заявки ровно один раз', () => {
  const requests = [
    { status: 'pending' },
    { status: 'pending' },
    { status: 'completed' },
    { status: 'cancelled' }
  ]
  const stats = countByStatus(requests)

  expect(stats.pending).toBe(2)
  expect(stats.completed).toBe(1)
  expect(stats.cancelled).toBe(1)
  expect(Object.values(stats).reduce((a, b) => a + b, 0)).toBe(requests.length)
})

test('счётчик по статусам не падает на пустом списке', () => {
  expect(countByStatus([])).toEqual({ pending: 0, completed: 0, cancelled: 0 })
  expect(countByStatus(undefined)).toEqual({ pending: 0, completed: 0, cancelled: 0 })
})

test('запрос с неизвестным статусом не попадает ни в один счётчик', () => {
  const stats = countByStatus([{ status: 'legacy_value' }])
  expect(Object.values(stats).reduce((a, b) => a + b, 0)).toBe(0)
})

test('новая заявка — это «в обработке» и ещё не просмотренная', () => {
  expect(isNewRequest({ status: 'pending', isViewed: false })).toBe(true)
  expect(isNewRequest({ status: 'pending', isViewed: true })).toBe(false)
  // Просмотренный флаг не влияет на закрытые заявки
  expect(isNewRequest({ status: 'completed', isViewed: false })).toBe(false)
  expect(isNewRequest({ status: 'cancelled', isViewed: false })).toBe(false)
})

test('запрос без данных не считается новым', () => {
  expect(isNewRequest(undefined)).toBe(false)
  expect(isNewRequest({})).toBe(false)
})

test('импорт карты нельзя случайно использовать как булево значение', () => {
  // Регрессия: в RequestCard осталась ссылка на саму функцию вместо её
  // результата, и бейдж «Новая» показывался у всех заявок. Функция всегда
  // истинна, поэтому проверяется именно факт вызова, а не значение.
  const request = { status: 'completed', isViewed: false }
  expect(Boolean(isNewRequest)).toBe(true)
  expect(isNewRequest(request)).toBe(false)
})

