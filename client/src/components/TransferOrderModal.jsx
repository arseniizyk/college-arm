import React, { useState, useContext, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { formatFio, calculateCourse } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import OrderStudentSelector from './OrderStudentSelector';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';
import { formatDotDate, toIsoDate } from '../utils/dateFormatters';

const INITIAL = {
    groupId: '',
    academicYear: '',
    nextCourse: '',
    dateFrom: '',
    dateTo: '',
    conditionalStudentId: '',
    basis: '',
    deputyDirector: '',
    chiefAccountant: '',
    headOfDepartment: '',
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

    const handleGroupChange = (e) => {
        const gId = e.target.value;
        const grp = data.groups.find(g => g.id === parseInt(gId));
        const spec = data.specialties.find(s => s.id === grp?.specialtyId);
        const cCourse = grp
            ? calculateCourse(grp.enroll_date, spec?.duration_years || 4, spec?.duration_months || 0)
            : 0;

        const nextCourseVal = (typeof cCourse === 'number' && cCourse >= 1)
            ? String(cCourse + 1)
            : '';

        setForm(prev => ({
            ...prev,
            groupId: gId,
            nextCourse: nextCourseVal,
            conditionalStudentId: ''
        }));
        setSelectedStudentIds([]);
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'conditionalStudentId' && value) {
            const student = groupStudents.find(s => s.id === parseInt(value, 10));
            if (student?.expell_date) {
                const confirmed = window.confirm(
                    `Студент ${formatFio(student)} отчислен. Вы точно хотите выбрать его?`
                );
                if (!confirmed) {
                    e.target.value = form.conditionalStudentId || '';
                    return;
                }
            }
        }
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.academicYear || !form.nextCourse || !form.dateFrom || !form.dateTo || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного студента');
            return;
        }

        const fullGroup = selectedStudentIds.length === groupStudents.length;
        const selectedStudents = groupStudents.filter(s => selectedStudentIds.includes(String(s.id)));

        const conditionalStudent = showConditional && form.conditionalStudentId
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
            conditionalStudent: conditionalStudent ? {
                lastName: conditionalStudent.last_name,
                firstName: conditionalStudent.name,
                fatherName: conditionalStudent.father_name || '',
            } : null,
            basis: form.basis,
            deputyDirector: form.deputyDirector,
            chiefAccountant: form.chiefAccountant,
            headOfDepartment: form.headOfDepartment,
        };

        setLoading(true);
        try {
            await downloadDoc(orderUrl('transfer'), {
                payload,
                fileName: 'Приказ_перевод_курс'
            });

            handleClose();
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
        <BaseOrderModal
            show={show}
            onHide={handleClose}
            title="Приказ о переводе на следующий курс"
            icon="bi bi-arrow-up-circle"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
            {/* Параметры */}
            <h6 className="text-muted mb-3 border-bottom pb-2">
                <i className="bi bi-calendar-range me-2"></i>Параметры перевода
            </h6>
            <Row className="mb-3">
                <Col md={6}>
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
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Перевод на курс <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="nextCourse"
                            value={form.nextCourse}
                            onChange={handleChange}
                            placeholder="2"
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Каникулы с <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="date"
                            name="dateFrom"
                            value={toIsoDate(form.dateFrom)}
                            onChange={(e) => setForm(prev => ({ ...prev, dateFrom: formatDotDate(e.target.value) }))}
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>По <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="date"
                            name="dateTo"
                            value={toIsoDate(form.dateTo)}
                            onChange={(e) => setForm(prev => ({ ...prev, dateTo: formatDotDate(e.target.value) }))}
                            required
                        />
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
                                {formatFio(s)}{s.expell_date ? ' (отчислен)' : ''}
                            </option>
                        ))}
                    </Form.Select>
                </div>
            )}

            {/* Подписи и основание */}
            <OrderSignaturesSection
                formData={form}
                handleChange={handleChange}
                fields={['deputyDirector', 'chiefAccountant', 'headOfDepartment']}
                placeholders={{
                    deputyDirector: 'Е.В.Филипцова',
                    chiefAccountant: 'М.В.Метта',
                    headOfDepartment: 'П.Р.Гриневич',
                }}
            >
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
            </OrderSignaturesSection>
        </BaseOrderModal>
    );
});

export default TransferOrderModal;
