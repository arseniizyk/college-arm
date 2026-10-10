import React, { useContext, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Context } from '../index';
import { REQUEST_ROUTE, LOGIN_ROUTE, PROFILE_ROUTE, ADMIN_ROUTE } from '../utils/consts';
import { REQUEST_STATUSES } from '../utils/requestStatus';
import './Main.css';

const roleLabels = {
    USER: 'Студент',
    TEACHER: 'Преподаватель / Куратор',
    ADMIN: 'Администратор'
};

const Main = observer(() => {
    const navigate = useNavigate();
    const { user, data } = useContext(Context);

    const isAuth = user.getIsAuth();
    const currentUser = user.getUser();
    const userRole = currentUser?.role || 'USER';

    // Загрузка данных пользователя при авторизации
    useEffect(() => {
        if (isAuth) {
            data.fetchMyRequests().catch(() => {});
            if (!data.documents || data.documents.length === 0) {
                data.fetchAll('documents').catch(() => {});
            }
            if (userRole === 'ADMIN') {
                data.fetchAll('requests', {}, { silent: true }).catch(() => {});
            }
        }
    }, [isAuth, userRole, data]);

    const handleRequestClick = () => {
        if (isAuth) {
            navigate(REQUEST_ROUTE);
        } else {
            navigate(LOGIN_ROUTE);
        }
    };

    const myRequests = data.myRequests || [];
    const pendingCount = myRequests.filter(r => r.status === 'pending').length;
    const completedCount = myRequests.filter(r => r.status === 'completed').length;
    const totalCount = myRequests.length;
    const adminPendingCount = userRole === 'ADMIN'
        ? (data.requests || []).filter(r => r.status === 'pending').length
        : 0;

    const recentRequests = [...myRequests]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);

    return (
        <div className="document-portal">
            {/* Шапка */}
            <header className="mgkct-header py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-8 mx-auto text-center">
                            <h1 className="display-4 fw-bold mb-3">
                                <i className="bi bi-file-earmark-text me-3"></i>
                                Оформление документов МГКЦТ
                            </h1>
                            {isAuth ? (
                                <>
                                    <p className="lead mb-2">
                                        Здравствуйте, <strong>{currentUser?.email || 'пользователь'}</strong>!
                                    </p>
                                    <p className="text-white-50 mb-4 small">
                                        Роль в системе: <span className="badge bg-light text-dark">{roleLabels[userRole] || userRole}</span>
                                    </p>
                                    <div className="d-flex flex-wrap justify-content-center gap-3">
                                        <Button
                                            className="btn btn-light btn-lg"
                                            onClick={() => navigate(REQUEST_ROUTE)}
                                        >
                                            <i className="bi bi-file-earmark-plus me-2"></i>
                                            Подать новую заявку
                                        </Button>
                                        <Button
                                            className="btn btn-outline-light btn-lg"
                                            onClick={() => navigate(PROFILE_ROUTE)}
                                        >
                                            <i className="bi bi-person-circle me-2"></i>
                                            Мои заявки
                                        </Button>
                                        {userRole === 'ADMIN' && (
                                            <Button
                                                className="btn btn-outline-light btn-lg"
                                                onClick={() => navigate(ADMIN_ROUTE)}
                                            >
                                                <i className="bi bi-gear me-2"></i>
                                                Админ-панель
                                            </Button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="lead mb-4">
                                        Учебная часть представляет электронную систему оформления всех типов справок и документов
                                    </p>
                                    <div className="d-flex flex-wrap justify-content-center gap-3">
                                        <Button
                                            className="btn btn-light btn-lg"
                                            onClick={handleRequestClick}
                                        >
                                            <i className="bi bi-file-earmark-plus me-2"></i>
                                            Оформить онлайн
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Основной контент */}
            <main className="container py-4">
                {/* Персонализированный дашборд для авторизованного пользователя */}
                {isAuth && (
                    <section className="user-dashboard mb-5">
                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
                            <div>
                                <h2 className="h4 fw-bold mb-1">
                                    <i className="bi bi-speedometer2 text-primary me-2"></i>
                                    Панель быстрого доступа
                                </h2>
                                <p className="text-muted mb-0 small">
                                    Оперативная информация о статусе ваших документов и быстрые действия
                                </p>
                            </div>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => navigate(PROFILE_ROUTE)}
                                className="d-flex align-items-center"
                            >
                                Все заявки в профиле
                                <i className="bi bi-arrow-right ms-2"></i>
                            </Button>
                        </div>

                        {/* Уведомление о готовых документах */}
                        {completedCount > 0 && (
                            <div className="alert alert-success border-success d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 shadow-sm rounded-3">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-check-circle-fill text-success fs-3 me-3"></i>
                                    <div>
                                        <strong>Готовые к выдаче документы ({completedCount} шт.)</strong>
                                        <div className="small text-muted">
                                            Выдача справок производится в кабинете 2-209 (Пн-Пт с 14:00 до 17:00).
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => navigate(PROFILE_ROUTE)}
                                >
                                    Посмотреть
                                </Button>
                            </div>
                        )}

                        {/* Статусные карточки-виджеты */}
                        <div className="row g-3 mb-4">
                            <div className="col-6 col-lg-3">
                                <div
                                    className="card h-100 border-0 shadow-sm status-widget-card"
                                    onClick={() => navigate(PROFILE_ROUTE)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(PROFILE_ROUTE);
                                        }
                                    }}
                                >
                                    <div className="card-body d-flex align-items-center p-3">
                                        <div className="widget-icon-box bg-primary bg-opacity-10 text-primary rounded-3 me-3">
                                            <i className="bi bi-folder2-open fs-3"></i>
                                        </div>
                                        <div>
                                            <div className="fs-4 fw-bold">{totalCount}</div>
                                            <div className="text-muted small">Всего подано</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-lg-3">
                                <div
                                    className="card h-100 border-0 shadow-sm status-widget-card"
                                    onClick={() => navigate(PROFILE_ROUTE)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(PROFILE_ROUTE);
                                        }
                                    }}
                                >
                                    <div className="card-body d-flex align-items-center p-3">
                                        <div className="widget-icon-box bg-warning bg-opacity-15 text-warning rounded-3 me-3">
                                            <i className="bi bi-clock-history fs-3"></i>
                                        </div>
                                        <div>
                                            <div className="fs-4 fw-bold text-dark">{pendingCount}</div>
                                            <div className="text-muted small">В обработке</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-lg-3">
                                <div
                                    className="card h-100 border-0 shadow-sm status-widget-card"
                                    onClick={() => navigate(PROFILE_ROUTE)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(PROFILE_ROUTE);
                                        }
                                    }}
                                >
                                    <div className="card-body d-flex align-items-center p-3">
                                        <div className="widget-icon-box bg-success bg-opacity-10 text-success rounded-3 me-3">
                                            <i className="bi bi-check-circle-fill fs-3"></i>
                                        </div>
                                        <div>
                                            <div className="fs-4 fw-bold text-success">{completedCount}</div>
                                            <div className="text-muted small">Готовы к выдаче</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {userRole === 'ADMIN' ? (
                                <div className="col-6 col-lg-3">
                                    <div
                                        className="card h-100 border-0 shadow-sm status-widget-card"
                                        onClick={() => navigate(ADMIN_ROUTE)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                navigate(ADMIN_ROUTE);
                                            }
                                        }}
                                    >
                                        <div className="card-body d-flex align-items-center p-3">
                                            <div className="widget-icon-box bg-danger bg-opacity-10 text-danger rounded-3 me-3">
                                                <i className="bi bi-clipboard-check fs-3"></i>
                                            </div>
                                            <div>
                                                <div className="fs-4 fw-bold text-danger">{adminPendingCount}</div>
                                                <div className="text-muted small">Новых заявок (БД)</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="col-6 col-lg-3">
                                    <div
                                        className="card h-100 border-0 shadow-sm status-widget-card"
                                        onClick={() => navigate(REQUEST_ROUTE)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                navigate(REQUEST_ROUTE);
                                            }
                                        }}
                                    >
                                        <div className="card-body d-flex align-items-center p-3">
                                            <div className="widget-icon-box bg-info bg-opacity-10 text-primary rounded-3 me-3">
                                                <i className="bi bi-file-earmark-plus fs-3"></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold">Оформить</div>
                                                <div className="text-muted small">Новая заявка</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Последние заявки */}
                        <div className="card border-0 shadow-sm rounded-3">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h3 className="h5 fw-bold mb-0">
                                        <i className="bi bi-clock-history text-primary me-2"></i>
                                        Последние поданные заявки
                                    </h3>
                                    {myRequests.length > 0 && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="p-0 text-decoration-none"
                                            onClick={() => navigate(PROFILE_ROUTE)}
                                        >
                                            Смотреть все ({myRequests.length}) →
                                        </Button>
                                    )}
                                </div>

                                {myRequests.length === 0 ? (
                                    <div className="text-center py-4 text-muted">
                                        <i className="bi bi-inbox fs-1 text-muted opacity-50 mb-2 d-block"></i>
                                        <p className="mb-3">У вас пока нет оформленных заявок</p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => navigate(REQUEST_ROUTE)}
                                        >
                                            <i className="bi bi-file-earmark-plus me-1"></i>
                                            Подать первую заявку
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="list-group list-group-flush">
                                        {recentRequests.map(req => {
                                            const docName = req.document?.document_name || req.description || 'Заявка на документ';
                                            const statusInfo = REQUEST_STATUSES[req.status] || REQUEST_STATUSES.pending;
                                            const dateStr = req.createdAt
                                                ? new Date(req.createdAt).toLocaleDateString('ru-RU')
                                                : '—';

                                            return (
                                                <div
                                                    key={req.id}
                                                    className="list-group-item list-group-item-action d-flex flex-wrap justify-content-between align-items-center py-3 px-2 border-bottom"
                                                    onClick={() => navigate(PROFILE_ROUTE)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            navigate(PROFILE_ROUTE);
                                                        }
                                                    }}
                                                >
                                                    <div className="me-3 mb-1 mb-sm-0">
                                                        <div className="fw-semibold text-dark">
                                                            <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                                                            {docName}
                                                        </div>
                                                        <small className="text-muted">
                                                            Дата подачи: {dateStr}
                                                        </small>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className={`badge bg-${statusInfo.badge} bg-opacity-10 text-${statusInfo.badge} border border-${statusInfo.badge} border-opacity-25 px-2 py-1`}>
                                                            <i className={`bi ${statusInfo.biIcon || 'bi-circle'} me-1`}></i>
                                                            {statusInfo.text}
                                                        </span>
                                                        <i className="bi bi-chevron-right text-muted small"></i>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Справочная информация учебной части */}
                <div className="mb-4">
                    <h3 className="h4 fw-bold mb-3">
                        <i className="bi bi-info-circle text-primary me-2"></i>
                        Справочная информация учебной части
                    </h3>
                </div>

                {/* Контакты и основная информация */}
                <div className="row mb-5">
                    <div className="col-lg-4 mb-4 mb-lg-0">
                        <div className="contact-card card h-100">
                            <div className="card-body">
                                <h3 className="card-title text-center mb-4">
                                    <i className="bi bi-person-lines-fill card-title-icon"></i>
                                    Контакты
                                </h3>

                                <div className="contact-item">
                                    <i className="bi bi-telephone-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Телефон</h5>
                                        <a href="tel:+375173584507" className="contact-phone">
                                            +375 (17) 358-45-07
                                        </a>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <i className="bi bi-person-badge-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Василевич Наталья Анатольевна</h5>
                                        <span className="badge bg-primary">Кабинет 2-209</span>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <i className="bi bi-person-badge-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Солтан-Михолап Ирина Васильевна</h5>
                                        <span className="badge bg-primary">Кабинет 2-209</span>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <i className="bi bi-geo-alt-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Адрес</h5>
                                        <p>ул. Казинца, 91<br />
                                            <small className="text-muted">2 этаж, 2 корпус</small></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Расписание и кабинет */}
                    <div className="col-lg-8">
                        <div className="row g-4">
                            {/* График работы */}
                            <div className="col-md-6">
                                <div className="schedule-card card h-100">
                                    <div className="card-body">
                                        <h3 className="card-title text-center mb-4">
                                            <i className="bi bi-clock-history card-title-icon"></i>
                                            График работы
                                        </h3>
                                        <div className="schedule-period">
                                            <span className="period-name">Пн-Пт</span>
                                            <span className="time-badge bg-primary" style={{ color: 'white' }}>8:30-17:00</span>
                                        </div>
                                        <div className="schedule-period">
                                            <span className="period-name">Выдача справок об обучении</span>
                                            <span className="time-badge bg-primary" style={{ color: 'white' }}>14:00-17:00</span>
                                        </div>
                                        <div className="schedule-period day-off">
                                            <span className="period-name">Cб-Вс</span>
                                            <span className="time-badge bg-secondary" style={{ color: 'white' }}>Выходной</span>
                                        </div>
                                        <div className="lunch-break mt-4">
                                            <i className="bi bi-cup-fill"></i>
                                            <span>Обеденный перерыв: <strong>13:00-13:30</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Кабинет 2-209 */}
                            <div className="col-md-6">
                                <div className="room-card card h-100">
                                    <div className="card-body">
                                        <h3 className="card-title text-center mb-4">
                                            <i className="bi bi-door-closed-fill card-title-icon"></i>
                                            Кабинет 2-209
                                        </h3>

                                        <div className="alert alert-info mb-4">
                                            <i className="bi bi-signpost-fill me-2"></i>
                                            <strong>Как найти:</strong> 2 этаж, 2 корпус, после лестницы направо
                                        </div>

                                        <div className="mb-4">
                                            <h6 className="fw-bold mb-3">
                                                <i className="bi bi-list-check text-primary me-2"></i>
                                                В кабинете выдают:
                                            </h6>
                                            <ul className="room-services">
                                                {['Справки об обучении', 'Документы для военкомата', 'Дубликаты документов'].map((service, idx) => (
                                                    <li key={idx}>
                                                        <i className="bi bi-check-circle-fill text-success"></i>
                                                        {service}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
});

export default Main;