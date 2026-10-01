const { Group, Supervisor, Specialty, Teacher } = require('../models/models')
const { validatePaymentType } = require('../utils/paymentType')
const ApiError = require('../error/ApiError')

class GroupController {
    async create(req, res, next) {
        try {
            const { group_number, enroll_date, specialtyId, teacherId, payment_type } = req.body;

            // Валидация обязательных полей
            if (!group_number || !enroll_date || !specialtyId || !teacherId) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }

            // Проверка существования специальности
            const specialty = await Specialty.findByPk(specialtyId);
            if (!specialty) {
                return next(ApiError.badRequest('Указанная специальность не существует'));
            }

            // Проверка существования преподавателя
            const teacher = await Teacher.findByPk(teacherId);
            if (!teacher) {
                return next(ApiError.badRequest('Указанный преподаватель не существует'));
            }

            const paymentTypeError = validatePaymentType(payment_type);
            if (paymentTypeError) {
                return next(paymentTypeError);
            }

            // Создание группы
            const groupData = {
                group_number,
                enroll_date: new Date(enroll_date),
                specialtyId
            };
            if (payment_type) {
                groupData.payment_type = payment_type;
            }
            const group = await Group.create(groupData);

            // Создание записи куратора
            await Supervisor.create({
                groupId: group.id,
                teacherId
            });

            // Возвращаем созданную группу с связанными данными
            const createdGroup = await Group.findByPk(group.id, {
                include: [
                    {
                        model: Specialty,
                        attributes: ['id', 'name', 'duration_years', 'duration_months']
                    },
                    {
                        model: Supervisor,
                        include: [
                            {
                                model: Teacher,
                                attributes: ['last_name', 'name', 'father_name']
                            }
                        ]
                    }
                ]
            });

            res.json(createdGroup);

        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res) {
        try {
            const { specialtyId } = req.query;

            const groups = await Group.findAll({
                include: [
                    {
                        model: Specialty,
                        attributes: ['id', 'name', 'duration_years', 'duration_months']
                    },
                    {
                        model: Supervisor,
                        include: [
                            {
                                model: Teacher,
                                attributes: ['id', 'last_name', 'name', 'father_name']
                            }
                        ]
                    }
                ],
                where: specialtyId ? { specialtyId } : {},
                order: [['group_number', 'DESC']]
            });

            return res.json(groups);
        } catch (error) {
            console.error('Ошибка при получении групп:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { group_number, enroll_date, specialtyId, teacherId, payment_type } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID группы'));
            }
            
            const group = await Group.findByPk(id);
            if (!group) {
                return next(ApiError.badRequest('Группа не найдена'));
            }
            
            // Обновляем данные группы
            const updateData = {};
            if (group_number) updateData.group_number = group_number;
            if (enroll_date) updateData.enroll_date = new Date(enroll_date);
            if (specialtyId) {
                // В create проверка есть (см. выше), в update её не было:
                // несуществующий id доходил до БД и падал на FK-ограничении,
                // то есть отдавался 500 с текстом ошибки Postgres.
                const specialty = await Specialty.findByPk(specialtyId);
                if (!specialty) {
                    return next(ApiError.badRequest('Указанная специальность не существует'));
                }
                updateData.specialtyId = specialtyId;
            }
            if (payment_type) {
                const paymentTypeError = validatePaymentType(payment_type);
                if (paymentTypeError) {
                    return next(paymentTypeError);
                }
                updateData.payment_type = payment_type;
            }
            
            await group.update(updateData);
            
            // Если изменился преподаватель, обновляем куратора
            if (teacherId) {
                const teacher = await Teacher.findByPk(teacherId);
                if (!teacher) {
                    return next(ApiError.badRequest('Указанный преподаватель не существует'));
                }
                
                // Обновляем или создаем запись куратора
                const [supervisor] = await Supervisor.findOrCreate({
                    where: { groupId: id },
                    defaults: { teacherId }
                });
                
                if (supervisor.teacherId !== teacherId) {
                    await supervisor.update({ teacherId });
                }
            }
            
            // Возвращаем обновленную группу с связанными данными
            const updatedGroup = await Group.findByPk(id, {
                include: [
                    {
                        model: Specialty,
                        attributes: ['id', 'name', 'duration_years', 'duration_months']
                    },
                    {
                        model: Supervisor,
                        include: [
                            {
                                model: Teacher,
                                attributes: ['id', 'last_name', 'name', 'father_name']
                            }
                        ]
                    }
                ]
            });
            
            res.json(updatedGroup);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                return next(ApiError.badRequest('Не указан ID группы'));
            }
            const gr = await Group.findByPk(id);
            if (!gr) {
                return next(ApiError.badRequest('Группа не найдена'));
            }
            await Supervisor.destroy({ where: { groupId: id } })
            await gr.destroy()
            return res.json({
                message: 'Group deleted successfully',
                deletedGroup: gr
            });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new GroupController()  