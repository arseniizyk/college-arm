import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { formatFioShort } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import OrderStudentSelector from './OrderStudentSelector';

const INITIAL = {
    groupId: '',
    eventDescription: '',
    eventDate: '',
    eventTime: '',
    eventAddress: '',
    responsible: '',
    instructorFrom: '',
    instructorTo: '',
    trainingPerson: '',
    controlPerson: '',
    basis: '',
    deputyDirector: '',
    headOfDepartment: '',
    legalCounsel: '',
    acquainted: '',
};

const StudentDirectionOrderModal = observer(({ show, onHide }) => {
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

    // Куратор берётся из вложенного supervisor.teacher в группе
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
        setForm(prev => ({ ...prev, groupId: e.target.value }));
        setSelectedStudentIds([]);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.eventDescription || !form.eventDate || !form.eventTime ||
            !form.eventAddress || !form.responsible ||
            !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного студента');
            return;
        }

        const selectedStudents = groupStudents.filter(s => selectedStudentIds.includes(String(s.id)));

        const payload = {
            eventDescription: form.eventDescription,
            eventDate: form.eventDate,
            eventTime: form.eventTime,
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            eventAddress: form.eventAddress,
            students: selectedStudents.map(s => ({
                lastName: s.last_name,
                firstName: s.name,
                fatherName: s.father_name || '',
            })),
            responsible: form.responsible,
            instructorFrom: form.instructorFrom,
            instructorTo: form.instructorTo,
            trainingPerson: form.trainingPerson,
            curatorName,
            controlPerson: form.controlPerson,
            basis: form.basis,
            deputyDirector: form.deputyDirector,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
            acquainted: form.acquainted
                ? form.acquainted.split('\n').map(s => s.trim()).filter(Boolean)
                : [],
        };

        setLoading(true);
        try {
            await downloadDoc(orderUrl('student-direction'), {
                payload,
                fileName: 'Приказ_направление'
            });

            onHide();
            setForm(INITIAL);
            setSelectedStudentIds([]);
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
                    <i className="bi bi-send me-2"></i>
                    Приказ о направлении обучающихся
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

                    {/* Мероприятие */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-calendar-event me-2"></i>Мероприятие
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Для участия <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="eventDescription"
                            value={form.eventDescription}
                            onChange={handleChange}
                            placeholder="в качестве зрителей в финале международных соревнований по хоккею с шайбой «Кубок Будущего»"
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>Дата <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="eventDate"
                                    value={form.eventDate}
                                    onChange={handleChange}
                                    placeholder="05 февраля 2026"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Время <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="eventTime"
                                    value={form.eventTime}
                                    onChange={handleChange}
                                    placeholder="17:00"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Адрес <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="eventAddress"
                            value={form.eventAddress}
                            onChange={handleChange}
                            placeholder="г. Минск, ул. Ташкентская, 19 (ГКСУ «Чижовка-Арена»)"
                            required
                        />
                    </Form.Group>

                    {/* Группа и студенты */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-mortarboard me-2"></i>Группа
                    </h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="groupId" value={form.groupId} onChange={handleGroupChange} required>
                                    <option value="">Выберите</option>
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
                                        <i className="bi bi-person-badge me-1"></i>
                                        Куратор: <strong>{curatorName || '—'}</strong>
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

                    {/* Ответственные */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Ответственные
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Ответственность за жизнь и здоровье учащихся возложить <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="responsible"
                            value={form.responsible}
                            onChange={handleChange}
                            placeholder="педагога-организатора Плыгавко М.А."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Поручить проведение инструктажа (должность, ФИО в дательном падеже):</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="instructorFrom"
                                    value={form.instructorFrom}
                                    onChange={handleChange}
                                    placeholder="Инженеру по охране труда Пуршневу А.В."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Кому проводит инструктаж</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="instructorTo"
                                    value={form.instructorTo}
                                    onChange={handleChange}
                                    placeholder="Плыгавко М.А."
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Поручить проведение обучающего занятия (должность, ФИО в дательном падеже): </Form.Label>
                        <Form.Control
                            type="text"
                            name="trainingPerson"
                            value={form.trainingPerson}
                            onChange={handleChange}
                            placeholder="Педагогу-организатору Плыгавко М.А."
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="controlPerson"
                            value={form.controlPerson}
                            onChange={handleChange}
                            placeholder="заместителя директора по учебно-воспитательной работе Сотникову О.А."
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
                            placeholder="докладная начальника отдела по идеологической и воспитательной работе Ковальчук О.В. от 05.02.2026."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Зам. директора по УВР</Form.Label>
                                <Form.Control type="text" name="deputyDirector" value={form.deputyDirector} onChange={handleChange} placeholder="О.А.Сотникова" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control type="text" name="headOfDepartment" value={form.headOfDepartment} onChange={handleChange} placeholder="Е.В.Макаренко" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Юрисконсульт</Form.Label>
                                <Form.Control type="text" name="legalCounsel" value={form.legalCounsel} onChange={handleChange} placeholder="Н.В.Демьянович" />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group>
                        <Form.Label>С приказом ознакомлены (каждый с новой строки)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="acquainted"
                            value={form.acquainted}
                            onChange={handleChange}
                            placeholder="О.В.Ковальчук&#10;Т.И.Поклад&#10;А.В.Пуршнев&#10;М.А.Плыгавко"
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

export default StudentDirectionOrderModal;
