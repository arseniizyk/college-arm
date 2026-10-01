import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import NotificationItem from './NotificationItem';

export const UnreadBadge = ({ count }) => {
    if (count === 0) return null;

    return (
        <Badge
            bg="danger"
            className="position-absolute top-0 start-100 translate-middle rounded-pill"
            style={{ fontSize: '0.6rem', padding: '0.25rem 0.4rem' }}
        >
            {count}
        </Badge>
    );
};

const NotificationList = ({ notifications, unreadCount, as = 'div', onOpen, onRead, onReadAll }) => {
    return (
        <>
            <div className="notification-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <i className="bi bi-bell-fill me-2 text-primary"></i>
                    <span className="fw-bold">Уведомления</span>
                </div>
                {unreadCount > 0 && (
                    <div className="d-flex align-items-center gap-2">
                        <Badge bg="danger" pill>{unreadCount}</Badge>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={onReadAll}
                            title="Пометить все как прочитанные"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                            <i className="bi bi-check-all me-1"></i>
                            Прочитать все
                        </Button>
                    </div>
                )}
            </div>

            <hr className="notification-divider" />

            {notifications.length > 0 ? (
                <div className="notification-list">
                    {notifications.map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            as={as}
                            onOpen={onOpen}
                            onRead={onRead}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted py-3">
                    <i className="bi bi-bell-slash fs-3 d-block mb-2"></i>
                    <small>Нет уведомлений</small>
                </div>
            )}
        </>
    );
};

export default NotificationList;
