const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User, USER_WITH_PASSWORD } = require('../models/models')
const { validatePassword } = require('../utils/passwordPolicy')
const { buildEmailWhere, findByEmail, isSameEmail } = require('../utils/userEmail')

const generateJwt = (id, email, role) => {
    return jwt.sign(
        { id, email, role },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    )
}

class UserController {
    async registration(req, res, next) {
        return next(ApiError.forbiddenRequest('Регистрация отключена. Обратитесь к администратору'))
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body
            if (!email || !password) {
                return next(ApiError.badRequest('Некорректный email или пароль'))
            }
            const user = await User.scope(USER_WITH_PASSWORD).findOne({
                where: buildEmailWhere(email)
            })
            if (!user) {
                return next(ApiError.badRequest('Неверный email или пароль'))
            }
            const comparePassword = await bcrypt.compare(password, user.password)
            if (!comparePassword) {
                return next(ApiError.badRequest('Неверный email или пароль'))
            }
            if (user.role !== 'ADMIN') {
                return next(ApiError.forbiddenRequest('Доступ разрешен только администраторам'))
            }
            const token = generateJwt(user.id, user.email, user.role)
            return res.json({ token })
        } catch (error) {
            next(ApiError.internalRequest(error.message))
        }
    }

    async check(req, res, next) {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: ['id', 'email', 'role']
            })
            if (!user) {
                return res.status(401).json({ message: 'Пользователь не авторизован' })
            }
            if (user.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Доступ разрешен только администраторам' })
            }
            const token = generateJwt(user.id, user.email, user.role)
            return res.json({ token })
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async getMe(req, res, next) {
        try {
            const userId = req.user.id;
            
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            const payload = user.get({ plain: true });
            return res.json(payload);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res, next) {
        try {
            let users = await User.findAll({
                attributes: { exclude: ['password'] }
            })
            res.json(users)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async create(req, res, next) {
        try {
            const {email, password} = req.body
            
            if (!email || !password) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }

            const { error: passwordError } = validatePassword(password)
            if (passwordError) {
                return next(passwordError)
            }
            
            const candidate = await findByEmail(email)
            if (candidate) {
                return next(ApiError.badRequest("Пользователь с таким email уже существует"))
            }

            const hashPassword = await bcrypt.hash(password, 5)
            const user = await User.create({ email, role: 'ADMIN', password: hashPassword })
            const safeUser = { ...user.get({ plain: true }) };
            delete safeUser.password;
            res.json(safeUser)
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { email, password, role } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID пользователя'));
            }

            if (role && role !== 'ADMIN') {
                return next(ApiError.badRequest('Допустима только роль ADMIN'));
            }
            
            const user = await User.findByPk(id);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }
            
            if (email && !isSameEmail(email, user.email)) {
                const candidate = await findByEmail(email, user.id);
                if (candidate) {
                    return next(ApiError.badRequest("Пользователь с таким email уже существует"));
                }
            }
            
            const updateData = {};
            if (email) updateData.email = email;
            if (password) {
                const { error: passwordError } = validatePassword(password)
                if (passwordError) {
                    return next(passwordError)
                }
                updateData.password = await bcrypt.hash(password, 5);
            }
            
            await user.update(updateData);
            
            const updatedUser = await User.findByPk(id, {
                attributes: { exclude: ['password'] }
            });
            
            res.json(updatedUser);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                return next(ApiError.badRequest('Не указан ID пользователя'));
            }

            const user = await User.findByPk(id);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            await user.destroy();
            return res.json({ message: 'Пользователь успешно удален' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async changePassword(req, res, next) {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return next(ApiError.badRequest('Заполните все поля'));
            }

            const { error: passwordError } = validatePassword(newPassword);
            if (passwordError) {
                return next(passwordError);
            }

            const user = await User.scope(USER_WITH_PASSWORD).findByPk(userId);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            const comparePassword = await bcrypt.compare(currentPassword, user.password);
            if (!comparePassword) {
                return next(ApiError.badRequest('Неверный текущий пароль'));
            }

            const hashPassword = await bcrypt.hash(newPassword, 5);
            await user.update({ password: hashPassword });

            return res.json({ message: 'Пароль успешно изменен' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async changeEmail(req, res, next) {
        try {
            const userId = req.user.id;
            const { newEmail, password } = req.body;

            if (!newEmail || !password) {
                return next(ApiError.badRequest('Заполните все поля'));
            }

            const user = await User.scope(USER_WITH_PASSWORD).findByPk(userId);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            const comparePassword = await bcrypt.compare(password, user.password);
            if (!comparePassword) {
                return next(ApiError.badRequest('Неверный пароль'));
            }

            if (!isSameEmail(newEmail, user.email)) {
                const candidate = await findByEmail(newEmail, userId);
                if (candidate) {
                    return next(ApiError.badRequest('Пользователь с таким email уже существует'));
                }
            }

            await user.update({ email: newEmail });
            const token = generateJwt(user.id, newEmail, user.role);

            return res.json({ message: 'Email успешно изменен', token });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async deleteMyAccount(req, res, next) {
        try {
            const userId = req.user.id;
            const { password } = req.body;

            if (!password) {
                return next(ApiError.badRequest('Введите пароль для подтверждения'));
            }

            const user = await User.scope(USER_WITH_PASSWORD).findByPk(userId);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            const comparePassword = await bcrypt.compare(password, user.password);
            if (!comparePassword) {
                return next(ApiError.badRequest('Неверный пароль'));
            }

            await user.destroy();
            return res.json({ message: 'Аккаунт успешно удален' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new UserController()
