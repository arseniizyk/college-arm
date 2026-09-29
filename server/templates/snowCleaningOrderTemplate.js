const { Paragraph, TextRun, AlignmentType } = require('docx');

const createSnowCleaningOrderTemplate = (data) => {
    const {
        groups = [],
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';
    const collegeName = process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий';

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    // Генерируем пункты для каждой группы (пункт 1, 3, 5... - студенты; 2, 4, 6... - ответственный)
    const groupParagraphs = [];
    groups.forEach((group, gi) => {
        const pointNum = gi * 2 + 1;
        const groupNames = groups.length > 1 && gi > 0
            ? `учебной группы ${group.groupNumber}`
            : `учебной группы ${group.groupNumber}`;

        groupParagraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${pointNum}. Организовать и направить ${group.date} на выполнение работ по расчистке прилегающей территории от снега и приведению в надлежащее состояние закрепленной территории учреждения образования «${collegeName}» учащихся ${groupNames} в следующем составе:`, size: 28, font: 'Times New Roman' })
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

        groupParagraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${pointNum + 1}. Ответственность за жизнь и здоровье учащихся учебной группы ${group.groupNumber} на период проведения работ возложить на преподавателя ${group.responsible}.`, size: 28, font: 'Times New Roman' })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 709 },
                spacing: { line: 240 }
            })
        );
    });

    const nextPoint = groups.length * 2 + 1;
    const nextPoint2 = nextPoint + 1;

    return [
        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'Об участии обучающихся', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'в уборке снега', size: 28, font: 'Times New Roman' }),
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
                new TextRun({ text: 'В связи с погодными условиями и необходимостью проведения мероприятий по расчистке прилегающей территории колледжа от снега', size: 28, font: 'Times New Roman' })
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

        // Пункты по группам
        ...groupParagraphs,

        // Пункт об инструктаже
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint}. Преподавателям, ответственным за жизнь и здоровье учащихся на период проведения работ по уборке снега провести целевой инструктаж по охране труда с учащимися с составлением протокола.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Контроль
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint2}. Контроль за исполнением приказа возложить на ${controlPerson}.`, size: 28, font: 'Times New Roman' })
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
                    new TextRun({ text: '                                                                    ', size: 24, font: 'Times New Roman' }),
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

module.exports = { createSnowCleaningOrderTemplate };
