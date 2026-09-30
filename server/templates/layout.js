const { Paragraph, TextRun, AlignmentType } = require('docx');

const FONT = 'Times New Roman';
const BODY_SIZE = 28;
const GAPS_SIZE = 24;
const LINE_SPACING = 240;
const PARAGRAPH_INDENT = 709;
const LIST_INDENT = 720;
const HEADER_BLANK_LINES = 10;

const bodyRun = (text, size = BODY_SIZE) => new TextRun({ text, size, font: FONT });

const point = (text) => new Paragraph({
    children: [bodyRun(text)],
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: PARAGRAPH_INDENT },
    spacing: { line: LINE_SPACING }
});

const justified = (text) => new Paragraph({
    children: [bodyRun(text)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_SPACING }
});

const listItem = (text) => new Paragraph({
    children: [bodyRun(text)],
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: LIST_INDENT },
    spacing: { line: LINE_SPACING }
});

const hanging = (text) => new Paragraph({
    children: [bodyRun(text)],
    alignment: AlignmentType.JUSTIFIED,
    indent: { hanging: PARAGRAPH_INDENT, left: PARAGRAPH_INDENT },
    spacing: { line: LINE_SPACING }
});

const centered = (text, size = BODY_SIZE) => new Paragraph({
    children: [bodyRun(text, size)],
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE_SPACING }
});

const header = (text) => new Paragraph({
    children: [
        ...blankLines(HEADER_BLANK_LINES),
        bodyRun(text)
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_SPACING }
});

const headerMulti = (lines) => [
    header(lines[0]),
    ...lines.slice(1).map(line => new Paragraph({
        children: [bodyRun(line)],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: LINE_SPACING }
    }))
];

const signatureList = (position, names, spaces, continuationSpaces = spaces) => {
    if (!names || names.length === 0) return [];
    return [
        signatureLine(position, names[0] || '', spaces),
        ...names.slice(1).map(name => new Paragraph({
            children: [bodyRun(continuationSpaces, GAPS_SIZE), bodyRun(name)],
            spacing: { line: LINE_SPACING }
        }))
    ];
};

const emptyLine = () => new Paragraph({
    children: [bodyRun('')],
    spacing: { line: LINE_SPACING }
});

const blankLines = (count) => Array(count)
    .fill()
    .map(() => new TextRun({ text: '', break: 1 }));

const signatureLine = (position, name, spaces = '                                                                                            ') =>
    new Paragraph({
        children: [
            bodyRun(position),
            bodyRun(spaces, GAPS_SIZE),
            bodyRun(name)
        ],
        spacing: { line: LINE_SPACING }
    });

const signatureStacked = (position, name) => {
    const lines = Array.isArray(position) ? position : [position];
    return [
        ...lines.map(line => new Paragraph({
            children: [bodyRun(line)],
            spacing: { line: LINE_SPACING }
        })),
        new Paragraph({
            children: [bodyRun(name)],
            spacing: { line: LINE_SPACING },
            indent: { firstLine: PARAGRAPH_INDENT, left: PARAGRAPH_INDENT }
        })
    ];
};

const signatureBlock = (roles) => {
    const groups = roles.map(role => (
        role.stacked
            ? signatureStacked(role.position, role.name, role.spaces)
            : [signatureLine(role.position, role.name, role.spaces)]
    ));
    return groups.flatMap((group, i) => (i === 0 ? group : [emptyLine(), ...group]));
};

const directorName = () => process.env.DIRECTOR_NAME || 'Г.В.Козел';

module.exports = {
    FONT,
    BODY_SIZE,
    GAPS_SIZE,
    LINE_SPACING,
    PARAGRAPH_INDENT,
    LIST_INDENT,
    HEADER_BLANK_LINES,
    bodyRun,
    point,
    justified,
    listItem,
    hanging,
    centered,
    header,
    headerMulti,
    emptyLine,
    blankLines,
    signatureLine,
    signatureStacked,
    signatureList,
    signatureBlock,
    directorName
};
