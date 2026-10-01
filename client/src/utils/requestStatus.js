export const REQUEST_STATUSES = {
  pending: {
    label: 'В обработке',
    labelPlural: 'В обработке',
    badge: 'info',
    icon: 'fa-spinner',
    biIcon: 'bi-arrow-repeat',
    chartColor: '#0dcaf0',
    isTerminal: false,
    order: 1
  },
  completed: {
    label: 'Завершено',
    labelPlural: 'Завершенные',
    badge: 'success',
    icon: 'fa-check-circle',
    biIcon: 'bi-check-lg',
    chartColor: '#198754',
    terminalHint: 'Завершенную заявку нельзя изменить',
    isTerminal: true,
    order: 2
  },
  cancelled: {
    label: 'Отменено',
    labelPlural: 'Отмененные',
    badge: 'danger',
    icon: 'fa-times-circle',
    biIcon: 'bi-x-lg',
    chartColor: '#dc3545',
    terminalHint: 'Отменённую заявку нельзя изменить',
    isTerminal: true,
    order: 3
  }
}

export const STATUS_KEYS = Object.keys(REQUEST_STATUSES)

const EMPTY_LABEL = '-'

const pick = (status, field) => REQUEST_STATUSES[status]?.[field]

export const statusLabel = (status) => pick(status, 'label') ?? status ?? EMPTY_LABEL
export const statusLabelPlural = (status) => pick(status, 'labelPlural') ?? status ?? EMPTY_LABEL
export const statusBadge = (status) => pick(status, 'badge') ?? 'secondary'
export const isTerminalStatus = (status) => pick(status, 'isTerminal') === true

export const isNewRequest = (request) =>
  Boolean(request) && request.status === 'pending' && !request.isViewed

const OPEN_STATUS_HINT = 'Вы можете завершить или отменить заявку'

export const statusTerminalHint = (status) =>
  pick(status, 'terminalHint') ?? OPEN_STATUS_HINT

export const statusPriority = (status) => pick(status, 'order') ?? STATUS_KEYS.length + 1

export const statusOptions = () =>
  STATUS_KEYS.map(value => ({ value, label: statusLabel(value) }))

export const countByStatus = (requests) => {
  const stats = {}
  for (const key of STATUS_KEYS) stats[key] = 0

  for (const req of requests || []) {
    if (Object.prototype.hasOwnProperty.call(stats, req.status)) {
      stats[req.status]++
    }
  }
  return stats
}
