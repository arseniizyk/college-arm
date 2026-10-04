/** Виды практики, которые верстает шаблон договора. */
export const PRACTICE_TYPES = ['учебной', 'производственной', 'преддипломной'];

const DAY_MIN = 1;
const DAY_MAX = 31;
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

const inRange = (value, min, max) => {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return false;
  const num = Number(text);
  return num >= min && num <= max;
};

/**
 * Проверка формы договора на учебную практику до отправки на сервер.
 * @returns {string|null} - текст ошибки или null
 */
export const validatePracticeContract = (form) => {
    const required = [
        ['contractDay', 'число'],
        ['contractMonth', 'месяц'],
        ['contractYear', 'год'],
        ['contractNumber', 'номер договора'],
        ['practiceType', 'вид практики'],
        ['groupId', 'группа'],
        ['periodFrom', 'период начала практики'],
        ['periodTo', 'период окончания практики'],
        ['contractEndDate', 'срок действия договора'],
    ];
    for (const [field, label] of required) {
        if (!String(form[field] ?? '').trim()) {
            return `Заполните обязательное поле «${label}»`;
        }
    }

    if (!form.studentIds?.length) {
        return 'Выберите хотя бы одного учащегося';
    }
    if (!inRange(form.contractDay, DAY_MIN, DAY_MAX)) {
        return `Число договора должно быть от ${DAY_MIN} до ${DAY_MAX}`;
    }
    if (!inRange(form.contractYear, YEAR_MIN, YEAR_MAX)) {
        return `Год договора должен быть от ${YEAR_MIN} до ${YEAR_MAX}`;
    }
    return null;
};
