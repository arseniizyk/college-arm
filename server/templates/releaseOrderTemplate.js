const { Paragraph, TextRun, AlignmentType } = require('docx');

const { detectGender, declineFullNameAccusative } = require('../utils/declension');

const createReleaseOrderTemplate = (data) => {
    const {
        basis = '',
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        groupNumber = '',
        specialtyName = '',
        periods = [],   // [{dateFrom, dateTo, eventName, eventAddress}]
        responsible = '',
        curatorName = '',
        controlPerson = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';

    const isFemale = detectGender(studentFatherName) === 'female';
    const studentWord = isFemale ? 'учащейся' : 'учащегося';
    const studyingWord = isFemale ? 'обучающейся' : 'обучающегося';

    // Склоняем ФИО в винительный падеж
    let studentAccusative = `${studentLastName} ${studentFirstName}${studentFatherName ? ' ' + studentFatherName : ''}`;
    try {
        const declined = declineFullNameAccusative(studentLastName, studentFirstName, studentFatherName || '');
        studentAccusative = declined.fullName;
    } catch {}

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    // Пункты освобождения
    const periodParagraphs = [];
    periods.forEach((period, index) => {
        const dateText = period.dateTo && period.dateTo !== period.dateFrom
            ? `с ${period.dateFrom} по ${period.dateTo}`
            : period.dateFrom;
        periodParagraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${index + 1}. Освободить ${dateText} от учебных занятий ${studentAccusative}, ${studentWord} учебной группы ${groupNumber}, ${studyingWord} по специальности ${specialtyName} для участия в ${period.eventName}, которое состоится ${dateText} по адресу: ${period.eventAddress}.`, size: 28, font: 'Times New Roman' })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 709 },
                spacing: { line: 240 }
            })
        );
    });

    const nextPoint = periods.length + 1;

    return [
        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'Об освобождении от занятий', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'обучающегося колледжа', size: 28, font: 'Times New Roman' }),
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
                new TextRun({ text: `На основании ${basis}`, size: 28, font: 'Times New Roman' })
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

        // Пункты освобождения
        ...periodParagraphs,

        // Ответственность
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint}. Принять к сведению, что ответственность за жизнь и безопасность учащегося возлагается на ${responsible}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Куратор
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint + 1}. Куратору учебной группы ${curatorName}:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint + 1}.1. инструктировать учащегося о необходимости соблюдать правила безопасного поведения на улице, на дороге, в общественном транспорте, вблизи водоёмов и железнодорожных путей, в общественных местах;`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint + 1}.2. обратить внимание учащегося на необходимость постоянно иметь при себе и носить световозвращающие элементы (фликеры).`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),

        // Отработка
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint + 2}. Учащийся, отрабатывает пропущенные занятия, во время которых проводились практические или лабораторные работы, обязательные контрольные работы.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Контроль
        new Paragraph({
            children: [
                new TextRun({ text: `${nextPoint + 3}. Контроль за исполнением приказа возложить на ${controlPerson}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
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

        ...(acquainted.length > 0 ? [
            new Paragraph({
                children: [
                    new TextRun({ text: 'С приказом ознакомлен(а):', size: 28, font: 'Times New Roman' }),
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

module.exports = { createReleaseOrderTemplate };
