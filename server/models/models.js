const sequelize = require('../db')
const { DataTypes } = require('sequelize')

const Group = sequelize.define('group', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    group_number: { type: DataTypes.STRING, unique: true, allowNull: false },
    enroll_date: { type: DataTypes.DATE, allowNull: false },
    payment_type: { 
        type: DataTypes.ENUM, 
        values: ['платной', 'бесплатной'], 
        defaultValue: 'платной',
        allowNull: false 
    }
})

const Specialty = sequelize.define('specialty', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    qualification: { type: DataTypes.STRING, allowNull: false },
    duration_years: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    duration_months: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
})

const Student = sequelize.define('student', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    last_name: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    father_name: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
    order_number: { type: DataTypes.STRING, allowNull: false },
    enroll_date: { type: DataTypes.DATE, allowNull: false },
    expell_date: { type: DataTypes.DATE },
    expell_reason: { type: DataTypes.TEXT }
})
 
// Куратор принадлежит группе, поэтому запись на группу одна: unique выражает
// это ограничение явно, hasOne его не создаёт. allowNull обязателен — FK
// ON DELETE SET NULL обнуляет groupId, а unique не запрещает несколько NULL.
const Supervisor = sequelize.define('supervisor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    groupId: { type: DataTypes.INTEGER, unique: true, allowNull: true }
})

const Teacher = sequelize.define('teacher', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    last_name: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    father_name: { type: DataTypes.STRING, allowNull: true, defaultValue: '' }
})

const Document = sequelize.define('document', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    document_name: { type: DataTypes.STRING, allowNull: false },
})

const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: "ADMIN", allowNull: false }
}, {
    defaultScope: { attributes: { exclude: ['password'] } },
    // Логин нечувствителен к регистру, поэтому уникальность функциональная.
    // Реальный индекс создаёт миграция 005 — sync() в проекте больше нет.
    indexes: [
        { name: 'users_email_lower_key', unique: true, fields: [sequelize.fn('lower', sequelize.col('email'))] }
    ]
})

const USER_WITH_PASSWORD = 'withPassword'
User.addScope(USER_WITH_PASSWORD, { attributes: { include: ['password'] } })

Specialty.hasMany(Group)
Group.belongsTo(Specialty)

Group.hasOne(Supervisor)
Supervisor.belongsTo(Group)

Group.hasMany(Student)
Student.belongsTo(Group)

Teacher.hasOne(Supervisor)
Supervisor.belongsTo(Teacher)

module.exports = {
    Specialty,
    Group,
    Supervisor,
    Teacher,
    Document,
    Student,
    User,
    USER_WITH_PASSWORD
}
