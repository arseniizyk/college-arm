import React, { useState, useContext, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { calculateCourse } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import OrderStudentSelector from './OrderStudentSelector';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';
import { formatDotDate, toIsoDate } from '../utils/dateFormatters';

const SEMESTERS = [
    { value: 'первый', label: '1 семестр' },
    { value: 'второй', label: '2 семестр' },
    { value: 'третий', label: '3 семестр' },
    { value: 'четвертый', label: '4 семестр' },
    { value: 'пятый', label: '5 семестр' },
    { value: 'шестой', label: '6 семестр' },
    { value: 'седьмой', label: '7 семестр' },
    { value: 'восьмой', label: '8 семестр' },
];

const INITIAL = {
    groupId: '',
    semesterFrom: '',
    academicYearFrom: '',
    semesterTo: '',
    academicYearTo: '',
    dateFrom: '',
    dateTo: '',
    controlPerson: '',
    basis: '',
    headOfDepartment: '',
    chiefAccountant: '',
    legalCounsel: '',
};

const StipendOrderModal = observer(({ show, onHide }) => {
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
        if (name === 'groupId') {
            setSelectedStudentIds([]);
        }
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

        if (!form.groupId || !form.semesterFrom || !form.academicYearFrom ||
            !form.semesterTo || !form.academicYearTo || !form.dateFrom || !form.dateTo ||
            !form.controlPerson || !form.basis) {
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
            semesterFrom: form.semesterFrom,
            academicYearFrom: form.academicYearFrom,
            semesterTo: form.semesterTo,
            academicYearTo: form.academicYearTo,
            dateFrom: form.dateFrom,
            dateTo: form.dateTo,
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
            await downloadDoc(orderUrl('stipend'), {
                payload,
                fileName: 'Приказ_стипендия'
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
            title="Приказ о стипендии"
            icon="bi bi-cash-coin"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
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

            {/* Семестры */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                <i className="bi bi-journal-text me-2"></i>Семестры
            </h6>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Label className="fw-semibold">За результаты <span className="text-danger">*</span></Form.Label>
                    <Row className="g-2">
                        <Col>
                            <Form.Select name="semesterFrom" value={form.semesterFrom} onChange={handleChange} required style={{ height: '38px', padding: '0.25rem 0.5rem' }}>
                                <option value="">— Семестр —</option>
                                {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </Form.Select>
                        </Col>
                        <Col>
                            <Form.Control
                                type="text"
                                name="academicYearFrom"
                                value={form.academicYearFrom}
                                onChange={handleChange}
                                placeholder="2025/2026"
                                required
                            />
                        </Col>
                    </Row>
                </Col>
                <Col md={6}>
                    <Form.Label className="fw-semibold">На семестр <span className="text-danger">*</span></Form.Label>
                    <Row className="g-2">
                        <Col>
                            <Form.Select name="semesterTo" value={form.semesterTo} onChange={handleChange} required style={{ height: '38px', padding: '0.25rem 0.5rem' }}>
                                <option value="">— Семестр —</option>
                                {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </Form.Select>
                        </Col>
                        <Col>
                            <Form.Control
                                type="text"
                                name="academicYearTo"
                                value={form.academicYearTo}
                                onChange={handleChange}
                                placeholder="2025/2026"
                                required
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Период */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                <i className="bi bi-calendar-range me-2"></i>Период назначения
            </h6>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>С <span className="text-danger">*</span></Form.Label>
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

            {/* Подписи и основание */}
            <OrderSignaturesSection
                formData={form}
                handleChange={handleChange}
                fields={['controlPerson', 'chiefAccountant', 'headOfDepartment', 'legalCounsel']}
                placeholders={{
                    controlPerson: 'главного бухгалтера Метта М.В., заведующего отделением Макаренко Е.В.',
                    chiefAccountant: 'М.В.Метта',
                    headOfDepartment: 'Е.В.Макаренко',
                    legalCounsel: 'Н.В.Демьянович',
                }}
            >
                <Form.Group className="mb-3">
                    <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                    <Form.Control as="textarea" rows={2} name="basis" value={form.basis} onChange={handleChange} placeholder="докладная записка заведующего отделением Макаренко Е.В. от 08.01.2026" required />
                </Form.Group>
            </OrderSignaturesSection>
        </BaseOrderModal>
    );
});

export default StipendOrderModal;
