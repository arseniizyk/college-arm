const { declineFullName, detectGender } = require('../utils/declension');
const { point, listItem, hanging, emptyLine, headerMulti, signatureBlock, directorName } = require('./layout');

const createDuplicateTicketOrderTemplate = (data) => {
    const {
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        groupNumber = '',
        specialtyName = '',
        lossReason = 'оригинал утерян',
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        legalCounsel = '',
    } = data;

    const collegeName = process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий';

    // Дательный падеж — Паплёвка Максиму Дмитриевичу
    let studentDative = `${studentLastName} ${studentFirstName}${studentFatherName ? ' ' + studentFatherName : ''}`;
    try {
        const declined = declineFullName(studentLastName, studentFirstName, studentFatherName || '');
        studentDative = declined.fullName;
    } catch {}

    // Определяем пол
    const isFemale = detectGender(studentFatherName, studentFirstName) === 'female';
    const ticketWord = isFemale ? 'учащейся' : 'учащегося';
    const studentDativeWord = isFemale ? 'учащейся' : 'учащемуся';
    const studyingWord = isFemale ? 'обучающейся' : 'обучающемуся';

    return [
        ...headerMulti(['О выдаче дубликата', 'билета учащегося']),

        emptyLine(),

        // Преамбула
        point('В соответствии с п. п. 6.1.4. Указа Президента Республики Беларусь от 26.04.2010 № 200 и на основании поданного учащимся заявления'),

        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. Секретарю учебной части учреждения образования «${collegeName}»:`),

        // Пункт 1.1 — отступ 720, как у элемента списка
        listItem(`1.1. Выдать дубликат билета ${ticketWord} ${studentDative}, ${studentDativeWord} учебной группы ${groupNumber}, ${studyingWord} по специальности ${specialtyName} в связи с тем, что ${lossReason}.`),

        // Пункт 2
        point('2. Внести записи в книгу регистрации выдачи билетов учащихся.'),

        // Пункт 3
        point(`3. Контроль за исполнением приказа возложить на ${controlPerson}.`),

        // Основание
        hanging(`Основание: ${basis}`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Директор', name: directorName() },
            { position: 'Заведующий отделением', name: headOfDepartment, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true }
        ])
    ];
};

module.exports = { createDuplicateTicketOrderTemplate };
