import React from 'react';
import { observer } from 'mobx-react-lite';

const DataTable = observer(({ 
    data, 
    columns, 
    onEdit, 
    onDelete,
    onCreate 
}) => {
    
    
    return (
        <table>
            <thead>
                <tr>
                    {columns.map(col => (
                        <th key={col.key}>{col.label}</th>
                    ))}
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                {data.map(item => (
                    <tr key={item.id}>
                        {columns.map(col => (
                            <td key={col.key}>{item[col.key]}</td>
                        ))}
                        <td>
                            <button onClick={() => onEdit(item.id)}>✏️</button>
                            <button onClick={() => onDelete(item.id)}>🗑️</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
})

export default DataTable