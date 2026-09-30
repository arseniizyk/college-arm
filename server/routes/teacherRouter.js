const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const teacherController = wrapController(require('../controllers/teacherController'))
const checkRole = require('../middleware/checkRoleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', checkRole('ADMIN'), teacherController.create)
router.get('/', authMiddleware, teacherController.get)
router.put('/:id', checkRole('ADMIN'), teacherController.update)
router.delete('/:id', checkRole('ADMIN'), teacherController.delete)

module.exports = router