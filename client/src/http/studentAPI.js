import { $authHost } from "./index";

export const getStud = async () => {
    const { data } = await $authHost.get('api/student')
    return data
}

export const createStud = async (last_name, name, father_name, order_number, enroll_date, groupId, expell_date) => {
    const { data } = $authHost.post('api/student', last_name, name, father_name, order_number, enroll_date, groupId, expell_date)
    return data
}

export const deleteStud = async (id) => {
    const { data } = $authHost.delete('api/student', id)
    return data
}