const { Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const { declineFullNameAccusative, detectGender } = require('../utils/declension');

const createPracticeContractTemplate = (data) => {
    const {
        contractNumber = '',
        contractDay = '',
        contractMonth = '',
        contractYear = '',
        practiceType = 'учебной',
        groupNumber = '',
        studentLastName = '',
        studentFirstName = '',
        studentFatherName = '',
        specialtyName = '',
        contractEndDate = '',
        periodFrom = '',
        periodTo = '',
    } = data;

    const directorName = process.env.DIRECTOR_NAME || 'Г.В.Козел';
    const directorFullName = process.env.DIRECTOR_FULL_NAME || 'Козела Георгия Владимировича';
    const collegeName = process.env.COLLEGE_NAME || 'Минский государственный колледж цифровых технологий';
    const collegeAddress = '220108, г.Минск, ул. Казинца, 91';
    const collegePhone = '8 (017) 374 11 62';

    // Склонение ФИО студента
    let studentAccusative = '';
    if (studentLastName && studentFirstName) {
        const declined = declineFullNameAccusative(studentLastName, studentFirstName, studentFatherName);
        studentAccusative = declined.fullName;
    }

    const isFemale = detectGender(studentFatherName, studentFirstName) === 'female';
    const studyingWord = isFemale ? 'обучающуюся' : 'обучающегося';


    return [
        // Заголовок
        new Paragraph({
            children: [
                new TextRun({ text: 'ДОГОВОР', size: 24, font: 'Times New Roman', bold: true })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 240
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'об организации практики учащихся, курсантов, осваивающих', size: 24, font: 'Times New Roman', bold: true })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'содержание образовательных программ среднего специального образования', size: 24, font: 'Times New Roman', bold: true })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Дата, номер, место
        new Paragraph({
            children: [
                new TextRun({ text: '«', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: String(contractDay), size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: '» ', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: contractMonth, size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: ' ', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: String(contractYear), size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: ' г.                        № ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: contractNumber, size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: '                              ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: 'г. Минск', size: 24, font: 'Times New Roman', underline: {}, italics: true }),
            ],
            spacing: {
                before: 0,
                after: 0,
                line: 240
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                            (место заключения договора)', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Преамбула — первый абзац
        new Paragraph({
            children: [
                new TextRun({ text: 'УО«', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: collegeName, size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: '»', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: ' именуемое в дальнейшем учреждение образования в лице ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: 'директора ', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: directorFullName + ',', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: ' действующего на основании ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: 'Устава,', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'с одной стороны, и ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '                                                                                                                                                          d', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } }),
                new TextRun({ text: ',', size: 24, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                        (наименование организации, предприятия, учреждения)', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'именуемое в дальнейшем организация, в лице ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '/////////////////////////////////////////////////////////////////////////////////////', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                                                             (должность служащего, фамилия,', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                                                                                                                                             ', size: 24, font: 'Times New Roman', underline: {} }),
                new TextRun({ text: ',', size: 24, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'собственное имя, отчество (если таковое имеется)', size: 20, font: 'Times New Roman', })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'действующего на основании ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '/////////////////////////////////////////////////////////////////////////////////////////////////////////////////', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                                                    (устав, доверенность, номер и дата утверждения,', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                                                                                                                                             ', size: 24, font: 'Times New Roman', underline: {} }),
                new TextRun({ text: ',', size: 24, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'выдачи, регистрации)', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: [
                new TextRun({ text: 'с другой стороны, в дальнейшем именуемые сторонами, заключили настоящий договор о ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '', break: 1 }),
                new TextRun({ text: 'нижеследующем.', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Раздел 1
        new Paragraph({
            children: [
                new TextRun({ text: 'ПРЕДМЕТ НАСТОЯЩЕГО ДОГОВОРА', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: (() => {
                const totalSpaces = 78;
                const half = Math.floor((totalSpaces - practiceType.length) / 2);
                const left = ' '.repeat(Math.max(half, 1));
                const right = '/'.repeat(Math.max(totalSpaces - half - practiceType.length, 1));
                return [
                    new TextRun({ text: '1. Предметом настоящего договора являются взаимоотношения сторон, возникающие и ', size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: 'реализуемые в процессе подготовки', size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: ' и проведения ', size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: left + practiceType, size: 24, font: 'Times New Roman', underline: {} }),
                    new TextRun({ text: right, color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })
                ];
            })(),
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                                                                (наименование практики)', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'практики (далее – практика) обучающихся учреждения образования в организации.', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Пункт 2
        new Paragraph({
            children: (() => {
                const totalSpaces = 113;
                const content = `${groupNumber}, ${studentAccusative}`;
                const trailing = '/'.repeat(Math.max(totalSpaces - content.length, 1));
                return [
                    new TextRun({ text: `2. Учреждение образования направляет на практику ${studyingWord} учебной `, size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: '', break: 1 }),
                    new TextRun({ text: 'группы № ', size: 24, font: 'Times New Roman' }),
                    new TextRun({ text: content, size: 24, font: 'Times New Roman', underline: {} }),
                    new TextRun({ text: trailing, color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })
                ];
            })(),
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: (() => {
                const totalSpaces = 146;
                const content = `с ${periodFrom} г. по ${periodTo} г.`;
                const trailing = '.'.repeat(Math.max(totalSpaces - content.length, 1));
                return [
                    new TextRun({ text: content, size: 24, font: 'Times New Roman', underline: {} }),
                    new TextRun({ text: trailing, color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })
                ];
            })(),
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '                                                                                                                                         (наименование', size: 20, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: (() => {
                const totalSpaces = 95;
                const content = specialtyName;
                if (content.length >= totalSpaces) {
                    return [
                        new TextRun({ text: content, size: 24, font: 'Times New Roman', underline: {} }),
                    ];
                }
                const half = Math.floor((totalSpaces - content.length) / 2);
                const left = '/'.repeat(Math.max(half, 1));
                const right = '/'.repeat(Math.max(totalSpaces - half - content.length, 1));
                return [
                    new TextRun({ text: left, color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } }),
                    new TextRun({ text: content, size: 24, font: 'Times New Roman', underline: {} }),
                    new TextRun({ text: right, color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })

                ];
            })(),
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'специальности, квалификации, профессии рабочего (должности служащего)', size: 20, font: 'Times New Roman', italics: true })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'в количестве ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '1', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: ' человек, а организация принимает на себя обязательства по созданию условий для проведения практики в соответствии с согласованной учебной программой учреждения  образования по практике. Списки обучающихся по учебным группам с указанием их фамилий, собственных имен, отчеств (если таковые имеются), а также фамилии, собственного имени, отчества (если таковое имеется) руководителя практики каждой учебной группы являются неотъемлемой частью настоящего договора и прилагаются на ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '1', size: 24, font: 'Times New Roman', italics: true, underline: {} }),
                new TextRun({ text: ' листах.', size: 24, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Раздел 2
        new Paragraph({
            children: [
                new TextRun({ text: '', break: 1 }),
                new TextRun({ text: 'ОБЯЗАННОСТИ СТОРОН', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: [new TextRun({ text: '3. Учреждение образования обязуется:', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'направить обучающихся в организацию в сроки, установленные настоящим договором;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'назначить в качестве руководителей практики квалифицированных преподавателей, мастеров производственного обучения;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'обеспечить допуск к практике обучающихся по медицинским показаниям в случаях, предусмотренных законодательством;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'до начала практики представить в организацию для ознакомления учебную программу учреждения образования по практике;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'осуществлять контроль за выполнением учебной программы учреждения образования по практике;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'содействовать соблюдению обучающимися трудовой дисциплины организации;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'оказывать работникам организации – руководителям практики методическую помощь по вопросам организации и проведения практики;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'принимать участие в расследовании несчастных случаев, произошедших с обучающимися в организации во время практики.', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: [new TextRun({ text: '4. Организация обязуется:', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'назначить опытных квалифицированных специалистов для общего руководства практикой и непосредственного руководства практикой в подразделениях (цехах, отделах и другом) организации;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'предоставить учреждению образования рабочие места для обучающихся в соответствии с учебной программой учреждения образования по практике;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'обеспечить безопасные условия труда, проведение обязательного инструктажа по охране труда, пожарной безопасности, а в необходимых случаях – обучение безопасным приемам и методам работы;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'обеспечить выдачу обучающимся на период прохождения практики специальной одежды, обуви и других необходимых средств индивидуальной защиты, а также смывающих обезвреживающих средств по нормам, установленным для работников соответствующих отраслей, и в порядке, установленном законодательством;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'создать необходимые условия для выполнения обучающимися учебной программы учреждения образования по практике, обеспечить помещениями (местами) для получения практических и теоретических знаний. Не допускать использования обучающихся на должностях, не предусмотренных учебной программой учреждения образования по практике и не имеющих отношения к специальности обучающихся;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'ознакомиться с учебной программой учреждения образования по практике, обеспечить ее выполнение, предоставить возможность обучающимся пользоваться правовыми актами, техническими нормативными правовыми актами и другой документацией, имеющейся в организации;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'осуществлять контроль за соблюдением обучающимися режима рабочего времени, установленного правилами внутреннего трудового распорядка организации;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'обеспечить обучающихся местом проживания (при необходимости);', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'создать необходимые условия для организации питания, оказания медицинской помощи обучающимся;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'учитывать и расследовать совместно с учреждением образования несчастные случаи, произошедшие с обучающимися во время практики в организации, в соответствии с законодательством;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'оперативно информировать учреждение образования обо всех инцидентах с обучающимися в период практики;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'в течение трех рабочих дней после начала практики направить в учреждение образования заверенную в установленном порядке копию приказа о принятии обучающихся на практику, назначении руководителя практики;', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'обеспечить своевременное оформление обучающимися и руководителем практики отчетной документации (дневник, письменный отчет), по окончании практики представить характеристику на каждого обучающегося.', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Раздел 3
        new Paragraph({
            children: [
                new TextRun({ text: '', break: 1 }),
                new TextRun({ text: 'ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '5. ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } }),
                new TextRun({ text: '', break: 1 }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Раздел 4
        new Paragraph({
            children: [
                new TextRun({ text: 'ПРОЧИЕ УСЛОВИЯ', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '6. Настоящий договор вступает в силу со дня его подписания и действует до ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: contractEndDate || periodTo, size: 24, font: 'Times New Roman', underline: {} }),
                new TextRun({ text: ' г.', size: 24, font: 'Times New Roman' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'Настоящий договор составлен в двух экземплярах, один из которых хранится в учреждении образования, другой – в организации.', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'Изменения в настоящий договор вносятся только на основании договоренности сторон путем подписания дополнительного соглашения.', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'За несоблюдение условий настоящего договора стороны несут ответственность, установленную законодательством.', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),
        new Paragraph({
            children: [new TextRun({ text: 'Все споры, возникающие между сторонами по настоящему договору, разрешаются в порядке, установленном законодательством.', size: 24, font: 'Times New Roman' })],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        // Реквизиты
        new Paragraph({
            children: [
                new TextRun({ text: '', break: 1 }),
                new TextRun({ text: 'АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН', size: 24, font: 'Times New Roman' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Paragraph({
            children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
            spacing: {
                before: 0,
                after: 0,
                line: 200
            }
        }),

        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
            },
            margins: {
                left: 720
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE, size: 0 },
                                bottom: { style: BorderStyle.NONE, size: 0 },
                                left: { style: BorderStyle.NONE, size: 0 },
                                right: { style: BorderStyle.NONE, size: 0 },
                            },
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: 'Учреждение Образования', size: 22, font: 'Times New Roman', bold: true })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: `Наименование УО «${collegeName}»`, size: 22, font: 'Times New Roman', italics: true })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Адрес ', size: 22, font: 'Times New Roman' }),
                                    new TextRun({ text: `${collegeAddress}`, size: 22, font: 'Times New Roman', underline: {} })
                                    ], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: `Телефон/факс `, size: 22, font: 'Times New Roman', italics: true }),
                                    new TextRun({ text: `${collegePhone}`, size: 17, font: 'Times New Roman' })
                                    ], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Банковские реквизиты', size: 22, font: 'Times New Roman', italics: true })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'р/с BY11AKBB36320000000250000000', size: 22, font: 'Times New Roman', underline: {} })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'BIC SWIFT AKBBBY2X', size: 22, font: 'Times New Roman', underline: {} })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'в ОАО АСБ «Беларусбанк», г.Минск', size: 22, font: 'Times New Roman', underline: {} })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'пр-т Дзержинского, 18', size: 22, font: 'Times New Roman', underline: {} })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'УНП 100286358 ОКПО 37363619', size: 22, font: 'Times New Roman', underline: {} })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: `Руководитель `, size: 22, font: 'Times New Roman' })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: `____________`, color: "FFFFFF", size: 22, font: 'Times New Roman', underline: { color: "000000" } }),
                                        new TextRun({ text: ` ${directorName}`, size: 22, font: 'Times New Roman', italics: true, underline: {} })
                                    ], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Подпись          Инициалы, фамилия', size: 16, font: 'Times New Roman' })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE, size: 0 },
                                bottom: { style: BorderStyle.NONE, size: 0 },
                                left: { style: BorderStyle.NONE, size: 0 },
                                right: { style: BorderStyle.NONE, size: 0 },
                            },
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: 'Организация', size: 24, font: 'Times New Roman', bold: true })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Место нахождения ', size: 24, font: 'Times New Roman' }),
                                        new TextRun({ text: '___________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" }  })
                                    ], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '____________________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Адрес ', size: 24, font: 'Times New Roman' }),
                                        new TextRun({ text: '______________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '____________________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Банковские реквизиты ', size: 24, font: 'Times New Roman' }),
                                        new TextRun({ text: '________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" }})], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '____________________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" }})], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '____________________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" }})], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'Руководитель ', size: 24, font: 'Times New Roman' }),
                                        new TextRun({ text: '________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" } })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '                                  (фамилия, собственное имя,', size: 20, font: 'Times New Roman' })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '____________________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" }})], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: 'отчество (если таковое имеется)', size: 20, font: 'Times New Roman' })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    },
                                    alignment: AlignmentType.CENTER
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '____________________________________', color: "FFFFFF", size: 24, font: 'Times New Roman', underline: { color: "000000" }})], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: '(подпись)', size: 20, font: 'Times New Roman' })], spacing: {
                                        before: 0,
                                        after: 0,
                                        line: 200
                                    },
                                    alignment: AlignmentType.CENTER
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        }),
    ];
};

module.exports = { createPracticeContractTemplate };
