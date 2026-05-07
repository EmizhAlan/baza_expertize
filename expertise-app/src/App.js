import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import DatabaseViewer from './components/DatabaseViewer';
import './index.css';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        // Проверяем, есть ли сохранённое подключение
        return localStorage.getItem('dbConnection') !== null;
    });

    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={setIsLoggedIn} />;
    }

    return <DatabaseViewer />;
}

export default App;