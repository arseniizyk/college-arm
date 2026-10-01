// store/DataStore.js
import { makeAutoObservable, runInAction } from 'mobx'
import { $authHost } from '../http'

// Константы для типов сущностей
const ENTITY_TYPES = [
  'users',
  'groups',
  'students',
  'specialties',
  'teachers',
  'documents',
  'requests',
  'supervisors',
  'notifications'
]

// Маппинг эндпоинтов
const ENDPOINTS = {
  users: '/api/user',
  groups: '/api/group',
  students: '/api/student',
  specialties: '/api/specialty',
  teachers: '/api/teacher',
  documents: '/api/document',
  requests: '/api/request',
  supervisors: '/api/supervisor',
  notifications: '/api/notification'
}

export default class DataStore {
  constructor() {
    this._entities = {}
    this._loading = {}
    this._errors = {}
    this._pagination = null
    this._allStudents = [] // Полный список студентов без фильтрации

    // Инициализируем пустые массивы для всех типов
    ENTITY_TYPES.forEach(type => {
      this._entities[type] = []
      this._loading[type] = false
      this._errors[type] = null
    })

    makeAutoObservable(this)
  }

  // ========== PRIVATE HELPERS ==========

  // Универсальный метод для выполнения запросов
  async _makeRequest(entityType, requestFn) {
    this._setLoading(entityType, true)
    this._clearError(entityType)
    
    try {
      const response = await requestFn()
      const data = response.data // Извлекаем данные из ответа
      return data
    } catch (error) {
      runInAction(() => {
        this._errors[entityType] = error.response?.data?.message || error.message || 'Ошибка запроса'
      })
      throw error
    } finally {
      runInAction(() => {
        this._loading[entityType] = false
      })
    }
  }

  // Приватные сеттеры
  _setLoading(entityType, isLoading) {
    this._loading[entityType] = isLoading
  }

  _clearError(entityType) {
    this._errors[entityType] = null
  }

  // ========== PUBLIC CRUD METHODS ==========

