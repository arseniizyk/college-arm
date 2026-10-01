import { formatNotificationDate } from '../components/NotificationItem'

// Даты собираются локальным конструктором, а не из ISO: toLocaleDateString
// зависит от TZ процесса, и тест иначе падает в другом часовом поясе.
// now передаётся в функцию, иначе результат зависит от момента прогона.
const now = new Date(2025, 9, 1, 12, 0, 0)
const ago = (ms) => formatNotificationDate(new Date(now.getTime() - ms), now)

test('меньше минуты — «только что»', () => {
  expect(ago(30 * 1000)).toBe('только что')
})

test('минуты склоняются по числу', () => {
  expect(ago(5 * 60 * 1000)).toBe('5 мин. назад')
  expect(ago(59 * 60 * 1000)).toBe('59 мин. назад')
})

test('до суток считаются часами', () => {
  expect(ago(60 * 60 * 1000)).toBe('1 ч. назад')
  expect(ago(23 * 3600 * 1000)).toBe('23 ч. назад')
})

test('до недели считаются днями', () => {
  expect(ago(24 * 3600 * 1000)).toBe('1 дн. назад')
  expect(ago(6 * 24 * 3600 * 1000)).toBe('6 дн. назад')
})

test('старше недели — календарная дата', () => {
  expect(ago(8 * 24 * 3600 * 1000)).toBe('23.09.2025')
})
