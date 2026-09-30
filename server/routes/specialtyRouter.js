const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const specialtyController = wrapController(require('../controllers/specialtyController'))
const checkRole = require('../middleware/checkRoleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', checkRole('ADMIN'), specialtyController.create)
router.get('/', authMiddleware, specialtyController.get)
router.put('/:id', checkRole('ADMIN'), specialtyController.update)
router.delete('/:id', checkRole('ADMIN'), specialtyController.delete)

module.exports = router