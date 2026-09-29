import React from 'react';
import { Button } from 'react-bootstrap';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="pagination-controls d-flex justify-content-center align-items-center mt-4">
            <Button
                variant="outline-primary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="me-3"
            >
                <i className="bi-chevron-left"></i> Назад
            </Button>

            <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (currentPage <= 3) {
                        pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = currentPage - 2 + i;
                    }

                    return (
                        <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "primary" : "outline-secondary"}
                            size="sm"
                            className="mx-1"
                            onClick={() => onPageChange(pageNum)}
                        >
                            {pageNum}
                        </Button>
                    );
                })}
            </div>

            <Button
                variant="outline-primary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="ms-3"
            >
                Вперед <i className="bi-chevron-right"></i>
            </Button>
        </div>
    );
};

export default Pagination;