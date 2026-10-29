import { calculateCourse, formatDuration, formatFio, MISSING_SPECIALTY_LABEL } from './dataHelpers'

const EMPTY_TEXT = '-'

const ROLE_BADGES = {
    ADMIN: { label: 'Администратор', variant: 'danger' },
    USER: { label: 'Пользователь', variant: 'primary' },
    TEACHER: { label: 'Преподаватель', variant: 'success' }
}

const DATE_LOCALE = 'ru-RU'
const MAX_TEXT_LENGTH = 50

const isEmpty = (value) => value === null || value === undefined || value === ''

// Дефис с пояснением в подсказке — для случаев, когда значение не вычислилось.
const dash = (title) => (title ? { text: EMPTY_TEXT, muted: true, title } : null)

const plainText = (value) => {
    const text = String(value)
    return text.length > MAX_TEXT_LENGTH
        ? { text: `${text.substring(0, MAX_TEXT_LENGTH)}...`, title: text }
        : { text }
}

// 'createdat' не содержит подстроки 'date', поэтому createdAt пришлось бы
// добавлять отдельно.
const isDateKey = (key) => key.toLowerCase().includes('date') || key === 'createdAt'

const formatDate = (value) => {
    try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
            return { text: date.toLocaleDateString(DATE_LOCALE) }
        }
    } catch {
        // Не дата — показываем как есть
    }
    return plainText(value)
}

const defaultRenderer = (column, item, ctx) => {
    if (isEmpty(ctx.value)) return dash()
    if (isDateKey(column.key)) return formatDate(ctx.value)
    if (typeof ctx.value === 'number') return { text: String(ctx.value) }
    return plainText(ctx.value)
}

export const RENDERERS = {
    // Порядковый номер с учётом пагинации приходит из контекста, а не из item.
    rowNumber: (column, item, ctx) => ({ text: String(ctx.rowNumber), muted: true }),

    // Ссылки на другие сущности: ctx.names подставляет название вместо id.
    reference: (column, item, ctx) => ({ text: ctx.names(column.key, ctx.value) }),

    role: (column, item, ctx) => {
        const badge = ROLE_BADGES[ctx.value]
        return badge
            ? { text: badge.label, variant: badge.variant }
            : { text: String(ctx.value) }
    },

    expellDate: (column, item, ctx) => {
        if (isEmpty(ctx.value)) return dash()
        const formatted = formatDate(ctx.value)
        const reason = item?.expell_reason ? `\nПричина: ${item.expell_reason}` : ''
        return {
            text: formatted.text,
            variant: 'danger',
            title: `Отчислен ${formatted.text}${reason}`
        }
    },

    // Курс считается по вложенной специальности, которой в строке группы нет.
    course: (column, item) => {
        if (!item?.enroll_date) return dash()

        const specialty = item.specialty
        // Без специальности срок обучения неизвестен.
        if (!specialty) return dash(MISSING_SPECIALTY_LABEL)

        const course = calculateCourse(
            item.enroll_date,
            specialty.duration_years || 4,
            specialty.duration_months || 0
        )

        return course === 'Выпускник'
            ? { text: course, variant: 'secondary' }
            : { text: `${course} курс`, variant: 'primary' }
    },

    // Длительность хранится двумя полями, в одной ячейке они склеиваются.
    duration: (column, item) => ({
        text: formatDuration(item?.duration_years, item?.duration_months || 0)
    }),

    supervisor: (column, item) => {
        const teacher = item?.supervisor?.teacher
        return teacher ? { text: formatFio(teacher) } : dash()
    }
}

/**
 * Содержимое ячейки по конфигурации колонки.
 * @param {{key: string, render?: string}} column
 * @param {object} item - плоская строка таблицы
 * @param {{names?: Function, rowNumber?: number}} context - то, что не берётся из item
 * @returns {{text: string, variant?: string, muted?: boolean, title?: string}|null}
 */
export const resolveCellContent = (column, item, context = {}) => {
    const ctx = { ...context, value: item?.[column.key] }
    const name = column.render

    // Опечатка в render означала бы молчаливый дефис вместо значения колонки.
    if (name && !Object.prototype.hasOwnProperty.call(RENDERERS, name)) {
        throw new Error(`Неизвестный render '${name}' у колонки '${column.key}'`)
    }

    return name ? RENDERERS[name](column, item, ctx) : defaultRenderer(column, item, ctx)
}
