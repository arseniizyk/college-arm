// Утилита для склонения ФИО в дательный падеж с использованием библиотеки petrovich
const petrovich = require('petrovich');

/**
 * Определяет пол по отчеству
 */
function detectGender(middleName) {
    if (!middleName) return 'male'; // По умолчанию мужской
    
    const lower = middleName.toLowerCase();
    
    if (lower.endsWith('овна') || lower.endsWith('евна') || lower.endsWith('ична')) {
        return 'female';
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
        const gender = detectGender(middleName);
        const result = petrovich({
            last: lastName,
            first: firstName,
            middle: middleName || ''
        }, 'dative', gender);
        
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
        const gender = detectGender(middleName);
        const result = petrovich({
            last: lastName,
            first: firstName,
            middle: middleName || ''
        }, 'accusative', gender);
        
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

/**
 * Склоняет фамилию в дательный падеж
 */
function declineLastName(lastName, gender = 'male') {
    try {
        const result = petrovich({
            last: lastName,
            first: '',
            middle: ''
        }, 'dative', gender);
        
        return result.last;
    } catch (error) {
        console.error('Ошибка склонения фамилии:', error);
        return lastName;
    }
}

/**
 * Склоняет имя в дательный падеж
 */
function declineFirstName(firstName, gender = 'male') {
    try {
        const result = petrovich({
            last: '',
            first: firstName,
            middle: ''
        }, 'dative', gender);
        
        return result.first;
    } catch (error) {
        console.error('Ошибка склонения имени:', error);
        return firstName;
    }
}

/**
 * Склоняет отчество в дательный падеж
 */
function declineMiddleName(middleName, gender = 'male') {
    try {
        const result = petrovich({
            last: '',
            first: '',
            middle: middleName
        }, 'dative', gender);
        
        return result.middle;
    } catch (error) {
        console.error('Ошибка склонения отчества:', error);
        return middleName;
    }
}

module.exports = {
    declineLastName,
    declineFirstName,
    declineMiddleName,
    detectGender,
    declineFullName,
    declineFullNameAccusative
};
