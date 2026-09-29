const { Teacher, Supervisor } = require('../models/models')

// Ищет группу, куратором которой назначен преподаватель с этим аккаунтом.
// Возвращает groupId или null, если аккаунт не привязан к куратору группы.
async function findSupervisorGroupId(userId) {
    const teacher = await Teacher.findOne({ where: { userId }, attributes: ['id'] });
    if (!teacher) return null;

    const supervisor = await Supervisor.findOne({ where: { teacherId: teacher.id }, attributes: ['groupId'] });
    return supervisor ? supervisor.groupId : null;
}

module.exports = { findSupervisorGroupId }
