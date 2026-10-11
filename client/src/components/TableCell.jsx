import React from 'react';
import { Badge } from 'react-bootstrap';
import { toJS } from 'mobx';
import { resolveCellContent } from '../utils/tableCells';

const TableCell = ({ column, item, context }) => {
    const content = resolveCellContent(column, toJS(item), context);

    if (!content) {
        return <span className="text-muted">-</span>;
    }

    const { text, variant, muted, title } = content;

    if (variant) {
        return <Badge bg={variant} title={title} style={title ? { cursor: 'help' } : undefined}>{text}</Badge>;
    }
    if (muted || title) {
        return <span className={muted ? 'text-muted' : undefined} title={title}>{text}</span>;
    }
    return text;
};

export default TableCell;