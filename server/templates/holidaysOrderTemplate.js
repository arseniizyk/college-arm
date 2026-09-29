const { Paragraph, TextRun, AlignmentType } = require('docx');


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

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    return [
        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'Об установлении каникул', size: 28, font: 'Times New Roman' }),
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
                new TextRun({ text: `В соответствии с графиком образовательного процесса на ${academicYear} учебный год, учебными планами по реализации учебных программ среднего специального образования`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // ПРИКАЗЫВАЮ
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
                new TextRun({ text: `1. Установить каникулы с ${dateFrom} по ${dateTo} для учащихся учебной группы ${groupNumber}, обучающихся по специальности ${specialtyName} ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Список студентов (именительный падеж)
        ...students.map((s, index) =>
            new Paragraph({
                children: [
                    new TextRun({
                        text: `1.${index + 1}.        ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === students.length - 1 ? '.' : ''}`,
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
                new TextRun({ text: `2. Контроль за исполнением приказа возложить на ${controlPerson}`, size: 28, font: 'Times New Roman' })
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
            children: [
                new TextRun({ text: 'Заведующий отделением', size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: headOfDepartment, size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'Главный бухгалтер', size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: chiefAccountant, size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'Юрисконсульт', size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: legalCounsel, size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 },
            indent: { firstLine: 709, left: 709 }
        }),
    ];
};

module.exports = { createHolidaysOrderTemplate };
