import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTableData, filterData, prepareFormData, getNameById } from '../utils/dataHelpers';
import { getDefaultFormData } from '../utils/tableConfig';

export const useAdminLogic = (data, user) => {
    const [activeTab, setActiveTab] = useState('users');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const dataLoadedRef = useRef(false); // Используем ref вместо state для предотвращения ре-рендеров

    // Получаем информацию о текущем пользователе
    const currentUser = user.getUser();
    const userRole = currentUser?.role || 'USER';

    // Состояния для модальных окон
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({});

    // Пагинация и поиск
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
    const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('');

    // Загружаем данные при монтировании компонента
    useEffect(() => {
        // Проверяем, не загружены ли уже данные
        if (dataLoadedRef.current) {
            return;
        }

        const loadAllData = async () => {
            dataLoadedRef.current = true;
            setLoading(true);
            try {
                await Promise.all([
                    data.fetchAll('users'),
                    data.fetchAll('groups'),
                    data.fetchAll('students'),
                    data.fetchAll('specialties'),
                    data.fetchAll('teachers'),
                    data.fetchAll('documents'),
                    data.fetchAll('requests')
                ]);
            } catch (err) {
                setError('Ошибка загрузки данных');
                dataLoadedRef.current = false;
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Пустой массив зависимостей - выполняется только при монтировании

    // Загрузка данных для текущей вкладки
    const loadTableData = useCallback(async (tableName, searchParams = {}) => {
        setLoading(true);
        setError(null);
        try {
            await data.fetchAll(tableName, searchParams);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    }, [data]);

    // Функция для обновления поискового термина (клиентская фильтрация)
    const handleStudentSearch = useCallback((searchValue) => {
        setSearchTerm(searchValue);
    }, []);

    // Функция для обновления фильтра группы (клиентская фильтрация)
    const handleGroupFilterChange = useCallback((groupId) => {
        setSelectedGroupFilter(groupId);
    }, []);

    // Функция для обновления фильтра роли (клиентская фильтрация)
    const handleRoleFilterChange = useCallback((role) => {
        setSelectedRoleFilter(role);
    }, []);

    // Функция для обновления фильтра статуса (клиентская фильтрация)
    const handleStatusFilterChange = useCallback((status) => {
        setSelectedStatusFilter(status);
    }, []);

    // Функция для обновления фильтра специальности (клиентская фильтрация)
    const handleSpecialtyFilterChange = useCallback((specialtyId) => {
        setSelectedSpecialtyFilter(specialtyId);
    }, []);

    // Функция для изменения статуса заявки
    const handleRequestStatusChange = useCallback(async (requestId, newStatus) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const request = data.requests.find(r => r.id === requestId);
            if (!request) {
                setError('Заявка не найдена');
                return;
            }

            // Подготавливаем данные для обновления
            const updateData = {
                documentId: request.documentId,
                description: request.description,
                studentIds: request.students.map(s => s.id),
                status: newStatus
            };

            await data.update('requests', requestId, updateData);
            
            // Перезагружаем заявки и уведомления после изменения статуса
            await Promise.all([
                data.fetchAll('requests'),
                data.fetchAll('notifications')
            ]);
            
            // Определяем название статуса для сообщения
            const statusNames = {
                in_progress: 'В обработке',
                completed: 'Завершено',
                rejected: 'Отклонено'
            };
            
            setSuccess(`Статус заявки #${requestId} изменен на "${statusNames[newStatus] || newStatus}"`);
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка изменения статуса');
        } finally {
            setLoading(false);
        }
    }, [data]);

    // Открытие модальных окон
    const handleCreate = () => {
        setModalType('create');
        setCurrentItem(null);
        setFormData(getDefaultFormData(activeTab, userRole));
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setModalType('edit');
        setCurrentItem(item);
        
        // Специальная обработка для заявок - преобразуем students в studentIds
        if (activeTab === 'requests' && item.students) {
            const formDataWithIds = {
                ...item,
                studentIds: item.students.map(student => student.id.toString())
            };
            setFormData(formDataWithIds);
        } else {
            setFormData(item);
        }
        
        setShowModal(true);
    };

    const handleDelete = (item) => {
        // Защита от удаления собственного аккаунта
        if (activeTab === 'users' && currentUser && item.id === currentUser.id) {
            setError('Вы не можете удалить свой собственный аккаунт');
            return;
        }
        
        setModalType('delete');
        setCurrentItem(item);
        setShowModal(true);
    };

    // Обработка форм
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Подготавливаем данные для отправки
            const submitData = prepareFormData(formData, activeTab, userRole);

            // Валидация для заявок - проверяем наличие студентов (только для create и edit)
            if (activeTab === 'requests' && modalType !== 'delete') {
                if (!submitData.studentIds || submitData.studentIds.length === 0) {
                    setError('Необходимо выбрать хотя бы одного студента');
                    setLoading(false);
                    return;
                }
            }

            if (modalType === 'create') {
                await data.create(activeTab, submitData);
                // Перезагружаем заявки после создания, чтобы получить полные данные
                if (activeTab === 'requests') {
                    await data.fetchAll('requests');
                }
                setSuccess('Запись успешно создана');
            } else if (modalType === 'edit') {
                await data.update(activeTab, currentItem.id, submitData);
                // Перезагружаем заявки после обновления
                if (activeTab === 'requests') {
                    await data.fetchAll('requests');
                }
                setSuccess('Запись успешно обновлена');
            } else if (modalType === 'delete') {
                await data.delete(activeTab, currentItem.id);
                setSuccess('Запись успешно удалена');
            }

            setShowModal(false);
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка операции');
        } finally {
            setLoading(false);
        }
    };

    // Обработчик смены вкладки
    const handleTabChange = useCallback((k) => {
        setActiveTab(k);
        setCurrentPage(1);
        setSearchTerm('');
        setSelectedGroupFilter('');
        setSelectedRoleFilter('');
        setSelectedStatusFilter('');
        setSelectedSpecialtyFilter('');
    }, []);

    // Получение данных таблицы
    const tableData = getTableData(activeTab, data);

    // Фильтрация и сортировка данных
    const filteredData = useMemo(() => {
        const filtered = filterData(
            tableData, 
            searchTerm, 
            activeTab, 
            selectedGroupFilter,
            selectedRoleFilter,
            selectedStatusFilter,
            selectedSpecialtyFilter
        );

        // Сортировка по алфавиту в зависимости от типа таблицы
        const sorted = [...filtered].sort((a, b) => {
            switch (activeTab) {
                case 'students':
                case 'teachers':
                    // Сортировка по фамилии
                    return (a.last_name || '').localeCompare(b.last_name || '', 'ru');
                
                case 'users':
                    // Сортировка по email
                    return (a.email || '').localeCompare(b.email || '', 'ru');
                
                case 'groups':
                    // Сортировка по номеру группы
                    return (a.group_number || '').localeCompare(b.group_number || '', 'ru');
                
                case 'specialties':
                case 'documents':
                    // Сортировка по названию
                    const nameA = a.name || a.document_name || '';
                    const nameB = b.name || b.document_name || '';
                    return nameA.localeCompare(nameB, 'ru');
                
                case 'requests':
                    // Сортировка по дате создания (новые сверху)
                    return new Date(b.createdAt) - new Date(a.createdAt);
                
                default:
                    return 0;
            }
        });

        return sorted;
    }, [tableData, searchTerm, activeTab, selectedGroupFilter, selectedRoleFilter, selectedStatusFilter, selectedSpecialtyFilter]);

    // Пагинация
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

    const isLoading = data.isLoading(activeTab) || loading;
    const tableError = data.getError(activeTab);

    // Функция для получения названия по ID с привязкой к data
    const getNameByIdWithData = useCallback((fieldName, id) => {
        return getNameById(fieldName, id, data);
    }, [data]);

    return {
        // Состояния
        activeTab,
        loading,
        error,
        success,
        userRole,
        showModal,
        modalType,
        currentItem,
        formData,
        currentPage,
        searchTerm,
        selectedGroupFilter,
        selectedRoleFilter,
        selectedStatusFilter,
        selectedSpecialtyFilter,
        currentItems,
        totalPages,
        filteredData,
        isLoading,
        tableError,

        // Сеттеры
        setError,
        setSuccess,
        setShowModal,
        setFormData,
        setCurrentPage,
        setSearchTerm,

        // Обработчики
        handleCreate,
        handleEdit,
        handleDelete,
        handleFormSubmit,
        handleTabChange,
        handleStudentSearch,
        handleGroupFilterChange,
        handleRoleFilterChange,
        handleStatusFilterChange,
        handleSpecialtyFilterChange,
        handleRequestStatusChange,
        loadTableData,
        getNameByIdWithData
    };
};