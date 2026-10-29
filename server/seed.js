require('dotenv').config()
const bcrypt = require('bcrypt')
const sequelize = require('./db')
const {
    User, Student, Teacher, Supervisor, Group, Specialty, Document
} = require('./models/models')
const { isSameEmail } = require('./utils/userEmail')

// Аргументы командной строки: node seed.js [--force] [--seed=N] [--specialties=N] ...
const args = process.argv.slice(2).reduce((acc, cur) => {
    const [k, v] = cur.replace(/^--/, '').split('=')
    acc[k] = v === undefined ? true : v
    return acc
}, {})

const COUNT = {
    specialties: Number(args.specialties || 5),
    groups: Number(args.groups || 10),
    students: Number(args.students || 80),
    teachers: Number(args.teachers || 10)
}

const FORCE = args.force === true || args.force === 'true'
const KEEP_EXISTING = args.keep === true || args.keep === 'true'

const LAST = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов', 'Попов', 'Лебедев', 'Новиков', 'Морозов', 'Волков', 'Соколов', 'Михайлов', 'Фёдоров', 'Морозов', 'Волков', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов']
const MALE = ['Александр', 'Дмитрий', 'Максим', 'Артём', 'Иван', 'Кирилл', 'Михаил', 'Никита', 'Егор', 'Павел', 'Роман', 'Сергей', 'Тимофей', 'Владислав']
const FEMALE = ['Анна', 'Мария', 'Ольга', 'Елена', 'Наталья', 'Ирина', 'Юлия', 'Татьяна', 'Светлана', 'Екатерина', 'Дарья', 'Полина']
const FATHER_M = ['Александрович', 'Дмитриевич', 'Сергеевич', 'Андреевич', 'Викторович', 'Николаевич', 'Иванович', 'Павлович', 'Геннадьевич', 'Борисович']
const FATHER_F = ['Александровна', 'Дмитриевна', 'Сергеевна', 'Андреевна', 'Викторовна', 'Николаевна', 'Ивановна', 'Павловна', 'Геннадьевна', 'Борисовна']

let seedState = Number(args.seed || 20260930) >>> 0
function seededRandom() {
    seedState = (seedState * 1664525 + 1013904223) >>> 0
    return seedState / 4294967296
}
const pick = (arr) => arr[Math.floor(seededRandom() * arr.length)]
const pickInt = (min, max) => min + Math.floor(seededRandom() * (max - min + 1))

function makePerson() {
    const isMale = seededRandom() < 0.5
    return {
        last_name: pick(LAST) + (isMale ? '' : 'а'),
        name: isMale ? pick(MALE) : pick(FEMALE),
        father_name: isMale ? pick(FATHER_M) : pick(FATHER_F)
    }
}

const ORPHAN_GROUP_NUMBER = '99-БЕЗ-СПЕЦ'
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

const makeOrderNumber = (n, date) => {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `Приказ, ${n}/${pickInt(1, 4)}-${pickInt(1, 9)} от ${dd}.${mm}.${date.getFullYear()}`
}

async function wipe() {
    await Supervisor.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Student.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Teacher.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Group.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Specialty.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await Document.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true })
    console.log('  все таблицы очищены')
}

async function countRows() {
    const counts = await Promise.all([
        User.count(), Student.count(), Teacher.count(), Group.count(),
        Specialty.count(), Document.count(), Supervisor.count()
    ])
    return {
        User: counts[0], Student: counts[1], Teacher: counts[2], Group: counts[3],
        Specialty: counts[4], Document: counts[5], Supervisor: counts[6]
    }
}

