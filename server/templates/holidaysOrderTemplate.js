const { point, listItem, hanging, emptyLine, header, signatureBlock, directorName } = require('./layout');

const createHolidaysOrderTemplate = (data) => {
    const {
        dateFrom = '',
        dateTo = '',
        academicYear = '',
        specialtyName = '',
        groupNumber = '',
        fullGroup = true,
        students = [],
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        chiefAccountant = '',
        legalCounsel = '',
    } = data;

    return [
        header('Об установлении каникул'),

        emptyLine(),

        // Преамбула
        point(`В соответствии с графиком образовательного процесса на ${academicYear} учебный год, учебными планами по реализации учебных программ среднего специального образования`),

        // ПРИКАЗЫВАЮ
        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. Установить каникулы с ${dateFrom} по ${dateTo} для учащихся учебной группы ${groupNumber}, обучающихся по специальности ${specialtyName} ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`),

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
            { position: 'Заведующий отделением', name: headOfDepartment, stacked: true },
            { position: 'Главный бухгалтер', name: chiefAccountant, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true }
        ])
    ];
};

module.exports = { createHolidaysOrderTemplate };
