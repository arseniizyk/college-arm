const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

/**
 * Читает word/document.xml напрямую из .docx файла (который является ZIP-архивом)
 * без привлечения сторонних зависимостей.
 */
function readDocxXml(filePath) {
    const buf = fs.readFileSync(filePath)
    let offset = 0
    while (offset < buf.length - 4) {
        if (buf.readUInt32LE(offset) === 0x04034b50) {
            const compression = buf.readUInt16LE(offset + 8)
            const compSize = buf.readUInt32LE(offset + 18)
            const fileNameLen = buf.readUInt16LE(offset + 26)
            const extraLen = buf.readUInt16LE(offset + 28)
            const fileName = buf.toString('utf8', offset + 30, offset + 30 + fileNameLen)
            const dataOffset = offset + 30 + fileNameLen + extraLen
            if (fileName === 'word/document.xml') {
                const compData = buf.subarray(dataOffset, dataOffset + compSize)
                if (compression === 8) {
                    return zlib.inflateRawSync(compData).toString('utf8')
                } else if (compression === 0) {
                    return compData.toString('utf8')
                }
            }
            offset = dataOffset + compSize
        } else {
            offset++
        }
    }
    throw new Error('word/document.xml not found in docx')
}

function parseDate(dateStr) {
    if (!dateStr) return null
    const m = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (m) {
        return `${m[3]}-${m[2]}-${m[1]}`
    }
    return null
}

