const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Создаем директорию для бэкапов, если её нет
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Имя файла бэкапа: строго backup_ГГГГ-ММ-ДД.sql
const BACKUP_FILE_NAME_REGEX = /^backup_\d{4}-\d{2}-\d{2}\.sql$/;

const resolveBackupPath = (backupFileName) => {
    if (typeof backupFileName !== 'string' || !BACKUP_FILE_NAME_REGEX.test(backupFileName)) {
        throw new Error('Неверное имя файла бэкапа');
    }

    const backupPath = path.resolve(backupDir, backupFileName);
    if (!backupPath.startsWith(backupDir + path.sep)) {
        throw new Error('Неверное имя файла бэкапа');
    }

    return backupPath;
};

const getDbArgs = () => ({
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT || '5432',
    dbName: process.env.DB_NAME || 'diplom',
    dbUser: process.env.DB_USER || 'postgres',
    dbPassword: process.env.DB_PASSWORD || ''
});

/**
 * Проверяет наличие утилиты pg_dump в системе
 */
const checkPgDumpAvailable = () => {
    return new Promise((resolve) => {
        execFile('pg_dump', ['--version'], (error) => {
            resolve(!error);
        });
    });
};

/**
 * Создает бэкап базы данных PostgreSQL
 */
const createBackup = async () => {
    // Проверяем наличие pg_dump
    const isPgDumpAvailable = await checkPgDumpAvailable();
    if (!isPgDumpAvailable) {
        throw new Error('pg_dump не найден. Установите PostgreSQL и добавьте его в PATH');
    }

    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupFileName = `backup_${timestamp}.sql`;
        const backupPath = path.join(backupDir, backupFileName);

        // Получаем параметры подключения из переменных окружения
        const { dbHost, dbPort, dbName, dbUser, dbPassword } = getDbArgs();

        // Аргументы команды: запуск без шелла, чтобы исключить инъекцию
        const args = ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-F', 'p', '-f', backupPath];

        // Устанавливаем переменную окружения для пароля
        const env = { ...process.env, PGPASSWORD: dbPassword };

        console.log(`[BACKUP] Начало создания бэкапа: ${backupFileName}`);

        execFile('pg_dump', args, { env }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[BACKUP] Ошибка создания бэкапа: ${error.message}`);
                return reject(error);
            }

            if (stderr && !stderr.includes('WARNING')) {
                console.error(`[BACKUP] Предупреждение: ${stderr}`);
            }

            console.log(`[BACKUP] Бэкап успешно создан: ${backupFileName}`);
            
            // Удаляем старые бэкапы (оставляем последние 7)
            cleanOldBackups();
            
            resolve(backupPath);
        });
    });
};

/**
 * Удаляет старые бэкапы, оставляя только последние N
 */
const cleanOldBackups = (keepCount = 7) => {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        // Удаляем файлы, которые старше keepCount
        if (files.length > keepCount) {
            const filesToDelete = files.slice(keepCount);
            filesToDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`[BACKUP] Удален старый бэкап: ${file.name}`);
            });
        }
    } catch (error) {
        console.error(`[BACKUP] Ошибка при очистке старых бэкапов: ${error.message}`);
    }
};

/**
 * Восстанавливает базу данных из бэкапа
 */
const restoreBackup = (backupFileName) => {
    return new Promise((resolve, reject) => {
        let backupPath;
        try {
            backupPath = resolveBackupPath(backupFileName);
        } catch (error) {
            return reject(error);
        }

        if (!fs.existsSync(backupPath)) {
            return reject(new Error(`Файл бэкапа не найден: ${backupFileName}`));
        }

        const { dbHost, dbPort, dbName, dbUser, dbPassword } = getDbArgs();

        // Аргументы команды: запуск без шелла, чтобы исключить инъекцию
        const args = ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-f', backupPath];
        const env = { ...process.env, PGPASSWORD: dbPassword };

        console.log(`[BACKUP] Начало восстановления из бэкапа: ${backupFileName}`);

        execFile('psql', args, { env }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[BACKUP] Ошибка восстановления: ${error.message}`);
                return reject(error);
            }

            if (stderr && !stderr.includes('WARNING')) {
                console.error(`[BACKUP] Предупреждение: ${stderr}`);
            }

            console.log(`[BACKUP] База данных успешно восстановлена из: ${backupFileName}`);
            resolve();
        });
    });
};

/**
 * Получает список всех доступных бэкапов
 */
const listBackups = () => {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
            .map(file => {
                const stats = fs.statSync(path.join(backupDir, file));
                return {
                    name: file,
                    size: stats.size,
                    created: stats.mtime,
                    path: path.join(backupDir, file)
                };
            })
            .sort((a, b) => b.created - a.created);

        return files;
    } catch (error) {
        console.error(`[BACKUP] Ошибка при получении списка бэкапов: ${error.message}`);
        return [];
    }
};

module.exports = {
    createBackup,
    restoreBackup,
    listBackups,
    cleanOldBackups,
    checkPgDumpAvailable
};
