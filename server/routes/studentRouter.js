const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const studentController = wrapController(require('../controllers/studentController'))
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/', checkRole('ADMIN'), studentController.create)
router.get('/', checkRole('ADMIN'), studentController.get)
router.put('/:id', checkRole('ADMIN'), studentController.update)
router.delete('/:id', checkRole('ADMIN'), studentController.delete)

module.exports = router
