// ========== УПРАВЛЕНИЕ МАСШТАБИРОВАНИЕМ ==========

class ZoomController {
    constructor(fabricCanvas, currentImage) {
        this.fabricCanvas = fabricCanvas;
        this.currentImage = currentImage;
        this.minZoom = 0.05;
        this.maxZoom = 20;
        this.zoomStep = 1.3;
        this.isZooming = false;
    }

    setCanvas(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
    }

    setImage(image) {
        this.currentImage = image;
    }

    // Отключение сглаживания (без изменения позиции)
    disableSmoothing() {
        if (this.fabricCanvas && this.fabricCanvas.contextContainer) {
            this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
        }
    }

    zoomIn() {
        if (this.isZooming) return;
        if (!this.fabricCanvas || !this.currentImage) return;
        
        this.isZooming = true;
        
        let currentZoom = this.fabricCanvas.getZoom();
        let newZoom = Math.min(currentZoom * this.zoomStep, this.maxZoom);
        
        if (newZoom === currentZoom) {
            this.isZooming = false;
            return;
        }
        
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        
        this.fabricCanvas.zoomToPoint({ x: centerX, y: centerY }, newZoom);
        this.fabricCanvas.centerObject(this.currentImage);
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
        
        setTimeout(() => {
            this.isZooming = false;
        }, 150);
    }

    zoomOut() {
        if (this.isZooming) return;
        if (!this.fabricCanvas || !this.currentImage) return;
        
        this.isZooming = true;
        
        let currentZoom = this.fabricCanvas.getZoom();
        let newZoom = Math.max(currentZoom / this.zoomStep, this.minZoom);
        
        if (newZoom === currentZoom) {
            this.isZooming = false;
            return;
        }
        
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        
        this.fabricCanvas.zoomToPoint({ x: centerX, y: centerY }, newZoom);
        this.fabricCanvas.centerObject(this.currentImage);
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
        
        setTimeout(() => {
            this.isZooming = false;
        }, 150);
    }

    zoomTo100() {
        if (!this.fabricCanvas || !this.currentImage) return;
        
        // Сбрасываем масштаб изображения до 1
        this.currentImage.scale(1);
        
        // Сбрасываем трансформации canvas
        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.fabricCanvas.setZoom(1);
        
        // Центрируем изображение
        this.fabricCanvas.centerObject(this.currentImage);
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
    }

    zoomToFit() {
        if (!this.fabricCanvas || !this.currentImage) return;
        
        let imgWidth, imgHeight;
        
        try {
            if (this.currentImage.getBoundingRect) {
                const bounds = this.currentImage.getBoundingRect();
                imgWidth = bounds.width;
                imgHeight = bounds.height;
            } else {
                imgWidth = this.currentImage.width;
                imgHeight = this.currentImage.height;
            }
        } catch(e) {
            console.error('Ошибка получения размеров:', e);
            return;
        }
        
        if (!imgWidth || !imgHeight) return;
        
        const canvasWidth = this.fabricCanvas.width;
        const canvasHeight = this.fabricCanvas.height;
        
        if (canvasWidth === 0 || canvasHeight === 0) return;
        
        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        
        this.currentImage.scale(scale);
        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.fabricCanvas.setZoom(1);
        this.fabricCanvas.centerObject(this.currentImage);
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
        
        console.log(`zoomToFit: scale=${scale}`);
    }

    zoomToPoint(point, zoom) {
        if (!this.fabricCanvas) return;
        this.fabricCanvas.zoomToPoint(point, zoom);
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
    }
	
    forceFit() {
        if (!this.fabricCanvas || !this.currentImage) return;
        
        // Получаем актуальные размеры canvas
        const canvasWidth = this.fabricCanvas.width;
        const canvasHeight = this.fabricCanvas.height;
        
        let imgWidth, imgHeight;
        if (this.currentImage.getBoundingRect) {
            const bounds = this.currentImage.getBoundingRect();
            imgWidth = bounds.width;
            imgHeight = bounds.height;
        } else {
            imgWidth = this.currentImage.width;
            imgHeight = this.currentImage.height;
        }
        
        if (imgWidth === 0 || imgHeight === 0) return;
        
        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        
        console.log(`forceFit: canvas=${canvasWidth}x${canvasHeight}, image=${imgWidth}x${imgHeight}, scale=${scale}`);
        
        this.currentImage.scale(scale);
        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.fabricCanvas.setZoom(1);
        this.fabricCanvas.centerObject(this.currentImage);
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
    }
}