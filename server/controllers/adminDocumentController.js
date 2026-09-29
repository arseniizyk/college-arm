const { Document, Packer, Paragraph } = require('docx');
const { createPracticeContractTemplate } = require('../templates/practiceContractTemplate');
const { createExamAdmissionOrderTemplate } = require('../templates/examAdmissionOrderTemplate');
const { createHolidaysOrderTemplate } = require('../templates/holidaysOrderTemplate');
const { createStipendOrderTemplate } = require('../templates/stipendOrderTemplate');
const { createSnowCleaningOrderTemplate } = require('../templates/snowCleaningOrderTemplate');
const { createStudentDirectionOrderTemplate } = require('../templates/studentDirectionOrderTemplate');
const { createHealthOrderTemplate } = require('../templates/healthOrderTemplate');
const { createTransferOrderTemplate } = require('../templates/transferOrderTemplate');
const { createDuplicateTicketOrderTemplate } = require('../templates/duplicateTicketOrderTemplate');
const { createEnrollmentOrderTemplate } = require('../templates/enrollmentOrderTemplate');
const { createReleaseOrderTemplate } = require('../templates/releaseOrderTemplate');
const ApiError = require('../error/ApiError');

class AdminDocumentController {

    async generatePracticeContract(req, res, next) {
        try {
            const data = req.body;
            const students = data.students || [];

            // Генерируем по 2 экземпляра договора на каждого студента
            const allParagraphs = [];
            students.forEach((student, index) => {
                const contractData = {
                    ...data,
                    studentLastName: student.lastName,
                    studentFirstName: student.firstName,
                    studentFatherName: student.fatherName || '',
                };
                const paragraphs = createPracticeContractTemplate(contractData);

                // Первый экземпляр
                allParagraphs.push(...paragraphs);
                // Разрыв страницы между экземплярами
                allParagraphs.push(new Paragraph({ children: [], pageBreakBefore: true }));
                // Второй экземпляр
                allParagraphs.push(...paragraphs);

                // Разрыв страницы между студентами (кроме последнего)
                if (index < students.length - 1) {
                    allParagraphs.push(new Paragraph({ children: [], pageBreakBefore: true }));
                }
            });

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: { top: 425, right: 561, bottom: 425, left: 851 }
                        }
                    },
                    children: allParagraphs
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            const fileName = `Договор_практика_${Date.now()}.docx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);

        } catch (error) {
            console.error('Ошибка генерации договора:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateExamAdmissionOrder(req, res, next) {
        try {
            const paragraphs = createExamAdmissionOrderTemplate(req.body);

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: { top: 851, right: 851, bottom: 851, left: 1701 }
                        }
                    },
                    children: paragraphs
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_допуск_экзамены_${Date.now()}.docx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);

        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateHolidaysOrder(req, res, next) {
        try {
            const paragraphs = createHolidaysOrderTemplate(req.body);

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: { top: 851, right: 851, bottom: 851, left: 1701 }
                        }
                    },
                    children: paragraphs
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_каникулы_${Date.now()}.docx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);

        } catch (error) {
            console.error('Ошибка генерации приказа о каникулах:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateStipendOrder(req, res, next) {
        try {
            const paragraphs = createStipendOrderTemplate(req.body);

            const doc = new Document({
                sections: [{
                    properties: {
                        page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } }
                    },
                    children: paragraphs
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_стипендия_${Date.now()}.docx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);

        } catch (error) {
            console.error('Ошибка генерации приказа о стипендии:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateSnowCleaningOrder(req, res, next) {
        try {
            const paragraphs = createSnowCleaningOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_уборка_снега_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateStudentDirectionOrder(req, res, next) {
        try {
            const paragraphs = createStudentDirectionOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_направление_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateHealthOrder(req, res, next) {
        try {
            const paragraphs = createHealthOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_оздоровление_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateTransferOrder(req, res, next) {
        try {
            const paragraphs = createTransferOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_перевод_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateDuplicateTicketOrder(req, res, next) {
        try {
            const paragraphs = createDuplicateTicketOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_дубликат_билета_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateEnrollmentOrder(req, res, next) {
        try {
            const paragraphs = createEnrollmentOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_зачисление_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    async generateReleaseOrder(req, res, next) {
        try {
            const paragraphs = createReleaseOrderTemplate(req.body);
            const doc = new Document({
                sections: [{
                    properties: { page: { margin: { top: 851, right: 851, bottom: 851, left: 1701 } } },
                    children: paragraphs
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            const fileName = `Приказ_освобождение_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Ошибка генерации приказа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

}

module.exports = new AdminDocumentController();
