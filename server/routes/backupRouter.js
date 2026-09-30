const Router = require('express');
const router = new Router();
const { wrapController } = require('../utils/asyncHandler');
const backupController = wrapController(require('../controllers/backupController'));
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware');

// Все операции с бэкапами доступны только администраторам
router.post('/create', checkRoleMiddleware('ADMIN'), backupController.create);
router.get('/list', checkRoleMiddleware('ADMIN'), backupController.list);
router.get('/download/:fileName', checkRoleMiddleware('ADMIN'), backupController.download);
router.post('/restore', checkRoleMiddleware('ADMIN'), backupController.restore);

module.exports = router;
