import React from 'react';
import { Badge } from 'react-bootstrap';
import { toJS } from 'mobx';
import { calculateCourse, formatDuration, MISSING_SPECIALTY_LABEL } from '../utils/dataHelpers';

const TableCell = ({ value, columnKey, item }) => {
    // Специальные случаи обрабатываем ДО проверки на null
    // Вычисление курса для групп
    if (columnKey === 'course') {
        if (!item.enroll_date) {
            return <span className="text-muted">-</span>;
        }
        
        // Получаем данные специальности из вложенного объекта
        const specialty = item.specialty;
        // Без специальности срок обучения неизвестен. Раньше фолбэк 4 года давал
        // правдоподобный, но выдуманный курс — в том числе «Выпускник» не по сроку.
        if (!specialty) {
            return <span className="text-muted" title={MISSING_SPECIALTY_LABEL}>-</span>;
        }
        const durationYears = specialty.duration_years || 4;
        const durationMonths = specialty.duration_months || 0;
        
        const course = calculateCourse(item.enroll_date, durationYears, durationMonths);
        
        if (course === 'Выпускник') {
            return <Badge bg="secondary">{course}</Badge>;
        }
        return <Badge bg="primary">{course} курс</Badge>;
    }

    // Форматирование длительности обучения для специальностей
    if (columnKey === 'duration') {
        if (item.duration_years !== undefined) {
            const formatted = formatDuration(item.duration_years, item.duration_months || 0);
            return formatted;
        }
        return <span className="text-muted">-</span>;
    }
    
    // Теперь проверяем на null/undefined для остальных случаев
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted">-</span>;
    }

    let cellValue;
    try {
        if (typeof value === 'object' && value !== null) {
            cellValue = toJS(value);
        } else {
            cellValue = value;
        }
    } catch {
        cellValue = value;
    }

    // Форматирование даты
    if (columnKey.toLowerCase().includes('date')) {
        try {
            const date = new Date(cellValue);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('ru-RU');
            }
        } catch {
            // Не форматируем, если не дата
        }
    }

    // Статусы заявок
    if (columnKey === 'status') {
        const statusTranslations = {
            pending: 'В обработке',
            in_progress: 'В обработке',
            approved: 'В обработке',
            completed: 'Завершено',
            rejected: 'Отклонено',
            cancelled: 'Отклонено'
        };
        const statusColors = {
            pending: 'info',
            in_progress: 'info',
            approved: 'info',
            completed: 'success',
            rejected: 'danger',
            cancelled: 'danger'
        };
        return (
            <Badge bg={statusColors[cellValue] || 'secondary'}>
                {statusTranslations[cellValue] || cellValue}
            </Badge>
        );
    }

    // Роли пользователей
    if (columnKey === 'role') {
        const roleTranslations = {
            ADMIN: 'Администратор',
            USER: 'Пользователь',
            TEACHER: 'Преподаватель'
        };
        const roleColors = {
            ADMIN: 'danger',
            USER: 'primary',
            TEACHER: 'success'
        };
        return (
            <Badge bg={roleColors[cellValue] || 'secondary'}>
                {roleTranslations[cellValue] || cellValue}
            </Badge>
        );
    }

    // Для отображения чисел
    if (typeof cellValue === 'number') {
        return cellValue.toString();
    }

    // Для отображения строк
    const strValue = String(cellValue);
    
    // Ограничение длинных текстов
    if (strValue.length > 50) {
        return (
            <span title={strValue}>
                {strValue.substring(0, 50)}...
            </span>
        );
    }

    return strValue;
};

export default TableCell;