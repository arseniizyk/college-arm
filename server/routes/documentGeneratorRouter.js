const Router = require('express');
const router = new Router();
const documentGeneratorController = require('../controllers/documentGeneratorController');
const adminDocumentController = require('../controllers/adminDocumentController');
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
router.post(
    '/admin/practice-contract',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generatePracticeContract
);

router.post(
    '/admin/exam-admission-order',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateExamAdmissionOrder
);

router.post(
    '/admin/holidays-order',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateHolidaysOrder
);

router.post(
    '/admin/stipend-order',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateStipendOrder
);

router.post(
    '/admin/snow-cleaning-order',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateSnowCleaningOrder
);

router.post(
    '/admin/student-direction-order',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateStudentDirectionOrder
);

router.post(
    '/admin/health-order',
    authMiddleware,
    checkRoleMiddleware('ADMIN'),
    adminDocumentController.generateHealthOrder
);

router.post('/admin/transfer-order', authMiddleware, checkRoleMiddleware('ADMIN'), adminDocumentController.generateTransferOrder);
router.post('/admin/duplicate-ticket-order', authMiddleware, checkRoleMiddleware('ADMIN'), adminDocumentController.generateDuplicateTicketOrder);
router.post('/admin/enrollment-order', authMiddleware, checkRoleMiddleware('ADMIN'), adminDocumentController.generateEnrollmentOrder);
router.post('/admin/release-order', authMiddleware, checkRoleMiddleware('ADMIN'), adminDocumentController.generateReleaseOrder);

module.exports = router;
