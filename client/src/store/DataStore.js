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
  async _makeRequest(entityType, requestFn, { silent = false } = {}) {
    if (!silent) {
      this._setLoading(entityType, true)
    }
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
      if (!silent) {
        runInAction(() => {
          this._loading[entityType] = false
        })
      }
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
  // options.silent — не поднимать флаг загрузки: список должен обновиться
  // на месте, не подменяясь в компоненте спиннером
  async fetchAll(entityType, params = {}, { silent = false } = {}) {
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
      , { silent })
      
      // Обрабатываем ответ в зависимости от структуры
      let entities;
      if (entityType === 'students' && data.students) {
        // Новый формат ответа для студентов с пагинацией
        entities = data.students;
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
        // Новый массив, а не push: списки мемоизированы по ссылке
        this._entities[entityType] = [...this._entities[entityType], createdData]

        // Обновляем _allStudents при создании студента
        if (entityType === 'students') {
          this._allStudents = [...this._allStudents, createdData]
        }
      })
      
      return createdData
    } catch (error) {
      throw error
    }
  }

  // Обновление записи
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

  // Замена элемента с пересозданием массива: мутация по индексу оставляет
  // ссылку прежней, и useMemo в списках возвращает устаревшие объекты
  _replaceItem(entityType, id, updates) {
    const list = this._entities[entityType]
    const index = list.findIndex(item => item.id === id)
    if (index === -1) return

    this._entities[entityType] = [
      ...list.slice(0, index),
      { ...list[index], ...updates },
      ...list.slice(index + 1)
    ]

    // Обновляем _allStudents при обновлении студента
    if (entityType === 'students') {
      this._allStudents = this._allStudents.map(
        item => (item.id === id ? { ...item, ...updates } : item)
      )
    }
  }

  // Обновление поля записи без запроса к серверу (для локального обновления)
  updateLocal(entityType, id, updates) {
    runInAction(() => {
      this._replaceItem(entityType, id, updates)
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
}