import React, { useState, useContext, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { formatFio, formatFioShort } from '../utils/dataHelpers';
import { downloadDoc } from '../http';
import { orderUrl } from '../utils/consts';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import BaseOrderModal from './BaseOrderModal';
import OrderSignaturesSection from './OrderSignaturesSection';

const INITIAL = {
    groupId: '',
    studentId: '',
    lossReason: 'оригинал утерян',
    controlPerson: '',
    basis: '',
    headOfDepartment: '',
    legalCounsel: '',
};

const DuplicateTicketOrderModal = observer(({ show, onHide }) => {
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

    const groupStudents = form.groupId
        ? data.students.filter(s => s.groupId === parseInt(form.groupId))
        : [];

    const selectedGroup = data.groups.find(g => g.id === parseInt(form.groupId));
    const selectedSpecialty = data.specialties.find(s => s.id === selectedGroup?.specialtyId);
    const selectedStudent = data.students.find(s => s.id === parseInt(form.studentId));

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'studentId' && value) {
            const student = groupStudents.find(s => s.id === parseInt(value, 10));
            if (student?.expell_date) {
                const confirmed = window.confirm(
                    `Студент ${formatFio(student)} отчислен. Вы точно хотите выбрать его?`
                );
                if (!confirmed) {
                    e.target.value = form.studentId || '';
                    return;
                }
            }
        }
        setForm(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'groupId' ? { studentId: '' } : {})
        }));
        setError(null);
    };

    const handleGroupChange = (e) => {
        setForm(prev => ({ ...prev, groupId: e.target.value, studentId: '' }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.groupId || !form.studentId || !form.controlPerson || !form.basis) {
            setError('Заполните все обязательные поля');
            return;
        }

        // Инициалы для основания
        const initials = selectedStudent
            ? formatFioShort(selectedStudent)
            : '';

        const payload = {
            studentLastName: selectedStudent?.last_name || '',
            studentFirstName: selectedStudent?.name || '',
            studentFatherName: selectedStudent?.father_name || '',
            groupNumber: selectedGroup?.group_number || '',
            specialtyName: selectedSpecialty?.name || '',
            lossReason: form.lossReason,
            controlPerson: form.controlPerson,
            basis: form.basis || `заявление ${initials} от`,
            headOfDepartment: form.headOfDepartment,
            legalCounsel: form.legalCounsel,
        };

        setLoading(true);
        try {
            await downloadDoc(orderUrl('duplicate-ticket'), {
                payload,
                fileName: 'Приказ_дубликат_билета'
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
            title="Приказ о выдаче дубликата билета учащегося"
            icon="bi bi-card-text"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
        >
            {/* Учащийся */}
            <h6 className="text-muted mb-3 border-bottom pb-2">
                <i className="bi bi-person me-2"></i>Учащийся
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
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Студент <span className="text-danger">*</span></Form.Label>
                        <Form.Select name="studentId" value={form.studentId} onChange={handleChange} disabled={!form.groupId} required>
                            <option value="">— Выберите —</option>
                            {groupStudents.map(s => (
                                <option key={s.id} value={s.id}>
                                    {formatFio(s)}{s.expell_date ? ' (отчислен)' : ''}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            {form.groupId && (
                <div className="mb-3 p-2 bg-light rounded">
                    <small className="text-muted">
                        <i className="bi bi-mortarboard me-1"></i>
                        Специальность: <strong>{selectedSpecialty?.name || '—'}</strong>
                    </small>
                </div>
            )}

            <Form.Group className="mb-3">
                <Form.Label>Причина выдачи дубликата <span className="text-danger">*</span></Form.Label>
                <Form.Control
                    type="text"
                    name="lossReason"
                    value={form.lossReason}
                    onChange={handleChange}
                    placeholder="оригинал утерян"
                    required
                />
            </Form.Group>

            {/* Подписи и основание */}
            <OrderSignaturesSection
                formData={form}
                handleChange={handleChange}
                fields={['controlPerson', 'headOfDepartment', 'legalCounsel']}
                placeholders={{
                    controlPerson: 'заведующего отделением Гриневича П.Р.',
                    headOfDepartment: 'П.Р.Гриневич',
                }}
            >
                <Form.Group className="mb-3">
                    <Form.Label>Основание <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                        type="text"
                        name="basis"
                        value={form.basis}
                        onChange={handleChange}
                        placeholder="заявление Паплёвка М.Д. от 05.01.2026."
                        required
                    />
                </Form.Group>
            </OrderSignaturesSection>
        </BaseOrderModal>
    );
});

export default DuplicateTicketOrderModal;
