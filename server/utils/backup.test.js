const test = require('node:test')
const assert = require('node:assert/strict')

const fs = require('node:fs')
const path = require('node:path')

const { isValidBackupFileName, cleanStaleTmpFiles, listBackups, cleanOldBackups } = require('./backup')

const backupDir = path.join(__dirname, '../backups')

// Хелперы работают с реальным каталогом backups, поэтому проверяем их на файлах
// с именами, которые в ротации не участвуют и удаляются без последствий
const VALID_NAME = 'backup_2000-01-01.sql'
const TMP_NAME = 'backup_2000-01-02.sql.tmp'
const writeFixture = (name, content) => fs.writeFileSync(path.join(backupDir, name), content)

test('готовым дампом считается только имя строго по схеме', () => {
    assert.equal(isValidBackupFileName('backup_2026-10-01.sql'), true)

    assert.equal(isValidBackupFileName('backup_2026-10-01.sql.tmp'), false)
    assert.equal(isValidBackupFileName('backup_2026-10-01.sql.gz'), false)
    assert.equal(isValidBackupFileName('backup_2026-10-01'), false)
    assert.equal(isValidBackupFileName('backup_2026-1-1.sql'), false)
})

test('не-строки не проходят проверку имени', () => {
    assert.equal(isValidBackupFileName(undefined), false)
    assert.equal(isValidBackupFileName(null), false)
    assert.equal(isValidBackupFileName(42), false)
    assert.equal(isValidBackupFileName(['backup_2026-10-01.sql']), false)
})

test('имя с переводом строки на конце отклоняется, несмотря на $ в регулярке', () => {
    assert.equal(isValidBackupFileName('backup_2026-10-01.sql\n'), false)
    assert.equal(isValidBackupFileName('backup_2026-10-01.sql\n../../etc/passwd'), false)
})

test('зачистка удаляет незавершённый дамп и не трогает готовые', () => {
    const tmpPath = path.join(backupDir, TMP_NAME)
    const validPath = path.join(backupDir, VALID_NAME)

    writeFixture(TMP_NAME, 'недописанный дамп')
    writeFixture(VALID_NAME, 'готовый дамп')

    try {
        assert.deepEqual(cleanStaleTmpFiles(), [TMP_NAME])
        assert.equal(fs.existsSync(tmpPath), false)
        assert.equal(fs.existsSync(validPath), true)
    } finally {
        fs.rmSync(tmpPath, { force: true })
        fs.rmSync(validPath, { force: true })
    }
})

test('listBackups возвращает готовые дампы и игнорирует незавершённый', () => {
    const tmpPath = path.join(backupDir, TMP_NAME)
    const validPath = path.join(backupDir, VALID_NAME)

    writeFixture(TMP_NAME, 'недописанный дамп')
    writeFixture(VALID_NAME, 'готовый дамп')

    try {
        const names = listBackups().map(backup => backup.name)

        assert.ok(names.includes(VALID_NAME))
        assert.ok(!names.includes(TMP_NAME))
        assert.ok(names.every(isValidBackupFileName))
    } finally {
        fs.rmSync(tmpPath, { force: true })
        fs.rmSync(validPath, { force: true })
    }
})

test('список и ротация видят только дампы со строгим именем', () => {
    const tmpPath = path.join(backupDir, TMP_NAME)
    const validPath = path.join(backupDir, VALID_NAME)
    // Мусорное имя: старая маска startsWith/endsWith его принимала,
    // а скачать такой файл было нельзя — download отвечал 400
    const junkName = 'backup_2000-01-03_draft.sql'
    const junkPath = path.join(backupDir, junkName)

    writeFixture(TMP_NAME, 'недописанный дамп')
    writeFixture(VALID_NAME, 'готовый дамп')
    writeFixture(junkName, 'черновик')

    const keepCount = listBackups().length
    const before = listBackups().map(backup => backup.name).sort()

    try {
        const names = listBackups().map(backup => backup.name)
        assert.ok(names.includes(VALID_NAME))
        assert.ok(!names.includes(TMP_NAME), '.tmp не должен попадать в список бэкапов')
        assert.ok(!names.includes(junkName), 'имя вне схемы не должно попадать в список бэкапов')

        // keepCount = числу готовых дампов: если бы в ротацию попал файл вне
        // схемы, она удалила бы лишний настоящий дамп
        cleanOldBackups(keepCount)

        assert.deepEqual(
            listBackups().map(backup => backup.name).sort(),
            before,
            'ротация удалила файл при keepCount = числу дампов'
        )
        assert.equal(fs.existsSync(validPath), true)
    } finally {
        fs.rmSync(tmpPath, { force: true })
        fs.rmSync(validPath, { force: true })
        fs.rmSync(junkPath, { force: true })
    }
})
