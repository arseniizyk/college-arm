import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import OrderStudentSelector from './OrderStudentSelector';
import { calculateCourse } from '../utils/dataHelpers';

const INITIAL = {
    groupId: '',
    academicYear: '',
    nextCourse: '',
    dateFrom: '',
    dateTo: '',
    basis: '',
    deputyDirector: '',
    chiefAccountant: '',
    headOfDepartment: '',
    conditionalStudentId: '',
};

const TransferOrderModal = observer(({ show, onHide }) => {
    const { data } = useContext(Context);
    const [form, setForm] = useState(INITIAL);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [showConditional, setShowConditional] = useState(false);
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

    // Текущий курс → следующий курс автоматически
    const currentCourse = selectedGroup
        ? calculateCourse(selectedGroup.enroll_date, selectedSpecialty?.duration_years || 4, selectedSpecialty?.duration_months || 0)
        : null;
    const autoNextCourse = currentCourse && currentCourse !== 'Выпускник'
        ? String(parseInt(currentCourse) + 1)
        : '';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleGroupChange = (e) => {
        const groupId = e.target.value;
        const group = data.groups.find(g => g.id === parseInt(groupId));
        const specialty = data.specialties.find(s => s.id === group?.specialtyId);
        const course = group
            ? calculateCourse(group.enroll_date, specialty?.duration_years || 4, specialty?.duration_months || 0)
            : null;
        const nextCourse = course && course !== 'Выпускник' ? String(parseInt(course) + 1) : '';
        setForm(prev => ({ ...prev, groupId, nextCourse }));
        setSelectedStudentIds([]);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.academicYear || !form.nextCourse ||
            !form.dateFrom || !form.dateTo || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного студента');
            return;
        }

        const fullGroup = selectedStudentIds.length === groupStudents.length;
        const selectedStudents = groupStudents.filter(s => selectedStudentIds.includes(String(s.id)));

        const conditionalStudentObj = showConditional && form.conditionalStudentId
            ? groupStudents.find(s => s.id === parseInt(form.conditionalStudentId))
            : null;

        const payload = {
            academicYear: form.academicYear,
            nextCourse: form.nextCourse,
            dateFrom: form.dateFrom,
            dateTo: form.dateTo,
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            fullGroup,
            students: selectedStudents.map(s => ({
                lastName: s.last_name,
                firstName: s.name,
                fatherName: s.father_name || '',
            })),
            conditionalStudent: conditionalStudentObj ? {
                lastName: conditionalStudentObj.last_name,
                firstName: conditionalStudentObj.name,
                fatherName: conditionalStudentObj.father_name || '',
            } : null,
            basis: form.basis,
            deputyDirector: form.deputyDirector,
            chiefAccountant: form.chiefAccountant,
            headOfDepartment: form.headOfDepartment,
        };

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/generate/admin/transfer-order`,
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
            a.download = `Приказ_перевод_${Date.now()}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);

            onHide();
            setForm(INITIAL);
            setSelectedStudentIds([]);
            setShowConditional(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm(INITIAL);
        setSelectedStudentIds([]);
        setShowConditional(false);
        setError(null);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-arrow-up-circle me-2"></i>
                    Приказ о переводе на следующий курс
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

                    {/* Учебный год и курс */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-journal-text me-2"></i>Параметры перевода
                    </h6>
                    <Row className="mb-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Учебный год <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="academicYear"
                                    value={form.academicYear}
                                    onChange={handleChange}
                                    placeholder="2024/2025"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Каникулы с <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="dateFrom" value={form.dateFrom} onChange={handleChange} placeholder="12.07.2025" required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>По <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="dateTo" value={form.dateTo} onChange={handleChange} placeholder="31.08.2025" required />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Группа и студенты */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-mortarboard me-2"></i>Группа
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
                        {form.groupId && (
                            <Col md={6}>
                                <div className="p-2 bg-light rounded h-100 d-flex flex-column justify-content-center">
                                    <small className="text-muted d-block">
                                        <i className="bi bi-mortarboard me-1"></i>
                                        Специальность: <strong>{selectedSpecialty?.name || '—'}</strong>
                                    </small>
                                    <small className="text-muted d-block mt-1">
                                        <i className="bi bi-arrow-up-circle me-1"></i>
                                        Перевод на курс: <strong>{form.nextCourse || '—'}</strong>
                                    </small>
                                    <small className="text-muted d-block mt-1">
                                        <i className="bi bi-people me-1"></i>
                                        Студентов: <strong>{groupStudents.length}</strong>
                                    </small>
                                </div>
                            </Col>
                        )}
                    </Row>

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

                    {/* Условный перевод */}
                    <div className="mb-3">
                        <Form.Check
                            type="checkbox"
                            id="showConditional"
                            label="Добавить условный перевод (п.2)"
                            checked={showConditional}
                            onChange={(e) => setShowConditional(e.target.checked)}
                        />
                    </div>

                    {showConditional && (
                        <div className="p-3 border rounded mb-3">
                            <Form.Label className="fw-semibold mb-3">Учащийся с академической задолженностью</Form.Label>
                            <Form.Select
                                name="conditionalStudentId"
                                value={form.conditionalStudentId}
                                onChange={handleChange}
                                disabled={!form.groupId}
                            >
                                <option value="">— Выберите студента —</option>
                                {groupStudents.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.last_name} {s.name} {s.father_name || ''}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>
                    )}

                    {/* Подписи и основание */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="basis"
                            value={form.basis}
                            onChange={handleChange}
                            placeholder="докладная записка заведующего отделением Гриневича П.Р. от 11.07.2025."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Зам. директора</Form.Label>
                                <Form.Control type="text" name="deputyDirector" value={form.deputyDirector} onChange={handleChange} placeholder="Е.В.Филипцова" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Главный бухгалтер</Form.Label>
                                <Form.Control type="text" name="chiefAccountant" value={form.chiefAccountant} onChange={handleChange} placeholder="М.В.Метта" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control type="text" name="headOfDepartment" value={form.headOfDepartment} onChange={handleChange} placeholder="П.Р.Гриневич" />
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

export default TransferOrderModal;
