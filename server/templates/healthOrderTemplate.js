const { Paragraph, TextRun, AlignmentType } = require('docx');

const { declineFullNameAccusative, detectGender } = require('../utils/declension');

const createHealthOrderTemplate = (data) => {
    const {
        dateFrom = '',
        dateTo = '',
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        groupNumber = '',
        specialtyName = '',
        healthReason = '',
        responsiblePerson = '',
        curatorName = '',
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        legalCounsel = '',
        acquainted = [],
    } = data;

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';

    // Склоняем ФИО студента в винительный падеж (кого? что?)
    let studentAccusative = `${studentLastName} ${studentFirstName}${studentFatherName ? ' ' + studentFatherName : ''}`;
    try {
        const declined = declineFullNameAccusative(studentLastName, studentFirstName, studentFatherName || '');
        studentAccusative = declined.fullName;
    } catch {}

    const isFemale = detectGender(studentFatherName) === 'female';
    const studentWord = isFemale ? 'учащуюся' : 'учащегося';
    const studyingWord = isFemale ? 'обучающуюся' : 'обучающегося';

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

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
                new TextRun({ text: 'В соответствии с п. 14, 16, 21 «Положения о платных дополнительных услугах и порядке ликвидации задолженностей учащимися», утвержденного директором колледжа', size: 28, font: 'Times New Roman' })
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
                new TextRun({ text: `1. Освободить от учебных занятий в период с ${dateFrom} по ${dateTo} ${studentAccusative}, ${studentWord} учебной группы ${groupNumber}, ${studyingWord} по специальности ${specialtyName} в связи с ${healthReason}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 1.2
        new Paragraph({
            children: [
                new TextRun({ text: `1.2. Ответственность за жизнь и здоровье несет ${responsiblePerson}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),

        // Пункт 2
        new Paragraph({
            children: [
                new TextRun({ text: `2. Куратору учебной группы ${curatorName}:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '2.1. инструктировать учащегося о необходимости соблюдать правила безопасного поведения на улице, на дороге, в общественном транспорте, вблизи водоёмов и железнодорожных путей, в общественных местах;', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '2.2. обратить внимание учащегося на необходимость постоянно иметь при себе и носить световозвращающие элементы (фликеры).', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),

        // Пункт 3
        new Paragraph({
            children: [
                new TextRun({ text: '3. Учащийся отрабатывает пропущенные занятия, во время которых проводились практические или лабораторные работы, обязательные контрольные работы.', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 4
        new Paragraph({
            children: [
                new TextRun({ text: `4. Контроль за исполнением приказа возложить на ${controlPerson}.`, size: 28, font: 'Times New Roman' })
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

module.exports = { createHealthOrderTemplate };
