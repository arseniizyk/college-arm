const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const teacherController = wrapController(require('../controllers/teacherController'))
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/', checkRole('ADMIN'), teacherController.create)
router.get('/', checkRole('ADMIN'), teacherController.get)
router.put('/:id', checkRole('ADMIN'), teacherController.update)
router.delete('/:id', checkRole('ADMIN'), teacherController.delete)

module.exports = router
