// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Получить расширение файла
 */
function getFileExtension(filename) {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

/**
 * Проверить, является ли файл изображением
 */
function isImage(filename) {
    const supported = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'svg', 'webp'];
    return supported.includes(getFileExtension(filename));
}

/**
 * Экранирование HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * Форматирование времени (для совместимости)
 */
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Отменить URL объекты
 */
function revokeUrls(items) {
    items.forEach(item => {
        if (item.url) URL.revokeObjectURL(item.url);
    });
}

/**
 * Получить метаданные изображения
 */
async function getImageMetadata(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    type: file.type,
                    lastModified: new Date(file.lastModified).toLocaleString(),
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => {
                resolve({
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    type: file.type,
                    lastModified: new Date(file.lastModified).toLocaleString(),
                    width: '?',
                    height: '?'
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Задержка (sleep)
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}