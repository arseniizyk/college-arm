import { makeAutoObservable } from "mobx"

export default class UserStore {
    constructor() {
        this._isAuth = false
        this._user = {}
        makeAutoObservable(this)

        this.checkToken()
    }

    checkToken() {
        const token = localStorage.getItem('token')
        this._isAuth = !!token
    }

    login(userData) {
        this._user = userData
        this._isAuth = true
    }

    setIsAuth(bool) {
        this._isAuth = bool
    }
    setUser(user) {
        this._user = user
    }

    getIsAuth() {
        return this._isAuth
    }
    getUser() {
        return this._user
    }
}