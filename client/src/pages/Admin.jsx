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
import Breadcrumbs from '../components/Breadcrumbs';
import { MAIN_ROUTE } from '../utils/consts';
import { notify } from '../context/ToastContext';

const MAIN_TAB_TITLES = {
    data: 'Управление данными',
    requests: 'Обработка заявок',
    statistics: 'Статистика',
    documents: 'Генерация приказов'
};

const Admin = observer(() => {
    const { data, user } = useContext(Context);
    const [mainTab, setMainTab] = useState('data');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Подсчитываем количество новых заявок (в обработке и ещё не просмотренные)
    const newRequestsCount = (data.getEntities('requests') || []).filter(req => req.status === 'pending' && !req.isViewed).length;
    
    // Автоматическое обновление заявок каждую минуту
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                setIsSyncing(true);
                const prevCount = (data.getEntities('requests') || []).length;
                // Получаем просмотренные заявки из localStorage
                const viewedRequestsStr = localStorage.getItem('viewedRequests');
                const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];

                await data.fetchAll('requests', {}, { silent: true });

                // Восстанавливаем статус просмотренных заявок
                viewedRequestIds.forEach(id => {
                    data.updateLocal('requests', id, { isViewed: true });
                });

                const newCount = (data.getEntities('requests') || []).length;
                if (newCount > prevCount) {
                    const diff = newCount - prevCount;
                    notify({
                        title: 'Новые заявки',
                        message: `Поступили новые заявки (${diff} шт.)`,
                        variant: 'info'
                    });
                }
            } catch (err) {
                console.error('Ошибка автообновления заявок:', err);
            } finally {
                setTimeout(() => setIsSyncing(false), 1200);
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
        handleRoleFilterChange,
        handleStatusFilterChange,
        handleSpecialtyFilterChange,
        handleStudentStatusFilterChange,
        handleRequestStatusChange,
        loadTableData,
        getNameByIdWithData,
        sortConfig,
        handleSort
    } = useAdminLogic(data, user);

    const handleSwitchToRequestsCards = () => {
        setMainTab('requests');
    };

    const handleSwitchToRequestsTable = () => {
        setMainTab('data');
        handleTabChange('requests');
    };

    const breadcrumbItems = [
        { label: 'Главная', path: MAIN_ROUTE, icon: 'bi-house-door' },
        {
            label: 'Административная панель',
            icon: 'bi-gear',
            onClick: mainTab !== 'data' ? () => setMainTab('data') : undefined,
            active: mainTab === 'data'
        }
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
                <span
                    className="badge bg-white text-dark bg-opacity-75 shadow-sm fw-normal py-1 px-3 d-inline-flex align-items-center"
                    title="Периодическая фоновая проверка каждые 60 секунд"
                >
                    <i className={`bi bi-arrow-repeat me-1 ${isSyncing ? 'spin-icon text-primary' : 'text-muted'}`}></i>
                    {isSyncing ? 'Синхронизация данных...' : 'Данные синхронизированы'}
                </span>
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
                            onSwitchToRequestsCards={handleSwitchToRequestsCards}
                            sortConfig={sortConfig}
                            handleSort={handleSort}
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
                            requests={data.getEntities('requests')}
                            loading={data.isLoading('requests')}
                            onStatusChange={handleRequestStatusChange}
                            getNameById={getNameByIdWithData}
                            error={error}
                            success={success}
                            onSwitchToTable={handleSwitchToRequestsTable}
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
                            requests={data.getEntities('requests')}
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