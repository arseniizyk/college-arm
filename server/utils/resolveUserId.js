const { Op } = require('sequelize')
const { User } = require('../models/models')
const ApiError = require('../error/ApiError')

// Приводит значение поля «Аккаунт» к id или null и проверяет, что аккаунт существует
// и ещё не привязан к другой записи.
// Возвращает ApiError либо { value } — корректный userId.
//
// ownerModel — модель с полем userId, проверяющая занятость аккаунта (Student, Teacher).
// ownerName — родительный падеж для сообщения об ошибке: «другому студенту».
// excludeOwnerId — id редактируемой записи, чтобы не терять её текущую привязку.
async function resolveUserId(rawValue, { ownerModel, ownerName, excludeOwnerId = null } = {}) {
    const value = rawValue === '' || rawValue === undefined ? null : Number(rawValue);
    if (value === null) return { value: null };
    if (!Number.isInteger(value)) {
        return { error: ApiError.badRequest('Некорректный идентификатор пользователя') };
    }

    const user = await User.findByPk(value, { attributes: ['id'] });
    if (!user) {
        return { error: ApiError.badRequest('Пользователь не найден') };
    }

    if (ownerModel) {
        const alreadyTaken = await ownerModel.findOne({
            where: {
                userId: value,
                ...(excludeOwnerId ? { id: { [Op.ne]: excludeOwnerId } } : {})
            },
            attributes: ['id']
        });
        if (alreadyTaken) {
            return { error: ApiError.badRequest(`Этот пользователь уже привязан к другому ${ownerName}`) };
        }
    }

    return { value };
}

module.exports = { resolveUserId }
