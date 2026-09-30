// Express 4 не перехватывает rejected promise из async-обработчиков —
// обёртка передаёт их в next(), чтобы ошибка дошла до ErrorHandlingMiddleware.
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
}

// Методы контроллера лежат на прототипе класса, а не в own-свойствах объекта,
// поэтому обходим цепочку прототипов, а не Object.entries
const wrapController = (controller) => {
    const names = new Set()
    for (let obj = controller; obj && obj !== Object.prototype; obj = Object.getPrototypeOf(obj)) {
        for (const name of Object.getOwnPropertyNames(obj)) {
            names.add(name)
        }
    }
    names.delete('constructor')

    const wrapped = {}
    for (const name of names) {
        const value = controller[name]
        wrapped[name] = typeof value === 'function'
            ? asyncHandler(value.bind(controller))
            : value
    }
    return wrapped
}

module.exports = asyncHandler
module.exports.wrapController = wrapController
