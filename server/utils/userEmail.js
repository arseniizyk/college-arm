const { Op, where, fn, col } = require('sequelize')
const { User } = require('../models/models')

const buildEmailWhere = (email, excludeUserId = null) => {
    const conditions = [
        where(fn('lower', col('email')), String(email).toLowerCase())
    ]
    if (excludeUserId !== null) {
        conditions.push({ id: { [Op.ne]: excludeUserId } })
    }
    return { [Op.and]: conditions }
}

const findByEmail = (email, excludeUserId = null) =>
    User.findOne({ where: buildEmailWhere(email, excludeUserId) })

const isSameEmail = (a, b) =>
    String(a).toLowerCase() === String(b).toLowerCase()

module.exports = { buildEmailWhere, findByEmail, isSameEmail }