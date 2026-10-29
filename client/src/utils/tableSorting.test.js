import { getSortValue, compareValues, defaultSort, sortTableData } from './tableSorting';

describe('tableSorting', () => {
    describe('compareValues', () => {
        it('compares numbers ascending and descending', () => {
            expect(compareValues(1, 2, 'asc')).toBeLessThan(0);
            expect(compareValues(2, 1, 'asc')).toBeGreaterThan(0);
            expect(compareValues(5, 5, 'asc')).toBe(0);
            expect(compareValues(1, 2, 'desc')).toBeGreaterThan(0);
            expect(compareValues(2, 1, 'desc')).toBeLessThan(0);
        });

        it('compares Russian strings alphabetically', () => {
            expect(compareValues('Алексей', 'Борис', 'asc')).toBeLessThan(0);
            expect(compareValues('Борис', 'Алексей', 'asc')).toBeGreaterThan(0);
            expect(compareValues('Алексей', 'Борис', 'desc')).toBeGreaterThan(0);
        });

        it('handles numeric strings naturally', () => {
            expect(compareValues('101', '102', 'asc')).toBeLessThan(0);
            expect(compareValues('102', '101', 'asc')).toBeGreaterThan(0);
        });

        it('places empty values at the end for ascending order and handles 0 as valid number', () => {
            expect(compareValues('', 'Текст', 'asc')).toBe(1);
            expect(compareValues('Текст', '', 'asc')).toBe(-1);
            expect(compareValues('', '', 'asc')).toBe(0);
            expect(compareValues(0, 5, 'asc')).toBeLessThan(0);
            expect(compareValues(5, 0, 'asc')).toBeGreaterThan(0);
        });
    });

    describe('getSortValue', () => {
        it('extracts numeric id', () => {
            expect(getSortValue({ id: 42 }, 'id', 'users')).toBe(42);
        });

        it('resolves reference using getNameById', () => {
            const getNameById = jest.fn().mockReturnValue('Группа 101');
            const result = getSortValue({ groupId: 5 }, 'groupId', 'students', getNameById);
            expect(getNameById).toHaveBeenCalledWith('groupId', 5);
            expect(result).toBe('Группа 101');
        });

        it('extracts supervisor teacher full name', () => {
            const item = {
                supervisor: {
                    teacher: { last_name: 'Иванов', name: 'Иван', father_name: 'Иванович' }
                }
            };
            expect(getSortValue(item, 'supervisor', 'groups')).toBe('Иванов Иван Иванович');
        });

        it('extracts duration in months', () => {
            const item = { duration_years: 3, duration_months: 6 };
            expect(getSortValue(item, 'duration', 'specialties')).toBe(42);
        });

        it('extracts date as timestamp', () => {
            const item = { createdAt: '2026-05-10T10:00:00.000Z' };
            const timestamp = new Date('2026-05-10T10:00:00.000Z').getTime();
            expect(getSortValue(item, 'createdAt', 'users')).toBe(timestamp);
        });
    });

    describe('sortTableData', () => {
        const users = [
            { id: 2, email: 'boris@example.com', createdAt: '2026-03-01T00:00:00.000Z' },
            { id: 1, email: 'alex@example.com', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 3, email: 'clara@example.com', createdAt: '2026-02-01T00:00:00.000Z' }
        ];

        it('uses defaultSort by id for users when sortConfig is null or empty', () => {
            const sorted = sortTableData(users, null, 'users');
            expect(sorted.map(u => u.id)).toEqual([1, 2, 3]);
        });

        it('sorts by specified key in ascending order (1-N)', () => {
            const sorted = sortTableData(users, { key: 'id', direction: 'asc' }, 'users');
            expect(sorted.map(u => u.id)).toEqual([1, 2, 3]);
        });

        it('sorts by specified key in descending order (N-1)', () => {
            const sorted = sortTableData(users, { key: 'id', direction: 'desc' }, 'users');
            expect(sorted.map(u => u.id)).toEqual([3, 2, 1]);
        });

        it('sorts createdAt from earliest to latest in ascending order', () => {
            const sorted = sortTableData(users, { key: 'createdAt', direction: 'asc' }, 'users');
            expect(sorted.map(u => u.id)).toEqual([1, 3, 2]);
        });

        it('disables custom sorting for specialties and maintains default id sort', () => {
            const specialties = [
                { id: 3, name: 'Б' },
                { id: 1, name: 'В' },
                { id: 2, name: 'А' }
            ];
            const sorted = sortTableData(specialties, { key: 'name', direction: 'asc' }, 'specialties');
            expect(sorted.map(s => s.id)).toEqual([1, 2, 3]);
        });

        it('places expelled students at the end in students default sort', () => {
            const students = [
                { id: 1, last_name: 'Яковлев', expell_date: '2025-04-30' },
                { id: 2, last_name: 'Борисов', expell_date: null },
                { id: 3, last_name: 'Алексеев', expell_date: null },
                { id: 4, last_name: 'Антонов', expell_date: '2024-05-10' }
            ];
            const sorted = sortTableData(students, null, 'students');
            expect(sorted.map(s => s.id)).toEqual([3, 2, 4, 1]);
        });
    });
});
