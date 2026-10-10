import React, { useState, useContext, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { practiceContractUrl } from '../utils/consts';
import { downloadDoc } from '../http';
import { validatePracticeContract, PRACTICE_TYPES } from '../utils/practiceContract';
import { splitDateToContractParts, formatRuDate, toIsoDate } from '../utils/dateFormatters';
import OrderStudentSelector from './OrderStudentSelector';
import BaseOrderModal from './BaseOrderModal';

const INITIAL = {
    contractDay: '',
    contractMonth: '',
    contractYear: '',
    contractNumber: '',
    practiceType: 'учебной',
    groupId: '',
    specialtyId: '',
    studentIds: [],
    enterpriseName: '',
    enterpriseLeaderPosition: '',
    enterpriseLeaderFio: '',
    enterpriseLeaderBasis: '',
    periodFrom: '',
    periodTo: '',
    contractEndDate: '',
};

const PracticeContractModal = observer(({ show, onHide }) => {
    const { data } = useContext(Context);
    const [form, setForm] = useState(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show) {
            if (!data.groups.length) data.fetchAll('groups');
            if (!data.specialties.length) data.fetchAll('specialties');
            if (!data.students.length) data.fetchAll('students');
        }
    }, [show, data]);

    const groupStudents = form.groupId
        ? data.students.filter(s => s.groupId === parseInt(form.groupId))
        : [];

    const handleGroupChange = (e) => {
        const groupId = e.target.value;
        const group = data.groups.find(g => g.id === parseInt(groupId));
        setForm(prev => ({
            ...prev,
            groupId,
            specialtyId: group?.specialtyId ? String(group.specialtyId) : '',
            studentIds: [],
        }));
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleStudentsChange = (ids) => {
        setForm(prev => ({ ...prev, studentIds: ids }));
        setError(null);
    };

    const handleContractDateChange = (e) => {
        const iso = e.target.value;
        const parts = splitDateToContractParts(iso);
        if (parts) {
            setForm(prev => ({
                ...prev,
                contractDay: parts.contractDay,
                contractMonth: parts.contractMonth,
                contractYear: parts.contractYear
            }));
        } else {
            setForm(prev => ({
                ...prev,
                contractDay: '',
                contractMonth: '',
                contractYear: ''
            }));
        }
        setError(null);
    };

    const getContractDateIso = () => {
        if (!form.contractDay || !form.contractMonth || !form.contractYear) return '';
        return toIsoDate(`${form.contractDay} ${form.contractMonth} ${form.contractYear}`);
    };

    const handlePeriodChange = (field, isoDate) => {
        setForm(prev => ({ ...prev, [field]: formatRuDate(isoDate) }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const validationError = validatePracticeContract(form);
        if (validationError) {
            setError(validationError);
            return;
        }

        const group = data.groups.find(g => g.id === parseInt(form.groupId));
        const specialty = data.specialties.find(s => s.id === parseInt(form.specialtyId));
        const selectedStudents = data.students.filter(s => form.studentIds.includes(String(s.id)));

        const payload = {
            contractDay: form.contractDay,
            contractMonth: form.contractMonth,
            contractYear: form.contractYear,
            contractNumber: form.contractNumber,
            practiceType: form.practiceType,
            groupNumber: group?.group_number || '',
            students: selectedStudents.map(s => ({
                lastName: s.last_name,
                firstName: s.name,
                fatherName: s.father_name || '',
            })),
            specialtyName: specialty?.name || '',
            specialtyCode: '',
            additionalConditions: '',
            periodFrom: form.periodFrom,
            periodTo: form.periodTo,
            contractEndDate: form.contractEndDate,
        };

        setLoading(true);
        try {
            await downloadDoc(practiceContractUrl(), {
                payload,
                fileName: 'Договор_практика',
                stamp: form.contractNumber || Date.now()
            });

            onHide();
            setForm(INITIAL);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm(INITIAL);
        setError(null);
        onHide();
    };

    const selectedSpecialty = data.specialties.find(s => s.id === parseInt(form.specialtyId));

    return (
        <BaseOrderModal
            show={show}
            onHide={handleClose}
            title="Договор на учебную практику"
            icon="bi bi-briefcase"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
            {/* Реквизиты договора */}
            <h6 className="text-muted mb-3 border-bottom pb-2">
                <i className="bi bi-file-earmark-text me-2"></i>Реквизиты договора
            </h6>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Дата договора <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="date"
                            value={getContractDateIso()}
                            onChange={handleContractDateChange}
                            required
                        />
                        {form.contractDay && form.contractMonth && form.contractYear && (
                            <Form.Text className="text-muted">
                                «{form.contractDay}» {form.contractMonth} {form.contractYear} г.
                            </Form.Text>
                        )}
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Номер договора <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="contractNumber"
                            value={form.contractNumber}
                            onChange={handleChange}
                            placeholder="напр. 38"
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Вид практики <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                            name="practiceType"
                            value={form.practiceType}
                            onChange={handleChange}
                            required
                        >
                            {PRACTICE_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            {/* Группа и студенты */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                <i className="bi bi-people me-2"></i>Группа и учащиеся
            </h6>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                            name="groupId"
                            value={form.groupId}
                            onChange={handleGroupChange}
                            required
                        >
                            <option value="">— Выберите группу —</option>
                            {data.groups.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.group_number}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Специальность</Form.Label>
                        <Form.Control
                            type="text"
                            value={selectedSpecialty ? `${selectedSpecialty.name}` : '—'}
                            readOnly
                        />
                        {selectedSpecialty && (
                            <Form.Text className="text-muted">
                                Код: {selectedSpecialty.code || '—'}
                            </Form.Text>
                        )}
                    </Form.Group>
                </Col>
            </Row>

            {/* Выбор студентов */}
            {form.groupId && (
                <div className="mb-3">
                    <Form.Label>Учащиеся <span className="text-danger">*</span></Form.Label>
                    <OrderStudentSelector
                        students={groupStudents}
                        selectedIds={form.studentIds}
                        onChange={handleStudentsChange}
                    />
                </div>
            )}

            {/* Сроки практики */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                <i className="bi bi-calendar-range me-2"></i>Сроки проведения практики
            </h6>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Сроки: с <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="date"
                            value={toIsoDate(form.periodFrom)}
                            onChange={(e) => handlePeriodChange('periodFrom', e.target.value)}
                            required
                        />
                        {form.periodFrom && (
                            <Form.Text className="text-muted">
                                {form.periodFrom} г.
                            </Form.Text>
                        )}
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>по <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="date"
                            value={toIsoDate(form.periodTo)}
                            onChange={(e) => handlePeriodChange('periodTo', e.target.value)}
                            required
                        />
                        {form.periodTo && (
                            <Form.Text className="text-muted">
                                {form.periodTo} г.
                            </Form.Text>
                        )}
                    </Form.Group>
                </Col>
            </Row>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Договор действует до <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="date"
                            value={toIsoDate(form.contractEndDate)}
                            onChange={(e) => handlePeriodChange('contractEndDate', e.target.value)}
                            required
                        />
                        {form.contractEndDate && (
                            <Form.Text className="text-muted">
                                {form.contractEndDate} г.
                            </Form.Text>
                        )}
                    </Form.Group>
                </Col>
            </Row>
        </BaseOrderModal>
    );
});

export default PracticeContractModal;