function extractDocxGroups(docxPath) {
    if (!fs.existsSync(docxPath)) {
        throw new Error(`File not found: ${docxPath}`)
    }
    const xml = readDocxXml(docxPath)
    const pRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g
    const tRegex = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g
    const paragraphs = []
    let match
    while ((match = pRegex.exec(xml)) !== null) {
        const pContent = match[1]
        let pText = ''
        let tMatch
        while ((tMatch = tRegex.exec(pContent)) !== null) {
            pText += tMatch[1]
        }
        pText = pText.replace(/\u00a0/g, ' ').trim()
        if (pText) {
            paragraphs.push(pText)
        }
    }

    const orderIndices = []
    paragraphs.forEach((p, idx) => {
        if (/^Приказ о зачислении/i.test(p)) {
            orderIndices.push(idx)
        }
    })

    const parsedGroups = []

    for (let i = 0; i < orderIndices.length; i++) {
        const ordIdx = orderIndices[i]
        const headerRaw = paragraphs[ordIdx - 1]
        const orderRaw = paragraphs[ordIdx]
        const specRaw = paragraphs[ordIdx + 1]
        const qualRaw = paragraphs[ordIdx + 2]
        const curatorRaw = paragraphs[ordIdx + 3]

        const groupNumM = headerRaw.match(/^([0-9]+[\*\s]*[А-Яа-яA-Za-z]+[\*\s]*)/)
        const rawGroupNum = groupNumM ? groupNumM[1].trim() : headerRaw.split('(')[0].trim()
        const cleanGroupNumber = rawGroupNum.replace(/\*/g, '').replace(/ /g, '')

        const groupEnrollDate = parseDate(headerRaw)
        const paymentType = /платн/i.test(headerRaw) ? 'платной' : 'бесплатной'

        const specClean = specRaw.replace('Специальность:', '').trim()
        const specCodeM = specClean.match(/([0-9]-[0-9]{2}-[0-9]{4}-[0-9]{2})/)
        const specCode = specCodeM ? specCodeM[1] : null
        const specNameM = specClean.match(/[«"]([^»"]+)[»"]/)
        const specName = specNameM ? specNameM[1].trim() : specClean

        const qualClean = qualRaw.replace('Квалификация:', '').trim()
        const qualNameM = qualClean.match(/[«"]([^»"]+)[»"]/)
        const qualName = qualNameM ? qualNameM[1].trim() : qualClean.replace(/\.+$/, '')

        let durationYears = 4
        let durationMonths = 0
        if ((specCode && specCode.includes('0322-02')) || specName.includes('Документ')) {
            durationYears = 3
            durationMonths = 10
        } else if (specCode && specCode.includes('4-03-0713-06')) {
            durationYears = 3
            durationMonths = 0
        }

        const curatorClean = curatorRaw.replace('Куратор:', '').trim().replace(/\.+$/, '')
        const curParts = curatorClean.split(/\s+/).filter(Boolean)
        const curatorLastName = curParts.length > 0 ? curParts[0] : ''
        const curatorName = curParts.length > 1 ? curParts[1] : ''
        const curatorFatherName = curParts.length > 2 ? curParts.slice(2).join(' ') : ''

        const studentLinesStart = ordIdx + 4
        const studentLinesEnd = i + 1 < orderIndices.length ? orderIndices[i + 1] - 1 : paragraphs.length
        const rawLines = paragraphs.slice(studentLinesStart, studentLinesEnd)

        const combinedStudentLines = []
        for (const line of rawLines) {
            const lineS = line.trim()
            if (!lineS) continue
            const cleaned = lineS.replace(/^\d+[\.\)]\s*/, '').trim()
            const firstWord = cleaned.split(/\s+/)[0] || ''
            const ch = firstWord.charAt(0)
            const isCapitalized = Boolean(firstWord && ((ch >= 'А' && ch <= 'Я') || ch === 'Ё'))

            if (!isCapitalized && combinedStudentLines.length > 0) {
                combinedStudentLines[combinedStudentLines.length - 1] += ` ${lineS}`
            } else {
                combinedStudentLines.push(lineS)
            }
        }

        const groupStudents = []
        for (const sLine of combinedStudentLines) {
            const sClean = sLine.replace(/^\d+[\.\)]\s*/, '').trim()

            const isExpelled = /отчислен/i.test(sClean)
            let expellDate = null
            let expellReason = null
            let enrollPart = sClean

            if (isExpelled) {
                const splitM = sClean.match(/([\s\S]*?)(?:(?<![\p{L}\p{N}_])отчислен[\p{L}]*)([\s\S]*)/iu)
                if (splitM) {
                    enrollPart = splitM[1].trim()
                    const expText = (splitM[2] || '').trim()

                    const ordM = expText.match(/\(?\s*(?:пр-з|приказ)\s*(?:от\s+\d{2}\.\d{2}\.\d{4}\s*)?(?:№\s*)?([0-9]+\/[0-9]+-[0-9]+|[0-9]+\/[0-9]+)\s*(?:от\s+(\d{2}\.\d{2}\.\d{4}))?\s*\)?/i)
                    const expOrder = ordM ? ordM[0].replace(/^[\(\)\s]+|[\(\)\s]+$/g, '') : null

                    const expM = expText.match(/(?:с\s+|от\s+|–\s*|-)?\s*(\d{2}\.\d{2}\.\d{4})/i)
                    if (expM) {
                        expellDate = parseDate(expM[1])
                    }

                    let cleanReason = expText
                    if (ordM) {
                        cleanReason = cleanReason.slice(0, ordM.index) + ' ' + cleanReason.slice(ordM.index + ordM[0].length)
                    }
                    cleanReason = cleanReason.replace(/(?:^|\s)(?:с\s+|от\s+)?\d{2}\.\d{2}\.\d{4}/g, ' ')
                    cleanReason = cleanReason.replace(/\(?\s*приказ[^\)]*\)?/gi, ' ')
                    cleanReason = cleanReason.replace(/[\(\)\[\];]+/g, ' ')
                    cleanReason = cleanReason.replace(/^[,\.\s–\-]+|[,\.\s–\-]+$/g, '')
                    cleanReason = cleanReason.replace(/\s+/g, ' ').trim()
                    cleanReason = cleanReason.replace(/(по собственному желанию)[,\s]+по собственному желанию/gi, '$1')
                    cleanReason = cleanReason.replace(/^[ ,.\-]+|[ ,.\-]+$/g, '')

                    if (expOrder) {
                        expellReason = cleanReason ? `${cleanReason} (${expOrder})` : expOrder
                    } else {
                        expellReason = cleanReason || null
                    }
                }
            }

            let studentOrder = orderRaw.trim()
            let studentEnrollDate = groupEnrollDate
            const customOrdM = enrollPart.match(/(?:зачисл[а-яё]*|восстановлен[а-яё]*|на\s+вакантное\s+место|пр-з|приказ)\s*(?:на\s+вакантное\s+место)?\s*(?:с\s+(\d{2}\.\d{2}\.\d{4}))?\s*(?:№\s*|пр-з\s*№\s*|приказ\s*№\s*)?([0-9]+\/[0-9]+-[0-9]+)\s*(?:от\s+(\d{2}\.\d{2}\.\d{4}))?/i)
            if (customOrdM) {
                const num = customOrdM[2]
                const effectiveDate = customOrdM[1] || customOrdM[3]
                const orderDate = customOrdM[3] || customOrdM[1]
                if (num && orderDate) {
                    studentOrder = `Приказ о зачислении № ${num} от ${orderDate}`
                    studentEnrollDate = parseDate(effectiveDate || orderDate)
                } else if (num) {
                    studentOrder = `Приказ о зачислении № ${num}`
                }
            }

            const isTarget = /(\(Ц\)|[\s(.]Ц[\s().;]|(?<![\p{L}\p{N}_])Ц(?![\p{L}\p{N}_]))/u.test(sClean)

            const fioSplit = sClean.split(/(\(|—|–|-|(?:(?<![\p{L}\p{N}_])(?:отчислен|переведен|зачислен|академическ|в связи))|№)/iu)
            let fioClean = fioSplit[0].trim()
            fioClean = fioClean.replace(/[\.\,\;\:\(\)\*Цц]+$/, '').trim()

            const fioParts = fioClean.split(/\s+/).filter(Boolean)
            let sLast = '', sFirst = '', sFather = ''
            if (fioParts.length >= 3) {
                sLast = fioParts[0]
                sFirst = fioParts[1]
                sFather = fioParts.slice(2).join(' ')
            } else if (fioParts.length === 2) {
                sLast = fioParts[0]
                sFirst = fioParts[1]
            } else if (fioParts.length === 1) {
                sLast = fioParts[0]
            } else {
                continue
            }

            groupStudents.push({
                last_name: sLast,
                name: sFirst,
                father_name: sFather,
                order_number: studentOrder,
                enroll_date: studentEnrollDate,
                expell_date: expellDate,
                expell_reason: expellReason,
                is_expelled: isExpelled,
                is_target: isTarget,
                raw_line: sLine
            })
        }

        parsedGroups.push({
            group_number: cleanGroupNumber,
            raw_group_number: rawGroupNum,
            header_raw: headerRaw,
            enroll_date: groupEnrollDate,
            payment_type: paymentType,
            specialty_code: specCode,
            specialty_name: specName,
            qualification: qualName,
            duration_years: durationYears,
            duration_months: durationMonths,
            curator_last_name: curatorLastName,
            curator_name: curatorName,
            curator_father_name: curatorFatherName,
            order_number: orderRaw.trim(),
            students: groupStudents
        })
    }

    return parsedGroups
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.error('Ошибка: Не указан путь к файлу .docx')
        console.error('Использование: node parseDocx.js <путь_к_файлу.docx>')
        process.exit(1)
    }

    const targetPath = path.resolve(process.argv[2])
    if (!fs.existsSync(targetPath)) {
        console.error(`Ошибка: Файл не найден: ${targetPath}`)
        process.exit(1)
    }

    const data = extractDocxGroups(targetPath)
    console.log(JSON.stringify(data, null, 2))
}

module.exports = {
    extractDocxGroups,
    readDocxXml,
    parseDate
}
