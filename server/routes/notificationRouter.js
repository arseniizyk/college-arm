const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const notificationController = wrapController(require('../controllers/notificationController'))
const authMiddleware = require('../middleware/authMiddleware')

// Все роуты требуют авторизации
router.get('/', authMiddleware, notificationController.getUserNotifications)
router.put('/read-all', authMiddleware, notificationController.markAllAsRead)
router.put('/:id/read', authMiddleware, notificationController.markAsRead)
router.delete('/:id', authMiddleware, notificationController.delete)
router.delete('/', authMiddleware, notificationController.deleteAll)

module.exports = router
