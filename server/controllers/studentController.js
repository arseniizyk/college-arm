const { Student, Group, Specialty, User } = require('../models/models')
const ApiError = require('../error/ApiError')
const { Op } = require('sequelize')
const sequelize = require('../db')

class StudentController {
    async create(req, res, next) {
        try {
            const { last_name, name, father_name, order_number, enroll_date, groupId, expell_date, expell_reason } = req.body
            
            // Валидация обязательных полей
            if (!last_name || !name || !order_number || !enroll_date || !groupId) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }

            const enrollDateObj = new Date(enroll_date);
            if (isNaN(enrollDateObj.getTime())) {
                return next(ApiError.badRequest('Некорректный формат даты зачисления'));
            }

            if (expell_date) {
                const expellDateObj = new Date(expell_date);
                if (isNaN(expellDateObj.getTime())) {
                    return next(ApiError.badRequest('Некорректный формат даты отчисления'));
                }
                if (expellDateObj < enrollDateObj) {
                    return next(ApiError.badRequest('Дата отчисления не может быть раньше даты зачисления'));
                }
            }

            const group = await Group.findByPk(groupId);
            if (!group) {
                return next(ApiError.badRequest('Указанная группа не существует'));
            }

            const student = await Student.create({ 
                last_name, 
                name, 
                father_name, 
                order_number, 
                enroll_date: enrollDateObj, 
                groupId, 
                expell_date: expell_date ? new Date(expell_date) : null,
                expell_reason: expell_reason || null
            })

            res.json(student)
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { last_name, name, father_name, order_number, enroll_date, groupId, expell_date, expell_reason } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID студента'));
            }
            
            const student = await Student.findByPk(id);
            if (!student) {
                return next(ApiError.badRequest('Студент не найден'));
            }

            if (groupId !== undefined) {
                const group = await Group.findByPk(groupId);
                if (!group) {
                    return next(ApiError.badRequest('Указанная группа не существует'));
                }
            }

            let enrollDateObj = null;
            if (enroll_date !== undefined && enroll_date !== null) {
                enrollDateObj = new Date(enroll_date);
                if (isNaN(enrollDateObj.getTime())) {
                    return next(ApiError.badRequest('Некорректный формат даты зачисления'));
                }
            }

            if (expell_date && isNaN(new Date(expell_date).getTime())) {
                return next(ApiError.badRequest('Некорректный формат даты отчисления'));
            }

            const effectiveEnrollDate = enroll_date !== undefined ? enroll_date : student.enroll_date;
            const effectiveExpellDate = expell_date !== undefined ? expell_date : student.expell_date;

            if (effectiveExpellDate && effectiveEnrollDate) {
                if (new Date(effectiveExpellDate) < new Date(effectiveEnrollDate)) {
                    return next(ApiError.badRequest('Дата отчисления не может быть раньше даты зачисления'));
                }
            }
            
            const updateData = {};
            if (last_name) updateData.last_name = last_name;
            if (name) updateData.name = name;
            if (father_name !== undefined) updateData.father_name = father_name;
            if (order_number) updateData.order_number = order_number;
            if (enroll_date) updateData.enroll_date = enrollDateObj;
            if (groupId) updateData.groupId = groupId;
            if (expell_date !== undefined) {
                updateData.expell_date = expell_date ? new Date(expell_date) : null;
            }
            if (expell_reason !== undefined) {
                updateData.expell_reason = expell_reason || null;
            }
            
            await student.update(updateData);
            
            res.json(student);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res, next) {
        try {
            if (!req.user || !req.user.id) {
                return next(ApiError.unauthorized('Пользователь не авторизован'));
            }

            const user = await User.findByPk(req.user.id, { attributes: ['id', 'email', 'role'] });
            if (!user) {
                return next(ApiError.unauthorized('Пользователь не авторизован'));
            }

            if (user.role !== 'ADMIN') {
                return next(ApiError.forbiddenRequest('Нет доступа'));
            }

            const { groupId, groupNumber, search, limit, offset, status } = req.query;

            // Базовые опции запроса
            const queryOptions = {
                include: [
                    {
                        model: Group,
                        attributes: ['id', 'group_number'],
                        include: [
                            {
                                model: Specialty,
                                attributes: ['id', 'name']
                            }
                        ]
                    }
                ],
                order: [
                    [sequelize.literal('CASE WHEN "student"."expell_date" IS NULL THEN 0 ELSE 1 END'), 'ASC'],
                    ['last_name', 'ASC'],
                    ['name', 'ASC']
                ]
            };

            // Условия поиска
            const whereConditions = {};
            const groupWhereConditions = {};

            if (status === 'active') {
                whereConditions.expell_date = null;
            } else if (status === 'expelled') {
                whereConditions.expell_date = { [Op.ne]: null };
            }

            if (groupId) {
                whereConditions.groupId = parseInt(groupId, 10);
            }

            // Поиск по номеру группы
            if (groupNumber) {
                groupWhereConditions.group_number = {
                    [Op.iLike]: `%${groupNumber}%`
                };
            }

            // Общий поиск по ФИО студента
            if (search) {
                const searchTerm = `%${search.toLowerCase()}%`;
                whereConditions[Op.or] = [
                    { last_name: { [Op.iLike]: searchTerm } },
                    { name: { [Op.iLike]: searchTerm } },
                    { father_name: { [Op.iLike]: searchTerm } },
                    { order_number: { [Op.iLike]: searchTerm } }
                ];
            }

            // Применяем условия поиска
            if (Object.keys(whereConditions).length > 0) {
                queryOptions.where = whereConditions;
            }

            if (Object.keys(groupWhereConditions).length > 0) {
                queryOptions.include[0].where = groupWhereConditions;
            }

            // Пагинация
            if (limit) {
                queryOptions.limit = parseInt(limit, 10);
            }
            if (offset) {
                queryOptions.offset = parseInt(offset, 10);
            }

            const students = await Student.findAll(queryOptions);

            // Подсчет общего количества для пагинации
            let total = null;
            if (limit || offset) {
                const countOptions = { ...queryOptions };
                delete countOptions.limit;
                delete countOptions.offset;
                delete countOptions.order;
                total = await Student.count(countOptions);
            }

            const response = {
                students,
                ...(total !== null && { 
                    pagination: {
                        total,
                        limit: limit ? parseInt(limit, 10) : null,
                        offset: offset ? parseInt(offset, 10) : 0,
                        hasMore: total > (parseInt(offset || 0, 10) + students.length)
                    }
                })
            };

            res.json(response);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                return next(ApiError.badRequest('Не указан ID студента'));
            }
            const st = await Student.findByPk(id);
            if (!st) {
                return next(ApiError.badRequest('Студент не найден'));
            }
            await st.destroy();
            return res.json({
                message: 'Student deleted successfully',
                deletedStudent: st
            });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new StudentController()
