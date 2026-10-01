import React from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import SearchAndFilters from './SearchAndFilters';
import Pagination from './Pagination';
import TableCell from './TableCell';
import { formatFio } from '../utils/dataHelpers';
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
    itemsPerPage = ITEMS_PER_PAGE
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
                        <th width="150">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {safeData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="text-center py-5">
                                <i className="bi-database fa-3x text-muted mb-3"></i>
                                <p className="text-muted fs-5">Нет данных для отображения</p>
                                <p className="text-muted">
                                    {searchTerm ? 'Попробуйте изменить условия поиска' : 'Добавьте данные через кнопку "Добавить запись"'}
                                </p>
                            </td>
                        </tr>
                    ) : (
                        safeData.map((item, index) => {
                            // Вычисляем порядковый номер с учетом пагинации
                            const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                            
                            return (
                                <tr key={item.id}>
                                    {columns.map(col => {
                                        // Для колонки ID показываем порядковый номер
                                        if (col.key === 'id') {
                                            return (
                                                <td key={col.key}>
                                                    <span className="text-muted">{rowNumber}</span>
                                                </td>
                                            );
                                        }
                                        
                                        // Специальная обработка для длительности обучения
                                        if (col.key === 'duration') {
                                            return (
                                                <td key={col.key}>
                                                    <TableCell 
                                                        value={null} 
                                                        columnKey={col.key} 
                                                        item={item} 
                                                    />
                                                </td>
                                            );
                                        }
                                        
                                        // Специальная обработка для курса
                                        if (col.key === 'course') {
                                            return (
                                                <td key={col.key}>
                                                    <TableCell 
                                                        value={null} 
                                                        columnKey={col.key} 
                                                        item={item} 
                                                    />
                                                </td>
                                            );
                                        }
                                        
                                        // Специальная обработка для куратора
                                        if (col.key === 'supervisor') {
                                            const supervisor = item.supervisor;
                                            if (supervisor && supervisor.teacher) {
                                                const teacher = supervisor.teacher;
                                                return (
                                                    <td key={col.key}>
                                                        {formatFio(teacher)}
                                                    </td>
                                                );
                                            }
                                            return <td key={col.key}>-</td>;
                                        }
                                        
                                        // Специальная обработка для студентов в заявках
                                        if (col.key === 'students') {
                                            const students = item.students;
                                            if (students && Array.isArray(students) && students.length > 0) {
                                                const studentNames = students.map(student =>
                                                    formatFio(student)
                                                ).join(', ');
                                                return (
                                                    <td key={col.key} title={studentNames}>
                                                        {studentNames.length > 50 ? studentNames.substring(0, 50) + '...' : studentNames}
                                                    </td>
                                                );
                                            }
                                            return <td key={col.key}>-</td>;
                                        }
                                        
                                        // Для полей с ID показываем названия/ФИО
                                        if (col.key === 'groupId' || col.key === 'specialtyId' || 
                                            col.key === 'teacherId' || col.key === 'userId' || 
                                            col.key === 'documentId') {
                                            return (
                                                <td key={col.key}>
                                                    {getNameById(col.key, item[col.key])}
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={col.key}>
                                                <TableCell 
                                                    value={item[col.key]} 
                                                    columnKey={col.key} 
                                                    item={item} 
                                                />
                                            </td>
                                        );
                                    })}
                                    <td>
                                        <div className="d-flex">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => onEdit(item)}
                                                className="me-2"
                                                title="Редактировать"
                                            >
                                                <i className="bi-pencil-square"></i>
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => onDelete(item)}
                                                title="Удалить"
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