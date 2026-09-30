const { detectGender, declineFullNameAccusative } = require('../utils/declension');
const {
    point, listItem, emptyLine, headerMulti, signatureBlock, signatureList, directorName
} = require('./layout');

const createReleaseOrderTemplate = (data) => {
    const {
        basis = '',
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        groupNumber = '',
        specialtyName = '',
        periods = [],   // [{dateFrom, dateTo, eventName, eventAddress}]
        responsible = '',
        curatorName = '',
        controlPerson = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    const isFemale = detectGender(studentFatherName) === 'female';
    const studentWord = isFemale ? 'учащейся' : 'учащегося';
    const studyingWord = isFemale ? 'обучающейся' : 'обучающегося';

    // Склоняем ФИО в винительный падеж
    let studentAccusative = `${studentLastName} ${studentFirstName}${studentFatherName ? ' ' + studentFatherName : ''}`;
    try {
        const declined = declineFullNameAccusative(studentLastName, studentFirstName, studentFatherName || '');
        studentAccusative = declined.fullName;
    } catch {}

    // Пункты освобождения
    const periodParagraphs = [];
    periods.forEach((period, index) => {
        const dateText = period.dateTo && period.dateTo !== period.dateFrom
            ? `с ${period.dateFrom} по ${period.dateTo}`
            : period.dateFrom;
        periodParagraphs.push(
            point(`${index + 1}. Освободить ${dateText} от учебных занятий ${studentAccusative}, ${studentWord} учебной группы ${groupNumber}, ${studyingWord} по специальности ${specialtyName} для участия в ${period.eventName}, которое состоится ${dateText} по адресу: ${period.eventAddress}.`)
        );
    });

    const nextPoint = periods.length + 1;

    return [
        ...headerMulti(['Об освобождении от занятий', 'обучающегося колледжа']),

        emptyLine(),

        // Преамбула
        point(`На основании ${basis}`),

        point('ПРИКАЗЫВАЮ:'),

        // Пункты освобождения
        ...periodParagraphs,

        // Ответственность
        point(`${nextPoint}. Принять к сведению, что ответственность за жизнь и безопасность учащегося возлагается на ${responsible}.`),

        // Куратор
        point(`${nextPoint + 1}. Куратору учебной группы ${curatorName}:`),
        listItem(`${nextPoint + 1}.1. инструктировать учащегося о необходимости соблюдать правила безопасного поведения на улице, на дороге, в общественном транспорте, вблизи водоёмов и железнодорожных путей, в общественных местах;`),
        listItem(`${nextPoint + 1}.2. обратить внимание учащегося на необходимость постоянно иметь при себе и носить световозвращающие элементы (фликеры).`),

        // Отработка
        point(`${nextPoint + 2}. Учащийся, отрабатывает пропущенные занятия, во время которых проводились практические или лабораторные работы, обязательные контрольные работы.`),

        // Контроль
        point(`${nextPoint + 3}. Контроль за исполнением приказа возложить на ${controlPerson}.`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Директор', name: directorName() },
            { position: 'Заведующий отделением', name: headOfDepartment, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true }
        ]),

        emptyLine(),

        ...signatureList(
            'С приказом ознакомлен(а):',
            acquainted,
            '                                                                    ',
            '                                                                                                                                    '
        )
    ];
};

module.exports = { createReleaseOrderTemplate };
