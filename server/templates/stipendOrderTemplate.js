const { point, listItem, hanging, emptyLine, header, signatureBlock, directorName } = require('./layout');

const createStipendOrderTemplate = (data) => {
    const {
        semesterFrom = '',
        academicYearFrom = '',
        semesterTo = '',
        academicYearTo = '',
        groupNumber = '',
        specialtyName = '',
        dateFrom = '',
        dateTo = '',
        students = [],
        fullGroup = true,
        controlPerson = '',
        basis = '',
        chiefAccountant = '',
        headOfDepartment = '',
        legalCounsel = '',
    } = data;

    return [
        header('О назначении стипендии'),

        emptyLine(),

        // Преамбула
        point('В соответствии с Инструкцией об условиях и порядке назначения и выплаты стипендий и других денежных выплат обучающимся, утвержденной Постановлением Министерства образования Республики Беларусь от 31.10.2022 № 410'),

        // ПРИКАЗЫВАЮ
        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. По результатам успеваемости за ${semesterFrom} семестр ${academicYearFrom} учебного года с учетом результатов сдачи экзаменов назначить учебную стипендию на ${semesterTo} семестр ${academicYearTo} учебного года учащимся учебной группы ${groupNumber}, обучающимся по специальности ${specialtyName} с ${dateFrom} по ${dateTo} года, ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`),

        // Список студентов (именительный падеж)
        ...students.map((s, index) =>
            listItem(`1.${index + 1}.        ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === students.length - 1 ? '.' : ''}`)
        ),

        // Пункт 2
        point(`2. Контроль за исполнением приказа возложить на ${controlPerson}`),

        // Основание
        hanging(`Основание: ${basis}`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Директор', name: directorName() },
            { position: 'Главный бухгалтер', name: chiefAccountant, stacked: true },
            { position: 'Заведующий отделением', name: headOfDepartment, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true }
        ])
    ];
};

module.exports = { createStipendOrderTemplate };
