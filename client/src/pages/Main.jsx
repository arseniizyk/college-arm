import React, { useContext } from 'react';
import './Main.css'
import { Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom';
import { Context } from '../index';
import { REQUEST_ROUTE, LOGIN_ROUTE } from '../utils/consts';

const Main = () => {
    const navigate = useNavigate();
    const { user } = useContext(Context);

    const handleRequestClick = () => {
        if (user.getIsAuth()) {
            navigate(REQUEST_ROUTE);
        } else {
            navigate(LOGIN_ROUTE);
        }
    };

    return (
        <div className="document-portal">
            {/* Шапка */}
            <header className="mgkct-header py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-8 mx-auto text-center">
                            <h1 className="display-4 fw-bold mb-3">
                                <i className="bi bi-file-earmark-text me-3"></i>
                                Оформление документов МГКЦТ
                            </h1>
                            <p className="lead mb-4">
                                Учебная часть представляет электронную систему оформления всех типов справок и документов
                            </p>
                            <div className="d-flex flex-wrap justify-content-center gap-3">
                                <Button 
                                    className="btn btn-light btn-lg"
                                    onClick={handleRequestClick}
                                >
                                    <i className="bi bi-file-earmark-plus me-2"></i>
                                    Оформить онлайн
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Основной контент */}
            <main className="container py-5">
                {/* Контакты и основная информация */}
                <div className="row mb-5">
                    <div className="col-lg-4 mb-4 mb-lg-0">
                        <div className="contact-card card h-100">
                            <div className="card-body">
                                <h3 className="card-title text-center mb-4">
                                    <i className="bi bi-person-lines-fill card-title-icon"></i>
                                    Контакты
                                </h3>

                                <div className="contact-item">
                                    <i className="bi bi-telephone-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Телефон</h5>
                                        <a href="tel:+375173584507" className="contact-phone">
                                            +375 (17) 358-45-07
                                        </a>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <i className="bi bi-person-badge-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Василевич Наталья Анатольевна</h5>
                                        <span className="badge bg-primary">Кабинет 2-209</span>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <i className="bi bi-person-badge-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Солтан-Михолап Ирина Васильевна</h5>
                                        <span className="badge bg-primary">Кабинет 2-209</span>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <i className="bi bi-geo-alt-fill text-primary fs-5"></i>
                                    <div>
                                        <h5>Адрес</h5>
                                        <p>ул. Казинца, 91<br />
                                            <small className="text-muted">2 этаж, 2 корпус</small></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Расписание и кабинет */}
                    <div className="col-lg-8">
                        <div className="row g-4">
                            {/* График работы */}
                            <div className="col-md-6">
                                <div className="schedule-card card h-100">
                                    <div className="card-body">
                                        <h3 className="card-title text-center mb-4">
                                            <i className="bi bi-clock-history card-title-icon"></i>
                                            График работы
                                        </h3>
                                        <div className='schedule-period'>
                                            <span className="period-name">Пн-Пт</span>
                                            <span className={'time-badge bg-primary'} style={{color:'white'}}>8:30-17:00</span>
                                        </div>
                                        <div className='schedule-period'>
                                            <span className="period-name">Выдача справок об обучении</span>
                                            <span className={'time-badge bg-primary'} style={{color:'white'}}>14:00-17:00</span>

                                        </div>
                                        <div className='schedule-period day-off'>
                                            <span className="period-name">Cб-Вс</span>
                                            <span className={'time-badge bg-secondary'} style={{color:'white'}}>Выходной</span>
                                        </div>
                                        <div className="lunch-break mt-4">
                                            <i className="bi bi-cup-fill"></i>
                                            <span>Обеденный перерыв: <strong>13:00-13:30</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Кабинет 210 */}
                            <div className="col-md-6">
                                <div className="room-card card h-100">
                                    <div className="card-body">
                                        <h3 className="card-title text-center mb-4">
                                            <i className="bi bi-door-closed-fill card-title-icon"></i>
                                            Кабинет 2-209
                                        </h3>

                                        <div className="alert alert-info mb-4">
                                            <i className="bi bi-signpost-fill me-2"></i>
                                            <strong>Как найти:</strong> 2 этаж, 2 корпус, после лестницы направо
                                        </div>

                                        <div className="mb-4">
                                            <h6 className="fw-bold mb-3">
                                                <i className="bi bi-list-check text-primary me-2"></i>
                                                В кабинете выдают:
                                            </h6>
                                            <ul className="room-services">
                                                {['Справки об обучении', 'Документы для военкомата', 'Дубликаты документов'].map((service, idx) => (
                                                    <li key={idx}>
                                                        <i className="bi bi-check-circle-fill text-success"></i>
                                                        {service}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </main>

            
        </div>
    )
};

export default Main;