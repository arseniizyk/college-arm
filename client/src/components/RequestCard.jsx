import React, { useState } from 'react';
import { Card, Badge, Button, Collapse, ListGroup, Row, Col } from 'react-bootstrap';
import { calculateCourse } from '../utils/dataHelpers';

const StudentDetailsItem = ({ student, index, getNameById }) => {
    const [showDetails, setShowDetails] = useState(false);

    const toggleDetails = (e) => {
        e.stopPropagation();
        setShowDetails(!showDetails);
    };

    // Вычисляем курс студента
    const course = student.group?.enroll_date && student.group?.specialty
        ? calculateCourse(
            student.group.enroll_date,
            student.group.specialty.duration_years || 4,
            student.group.specialty.duration_months || 0
        )
        : null;

    return (
        <ListGroup.Item className="border-start border-primary border-3">
            <div className="d-flex justify-content-between align-items-center">
                <div className="flex-grow-1">
                    {/* Заголовок - кликабельный */}
                    <div 
                        className="fw-bold text-dark mb-1"
                        onClick={toggleDetails}
                        style={{ cursor: 'pointer' }}
                    >
                        <i className="bi-person-fill me-2"></i>
                        {index + 1}. {student.last_name} {student.name} {student.father_name || ''}
                    </div>

                    {/* Сворачиваемая дополнительная информация */}
                    <Collapse in={showDetails}>
                        <div className="mt-2 pt-2 border-top">
                            {/* Группа и курс */}
                            <div className="mb-2">
                                <small className="text-muted">
                                    <i className="bi-people-fill me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                    <strong>Группа:</strong> {student.group?.group_number || getNameById('groupId', student.groupId)}
                                    {course && ` (${course === 'Выпускник' ? course : `${course} курс`})`}
                                </small>
                            </div>

                            {/* Специальность и квалификация */}
                            {student.group?.specialty && (
                                <>
                                    <div className="mb-2">
                                        <small className="text-muted">
                                            <i className="bi-mortarboard me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                            <strong>Специальность:</strong> {student.group.specialty.name}
                                        </small>
                                    </div>
                                    <div className="mb-2">
                                        <small className="text-muted">
                                            <i className="bi-award me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                            <strong>Квалификация:</strong> {student.group.specialty.qualification}
                                        </small>
                                    </div>
                                </>
                            )}

                            {/* Номер приказа */}
                            {student.order_number && (
                                <div className="mb-2">
                                    <small className="text-muted">
                                        <i className="bi-file-earmark-text me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                        <strong>Приказ:</strong> {student.order_number}
                                    </small>
                                </div>
                            )}

                            {/* Дата зачисления */}
                            {student.enroll_date && (
                                <div className="mb-2">
                                    <small className="text-muted">
                                        <i className="bi-calendar-check me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                        <strong>Зачислен:</strong> {new Date(student.enroll_date).toLocaleDateString('ru-RU', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </small>
                                </div>
                            )}

                            {/* Дата отчисления */}
                            {student.expell_date && (
                                <div className="mb-2">
                                    <small className="text-danger">
                                        <i className="bi-calendar-x me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                        <strong>Отчислен:</strong> {new Date(student.expell_date).toLocaleDateString('ru-RU', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </small>
                                </div>
                            )}

                            {/* Даты создания и обновления записи */}
                            {student.createdAt && (
                                <div className="mb-2">
                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        <i className="bi-clock-history me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                        <strong>Создан:</strong> {new Date(student.createdAt).toLocaleDateString('ru-RU')}
                                    </small>
                                </div>
                            )}

                            {student.updatedAt && student.updatedAt !== student.createdAt && (
                                <div className="mb-2">
                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        <i className="bi-arrow-clockwise me-2" style={{ width: '16px', display: 'inline-block' }}></i>
                                        <strong>Обновлен:</strong> {new Date(student.updatedAt).toLocaleDateString('ru-RU')}
                                    </small>
                                </div>
                            )}
                        </div>
                    </Collapse>
                </div>

                {/* Кнопка раскрытия */}
                <Button
                    variant="link"
                    size="sm"
                    className="text-muted p-0 ms-2 align-self-start"
                    onClick={toggleDetails}
                    title={showDetails ? "Скрыть детали" : "Показать детали"}
                    style={{ minWidth: '30px' }}
                >
                    <i className={`bi-chevron-${showDetails ? 'up' : 'down'}`}></i>
                </Button>
            </div>
        </ListGroup.Item>
    );
};

