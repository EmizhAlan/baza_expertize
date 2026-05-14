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
        // Экранируем имя таблицы: убираем опасные символы
        const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        
        // 👇 ВАЖНО: Оборачиваем в квадратные скобки для SQL Server
        const quotedTableName = `[${safeTableName}]`;
        
        console.log(`🔍 Запрос к таблице: ${quotedTableName}`);
        
        // Запрос к метаданным (здесь TABLE_NAME сравнивается как строка, скобки не нужны)
        const columnsResult = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${safeTableName}'
            ORDER BY ORDINAL_POSITION
        `);
        
        // 👇 ВАЖНО: Используем [quotedTableName] в самом запросе
        const dataResult = await pool.request().query(`SELECT * FROM ${quotedTableName}`);
        
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
                [data_osmotra], [data_rozhdeniya], [kolichestvo_dnej], [nomer_dela], [vh_nomer], [nomer_z], [adres], 
                [vid_raboty], [stoimost], [ispolnitel], [ispolnitel_sov], 
                [papka], [isk], [sudya], [sudebnyj_organ], [oplacheno], 
                [vypolneno], [prodlen_otmetka], [prodlen_1], 
                [dokumenty], [nomer], [komu_oplata], [zakazchik], [telefon], 
                [komentarii], [date]
            ) VALUES (
                @vid, @data_nachala, @data_opredeleniya, @data_okonchaniya, 
                @data_osmotra, @data_rozhdeniya, @kolichestvo_dnej, @nomer_dela, @vh_nomer, @nomer_z, @adres, 
                @vid_raboty, @stoimost, @ispolnitel, @ispolnitel_sov, 
                @papka, @isk, @sudya, @sudebnyj_organ, @oplacheno, 
                @vypolneno, @prodlen_otmetka, @prodlen_1,  
                @dokumenty, @nomer, @komu_oplata, @zakazchik, @telefon, 
                @komentarii, @date
            )
        `;

        console.log('📦 Данные для сохранения:', JSON.stringify(caseData).slice(0, 200) + '...');

        await pool.request()
            .input('vid', sql.NVarChar(100), caseData.вид || '')
            .input('data_nachala', sql.NVarChar(50), caseData.датаНачала || '')
            .input('data_opredeleniya', sql.NVarChar(50), caseData.датаОпределения || '')
            .input('data_okonchaniya', sql.NVarChar(50), caseData.датаОкончания || '')
            .input('data_osmotra', sql.NVarChar(50), caseData.датаОсмотра || '')
            .input('data_rozhdeniya', sql.NVarChar(50), caseData.датаРождения || '  .  .')
            .input('kolichestvo_dnej', sql.NVarChar(50), String(caseData.kolichestvo_dnej || '30'))
            .input('nomer_dela', sql.NVarChar(100), caseData.номерДела || '')
            .input('vh_nomer', sql.NVarChar(100), caseData.входящийНомер || '')
            .input('nomer_z', sql.NVarChar(100), caseData.номерЗаявки || '')
            .input('adres', sql.NVarChar(500), caseData.адрес || '')
            .input('vid_raboty', sql.NVarChar(100), caseData.дополнение || '')
            .input('stoimost', sql.NVarChar(100), caseData.стоимость || '')
            .input('ispolnitel', sql.NVarChar(100), caseData.исполнитель || '')
            .input('ispolnitel_sov', sql.NVarChar(1), caseData.совместно ? '1' : '0')
            .input('papka', sql.NVarChar(200), caseData.папка || '')
            .input('isk', sql.NVarChar(sql.MAX), caseData.иск || '')
            .input('sudya', sql.NVarChar(200), caseData.судья || '')
            .input('sudebnyj_organ', sql.NVarChar(200), caseData.судебныйОрган || '')
            .input('oplacheno', sql.NVarChar(1), caseData.оплачено ? '1' : '0')
            .input('vypolneno', sql.NVarChar(1), caseData.выполнено ? '1' : '0')
            .input('prodlen_otmetka', sql.NVarChar(1), caseData.продлить ? '1' : '0')
            .input('prodlen_1', sql.NVarChar(50), caseData.месяц || '')
            .input('dokumenty', sql.NVarChar(sql.MAX), caseData.документы || '')
            .input('nomer', sql.NVarChar(100), caseData.номер || '')
            .input('komu_oplata', sql.NVarChar(200), caseData.комуОплата || '')
            .input('zakazchik', sql.NVarChar(200), caseData.заказчик || '')
            .input('telefon', sql.NVarChar(50), caseData.телефон || '')
            .input('komentarii', sql.NVarChar(sql.MAX), caseData.дополнение || '')
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
                    [data_okonchaniya] as дата_окончания,
                    [sudebnyj_organ] as sudebnyj_organ,
                    [prodlen_otmetka] as prodlen_otmetka,
                    [prodlen_1] as prodlen_1
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
// 👨‍⚖️ МАРШРУТ: Получение списка судей по суду
// ==========================================
app.post('/api/get-judges', async (req, res) => {
    try {
        const { connectionId, courtName } = req.body;
        console.log(`👨‍⚖️ Запрос судей: court="${courtName}", connectionId="${connectionId}"`);
        
        if (!connectionId) {
            return res.status(400).json({ success: false, error: 'Не передан connectionId' });
        }
        
        const pool = connections.get(connectionId);
        if (!pool) {
            console.warn(`⚠️ Подключение не найдено. Доступные ID:`, Array.from(connections.keys()));
            return res.status(404).json({
                success: false,
                error: 'Подключение не найдено. Доступные ID: ' + Array.from(connections.keys()).join(', ')
            });
        }

        // Маппинг судов → таблицы
        const COURT_TABLE_MAP = {
            'Адлерский районный суд города Сочи': 'adl',
            'Арбитражный суд Краснодарского края': 'arbitr',
            'Краснодарский краевой суд': 'krai',
            'Лазаревский районный суд г.Сочи': 'laz',
            'Судебные участки мировых судей г. Сочи': 'mir',
            'Туапсинский городской суд Краснодарского края': '',
            'Туапсинский районный суд Краснодарского края': '',
            'Хостинский районный суд г. Сочи': '',
            'Центральный районный суд г. Сочи': 'sochi'
        };

        const tableName = COURT_TABLE_MAP[courtName];
        if (!tableName) {
            return res.json({ success: true, judges: [], message: 'Нет таблицы для этого суда' });
        }

        const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const quotedTableName = `[${safeTableName}]`;
        console.log(`📋 Запрос к таблице: ${quotedTableName}`);

        const result = await pool.request().query(`SELECT * FROM ${quotedTableName}`);
        
        const judges = result.recordset.map(row => {
            // 👇 АДАПТИРУЙ ПОД СВОИ НАЗВАНИЯ КОЛОНОК!
            const фамилия = row.фамилия || row.column1 || row.FIO || row.name || '';
            const имя = row.имя || row.column2 || '';
            const отчество = row.отчество || row.column3 || '';
            const fullName = [фамилия, имя, отчество].filter(Boolean).join(' ');
            return { fullName, фамилия, имя, отчество };
        });

        console.log(`✅ Найдено: ${judges.length} судей`);
        res.json({ success: true, judges });

    } catch (err) {
        console.error('❌ Ошибка get-judges:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ТЕСТОВЫЙ эндпоинт для проверки подключения
app.get('/api/test-connection', (req, res) => {
    console.log('🔍 Доступные подключения:', Array.from(connections.keys()));
    res.json({
        activeConnections: Array.from(connections.keys()),
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// 🗄️ МАРШРУТ: Загрузка ВСЕХ дел из базы с фильтром
// ==========================================
app.post('/api/get-all-cases', async (req, res) => {
    try {
        const { connectionId, filter } = req.body;
        console.log(`🗄️ Загрузка всех дел, фильтр: ${filter || 'все'}`);
        
        const pool = connections.get(connectionId);
        if (!pool) {
            return res.status(404).json({
                success: false,
                error: 'Подключение не найдено'
            });
        }

        // Формируем WHERE-условие в зависимости от фильтра
        let whereClause = '';
        if (filter === 'в работе') {
            // Дела в работе: не выполнено (0 или NULL)
            whereClause = `WHERE (CAST([vypolneno] AS NVARCHAR(10)) = '0' OR [vypolneno] IS NULL)`;
        } else if (filter === 'выполненные') {
            // Выполненные дела
            whereClause = `WHERE CAST([vypolneno] AS NVARCHAR(10)) = '1'`;
        }
        // Если filter = 'все' — WHERE не добавляем

        const result = await pool.request().query(`
            SELECT TOP 1000
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
                [data_okonchaniya] as дата_окончания,
                [sudebnyj_organ] as sudebnyj_organ,
                [prodlen_otmetka] as prodlen_otmetka,
                [prodlen_1] as prodlen_1
            FROM dbo.baza
            ${whereClause}
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
// 🗑️ МАРШРУТ: Удаление дела
// ==========================================
app.post('/api/delete-case', async (req, res) => {
    try {
        const { connectionId, caseId, nomerDela, vhNomer } = req.body;
        console.log(`🗑️ Удаление дела:`, { caseId, nomerDela, vhNomer });
        
        const pool = connections.get(connectionId);
        if (!pool) {
            return res.status(404).json({
                success: false,
                error: 'Подключение не найдено'
            });
        }

        // 👇 ИСПОЛЬЗУЕМ CAST для совместимости TEXT и NVARCHAR
        // И удаляем по входящему номеру (он обычно уникальнее)
        const result = await pool.request()
            .input('vh_nomer', sql.NVarChar(100), vhNomer)
            .input('nomer_dela', sql.NVarChar(100), nomerDela)
            .query(`
                DELETE FROM dbo.baza 
                WHERE CAST(vh_nomer AS NVARCHAR(100)) = CAST(@vh_nomer AS NVARCHAR(100))
                AND CAST(nomer_dela AS NVARCHAR(100)) = CAST(@nomer_dela AS NVARCHAR(100))
            `);

        console.log(`✅ Удалено строк: ${result.rowsAffected[0]}`);
        
        if (result.rowsAffected[0] === 0) {
            return res.json({
                success: false,
                error: 'Дело не найдено в базе',
                message: 'Возможно, дело уже было удалено или данные не совпадают'
            });
        }
        
        res.json({
            success: true,
            message: 'Дело удалено',
            rowsAffected: result.rowsAffected[0]
        });

    } catch (err) {
        console.error('❌ Ошибка удаления дела:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==========================================
// 📁 МАРШРУТ: Открытие/создание сетевой папки
// ==========================================
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

app.post('/api/open-folder', async (req, res) => {
    try {
        const { court, folderName } = req.body;
        console.log(`📁 Запрос на папку: суд="${court}", папка="${folderName}"`);
        
        // 👇 Базовый сетевой путь (используй тот, что доступен серверу)
        const baseNetworkPath = '\\\\192.168.43.92\\g\\экспертизы';
        
        // Очищаем имена от опасных символов для файловой системы
        const safeCourt = (court || 'Без_суда').trim().replace(/[<>:"|?*]/g, '_');
        const safeFolder = (folderName || 'Новая_папка').trim().replace(/[<>:"|?*]/g, '_');
        
        // Полный путь к папке дела
        const caseFolderPath = path.join(baseNetworkPath, safeCourt, safeFolder);
        console.log(`📁 Целевая папка: ${caseFolderPath}`);
        
        // 👇 Создаём основную папку + подпапки
        const subfolders = ['sud', 'дело', 'фото'];
        
        for (const subfolder of subfolders) {
            const subfolderPath = path.join(caseFolderPath, subfolder);
            try {
                await fs.mkdir(subfolderPath, { recursive: true });
                console.log(`✅ Создана папка: ${subfolderPath}`);
            } catch (err) {
                // Если папка уже существует — это нормально
                if (err.code !== 'EEXIST') {
                    console.warn(`⚠️ Не удалось создать ${subfolderPath}: ${err.message}`);
                }
            }
        }
        
        // 👇 Открываем папку в проводнике Windows
        // Используем правильный синтаксис для UNC-путей
        const escapedPath = caseFolderPath.replace(/\\/g, '\\\\');
        const command = `cmd.exe /c start "" "${escapedPath}"`;
        
        console.log(`🚀 Выполняю команду: ${command}`);
        
        exec(command, { cwd: baseNetworkPath }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Ошибка exec: ${error.message}`);
                // Не возвращаем ошибку клиенту — папки всё равно созданы
                return res.json({ 
                    success: true, 
                    message: 'Папки созданы, но не удалось открыть проводник',
                    createdPath: caseFolderPath,
                    warning: error.message 
                });
            }
            console.log(`✅ Проводник открыт: ${caseFolderPath}`);
            res.json({ 
                success: true, 
                message: 'Папки созданы и открыты',
                createdPath: caseFolderPath,
                subfolders: subfolders.map(s => path.join(caseFolderPath, s))
            });
        });
        
    } catch (err) {
        console.error('❌ Ошибка в open-folder:', err.message);
        res.status(500).json({ 
            success: false, 
            error: err.message,
            details: err.stack 
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