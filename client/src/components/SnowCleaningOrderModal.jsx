import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import OrderStudentSelector from './OrderStudentSelector';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';

const INITIAL_GROUP = { groupId: '', date: '', responsible: '', selectedStudentIds: [] };

const INITIAL = {
    groups: [{ ...INITIAL_GROUP }],
    controlPerson: '',
    basis: '',
    headOfDepartment: '',
    legalCounsel: '',
    acquainted: '',
};

const SnowCleaningOrderModal = observer(({ show, onHide }) => {
    const { data } = useContext(Context);
    const [form, setForm] = useState(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show) {
            if (!data.groups.length) data.fetchAll('groups');
            if (!data.students.length) data.fetchAll('students');
        }
    }, [show, data]);

    const getGroupStudents = (groupId) =>
        groupId ? data.students.filter(s => s.groupId === parseInt(groupId)) : [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleGroupChange = (index, field, value) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = {
                ...groups[index],
                [field]: value,
                ...(field === 'groupId' ? { selectedStudentIds: [] } : {})
            };
            return { ...prev, groups };
        });
        setError(null);
    };

    const handleStudentsChange = (index, selectedIds) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = { ...groups[index], selectedStudentIds: selectedIds };
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        for (let i = 0; i < form.groups.length; i++) {
            const g = form.groups[i];
            if (!g.groupId || !g.date || !g.responsible) {
                setError(`Заполните все поля для группы ${i + 1}`);
                return;
            }
            if (!g.selectedStudentIds.length) {
                setError(`Выберите хотя бы одного студента для группы ${i + 1}`);
                return;
            }
        }

        const payload = {
            controlPerson: form.controlPerson,
            basis: form.basis,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
            acquainted: form.acquainted
                ? form.acquainted.split('\n').map(s => s.trim()).filter(Boolean)
                : [],
            groups: form.groups.map(g => {
                const groupObj = data.groups.find(gr => gr.id === parseInt(g.groupId));
                const allGroupStudents = getGroupStudents(g.groupId);
                const selectedStudents = allGroupStudents.filter(s =>
                    g.selectedStudentIds.includes(String(s.id))
                );
                return {
                    groupNumber: groupObj?.group_number || '',
                    date: g.date,
                    responsible: g.responsible,
                    students: selectedStudents.map(s => ({
                        lastName: s.last_name,
                        firstName: s.name,
                        fatherName: s.father_name || '',
                    })),
                };
            }),
        };

        setLoading(true);
        try {
            await downloadDoc(orderUrl('snow-cleaning'), {
                payload,
                fileName: 'Приказ_субботник'
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
            title="Приказ о субботнике/уборка снега"
            icon="bi bi-snow"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
            {/* Группы */}
            <h6 className="text-muted mb-3 border-bottom pb-2">
                <i className="bi bi-people me-2"></i>Группы
            </h6>

            {form.groups.map((g, index) => {
                const groupStudents = getGroupStudents(g.groupId);
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
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Группа <span className="text-danger">*</span></Form.Label>
                                        <Form.Select
                                            value={g.groupId}
                                            onChange={(e) => handleGroupChange(index, 'groupId', e.target.value)}
                                            required
                                        >
                                            <option value="">— Выберите —</option>
                                            {data.groups.map(gr => (
                                                <option key={gr.id} value={gr.id}>{gr.group_number}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Дата <span className="text-danger">*</span></Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={g.date}
                                            onChange={(e) => handleGroupChange(index, 'date', e.target.value)}
                                            placeholder="08.01.2026"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Ответственный <span className="text-danger">*</span></Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={g.responsible}
                                            onChange={(e) => handleGroupChange(index, 'responsible', e.target.value)}
                                            placeholder="например: Прокопович М.Е."
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
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

            {/* Подписи и основание */}
            <OrderSignaturesSection
                formData={form}
                handleChange={handleChange}
                fields={['controlPerson', 'headOfDepartment', 'legalCounsel']}
                placeholders={{
                    controlPerson: 'заведующего отделением Звягину Д.Ч.',
                    headOfDepartment: 'Д.Ч.Звягина',
                    legalCounsel: 'Н.В.Демьянович',
                }}
                extra={
                    <Form.Group className="mb-3">
                        <Form.Label>С приказом ознакомлены (каждый с новой строки)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="acquainted"
                            value={form.acquainted}
                            onChange={handleChange}
                            placeholder="М.Е.Прокопович&#10;Д.А.Петров&#10;А.В.Варицкая"
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
                        placeholder="докладная записка заведующего отделением Звягиной Д.Ч. от 08.01.2026."
                        required
                    />
                </Form.Group>
            </OrderSignaturesSection>
        </BaseOrderModal>
    );
});

export default SnowCleaningOrderModal;
