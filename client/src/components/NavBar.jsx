import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../index';
import { ADMIN_ROUTE, LOGIN_ROUTE, PROFILE_ROUTE } from '../utils/consts';
import { observer } from 'mobx-react-lite';
import { Container, Button, Navbar, Nav, Dropdown, Offcanvas } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import './NavBar.css';

const NavBar = observer(() => {
    const { user, data } = useContext(Context);
    const navigate = useNavigate();
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const isAuth = user.getIsAuth();

    // Блокируем прокрутку фона при открытии мобильного меню
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showMobileMenu]);

    const logOut = () => {
        user.logout();
        data.reset();
        sessionStorage.clear();
        navigate(LOGIN_ROUTE);
    };

    return (
        <Navbar bg="dark" variant="dark" expand="lg">
            <Container>
                <NavLink className="text-decoration-none navbar-brand-custom" to={ADMIN_ROUTE}>
                    Учебная часть
                </NavLink>

                {isAuth ? (
                    <>
                        {/* Desktop Navigation */}
                        <Nav className="ms-auto d-none d-lg-flex align-items-center">
                            <Button
                                variant="outline-light"
                                className="me-2"
                                onClick={() => navigate(ADMIN_ROUTE)}
                            >
                                <i className="bi bi-gear me-2"></i>
                                Панель управления
                            </Button>

                            {/* Профиль */}
                            <Dropdown
                                show={showProfileDropdown}
                                onToggle={(isOpen) => setShowProfileDropdown(isOpen)}
                                align="end"
                            >
                                <Dropdown.Toggle
                                    as={Button}
                                    variant="outline-light"
                                    id="profile-dropdown"
                                    className="profile-dropdown-btn"
                                >
                                    <i className="bi bi-person-circle"></i>
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="profile-dropdown-menu">
                                    <Dropdown.Item
                                        onClick={() => {
                                            navigate(PROFILE_ROUTE);
                                            setShowProfileDropdown(false);
                                        }}
                                    >
                                        <i className="bi bi-gear me-2"></i>
                                        Настройки профиля
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item
                                        onClick={() => {
                                            logOut();
                                            setShowProfileDropdown(false);
                                        }}
                                        className="text-danger"
                                    >
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Выход
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Nav>

                        {/* Mobile Hamburger Button */}
                        <Button
                            variant="outline-light"
                            className="d-lg-none ms-auto hamburger-btn"
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
                                        variant="primary"
                                        className="w-100"
                                        onClick={() => {
                                            navigate(ADMIN_ROUTE);
                                            setShowMobileMenu(false);
                                        }}
                                    >
                                        <i className="bi bi-gear me-2"></i>
                                        Панель управления
                                    </Button>

                                    <Button
                                        variant="outline-primary"
                                        className="w-100"
                                        onClick={() => {
                                            navigate(PROFILE_ROUTE);
                                            setShowMobileMenu(false);
                                        }}
                                    >
                                        <i className="bi bi-gear me-2"></i>
                                        Настройки профиля
                                    </Button>

                                    <Button
                                        variant="outline-danger"
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
                        <Button
                            variant="outline-light"
                            className="profile-dropdown-btn"
                            onClick={() => navigate(LOGIN_ROUTE)}
                        >
                            <i className="bi bi-box-arrow-in-right me-2"></i>
                            Вход
                        </Button>
                    </Nav>
                )}
            </Container>
        </Navbar>
    );
});

export default NavBar;
