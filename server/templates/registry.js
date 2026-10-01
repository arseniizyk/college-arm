const { createExamAdmissionOrderTemplate } = require('./examAdmissionOrderTemplate');
const { createHolidaysOrderTemplate } = require('./holidaysOrderTemplate');
const { createStipendOrderTemplate } = require('./stipendOrderTemplate');
const { createSnowCleaningOrderTemplate } = require('./snowCleaningOrderTemplate');
const { createStudentDirectionOrderTemplate } = require('./studentDirectionOrderTemplate');
const { createHealthOrderTemplate } = require('./healthOrderTemplate');
const { createTransferOrderTemplate } = require('./transferOrderTemplate');
const { createDuplicateTicketOrderTemplate } = require('./duplicateTicketOrderTemplate');
const { createEnrollmentOrderTemplate } = require('./enrollmentOrderTemplate');
const { createReleaseOrderTemplate } = require('./releaseOrderTemplate');

const ORDER_REGISTRY = {
    'exam-admission': {
        createTemplate: createExamAdmissionOrderTemplate,
        filePrefix: 'Приказ_допуск_экзамены',
        errorsContext: 'Ошибка генерации приказа',
    },
    holidays: {
        createTemplate: createHolidaysOrderTemplate,
        filePrefix: 'Приказ_каникулы',
        errorsContext: 'Ошибка генерации приказа о каникулах',
    },
    stipend: {
        createTemplate: createStipendOrderTemplate,
        filePrefix: 'Приказ_стипендия',
        errorsContext: 'Ошибка генерации приказа о стипендии',
    },
    'snow-cleaning': {
        createTemplate: createSnowCleaningOrderTemplate,
        filePrefix: 'Приказ_уборка_снега',
        errorsContext: 'Ошибка генерации приказа',
    },
    'student-direction': {
        createTemplate: createStudentDirectionOrderTemplate,
        filePrefix: 'Приказ_направление',
        errorsContext: 'Ошибка генерации приказа',
    },
    health: {
        createTemplate: createHealthOrderTemplate,
        filePrefix: 'Приказ_оздоровление',
        errorsContext: 'Ошибка генерации приказа',
    },
    transfer: {
        createTemplate: createTransferOrderTemplate,
        filePrefix: 'Приказ_перевод',
        errorsContext: 'Ошибка генерации приказа',
    },
    'duplicate-ticket': {
        createTemplate: createDuplicateTicketOrderTemplate,
        filePrefix: 'Приказ_дубликат_билета',
        errorsContext: 'Ошибка генерации приказа',
    },
    enrollment: {
        createTemplate: createEnrollmentOrderTemplate,
        filePrefix: 'Приказ_зачисление',
        errorsContext: 'Ошибка генерации приказа',
    },
    release: {
        createTemplate: createReleaseOrderTemplate,
        filePrefix: 'Приказ_освобождение',
        errorsContext: 'Ошибка генерации приказа',
    },
};

module.exports = { ORDER_REGISTRY };