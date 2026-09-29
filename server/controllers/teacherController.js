const { Teacher } = require('../models/models')
const ApiError = require('../error/ApiError')
const { resolveUserId } = require('../utils/resolveUserId')

// Привязка аккаунта к куратору: аккаунт должен существовать и не быть занятым другим преподавателем
const resolveTeacherUserId = (rawValue, excludeTeacherId = null) =>
    resolveUserId(rawValue, { ownerModel: Teacher, ownerName: 'преподавателю', excludeOwnerId: excludeTeacherId });

class TeacherController {
    async create(req, res, next) {
        try {
            const { last_name, name, father_name, userId } = req.body
            
            if (!last_name || !name) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }

            const resolvedUser = await resolveTeacherUserId(userId);
            if (resolvedUser.error) {
                return next(resolvedUser.error);
            }
            
            const teacher = await Teacher.create({ last_name, name, father_name, userId: resolvedUser.value })
            res.json(teacher)
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { last_name, name, father_name, userId } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID преподавателя'));
            }
            
            const teacher = await Teacher.findByPk(id);
            if (!teacher) {
                return next(ApiError.badRequest('Преподаватель не найден'));
            }
            
            const updateData = {};
            if (last_name) updateData.last_name = last_name;
            if (name) updateData.name = name;
            if (father_name !== undefined) updateData.father_name = father_name;
            if (userId !== undefined) {
                const resolvedUser = await resolveTeacherUserId(userId, id);
                if (resolvedUser.error) {
                    return next(resolvedUser.error);
                }
                updateData.userId = resolvedUser.value;
            }
            
            await teacher.update(updateData);
            
            res.json(teacher);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res, next) {
        try {
            let teachers = await Teacher.findAll()
            res.json(teachers)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                return next(ApiError.badRequest('Не указан ID преподавателя'));
            }
            const tch = await Teacher.findByPk(id);
            if (!tch) {
                return next(ApiError.badRequest('Преподаватель не найден'));
            }
            await tch.destroy();
            return res.json({
                message: 'Teacher deleted successfully',
                deletedTeacher: tch
            }); 
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new TeacherController() 