const { Paragraph, TextRun, AlignmentType } = require('docx');

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

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    return [
        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'О направлении', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'обучающихся колледжа', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        // Преамбула
        new Paragraph({
            children: [
                new TextRun({ text: `На основании распоряжения администрации Октябрьского района г. Минска для повышения уровня патриотического воспитания, а также в целях популяризации спорта и здорового образа жизни среди населения Республики Беларусь в связи с ${eventDescription}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'ПРИКАЗЫВАЮ:', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 1
        new Paragraph({
            children: [
                new TextRun({ text: `1. Направить ${eventDate} года к ${eventTime} следующих учащихся группы ${groupNumber} (специальность ${specialtyName}) для участия ${eventDescription} по адресу: ${eventAddress}:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Список студентов
        ...students.map((s, index) =>
            new Paragraph({
                children: [
                    new TextRun({
                        text: `1.${index + 1}. ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === students.length - 1 ? '.' : ';'}`,
                        size: 28,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 720 },
                spacing: { line: 240 }
            })
        ),

        // Пункт 2
        new Paragraph({
            children: [
                new TextRun({ text: `2. Ответственность за жизнь и здоровье учащихся возложить на ${responsible}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 3
        new Paragraph({
            children: [
                new TextRun({ text: `3. ${instructorFrom} провести целевой инструктаж с ${instructorTo}, ответственной за жизнь и здоровье обучающихся.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 4
        new Paragraph({
            children: [
                new TextRun({ text: `4. ${trainingPerson || responsible} провести обучающее занятие с учащимися с оформлением протокола.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 5
        new Paragraph({
            children: [
                new TextRun({ text: `5. Куратору учебной группы ${curatorName}:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '5.1. инструктировать учащихся о необходимости соблюдать правила безопасного поведения на улице, на дороге, в общественном транспорте, вблизи водоёмов и железнодорожных путей, в общественных местах;', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '5.2. обратить внимание учащихся на необходимость постоянно иметь при себе и носить световозвращающие элементы (фликеры).', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),

        // Пункт 6
        new Paragraph({
            children: [
                new TextRun({ text: `6. Контроль за исполнением приказа возложить на ${controlPerson}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Основание
        new Paragraph({
            children: [
                new TextRun({ text: `Основание: ${basis}`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { hanging: 709, left: 709 },
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        // Подписи
        new Paragraph({
            children: [
                new TextRun({ text: 'Директор', size: 28, font: 'Times New Roman' }),
                new TextRun({ text: '                                                                                            ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: directorName, size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: 'Заместитель директора', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'по учебно-воспитательной работе', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: deputyDirector, size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: 'Заведующий отделением', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: headOfDepartment, size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: 'Юрисконсульт', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: legalCounsel, size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        // Ознакомлены
        ...(acquainted.length > 0 ? [
            new Paragraph({
                children: [
                    new TextRun({ text: 'С приказом ознакомлены:', size: 28, font: 'Times New Roman' }),
                    new TextRun({ text: '                                                              ', size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: acquainted[0] || '', size: 28, font: 'Times New Roman' }),
                ],
                spacing: { line: 240 }
            }),
            ...acquainted.slice(1).map(name => new Paragraph({
                children: [
                    new TextRun({ text: '                                                                                                                                    ', size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: name, size: 28, font: 'Times New Roman' }),
                ],
                spacing: { line: 240 }
            }))
        ] : []),
    ];
};

module.exports = { createStudentDirectionOrderTemplate };