async function main() {
    await sequelize.authenticate()
    console.log(`Подключение к ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT} — ок`)

    const [schema] = await sequelize.query(
        `SELECT
            to_regclass('public.specialties') IS NOT NULL AS specialties,
            to_regclass('public."SequelizeMeta"') IS NOT NULL AS meta;`
    )
    if (!schema[0].specialties || !schema[0].meta) {
        console.error('В базе нет схемы — сначала выполните: npm run migrate')
        process.exit(1)
    }

    const existing = await countRows()
    const hasData = Object.values(existing).some(v => v > 0)

    if (hasData && !FORCE && !KEEP_EXISTING) {
        console.error('В базе уже есть данные:')
        Object.entries(existing).forEach(([k, v]) => console.error(`  ${k}: ${v}`))
        console.error('')
        console.error('Скрипт по умолчанию ничего не удаляет и просто добавит новые записи.')
        console.error('Чтобы очистить базу и заполнить заново, запустите с --force:')
        console.error('  node seed.js --force')
        console.error('Чтобы просто дозаполнить без очистки:')
        console.error('  node seed.js --keep')
        process.exit(1)
    }

    if (FORCE) {
        console.log('Очистка базы (--force):')
        await wipe()
    } else if (KEEP_EXISTING) {
        console.log('Очистка пропущена (--keep), добавляем к существующим данным')
    }

    const passwordHash = await bcrypt.hash('password123', 5)

    // --- Пользователи (только ADMIN) ---
    const existingUsers = await User.findAll({ attributes: ['id', 'email', 'role'] })
    const findUser = (email) => existingUsers.find(u => isSameEmail(u.email, email))

    const ensureUser = async (email, role = 'ADMIN') => {
        const found = findUser(email)
        if (found) return found
        const created = await User.create({ email, password: passwordHash, role })
        existingUsers.push(created)
        return created
    }

    const admin = await ensureUser('admin@test.ru', 'ADMIN')
    await ensureUser('director@test.ru', 'ADMIN')
    console.log(`Пользователи: администраторы созданы (пароль: password123)`)

    // --- Специальности ---
    const specialtyData = [
        { name: 'Программирование', qualification: 'Информатик-системный программист', duration_years: 4, duration_months: 0 },
        { name: 'Информационные системы и программирование', qualification: 'Программист', duration_years: 4, duration_months: 0 },
        { name: 'Бухгалтерия', qualification: 'Бухгалтер', duration_years: 3, duration_months: 10 },
        { name: 'Документоведение', qualification: 'Документовед-аудитор', duration_years: 3, duration_months: 0 },
        { name: 'Туризм', qualification: 'Специалист по туризму', duration_years: 3, duration_months: 6 },
        { name: 'Дизайн', qualification: 'Дизайнер', duration_years: 4, duration_months: 0 },
        { name: 'Банковское дело', qualification: 'Банковский работник', duration_years: 2, duration_months: 6 },
        { name: 'Юриспруденция', qualification: 'Юрист', duration_years: 4, duration_months: 0 }
    ]
    const specialties = []
    for (const s of specialtyData.slice(0, COUNT.specialties)) {
        specialties.push(await Specialty.create(s))
    }
    console.log(`Специальности: ${specialties.length}`)

    // --- Документы ---
    const documentNames = [
        'Справка об обучении',
        'Справка об окончании',
        'Договор о практике',
        'Приказ о зачислении'
    ]
    const documents = []
    for (const name of documentNames) {
        documents.push(await Document.create({ document_name: name }))
    }
    console.log(`Документы: ${documents.length}`)

    // --- Преподаватели ---
    const teachers = []
    for (let i = 0; i < COUNT.teachers; i++) {
        const p = makePerson()
        teachers.push(await Teacher.create({ ...p }))
    }
    console.log(`Преподаватели: ${teachers.length}`)

    // --- Группы и кураторы ---
    const takenGroupNumbers = new Set((await Group.findAll({ attributes: ['group_number'] })).map(g => g.group_number))
    const nextFreeGroupNumber = () => {
        for (let attempt = 0; attempt < 200; attempt++) {
            const n = `${pickInt(1, 4)}${pick(['А', 'Б', 'В', 'Г', 'Д', ''])}-${pickInt(1, 40)}${pick(['', 'А', 'Б', 'В'])}`
            if (!takenGroupNumbers.has(n)) {
                takenGroupNumbers.add(n)
                return n
            }
        }
        return `Г-${Date.now().toString().slice(-4)}`
    }

    const groups = []
    const paymentTypes = ['платной', 'бесплатной']
    for (let i = 0; i < COUNT.groups; i++) {
        const groupNumber = nextFreeGroupNumber()
        const specialty = pick(specialties)
        const enrollDate = daysAgo(pickInt(60, 1000))
        const paymentType = pick(paymentTypes)
        const group = await Group.create({
            group_number: groupNumber,
            enroll_date: enrollDate,
            payment_type: paymentType,
            specialtyId: specialty.id
        })
        groups.push(group)
    }

    let curatorsCount = 0
    for (let i = 0; i < groups.length; i++) {
        const g = groups[i]
        const teacher = teachers[i % teachers.length]
        if (teacher) {
            await Supervisor.create({ groupId: g.id, teacherId: teacher.id })
            curatorsCount++
        }
    }
    console.log(`Группы: ${groups.length}, назначено кураторов: ${curatorsCount}`)

    // --- Студенты ---
    const students = []
    for (let i = 0; i < COUNT.students; i++) {
        const p = makePerson()
        const group = pick(groups)
        const enrollDate = daysAgo(pickInt(100, 1100))
        const expelled = seededRandom() < 0.15
        students.push(await Student.create({
            last_name: p.last_name,
            name: p.name,
            father_name: p.father_name,
            order_number: makeOrderNumber(pickInt(1, 400), enrollDate),
            enroll_date: enrollDate,
            expell_date: expelled ? daysAgo(pickInt(1, 80)) : null,
            groupId: group.id
        }))
    }
    console.log(`Студенты: ${students.length}`)

    // --- Намеренно «сломанные» записи (для проверки справок B5) ---
    let orphanGroup = await Group.findOne({ where: { specialtyId: null, group_number: ORPHAN_GROUP_NUMBER } })
    if (!orphanGroup) {
        orphanGroup = await Group.create({
            group_number: ORPHAN_GROUP_NUMBER,
            enroll_date: daysAgo(400),
            payment_type: 'платной'
        })
    }
    const orphanStudents = []
    for (let i = 0; i < 3; i++) {
        const p = makePerson()
        orphanStudents.push(await Student.create({
            last_name: p.last_name,
            name: p.name,
            father_name: p.father_name,
            order_number: makeOrderNumber(pickInt(1, 400), daysAgo(400)),
            enroll_date: daysAgo(400),
            groupId: orphanGroup.id
        }))
    }
    console.log(`Группа без специальности: ${ORPHAN_GROUP_NUMBER} + 3 студента (для проверки B5)`)

    console.log('')
    console.log('Вход в систему: admin@test.ru / password123 (роль ADMIN)')
}

main()
    .then(async () => {
        console.log('Готово.')
        await sequelize.close()
        process.exit(0)
    })
    .catch(async (e) => {
        console.error('Ошибка заполнения базы:', e)
        await sequelize.close().catch(() => {})
        process.exit(1)
    })
