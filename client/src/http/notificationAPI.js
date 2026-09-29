import { $authHost } from './index'

export const fetchNotifications = async () => {
    const { data } = await $authHost.get('api/notification')
    return data
}

export const markNotificationAsRead = async (id) => {
    const { data } = await $authHost.put(`api/notification/${id}/read`)
    return data
}

export const markAllNotificationsAsRead = async () => {
    const { data } = await $authHost.put('api/notification/read-all')
    return data
}

export const deleteNotification = async (id) => {
    const { data } = await $authHost.delete(`api/notification/${id}`)
    return data
}

export const deleteAllNotifications = async () => {
    const { data } = await $authHost.delete('api/notification')
    return data
}
