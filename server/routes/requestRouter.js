const Router = require('express')
const router = new Router()
const requestController = require('../controllers/requestController')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', authMiddleware, requestController.create)
router.get('/', requestController.get)
router.get('/:id', requestController.getOne)
router.put('/:id', authMiddleware, requestController.update)
router.patch('/:id/view', requestController.markAsViewed)
router.delete('/:id', requestController.delete)

module.exports = router