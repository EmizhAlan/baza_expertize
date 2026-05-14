import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
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
    const [basesFilter, setBasesFilter] = useState('все');
    
    // 👇 НОВЫЕ СОСТОЯНИЯ ДЛЯ КОНТЕКСТНОГО МЕНЮ
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        selectedCase: null
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

    useEffect(() => {
        if (currentUser && (activeTab === 'create' || activeTab === 'work')) {
            loadUserCases();
        }
    }, [activeTab, currentUser]);

    useEffect(() => {
        if (currentUser && (activeTab === 'bases' || activeTab === 'report')) {
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
                console.log('📦 Получено дел:', response.data.cases.length);
                if (response.data.cases.length > 0) {
                    console.log('🔍 Пример первого дела:', response.data.cases[0]);
                    console.log('🔑 Доступные ключи:', Object.keys(response.data.cases[0]));
                }
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
                filter: filter
            });
            
            if (response.data.success) {
                console.log('📊 Отчет: получено дел:', response.data.cases.length);
                if (response.data.cases.length > 0) {
                    console.log('🔍 Первое дело (проверь имена полей):', response.data.cases[0]);
                }
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
    
    useEffect(() => {
        if (currentUser && activeTab === 'bases') {
            loadAllCases();
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
                setIsEditDialogOpen(false);
                loadUserCases();
                if (activeTab === 'bases') {
                    loadAllCases(basesFilter);
                }
            } else {
                alert('Ошибка: ' + response.data.error);
            }
        } catch (err) {
            console.error('Ошибка отправки:', err);
            alert('Не удалось сохранить: ' + err.message);
        }
    };

    // 👇 ФУНКЦИЯ УДАЛЕНИЯ ДЕЛА
    const handleDeleteCase = async (caseItem) => {
        console.log('🗑️ Удаляем дело:', caseItem); // 👈 Смотри структуру в консоли
        
        // 👇 Берём реальные значения из объекта
        const nomerDela = caseItem.номер_дела || caseItem.nomer_dela || '';
        const vhNomer = caseItem.входящий_номер || caseItem.vh_nomer || '';
        
        // Если оба пустые - пробуем по дате и адресу (менее надёжно)
        
        
        const confirmDelete = window.confirm(
            `Вы уверены, что хотите удалить дело?\n\n` +
            `📋 Номер дела: ${nomerDela || 'N/A'}\n` +
            `📥 Входящий номер: ${vhNomer || 'N/A'}\n` +
            `📍 Адрес: ${caseItem.адрес?.substring(0, 50) || 'N/A'}...\n` +
            `📅 Дата: ${caseItem.дата_поступления || 'N/A'}`
        );
        
        if (!confirmDelete) return;
        
        try {
            const response = await axios.post(`${API_URL}/api/delete-case`, {
                connectionId: connection.connectionId,
                caseId: caseItem.id || null,
                nomerDela: nomerDela,
                vhNomer: vhNomer
            });
            
            if (response.data.success) {
                alert(`✅ Дело успешно удалено!\nУдалено записей: ${response.data.rowsAffected}`);
                loadUserCases();
                if (activeTab === 'bases') {
                    loadAllCases(basesFilter);
                }
            } else {
                alert('❌ Ошибка при удалении: ' + (response.data.error || response.data.message));
            }
        } catch (err) {
            console.error('Ошибка удаления:', err);
            alert('Не удалось удалить дело: ' + err.message);
        }
    };

    // 👇 ОБРАБОТЧИК ПРАВОГО КЛИКА
    const handleContextMenu = (e, caseItem) => {
        e.preventDefault();
        e.stopPropagation();
        
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            selectedCase: caseItem
        });
    };

    // 👇 ЗАКРЫТИЕ МЕНЮ ПРИ КЛИКЕ ВНЕ ЕГО
    useEffect(() => {
        const handleClick = () => {
            setContextMenu(prev => ({ ...prev, visible: false }));
        };
        
        if (contextMenu.visible) {
            document.addEventListener('click', handleClick);
        }
        
        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [contextMenu.visible]);

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

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        
        // Если дата уже в русском формате (содержит "г." или русские буквы месяца)
        if (typeof dateString === 'string' && (dateString.includes('г.') || /[а-яё]/i.test(dateString))) {
            return dateString;
        }
    
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Если не распарсилось — возвращаем как есть
            
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }) + '';
        } catch {
            return dateString;
        }
    };

    if (!connection) {
        return <div>Загрузка...</div>;
    }


    const exportToExcel = () => {
        const excelData = allCases.map((item, index) => {
            // Логика та же, что в calculateDeadline
            let endDateValue = (item.prodlen_otmetka === '1' || item.prodlen_otmetka === 1) 
                ? item.prodlen_1 
                : item.дата_окончания;
            const deadlineText = endDateValue ? `срок до ${formatDate(endDateValue)}` : '-';
            
            return {
                "№": index + 1,
                "Дата входного письма": item.дата_поступления || '',
                "Номер входного письма": item.входящий_номер || '',
                "Номер дела": item.номер_дела || '',
                "Наименование суда": item.судебныйОрган || item.sudebnyj_organ || '',
                "Срок выполнения": deadlineText,
                "Исполнитель": item.исполнитель || '',
                "Цель экспертизы": item.вид || ''
            };
        });
    
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Отчет");
    
        ws['!cols'] = [
            { wch: 5 },   // №
            { wch: 20 },  // Дата входного письма
            { wch: 20 },  // Номер входного письма
            { wch: 15 },  // Номер дела
            { wch: 35 },  // Наименование суда
            { wch: 25 },  // Срок выполнения
            { wch: 15 },  // Исполнитель
            { wch: 25 }   // Цель экспертизы
        ];
    
        const today = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
        XLSX.writeFile(wb, `Отчет_экспертиз_${today}.xlsx`);
    };

    // Расчёт срока выполнения в днях
    // Форматирует дату окончания как "срок до 15 мая 2026 г."
    const calculateDeadline = (item) => {
        // 1. Выбираем нужную дату окончания
        const isExtended = item.prodlen_otmetka === '1' || item.prodlen_otmetka === 1;
        let targetDate = isExtended ? item.prodlen_1 : item.дата_окончания;
    
        // 2. Если даты нет
        if (!targetDate) return '-';
    
        // 3. Форматируем через нашу надёжную функцию
        const formatted = formatDate(targetDate);
        
        // 4. Если форматирование не сработало
        if (formatted === '-' || formatted.includes('Invalid')) return '-';
    
        return `срок до ${formatted}`;
    };

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
                                setIsDialogOpen(false);
                            }
                        }}
                    >
                        {getTabName(tab)}
                    </button>
                ))}
            </div>

            {/* Диалоговое окно создания/редактирования дела */}
            <CreateCaseDialog 
                isOpen={isDialogOpen || isEditDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setIsEditDialogOpen(false);
                }}
                onSave={handleSaveCase}
                userData={currentUser}
                editData={isEditDialogOpen ? contextMenu.selectedCase : null}
            />

            {/* 👇 КОНТЕКСТНОЕ МЕНЮ */}
            {contextMenu.visible && (
                <div 
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        left: contextMenu.x,
                        top: contextMenu.y,
                        zIndex: 1000
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="context-menu-item" onClick={() => {
                        setIsDialogOpen(true);
                        setContextMenu(prev => ({ ...prev, visible: false }));
                    }}>
                        📝 создать
                    </div>
                    <div className="context-menu-item" onClick={() => {
                        setIsEditDialogOpen(true);
                        setContextMenu(prev => ({ ...prev, visible: false }));
                    }}>
                        ✏️ редактировать
                    </div>
                    <div className="context-menu-item delete" onClick={() => {
                        handleDeleteCase(contextMenu.selectedCase);
                        setContextMenu(prev => ({ ...prev, visible: false }));
                    }}>
                        🗑️ удалить
                    </div>
                    <div className="context-menu-item" onClick={() => {
                        // Функция "найти" будет позже
                        alert('Функция "найти" в разработке');
                        setContextMenu(prev => ({ ...prev, visible: false }));
                    }}>
                        🔍 найти
                    </div>
                </div>
            )}

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
                                        <tr 
                                            key={index}
                                            onContextMenu={(e) => handleContextMenu(e, caseItem)}
                                            style={{ cursor: 'context-menu' }}
                                        >
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
                                    {allCases.map((caseItem, index) => (
                                        <tr 
                                            key={index}
                                            onContextMenu={(e) => handleContextMenu(e, caseItem)}
                                            style={{ cursor: 'context-menu' }}
                                        >
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
            
            {activeTab === 'edit' && <div className="tab-content"><h3>Правка</h3><p>Функция в разработке</p></div>}
            {activeTab === 'payment' && <div className="tab-content"><h3>Оплата</h3><p>Функция в разработке</p></div>}
            {activeTab === 'report' && (
                <div className="report-container">
                    <div className="report-header">
                        <h3>📊 Отчет по экспертизам</h3>
                        <button className="btn-export-excel" onClick={exportToExcel}>
                            📥 Экспорт в Excel
                        </button>
                    </div>
            
                    {loading && <div className="loading">Загрузка данных отчета...</div>}
            
                    {!loading && allCases.length === 0 && (
                        <p className="no-cases">Нет данных для формирования отчета</p>
                    )}
            
                    {!loading && allCases.length > 0 && (
                        <div className="cases-table-wrapper">
                            <div className="table-info">
                                Найдено: <strong>{allCases.length}</strong> записей
                            </div>
                            <table className="cases-table report-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px', textAlign: 'center' }}>№</th>
                                        <th>Дата вх письма</th>
                                        <th>Номер вх письма</th>
                                        <th>Номер дела</th>
                                        <th>Наименование суда, назначившего экспертизу</th>
                                        <th>Срок выполнения, согласно определению суда</th>
                                        <th>Исполнитель</th>
                                        <th>Цель экспертизы</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allCases.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ textAlign: 'center', fontWeight: '500', width: '40px' }}>{index + 1}</td>
                                            <td>{formatDate(item.дата_поступления)}</td>
                                            <td>{item.входящий_номер || '-'}</td>
                                            <td>{item.номер_дела || '-'}</td>
                                            <td>{item.судебныйОрган || item.sudebnyj_organ || '-'}</td>
                                            <td>{calculateDeadline(item)}</td>
                                            <td>{item.исполнитель || '-'}</td>
                                            <td>{item.вид || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'print' && <div className="tab-content"><h3>Печать</h3><p>Функция в разработке</p></div>}
        </div>
    );
};

export default DatabaseViewer;