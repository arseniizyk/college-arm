const Router = require('express')
const router = new Router()

const userRouter = require('./userRouter')
const documentRouter = require('./documentRouter')
const groupRouter = require('./groupRouter')
const requestRouter = require('./requestRouter')
const specialtyRouter = require('./specialtyRouter')
const teacherRouter = require('./teacherRouter')
const studentRouter = require('./studentRouter')
const notificationRouter = require('./notificationRouter')
const documentGeneratorRouter = require('./documentGeneratorRouter')
const backupRouter = require('./backupRouter')


router.use('/user', userRouter)
router.use('/document', documentRouter)
router.use('/group', groupRouter)
router.use('/request', requestRouter)
router.use('/specialty', specialtyRouter)
router.use('/teacher', teacherRouter)
router.use('/student', studentRouter)
router.use('/notification', notificationRouter)
router.use('/generate', documentGeneratorRouter)
router.use('/backup', backupRouter)


module.exports = router