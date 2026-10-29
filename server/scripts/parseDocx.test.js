const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const { parseDate, extractDocxGroups } = require('./parseDocx')

test('parseDate корректно переводит ДД.ММ.ГГГГ в ГГГГ-ММ-ДД', () => {
    assert.equal(parseDate('01.09.2026'), '2026-09-01')
    assert.equal(parseDate('Приказ от 06.08.2026 №148'), '2026-08-06')
    assert.equal(parseDate(''), null)
    assert.equal(parseDate(null), null)
})

test('extractDocxGroups парсит реальный students.docx или выбрасывает ошибку при отсутствии', () => {
    const docxPath = path.resolve(__dirname, '../../students.docx')
    if (fs.existsSync(docxPath)) {
        const groups = extractDocxGroups(docxPath)
        assert.ok(Array.isArray(groups))
        assert.equal(groups.length, 35)

        const totalStudents = groups.reduce((acc, g) => acc + g.students.length, 0)
        assert.equal(totalStudents, 861)

        const firstGroup = groups[0]
        assert.equal(firstGroup.group_number, '102М')
        assert.equal(firstGroup.payment_type, 'бесплатной')
        assert.equal(firstGroup.enroll_date, '2026-09-01')
        assert.ok(firstGroup.students.length > 0)
    }

    assert.throws(() => {
        extractDocxGroups('/non/existing/file.docx')
    }, /File not found/)
})
