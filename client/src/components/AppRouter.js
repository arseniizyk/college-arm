import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authRoutes, publicRoutes, adminRoutes } from '../routes';
import { ADMIN_ROUTE, LOGIN_ROUTE } from '../utils/consts';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';  

const AppRouter = observer(() => { 
    const { user } = useContext(Context);
    
    const isAuth = user.getIsAuth();
    const currentUser = user.getUser();
    const isAdmin = currentUser?.role === 'ADMIN';

    return (
        <Routes>
            {/* Роуты только для администраторов */}
            {isAuth && isAdmin && adminRoutes.map(({ path, Component }) => (
                <Route 
                    key={path} 
                    path={path} 
                    element={<Component />}
                />
            ))}
            
            {/* Роуты для авторизованных пользователей */}
            {isAuth && authRoutes.map(({ path, Component }) => (
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
            
            <Route 
                path="*" 
                element={<Navigate to={isAuth && isAdmin ? ADMIN_ROUTE : LOGIN_ROUTE} replace />} 
            />
        </Routes>
    );
});

export default AppRouter;
