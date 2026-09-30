const Router = require('express')
const router = new Router()
const { wrapController } = require('../utils/asyncHandler')
const userController = wrapController(require('../controllers/userController'))
const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/checkRoleMiddleware')

router.post('/registration', userController.registration)
router.post('/login', userController.login)
router.get('/auth', authMiddleware, userController.check)
router.get('/me', authMiddleware, userController.getMe)
router.post('/change-password', authMiddleware, userController.changePassword)
router.post('/change-email', authMiddleware, userController.changeEmail)
router.delete('/delete-my-account', authMiddleware, userController.deleteMyAccount)
router.get('/', checkRole('ADMIN'), userController.get)
router.post('/', checkRole('ADMIN'), userController.create)
router.put('/:id', checkRole('ADMIN'), userController.update)
router.delete('/:id', checkRole('ADMIN'), userController.delete)

 
module.exports = router  