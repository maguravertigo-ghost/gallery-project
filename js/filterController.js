// ========== УПРАВЛЕНИЕ ФИЛЬТРАМИ ==========

class FilterController {
    constructor(fabricCanvas, currentImage) {
        this.fabricCanvas = fabricCanvas;
        this.currentImage = currentImage;
        this.filterSelect = document.getElementById('filterSelect');
        this.filterControls = document.getElementById('filterControls');
        this.filterAmount = document.getElementById('filterAmount');
        this.currentFilterType = 'none';
        this.currentAmount = 50;
        
        this.initFilterControls();
    }

    disableSmoothing() {
        if (this.fabricCanvas && this.fabricCanvas.contextContainer) {
            this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
        }
    }

    initFilterControls() {
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', (e) => {
                this.currentFilterType = e.target.value;
                if (this.isAdjustableFilter(this.currentFilterType)) {
                    if (this.filterControls) this.filterControls.style.display = 'block';
                    if (this.filterAmount) this.filterAmount.value = this.currentAmount;
                } else {
                    if (this.filterControls) this.filterControls.style.display = 'none';
                }
                // Показываем превью фильтра при выборе
                this.previewFilter();
            });
        }
        
        if (this.filterAmount) {
            this.filterAmount.addEventListener('input', (e) => {
                this.currentAmount = parseInt(e.target.value);
                this.previewFilter();
            });
        }
    }

    isAdjustableFilter(filterType) {
        return ['brightness', 'contrast', 'saturation', 'blur'].includes(filterType);
    }

    setCanvas(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
    }

    setImage(image) {
        this.currentImage = image;
    }

    // Создать фильтр по типу и значению
    createFilter(filterType, amount) {
        switch(filterType) {
            case 'grayscale':
                return new fabric.Image.filters.Grayscale();
            case 'sepia':
                return new fabric.Image.filters.Sepia();
            case 'invert':
                return new fabric.Image.filters.Invert();
            case 'vintage':
                return new fabric.Image.filters.Vintage();
            case 'polaroid':
                return new fabric.Image.filters.Polaroid();
            case 'kodachrome':
                return new fabric.Image.filters.Kodachrome();
            case 'technicolor':
                return new fabric.Image.filters.Technicolor();
            case 'brightness':
                const brightnessValue = (amount - 50) / 50;
                return new fabric.Image.filters.Brightness({ brightness: brightnessValue });
            case 'contrast':
                const contrastValue = (amount - 50) / 50;
                return new fabric.Image.filters.Contrast({ contrast: contrastValue });
            case 'saturation':
                const saturationValue = amount / 50;
                return new fabric.Image.filters.Saturation({ saturation: saturationValue });
            case 'blur':
                const blurValue = amount / 50;
                return new fabric.Image.filters.Blur({ blur: blurValue });
            default:
                return null;
        }
    }

    // Превью фильтра (применяет временно)
    previewFilter() {
        if (!this.fabricCanvas || !this.currentImage) return;
        if (this.currentFilterType === 'none') return;
        
        const filter = this.createFilter(this.currentFilterType, this.currentAmount);
        if (filter) {
            this.currentImage.filters = [filter];
            this.currentImage.applyFilters();
            this.disableSmoothing();
            this.fabricCanvas.renderAll();
        }
    }

    // Применить фильтр (оставляет текущий)
    applyFilter() { 
        if (this.filterCtrl) {
            this.filterCtrl.applyFilter();
        }
    }
    
    resetFilter() { 
        if (this.filterCtrl) {
            this.filterCtrl.resetLastFilter();
        }
    }

    // Сброс фильтра
    resetLastFilter() {
        if (!this.fabricCanvas || !this.currentImage) return;
        this.currentImage.filters = [];
        this.currentImage.applyFilters();
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
        if (this.filterSelect) this.filterSelect.value = 'none';
        if (this.filterControls) this.filterControls.style.display = 'none';
        this.currentFilterType = 'none';
    }

    removeAllFilters() { 
        if (this.filterCtrl) {
            this.filterCtrl.removeAllFilters();
        }
    }

    // Для быстрых фильтров (кнопки)
    applyQuickFilter(filterType) {
        if (!this.fabricCanvas || !this.currentImage) return;
        
        if (this.filterSelect) this.filterSelect.value = filterType;
        this.currentFilterType = filterType;
        
        const filter = this.createFilter(filterType, this.currentAmount);
        if (filter) {
            this.currentImage.filters = [filter];
            this.currentImage.applyFilters();
            this.disableSmoothing();
            this.fabricCanvas.renderAll();
        }
    }

    applyBrightness(value) { 
        if (this.filterCtrl) {
            this.filterCtrl.applyBrightness(value);
        }
    }
    
    applyContrast(value) { 
        if (this.filterCtrl) {
            this.filterCtrl.applyContrast(value);
        }
    }
}