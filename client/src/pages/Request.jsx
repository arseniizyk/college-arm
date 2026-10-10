import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';
import MultiselectStudents from '../components/MultiselectStudents';
import { getMe } from '../http/userAPI';
import { canSelectMultipleStudents, MAIN_ROUTE } from '../utils/consts';
import { allowedStudentIds } from '../utils/requestStudents';
import { notify } from '../context/ToastContext';
import Breadcrumbs from '../components/Breadcrumbs';
import './Request.css';

const Request = observer(() => {
    const { data, user } = useContext(Context);
    const currentUser = user.getUser();
    const userRole = currentUser?.role || 'USER';

    const [formData, setFormData] = useState({
        documentId: '',
        description: '',
        studentIds: ''
    });

    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [supervisorGroupIds, setSupervisorGroupIds] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [validated, setValidated] = useState(false);

    const selectableStudentIds = allowedStudentIds(data.students, {
        role: userRole,
        supervisorGroupIds,
        userId: currentUser?.id,
    });

    const noStudentsMessage = userRole === 'TEACHER'
        ? 'Ваш аккаунт не привязан к куратору группы. Обратитесь к администратору.'
        : 'Ваш аккаунт не привязан к студенту. Обратитесь к администратору.';

    // Инициализируем studentIds в зависимости от роли после загрузки пользователя
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            studentIds: canSelectMultipleStudents(userRole) ? [] : ''
        }));
    }, [userRole]);

    // Загружаем данные при монтировании
    useEffect(() => {
        const loadData = async () => {
            setDataLoading(true);
            try {
                const loaders = [
                    data.fetchAll('documents'),
                    data.fetchAll('students'),
                    data.fetchAll('groups')
                ];
                // Куратору нужны его группы, чтобы показать студентов только этих групп
                if (userRole === 'TEACHER') {
                    loaders.push(getMe().then(me => setSupervisorGroupIds(me.groupIds || [])));
                }
                await Promise.all(loaders);
            } catch (err) {
                setError('Ошибка загрузки данных');
            } finally {
                setDataLoading(false);
            }
        };
        loadData();
    }, [data, userRole]);

    const isDocValid = Boolean(formData.documentId || formData.description?.trim());
    const hasStudents = Array.isArray(formData.studentIds)
        ? formData.studentIds.length > 0
        : Boolean(formData.studentIds);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidated(true);

        // Валидация
        if (!isDocValid) {
            setError('Необходимо выбрать тип документа или указать его описание в поле ниже');
            return;
        }

        if (!hasStudents) {
            setError('Необходимо выбрать хотя бы одного студента');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Преобразуем studentIds в числа, если они строки
            const studentIds = Array.isArray(formData.studentIds) 
                ? formData.studentIds.map(id => typeof id === 'string' ? parseInt(id) : id)
                : [parseInt(formData.studentIds)];

            // Создаем заявку
            await data.create('requests', {
                documentId: formData.documentId || null,
                description: formData.description || null,
                studentIds: studentIds
            });

            const successMsg = 'Заявка успешно создана! Вы можете отслеживать её статус в личном кабинете.';
            setSuccess(successMsg);
            notify({
                title: 'Заявка отправлена',
                message: successMsg,
                variant: 'success'
            });
            setValidated(false);
            
            // Прокрутка к началу страницы
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Очищаем форму
            setFormData({
                documentId: '',
                description: '',
                studentIds: canSelectMultipleStudents(userRole) ? [] : ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка создания заявки');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="request-page">
            {/* Шапка */}
            <header className="mgkct-header py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-8 mx-auto text-center">
                            <h1 className="display-4 fw-bold mb-3">
                                <i className="bi bi-file-earmark-plus me-3"></i>
                                Подача заявки на документ
                            </h1>
                            <p className="lead mb-0">
                                Заполните форму ниже для оформления необходимого документа
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Основной контент */}
            <Container className="py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <Breadcrumbs
                            items={[
                                { label: 'Главная', path: MAIN_ROUTE, icon: 'bi-house-door' },
                                { label: 'Подача заявки на документ', icon: 'bi-file-earmark-plus' }
                            ]}
                        />
                        <Card className="request-card shadow-lg border-0">
                            <Card.Body className="p-4">
                                {error && (
                                    <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        {error}
                                    </Alert>
                                )}

                                {success && (
                                    <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-4">
                                        <i className="bi bi-check-circle me-2"></i>
                                        {success}
                                    </Alert>
                                )}

                                {dataLoading ? (
                                    <div className="text-center py-5">
                                        <Spinner animation="border" role="status" variant="primary">
                                            <span className="visually-hidden">Загрузка...</span>
                                        </Spinner>
                                        <p className="mt-3 text-muted">Загрузка данных...</p>
                                    </div>
                                ) : (
                                    <Form noValidate onSubmit={handleSubmit}>
                                    {/* Выбор документа */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="form-label-custom">
                                            Тип документа
                                        </Form.Label>
                                        <Form.Select
                                            className="form-control-custom"
                                            value={formData.documentId}
                                            onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                                            isInvalid={validated && !isDocValid}
                                        >
                                            <option value="">Выберите документ...</option>
                                            {data.documents.map(doc => (
                                                <option key={doc.id} value={doc.id}>
                                                    {doc.document_name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">
                                            Выберите документ из списка или опишите его в поле ниже
                                        </Form.Control.Feedback>
                                        <Form.Text className="text-muted">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Если нужного документа нет в списке, опишите его в поле ниже
                                        </Form.Text>
                                    </Form.Group>

                                    {/* Описание */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="form-label-custom">
                                            Описание документа (необязательно)
                                        </Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            className="form-control-custom"
                                            placeholder="Опишите требуемый документ, если его нет в списке выше..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </Form.Group>

                                    {/* Выбор студентов */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="form-label-custom">
                                            Студенты <span className="text-danger">*</span>
                                        </Form.Label>
                                        <MultiselectStudents
                                            field={{
                                                name: 'studentIds',
                                                type: canSelectMultipleStudents(userRole) ? 'multiselect' : 'select',
                                                required: true
                                            }}
                                            formData={formData}
                                            setFormData={setFormData}
                                            loading={loading}
                                            data={data}
                                            allowedStudentIds={selectableStudentIds}
                                            noStudentsMessage={noStudentsMessage}
                                        />
                                        {validated && !hasStudents && (
                                            <div className="text-danger small mt-2">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                Необходимо выбрать хотя бы одного студента
                                            </div>
                                        )}
                                    </Form.Group>

                                    {/* Кнопки */}
                                    <div className="d-flex gap-3 justify-content-center">
                                        <Button 
                                            variant="primary" 
                                            type="submit" 
                                            disabled={loading}
                                            className="btn-custom btn-custom-primary"
                                        >
                                            {loading ? (
                                                <>
                                                    <Spinner
                                                        as="span"
                                                        animation="border"
                                                        size="sm"
                                                        role="status"
                                                        aria-hidden="true"
                                                        className="me-2"
                                                    />
                                                    Отправка...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send me-2"></i>
                                                    Подать заявку
                                                </>
                                            )}
                                        </Button>
                                        <Button 
                                            variant="outline-secondary" 
                                            type="button"
                                            className="btn-custom btn-custom-secondary"
                                            onClick={() => setFormData({ documentId: '', description: '', studentIds: canSelectMultipleStudents(userRole) ? [] : '' })}
                                            disabled={loading}
                                        >
                                            <i className="bi bi-arrow-clockwise me-2"></i>
                                            Очистить
                                        </Button>
                                    </div>
                                </Form>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                </div>
            </Container>
        </div>
    );
});

export default Request;
