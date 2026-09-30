import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { formatFio } from '../utils/dataHelpers';

/**
 * Компонент выбора студентов для приказов
 * selectedIds - массив строк id выбранных студентов
 * onChange - callback(newIds)
 */
const OrderStudentSelector = ({ students, selectedIds, onChange }) => {
    const allSelected = students.length > 0 && selectedIds.length === students.length;

    const handleToggle = (id) => {
        const sid = String(id);
        if (selectedIds.includes(sid)) {
            onChange(selectedIds.filter(s => s !== sid));
        } else {
            onChange([...selectedIds, sid]);
        }
    };

    const handleSelectAll = () => {
        onChange(students.map(s => String(s.id)));
    };

    const handleClear = () => onChange([]);

    return (
        <div>
            <div className="d-flex gap-2 mb-2">
                <Button variant="outline-primary" size="sm" onClick={handleSelectAll} disabled={students.length === 0}>
                    <i className="bi-people-fill me-1"></i>
                    Вся группа
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={handleClear} disabled={selectedIds.length === 0}>
                    <i className="bi-x-lg me-1"></i>
                    Очистить
                </Button>
                {selectedIds.length > 0 && (
                    <small className="text-muted align-self-center">
                        {allSelected ? 'Полный состав' : `Выбрано: ${selectedIds.length} из ${students.length}`}
                    </small>
                )}
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '0.375rem', padding: '0.5rem' }}>
                {students.length > 0 ? students.map(s => (
                    <Form.Check
                        key={s.id}
                        type="checkbox"
                        id={`order-student-${s.id}`}
                        label={formatFio(s)}
                        checked={selectedIds.includes(String(s.id))}
                        onChange={() => handleToggle(s.id)}
                        className="mb-1"
                    />
                )) : (
                    <small className="text-muted">Сначала выберите группу</small>
                )}
            </div>
            {selectedIds.length > 0 && (
                <small className="text-muted mt-1 d-block">
                    {allSelected ? 'в полном составе' : 'в следующем составе'}
                </small>
            )}
        </div>
    );
};

export default OrderStudentSelector;
