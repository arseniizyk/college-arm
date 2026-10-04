const test = require('node:test')
const assert = require('node:assert/strict')
const ApiError = require('../error/ApiError')
const requestController = require('./requestController')
const { User, Request, StudentRequest, Notification } = require('../models/models')
const sequelize = require('../db')

test('requestController.update запрещает редактирование заявки со статусом completed', async () => {
    const origUserFindByPk = User.findByPk
    const origRequestFindByPk = Request.findByPk

    try {
        User.findByPk = async () => ({ id: 1, role: 'USER' })
        Request.findByPk = async () => ({
            id: 10,
            userId: 1,
            status: 'completed'
        })

        let err = null
        const req = {
            user: { id: 1, role: 'USER' },
            params: { id: 10 },
            body: { description: 'Новое описание' }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.update(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 400)
        assert.equal(err.message, 'Нельзя редактировать завершенную или отклоненную заявку')
    } finally {
        User.findByPk = origUserFindByPk
        Request.findByPk = origRequestFindByPk
    }
})

test('requestController.update запрещает редактирование заявки со статусом cancelled', async () => {
    const origUserFindByPk = User.findByPk
    const origRequestFindByPk = Request.findByPk

    try {
        User.findByPk = async () => ({ id: 1, role: 'USER' })
        Request.findByPk = async () => ({
            id: 11,
            userId: 1,
            status: 'cancelled'
        })

        let err = null
        const req = {
            user: { id: 1, role: 'USER' },
            params: { id: 11 },
            body: { documentId: 2 }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.update(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 400)
        assert.equal(err.message, 'Нельзя редактировать завершенную или отклоненную заявку')
    } finally {
        User.findByPk = origUserFindByPk
        Request.findByPk = origRequestFindByPk
    }
})

test('requestController.update запрещает администратору менять завершенную заявку', async () => {
    const origUserFindByPk = User.findByPk
    const origRequestFindByPk = Request.findByPk

    try {
        User.findByPk = async () => ({ id: 2, role: 'ADMIN' })
        Request.findByPk = async () => ({
            id: 12,
            userId: 1,
            status: 'completed'
        })

        let err = null
        const req = {
            user: { id: 2, role: 'ADMIN' },
            params: { id: 12 },
            body: { status: 'pending' }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.update(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 400)
        assert.equal(err.message, 'Нельзя редактировать завершенную или отклоненную заявку')
    } finally {
        User.findByPk = origUserFindByPk
        Request.findByPk = origRequestFindByPk
    }
})

test('requestController.create возвращает 400 если указанный документ не существует', async () => {
    const { Document } = require('../models/models')
    const origUserFindByPk = User.findByPk
    const origDocFindByPk = Document.findByPk

    try {
        User.findByPk = async () => ({ id: 1, role: 'ADMIN' })
        Document.findByPk = async () => null

        let err = null
        const req = {
            user: { id: 1, role: 'ADMIN' },
            body: { documentId: 999, studentIds: [1] }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.create(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 400)
        assert.equal(err.message, 'Указанный документ не существует')
    } finally {
        User.findByPk = origUserFindByPk
        Document.findByPk = origDocFindByPk
    }
})

test('requestController.create возвращает 400 если указанные студенты не найдены', async () => {
    const { Document, Student } = require('../models/models')
    const origUserFindByPk = User.findByPk
    const origDocFindByPk = Document.findByPk
    const origStudentCount = Student.count

    try {
        User.findByPk = async () => ({ id: 1, role: 'ADMIN' })
        Document.findByPk = async () => ({ id: 1, document_name: 'Справка' })
        Student.count = async () => 0

        let err = null
        const req = {
            user: { id: 1, role: 'ADMIN' },
            body: { documentId: 1, studentIds: [999] }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.create(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 400)
        assert.equal(err.message, 'Один или несколько указанных студентов не найдены')
    } finally {
        User.findByPk = origUserFindByPk
        Document.findByPk = origDocFindByPk
        Student.count = origStudentCount
    }
})

// Проверка существования студента не должна обгонять проверку доступа:
// иначе 400 «не найдены» против 403 «только своего» превращают перебор id
// в способ узнать, существует ли студент с чужим id.

test('requestController.create отдаёт 403, а не 400, при несуществующем чужом студенте', async () => {
    const { Document, Student } = require('../models/models')
    const origUserFindByPk = User.findByPk
    const origDocFindByPk = Document.findByPk
    const origStudentFindAll = Student.findAll
    const origStudentCount = Student.count

    try {
        User.findByPk = async () => ({ id: 1, role: 'USER' })
        Document.findByPk = async () => ({ id: 1, document_name: 'Справка' })
        Student.findAll = async () => []
        Student.count = async () => 0

        let err = null
        const req = {
            user: { id: 1, role: 'USER' },
            body: { documentId: 1, studentIds: [999] }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.create(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 403)
        assert.match(err.message, /привязанного к вашему аккаунту/)
    } finally {
        User.findByPk = origUserFindByPk
        Document.findByPk = origDocFindByPk
        Student.findAll = origStudentFindAll
        Student.count = origStudentCount
    }
})

test('requestController.update отдаёт 403, а не 400, при несуществующем чужом студенте', async () => {
    const { Student } = require('../models/models')
    const origUserFindByPk = User.findByPk
    const origRequestFindByPk = Request.findByPk
    const origStudentFindAll = Student.findAll
    const origStudentCount = Student.count

    try {
        User.findByPk = async () => ({ id: 1, role: 'USER' })
        Request.findByPk = async () => ({ id: 10, userId: 1, status: 'pending' })
        Student.findAll = async () => []
        Student.count = async () => 0

        let err = null
        const req = {
            user: { id: 1, role: 'USER' },
            params: { id: 10 },
            body: { studentIds: [999] }
        }
        const res = { json: () => {} }
        const next = (e) => { err = e }

        await requestController.update(req, res, next)

        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 403)
        assert.match(err.message, /привязанного к вашему аккаунту/)
    } finally {
        User.findByPk = origUserFindByPk
        Request.findByPk = origRequestFindByPk
        Student.findAll = origStudentFindAll
        Student.count = origStudentCount
    }
})
