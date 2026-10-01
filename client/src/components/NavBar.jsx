import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../index';
import { ADMIN_ROUTE, LOGIN_ROUTE, MAIN_ROUTE, REQUEST_ROUTE, PROFILE_ROUTE } from '../utils/consts';
import { observer } from 'mobx-react-lite';
import { Container, Button, Navbar, Nav, Dropdown, Offcanvas } from 'react-bootstrap'
import { NavLink, useNavigate } from 'react-router-dom';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../http/notificationAPI';
import NotificationList, { UnreadBadge } from './NotificationList';
import { $authHost, errorMessage } from '../http';
import Alert from 'react-bootstrap/Alert';
import './NavBar.css';

const NavBar = observer(() => {
    const { user, data } = useContext(Context)
    const navigate = useNavigate()
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [notificationError, setNotificationError] = useState(null)

    // Получаем информацию о текущем пользователе
    const currentUser = user.getUser()
    const userRole = currentUser?.role || 'USER'

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
        data.clear('notifications')
        
        navigate(MAIN_ROUTE)
    }

    const markAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId);
            data.updateLocal('notifications', notificationId, { isRead: true });
        } catch (error) {
            console.error('Ошибка при пометке уведомления как прочитанного:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            await data.fetchAll('notifications');
        } catch (error) {
            console.error('Ошибка при пометке всех уведомлений как прочитанных:', error);
        }
    };

    const handleNotificationClick = async (notificationId) => {
        setNotificationError(null);
        const notification = data.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
            try {
                await markNotificationAsRead(notificationId);
                data.updateLocal('notifications', notificationId, { isRead: true });
            } catch (error) {
                console.error('Ошибка при пометке уведомления:', error);
            }
        }

        // Админу показываем связанную заявку в админке
        if (notification?.requestId && userRole === 'ADMIN') {
            try {
                await $authHost.patch(`/api/request/${notification.requestId}/view`);
                data.updateLocal('requests', notification.requestId, { isViewed: true });
                const viewedRequestsStr = localStorage.getItem('viewedRequests');
                const viewedRequestIds = viewedRequestsStr ? JSON.parse(viewedRequestsStr) : [];
                if (!viewedRequestIds.includes(notification.requestId)) {
                    viewedRequestIds.push(notification.requestId);
                    localStorage.setItem('viewedRequests', JSON.stringify(viewedRequestIds));
                }
                setShowNotificationsDropdown(false);
                setShowMobileMenu(false);
                navigate(ADMIN_ROUTE);
            } catch (error) {
                setNotificationError(errorMessage(error, 'Не удалось открыть заявку'));
            }
            return;
        }

        navigate(PROFILE_ROUTE);
        setShowNotificationsDropdown(false);
    };

    return (
        <>
            {notificationError && (
                <Alert variant="danger" dismissible onClose={() => setNotificationError(null)} className="mb-0 rounded-0">
                    {notificationError}
                </Alert>
            )}
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
                                        <UnreadBadge count={unreadNotifications.length} />
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu className="notifications-dropdown-menu">
                                        <NotificationList
                                            notifications={recentNotifications}
                                            unreadCount={unreadNotifications.length}
                                            as={Dropdown.Item}
                                            onOpen={handleNotificationClick}
                                            onRead={markAsRead}
                                            onReadAll={markAllAsRead}
                                        />
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
                                className='d-lg-none ms-auto hamburger-btn position-relative'
                                onClick={() => setShowMobileMenu(true)}
                            >
                                <i className="bi bi-list" style={{ fontSize: '1.5rem' }}></i>
                                <UnreadBadge count={unreadNotifications.length} />
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
                                            <NotificationList
                                                notifications={recentNotifications}
                                                unreadCount={unreadNotifications.length}
                                                onOpen={(id) => {
                                                    handleNotificationClick(id);
                                                    setShowMobileMenu(false);
                                                }}
                                                onRead={markAsRead}
                                                onReadAll={markAllAsRead}
                                            />
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
        </>
    );
});

export default NavBar;