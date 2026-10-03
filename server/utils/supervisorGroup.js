const { Teacher, Supervisor } = require('../models/models')

// Ищет все группы, куратором которых назначен преподаватель с этим аккаунтом.
// Возвращает массив groupId (пустой, если аккаунт не привязан к куратору).
async function findSupervisorGroupIds(userId) {
    const teacher = await Teacher.findOne({ where: { userId }, attributes: ['id'] });
    if (!teacher) return [];

    const supervisors = await Supervisor.findAll({ where: { teacherId: teacher.id }, attributes: ['groupId'] });
    return supervisors.map(s => s.groupId).filter(Boolean);
}

// Разбирает teacherId из тела запроса в действие над связью «куратор группы».
// undefined — поле не прислано, связь не трогаем; '' и null — снять куратора.
// Нужно различать эти случаи: иначе снять куратора через PUT невозможно.
function parseSupervisorAssignment(rawValue) {
    if (rawValue === undefined) return { action: 'keep' }
    if (rawValue === '' || rawValue === null) return { action: 'clear' }

    const teacherId = Number(rawValue)
    if (!Number.isInteger(teacherId)) {
        return { action: 'error', error: 'Указанный преподаватель не существует' }
    }
    return { action: 'assign', teacherId }
}

// Удаление преподавателя-куратора тихо оставляло бы группу без куратора (FK
// ON DELETE SET NULL), поэтому удаление блокируется с перечислением групп.
function formatCuratorBlockMessage(groupNumbers) {
    if (!groupNumbers.length) return ''

    if (groupNumbers.length === 1) {
        return `Преподаватель — куратор группы ${groupNumbers[0]}. Сначала снимите куратора с группы.`
    }
    return `Преподаватель — куратор групп: ${groupNumbers.join(', ')}. Сначала снимите куратора с этих групп.`
}

module.exports = { findSupervisorGroupIds, parseSupervisorAssignment, formatCuratorBlockMessage }
