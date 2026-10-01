const { Paragraph, TextRun, AlignmentType } = require('docx');

const createStudyCertificateTemplate = (data) => {
    const {
        declined,
        enrollDateDay,
        enrollDateMonthGenitive,
        enrollDateYear,
        genderSuffix,
        collegeNameAtEnrollment,
        currentCollegeName,
        specialty,
        group,
        courseText,
        endDateDay,
        endDateMonthGenitive,
        endDateYear,
        needsRenameNote,
        orderDateFormatted,
        orderNumber,
        directorName
    } = data;

    // Функция для создания одной копии справки
    const createCertificateParagraphs = () => [
        // Заголовок - СПРАВКА
        new Paragraph({
            children: [
                new TextRun({
                    text: 'СПРАВКА',
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { line: 240 }
        }),
        
        // о том, что гражданин является учащимся
        new Paragraph({
            children: [
                new TextRun({
                    text: `о том, что граждан${genderSuffix === 'а' ? 'ка' : 'ин'} является учащ${genderSuffix === 'а' ? 'ейся' : 'имся'}`,
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { line: 240 }
        }),
        
        // Дата и номер приказа
        new Paragraph({
            children: [
                new TextRun({
                    text: `${orderDateFormatted} № ${orderNumber}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { line: 240 }
        }),
        
        // (дата и номер о зачислении)
        new Paragraph({
            children: [
                new TextRun({
                    text: '(дата и номер о зачислении)',
                    size: 20,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { line: 240, after: 200 }
        }),
        
        // Основной текст справки
        new Paragraph({
            children: [
                new TextRun({
                    text: `Выдана `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: declined.fullName,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` в том, что "`,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${enrollDateDay}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: `" `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${enrollDateMonthGenitive}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${enrollDateYear}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` г. он${genderSuffix} поступил${genderSuffix} в `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `учреждение образования «${collegeNameAtEnrollment}»`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` для обучения `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `по специальности`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${specialty.name}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: `, и действительно является учащ${genderSuffix === 'а' ? 'ейся' : 'имся'} `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `учреждения образования «${currentCollegeName}», группы ${group.group_number}, ${courseText} курса, отделения среднего специального образования и получает первое среднее специальное образование на основе общего базового образования`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: `, форма обучения – `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `дневная, на ${group.payment_type} основе`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: `.`,
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),
        
        // Абзац о переименовании (если нужен)
        ...(needsRenameNote ? [
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'С 06.12.2022 учреждение образования "Минский государственный колледж электроники" переименовано в учреждение образования "Минский государственный колледж цифровых технологий" (Свидетельство о регистрации от 06.12.2022 № 100286358, приказ комитета по образованию Мингорисполкома от 20.10.2022 № 365-ОС).',
                        size: 24,
                        font: 'Times New Roman',
                        italics: true,
                        underline: {}
                    })
                ],
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 720 },
                spacing: { line: 240 }
            })
        ] : []),
        
        // Обучение продлится по
        new Paragraph({
            children: [
                new TextRun({
                    text: `Обучение продлится по «`,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${endDateDay}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: `» `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${endDateMonthGenitive}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` `,
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: `${endDateYear}`,
                    size: 24,
                    font: 'Times New Roman',
                    italics: true,
                    underline: {}
                }),
                new TextRun({
                    text: ` г.`,
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),
        
        // Справка действительна
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Справка действительна в течение 6 месяцев.',
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            spacing: { line: 240 }
        }),
        
        // Пустая строка перед директором
        new Paragraph({
            children: [
                new TextRun({
                    text: '',
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            spacing: { line: 240 }
        }),
        
        // Директор
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Директор',
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: '\t\t\t\t\t\t\t\t',
                    size: 24,
                    font: 'Times New Roman'
                }),
                new TextRun({
                    text: directorName,
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            alignment: AlignmentType.LEFT
        })
    ];

    // Создаем 2 копии справки с разделителем
    const paragraphs = [
        ...createCertificateParagraphs(),
        // Разделитель между копиями - 5 пустых строк
        ...Array(5).fill(null).map(() => new Paragraph({
            children: [
                new TextRun({
                    text: '',
                    size: 24,
                    font: 'Times New Roman'
                })
            ],
            spacing: { line: 240 }
        })),
        ...createCertificateParagraphs()
    ];

    return paragraphs;
};

module.exports = {
    createStudyCertificateTemplate
};
