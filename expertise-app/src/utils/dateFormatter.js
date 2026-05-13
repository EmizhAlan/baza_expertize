// src/utils/dateFormatter.js

// Месяцы на русском
const MONTHS_RU = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

/**
 * Форматирует дату в русский формат: "13 мая 2026 г."
 * @param {string|Date} dateValue - ISO строка "2026-05-13" или объект Date
 * @returns {string} Отформатированная строка
 */
export const formatRussianDate = (dateValue) => {
    if (!dateValue) return '';
    
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    
    if (isNaN(date.getTime())) return ''; // Невалидная дата
    
    const day = date.getDate();
    const month = MONTHS_RU[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year} г.`;
};

/**
 * Парсит русскую дату обратно в ISO-строку для сохранения в БД
 * @param {string} russianDate - Строка вида "13 мая 2026 г."
 * @returns {string} ISO-строка "2026-05-13"
 */
export const parseRussianDate = (russianDate) => {
    if (!russianDate) return '';
    
    // Убираем " г." и разбиваем
    const clean = russianDate.replace(/\s*г\.?\s*$/, '').trim();
    const parts = clean.split(' ');
    
    if (parts.length < 3) return '';
    
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const year = parseInt(parts[2], 10);
    
    const monthIndex = MONTHS_RU.indexOf(monthName);
    if (monthIndex === -1) return '';
    
    // Возвращаем ISO-строку (месяц +1 потому что в JS месяцы с 0)
    const date = new Date(year, monthIndex, day);
    return date.toISOString().split('T')[0];
};

/**
 * Парсит ручной ввод пользователя в ISO-дату
 * Поддерживает форматы:
 * - "13.05.2026" → "2026-05-13"
 * - "13.5.2026" → "2026-05-13"
 * - "13 05 2026" → "2026-05-13"
 * - "13 мая 2026" → "2026-05-13"
 */
export const parseManualDate = (input) => {
    if (!input) return '';
    
    const MONTHS_RU = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    // Убираем точки, пробелы
    const clean = input.trim().toLowerCase();
    
    // Пробуем распарсить "13 мая 2026"
    const matchText = clean.match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/);
    if (matchText) {
        const day = parseInt(matchText[1], 10);
        const monthName = matchText[2];
        const year = parseInt(matchText[3], 10);
        const monthIndex = MONTHS_RU.findIndex(m => monthName.includes(m));
        
        if (monthIndex !== -1 && day >= 1 && day <= 31) {
            const date = new Date(year, monthIndex, day);
            return date.toISOString().split('T')[0];
        }
    }
    
    // Пробуем распарсить "13.05.2026" или "13.5.2026"
    const matchNum = clean.match(/(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/);
    if (matchNum) {
        const day = parseInt(matchNum[1], 10);
        const month = parseInt(matchNum[2], 10) - 1; // Месяцы с 0
        const year = parseInt(matchNum[3], 10);
        
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const date = new Date(year, month, day);
            return date.toISOString().split('T')[0];
        }
    }
    
    return '';
};