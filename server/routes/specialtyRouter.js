const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const specialtyController = wrapController(require('../controllers/specialtyController'))
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/', checkRole('ADMIN'), specialtyController.create)
router.get('/', checkRole('ADMIN'), specialtyController.get)
router.put('/:id', checkRole('ADMIN'), specialtyController.update)
router.delete('/:id', checkRole('ADMIN'), specialtyController.delete)

module.exports = router
