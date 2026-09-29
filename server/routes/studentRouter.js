const Router = require('express')
const router = new Router()
const studentController = require('../controllers/studentController')
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/', checkRole('ADMIN'), studentController.create)
router.get('/', studentController.get)
router.put('/:id', checkRole('ADMIN'), studentController.update)
router.delete('/:id', checkRole('ADMIN'), studentController.delete)

module.exports = router