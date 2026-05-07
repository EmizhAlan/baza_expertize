// Создайте новый файл src/components/CreateCaseDialog.jsx
import React, { useState } from 'react';
import './styles/CreateCaseDialog.css';

const CreateCaseDialog = ({ isOpen, onClose, onSave, userData }) => {
    const [activeTab, setActiveTab] = useState('поручение');
    const [activeSubTab, setActiveSubTab] = useState('заявки');
    
    const [formData, setFormData] = useState({
        вид: '',
        датаНачала: new Date().toISOString().split('T')[0],
        датаОпределения: new Date().toISOString().split('T')[0],
        датаОкончания: new Date().toISOString().split('T')[0],
        датаОсмотра: new Date().toISOString().split('T')[0],
        месяц: '',
        продлить: false,
        номерДела: '',
        входящийНомер: '',
        номерЗаявки: '',
        адрес: '',
        видРаботы: '',
        стоимость: '',
        исполнитель: userData?.username || '',
        совместно: false,
        папка: '',
        иск: '',
        судья: '',
        судебныйОрган: '',
        неОплачено: true,
        оплачено: false,
        бесплатно: false,
        неВыполнено: true,
        выполнено: false,
        безИсполнения: false,
        вРаботу: false,
        дополнение: '',
        документы: '',
        номер: '',
        комуОплата: '',
        заказчик: '',
        телефон: '',
        продление1: ''
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
                <div className="dialog-header">
                    <h3>База экспертиз</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

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

                <div className="dialog-content">
                    {activeTab === 'поручение' && activeSubTab === 'заявки' && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>вид</label>
                                    <select 
                                        value={formData.вид}
                                        onChange={(e) => handleInputChange('вид', e.target.value)}
                                    >
                                        <option value="">Выберите...</option>
                                        <option value="экспертиза">Экспертиза</option>
                                        <option value="оценка">Оценка</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>стоимость</label>
                                    <input
                                        type="text"
                                        value={formData.стоимость}
                                        onChange={(e) => handleInputChange('стоимость', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>дата начала</label>
                                    <input
                                        type="date"
                                        value={formData.датаНачала}
                                        onChange={(e) => handleInputChange('датаНачала', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>дата определения</label>
                                    <input
                                        type="date"
                                        value={formData.датаОпределения}
                                        onChange={(e) => handleInputChange('датаОпределения', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>дата окончания</label>
                                    <input
                                        type="date"
                                        value={formData.датаОкончания}
                                        onChange={(e) => handleInputChange('датаОкончания', e.target.value)}
                                    />
                                </div>
                                <div className="form-group checkbox-group">
                                    <label>месяц</label>
                                    <input
                                        type="text"
                                        value={formData.месяц}
                                        onChange={(e) => handleInputChange('месяц', e.target.value)}
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
                                <div className="form-group">
                                    <label>исполнитель</label>
                                    <input
                                        type="text"
                                        value={formData.исполнитель}
                                        onChange={(e) => handleInputChange('исполнитель', e.target.value)}
                                    />
                                </div>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.совместно}
                                        onChange={(e) => handleInputChange('совместно', e.target.checked)}
                                    />
                                    совместно
                                </label>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>дата осмотра</label>
                                    <input
                                        type="date"
                                        value={formData.датаОсмотра}
                                        onChange={(e) => handleInputChange('датаОсмотра', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>время осмотра</label>
                                    <input
                                        type="time"
                                        value={formData.времяОсмотра}
                                        onChange={(e) => handleInputChange('времяОсмотра', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>номер дела</label>
                                    <input
                                        type="text"
                                        value={formData.номерДела}
                                        onChange={(e) => handleInputChange('номерДела', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>входящий номер</label>
                                    <input
                                        type="text"
                                        value={formData.входящийНомер}
                                        onChange={(e) => handleInputChange('входящийНомер', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>номер заявки</label>
                                    <input
                                        type="text"
                                        value={formData.номерЗаявки}
                                        onChange={(e) => handleInputChange('номерЗаявки', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>кадый номер</label>
                                    <input
                                        type="text"
                                        value={formData.кадыйНомер}
                                        onChange={(e) => handleInputChange('кадыйНомер', e.target.value)}
                                    />
                                </div>
                                <button className="btn-pkk">ПКК</button>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>адрес</label>
                                    <input
                                        type="text"
                                        value={formData.адрес}
                                        onChange={(e) => handleInputChange('адрес', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>дополнение</label>
                                    <textarea
                                        value={formData.дополнение}
                                        onChange={(e) => handleInputChange('дополнение', e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'суд' && (
                        <>
                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>судебный орган</label>
                                    <select
                                        value={formData.судебныйОрган}
                                        onChange={(e) => handleInputChange('судебныйОрган', e.target.value)}
                                    >
                                        <option value="">Выберите...</option>
                                        <option value="арбитражный">Арбитражный суд</option>
                                        <option value="районный">Районный суд</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>судья</label>
                                    <input
                                        type="text"
                                        value={formData.судья}
                                        onChange={(e) => handleInputChange('судья', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>папка</label>
                                    <input
                                        type="text"
                                        value={formData.папка}
                                        onChange={(e) => handleInputChange('папка', e.target.value)}
                                    />
                                </div>
                                <button className="btn-small">сканер</button>
                            </div>

                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>иск</label>
                                    <textarea
                                        value={formData.иск}
                                        onChange={(e) => handleInputChange('иск', e.target.value)}
                                        rows={6}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-section">
                        <div className="radio-group">
                            <div className="radio-label">Не оплачено</div>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={formData.неОплачено}
                                    onChange={() => handleInputChange('неОплачено', true)}
                                />
                                Не оплачено
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={formData.оплачено}
                                    onChange={() => {
                                        handleInputChange('оплачено', true);
                                        handleInputChange('неОплачено', false);
                                        handleInputChange('бесплатно', false);
                                    }}
                                />
                                Оплачено
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={formData.бесплатно}
                                    onChange={() => {
                                        handleInputChange('бесплатно', true);
                                        handleInputChange('неОплачено', false);
                                        handleInputChange('оплачено', false);
                                    }}
                                />
                                Бесплатно
                            </label>
                        </div>

                        <div className="radio-group">
                            <div className="radio-label">Не выполнено</div>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="status"
                                    checked={formData.неВыполнено}
                                    onChange={() => handleInputChange('неВыполнено', true)}
                                />
                                Не выполнено
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="status"
                                    checked={formData.выполнено}
                                    onChange={() => {
                                        handleInputChange('выполнено', true);
                                        handleInputChange('неВыполнено', false);
                                        handleInputChange('безИсполнения', false);
                                    }}
                                />
                                Выполнено
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="status"
                                    checked={formData.безИсполнения}
                                    onChange={() => {
                                        handleInputChange('безИсполнения', true);
                                        handleInputChange('неВыполнено', false);
                                        handleInputChange('выполнено', false);
                                    }}
                                />
                                Без исполнения
                            </label>
                        </div>

                        <label className="checkbox-label work-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.вРаботу}
                                onChange={(e) => handleInputChange('вРаботу', e.target.checked)}
                            />
                            в работу
                        </label>
                    </div>
                </div>

                <div className="dialog-footer">
                    <button className="btn-ok" onClick={handleSave}>ok</button>
                    <button className="btn-cancel" onClick={onClose}>отмена</button>
                </div>
            </div>
        </div>
    );
};

export default CreateCaseDialog;