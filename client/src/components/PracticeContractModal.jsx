import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { formatFio } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { practiceContractUrl } from '../utils/consts';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';

const INITIAL = {
    contractNumber: '',
    contractDay: '',
    contractMonth: '',
    contractYear: '',
    practiceType: 'учебной',
    groupId: '',
    studentIds: [],
    specialtyId: '',
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

    // Студенты выбранной группы
    const groupStudents = form.groupId
        ? data.students.filter(s => s.groupId === parseInt(form.groupId))
        : [];

    const handleGroupChange = (e) => {
        const groupId = e.target.value;
        const group = data.groups.find(g => g.id === parseInt(groupId));
        setForm(prev => ({
            ...prev,
            groupId,
            studentIds: [],
            specialtyId: group?.specialtyId ? String(group.specialtyId) : '',
        }));
        setError(null);
    };

    const handleStudentToggle = (studentId) => {
        const id = String(studentId);
        setForm(prev => ({
            ...prev,
            studentIds: prev.studentIds.includes(id)
                ? prev.studentIds.filter(s => s !== id)
                : [...prev.studentIds, id]
        }));
        setError(null);
    };

    const handleSelectAllGroup = () => {
        setForm(prev => ({
            ...prev,
            studentIds: groupStudents.map(s => String(s.id))
        }));
    };

    const handleClearStudents = () => {
        setForm(prev => ({ ...prev, studentIds: [] }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.contractDay || !form.contractMonth || !form.contractYear || !form.contractNumber ||
            !form.groupId || !form.studentIds.length ||
            !form.periodFrom || !form.periodTo || !form.contractEndDate) {
            setError('Заполните все обязательные поля');
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
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-briefcase me-2"></i>
                    Договор на учебную практику
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>
                            {error}
                        </Alert>
                    )}

                    {/* Реквизиты договора */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-file-text me-2"></i>Реквизиты договора
                    </h6>
                    <Row className="mb-3">
                        <Col md={5}>
                            <Form.Label>Дата договора <span className="text-danger">*</span></Form.Label>
                            <Row className="g-2">
                                <Col xs={3}>
                                    <Form.Control
                                        type="number"
                                        name="contractDay"
                                        value={form.contractDay}
                                        onChange={handleChange}
                                        min={1}
                                        max={31}
                                        placeholder="1"
                                        style={{ height: '36px', padding: '0.25rem 0.5rem' }}
                                        required
                                    />
                                    <Form.Text className="text-muted">Число</Form.Text>
                                </Col>
                                <Col xs={5}>
                                    <Form.Select
                                        name="contractMonth"
                                        value={form.contractMonth}
                                        onChange={handleChange}
                                        style={{ height: '36px', padding: '0.25rem 0.5rem' }}
                                        required
                                    >
                                        <option value="">—</option>
                                        {['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </Form.Select>
                                    <Form.Text className="text-muted">Месяц</Form.Text>
                                </Col>
                                <Col xs={4}>
                                    <Form.Control
                                        type="number"
                                        name="contractYear"
                                        value={form.contractYear}
                                        onChange={handleChange}
                                        min={2000}
                                        max={2100}
                                        placeholder={new Date().getFullYear()}
                                        style={{ height: '36px', padding: '0.25rem 0.5rem' }}
                                        required
                                    />
                                    <Form.Text className="text-muted">Год</Form.Text>
                                </Col>
                            </Row>
                        </Col>
                        <Col md={7}>
                            <Form.Group>
                                <Form.Label>Номер договора <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="contractNumber"
                                    value={form.contractNumber}
                                    onChange={handleChange}
                                    placeholder="напр. 2-26/52"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Практика */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-mortarboard me-2"></i>Практика
                    </h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Вид практики <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="practiceType" value={form.practiceType} onChange={handleChange} required>
                                    <option value="учебной">Учебная</option>
                                    <option value="производственной">Производственная</option>
                                    <option value="преддипломной">Преддипломная</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="groupId" value={form.groupId} onChange={handleGroupChange} required>
                                    <option value="">Выберите группу</option>
                                    {data.groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.group_number}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Студенты <span className="text-danger">*</span></Form.Label>
                                <div className="d-flex gap-2 mb-2">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={handleSelectAllGroup}
                                        disabled={!form.groupId || groupStudents.length === 0}
                                    >
                                        <i className="bi-people-fill me-1"></i>
                                        Вся группа
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={handleClearStudents}
                                        disabled={form.studentIds.length === 0}
                                    >
                                        <i className="bi-x-lg me-1"></i>
                                        Очистить
                                    </Button>
                                </div>
                                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '0.375rem', padding: '0.5rem' }}>
                                    {groupStudents.length > 0 ? groupStudents.map(s => (
                                        <Form.Check
                                            key={s.id}
                                            type="checkbox"
                                            id={`student-${s.id}`}
                                            label={formatFio(s)}
                                            checked={form.studentIds.includes(String(s.id))}
                                            onChange={() => handleStudentToggle(s.id)}
                                            className="mb-1"
                                        />
                                    )) : (
                                        <small className="text-muted">
                                            {form.groupId ? 'В группе нет студентов' : 'Сначала выберите группу'}
                                        </small>
                                    )}
                                </div>
                                {form.studentIds.length > 0 && (
                                    <small className="text-muted mt-1 d-block">
                                        Выбрано: {form.studentIds.length}
                                    </small>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Специальность</Form.Label>
                                <div className="p-2 border rounded bg-light">
                                    {selectedSpecialty ? (
                                        <>
                                            <span className="fw-medium">{selectedSpecialty.name}</span>
                                            {selectedSpecialty.qualification && (
                                                <><br /><small className="text-muted">{selectedSpecialty.qualification}</small></>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-muted">—</span>
                                    )}
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Период практики */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-calendar-range me-2"></i>Период практики
                    </h6>
                    <Row className="mb-3">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>С <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="periodFrom"
                                    value={form.periodFrom}
                                    onChange={handleChange}
                                    placeholder="напр. 16 января 2023"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>По <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="periodTo"
                                    value={form.periodTo}
                                    onChange={handleChange}
                                    placeholder="напр. 26 февраля 2023"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>Договор действует до <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="contractEndDate"
                                    value={form.contractEndDate}
                                    onChange={handleChange}
                                    placeholder="напр. 26 февраля 2023"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        Отмена
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? (
                            <><Spinner animation="border" size="sm" className="me-2" />Генерация...</>
                        ) : (
                            <><i className="bi bi-download me-2"></i>Создать и скачать</>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
});

export default PracticeContractModal;
