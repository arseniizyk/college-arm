const cron = require('node-cron');
const { createBackup, checkPgDumpAvailable, cleanStaleTmpFiles } = require('./backup');

/**
 * Запускает планировщик автоматических бэкапов
 * По умолчанию создает бэкап каждый день в 3:00 ночи
 */
const startBackupScheduler = async () => {
    cleanStaleTmpFiles();

    // Проверяем наличие pg_dump
    const isPgDumpAvailable = await checkPgDumpAvailable();
    
    if (!isPgDumpAvailable) {
        console.log('[BACKUP SCHEDULER] ⚠️  pg_dump не найден в системе');
        console.log('[BACKUP SCHEDULER] Автоматические бэкапы отключены');
        console.log('[BACKUP SCHEDULER] Для включения установите PostgreSQL и добавьте его в PATH');
        return null;
    }

    // Cron выражение: '0 3 * * *' означает каждый день в 3:00
    // Минуты Часы День_месяца Месяц День_недели
    const schedule = process.env.BACKUP_SCHEDULE || '0 3 * * *';

    console.log(`[BACKUP SCHEDULER] ✓ pg_dump найден`);
    console.log(`[BACKUP SCHEDULER] Планировщик запущен. Расписание: ${schedule}`);
    console.log('[BACKUP SCHEDULER] Бэкапы будут создаваться каждый день в 3:00');

    // Создаем задачу по расписанию
    const task = cron.schedule(schedule, async () => {
        console.log('[BACKUP SCHEDULER] Запуск автоматического бэкапа...');
        try {
            await createBackup();
            console.log('[BACKUP SCHEDULER] Автоматический бэкап завершен успешно');
        } catch (error) {
            console.error('[BACKUP SCHEDULER] Ошибка при создании автоматического бэкапа:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "Europe/Minsk" // Часовой пояс Минска
    });

    // Создаем первый бэкап при запуске сервера (опционально)
    if (process.env.BACKUP_ON_START === 'true') {
        console.log('[BACKUP SCHEDULER] Создание начального бэкапа...');
        createBackup()
            .then(() => console.log('[BACKUP SCHEDULER] ✓ Начальный бэкап создан'))
            .catch(err => console.error('[BACKUP SCHEDULER] ✗ Ошибка создания начального бэкапа:', err.message));
    }

    return task;
};

/**
 * Останавливает планировщик бэкапов
 */
const stopBackupScheduler = (task) => {
    if (task) {
        task.stop();
        console.log('[BACKUP SCHEDULER] Планировщик остановлен');
    }
};

module.exports = {
    startBackupScheduler,
    stopBackupScheduler
};
