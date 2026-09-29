const Router = require('express')
const router = new Router()
const documentController = require('../controllers/documentController')
const checkRole = require('../middleware/checkRoleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', checkRole('ADMIN'), documentController.create)
router.get('/', authMiddleware, documentController.get)
router.put('/:id', checkRole('ADMIN'), documentController.update)
router.delete('/:id', checkRole('ADMIN'), documentController.delete)

module.exports = router