import React from 'react';
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
                    <Form.Select
                        name={field.name}
                        value={formData[field.name] || ''}
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
                ) : field.type === 'multiselect' ? (
                    <MultiselectStudents
                        field={field}
                        formData={formData}
                        setFormData={setFormData}
                        loading={loading}
                        data={data}
                    />
                ) : field.type === 'textarea' ? (
                    <Form.Control
                        as="textarea"
                        rows={3}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        required={field.required}
                        disabled={loading}
                        placeholder={field.placeholder || ''}
                    />
                ) : (
                    <Form.Control
                        type={field.type}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        required={field.required}
                        disabled={loading}
                        placeholder={field.placeholder || ''}
                        min={field.min}
                        max={field.max}
                    />
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

    return (
        <Modal show={show} onHide={onHide} size={type === 'delete' ? 'md' : 'lg'} centered>
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
                        <i className="bi-trash-alt fa-3x text-danger mb-3"></i>
                        <h5>Вы уверены, что хотите удалить эту запись?</h5>
                        <p className="text-muted">Это действие нельзя отменить.</p>
                        {item && (
                            <div className="mt-3 p-3 bg-light rounded">
                                {item.document_name
                                    ? <><strong>Название:</strong> {item.document_name}<br/></>
                                    : <><strong>ID:</strong> {item.id}<br/></>
                                }
                                {item.email && <><strong>Email:</strong> {item.email}<br/></>}
                                {item.name && <><strong>Название:</strong> {item.name}<br/></>}
                                {item.last_name && <><strong>Фамилия:</strong> {item.last_name}<br/></>}
                                {item.group_number && <><strong>Номер группы:</strong> {item.group_number}<br/></>}
                            </div>
                        )}
                    </div>
                ) : (
                    <Form onSubmit={onSubmit} id="crud-form">
                        {renderFormFields()}
                    </Form>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading}>
                    Отмена
                </Button>

                <Button
                    variant={type === 'delete' ? 'danger' : 'primary'}
                    onClick={onSubmit}
                    disabled={loading}
                    type="button"
                    form={type !== 'delete' ? 'crud-form' : undefined}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Обработка...
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