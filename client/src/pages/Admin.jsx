import React, { useContext, useState, useEffect } from 'react';
import './Admin.css';
import { observer } from 'mobx-react-lite';
import { Container, Tabs, Tab, Alert } from 'react-bootstrap';
import { Context } from '../index';
import { useAdminLogic } from '../hooks/useAdminLogic';
import DataManagement from '../components/DataManagement';
import RequestsManagement from '../components/RequestsManagement';
import RequestStatistics from '../components/RequestStatistics';
import DocumentsGeneration from '../components/DocumentsGeneration';
import CRUDModal from '../components/CRUDModal';

const Admin = observer(() => {
    const { data, user } = useContext(Context);
    const [mainTab, setMainTab] = useState('data');
    
    // Подсчитываем количество новых заявок (со статусом in_progress и не просмотренные)
    const newRequestsCount = (data.requests || []).filter(req => req.status === 'in_progress' && !req.isViewed).length;
    
    // Автоматическое обновление заявок каждую минуту
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                // Получаем просмотренные заявки из localStorage
                const viewedRequestsStr = localStorage.getItem('viewedRequests');
                const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];
                
                // Обновляем заявки
                await data.fetchAll('requests');
                
                // Восстанавливаем статус просмотренных заявок
                viewedRequestIds.forEach(id => {
                    data.updateLocal('requests', id, { isViewed: true });
                });
            } catch (err) {
                console.error('Ошибка автообновления заявок:', err);
            }
        }, 60000); // 60000 мс = 1 минута

        return () => clearInterval(intervalId);
    }, [data]);
    
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
        selectedRoleFilter,
        selectedStatusFilter,
        selectedSpecialtyFilter,
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
        handleRoleFilterChange,
        handleStatusFilterChange,
        handleSpecialtyFilterChange,
        handleRequestStatusChange,
        loadTableData,
        getNameByIdWithData
    } = useAdminLogic(data, user);

    return (
        <Container fluid className="admin-panel">
            <div className="admin-header text-center mb-4">
                <h1 className="mb-2">
                    <i className="bi-gear me-3"></i>
                    Административная панель
                </h1>
                <p className="text-white fs-5">Управление данными системы и обработка заявок</p>
            </div>

            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <i className="bi-exclamation-circle me-2"></i>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                    <i className="bi-check-lg-circle me-2"></i>
                    {success}
                </Alert>
            )}

            {tableError && (
                <Alert variant="warning" onClose={() => data.clearError(activeTab)} dismissible>
                    <i className="bi-exclamation-triangle me-2"></i>
                    {tableError}
                </Alert>
            )}

            <div className="admin-content">
                <Tabs
                    activeKey={mainTab}
                    onSelect={(k) => setMainTab(k)}
                    className="mb-4"
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
                            selectedRoleFilter={selectedRoleFilter}
                            handleRoleFilterChange={handleRoleFilterChange}
                            selectedStatusFilter={selectedStatusFilter}
                            handleStatusFilterChange={handleStatusFilterChange}
                            selectedSpecialtyFilter={selectedSpecialtyFilter}
                            handleSpecialtyFilterChange={handleSpecialtyFilterChange}
                            specialties={data.specialties || []}
                            handleCreate={handleCreate}
                            loadTableData={loadTableData}
                            itemsPerPage={itemsPerPage}
                        />
                    </Tab>

                    <Tab 
                        eventKey="requests" 
                        title={
                            <span className="px-3 d-flex align-items-center">
                                <i className="bi bi-clipboard-check me-2"></i>
                                Обработка заявок
                                {newRequestsCount > 0 && (
                                    <span className="badge bg-danger ms-2 rounded-pill d-flex align-items-center justify-content-center" style={{ minWidth: '24px', height: '24px' }}>
                                        {newRequestsCount}
                                    </span>
                                )}
                            </span>
                        }
                    >
                        <RequestsManagement
                            requests={data.requests || []}
                            loading={isLoading}
                            onStatusChange={handleRequestStatusChange}
                            getNameById={getNameByIdWithData}
                            error={error}
                            success={success}
                            onViewUpdate={(requestId) => {
                                data.updateLocal('requests', requestId, { isViewed: true });
                                // Сохраняем в localStorage
                                const viewedRequestsStr = localStorage.getItem('viewedRequests');
                                const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];
                                if (!viewedRequestIds.includes(requestId)) {
                                    viewedRequestIds.push(requestId);
                                    localStorage.setItem('viewedRequests', JSON.stringify(viewedRequestIds));
                                }
                            }}
                        />
                    </Tab>

                    <Tab 
                        eventKey="statistics" 
                        title={
                            <span className="px-3">
                                <i className="bi bi-bar-chart me-2"></i>
                                Статистика
                            </span>
                        }
                    >
                        <RequestStatistics
                            requests={data.requests || []}
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