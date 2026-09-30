const { point, listItem, hanging, emptyLine, header, signatureBlock, directorName } = require('./layout');

const createEnrollmentOrderTemplate = (data) => {
    const {
        enrollDate = '1 сентября 2025',
        year = '2025',
        protocolInfo = '',
        groups = [],
        stipendCoefficient = '1.0',
        exclusions = [],
        controlPerson = '',
        basis = '',
        responsibleSecretary = '',
        deputyDirector = '',
        legalCounsel = '',
        chiefAccountant = '',
    } = data;

    // Пункты по группам
    const groupParagraphs = [];
    groups.forEach((rawGroup, gi) => {
        // specialtyName без дефолта печатал литеральное 'undefined' в приказ, если
        // клиент не присылал ключ (в отличие от остальных 10 шаблонов).
        const { groupNumber, specialtyName = '', ...group } = rawGroup;
        const pointNum = gi + 1;
        groupParagraphs.push(
            point(`${pointNum}. Зачислить с ${enrollDate} года следующих абитуриентов на базе общего базового образования в учебную группу № ${group.groupNumber} для обучения по специальности ${group.specialtyName}:`)
        );

        group.students.forEach((s, index) => {
            groupParagraphs.push(
                listItem(`${pointNum}.${index + 1}.        ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === group.students.length - 1 ? '.' : ''}`)
            );
        });
    });

    const nextPoint = groups.length + 1;
    const academicYear = `${year}/${parseInt(year) + 1}`;

    // Исключения идут после групп, перед стипендией
    const exclusionParagraphs = [];
    if (exclusions.length > 0) {
        const excPoint = nextPoint;
        exclusionParagraphs.push(
            point(`${excPoint}. В связи с не подписанием договоров о подготовке (рабочего) специалиста со средним специальным образованием за счет средств местного бюджета исключить из списка зачисленных:`)
        );

        exclusions.forEach((rawExc, index) => {
            const { specialtyName = '', ...exc } = rawExc;
            const isLast = index === exclusions.length - 1;
            exclusionParagraphs.push(
                listItem(`${excPoint}.${index + 1}. в группу ${exc.groupNumber} для обучения по специальности ${exc.specialtyName}, абитуриента ${exc.studentName}, прошедшего по конкурсу среднего балла документа об общем базовом образовании согласно ${exc.protocolInfo || protocolInfo}${isLast ? '.' : ';'}`)
            );
        });

        exclusionParagraphs.push(
            listItem(`${excPoint}.${exclusions.length + 1}. Предложить заключить договоры следующим непрошедшим по конкурсу абитуриентам.`)
        );
    }

    // Номера пунктов стипендии и контроля с учётом исключений
    const stipendPoint = exclusions.length > 0 ? nextPoint + 1 : nextPoint;
    const controlPoint = stipendPoint + 1;

    return [
        header('О зачислении'),

        emptyLine(),

        // Преамбула. ВНИМАНИЕ: это строка-литерал с конкатенацией, а не шаблонная
        // строка — `${protocolInfo}` попал бы в текст как есть. Сохранено как есть.
        point('В соответствии со ст. 60 Кодекса Республики Беларусь об образовании, Правилами приема лиц для получения среднего специального образования утвержденным Указом Президента Республики Беларусь от 27 января 2022 года № 23 (в редакции Указа Президента Республики Беларусь от 29.12.2023 № 416) и в соответствии с контрольными цифрами приема на 2025 год в учреждениях реализующих образовательные программы среднего специального образования, утвержденными приказами комитета по образованию Мингорисполкома от 12.03.2025 №123-ОС (приложение 3), от 30.07.2025 № 357-ОС на основании заключенных договоров с абитуриентами и их законными представителями о подготовке специалистов со средним специальным образованием за счет средств бюджета и решения приемной комиссии (' + protocolInfo + ')'),

        point('ПРИКАЗЫВАЮ:'),

        ...groupParagraphs,

        // Исключения (до стипендии)
        ...exclusionParagraphs,

        // Стипендия
        point(`${stipendPoint}. Назначить зачисленным учащимся на первый семестр ${academicYear} учебного года стипендию с коэффициентом ${stipendCoefficient}.`),

        // Контроль
        point(`${controlPoint}. Контроль за исполнением приказа возложить на ${controlPerson}.`),

        // Основание
        hanging(`Основание: ${basis}`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Директор', name: directorName() },
            { position: ['Ответственный секретарь', 'приемной комиссии'], name: responsibleSecretary, stacked: true },
            { position: ['Заместитель директора по', 'учебной работе'], name: deputyDirector, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true },
            { position: 'Главный бухгалтер', name: chiefAccountant, stacked: true }
        ])
    ];
};

module.exports = { createEnrollmentOrderTemplate };
