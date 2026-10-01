const ApiError = require('../error/ApiError')

const ROLES_WITH_MULTIPLE_STUDENTS = ['ADMIN', 'TEACHER']

function resolveStudentIds(rawIds, userRole, emptyMessage = 'Не выбран ни один студент') {
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return { error: ApiError.badRequest(emptyMessage) };
    }

    const ids = rawIds.map(id => Number(id));
    if (ids.some(id => !Number.isInteger(id))) {
        return { error: ApiError.badRequest('Некорректный идентификатор студента') };
    }

    if (!ROLES_WITH_MULTIPLE_STUDENTS.includes(userRole) && ids.length > 1) {
        return { error: ApiError.badRequest('Можно подать заявку только на одного студента') };
    }

    return { ids };
}

module.exports = { resolveStudentIds }