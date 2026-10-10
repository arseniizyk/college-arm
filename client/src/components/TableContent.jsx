import React from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import SearchAndFilters from './SearchAndFilters';
import Pagination from './Pagination';
import TableCell from './TableCell';
import { ITEMS_PER_PAGE } from '../utils/consts';

const TableContent = ({
    data,
    columns,
    loading,
    onEdit,
    onDelete,
    onSearch,
    searchTerm,
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    getNameById,
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
    itemsPerPage = ITEMS_PER_PAGE,
    onAdd
}) => {
    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Загрузка данных...</p>
            </div>
        );
    }

    // Гарантируем, что data - это массив
    const safeData = Array.isArray(data) ? data : [];

    const hasActiveFilters = Boolean(
        searchTerm ||
        selectedGroupFilter ||
        selectedRoleFilter ||
        selectedStatusFilter ||
        selectedSpecialtyFilter
    );

    const handleResetFilters = () => {
        if (onSearch) onSearch('');
        if (onGroupFilterChange) onGroupFilterChange('');
        if (onRoleFilterChange) onRoleFilterChange('');
        if (onStatusFilterChange) onStatusFilterChange('');
        if (onSpecialtyFilterChange) onSpecialtyFilterChange('');
    };

    return (
        <div className="table-container">
            <SearchAndFilters
                searchTerm={searchTerm}
                onSearch={onSearch}
                tableType={tableType}
                selectedGroupFilter={selectedGroupFilter}
                onGroupFilterChange={onGroupFilterChange}
                groups={groups}
                selectedRoleFilter={selectedRoleFilter}
                onRoleFilterChange={onRoleFilterChange}
                selectedStatusFilter={selectedStatusFilter}
                onStatusFilterChange={onStatusFilterChange}
                selectedSpecialtyFilter={selectedSpecialtyFilter}
                onSpecialtyFilterChange={onSpecialtyFilterChange}
                specialties={specialties}
                totalItems={totalItems}
                currentPage={currentPage}
                totalPages={totalPages}
            />

            <Table striped hover responsive className="admin-table">
                <thead className="table-dark">
                    <tr>
                        {columns.map(col => (
                            <th key={col.key}>{col.label}</th>
                        ))}
                        <th style={{ minWidth: '110px', width: '110px' }}>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {safeData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="text-center py-5">
                                {hasActiveFilters ? (
                                    <>
                                        <i className="bi bi-search fs-1 text-muted mb-3 d-block"></i>
                                        <p className="text-muted fs-5 mb-1">Ничего не найдено</p>
                                        <p className="text-muted mb-3">
                                            Попробуйте изменить поисковый запрос или сбросить фильтры
                                        </p>
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={handleResetFilters}
                                        >
                                            <i className="bi bi-x-circle me-1"></i>
                                            Сбросить фильтры и поиск
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                                        <p className="text-muted fs-5 mb-1">Нет записей</p>
                                        <p className="text-muted mb-3">
                                            В этом разделе пока нет добавленных данных
                                        </p>
                                        {onAdd && (
                                            <Button variant="primary" size="sm" onClick={onAdd}>
                                                <i className="bi bi-plus-lg me-1"></i>
                                                Добавить запись
                                            </Button>
                                        )}
                                    </>
                                )}
                            </td>
                        </tr>
                    ) : (
                        safeData.map((item, index) => {
                            // Вычисляем порядковый номер с учетом пагинации
                            const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                            // То, что не берётся из строки: номер для колонки «№»
                            // и подстановка названий вместо чужих id.
                            const context = { rowNumber, names: getNameById };

                            return (
                                <tr key={item.id}>
                                    {columns.map(col => (
                                        <td key={col.key}>
                                            <TableCell
                                                column={col}
                                                item={item}
                                                context={context}
                                            />
                                        </td>
                                    ))}
                                    <td>
                                        <div className="action-buttons-cell">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => onEdit(item)}
                                                title="Редактировать"
                                                aria-label="Редактировать запись"
                                            >
                                                <i className="bi-pencil-square"></i>
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => onDelete(item)}
                                                title="Удалить"
                                                aria-label="Удалить запись"
                                            >
                                                <i className="bi-trash"></i>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </Table>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />
        </div>
    );
};

export default TableContent;