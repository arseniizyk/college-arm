const { Paragraph, TextRun, AlignmentType } = require('docx');

const { declineFullNameAccusative } = require('../utils/declension');

const createExamAdmissionOrderTemplate = (data) => {
    const {
        examSubjects = [],
        specialtyName = '',
        course = '',
        groupNumber = '',
        students = [],
        fullGroup = true,
        controlPerson = '',
        basis = '',
        deputyDirector = '',
        legalCounsel = '',
        acquainted = '',
    } = data;

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';

    // Склоняем студентов в винительный падеж (кого? что?)
    const studentsAccusative = students.map(s => {
        try {
            const declined = declineFullNameAccusative(s.lastName, s.firstName, s.fatherName || '');
            return declined.fullName;
        } catch {
            return `${s.lastName} ${s.firstName}${s.fatherName ? ' ' + s.fatherName : ''}`;
        }
    });

    // Строка с предметами
    const subjectsText = examSubjects.map(s =>
        `${s.date} «${s.subject}» (преподаватель ${s.teacher})`
    ).join(', ');

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    return [
        // Заголовок приказа


        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'О допуске к экзаменам', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        // Основание (преамбула)
        new Paragraph({
            children: [
                new TextRun({ text: 'В соответствии с п. 20 «Правил проведения аттестации учащихся курсантов, при освоении содержания образовательных программ среднего специального образования», утвержденных постановлением Министерства образования Республики Беларусь от 23.08.2022 № 282 «О некоторых вопросах среднего специального образования»', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // ПРИКАЗЫВАЮ
        new Paragraph({
            children: [
                new TextRun({ text: 'ПРИКАЗЫВАЮ:', size: 28, font: 'Times New Roman', })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 1
        new Paragraph({
            children: [
                new TextRun({ text: `1. Допустить к сдаче экзаменов по учебным предметам, модулям профессионального компонента учебного плана: ${subjectsText} по специальности ${specialtyName} учащихся ${course}-го курса учебной группы ${groupNumber} ${fullGroup ? 'в полном составе' : 'в следующем составе'}:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Список студентов
        ...studentsAccusative.map((name, index) =>
            new Paragraph({
                children: [
                    new TextRun({ text: `1.${index + 1}.        ${name}${index === studentsAccusative.length - 1 ? '.' : ';'}`, size: 28, font: 'Times New Roman' })
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
                new TextRun({ text: 'Заместитель директора ', size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'по учебной работе', size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: deputyDirector, size: 28, font: 'Times New Roman' }),
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

        new Paragraph({
            children: [new TextRun({ text: '', size: 28, font: 'Times New Roman' })],
            spacing: { line: 240 }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'Ознакомлена:', size: 28, font: 'Times New Roman' }),
                new TextRun({ text: '                                                                                ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: acquainted, size: 28, font: 'Times New Roman' }),
            ],
            spacing: { line: 240 }
        }),
    ];
};

module.exports = { createExamAdmissionOrderTemplate };
