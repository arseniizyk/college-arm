import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:7000'

const $host = axios.create({
    baseURL: API_URL
})

const $authHost = axios.create({
    baseURL: API_URL
})

const authInterceptor = (config) => {
    config.headers.authorization = `Bearer ${localStorage.getItem('token')}`
    return config
}

$authHost.interceptors.request.use(authInterceptor)

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
        if (parsed && parsed.message) return parsed.message
    } catch {
        // не JSON — падаем на текст ниже
    }
    const trimmed = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return trimmed || 'Ошибка запроса'
}

const errorMessage = (err, fallback = 'Ошибка запроса') => {
    const fromServer = err?.response?.data?.message
    if (typeof fromServer === 'string' && fromServer) return fromServer
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

const downloadDoc = async (path, { method = 'POST', payload = null, fileName = 'документ', stamp = null } = {}) => {
    const suffix = stamp === null || stamp === undefined ? Date.now() : stamp
    const name = `${fileName}_${suffix}.docx`

    const config = { method, url: path, responseType: 'blob' }
    if (method !== 'GET' && payload) config.data = payload

    let response
    try {
        response = await $authHost.request(config)
    } catch (err) {
        const message = await extractErrorMessage(err.response?.data)
        throw new Error(message, { cause: err })
    }

    saveBlob(response.data, name)
    return name
}

export {
    $host,
    $authHost,
    downloadDoc,
    errorMessage
}
