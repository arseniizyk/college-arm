const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const healthController = wrapController(require('../controllers/healthController'))

// Без authMiddleware: эндпоинт опрашивают оркестраторы, а не пользователи
router.get('/', healthController.check)

module.exports = router
