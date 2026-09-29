const { Paragraph, TextRun, AlignmentType } = require('docx');

const { declineFullNameAccusative, declineFullName, detectGender } = require('../utils/declension');

const createDuplicateTicketOrderTemplate = (data) => {
    const {
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        groupNumber = '',
        specialtyName = '',
        lossReason = 'оригинал утерян',
        controlPerson = '',
        basis = '',
        headOfDepartment = '',
        legalCounsel = '',
    } = data;

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';
    const collegeName = process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий';

    // Дательный падеж — Паплёвка Максиму Дмитриевичу
    let studentDative = `${studentLastName} ${studentFirstName}${studentFatherName ? ' ' + studentFatherName : ''}`;
    try {
        const declined = declineFullName(studentLastName, studentFirstName, studentFatherName || '');
        studentDative = declined.fullName;
    } catch {}

    // Определяем пол
    const gender = detectGender(studentFatherName);
    const isFemale = gender === 'female';
    const studentWord = isFemale ? 'учащейся' : 'учащегося';
    const studyingWord = isFemale ? 'обучающейся' : 'обучающемуся';

    const emptyLines = Array(10).fill().map(() => new TextRun({ text: '', break: 1 }));

    return [
        new Paragraph({
            children: [
                ...emptyLines,
                new TextRun({ text: 'О выдаче дубликата', size: 28, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'билета учащегося', size: 28, font: 'Times New Roman' }),
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
                new TextRun({ text: 'В соответствии с п. п. 6.1.4. Указа Президента Республики Беларусь от 26.04.2010 № 200 и на основании поданного учащимся заявления', size: 28, font: 'Times New Roman' })
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
                new TextRun({ text: `1. Секретарю учебной части учреждения образования «${collegeName}»:`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 1.1
        new Paragraph({
            children: [
                new TextRun({ text: `1.1. Выдать дубликат билета ${studentWord} ${studentDative}, ${studentWord} учебной группы ${groupNumber}, ${studyingWord} по специальности ${specialtyName} в связи с тем, что ${lossReason}.`, size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),

        // Пункт 2
        new Paragraph({
            children: [
                new TextRun({ text: '2. Внести записи в книгу регистрации выдачи билетов учащихся.', size: 28, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 },
            spacing: { line: 240 }
        }),

        // Пункт 3
        new Paragraph({
            children: [
                new TextRun({ text: `3. Контроль за исполнением приказа возложить на ${controlPerson}.`, size: 28, font: 'Times New Roman' })
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
    ];
};

module.exports = { createDuplicateTicketOrderTemplate };
