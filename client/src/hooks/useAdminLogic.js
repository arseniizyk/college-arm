import { useState, useEffect, useCallback, useRef } from 'react';
import { getTableData, filterData, prepareFormData, getNameById, toGroupFormData, toStudentFormData } from '../utils/dataHelpers';
import { getDefaultFormData } from '../utils/tableConfig';
import { sortTableData } from '../utils/tableSorting';
import { ITEMS_PER_PAGE } from '../utils/consts';
import { statusLabel } from '../utils/requestStatus';
import { errorMessage } from '../http';
import { notify } from '../context/ToastContext';

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
    const itemsPerPage = ITEMS_PER_PAGE;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
    const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

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
            setError(errorMessage(err, 'Ошибка загрузки данных'));
        } finally {
            setLoading(false);
        }
    }, [data]);

    // Функция для обновления поискового термина (клиентская фильтрация для всех таблиц)
    const handleSearch = useCallback((searchValue) => {
        setSearchTerm(searchValue);
        setCurrentPage(1);
    }, []);

    const handleStudentSearch = handleSearch;

    // Функция для обновления фильтра группы (клиентская фильтрация)
    const handleGroupFilterChange = useCallback((groupId) => {
        setSelectedGroupFilter(groupId);
        setCurrentPage(1);
    }, []);

    // Функция для обновления фильтра роли (клиентская фильтрация)
    const handleRoleFilterChange = useCallback((role) => {
        setSelectedRoleFilter(role);
        setCurrentPage(1);
    }, []);

    // Функция для обновления фильтра статуса (клиентская фильтрация)
    const handleStatusFilterChange = useCallback((status) => {
        setSelectedStatusFilter(status);
        setCurrentPage(1);
    }, []);

    // Функция для обновления фильтра специальности (клиентская фильтрация)
    const handleSpecialtyFilterChange = useCallback((specialtyId) => {
        setSelectedSpecialtyFilter(specialtyId);
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

    // Функция для изменения статуса заявки. Возвращает признак успеха:
    // карточка по нему решает, стоит ли себя свернуть — при откате статуса
    // заявка остаётся открытой, чтобы не прятать её от админа
    const handleRequestStatusChange = useCallback(async (requestId, newStatus) => {
        setError(null);
        setSuccess(null);

        const request = data.requests.find(r => r.id === requestId);
        if (!request) {
            setError('Заявка не найдена');
            return false;
        }

        data.updateLocal('requests', requestId, { status: newStatus });

        try {
            await data.update('requests', requestId, {
                documentId: request.documentId,
                description: request.description,
                studentIds: request.students?.map(s => s.id) || [],
                status: newStatus
            }, { silent: true });

            data.fetchAll('notifications').catch(() => {});

            const msg = `Статус заявки #${requestId} изменен на "${statusLabel(newStatus)}"`;
            setSuccess(msg);
            notify({
                title: 'Статус заявки',
                message: msg,
                variant: 'success'
            });
            return true;
        } catch (err) {
            data.updateLocal('requests', requestId, { status: request.status });
            setError(errorMessage(err, 'Ошибка изменения статуса'));
            return false;
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
        } else if (activeTab === 'groups') {
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
            // Подготавливаем данные для отправки
            const submitData = prepareFormData(formData, activeTab);

            // Валидация для заявок - проверяем наличие студентов (только для create и edit)
            if (activeTab === 'requests' && modalType !== 'delete') {
                if (!submitData.studentIds || submitData.studentIds.length === 0) {
                    setError('Необходимо выбрать хотя бы одного студента');
                    setLoading(false);
                    return;
                }
            }

            let actionMsg = 'Операция выполнена успешно';
            if (modalType === 'create') {
                await data.create(activeTab, submitData);
                // Перезагружаем заявки после создания, чтобы получить полные данные
                if (activeTab === 'requests') {
                    await data.fetchAll('requests');
                }
                actionMsg = 'Запись успешно создана';
            } else if (modalType === 'edit') {
                await data.update(activeTab, currentItem.id, submitData);
                // Перезагружаем заявки после обновления
                if (activeTab === 'requests') {
                    await data.fetchAll('requests');
                }
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
        setSelectedRoleFilter('');
        setSelectedStatusFilter('');
        setSelectedSpecialtyFilter('');
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
        selectedRoleFilter,
        selectedStatusFilter,
        selectedSpecialtyFilter
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
        handleRoleFilterChange,
        handleStatusFilterChange,
        handleSpecialtyFilterChange,
        handleRequestStatusChange,
        loadTableData,
        getNameByIdWithData,
        sortConfig,
        handleSort
    };
};