import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert, Card } from 'react-bootstrap';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import OrderStudentSelector from './OrderStudentSelector';

const INITIAL_GROUP = { groupId: '', selectedStudentIds: [] };

const INITIAL = {
    enrollDate: '1 сентября 2025',
    year: '2025',
    protocolInfo: '',
    groups: [{ ...INITIAL_GROUP }],
    stipendCoefficient: '1.0',
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleGroupChange = (index, groupId) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = { groupId, selectedStudentIds: [] };
            return { ...prev, groups };
        });
    };

    const handleStudentsChange = (index, ids) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = { ...groups[index], selectedStudentIds: ids };
            return { ...prev, groups };
        });
    };

    const addGroup = () => {
        setForm(prev => ({ ...prev, groups: [...prev.groups, { ...INITIAL_GROUP }] }));
    };

    const removeGroup = (index) => {
        setForm(prev => ({ ...prev, groups: prev.groups.filter((_, i) => i !== index) }));
    };

    const addExclusion = () => {
        setForm(prev => ({
            ...prev,
            exclusions: [...prev.exclusions, { groupId: '', studentName: '', protocolInfo: '' }]
        }));
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

    const getGroupStudents = (groupId) =>
        groupId ? data.students.filter(s => s.groupId === parseInt(groupId)) : [];

    const getGroupInfo = (groupId) => {
        const group = data.groups.find(g => g.id === parseInt(groupId));
        const specialty = data.specialties.find(s => s.id === group?.specialtyId);
        return { group, specialty };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.enrollDate || !form.year || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        for (const g of form.groups) {
            if (!g.groupId || g.selectedStudentIds.length === 0) {
                setError('Выберите группу и хотя бы одного студента для каждой записи');
                return;
            }
        }

        const payload = {
            enrollDate: form.enrollDate,
            year: form.year,
            protocolInfo: form.protocolInfo,
            groups: form.groups.map(g => {
                const { group, specialty } = getGroupInfo(g.groupId);
                const allStudents = getGroupStudents(g.groupId);
                const selected = allStudents.filter(s => g.selectedStudentIds.includes(String(s.id)));
                return {
                    groupNumber: group?.group_number || '',
                    specialtyName: specialty?.name || '',
                    educationBase: 'общего базового образования',
                    students: selected.map(s => ({
                        lastName: s.last_name,
                        firstName: s.name,
                        fatherName: s.father_name || '',
                    })),
                };
            }),
            stipendCoefficient: form.stipendCoefficient,
            exclusions: form.exclusions.map(exc => {
                const excGroup = data.groups.find(g => g.id === parseInt(exc.groupId));
                const excSpecialty = data.specialties.find(s => s.id === excGroup?.specialtyId);
                return {
                    groupNumber: excGroup?.group_number || '',
                    specialtyName: excSpecialty?.name || '',
                    studentName: exc.studentName,
                    protocolInfo: exc.protocolInfo || '',
                };
            }),
            controlPerson: form.controlPerson,
            basis: form.basis,
            responsibleSecretary: form.responsibleSecretary,
            deputyDirector: form.deputyDirector,
            legalCounsel: form.legalCounsel,
            chiefAccountant: form.chiefAccountant,
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
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-person-plus me-2"></i>
                    Приказ о зачислении
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

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
                                        {g.groupId && (
                                            <Form.Text className="text-muted">
                                                {specialty?.name || '—'}
                                            </Form.Text>
                                        )}
                                    </Form.Group>
                                    <Form.Label>Студенты <span className="text-danger">*</span></Form.Label>
                                    <OrderStudentSelector
                                        students={groupStudents}
                                        selectedIds={g.selectedStudentIds}
                                        onChange={(ids) => handleStudentsChange(index, ids)}
                                    />
                                </Card.Body>
                            </Card>
                        );
                    })}

                    <Button variant="outline-primary" size="sm" onClick={addGroup} className="mb-4">
                        <i className="bi bi-plus me-1"></i>
                        Добавить группу
                    </Button>

                    {/* Исключения (п.8) */}
                    <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">
                        <i className="bi bi-person-x me-2"></i>Исключить из списка зачисленных (п.8, необязательно)
                    </h6>
                    {form.exclusions.map((exc, index) => {
                        const excGroup = data.groups.find(g => g.id === parseInt(exc.groupId));
                        const excSpecialty = data.specialties.find(s => s.id === excGroup?.specialtyId);
                        return (
                            <Card key={index} className="mb-2 border">
                                <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <small className="fw-semibold">Исключение {index + 1}</small>
                                        <Button variant="outline-danger" size="sm" onClick={() => removeExclusion(index)}>
                                            <i className="bi bi-x"></i>
                                        </Button>
                                    </div>
                                    <Row className="g-2">
                                        <Col md={6}>
                                            <Form.Select
                                                value={exc.groupId || ''}
                                                onChange={(e) => handleExclusionChange(index, 'groupId', e.target.value)}
                                                style={{ height: '38px', padding: '0.25rem 0.5rem' }}
                                            >
                                                <option value="">— Группа —</option>
                                                {data.groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.group_number}</option>
                                                ))}
                                            </Form.Select>
                                            {excSpecialty && (
                                                <Form.Text className="text-muted">{excSpecialty.name}</Form.Text>
                                            )}
                                        </Col>
                                        <Col md={6}>
                                            <Form.Control
                                                type="text"
                                                value={exc.studentName}
                                                onChange={(e) => handleExclusionChange(index, 'studentName', e.target.value)}
                                                placeholder="ФИО абитуриента в родительном падеже"
                                            />
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        );
                    })}
                    <Button variant="outline-secondary" size="sm" onClick={addExclusion} className="mb-4">
                        <i className="bi bi-plus me-1"></i>
                        Добавить исключение
                    </Button>

                    {/* Подписи и основание */}
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="controlPerson" value={form.controlPerson} onChange={handleChange} placeholder="заместителя директора по учебной работе Филипцову Е.В. и главного бухгалтера Метта М.В." required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                        <Form.Control as="textarea" rows={3} name="basis" value={form.basis} onChange={handleChange} placeholder="1. Протокол заседания приемной комиссии № 2 от 02.08.2025;&#10;2. Договоры с абитуриентами..." required />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Отв. секретарь приемной комиссии</Form.Label>
                                <Form.Control type="text" name="responsibleSecretary" value={form.responsibleSecretary} onChange={handleChange} placeholder="Д.Ч.Звягина" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Зам. директора по учебной работе</Form.Label>
                                <Form.Control type="text" name="deputyDirector" value={form.deputyDirector} onChange={handleChange} placeholder="Е.В.Филипцова" />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Юрисконсульт</Form.Label>
                                <Form.Control type="text" name="legalCounsel" value={form.legalCounsel} onChange={handleChange} placeholder="Н.В.Демьянович" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Главный бухгалтер</Form.Label>
                                <Form.Control type="text" name="chiefAccountant" value={form.chiefAccountant} onChange={handleChange} placeholder="М.В.Метта" />
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

export default EnrollmentOrderModal;
