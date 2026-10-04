import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import { validateEnrollmentGroups, buildEnrollmentGroupsPayload } from '../utils/enrollmentOrder';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';
import OrderStudentSelector from './OrderStudentSelector';

const INITIAL_EXCLUSION = { studentName: '', groupId: '', protocolInfo: '' };
const INITIAL_GROUP = { groupId: '', selectedStudentIds: [] };

const INITIAL = {
    enrollDate: '',
    year: '',
    stipendCoefficient: '1.0',
    protocolInfo: '',
    groups: [{ ...INITIAL_GROUP }],
    exclusions: [],
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
            groups[index] = { ...groups[index], groupId: value, selectedStudentIds: [] };
            return { ...prev, groups };
        });
        setError(null);
    };

    const handleStudentsChange = (groupIndex, selectedIds) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[groupIndex] = { ...groups[groupIndex], selectedStudentIds: selectedIds };
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

    const addExclusion = () => {
        setForm(prev => ({ ...prev, exclusions: [...prev.exclusions, { ...INITIAL_EXCLUSION }] }));
    };

    const removeExclusion = (index) => {
        setForm(prev => ({ ...prev, exclusions: prev.exclusions.filter((_, i) => i !== index) }));
    };

    const handleExclusionChange = (index, field, value) => {
        setForm(prev => {
            const exclusions = [...prev.exclusions];
            exclusions[index] = { ...exclusions[index], [field]: value };
            return { ...prev, exclusions };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.enrollDate || !form.year || !form.protocolInfo || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        const groupsError = validateEnrollmentGroups(form.groups, getGroupStudents);
        if (groupsError) {
            setError(groupsError);
            return;
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
            groups: buildEnrollmentGroupsPayload(form.groups, { getGroupStudents, getGroupInfo }),
            exclusions: form.exclusions
                .filter(exc => exc.studentName?.trim())
                .map(exc => {
                    const { group, specialty } = getGroupInfo(exc.groupId);
                    return {
                        studentName: exc.studentName.trim(),
                        groupNumber: group?.group_number || '',
                        specialtyName: specialty?.name || '',
                        protocolInfo: exc.protocolInfo || form.protocolInfo,
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
                                        Студентов в группе: <strong>{groupStudents.length}</strong>
                                    </small>
                                </div>
                            )}

                            {g.groupId && (
                                <div className="mb-3">
                                    <Form.Label>Студенты <span className="text-danger">*</span></Form.Label>
                                    <OrderStudentSelector
                                        students={groupStudents}
                                        selectedIds={g.selectedStudentIds}
                                        onChange={(ids) => handleStudentsChange(index, ids)}
                                    />
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                );
            })}

            <Button variant="outline-primary" size="sm" onClick={addGroup} className="mb-4">
                <i className="bi bi-plus me-1"></i>Добавить группу
            </Button>

            {/* Исключения из списка зачисленных */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                <i className="bi bi-person-x me-2"></i>Исключения из списка зачисленных (не подписавшие договор)
            </h6>
            {form.exclusions.map((exc, index) => (
                <Card key={index} className="mb-3 border">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Исключение {index + 1}</strong>
                            <Button variant="outline-danger" size="sm" onClick={() => removeExclusion(index)}>
                                <i className="bi bi-x"></i>
                            </Button>
                        </div>
                        <Row className="mb-2">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>ФИО абитуриента (в винительном/родительном падеже)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={exc.studentName}
                                        onChange={(e) => handleExclusionChange(index, 'studentName', e.target.value)}
                                        placeholder="Иванова Ивана Ивановича"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Группа / Специальность</Form.Label>
                                    <Form.Select
                                        value={exc.groupId}
                                        onChange={(e) => handleExclusionChange(index, 'groupId', e.target.value)}
                                    >
                                        <option value="">— Выберите группу —</option>
                                        {data.groups.map(gr => (
                                            <option key={gr.id} value={gr.id}>{gr.group_number}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group>
                            <Form.Label>Протокол (если отличается от общего)</Form.Label>
                            <Form.Control
                                type="text"
                                value={exc.protocolInfo}
                                onChange={(e) => handleExclusionChange(index, 'protocolInfo', e.target.value)}
                                placeholder="протокол № 2 от 02.08.2025"
                            />
                        </Form.Group>
                    </Card.Body>
                </Card>
            ))}

            <Button variant="outline-secondary" size="sm" onClick={addExclusion} className="mb-4">
                <i className="bi bi-plus me-1"></i>Добавить исключение
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
