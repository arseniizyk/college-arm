import React, { useContext, useState } from 'react';
import './Admin.css';
import { observer } from 'mobx-react-lite';
import { Container, Tabs, Tab, Alert } from 'react-bootstrap';
import { Context } from '../index';
import { useAdminLogic } from '../hooks/useAdminLogic';
import DataManagement from '../components/DataManagement';
import DocumentsGeneration from '../components/DocumentsGeneration';
import CRUDModal from '../components/CRUDModal';
import Breadcrumbs from '../components/Breadcrumbs';
import { ADMIN_ROUTE } from '../utils/consts';

const MAIN_TAB_TITLES = {
    data: 'Управление данными',
    documents: 'Генерация документов'
};

const Admin = observer(() => {
    const { data, user } = useContext(Context);
    const [mainTab, setMainTab] = useState('data');
    
    const {
        // Состояния
        activeTab,
        error,
        success,
        userRole,
        showModal,
        modalType,
        currentItem,
        formData,
        currentPage,
        searchTerm,
        selectedGroupFilter,
        selectedSpecialtyFilter,
        selectedStudentStatusFilter,
        currentItems,
        totalPages,
        itemsPerPage,
        filteredData,
        isLoading,
        tableError,

        // Сеттеры
        setError,
        setSuccess,
        setShowModal,
        setFormData,
        setCurrentPage,
        setSearchTerm,

        // Обработчики
        handleCreate,
        handleEdit,
        handleDelete,
        handleFormSubmit,
        handleTabChange,
        handleStudentSearch,
        handleGroupFilterChange,
        handleSpecialtyFilterChange,
        handleStudentStatusFilterChange,
        loadTableData,
        getNameByIdWithData,
        sortConfig,
        handleSort
    } = useAdminLogic(data, user);

    const breadcrumbItems = [
        { label: 'Панель управления', path: ADMIN_ROUTE, icon: 'bi-gear', active: mainTab === 'data', onClick: mainTab !== 'data' ? () => setMainTab('data') : undefined }
    ];

    if (mainTab !== 'data') {
        breadcrumbItems.push({
            label: MAIN_TAB_TITLES[mainTab] || 'Раздел',
            active: true
        });
    }

    return (
        <Container fluid className="admin-panel">
            <div className="admin-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                <h1 className="d-flex align-items-center mb-0">
                    <i className="bi-gear me-2"></i>
                    Административная панель
                </h1>
            </div>

            <div className="admin-content">
                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible>
                        <i className="bi-exclamation-circle me-2"></i>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                        <i className="bi-check-circle me-2"></i>
                        {success}
                    </Alert>
                )}

                {tableError && (
                    <Alert variant="warning" onClose={() => data.clearError(activeTab)} dismissible>
                        <i className="bi-exclamation-triangle me-2"></i>
                        {tableError}
                    </Alert>
                )}

                <Breadcrumbs items={breadcrumbItems} />
                <Tabs
                    activeKey={mainTab}
                    onSelect={(k) => setMainTab(k)}
                    className="mb-4 main-admin-tabs"
                    variant="pills"
                >
                    <Tab 
                        eventKey="data" 
                        title={
                            <span className="px-3">
                                <i className="bi bi-database me-2"></i>
                                Данные
                            </span>
                        }
                    >
                        <DataManagement
                            activeTab={activeTab}
                            handleTabChange={handleTabChange}
                            currentItems={currentItems}
                            isLoading={isLoading}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            setSearchTerm={setSearchTerm}
                            searchTerm={searchTerm}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            setCurrentPage={setCurrentPage}
                            filteredData={filteredData}
                            getNameByIdWithData={getNameByIdWithData}
                            handleStudentSearch={handleStudentSearch}
                            selectedGroupFilter={selectedGroupFilter}
                            handleGroupFilterChange={handleGroupFilterChange}
                            groups={data.groups || []}
                            selectedStudentStatusFilter={selectedStudentStatusFilter}
                            handleStudentStatusFilterChange={handleStudentStatusFilterChange}
                            selectedSpecialtyFilter={selectedSpecialtyFilter}
                            handleSpecialtyFilterChange={handleSpecialtyFilterChange}
                            specialties={data.specialties || []}
                            handleCreate={handleCreate}
                            loadTableData={loadTableData}
                            itemsPerPage={itemsPerPage}
                            sortConfig={sortConfig}
                            handleSort={handleSort}
                        />
                    </Tab>

                    <Tab
                        eventKey="documents"
                        title={
                            <span className="px-3">
                                <i className="bi bi-file-earmark-plus me-2"></i>
                                Документы
                            </span>
                        }
                    >
                        <DocumentsGeneration />
                    </Tab>
                </Tabs>
            </div>

            <CRUDModal
                show={showModal}
                onHide={() => setShowModal(false)}
                type={modalType}
                item={currentItem}
                table={activeTab}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleFormSubmit}
                loading={isLoading}
                data={data}
                userRole={userRole}
            />
        </Container>
    );
});

export default Admin;
