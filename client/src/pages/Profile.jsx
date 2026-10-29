import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Spinner, Alert, Tabs, Tab, Form, Button, Modal } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { $authHost, errorMessage } from '../http';
import { MIN_PASSWORD_LENGTH, ADMIN_ROUTE, LOGIN_ROUTE } from '../utils/consts';
import { notify } from '../context/ToastContext';
import Breadcrumbs from '../components/Breadcrumbs';
import './Profile.css';

const Profile = observer(() => {
    const { user } = useContext(Context);
    const navigate = useNavigate();
    const currentUser = user.getUser();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mainTab, setMainTab] = useState('settings');
    const [settingsTab, setSettingsTab] = useState('password');

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
                const { data: userData } = await $authHost.get('/api/user/me');
                setUserInfo(userData);
            } catch (err) {
                console.error('Ошибка загрузки профиля:', err);
                setError('Ошибка загрузки профиля');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError(null);
    };

    const handleEmailChange = (e) => {
        const { name, value } = e.target;
        setEmailForm(prev => ({
            ...prev,
            [name]: value
        }));
        setEmailError(null);
    };

    const handleDeleteChange = (e) => {
        const { name, value } = e.target;
        setDeleteForm(prev => ({
            ...prev,
            [name]: value
        }));
        setDeleteError(null);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

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

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailError(null);
        setEmailSuccess(null);

        if (!emailForm.newEmail || !emailForm.password) {
            setEmailError('Все поля обязательны для заполнения');
            return;
        }

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

            if (result.token) {
                localStorage.setItem('token', result.token);
                user.setIsAuth(true);
                user.setUser({ ...currentUser, email: emailForm.newEmail });
            }

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

    const handleDeleteAccount = async () => {
        setDeleteError(null);

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

            localStorage.removeItem('token');
            user.setIsAuth(false);
            user.setUser({});
            navigate(LOGIN_ROUTE);

        } catch (err) {
            setDeleteError(errorMessage(err, 'Ошибка при удалении аккаунта'));
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="profile-page">
            <header className="profile-header py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-8 mx-auto text-center">
                            <h1 className="display-4 fw-bold mb-3">
                                Личный кабинет
                            </h1>
                            <p className="lead mb-2">
                                {currentUser?.email || 'Администратор'}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <Container className="py-4">
                <Breadcrumbs
                    items={[
                        { label: 'Панель управления', path: ADMIN_ROUTE, icon: 'bi-gear' },
                        { label: 'Личный кабинет', icon: 'bi-person-circle' }
                    ]}
                />

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
                        <p className="mt-3 text-muted">Загрузка профиля...</p>
                    </div>
                ) : (
                    <>
                        <Tabs
                            activeKey={mainTab}
                            onSelect={(k) => setMainTab(k)}
                            className="mb-4 main-tabs"
                            variant="pills"
                        >
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
                                                            <strong>Администратор</strong>
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
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Tab>
                        </Tabs>
                    </>
                )}
            </Container>

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
