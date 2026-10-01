const Router = require('express');
const router = new Router();
const { wrapController } = require('../utils/asyncHandler');
const documentGeneratorController = wrapController(require('../controllers/documentGeneratorController'));
const adminDocumentController = wrapController(require('../controllers/adminDocumentController'));
const authMiddleware = require('../middleware/authMiddleware');
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware');

// Генерация справки об обучении (только для администраторов)
router.get(
    '/study-certificate/:requestId',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    documentGeneratorController.generateStudyCertificate
);

// Генерация административных документов (только для администраторов)

// Договор практики: две копии на каждого студента и свои отступы страницы,
// поэтому общий обработчик приказов к нему неприменим.
router.post(
    '/admin/practice-contract',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generatePracticeContract
);

// Все приказы. Тип документа перечислен в templates/registry.js —
// неизвестный сегмент даёт 404, а не падение в createTemplate(undefined).
router.post(
    '/admin/orders/:docType',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateOrder
);

module.exports = router;