const { declineFullNameAccusative } = require('../utils/declension');
const { point, listItem, hanging, emptyLine, headerMulti, signatureBlock } = require('./layout');

const createTransferOrderTemplate = (data) => {
    const {
        academicYear = '',
        nextCourse = '',
        dateFrom = '',
        dateTo = '',
        groupNumber = '',
        specialtyName = '',
        fullGroup = true,
        students = [],
        conditionalStudent = null, // {lastName, firstName, fatherName} — условный перевод
        basis = '',
        deputyDirector = '',
        chiefAccountant = '',
        headOfDepartment = '',
    } = data;

    // Склоняем условного студента в винительный падеж
    let conditionalAccusative = '';
    if (conditionalStudent?.lastName) {
        try {
            const declined = declineFullNameAccusative(
                conditionalStudent.lastName,
                conditionalStudent.firstName,
                conditionalStudent.fatherName || ''
            );
            conditionalAccusative = declined.fullName;
        } catch {
            conditionalAccusative = `${conditionalStudent.lastName} ${conditionalStudent.firstName}${conditionalStudent.fatherName ? ' ' + conditionalStudent.fatherName : ''}`;
        }
    }

    return [
        ...headerMulti(['Об установлении каникул', 'и переводе учащихся', 'на следующий курс']),

        emptyLine(),

        // Преамбула
        point(`В связи с успешным выполнением учебного плана ${academicYear} учебного года, и получением положительных результатов текущей аттестации и на основании п. 21 Правил проведения аттестации учащихся курсантов, при освоении содержания образовательных программ среднего специального образования», утвержденных постановлением Министерства образования Республики Беларусь от 23.08.2022 № 282 «О некоторых вопросах среднего специального образования»`),

        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. Перевести на ${nextCourse} курс и установить каникулы с ${dateFrom} по ${dateTo} учащимся учебной группы ${groupNumber}, обучающимся по специальности ${specialtyName} ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`),

        // Список студентов
        ...students.map((s, index) =>
            listItem(`1.${index + 1}. ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === students.length - 1 ? '.' : ''}`)
        ),

        // Пункт 2 — условный перевод (если есть)
        ...(conditionalStudent?.lastName ? [
            emptyLine(),
            point(`2. Перевести ${conditionalAccusative}, учащегося учебной группы ${groupNumber}, обучающегося по специальности ${specialtyName} на ${nextCourse} курс условно, в связи с имеющейся академической задолженностью и установить каникулы с ${dateFrom} по ${dateTo}.`)
        ] : []),

        emptyLine(),

        // Основание
        hanging(`Основание: ${basis}`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Заместитель директора', name: deputyDirector, spaces: '                                                                          ' },
            { position: 'Главный бухгалтер', name: chiefAccountant, stacked: true },
            { position: 'Заведующий отделением', name: headOfDepartment, stacked: true }
        ])
    ];
};

module.exports = { createTransferOrderTemplate };
