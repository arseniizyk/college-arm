import { toJS } from 'mobx';

/**
 * Вычисляет текущий курс группы на основе даты зачисления и длительности обучения
 * @param {Date|string} enrollDate - Дата зачисления группы
 * @param {number} durationYears - Длительность обучения в годах
 * @param {number} durationMonths - Длительность обучения в месяцах
 * @returns {number|string} - Номер курса или "Выпускник"
 */
export const calculateCourse = (enrollDate, durationYears = 4, durationMonths = 0) => {
    if (!enrollDate) return '-';
    
    const enroll = new Date(enrollDate);
    const now = new Date();
    
    // Вычисляем разницу в годах
    let yearsDiff = now.getFullYear() - enroll.getFullYear();
    
    // Учитываем учебный год (с 1 сентября)
    const enrollMonth = enroll.getMonth();
    const currentMonth = now.getMonth();
    
    // Если текущий месяц до сентября, а зачисление было после сентября прошлого года
    if (currentMonth < 8) { // 8 = сентябрь (месяцы с 0)
        if (enrollMonth >= 8) {
            yearsDiff--;
        }
    }
    
    const course = yearsDiff + 1;
    
    // Проверяем, не превышает ли курс максимальный
    const maxCourse = durationYears + (durationMonths > 0 ? 1 : 0);
    
    if (course > maxCourse) {
        return 'Выпускник';
    }
    
    if (course < 1) {
        return 1;
    }
    
    return course;
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
                label: `${teacher.last_name} ${teacher.name} ${teacher.father_name || ''}`.trim()
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
                label: `${student.last_name} ${student.name} ${student.father_name || ''}`.trim() + 
                       (student.groupId ? ` (${getNameById('groupId', student.groupId, data)})` : '')
            }));
        default:
            return [];
    }
};

// Функция для получения названия по ID
export const getNameById = (fieldName, id, data) => {
    if (!id) return '-';
    
    switch (fieldName) {
        case 'groupId':
            const group = (data.groups || []).find(g => g.id === id);
            return group ? `${group.group_number}` : `ID: ${id}`;
        case 'specialtyId':
            const spec = (data.specialties || []).find(s => s.id === id);
            return spec ? `${spec.name}` : `ID: ${id}`;
        case 'teacherId':
            const teacher = (data.teachers || []).find(t => t.id === id);
            return teacher ? `${teacher.last_name} ${teacher.name} ${teacher.father_name || ''}`.trim() : `ID: ${id}`;
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
                    const fullName = `${student.last_name || ''} ${student.name || ''} ${student.father_name || ''}`.toLowerCase();
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
                    group.specialtyId === parseInt(selectedSpecialtyFilter, 10)
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
                    const fullName = `${teacher.last_name || ''} ${teacher.name || ''} ${teacher.father_name || ''}`.toLowerCase();
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
export const prepareFormData = (formData, activeTab, userRole) => {
    let submitData = { ...formData };
    
    // Специальная обработка для заявок
    if (activeTab === 'requests' && submitData.studentIds) {
        // Для обычных пользователей studentIds - это строка, для админов/преподавателей - массив
        if (userRole === 'USER') {
            // Преобразуем одиночный ID в массив
            submitData.studentIds = [parseInt(submitData.studentIds, 10)];
        } else {
            // Преобразуем массив строк в массив чисел
            submitData.studentIds = Array.isArray(submitData.studentIds) 
                ? submitData.studentIds.map(id => parseInt(id, 10))
                : [parseInt(submitData.studentIds, 10)];
        }
        
        // Преобразуем documentId в число, если он есть
        if (submitData.documentId) {
            submitData.documentId = parseInt(submitData.documentId, 10);
        }
    }

    // Привязка аккаунта к студенту или куратору
    if ((activeTab === 'students' || activeTab === 'teachers') && 'userId' in submitData) {
        submitData.userId = submitData.userId ? parseInt(submitData.userId, 10) : null;
    }
    
    return submitData;
};