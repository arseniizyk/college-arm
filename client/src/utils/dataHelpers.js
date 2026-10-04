import { toJS } from 'mobx';

/**
 * Собирает ФИО в одну строку. Отчество опционально: при пустом значении
 * хвостового пробела не остаётся.
 * @param {{last_name?: string, name?: string, father_name?: string}} person
 * @param {{lowercase?: boolean}} options
 * @returns {string}
 */
export const formatFio = (person, { lowercase = false } = {}) => {
    if (!person) return '';
    const fio = [person.last_name, person.name, person.father_name]
        .filter(Boolean)
        .join(' ')
        .trim();
    return lowercase ? fio.toLowerCase() : fio;
};

/** Короткая форма ФИО для приказов: «Иванов И.И.». */
export const formatFioShort = (person) => {
    if (!person) return '';
    const initial = (value) => (value ? `${value.charAt(0)}.` : '');
    return `${person.last_name || ''} ${initial(person.name)}${initial(person.father_name)}`.trim();
};

// Учебный год начинается 1 сентября, поэтому месяцы сравниваются с индексом 8.
const ACADEMIC_YEAR_START_MONTH = 8;

// Держим в паре с server/utils/course.js: правило курса одно на оба приложения.
const getAcademicYear = (date) => (
    date.getMonth() >= ACADEMIC_YEAR_START_MONTH
        ? date.getFullYear()
        : date.getFullYear() - 1
);

/**
 * Вычисляет текущий курс группы на основе даты зачисления и длительности обучения
 * @param {Date|string} enrollDate - Дата зачисления группы
 * @param {number} durationYears - Длительность обучения в годах
 * @param {number} durationMonths - Длительность обучения в месяцах
 * @param {{now?: Date}} options - now подменяется в тестах
 * @returns {number|string} - Номер курса, "Выпускник" или "-", если дата неизвестна
 */
export const calculateCourse = (enrollDate, durationYears = 4, durationMonths = 0, { now = new Date() } = {}) => {
    if (!enrollDate) return '-';

    const enroll = new Date(enrollDate);
    if (Number.isNaN(enroll.getTime())) return '-';

    // Смена курса строго 1 сентября, независимо от месяца зачисления.
    const course = Math.max(getAcademicYear(now) - getAcademicYear(enroll) + 1, 1);

    const maxCourse = durationYears + (durationMonths > 0 ? 1 : 0);
    return course > maxCourse ? 'Выпускник' : course;
};

/**
 * Форматирует длительность обучения для отображения
 * @param {number} years - Количество лет
 * @param {number} months - Количество месяцев
 * @returns {string} - Отформатированная строка
 */
export const formatDuration = (years, months) => {
    if (!years && !months) return '-';
    
    const yearText = years ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : '';
    const monthText = months ? `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}` : '';
    
    return [yearText, monthText].filter(Boolean).join(' ');
};

// Функции для получения данных для выпадающих списков
export const getDropdownOptions = (fieldName, data, excludeOwnerId = null) => {
    switch (fieldName) {
        case 'groupId':
            // Для студентов: показываем номер группы
            return (data.groups || []).map(group => ({
                value: group.id,
                label: `${group.group_number}`
            }));
        case 'specialtyId':
            // Для групп: показываем название специальности
            return (data.specialties || []).map(spec => ({
                value: spec.id,
                label: `${spec.name} (${spec.qualification})`
            }));
        case 'teacherId':
            // Для групп: показываем ФИО преподавателя
            return (data.teachers || []).map(teacher => ({
                value: teacher.id,
                label: formatFio(teacher)
            }));
        case 'userId':
            // Для заявок: показываем email пользователя
            return (data.users || []).map(user => ({
                value: user.id,
                label: `${user.email} (${user.role})`
            }));
        case 'studentUserId':
            // Для карточки студента: аккаунты, ещё не привязанные к другому студенту.
            // excludeOwnerId нужен при редактировании, чтобы не терять текущую привязку
            return (data.users || [])
                .filter(user => !data.students?.some(s => s.userId === user.id && s.id !== excludeOwnerId))
                .map(user => ({
                    value: user.id,
                    label: `${user.email} (${user.role})`
                }));
        case 'teacherUserId':
            // Для карточки куратора: аккаунты, ещё не привязанные к другому преподавателю
            return (data.users || [])
                .filter(user => !data.teachers?.some(t => t.userId === user.id && t.id !== excludeOwnerId))
                .map(user => ({
                    value: user.id,
                    label: `${user.email} (${user.role})`
                }));
        case 'documentId':
            // Для заявок: показываем название документа
            return (data.documents || []).map(doc => ({
                value: doc.id,
                label: doc.document_name
            }));
        case 'studentIds':
            // Для заявок: показываем ФИО студентов с группой
            return (data.students || []).map(student => ({
                value: student.id,
                label: formatFio(student) +
                       (student.groupId ? ` (${getNameById('groupId', student.groupId, data)})` : '')
            }));
        default:
            return [];
    }
};

