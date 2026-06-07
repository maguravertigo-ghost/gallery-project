// ========== МЕНЕДЖЕР ЗАГРУЗКИ ИЗОБРАЖЕНИЙ ==========

class ImageLoader {
    constructor() {
        this.loaders = [];
        this.registerDefaultLoaders();
        console.log('ImageLoader создан');
    }

    registerLoader(loader) {
        this.loaders.push(loader);
        console.log(`Зарегистрирован загрузчик: ${loader.constructor.name}`);
    }

    registerDefaultLoaders() {
        this.registerLoader(new RasterLoader());
        this.registerLoader(new GifLoader());
        this.registerLoader(new SvgLoader());
        console.log('Все загрузчики зарегистрированы');
    }

    findLoader(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const loader = this.loaders.find(loader => loader.supports(fileName));
        console.log(`Поиск загрузчика для ${ext}: ${loader ? loader.constructor.name : 'НЕ НАЙДЕН'}`);
        return loader;
    }

    async loadImage(fileUrl, fileName, fabricCanvas, settings = {}, onProgress) {
        console.log(`loadImage для: ${fileName}`);
        
        const loader = this.findLoader(fileName);
        
        if (!loader) {
            console.warn(`Нет загрузчика для файла: ${fileName}`);
            return null;
        }
        
        try {
            const image = await loader.load(fileUrl, fileName, fabricCanvas, settings);
            console.log(`Изображение загружено: ${fileName}, тип: ${image.fileType}`);
            return image;
        } catch(e) {
            console.error(`Ошибка загрузки ${fileName}:`, e);
            return null;
        }
    }
}

window.imageLoader = new ImageLoader();