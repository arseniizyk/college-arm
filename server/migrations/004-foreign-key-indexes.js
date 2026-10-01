// Ни Postgres, ни Sequelize не создают индексы на внешних ключи. На
// текущем объёме (десятки строк) это незаметно, но каждый JOIN по
// userId/groupId/documentId scan-ает таблицу целиком.
//
// Обычный CREATE INDEX, а не CONCURRENTLY: миграция идёт в транзакции, а
// CONCURRENTLY в ней не работает и на падении оставляет INVALID-индекс,
// который следующий IF NOT EXISTS молча пропустит. Цена — SHARE-блокировка
// таблицы на время построения.

const INDEXES = [
    ['groups_specialtyId_idx', '"groups"', '"specialtyId"'],
    ['students_groupId_idx', 'students', '"groupId"'],
    ['students_userId_idx', 'students', '"userId"'],
    ['teachers_userId_idx', 'teachers', '"userId"'],
    ['supervisors_teacherId_idx', 'supervisors', '"teacherId"'],
    ['requests_documentId_idx', 'requests', '"documentId"'],
    ['requests_userId_idx', 'requests', '"userId"'],
    ['notifications_userId_idx', 'notifications', '"userId"'],
    ['notifications_requestId_idx', 'notifications', '"requestId"'],
    ['student_requests_studentId_idx', 'student_requests', '"studentId"'],
    ['student_requests_requestId_idx', 'student_requests', '"requestId"']
]

module.exports = {
    async up({ db }) {
        for (const [name, table, column] of INDEXES) {
            await db.query(
                `CREATE INDEX IF NOT EXISTS "${name}" ON ${table} (${column})`
            )
        }
    },

    async down({ db }) {
        for (const [name] of [...INDEXES].reverse()) {
            await db.query(`DROP INDEX IF EXISTS "${name}"`)
        }
    }
}