import React from 'react';
import { Button } from 'react-bootstrap';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="pagination-controls d-flex justify-content-center align-items-center flex-wrap gap-2 mt-4">
            <Button
                variant="outline-primary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                <i className="bi-chevron-left me-1"></i> Назад
            </Button>

            <div className="page-numbers d-inline-flex align-items-center gap-1">
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
            >
                Вперед <i className="bi-chevron-right ms-1"></i>
            </Button>
        </div>
    );
};

export default Pagination;