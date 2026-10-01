const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

/**
 * Подписывает процесс на сигналы остановки и гарантированно освобождает ресурсы.
 *
 * @param {object}  options
 * @param {Array<{name: string, dispose: Function}>} options.resources порядок вызова важен
 * @param {number}  [options.timeoutMs] сколько ждать dispose, прежде чем выйти принудительно
 * @param {object}  [options.process]  подменяемый process — для тестов
 * @param {object}  [options.logger]
 * @returns {{shutdown: Function, dispose: Function, isShuttingDown: Function, uninstall: Function}}
 */
const installGracefulShutdown = ({
    resources = [],
    timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
    process: proc = process,
    logger = console
} = {}) => {
    let shuttingDown = false;
    let forceTimer = null;

    // Таймер вооружается в момент остановки, а не при установке: в нормальной
    // работе процесс живёт неограниченно долго и обязан пережить timeoutMs
    const armForceTimer = () => {
        forceTimer = setTimeout(() => {
            logger.error('[SHUTDOWN] Таймаут остановки, выходим принудительно');
            proc.exit(1);
        }, timeoutMs);
        forceTimer.unref();
    };

    const dispose = async () => {
        for (const resource of resources) {
            try {
                await resource.dispose();
            } catch (error) {
                // Одна неудача не должна отменять освобождение остальных ресурсов
                logger.error(`[SHUTDOWN] Ошибка при освобождении "${resource.name}":`, error.message);
            }
        }
    };

    const shutdown = async (signal) => {
        if (shuttingDown) {
            logger.log(`[SHUTDOWN] ${signal} уже обрабатывается, повторный вызов игнорируется`);
            return;
        }
        shuttingDown = true;
        logger.log(`[SHUTDOWN] Получен ${signal}, останавливаем сервер`);
        armForceTimer();

        await dispose();
        clearTimeout(forceTimer);

        if (signal === 'SIGUSR2') {
            uninstall();
            proc.kill(proc.pid, 'SIGUSR2');
            return;
        }

        logger.log('[SHUTDOWN] Сервер остановлен');
        proc.exit(0);
    };

    const handlers = SHUTDOWN_SIGNALS.map(signal => [signal, () => shutdown(signal)]);
    for (const [signal, handler] of handlers) {
        proc.on(signal, handler);
    }

    const uninstall = () => {
        clearTimeout(forceTimer);
        for (const [signal, handler] of handlers) {
            proc.removeListener(signal, handler);
        }
    };

    return {
        shutdown,
        dispose,
        isShuttingDown: () => shuttingDown,
        uninstall
    };
};

module.exports = {
    installGracefulShutdown,
    SHUTDOWN_SIGNALS,
    DEFAULT_SHUTDOWN_TIMEOUT_MS
};
