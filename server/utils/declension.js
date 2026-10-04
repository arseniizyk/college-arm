const petrovich = require('petrovich');

const MALE_NAME_EXCEPTIONS = new Set([
    'илья', 'никита', 'данила', 'данил', 'лёва', 'лева', 'кузьма', 'лука', 'фома', 'савва', 'юноша'
]);

/**
 * Определяет пол по отчеству или имени (при отсутствии отчества)
 */
function detectGender(middleName, firstName = '') {
    if (middleName) {
        const lowerMiddle = middleName.trim().toLowerCase();
        if (lowerMiddle.endsWith('овна') || lowerMiddle.endsWith('евна') || lowerMiddle.endsWith('ична') || lowerMiddle.endsWith('инична')) {
            return 'female';
        }
        if (lowerMiddle.endsWith('ович') || lowerMiddle.endsWith('евич') || lowerMiddle.endsWith('ич')) {
            return 'male';
        }
    }
    
    if (firstName) {
        const lowerFirst = firstName.trim().toLowerCase();
        if (MALE_NAME_EXCEPTIONS.has(lowerFirst)) {
            return 'male';
        }
        if (lowerFirst.endsWith('а') || lowerFirst.endsWith('я')) {
            return 'female';
        }
    }
    
    return 'male';
}

/**
 * Склоняет полное ФИО в дательный падеж
 * @param {string} lastName - Фамилия
 * @param {string} firstName - Имя
 * @param {string} middleName - Отчество
 * @returns {object} Объект с склоненными ФИО
 */
function declineFullName(lastName, firstName, middleName) {
    try {
        const gender = detectGender(middleName, firstName);
        const result = petrovich({
            gender,
            last: lastName,
            first: firstName,
            middle: middleName || ''
        }, 'dative');
        
        return {
            lastName: result.last,
            firstName: result.first,
            middleName: result.middle,
            fullName: `${result.last} ${result.first} ${result.middle}`.trim()
        };
    } catch (error) {
        console.error('Ошибка склонения ФИО:', error);
        return {
            lastName: lastName,
            firstName: firstName,
            middleName: middleName || '',
            fullName: `${lastName} ${firstName} ${middleName || ''}`.trim()
        };
    }
}

/**
 * Склоняет полное ФИО в винительный падеж (кого? что?)
 * Например: Ведерникову Марию Олеговну
 */
function declineFullNameAccusative(lastName, firstName, middleName) {
    try {
        const gender = detectGender(middleName, firstName);
        const result = petrovich({
            gender,
            last: lastName,
            first: firstName,
            middle: middleName || ''
        }, 'accusative');
        
        return {
            lastName: result.last,
            firstName: result.first,
            middleName: result.middle,
            fullName: `${result.last} ${result.first} ${result.middle || ''}`.trim()
        };
    } catch (error) {
        console.error('Ошибка склонения ФИО в винительный падеж:', error);
        return {
            lastName: lastName,
            firstName: firstName,
            middleName: middleName || '',
            fullName: `${lastName} ${firstName} ${middleName || ''}`.trim()
        };
    }
}

module.exports = {
    detectGender,
    declineFullName,
    declineFullNameAccusative
};
