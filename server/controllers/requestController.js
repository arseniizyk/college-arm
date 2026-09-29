const ApiError = require('../error/ApiError')
const sequelize = require('../db')
const { Request, StudentRequest, Student, Document, Group, Specialty, Notification, User } = require('../models/models')

// Общее дерево связей для заявки. sortStudents включает сортировку студентов по фамилии —
// она нужна только при отображении списка заявок (get, getMine), но не при create/update
const getRequestInclude = (sortStudents = false) => [
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
        ],
        ...(sortStudents ? { order: [['last_name', 'ASC']] } : {})
    }
];

// Роли, которым разрешено заказывать документы на любого студента.
// Остальные (USER) могут подавать заявку только на студента,
// привязанного к их аккаунту (student.userId === req.user.id).
const ROLES_WITH_ANY_STUDENT = ['ADMIN', 'TEACHER'];

// Проверяет, что пользователь имеет право заказывать документы на переданных студентов.
// Возвращает ApiError или null.
async function checkStudentsAccess(userId, userRole, studentIds) {
    if (ROLES_WITH_ANY_STUDENT.includes(userRole)) {
        return null;
    }

    const ownStudents = await Student.findAll({
        where: { userId },
        attributes: ['id']
    });
    const ownIds = ownStudents.map(s => s.id);
    // id могут прийти строками — сравниваем по числовому значению
    const foreign = studentIds.filter(id => !ownIds.includes(Number(id)));

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
            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return next(ApiError.badRequest('Не выбран ни один студент'));
            }

            if (!documentId && !description) {
                return next(ApiError.badRequest('Необходимо выбрать документ или указать описание'));
            }

            const accessError = await checkStudentsAccess(userId, req.user.role, studentIds);
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
                    studentIds.map(studentId => ({
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
                            body: notificationBody
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
                include: getRequestInclude(true),
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
            
            // Сохраняем старый статус для проверки изменения
            const oldStatus = request.status;
            
            // Валидация studentIds при обновлении
            if (studentIds !== undefined) {
                if (!Array.isArray(studentIds) || studentIds.length === 0) {
                    return next(ApiError.badRequest('Необходимо выбрать хотя бы одного студента'));
                }

                const accessError = await checkStudentsAccess(userId, userRole, studentIds);
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
                if (studentIds && Array.isArray(studentIds)) {
                    // Удаляем старые связи
                    await StudentRequest.destroy({ where: { requestId: id }, transaction: t });
                    
                    // Создаем новые связи
                    await StudentRequest.bulkCreate(
                        studentIds.map(studentId => ({
                            studentId,
                            requestId: id
                        })),
                        { transaction: t }
                    );
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
                include: getRequestInclude(true),
                order: [['createdAt', 'DESC']]
            });
            return res.json(requests);
        } catch (error) {
            return next(ApiError.internalRequest(error.message));
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