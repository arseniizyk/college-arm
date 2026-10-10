import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Навигационная цепочка (хлебные крошки).
 * Обеспечивает прозрачную ориентацию пользователя и путь возврата к предыдущим разделам.
 */
const Breadcrumbs = ({ items = [] }) => {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Хлебные крошки" className="breadcrumbs-nav mb-3">
            <ol className="breadcrumb mb-0 py-2 px-3 bg-white border rounded-3 shadow-xs">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const isActive = item.active || isLast;

                    if (isActive) {
                        return (
                            <li
                                key={index}
                                className="breadcrumb-item active text-truncate"
                                aria-current="page"
                                title={item.label}
                            >
                                {item.icon && <i className={`${item.icon} me-1`}></i>}
                                <span>{item.label}</span>
                            </li>
                        );
                    }

                    return (
                        <li key={index} className="breadcrumb-item text-truncate">
                            {item.path ? (
                                <Link to={item.path} className="text-decoration-none" title={item.label}>
                                    {item.icon && <i className={`${item.icon} me-1`}></i>}
                                    <span>{item.label}</span>
                                </Link>
                            ) : item.onClick ? (
                                <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none border-0 align-baseline"
                                    onClick={item.onClick}
                                    title={item.label}
                                >
                                    {item.icon && <i className={`${item.icon} me-1`}></i>}
                                    <span>{item.label}</span>
                                </button>
                            ) : (
                                <span>
                                    {item.icon && <i className={`${item.icon} me-1`}></i>}
                                    <span>{item.label}</span>
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

Breadcrumbs.propTypes = {
    items: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            path: PropTypes.string,
            icon: PropTypes.string,
            active: PropTypes.bool,
            onClick: PropTypes.func
        })
    ).isRequired
};

export default Breadcrumbs;
