const uuid = require('uuid')
const path = require('path')
const ApiError = require('../error/ApiError')
const { Request, StudentRequest, Student, Document, Group, Specialty, Notification, User } = require('../models/models')

class RequestController {
    async create(req, res, next) {
        try {
            const { documentId, description, studentIds } = req.body
            const userId = req.user.id; // Берем ID пользователя из токена

            // Валидация
            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return next(ApiError.badRequest('Не выбран ни один студент'));
            }

            if (!documentId && !description) {
                return next(ApiError.badRequest('Необходимо выбрать документ или указать описание'));
            }

            // Создаем заявку
            const requestData = { userId };
            if (documentId) {
                requestData.documentId = documentId;
            }
            if (description) {
                requestData.description = description;
            }

            const request = await Request.create(requestData);

            // Создаем связи со студентами
            const studentRequestPromises = studentIds.map(studentId => 
                StudentRequest.create({ 
                    studentId, 
                    requestId: request.id 
                })
            );
            
            await Promise.all(studentRequestPromises);

            // Отправляем уведомления всем администраторам о новой заявке
            const admins = await User.findAll({
                where: { role: 'ADMIN' },
                attributes: ['id', 'email']
            });
            
            // Получаем информацию о документе для уведомления
            const documentInfo = documentId 
                ? await Document.findByPk(documentId, { attributes: ['document_name'] })
                : null;
            
            const notificationTitle = 'Новая заявка';
            const notificationBody = documentInfo 
                ? `Создана новая заявка #${request.id} на документ "${documentInfo.document_name}"`
                : `Создана новая заявка #${request.id}`;
            
            // Создаем уведомления для всех администраторов
            const adminNotifications = admins.map(admin => 
                Notification.create({
                    userId: admin.id,
                    title: notificationTitle,
                    body: notificationBody
                })
            );
            
            await Promise.all(adminNotifications);

            // Возвращаем созданную заявку с полной информацией
            const createdRequest = await Request.findByPk(request.id, {
                include: [
                    {
                        model: User,
                        attributes: ['id', 'email', 'role']
                    },
                    {
                        model: Document,
                        attributes: ['id', 'document_name']
                    },
                    {
                        model: Student,
                        through: { attributes: [] },
                        attributes: ['id', 'last_name', 'name', 'father_name', 'order_number', 'groupId', 'enroll_date', 'expell_date', 'createdAt', 'updatedAt'],
                        include: [
                            {
                                model: Group,
                                attributes: ['id', 'group_number', 'enroll_date', 'specialtyId'],
                                include: [
                                    {
                                        model: Specialty,
                                        attributes: ['id', 'name', 'qualification', 'duration_years', 'duration_months']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            return res.json(createdRequest);

        } catch (e) {
            next(ApiError.internalRequest(e.message));
        }
    }

    async get(req, res) {
        try {
            const requests = await Request.findAll({
                include: [
                    {
                        model: User,
                        attributes: ['id', 'email', 'role']
                    },
                    {
                        model: Document,
                        attributes: ['id', 'document_name']
                    },
                    {
                        model: Student,
                        through: { attributes: [] },
                        attributes: ['id', 'last_name', 'name', 'father_name', 'order_number', 'groupId', 'enroll_date', 'expell_date', 'createdAt', 'updatedAt'],
                        include: [
                            {
                                model: Group,
                                attributes: ['id', 'group_number', 'enroll_date', 'specialtyId'],
                                include: [
                                    {
                                        model: Specialty,
                                        attributes: ['id', 'name', 'qualification', 'duration_years', 'duration_months']
                                    }
                                ]
                            }
                        ],
                        order: [['last_name', 'ASC']]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            return res.json(requests);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { documentId, description, studentIds, status } = req.body;
            const userId = req.user.id; // Берем ID пользователя из токена
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID заявки'));
            }
            
            const request = await Request.findByPk(id);
            if (!request) {
                return next(ApiError.badRequest('Заявка не найдена'));
            }
            
            // Сохраняем старый статус для проверки изменения
            const oldStatus = request.status;
            
            // Валидация studentIds при обновлении
            if (studentIds !== undefined) {
                if (!Array.isArray(studentIds) || studentIds.length === 0) {
                    return next(ApiError.badRequest('Необходимо выбрать хотя бы одного студента'));
                }
            }
            
            // Обновляем основные данные заявки
            const updateData = {};
            if (documentId !== undefined) updateData.documentId = documentId;
            if (description !== undefined) updateData.description = description;
            if (status) updateData.status = status;
            
            await request.update(updateData);
            
            // Если переданы новые студенты, обновляем связи
            if (studentIds && Array.isArray(studentIds)) {
                // Удаляем старые связи
                await StudentRequest.destroy({ where: { requestId: id } });
                
                // Создаем новые связи
                const studentRequestPromises = studentIds.map(studentId => 
                    StudentRequest.create({ 
                        studentId, 
                        requestId: id 
                    })
                );
                
                await Promise.all(studentRequestPromises);
            }
            
            // Создаем уведомление при изменении статуса
            if (status && status !== oldStatus) {
                const statusTranslations = {
                    in_progress: 'в обработке',
                    completed: 'завершена',
                    rejected: 'отклонена'
                };
                
                const notificationTitle = `Статус заявки #${id} изменен`;
                const notificationBody = `Ваша заявка ${statusTranslations[status] || status}`;
                
                await Notification.create({
                    userId: request.userId,
                    title: notificationTitle,
                    body: notificationBody
                });
            }
            
            // Возвращаем обновленную заявку с полной информацией
            const updatedRequest = await Request.findByPk(id, {
                include: [
                    {
                        model: User,
                        attributes: ['id', 'email', 'role']
                    },
                    {
                        model: Document,
                        attributes: ['id', 'document_name']
                    },
                    {
                        model: Student,
                        through: { attributes: [] },
                        attributes: ['id', 'last_name', 'name', 'father_name', 'order_number', 'groupId', 'enroll_date', 'expell_date', 'createdAt', 'updatedAt'],
                        include: [
                            {
                                model: Group,
                                attributes: ['id', 'group_number', 'enroll_date', 'specialtyId'],
                                include: [
                                    {
                                        model: Specialty,
                                        attributes: ['id', 'name', 'qualification', 'duration_years', 'duration_months']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            
            return res.json(updatedRequest);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async getOne(req, res) {

    }

    async markAsViewed(req, res, next) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID заявки'));
            }
            
            const request = await Request.findByPk(id);
            if (!request) {
                return next(ApiError.badRequest('Заявка не найдена'));
            }
            
            // Помечаем заявку как просмотренную
            await request.update({ isViewed: true });
            
            return res.json({ success: true, isViewed: true });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                return next(ApiError.badRequest('Не указан ID заявки'));
            }
            const request = await Request.findByPk(id);
            if (!request) {
                return next(ApiError.badRequest('Заявка не найдена'));
            }
            await StudentRequest.destroy({ where: { requestId: id } });
            await request.destroy();
            return res.json({
                message: 'Request deleted successfully',
                deletedRequest: request
            })
        } catch (e) {
            next(ApiError.internalRequest(e.message))
        }
    }
}

module.exports = new RequestController()  