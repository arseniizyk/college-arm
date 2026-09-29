import React from 'react';
import { Tabs, Tab, Button } from 'react-bootstrap';
import { TABLE_COLUMNS } from '../utils/tableConfig';
import TableContent from './TableContent';

const DataManagement = ({
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
    handleStudentSearch,
    selectedGroupFilter,
    handleGroupFilterChange,
    groups,
    selectedRoleFilter,
    handleRoleFilterChange,
    selectedStatusFilter,
    handleStatusFilterChange,
    selectedSpecialtyFilter,
    handleSpecialtyFilterChange,
    specialties,
    handleCreate,
    loadTableData
}) => {
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
                <Tab eventKey="users" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-people me-2"></i>
                        <span>Пользователи</span>
                    </div>
                }>
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
                        getNameById={getNameByIdWithData}
                        tableType="users"
                        selectedRoleFilter={selectedRoleFilter}
                        onRoleFilterChange={handleRoleFilterChange}
                    />
                </Tab>

                <Tab eventKey="students" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-mortarboard me-2"></i>
                        <span>Студенты</span>
                    </div>
                }>
                    <TableContent
                        data={currentItems}
                        columns={getTableColumns}
                        loading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSearch={handleStudentSearch}
                        searchTerm={searchTerm}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredData.length}
                        getNameById={getNameByIdWithData}
                        tableType="students"
                        selectedGroupFilter={selectedGroupFilter}
                        onGroupFilterChange={handleGroupFilterChange}
                        groups={groups}
                    />
                </Tab>

                <Tab eventKey="groups" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-people-fill me-2"></i>
                        <span>Группы</span>
                    </div>
                }>
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
                        getNameById={getNameByIdWithData}
                        tableType="groups"
                        selectedSpecialtyFilter={selectedSpecialtyFilter}
                        onSpecialtyFilterChange={handleSpecialtyFilterChange}
                        specialties={specialties}
                    />
                </Tab>

                <Tab eventKey="specialties" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-award me-2"></i>
                        <span>Специальности</span>
                    </div>
                }>
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
                        getNameById={getNameByIdWithData}
                        tableType="specialties"
                    />
                </Tab>

                <Tab eventKey="teachers" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-person-badge me-2"></i>
                        <span>Преподаватели</span>
                    </div>
                }>
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
                        getNameById={getNameByIdWithData}
                        tableType="teachers"
                    />
                </Tab>

                <Tab eventKey="documents" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-file-earmark-text me-2"></i>
                        <span>Документы</span>
                    </div>
                }>
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
                        getNameById={getNameByIdWithData}
                        tableType="documents"
                    />
                </Tab>

                <Tab eventKey="requests" title={
                    <div className="d-flex align-items-center">
                        <i className="bi-clipboard-check me-2"></i>
                        <span>Заявки</span>
                    </div>
                }>
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
                        getNameById={getNameByIdWithData}
                        tableType="requests"
                        selectedStatusFilter={selectedStatusFilter}
                        onStatusFilterChange={handleStatusFilterChange}
                    />
                </Tab>
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