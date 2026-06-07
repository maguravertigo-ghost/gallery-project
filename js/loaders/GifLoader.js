// ========== ЗАГРУЗЧИК GIF ==========

class GifLoader extends BaseLoader {
    constructor() {
        super();
        this.supportedExtensions = ['gif'];
    }

    supports(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    async load(fileUrl, fabricCanvas, settings = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                try {
                    // GIF загружается как статическое изображение (первый кадр)
                    const fabricImg = new fabric.Image(img, {
                        crossOrigin: 'anonymous',
                        hasControls: false,
                        hasBorders: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        selectable: false,
                        evented: false,
                        imageSmoothing: !settings.preservePixelArt,
                        imageSmoothingEnabled: !settings.preservePixelArt,
                        objectCaching: false,
                        noScaleCache: false
                    });
                    
                    // Добавляем мета-информацию о типе
                    fabricImg.fileType = 'gif';
                    fabricImg.isAnimated = false; // В просмотрщике анимация не поддерживается
                    
                    resolve(fabricImg);
                } catch(e) {
                    reject(e);
                }
            };
            
            img.onerror = (err) => reject(err);
            img.src = fileUrl;
        });
    }
}