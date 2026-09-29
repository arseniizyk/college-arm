import React, { createContext } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import UserStore from './store/UserStore';
import DataStore from './store/DataStore';
import './index.css';


export const Context = createContext(null)

const root = ReactDOM.createRoot(document.getElementById('root'));

const userStore = new UserStore()
const dataStore = new DataStore()

root.render(
    <Context.Provider value={{
        user: userStore,
        data: dataStore 
    }}>
        <App />
    </Context.Provider>
)