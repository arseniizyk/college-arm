import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Spinner, Alert, Badge, Tabs, Tab, Form, Button, Modal } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
import RequestCard from '../components/RequestCard';
import { getNameById as getNameByIdForField } from '../utils/dataHelpers';
import { $authHost, errorMessage } from '../http';
import Pagination from '../components/Pagination';
import { ITEMS_PER_PAGE, MIN_PASSWORD_LENGTH, REQUEST_ROUTE } from '../utils/consts';
import { REQUEST_STATUSES, STATUS_KEYS, statusLabelPlural } from '../utils/requestStatus';
import { notify } from '../context/ToastContext';
import './Profile.css';

const Profile = observer(() => {
    const { data, user } = useContext(Context);
    const navigate = useNavigate();
    const currentUser = user.getUser();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mainTab, setMainTab] = useState('requests'); // Главная вкладка: requests, settings, about
    const [requestsTab, setRequestsTab] = useState('all'); // Подвкладка заявок
    const [settingsTab, setSettingsTab] = useState('password'); // Подвкладка настроек: password, email
    const [currentPage, setCurrentPage] = useState(1);
    const [isSyncing, setIsSyncing] = useState(false);
    const itemsPerPage = ITEMS_PER_PAGE; // Количество заявок на странице

    // Состояния для формы смены пароля
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(null);

    // Состояния для формы смены email
    const [emailForm, setEmailForm] = useState({
        newEmail: '',
        password: ''
    });
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const [emailSuccess, setEmailSuccess] = useState(null);

    // Состояния для удаления аккаунта
    const [deleteForm, setDeleteForm] = useState({
        password: '',
        confirmation: ''
    });
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Полная информация о пользователе
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Полная информация о пользователе — её сбой не должен блокировать остальные списки
                try {
                    const { data: userData } = await $authHost.get('/api/user/me');
                    setUserInfo(userData);
                } catch (err) {
                    console.error('Ошибка загрузки профиля:', err);
                }

                await Promise.all([
                    data.fetchMyRequests(),
                    data.fetchAll('documents'),
                    data.fetchAll('students'),
                    data.fetchAll('groups')
                ]);
            } catch (err) {
                setError('Ошибка загрузки данных');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [data]);

    // Автоматическое обновление заявок каждую минуту
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                setIsSyncing(true);
                // Получаем просмотренные заявки из localStorage
                const viewedRequestsStr = localStorage.getItem('viewedRequests');
                const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];
                
                // Обновляем заявки
                await data.fetchMyRequests();
                
                // Восстанавливаем статус просмотренных заявок
                viewedRequestIds.forEach(id => {
                    data.updateLocal('myRequests', id, { isViewed: true });
                });
            } catch (err) {
                console.error('Ошибка автообновления заявок:', err);
            } finally {
                setTimeout(() => setIsSyncing(false), 1200);
            }
        }, 60000); // 60000 мс = 1 минута

        return () => clearInterval(intervalId);
    }, [data]);

    // Заявки приходят с сервера уже отфильтрованными по текущему пользователю
    const userRequests = data.getMyRequests();

    // Группируем заявки по статусам
    const requestsByStatus = {
        all: userRequests
    };
    for (const key of STATUS_KEYS) {
        requestsByStatus[key] = userRequests.filter(req => req.status === key);
    }

    // Пагинация для текущей вкладки
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRequests = (requestsByStatus[requestsTab] || []).slice(startIndex, endIndex);

    const totalPages = Math.ceil((requestsByStatus[requestsTab]?.length || 0) / itemsPerPage);

    // Сброс на первую страницу при смене вкладки
    useEffect(() => {
        setCurrentPage(1);
    }, [requestsTab]);

    const getNameById = (fieldName, id) => getNameByIdForField(fieldName, id, data);

    const statusInfo = {
        all: { label: 'Все заявки', icon: 'bi-list-ul', color: 'secondary' }
    };
    for (const key of STATUS_KEYS) {
        statusInfo[key] = {
            label: statusLabelPlural(key),
            icon: REQUEST_STATUSES[key].biIcon,
            color: REQUEST_STATUSES[key].badge
        };
    }

    // Обработчик изменения полей формы пароля
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
        // Очищаем ошибки при изменении полей
        setPasswordError(null);
    };

    // Обработчик изменения полей формы email
    const handleEmailChange = (e) => {
        const { name, value } = e.target;
        setEmailForm(prev => ({
            ...prev,
            [name]: value
        }));
        // Очищаем ошибки при изменении полей
        setEmailError(null);
    };

    // Обработчик изменения полей формы удаления
    const handleDeleteChange = (e) => {
        const { name, value } = e.target;
        setDeleteForm(prev => ({
            ...prev,
            [name]: value
        }));
        // Очищаем ошибки при изменении полей
        setDeleteError(null);
    };

    // Обработчик отправки формы смены пароля
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        // Валидация
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordError('Все поля обязательны для заполнения');
            return;
        }

        if (passwordForm.newPassword.length < MIN_PASSWORD_LENGTH) {
            setPasswordError(`Новый пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символа`);
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Новый пароль и подтверждение не совпадают');
            return;
        }

        if (passwordForm.currentPassword === passwordForm.newPassword) {
            setPasswordError('Новый пароль должен отличаться от текущего');
            return;
        }

        setPasswordLoading(true);

        try {
            await $authHost.post('/api/user/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            const pwdMsg = 'Пароль успешно изменен';
            setPasswordSuccess(pwdMsg);
            notify({
                title: 'Безопасность',
                message: pwdMsg,
                variant: 'success'
            });
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            setPasswordError(errorMessage(err, 'Ошибка при смене пароля'));
        } finally {
            setPasswordLoading(false);
        }
    };

    // Обработчик отправки формы смены email
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailError(null);
        setEmailSuccess(null);

        // Валидация
        if (!emailForm.newEmail || !emailForm.password) {
            setEmailError('Все поля обязательны для заполнения');
            return;
        }

        // Простая валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailForm.newEmail)) {
            setEmailError('Некорректный формат email');
            return;
        }

        if (emailForm.newEmail === (userInfo?.email || currentUser?.email)) {
            setEmailError('Новый email совпадает с текущим');
            return;
        }

        setEmailLoading(true);

        try {
            const { data: result } = await $authHost.post('/api/user/change-email', {
                newEmail: emailForm.newEmail,
                password: emailForm.password
            });

            // Обновляем токен в localStorage
            if (result.token) {
                localStorage.setItem('token', result.token);
                user.setIsAuth(true);
                user.setUser({ ...currentUser, email: emailForm.newEmail });
            }

            // Обновляем информацию о пользователе
            setUserInfo(prev => ({ ...prev, email: emailForm.newEmail }));

            const emailMsg = 'Email успешно изменен. Используйте новый email для входа.';
            setEmailSuccess(emailMsg);
            notify({
                title: 'Профиль',
                message: emailMsg,
                variant: 'success'
            });
            setEmailForm({
                newEmail: '',
                password: ''
            });
        } catch (err) {
            setEmailError(errorMessage(err, 'Ошибка при смене email'));
        } finally {
            setEmailLoading(false);
        }
    };

    // Обработчик удаления аккаунта
    const handleDeleteAccount = async () => {
        setDeleteError(null);

        // Валидация
        if (!deleteForm.password) {
            setDeleteError('Необходимо ввести пароль');
            return;
        }

        if (deleteForm.confirmation !== 'УДАЛИТЬ') {
            setDeleteError('Введите "УДАЛИТЬ" для подтверждения');
            return;
        }

        setDeleteLoading(true);

        try {
            await $authHost.delete('/api/user/delete-my-account', {
                data: { password: deleteForm.password }
            });

            // Очищаем данные пользователя и перенаправляем на страницу входа
            localStorage.removeItem('token');
            user.setIsAuth(false);
            user.setUser({});
            navigate('/login');

        } catch (err) {
            setDeleteError(errorMessage(err, 'Ошибка при удалении аккаунта'));
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="profile-page">
            {/* Шапка */}
            <header className="profile-header py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-8 mx-auto text-center">
                            <h1 className="display-4 fw-bold mb-3">
                                Личный кабинет
                            </h1>
                            <p className="lead mb-2">
                                {currentUser?.email || 'Пользователь'}
                            </p>
                            <div className="d-flex justify-content-center">
                                <span
                                    className="badge bg-white text-dark bg-opacity-75 shadow-sm fw-normal py-1 px-3 d-inline-flex align-items-center"
                                    title="Периодическая фоновая проверка каждые 60 секунд"
                                >
                                    <i className={`bi bi-arrow-repeat me-1 ${isSyncing ? 'spin-icon text-primary' : 'text-muted'}`}></i>
                                    {isSyncing ? 'Синхронизация заявок...' : 'Данные актуальны'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Основной контент */}
            <Container className="py-4">
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" role="status" variant="primary">
                            <span className="visually-hidden">Загрузка...</span>
                        </Spinner>
                        <p className="mt-3 text-muted">Загрузка ваших заявок...</p>
                    </div>
                ) : (
                    <>
                        {/* Главные вкладки */}
                        <Tabs
                            activeKey={mainTab}
                            onSelect={(k) => setMainTab(k)}
                            className="mb-4 main-tabs"
                            variant="pills"
                        >
                            {/* Вкладка Заявки */}
                            <Tab
                                eventKey="requests"
                                title={
                                    <span className="px-3">
                                        <i className="bi bi-file-earmark-text me-2"></i>
                                        Мои заявки
                                    </span>
                                }
                            >
                                <Card className="shadow-sm border-0">
                                    <Card.Body>
                                        <Tabs
                                            activeKey={requestsTab}
                                            onSelect={(k) => setRequestsTab(k)}
                                            className="mb-4"
                                        >
                                            {Object.entries(statusInfo).map(([key, info]) => (
                                                 <Tab
                                                    key={key}
                                                    eventKey={key}
                                                    title={
                                                        <span>
                                                            <i className={`bi ${info.icon} me-2`}></i>
                                                            {info.label}
                                                            <Badge bg={info.color} className="ms-2">
                                                                {requestsByStatus[key].length}
                                                            </Badge>
                                                        </span>
                                                    }
                                                >
                                                    <div className="requests-list">
                                                        {requestsByStatus[key].length > 0 ? (
                                                            <>
                                                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                                                    <small className="text-muted">
                                                                        Показано заявок: {startIndex + 1}-{Math.min(endIndex, requestsByStatus[key].length)} из {requestsByStatus[key].length}
                                                                    </small>
                                                                    <small className="text-muted">
                                                                        Страница {currentPage} из {totalPages}
                                                                    </small>
                                                                </div>
                                                                {currentRequests.map(request => (
                                                                    <RequestCard
                                                                        key={request.id}
                                                                        request={request}
                                                                        getNameById={getNameById}
                                                                        onStatusChange={null}
                                                                        onViewUpdate={(requestId) => {
                                                                            data.updateLocal('myRequests', requestId, { isViewed: true });
                                                                            // Сохраняем в localStorage
                                                                            const viewedRequestsStr = localStorage.getItem('viewedRequests');
                                                                            const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];
                                                                            if (!viewedRequestIds.includes(requestId)) {
                                                                                viewedRequestIds.push(requestId);
                                                                                localStorage.setItem('viewedRequests', JSON.stringify(viewedRequestIds));
                                                                            }
                                                                        }}
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
                                                                {key === 'all' ? (
                                                                    <>
                                                                        <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                                                                        <h5 className="text-muted">У вас пока нет ни одной заявки</h5>
                                                                        <p className="text-muted mb-3">
                                                                            Оформите заявку на необходимый документ в несколько кликов
                                                                        </p>
                                                                        <Button as={Link} to={REQUEST_ROUTE} variant="primary">
                                                                            <i className="bi bi-file-earmark-plus me-2"></i>
                                                                            Подать заявку
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className={`bi ${info.icon} fs-1 text-muted mb-3 d-block`}></i>
                                                                        <h5 className="text-muted">Нет заявок со статусом «{info.label}»</h5>
                                                                        <p className="text-muted mb-3">
                                                                            В этой категории пока нет записей
                                                                        </p>
                                                                        <Button variant="outline-secondary" size="sm" onClick={() => setRequestsTab('all')}>
                                                                            <i className="bi bi-list-ul me-2"></i>
                                                                            Показать все заявки
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Tab>
                                            ))}
                                        </Tabs>
                                    </Card.Body>
                                </Card>
                            </Tab>

                            {/* Вкладка Настройки */}
                            <Tab
                                eventKey="settings"
                                title={
                                    <span className="px-3">
                                        <i className="bi bi-gear me-2"></i>
                                        Настройки
                                    </span>
                                }
                            >
                                <Card className="shadow-sm border-0">
                                    <Card.Body>
                                        <Tabs
                                            activeKey={settingsTab}
                                            onSelect={(k) => setSettingsTab(k)}
                                            className="mb-4"
                                        >
                                            {/* Подвкладка: Изменение пароля */}
                                            <Tab
                                                eventKey="password"
                                                title={
                                                    <span>
                                                        <i className="bi bi-shield-lock me-2"></i>
                                                        Пароль
                                                    </span>
                                                }
                                            >
                                                <div className="settings-content mx-auto">
                                                    <h5 className="mb-4">
                                                        <i className="bi bi-shield-lock me-2"></i>
                                                        Изменение пароля
                                                    </h5>

                                                    {passwordError && (
                                                        <Alert variant="danger" dismissible onClose={() => setPasswordError(null)}>
                                                            <i className="bi bi-exclamation-circle me-2"></i>
                                                            {passwordError}
                                                        </Alert>
                                                    )}

                                                    {passwordSuccess && (
                                                        <Alert variant="success" dismissible onClose={() => setPasswordSuccess(null)}>
                                                            <i className="bi bi-check-circle me-2"></i>
                                                            {passwordSuccess}
                                                        </Alert>
                                                    )}

                                                    <Form onSubmit={handlePasswordSubmit}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Текущий пароль</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="currentPassword"
                                                                value={passwordForm.currentPassword}
                                                                onChange={handlePasswordChange}
                                                                placeholder="Введите текущий пароль"
                                                                disabled={passwordLoading}
                                                                required
                                                            />
                                                        </Form.Group>

                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Новый пароль</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="newPassword"
                                                                value={passwordForm.newPassword}
                                                                onChange={handlePasswordChange}
                                                                placeholder={`Введите новый пароль (минимум ${MIN_PASSWORD_LENGTH} символа)`}
                                                                disabled={passwordLoading}
                                                                required
                                                                minLength={MIN_PASSWORD_LENGTH}
                                                            />
                                                            <Form.Text className="text-muted">
                                                                {`Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символа`}
                                                            </Form.Text>
                                                        </Form.Group>

                                                        <Form.Group className="mb-4">
                                                            <Form.Label>Подтверждение нового пароля</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="confirmPassword"
                                                                value={passwordForm.confirmPassword}
                                                                onChange={handlePasswordChange}
                                                                placeholder="Повторите новый пароль"
                                                                disabled={passwordLoading}
                                                                required
                                                            />
                                                        </Form.Group>

                                                        <Button
                                                            variant="primary"
                                                            type="submit"
                                                            disabled={passwordLoading}
                                                        >
                                                            {passwordLoading ? (
                                                                <>
                                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                                    Изменение...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-check-lg me-2"></i>
                                                                    Изменить пароль
                                                                </>
                                                            )}
                                                        </Button>
                                                    </Form>
                                                </div>
                                            </Tab>

                                            {/* Подвкладка: Изменение Email */}
                                            <Tab
                                                eventKey="email"
                                                title={
                                                    <span>
                                                        <i className="bi bi-envelope-at me-2"></i>
                                                        Email
                                                    </span>
                                                }
                                            >
                                                <div className="settings-content mx-auto">
                                                    <h5 className="mb-4">
                                                        <i className="bi bi-envelope-at me-2"></i>
                                                        Изменение Email
                                                    </h5>

                                                    {emailError && (
                                                        <Alert variant="danger" dismissible onClose={() => setEmailError(null)}>
                                                            <i className="bi bi-exclamation-circle me-2"></i>
                                                            {emailError}
                                                        </Alert>
                                                    )}

                                                    {emailSuccess && (
                                                        <Alert variant="success" dismissible onClose={() => setEmailSuccess(null)}>
                                                            <i className="bi bi-check-circle me-2"></i>
                                                            {emailSuccess}
                                                        </Alert>
                                                    )}

                                                    <div className="mb-3 p-3 bg-light rounded">
                                                        <small className="text-muted d-block mb-1">Текущий email</small>
                                                        <strong>{userInfo?.email || currentUser?.email}</strong>
                                                    </div>

                                                    <Form onSubmit={handleEmailSubmit}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Новый email</Form.Label>
                                                            <Form.Control
                                                                type="email"
                                                                name="newEmail"
                                                                value={emailForm.newEmail}
                                                                onChange={handleEmailChange}
                                                                placeholder="Введите новый email"
                                                                disabled={emailLoading}
                                                                required
                                                            />
                                                        </Form.Group>

                                                        <Form.Group className="mb-4">
                                                            <Form.Label>Подтверждение паролем</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="password"
                                                                value={emailForm.password}
                                                                onChange={handleEmailChange}
                                                                placeholder="Введите ваш пароль для подтверждения"
                                                                disabled={emailLoading}
                                                                required
                                                            />
                                                            <Form.Text className="text-muted">
                                                                Для безопасности требуется подтверждение паролем
                                                            </Form.Text>
                                                        </Form.Group>

                                                        <Button
                                                            variant="primary"
                                                            type="submit"
                                                            disabled={emailLoading}
                                                        >
                                                            {emailLoading ? (
                                                                <>
                                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                                    Изменение...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-check-lg me-2"></i>
                                                                    Изменить Email
                                                                </>
                                                            )}
                                                        </Button>
                                                    </Form>
                                                </div>
                                            </Tab>

                                            {/* Подвкладка: Безопасность */}
                                            <Tab
                                                eventKey="security"
                                                title={
                                                    <span>
                                                        <i className="bi bi-shield-exclamation me-2"></i>
                                                        Безопасность
                                                    </span>
                                                }
                                            >
                                                <div className="settings-content mx-auto">
                                                    <h5 className="mb-4 text-danger">
                                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                                        Удаление аккаунта
                                                    </h5>

                                                    <Alert variant="warning">
                                                        <div>
                                                            <strong>Внимание!</strong> Удаление аккаунта необратимо.
                                                        </div>
                                                    </Alert>

                                                    <div className="p-3 bg-light rounded mb-3">
                                                        <h6 className="mb-2">Что будет удалено:</h6>
                                                        <ul className="mb-0">
                                                            <li>Ваш профиль и учетные данные</li>
                                                            <li>Все созданные вами заявки</li>
                                                            <li>История уведомлений</li>
                                                        </ul>
                                                    </div>

                                                    <Button
                                                        variant="danger"
                                                        onClick={() => setShowDeleteModal(true)}
                                                    >
                                                        <i className="bi bi-trash me-2"></i>
                                                        Удалить мой аккаунт
                                                    </Button>
                                                </div>
                                            </Tab>
                                        </Tabs>
                                    </Card.Body>
                                </Card>
                            </Tab>

                            {/* Вкладка Обо мне */}
                            <Tab
                                eventKey="about"
                                title={
                                    <span className="px-3">
                                        <i className="bi bi-person-circle me-2"></i>
                                        Обо мне
                                    </span>
                                }
                            >
                                <Card className="shadow-sm border-0">
                                    <Card.Body>
                                        <div className="about-content mx-auto">
                                            <h5 className="mb-4">
                                                <i className="bi bi-person-badge me-2"></i>
                                                Информация об аккаунте
                                            </h5>
                                            
                                            <div className="account-info">
                                                <div className="info-item mb-3 p-3 bg-light rounded">
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-envelope-fill text-primary me-3 fs-4"></i>
                                                        <div>
                                                            <small className="text-muted d-block">Email</small>
                                                            <strong>{userInfo?.email || currentUser?.email}</strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="info-item mb-3 p-3 bg-light rounded">
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-shield-check text-success me-3 fs-4"></i>
                                                        <div>
                                                            <small className="text-muted d-block">Роль</small>
                                                            <strong>
                                                                {(userInfo?.role || currentUser?.role) === 'ADMIN' 
                                                                    ? 'Администратор' 
                                                                    : (userInfo?.role || currentUser?.role) === 'TEACHER' 
                                                                    ? 'Преподаватель' 
                                                                    : 'Пользователь'}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="info-item mb-3 p-3 bg-light rounded">
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-calendar-check text-info me-3 fs-4"></i>
                                                        <div>
                                                            <small className="text-muted d-block">Дата регистрации</small>
                                                            <strong>
                                                                {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('ru-RU', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                }) : '-'}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="info-item mb-3 p-3 bg-light rounded">
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-file-earmark-text text-warning me-3 fs-4"></i>
                                                        <div>
                                                            <small className="text-muted d-block">Всего заявок</small>
                                                            <strong>{userRequests.length}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Tab>
                        </Tabs>
                    </>
                )}
            </Container>

            {/* Модальное окно подтверждения удаления аккаунта */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered scrollable>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="text-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Подтверждение удаления
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteError && (
                        <Alert variant="danger" dismissible onClose={() => setDeleteError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>
                            {deleteError}
                        </Alert>
                    )}

                    <p className="mb-3">
                        Вы действительно хотите удалить свой аккаунт? Это действие <strong>необратимо</strong>.
                    </p>

                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Введите ваш пароль</Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={deleteForm.password}
                                onChange={handleDeleteChange}
                                placeholder="Введите пароль"
                                disabled={deleteLoading}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Для подтверждения введите: <strong>УДАЛИТЬ</strong></Form.Label>
                            <Form.Control
                                type="text"
                                name="confirmation"
                                value={deleteForm.confirmation}
                                onChange={handleDeleteChange}
                                placeholder="Введите УДАЛИТЬ"
                                disabled={deleteLoading}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setShowDeleteModal(false);
                            setDeleteForm({ password: '', confirmation: '' });
                            setDeleteError(null);
                        }}
                        disabled={deleteLoading}
                    >
                        Отмена
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || !deleteForm.password || deleteForm.confirmation !== 'УДАЛИТЬ'}
                    >
                        {deleteLoading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Удаление...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-trash me-2"></i>
                                Удалить аккаунт
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
});

export default Profile;
