import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { TABLE_NAMES, ACTION_NAMES, getFieldsConfig } from '../utils/tableConfig';
import { getDropdownOptions } from '../utils/dataHelpers';
import MultiselectStudents from './MultiselectStudents';

const CRUDModal = ({
    show,
    onHide,
    type,
    item,
    table,
    formData,
    setFormData,
    onSubmit,
    loading,
    data,
    userRole
}) => {
    const [deleteConfirmed, setDeleteConfirmed] = useState(false);
    const [validated, setValidated] = useState(false);

    useEffect(() => {
        if (show) {
            setDeleteConfirmed(false);
            setValidated(false);
        }
    }, [show, item, type]);

    const getModalTitle = () => {
        return `${ACTION_NAMES[type]} ${TABLE_NAMES[table] || table}`;
    };

    const handleInputChange = (e) => {
        const { name, value, type: inputType, checked, multiple, selectedOptions } = e.target;
        
        let newValue;
        if (inputType === 'checkbox') {
            newValue = checked;
        } else if (multiple) {
            // Для multiselect получаем массив выбранных значений
            newValue = Array.from(selectedOptions, option => option.value);
        } else if (inputType === 'number') {
            // Для числовых полей преобразуем в число
            newValue = value === '' ? '' : Number(value);
        } else {
            newValue = value;
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
    };

    const renderFormFields = () => {
        // excludeOwnerId — id редактируемой записи, чтобы не отфильтровать её текущий аккаунт
        const ownedTables = ['students', 'teachers'];
        const getDropdownOptionsForField = (fieldName) => getDropdownOptions(fieldName, data, ownedTables.includes(table) ? item?.id : null);
        const fieldsConfig = getFieldsConfig(userRole, getDropdownOptionsForField, type);
        const fields = fieldsConfig[table] || [];

        return fields.map(field => (
            <Form.Group className="mb-3" key={field.name}>
                <Form.Label className="fw-bold">
                    {field.label}
                    {field.required && <span className="text-danger"> *</span>}
                </Form.Label>

                {field.type === 'select' ? (
                    <>
                        <Form.Select
                            name={field.name}
                            value={formData[field.name] ?? ''}
                            onChange={handleInputChange}
                            required={field.required}
                            disabled={loading || (field.options && field.options.length === 0)}
                        >
                            <option value="">Выберите...</option>
                            {field.options && Array.isArray(field.options) ? (
                                field.options.map(opt => {
                                    // Если opt - это объект с value и label
                                    if (typeof opt === 'object' && opt.value !== undefined) {
                                        return (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        );
                                    }
                                    // Если opt - это простая строка
                                    return (
                                        <option key={opt} value={opt}>{opt}</option>
                                    );
                                })
                            ) : []}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">Пожалуйста, выберите значение</Form.Control.Feedback>
                    </>
                ) : field.type === 'multiselect' ? (
                    <MultiselectStudents
                        field={field}
                        formData={formData}
                        setFormData={setFormData}
                        loading={loading}
                        data={data}
                    />
                ) : field.type === 'textarea' ? (
                    <>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name={field.name}
                            value={formData[field.name] ?? ''}
                            onChange={handleInputChange}
                            required={field.required}
                            disabled={loading}
                            placeholder={field.placeholder || ''}
                        />
                        <Form.Control.Feedback type="invalid">Пожалуйста, заполните это поле</Form.Control.Feedback>
                    </>
                ) : (
                    <>
                        <Form.Control
                            type={field.type}
                            name={field.name}
                            value={field.type === 'date' && formData[field.name] ? String(formData[field.name]).slice(0, 10) : (formData[field.name] ?? '')}
                            onChange={handleInputChange}
                            required={field.required}
                            disabled={loading}
                            placeholder={field.placeholder || ''}
                            min={field.min}
                            max={field.max}
                        />
                        <Form.Control.Feedback type="invalid">Пожалуйста, заполните это поле</Form.Control.Feedback>
                    </>
                )}
                {field.helpText && (
                    <Form.Text className="text-muted">
                        <i className="bi-info-circle me-1"></i>
                        {field.helpText}
                    </Form.Text>
                )}
            </Form.Group>
        ));
    };

    const renderDeleteSummary = () => {
        if (!item) return null;

        if (table === 'students' || (item.last_name && (item.groupId || item.group))) {
            const group = item.group || (data?.groups && data.groups.find(g => g.id === item.groupId));
            const specialty = group?.specialty || (data?.specialties && data.specialties.find(s => s.id === group?.specialtyId));
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    {item.last_name && <div><strong>Фамилия:</strong> {item.last_name}</div>}
                    {item.name && <div><strong>Имя:</strong> {item.name}</div>}
                    {item.father_name && <div><strong>Отчество:</strong> {item.father_name}</div>}
                    {group?.group_number && <div><strong>Учебная группа:</strong> {group.group_number}</div>}
                    {specialty?.name && <div><strong>Специальность:</strong> {specialty.name}</div>}
                    {item.order_number && <div><strong>Приказ:</strong> {item.order_number}</div>}
                </div>
            );
        }

        if (table === 'groups' || item.group_number) {
            const specialty = item.specialty || (data?.specialties && data.specialties.find(s => s.id === item.specialtyId));
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    {item.group_number && <div><strong>Учебная группа:</strong> {item.group_number}</div>}
                    {specialty?.name && <div><strong>Специальность:</strong> {specialty.name}</div>}
                    {item.payment_type && <div><strong>Основа обучения:</strong> {item.payment_type}</div>}
                </div>
            );
        }

        if (table === 'teachers') {
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    {item.last_name && <div><strong>Фамилия:</strong> {item.last_name}</div>}
                    {item.name && <div><strong>Имя:</strong> {item.name}</div>}
                    {item.father_name && <div><strong>Отчество:</strong> {item.father_name}</div>}
                </div>
            );
        }

        if (table === 'specialties') {
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    {item.name && <div><strong>Специальность:</strong> {item.name}</div>}
                    {item.qualification && <div><strong>Квалификация:</strong> {item.qualification}</div>}
                </div>
            );
        }

        if (table === 'documents' || item.document_name) {
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    <div><strong>Название:</strong> {item.document_name}</div>
                </div>
            );
        }

        if (table === 'users' || item.email) {
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    {item.email && <div><strong>Email:</strong> {item.email}</div>}
                    {item.role && <div><strong>Роль:</strong> {item.role}</div>}
                </div>
            );
        }

        if (table === 'requests') {
            const docName = item.document?.document_name || (data?.documents && data.documents.find(d => d.id === item.documentId)?.document_name);
            return (
                <div className="mt-3 p-3 bg-light rounded text-start">
                    {docName && <div><strong>Документ:</strong> {docName}</div>}
                    {item.description && <div><strong>Описание:</strong> {item.description}</div>}
                </div>
            );
        }

        return (
            <div className="mt-3 p-3 bg-light rounded text-start">
                {item.last_name && <div><strong>Фамилия:</strong> {item.last_name}</div>}
                {item.name && <div><strong>Имя:</strong> {item.name}</div>}
                {item.email && <div><strong>Email:</strong> {item.email}</div>}
            </div>
        );
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const formElement = e.currentTarget;
        if (!formElement.checkValidity()) {
            e.stopPropagation();
            setValidated(true);
            return;
        }
        onSubmit(e);
    };

    return (
        <Modal show={show} onHide={onHide} size={type === 'delete' ? 'md' : 'lg'} centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>
                    {type === 'delete' ? (
                        <i className="bi-exclamation-triangle text-danger me-2"></i>
                    ) : (
                        <i className="bi-pencil-square me-2"></i>
                    )}
                    {getModalTitle()}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {type === 'delete' ? (
                    <div className="text-center py-4">
                        <i className="bi-trash fs-1 text-danger mb-3"></i>
                        <h5>Вы уверены, что хотите удалить эту запись?</h5>
                        <p className="text-muted">Это действие нельзя отменить.</p>
                        {renderDeleteSummary()}
                        <div className="mt-4 pt-3 border-top text-start">
                            <Form.Check
                                type="checkbox"
                                id="confirm-delete-checkbox"
                                label="Подтверждаю безвозвратное удаление записи"
                                checked={deleteConfirmed}
                                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                                className="fw-semibold text-danger"
                            />
                        </div>
                    </div>
                ) : (
                    <Form noValidate validated={validated} onSubmit={handleFormSubmit} id="crud-form">
                        {renderFormFields()}
                    </Form>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading} autoFocus={type === 'delete'}>
                    Отмена
                </Button>

                <Button
                    variant={type === 'delete' ? 'danger' : 'primary'}
                    onClick={type === 'delete' ? onSubmit : undefined}
                    disabled={loading || (type === 'delete' && !deleteConfirmed)}
                    type={type === 'delete' ? 'button' : 'submit'}
                    form={type !== 'delete' ? 'crud-form' : undefined}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            {type === 'delete' ? 'Удаление...' : 'Обработка...'}
                        </>
                    ) : (
                        <>
                            {type === 'create' && 'Создать'}
                            {type === 'edit' && 'Сохранить'}
                            {type === 'delete' && 'Удалить'}
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CRUDModal;