// ========== ЗАГРУЗЧИК SVG (СТАБИЛЬНАЯ ВЕРСИЯ) ==========

class SvgLoader extends BaseLoader {
    constructor() {
        super();
        this.supportedExtensions = ['svg'];
    }

    supports(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * Загружает SVG как группу объектов Fabric.
     * Этот метод гарантирует, что картинка не "обрежется" и не сместится.
     */
    async load(fileUrl, fileName, fabricCanvas, settings = {}) {
        return new Promise((resolve, reject) => {
            // Используем нативный метод Fabric.js для загрузки SVG по URL
            fabric.loadSVGFromURL(fileUrl, (objects, options) => {
                try {
                    // 1. ГРУППИРУЕМ объекты SVG в один Fabric объект
                    // Это сохраняет все трансформации и позиционирование исходного файла.
                    const svgGroup = fabric.util.groupSVGElements(objects, options);
                    
                    // 2. Устанавливаем базовые настройки для группы
                    svgGroup.set({
                        hasControls: false,
                        hasBorders: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        selectable: false,
                        evented: false,
                        subTargetCheck: false,
                        interactive: false,
                        // ВАЖНО: Отключаем кэширование для SVG, чтобы избежать артефактов при масштабировании
                        objectCaching: false
                    });

                    // 3. Флаг, чтобы другие части программы знали, что это SVG
                    svgGroup.fileType = 'svg';
                    
                    // 4. Сохраняем оригинальные размеры для расчетов масштаба
                    const bounds = svgGroup.getBoundingRect();
                    svgGroup.originalWidth = bounds.width;
                    svgGroup.originalHeight = bounds.height;
                    
                    console.log(`SVG загружен как группа. Размеры: ${bounds.width} x ${bounds.height}`);

                    resolve(svgGroup);
                } catch (e) {
                    console.error('SVG group error:', e);
                    reject(e);
                }
            }, null, {
                crossOrigin: 'anonymous' // Важно для безопасности, если файл на другом домене
            });
        });
    }
}