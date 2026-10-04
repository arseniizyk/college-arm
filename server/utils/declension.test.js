const test = require('node:test');
const assert = require('node:assert/strict');
const { detectGender, declineFullName, declineFullNameAccusative } = require('./declension');

test('detectGender определяет пол по отчеству', () => {
    assert.equal(detectGender('Иванович'), 'male');
    assert.equal(detectGender('Петровна'), 'female');
    assert.equal(detectGender('Сергеевна'), 'female');
    assert.equal(detectGender('Ильинична'), 'female');
    assert.equal(detectGender('Кузьмич'), 'male');
});

test('detectGender определяет пол по имени при отсутствии отчества', () => {
    assert.equal(detectGender('', 'Анна'), 'female');
    assert.equal(detectGender(null, 'Мария'), 'female');
    assert.equal(detectGender(undefined, 'Дарья'), 'female');
    assert.equal(detectGender('', 'Иван'), 'male');
    assert.equal(detectGender('', 'Алексей'), 'male');
});

test('detectGender учитывает мужские имена-исключения на а/я', () => {
    assert.equal(detectGender('', 'Илья'), 'male');
    assert.equal(detectGender('', 'Никита'), 'male');
    assert.equal(detectGender('', 'Данила'), 'male');
    assert.equal(detectGender('', 'Кузьма'), 'male');
    assert.equal(detectGender('', 'Лука'), 'male');
    assert.equal(detectGender('', 'Фома'), 'male');
    assert.equal(detectGender('', 'Савва'), 'male');
});

test('declineFullName корректно склоняет ФИО в дательный падеж с учетом пола без отчества', () => {
    const declinedFemale = declineFullName('Ведерникова', 'Мария', '');
    assert.equal(declinedFemale.lastName, 'Ведерниковой');
    assert.equal(declinedFemale.firstName, 'Марии');

    const declinedMale = declineFullName('Иванов', 'Илья', '');
    assert.equal(declinedMale.lastName, 'Иванову');
    assert.equal(declinedMale.firstName, 'Илье');
});

test('declineFullNameAccusative корректно склоняет ФИО в винительный падеж без отчества', () => {
    const declinedFemale = declineFullNameAccusative('Ведерникова', 'Мария', '');
    assert.equal(declinedFemale.lastName, 'Ведерникову');
    assert.equal(declinedFemale.firstName, 'Марию');

    const declinedMale = declineFullNameAccusative('Иванов', 'Никита', '');
    assert.equal(declinedMale.lastName, 'Иванова');
    assert.equal(declinedMale.firstName, 'Никиту');
});
