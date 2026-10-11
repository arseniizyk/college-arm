import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { formatFio } from '../utils/dataHelpers';

/**
 * Компонент выбора студентов для приказов
 * selectedIds - массив строк id выбранных студентов
 * onChange - callback(newIds)
 */
const OrderStudentSelector = ({ students, selectedIds, onChange }) => {
    const activeStudents = students.filter(s => !s.expell_date);
    const allSelected = activeStudents.length > 0 && activeStudents.every(s => selectedIds.includes(String(s.id)));

    const handleToggle = (student) => {
        const sid = String(student.id);
        if (selectedIds.includes(sid)) {
            onChange(selectedIds.filter(s => s !== sid));
        } else {
            if (student.expell_date) {
                const confirmed = window.confirm(
                    `Студент ${formatFio(student)} отчислен. Вы точно хотите выбрать его?`
                );
                if (!confirmed) return;
            }
            onChange([...selectedIds, sid]);
        }
    };

    const handleSelectAll = () => {
        onChange(activeStudents.map(s => String(s.id)));
    };

    const handleClear = () => onChange([]);

    return (
        <div>
            <div className="d-flex gap-2 mb-2">
                <Button variant="outline-primary" size="sm" onClick={handleSelectAll} disabled={activeStudents.length === 0}>
                    <i className="bi-people-fill me-1"></i>
                    Вся группа
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={handleClear} disabled={selectedIds.length === 0}>
                    <i className="bi-x-lg me-1"></i>
                    Очистить
                </Button>
                {selectedIds.length > 0 && (
                    <small className="text-muted align-self-center">
                        {allSelected ? 'Полный состав (обучающиеся)' : `Выбрано: ${selectedIds.length} из ${students.length}`}
                    </small>
                )}
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '0.375rem', padding: '0.5rem' }}>
                {students.length > 0 ? students.map(s => {
                    const isExpelled = Boolean(s.expell_date);
                    return (
                        <div key={s.id} className="d-flex align-items-center justify-content-between mb-1">
                            <Form.Check
                                type="checkbox"
                                id={`order-student-${s.id}`}
                                label={
                                    <span className={isExpelled ? 'text-muted' : undefined}>
                                        {formatFio(s)}
                                    </span>
                                }
                                checked={selectedIds.includes(String(s.id))}
                                onChange={() => handleToggle(s)}
                            />
                            {isExpelled && (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle small ms-2">
                                    Отчислен
                                </span>
                            )}
                        </div>
                    );
                }) : (
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
