require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const bcrypt = require('bcrypt')
const sequelize = require('../db')
const {
    User, Student, Teacher, Supervisor, Group, Specialty, Document,
    Request, Notification, StudentRequest
} = require('../models/models')
const { isSameEmail } = require('../utils/userEmail')

// Разбор аргументов командной строки:
// node scripts/importDocxStudents.js [путь_к_docx] [--force] [--admin-email=admin@test.ru] [--admin-password=pass] [--with-accounts]
const rawArgs = process.argv.slice(2)
const flags = Object.fromEntries(
    rawArgs
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [k, v] = a.replace(/^--/, '').split('=')
            return [k, v === undefined ? true : v]
        })
)

const positionalPath = rawArgs.find(a => !a.startsWith('--'))
const FORCE = flags.force === true || flags.force === 'true'
const WITH_ACCOUNTS = flags['with-accounts'] === true || flags['with-accounts'] === 'true'
const ADMIN_EMAIL = flags['admin-email'] || null
const ADMIN_PASSWORD = flags['admin-password'] || 'password123'

function resolveDocxPath() {
    if (positionalPath) return path.resolve(positionalPath)
    if (flags.file) return path.resolve(flags.file)

    const candidates = [
        path.resolve(__dirname, '../data/students.docx'),
        path.resolve(__dirname, '../students.docx'),
        path.resolve(__dirname, '../../students.docx')
    ]
    return candidates.find(p => fs.existsSync(p)) || null
}

async function wipeDatabase() {
    console.log('Очистка базы данных (--force):')
    await StudentRequest.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Notification.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Request.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Supervisor.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Student.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Teacher.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Group.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Specialty.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Document.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    console.log('✓ Таблицы очищены.')
}

