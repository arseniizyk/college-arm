const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const groupController = wrapController(require('../controllers/groupController'))
const checkRole = require('../middleware/checkRoleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', checkRole('ADMIN'), groupController.create)
router.get('/', authMiddleware, groupController.get)
router.put('/:id', checkRole('ADMIN'), groupController.update)
router.delete('/:id', checkRole('ADMIN'), groupController.delete)

module.exports = router 