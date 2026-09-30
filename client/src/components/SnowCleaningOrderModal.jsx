import React, { useState, useContext, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Alert, Card } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import OrderStudentSelector from './OrderStudentSelector';

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleGroupChange = (index, field, value) => {
        setForm(prev => {
            const groups = [...prev.groups];
            groups[index] = { ...groups[index], [field]: value };
            // При смене группы сбрасываем выбранных студентов
            if (field === 'groupId') groups[index].selectedStudentIds = [];
            return { ...prev, groups };
        });
        setError(null);
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

    const getGroupStudents = (groupId) =>
        groupId ? data.students.filter(s => s.groupId === parseInt(groupId)) : [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.controlPerson || !form.basis) {
            setError('Заполните контроль за исполнением и основание');
            return;
        }

        for (const g of form.groups) {
            if (!g.groupId || !g.date || !g.responsible) {
                setError('Заполните дату и ответственного для каждой группы');
                return;
            }
            if (g.selectedStudentIds.length === 0) {
                setError('Выберите хотя бы одного студента в каждой группе');
                return;
            }
        }

        const groupsPayload = form.groups.map(g => {
            const allStudents = getGroupStudents(g.groupId);
            const group = data.groups.find(gr => gr.id === parseInt(g.groupId));
            const selectedStudents = allStudents.filter(s => g.selectedStudentIds.includes(String(s.id)));
            return {
                groupNumber: group?.group_number || '',
                date: g.date,
                responsible: g.responsible,
                students: selectedStudents.map(s => ({
                    lastName: s.last_name,
                    firstName: s.name,
                    fatherName: s.father_name || '',
                })),
            };
        });

        const payload = {
            groups: groupsPayload,
            controlPerson: form.controlPerson,
            basis: form.basis,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
            acquainted: form.acquainted
                ? form.acquainted.split('\n').map(s => s.trim()).filter(Boolean)
                : [],
        };

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:7000'}/api/generate/admin/snow-cleaning-order`,
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
            a.download = `Приказ_уборка_снега_${Date.now()}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);

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
                    <i className="bi bi-snow me-2"></i>
                    Приказ об участии в уборке снега
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            <i className="bi bi-exclamation-circle me-2"></i>{error}
                        </Alert>
                    )}

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
                                                    placeholder="преподавателя Прокопович М.Е."
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
                    <h6 className="text-muted mb-3 border-bottom pb-2">
                        <i className="bi bi-person-lines-fill me-2"></i>Подписи и основание
                    </h6>
                    <Form.Group className="mb-3">
                        <Form.Label>Контроль за исполнением возложить на <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="controlPerson"
                            value={form.controlPerson}
                            onChange={handleChange}
                            placeholder="заведующего отделением Звягину Д.Ч."
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
                            placeholder="докладная записка заведующего отделением Звягиной Д.Ч. от 08.01.2026."
                            required
                        />
                    </Form.Group>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Заведующий отделением</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="headOfDepartment"
                                    value={form.headOfDepartment}
                                    onChange={handleChange}
                                    placeholder="Д.Ч.Звягина"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
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
                    </Row>
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

export default SnowCleaningOrderModal;
