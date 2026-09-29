const Router = require('express')
const router = new Router()
const groupController = require('../controllers/groupController')
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/', checkRole('ADMIN'), groupController.create)
router.get('/', groupController.get)
router.put('/:id', checkRole('ADMIN'), groupController.update)
router.delete('/:id', checkRole('ADMIN'), groupController.delete)

module.exports = router 