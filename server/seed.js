require('dotenv').config()

const bcrypt = require('bcrypt')
const sequelize = require('./db')
const {
    User, Student, Teacher, Supervisor, Group, Specialty, Document,
    Request, Notification, StudentRequest
} = require('./models/models')
const { statusLabelFeminine } = require('./utils/requestStatus')
const { isSameEmail } = require('./utils/userEmail')

// Количество сущностей можно переопределить аргументами:
//   node seed.js --students=120 --requests=40
// По умолчанию набор небольшой, но достаточный, чтобы увидеть все экраны.

const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [k, v] = a.replace(/^--/, '').split('=')
            return [k, v === undefined ? true : v]
        })
)

// Номер группы, намеренно оставленной без специальности, — на нём проверяются
// исправления B5 (400 на справке, метки в интерфейсе).
const ORPHAN_GROUP_NUMBER = '99-99-99'

const COUNT = {
    specialties: Number(args.specialties || 5),
    groups: Number(args.groups || 10),
    students: Number(args.students || 80),
    teachers: Number(args.teachers || 10),
    requests: Number(args.requests || 25)
}

// Безопасность: по умолчанию скрипт только дополняет базу. Полная очистка —
// исключительно по явному --force, иначе один запуск стирает реальные данные.
const FORCE = args.force === true || args.force === 'true'
const KEEP_EXISTING = args.keep === true || args.keep === 'true'

const LAST = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов', 'Попов', 'Лебедев', 'Новиков', 'Морозов', 'Волков', 'Соколов', 'Михайлов', 'Фёдоров', 'Морозов', 'Волков', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов']
const MALE = ['Александр', 'Дмитрий', 'Максим', 'Артём', 'Иван', 'Кирилл', 'Михаил', 'Никита', 'Егор', 'Павел', 'Роман', 'Сергей', 'Тимофей', 'Владислав']
const FEMALE = ['Анна', 'Мария', 'Ольга', 'Елена', 'Наталья', 'Ирина', 'Юлия', 'Татьяна', 'Светлана', 'Екатерина', 'Дарья', 'Полина']
const FATHER_M = ['Александрович', 'Дмитриевич', 'Сергеевич', 'Андреевич', 'Викторович', 'Николаевич', 'Иванович', 'Павлович', 'Геннадьевич', 'Борисович']
const FATHER_F = ['Александровна', 'Дмитриевна', 'Сергеевна', 'Андреевна', 'Викторовна', 'Николаевна', 'Ивановна', 'Павловна', 'Геннадьевна', 'Борисовна']

// Детерминированный псевдослучайный выбор: при --seed=N повторный запуск
// даёт тот же набор, иначе каждый прогон даёт новые данные и сравнивать
// скриншоты админки между прогонами бесполезно.
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
        last_name: pick(LAST),
        name: pick(isMale ? MALE : FEMALE),
        father_name: pick(isMale ? FATHER_M : FATHER_F),
        isMale
    }
}

// Дата в прошлом — чтобы calculateCourse в клиенте возвращал осмысленный курс.
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

// Формат order_number разбирается в server/utils/orderParser.js:
// "<номер> от <дд.мм.гггг>". Регулярка ожидает префикс "Приказ," —
// повторяем его, иначе дата не извлечётся и справка соберётся без неё.
const makeOrderNumber = (n, date) => {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `Приказ, ${n}/${pickInt(1, 4)}-${pickInt(1, 9)} от ${dd}.${mm}.${date.getFullYear()}`
}

async function wipe() {
    // Порядок важен: сначала связи-таблицы, потом владельцы.
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
    console.log('  все таблицы очищены')
}

async function countRows() {
    const counts = await Promise.all([
        User.count(), Student.count(), Teacher.count(), Group.count(),
        Specialty.count(), Document.count(), Request.count(), Notification.count(),
        Supervisor.count(), StudentRequest.count()
    ])
    return {
        User: counts[0], Student: counts[1], Teacher: counts[2], Group: counts[3],
        Specialty: counts[4], Document: counts[5], Request: counts[6],
        Notification: counts[7], Supervisor: counts[8], StudentRequest: counts[9]
    }
}

