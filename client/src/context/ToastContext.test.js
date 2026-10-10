import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, notify, useToast } from './ToastContext';

describe('ToastContext & ToastProvider', () => {
    test('renders children and displays toast via notify event', () => {
        render(
            <ToastProvider>
                <div data-testid="child">App Content</div>
            </ToastProvider>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();

        act(() => {
            notify({
                title: 'Тест заголовок',
                message: 'Тестовое сообщение',
                variant: 'success'
            });
        });

        expect(screen.getByText('Тест заголовок')).toBeInTheDocument();
        expect(screen.getByText('Тестовое сообщение')).toBeInTheDocument();
    });

    test('shows toast via useToast hook', () => {
        const TestComponent = () => {
            const { showToast } = useToast();
            return (
                <button
                    onClick={() => showToast({ title: 'Хук', message: 'Сообщение из хука', variant: 'info' })}
                >
                    Клик
                </button>
            );
        };

        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        act(() => {
            screen.getByText('Клик').click();
        });

        expect(screen.getByText('Хук')).toBeInTheDocument();
        expect(screen.getByText('Сообщение из хука')).toBeInTheDocument();
    });
});
