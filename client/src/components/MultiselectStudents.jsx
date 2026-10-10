import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { formatFio } from '../utils/dataHelpers';

const MultiselectStudents = ({ field, formData, setFormData, loading, data, allowedStudentIds = null, noStudentsMessage }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');

    // Определяем, является ли это одиночным выбором (для обычных пользователей)
    const isSingleSelect = field.type === 'select';

    // Получаем студентов с информацией о группах
    const sourceStudents = (data.allStudents?.length ? data.allStudents : data.students) || [];
    const allStudents = sourceStudents
        .filter(student => !allowedStudentIds || allowedStudentIds.includes(student.id))
        .map(student => {
            const group = (data.groups || []).find(g => g.id === student.groupId);
            return {
                ...student,
                groupName: group ? group.group_number : 'Без группы',
                fullName: formatFio(student)
            };
        });

    // Если нет студентов, показываем сообщение
    if (allStudents.length === 0) {
        return (
            <div className="text-center py-4 border rounded bg-light">
                <i className="bi-people fs-2 text-muted mb-2"></i>
                <p className="text-muted mb-0">
                    {allowedStudentIds && allowedStudentIds.length === 0
                        ? (noStudentsMessage || 'Ваш аккаунт не привязан к студенту. Обратитесь к администратору.')
                        : 'Загрузка студентов...'}
                </p>
            </div>
        );
    }

    // Получаем уникальные группы для фильтра
    const availableGroups = [...new Set(allStudents.map(s => s.groupName))].sort();

    // Фильтруем студентов по поиску и группе
    const filteredStudents = allStudents.filter(student => {
        const matchesSearch = searchTerm === '' || 
            student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.groupName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesGroup = selectedGroup === '' || student.groupName === selectedGroup;
        
        return matchesSearch && matchesGroup;
    });

    // Создаем опции для отфильтрованных студентов
    const filteredOptions = filteredStudents.map(student => ({
        value: student.id,
        label: `${student.fullName} (${student.groupName})`,
        student: student
    }));

    const handleSelectAll = () => {
        if (isSingleSelect) return;
        
        const allValues = filteredOptions.map(opt => opt.value.toString());
        setFormData(prev => ({
            ...prev,
            [field.name]: allValues
        }));
    };

    // Значения приходится читать из prev: formData[field.name] — это снимок на момент
    // рендера, и два переключения до ре-рендера затёрли бы первое изменение
    const currentSelection = (prev) => {
        const value = prev[field.name];
        return Array.isArray(value) ? value : [];
    };

    const handleSelectGroup = () => {
        if (isSingleSelect || !selectedGroup) return;

        const groupValues = filteredOptions.map(opt => opt.value.toString());
        setFormData(prev => ({
            ...prev,
            [field.name]: [...new Set([...currentSelection(prev), ...groupValues])]
        }));
    };

    const handleClearAll = () => {
        setFormData(prev => ({
            ...prev,
            [field.name]: isSingleSelect ? '' : []
        }));
    };

    const handleStudentToggle = (studentId, checked) => {
        const value = studentId.toString();

        if (isSingleSelect) {
            // Для одиночного выбора просто устанавливаем значение
            setFormData(prev => ({
                ...prev,
                [field.name]: checked ? value : ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field.name]: checked
                    ? [...currentSelection(prev), value]
                    : currentSelection(prev).filter(v => v !== value)
            }));
        }
    };

    // Получаем текущие выбранные значения
    const selectedValues = (() => {
        if (isSingleSelect) {
            // Для одиночного выбора
            const value = formData[field.name];
            return (value && value !== '' && value !== '0') ? [value] : [];
        } else {
            // Для множественного выбора
            const values = formData[field.name];
            if (!Array.isArray(values)) return [];
            // Фильтруем пустые значения
            const filtered = values.filter(v => v && v !== '' && v !== '0');
            return filtered;
        }
    })();

    return (
        <div>
            {/* Кнопки управления */}
            <div className="d-flex gap-2 mb-3">
                {!isSingleSelect && (
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={loading || filteredOptions.length === 0}
                    >
                        <i className="bi-check-lg-double me-1"></i>
                        Выбрать все ({filteredOptions.length})
                    </Button>
                )}
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={loading}
                >
                    <i className="bi-x-lg me-1"></i>
                    Очистить
                </Button>
            </div>

            {/* Фильтры */}
            <div className="row mb-3">
                <div className="col-md-6">
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi-search"></i>
                        </span>
                        <Form.Control
                            type="text"
                            placeholder="Поиск по ФИО..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi-people"></i>
                        </span>
                        <Form.Select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Все группы</option>
                            {availableGroups.map(group => (
                                <option key={group} value={group}>{group}</option>
                            ))}
                        </Form.Select>
                        {!isSingleSelect && selectedGroup && (
                            <Button
                                variant="outline-primary"
                                onClick={handleSelectGroup}
                                disabled={loading}
                                style={{ height: '38px', display: 'flex', alignItems: 'center' }}
                            >
                                <i className="bi-people-fill me-1"></i>
                                Всю группу
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Список студентов */}
            <div 
                className="multiselect-container" 
                style={{ 
                    maxHeight: '250px', 
                    overflowY: 'auto', 
                    border: '1px solid #ced4da', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '0.75rem',
                    backgroundColor: '#f8f9fa'
                }}
            >
                {filteredOptions.length > 0 ? (
                    filteredOptions.map(opt => {
                        const isChecked = selectedValues.includes(opt.value.toString());
                        return (
                            <div 
                                key={opt.value} 
                                className={`d-flex align-items-center mb-2 p-2 multiselect-item ${isChecked ? 'is-selected' : ''}`}
                                role={isSingleSelect ? "radio" : "checkbox"}
                                aria-checked={isChecked}
                                tabIndex={loading ? -1 : 0}
                                style={{ 
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => {
                                    if (!loading) {
                                        handleStudentToggle(opt.value, !isChecked);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (!loading && (e.key === ' ' || e.key === 'Enter')) {
                                        e.preventDefault();
                                        handleStudentToggle(opt.value, !isChecked);
                                    }
                                }}
                            >
                                <Form.Check
                                    type={isSingleSelect ? "radio" : "checkbox"}
                                    name={isSingleSelect ? field.name : undefined}
                                    id={`${field.name}-${opt.value}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleStudentToggle(opt.value, e.target.checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={loading}
                                    className="me-3"
                                    style={{ pointerEvents: 'none' }}
                                />
                                <div className="flex-grow-1" style={{ pointerEvents: 'none' }}>
                                    <div className="fw-bold">{opt.student.fullName}</div>
                                    <small className="text-muted">
                                        <i className="bi-people me-1"></i>
                                        Группа: {opt.student.groupName}
                                    </small>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-4">
                        <i className="bi-search fs-2 text-muted mb-2"></i>
                        <p className="text-muted mb-0">
                            {searchTerm || selectedGroup ? 
                                'Студенты не найдены по заданным критериям' : 
                                'Нет доступных студентов'
                            }
                        </p>
                        {(searchTerm || selectedGroup) && (
                            <Button 
                                variant="link" 
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedGroup('');
                                }}
                            >
                                Сбросить фильтры
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Информация и подсказки */}
            <div className="mt-3">
                {field.required && (
                    <Form.Text className="text-muted d-block">
                        <i className="bi-info-circle me-1"></i>
                        {isSingleSelect ? 'Выберите одного студента' : 'Выберите хотя бы одного студента'}
                    </Form.Text>
                )}
                {selectedValues.length > 0 && (
                    <Form.Text className="text-success d-block">
                        <i className="bi-check-lg me-1"></i>
                        {isSingleSelect 
                            ? 'Выбран 1 студент' 
                            : `Выбрано: ${selectedValues.length} студент(ов)`
                        }
                        {filteredOptions.length < allStudents.length && 
                            ` из ${filteredOptions.length} отфильтрованных`
                        }
                    </Form.Text>
                )}
                {searchTerm && (
                    <Form.Text className="text-info d-block">
                        <i className="bi-funnel me-1"></i>
                        Показано {filteredOptions.length} из {allStudents.length} студентов
                    </Form.Text>
                )}
            </div>
        </div>
    );
};

export default MultiselectStudents;