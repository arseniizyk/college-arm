const { Document, Packer } = require('docx');
const { Student, Group, Specialty } = require('../models/models');
const { declineFullName, detectGender } = require('../utils/declension');
const { parseOrderNumber } = require('../utils/orderParser');
const { courseTextGenitive } = require('../utils/course');
const { createStudyCertificateTemplate } = require('../templates/studyCertificateTemplate');
const ApiError = require('../error/ApiError');

class DocumentGeneratorController {
    // Генерация справки об обучении (административная выписка)
    async generateStudyCertificate(req, res, next) {
        try {
            const rawIds = req.body?.studentIds ?? req.body?.studentId;
            const idList = (Array.isArray(rawIds) ? rawIds : [rawIds])
                .map(Number)
                .filter(id => !isNaN(id) && id > 0);

            if (idList.length === 0) {
                return next(ApiError.badRequest('Не выбран ни один студент'));
            }

            const students = await Student.findAll({
                where: { id: idList },
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
                ],
                order: [['last_name', 'ASC'], ['name', 'ASC']]
            });

            if (!students || students.length === 0) {
                return next(ApiError.badRequest('Студенты не найдены'));
            }

            // Создаем секции для документа
            const sections = [];
            const skipped = [];

            for (let i = 0; i < students.length; i++) {
                const student = students[i];
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

            if (skipped.length > 0) {
                const list = skipped.map(s => `${s.fio} (${s.reason})`).join(', ');
                return next(ApiError.badRequest(
                    `Не удалось сформировать справку: у ${skipped.length} из ${students.length} студентов ` +
                    `отсутствует группа или специальность. Укажите специальность в группе — после этого справка соберётся полностью. ${list}`
                ));
            }

            const doc = new Document({
                sections
            });

            const buffer = await Packer.toBuffer(doc);

            const fileName = students.length === 1
                ? `Справка_об_обучении_${students[0].last_name}_${Date.now()}.docx`
                : `Справки_об_обучении_${Date.now()}.docx`;

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
