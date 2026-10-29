import React, { useContext, useState } from 'react';
import { Container, Button, Card, Form, Alert } from 'react-bootstrap';
import { ADMIN_ROUTE, MIN_PASSWORD_LENGTH } from "../utils/consts";
import { useNavigate } from 'react-router-dom';
import { login } from '../http/userAPI';
import { observer } from 'mobx-react-lite';
import { Context } from '../index';

const Auth = () => {
    const { user } = useContext(Context);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

    // Валидация email
    const validateEmail = (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val);
    };

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
        } else if (password.length < MIN_PASSWORD_LENGTH) {
            newErrors.password = `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символа`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const click = async () => {
        setServerError('');
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const userData = await login(email, password);
            user.login(userData);
            navigate(ADMIN_ROUTE);
        } catch (e) {
            setServerError(e.response?.data?.message || 'Ошибка авторизации');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) {
            setErrors({ ...errors, email: '' });
        }
        setServerError('');
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (errors.password) {
            setErrors({ ...errors, password: '' });
        }
        setServerError('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            click();
        }
    };

    return (
        <Container
            className='d-flex justify-content-center align-items-center px-3'
            style={{ minHeight: 'calc(100vh - 54px)', paddingTop: '1rem', paddingBottom: '1rem' }}
        >
            <Card style={{ width: '100%', maxWidth: 500 }} className='p-3 p-md-5 shadow-sm'>
                <h2 className='text-center mb-4'>
                    Вход в систему
                </h2>

                {serverError && (
                    <Alert variant="danger" dismissible onClose={() => setServerError('')}>
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {serverError}
                    </Alert>
                )}

                <Form className='d-flex flex-column' onKeyDown={handleKeyPress}>
                    <Form.Group className='mb-3'>
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            placeholder='Введите email'
                            value={email}
                            onChange={handleEmailChange}
                            isInvalid={!!errors.email}
                            type='email'
                            autoFocus
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className='mb-4'>
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
                    </Form.Group>

                    <Button 
                        variant='primary' 
                        onClick={click} 
                        disabled={loading}
                        className='w-100 py-2'
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Вход...
                            </>
                        ) : (
                            "Войти"
                        )}
                    </Button>
                </Form>
            </Card>
        </Container>
    );
};

export default observer(Auth);
