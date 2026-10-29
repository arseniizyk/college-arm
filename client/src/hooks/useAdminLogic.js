import { useState, useEffect, useCallback, useRef } from 'react';
import { getTableData, filterData, prepareFormData, getNameById, toGroupFormData, toStudentFormData } from '../utils/dataHelpers';
import { getDefaultFormData } from '../utils/tableConfig';
import { sortTableData } from '../utils/tableSorting';
import { ITEMS_PER_PAGE } from '../utils/consts';
import { errorMessage } from '../http';
import { notify } from '../context/ToastContext';

export const useAdminLogic = (data, user) => {
    const [activeTab, setActiveTab] = useState('users');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const dataLoadedRef = useRef(false);

    // Получаем информацию о текущем пользователе
    const currentUser = user.getUser();
    const userRole = currentUser?.role || 'ADMIN';

    // Состояния для модальных окон
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({});

    // Пагинация и поиск
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = ITEMS_PER_PAGE;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
    const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('');
    const [selectedStudentStatusFilter, setSelectedStudentStatusFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

    // Загружаем данные при монтировании компонента
    useEffect(() => {
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
                    data.fetchAll('teachers')
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
    }, []);

    // Загрузка данных для текущей вкладки
    const loadTableData = useCallback(async (tableName, searchParams = {}) => {
        setLoading(true);
        setError(null);
        try {
            await data.fetchAll(tableName, searchParams);
        } catch (err) {
            setError(errorMessage(err, 'Ошибка загрузки данных'));
        } finally {
            setLoading(false);
        }
    }, [data]);

    // Функция для обновления поискового термина
    const handleSearch = useCallback((searchValue) => {
        setSearchTerm(searchValue);
        setCurrentPage(1);
    }, []);

    const handleStudentSearch = handleSearch;

    // Функция для обновления фильтра группы
    const handleGroupFilterChange = useCallback((groupId) => {
        setSelectedGroupFilter(groupId);
        setCurrentPage(1);
    }, []);

    // Функция для обновления фильтра специальности
    const handleSpecialtyFilterChange = useCallback((specialtyId) => {
        setSelectedSpecialtyFilter(specialtyId);
        setCurrentPage(1);
    }, []);

    // Функция для обновления фильтра статуса студента (все / обучающиеся / отчисленные)
    const handleStudentStatusFilterChange = useCallback((status) => {
        setSelectedStudentStatusFilter(status);
        setCurrentPage(1);
    }, []);

    // Функция для интерактивной сортировки по клику на заголовок (asc -> desc -> сброс)
    const handleSort = useCallback((columnKey) => {
        setSortConfig(prev => {
            if (prev.key === columnKey) {
                if (prev.direction === 'asc') {
                    return { key: columnKey, direction: 'desc' };
                }
                if (prev.direction === 'desc') {
                    return { key: null, direction: null };
                }
            }
            return { key: columnKey, direction: 'asc' };
        });
        setCurrentPage(1);
    }, []);

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
        
        if (activeTab === 'groups') {
            setFormData(toGroupFormData(item));
        } else if (activeTab === 'students') {
            setFormData(toStudentFormData(item));
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
            const submitData = prepareFormData(formData, activeTab);

            let actionMsg = 'Операция выполнена успешно';
            if (modalType === 'create') {
                await data.create(activeTab, submitData);
                actionMsg = 'Запись успешно создана';
            } else if (modalType === 'edit') {
                await data.update(activeTab, currentItem.id, submitData);
                actionMsg = 'Запись успешно обновлена';
            } else if (modalType === 'delete') {
                await data.delete(activeTab, currentItem.id);
                actionMsg = 'Запись успешно удалена';
            }

            setSuccess(actionMsg);
            notify({
                title: 'Управление данными',
                message: actionMsg,
                variant: 'success'
            });

            setShowModal(false);

        } catch (err) {
            setError(errorMessage(err, 'Ошибка операции'));
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
        setSelectedSpecialtyFilter('');
        setSelectedStudentStatusFilter('');
        setSortConfig({ key: null, direction: null });
    }, []);

    // Функция для получения названия по ID с привязкой к data
    const getNameByIdWithData = useCallback((fieldName, id) => {
        return getNameById(fieldName, id, data);
    }, [data]);

    // Получение данных таблицы
    const tableData = getTableData(activeTab, data);

    // Фильтрация данных
    const rawFilteredData = filterData(
        tableData,
        searchTerm,
        activeTab,
        selectedGroupFilter,
        selectedSpecialtyFilter,
        selectedStudentStatusFilter
    );

    // Сортировка данных таблицы (с поддержкой пользовательской и дефолтной)
    const filteredData = sortTableData(
        rawFilteredData,
        sortConfig,
        activeTab,
        getNameByIdWithData
    );

    // Пагинация
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
    const indexOfLastItem = safePage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const isLoading = data.isLoading(activeTab) || loading;
    const tableError = data.getError(activeTab);

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
        currentPage: safePage,
        itemsPerPage,
        searchTerm,
        selectedGroupFilter,
        selectedSpecialtyFilter,
        selectedStudentStatusFilter,
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
        setSearchTerm: handleSearch,

        // Обработчики
        handleCreate,
        handleEdit,
        handleDelete,
        handleFormSubmit,
        handleTabChange,
        handleSearch,
        handleStudentSearch,
        handleGroupFilterChange,
        handleSpecialtyFilterChange,
        handleStudentStatusFilterChange,
        loadTableData,
        getNameByIdWithData,
        sortConfig,
        handleSort
    };
};
