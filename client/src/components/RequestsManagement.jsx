import React, { useState, useMemo } from 'react';
import { Form, InputGroup, Row, Col, Alert, Spinner } from 'react-bootstrap';
import RequestCard from './RequestCard';
import Pagination from './Pagination';
import { formatFio } from '../utils/dataHelpers';
import { ITEMS_PER_PAGE } from '../utils/consts';
import { REQUEST_STATUSES, STATUS_KEYS, countByStatus, statusLabel, statusPriority } from '../utils/requestStatus';

const RequestsManagement = ({ 
    requests, 
    loading, 
    onStatusChange, 
    getNameById,
    error,
    success,
    onViewUpdate
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = ITEMS_PER_PAGE; // Количество заявок на странице

    // Фильтрация заявок
    const filteredRequests = useMemo(() => {
        let filtered = [...(requests || [])]; // Создаем копию массива

        // Фильтр по статусу
        if (statusFilter) {
            filtered = filtered.filter(req => req.status === statusFilter);
        }

        // Поиск по описанию или ID
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(req => {
                const matchesId = req.id.toString().includes(searchLower);
                const matchesDescription = req.description?.toLowerCase().includes(searchLower);
                const matchesDocument = req.document?.document_name?.toLowerCase().includes(searchLower);
                const matchesStudent = req.students?.some(student => {
                    const fullName = formatFio(student, { lowercase: true });
                    return fullName.includes(searchLower);
                });
                
                return matchesId || matchesDescription || matchesDocument || matchesStudent;
            });
        }

        // Сортировка: заявки в обработке всегда сверху, затем завершенные, затем отменённые
        filtered.sort((a, b) => {
            // Определяем приоритет статуса (меньше = выше)
            const aPriority = statusPriority(a.status);
            const bPriority = statusPriority(b.status);
            
            // Сначала сортируем по приоритету
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // Если приоритеты равны - сортируем по дате создания (новые сверху)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return filtered;
    }, [requests, searchTerm, statusFilter]);

    // Пагинация
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRequests = filteredRequests.slice(startIndex, endIndex);

    // Сброс на первую страницу при изменении фильтров
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    // Группировка по статусам для статистики
    const statistics = useMemo(() => ({
        total: requests?.length || 0,
        ...countByStatus(requests)
    }), [requests]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Загрузка заявок...</p>
            </div>
        );
    }

    return (
        <div className="requests-management">
            {/* Заголовок и статистика */}
            <div className="mb-4">
                <h4 className="mb-3">
                    <i className="bi-clipboard-check me-2"></i>
                    Обработка заявок
                </h4>
                
                {/* Статистика */}
                <Row className="mb-4">
                    <Col md={3}>
                        <div className="p-3 bg-light rounded text-center">
                            <h3 className="mb-0 text-primary">{statistics.total}</h3>
                            <small className="text-muted">Всего заявок</small>
                        </div>
                    </Col>
                    {STATUS_KEYS.map(key => (
                        <Col md={3} key={key}>
                            <div className={`p-3 bg-${REQUEST_STATUSES[key].badge} bg-opacity-10 rounded text-center`}>
                                <h3 className={`mb-0 text-${REQUEST_STATUSES[key].badge}`}>{statistics[key]}</h3>
                                <small className="text-muted">{statusLabel(key)}</small>
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* Уведомления */}
            {error && (
                <Alert variant="danger" dismissible>
                    <i className="bi-exclamation-circle me-2"></i>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" dismissible>
                    <i className="bi-check-lg-circle me-2"></i>
                    {success}
                </Alert>
            )}

            {/* Фильтры и поиск */}
            <div className="mb-4">
                <Row>
                    <Col md={8}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi-search"></i>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Поиск по ID, описанию, документу или студенту..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </Col>
                    <Col md={4}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi-funnel"></i>
                            </InputGroup.Text>
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Все статусы</option>
                                {STATUS_KEYS.map(key => (
                                    <option key={key} value={key}>{statusLabel(key)}</option>
                                ))}
                            </Form.Select>
                        </InputGroup>
                    </Col>
                </Row>
            </div>

            {/* Список заявок */}
            <div className="requests-list">
                {currentRequests.length > 0 ? (
                    <>
                        <div className="mb-3 d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                                Показано заявок: {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} из {filteredRequests.length}
                                {filteredRequests.length !== statistics.total && ` (всего: ${statistics.total})`}
                            </small>
                            <small className="text-muted">
                                Страница {currentPage} из {totalPages}
                            </small>
                        </div>
                        {currentRequests.map(request => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                onStatusChange={onStatusChange}
                                getNameById={getNameById}
                                onViewUpdate={onViewUpdate}
                            />
                        ))}

                        {/* Пагинация */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                ) : (
                    <div className="text-center py-5">
                        <i className="bi-inbox fa-3x text-muted mb-3"></i>
                        <h5 className="text-muted">Заявки не найдены</h5>
                        <p className="text-muted">
                            {searchTerm || statusFilter 
                                ? 'Попробуйте изменить условия поиска или фильтрации'
                                : 'Нет заявок для отображения'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestsManagement;
