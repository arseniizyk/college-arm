import React, { useState } from 'react';
import { Row, Col, Card, Button, Badge } from 'react-bootstrap';
import PracticeContractModal from './PracticeContractModal';
import ExamAdmissionOrderModal from './ExamAdmissionOrderModal';
import HolidaysOrderModal from './HolidaysOrderModal';
import StipendOrderModal from './StipendOrderModal';
import SnowCleaningOrderModal from './SnowCleaningOrderModal';
import StudentDirectionOrderModal from './StudentDirectionOrderModal';
import HealthOrderModal from './HealthOrderModal';
import TransferOrderModal from './TransferOrderModal';
import DuplicateTicketOrderModal from './DuplicateTicketOrderModal';
import EnrollmentOrderModal from './EnrollmentOrderModal';
import ReleaseOrderModal from './ReleaseOrderModal';

const DOCUMENT_CATEGORIES = [
    {
        id: 'orders',
        title: 'Приказы',
        icon: 'bi-journal-text',
        color: 'primary',
        documents: [
            { id: 'release_order', title: 'Приказ об освобождении от занятий', icon: 'bi-calendar-x', available: true },
            { id: 'enrollment_order', title: 'Приказ о зачислении', icon: 'bi-person-plus', available: true },            { id: 'duplicate_order', title: 'Приказ о выдаче дубликата билета', icon: 'bi-card-text', available: true },
            { id: 'transfer_order', title: 'Приказ о переводе на следующий курс', icon: 'bi-arrow-up-circle', available: true },
            { id: 'health_order', title: 'Приказ об оздоровлении', icon: 'bi-heart-pulse', available: true },
            { id: 'direction_order', title: 'Приказ о направлении учащихся колледжа', icon: 'bi-send', available: true },
            { id: 'subbotnik_order', title: 'Приказ о субботнике/уборка снега', icon: 'bi-snow', available: true },
            { id: 'stipend_order', title: 'Приказ о стипендии', icon: 'bi-cash-coin', available: true },
            { id: 'exam_order', title: 'Приказ о допуске к экзаменам', icon: 'bi-pencil-square', available: true },
            { id: 'holidays_order', title: 'Приказ об установлении каникул', icon: 'bi-calendar-heart', available: true },
        ]
    },
    {
        id: 'contracts',
        title: 'Договоры',
        icon: 'bi-file-earmark-ruled',
        color: 'warning',
        documents: [
            { id: 'practice_contract', title: 'Договор на учебную практику', icon: 'bi-briefcase', available: true },
        ]
    },
];

