const ApiError = require('../error/ApiError')

const MIN_PASSWORD_LENGTH = 4

function validatePassword(password) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return { error: ApiError.badRequest(`Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символа`) };
    }

    return {};
}

module.exports = { validatePassword, MIN_PASSWORD_LENGTH }