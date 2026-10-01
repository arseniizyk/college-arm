const { Group } = require('../models/models')
const ApiError = require('../error/ApiError')

function validatePaymentType(value) {
    if (!value) return undefined;

    const allowed = Group.rawAttributes.payment_type.values;
    if (!allowed.includes(value)) {
        return ApiError.badRequest(`Основа обучения должна быть одной из: ${allowed.join(', ')}`);
    }
}

module.exports = { validatePaymentType }