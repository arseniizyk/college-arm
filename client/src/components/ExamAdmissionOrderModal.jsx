import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { calculateCourse } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import OrderStudentSelector from './OrderStudentSelector';

const INITIAL_SUBJECT = { date: '', subject: '', teacher: '' };

const INITIAL = {
    groupId: '',
    examSubjects: [{ ...INITIAL_SUBJECT }],
    controlPerson: '',
    basis: '',
    deputyDirector: '',
    legalCounsel: '',
    acquainted: '',
};

const ExamAdmissionOrderModal = observer(({ show, onHide }) => {
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

    // Автоматически вычисляем специальность и курс по группе
    const selectedGroup = data.groups.find(g => g.id === parseInt(form.groupId));
    const selectedSpecialty = data.specialties.find(s => s.id === selectedGroup?.specialtyId);
    const computedCourse = selectedGroup
        ? calculateCourse(
            selectedGroup.enroll_date,
            selectedSpecialty?.duration_years || 4,
            selectedSpecialty?.duration_months || 0
          )
        : '';

    const handleGroupChange = (e) => {
        setForm(prev => ({ ...prev, groupId: e.target.value }));
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubjectChange = (index, field, value) => {
        setForm(prev => {
            const subjects = [...prev.examSubjects];
            subjects[index] = { ...subjects[index], [field]: value };
            return { ...prev, examSubjects: subjects };
        });
    };

    const addSubject = () => {
        setForm(prev => ({
            ...prev,
            examSubjects: [...prev.examSubjects, { ...INITIAL_SUBJECT }]
        }));
    };

    const removeSubject = (index) => {
        setForm(prev => ({
            ...prev,
            examSubjects: prev.examSubjects.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (form.examSubjects.some(s => !s.date || !s.subject || !s.teacher)) {
            setError('Заполните все поля для каждого предмета');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного студента');
            return;
        }

        const fullGroup = selectedStudentIds.length === groupStudents.length;
        const selectedStudents = groupStudents.filter(s => selectedStudentIds.includes(String(s.id)));

        const payload = {
            examSubjects: form.examSubjects,
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
            deputyDirector: form.deputyDirector,
            legalCounsel: form.legalCounsel,
            acquainted: form.acquainted,
        };

        setLoading(true);
        try {
            await downloadDoc(orderUrl('exam-admission'), {
                payload,
                fileName: 'Приказ_допуск_экзамены',
                stamp: form.orderNumber || Date.now()
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
        setSelectedStudentIds([]);
        setError(null);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-pencil-square me-2"></i>
                    Приказ о допуске к экзаменам
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

                    {/* Предметы */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-journal-text me-2"></i>Предметы экзаменов <span className="text-danger">*</span>
                    </h6>
                    {form.examSubjects.map((subj, index) => (
                        <Row key={index} className="mb-2 align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    {index === 0 && <Form.Label>Дата</Form.Label>}
                                    <Form.Control
                                        type="text"
                                        value={subj.date}
                                        onChange={(e) => handleSubjectChange(index, 'date', e.target.value)}
                                        placeholder="06.12.2025"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    {index === 0 && <Form.Label>Предмет</Form.Label>}
                                    <Form.Control
                                        type="text"
                                        value={subj.subject}
                                        onChange={(e) => handleSubjectChange(index, 'subject', e.target.value)}
                                        placeholder="Экономика организации"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    {index === 0 && <Form.Label>Преподаватель</Form.Label>}
                                    <Form.Control
                                        type="text"
                                        value={subj.teacher}
                                        onChange={(e) => handleSubjectChange(index, 'teacher', e.target.value)}
                                        placeholder="Богдановская О.Н."
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={1} className="d-flex align-items-end pb-1">
                                {form.examSubjects.length > 1 && (
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => removeSubject(index)}
                                        style={{ width: '32px', height: '32px', padding: 0 }}
                                    >
                                        <i className="bi bi-x"></i>
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    ))}
                    <Button variant="outline-secondary" size="sm" onClick={addSubject} className="mb-3">
                        <i className="bi bi-plus me-1"></i>
                        Добавить предмет
                    </Button>

                    {/* Прочие поля */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением приказа возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="controlPerson"
                            value={form.controlPerson}
                            onChange={handleChange}
                            placeholder="заместителя директора по учебной работе Филипцову Е.В."
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
                            placeholder="докладная записка заведующего центром профессиональной и социальной реабилитации Гвоздик Т.В. от 04.12.2025."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Зам. директора по УР</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="deputyDirector"
                                    value={form.deputyDirector}
                                    onChange={handleChange}
                                    placeholder="Е.В.Филипцова"
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
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Ознакомлена</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="acquainted"
                                    value={form.acquainted}
                                    onChange={handleChange}
                                    placeholder="Т.В.Гвоздик"
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

export default ExamAdmissionOrderModal;
