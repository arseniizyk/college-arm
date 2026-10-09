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

const FALLBACK_CANDIDATES = [
    path.resolve(__dirname, '../data/Список учащихся 2026-2027.docx'),
    path.resolve(__dirname, '../Список учащихся 2026-2027.docx'),
    path.resolve('C:/Users/Magic/Downloads/Telegram Desktop/Список учащихся 2026-2027.docx')
]

async function wipeDatabase() {
    console.log('Очистка таблиц перед импортом...')
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
    console.log('✓ База данных очищена.')
}

async function main() {
    const rawArg = process.argv[2]
    const docxPath = rawArg ? path.resolve(rawArg) : (FALLBACK_CANDIDATES.find(p => fs.existsSync(p)) || FALLBACK_CANDIDATES[0])

    if (!fs.existsSync(docxPath)) {
        console.error(`Ошибка: Файл не найден: ${docxPath}`)
        console.error('Использование: npm run import:students -- <путь_к_файлу.docx>')
        process.exit(1)
    }

    console.log(`Запуск импорта из файла: ${docxPath}`)

    // 1. Вызов парсера
    const pythonScript = path.join(__dirname, 'parseDocx.py')
    const py = spawnSync('python', [pythonScript, docxPath], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 })

    if (py.error || py.status !== 0) {
        console.error('Ошибка выполнения Python-парсера:', py.stderr || py.error)
        process.exit(1)
    }

    const groupsData = JSON.parse(py.stdout)
    console.log(`✓ Успешно распарсено групп: ${groupsData.length}`)

    await sequelize.authenticate()
    console.log(`✓ Подключение к БД ${process.env.DB_NAME} установлено.`)

    // 2. Очистка
    await wipeDatabase()

    const defaultPasswordHash = await bcrypt.hash('password123', 5)

    // 3. Создание Администратора
    const adminUser = await User.create({
        email: 'admin@test.ru',
        password: defaultPasswordHash,
        role: 'ADMIN'
    })
    console.log(`✓ Создан администратор: admin@test.ru / password123`)

    // 4. Создание типов документов
    const documentNames = [
        'Справка об обучении',
        'Справка об окончании',
        'Договор о практике',
        'Приказ о зачислении'
    ]
    for (const name of documentNames) {
        await Document.create({ document_name: name })
    }
    console.log(`✓ Созданы типы документов (${documentNames.length})`)

    // 5. Импорт специальностей
    const specialtyMap = new Map() // key -> specialty instance
    for (const g of groupsData) {
        const key = `${g.specialty_name}|||${g.qualification}`
        if (!specialtyMap.has(key)) {
            const spec = await Specialty.create({
                name: g.specialty_name,
                qualification: g.qualification,
                duration_years: g.duration_years,
                duration_months: g.duration_months
            })
            specialtyMap.set(key, spec)
        }
    }
    console.log(`✓ Созданы специальности: ${specialtyMap.size}`)

    // 6. Импорт преподавателей / кураторов
    const teacherMap = new Map() // FIO -> Teacher instance
    let teacherCount = 0
    for (const g of groupsData) {
        const fio = `${g.curator_last_name} ${g.curator_name} ${g.curator_father_name}`.trim()
        if (fio && !teacherMap.has(fio)) {
            teacherCount++
            // Создаем учетную запись для каждого преподавателя
            const teacherEmail = `teacher${teacherCount}@test.ru`
            const teacherUser = await User.create({
                email: teacherEmail,
                password: defaultPasswordHash,
                role: 'TEACHER'
            })

            const teacher = await Teacher.create({
                last_name: g.curator_last_name,
                name: g.curator_name,
                father_name: g.curator_father_name,
                userId: teacherUser.id
            })

            teacherMap.set(fio, teacher)
        }
    }
    console.log(`✓ Созданы преподаватели и аккаунты кураторов: ${teacherMap.size}`)

    // 7. Импорт групп и назначение кураторов
    let totalStudentsCount = 0
    let totalExpelledCount = 0
    let userAccountIndex = 0

    for (const g of groupsData) {
        const specKey = `${g.specialty_name}|||${g.qualification}`
        const specialty = specialtyMap.get(specKey)

        const group = await Group.create({
            group_number: g.group_number,
            enroll_date: g.enroll_date ? new Date(g.enroll_date) : new Date('2026-09-01'),
            payment_type: g.payment_type,
            specialtyId: specialty ? specialty.id : null
        })

        // Куратор
        const fio = `${g.curator_last_name} ${g.curator_name} ${g.curator_father_name}`.trim()
        const teacher = teacherMap.get(fio)
        if (teacher) {
            await Supervisor.create({
                groupId: group.id,
                teacherId: teacher.id
            })
        }

        // Импорт студентов группы
        const studentPayloads = []
        for (const s of g.students) {
            totalStudentsCount++
            if (s.is_expelled) totalExpelledCount++

            // Создаем аккаунты для первых 15 студентов для тестирования личного кабинета
            let userId = null
            if (userAccountIndex < 15 && !s.is_expelled) {
                userAccountIndex++
                const studentUser = await User.create({
                    email: `user${userAccountIndex}@test.ru`,
                    password: defaultPasswordHash,
                    role: 'USER'
                })
                userId = studentUser.id
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

        await Student.bulkCreate(studentPayloads)
    }

    console.log(`✓ Созданы группы: ${groupsData.length}`)
    console.log(`✓ Созданы студенты: ${totalStudentsCount} (активных: ${totalStudentsCount - totalExpelledCount}, отчисленных: ${totalExpelledCount})`)
    console.log(`✓ Созданы аккаунты студентов: ${userAccountIndex} (user1@test.ru ... user${userAccountIndex}@test.ru)`)
    console.log('\n========================================')
    console.log('Импорт успешно завершен!')
    console.log('Данные для входа:')
    console.log('  Администратор: admin@test.ru / password123')
    console.log('  Кураторы:      teacher1@test.ru ... teacher35@test.ru / password123')
    console.log('  Студенты:      user1@test.ru ... user15@test.ru / password123')
    console.log('========================================')
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
