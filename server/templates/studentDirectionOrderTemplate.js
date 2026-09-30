const {
    point, listItem, hanging, emptyLine, headerMulti, signatureBlock, signatureList, directorName
} = require('./layout');

const createStudentDirectionOrderTemplate = (data) => {
    const {
        eventDescription = '',
        eventDate = '',
        eventTime = '',
        groupNumber = '',
        specialtyName = '',
        eventAddress = '',
        students = [],
        responsible = '',
        trainingPerson = '',
        instructorFrom = '',
        instructorTo = '',
        curatorName = '',
        controlPerson = '',
        basis = '',
        deputyDirector = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    return [
        ...headerMulti(['О направлении', 'обучающихся колледжа']),

        emptyLine(),

        // Преамбула
        point(`На основании распоряжения администрации Октябрьского района г. Минска для повышения уровня патриотического воспитания, а также в целях популяризации спорта и здорового образа жизни среди населения Республики Беларусь в связи с ${eventDescription}.`),

        point('ПРИКАЗЫВАЮ:'),

        // Пункт 1
        point(`1. Направить ${eventDate} года к ${eventTime} следующих учащихся группы ${groupNumber} (специальность ${specialtyName}) для участия ${eventDescription} по адресу: ${eventAddress}:`),

        // Список студентов
        ...students.map((s, index) =>
            listItem(`1.${index + 1}. ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === students.length - 1 ? '.' : ';'}`)
        ),

        // Пункт 2
        point(`2. Ответственность за жизнь и здоровье учащихся возложить на ${responsible}.`),

        // Пункт 3
        point(`3. ${instructorFrom} провести целевой инструктаж с ${instructorTo}, ответственной за жизнь и здоровье обучающихся.`),

        // Пункт 4
        point(`4. ${trainingPerson || responsible} провести обучающее занятие с учащимися с оформлением протокола.`),

        // Пункт 5
        point(`5. Куратору учебной группы ${curatorName}:`),
        listItem('5.1. инструктировать учащихся о необходимости соблюдать правила безопасного поведения на улице, на дороге, в общественном транспорте, вблизи водоёмов и железнодорожных путей, в общественных местах;'),
        listItem('5.2. обратить внимание учащихся на необходимость постоянно иметь при себе и носить световозвращающие элементы (фликеры).'),

        // Пункт 6
        point(`6. Контроль за исполнением приказа возложить на ${controlPerson}.`),

        // Основание
        hanging(`Основание: ${basis}`),

        emptyLine(),

        // Подписи
        ...signatureBlock([
            { position: 'Директор', name: directorName() },
            { position: ['Заместитель директора', 'по учебно-воспитательной работе'], name: deputyDirector, stacked: true },
            { position: 'Заведующий отделением', name: headOfDepartment, stacked: true },
            { position: 'Юрисконсульт', name: legalCounsel, stacked: true }
        ]),

        emptyLine(),

        // Ознакомлены
        ...signatureList(
            'С приказом ознакомлены:',
            acquainted,
            '                                                              ',
            '                                                                                                                                    '
        )
    ];
};

module.exports = { createStudentDirectionOrderTemplate };
