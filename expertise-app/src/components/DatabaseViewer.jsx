import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import CreateCaseDialog from './CreateCaseDialog';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

    // 👇 ФИЛЬТРЫ ДЛЯ ОТЧЕТА
    const [reportFilters, setReportFilters] = useState({
        номер: '',
        датаВхПисьма: '',
        номерВхПисьма: '',
        номерДела: '',
        наименованиеСуда: '',
        срокВыполнения: '',
        исполнитель: '',
        цельЭкспертизы: ''
    });
    
    // 👇 МОДАЛЬНОЕ ОКНО ПРОСМОТРА ДЕЛА
    const [viewCaseModal, setViewCaseModal] = useState({
        visible: false,
        caseData: null
    });

    // Состояние видимости фильтра
    const [showFilters, setShowFilters] = useState(false);
    
    // Вычисляем уникальные значения для фильтров
    const uniqueValues = React.useMemo(() => {
        const courts = new Set();
        const executors = new Set();
        const goals = new Set();
        
        allCases.forEach(caseItem => {
            if (caseItem.судебный_орган || caseItem.sudebnyj_organ) {
                courts.add(caseItem.судебный_орган || caseItem.sudebnyj_organ);
            }
            if (caseItem.исполнитель || caseItem.ispolnitel) {
                executors.add(caseItem.исполнитель || caseItem.ispolnitel);
            }
            if (caseItem.вид || caseItem.vid) {
                goals.add(caseItem.вид || caseItem.vid);
            }
        });
        
        return {
            courts: Array.from(courts).sort(),
            executors: Array.from(executors).sort(),
            goals: Array.from(goals).sort()
        };
    }, [allCases]);

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

    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (объявляем ДО filteredCases) =====
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

    // Функция для нестрогого поиска
    const matchesFilter = (value, filter) => {
        if (!filter) return true;
        if (!value) return false;
        return String(value).toLowerCase().includes(filter.toLowerCase());
    };
    
    // Обновление фильтра
    const handleFilterChange = (field, value) => {
        setReportFilters(prev => ({ ...prev, [field]: value }));
    };
    
    // Сброс всех фильтров
    const clearAllFilters = () => {
        setReportFilters({
            номер: '',
            датаВхПисьма: '',
            номерВхПисьма: '',
            номерДела: '',
            наименованиеСуда: '',
            срокВыполнения: '',
            исполнитель: '',
            цельЭкспертизы: ''
        });
    };
    
    // Открытие модального окна с деталями дела
    const openCaseDetails = (caseItem) => {
        setViewCaseModal({ visible: true, caseData: caseItem });
    };
    
    // Закрытие модального окна
    const closeCaseDetails = () => {
        setViewCaseModal({ visible: false, caseData: null });
    };

    // ===== Форматирование даты как ДД.ММ.ГГГГ =====
    const formatShortDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        } catch {
            return dateString;
        }
    };
    
    // ===== Расчёт срока в понятном формате =====
    const calculateDeadlineText = (item) => {
        // Определяем дату окончания (продленная или обычная)
        const isExtended = item.prodlen_otmetka === '1' || item.prodlen_otmetka === 1;
        const endDateStr = isExtended ? (item.prodlen_1 || item.дата_окончания) : item.дата_окончания;
        const startDateStr = item.дата_начала;
        
        if (!startDateStr || !endDateStr) return '-';
        
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '-';
        
        // Разница в днях
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Логика отображения
        if (diffDays < 30) {
            return 'в течении месяца';
        } else if (diffDays === 30) {
            return '30 дней';
        } else {
            // Больше 30 дней — считаем полные месяцы (30 дней = 1 месяц)
            const months = Math.floor(diffDays / 30);
            return `${months} ${getMonthWord(months)}`;
        }
    };
    
    // Склонение слова "месяц" (1 месяц, 2 месяца, 5 месяцев)
    const getMonthWord = (n) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return ['месяцев', 'месяц', 'месяца'][cases[(n % 100 > 4 && n % 100 < 20) ? 2 : Math.min(n % 10, 5)]];
    };

    // ===== ФИЛЬТРАЦИЯ ДАННЫХ ОТЧЕТА =====
    const filteredCases = allCases.filter(caseItem => {
        const f = reportFilters;
        
        return (
            matchesFilter(caseItem.номер_дела || caseItem.nomer_dela, f.номерДела) &&
            matchesFilter(formatDate(caseItem.дата_начала || caseItem.data_nachala), f.датаВхПисьма) &&
            matchesFilter(caseItem.входящий_номер || caseItem.vh_nomer, f.номерВхПисьма) &&
            matchesFilter(caseItem.судебный_орган || caseItem.sudebnyj_organ, f.наименованиеСуда) &&
            matchesFilter(calculateDeadline(caseItem), f.срокВыполнения) &&
            matchesFilter(caseItem.исполнитель || caseItem.ispolnitel, f.исполнитель) &&
            matchesFilter(caseItem.вид || caseItem.vid, f.цельЭкспертизы)
        );
    });
    
    if (!connection) {
        return <div>Загрузка...</div>;
    }


    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Отчет');
    
            worksheet.columns = [
                { header: '№', key: 'num', width: 5 },
                { header: 'Дата вх письма', key: 'date', width: 20 },
                { header: 'Номер вх письма', key: 'vhNum', width: 20 },
                { header: 'Номер дела', key: 'caseNum', width: 15 },
                { header: 'Наименование суда', key: 'court', width: 35 },
                { header: 'Срок выполнения', key: 'deadline', width: 28 },
                { header: 'Исполнитель', key: 'executor', width: 15 },
                { header: 'Вид экспертизы', key: 'goal', width: 25 }
            ];
    
            // Стиль заголовка
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, size: 12, name: 'Calibri', color: { argb: 'FF000000' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            headerRow.height = 22;
            
            headerRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            });
    
            // Форматирование даты (используем твою существующую функцию formatDate)
            const formatShortDate = (dateString) => {
                if (!dateString) return '';
                try {
                    // Если дата уже в русском формате
                    if (typeof dateString === 'string' && (dateString.includes('г.') || /[а-яё]/i.test(dateString))) {
                        return dateString;
                    }
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}.${month}.${year}`;
                } catch {
                    return '';
                }
            };
    
            // Заполнение данных
            filteredCases.forEach((item, index) => {
                // 👇 Дата вх письма — пробуем все возможные варианты
                const dateValue = 
                    item.дата_поступления || 
                    item.дата_начала || 
                    item.data_nachala ||
                    item.date ||
                    item.createdAt ||
                    '';
                
                const formattedDate = formatShortDate(dateValue);
                
                // 👇 Срок выполнения — проверяем продление
                const isExtended = item.prodlen_otmetka === '1' || item.prodlen_otmetka === 1;
                
                let deadlineDate = '';
                if (isExtended) {
                    // Если продлено — берём дату продления
                    deadlineDate = 
                        item.prodlen_1 || 
                        item.продлено_до ||
                        item.дата_окончания ||
                        item.data_okonchaniya ||
                        '';
                } else {
                    // Если не продлено — обычная дата окончания
                    deadlineDate = 
                        item.дата_окончания || 
                        item.data_okonchaniya ||
                        '';
                }
                
                const deadlineText = deadlineDate ? `срок до ${formatShortDate(deadlineDate)}` : '-';
                
                const row = worksheet.addRow({
                    num: index + 1,
                    date: formattedDate,
                    vhNum: item.входящий_номер || item.vh_nomer || '',
                    caseNum: item.номер_дела || item.nomer_dela || '',
                    court: item.судебный_орган || item.sudebnyj_organ || item.судебныйОрган || '',
                    deadline: deadlineText,
                    executor: item.исполнитель || item.ispolnitel || '',
                    goal: item.вид || item.vid || ''
                });
    
                // Стиль для строк
                row.eachCell((cell) => {
                    cell.font = { size: 11, name: 'Calibri', color: { argb: 'FF000000' } };
                    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    };
                });
            });
    
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const today = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
            saveAs(blob, `Отчет_экспертиз_${today}.xlsx`);
            
        } catch (err) {
            console.error('❌ Ошибка экспорта:', err);
            alert('Не удалось экспортировать: ' + err.message);
        }
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
                                <div className="report-actions">
                                    <button className="btn-export-excel" onClick={exportToExcel}>
                                        📥 Экспорт в Excel
                                    </button>
                    
                                </div>
                            </div>
                    
                            {/* 👇 ПАНЕЛЬ ФИЛЬТРОВ (компактная, вертикальная) */}
                            <div className="filters-section">
                                <button 
                                    className="btn-toggle-filters" 
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    {showFilters ? '🔼 Скрыть фильтры' : '🔽 Фильтры'}
                                </button>
                                
                                {showFilters && (
                                    <div className="filters-panel vertical">
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="№" 
                                                value={reportFilters.номер} 
                                                onChange={(e) => handleFilterChange('номер', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Дата вх письма" 
                                                value={reportFilters.датаВхПисьма} 
                                                onChange={(e) => handleFilterChange('датаВхПисьма', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Номер вх письма" 
                                                value={reportFilters.номерВхПисьма} 
                                                onChange={(e) => handleFilterChange('номерВхПисьма', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Номер дела" 
                                                value={reportFilters.номерДела} 
                                                onChange={(e) => handleFilterChange('номерДела', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Наименование суда" 
                                                list="courts-list"
                                                value={reportFilters.наименованиеСуда} 
                                                onChange={(e) => handleFilterChange('наименованиеСуда', e.target.value)} 
                                            />
                                            <datalist id="courts-list">
                                                {uniqueValues.courts.map((court, idx) => (
                                                    <option key={idx} value={court} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Срок выполнения" 
                                                value={reportFilters.срокВыполнения} 
                                                onChange={(e) => handleFilterChange('срокВыполнения', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Исполнитель" 
                                                list="executors-list"
                                                value={reportFilters.исполнитель} 
                                                onChange={(e) => handleFilterChange('исполнитель', e.target.value)} 
                                            />
                                            <datalist id="executors-list">
                                                {uniqueValues.executors.map((exec, idx) => (
                                                    <option key={idx} value={exec} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Вид экспертизы" 
                                                list="goals-list"
                                                value={reportFilters.цельЭкспертизы} 
                                                onChange={(e) => handleFilterChange('цельЭкспертизы', e.target.value)} 
                                            />
                                            <datalist id="goals-list">
                                                {uniqueValues.goals.map((goal, idx) => (
                                                    <option key={idx} value={goal} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="filter-actions">
                                            <button className="btn-clear-filters" onClick={clearAllFilters}>
                                                🗑️ Сбросить
                                            </button>
                                            <span className="filter-count">
                                                Найдено: <strong>{filteredCases.length}</strong> из <strong>{allCases.length}</strong>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                    
                            {loading && <div className="loading">Загрузка данных отчета...</div>}
                    
                            {!loading && filteredCases.length === 0 && (
                                <p className="no-cases">Нет данных{Object.values(reportFilters).some(f => f) ? ' по заданным фильтрам' : ''} для формирования отчета</p>
                            )}
                    
                            {!loading && filteredCases.length > 0 && (
                                <div className="cases-table-wrapper">
                                    <div className="table-info">Показано: <strong>{filteredCases.length}</strong> из <strong>{allCases.length}</strong> записей</div>
                                    <table className="cases-table report-table">
                                        <thead>
                                            <tr>
                                                <th style={{width:'50px',textAlign:'center'}}>№</th>
                                                <th>Дата вх письма</th>
                                                <th>Номер вх письма</th>
                                                <th>Номер дела</th>
                                                <th>Наименование суда</th>
                                                <th>Срок выполнения</th>
                                                <th>Исполнитель</th>
                                                <th>Вид экспертизы</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCases.map((caseItem, index) => (
                                                <tr 
                                                    key={index}
                                                    onDoubleClick={() => openCaseDetails(caseItem)}
                                                    style={{ cursor: 'pointer' }}
                                                    title="Дважды кликните для просмотра деталей"
                                                >
                                                    <td>{index + 1}</td>
                                                    <td>{formatDate(caseItem.дата_начала || caseItem.data_nachala)}</td>
                                                    <td>{caseItem.входящий_номер || caseItem.vh_nomer || '-'}</td>
                                                    <td>{caseItem.номер_дела || caseItem.nomer_dela || '-'}</td>
                                                    <td>{caseItem.судебный_орган || caseItem.sudebnyj_organ || '-'}</td>
                                                    <td>{calculateDeadline(caseItem)}</td>
                                                    <td>{caseItem.исполнитель || caseItem.ispolnitel || '-'}</td>
                                                    <td>{caseItem.вид || caseItem.vid || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    
                            {/* 👇 МОДАЛЬНОЕ ОКНО ПРОСМОТРА ДЕЛА */}
                            {viewCaseModal.visible && viewCaseModal.caseData && (
                                <div className="modal-overlay" onClick={closeCaseDetails}>
                                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                                        <div className="modal-header">
                                            <h4>📋 Детали дела № {viewCaseModal.caseData.номер_дела || 'N/A'}</h4>
                                            <button className="modal-close" onClick={closeCaseDetails}>×</button>
                                        </div>
                                        <div className="modal-body">
                                            <div className="case-details-grid">
                                                <div className="detail-row"><label>Дата поступления:</label><span>{formatDate(viewCaseModal.caseData.дата_поступления)}</span></div>
                                                <div className="detail-row"><label>Дата начала:</label><span>{formatDate(viewCaseModal.caseData.дата_начала || viewCaseModal.caseData.data_nachala)}</span></div>
                                                <div className="detail-row"><label>Дата окончания:</label><span>{formatDate(viewCaseModal.caseData.дата_окончания || viewCaseModal.caseData.data_okonchaniya)}</span></div>
                                                <div className="detail-row"><label>Продлено до:</label><span>{formatDate(viewCaseModal.caseData.продлено_до || viewCaseModal.caseData.prodlen_1) || '—'}</span></div>
                                                <div className="detail-row"><label>Входящий номер:</label><span>{viewCaseModal.caseData.входящий_номер || viewCaseModal.caseData.vh_nomer || '—'}</span></div>
                                                <div className="detail-row"><label>Номер дела:</label><span>{viewCaseModal.caseData.номер_дела || viewCaseModal.caseData.nomer_dela || '—'}</span></div>
                                                <div className="detail-row"><label>Судебный орган:</label><span>{viewCaseModal.caseData.судебный_орган || viewCaseModal.caseData.sudebnyj_organ || '—'}</span></div>
                                                <div className="detail-row"><label>Судья:</label><span>{viewCaseModal.caseData.судья || '—'}</span></div>
                                                <div className="detail-row"><label>Вид экспертизы:</label><span>{viewCaseModal.caseData.вид || viewCaseModal.caseData.vid || '—'}</span></div>
                                                <div className="detail-row"><label>Адрес:</label><span>{viewCaseModal.caseData.адрес || '—'}</span></div>
                                                <div className="detail-row"><label>Исполнитель:</label><span>{viewCaseModal.caseData.исполнитель || viewCaseModal.caseData.ispolnitel || '—'}</span></div>
                                                <div className="detail-row"><label>Статус:</label><span>{(viewCaseModal.caseData.выполнено === '1' || viewCaseModal.caseData.выполнено === 1) ? '✅ Выполнено' : '⏳ В работе'}</span></div>
                                                <div className="detail-row full-width"><label>Иск / Требования:</label><span className="detail-text">{viewCaseModal.caseData.иск || '—'}</span></div>
                                                <div className="detail-row full-width"><label>Дополнение:</label><span className="detail-text">{viewCaseModal.caseData.дополнение || viewCaseModal.caseData.komentarii || '—'}</span></div>
                                            </div>
                                        </div>
                                        <div className="modal-footer">
                                            <button className="btn-ok" onClick={() => { setIsEditDialogOpen(true); setContextMenu({ visible: false, selectedCase: viewCaseModal.caseData }); closeCaseDetails(); }}>✏️ Редактировать</button>
                                            <button className="btn-cancel" onClick={closeCaseDetails}>Закрыть</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
            {activeTab === 'print' && 
            
            (
                        <div className="report-container">
                            <div className="report-header">
                                <h3>📊 Отчет по экспертизам</h3>
                                <div className="report-actions">
                                    <button className="btn-export-excel" onClick={exportToExcel}>
                                        📥 Экспорт в Excel
                                    </button>
                    
                                </div>
                            </div>
                    
                            {/* 👇 ПАНЕЛЬ ФИЛЬТРОВ (компактная, вертикальная) */}
                            <div className="filters-section">
                                <button 
                                    className="btn-toggle-filters" 
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    {showFilters ? '🔼 Скрыть фильтры' : '🔽 Фильтры'}
                                </button>
                                
                                {showFilters && (
                                    <div className="filters-panel vertical">
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="№" 
                                                value={reportFilters.номер} 
                                                onChange={(e) => handleFilterChange('номер', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Дата вх письма" 
                                                value={reportFilters.датаВхПисьма} 
                                                onChange={(e) => handleFilterChange('датаВхПисьма', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Номер вх письма" 
                                                value={reportFilters.номерВхПисьма} 
                                                onChange={(e) => handleFilterChange('номерВхПисьма', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Номер дела" 
                                                value={reportFilters.номерДела} 
                                                onChange={(e) => handleFilterChange('номерДела', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Наименование суда" 
                                                list="courts-list"
                                                value={reportFilters.наименованиеСуда} 
                                                onChange={(e) => handleFilterChange('наименованиеСуда', e.target.value)} 
                                            />
                                            <datalist id="courts-list">
                                                {uniqueValues.courts.map((court, idx) => (
                                                    <option key={idx} value={court} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Срок выполнения" 
                                                value={reportFilters.срокВыполнения} 
                                                onChange={(e) => handleFilterChange('срокВыполнения', e.target.value)} 
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Исполнитель" 
                                                list="executors-list"
                                                value={reportFilters.исполнитель} 
                                                onChange={(e) => handleFilterChange('исполнитель', e.target.value)} 
                                            />
                                            <datalist id="executors-list">
                                                {uniqueValues.executors.map((exec, idx) => (
                                                    <option key={idx} value={exec} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="filter-group">
                                            <input 
                                                type="text" 
                                                className="filter-input" 
                                                placeholder="Вид экспертизы" 
                                                list="goals-list"
                                                value={reportFilters.цельЭкспертизы} 
                                                onChange={(e) => handleFilterChange('цельЭкспертизы', e.target.value)} 
                                            />
                                            <datalist id="goals-list">
                                                {uniqueValues.goals.map((goal, idx) => (
                                                    <option key={idx} value={goal} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="filter-actions">
                                            <button className="btn-clear-filters" onClick={clearAllFilters}>
                                                🗑️ Сбросить
                                            </button>
                                            <span className="filter-count">
                                                Найдено: <strong>{filteredCases.length}</strong> из <strong>{allCases.length}</strong>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                    
                            {loading && <div className="loading">Загрузка данных отчета...</div>}
                    
                            {!loading && filteredCases.length === 0 && (
                                <p className="no-cases">Нет данных{Object.values(reportFilters).some(f => f) ? ' по заданным фильтрам' : ''} для формирования отчета</p>
                            )}
                    
                            {!loading && filteredCases.length > 0 && (
                                <div className="cases-table-wrapper">
                                    <div className="table-info">Показано: <strong>{filteredCases.length}</strong> из <strong>{allCases.length}</strong> записей</div>
                                    <table className="cases-table report-table">
                                        <thead>
                                            <tr>
                                                <th style={{width:'50px',textAlign:'center'}}>№</th>
                                                <th>Дата вх письма</th>
                                                <th>Номер вх письма</th>
                                                <th>Номер дела</th>
                                                <th>Наименование суда</th>
                                                <th>Срок выполнения</th>
                                                <th>Исполнитель</th>
                                                <th>Статус</th>
                                                <th>Вид экспертизы</th>
                                                <th>Цель</th>
                                                <th>Оплачено</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCases.map((caseItem, index) => (
                                                <tr 
                                                    key={index}
                                                    onDoubleClick={() => openCaseDetails(caseItem)}
                                                    style={{ cursor: 'pointer' }}
                                                    title="Дважды кликните для просмотра деталей"
                                                >
                                                    <td>{index + 1}</td>
                                                    <td>{formatDate(caseItem.дата_начала || caseItem.data_nachala)}</td>
                                                    <td>{caseItem.входящий_номер || caseItem.vh_nomer || '-'}</td>
                                                    <td>{caseItem.номер_дела || caseItem.nomer_dela || '-'}</td>
                                                    <td>{caseItem.судебный_орган || caseItem.sudebnyj_organ || '-'}</td>
                                                    <td>{calculateDeadline(caseItem)}</td>
                                                    <td>{caseItem.исполнитель || caseItem.ispolnitel || '-'}</td>
                                                    <td>{'-'}</td>
                                                    <td>{caseItem.вид || caseItem.vid || '-'}</td>
                                                    <td>{'-'}</td>
                                                    <td>{'-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    
                            {/* 👇 МОДАЛЬНОЕ ОКНО ПРОСМОТРА ДЕЛА */}
                            {viewCaseModal.visible && viewCaseModal.caseData && (
                                <div className="modal-overlay" onClick={closeCaseDetails}>
                                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                                        <div className="modal-header">
                                            <h4>📋 Детали дела № {viewCaseModal.caseData.номер_дела || 'N/A'}</h4>
                                            <button className="modal-close" onClick={closeCaseDetails}>×</button>
                                        </div>
                                        <div className="modal-body">
                                            <div className="case-details-grid">
                                                <div className="detail-row"><label>Дата поступления:</label><span>{formatDate(viewCaseModal.caseData.дата_поступления)}</span></div>
                                                <div className="detail-row"><label>Дата начала:</label><span>{formatDate(viewCaseModal.caseData.дата_начала || viewCaseModal.caseData.data_nachala)}</span></div>
                                                <div className="detail-row"><label>Дата окончания:</label><span>{formatDate(viewCaseModal.caseData.дата_окончания || viewCaseModal.caseData.data_okonchaniya)}</span></div>
                                                <div className="detail-row"><label>Продлено до:</label><span>{formatDate(viewCaseModal.caseData.продлено_до || viewCaseModal.caseData.prodlen_1) || '—'}</span></div>
                                                <div className="detail-row"><label>Входящий номер:</label><span>{viewCaseModal.caseData.входящий_номер || viewCaseModal.caseData.vh_nomer || '—'}</span></div>
                                                <div className="detail-row"><label>Номер дела:</label><span>{viewCaseModal.caseData.номер_дела || viewCaseModal.caseData.nomer_dela || '—'}</span></div>
                                                <div className="detail-row"><label>Судебный орган:</label><span>{viewCaseModal.caseData.судебный_орган || viewCaseModal.caseData.sudebnyj_organ || '—'}</span></div>
                                                <div className="detail-row"><label>Судья:</label><span>{viewCaseModal.caseData.судья || '—'}</span></div>
                                                <div className="detail-row"><label>Вид экспертизы:</label><span>{viewCaseModal.caseData.вид || viewCaseModal.caseData.vid || '—'}</span></div>
                                                <div className="detail-row"><label>Адрес:</label><span>{viewCaseModal.caseData.адрес || '—'}</span></div>
                                                <div className="detail-row"><label>Исполнитель:</label><span>{viewCaseModal.caseData.исполнитель || viewCaseModal.caseData.ispolnitel || '—'}</span></div>
                                                <div className="detail-row"><label>Статус:</label><span>{(viewCaseModal.caseData.выполнено === '1' || viewCaseModal.caseData.выполнено === 1) ? '✅ Выполнено' : '⏳ В работе'}</span></div>
                                                <div className="detail-row full-width"><label>Иск / Требования:</label><span className="detail-text">{viewCaseModal.caseData.иск || '—'}</span></div>
                                                <div className="detail-row full-width"><label>Дополнение:</label><span className="detail-text">{viewCaseModal.caseData.дополнение || viewCaseModal.caseData.komentarii || '—'}</span></div>
                                            </div>
                                        </div>
                                        <div className="modal-footer">
                                            <button className="btn-ok" onClick={() => { setIsEditDialogOpen(true); setContextMenu({ visible: false, selectedCase: viewCaseModal.caseData }); closeCaseDetails(); }}>✏️ Редактировать</button>
                                            <button className="btn-cancel" onClick={closeCaseDetails}>Закрыть</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
            
            }
        </div>
    );
};

export default DatabaseViewer;