import React, { useState } from 'react';
import axios from 'axios';
import './styles/LoginPage.css';
import logoImage from './images/favicon.ico';
import logo from './images/logo.jpg';

const LoginPage = ({ onLoginSuccess }) => {
    const [server, setServer] = useState('192.168.43.92\\SERVER');
    const [database, setDatabase] = useState('baza');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOk = async () => {
        if (!server || !database || !username) {
            setError('Пожалуйста, заполните все поля');
            return;
        }

        setLoading(true);
        setError('');

        const connectionId = 'conn_' + Date.now();

        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

        try {
            const response = await axios.post(`${API_URL}/api/connect`, {
                server: server,
                database: database,
                username: username,
                password: password,
                connectionId: connectionId
            });

            if (response.data.success) {
                localStorage.setItem('dbConnection', JSON.stringify({
                    connectionId: connectionId,
                    server: server,
                    database: database,
                    username: username,
                    tables: response.data.tables
                }));
                
                onLoginSuccess(true);
            } else {
                setError(response.data.error || 'Ошибка подключения');
            }
        } catch (err) {
            console.error('Ошибка:', err);
            setError(err.response?.data?.error || 'Не удалось подключиться к серверу');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setServer('');
        setDatabase('');
        setUsername('');
        setPassword('');
        setError('');
    };

    const handleClose = () => {
        // Обработка закрытия окна
        if (window.confirm('Закрыть окно?')) {
            handleCancel();
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Title Bar */}
                <div className="title-bar">
                    <h1>
                        <img src={logoImage} alt='Краевое БТИ' className="logo-image"></img>
                        База дел экспертиз
                    </h1>
                    <button className="close-btn" onClick={handleClose}>✕</button>
                </div>

                {/* Error Message */}
                {error && <div className="error-message">{error}</div>}

                {/* Main Content */}
                <div className="login-content">
                    {/* Logo Section */}
                    <div className="logo-section">
                        <div className="">
                            <div className="">
                                <img src={logo} alt='Краевое БТИ' className="logo-image2"></img>
                            </div>
                            
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="form-section">
                        <div className="form-row">
                            <label>сервер</label>
                            <input
                                type="text"
                                value={server}
                                onChange={(e) => setServer(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-row">
                            <label>база</label>
                            <input
                                type="text"
                                value={database}
                                onChange={(e) => setDatabase(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="section-title">Имя пользователя</div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Введите имя пользователя"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-row">
                            <label>Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Введите пароль"
                                disabled={loading}
                                onKeyPress={(e) => e.key === 'Enter' && handleOk()}
                            />
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="button-section">
                    <button 
                        onClick={handleOk} 
                        className="btn btn-ok"
                        disabled={loading}
                    >
                        {loading ? 'Подключение...' : 'OK'}
                    </button>
                    <button 
                        onClick={handleCancel} 
                        className="btn btn-cancel"
                        disabled={loading}
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;