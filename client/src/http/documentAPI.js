import { $authHost } from "./index";

export const getDoc = async () => {
    const { data } = await $authHost.get('api/document')
    return data
}

export const createDoc = async (document_name) => {
    const { data } = $authHost.post('api/document', document_name)
    return data
}

export const deleteDoc = async (id) => {
    const { data } = $authHost.delete('api/document', id)
    return data
}