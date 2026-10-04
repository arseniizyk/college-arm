const test = require('node:test');
const assert = require('node:assert/strict');
const ApiError = require('../error/ApiError');
const studentController = require('./studentController');
const { Student, Group, User } = require('../models/models');

test('studentController.create возвращает 400 если expell_date раньше enroll_date', async () => {
    const origGroupFindByPk = Group.findByPk;
    const origUserFindByPk = User.findByPk;

    try {
        Group.findByPk = async () => ({ id: 1 });
        User.findByPk = async () => ({ id: 1 });

        let err = null;
        const req = {
            body: {
                last_name: 'Иванов',
                name: 'Иван',
                order_number: '123-у',
                enroll_date: '2025-09-01',
                expell_date: '2024-09-01',
                groupId: 1
            }
        };
        const res = { json: () => {} };
        const next = (e) => { err = e; };

        await studentController.create(req, res, next);

        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.message, 'Дата отчисления не может быть раньше даты зачисления');
    } finally {
        Group.findByPk = origGroupFindByPk;
        User.findByPk = origUserFindByPk;
    }
});

test('studentController.create возвращает 400 если указанная группа не существует', async () => {
    const origGroupFindByPk = Group.findByPk;

    try {
        Group.findByPk = async () => null;

        let err = null;
        const req = {
            body: {
                last_name: 'Иванов',
                name: 'Иван',
                order_number: '123-у',
                enroll_date: '2025-09-01',
                groupId: 999
            }
        };
        const res = { json: () => {} };
        const next = (e) => { err = e; };

        await studentController.create(req, res, next);

        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.message, 'Указанная группа не существует');
    } finally {
        Group.findByPk = origGroupFindByPk;
    }
});

test('studentController.update возвращает 400 если expell_date раньше enroll_date', async () => {
    const origStudentFindByPk = Student.findByPk;

    try {
        Student.findByPk = async () => ({
            id: 1,
            enroll_date: new Date('2025-09-01'),
            expell_date: null,
            update: async () => {}
        });

        let err = null;
        const req = {
            params: { id: 1 },
            body: {
                expell_date: '2024-01-01'
            }
        };
        const res = { json: () => {} };
        const next = (e) => { err = e; };

        await studentController.update(req, res, next);

        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.message, 'Дата отчисления не может быть раньше даты зачисления');
    } finally {
        Student.findByPk = origStudentFindByPk;
    }
});
