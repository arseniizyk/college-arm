import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

export const ToastContext = createContext(null);

export const notify = (toast) => {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: toast }));
    }
};

const VARIANT_CONFIG = {
    success: {
        icon: 'bi-check-circle-fill',
        iconClass: 'text-success',
        defaultTitle: 'Успешно'
    },
    danger: {
        icon: 'bi-exclamation-triangle-fill',
        iconClass: 'text-danger',
        defaultTitle: 'Ошибка'
    },
    warning: {
        icon: 'bi-exclamation-circle-fill',
        iconClass: 'text-warning',
        defaultTitle: 'Внимание'
    },
    info: {
        icon: 'bi-info-circle-fill',
        iconClass: 'text-primary',
        defaultTitle: 'Уведомление'
    }
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const hideToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback(({
        title,
        message,
        variant = 'info',
        autohide = true,
        delay = 4000
    }) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const timestamp = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        setToasts(prev => [
            ...prev,
            {
                id,
                title,
                message,
                variant,
                autohide,
                delay,
                timestamp
            }
        ]);
        return id;
    }, []);

    useEffect(() => {
        const handleCustomToast = (event) => {
            if (event.detail) {
                showToast(event.detail);
            }
        };

        window.addEventListener('app:toast', handleCustomToast);
        return () => window.removeEventListener('app:toast', handleCustomToast);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <ToastContainer
                position="bottom-end"
                className="p-3 position-fixed"
                style={{ zIndex: 1080 }}
            >
                {toasts.map(t => {
                    const config = VARIANT_CONFIG[t.variant] || VARIANT_CONFIG.info;
                    return (
                        <Toast
                            key={t.id}
                            onClose={() => hideToast(t.id)}
                            show={true}
                            delay={t.delay}
                            autohide={t.autohide}
                            className="shadow-sm border bg-white"
                            style={{ minWidth: '280px', maxWidth: '380px' }}
                        >
                            <Toast.Header closeButton>
                                <i className={`bi ${config.icon} me-2 ${config.iconClass}`}></i>
                                <strong className="me-auto">{t.title || config.defaultTitle}</strong>
                                <small className="text-muted ms-2">{t.timestamp}</small>
                            </Toast.Header>
                            <Toast.Body className="text-break">
                                {t.message}
                            </Toast.Body>
                        </Toast>
                    );
                })}
            </ToastContainer>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            showToast: notify,
            hideToast: () => {}
        };
    }
    return context;
};
