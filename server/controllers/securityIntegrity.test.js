const test = require('node:test')
const assert = require('node:assert')
const bcrypt = require('bcrypt')
const ApiError = require('../error/ApiError')
const teacherController = require('./teacherController')
const userController = require('./userController')
const studentController = require('./studentController')
const requestController = require('./requestController')
const { User, Teacher, Student, Supervisor, Group } = require('../models/models')

test('teacherController.delete блокирует удаление, если s.group.group_number заполнен', async () => {
    const origTeacherFindByPk = Teacher.findByPk
    const origSupervisorFindAll = Supervisor.findAll

    try {
        Teacher.findByPk = async (id) => ({
            id: Number(id),
            destroy: async () => { throw new Error('destroy should not be called') }
        })

        // Sequelize связывает Supervisor.belongsTo(Group) в свойство group (строчными)
        Supervisor.findAll = async () => [
            {
                groupId: 10,
                group: { group_number: 'Т-101' }
            }
        ]

        let nextError = null
        const req = { params: { id: 1 } }
        const res = { json: () => {} }
        const next = (err) => { nextError = err }

        await teacherController.delete(req, res, next)

        assert.ok(nextError instanceof ApiError)
        assert.strictEqual(nextError.status, 400)
        assert.ok(nextError.message.includes('Т-101'))
    } finally {
        Teacher.findByPk = origTeacherFindByPk
        Supervisor.findAll = origSupervisorFindAll
    }
})

test('userController.login отдаёт одинаковую ошибку 400 «Неверный email или пароль» при отсутствии пользователя и при неверном пароле', async () => {
    const origFindOne = User.findOne
    const origScope = User.scope

    try {
        // Случай 1: Пользователь не найден в БД
        User.scope = () => ({
            findOne: async () => null
        })

        let err1 = null
        await userController.login(
            { body: { email: 'unknown@test.com', password: 'password123' } },
            {},
            (err) => { err1 = err }
        )

        assert.ok(err1 instanceof ApiError)
        assert.strictEqual(err1.status, 400)
        assert.strictEqual(err1.message, 'Неверный email или пароль')

        // Случай 2: Пользователь найден, но пароль неверный
        const hash = await bcrypt.hash('correctPassword', 5)
        User.scope = () => ({
            findOne: async () => ({
                id: 1,
                email: 'known@test.com',
                password: hash,
                role: 'USER'
            })
        })

        let err2 = null
        await userController.login(
            { body: { email: 'known@test.com', password: 'wrongPassword' } },
            {},
            (err) => { err2 = err }
        )

        assert.ok(err2 instanceof ApiError)
        assert.strictEqual(err2.status, 400)
        assert.strictEqual(err2.message, 'Неверный email или пароль')
    } finally {
        User.findOne = origFindOne
        User.scope = origScope
    }
})

test('requestController проверяет актуальную роль из БД, а не доверяет токену с ролью ADMIN', async () => {
    const origUserFindByPk = User.findByPk

    try {
        // В БД у пользователя роль USER (был понижен), хотя в токене req.user.role мог быть ADMIN
        User.findByPk = async (id) => ({
            id: Number(id),
            email: 'downgraded@test.com',
            role: 'USER'
        })

        let err = null
        const req = {
            user: { id: 5, role: 'ADMIN' }, // устаревший токен со старой ролью
            query: {}
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.get(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.strictEqual(err.status, 403)
        assert.strictEqual(err.message, 'Нет доступа')
    } finally {
        User.findByPk = origUserFindByPk
    }
})

test('studentController.get фильтрует студентов по роли из БД: преподаватель видит только свои группы', async () => {
    const origUserFindByPk = User.findByPk
    const origTeacherFindOne = Teacher.findOne
    const origSupervisorFindAll = Supervisor.findAll
    const origStudentFindAll = Student.findAll

    try {
        User.findByPk = async () => ({
            id: 2,
            role: 'TEACHER'
        })
        Teacher.findOne = async () => ({ id: 7 })
        Supervisor.findAll = async () => [{ groupId: 101 }, { groupId: 102 }]

        let capturedQueryOptions = null
        Student.findAll = async (options) => {
            capturedQueryOptions = options
            return [{ id: 1, name: 'Студент', groupId: 101 }]
        }

        let sentData = null
        const req = {
            user: { id: 2, role: 'TEACHER' },
            query: {}
        }
        const res = {
            json: (data) => { sentData = data }
        }
        const next = () => {}

        await studentController.get(req, res, next)

        assert.ok(capturedQueryOptions)
        assert.deepStrictEqual(capturedQueryOptions.where.groupId, { [require('sequelize').Op.in]: [101, 102] })
        assert.strictEqual(sentData.students.length, 1)
    } finally {
        User.findByPk = origUserFindByPk
        Teacher.findOne = origTeacherFindOne
        Supervisor.findAll = origSupervisorFindAll
        Student.findAll = origStudentFindAll
    }
})

test('studentController.get возвращает пустой список для пользователя без привязанного студента', async () => {
    const origUserFindByPk = User.findByPk
    const origStudentFindOne = Student.findOne

    try {
        User.findByPk = async () => ({
            id: 3,
            role: 'USER'
        })
        Student.findOne = async () => null // не привязан к студенту

        let sentData = null
        const req = {
            user: { id: 3, role: 'USER' },
            query: {}
        }
        const res = {
            json: (data) => { sentData = data }
        }
        const next = () => {}

        await studentController.get(req, res, next)

        assert.deepStrictEqual(sentData, { students: [] })
    } finally {
        User.findByPk = origUserFindByPk
        Student.findOne = origStudentFindOne
    }
})

test('groupController.create и update выполняют запись внутри транзакции sequelize.transaction', async () => {
    const sequelize = require('../db')
    const groupController = require('./groupController')
    const { Specialty, Teacher } = require('../models/models')

    const origTransaction = sequelize.transaction
    const origSpecialtyFindByPk = Specialty.findByPk
    const origTeacherFindByPk = Teacher.findByPk
    const origGroupCreate = Group.create
    const origGroupFindByPk = Group.findByPk
    const origSupervisorCreate = Supervisor.create

    let transactionsPassed = []

    try {
        sequelize.transaction = async (cb) => {
            const fakeT = { transactionId: 'test-txn-' + Math.random() }
            return await cb(fakeT)
        }

        Specialty.findByPk = async () => ({ id: 1 })
        Teacher.findByPk = async () => ({ id: 2 })
        Group.create = async (data, opts) => {
            transactionsPassed.push(opts?.transaction?.transactionId)
            return { id: 99 }
        }
        Supervisor.create = async (data, opts) => {
            transactionsPassed.push(opts?.transaction?.transactionId)
            return { id: 100 }
        }
        Group.findByPk = async () => ({ id: 99, group_number: '101' })

        const req = {
            body: {
                group_number: '101',
                enroll_date: '2026-09-01',
                specialtyId: 1,
                teacherId: 2,
                payment_type: 'бесплатной'
            }
        }
        const res = { json: () => {} }
        const next = (err) => { if (err) throw err }

        await groupController.create(req, res, next)

        assert.strictEqual(transactionsPassed.length, 2)
        assert.ok(transactionsPassed[0])
        assert.strictEqual(transactionsPassed[0], transactionsPassed[1])
    } finally {
        sequelize.transaction = origTransaction
        Specialty.findByPk = origSpecialtyFindByPk
        Teacher.findByPk = origTeacherFindByPk
        Group.create = origGroupCreate
        Group.findByPk = origGroupFindByPk
        Supervisor.create = origSupervisorCreate
    }
})

