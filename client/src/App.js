import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './components/AppRouter';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { observer } from 'mobx-react-lite';
import { Context } from './index';
import { check } from '../src/http/userAPI'
import { Spinner } from 'react-bootstrap';
import { ToastProvider } from './context/ToastContext';

const App = () => {
    const { user, data } = useContext(Context)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const handleAuthLogout = () => {
            user.logout()
            data.reset()
        }
        window.addEventListener('auth:logout', handleAuthLogout)
        return () => window.removeEventListener('auth:logout', handleAuthLogout)
    }, [user, data])

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token')
                if (token) {
                    const userData = await check()
                    user.login(userData)
                    // Загружаем уведомления после успешной проверки токена
                    try {
                        await data.fetchAll('notifications')
                    } catch (err) {
                        console.error('Ошибка загрузки уведомлений:', err)
                    }
                } else {
                    user.logout()
                    data.reset()
                }
            } catch (e) {
                user.logout()
                data.reset()
            } finally {
                setLoading(false)
            }
        }
        
        checkAuth()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" />
            </div>
        )
    }

    return (
        <ToastProvider>
            <BrowserRouter>
                <NavBar />
                <AppRouter />
                <Footer />
            </BrowserRouter>
        </ToastProvider>
    );
};

export default observer(App);