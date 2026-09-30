const { declineFullNameAccusative } = require('../utils/declension');
const { point, listItem, hanging, emptyLine, header, signatureBlock, directorName } = require('./layout');

const createExamAdmissionOrderTemplate = (data) => {
    const {
        examSubjects = [],
        specialtyName = '',
        course = '',
        groupNumber = '',
        students = [],
        fullGroup = true,
        controlPerson = '',
        basis = '',
        deputyDirector = '',
        legalCounsel = '',
        acquainted = '',
    } = data;

    // Склоняем студентов в винительный падеж (кого? что?)
    const studentsAccusative = students.map(s => {
        try {
            const declined = declineFullNameAccusative(s.lastName, s.firstName, s.fatherName || '');
            return declined.fullName;
        } catch {
            return `${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}`;
        }
    });

    // Строка с предметами
    const subjectsText = examSubjects.map(s =>
        `${s.date} «${s.subject}» (преподаватель ${s.teacher})`
    ).join(', ');

    return [
        // Заголовок приказа
        header('О допуске к экзаменам'),

        emptyLine(),

        // Основание (преамбула)
        point('В соответствии с п. 20 «Правил проведения аттестации учащихся курсантов, при освоении содержания образовательных программ среднего специального образования», утвержденных постановлением Министерства образования Республики Беларусь от 23.08.2022 № 282 «О некоторых вопросах среднего специального образования»'),

        // ПРИКАЗЫВАЮ
        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. Допустить к сдаче экзаменов по учебным предметам, модулям профессионального компонента учебного плана: ${subjectsText} по специальности ${specialtyName} учащихся ${course}-го курса учебной группы ${groupNumber} ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`),

        // Список студентов
        ...studentsAccusative.map((name, index) =>
            listItem(`1.${index + 1}.        ${name}${index === studentsAccusative.length - 1 ? '.' : ';'}`)
        ),

        // Пункт 2
        point(`2. Контроль за исполнением приказа возложить на ${controlPerson}`),

        // Основание
        hanging(`Основание: ${basis}`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Директор', name: directorName() },
            { position: ['Заместитель директора ', 'по учебной работе'], name: deputyDirector, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true },
            {
                position: 'Ознакомлена:',
                name: acquainted,
                spaces: '                                                                                '
            }
        ])
    ];
};

module.exports = { createExamAdmissionOrderTemplate };
