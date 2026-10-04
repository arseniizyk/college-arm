// Учебный год начинается 1 сентября, поэтому месяцы сравниваются с индексом 8.
const ACADEMIC_YEAR_START_MONTH = 8;

const COURSE_WORDS = ['первого', 'второго', 'третьего', 'четвертого'];
const GRADUATE_WORD = 'выпускник';

const toDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Вычисляет учебный год для даты: с 1 сентября учебный год равен календарному,
 * до 1 сентября (январь–август) — предыдущему календарному году.
 * @param {Date} date
 * @returns {number}
 */
const getAcademicYear = (date) => (
    date.getMonth() >= ACADEMIC_YEAR_START_MONTH
        ? date.getFullYear()
        : date.getFullYear() - 1
);

/**
 * Номер курса, на котором группа учится сейчас.
 * Вычисляется по разнице учебных годов: смена курса всегда происходит
 * строго 1 сентября, вне зависимости от месяца зачисления (зима, весна или осень).
 * Невычислимый случай (нет даты зачисления, зачисление в будущем) даёт 1.
 * @param {Date|string} enrollDate - Дата зачисления группы
 * @param {number} durationYears - Длительность обучения в годах
 * @param {number} durationMonths - Длительность обучения в месяцах
 * @param {{now?: Date}} options - now подменяется в тестах
 * @returns {number}
 */
const calculateCourse = (enrollDate, durationYears, durationMonths = 0, { now = new Date() } = {}) => {
    const enroll = toDate(enrollDate);
    if (!enroll) return 1;

    const currentAcademicYear = getAcademicYear(now);
    const enrollAcademicYear = getAcademicYear(enroll);

    return Math.max(currentAcademicYear - enrollAcademicYear + 1, 1);
};

/**
 * Курс прописью в родительном падеже для справки об обучении.
 * Словарь рассчитан на срок 4 года; при более длинном сроке курс печатается цифрой.
 * @returns {string}
 */
const courseTextGenitive = (enrollDate, durationYears, durationMonths = 0, options = {}) => {
    const course = calculateCourse(enrollDate, durationYears, durationMonths, options);
    const maxCourse = durationYears + (durationMonths > 0 ? 1 : 0);

    if (course > maxCourse) return GRADUATE_WORD;
    return COURSE_WORDS[course - 1] || `${course}`;
};

module.exports = {
    calculateCourse,
    courseTextGenitive,
    getAcademicYear
};
