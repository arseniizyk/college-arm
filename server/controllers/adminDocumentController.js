const { Document, Packer, Paragraph } = require('docx');
const { createPracticeContractTemplate } = require('../templates/practiceContractTemplate');
const { ORDER_REGISTRY } = require('../templates/registry');
const ApiError = require('../error/ApiError');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ORDER_MARGIN = { top: 851, right: 851, bottom: 851, left: 1701 };
const PRACTICE_CONTRACT_MARGIN = { top: 425, right: 561, bottom: 425, left: 851 };

const sendDocx = async (res, paragraphs, margin, filePrefix) => {
    const doc = new Document({
        sections: [{
            properties: { page: { margin } },
            children: paragraphs
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${filePrefix}_${Date.now()}.docx`;

    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
};

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

            await sendDocx(res, allParagraphs, PRACTICE_CONTRACT_MARGIN, 'Договор_практика');

        } catch (error) {
            console.error('Ошибка генерации договора:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

    // Тип приказа приходит в req.params.docType — сегментом маршрута.
    async generateOrder(req, res, next) {
        const { docType } = req.params;
        const order = ORDER_REGISTRY[docType];

        if (!order) {
            return next(ApiError.notFound(`Неизвестный тип документа: ${docType}`));
        }

        try {
            const paragraphs = order.createTemplate(req.body);
            await sendDocx(res, paragraphs, ORDER_MARGIN, order.filePrefix);
        } catch (error) {
            console.error(order.errorsContext, error);
            next(ApiError.internalRequest(error.message));
        }
    }

}

module.exports = new AdminDocumentController();