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
    expell_date: { type: DataTypes.DATE }
})
 
const Supervisor = sequelize.define('supervisor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
})

const Teacher = sequelize.define('teacher', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    last_name: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    father_name: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
})

const Request = sequelize.define('request', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { 
        type: DataTypes.ENUM, 
        values: ['in_progress', 'completed', 'rejected'], 
        defaultValue: 'in_progress' 
    },
    description: { type: DataTypes.STRING },
    isViewed: { type: DataTypes.BOOLEAN, defaultValue: false }
})

const Document = sequelize.define('document', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    document_name: { type: DataTypes.STRING, allowNull: false },
})

const StudentRequest = sequelize.define('student_request', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
})

const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: "USER", allowNull: false }
}, {
    defaultScope: { attributes: { exclude: ['password'] } }
})

const USER_WITH_PASSWORD = 'withPassword'
User.addScope(USER_WITH_PASSWORD, { attributes: { include: ['password'] } })

const Notification = sequelize.define('notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.STRING },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
}) 


Specialty.hasMany(Group)
Group.belongsTo(Specialty)

Group.hasOne(Supervisor)
Supervisor.belongsTo(Group)

Group.hasMany(Student)
Student.belongsTo(Group)

Teacher.hasOne(Supervisor)
Supervisor.belongsTo(Teacher)

Document.hasMany(Request)
Request.belongsTo(Document)

User.hasMany(Request)
Request.belongsTo(User)

User.hasMany(Notification)
Notification.belongsTo(User)

Student.belongsToMany(Request, { through: StudentRequest })
Request.belongsToMany(Student, { through: StudentRequest })


module.exports = {
    Specialty,
    Group,
    Supervisor,
    Teacher,
    Document,
    Request,
    Student,
    StudentRequest,
    User,
    Notification,
    USER_WITH_PASSWORD
}