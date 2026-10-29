import React, { useState, useContext, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import { studyCertificateUrl } from '../utils/consts';
import { downloadDoc, errorMessage } from '../http';
import BaseOrderModal from './BaseOrderModal';
import OrderStudentSelector from './OrderStudentSelector';

const StudyCertificateModal = observer(({ show, onHide }) => {
    const { data } = useContext(Context);
    const [groupId, setGroupId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show) {
            if (!data.groups.length) data.fetchAll('groups');
            if (!data.specialties.length) data.fetchAll('specialties');
            if (!data.students.length) data.fetchAll('students');
            setError(null);
        } else {
            setGroupId('');
            setSelectedStudentIds([]);
            setError(null);
        }
    }, [show, data]);

    const groupStudents = groupId
        ? data.students.filter(s => s.groupId === parseInt(groupId, 10))
        : [];

    const handleGroupChange = (e) => {
        setGroupId(e.target.value);
        setSelectedStudentIds([]);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!groupId) {
            setError('Выберите учебную группу');
            return;
        }

        if (selectedStudentIds.length === 0) {
            setError('Выберите хотя бы одного учащегося для выписки справки');
            return;
        }

        setLoading(true);
        try {
            await downloadDoc(studyCertificateUrl(), {
                method: 'POST',
                payload: { studentIds: selectedStudentIds },
                fileName: 'Справка_об_обучении',
                stamp: true
            });
            onHide();
        } catch (err) {
            setError(errorMessage(err, 'Не удалось сформировать справку'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseOrderModal
            show={show}
            onHide={onHide}
            title="Справка об обучении"
            icon="bi bi-file-earmark-person"
            error={error}
            onErrorClose={() => setError(null)}
            onSubmit={handleSubmit}
            loading={loading}
            submitText="Сформировать и скачать"
        >
            <Form.Group className="mb-3">
                <Form.Label>
                    Группа <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                    value={groupId}
                    onChange={handleGroupChange}
                    required
                >
                    <option value="">Выберите группу...</option>
                    {data.groups.map(g => (
                        <option key={g.id} value={g.id}>
                            {g.group_number}
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>
                    Учащиеся <span className="text-danger">*</span>
                </Form.Label>
                <OrderStudentSelector
                    students={groupStudents}
                    selectedIds={selectedStudentIds}
                    onChange={setSelectedStudentIds}
                />
            </Form.Group>
        </BaseOrderModal>
    );
});

export default StudyCertificateModal;
