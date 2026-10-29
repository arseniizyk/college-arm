import { MIN_PASSWORD_LENGTH } from './consts'

// Конфигурация колонок для таблиц.
export const TABLE_COLUMNS = {
    users: [
        { key: 'id', label: '№', className: 'col-id' },
        { key: 'email', label: 'Email', sortable: false },
        { key: 'role', label: 'Роль', render: 'role', sortable: false },
        { key: 'createdAt', label: 'Создан' }
    ],
    students: [
        { key: 'id', label: '№', className: 'col-id' },
        { key: 'last_name', label: 'Фамилия' },
        { key: 'name', label: 'Имя' },
        { key: 'father_name', label: 'Отчество' },
        { key: 'order_number', label: 'Приказ', sortable: false },
        { key: 'enroll_date', label: 'Зачислен' },
        { key: 'expell_date', label: 'Отчислен', render: 'expellDate' },
        { key: 'groupId', label: 'Группа', render: 'reference' }
    ],
    groups: [
        { key: 'id', label: '№', className: 'col-id' },
        { key: 'group_number', label: 'Номер группы', className: 'col-group-number' },
        { key: 'specialtyId', label: 'Специальность', render: 'reference', className: 'cell-wrap' },
        { key: 'supervisor', label: 'Куратор', render: 'supervisor', className: 'cell-wrap' },
        { key: 'enroll_date', label: 'Дата зачисления' },
        { key: 'payment_type', label: 'Основа обучения' },
        { key: 'course', label: 'Курс', render: 'course', className: 'col-center' }
    ],
    specialties: [
        { key: 'id', label: '№', sortable: false, className: 'col-id' },
        { key: 'name', label: 'Название', sortable: false },
        { key: 'qualification', label: 'Квалификация', sortable: false },
        { key: 'duration', label: 'Длительность обучения', render: 'duration', sortable: false }
    ],
    teachers: [
        { key: 'id', label: '№', className: 'col-id' },
        { key: 'last_name', label: 'Фамилия' },
        { key: 'name', label: 'Имя' },
        { key: 'father_name', label: 'Отчество' }
    ]
};

// Конфигурация форм по умолчанию
export const getDefaultFormData = (table) => {
    const defaults = {
        users: {
            email: '',
            password: '',
            role: 'ADMIN'
        },
        students: {
            last_name: '',
            name: '',
            father_name: '',
            order_number: '',
            enroll_date: '',
            expell_date: '',
            expell_reason: '',
            groupId: ''
        },
        groups: {
            group_number: '',
            specialtyId: '',
            teacherId: '',
            enroll_date: '',
            payment_type: 'платной'
        },
        specialties: {
            name: '',
            qualification: '',
            duration_years: 4,
            duration_months: 0
        },
        teachers: {
            last_name: '',
            name: '',
            father_name: ''
        }
    };
    return defaults[table] || {};
};

// Конфигурация полей форм
export const getFieldsConfig = (_userRole, getDropdownOptions, modalType = 'create') => ({
    users: [
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'admin@example.com' },
        { name: 'password', label: 'Пароль', type: 'password', required: modalType === 'create',
          placeholder: modalType === 'create' ? 'Введите пароль' : 'Оставьте пустым, если не меняете',
          helpText: `Минимум ${MIN_PASSWORD_LENGTH} символа` }
    ],
    students: [
        { name: 'last_name', label: 'Фамилия', type: 'text', required: true },
        { name: 'name', label: 'Имя', type: 'text', required: true },
        { name: 'father_name', label: 'Отчество', type: 'text' },
        { name: 'order_number', label: 'Номер приказа', type: 'text', required: true },
        { name: 'enroll_date', label: 'Дата зачисления', type: 'date', required: true },
        { name: 'expell_date', label: 'Дата отчисления', type: 'date' },
        { name: 'expell_reason', label: 'Причина отчисления', type: 'textarea', placeholder: 'Причина и приказ об отчислении' },
        { name: 'groupId', label: 'Группа', type: 'select', options: getDropdownOptions('groupId'), required: true }
    ],
    groups: [
        { name: 'group_number', label: 'Номер группы', type: 'text', required: true },
        { name: 'specialtyId', label: 'Специальность', type: 'select', options: getDropdownOptions('specialtyId'), required: true },
        { name: 'teacherId', label: 'Преподаватель (куратор)', type: 'select', options: getDropdownOptions('teacherId'), required: modalType === 'create' },
        { name: 'enroll_date', label: 'Дата зачисления', type: 'date', required: true },
        { name: 'payment_type', label: 'Основа обучения', type: 'select', 
          options: [
            { value: 'платной', label: 'Платная' },
            { value: 'бесплатной', label: 'Бесплатная' }
          ], 
          required: true 
        }
    ],
    specialties: [
        { name: 'name', label: 'Название специальности', type: 'text', required: true },
        { name: 'qualification', label: 'Квалификация', type: 'text', required: true },
        { name: 'duration_years', label: 'Длительность (лет)', type: 'number', required: true, min: 1, max: 6 },
        { name: 'duration_months', label: 'Длительность (месяцев)', type: 'number', required: true, min: 0, max: 11 }
    ],
    teachers: [
        { name: 'last_name', label: 'Фамилия', type: 'text', required: true },
        { name: 'name', label: 'Имя', type: 'text', required: true },
        { name: 'father_name', label: 'Отчество', type: 'text' }
    ]
});

// Названия таблиц для модальных окон
export const TABLE_NAMES = {
    users: 'Пользователя (Администратора)',
    students: 'Студента',
    groups: 'Группы',
    specialties: 'Специальности',
    teachers: 'Преподавателя'
};

// Названия действий
export const ACTION_NAMES = {
    create: 'Создание',
    edit: 'Редактирование',
    delete: 'Удаление'
};
