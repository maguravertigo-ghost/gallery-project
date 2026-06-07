// ========== ЗАГРУЗЧИК РАСТРОВЫХ ИЗОБРАЖЕНИЙ ==========

class RasterLoader extends BaseLoader {
    constructor() {
        super();
        this.supportedExtensions = ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'ico', 'tiff'];
    }

    supports(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    async load(fileUrl, fileName, fabricCanvas, settings = {}) {
        return new Promise((resolve, reject) => {
            console.log(`RasterLoader загружает: ${fileName}, URL тип: ${fileUrl.startsWith('blob:') ? 'BLOB' : 'HTTP'}`);
            
            const img = new Image();
            // Для blob URL crossOrigin не нужен
            if (!fileUrl.startsWith('blob:')) {
                img.crossOrigin = 'Anonymous';
            }
            
            img.onload = () => {
                try {
                    console.log(`Raster загружен: ${fileName}, размеры: ${img.width} x ${img.height}`);
                    
                    const fabricImg = new fabric.Image(img, {
                        hasControls: false,
                        hasBorders: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        selectable: false,
                        evented: false,
                        imageSmoothing: false,
                        imageSmoothingEnabled: false,
                        objectCaching: false,
                        noScaleCache: false
                    });
                    
                    fabricImg.fileType = 'raster';
                    fabricImg.originalWidth = img.width;
                    fabricImg.originalHeight = img.height;
                    
                    resolve(fabricImg);
                } catch(e) {
                    console.error('Raster creation error:', e);
                    reject(e);
                }
            };
            
            img.onerror = (err) => {
                console.error('Raster load error:', fileName, err);
                // Пробуем альтернативный способ загрузки
                console.log('Пробуем альтернативную загрузку через fetch...');
                
                fetch(fileUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const newUrl = URL.createObjectURL(blob);
                        img.src = newUrl;
                        img.onload = () => {
                            URL.revokeObjectURL(newUrl);
                            // Повторяем создание fabricImg
                            const fabricImg = new fabric.Image(img, {
                                hasControls: false,
                                hasBorders: false,
                                lockMovementX: true,
                                lockMovementY: true,
                                selectable: false,
                                evented: false,
                                imageSmoothing: false,
                                imageSmoothingEnabled: false,
                                objectCaching: false,
                                noScaleCache: false
                            });
                            fabricImg.fileType = 'raster';
                            fabricImg.originalWidth = img.width;
                            fabricImg.originalHeight = img.height;
                            resolve(fabricImg);
                        };
                    })
                    .catch(fetchErr => {
                        console.error('Альтернативная загрузка тоже не удалась:', fetchErr);
                        reject(err);
                    });
            };
            
            img.src = fileUrl;
        });
    }
}