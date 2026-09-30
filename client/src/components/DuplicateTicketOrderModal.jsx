import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { formatFio, formatFioShort } from '../utils/dataHelpers';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';

const INITIAL = {
    groupId: '',
    studentId: '',
    lossReason: 'оригинал утерян',
    controlPerson: '',
    basis: '',
    headOfDepartment: '',
    legalCounsel: '',
};

const DuplicateTicketOrderModal = observer(({ show, onHide }) => {
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

        if (!form.groupId || !form.studentId || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        // Инициалы для основания
        const initials = selectedStudent
            ? formatFioShort(selectedStudent)
            : '';

        const payload = {
            studentLastName: selectedStudent?.last_name || '',
            studentFirstName: selectedStudent?.name || '',
            studentFatherName: selectedStudent?.father_name || '',
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            lossReason: form.lossReason,
            controlPerson: form.controlPerson,
            basis: form.basis || `заявление ${initials} от`,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
        };

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:7000'}/api/generate/admin/duplicate-ticket-order`,
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
            a.download = `Приказ_дубликат_билета_${Date.now()}.docx`;
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
                    <i className="bi bi-card-text me-2"></i>
                    Приказ о выдаче дубликата билета учащегося
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

                    {/* Учащийся */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
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
                            <small className="text-muted">
                                <i className="bi bi-mortarboard me-1"></i>
                                Специальность: <strong>{selectedSpecialty?.name || '—'}</strong>
                            </small>
                        </div>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Причина выдачи дубликата <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="lossReason"
                            value={form.lossReason}
                            onChange={handleChange}
                            placeholder="оригинал утерян"
                            required
                        />
                    </Form.Group>

                    {/* Подписи и основание */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="controlPerson" value={form.controlPerson} onChange={handleChange} placeholder="заведующего отделением Гриневича П.Р." required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="basis"
                            value={form.basis}
                            onChange={handleChange}
                            placeholder="заявление Паплёвка М.Д. от 05.01.2026."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control type="text" name="headOfDepartment" value={form.headOfDepartment} onChange={handleChange} placeholder="П.Р.Гриневич" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Юрисконсульт</Form.Label>
                                <Form.Control type="text" name="legalCounsel" value={form.legalCounsel} onChange={handleChange} placeholder="Н.В.Демьянович" />
                            </Form.Group>
                        </Col>
                    </Row>
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

export default DuplicateTicketOrderModal;
