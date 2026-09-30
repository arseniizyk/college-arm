const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const requestController = wrapController(require('../controllers/requestController'))
const authMiddleware = require('../middleware/authMiddleware')
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware')

router.post('/', authMiddleware, requestController.create)
router.get('/', authMiddleware, checkRoleMiddleware('ADMIN'), requestController.get)
router.get('/mine', authMiddleware, requestController.getMine)
router.get('/:id', authMiddleware, requestController.getOne)
router.put('/:id', authMiddleware, requestController.update)
router.patch('/:id/view', authMiddleware, requestController.markAsViewed)
router.delete('/:id', authMiddleware, checkRoleMiddleware('ADMIN'), requestController.delete)

module.exports = router
