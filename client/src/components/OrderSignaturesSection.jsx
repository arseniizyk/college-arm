import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

const FIELD_DEFAULTS = {
    controlPerson: {
        label: 'Контроль за исполнением возложить на',
        placeholder: '',
        isControl: true,
        defaultRequired: true,
    },
    assignedPerson: {
        label: 'Контроль за исполнением возложить на',
        placeholder: '',
        isControl: true,
        defaultRequired: true,
    },
    deputyDirector: {
        label: 'Зам. директора',
        placeholder: 'Е.В.Филипцова',
    },
    chiefAccountant: {
        label: 'Главный бухгалтер',
        placeholder: 'М.В.Метта',
    },
    headOfDepartment: {
        label: 'Заведующий отделением',
        placeholder: '',
    },
    departmentHead: {
        label: 'Заведующий отделением',
        placeholder: '',
    },
    legalCounsel: {
        label: 'Юрисконсульт',
        placeholder: 'Н.В.Демьянович',
    },
    responsibleSecretary: {
        label: 'Отв. секретарь приемной комиссии',
        placeholder: 'Д.Ч.Звягина',
    },
    acquainted: {
        label: 'Ознакомлена',
        placeholder: '',
    },
};

const OrderSignaturesSection = ({
    formData = {},
    handleChange,
    fields = ['controlPerson', 'deputyDirector', 'chiefAccountant', 'headOfDepartment', 'legalCounsel'],
    labels = {},
    placeholders = {},
    required = {},
    title = 'Подписи и основание',
    titleIcon = 'bi bi-person-lines-fill',
    hideTitle = false,
    controlPersonLabel,
    controlPersonPlaceholder,
    controlPersonRequired,
    colSize,
    children,
    extra,
}) => {
    // Определяем наличие поля контроля за исполнением
    const controlKey = fields.find(f => f === 'controlPerson' || f === 'assignedPerson');
    const rowKeys = fields.filter(f => f !== 'controlPerson' && f !== 'assignedPerson');

    // Вычисляем ширину колонок для строки подписантов
    const computedColSize = colSize || (
        rowKeys.length === 1 ? 12 :
        rowKeys.length === 2 ? 6 :
        rowKeys.length === 3 ? 4 : 6
    );

    return (
        <div className="order-signatures-section">
            {!hideTitle && (
                <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                    {titleIcon && <i className={`${titleIcon} me-2`}></i>}
                    {title}
                </h6>
            )}

            {/* Контроль за исполнением */}
            {controlKey && (() => {
                const def = FIELD_DEFAULTS[controlKey] || {};
                const label = controlPersonLabel || labels[controlKey] || def.label;
                const placeholder = controlPersonPlaceholder || placeholders[controlKey] || def.placeholder;
                const isReq = controlPersonRequired !== undefined
                    ? controlPersonRequired
                    : (required[controlKey] !== undefined ? required[controlKey] : def.defaultRequired);

                return (
                    <Form.Group className="mb-3">
                        <Form.Label>
                            {label} {isReq && <span className="text-danger">*</span>}
                        </Form.Label>
                        <Form.Control
                            type="text"
                            name={controlKey}
                            value={formData[controlKey] || ''}
                            onChange={handleChange}
                            placeholder={placeholder}
                            required={isReq}
                        />
                    </Form.Group>
                );
            })()}

            {/* Промежуточный контент (например, основание приказа) */}
            {children}

            {/* Строка подписантов */}
            {rowKeys.length > 0 && (
                <Row className="mb-3">
                    {rowKeys.map(key => {
                        const def = FIELD_DEFAULTS[key] || {};
                        const label = labels[key] || def.label || key;
                        const placeholder = placeholders[key] || def.placeholder || '';
                        const isReq = required[key] !== undefined ? required[key] : false;

                        return (
                            <Col key={key} md={computedColSize}>
                                <Form.Group>
                                    <Form.Label>
                                        {label} {isReq && <span className="text-danger">*</span>}
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        name={key}
                                        value={formData[key] || ''}
                                        onChange={handleChange}
                                        placeholder={placeholder}
                                        required={isReq}
                                    />
                                </Form.Group>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Дополнительный контент (например, ознакомление) */}
            {extra}
        </div>
    );
};

export default OrderSignaturesSection;
