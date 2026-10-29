import React from 'react';
import { Tabs, Tab, Button } from 'react-bootstrap';
import { TABLE_COLUMNS } from '../utils/tableConfig';
import TableContent from './TableContent';

const TABS = [
    {
        key: 'users',
        label: 'Пользователи',
        icon: 'bi-person-circle',
    },
    {
        key: 'students',
        label: 'Студенты',
        icon: 'bi-mortarboard',
        getExtraProps: (props) => ({
            onSearch: props.handleStudentSearch,
            selectedGroupFilter: props.selectedGroupFilter,
            onGroupFilterChange: props.handleGroupFilterChange,
            groups: props.groups,
            selectedStudentStatusFilter: props.selectedStudentStatusFilter,
            onStudentStatusFilterChange: props.handleStudentStatusFilterChange,
        }),
    },
    {
        key: 'groups',
        label: 'Группы',
        icon: 'bi-collection',
        getExtraProps: (props) => ({
            selectedSpecialtyFilter: props.selectedSpecialtyFilter,
            onSpecialtyFilterChange: props.handleSpecialtyFilterChange,
            specialties: props.specialties,
        }),
    },
    {
        key: 'specialties',
        label: 'Специальности',
        icon: 'bi-award',
    },
    {
        key: 'teachers',
        label: 'Преподаватели',
        icon: 'bi-person-badge',
    },
];

const DataManagement = (props) => {
    const {
        activeTab,
        handleTabChange,
        currentItems,
        isLoading,
        handleEdit,
        handleDelete,
        setSearchTerm,
        searchTerm,
        currentPage,
        totalPages,
        setCurrentPage,
        filteredData,
        getNameByIdWithData,
        handleCreate,
        loadTableData,
        itemsPerPage,
        sortConfig,
        handleSort
    } = props;

    const getTableColumns = TABLE_COLUMNS[activeTab] || [];

    return (
        <div className="data-management">
            <h4 className="mb-4">
                <i className="bi-database me-2"></i>
                Управление данными
            </h4>

            <Tabs
                activeKey={activeTab}
                onSelect={handleTabChange}
                className="admin-tabs mb-4"
            >
                {TABS.map(tab => (
                    <Tab
                        key={tab.key}
                        eventKey={tab.key}
                        title={
                            <div className="d-flex align-items-center">
                                <i className={`${tab.icon} me-2`}></i>
                                <span>{tab.label}</span>
                            </div>
                        }
                    >
                        <TableContent
                            data={currentItems}
                            columns={getTableColumns}
                            loading={isLoading}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onSearch={setSearchTerm}
                            searchTerm={searchTerm}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredData.length}
                            itemsPerPage={itemsPerPage}
                            getNameById={getNameByIdWithData}
                            tableType={tab.key}
                            onAdd={handleCreate}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            {...(tab.getExtraProps ? tab.getExtraProps(props) : {})}
                        />
                    </Tab>
                ))}
            </Tabs>

            <div className="action-buttons mt-4">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="me-3"
                >
                    <i className="bi-plus-lg me-2"></i>
                    Добавить запись
                </Button>

                <Button
                    variant="outline-secondary"
                    size="lg"
                    onClick={() => loadTableData(activeTab)}
                    disabled={isLoading}
                >
                    <i className="bi-arrow-clockwise me-2"></i>
                    Обновить
                </Button>
            </div>
        </div>
    );
};

export default DataManagement;
