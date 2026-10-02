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
