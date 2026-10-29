// store/DataStore.js
import { makeAutoObservable, runInAction } from 'mobx'
import { $authHost } from '../http'

// Константы для типов сущностей
const ENTITY_TYPES = [
  'users',
  'groups',
  'students',
  'specialties',
  'teachers'
]

// Маппинг эндпоинтов
const ENDPOINTS = {
  users: '/api/user',
  groups: '/api/group',
  students: '/api/student',
  specialties: '/api/specialty',
  teachers: '/api/teacher'
}

export default class DataStore {
  constructor() {
    this._entities = {}
    this._loading = {}
    this._errors = {}
    this._allStudents = [] // Полный список студентов без фильтрации

    ENTITY_TYPES.forEach(type => {
      this._entities[type] = []
      this._loading[type] = false
      this._errors[type] = null
    })

    makeAutoObservable(this)
  }

  // ========== PRIVATE HELPERS ==========

  async _makeRequest(entityType, requestFn, { silent = false } = {}) {
    if (!silent) {
      this._setLoading(entityType, true)
    }
    this._clearError(entityType)

    try {
      const response = await requestFn()
      const data = response.data
      return data
    } catch (error) {
      runInAction(() => {
        this._errors[entityType] = error.response?.data?.message || error.message || 'Ошибка запроса'
      })
      throw error
    } finally {
      if (!silent) {
        runInAction(() => {
          this._loading[entityType] = false
        })
      }
    }
  }

  _setLoading(entityType, isLoading) {
    this._loading[entityType] = isLoading
  }

  _clearError(entityType) {
    this._errors[entityType] = null
  }

  // ========== PUBLIC CRUD METHODS ==========

  async fetchAll(entityType, params = {}, { silent = false } = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });
      
      const url = queryParams.toString() 
        ? `${ENDPOINTS[entityType]}?${queryParams.toString()}`
        : ENDPOINTS[entityType];

      const data = await this._makeRequest(entityType, () =>
        $authHost.get(url)
      , { silent });

      const items = Array.isArray(data) 
        ? data 
        : (data && Array.isArray(data[entityType])) 
          ? data[entityType] 
          : [];

      runInAction(() => {
        this._entities[entityType] = items;
        
        if (entityType === 'students' && (!params || Object.keys(params).length === 0)) {
          this._allStudents = items;
        }
      });

      return data;
    } catch (error) {
      throw error;
    }
  }

  async create(entityType, data) {
    try {
      const createdData = await this._makeRequest(entityType, () =>
        $authHost.post(ENDPOINTS[entityType], data)
      )
      
      runInAction(() => {
        this._entities[entityType] = [...this._entities[entityType], createdData]

        if (entityType === 'students') {
          this._allStudents = [...this._allStudents, createdData]
        }
      })
      
      return createdData
    } catch (error) {
      throw error
    }
  }

  async update(entityType, id, data, { silent = false } = {}) {
    try {
      const updatedData = await this._makeRequest(entityType, () =>
        $authHost.put(`${ENDPOINTS[entityType]}/${id}`, data)
      , { silent })

      runInAction(() => {
        this._replaceItem(entityType, id, updatedData)
      })
      
      return updatedData
    } catch (error) {
      throw error
    }
  }

  _replaceItem(entityType, id, updates) {
    const list = this._entities[entityType]
    if (list) {
      const index = list.findIndex(item => item.id === id)
      if (index !== -1) {
        this._entities[entityType] = [
          ...list.slice(0, index),
          { ...list[index], ...updates },
          ...list.slice(index + 1)
        ]
      }
    }

    if (entityType === 'students') {
      this._allStudents = this._allStudents.map(
        item => (item.id === id ? { ...item, ...updates } : item)
      )
    }
  }

  updateLocal(entityType, id, updates) {
    runInAction(() => {
      this._replaceItem(entityType, id, updates)
    })
  }

  clear(entityType) {
    runInAction(() => {
      if (this._entities[entityType]) {
        this._entities[entityType] = []
      }
    })
  }

  reset() {
    runInAction(() => {
      ENTITY_TYPES.forEach(type => {
        this._entities[type] = []
        this._loading[type] = false
        this._errors[type] = null
      })
      this._allStudents = []
    })
  }

  async delete(entityType, id) {
    const oldItems = [...this._entities[entityType]]
    const oldAllStudents = entityType === 'students' ? [...this._allStudents] : null
    
    try {
      runInAction(() => {
        this._entities[entityType] = oldItems.filter(item => item.id !== id)
        
        if (entityType === 'students') {
          this._allStudents = this._allStudents.filter(item => item.id !== id)
        }
      })
      
      await this._makeRequest(entityType, () =>
        $authHost.delete(`${ENDPOINTS[entityType]}/${id}`)
      )
      
      return true
    } catch (error) {
      runInAction(() => {
        this._entities[entityType] = oldItems
        
        if (entityType === 'students' && oldAllStudents) {
          this._allStudents = oldAllStudents
        }
      })
      throw error
    }
  }

  // ========== GETTERS ==========

  get users() {
    return Array.isArray(this._entities.users) ? this._entities.users : []
  }

  get groups() {
    return Array.isArray(this._entities.groups) ? this._entities.groups : []
  }

  get students() {
    return Array.isArray(this._entities.students) ? this._entities.students : []
  }

  get allStudents() {
    return Array.isArray(this._allStudents) ? this._allStudents : []
  }

  get specialties() {
    return Array.isArray(this._entities.specialties) ? this._entities.specialties : []
  }

  get teachers() {
    return Array.isArray(this._entities.teachers) ? this._entities.teachers : []
  }

  getEntities(entityType) {
    if (entityType === 'allStudents') return this.allStudents
    return Array.isArray(this._entities[entityType]) ? this._entities[entityType] : []
  }

  // ========== UTILITY METHODS ==========

  isLoading(entityType) {
    return this._loading[entityType] || false
  }

  getError(entityType) {
    return this._errors[entityType] || null
  }

  clearError(entityType) {
    this._errors[entityType] = null
  }
}
