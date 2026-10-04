const { declineFullNameAccusative, detectGender } = require('../utils/declension');
const {
    point, listItem, hanging, emptyLine, headerMulti, signatureBlock, signatureList, directorName
} = require('./layout');

const createHealthOrderTemplate = (data) => {
    const {
        dateFrom = '',
        dateTo = '',
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        groupNumber = '',
        specialtyName = '',
        healthReason = '',
        responsiblePerson = '',
        curatorName = '',
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    // Склоняем ФИО студента в винительный падеж (кого? что?)
    let studentAccusative = `${studentLastName} ${studentFirstName}${studentFatherName ? ' ' + studentFatherName : ''}`;
    try {
        const declined = declineFullNameAccusative(studentLastName, studentFirstName, studentFatherName || '');
        studentAccusative = declined.fullName;
    } catch {}

    const isFemale = detectGender(studentFatherName, studentFirstName) === 'female';
    const studentWord = isFemale ? 'учащуюся' : 'учащегося';
    const studyingWord = isFemale ? 'обучающуюся' : 'обучающегося';

    return [
        ...headerMulti(['Об освобождении от занятий', 'обучающегося колледжа']),

        emptyLine(),

        // Преамбула
        point('В соответствии с п. 14, 16, 21 «Положения о платных дополнительных услугах и порядке ликвидации задолженностей учащимися», утвержденного директором колледжа'),

        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. Освободить от учебных занятий в период с ${dateFrom} по ${dateTo} ${studentAccusative}, ${studentWord} учебной группы ${groupNumber}, ${studyingWord} по специальности ${specialtyName} в связи с ${healthReason}.`),

        // Пункт 1.2 — отступ 720, как у элемента списка
        listItem(`1.2. Ответственность за жизнь и здоровье несет ${responsiblePerson}.`),

        // Пункт 2
        point(`2. Куратору учебной группы ${curatorName}:`),
        listItem('2.1. инструктировать учащегося о необходимости соблюдать правила безопасного поведения на улице, на дороге, в общественном транспорте, вблизи водоёмов и железнодорожных путей, в общественных местах;'),
        listItem('2.2. обратить внимание учащегося на необходимость постоянно иметь при себе и носить световозвращающие элементы (фликеры).'),

        // Пункт 3
        point('3. Учащийся отрабатывает пропущенные занятия, во время которых проводились практические или лабораторные работы, обязательные контрольные работы.'),

        // Пункт 4
        point(`4. Контроль за исполнением приказа возложить на ${controlPerson}.`),

        // Основание
        hanging(`Основание: ${basis}`),

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

module.exports = { createHealthOrderTemplate };
