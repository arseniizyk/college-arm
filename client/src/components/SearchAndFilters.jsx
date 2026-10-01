import React, { useState, useEffect } from 'react';
import { InputGroup, FormControl, Form, Badge } from 'react-bootstrap';
import { MISSING_SPECIALTY_FILTER, MISSING_SPECIALTY_LABEL } from '../utils/dataHelpers';
import { STATUS_KEYS, statusLabel } from '../utils/requestStatus';

const SearchAndFilters = ({
    searchTerm,
    onSearch,
    tableType,
    selectedGroupFilter,
    onGroupFilterChange,
    groups,
    selectedRoleFilter,
    onRoleFilterChange,
    selectedStatusFilter,
    onStatusFilterChange,
    selectedSpecialtyFilter,
    onSpecialtyFilterChange,
    specialties,
    totalItems,
    currentPage,
    totalPages
}) => {
    // Локальные состояния для фильтров
    const [displayGroupFilter, setDisplayGroupFilter] = useState(selectedGroupFilter || '');
    const [displayRoleFilter, setDisplayRoleFilter] = useState(selectedRoleFilter || '');
    const [displayStatusFilter, setDisplayStatusFilter] = useState(selectedStatusFilter || '');
    const [displaySpecialtyFilter, setDisplaySpecialtyFilter] = useState(selectedSpecialtyFilter || '');

    // Синхронизируем локальные состояния с пропсами
    useEffect(() => {
        setDisplayGroupFilter(selectedGroupFilter || '');
    }, [selectedGroupFilter]);

    useEffect(() => {
        setDisplayRoleFilter(selectedRoleFilter || '');
    }, [selectedRoleFilter]);

    useEffect(() => {
        setDisplayStatusFilter(selectedStatusFilter || '');
    }, [selectedStatusFilter]);

    useEffect(() => {
        setDisplaySpecialtyFilter(selectedSpecialtyFilter || '');
    }, [selectedSpecialtyFilter]);

    // Обработчик изменения поиска (синхронный)
    const handleSearchChange = (value) => {
        onSearch(value);
    };

    // Обработчики изменения фильтров
    const handleGroupFilterChange = (value) => {
        setDisplayGroupFilter(value);
        if (onGroupFilterChange) {
            onGroupFilterChange(value);
        }
    };

    const handleRoleFilterChange = (value) => {
        setDisplayRoleFilter(value);
        if (onRoleFilterChange) {
            onRoleFilterChange(value);
        }
    };

    const handleStatusFilterChange = (value) => {
        setDisplayStatusFilter(value);
        if (onStatusFilterChange) {
            onStatusFilterChange(value);
        }
    };

    const handleSpecialtyFilterChange = (value) => {
        setDisplaySpecialtyFilter(value);
        if (onSpecialtyFilterChange) {
            onSpecialtyFilterChange(value);
        }
    };

    // Определяем плейсхолдер для поиска
    const getSearchPlaceholder = () => {
        switch (tableType) {
            case 'students':
            case 'teachers':
                return 'Поиск по ФИО...';
            case 'users':
                return 'Поиск по email...';
            case 'documents':
                return 'Поиск по названию...';
            case 'groups':
                return 'Поиск по номеру группы...';
            case 'specialties':
                return 'Поиск по названию...';
            case 'requests':
                return 'Поиск по описанию...';
            default:
                return 'Поиск...';
        }
    };

    // Определяем нужны ли фильтры для текущей таблицы
    const hasFilters = tableType === 'students' || tableType === 'users' || 
                       tableType === 'requests' || tableType === 'groups';

    return (
        <div className="d-flex justify-content-between align-items-center mb-4 search-and-filters-container">
            <div className="search-controls d-flex gap-3" style={{ width: hasFilters ? '700px' : '300px', maxWidth: '100%' }}>
                {/* Поле поиска */}
                <div className="search-box" style={{ flex: hasFilters ? '2' : '1', minWidth: '200px' }}>
                    <InputGroup>
                        <InputGroup.Text>
                            <i className="bi-search"></i>
                        </InputGroup.Text>
                        <FormControl
                            placeholder={getSearchPlaceholder()}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </InputGroup>
                </div>
                
                {/* Фильтр по группам (для студентов) */}
                {tableType === 'students' && groups && (
                    <div className="group-filter" style={{ flex: '1', minWidth: '150px' }}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi-people-fill"></i>
                            </InputGroup.Text>
                            <Form.Select
                                value={displayGroupFilter}
                                onChange={(e) => handleGroupFilterChange(e.target.value)}
                            >
                                <option value="">Все группы</option>
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.group_number}
                                    </option>
                                ))}
                            </Form.Select>
                        </InputGroup>
                    </div>
                )}

                {/* Фильтр по ролям (для пользователей) */}
                {tableType === 'users' && (
                    <div className="role-filter" style={{ flex: '1', minWidth: '150px' }}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi-person-badge"></i>
                            </InputGroup.Text>
                            <Form.Select
                                value={displayRoleFilter}
                                onChange={(e) => handleRoleFilterChange(e.target.value)}
                            >
                                <option value="">Все роли</option>
                                <option value="USER">Пользователь</option>
                                <option value="TEACHER">Преподаватель</option>
                                <option value="ADMIN">Администратор</option>
                            </Form.Select>
                        </InputGroup>
                    </div>
                )}

                {/* Фильтр по статусам (для заявок) */}
                {tableType === 'requests' && (
                    <div className="status-filter" style={{ flex: '1', minWidth: '150px' }}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi-flag"></i>
                            </InputGroup.Text>
                            <Form.Select
                                value={displayStatusFilter}
                                onChange={(e) => handleStatusFilterChange(e.target.value)}
                            >
                                <option value="">Все статусы</option>
                                {STATUS_KEYS.map(key => (
                                    <option key={key} value={key}>{statusLabel(key)}</option>
                                ))}
                            </Form.Select>
                        </InputGroup>
                    </div>
                )}

                {/* Фильтр по специальностям (для групп) */}
                {tableType === 'groups' && specialties && (
                    <div className="specialty-filter" style={{ flex: '1', minWidth: '150px' }}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi-mortarboard"></i>
                            </InputGroup.Text>
                            <Form.Select
                                value={displaySpecialtyFilter}
                                onChange={(e) => handleSpecialtyFilterChange(e.target.value)}
                            >
                                <option value="">Все специальности</option>
                                {specialties.map(spec => (
                                    <option key={spec.id} value={spec.id}>
                                        {spec.name}
                                    </option>
                                ))}
                                {/* Группы с удалённой специальностью (specialtyId = null)
                                    иначе не попадают ни под один фильтр и пропадают из таблицы */}
                                <option value={MISSING_SPECIALTY_FILTER}>
                                    {MISSING_SPECIALTY_LABEL}
                                </option>
                            </Form.Select>
                        </InputGroup>
                    </div>
                )}
            </div>
            
            <div className="d-flex align-items-center info-section">
                <span className="text-muted me-3 total-items">
                    Всего записей: <strong>{totalItems}</strong>
                </span>
                <Badge bg="info" className="page-badge">
                    Страница {currentPage} из {totalPages}
                </Badge>
            </div>
        </div>
    );
};

export default SearchAndFilters;