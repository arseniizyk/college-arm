const { Document, Packer } = require('docx');
const { Request, Student, Group, Specialty, Document: DocumentModel } = require('../models/models');
const { declineFullName, detectGender } = require('../utils/declension');
const { parseOrderNumber } = require('../utils/orderParser');
const { courseTextGenitive } = require('../utils/course');
const { createStudyCertificateTemplate } = require('../templates/studyCertificateTemplate');
const ApiError = require('../error/ApiError');

class DocumentGeneratorController {
    // Генерация справки об обучении
    async generateStudyCertificate(req, res, next) {
        try {
            const { requestId } = req.params;
            
            // Получаем заявку с полной информацией
            const request = await Request.findByPk(requestId, {
                include: [
                    {
                        model: DocumentModel,
                        attributes: ['id', 'document_name']
                    },
                    {
                        model: Student,
                        through: { attributes: [] },
                        attributes: ['id', 'last_name', 'name', 'father_name', 'order_number', 'enroll_date'],
                        include: [
                            {
                                model: Group,
                                attributes: ['id', 'group_number', 'enroll_date', 'payment_type'],
                                include: [
                                    {
                                        model: Specialty,
                                        attributes: ['id', 'name', 'qualification', 'duration_years', 'duration_months']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            
            if (!request) {
                return next(ApiError.badRequest('Заявка не найдена'));
            }
            
            // Проверяем, что это справка об обучении
            if (!request.document || !request.document.document_name.toLowerCase().includes('обучени')) {
                return next(ApiError.badRequest('Данная заявка не относится к справкам об обучении'));
            }
            
            if (!request.students || request.students.length === 0) {
                return next(ApiError.badRequest('В заявке нет студентов'));
            }
            
            // Создаем секции для документа
            const sections = [];

            // Группы, у которых удалена специальность (FK groups.specialtyId = ON DELETE SET NULL),
            // раньше молча пропускались через continue: справка приходила неполной, а если
            // таких студентов были все — приходил пустой валидный .docx с кодом 200.
            // Собираем их и отказываем до формирования документа.
            const skipped = [];

            // Генерируем справку для каждого студента
            for (let i = 0; i < request.students.length; i++) {
                const student = request.students[i];
                const group = student.group;
                const specialty = group?.specialty;

                if (!group || !specialty) {
                    const fio = [student.last_name, student.name, student.father_name]
                        .filter(Boolean).join(' ');
                    skipped.push({
                        fio,
                        reason: !group ? 'без группы' : 'без специальности'
                    });
                    continue;
                }
                
                // Подготавливаем данные для шаблона
                const templateData = prepareStudyCertificateData(student, group, specialty);
                
                // Создаем параграфы из шаблона
                const paragraphs = createStudyCertificateTemplate(templateData);
                
                // Добавляем секцию
                sections.push({
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 2.5cm
                                right: 1440,
                                bottom: 1440,
                                left: 1440
                            }
                        }
                    },
                    children: paragraphs
                });
            }
            
            // Создаем документ
            if (skipped.length > 0) {
                const list = skipped.map(s => `${s.fio} (${s.reason})`).join(', ');
                return next(ApiError.badRequest(
                    `Не удалось сформировать справку: у ${skipped.length} из ${request.students.length} студентов ` +
                    `отсутствует группа или специальность. Укажите специальность в группе — после этого справка соберётся полностью. ${list}`
                ));
            }

            const doc = new Document({
                sections: sections
            });
            
            // Генерируем буфер документа
            const buffer = await Packer.toBuffer(doc);
            
            // Отправляем файл
            const fileName = `Справка_об_обучении_${requestId}_${Date.now()}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Ошибка генерации документа:', error);
            next(ApiError.internalRequest(error.message));
        }
    }

}

const GENITIVE_MONTHS = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

/**
 * Подготавливает данные для шаблона справки об обучении
 */
function prepareStudyCertificateData(student, group, specialty) {
    // Склоняем ФИО в дательный падеж
    const declined = declineFullName(
        student.last_name,
        student.name,
        student.father_name || ''
    );
    
    // Парсим номер приказа
    const orderInfo = parseOrderNumber(student.order_number);
    const orderDate = orderInfo.date || new Date(student.enroll_date);
    const orderDateFormatted = orderInfo.dateStr || orderDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const orderNumber = orderInfo.number;
    
    const enrollDate = new Date(group.enroll_date);

    // Невычислимый курс утилита сводит к первому, а не пропускает в документ "NaN"
    const courseText = courseTextGenitive(group.enroll_date, specialty.duration_years, specialty.duration_months);
    
    // Вычисляем дату окончания обучения (всегда 30 июня)
    // Чтобы избежать мутаций Date, где 31 число при смене месяца на июнь с 30 днями
    // перескакивает на 1 июля (а затем 30 июля), вычисляем год окончания через Date с днем 1
    const graduationCalc = new Date(enrollDate);
    graduationCalc.setDate(1);
    graduationCalc.setFullYear(graduationCalc.getFullYear() + specialty.duration_years);
    graduationCalc.setMonth(graduationCalc.getMonth() + (specialty.duration_months || 0));
    const endDate = new Date(graduationCalc.getFullYear(), 5, 30);
    
    // Форматируем даты
    const enrollDateDay = enrollDate.getDate();
    const enrollDateMonthGenitive = GENITIVE_MONTHS[enrollDate.getMonth()];
    const enrollDateYear = enrollDate.getFullYear();
    
    const endDateDay = endDate.getDate();
    const endDateMonthGenitive = GENITIVE_MONTHS[endDate.getMonth()];
    const endDateYear = endDate.getFullYear();
    
    // Определяем пол для правильного склонения.
    const genderSuffix = detectGender(student.father_name, student.name) === 'female' ? 'а' : '';
    
    // Проверяем, нужен ли абзац о переименовании
    const needsRenameNote = new Date(student.enroll_date) < new Date('2022-12-06');
    
    // Определяем название колледжа
    const collegeNameAtEnrollment = needsRenameNote 
        ? 'Минский государственный колледж электроники'
        : (process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий');
    
    const currentCollegeName = process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий';
    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';
    
    return {
        declined,
        enrollDateDay,
        enrollDateMonthGenitive,
        enrollDateYear,
        genderSuffix,
        collegeNameAtEnrollment,
        currentCollegeName,
        specialty,
        group,
        courseText,
        endDateDay,
        endDateMonthGenitive,
        endDateYear,
        needsRenameNote,
        orderDateFormatted,
        orderNumber,
        directorName
    };
}

const controller = new DocumentGeneratorController();
controller.prepareStudyCertificateData = prepareStudyCertificateData;
controller.GENITIVE_MONTHS = GENITIVE_MONTHS;

module.exports = controller;