const DocumentCard = ({ doc, onGenerate }) => (
    <Card
        className="h-100 border-0 shadow-sm"
        style={{ transition: 'transform 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <Card.Body className="d-flex flex-column p-3">
            <div className="d-flex align-items-center mb-3 gap-3">
                <i className={`bi ${doc.icon} fs-3 ${doc.available ? 'text-primary' : 'text-secondary'}`}></i>
                <div>
                    <span className="fw-semibold d-block" style={{ fontSize: '1.05rem' }}>{doc.title}</span>
                    {!doc.available && (
                        <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>В разработке</Badge>
                    )}
                </div>
            </div>
            <div className="mt-auto">
                <Button
                    variant={doc.available ? 'primary' : 'outline-secondary'}
                    size="sm"
                    className="w-100"
                    disabled={!doc.available}
                    onClick={() => doc.available && onGenerate(doc.id)}
                >
                    <i className={`bi ${doc.available ? 'bi-plus-circle' : 'bi-clock'} me-2`}></i>
                    {doc.available ? 'Создать' : 'В разработке'}
                </Button>
            </div>
        </Card.Body>
    </Card>
);

const DocumentsGeneration = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);
    const [showHolidaysModal, setShowHolidaysModal] = useState(false);
    const [showStipendModal, setShowStipendModal] = useState(false);
    const [showSnowModal, setShowSnowModal] = useState(false);
    const [showDirectionModal, setShowDirectionModal] = useState(false);
    const [showHealthModal, setShowHealthModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [showReleaseModal, setShowReleaseModal] = useState(false);

    const handleGenerate = (docId) => {
        if (docId === 'practice_contract') setShowPracticeModal(true);
        if (docId === 'exam_order') setShowExamModal(true);
        if (docId === 'holidays_order') setShowHolidaysModal(true);
        if (docId === 'stipend_order') setShowStipendModal(true);
        if (docId === 'subbotnik_order') setShowSnowModal(true);
        if (docId === 'direction_order') setShowDirectionModal(true);
        if (docId === 'health_order') setShowHealthModal(true);
        if (docId === 'transfer_order') setShowTransferModal(true);
        if (docId === 'duplicate_order') setShowDuplicateModal(true);
        if (docId === 'enrollment_order') setShowEnrollmentModal(true);
        if (docId === 'release_order') setShowReleaseModal(true);
    };

    const visibleCategories = activeCategory === 'all'
        ? DOCUMENT_CATEGORIES
        : DOCUMENT_CATEGORIES.filter(c => c.id === activeCategory);

    const totalDocs = DOCUMENT_CATEGORIES.reduce((sum, c) => sum + c.documents.length, 0);
    const availableDocs = DOCUMENT_CATEGORIES.reduce((sum, c) => sum + c.documents.filter(d => d.available).length, 0);

    return (
        <div className="documents-generation">
            <div className="mb-4">
                <h4 className="mb-1">
                    <i className="bi bi-file-earmark-plus me-2"></i>
                    Создание документов
                </h4>
                <small className="text-muted">
                    Доступно: {availableDocs} из {totalDocs}
                </small>
            </div>

            {/* Фильтр по категориям */}
            <div className="d-flex flex-wrap gap-2 mb-4">
                <Button
                    variant={activeCategory === 'all' ? 'dark' : 'outline-secondary'}
                    size="sm"
                    onClick={() => setActiveCategory('all')}
                >
                    <i className="bi bi-grid me-2"></i>
                    Все
                </Button>
                {DOCUMENT_CATEGORIES.map(cat => (
                    <Button
                        key={cat.id}
                        variant={activeCategory === cat.id ? cat.color : 'outline-secondary'}
                        size="sm"
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        <i className={`bi ${cat.icon} me-2`}></i>
                        {cat.title}
                        <Badge bg="light" text="dark" className="ms-2">{cat.documents.length}</Badge>
                    </Button>
                ))}
            </div>

            {/* Категории и документы */}
            {visibleCategories.map(category => (
                <div key={category.id} className="mb-5">
                    <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                        <i className={`bi ${category.icon} text-${category.color} fs-5 me-2`}></i>
                        <h5 className="mb-0">{category.title}</h5>
                        <Badge bg={category.color} className="ms-2">{category.documents.length}</Badge>
                    </div>
                    <Row className="g-3">
                        {category.documents.map(doc => (
                            <Col key={doc.id} md={6} xl={4}>
                                <DocumentCard doc={doc} onGenerate={handleGenerate} />
                            </Col>
                        ))}
                    </Row>
                </div>
            ))}

            {/* Модальные окна */}
            <PracticeContractModal
                show={showPracticeModal}
                onHide={() => setShowPracticeModal(false)}
            />
            <ExamAdmissionOrderModal
                show={showExamModal}
                onHide={() => setShowExamModal(false)}
            />
            <HolidaysOrderModal
                show={showHolidaysModal}
                onHide={() => setShowHolidaysModal(false)}
            />
            <StipendOrderModal
                show={showStipendModal}
                onHide={() => setShowStipendModal(false)}
            />
            <SnowCleaningOrderModal
                show={showSnowModal}
                onHide={() => setShowSnowModal(false)}
            />
            <StudentDirectionOrderModal
                show={showDirectionModal}
                onHide={() => setShowDirectionModal(false)}
            />
            <HealthOrderModal
                show={showHealthModal}
                onHide={() => setShowHealthModal(false)}
            />
            <TransferOrderModal
                show={showTransferModal}
                onHide={() => setShowTransferModal(false)}
            />
            <DuplicateTicketOrderModal
                show={showDuplicateModal}
                onHide={() => setShowDuplicateModal(false)}
            />
            <EnrollmentOrderModal
                show={showEnrollmentModal}
                onHide={() => setShowEnrollmentModal(false)}
            />
            <ReleaseOrderModal
                show={showReleaseModal}
                onHide={() => setShowReleaseModal(false)}
            />
        </div>
    );
};

export default DocumentsGeneration;
