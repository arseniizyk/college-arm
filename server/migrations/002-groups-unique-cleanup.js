// sync({ alter: true }) на каждом старте добавлял ещё одно UNIQUE-ограничение
// на groups.group_number, не замечая уже существующие: на живой базе их 22
// (groups_group_number_key, ...key1 ... ...key21).
//
// Имена не хардкодим — в другом окружении нумерация другая. Список берём из
// pg_constraint. Сначала снимаем все ограничения, потом создаём одно: без
// транзакции падение между шагами оставило бы таблицу без уникальности, но
// umzug 3 миграции не оборачивает — это делает scripts/migrate.js.
// Дубликаты не восстановимы, поэтому down только пересоздаёт единственное
// ограничение в каноническом имени.

const KEEP_NAME = 'groups_group_number_key'

// Ограничение, а не индекс: unique:true в модели соответствует констрейнту,
// иначе sequelize (и любой инструмент, читающий pg_constraint) его не увидит.
async function createCanonicalConstraint(db) {
    await db.query(`DROP INDEX IF EXISTS "${KEEP_NAME}"`)
    await db.query(
        `ALTER TABLE "groups" ADD CONSTRAINT "${KEEP_NAME}" UNIQUE (group_number)`
    )
}

async function dropAllUniqueOnGroupNumber(db) {
    const [constraints] = await db.query(`
        SELECT con.conname AS name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'groups'
          AND nsp.nspname = 'public'
          AND con.contype = 'u'
          AND con.conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = rel.oid AND attname = 'group_number')
          ]::smallint[]
    `)

    for (const { name } of constraints) {
        await db.query(`ALTER TABLE "groups" DROP CONSTRAINT "${name}"`)
    }
    return constraints.map(c => c.name)
}

module.exports = {
    async up({ db }) {
        const dropped = await dropAllUniqueOnGroupNumber(db)
        if (dropped.length) {
            console.log(`  groups: снято дублей UNIQUE(group_number) — ${dropped.length}`)
        }
        await createCanonicalConstraint(db)
    },

    async down({ db }) {
        await dropAllUniqueOnGroupNumber(db)
        await createCanonicalConstraint(db)
    }
}