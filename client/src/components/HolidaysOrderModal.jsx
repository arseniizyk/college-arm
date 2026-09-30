import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { calculateCourse } from '../utils/dataHelpers';
import OrderStudentSelector from './OrderStudentSelector';

const INITIAL = {
    groupId: '',
    academicYear: '',
    dateFrom: '',
    dateTo: '',
    controlPerson: '',
    basis: '',
    headOfDepartment: '',
    chiefAccountant: '',
    legalCounsel: '',
};

const HolidaysOrderModal = observer(({ show, onHide }) => {
    const { data } = useContext(Context);
    const [form, setForm] = useState(INITIAL);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
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
    const computedCourse = selectedGroup
        ? calculateCourse(
            selectedGroup.enroll_date,
            selectedSpecialty?.duration_years || 4,
            selectedSpecialty?.duration_months || 0
          )
        : '';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.academicYear || !form.dateFrom || !form.dateTo || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного студента');
            return;
        }

        const fullGroup = selectedStudentIds.length === groupStudents.length;
        const selectedStudents = groupStudents.filter(s => selectedStudentIds.includes(String(s.id)));

        const payload = {
            dateFrom: form.dateFrom,
            dateTo: form.dateTo,
            academicYear: form.academicYear,
            specialtyName: selectedSpecialty?.name || '',
            course: computedCourse,
            groupNumber: selectedGroup?.group_number || '',
            fullGroup,
            students: selectedStudents.map(s => ({
                lastName: s.last_name,
                firstName: s.name,
                fatherName: s.father_name || '',
            })),
            controlPerson: form.controlPerson,
            basis: form.basis,
            headOfDepartment: form.headOfDepartment,
            chiefAccountant: form.chiefAccountant,
            legalCounsel: form.legalCounsel,
        };

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:7000'}/api/generate/admin/holidays-order`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
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
            a.download = `Приказ_каникулы_${Date.now()}.docx`;
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

    const handleClose = () => {
        setForm(INITIAL);
        setSelectedStudentIds([]);
        setError(null);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-calendar-heart me-2"></i>
                    Приказ об установлении каникул
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

                    {/* Группа */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-mortarboard me-2"></i>Группа
                    </h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="groupId" value={form.groupId} onChange={handleChange} required>
                                    <option value="">— Выберите —</option>
                                    {data.groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.group_number}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        {form.groupId && (
                            <Col md={6}>
                                <div className="p-2 bg-light rounded h-100 d-flex flex-column justify-content-center">
                                    <small className="text-muted d-block">
                                        <i className="bi bi-mortarboard me-1"></i>
                                        Специальность: <strong>{selectedSpecialty?.name || '—'}</strong>
                                    </small>
                                    <small className="text-muted d-block mt-1">
                                        <i className="bi bi-arrow-up-circle me-1"></i>
                                        Курс: <strong>{computedCourse}</strong>
                                    </small>
                                    <small className="text-muted d-block mt-1">
                                        <i className="bi bi-people me-1"></i>
                                        Студентов: <strong>{groupStudents.length}</strong>
                                    </small>
                                </div>
                            </Col>
                        )}
                    </Row>

                    {/* Студенты */}
                    {form.groupId && (
                        <div className="mb-3">
                            <Form.Label>Студенты <span className="text-danger">*</span></Form.Label>
                            <OrderStudentSelector
                                students={groupStudents}
                                selectedIds={selectedStudentIds}
                                onChange={setSelectedStudentIds}
                            />
                        </div>
                    )}

                    {/* Период каникул */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-calendar-range me-2"></i>Период каникул
                    </h6>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Учебный год <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="academicYear"
                                    value={form.academicYear}
                                    onChange={handleChange}
                                    placeholder="напр. 2025/2026"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>С <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="dateFrom"
                                    value={form.dateFrom}
                                    onChange={handleChange}
                                    placeholder="напр. 29.01.2026"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>По <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="dateTo"
                                    value={form.dateTo}
                                    onChange={handleChange}
                                    placeholder="напр. 11.02.2026"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Подписи и основание */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="controlPerson"
                            value={form.controlPerson}
                            onChange={handleChange}
                            placeholder="заведующего отделением робототехники и мобильных электронных систем Макаренко Е.В."
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="basis"
                            value={form.basis}
                            onChange={handleChange}
                            placeholder="докладная записка заведующего отделением Макаренко Е.В. от 28.01.2026."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="headOfDepartment"
                                    value={form.headOfDepartment}
                                    onChange={handleChange}
                                    placeholder="Е.В.Макаренко"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Главный бухгалтер</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="chiefAccountant"
                                    value={form.chiefAccountant}
                                    onChange={handleChange}
                                    placeholder="М.В.Метта"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Юрисконсульт</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="legalCounsel"
                                    value={form.legalCounsel}
                                    onChange={handleChange}
                                    placeholder="Н.В.Демьянович"
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

export default HolidaysOrderModal;
