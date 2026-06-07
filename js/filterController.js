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
                this.applyFilter(); // применяем сразу при выборе
            });
        }
        
        if (this.filterAmount) {
            this.filterAmount.addEventListener('input', (e) => {
                this.currentAmount = parseInt(e.target.value);
                this.applyFilter();
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

    createFilter(filterType, amount) {
        switch(filterType) {
            case 'grayscale': return new fabric.Image.filters.Grayscale();
            case 'sepia': return new fabric.Image.filters.Sepia();
            case 'invert': return new fabric.Image.filters.Invert();
            case 'vintage': return new fabric.Image.filters.Vintage();
            case 'polaroid': return new fabric.Image.filters.Polaroid();
            case 'kodachrome': return new fabric.Image.filters.Kodachrome();
            case 'technicolor': return new fabric.Image.filters.Technicolor();
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
            default: return null;
        }
    }

    applyFilter() {
        if (!this.fabricCanvas || !this.currentImage) return;
        const selected = this.filterSelect?.value;
        if (!selected || selected === 'none') {
            this.currentImage.filters = [];
            this.currentImage.applyFilters();
            this.disableSmoothing();
            this.fabricCanvas.renderAll();
            return;
        }
        const filter = this.createFilter(selected, this.currentAmount);
        if (filter) {
            this.currentImage.filters = [filter];
            this.currentImage.applyFilters();
            this.disableSmoothing();
            this.fabricCanvas.renderAll();
        }
    }

    // Полный сброс всех фильтров
    resetFilter() {
        if (!this.fabricCanvas || !this.currentImage) return;
        this.currentImage.filters = [];
        this.currentImage.applyFilters();
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
        if (this.filterSelect) this.filterSelect.value = 'none';
        if (this.filterControls) this.filterControls.style.display = 'none';
        this.currentFilterType = 'none';
        this.currentAmount = 50;
        if (this.filterAmount) this.filterAmount.value = 50;
    }

    // Удалить последний фильтр (если нужно)
    resetLastFilter() {
        this.resetFilter(); // для простоты пусть тоже сбрасывает все
    }

    removeAllFilters() {
        this.resetFilter();
    }

    applyBrightness(value) {
        const filter = new fabric.Image.filters.Brightness({ brightness: value });
        this.currentImage.filters = [filter];
        this.currentImage.applyFilters();
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
    }

    applyContrast(value) {
        const filter = new fabric.Image.filters.Contrast({ contrast: value });
        this.currentImage.filters = [filter];
        this.currentImage.applyFilters();
        this.disableSmoothing();
        this.fabricCanvas.renderAll();
    }
}