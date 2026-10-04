const test = require('node:test');
const assert = require('node:assert/strict');
const ApiError = require('../error/ApiError');
const specialtyController = require('./specialtyController');
const { Specialty, Group } = require('../models/models');

test('specialtyController.delete запрещает удаление специальности, к которой привязаны группы', async () => {
    const origSpecFindByPk = Specialty.findByPk;
    const origGroupCount = Group.count;

    try {
        Specialty.findByPk = async () => ({ id: 1 });
        Group.count = async () => 2;

        let err = null;
        const req = { params: { id: 1 } };
        const res = { json: () => {} };
        const next = (e) => { err = e; };

        await specialtyController.delete(req, res, next);

        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.match(err.message, /Невозможно удалить специальность, к которой привязаны группы/);
    } finally {
        Specialty.findByPk = origSpecFindByPk;
        Group.count = origGroupCount;
    }
});
