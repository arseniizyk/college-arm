import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert, Card } from 'react-bootstrap';
import { formatFio, formatFioShort } from '../utils/dataHelpers';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';

const INITIAL_PERIOD = { dateFrom: '', dateTo: '', eventName: '', eventAddress: '' };

const INITIAL = {
    groupId: '',
    studentId: '',
    basis: '',
    periods: [{ ...INITIAL_PERIOD }],
    responsible: '',
    controlPerson: '',
    headOfDepartment: '',
    legalCounsel: '',
    acquainted: '',
};

const ReleaseOrderModal = observer(({ show, onHide }) => {
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

    const selectedGroup = data.groups.find(g => g.id === parseInt(form.groupId));
    const selectedSpecialty = data.specialties.find(s => s.id === selectedGroup?.specialtyId);
    const selectedStudent = data.students.find(s => s.id === parseInt(form.studentId));

    const curatorTeacher = selectedGroup?.supervisor?.teacher;
    const curatorName = curatorTeacher
        ? formatFioShort(curatorTeacher)
        : '';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleGroupChange = (e) => {
        setForm(prev => ({ ...prev, groupId: e.target.value, studentId: '' }));
        setError(null);
    };

    const handlePeriodChange = (index, field, value) => {
        setForm(prev => {
            const periods = [...prev.periods];
            periods[index] = { ...periods[index], [field]: value };
            return { ...prev, periods };
        });
    };

    const addPeriod = () => {
        setForm(prev => ({ ...prev, periods: [...prev.periods, { ...INITIAL_PERIOD }] }));
    };

    const removePeriod = (index) => {
        setForm(prev => ({ ...prev, periods: prev.periods.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.studentId || !form.basis || !form.responsible || !form.controlPerson) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (form.periods.some(p => !p.dateFrom || !p.eventName || !p.eventAddress)) {
            setError('Заполните дату, мероприятие и адрес для каждого периода');
            return;
        }

        const payload = {
            basis: form.basis,
            studentLastName: selectedStudent?.last_name || '',
            studentFirstName: selectedStudent?.name || '',
            studentFatherName: selectedStudent?.father_name || '',
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            periods: form.periods,
            responsible: form.responsible,
            curatorName,
            controlPerson: form.controlPerson,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
            acquainted: form.acquainted
                ? form.acquainted.split('\n').map(s => s.trim()).filter(Boolean)
                : [],
        };

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:7000'}/api/generate/admin/release-order`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Ошибка генерации документа');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Приказ_освобождение_${Date.now()}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);

            onHide();
            setForm(INITIAL);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => { setForm(INITIAL); setError(null); onHide(); };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-calendar-x me-2"></i>
                    Приказ об освобождении от занятий
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

                    {/* Основание */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-file-text me-2"></i>Основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>На основании <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="basis"
                            value={form.basis}
                            onChange={handleChange}
                            placeholder="писем общества с ограниченной ответственностью «Макацуге» от 14.01.2026 №1 и № 2, заявлений учащегося..."
                            required
                        />
                    </Form.Group>

                    {/* Учащийся */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person me-2"></i>Учащийся
                    </h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="groupId" value={form.groupId} onChange={handleGroupChange} required>
                                    <option value="">— Выберите —</option>
                                    {data.groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.group_number}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Студент <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="studentId" value={form.studentId} onChange={handleChange} disabled={!form.groupId} required>
                                    <option value="">— Выберите —</option>
                                    {groupStudents.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {formatFio(s)}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    {form.groupId && (
                        <div className="mb-3 p-2 bg-light rounded">
                            <small className="text-muted d-block">
                                <i className="bi bi-mortarboard me-1"></i>
                                Специальность: <strong>{selectedSpecialty?.name || '—'}</strong>
                            </small>
                            <small className="text-muted d-block mt-1">
                                <i className="bi bi-person-badge me-1"></i>
                                Куратор: <strong>{curatorName || '—'}</strong>
                            </small>
                        </div>
                    )}

                    {/* Периоды освобождения */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-calendar-range me-2"></i>Периоды освобождения
                    </h6>
                    {form.periods.map((period, index) => (
                        <Card key={index} className="mb-3 border">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <strong>Период {index + 1}</strong>
                                    {form.periods.length > 1 && (
                                        <Button variant="outline-danger" size="sm" onClick={() => removePeriod(index)}>
                                            <i className="bi bi-x"></i>
                                        </Button>
                                    )}
                                </div>
                                <Row className="mb-2">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label>С <span className="text-danger">*</span></Form.Label>
                                            <Form.Control type="text" value={period.dateFrom} onChange={(e) => handlePeriodChange(index, 'dateFrom', e.target.value)} placeholder="17.01.2026" required />
                                        </Form.Group>
                                    </Col>
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label>По (если несколько дней)</Form.Label>
                                            <Form.Control type="text" value={period.dateTo} onChange={(e) => handlePeriodChange(index, 'dateTo', e.target.value)} placeholder="31.01.2026" />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Form.Group className="mb-2">
                                    <Form.Label>Мероприятие <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="text" value={period.eventName} onChange={(e) => handlePeriodChange(index, 'eventName', e.target.value)} placeholder='спортивно-массовом мероприятии «Благотворительный рождественский турнир»' required />
                                </Form.Group>
                                <Form.Group className="mb-2">
                                    <Form.Label>Адрес <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="text" value={period.eventAddress} onChange={(e) => handlePeriodChange(index, 'eventAddress', e.target.value)} placeholder="г. Минск, пр-т Победителей, 105Б" required />
                                </Form.Group>
                            </Card.Body>
                        </Card>
                    ))}
                    <Button variant="outline-primary" size="sm" onClick={addPeriod} className="mb-4">
                        <i className="bi bi-plus me-1"></i>
                        Добавить период
                    </Button>

                    {/* Ответственные */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-person-lines-fill me-2"></i>Ответственные
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Ответственность за жизнь и безопасность возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="responsible" value={form.responsible} onChange={handleChange} placeholder="тренера (директора ООО «Макацуге») Ленкова Д.С." required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="controlPerson" value={form.controlPerson} onChange={handleChange} placeholder="заведующего отделением Звягину Д.Ч." required />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control type="text" name="headOfDepartment" value={form.headOfDepartment} onChange={handleChange} placeholder="Д.Ч.Звягина" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Юрисконсульт</Form.Label>
                                <Form.Control type="text" name="legalCounsel" value={form.legalCounsel} onChange={handleChange} placeholder="Н.В.Демьянович" />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group>
                        <Form.Label>С приказом ознакомлен(а) (каждый с новой строки)</Form.Label>
                        <Form.Control as="textarea" rows={2} name="acquainted" value={form.acquainted} onChange={handleChange} placeholder="Д.В.Бокач" />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>Отмена</Button>
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

export default ReleaseOrderModal;
