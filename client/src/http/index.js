import axios from "axios";
import { notify } from "../context/ToastContext";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:7000'

const $host = axios.create({
    baseURL: API_URL
})

const $authHost = axios.create({
    baseURL: API_URL
})

const MAX_ERROR_LENGTH = 300

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const BINARY_MIME = 'application/octet-stream'

const authInterceptor = (config) => {
    config.headers.authorization = `Bearer ${localStorage.getItem('token')}`
    return config
}

$authHost.interceptors.request.use(authInterceptor)

$authHost.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new Event('auth:logout'))
            }
        }
        return Promise.reject(error)
    }
)

const limit = (message) =>
    typeof message === 'string' && message.length > MAX_ERROR_LENGTH
        ? `${message.slice(0, MAX_ERROR_LENGTH)}…`
        : message

const extractErrorMessage = async (blob) => {
    if (!blob) return 'Ошибка запроса'
    let text = ''
    try {
        text = await blob.text()
    } catch {
        return 'Ошибка запроса'
    }
    try {
        const parsed = JSON.parse(text)
        if (parsed && parsed.message) return limit(parsed.message)
    } catch {
        // не JSON — падаем на текст ниже
    }
    const trimmed = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return limit(trimmed) || 'Ошибка запроса'
}

const errorMessage = (err, fallback = 'Ошибка запроса') => {
    const fromServer = err?.response?.data?.message
    if (typeof fromServer === 'string' && fromServer) return limit(fromServer)
    return err?.message || fallback
}

const saveBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Firefox обрывает загрузку, если URL отозван в том же тике
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

const downloadDoc = async (path, { method = 'POST', payload = null, params = null, fileName = 'документ', stamp = null } = {}) => {
    const suffix = stamp === null || stamp === undefined ? Date.now() : stamp
    const name = `${fileName}_${suffix}.docx`

    notify({
        title: 'Формирование документа',
        message: `Формирование документа «${fileName}»... Пожалуйста, подождите.`,
        variant: 'info'
    })

    const config = { method, url: path, responseType: 'blob' }
    if (params) config.params = params
    if (payload) {
        if (method === 'GET') throw new Error('Тело запроса не поддерживается при GET — передайте params')
        config.data = payload
    }

    let response
    try {
        response = await $authHost.request(config)
    } catch (err) {
        const message = await extractErrorMessage(err.response?.data)
        notify({
            title: 'Ошибка загрузки',
            message,
            variant: 'danger',
            autohide: false
        })
        throw new Error(message, { cause: err })
    }

    const contentType = response.headers['content-type'] || ''
    if (!contentType.includes(DOCX_MIME) && !contentType.includes(BINARY_MIME)) {
        const errMessage = `Сервер вернул не документ (${contentType || 'без типа содержимого'})`
        notify({
            title: 'Ошибка типа документа',
            message: errMessage,
            variant: 'danger',
            autohide: false
        })
        throw new Error(errMessage)
    }

    saveBlob(response.data, name)
    notify({
        title: 'Документ загружен',
        message: `Файл «${name}» успешно сохранен`,
        variant: 'success'
    })
    return name
}

export {
    $host,
    $authHost,
    downloadDoc,
    errorMessage
}