const RequestCard = ({ request, onStatusChange, getNameById, onViewUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [isViewed, setIsViewed] = useState(request.isViewed || false);

    const statusColors = {
        in_progress: 'info',
        completed: 'success',
        rejected: 'danger'
    };

    const statusTranslations = {
        in_progress: 'В обработке',
        completed: 'Завершено',
        rejected: 'Отклонено'
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleToggleExpand = async () => {
        const newExpandedState = !expanded;
        setExpanded(newExpandedState);
        
        // Если раскрываем заявку и она еще не просмотрена, помечаем как просмотренную
        if (newExpandedState && !isViewed && request.status === 'in_progress') {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/request/${request.id}/view`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    setIsViewed(true);
                    // Обновляем только эту заявку локально, без перезагрузки всех данных
                    if (onViewUpdate) {
                        onViewUpdate(request.id);
                    }
                }
            } catch (error) {
                console.error('Ошибка при пометке заявки как просмотренной:', error);
            }
        }
    };

    const handleStatusChange = (newStatus) => {
        if (onStatusChange) {
            onStatusChange(request.id, newStatus);
        }
    };

    const handleGenerateDocument = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/generate/study-certificate/${request.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка генерации документа');
            }

            // Получаем blob из ответа
            const blob = await response.blob();
            
            // Создаем ссылку для скачивания
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Справка_об_обучении_${request.id}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Ошибка при генерации документа:', error);
            alert('Ошибка при генерации документа');
        } finally {
            setGenerating(false);
        }
    };

    // Проверяем, является ли это справкой об обучении
    const isStudyCertificate = request.document?.document_name?.toLowerCase().includes('обучени');
    
    // Заявка считается новой, если она в обработке и не просмотрена
    const isNewRequest = request.status === 'in_progress' && !isViewed;

    return (
        <Card className={`mb-3 shadow-sm request-card ${isNewRequest ? 'border-info border-2' : ''}`}>
            <Card.Header 
                className="request-card-header"
                style={{ backgroundColor: isNewRequest ? '#e7f3ff' : '#f8f9fa' }}
            >
                <div 
                    className="request-card-header-content"
                    onClick={handleToggleExpand}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="request-card-title-section">
                        <h5 className="request-card-title mb-0">
                            <i className="bi-file-earmark-text me-2 text-primary"></i>
                            Заявка #{request.id}
                            {isNewRequest && (
                                <Badge bg="warning" text="dark" className="ms-2 pulse-badge">
                                    <i className="bi-exclamation-circle me-1"></i>
                                    Новая
                                </Badge>
                            )}
                        </h5>
                        {request.document && (
                            <span className="request-card-document text-muted">
                                {request.document.document_name}
                            </span>
                        )}
                    </div>
                </div>
                <div 
                    className="request-card-meta"
                    onClick={handleToggleExpand}
                    style={{ cursor: 'pointer' }}
                >
                    <Badge bg={statusColors[request.status] || 'secondary'} className="request-card-badge me-2">
                        {statusTranslations[request.status] || request.status}
                    </Badge>
                    <small className="text-muted request-card-date">
                        <i className="bi-clock me-1"></i>
                        {formatDate(request.createdAt)}
                    </small>
                    <i className={`bi-chevron-${expanded ? 'up' : 'down'} request-card-chevron ms-2`}></i>
                </div>
            </Card.Header>

            <Collapse in={expanded}>
                <Card.Body className="request-card-body">
                    <Row>
                        {/* Информация о заявке */}
                        <Col md={6} className="mb-3 mb-md-0">
                            <h6 className="text-primary mb-3">
                                <i className="bi-info-circle me-2"></i>
                                Информация о заявке
                            </h6>
                            
                            {request.user && (
                                <div className="mb-3">
                                    <strong>Отправитель:</strong>
                                    <div className="mt-1">
                                        <Badge bg="primary" className="p-2">
                                            <i className="bi-person-circle me-1"></i>
                                            {request.user.email}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            <div className="mb-3">
                                <strong>Документ:</strong>
                                <div className="mt-1">
                                    {request.document ? (
                                        <Badge bg="secondary" className="p-2">
                                            <i className="bi-file-earmark me-1"></i>
                                            {request.document.document_name}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted">Не указан</span>
                                    )}
                                </div>
                            </div>

                            {request.description && (
                                <div className="mb-3">
                                    <strong>Описание:</strong>
                                    <div className="mt-1 p-2 bg-light rounded">
                                        {request.description}
                                    </div>
                                </div>
                            )}

                            <div className="mb-3">
                                <strong>Дата создания:</strong>
                                <div className="mt-1">{formatDate(request.createdAt)}</div>
                            </div>

                            <div className="mb-3">
                                <strong>Последнее обновление:</strong>
                                <div className="mt-1">{formatDate(request.updatedAt)}</div>
                            </div>

                            {/* Кнопка генерации документа для справок об обучении - только для админов */}
                            {isStudyCertificate && onStatusChange && (
                                <div className="mt-3 pt-3 border-top">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={handleGenerateDocument}
                                        disabled={generating}
                                    >
                                        {generating ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                Генерация...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi-download me-1"></i>
                                                Скачать
                                            </>
                                        )}
                                    </Button>
                                    <small className="text-muted d-block mt-2">
                                        <i className="bi-file-earmark-word me-1"></i>
                                        Документ Word со справками
                                    </small>
                                </div>
                            )}
                        </Col>

                        {/* Информация о студентах */}
                        <Col md={6}>
                            <h6 className="text-primary mb-3">
                                <i className="bi-person-graduate me-2"></i>
                                Студенты ({request.students?.length || 0})
                            </h6>
                            
                            {request.students && request.students.length > 0 ? (
                                <ListGroup className="gap-2">
                                    {request.students.map((student, index) => (
                                        <StudentDetailsItem
                                            key={student.id}
                                            student={student}
                                            index={index}
                                            getNameById={getNameById}
                                        />
                                    ))}
                                </ListGroup>
                            ) : (
                                <div className="text-center text-muted py-3">
                                    <i className="bi-person-slash fa-2x mb-2"></i>
                                    <p>Нет студентов в заявке</p>
                                </div>
                            )}
                        </Col>
                    </Row>

                    {/* Кнопки управления статусом - только если передан onStatusChange */}
                    {onStatusChange && (
                        <div className="mt-4 pt-3 border-top request-status-controls">
                            <h6 className="mb-3">
                                <i className="bi-list-check me-2"></i>
                                Управление статусом
                            </h6>
                            <div className="request-status-buttons">
                                <Button
                                    variant={request.status === 'in_progress' ? 'info' : 'outline-info'}
                                    className="request-status-btn"
                                    onClick={() => handleStatusChange('in_progress')}
                                    disabled={request.status === 'completed' || request.status === 'rejected'}
                                >
                                    <i className="bi-arrow-repeat me-2"></i>
                                    <span>В обработке</span>
                                </Button>
                                <Button
                                    variant={request.status === 'completed' ? 'success' : 'outline-success'}
                                    className="request-status-btn"
                                    onClick={() => handleStatusChange('completed')}
                                    disabled={request.status === 'completed' || request.status === 'rejected'}
                                >
                                    <i className="bi-check-lg me-2"></i>
                                    <span>Завершено</span>
                                </Button>
                                <Button
                                    variant={request.status === 'rejected' ? 'danger' : 'outline-danger'}
                                    className="request-status-btn"
                                    onClick={() => handleStatusChange('rejected')}
                                    disabled={request.status === 'completed' || request.status === 'rejected'}
                                >
                                    <i className="bi-x-lg me-2"></i>
                                    <span>Отклонено</span>
                                </Button>
                            </div>
                            <small className="text-muted d-block mt-2">
                                <i className="bi-info-circle me-1"></i>
                                {request.status === 'completed' 
                                    ? 'Завершенную заявку нельзя изменить'
                                    : request.status === 'rejected'
                                    ? 'Отклоненную заявку нельзя изменить'
                                    : 'Вы можете завершить или отклонить заявку'
                                }
                            </small>
                        </div>
                    )}
                </Card.Body>
            </Collapse>
        </Card>
    );
};

export default RequestCard;
