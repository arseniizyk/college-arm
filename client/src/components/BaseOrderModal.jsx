import React from 'react';
import { Modal, Form, Button, Spinner, Alert } from 'react-bootstrap';

const BaseOrderModal = ({
    show,
    onHide,
    title,
    icon,
    size = 'lg',
    centered = true,
    error,
    onErrorClose,
    onSubmit,
    loading = false,
    cancelText = 'Отмена',
    submitText = 'Создать и скачать',
    loadingText = 'Генерация...',
    submitIcon = 'bi bi-download',
    children,
    ...props
}) => {
    return (
        <Modal show={show} onHide={onHide} size={size} centered={centered} scrollable {...props}>
            <Modal.Header closeButton>
                <Modal.Title>
                    {icon && <i className={`${icon} me-2`}></i>}
                    {title}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={onSubmit} className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                <Modal.Body>
                    {error && (
                        <Alert
                            variant="danger"
                            dismissible={Boolean(onErrorClose)}
                            onClose={onErrorClose}
                        >
                            <i className="bi bi-exclamation-circle me-2"></i>
                            {error}
                        </Alert>
                    )}
                    {children}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                {loadingText}
                            </>
                        ) : (
                            <>
                                <i className={`${submitIcon} me-2`}></i>
                                {submitText}
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default BaseOrderModal;
