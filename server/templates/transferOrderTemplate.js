const { Paragraph, TextRun, AlignmentType } = require('docx');

const { declineFullNameAccusative } = require('../utils/declension');

const createTransferOrderTemplate = (data) => {
    const {
        academicYear = '',
        nextCourse = '',
        dateFrom = '',
        dateTo = '',
        groupNumber = '',
        specialtyName = '',
        fullGroup = true,
        students = [],
        conditionalStudent = null, // {lastName, firstName, fatherName} — условный перевод
        basis = '',
        deputyDirector = '',
        chiefAccountant = '',
        headOfDepartment = '',
    } = data;

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    // Склоняем условного студента в винительный падеж
    let conditionalAccusative = '';
    if (conditionalStudent?.lastName) {
        try {
            const declined = declineFullNameAccusative(
                conditionalStudent.lastName,
                conditionalStudent.firstName,
                conditionalStudent.fatherName || ''
            );
            conditionalAccusative = declined.fullName;
        } catch {
            conditionalAccusative = `${conditionalStudent.lastName} ${conditionalStudent.firstName}${conditionalStudent.fatherName ? ' ' + conditionalStudent.fatherName : ''}`;
        }
    }

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
            children: [
                new TextRun({ text: 'и переводе учащихся', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'на следующий курс', size: 28, font: 'Times New Roman' }),
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
                new TextRun({ text: `В связи с успешным выполнением учебного плана ${academicYear} учебного года, и получением положительных результатов текущей аттестации и на основании п. 21 Правил проведения аттестации учащихся курсантов, при освоении содержания образовательных программ среднего специального образования», утвержденных постановлением Министерства образования Республики Беларусь от 23.08.2022 № 282 «О некоторых вопросах среднего специального образования»`, size: 28, font: 'Times New Roman' })
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
                new TextRun({ text: `1. Перевести на ${nextCourse} курс и установить каникулы с ${dateFrom} по ${dateTo} учащимися учебной группы ${groupNumber}, обучающихся по специальности ${specialtyName} ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`, size: 28, font: 'Times New Roman' })
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
                        text: `1.${index + 1} . ${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}${index === students.length - 1 ? '.' : ''}`,
                        size: 28,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 720 },
                spacing: { line: 240 }
            })
        ),

        // Пункт 2 — условный перевод (если есть)
        ...(conditionalStudent?.lastName ? [
            new Paragraph({
                children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
                spacing: { line: 240 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: `2. Перевести ${conditionalAccusative}, учащегося учебной группы ${groupNumber}, обучающегося по специальности ${specialtyName} на ${nextCourse} курс условно, в связи с имеющейся академической задолженностью и установить каникулы с ${dateFrom} по ${dateTo}.`, size: 28, font: 'Times New Roman' })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 709 },
                spacing: { line: 240 }
            }),
        ] : []),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
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
                new TextRun({ text: 'Заместитель директора', size: 28, font: 'Times New Roman' }),
                new TextRun({ text: '                                                                          ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: deputyDirector, size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
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
    ];
};

module.exports = { createTransferOrderTemplate };
