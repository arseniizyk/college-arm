/**
 * Утилиты форматирования дат для форм, календарей и шаблонов приказов.
 */

export const RU_MONTHS_GENITIVE = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

/**
 * Преобразует ISO дату (YYYY-MM-DD) или строку даты в точечный формат (DD.MM.YYYY).
 * Если дата уже в формате DD.MM.YYYY, возвращает её без изменений.
 */
export const formatDotDate = (dateVal) => {
    if (!dateVal) return '';
    const str = String(dateVal).trim();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
        return str;
    }
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day}.${month}.${year}`;
    }
    return str;
};

/**
 * Преобразует дату формата DD.MM.YYYY или Date в ISO формат (YYYY-MM-DD) для <input type="date">.
 */
export const toIsoDate = (dateVal) => {
    if (!dateVal) return '';
    const str = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    const dotMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dotMatch) {
        const [, day, month, year] = dotMatch;
        return `${year}-${month}-${day}`;
    }
    const ruMatch = str.match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
    if (ruMatch) {
        const [, day, monthName, year] = ruMatch;
        const monthIdx = RU_MONTHS_GENITIVE.indexOf(monthName.toLowerCase());
        if (monthIdx !== -1) {
            const padMonth = String(monthIdx + 1).padStart(2, '0');
            const padDay = String(parseInt(day, 10)).padStart(2, '0');
            return `${year}-${padMonth}-${padDay}`;
        }
    }
    return '';
};

/**
 * Преобразует дату (ISO YYYY-MM-DD или DD.MM.YYYY) в текстовое представление на русском.
 * Пример: '2026-01-30' -> '30 января 2026' (или '30 января 2026 г.')
 */
export const formatRuDate = (dateVal, withYearSuffix = false) => {
    if (!dateVal) return '';
    const str = String(dateVal).trim();

    let day, monthNum, year;

    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        [, year, monthNum, day] = isoMatch;
    } else {
        const dotMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (dotMatch) {
            [, day, monthNum, year] = dotMatch;
        } else {
            return str;
        }
    }

    const monthIndex = parseInt(monthNum, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return str;

    const cleanDay = parseInt(day, 10);
    const monthName = RU_MONTHS_GENITIVE[monthIndex];
    const suffix = withYearSuffix ? ' г.' : '';

    return `${cleanDay} ${monthName} ${year}${suffix}`;
};

/**
 * Извлекает компоненты даты { day, month, year } для договора на практику.
 * Пример: '2026-01-30' -> { contractDay: '30', contractMonth: 'января', contractYear: '2026' }
 */
export const splitDateToContractParts = (dateVal) => {
    if (!dateVal) return null;
    const str = String(dateVal).trim();

    let day, monthNum, year;

    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        [, year, monthNum, day] = isoMatch;
    } else {
        const dotMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (dotMatch) {
            [, day, monthNum, year] = dotMatch;
        } else {
            const ruMatch = str.match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
            if (ruMatch) {
                const [, ruDay, monthName, ruYear] = ruMatch;
                const monthIdx = RU_MONTHS_GENITIVE.indexOf(monthName.toLowerCase());
                if (monthIdx !== -1) {
                    return {
                        contractDay: String(parseInt(ruDay, 10)),
                        contractMonth: RU_MONTHS_GENITIVE[monthIdx],
                        contractYear: String(ruYear)
                    };
                }
            }
            return null;
        }
    }

    const monthIndex = parseInt(monthNum, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return null;

    return {
        contractDay: String(parseInt(day, 10)),
        contractMonth: RU_MONTHS_GENITIVE[monthIndex],
        contractYear: String(year)
    };
};
