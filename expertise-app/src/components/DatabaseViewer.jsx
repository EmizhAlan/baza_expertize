import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CreateCaseDialog from './CreateCaseDialog';
import './styles/DatabaseViewer.css';

const DatabaseViewer = () => {
    const [connection, setConnection] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [tableData, setTableData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [customQuery, setCustomQuery] = useState('');
    const [queryResult, setQueryResult] = useState(null);
    const [activeTab, setActiveTab] = useState('create');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [userCases, setUserCases] = useState([]);
    const [allCases, setAllCases] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [basesFilter, setBasesFilter] = useState('все'); // 'все' | 'в работе' | 'выполненные'

    useEffect(() => {
        const savedConnection = localStorage.getItem('dbConnection');
        if (savedConnection) {
            const conn = JSON.parse(savedConnection);
            setConnection(conn);
            setCurrentUser({ username: conn.username });
            setTables(conn.tables || []);
            if (conn.tables && conn.tables.length > 0) {
                setSelectedTable(conn.tables[0].TABLE_NAME);
            }
        }
    }, []);

    // Загружаем дела пользователя при переключении на вкладку "create" или "work"
    useEffect(() => {
        if (currentUser && (activeTab === 'create' || activeTab === 'work')) {
            loadUserCases();
        }
    }, [activeTab, currentUser]);

    // Загружаем дела при переключении на вкладку "Базы" или изменении фильтра
    useEffect(() => {
        if (currentUser && activeTab === 'bases') {
            loadAllCases(basesFilter);
        }
    }, [activeTab, basesFilter, currentUser]);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const loadUserCases = async () => {
        if (!connection || !currentUser) return;
        
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/get-user-cases`, {
                connectionId: connection.connectionId,
                username: currentUser.username
            });
            
            if (response.data.success) {
                setUserCases(response.data.cases);
            } else {
                alert('Ошибка загрузки дел: ' + response.data.error);
            }
        } catch (err) {
            console.error('Ошибка загрузки дел:', err);
            alert('Не удалось загрузить дела: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadAllCases = async (filter = 'все') => {
        if (!connection) return;
        
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/get-all-cases`, {
                connectionId: connection.connectionId,
                filter: filter  // 👈 Передаём фильтр на сервер
            });
            
            if (response.data.success) {
                setAllCases(response.data.cases);
            } else {
                alert('Ошибка: ' + response.data.error);
            }
        } catch (err) {
            console.error('Ошибка загрузки дел:', err);
            alert('Не удалось загрузить дела: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Обновите useEffect для вкладки "Базы":
    useEffect(() => {
        if (currentUser && activeTab === 'bases') {
            loadAllCases(); // 👈 Без параметров
        }
    }, [activeTab, currentUser]); 
    
    const loadTableData = useCallback(async (tableName) => {
        if (!connection) return;
        
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/query-table`, {
                connectionId: connection.connectionId,
                tableName: tableName
            });
            
            if (response.data.success) {
                setTableData(response.data);
            } else {
                alert('Ошибка: ' + response.data.error);
            }
        } catch (err) {
            alert('Ошибка загрузки данных: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [connection]);

    const executeQuery = async () => {
        if (!customQuery.trim()) {
            alert('Введите SQL запрос');
            return;
        }
        
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/execute-query`, {
                connectionId: connection.connectionId,
                query: customQuery
            });
            
            if (response.data.success) {
                setQueryResult(response.data);
            } else {
                alert('Ошибка: ' + response.data.error);
            }
        } catch (err) {
            alert('Ошибка выполнения запроса: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTable) {
            loadTableData(selectedTable);
        }
    }, [selectedTable, loadTableData]);

    const handleSaveCase = async (caseData) => {
        try {
            const payload = {
                connectionId: connection.connectionId,
                caseData: {
                    ...caseData,
                    исполнитель: connection.username
                }
            };
    
            const response = await axios.post(`${API_URL}/api/save-case`, payload);
    
            if (response.data.success) {
                alert('✅ Дело успешно сохранено в базу!');
                setIsDialogOpen(false);
                // Перезагружаем список дел
                loadUserCases();
            } else {
                alert('Ошибка: ' + response.data.error);
            }
        } catch (err) {
            console.error('Ошибка отправки:', err);
            alert('Не удалось сохранить: ' + err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('dbConnection');
        window.location.reload();
    };

    const getTabName = (tab) => {
        const names = {
            'create': 'Создать',
            'edit': 'Правка',
            'work': 'Дела в работе',
            'bases': 'Базы',
            'payment': 'Оплата',
            'report': 'Отчет',
            'print': 'Печать'
        };
        return names[tab] || tab;
    };

    // Форматируем дату для отображения
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }) + ' г.';
        } catch {
            return dateString;
        }
    };

    if (!connection) {
        return <div>Загрузка...</div>;
    }

    return (
        <div className="database-viewer">
            <div className="viewer-header">
                <div className="connection-info">
                    <h2>База экспертиз</h2>
                    <div className="info-details">
                        <span>Пользователь - {connection.username}</span>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn-logout">
                    Выйти
                </button>
            </div>

            <div className="tabs">
                {['create', 'edit', 'work', 'bases', 'payment', 'report', 'print'].map(tab => (
                    <button 
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab(tab);
                            if (tab === 'create') {
                                setIsDialogOpen(false); // Не открываем диалог сразу
                            }
                        }}
                    >
                        {getTabName(tab)}
                    </button>
                ))}
            </div>

            {/* Диалоговое окно создания дела */}
            <CreateCaseDialog 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveCase}
                userData={currentUser}
            />

            {/* Вкладка "Создать" - показывает дела пользователя + кнопка создать */}
            {(activeTab === 'create' || activeTab === 'work') && (
                <div className="cases-tab">
                    <div className="tab-header">
                        <h3>Дела пользователя - {connection.username}</h3>
                        <button 
                            className="btn-create-new"
                            onClick={() => setIsDialogOpen(true)}
                        >
                            + Создать
                        </button>
                    </div>

                    {loading && <div className="loading">Загрузка дел...</div>}

                    {!loading && userCases.length === 0 && (
                        <div className="no-cases">
                            <p>Нет дел</p>
                            <button 
                                className="btn-create-new"
                                onClick={() => setIsDialogOpen(true)}
                            >
                                Создать первое дело
                            </button>
                        </div>
                    )}

                    {!loading && userCases.length > 0 && (
                        <div className="cases-table-wrapper">
                            <table className="cases-table">
                                <thead>
                                    <tr>
                                        <th className="col-date">дата поступления</th>
                                        <th className="col-vid">вид экспертиз</th>
                                        <th className="col-vh">входящий номер</th>
                                        <th className="col-nomer">номер дела</th>
                                        <th className="col-adres">адрес</th>
                                        <th className="col-status">статус</th>
                                        <th className="col-ispoln">исполнитель</th>
                                        <th className="col-sovm">совместно</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userCases.map((caseItem, index) => (
                                        <tr key={index}>
                                            <td>{formatDate(caseItem.дата_поступления)}</td>
                                            <td>{caseItem.вид || '-'}</td>
                                            <td>{caseItem.входящий_номер || '-'}</td>
                                            <td>{caseItem.номер_дела || '-'}</td>
                                            <td>{caseItem.адрес || '-'}</td>
                                            <td>
                                                {caseItem.выполнено === '1' || caseItem.выполнено === 1 
                                                    ? 'Выполнено' 
                                                    : 'Не выполнено'}
                                            </td>
                                            <td>{caseItem.исполнитель || '-'}</td>
                                            <td>{caseItem.совместно === '1' || caseItem.совместно === 1 ? '✓' : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Вкладка "Базы" - все дела с фильтром */}
            {activeTab === 'bases' && (
                <div className="cases-tab">
                    <div className="tab-header">
                        <h3>Все дела в базе</h3>
                        <div className="filter-controls">
                            <label>Фильтр:</label>
                            <select 
                                className="filter-select"
                                value={basesFilter}
                                onChange={(e) => {
                                    setBasesFilter(e.target.value);
                                    // loadAllCases вызывается автоматически через useEffect
                                }}
                            >
                                <option value="все">Все дела</option>
                                <option value="в работе">Дела в работе</option>
                                <option value="выполненные">Выполненные дела</option>
                            </select>
                        </div>
                    </div>
            
                    {loading && <div className="loading">Загрузка...</div>}
            
                    {!loading && allCases.length === 0 && (
                        <p className="no-cases">
                            Нет дел{basesFilter !== 'все' ? ` со статусом "${basesFilter}"` : ''} в базе
                        </p>
                    )}
            
                    {!loading && allCases.length > 0 && (
                        <div className="cases-table-wrapper">
                            <div className="table-info">
                                Найдено: <strong>{allCases.length}</strong> записей {basesFilter !== 'все' && `(фильтр: ${basesFilter})`}
                            </div>
                            <table className="cases-table">
                                <thead>
                                    <tr>
                                        <th className="col-date">дата поступления</th>
                                        <th className="col-vid">вид</th>
                                        <th className="col-vh">вх. номер</th>
                                        <th className="col-nomer">номер дела</th>
                                        <th className="col-adres">адрес</th>
                                        <th className="col-status">статус</th>
                                        <th className="col-ispoln">исполнитель</th>
                                        <th className="col-sovm">совм.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allCases.map((caseItem, index) => (
                                        <tr key={index}>
                                            <td>{formatDate(caseItem.дата_поступления)}</td>
                                            <td>{caseItem.вид || '-'}</td>
                                            <td>{caseItem.входящий_номер || '-'}</td>
                                            <td>{caseItem.номер_дела || '-'}</td>
                                            <td title={caseItem.адрес}>
                                                {caseItem.адрес ? caseItem.адрес.substring(0, 50) + (caseItem.адрес.length > 50 ? '...' : '') : '-'}
                                            </td>
                                            <td>
                                                {caseItem.выполнено === '1' || caseItem.выполнено === 1 
                                                    ? '✅ Выполнено' 
                                                    : '⏳ В работе'}
                                            </td>
                                            <td>{caseItem.исполнитель || '-'}</td>
                                            <td>{caseItem.совместно === '1' || caseItem.совместно === 1 ? '✓' : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {/* Остальные вкладки */}
            {activeTab === 'edit' && <div className="tab-content"><h3>Правка</h3><p>Функция в разработке</p></div>}
            {activeTab === 'payment' && <div className="tab-content"><h3>Оплата</h3><p>Функция в разработке</p></div>}
            {activeTab === 'report' && <div className="tab-content"><h3>Отчет</h3><p>Функция в разработке</p></div>}
            {activeTab === 'print' && <div className="tab-content"><h3>Печать</h3><p>Функция в разработке</p></div>}
        </div>
    );
};

export default DatabaseViewer;