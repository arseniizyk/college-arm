const { Paragraph, TextRun, AlignmentType } = require('docx');

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

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    // Пункты по группам
    const groupParagraphs = [];
    groups.forEach((group, gi) => {
        const pointNum = gi + 1;
        groupParagraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${pointNum}. Зачислить с ${enrollDate} года следующих абитуриентов на базе общего базового образования в учебную группу № ${group.groupNumber} для обучения по специальности ${group.specialtyName}:`, size: 28, font: 'Times New Roman' })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 709 },
                spacing: { line: 240 }
            })
        );

        group.students.forEach((s, index) => {
            groupParagraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${pointNum}.${index + 1}.        ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === group.students.length - 1 ? '.' : ''}`,
                            size: 28,
                            font: 'Times New Roman'
                        })
                    ],
                    alignment: AlignmentType.JUSTIFIED,
                    indent: { firstLine: 720 },
                    spacing: { line: 240 }
                })
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
            new Paragraph({
                children: [
                    new TextRun({ text: `${excPoint}. В связи с не подписанием договоров о подготовке (рабочего) специалиста со средним специальным образованием за счет средств местного бюджета исключить из списка зачисленных:`, size: 28, font: 'Times New Roman' })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 709 },
                spacing: { line: 240 }
            })
        );

        exclusions.forEach((exc, index) => {
            const isLast = index === exclusions.length - 1;
            exclusionParagraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${excPoint}.${index + 1}. в группу ${exc.groupNumber} для обучения по специальности ${exc.specialtyName}, абитуриента ${exc.studentName}, прошедшего по конкурсу среднего балла документа об общем базовом образовании согласно ${exc.protocolInfo || protocolInfo}${isLast ? '.' : ';'}`,
                            size: 28,
                            font: 'Times New Roman'
                        })
                    ],
                    alignment: AlignmentType.JUSTIFIED,
                    indent: { firstLine: 720 },
                    spacing: { line: 240 }
                })
            );
        });

        exclusionParagraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${excPoint}.${exclusions.length + 1}. Предложить заключить договоры следующим непрошедшим по конкурсу абитуриентам.`, size: 28, font: 'Times New Roman' })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 720 },
                spacing: { line: 240 }
            })
        );
    }

    // Номера пунктов стипендии и контроля с учётом исключений
    const stipendPoint = exclusions.length > 0 ? nextPoint + 1 : nextPoint;
    const controlPoint = stipendPoint + 1;

    return [
        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'О зачислении', size: 28, font: 'Times New Roman' }),
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
                new TextRun({ text: 'В соответствии со ст. 60 Кодекса Республики Беларусь об образовании, Правилами приема лиц для получения среднего специального образования утвержденным Указом Президента Республики Беларусь от 27 января 2022 года № 23 (в редакции Указа Президента Республики Беларусь от 29.12.2023 № 416) и в соответствии с контрольными цифрами приема на 2025 год в учреждениях реализующих образовательные программы среднего специального образования, утвержденными приказами комитета по образованию Мингорисполкома от 12.03.2025 №123-ОС (приложение 3), от 30.07.2025 № 357-ОС на основании заключенных договоров с абитуриентами и их законными представителями о подготовке специалистов со средним специальным образованием за счет средств бюджета и решения приемной комиссии (' + protocolInfo + ')', size: 28, font: 'Times New Roman' })
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

        ...groupParagraphs,

        // Исключения (до стипендии)
        ...exclusionParagraphs,

        // Стипендия
        new Paragraph({
            children: [
                new TextRun({ text: `${stipendPoint}. Назначить зачисленным учащимся на первый семестр ${academicYear} учебного года стипендию с коэффициентом ${stipendCoefficient}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Контроль
        new Paragraph({
            children: [
                new TextRun({ text: `${controlPoint}. Контроль за исполнением приказа возложить на ${controlPerson}.`, size: 28, font: 'Times New Roman' })
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
            children: [new TextRun({ text: 'Ответственный секретарь', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'приемной комиссии', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: responsibleSecretary, size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: 'Заместитель директора по', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'учебной работе', size: 28, font: 'Times New Roman' })],
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

        new Paragraph({
            children: [new TextRun({ text: 'Главный бухгалтер', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: chiefAccountant, size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),
    ];
};

module.exports = { createEnrollmentOrderTemplate };
