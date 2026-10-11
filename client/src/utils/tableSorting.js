import { calculateCourse } from './dataHelpers';
import { statusLabel } from './requestStatus';

const isDateKey = (key) => key.toLowerCase().includes('date') || key === 'createdAt';

/**
 * Получает нормализованное значение для сравнения при сортировке таблицы
 */
export const getSortValue = (item, columnKey, tableType, getNameById) => {
    if (!item) return '';

    // Первичный ключ — сортируем как число
    if (columnKey === 'id') {
        const num = Number(item.id);
        return isNaN(num) ? 0 : num;
    }

    // Внешние ключи (ссылочные сущности)
    if (getNameById && (columnKey === 'groupId' || columnKey === 'specialtyId' || columnKey === 'documentId' || columnKey === 'userId')) {
        const resolved = getNameById(columnKey, item[columnKey]);
        if (resolved && resolved !== '-') return resolved;
    }

    // Куратор (в группе)
    if (columnKey === 'supervisor') {
        const teacher = item?.supervisor?.teacher;
        if (teacher) {
            return [teacher.last_name, teacher.name, teacher.father_name].filter(Boolean).join(' ');
        }
        return '';
    }

    // Студенты (в заявке)
    if (columnKey === 'students') {
        if (Array.isArray(item.students) && item.students.length > 0) {
            const first = item.students[0];
            return [first.last_name, first.name, first.father_name].filter(Boolean).join(' ');
        }
        return '';
    }

    // Длительность обучения (в специальности)
    if (columnKey === 'duration') {
        return (Number(item.duration_years) || 0) * 12 + (Number(item.duration_months) || 0);
    }

    // Курс (в группе)
    if (columnKey === 'course') {
        if (!item.enroll_date) return 0;
        const specialty = item.specialty;
        const course = calculateCourse(
            item.enroll_date,
            specialty?.duration_years || 4,
            specialty?.duration_months || 0
        );
        return course === 'Выпускник' ? 999 : Number(course) || 0;
    }

    // Статус заявки
    if (columnKey === 'status') {
        return statusLabel(item.status);
    }

    // Даты
    if (isDateKey(columnKey)) {
        if (!item[columnKey]) return null;
        const time = new Date(item[columnKey]).getTime();
        return isNaN(time) ? null : time;
    }

    // Числа
    if (typeof item[columnKey] === 'number') {
        return item[columnKey];
    }

    return item[columnKey] !== undefined && item[columnKey] !== null ? String(item[columnKey]) : '';
};

/**
 * Универсальный компаратор двух значений с учетом направления сортировки
 */
export const compareValues = (valA, valB, direction = 'asc') => {
    const modifier = direction === 'desc' ? -1 : 1;

    // Пустые значения выносим в конец при сортировке по возрастанию
    const isEmptyA = valA === '' || valA === null || valA === undefined;
    const isEmptyB = valB === '' || valB === null || valB === undefined;

    if (isEmptyA && !isEmptyB) return 1;
    if (!isEmptyA && isEmptyB) return -1;
    if (isEmptyA && isEmptyB) return 0;

    if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * modifier;
    }

    return String(valA).localeCompare(String(valB), 'ru', { numeric: true, sensitivity: 'base' }) * modifier;
};

/**
 * Сортировка по умолчанию для каждого типа таблицы, когда пользовательская сортировка не задана
 */
export const defaultSort = (tableType, a, b) => {
    switch (tableType) {
        case 'students': {
            const aExpelled = Boolean(a.expell_date);
            const bExpelled = Boolean(b.expell_date);
            if (aExpelled !== bExpelled) {
                return aExpelled ? 1 : -1;
            }
            return (a.last_name || '').localeCompare(b.last_name || '', 'ru', { numeric: true });
        }
        case 'teachers':
            return (a.last_name || '').localeCompare(b.last_name || '', 'ru', { numeric: true });
        case 'users':
            return (Number(a.id) || 0) - (Number(b.id) || 0);
        case 'groups':
            return (a.group_number || '').localeCompare(b.group_number || '', 'ru', { numeric: true });
        case 'specialties':
        case 'documents':
            return (Number(a.id) || 0) - (Number(b.id) || 0);
        case 'requests':
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
            return 0;
    }
};

/**
 * Главная функция сортировки данных таблицы
 */
export const sortTableData = (items, sortConfig, tableType, getNameById) => {
    if (!Array.isArray(items)) return [];
    const copy = [...items];

    // Для специальностей и документов пользовательская сортировка отключена
    if (tableType === 'specialties' || tableType === 'documents' || !sortConfig || !sortConfig.key || !sortConfig.direction) {
        return copy.sort((a, b) => defaultSort(tableType, a, b));
    }

    const { key, direction } = sortConfig;
    return copy.sort((a, b) => {
        const valA = getSortValue(a, key, tableType, getNameById);
        const valB = getSortValue(b, key, tableType, getNameById);
        const result = compareValues(valA, valB, direction);
        if (result !== 0) return result;
        // Fallback к ID для детерминированности
        return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
};
