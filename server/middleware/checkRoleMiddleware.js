const jwt = require('jsonwebtoken')
const { User } = require('../models/models')
const ApiError = require('../error/ApiError')

module.exports = function (role) {

    return async function (req, res, next) {
        if (req.method === "OPTIONS") {
            return next()
        }
        try {
            const token = req.headers.authorization.split(' ')[1] //Bearer adsadafdads
            if (!token) {
                return res.status(401).json({ message: 'Пользователь не авторизован' })
            }
            const decoded = jwt.verify(token, process.env.SECRET_KEY)

            // Роль берём из БД, а не из токена: иначе понижение прав не действует до истечения токена
            const user = await User.findByPk(decoded.id, {
                attributes: ['id', 'email', 'role']
            })
            if (!user) {
                return res.status(401).json({ message: 'Пользователь не авторизован' })
            }
            if (user.role !== role) {
                return next(ApiError.forbiddenRequest('Нет доступа'))
            }

            req.user = { id: user.id, email: user.email, role: user.role }
            next()
        } catch (e) {
            res.status(401).json({ message: 'Пользователь не авторизован' })
        }
    }
}
