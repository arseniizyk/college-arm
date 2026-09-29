const Router = require('express')
const router = new Router()
const teacherController = require('../controllers/teacherController')
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/', checkRole('ADMIN'), teacherController.create)
router.get('/', teacherController.get)
router.put('/:id', checkRole('ADMIN'), teacherController.update)
router.delete('/:id', checkRole('ADMIN'), teacherController.delete)

module.exports = router