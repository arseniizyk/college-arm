import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { formatFio, formatFioShort } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';

const INITIAL = {
    groupId: '',
    studentId: '',
    dateFrom: '',
    dateTo: '',
    healthReason: '',
    responsiblePerson: '',
    controlPerson: '',
    basis: '',
    headOfDepartment: '',
    legalCounsel: '',
    acquainted: '',
};

const HealthOrderModal = observer(({ show, onHide }) => {
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

    // Куратор из вложенного supervisor.teacher
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.studentId || !form.dateFrom || !form.dateTo ||
            !form.healthReason || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        const payload = {
            dateFrom: form.dateFrom,
            dateTo: form.dateTo,
            studentLastName: selectedStudent?.last_name || '',
            studentFirstName: selectedStudent?.name || '',
            studentFatherName: selectedStudent?.father_name || '',
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            healthReason: form.healthReason,
            responsiblePerson: form.responsiblePerson,
            curatorName,
            controlPerson: form.controlPerson,
            basis: form.basis,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
            acquainted: form.acquainted
                ? form.acquainted.split('\n').map(s => s.trim()).filter(Boolean)
                : [],
        };

        setLoading(true);
        try {
            await downloadDoc('/api/generate/admin/health-order', {
                payload,
                fileName: 'Приказ_оздоровление'
            });

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
                    <i className="bi bi-heart-pulse me-2"></i>
                    Приказ об освобождении от занятий (оздоровление)
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

                    {/* Группа и студент */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-mortarboard me-2"></i>Учащийся
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

                    {/* Период */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-calendar-range me-2"></i>Период освобождения
                    </h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>С <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="dateFrom" value={form.dateFrom} onChange={handleChange} placeholder="11.02.2026" required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>По <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="dateTo" value={form.dateTo} onChange={handleChange} placeholder="01.03.2026" required />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>В связи с <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="healthReason"
                            value={form.healthReason}
                            onChange={handleChange}
                            placeholder="необходимостью оздоровления в УП «Санаторий «НЕМАН-72»"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Ответственность за жизнь и здоровье несёт</Form.Label>
                        <Form.Control
                            type="text"
                            name="responsiblePerson"
                            value={form.responsiblePerson}
                            onChange={handleChange}
                            placeholder="законный представитель (мать) Бережная З.П."
                        />
                    </Form.Group>

                    {/* Подписи и основание */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="controlPerson" value={form.controlPerson} onChange={handleChange} placeholder="заведующего отделением Макаренко Е.В." required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="basis"
                            value={form.basis}
                            onChange={handleChange}
                            placeholder="1. Заявление учащегося Юрова А.В. от 06.02.2026&#10;2. Заявление (матери) Бережной З.П. от 06.02.2026&#10;3. Копия путевки № 0055458."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control type="text" name="headOfDepartment" value={form.headOfDepartment} onChange={handleChange} placeholder="Е.В.Макаренко" />
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
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="acquainted"
                            value={form.acquainted}
                            onChange={handleChange}
                            placeholder="Е.П.Сушкевич"
                        />
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

export default HealthOrderModal;
