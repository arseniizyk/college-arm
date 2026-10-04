/**
 * Сборка и проверка данных приказа о зачислении.
 * Вынесено из модалки, чтобы правило «в приказ попадают только выбранные студенты»
 * проверялось тестом: пустой выбор не должен молча превращаться в зачисление всей группы.
 */

/**
 * @param {{groupId: string, selectedStudentIds: string[]}[]} groups
 * @param {(groupId: string) => object[]} getGroupStudents
 * @returns {string|null} - текст ошибки или null, если всё в порядке
 */
export const validateEnrollmentGroups = (groups, getGroupStudents) => {
    for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (!g.groupId) {
            return `Выберите группу для записи #${i + 1}`;
        }
        if (!g.selectedStudentIds?.length) {
            return `Выберите хотя бы одного студента для группы #${i + 1}`;
        }
        if (!getGroupStudents(g.groupId).length) {
            return `В выбранной группе #${i + 1} нет студентов`;
        }
    }
    return null;
};

/**
 * @param {{groupId: string, selectedStudentIds: string[]}[]} groups
 * @param {{getGroupStudents: Function, getGroupInfo: Function}} resolvers
 * @returns {{groupNumber: string, specialtyName: string, students: object[]}[]}
 */
export const buildEnrollmentGroupsPayload = (groups, { getGroupStudents, getGroupInfo }) =>
    groups.map(g => {
        const { group, specialty } = getGroupInfo(g.groupId);
        const selectedIds = g.selectedStudentIds || [];
        return {
            groupNumber: group?.group_number || '',
            specialtyName: specialty?.name || '',
            students: getGroupStudents(g.groupId)
                .filter(s => selectedIds.includes(String(s.id)))
                .map(s => ({
                    lastName: s.last_name,
                    firstName: s.name,
                    fatherName: s.father_name || '',
                })),
        };
    });
