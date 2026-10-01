const ApiError = require('../error/ApiError')
const sequelize = require('../db')
const { Op } = require('sequelize')
const { Request, StudentRequest, Student, Document, Group, Specialty, Notification, User } = require('../models/models')
const { findSupervisorGroupId } = require('../utils/supervisorGroup')
const { resolveStudentIds } = require('../utils/studentIds')
const { statusLabelFeminine, isKnownStatus } = require('../utils/requestStatus')

// Общее дерево связей для заявки
const getRequestInclude = () => [
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
        attributes: ['id', 'last_name', 'name', 'father_name', 'order_number', 'groupId', 'userId', 'enroll_date', 'expell_date', 'createdAt', 'updatedAt'],
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
];

// Правила доступа к студентам при подаче заявки:
//  - ADMIN  — любой студент колледжа;
//  - TEACHER — только студенты группы, куратором которой он назначен;
//  - остальные (USER) — только студент, привязанный к их аккаунту (student.userId === req.user.id).
const ROLES_WITH_ANY_STUDENT = ['ADMIN'];

// Проверяет, что пользователь имеет право заказывать документы на переданных студентов.
// Возвращает ApiError или null.
async function checkStudentsAccess(userId, userRole, ids) {
    if (ROLES_WITH_ANY_STUDENT.includes(userRole)) {
        return null;
    }

    if (userRole === 'TEACHER') {
        const groupId = await findSupervisorGroupId(userId);
        if (!groupId) {
            return ApiError.forbiddenRequest(
                'Ваш аккаунт не привязан к куратору группы. Обратитесь к администратору'
            );
        }

        // Чужие — те, у которых группа отличается от группы куратора либо не заполнена вовсе
        const foreign = await Student.findAll({
            where: {
                id: ids,
                [Op.or]: [
                    { groupId: null },
                    { groupId: { [Op.ne]: groupId } }
                ]
            },
            attributes: ['id']
        });
        if (foreign.length > 0) {
            return ApiError.forbiddenRequest(
                'Можно подать заявку только на студентов своей группы'
            );
        }

        return null;
    }

    const ownStudents = await Student.findAll({
        where: { userId },
        attributes: ['id']
    });
    const ownIds = ownStudents.map(s => s.id);
    // id могут прийти строками — сравниваем по числовому значению
    const foreign = ids.filter(id => !ownIds.includes(id));

    if (foreign.length > 0) {
        return ApiError.forbiddenRequest(
            'Можно подать заявку только на студента, привязанного к вашему аккаунту'
        );
    }

    return null;
}

class RequestController {
    async create(req, res, next) {
        try {
            const { documentId, description, studentIds } = req.body
            const userId = req.user.id; // Берем ID пользователя из токена

            // Валидация
            const resolvedIds = resolveStudentIds(studentIds, req.user.role);
            if (resolvedIds.error) {
                return next(resolvedIds.error);
            }
            const { ids } = resolvedIds;

            if (!documentId && !description) {
                return next(ApiError.badRequest('Необходимо выбрать документ или указать описание'));
            }

            const accessError = await checkStudentsAccess(userId, req.user.role, ids);
            if (accessError) {
                return next(accessError);
            }

            let requestId;

            // Заявка и её связи со студентами создаются в одной транзакции:
            // при ошибке на связи не остаётся «висячей» заявки без студентов
            const t = await sequelize.transaction();

            try {
                // Создаем заявку
                const requestData = { userId };
                if (documentId) {
                    requestData.documentId = documentId;
                }
                if (description) {
                    requestData.description = description;
                }

                const request = await Request.create(requestData, { transaction: t });
                requestId = request.id;

                // Создаем связи со студентами
                await StudentRequest.bulkCreate(
                    ids.map(studentId => ({
                        studentId,
                        requestId: request.id
                    })),
                    { transaction: t }
                );

                // Отправляем уведомления всем администраторам о новой заявке
                const admins = await User.findAll({
                    where: { role: 'ADMIN' },
                    attributes: ['id', 'email'],
                    transaction: t
                });

                // Получаем информацию о документе для уведомления
                const documentInfo = documentId
                    ? await Document.findByPk(documentId, { attributes: ['document_name'], transaction: t })
                    : null;

                const notificationTitle = 'Новая заявка';
                const notificationBody = documentInfo
                    ? `Создана новая заявка #${request.id} на документ "${documentInfo.document_name}"`
                    : `Создана новая заявка #${request.id}`;

                // Создаем уведомления для всех администраторов
                if (admins.length > 0) {
                    await Notification.bulkCreate(
                        admins.map(admin => ({
                            userId: admin.id,
                            title: notificationTitle,
                            body: notificationBody,
                            requestId: request.id
                        })),
                        { transaction: t }
                    );
                }

                await t.commit();
            } catch (e) {
                await t.rollback();
                throw e;
            }

            // Возвращаем созданную заявку с полной информацией
            const createdRequest = await Request.findByPk(requestId, {
                include: getRequestInclude()
            });

            return res.json(createdRequest);

        } catch (e) {
            next(ApiError.internalRequest(e.message));
        }
    }

