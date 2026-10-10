import {
    formatDotDate,
    toIsoDate,
    formatRuDate,
    splitDateToContractParts
} from './dateFormatters';

describe('dateFormatters', () => {
    describe('formatDotDate', () => {
        test('преобразует ISO YYYY-MM-DD в DD.MM.YYYY', () => {
            expect(formatDotDate('2026-01-29')).toBe('29.01.2026');
            expect(formatDotDate('2026-12-05')).toBe('05.12.2026');
        });

        test('сохраняет уже отформатированную дату DD.MM.YYYY', () => {
            expect(formatDotDate('29.01.2026')).toBe('29.01.2026');
        });

        test('возвращает пустую строку при отсутствии значения', () => {
            expect(formatDotDate('')).toBe('');
            expect(formatDotDate(null)).toBe('');
        });
    });

    describe('toIsoDate', () => {
        test('преобразует DD.MM.YYYY в YYYY-MM-DD', () => {
            expect(toIsoDate('29.01.2026')).toBe('2026-01-29');
        });

        test('преобразует русскую текстовую дату в YYYY-MM-DD', () => {
            expect(toIsoDate('15 мая 2026')).toBe('2026-05-15');
            expect(toIsoDate('15 мая 2026 г.')).toBe('2026-05-15');
            expect(toIsoDate('15 мая 2026 года')).toBe('2026-05-15');
            expect(toIsoDate('5 января 2026')).toBe('2026-01-05');
        });

        test('сохраняет уже ISO дату', () => {
            expect(toIsoDate('2026-01-29')).toBe('2026-01-29');
        });

        test('возвращает пустую строку для некорректных значений', () => {
            expect(toIsoDate('')).toBe('');
            expect(toIsoDate(null)).toBe('');
        });
    });

    describe('formatRuDate', () => {
        test('форматирует дату в русский текстовый формат', () => {
            expect(formatRuDate('2026-01-30')).toBe('30 января 2026');
            expect(formatRuDate('2026-01-30', true)).toBe('30 января 2026 г.');
            expect(formatRuDate('15.03.2026')).toBe('15 марта 2026');
        });

        test('сохраняет уже сформированную текстовую строку', () => {
            expect(formatRuDate('30 января 2026 г.')).toBe('30 января 2026 г.');
        });
    });

    describe('splitDateToContractParts', () => {
        test('корректно разбивает дату на поля договора', () => {
            expect(splitDateToContractParts('2026-02-08')).toEqual({
                contractDay: '8',
                contractMonth: 'февраля',
                contractYear: '2026'
            });
            expect(splitDateToContractParts('01.09.2025')).toEqual({
                contractDay: '1',
                contractMonth: 'сентября',
                contractYear: '2025'
            });
            expect(splitDateToContractParts('15 мая 2026')).toEqual({
                contractDay: '15',
                contractMonth: 'мая',
                contractYear: '2026'
            });
        });

        test('возвращает null для некорректных значений', () => {
            expect(splitDateToContractParts('')).toBeNull();
        });
    });
});
