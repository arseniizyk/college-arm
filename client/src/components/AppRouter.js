import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'
import { authRoutes, publicRoutes, adminRoutes } from '../routes';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';  

const AppRouter = observer(() => { 
    const {user} = useContext(Context)
    
    // Получаем роль пользователя
    const currentUser = user.getUser()
    const userRole = currentUser?.role || 'USER'
    const isAdmin = userRole === 'ADMIN'

    return (
         <Routes>
            {/* Роуты только для администраторов */}
            {user.getIsAuth() && isAdmin && adminRoutes.map(({ path, Component }) => (
                <Route 
                    key={path} 
                    path={path} 
                    element={<Component />}
                />
            ))}
            
            {/* Роуты для всех авторизованных пользователей */}
            {user.getIsAuth() && authRoutes.map(({ path, Component }) => (
                <Route 
                    key={path} 
                    path={path} 
                    element={<Component />}
                />
            ))}
            
            {/* Публичные роуты */}
            {publicRoutes.map(({ path, Component }) => (
                <Route 
                    key={path} 
                    path={path} 
                    element={<Component />} 
                />
            ))}
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
});

export default AppRouter;