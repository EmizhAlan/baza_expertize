const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();

// === НАСТРОЙКА CORS (явно разрешаем локальные порты) ===
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:5173', 
        'http://127.0.0.1:3000', 
        'http://127.0.0.1:5173',
        'http://192.168.40.52:3000', 
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// === ГЛОБАЛЬНЫЙ ЛОГГЕР: покажет ВСЕ входящие запросы ===
app.use((req, res, next) => {
    console.log(`📥 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    console.log(`   IP: ${req.ip}`);
    console.log(`   Headers: ${JSON.stringify({ 
        'content-type': req.headers['content-type'],
        'origin': req.headers['origin'],
        'user-agent': req.headers['user-agent']?.slice(0, 50)
    })}`);
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body: ${JSON.stringify(req.body).slice(0, 300)}${JSON.stringify(req.body).length > 300 ? '...' : ''}`);
    }
    next();
});

// Хранилище активных подключений к БД
const connections = new Map();

// ==========================================
// 🔌 МАРШРУТ: Подключение к базе данных
// ==========================================
app.post('/api/connect', async (req, res) => {
    const { server, database, username, password, connectionId } = req.body;
    
    console.log('🔐 Попытка подключения к БД:', { server, database, user: username });
    
    const cleanServer = server.trim();
    
    const config = {
        server: cleanServer,
        database: database,
        user: username,
        password: password,
        options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            connectTimeout: 30000,
            requestTimeout: 30000,
            instanceName: cleanServer.includes('\\') ? cleanServer.split('\\')[1] : undefined
        }
    };
    
    try {
        const pool = await sql.connect(config);
        console.log('✅ Подключение к БД успешно!');
        
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        connections.set(connectionId, pool);
        console.log(`🗂️ Подключение сохранено с ID: ${connectionId}`);
        
        res.json({
            success: true,
            tables: tablesResult.recordset,
            message: 'Подключение успешно'
        });
        
    } catch (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            details: err.originalError ? err.originalError.message : 'Нет дополнительных деталей'
        });
    }
});