  // Получение всех записей
  async fetchAll(entityType, params = {}) {
    try {
      // Формируем URL с параметрами запроса
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
      )
      
      // Обрабатываем ответ в зависимости от структуры
      let entities;
      if (entityType === 'students' && data.students) {
        // Новый формат ответа для студентов с пагинацией
        entities = data.students;
        // Сохраняем информацию о пагинации
        this._pagination = data.pagination || null;
      } else {
        entities = data || [];
      }
      
      runInAction(() => {
        this._entities[entityType] = entities
        
        // Сохраняем полный список студентов при первой загрузке без параметров
        if (entityType === 'students' && Object.keys(params).length === 0) {
          this._allStudents = entities
        }
      })
      
      return this._entities[entityType]
    } catch (error) {
      throw error
    }
  }

  // Получение заявок текущего пользователя (фильтрация на сервере)
  async fetchMyRequests() {
    const data = await this._makeRequest('requests', () =>
      $authHost.get(`${ENDPOINTS.requests}/mine`)
    )

    const entities = data || []

    runInAction(() => {
      this._entities.requests = entities
    })

    return entities
  }

  // Создание записи
  async create(entityType, data) {
    try {
      const createdData = await this._makeRequest(entityType, () =>
        $authHost.post(ENDPOINTS[entityType], data)
      )
      
      runInAction(() => {
        this._entities[entityType].push(createdData)
        
        // Обновляем _allStudents при создании студента
        if (entityType === 'students') {
          this._allStudents.push(createdData)
        }
      })
      
      return createdData
    } catch (error) {
      throw error
    }
  }

  // Обновление записи
  async update(entityType, id, data) {
    try {
      const updatedData = await this._makeRequest(entityType, () =>
        $authHost.put(`${ENDPOINTS[entityType]}/${id}`, data)
      )
      
      runInAction(() => {
        const index = this._entities[entityType].findIndex(item => item.id === id)
        if (index !== -1) {
          this._entities[entityType][index] = { ...this._entities[entityType][index], ...updatedData }
        }
        
        // Обновляем _allStudents при обновлении студента
        if (entityType === 'students') {
          const allIndex = this._allStudents.findIndex(item => item.id === id)
          if (allIndex !== -1) {
            this._allStudents[allIndex] = { ...this._allStudents[allIndex], ...updatedData }
          }
        }
      })
      
      return updatedData
    } catch (error) {
      throw error
    }
  }

  // Обновление поля записи без запроса к серверу (для локального обновления)
  updateLocal(entityType, id, updates) {
    runInAction(() => {
      const index = this._entities[entityType].findIndex(item => item.id === id)
      if (index !== -1) {
        this._entities[entityType][index] = { ...this._entities[entityType][index], ...updates }
      }
      
      // Обновляем _allStudents при обновлении студента
      if (entityType === 'students') {
        const allIndex = this._allStudents.findIndex(item => item.id === id)
        if (allIndex !== -1) {
          this._allStudents[allIndex] = { ...this._allStudents[allIndex], ...updates }
        }
      }
    })
  }

  // Очистка списка сущности без запроса к серверу (например, при выходе из аккаунта)
  clear(entityType) {
    runInAction(() => {
      this._entities[entityType] = []
    })
  }

  // Удаление записи - ИСПРАВЛЕННАЯ ВЕРСИЯ
  async delete(entityType, id) {
    // Сохраняем текущее состояние для возможного отката
    const oldItems = [...this._entities[entityType]]
    const oldAllStudents = entityType === 'students' ? [...this._allStudents] : null
    
    try {
      // Оптимистичное удаление
      runInAction(() => {
        this._entities[entityType] = oldItems.filter(item => item.id !== id)
        
        // Обновляем _allStudents при удалении студента
        if (entityType === 'students') {
          this._allStudents = this._allStudents.filter(item => item.id !== id)
        }
      })
      
      await this._makeRequest(entityType, () =>
        $authHost.delete(`${ENDPOINTS[entityType]}/${id}`)
      )
      
      return true
    } catch (error) {
      // Откат при ошибке
      runInAction(() => {
        this._entities[entityType] = oldItems
        
        // Откатываем _allStudents при ошибке
        if (entityType === 'students' && oldAllStudents) {
          this._allStudents = oldAllStudents
        }
      })
      throw error
    }
  }

  // ========== GETTERS ==========

  // Геттер для всех сущностей
  get entities() {
    return this._entities
  }

  // Геттеры для отдельных типов (гарантированно возвращают массивы)
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

  get documents() {
    return Array.isArray(this._entities.documents) ? this._entities.documents : []
  }

  get requests() {
    return Array.isArray(this._entities.requests) ? this._entities.requests : []
  }

  get supervisors() {
    return Array.isArray(this._entities.supervisors) ? this._entities.supervisors : []
  }

  get notifications() {
    return Array.isArray(this._entities.notifications) ? this._entities.notifications : []
  }

  // ========== UTILITY METHODS ==========

  // Проверка загрузки
  isLoading(entityType) {
    return this._loading[entityType] || false
  }

  // Получение ошибки
  getError(entityType) {
    return this._errors[entityType] || null
  }

  // Очистка ошибки
  clearError(entityType) {
    this._errors[entityType] = null
  }

  // Очистка всех ошибок
  clearAllErrors() {
    ENTITY_TYPES.forEach(type => {
      this._errors[type] = null
    })
  }

  // Поиск по ID
  findById(entityType, id) {
    const items = this._entities[entityType] || []
    return items.find(item => item.id === id)
  }

  // Поиск по полю
  findByField(entityType, fieldName, value) {
    const items = this._entities[entityType] || []
    return items.find(item => item[fieldName] === value)
  }

  // Фильтрация
  filter(entityType, predicate) {
    const items = this._entities[entityType] || []
    return items.filter(predicate)
  }

  // Получение статистики
  getStatistics() {
    return {
      users: this.users.length,
      groups: this.groups.length,
      students: this.students.length,
      specialties: this.specialties.length,
      teachers: this.teachers.length,
      documents: this.documents.length,
      requests: this.requests.length,
      supervisors: this.supervisors.length,
      notifications: this.notifications.length
    }
  }

  // Получение информации о пагинации
  get pagination() {
    return this._pagination
  }
}