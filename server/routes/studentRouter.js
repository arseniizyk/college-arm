const Router = require('express')
const router = new Router()
const studentController = require('../controllers/studentController')
const checkRole = require('../middleware/checkRoleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', checkRole('ADMIN'), studentController.create)
router.get('/', authMiddleware, studentController.get)
router.put('/:id', checkRole('ADMIN'), studentController.update)
router.delete('/:id', checkRole('ADMIN'), studentController.delete)

module.exports = router