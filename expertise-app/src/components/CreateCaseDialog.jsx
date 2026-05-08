import React, { useState } from 'react';
import logoImage from './images/favicon.ico';
import './styles/CreateCaseDialog.css';

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

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        const caseData = {
            ...formData,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            createdBy: userData?.username || 'unknown'
        };
        onSave(caseData);
        onClose();
    };

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
                                    <div className="date-field">
                                        <label className="date-label">дата начала</label>
                                        <div className="date-input-wrapper">
                                            <input
                                                type="date"
                                                className="form-input date-input"
                                                value={formData.датаНачала}
                                                onChange={(e) => handleInputChange('датаНачала', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="date-field">
                                        <label className="date-label">дата окончания</label>
                                        <div className="date-input-wrapper">
                                            <input
                                                type="date"
                                                className="form-input date-input"
                                                value={formData.датаОкончания}
                                                onChange={(e) => handleInputChange('датаОкончания', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

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
                                    <label className="field-label">кадый номер</label>
                                    <div className="input-with-button">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.кадыйНомер}
                                            onChange={(e) => handleInputChange('кадыйНомер', e.target.value)}
                                        />
                                        <button className="btn-action">ПКК</button>
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
                                    <label className="field-label">дата определения</label>
                                    <div className="date-input-wrapper">
                                        <input
                                            type="date"
                                            className="form-input date-input"
                                            value={formData.датаОпределения}
                                            onChange={(e) => handleInputChange('датаОпределения', e.target.value)}
                                        />
                                        
                                    </div>
                                </div>

                                <div className="form-row">
                                    <label className="field-label"></label>
                                    <div className="inline-controls">
                                        <input
                                            type="text"
                                            className="form-input small-input"
                                            value={formData.месяц}
                                            onChange={(e) => handleInputChange('месяц', e.target.value)}
                                            placeholder="месяц"
                                        />
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.продлить}
                                                onChange={(e) => handleInputChange('продлить', e.target.checked)}
                                            />
                                            продлить
                                        </label>
                                    </div>
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

                                <div className="form-row">
                                    <label className="field-label">стоимость</label>
                                    <div className="input-with-select">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.стоимость}
                                            onChange={(e) => handleInputChange('стоимость', e.target.value)}
                                        />
                                        <select className="form-input select-small">
                                            <option value=""></option>
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
                                                onChange={(e) => handleInputChange('совместно', e.target.checked)}
                                            />
                                            совместно
                                        </label>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">судебный орган</label>
                                    <select 
                                        className="form-input"
                                        value={formData.судебныйОрган}
                                        onChange={(e) => handleInputChange('судебныйОрган', e.target.value)}
                                    >
                                        <option value=""></option>
                                    </select>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">судья</label>
                                    <select 
                                        className="form-input"
                                        value={formData.судья}
                                        onChange={(e) => handleInputChange('судья', e.target.value)}
                                    >
                                        <option value=""></option>
                                    </select>
                                </div>

                                <div className="form-row">
                                    <label className="field-label">папка</label>
                                    <div className="input-with-button">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.папка}
                                            onChange={(e) => handleInputChange('папка', e.target.value)}
                                        />
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
                            </div>
                        </div>
                    )}

                    {/* Секция с радио-кнопками */}
                    <div className="bottom-section">
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