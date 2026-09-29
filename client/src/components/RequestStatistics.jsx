import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Form, Table, Badge } from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Регистрируем компоненты Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const RequestStatistics = ({ requests }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('all');

    // Функция для установки предустановленных периодов
    const setPeriod = (period) => {
        const now = new Date();
        const start = new Date();
        
        switch (period) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            case 'week':
                start.setDate(now.getDate() - 7);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            case 'month':
                start.setMonth(now.getMonth() - 1);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 1);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            case 'all':
            default:
                setStartDate('');
                setEndDate('');
                break;
        }
        setSelectedPeriod(period);
    };

    // Фильтрация заявок по периоду
    const filteredRequests = useMemo(() => {
        if (!requests || requests.length === 0) return [];

        let filtered = [...requests];

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(req => new Date(req.createdAt) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(req => new Date(req.createdAt) <= end);
        }

        return filtered;
    }, [requests, startDate, endDate]);

    // Статистика по статусам
    const statusStats = useMemo(() => {
        const stats = {
            total: filteredRequests.length,
            in_progress: 0,
            completed: 0,
            rejected: 0
        };

        filteredRequests.forEach(req => {
            if (req.status === 'in_progress') stats.in_progress++;
            else if (req.status === 'completed') stats.completed++;
            else if (req.status === 'rejected') stats.rejected++;
        });

        return stats;
    }, [filteredRequests]);

    // Статистика по типам документов
    const documentStats = useMemo(() => {
        const stats = {};
        
        filteredRequests.forEach(req => {
            const docName = req.document?.document_name || 'Без документа';
            if (!stats[docName]) {
                stats[docName] = { total: 0, completed: 0, rejected: 0, in_progress: 0 };
            }
            stats[docName].total++;
            stats[docName][req.status]++;
        });

        return Object.entries(stats)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [filteredRequests]);

    // Данные для круговой диаграммы статусов
    const pieChartData = {
        labels: ['В обработке', 'Завершено', 'Отклонено'],
        datasets: [{
            data: [statusStats.in_progress, statusStats.completed, statusStats.rejected],
            backgroundColor: ['#0dcaf0', '#198754', '#dc3545'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };

    // Данные для столбчатой диаграммы по документам
    const barChartData = {
        labels: documentStats.map(d => d.name),
        datasets: [
            {
                label: 'Завершено',
                data: documentStats.map(d => d.completed),
                backgroundColor: '#198754'
            },
            {
                label: 'В обработке',
                data: documentStats.map(d => d.in_progress),
                backgroundColor: '#0dcaf0'
            },
            {
                label: 'Отклонено',
                data: documentStats.map(d => d.rejected),
                backgroundColor: '#dc3545'
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };

    return (
        <div className="request-statistics">
            <h4 className="mb-4">
                <i className="bi-bar-chart me-2"></i>
                Статистика заявок
            </h4>

            {/* Фильтры по периоду */}
            <Card className="mb-4">
                <Card.Body>
                    <h6 className="mb-3">
                        <i className="bi-calendar-alt me-2"></i>
                        Период
                    </h6>
                    
                    {/* Быстрый выбор периода */}
                    <div className="mb-3 d-flex flex-wrap gap-2">
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('all')}
                        >
                            Все время
                        </button>
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('today')}
                        >
                            Сегодня
                        </button>
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('week')}
                        >
                            Неделя
                        </button>
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('month')}
                        >
                            Месяц
                        </button>
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'year' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('year')}
                        >
                            Год
                        </button>
                    </div>

                    {/* Ручной выбор дат */}
                    <Row>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Дата начала</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setSelectedPeriod('custom');
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Дата окончания</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setSelectedPeriod('custom');
                                    }}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Графики */}
            <Row className="mb-4">
                <Col lg={6} className="mb-4">
                    <Card>
                        <Card.Header>
                            <h6 className="mb-0">
                                <i className="bi-pie-chart me-2"></i>
                                Распределение по статусам
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                {statusStats.total > 0 ? (
                                    <Pie data={pieChartData} options={chartOptions} />
                                ) : (
                                    <div className="text-center text-muted py-5">
                                        <i className="bi-inbox fa-3x mb-3"></i>
                                        <p>Нет данных за выбранный период</p>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={6} className="mb-4">
                    <Card>
                        <Card.Header>
                            <h6 className="mb-0">
                                <i className="bi-bar-chart me-2"></i>
                                Статистика по типам документов
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                {documentStats.length > 0 ? (
                                    <Bar data={barChartData} options={chartOptions} />
                                ) : (
                                    <div className="text-center text-muted py-5">
                                        <i className="bi-inbox fa-3x mb-3"></i>
                                        <p>Нет данных за выбранный период</p>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Таблица по типам документов */}
            <Card>
                <Card.Header>
                    <h6 className="mb-0">
                        <i className="bi-table me-2"></i>
                        Детальная статистика по документам
                    </h6>
                </Card.Header>
                <Card.Body>
                    {documentStats.length > 0 ? (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>Тип документа</th>
                                    <th className="text-center">Всего</th>
                                    <th className="text-center">В обработке</th>
                                    <th className="text-center">Завершено</th>
                                    <th className="text-center">Отклонено</th>
                                    <th className="text-center">% Завершения</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documentStats.map((doc, index) => {
                                    const completionRate = doc.total > 0 
                                        ? ((doc.completed / doc.total) * 100).toFixed(1)
                                        : 0;
                                    
                                    return (
                                        <tr key={index}>
                                            <td className="fw-bold">{doc.name}</td>
                                            <td className="text-center">
                                                <Badge bg="primary">{doc.total}</Badge>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="info">{doc.in_progress}</Badge>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="success">{doc.completed}</Badge>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="danger">{doc.rejected}</Badge>
                                            </td>
                                            <td className="text-center">
                                                <span className={`fw-bold ${
                                                    completionRate >= 75 ? 'text-success' :
                                                    completionRate >= 50 ? 'text-warning' :
                                                    'text-danger'
                                                }`}>
                                                    {completionRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted py-4">
                            <i className="bi-inbox fa-3x mb-3"></i>
                            <p>Нет данных за выбранный период</p>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default RequestStatistics;
