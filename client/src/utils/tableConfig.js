import { canSelectMultipleStudents } from './consts'

// Конфигурация колонок для таблиц
export const TABLE_COLUMNS = {
    users: [
        { key: 'id', label: '№' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Роль' },
        { key: 'createdAt', label: 'Создан' }
    ],
    documents: [
        { key: 'id', label: '№' },
        { key: 'document_name', label: 'Название' },
        { key: 'createdAt', label: 'Создан' }
    ],
    requests: [
        { key: 'id', label: '№' },
        { key: 'documentId', label: 'Документ' },
        { key: 'description', label: 'Описание' },
        { key: 'students', label: 'Студенты' },
        { key: 'status', label: 'Статус' },
        { key: 'createdAt', label: 'Создана' }
    ],
    students: [
        { key: 'id', label: '№' },
        { key: 'last_name', label: 'Фамилия' },
        { key: 'name', label: 'Имя' },
        { key: 'father_name', label: 'Отчество' },
        { key: 'order_number', label: 'Приказ' },
        { key: 'enroll_date', label: 'Зачислен' },
        { key: 'expell_date', label: 'Отчислен' },
        { key: 'groupId', label: 'Группа' },
        { key: 'userId', label: 'Аккаунт' }
    ],
    groups: [
        { key: 'id', label: '№' },
        { key: 'group_number', label: 'Номер группы' },
        { key: 'specialtyId', label: 'Специальность' },
        { key: 'supervisor', label: 'Куратор' },
        { key: 'enroll_date', label: 'Дата зачисления' },
        { key: 'payment_type', label: 'Основа обучения' },
        { key: 'course', label: 'Курс' }
    ],
    specialties: [
        { key: 'id', label: '№' },
        { key: 'name', label: 'Название' },
        { key: 'qualification', label: 'Квалификация' },
        { key: 'duration', label: 'Длительность обучения' }
    ],
    teachers: [
        { key: 'id', label: '№' },
        { key: 'last_name', label: 'Фамилия' },
        { key: 'name', label: 'Имя' },
        { key: 'father_name', label: 'Отчество' },
        { key: 'userId', label: 'Аккаунт' }
    ]
};

// Конфигурация форм по умолчанию
export const getDefaultFormData = (table, userRole) => {
    const defaults = {
        users: {
            email: '',
            password: '',
            role: 'USER'
        },
        documents: {
            document_name: ''
        },
        requests: {
            documentId: '',
            description: '',
            studentIds: canSelectMultipleStudents(userRole) ? [] : '',
            status: 'in_progress'
        },
        students: {
            last_name: '',
            name: '',
            father_name: '',
            order_number: '',
            enroll_date: '',
            expell_date: '',
            groupId: '',
            userId: ''
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
            father_name: '',
            userId: ''
        }
    };
    return defaults[table] || {};
};

// Конфигурация полей форм
export const getFieldsConfig = (userRole, getDropdownOptions, modalType = 'create') => ({
    users: [
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'user@example.com' },
        { name: 'password', label: 'Пароль', type: 'password', required: modalType === 'create', 
          placeholder: modalType === 'create' ? 'Введите пароль' : 'Оставьте пустым, если не меняете' },
        { name: 'role', label: 'Роль', type: 'select', options: ['USER', 'ADMIN', 'TEACHER'] }
    ],
    documents: [
        { name: 'document_name', label: 'Название документа', type: 'text', required: true, 
          placeholder: 'Введите название документа' }
    ],
    requests: [
        { name: 'documentId', label: 'Документ', type: 'select', options: getDropdownOptions('documentId') },
        { name: 'description', label: 'Описание (если документ не выбран)', type: 'textarea', placeholder: 'Опишите требуемый документ' },
        { 
            name: 'studentIds', 
            label: 'Студенты', 
            type: canSelectMultipleStudents(userRole) ? 'multiselect' : 'select', 
            options: getDropdownOptions('studentIds'), 
            required: true,
            helpText: canSelectMultipleStudents(userRole)
                ? 'Вы можете выбрать нескольких студентов'
                : 'Вы можете выбрать только одного студента'
        },
        { name: 'status', label: 'Статус', type: 'select', 
          options: [
            { value: 'in_progress', label: 'В обработке' },
            { value: 'completed', label: 'Завершено' },
            { value: 'rejected', label: 'Отклонено' }
          ] 
        }
    ],
    students: [
        { name: 'last_name', label: 'Фамилия', type: 'text', required: true },
        { name: 'name', label: 'Имя', type: 'text', required: true },
        { name: 'father_name', label: 'Отчество', type: 'text' },
        { name: 'order_number', label: 'Номер приказа', type: 'text', required: true },
        { name: 'enroll_date', label: 'Дата зачисления', type: 'date', required: true },
        { name: 'expell_date', label: 'Дата отчисления', type: 'date' },
        { name: 'groupId', label: 'Группа', type: 'select', options: getDropdownOptions('groupId'), required: true },
        { name: 'userId', label: 'Аккаунт', type: 'select', options: getDropdownOptions('studentUserId'),
          helpText: 'Пользователь, который сможет подавать заявки только на этого студента' }
    ],
    groups: [
        { name: 'group_number', label: 'Номер группы', type: 'text', required: true },
        { name: 'specialtyId', label: 'Специальность', type: 'select', options: getDropdownOptions('specialtyId'), required: true },
        { name: 'teacherId', label: 'Преподаватель', type: 'select', options: getDropdownOptions('teacherId'), required: true },
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
        { name: 'father_name', label: 'Отчество', type: 'text' },
        { name: 'userId', label: 'Аккаунт', type: 'select', options: getDropdownOptions('teacherUserId'),
          helpText: 'Куратор, который сможет подавать заявки только на студентов своей группы' }
    ]
});

// Названия таблиц для модальных окон
export const TABLE_NAMES = {
    users: 'Пользователя',
    documents: 'Документа',
    requests: 'Заявки',
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