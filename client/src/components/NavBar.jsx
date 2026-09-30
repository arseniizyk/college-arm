import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../index';
import { ADMIN_ROUTE, LOGIN_ROUTE, MAIN_ROUTE, REQUEST_ROUTE, PROFILE_ROUTE } from '../utils/consts';
import { observer } from 'mobx-react-lite';
import { Container, Button, Navbar, Nav, Dropdown, Badge, Offcanvas } from 'react-bootstrap'
import { NavLink, useNavigate } from 'react-router-dom';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../http/notificationAPI';
import './NavBar.css';

const NavBar = observer(() => {
    const { user, data } = useContext(Context)
    const navigate = useNavigate()
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)

    // Получаем информацию о текущем пользователе
    const currentUser = user.getUser()
    const userRole = currentUser?.role || 'USER'

    // Загружаем уведомления при монтировании
    useEffect(() => {
        if (user.getIsAuth()) {
            data.fetchAll('notifications').catch(err => {
                console.error('Ошибка загрузки уведомлений:', err);
            });
        }
    }, [user, data]);

    // Автоматическое обновление уведомлений каждую минуту
    useEffect(() => {
        if (!user.getIsAuth()) return;

        const intervalId = setInterval(() => {
            data.fetchAll('notifications').catch(err => {
                console.error('Ошибка автообновления уведомлений:', err);
            });
        }, 60000); // 60000 мс = 1 минута

        return () => clearInterval(intervalId);
    }, [user, data]);

    // Блокируем прокрутку фона при открытии мобильного меню
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Очистка при размонтировании
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showMobileMenu]);

    // Получаем непрочитанные уведомления
    const unreadNotifications = data.notifications.filter(n => !n.isRead);
    const recentNotifications = data.notifications.slice(0, 5);

    const logOut = () => {
        user.setUser({})
        user.setIsAuth(false)

        localStorage.removeItem('token')
        sessionStorage.clear()
        
        // Очищаем уведомления при выходе
        data._entities.notifications = []
        
        navigate(MAIN_ROUTE)
    }

    const formatNotificationDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин. назад`;
        if (diffHours < 24) return `${diffHours} ч. назад`;
        if (diffDays < 7) return `${diffDays} дн. назад`;
        return date.toLocaleDateString('ru-RU');
    };

    const markAsRead = async (notificationId, e) => {
        e.stopPropagation(); // Предотвращаем закрытие меню
        try {
            await markNotificationAsRead(notificationId);
            // Обновляем список уведомлений
            await data.fetchAll('notifications');
        } catch (error) {
            console.error('Ошибка при пометке уведомления как прочитанного:', error);
        }
    };

    const markAllAsRead = async (e) => {
        e.stopPropagation(); // Предотвращаем закрытие меню
        try {
            await markAllNotificationsAsRead();
            // Обновляем список уведомлений
            await data.fetchAll('notifications');
        } catch (error) {
            console.error('Ошибка при пометке всех уведомлений как прочитанных:', error);
        }
    };

    const handleNotificationClick = async (notificationId) => {
        // Помечаем как прочитанное
        const notification = data.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
            try {
                await markNotificationAsRead(notificationId);
                await data.fetchAll('notifications');
            } catch (error) {
                console.error('Ошибка при пометке уведомления:', error);
            }
        }
        
        // Если уведомление связано с заявкой и пользователь - админ
        if (notification?.requestId && userRole === 'ADMIN') {
            // Помечаем заявку как просмотренную
            try {
                const token = localStorage.getItem('token');
                await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:7000'}/api/request/${notification.requestId}/view`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                // Обновляем локально
                data.updateLocal('requests', notification.requestId, { isViewed: true });
                // Сохраняем в localStorage
                const viewedRequestsStr = localStorage.getItem('viewedRequests');
                const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];
                if (!viewedRequestIds.includes(notification.requestId)) {
                    viewedRequestIds.push(notification.requestId);
                    localStorage.setItem('viewedRequests', JSON.stringify(viewedRequestIds));
                }
            } catch (error) {
                console.error('Ошибка при пометке заявки как просмотренной:', error);
            }
            // Переходим в админ панель
            navigate(ADMIN_ROUTE);
        } else {
            // Переходим в профиль
            navigate(PROFILE_ROUTE);
        }
        
        setShowNotificationsDropdown(false);
    };

    return (
        <Navbar bg="dark" variant='dark' expand="lg">
            <Container>
                <NavLink className="text-decoration-none navbar-brand-custom" to={MAIN_ROUTE}>Учебная часть</NavLink>
                
                {user.getIsAuth() ? (
                    <>
                        {/* Desktop Navigation */}
                        <Nav className="ms-auto d-none d-lg-flex align-items-center">
                            <Button variant='outline-light' onClick={() => navigate(REQUEST_ROUTE)}>Заказать справку</Button>
                            {userRole === 'ADMIN' && (
                                <Button variant='outline-light' className='ms-2' onClick={() => navigate(ADMIN_ROUTE)}>Админ панель</Button>
                            )}
                            
                            {/* Уведомления */}
                            <Dropdown 
                                show={showNotificationsDropdown} 
                                onToggle={(isOpen) => {
                                    setShowNotificationsDropdown(isOpen);
                                    if (isOpen) {
                                        data.fetchAll('notifications').catch(err => {
                                            console.error('Ошибка загрузки уведомлений:', err);
                                        });
                                    }
                                }}
                                align="end"
                                className="ms-2"
                            >
                                <Dropdown.Toggle 
                                    as={Button}
                                    variant='outline-light'
                                    id="notifications-dropdown"
                                    className="profile-dropdown-btn position-relative"
                                >
                                    <i className="bi bi-bell"></i>
                                    {unreadNotifications.length > 0 && (
                                        <Badge 
                                            bg="danger" 
                                            className="position-absolute top-0 start-100 translate-middle rounded-pill"
                                            style={{ fontSize: '0.6rem', padding: '0.25rem 0.4rem' }}
                                        >
                                            {unreadNotifications.length}
                                        </Badge>
                                    )}
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="notifications-dropdown-menu">
                                    <div className="dropdown-header d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-bell-fill me-2 text-primary"></i>
                                            <span className="fw-bold">Уведомления</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            {unreadNotifications.length > 0 && (
                                                <>
                                                    <Badge bg="danger" pill>{unreadNotifications.length}</Badge>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={markAllAsRead}
                                                        title="Пометить все как прочитанные"
                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                    >
                                                        <i className="bi bi-check-all me-1"></i>
                                                        Прочитать все
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Dropdown.Divider />
                                    
                                    {recentNotifications.length > 0 ? (
                                        <>
                                            <div className="notifications-list">
                                                {recentNotifications.map(notification => (
                                                    <Dropdown.Item 
                                                        key={notification.id}
                                                        onClick={() => handleNotificationClick(notification.id)}
                                                        className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                                                    >
                                                        <div className="d-flex align-items-start w-100">
                                                            <i className={`bi ${!notification.isRead ? 'bi-bell-fill text-primary' : 'bi-bell text-muted'} me-2 flex-shrink-0`} style={{ fontSize: '1.1rem', marginTop: '2px' }}></i>
                                                            <div className="flex-grow-1 overflow-hidden">
                                                                <div className="notification-title">{notification.title}</div>
                                                                {notification.body && (
                                                                    <div className="notification-body text-muted">{notification.body}</div>
                                                                )}
                                                                <div className="notification-time text-muted">
                                                                    <i className="bi bi-clock me-1"></i>
                                                                    {formatNotificationDate(notification.createdAt)}
                                                                </div>
                                                            </div>
                                                            <div className="d-flex flex-column align-items-end ms-2 flex-shrink-0">
                                                                {!notification.isRead && (
                                                                    <>
                                                                        <Badge bg="primary" className="mb-2" style={{ fontSize: '0.65rem' }}>
                                                                            Новое
                                                                        </Badge>
                                                                        <button
                                                                            className="btn btn-sm btn-outline-primary"
                                                                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                                                            onClick={(e) => markAsRead(notification.id, e)}
                                                                            title="Пометить как прочитанное"
                                                                        >
                                                                            <i className="bi bi-check2"></i>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Dropdown.Item>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-muted py-3">
                                            <i className="bi bi-bell-slash fs-3 d-block mb-2"></i>
                                            <small>Нет уведомлений</small>
                                        </div>
                                    )}
                                </Dropdown.Menu>
                            </Dropdown>

                            {/* Профиль */}
                            <Dropdown 
                                show={showProfileDropdown} 
                                onToggle={(isOpen) => setShowProfileDropdown(isOpen)}
                                align="end"
                                className="ms-2"
                            >
                                <Dropdown.Toggle 
                                    as={Button}
                                    variant='outline-light'
                                    id="profile-dropdown"
                                    className="profile-dropdown-btn"
                                >
                                    <i className="bi bi-person-circle"></i>
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="profile-dropdown-menu">
                                    <Dropdown.Item onClick={() => { navigate(PROFILE_ROUTE); setShowProfileDropdown(false); }}>
                                        <i className="bi bi-person-circle me-2"></i>
                                        Личный кабинет
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => { logOut(); setShowProfileDropdown(false); }} className="text-danger">
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Выход
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Nav>

                        {/* Mobile Hamburger Button */}
                        <Button 
                            variant='outline-light' 
                            className='d-lg-none ms-auto hamburger-btn'
                            onClick={() => setShowMobileMenu(true)}
                        >
                            <i className="bi bi-list" style={{ fontSize: '1.5rem' }}></i>
                        </Button>

                        {/* Mobile Menu Offcanvas */}
                        <Offcanvas 
                            show={showMobileMenu} 
                            onHide={() => setShowMobileMenu(false)}
                            placement="end"
                            className="mobile-menu-offcanvas"
                        >
                            <Offcanvas.Header closeButton>
                                <Offcanvas.Title>Меню</Offcanvas.Title>
                            </Offcanvas.Header>
                            <Offcanvas.Body>
                                <div className="d-flex flex-column gap-3">
                                    <Button 
                                        variant='primary' 
                                        className="w-100"
                                        onClick={() => { 
                                            navigate(REQUEST_ROUTE); 
                                            setShowMobileMenu(false); 
                                        }}
                                    >
                                        <i className="bi bi-file-earmark-text me-2"></i>
                                        Заказать справку
                                    </Button>
                                    
                                    {userRole === 'ADMIN' && (
                                        <Button 
                                            variant='primary' 
                                            className="w-100"
                                            onClick={() => { 
                                                navigate(ADMIN_ROUTE); 
                                                setShowMobileMenu(false); 
                                            }}
                                        >
                                            <i className="bi bi-gear me-2"></i>
                                            Админ панель
                                        </Button>
                                    )}

                                    <hr />

                                    {/* Уведомления в мобильном меню */}
                                    <div className="mobile-notifications">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="mb-0">
                                                <i className="bi bi-bell-fill me-2 text-primary"></i>
                                                Уведомления
                                            </h6>
                                            <div className="d-flex align-items-center gap-2">
                                                {unreadNotifications.length > 0 && (
                                                    <>
                                                        <Badge bg="danger" pill>{unreadNotifications.length}</Badge>
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={markAllAsRead}
                                                            title="Пометить все как прочитанные"
                                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                        >
                                                            <i className="bi bi-check-all"></i>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {recentNotifications.length > 0 ? (
                                            <div className="notifications-mobile-list">
                                                {recentNotifications.map(notification => (
                                                    <div 
                                                        key={notification.id}
                                                        onClick={() => {
                                                            handleNotificationClick(notification.id);
                                                            setShowMobileMenu(false);
                                                        }}
                                                        className={`notification-mobile-item ${!notification.isRead ? 'unread' : ''}`}
                                                    >
                                                        <div className="d-flex align-items-start">
                                                            <i className={`bi ${!notification.isRead ? 'bi-bell-fill text-primary' : 'bi-bell text-muted'} me-2 flex-shrink-0`}></i>
                                                            <div className="flex-grow-1">
                                                                <div className="notification-title">{notification.title}</div>
                                                                {notification.body && (
                                                                    <div className="notification-body text-muted">{notification.body}</div>
                                                                )}
                                                                <div className="notification-time text-muted">
                                                                    <i className="bi bi-clock me-1"></i>
                                                                    {formatNotificationDate(notification.createdAt)}
                                                                </div>
                                                            </div>
                                                            {!notification.isRead && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary ms-2"
                                                                    onClick={(e) => markAsRead(notification.id, e)}
                                                                    title="Пометить как прочитанное"
                                                                >
                                                                    <i className="bi bi-check2"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center text-muted py-3">
                                                <i className="bi bi-bell-slash fs-3 d-block mb-2"></i>
                                                <small>Нет уведомлений</small>
                                            </div>
                                        )}
                                    </div>

                                    <hr />

                                    {/* Профиль в мобильном меню */}
                                    <Button 
                                        variant='outline-primary' 
                                        className="w-100"
                                        onClick={() => { 
                                            navigate(PROFILE_ROUTE); 
                                            setShowMobileMenu(false); 
                                        }}
                                    >
                                        <i className="bi bi-person-circle me-2"></i>
                                        Личный кабинет
                                    </Button>
                                    
                                    <Button 
                                        variant='outline-danger' 
                                        className="w-100"
                                        onClick={() => { 
                                            logOut(); 
                                            setShowMobileMenu(false); 
                                        }}
                                    >
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Выход
                                    </Button>
                                </div>
                            </Offcanvas.Body>
                        </Offcanvas>
                    </>
                ) : (
                    <Nav className="ms-auto">
                        <Button variant='outline-light' className='profile-dropdown-btn' onClick={() => navigate(LOGIN_ROUTE)}>
                            <i className="bi bi-person-circle"></i>
                        </Button>
                    </Nav>
                )}
            </Container>
        </Navbar>
    );
});

export default NavBar;