// Удаление специальности обнуляет groups.specialtyId (ON DELETE SET NULL), группа
// остаётся. Показываем это явно: молчаливый дефис выглядел бы как обычная строка.
export const MISSING_SPECIALTY_LABEL = 'Без специальности';

// Значение фильтра, которым выбираются группы с specialtyId = null.
export const MISSING_SPECIALTY_FILTER = 'none';

// Функция для получения названия по ID
export const getNameById = (fieldName, id, data) => {
    if (!id && fieldName !== 'specialtyId') return '-';
    if (!id && fieldName === 'specialtyId') return MISSING_SPECIALTY_LABEL;
    
    switch (fieldName) {
        case 'groupId':
            const group = (data.groups || []).find(g => g.id === id);
            return group ? `${group.group_number}` : `ID: ${id}`;
        case 'specialtyId':
            const spec = (data.specialties || []).find(s => s.id === id);
            return spec ? `${spec.name}` : `ID: ${id}`;
        case 'teacherId':
            const teacher = (data.teachers || []).find(t => t.id === id);
            return teacher ? formatFio(teacher) : `ID: ${id}`;
        case 'userId':
            const user = (data.users || []).find(u => u.id === id);
            return user ? `${user.email}` : `ID: ${id}`;
        case 'documentId':
            const doc = (data.documents || []).find(d => d.id === id);
            return doc ? doc.document_name : `ID: ${id}`;
        default:
            return id;
    }
};

// Функция для получения данных таблицы
export const getTableData = (activeTab, data) => {
    try {
        let result;
        switch (activeTab) {
            case 'users': result = data.users || [];
                break;
            case 'documents': result = data.documents || [];
                break;
            case 'requests': result = data.requests || [];
                break;
            case 'students': 
                // Используем allStudents для полного списка без серверной фильтрации
                result = data.allStudents || [];
                break;
            case 'groups': result = data.groups || [];
                break;
            case 'specialties': result = data.specialties || [];
                break;
            case 'teachers': result = data.teachers || [];
                break;
            default: result = [];
        }
        
        return toJS(result) || [];
    } catch (error) {
        return [];
    }
};

