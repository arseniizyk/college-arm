/**
 * Кому каких студентов можно выбирать в заявке:
 *  - ADMIN — всем, кто зарегистрирован (null — ограничения нет);
 *  - TEACHER — учащимся групп, куратором которых он назначен;
 *  - остальные — только привязанному к аккаунту студенту.
 * Правило дублирует серверный checkStudentsAccess, поэтому при изменении
 * одной стороны нужно менять и вторую.
 * @returns {number[]|null}
 */
export const allowedStudentIds = (students, { role, supervisorGroupIds, userId }) => {
    if (role === 'ADMIN') return null;
    if (role === 'TEACHER') {
        const groupIds = supervisorGroupIds || [];
        return students.filter(s => groupIds.includes(s.groupId)).map(s => s.id);
    }
    return students.filter(s => s.userId === userId).map(s => s.id);
};