// ==========================================
// 📊 МАРШРУТ: Запрос данных из таблицы
// ==========================================
app.post('/api/query-table', async (req, res) => {
    const { connectionId, tableName } = req.body;
    const pool = connections.get(connectionId);
    
    if (!pool) {
        console.warn('⚠️ Подключение не найдено для ID:', connectionId);
        return res.status(404).json({
            success: false,
            error: 'Подключение не найдено. Попробуйте войти заново.'
        });
    }
    
    try {
        // Экранируем имя таблицы для безопасности
        const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const quotedTableName = `[${safeTableName}]`;
        console.log(`🔍 Запрос к таблице: ${safeTableName}`);
        
        const columnsResult = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${safeTableName}'
            ORDER BY ORDINAL_POSITION
        `);
        
        const dataResult = await pool.request().query(`SELECT * FROM ${safeTableName}`);
        
        res.json({
            success: true,
            columns: columnsResult.recordset.map(col => col.COLUMN_NAME),
            rows: dataResult.recordset,
            rowCount: dataResult.recordset.length
        });
        
    } catch (err) {
        console.error('❌ Ошибка запроса к таблице:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==========================================
// ⚡ МАРШРУТ: Выполнение произвольного SQL
// ==========================================
app.post('/api/execute-query', async (req, res) => {
    const { connectionId, query } = req.body;
    const pool = connections.get(connectionId);
    
    if (!pool) {
        return res.status(404).json({
            success: false,
            error: 'Подключение не найдено'
        });
    }
    
    try {
        console.log('🔧 Выполнение SQL запроса...');
        const result = await pool.request().query(query);
        
        res.json({
            success: true,
            rows: result.recordset,
            columns: result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [],
            rowCount: result.recordset.length
        });
        
    } catch (err) {
        console.error('❌ Ошибка выполнения SQL:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==========================================
// 💾 МАРШРУТ: Сохранение дела в таблицу baza
// ==========================================
app.post('/api/save-case', async (req, res) => {
    try {
        const { connectionId, caseData } = req.body;
        console.log('💾 Попытка сохранения дела, connectionId:', connectionId);
        
        const pool = connections.get(connectionId);
        if (!pool) {
            console.error('❌ Подключение не найдено для save-case');
            return res.status(404).json({
                success: false,
                error: 'Подключение не найдено. Войдите снова.'
            });
        }

        // ⚠️ ВАЖНО: Типы данных подобраны под вашу структуру (dates как NVarChar)
        const query = `
            INSERT INTO dbo.baza (
                [vid], [data_nachala], [data_opredeleniya], [data_okonchaniya], 
                [data_osmotra], [nomer_dela], [vh_nomer], [nomer_z], [adres], 
                [vid_raboty], [stoimost], [ispolnitel], [ispolnitel_sov], 
                [papka], [isk], [sudya], [sudebnyj_organ], [oplacheno], 
                [vypolneno], [prodlen_otmetka], [prodlen_1], [kolichestvo_dnej], 
                [dokumenty], [nomer], [komu_oplata], [zakazchik], [telefon], 
                [komentarii], [date]
            ) VALUES (
                @vid, @data_nachala, @data_opredeleniya, @data_okonchaniya, 
                @data_osmotra, @nomer_dela, @vh_nomer, @nomer_z, @adres, 
                @vid_raboty, @stoimost, @ispolnitel, @ispolnitel_sov, 
                @papka, @isk, @sudya, @sudebnyj_organ, @oplacheno, 
                @vypolneno, @prodlen_otmetka, @prodlen_1, @kolichestvo_dnej, 
                @dokumenty, @nomer, @komu_oplata, @zakazchik, @telefon, 
                @komentarii, @date
            )
        `;

        console.log('📦 Данные для сохранения:', JSON.stringify(caseData).slice(0, 200) + '...');

        await pool.request()
            .input('vid', sql.NVarChar(100), caseData.вид || null)
            .input('data_nachala', sql.NVarChar(50), caseData.датаНачала || null)
            .input('data_opredeleniya', sql.NVarChar(50), caseData.датаОпределения || null)
            .input('data_okonchaniya', sql.NVarChar(50), caseData.датаОкончания || null)
            .input('data_osmotra', sql.NVarChar(50), caseData.датаОсмотра || null)
            .input('nomer_dela', sql.NVarChar(100), caseData.номерДела || null)
            .input('vh_nomer', sql.NVarChar(100), caseData.входящийНомер || null)
            .input('nomer_z', sql.NVarChar(100), caseData.номерЗаявки || null)
            .input('adres', sql.NVarChar(500), caseData.адрес || null)
            .input('vid_raboty', sql.NVarChar(100), caseData.вид || null)
            .input('stoimost', sql.NVarChar(100), caseData.стоимость || null)
            .input('ispolnitel', sql.NVarChar(100), caseData.исполнитель || null)
            .input('ispolnitel_sov', sql.NVarChar(1), caseData.совместно ? '1' : '0')
            .input('papka', sql.NVarChar(200), caseData.папка || null)
            .input('isk', sql.NVarChar(sql.MAX), caseData.иск || null)
            .input('sudya', sql.NVarChar(200), caseData.судья || null)
            .input('sudebnyj_organ', sql.NVarChar(200), caseData.судебныйОрган || null)
            .input('oplacheno', sql.NVarChar(1), caseData.оплачено ? '1' : '0')
            .input('vypolneno', sql.NVarChar(1), caseData.выполнено ? '1' : '0')
            .input('prodlen_otmetka', sql.NVarChar(1), caseData.продлить ? '1' : '0')
            .input('prodlen_1', sql.NVarChar(50), caseData.месяц || null)
            .input('kolichestvo_dnej', sql.NVarChar(50), caseData.месяц || null)
            .input('dokumenty', sql.NVarChar(sql.MAX), caseData.документы || null)
            .input('nomer', sql.NVarChar(100), caseData.номер || null)
            .input('komu_oplata', sql.NVarChar(200), caseData.комуОплата || null)
            .input('zakazchik', sql.NVarChar(200), caseData.заказчик || null)
            .input('telefon', sql.NVarChar(50), caseData.телефон || null)
            .input('komentarii', sql.NVarChar(sql.MAX), caseData.дополнение || null)
            .input('date', sql.DateTime, new Date())
            .query(query);

        console.log('✅ Дело успешно сохранено в БД!');
        res.json({ success: true, message: 'Дело сохранено!' });

    } catch (err) {
        console.error('❌ Ошибка сохранения дела:', err.message);
        console.error('   Детали:', err.originalError?.message || err);
        res.status(500).json({ 
            success: false, 
            error: err.message,
            details: err.originalError?.message || 'Нет деталей'
        });
    }
});

// ==========================================
// 📋 МАРШРУТ: Загрузка дел пользователя
// ==========================================
app.post('/api/get-user-cases', async (req, res) => {
    try {
        const { connectionId, username } = req.body;
        console.log(`📋 Загрузка дел для пользователя: ${username}`);
        
        const pool = connections.get(connectionId);
        if (!pool) {
            return res.status(404).json({
                success: false,
                error: 'Подключение не найдено'
            });
        }

        // 👇 ИСПРАВЛЕНО: Используем CAST для совместимости типов
        const result = await pool.request()
            .input('ispolnitel', sql.NVarChar(100), username)
            .query(`
                SELECT TOP 100
                    [date] as дата_поступления,
                    [vid] as вид,
                    [vh_nomer] as входящий_номер,
                    [nomer_dela] as номер_дела,
                    [adres] as адрес,
                    [vypolneno] as выполнено,
                    [ispolnitel] as исполнитель,
                    [ispolnitel_sov] as совместно,
                    [stoimost] as стоимость,
                    [data_nachala] as дата_начала,
                    [data_okonchaniya] as дата_окончания
                FROM dbo.baza
                WHERE CAST([ispolnitel] AS NVARCHAR(100)) = @ispolnitel 
                   OR CAST([ispolnitel_sov] AS NVARCHAR(10)) = '1'
                ORDER BY [date] DESC
            `);

        res.json({
            success: true,
            cases: result.recordset
        });

    } catch (err) {
        console.error('❌ Ошибка загрузки дел:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==========================================
// 🚀 ЗАПУСК СЕРВЕРА
// ==========================================
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Бэкенд сервер запущен!');
    console.log(`📡 Адрес: http://localhost:${PORT}`);
    console.log(`🌐 Слушает все интерфейсы (0.0.0.0)`);
    console.log(`🔌 Ожидание подключений к SQL Server...`);
    console.log(`💡 Для именованных экземпляров: 192.168.43.92\\ИНСТАНС`);
    console.log('📋 Глобальный логгер активен — все запросы будут видны');
    console.log('='.repeat(50) + '\n');
});

// Обработка незакрытых подключений при завершении
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    for (const [id, pool] of connections) {
        try {
            await pool.close();
            console.log(`🔌 Закрыто подключение ${id}`);
        } catch (e) {
            console.error(`⚠️ Ошибка закрытия ${id}:`, e.message);
        }
    }
    process.exit(0);
});