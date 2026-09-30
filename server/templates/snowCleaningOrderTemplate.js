const { point, listItem, hanging, emptyLine, headerMulti, signatureBlock, signatureList, directorName } = require('./layout');

const createSnowCleaningOrderTemplate = (data) => {
    const {
        groups = [],
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    const collegeName = process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий';

    // Генерируем пункты для каждой группы (пункт 1, 3, 5... - студенты; 2, 4, 6... - ответственный)
    const groupParagraphs = [];
    groups.forEach((group, gi) => {
        const pointNum = gi * 2 + 1;
        const groupNames = groups.length > 1 && gi > 0
            ? `учебной группы ${group.groupNumber}`
            : `учебной группы ${group.groupNumber}`;

        groupParagraphs.push(
            point(`${pointNum}. Организовать и направить ${group.date} на выполнение работ по расчистке прилегающей территории от снега и приведению в надлежащее состояние закрепленной территории учреждения образования «${collegeName}» учащихся ${groupNames} в следующем составе:`)
        );

        group.students.forEach((s, index) => {
            groupParagraphs.push(
                listItem(`${pointNum}.${index + 1}.        ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === group.students.length - 1 ? '.' : ''}`)
            );
        });

        groupParagraphs.push(
            point(`${pointNum + 1}. Ответственность за жизнь и здоровье учащихся учебной группы ${group.groupNumber} на период проведения работ возложить на преподавателя ${group.responsible}.`)
        );
    });

    const nextPoint = groups.length * 2 + 1;
    const nextPoint2 = nextPoint + 1;

    return [
        ...headerMulti(['Об участии обучающихся', 'в уборке снега']),

        emptyLine(),

        // Преамбула
        point('В связи с погодными условиями и необходимостью проведения мероприятий по расчистке прилегающей территории колледжа от снега'),

        // ПРИКАЗЫВАЮ
        point('ПРИКАЗЫВАЮ:'),

        // Пункты по группам
        ...groupParagraphs,

        // Пункт об инструктаже
        point(`${nextPoint}. Преподавателям, ответственным за жизнь и здоровье учащихся на период проведения работ по уборке снега провести целевой инструктаж по охране труда с учащимися с составлением протокола.`),

        // Контроль
        point(`${nextPoint2}. Контроль за исполнением приказа возложить на ${controlPerson}.`),

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

        // Ознакомлены
        ...signatureList(
            'С приказом ознакомлены:',
            acquainted,
            '                                                                    ',
            '                                                                                                                                    '
        )
    ];
};

module.exports = { createSnowCleaningOrderTemplate };