async function main() {
    const docxPath = resolveDocxPath()
    if (!docxPath || !fs.existsSync(docxPath)) {
        console.error('Ошибка: Не указан или не найден файл .docx для импорта.')
        console.error('')
        console.error('Использование:')
        console.error('  node scripts/importDocxStudents.js <путь_к_файлу.docx> [опции]')
        console.error('')
        console.error('Опции:')
        console.error('  --force                       Полная очистка базы перед импортом')
        console.error('  --admin-email=<email>         Создать администратора с указанным email')
        console.error('  --admin-password=<password>   Пароль для администратора (по умолчанию password123)')
        console.error('  --with-accounts               Создавать тестовые аккаунты для кураторов и студентов')
        process.exit(1)
    }

    console.log(`Запуск импорта из файла: ${docxPath}`)

    // 1. Вызов Python-парсера
    const pythonScript = path.join(__dirname, 'parseDocx.py')
    let py = spawnSync('python', [pythonScript, docxPath], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    if (py.error && py.error.code === 'ENOENT') {
        py = spawnSync('py', [pythonScript, docxPath], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    }

    if (py.error || py.status !== 0) {
        console.error('Ошибка выполнения Python-парсера:', py.stderr || py.error)
        process.exit(1)
    }

    const groupsData = JSON.parse(py.stdout)
    console.log(`✓ Успешно распарсено групп: ${groupsData.length}`)

    await sequelize.authenticate()
    console.log(`✓ Подключение к БД ${process.env.DB_NAME} установлено.`)

    // 2. Очистка по флагу --force
    if (FORCE) {
        await wipeDatabase()
    } else {
        console.log('Импорт в режиме дополнения/обновления (без полной очистки).')
    }

    const defaultPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 5)

    // 3. Создание Администратора (только если передан --admin-email)
    if (ADMIN_EMAIL) {
        const existingUsers = await User.findAll({ attributes: ['id', 'email', 'role'] })
        const foundAdmin = existingUsers.find(u => isSameEmail(u.email, ADMIN_EMAIL))
        if (!foundAdmin) {
            await User.create({
                email: ADMIN_EMAIL,
                password: defaultPasswordHash,
                role: 'ADMIN'
            })
            console.log(`✓ Создан администратор: ${ADMIN_EMAIL}`)
        } else {
            console.log(`Администратор ${ADMIN_EMAIL} уже существует в базе.`)
        }
    }

    // 4. Справочник документов
    const documentNames = [
        'Справка об обучении',
        'Справка об окончании',
        'Договор о практике',
        'Приказ о зачислении'
    ]
    for (const name of documentNames) {
        const [doc] = await Document.findOrCreate({
            where: { document_name: name },
            defaults: { document_name: name }
        })
    }

    // 5. Импорт специальностей
    const specialtyMap = new Map()
    for (const g of groupsData) {
        const key = `${g.specialty_name}|||${g.qualification}`
        if (!specialtyMap.has(key)) {
            const [spec] = await Specialty.findOrCreate({
                where: {
                    name: g.specialty_name,
                    qualification: g.qualification
                },
                defaults: {
                    name: g.specialty_name,
                    qualification: g.qualification,
                    duration_years: g.duration_years,
                    duration_months: g.duration_months
                }
            })
            specialtyMap.set(key, spec)
        }
    }
    console.log(`✓ Специальности обработаны: ${specialtyMap.size}`)

    // 6. Импорт преподавателей / кураторов
    const teacherMap = new Map()
    let teacherUserIndex = 0

    for (const g of groupsData) {
        const fio = `${g.curator_last_name} ${g.curator_name} ${g.curator_father_name}`.trim()
        if (fio && !teacherMap.has(fio)) {
            let userId = null

            if (WITH_ACCOUNTS) {
                teacherUserIndex++
                const teacherEmail = `teacher${teacherUserIndex}@test.ru`
                const [tUser] = await User.findOrCreate({
                    where: { email: teacherEmail },
                    defaults: {
                        email: teacherEmail,
                        password: defaultPasswordHash,
                        role: 'TEACHER'
                    }
                })
                userId = tUser.id
            }

            const [teacher] = await Teacher.findOrCreate({
                where: {
                    last_name: g.curator_last_name,
                    name: g.curator_name,
                    father_name: g.curator_father_name
                },
                defaults: {
                    last_name: g.curator_last_name,
                    name: g.curator_name,
                    father_name: g.curator_father_name,
                    userId
                }
            })

            teacherMap.set(fio, teacher)
        }
    }
    console.log(`✓ Преподаватели/кураторы обработаны: ${teacherMap.size}`)

    // 7. Импорт групп и студентов
    let totalStudentsCount = 0
    let totalExpelledCount = 0
    let studentUserIndex = 0

    for (const g of groupsData) {
        const specKey = `${g.specialty_name}|||${g.qualification}`
        const specialty = specialtyMap.get(specKey)

        const [group, createdGroup] = await Group.findOrCreate({
            where: { group_number: g.group_number },
            defaults: {
                group_number: g.group_number,
                enroll_date: g.enroll_date ? new Date(g.enroll_date) : new Date('2026-09-01'),
                payment_type: g.payment_type,
                specialtyId: specialty ? specialty.id : null
            }
        })

        if (!createdGroup && specialty && !group.specialtyId) {
            await group.update({ specialtyId: specialty.id })
        }

        // Назначение куратора группе
        const fio = `${g.curator_last_name} ${g.curator_name} ${g.curator_father_name}`.trim()
        const teacher = teacherMap.get(fio)
        if (teacher) {
            const supervisor = await Supervisor.findOne({ where: { groupId: group.id } })
            if (!supervisor) {
                await Supervisor.create({
                    groupId: group.id,
                    teacherId: teacher.id
                })
            } else if (supervisor.teacherId !== teacher.id) {
                await supervisor.update({ teacherId: teacher.id })
            }
        }

        // Импорт студентов группы
        const studentPayloads = []
        for (const s of g.students) {
            totalStudentsCount++
            if (s.is_expelled) totalExpelledCount++

            let userId = null
            if (WITH_ACCOUNTS && studentUserIndex < 15 && !s.is_expelled) {
                studentUserIndex++
                const studentEmail = `user${studentUserIndex}@test.ru`
                const [sUser] = await User.findOrCreate({
                    where: { email: studentEmail },
                    defaults: {
                        email: studentEmail,
                        password: defaultPasswordHash,
                        role: 'USER'
                    }
                })
                userId = sUser.id
            }

            studentPayloads.push({
                last_name: s.last_name,
                name: s.name,
                father_name: s.father_name,
                order_number: s.order_number,
                enroll_date: s.enroll_date ? new Date(s.enroll_date) : new Date(g.enroll_date || '2026-09-01'),
                expell_date: s.expell_date ? new Date(s.expell_date) : null,
                groupId: group.id,
                userId
            })
        }

        if (FORCE) {
            await Student.bulkCreate(studentPayloads)
        } else {
            // Без --force: обновляем или добавляем студентов по ФИО + groupId
            for (const sp of studentPayloads) {
                const [existingStudent, created] = await Student.findOrCreate({
                    where: {
                        last_name: sp.last_name,
                        name: sp.name,
                        father_name: sp.father_name,
                        groupId: sp.groupId
                    },
                    defaults: sp
                })
                if (!created) {
                    await existingStudent.update({
                        order_number: sp.order_number,
                        enroll_date: sp.enroll_date,
                        expell_date: sp.expell_date
                    })
                }
            }
        }
    }

    console.log(`✓ Группы обработаны: ${groupsData.length}`)
    console.log(`✓ Студенты обработаны: ${totalStudentsCount} (активных: ${totalStudentsCount - totalExpelledCount}, отчисленных: ${totalExpelledCount})`)
    if (ADMIN_EMAIL) console.log(`✓ Администратор: ${ADMIN_EMAIL}`)
    console.log('========================================')
    console.log('Импорт успешно завершен.')
}

main()
    .then(async () => {
        await sequelize.close()
        process.exit(0)
    })
    .catch(async (e) => {
        console.error('Ошибка импорта:', e)
        await sequelize.close().catch(() => {})
        process.exit(1)
    })
