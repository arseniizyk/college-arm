const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User, USER_WITH_PASSWORD } = require('../models/models')
const { findSupervisorGroupId } = require('../utils/supervisorGroup')

const generateJwt = (id, email, role) => {
    return jwt.sign(
        { id, email, role },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    )
}

class UserController {
    async registration(req, res, next) {
        const { email, password } = req.body
        if (!password || !email) {
            return next(ApiError.badRequest('Некорректный email или пароль'))
        }
        const candidate = await User.findOne({ where: { email } })
        if (candidate) {
            return next(ApiError.badRequest("Пользователь с таким email уже существует"))
        }
        const hashPassword = await bcrypt.hash(password, 5)
        const user = await User.create({ email, password: hashPassword })
        const token = generateJwt(user.id, user.email, user.role)
        return res.json({ token })
    }

    async login(req, res, next) {
        const { email, password } = req.body
        const user = await User.scope(USER_WITH_PASSWORD).findOne({ where: { email } })
        if (!user) {
            return next(ApiError.internalRequest("Пользователь не найден"))
        }
        let comparePassword = bcrypt.compareSync(password, user.password)
        if (!comparePassword) {
            return next(ApiError.badRequest('Неверный пароль'))
        }
        const token = generateJwt(user.id, user.email, user.role)
        return res.json({ token })
    }

    async check(req, res, next) {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: ['id', 'email', 'role']
            })
            if (!user) {
                return res.status(401).json({ message: 'Пользователь не авторизован' })
            }
            const token = generateJwt(user.id, user.email, user.role)
            return res.json({ token })
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async getMe(req, res, next) {
        try {
            const userId = req.user.id; // Получаем ID из токена (authMiddleware)
            
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] } // Исключаем пароль из ответа
            });
            
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            const payload = user.get({ plain: true });

            // Куратору сообщаем его группу, чтобы форма заявки показала только её студентов
            if (payload.role === 'TEACHER') {
                payload.groupId = await findSupervisorGroupId(userId);
            }

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
            const {email, password, role} = req.body
            
            if (!email || !password) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }
            
            const candidate = await User.findOne({ where: { email } })
            if (candidate) {
                return next(ApiError.badRequest("Пользователь с таким email уже существует"))
            }
            
            const hashPassword = await bcrypt.hash(password, 5)
            const user = await User.create({ email, role: role || 'USER', password: hashPassword })
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
            
            const user = await User.findByPk(id);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }
            
            // Проверяем, не занят ли email другим пользователем
            if (email && email !== user.email) {
                const candidate = await User.findOne({ where: { email } });
                if (candidate) {
                    return next(ApiError.badRequest("Пользователь с таким email уже существует"));
                }
            }
            
            const updateData = {};
            if (email) updateData.email = email;
            if (role) updateData.role = role;
            if (password) {
                updateData.password = await bcrypt.hash(password, 5);
            }
            
            await user.update(updateData);
            
            // Возвращаем обновленного пользователя без пароля
            const updatedUser = await User.findByPk(id, {
                attributes: { exclude: ['password'] }
            });
            
            res.json(updatedUser);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async delete(req, res, next){
        try {
            const { id } = req.params; 
            if (!id) {
                return next(ApiError.badRequest('Не указан ID пользователя'));
            }
            const usr = await User.findByPk(id);
            if (!usr) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }
            await usr.destroy();
            return res.json({
                message: 'User deleted successfully',
                deletedUser: usr
            });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async changePassword(req, res, next) {
        try {
            const userId = req.user.id; // Получаем ID из токена (authMiddleware)
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return next(ApiError.badRequest('Не все поля заполнены'));
            }

            if (newPassword.length < 4) {
                return next(ApiError.badRequest('Новый пароль должен содержать минимум 4 символа'));
            }

            // Находим пользователя (нужен хеш пароля для проверки)
            const user = await User.scope(USER_WITH_PASSWORD).findByPk(userId);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            // Проверяем текущий пароль
            const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
            if (!isPasswordValid) {
                return next(ApiError.badRequest('Неверный текущий пароль'));
            }

            // Проверяем, что новый пароль отличается от текущего
            const isSamePassword = bcrypt.compareSync(newPassword, user.password);
            if (isSamePassword) {
                return next(ApiError.badRequest('Новый пароль должен отличаться от текущего'));
            }

            // Хешируем новый пароль и обновляем
            const hashPassword = await bcrypt.hash(newPassword, 5);
            await user.update({ password: hashPassword });

            res.json({ message: 'Пароль успешно изменен' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async changeEmail(req, res, next) {
        try {
            const userId = req.user.id; // Получаем ID из токена (authMiddleware)
            const { newEmail, password } = req.body;

            if (!newEmail || !password) {
                return next(ApiError.badRequest('Не все поля заполнены'));
            }

            // Валидация email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                return next(ApiError.badRequest('Некорректный формат email'));
            }

            // Находим пользователя (нужен хеш пароля для проверки)
            const user = await User.scope(USER_WITH_PASSWORD).findByPk(userId);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            // Проверяем пароль
            const isPasswordValid = bcrypt.compareSync(password, user.password);
            if (!isPasswordValid) {
                return next(ApiError.badRequest('Неверный пароль'));
            }

            // Проверяем, что новый email отличается от текущего
            if (user.email === newEmail) {
                return next(ApiError.badRequest('Новый email совпадает с текущим'));
            }

            // Проверяем, не занят ли email другим пользователем
            const existingUser = await User.findOne({ where: { email: newEmail } });
            if (existingUser) {
                return next(ApiError.badRequest('Пользователь с таким email уже существует'));
            }

            // Обновляем email
            await user.update({ email: newEmail });

            // Генерируем новый токен с обновленным email
            const token = generateJwt(user.id, newEmail, user.role);

            res.json({ 
                message: 'Email успешно изменен',
                token: token
            });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async deleteMyAccount(req, res, next) {
        try {
            const userId = req.user.id; // Получаем ID из токена (authMiddleware)
            const { password } = req.body;

            if (!password) {
                return next(ApiError.badRequest('Необходимо ввести пароль для подтверждения'));
            }

            // Находим пользователя (нужен хеш пароля для проверки)
            const user = await User.scope(USER_WITH_PASSWORD).findByPk(userId);
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            // Проверяем пароль
            const isPasswordValid = bcrypt.compareSync(password, user.password);
            if (!isPasswordValid) {
                return next(ApiError.badRequest('Неверный пароль'));
            }

            // Удаляем пользователя
            await user.destroy();

            res.json({ message: 'Аккаунт успешно удален' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new UserController()