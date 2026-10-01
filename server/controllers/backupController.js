const { createBackup, restoreBackup, listBackups, isValidBackupFileName } = require('../utils/backup');
const ApiError = require('../error/ApiError');
const path = require('path');
const fs = require('fs');

class BackupController {
    // Создать бэкап вручную
    async create(req, res, next) {
        try {
            const backupPath = await createBackup();
            const fileName = path.basename(backupPath);
            
            return res.json({
                success: true,
                message: 'Бэкап успешно создан',
                fileName: fileName,
                path: backupPath
            });
        } catch (error) {
            console.error('Ошибка создания бэкапа:', error);
            return next(ApiError.internalRequest('Ошибка при создании бэкапа: ' + error.message));
        }
    }

    // Получить список всех бэкапов
    async list(req, res, next) {
        try {
            const backups = listBackups();
            
            return res.json({
                success: true,
                count: backups.length,
                backups: backups.map(backup => ({
                    name: backup.name,
                    size: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
                    created: backup.created
                }))
            });
        } catch (error) {
            console.error('Ошибка получения списка бэкапов:', error);
            return next(ApiError.internalRequest('Ошибка при получении списка бэкапов'));
        }
    }

    // Скачать бэкап
    async download(req, res, next) {
        try {
            const { fileName } = req.params;

            // Имя файла приходит из параметра маршрута, поэтому проверяем его строго:
            // без проверки итогового пути можно выйти за пределы каталога backups через ".."
            if (!isValidBackupFileName(fileName)) {
                return next(ApiError.badRequest('Неверное имя файла'));
            }

            const backupDir = path.resolve(__dirname, '../backups');
            const backupPath = path.resolve(backupDir, fileName);

            if (path.dirname(backupPath) !== backupDir) {
                return next(ApiError.badRequest('Неверное имя файла'));
            }

            if (!fs.existsSync(backupPath)) {
                return next(ApiError.badRequest('Файл бэкапа не найден'));
            }

            res.download(backupPath, fileName, (err) => {
                if (err) {
                    console.error('Ошибка при скачивании бэкапа:', err);
                    return next(ApiError.internalRequest('Ошибка при скачивании файла'));
                }
            });
        } catch (error) {
            console.error('Ошибка скачивания бэкапа:', error);
            return next(ApiError.internalRequest('Ошибка при скачивании бэкапа'));
        }
    }

    // Восстановить из бэкапа
    async restore(req, res, next) {
        try {
            const { fileName } = req.body;

            if (!isValidBackupFileName(fileName)) {
                return next(ApiError.badRequest('Неверное имя файла'));
            }

            await restoreBackup(fileName);
            
            return res.json({
                success: true,
                message: 'База данных успешно восстановлена из бэкапа'
            });
        } catch (error) {
            console.error('Ошибка восстановления из бэкапа:', error);
            return next(ApiError.internalRequest('Ошибка при восстановлении из бэкапа: ' + error.message));
        }
    }
}

module.exports = new BackupController();
