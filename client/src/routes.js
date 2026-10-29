import Admin from "./pages/Admin"
import Auth from "./pages/Auth"
import Profile from "./pages/Profile"
import Privacy from "./pages/Privacy"
import { ADMIN_ROUTE, LOGIN_ROUTE, PROFILE_ROUTE, PRIVACY_ROUTE } from "./utils/consts"

// Роуты только для администраторов
export const adminRoutes = [
    {
        path: ADMIN_ROUTE,
        Component: Admin
    },
    {
        path: PROFILE_ROUTE,
        Component: Profile
    }
]

// Роуты для авторизованных пользователей
export const authRoutes = []

export const publicRoutes = [
    {
        path: LOGIN_ROUTE,
        Component: Auth
    },
    {
        path: PRIVACY_ROUTE,
        Component: Privacy
    }
]
