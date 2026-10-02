import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import { formatFio } from '../utils/dataHelpers';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';

const INITIAL_EXCEPTION = { studentId: '', stipendType: 'WITHOUT_STIPEND' };
const INITIAL_GROUP = { groupId: '', subgroup1Count: '', subgroup2Count: '', studentExceptions: [] };

const INITIAL = {
    enrollDate: '',
    year: '',
    stipendCoefficient: '1.0',
    protocolInfo: '',
    groups: [{ ...INITIAL_GROUP }],
    controlPerson: '',
    basis: '',
    responsibleSecretary: '',
    deputyDirector: '',
    legalCounsel: '',
    chiefAccountant: '',
};

const EnrollmentOrderModal = observer(({ show, onHide }) => {
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

    const getGroupStudents = (groupId) =>
        groupId ? data.students.filter(s => s.groupId === parseInt(groupId)) : [];

    const getGroupInfo = (groupId) => {
        const group = data.groups.find(g => g.id === parseInt(groupId));
        const specialty = data.specialties.find(s => s.id === group?.specialtyId);
        return { group, specialty };
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleGroupChange = (index, value) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = { ...groups[index], groupId: value, studentExceptions: [] };
            return { ...prev, groups };
        });
        setError(null);
    };

    const handleSubgroupChange = (index, field, value) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = { ...groups[index], [field]: value };
            return { ...prev, groups };
        });
        setError(null);
    };

    const addGroup = () => {
        setForm(prev => ({ ...prev, groups: [...prev.groups, { ...INITIAL_GROUP }] }));
    };

    const removeGroup = (index) => {
        setForm(prev => ({ ...prev, groups: prev.groups.filter((_, i) => i !== index) }));
    };

    const addException = (groupIndex) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[groupIndex] = {
                ...groups[groupIndex],
                studentExceptions: [...groups[groupIndex].studentExceptions, { ...INITIAL_EXCEPTION }]
            };
            return { ...prev, groups };
        });
    };

    const removeException = (groupIndex, excIndex) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[groupIndex] = {
                ...groups[groupIndex],
                studentExceptions: groups[groupIndex].studentExceptions.filter((_, i) => i !== excIndex)
            };
            return { ...prev, groups };
        });
    };

    const handleExceptionChange = (groupIndex, excIndex, field, value) => {
        setForm(prev => {
            const groups = [...prev.groups];
            const exceptions = [...groups[groupIndex].studentExceptions];
            exceptions[excIndex] = { ...exceptions[excIndex], [field]: value };
            groups[groupIndex] = { ...groups[groupIndex], studentExceptions: exceptions };
            return { ...prev, groups };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.enrollDate || !form.year || !form.protocolInfo || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        for (let i = 0; i < form.groups.length; i++) {
            const g = form.groups[i];
            if (!g.groupId) {
                setError(`Выберите группу для записи #${i + 1}`);
                return;
            }
            const students = getGroupStudents(g.groupId);
            if (!students.length) {
                setError(`В выбранной группе #${i + 1} нет студентов`);
                return;
            }
        }

        const payload = {
            enrollDate: form.enrollDate,
            year: form.year,
            stipendCoefficient: form.stipendCoefficient || '1.0',
            protocolInfo: form.protocolInfo,
            basis: form.basis,
            controlPerson: form.controlPerson,
            responsibleSecretary: form.responsibleSecretary,
            deputyDirector: form.deputyDirector,
            legalCounsel: form.legalCounsel,
            chiefAccountant: form.chiefAccountant,
            groups: form.groups.map(g => {
                const { group, specialty } = getGroupInfo(g.groupId);
                const students = getGroupStudents(g.groupId);
                return {
                    groupNumber: group?.group_number || '',
                    specialtyName: specialty?.name || '',
                    subgroup1Count: g.subgroup1Count ? parseInt(g.subgroup1Count) : undefined,
                    subgroup2Count: g.subgroup2Count ? parseInt(g.subgroup2Count) : undefined,
                    students: students.map(s => ({
                        lastName: s.last_name,
                        firstName: s.name,
                        fatherName: s.father_name || '',
                    })),
                    studentExceptions: g.studentExceptions
                        .filter(exc => exc.studentId)
                        .map(exc => {
                            const student = students.find(s => s.id === parseInt(exc.studentId));
                            return {
                                lastName: student?.last_name || '',
                                firstName: student?.name || '',
                                fatherName: student?.father_name || '',
                                stipendType: exc.stipendType,
                            };
                        }),
                };
            }),
        };

        setLoading(true);
        try {
            await downloadDoc(orderUrl('enrollment'), {
                payload,
                fileName: 'Приказ_зачисление'
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
        <BaseOrderModal
            show={show}
            onHide={handleClose}
            title="Приказ о зачислении"
            icon="bi bi-person-plus"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
            {/* Общие параметры */}
            <h6 className="text-muted mb-3 border-bottom pb-2">
                <i className="bi bi-calendar me-2"></i>Параметры зачисления
            </h6>
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Дата зачисления <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="enrollDate" value={form.enrollDate} onChange={handleChange} placeholder="1 сентября 2025" required />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label>Год <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="year" value={form.year} onChange={handleChange} placeholder="2025" required />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label>Коэф. стипендии</Form.Label>
                        <Form.Control type="text" name="stipendCoefficient" value={form.stipendCoefficient} onChange={handleChange} placeholder="1.0" />
                    </Form.Group>
                </Col>
            </Row>
            <Row className="mb-3">
                <Col md={12}>
                    <Form.Group>
                        <Form.Label>Протокол приемной комиссии <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="protocolInfo" value={form.protocolInfo} onChange={handleChange} placeholder="протокол № 2 от 02.08.2025" required />
                    </Form.Group>
                </Col>
            </Row>

            {/* Группы */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                <i className="bi bi-people me-2"></i>Группы
            </h6>

            {form.groups.map((g, index) => {
                const groupStudents = getGroupStudents(g.groupId);
                const { specialty } = getGroupInfo(g.groupId);
                return (
                    <Card key={index} className="mb-3 border">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <strong>Группа {index + 1}</strong>
                                {form.groups.length > 1 && (
                                    <Button variant="outline-danger" size="sm" onClick={() => removeGroup(index)}>
                                        <i className="bi bi-x"></i>
                                    </Button>
                                )}
                            </div>
                            <Form.Group className="mb-3">
                                <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    value={g.groupId}
                                    onChange={(e) => handleGroupChange(index, e.target.value)}
                                    required
                                >
                                    <option value="">— Выберите —</option>
                                    {data.groups.map(gr => (
                                        <option key={gr.id} value={gr.id}>{gr.group_number}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            {g.groupId && (
                                <div className="mb-3 p-2 bg-light rounded">
                                    <small className="text-muted d-block">
                                        <i className="bi bi-mortarboard me-1"></i>
                                        Специальность: <strong>{specialty?.name || '—'}</strong>
                                    </small>
                                    <small className="text-muted d-block mt-1">
                                        <i className="bi bi-people me-1"></i>
                                        Студентов в базе: <strong>{groupStudents.length}</strong>
                                    </small>
                                </div>
                            )}

                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>1-я подгруппа (чел.)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={g.subgroup1Count}
                                            onChange={(e) => handleSubgroupChange(index, 'subgroup1Count', e.target.value)}
                                            placeholder="напр. 15"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>2-я подгруппа (чел.)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={g.subgroup2Count}
                                            onChange={(e) => handleSubgroupChange(index, 'subgroup2Count', e.target.value)}
                                            placeholder="напр. 15"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Исключения по стипендии */}
                            {g.groupId && (
                                <div className="mt-3">
                                    <Form.Label className="text-muted small fw-semibold">
                                        Исключения по стипендии (без стипендии / социальная):
                                    </Form.Label>
                                    {g.studentExceptions.map((exc, excIdx) => (
                                        <Row key={excIdx} className="mb-2 align-items-center">
                                            <Col md={6}>
                                                <Form.Select
                                                    value={exc.studentId}
                                                    onChange={(e) => handleExceptionChange(index, excIdx, 'studentId', e.target.value)}
                                                >
                                                    <option value="">— Выберите студента —</option>
                                                    {groupStudents.map(s => (
                                                        <option key={s.id} value={s.id}>{formatFio(s)}</option>
                                                    ))}
                                                </Form.Select>
                                            </Col>
                                            <Col md={5}>
                                                <Form.Select
                                                    value={exc.stipendType}
                                                    onChange={(e) => handleExceptionChange(index, excIdx, 'stipendType', e.target.value)}
                                                >
                                                    <option value="WITHOUT_STIPEND">Без выплаты стипендии</option>
                                                    <option value="SOCIAL">Социальная стипендия</option>
                                                </Form.Select>
                                            </Col>
                                            <Col md={1}>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => removeException(index, excIdx)}
                                                >
                                                    <i className="bi bi-x"></i>
                                                </Button>
                                            </Col>
                                        </Row>
                                    ))}
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => addException(index)}
                                        className="mt-1"
                                    >
                                        <i className="bi bi-plus me-1"></i>Добавить исключение
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                );
            })}

            <Button variant="outline-primary" size="sm" onClick={addGroup} className="mb-4">
                <i className="bi bi-plus me-1"></i>Добавить группу
            </Button>

            {/* Подписи и основание */}
            <OrderSignaturesSection
                formData={form}
                handleChange={handleChange}
                fields={['controlPerson', 'responsibleSecretary', 'deputyDirector', 'legalCounsel', 'chiefAccountant']}
                colSize={6}
                labels={{
                    deputyDirector: 'Зам. директора по учебной работе',
                }}
                placeholders={{
                    controlPerson: 'заместителя директора по учебной работе Филипцову Е.В. и главного бухгалтера Метта М.В.',
                    responsibleSecretary: 'Д.Ч.Звягина',
                    deputyDirector: 'Е.В.Филипцова',
                    legalCounsel: 'Н.В.Демьянович',
                    chiefAccountant: 'М.В.Метта',
                }}
            >
                <Form.Group className="mb-3">
                    <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                    <Form.Control as="textarea" rows={3} name="basis" value={form.basis} onChange={handleChange} placeholder="1. Протокол заседания приемной комиссии № 2 от 02.08.2025;&#10;2. Договоры с абитуриентами..." required />
                </Form.Group>
            </OrderSignaturesSection>
        </BaseOrderModal>
    );
});

export default EnrollmentOrderModal;
