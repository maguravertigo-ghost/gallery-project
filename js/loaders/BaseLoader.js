// ========== БАЗОВЫЙ КЛАСС ЗАГРУЗЧИКА ==========

class BaseLoader {
    constructor() {
        if (this.constructor === BaseLoader) {
            throw new Error('BaseLoader - абстрактный класс');
        }
    }

    /**
     * Проверить, поддерживает ли загрузчик файл
     */
    supports(fileName) {
        throw new Error('Метод supports должен быть реализован');
    }

    /**
     * Загрузить изображение
     */
    async load(fileUrl, fabricCanvas) {
        throw new Error('Метод load должен быть реализован');
    }

    /**
     * Получить масштаб для fit
     */
    getFitScale(image, canvasWidth, canvasHeight) {
        let width, height;
        
        if (image.type === 'group') {
            const bounds = image.getBoundingRect();
            width = bounds.width;
            height = bounds.height;
        } else {
            width = image.width;
            height = image.height;
        }
        
        if (width === 0 || height === 0) return 1;
        
        return Math.min(canvasWidth / width, canvasHeight / height);
    }

    /**
     * Центрировать изображение
     */
    centerImage(image, fabricCanvas) {
        if (image && fabricCanvas) {
            fabricCanvas.centerObject(image);
        }
    }
}