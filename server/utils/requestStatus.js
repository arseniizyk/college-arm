const STATUS_LABELS = {
    pending: 'в обработке',
    completed: 'завершена',
    cancelled: 'отменена'
}

const statusLabelFeminine = (status) => STATUS_LABELS[status] ?? status

const isKnownStatus = (status) =>
    Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)

module.exports = {
    statusLabelFeminine,
    isKnownStatus
}