// Функция для фильтрации данных
export const filterData = (
    tableData, 
    searchTerm, 
    activeTab, 
    selectedGroupFilter = '', 
    selectedRoleFilter = '',
    selectedStatusFilter = '',
    selectedSpecialtyFilter = ''
) => {
    let filteredData = tableData;

    // Фильтрация по специфичным фильтрам для каждой таблицы
    switch (activeTab) {
        case 'students':
            // Фильтрация по группе
            if (selectedGroupFilter && selectedGroupFilter !== '') {
                filteredData = filteredData.filter(student => 
                    student.groupId === parseInt(selectedGroupFilter, 10)
                );
            }
            
            // Фильтрация по ФИО
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(student => {
                    const fullName = formatFio(student, { lowercase: true });
                    return fullName.includes(searchLower);
                });
            }
            break;

        case 'users':
            // Фильтрация по роли
            if (selectedRoleFilter && selectedRoleFilter !== '') {
                filteredData = filteredData.filter(user => 
                    user.role === selectedRoleFilter
                );
            }
            
            // Фильтрация по email
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(user => {
                    return user.email?.toLowerCase().includes(searchLower);
                });
            }
            break;

        case 'requests':
            // Фильтрация по статусу
            if (selectedStatusFilter && selectedStatusFilter !== '') {
                filteredData = filteredData.filter(request => 
                    request.status === selectedStatusFilter
                );
            }
            
            // Фильтрация по описанию
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(request => {
                    return request.description?.toLowerCase().includes(searchLower);
                });
            }
            break;

        case 'groups':
            // Фильтрация по специальности
            if (selectedSpecialtyFilter && selectedSpecialtyFilter !== '') {
                filteredData = filteredData.filter(group =>
                    selectedSpecialtyFilter === MISSING_SPECIALTY_FILTER
                        ? !group.specialtyId
                        : group.specialtyId === parseInt(selectedSpecialtyFilter, 10)
                );
            }
            
            // Фильтрация по номеру группы
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(group => {
                    return group.group_number?.toLowerCase().includes(searchLower);
                });
            }
            break;

        case 'teachers':
            // Фильтрация по ФИО
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(teacher => {
                    const fullName = formatFio(teacher, { lowercase: true });
                    return fullName.includes(searchLower);
                });
            }
            break;

        case 'documents':
            // Фильтрация по названию
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(doc => {
                    return doc.document_name?.toLowerCase().includes(searchLower);
                });
            }
            break;

        case 'specialties':
            // Фильтрация по названию или квалификации
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(spec => {
                    return spec.name?.toLowerCase().includes(searchLower) ||
                           spec.qualification?.toLowerCase().includes(searchLower);
                });
            }
            break;

        default:
            // Для других таблиц: обычная клиентская фильтрация по всем полям
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = filteredData.filter(item => {
                    return Object.values(item).some(v => {
                        if (v === null || v === undefined) return false;
                        return String(v).toLowerCase().includes(searchLower);
                    });
                });
            }
    }
    
    return filteredData;
};

// Функция для подготовки данных формы перед отправкой
export const prepareFormData = (formData, activeTab) => {
    let submitData = { ...formData };
    
    // Специальная обработка для заявок
    if (activeTab === 'requests') {
        if (submitData.studentIds) {
            submitData.studentIds = (Array.isArray(submitData.studentIds)
                ? submitData.studentIds
                : [submitData.studentIds]
            ).map(id => parseInt(id, 10));
        }

        // Преобразуем documentId в число, если он есть, или null если пустая строка/не задан
        if ('documentId' in submitData) {
            submitData.documentId = submitData.documentId ? parseInt(submitData.documentId, 10) : null;
        }
    }

    // Привязка аккаунта к студенту или куратору
    if ((activeTab === 'students' || activeTab === 'teachers') && 'userId' in submitData) {
        submitData.userId = submitData.userId ? parseInt(submitData.userId, 10) : null;
    }

    if (activeTab === 'groups') {
        delete submitData.supervisor;
        if ('teacherId' in submitData) {
            submitData.teacherId = submitData.teacherId === '' || submitData.teacherId === null
                ? null
                : parseInt(submitData.teacherId, 10);
        }
    }
    
    return submitData;
};

export const formatDateForInput = (dateStr) => (dateStr ? String(dateStr).slice(0, 10) : '');

export const toStudentFormData = (student) => ({
    ...student,
    enroll_date: formatDateForInput(student?.enroll_date),
    expell_date: formatDateForInput(student?.expell_date)
});

export const toGroupFormData = (group) => ({
    ...group,
    enroll_date: formatDateForInput(group?.enroll_date),
    teacherId: group?.supervisor?.teacher?.id ?? ''
});