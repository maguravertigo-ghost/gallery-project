// ========== УПРАВЛЕНИЕ ТРАНСФОРМАЦИЯМИ ==========

class TransformController {
    constructor(fabricCanvas, currentImage) {
        this.fabricCanvas = fabricCanvas;
        this.currentImage = currentImage;
        this.currentAngle = 0;
    }

    setCanvas(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
    }

    setImage(image) {
        this.currentImage = image;
    }

    rotateRight() {
        if (!this.fabricCanvas || !this.currentImage) return;
        this.currentAngle += 90;
        this.currentImage.rotate(this.currentAngle);
        this.fabricCanvas.centerObject(this.currentImage);
        this.fabricCanvas.renderAll();
    }

    rotateLeft() {
        if (!this.fabricCanvas || !this.currentImage) return;
        this.currentAngle -= 90;
        this.currentImage.rotate(this.currentAngle);
        this.fabricCanvas.centerObject(this.currentImage);
        this.fabricCanvas.renderAll();
    }

    centerImage() {
        if (!this.fabricCanvas || !this.currentImage) return;
        
        // Сбрасываем трансформации canvas
        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.fabricCanvas.setZoom(1);
        
        // Центрируем объект
        this.fabricCanvas.centerObject(this.currentImage);
        this.fabricCanvas.renderAll();
    }

    resetTransform() {
        if (!this.fabricCanvas || !this.currentImage) return;
        this.currentAngle = 0;
        this.currentImage.rotate(0);
        this.currentImage.scale(1);
        this.fabricCanvas.setZoom(1);
        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.fabricCanvas.centerObject(this.currentImage);
        this.fabricCanvas.renderAll();
    }

    getCurrentAngle() {
        return this.currentAngle;
    }
}