async function main() {
    await sequelize.authenticate()
    console.log(`Подключение к ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT} — ок`)

    // Схему создаёт `npm run migrate`, а не скрипт данных: sync() здесь был бы
    // вторым источником правды о структуре и маскировал бы неприменённые миграции.
    // Имя SequelizeMeta в to_regclass требует кавычек: без них литерал
    // приводится к нижнему регистру и таблица не находится.
    const [schema] = await sequelize.query(
        `SELECT to_regclass('public.specialties') AS specialties,
                to_regclass('public."SequelizeMeta"') AS meta`
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

    // --- Пользователи ---
    // email уникален без учёта регистра (функциональный индекс, миграция 005),
    // поэтому и поиск здесь тоже регистронезависимый.
    const existingUsers = await User.findAll({ attributes: ['id', 'email', 'role'] })
    const findUser = (email) => existingUsers.find(u => isSameEmail(u.email, email))

    const ensureUser = async (email, role) => {
        const found = findUser(email)
        if (found) return found
        const created = await User.create({ email, password: passwordHash, role })
        existingUsers.push(created)
        return created
    }

    const admin = await ensureUser('admin@test.ru', 'ADMIN')
    const teacherUsers = []
    for (let i = 0; i < COUNT.teachers; i++) {
        teacherUsers.push(await ensureUser(`teacher${i + 1}@test.ru`, 'TEACHER'))
    }
    const userAccounts = []
    for (let i = 0; i < Math.max(3, Math.floor(COUNT.students / 5)); i++) {
        userAccounts.push(await ensureUser(`user${i + 1}@test.ru`, 'USER'))
    }
    const unboundUser = await ensureUser('user.no-link@test.ru', 'USER')
    const unboundTeacherUser = await ensureUser('teacher.no-link@test.ru', 'TEACHER')
    console.log(`Пользователи: ${COUNT.teachers + userAccounts.length + 3} (пароль у всех: password123)`)

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
        // Первому преподавателю аккаунт не привязываем намеренно: его нельзя
        // назначить куратором, это проверка сообщения в Request.jsx.
        const userId = i === 0 ? null : teacherUsers[i - 1].id
        teachers.push(await Teacher.create({ ...p, userId }))
    }
    console.log(`Преподаватели: ${teachers.length} (у 1-го нет аккаунта — для проверки B12)`)

    // --- Группы и кураторы ---
    // group_number уникален, а набор небольшой, поэтому слепо генерировать
    // номера нельзя: при повторном запуске (--keep) почти наверняка придут
    // дубли и INSERT упадёт на groups_group_number_key. Держим множество
    // занятых номеров и добираем следующий свободный.
    const takenGroupNumbers = new Set((await Group.findAll({ attributes: ['group_number'] })).map(g => g.group_number))
    const nextFreeGroupNumber = () => {
        for (let attempt = 0; attempt < 200; attempt++) {
            const n = `${pickInt(1, 4)}${pick(['А', 'Б', 'В', 'Г', 'Д', ''])}-${pickInt(1, 40)}${pick(['', 'А', 'Б', 'В'])}`
            if (!takenGroupNumbers.has(n)) {
                takenGroupNumbers.add(n)
                return n
            }
        }
        // Фолбэк на случай исчерпания пространства имён
        let n
        do { n = `T-${String(takenGroupNumbers.size + 1).padStart(3, '0')}` } while (takenGroupNumbers.has(n))
        takenGroupNumbers.add(n)
        return n
    }

    const groups = []
    for (let i = 0; i < COUNT.groups; i++) {
        const specialty = specialties[i % specialties.length]
        const g = await Group.create({
            group_number: nextFreeGroupNumber(),
            enroll_date: daysAgo(pickInt(200, 1000)),
            specialtyId: specialty.id,
            payment_type: seededRandom() < 0.7 ? 'платной' : 'бесплатной'
        })
        groups.push(g)

        // Куратор: одна группа = один куратор (Group.hasOne(Supervisor)).
        // Берём id из объекта, а не позицию в массиве: id не обязан совпадать
        // с индексом, особенно после truncate без restartIdentity.
        if (i % 2 === 0) {
            const withAccount = teachers.filter(t => t.userId)
            const teacher = withAccount[(i / 2) % withAccount.length]
            await Supervisor.create({ groupId: g.id, teacherId: teacher.id })
        }
    }
    console.log(`Группы: ${groups.length} (у части нет куратора)`)

    // --- Студенты ---
    const students = []
    const linkableGroups = groups.filter(g => g.specialtyId)
    for (let i = 0; i < COUNT.students; i++) {
        const p = makePerson()
        const group = linkableGroups[i % linkableGroups.length]
        // Первые N студентов привязываем к аккаунтам (B1), остальных — нет:
        // без привязки они не могут подать заявку, это проверка сообщения.
        const userId = i < userAccounts.length ? userAccounts[i].id : null
        const enrollDate = daysAgo(pickInt(100, 1100))
        const expelled = seededRandom() < 0.15
        students.push(await Student.create({
            last_name: p.last_name,
            name: p.name,
            father_name: p.father_name,
            order_number: makeOrderNumber(pickInt(1, 400), enrollDate),
            enroll_date: enrollDate,
            expell_date: expelled ? daysAgo(pickInt(1, 80)) : null,
            groupId: group.id,
            userId
        }))
    }
    console.log(`Студенты: ${students.length} (${userAccounts.length} с привязкой к аккаунту)`)

    // --- Заявки ---
    const statuses = ['pending', 'completed', 'cancelled']
    const descriptions = [
        'Прошу выдать справку об обучении для поступления в вуз.',
        'Нужна справка для оформления документов в банк.',
        'Прошу подготовить договор о прохождении практики.',
        'Справка для военкомата, заказчик — курсант.'
    ]
    let requestsCount = 0
    let notificationsCount = 0
    for (let i = 0; i < COUNT.requests; i++) {
        // Заявку отдаём только привязанному к аккаунту студенту — иначе
        // сервер (B1) отклонит её с 403, а такие заявки в базе не появятся
        // легитимным путём.
        const bound = students.filter(s => s.userId)
        const author = bound[i % bound.length]
        const doc = pick(documents)
        const status = pick(statuses)
        const req = await Request.create({
            documentId: doc.id,
            userId: author.userId,
            description: pick(descriptions),
            status,
            isViewed: status !== 'pending' ? true : seededRandom() < 0.5
        })
        requestsCount++

        // Несколько студентов на одну заявку (как для ролей ADMIN/TEACHER).
        const extra = seededRandom() < 0.3 ? 1 : 0
        const linked = [author]
        if (extra) {
            const other = bound[(i + 1) % bound.length]
            if (other.id !== author.id) linked.push(other)
        }
        await req.addStudents(linked)

        // Уведомление получает автор заявки — Notification.userId тоже
        // ON DELETE SET NULL, но у живого пользователя получатель есть.
        await Notification.create({
            userId: author.userId,
            title: `Заявка №${req.id} — ${doc.document_name}`,
            // Текст выводится из статуса, а не выбирается случайно:
            // иначе заявка «в обработке» получает «Заявка отклонена».
            body: `Ваша заявка ${statusLabelFeminine(status)}`,
            isRead: status === 'pending' ? false : true
        })
        notificationsCount++
    }
    console.log(`Заявки: ${requestsCount}, уведомления: ${notificationsCount}`)

    // --- Намеренно «сломанные» записи ---
    // Одна группа без специальности: так как delete в БД делает ON DELETE SET NULL,
    // это ровно то состояние, которое даёт удаление специальности из UI.
    // Нужно, чтобы проверить исправления B5: 400 на справке и метки в интерфейсе.
    // При повторном запуске группа без специальности уже есть — переиспользуем
    // её, чтобы не плодить дубли и не падать на groups_group_number_key.
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

    // Заявка на справку об обучении по этим студентам: ровно тот случай,
    // который раньше приводил к пустому .docx с кодом 200.
    const certDoc = documents.find(d => d.document_name.includes('обучени'))
    if (certDoc) {
        const orphanReq = await Request.create({
            documentId: certDoc.id,
            userId: admin.id,
            description: 'Справка для группы без специальности — проверка B5.',
            status: 'pending'
        })
        await orphanReq.addStudents(orphanStudents)
        console.log(`Заявка №${orphanReq.id} на справку для группы без специальности (ожидается 400)`)
    }

    // Аккаунты без привязки — их заявки должны отклоняться (B1/B12).
    console.log('')
    console.log('Аккаунты БЕЗ привязки (заявку подать не смогут, ожидается сообщение в UI):')
    console.log(`  ${unboundUser.email} — роль USER, нет привязанного студента`)
    console.log(`  ${unboundTeacherUser.email} — роль TEACHER, не назначен куратором группы`)
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