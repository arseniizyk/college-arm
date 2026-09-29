const ApiError = require('../error/ApiError')
const { Notification } = require('../models/models')

class NotificationController {
    // Получить все уведомления пользователя
    async getUserNotifications(req, res, next) {
        try {
            const userId = req.user.id;
            
            const notifications = await Notification.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']]
            });
            
            return res.json(notifications);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    // Пометить уведомление как прочитанное
    async markAsRead(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            
            const notification = await Notification.findOne({
                where: { id, userId }
            });
            
            if (!notification) {
                return next(ApiError.badRequest('Уведомление не найдено'));
            }
            
            await notification.update({ isRead: true });
            
            return res.json(notification);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    // Пометить все уведомления как прочитанные
    async markAllAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            
            await Notification.update(
                { isRead: true },
                { where: { userId, isRead: false } }
            );
            
            const notifications = await Notification.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']]
            });
            
            return res.json(notifications);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    // Удалить уведомление
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            
            const notification = await Notification.findOne({
                where: { id, userId }
            });
            
            if (!notification) {
                return next(ApiError.badRequest('Уведомление не найдено'));
            }
            
            await notification.destroy();
            
            return res.json({ message: 'Уведомление удалено' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    // Удалить все уведомления пользователя
    async deleteAll(req, res, next) {
        try {
            const userId = req.user.id;
            
            await Notification.destroy({
                where: { userId }
            });
            
            return res.json({ message: 'Все уведомления удалены' });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new NotificationController()
