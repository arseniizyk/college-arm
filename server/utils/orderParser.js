/**
 * Парсит номер приказа для извлечения даты и номера
 * @param {string} orderString - Строка с номером приказа (например, "№ 190/4-3 от 05.08.2025")
 * @returns {Object} - Объект с датой, номером и строкой даты
 */
const parseOrderNumber = (orderString) => {
    if (!orderString) return { date: null, number: orderString, dateStr: null };
    
    // Убираем "№" в начале если есть
    let cleaned = orderString.replace(/^№\s*/, '').trim();
    
    // Ищем паттерн "от ДД.ММ.ГГГГ"
    const dateMatch = cleaned.match(/от\s+(\d{2}\.\d{2}\.\d{4})/);
    
    if (dateMatch) {
        const dateStr = dateMatch[1]; // 05.08.2025
        const number = cleaned.replace(/\s+от\s+\d{2}\.\d{2}\.\d{4}/, '').trim(); // 190/4-3
        
        // Парсим дату
        const [day, month, year] = dateStr.split('.');
        const date = new Date(year, month - 1, day);
        
        return { date, number, dateStr };
    }
    
    // Если даты нет в строке, возвращаем как есть
    return { date: null, number: cleaned, dateStr: null };
};

module.exports = {
    parseOrderNumber
};
