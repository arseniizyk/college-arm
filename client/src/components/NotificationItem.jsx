import React from 'react';
import { Badge } from 'react-bootstrap';

export const formatNotificationDate = (dateString, now = new Date()) => {
    const date = new Date(dateString);
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

const NotificationItem = ({ notification, as: Item = 'div', onOpen, onRead }) => {
    // Клик по кнопке не должен открывать уведомление
    const handleRead = (e) => {
        e.stopPropagation();
        onRead(notification.id);
    };

    return (
        <Item
            onClick={() => onOpen(notification.id)}
            className={`notification-item ${notification.isRead ? '' : 'unread'}`}
        >
            <div className="d-flex align-items-start w-100">
                <i
                    className={`bi ${notification.isRead ? 'bi-bell text-muted' : 'bi-bell-fill text-primary'} me-2 flex-shrink-0`}
                    style={{ fontSize: '1.1rem', marginTop: '2px' }}
                ></i>
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
                {!notification.isRead && (
                    <div className="d-flex flex-column align-items-end ms-2 flex-shrink-0">
                        <Badge bg="primary" className="mb-2" style={{ fontSize: '0.65rem' }}>
                            Новое
                        </Badge>
                        <button
                            className="btn btn-sm btn-outline-primary"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            onClick={handleRead}
                            title="Пометить как прочитанное"
                        >
                            <i className="bi bi-check2"></i>
                        </button>
                    </div>
                )}
            </div>
        </Item>
    );
};

export default NotificationItem;
