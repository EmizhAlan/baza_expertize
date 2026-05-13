import React, { useState } from 'react';
import logoImage from './images/favicon.ico';
import './styles/CreateCaseDialog.css';
import { formatRussianDate, parseManualDate } from '../utils/dateFormatter';

const CreateCaseDialog = ({ isOpen, onClose, onSave, userData }) => {
    const [activeTab, setActiveTab] = useState('поручение');
    const [activeSubTab, setActiveSubTab] = useState('заявки');
    
    const [formData, setFormData] = useState({
        вид: '',
        датаНачала: new Date().toISOString().split('T')[0],
        датаОкончания: new Date().toISOString().split('T')[0],
        датаОпределения: new Date().toISOString().split('T')[0],
        датаОсмотра: new Date().toISOString().split('T')[0],
        времяОсмотра: '',
        месяц: '',
        продлить: false,
        номерДела: '',
        входящийНомер: '',
        номерЗаявки: '',
        кадыйНомер: '',
        адрес: '',
        дополнение: '',
        стоимость: '',
        стоимостьТип: '',
        исполнитель: userData?.username || '',
        совместно: false,
        судебныйОрган: '',
        судья: '',
        папка: '',
        иск: '',
        неОплачено: true,
        оплачено: false,
        бесплатно: false,
        неВыполнено: true,
        выполнено: false,
        безИсполнения: false,
        вРаботу: false
    });

        // Добавьте в начало компонента новое состояние
    const [продленоДо, setПродленоДо] = useState('');
    const [показатьПродление, setПоказатьПродление] = useState(false);
    const [второйИсполнитель, setВторойИсполнитель] = useState('');

    // Список судей привязанных к конкретным судам

    const [списокСудей, setСписокСудей] = useState([]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        const caseData = {
            ...formData,
            // Сохранение 30 дней
            kolichestvo_dnej: 30, 
            // 👇 Конвертируем ВСЕ даты в русский формат перед отправкой
            датаНачала: formatRussianDate(formData.датаНачала) || formData.датаНачала,
            датаОкончания: formatRussianDate(formData.датаОкончания) || formData.датаОкончания,
            датаОсмотра: formatRussianDate(formData.датаОсмотра) || formData.датаОсмотра,
            датаОпределения: formatRussianDate(formData.датаОпределения) || formData.датаОпределения,
            
            id: Date.now(),
            createdAt: new Date().toISOString(),
            createdBy: userData?.username || 'unknown'
        };
        
        console.log('📦 Отправляем в БД:', caseData);
        onSave(caseData);
        onClose();
    };
    
    // Функция загрузки судей
    // В начале компонента:
    
    const загрузитьСудей = async (courtName) => {
        try {
            // ✅ ШАГ 1: Сначала получаем и парсим данные из localStorage
            const dbConnectionRaw = localStorage.getItem('dbConnection');
            console.log('🔍 dbConnection raw:', dbConnectionRaw);
            
            if (!dbConnectionRaw) {
                console.error('❌ Нет dbConnection в localStorage');
                return;
            }
            
            const dbConnection = JSON.parse(dbConnectionRaw);
            
            // ✅ ШАГ 2: ТОЛЬКО ПОСЛЕ этого извлекаем connId
            const connId = dbConnection.connectionId;
            console.log('🔗 Используем connectionId:', connId);
            
            if (!connId) {
                console.error('❌ connectionId не найден в dbConnection');
                return;
            }
    
            // ✅ ШАГ 3: Теперь делаем запрос
            const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.40.52:5000';
            
            const response = await fetch(`${API_URL}/api/get-judges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    connectionId: connId,
                    courtName: courtName
                })
            });
            
            const data = await response.json();
            console.log('📥 Ответ сервера:', data);
            
            if (data.success) {
                setСписокСудей(data.judges);
                handleInputChange('судья', '');
            } else {
                console.error('❌ Ошибка сервера:', data.error);
            }
        } catch (err) {
            console.error('🌐 Ошибка в загрузитьСудей:', err);
        }
    };
    
    // Функция для добавления месяца к дате
    const добавитьМесяц = () => {
        // Безопасно парсим дату без сдвигов часовых поясов
        const [год, месяц, день] = formData.датаОкончания.split('-').map(Number);
        const дата = new Date(год, месяц - 1, день);
        
        // Прибавляем ровно 30 дней
        дата.setDate(дата.getDate() + 30);
        
        // Собираем обратно в строку YYYY-MM-DD
        const новаяДата = `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}-${String(дата.getDate()).padStart(2, '0')}`;
        
        handleInputChange('датаОкончания', новаяДата);
    };
    
    // Функция для продления
    /*const продлить = () => {
        if (продленоДо) {
            handleInputChange('датаОкончания', продленоДо);
            setПоказатьПродление(false);
            setПродленоДо('');
        }
    };*/

    if (!isOpen) return null;

    return (
        <div className="dialog-overlay">
            <div className="dialog-window">
                {/* Заголовок окна */}
                <div className="dialog-header">
                    <div className="header-left">
                        <img src={logoImage} alt='Краевое БТИ' className="logo-image"></img>
                        <h3>База экспертиз</h3>
                    </div>
                    <div className="header-buttons">
                        <button className="win-btn minimize">─</button>
                        <button className="win-btn maximize">□</button>
                        <button className="win-btn close" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* Главные вкладки */}
                <div className="dialog-tabs">
                    {['поручение', 'суд', 'клиентам', 'приставы'].map(tab => (
                        <button
                            key={tab}
                            className={`dialog-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Подвкладки */}
                <div className="dialog-subtabs">
                    {['заявки', 'заказчик', 'смс'].map(tab => (
                        <button
                            key={tab}
                            className={`dialog-subtab ${activeSubTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveSubTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Содержимое формы */}
                <div className="dialog-content">
                    {activeTab === 'поручение' && activeSubTab === 'заявки' && (
                        <div className="form-container">
                            {/* Левая колонка */}
                            <div className="form-column left-column">
                                <div className="form-row">
                                    <label className="field-label">вид</label>
                                    <select 
                                        className="form-input"
                                        value={formData.вид}
                                        onChange={(e) => handleInputChange('вид', e.target.value)}
                                    >
                                        <option value=""></option>
                                        <option value="строительно-техническая">строительно-техническая</option>
                                        <option value="землеустроительная">землеустроительная</option>
                                        <option value="строительно-землеустроительная">строительно-землеустр</option>
                                    </select>
                                </div>

                                <div className="date-row">
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    {/* Пример для даты начала */}
                                    <div className="date-field">
                                        <label className="date-label">дата начала</label>
                                        <div className="date-input-wrapper">
                                            {/* 👁️ Видимое поле с русской датой */}
                                            <input
                                                type="text"
                                                className="form-input date-input"
                                                value={formatRussianDate(formData.датаНачала)}
                                                onChange={(e) => {
                                                    // Парсим ручной ввод пользователя
                                                    const inputValue = e.target.value;
                                                    const parsedDate = parseManualDate(inputValue);
                                                    if (parsedDate) {
                                                        handleInputChange('датаНачала', parsedDate);
                                                    }
                                                }}
                                                placeholder="дд.мм.гггг"
                                            />
                                            {/* 📅 Кнопка календаря */}
                                            <button 
                                                type="button"
                                                className="calendar-icon-btn"
                                                onClick={() => {
                                                    const hiddenInput = document.getElementById('hidden-датаНачала');
                                                    if (hiddenInput) hiddenInput.showPicker?.() || hiddenInput.click();
                                                }}
                                                tabIndex={-1}
                                            >
                                                📅
                                            </button>
                                            {/* 👁️‍️ Скрытый input type="date" */}
                                            <input
                                                type="date"
                                                id="hidden-датаНачала"
                                                style={{ 
                                                    position: 'absolute',
                                                    opacity: 0,
                                                    pointerEvents: 'none',
                                                    width: '1px',
                                                    height: '1px'
                                                }}
                                                value={formData.датаНачала}
                                                onChange={(e) => handleInputChange('датаНачала', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="date-field">
                                        <label className="date-label">дата определения</label>
                                        <div className="date-input-wrapper">
                                            {/* 👁️ Видимое поле с русской датой и ручным вводом */}
                                            <input
                                                type="text"
                                                className="form-input date-input"
                                                value={formatRussianDate(formData.датаОпределения)}
                                                onChange={(e) => {
                                                    // Парсим то, что ввел пользователь (например "15.05.2026" или "15 мая 2026")
                                                    const parsed = parseManualDate(e.target.value);
                                                    if (parsed) {
                                                        handleInputChange('датаОпределения', parsed);
                                                    }
                                                }}
                                                placeholder="дд.мм.гггг"
                                                autoComplete="off"
                                            />
                                            
                                            {/* 📅 Кнопка календаря */}
                                            <button 
                                                type="button"
                                                className="calendar-icon-btn"
                                                onClick={() => {
                                                    const hiddenInput = document.getElementById('hidden-датаОпределения');
                                                    if (hiddenInput) {
                                                        // Попытка открыть нативный пикер, если поддерживается
                                                        if (hiddenInput.showPicker) {
                                                            hiddenInput.showPicker();
                                                        } else {
                                                            hiddenInput.focus();
                                                        }
                                                    }
                                                }}
                                                tabIndex={-1}
                                            >
                                                📅
                                            </button>
                                    
                                            {/* 👁️‍🗨️ Скрытый input для реального выбора даты через календарь */}
                                            <input
                                                type="date"
                                                id="hidden-датаОпределения"
                                                style={{ 
                                                    position: 'absolute', 
                                                    opacity: 0, 
                                                    width: 0, 
                                                    height: 0, 
                                                    pointerEvents: 'none' 
                                                }}
                                                value={formData.датаОпределения}
                                                onChange={(e) => handleInputChange('датаОпределения', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    
                                </div>

                                <div className="form-row">
                                    <label className="field-label">дата окончания</label>
                                    <div className="inline-controls">
                                        {/* 👇 Новое поле даты с русским форматом */}
                                        <div className="custom-date-input">
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatRussianDate(formData.датаОкончания)}
                                                onChange={(e) => {
                                                    const parsed = parseManualDate(e.target.value);
                                                    if (parsed) handleInputChange('датаОкончания', parsed);
                                                }}
                                                placeholder="дд.мм.гггг"
                                                autoComplete="off"
                                            />
                                            <button 
                                                type="button"
                                                className="calendar-icon-btn"
                                                onClick={() => {
                                                    const hidden = document.getElementById('hidden-датаОкончания');
                                                    hidden?.showPicker?.() || hidden?.focus();
                                                }}
                                                tabIndex={-1}
                                            >
                                                📅
                                            </button>
                                            <input
                                                type="date"
                                                id="hidden-датаОкончания"
                                                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                                                value={formData.датаОкончания}
                                                onChange={(e) => handleInputChange('датаОкончания', e.target.value)}
                                            />
                                        </div>
                                        
                                        <button type="button" className="btn-small" onClick={добавитьМесяц}>месяц</button>
                                        
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.продлить}
                                                onChange={(e) => {
                                                    handleInputChange('продлить', e.target.checked);
                                                    setПоказатьПродление(e.target.checked);
                                                }}
                                            />
                                            продлить
                                        </label>
                                    </div>
                                </div>
                                
                                {показатьПродление && (
                                    <div className="form-row" style={{ marginTop: '4px' }}>
                                        <label className="field-label" style={{ color: '#c00' }}>продлено до</label>
                                        <div className="inline-controls">
                                            <div className="custom-date-input">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formatRussianDate(продленоДо)}
                                                    onChange={(e) => {
                                                        const parsed = parseManualDate(e.target.value);
                                                        if (parsed) setПродленоДо(parsed);
                                                    }}
                                                    placeholder="дд.мм.гггг"
                                                    autoComplete="off"
                                                />
                                                <button 
                                                    type="button"
                                                    className="calendar-icon-btn"
                                                    onClick={() => {
                                                        const hidden = document.getElementById('hidden-продленоДо');
                                                        hidden?.showPicker?.() || hidden?.focus();
                                                    }}
                                                    tabIndex={-1}
                                                >
                                                    📅
                                                </button>
                                                <input
                                                    type="date"
                                                    id="hidden-продленоДо"
                                                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                                                    value={продленоДо}
                                                    onChange={(e) => setПродленоДо(e.target.value)}
                                                />
                                            </div>
                                            <button type="button" className="btn-small" onClick={() => {
                                                if (продленоДо) handleInputChange('датаОкончания', продленоДо);
                                                setПоказатьПродление(false);
                                            }}>продлить</button>
                                        </div>
                                    </div>
                                )}

                                <div className="date-ro">
                                    <div className="form-row">
                                    <label className="field-label">дата осмотра</label>
                                    <div className="date-input-wrapper">
                                        <input
                                            type="date"
                                            className="form-input date-input"
                                            value={formData.датаОсмотра}
                                            onChange={(e) => handleInputChange('датаОсмотра', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-row">
                                    <label className="field-label">время осмотра</label>
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={formData.времяОсмотра}
                                        onChange={(e) => handleInputChange('времяОсмотра', e.target.value)}
                                    />
                                </div>
                                </div>

                                </div>
                            

                                <div className="form-row">
                                    <label className="field-label">номер дела</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.номерДела}
                                        onChange={(e) => handleInputChange('номерДела', e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="field-label">входящий номер</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.входящийНомер}
                                        onChange={(e) => handleInputChange('входящийНомер', e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="field-label">номер заявки</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.номерЗаявки}
                                        onChange={(e) => handleInputChange('номерЗаявки', e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="field-label">кадастр номер</label>
                                    <div className="input-with-button">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.кадастровыйНомер}
                                            onChange={(e) => handleInputChange('кадастровыйНомер', e.target.value)}
                                        />
                                        <button 
                                            className="btn-action"
                                            type="button"
                                            onClick={() => {
                                                window.open(
                                                    'https://nspd.gov.ru/map?thematic=PKK&is_copy_url=true&zoom=16.159486452834248&coordinate_x=4423229.217477978&coordinate_y=5401207.391450435&baseLayerId=235&theme_id=1&active_layers=36329%2C36328%2C36049%2C36048',
                                                    '_blank'
                                                );
                                            }}
                                        >
                                            ПКК
                                        </button>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">адрес</label>
                                    <textarea
                                        className="form-input textarea"
                                        value={formData.адрес}
                                        onChange={(e) => handleInputChange('адрес', e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="field-label">дополнение</label>
                                    <textarea
                                        className="form-input textarea"
                                        value={formData.дополнение}
                                        onChange={(e) => handleInputChange('дополнение', e.target.value)}
                                        rows={6}
                                    />
                                </div>
                            </div>

                            {/* Правая колонка */}
                            <div className="form-column right-column">
                                
                                <div className="form-row">
                                    <label className="field-label">стоимость</label>
                                    <div className="input-with-select">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.стоимость}
                                            onChange={(e) => handleInputChange('стоимость', e.target.value)}
                                        />
                                        <select 
                                            className="form-input select-small"
                                            value={formData.комуОплата}
                                            onChange={(e) => handleInputChange('комуОплата', e.target.value)}
                                        >
                                            <option value="">Выберите...</option>
                                            <option value="Истец">Истец</option>
                                            <option value="Ответчик">Ответчик</option>
                                            <option value="Совместно">Совместно</option>
                                            <option value="Третьи лица">Третьи лица</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">исполнитель</label>
                                    <div className="input-with-checkbox">
                                        <select 
                                            className="form-input"
                                            value={formData.исполнитель}
                                            onChange={(e) => handleInputChange('исполнитель', e.target.value)}
                                        >
                                            <option value="Слепов">Слепов</option>
                                            <option value="Емиж">Емиж</option>
                                        </select>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.совместно}
                                                onChange={(e) => {
                                                    handleInputChange('совместно', e.target.checked);
                                                    if (!e.target.checked) {
                                                        setВторойИсполнитель('');
                                                    }
                                                }}
                                            />
                                            совместно
                                        </label>
                                    </div>
                                </div>
                                
                                {formData.совместно && (
                                    <div className="form-row" style={{marginTop: '4px'}}>
                                        <label className="field-label" style={{visibility: 'hidden'}}>второй</label>
                                        <select 
                                            className="form-input"
                                            value={второйИсполнитель}
                                            onChange={(e) => setВторойИсполнитель(e.target.value)}
                                        >
                                            <option value=""></option>
                                            <option value="Слепов">Домбровский В.В.</option>
                                            <option value="">Кущ С.П.</option>
                                            <option value="">Мартыненко С.П.</option>
                                            <option value="">Мудряцкая О.А. </option>
                                            <option value="">Погосян Р.В.</option>
                                            <option value="">Севера В.В.</option>
                                            <option value="">Серков П.В.</option>
                                            <option value="">Скорикова Ю.В.</option>
                                            <option value="">Смирнягина О.В.</option>
                                            <option value="">Хананов В.А.</option>
                                            <option value="">Шабалина А.П.</option>                                            
                                            <option value="Емиж">Умрихин С.П.</option>
                                        </select>
                                    </div>
                                )}

                                <div className="form-row">
                                    <label className="field-label">судебный орган</label>
                                    <select 
                                        className="form-input"
                                        value={formData.судебныйОрган}
                                        onChange={(e) => {
                                            const selectedCourt = e.target.value;
                                            handleInputChange('судебныйОрган', selectedCourt);
                                            
                                            // Загружаем судей при выборе суда
                                            if (selectedCourt) {
                                                загрузитьСудей(selectedCourt);
                                            } else {
                                                setСписокСудей([]);
                                                handleInputChange('судья', '');
                                            }
                                        }}
                                    >
                                        <option value=""></option>
                                        <option value="Адлерский районный суд города Сочи">Адлерский районный суд города Сочи</option>
                                        <option value="Арбитражный суд Краснодарского края">Арбитражный суд Краснодарского края</option>
                                        <option value="Краснодарский краевой суд">Краснодарский краевой суд</option>
                                        <option value="Лазаревский районный суд г.Сочи">Лазаревский районный суд г.Сочи</option>
                                        <option value="Судебные участки мировых судей г. Сочи">Судебные участки мировых судей г. Сочи</option>
                                        <option value="Туапсинский городской суд Краснодарского края">Туапсинский городской суд Краснодарского края</option>
                                        <option value="Туапсинский районный суд Краснодарского края">Туапсинский районный суд Краснодарского края</option>
                                        <option value="Хостинский районный суд г. Сочи">Хостинский районный суд г. Сочи</option>
                                        <option value="Центральный районный суд г. Сочи">Центральный районный суд г. Сочи</option>
                                    </select>
                                </div>
                                
                                <div className="form-row">
                                    <label className="field-label">судья</label>
                                    <div className="input-with-datalist">
                                        <input
                                            type="text"
                                            className="form-input"
                                            list="judges-datalist"
                                            placeholder={списокСудей.length > 0 ? "Начните вводить или выберите..." : "Введите ФИО судьи"}
                                            value={formData.судья}
                                            onChange={(e) => handleInputChange('судья', e.target.value)}
                                        />
                                        {/* Подсказки из загруженного списка */}
                                        <datalist id="judges-datalist">
                                            {списокСудей.map((judge, index) => (
                                                <option key={index} value={judge.fullName} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">папка</label>
                                    <div className="input-with-button">
                                        <button 
                                            className="btn-action"
                                            type="button"
                                            onClick={async () => {
                                                const court = formData.судебныйОрган?.trim();
                                                const folderName = formData.папка?.trim();
                                                
                                                if (!court) {
                                                    alert('⚠️ Сначала выберите судебный орган');
                                                    return;
                                                }
                                                
                                                console.log('📁 Открываю папку:', { court, folderName });
                                                
                                                try {
                                                    const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.40.52:5000';
                                                    
                                                    const response = await fetch(`${API_URL}/api/open-folder`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ court, folderName })
                                                    });
                                                    
                                                    const data = await response.json();
                                                    console.log('📥 Ответ сервера:', data);
                                                    
                                                    if (!data.success) {
                                                        alert('❌ ' + (data.error || 'Не удалось открыть папку'));
                                                    }
                                                    // Если успешно — папка уже открыта через explorer.exe
                                                } catch (err) {
                                                    console.error('🌐 Ошибка запроса:', err);
                                                    alert('Не удалось связаться с сервером для открытия папки');
                                                }
                                            }}
                                        >
                                            папка
                                        </button>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.папка}
                                            onChange={(e) => handleInputChange('папка', e.target.value)}
                                        />                                        
                                    </div>
                                </div>
                                <div className="form-row">
                                    <label className="field-label"></label>
                                    <div className="input-with-button">
                                        <button className="btn-action">сканер</button>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">иск</label>
                                    <textarea
                                        className="form-input textarea"
                                        value={formData.иск}
                                        onChange={(e) => handleInputChange('иск', e.target.value)}
                                        rows={6}
                                    />
                                </div>

                                <div className="radio-group-wrapper">
                                    
                            <div className="radio-group-title">Не оплачено</div>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="payment"
                                        checked={formData.неОплачено}
                                        onChange={() => {
                                            handleInputChange('неОплачено', true);
                                            handleInputChange('оплачено', false);
                                            handleInputChange('бесплатно', false);
                                        }}
                                    />
                                    Не оплачено
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="payment"
                                        checked={formData.оплачено}
                                        onChange={() => {
                                            handleInputChange('неОплачено', false);
                                            handleInputChange('оплачено', true);
                                            handleInputChange('бесплатно', false);
                                        }}
                                    />
                                    Оплачено
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="payment"
                                        checked={formData.бесплатно}
                                        onChange={() => {
                                            handleInputChange('неОплачено', false);
                                            handleInputChange('оплачено', false);
                                            handleInputChange('бесплатно', true);
                                        }}
                                    />
                                    Бесплатно
                                </label>
                            </div>
                        </div>

                        <div className="radio-group-wrapper">
                            <div className="radio-group-title">Не выполнено</div>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={formData.неВыполнено}
                                        onChange={() => {
                                            handleInputChange('неВыполнено', true);
                                            handleInputChange('выполнено', false);
                                            handleInputChange('безИсполнения', false);
                                        }}
                                    />
                                    Не выполнено
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={formData.выполнено}
                                        onChange={() => {
                                            handleInputChange('неВыполнено', false);
                                            handleInputChange('выполнено', true);
                                            handleInputChange('безИсполнения', false);
                                        }}
                                    />
                                    Выполнено
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={formData.безИсполнения}
                                        onChange={() => {
                                            handleInputChange('неВыполнено', false);
                                            handleInputChange('выполнено', false);
                                            handleInputChange('безИсполнения', true);
                                        }}
                                    />
                                    Без исполнения
                                </label>
                            </div>
                        </div>

                        <div className="work-checkbox-wrapper">
                            <label className="checkbox-label red-checkbox">
                                <input
                                    type="checkbox"
                                    checked={formData.вРаботу}
                                    onChange={(e) => handleInputChange('вРаботу', e.target.checked)}
                                />
                                в работу
                            </label>
                        </div>
                            </div>
                        </div>
                    )}

                    {/* Секция с радио-кнопками */}
                    <div className="bottom-section">
                        

                        

                        
                    </div>
                </div>

                {/* Кнопки */}
                <div className="dialog-footer">
                    <button className="btn-ok" onClick={handleSave}>ok</button>
                    <button className="btn-cancel" onClick={onClose}>отмена</button>
                </div>
            </div>
        </div>
    );
};

export default CreateCaseDialog;