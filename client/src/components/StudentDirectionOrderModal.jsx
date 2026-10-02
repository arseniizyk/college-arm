import React, { useState, useContext, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { formatFioShort } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import OrderStudentSelector from './OrderStudentSelector';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';

const INITIAL = {
    groupId: '',
    eventName: '',
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

    const curatorTeacher = selectedGroup?.supervisor?.teacher;
    const curatorName = curatorTeacher
        ? formatFioShort(curatorTeacher)
        : '';

    const handleGroupChange = (e) => {
        setForm(prev => ({ ...prev, groupId: e.target.value }));
        setSelectedStudentIds([]);
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (name === 'groupId') {
            setSelectedStudentIds([]);
        }
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.eventName || !form.eventDate || !form.eventTime ||
            !form.eventAddress || !form.responsible || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного студента');
            return;
        }

        const selectedStudents = groupStudents.filter(s => selectedStudentIds.includes(String(s.id)));

        const payload = {
            eventName: form.eventName,
            eventDate: form.eventDate,
            eventTime: form.eventTime,
            eventAddress: form.eventAddress,
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            curatorName,
            students: selectedStudents.map(s => ({
                lastName: s.last_name,
                firstName: s.name,
                fatherName: s.father_name || '',
            })),
            responsible: form.responsible,
            instructorFrom: form.instructorFrom,
            instructorTo: form.instructorTo,
            trainingPerson: form.trainingPerson,
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
                fileName: 'Приказ_направление_учащихся'
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
        <BaseOrderModal
            show={show}
            onHide={handleClose}
            title="Приказ о направлении учащихся"
            icon="bi bi-send"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
            {/* Мероприятие */}
            <h6 className="text-muted mb-3 border-bottom pb-2">
                <i className="bi bi-info-circle me-2"></i>Мероприятие
            </h6>
            <Form.Group className="mb-3">
                <Form.Label>Название мероприятия <span className="text-danger">*</span></Form.Label>
                <Form.Control
                    type="text"
                    name="eventName"
                    value={form.eventName}
                    onChange={handleChange}
                    placeholder="финале Республиканских соревнований по хоккею с шайбой..."
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

            {/* Подписи и основание */}
            <OrderSignaturesSection
                formData={form}
                handleChange={handleChange}
                fields={['controlPerson', 'deputyDirector', 'headOfDepartment', 'legalCounsel']}
                labels={{
                    deputyDirector: 'Зам. директора по УВР',
                }}
                placeholders={{
                    controlPerson: 'заместителя директора по учебно-воспитательной работе Сотникову О.А.',
                    deputyDirector: 'О.А.Сотникова',
                    headOfDepartment: 'Е.В.Макаренко',
                    legalCounsel: 'Н.В.Демьянович',
                }}
                extra={
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
                }
            >
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
            </OrderSignaturesSection>
        </BaseOrderModal>
    );
});

export default StudentDirectionOrderModal;
