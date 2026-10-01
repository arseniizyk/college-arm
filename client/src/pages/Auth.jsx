import React, { useContext, useState } from 'react';
import { Container, Button, Card, Form, Alert } from 'react-bootstrap';
import { LOGIN_ROUTE, MAIN_ROUTE, REGISTRSTION_ROUTE, PRIVACY_ROUTE, MIN_PASSWORD_LENGTH } from "../utils/consts"
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { registration, login } from '../http/userAPI';
import { observer } from 'mobx-react-lite';
import { Context } from '../index';


const Auth = () => {
    const { user, data } = useContext(Context)
    const location = useLocation()
    const navigate = useNavigate()
    const isLogin = location.pathname === LOGIN_ROUTE
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isChecked, setIsChecked] = useState(false)
    const [errors, setErrors] = useState({})
    const [serverError, setServerError] = useState('')
    const [loading, setLoading] = useState(false)

    // Валидация email
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Валидация пароля
    const validatePassword = (password) => {
        return password.length >= MIN_PASSWORD_LENGTH;
    }

    // Валидация формы
    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email обязателен для заполнения';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Введите корректный email';
        }

        if (!password) {
            newErrors.password = 'Пароль обязателен для заполнения';
        } else if (!validatePassword(password)) {
            newErrors.password = `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`;
        }

        if (!isLogin && !isChecked) {
            newErrors.checkbox = 'Необходимо согласие на обработку персональных данных';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }
    
    const click = async () => {
        setServerError('');
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            let userData
            if (isLogin) {
                userData = await login(email, password)
            } else {
                userData = await registration(email, password)
            }
            
            user.login(userData)
            
            // Загружаем уведомления после успешного входа
            try {
                await data.fetchAll('notifications')
            } catch (err) {
                console.error('Ошибка загрузки уведомлений:', err)
            }
            
            navigate(MAIN_ROUTE)
        } catch (e) {
            setServerError(e.response?.data?.message || 'Ошибка авторизации');
        } finally {
            setLoading(false);
        }
    }

    // Очистка ошибок при изменении полей
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) {
            setErrors({ ...errors, email: '' });
        }
        setServerError('');
    }

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (errors.password) {
            setErrors({ ...errors, password: '' });
        }
        setServerError('');
    }

    const handleCheckboxChange = (e) => {
        setIsChecked(e.target.checked);
        if (errors.checkbox) {
            setErrors({ ...errors, checkbox: '' });
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            click();
        }
    }

    return (
        <Container
            className='d-flex justify-content-center align-items-center px-3'
            style={{ minHeight: 'calc(100vh - 54px)', paddingTop: '1rem', paddingBottom: '1rem' }}
        >
            <Card style={{ width: '100%', maxWidth: 600 }} className='p-3 p-md-5'>
                <h2 className='text-center mb-4'>
                    {isLogin ? "Авторизация" : "Регистрация"}
                </h2>

                {serverError && (
                    <Alert variant="danger" dismissible onClose={() => setServerError('')}>
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {serverError}
                    </Alert>
                )}

                <Form className='d-flex flex-column' onKeyPress={handleKeyPress}>
                    <Form.Group className='mb-3'>
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            placeholder='Введите email'
                            value={email}
                            onChange={handleEmailChange}
                            isInvalid={!!errors.email}
                            type='email'
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className='mb-3'>
                        <Form.Label>Пароль</Form.Label>
                        <Form.Control
                            placeholder='Введите пароль'
                            value={password}
                            onChange={handlePasswordChange}
                            type='password'
                            isInvalid={!!errors.password}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.password}
                        </Form.Control.Feedback>
                        {!isLogin && !errors.password && (
                            <Form.Text className="text-muted">
                                {`Минимум ${MIN_PASSWORD_LENGTH} символа`}
                            </Form.Text>
                        )}
                    </Form.Group>

                    {!isLogin && (
                        <Form.Group className='mb-3'>
                            <Form.Check 
                                type="checkbox" 
                                label={
                                    <span>
                                        Согласие на{' '}
                                        <NavLink to={PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer">
                                            обработку персональных данных
                                        </NavLink>
                                        <span className="text-danger ms-1">*</span>
                                    </span>
                                }
                                checked={isChecked}
                                onChange={handleCheckboxChange}
                                isInvalid={!!errors.checkbox}
                            />
                            {errors.checkbox && (
                                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                    {errors.checkbox}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>
                    )}

                    <div className='d-flex flex-column flex-md-row align-items-center justify-content-between mt-3 gap-3'>
                        <div className='text-center text-md-start'>
                            {isLogin ?
                                <div>Нет аккаунта? <NavLink to={REGISTRSTION_ROUTE}>Зарегистрируйся!</NavLink></div>
                                :
                                <div>Есть аккаунт? <NavLink to={LOGIN_ROUTE}>Войдите!</NavLink></div>
                            }
                        </div>
                        <Button 
                            variant='outline-success' 
                            onClick={click} 
                            disabled={loading || (!isLogin && !isChecked)}
                            style={{ minWidth: '200px', whiteSpace: 'nowrap' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Загрузка...
                                </>
                            ) : (
                                isLogin ? "Войти" : "Регистрация"
                            )}
                        </Button>
                    </div>
                </Form>
            </Card>
        </Container>
    );
};

export default observer(Auth);