const { Student, Group, Specialty } = require('../models/models')
const ApiError = require('../error/ApiError')
const { Op } = require('sequelize')

class StudentController {
    async create(req, res, next) {
        try {
            const { last_name, name, father_name, order_number, enroll_date, groupId, expell_date } = req.body
            
            // Валидация обязательных полей
            if (!last_name || !name || !order_number || !enroll_date || !groupId) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }

            const student = await Student.create({ 
                last_name, 
                name, 
                father_name, 
                order_number, 
                enroll_date: new Date(enroll_date), 
                groupId, 
                expell_date: expell_date ? new Date(expell_date) : null 
            })

            res.json(student)
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { last_name, name, father_name, order_number, enroll_date, groupId, expell_date } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID студента'));
            }
            
            const student = await Student.findByPk(id);
            if (!student) {
                return next(ApiError.badRequest('Студент не найден'));
            }
            
            const updateData = {};
            if (last_name) updateData.last_name = last_name;
            if (name) updateData.name = name;
            if (father_name !== undefined) updateData.father_name = father_name;
            if (order_number) updateData.order_number = order_number;
            if (enroll_date) updateData.enroll_date = new Date(enroll_date);
            if (groupId) updateData.groupId = groupId;
            if (expell_date !== undefined) {
                updateData.expell_date = expell_date ? new Date(expell_date) : null;
            }
            
            await student.update(updateData);
            
            res.json(student);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res, next) {
        try {
            const { groupId, groupNumber, search, limit, offset } = req.query;
            
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
                order: [['last_name', 'ASC'], ['name', 'ASC']]
            };

            // Условия поиска
            const whereConditions = {};
            const groupWhereConditions = {};

            // Поиск по ID группы
            if (groupId) {
                whereConditions.groupId = groupId;
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