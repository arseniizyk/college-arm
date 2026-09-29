const { Document, Packer } = require('docx');
const { Request, Student, Group, Specialty, Document: DocumentModel } = require('../models/models');
const { declineFullName } = require('../utils/declension');
const { parseOrderNumber } = require('../utils/orderParser');
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
            
            // Генерируем справку для каждого студента
            for (let i = 0; i < request.students.length; i++) {
                const student = request.students[i];
                const group = student.group;
                const specialty = group?.specialty;
                
                if (!group || !specialty) {
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
    
    // Вычисляем курс
    const enrollDate = new Date(group.enroll_date);
    const now = new Date();
    let yearsDiff = now.getFullYear() - enrollDate.getFullYear();
    if (now.getMonth() < 8 && enrollDate.getMonth() >= 8) {
        yearsDiff--;
    }
    const course = yearsDiff + 1;
    const maxCourse = specialty.duration_years + (specialty.duration_months > 0 ? 1 : 0);
    
    // Определяем курс прописью
    const courseWords = ['первого', 'второго', 'третьего', 'четвертого'];
    const courseText = course > maxCourse ? 'выпускник' : courseWords[course - 1] || `${course}`;
    
    // Вычисляем дату окончания обучения
    const endDate = new Date(enrollDate);
    endDate.setFullYear(endDate.getFullYear() + specialty.duration_years);
    endDate.setMonth(endDate.getMonth() + (specialty.duration_months || 0));
    endDate.setMonth(5); // Июнь
    endDate.setDate(30); // 30 июня
    
    // Форматируем даты
    const enrollDateDay = enrollDate.getDate();
    const enrollDateMonthGenitive = enrollDate.toLocaleDateString('ru-RU', { month: 'long' }).replace(/ь$/, 'я');
    const enrollDateYear = enrollDate.getFullYear();
    
    const endDateDay = endDate.getDate();
    const endDateMonthGenitive = endDate.toLocaleDateString('ru-RU', { month: 'long' }).replace(/ь$/, 'я');
    const endDateYear = endDate.getFullYear();
    
    // Определяем пол для правильного склонения
    const gender = student.father_name && (student.father_name.endsWith('овна') || student.father_name.endsWith('евна')) ? 'женский' : 'мужской';
    const genderSuffix = gender === 'женский' ? 'а' : '';
    
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

module.exports = new DocumentGeneratorController();
