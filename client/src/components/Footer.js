import React from 'react';
import { NavLink } from 'react-router-dom';
import { PRIVACY_ROUTE } from '../utils/consts';

const Footer = () => {
    return (
        <div>
            <footer className="mgkct-footer py-4">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-3 mb-md-0">
                            <h6>Минский государственный колледж цифровых технологий</h6>
                            <p className="mb-2">Учебная часть • 2026</p>
                            <NavLink 
                                to={PRIVACY_ROUTE} 
                                className="footer-link"
                            >
                                <i className="bi bi-shield-check me-1"></i>
                                Политика обработки персональных данных
                            </NavLink>
                        </div>
                        <div className="col-md-6 text-md-end">
                            <p className="mb-0">
                                <a href="tel:+375173584507" className="footer-link text-decoration-none">
                                    <i className="bi bi-telephone me-1"></i> +375 (17) 358-45-07
                                </a>
                                <span className="mx-2">•</span>
                                <i className="bi bi-geo-alt-fill me-1"></i> ул. Казинца, 91
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Footer;