    async get(req, res) {
        try {
            const requests = await Request.findAll({
                include: getRequestInclude(),
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
            const userRole = req.user.role; // Роль пользователя из токена

            if (!id) {
                return next(ApiError.badRequest('Не указан ID заявки'));
            }
            
            const request = await Request.findByPk(id);
            if (!request) {
                return next(ApiError.badRequest('Заявка не найдена'));
            }

            // Заявку может править только её автор или администратор
            if (request.userId !== userId && userRole !== 'ADMIN') {
                return next(ApiError.forbiddenRequest('Нет доступа к этой заявке'));
            }

            // Статус заявки вправе менять только администратор
            if (status !== undefined && userRole !== 'ADMIN') {
                return next(ApiError.forbiddenRequest('Изменять статус заявки может только администратор'));
            }
            if (status !== undefined && !isKnownStatus(status)) {
                return next(ApiError.badRequest(`Неизвестный статус заявки: ${status}`));
            }
            
            // Сохраняем старый статус для проверки изменения
            const oldStatus = request.status;
            
            // Валидация studentIds при обновлении
            let ids;
            if (studentIds !== undefined) {
                const resolved = resolveStudentIds(
                    studentIds,
                    userRole,
                    'Необходимо выбрать хотя бы одного студента'
                );
                if (resolved.error) {
                    return next(resolved.error);
                }
                ids = resolved.ids;

                const accessError = await checkStudentsAccess(userId, userRole, ids);
                if (accessError) {
                    return next(accessError);
                }
            }
            
            // Обновляем основные данные заявки и её связи со студентами в одной транзакции:
            // при ошибке на связи заявка не остаётся с изменённым статусом/описанием
            const t = await sequelize.transaction();

            try {
                // Обновляем основные данные заявки
                const updateData = {};
                if (documentId !== undefined) updateData.documentId = documentId;
                if (description !== undefined) updateData.description = description;
                if (status) updateData.status = status;
                
                if (Object.keys(updateData).length > 0) {
                    await request.update(updateData, { transaction: t });
                }
                
                // Если переданы новые студенты, обновляем связи
                if (ids) {
                    // Удаляем старые связи
                    await StudentRequest.destroy({ where: { requestId: id }, transaction: t });

                    // Создаем новые связи
                    await StudentRequest.bulkCreate(
                        ids.map(studentId => ({
                            studentId,
                            requestId: id
                        })),
                        { transaction: t }
                    );
                }

                // Создаем уведомление при изменении статуса
                if (status && status !== oldStatus) {
                    const notificationTitle = `Статус заявки #${id} изменен`;
                    const notificationBody = `Ваша заявка ${statusLabelFeminine(status)}`;
                    
                    await Notification.create({
                        userId: request.userId,
                        title: notificationTitle,
                        body: notificationBody,
                        requestId: request.id
                    }, { transaction: t });
                }

                await t.commit();
            } catch (error) {
                await t.rollback();
                throw error;
            }
            
            // Возвращаем обновленную заявку с полной информацией
            const updatedRequest = await Request.findByPk(id, {
                include: getRequestInclude()
            });
            
            return res.json(updatedRequest);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async getMine(req, res, next) {
        try {
            const requests = await Request.findAll({
                where: { userId: req.user.id },
                include: getRequestInclude(),
                order: [['createdAt', 'DESC']]
            });
            return res.json(requests);
        } catch (error) {
            return next(ApiError.internalRequest(error.message));
        }
    }

    async getOne(req, res, next) {
        try {
            const { id } = req.params;

            if (!id) {
                return next(ApiError.badRequest('Не указан ID заявки'));
            }

            const request = await Request.findByPk(id, {
                include: getRequestInclude()
            });
            if (!request) {
                return next(ApiError.badRequest('Заявка не найдена'));
            }

            if (request.userId !== req.user.id && req.user.role !== 'ADMIN') {
                return next(ApiError.forbiddenRequest('Нет доступа к этой заявке'));
            }

            return res.json(request);
        } catch (error) {
            return next(ApiError.internalRequest(error.message));
        }
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

            if (req.user.role !== 'ADMIN' && request.userId !== req.user.id) {
                return next(ApiError.forbiddenRequest('Недостаточно прав для изменения заявки'));
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