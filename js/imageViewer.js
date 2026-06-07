// ========== КЛАСС ПРОСМОТРЩИКА ИЗОБРАЖЕНИЙ ==========

class ImageViewer {
    constructor(modalId, imageAreaId, canvasId) {
        this.modal = document.getElementById(modalId);
        this.imageArea = document.getElementById(imageAreaId);
        this.canvasId = canvasId;
        this.fabricCanvas = null;
        this.currentImage = null;
        this.currentIndex = 0;
        this.isLoading = false;
        this.isVisible = false;
        this.viewMode = '100';
        
        // DOM элементы
        this.filterSelect = document.getElementById('filterSelect');
        this.infoPanel = document.getElementById('infoPanel');
        this.fullscreenBtn = document.getElementById('fullscreenToggleBtn');
        
        // Инициализация контроллеров
        this.ui = new UIController();
        this.zoomCtrl = null;
        this.transformCtrl = null;
        this.filterCtrl = null;
        
        this.initEventListeners();
        this.loadViewMode();
    }

    loadViewMode() {
        const saved = localStorage.getItem('gallerySettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.viewMode) this.viewMode = settings.viewMode;
            } catch(e) {}
        }
        this.updateViewModeButton();
    }

    saveViewMode() {
        const settingsToSave = { viewMode: this.viewMode };
        const saved = localStorage.getItem('gallerySettings');
        if (saved) {
            try {
                const existing = JSON.parse(saved);
                Object.assign(settingsToSave, existing);
            } catch(e) {}
        }
        localStorage.setItem('gallerySettings', JSON.stringify(settingsToSave));
    }

    updateViewModeButton() {
        const btn = document.getElementById('zoomFitBtn');
        if (!btn) return;
        
        if (this.viewMode === 'fit') {
            btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
            btn.title = 'Режим: Заполнить (нажмите для 100%)';
            btn.classList.add('active-mode');
        } else {
            btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
            btn.title = 'Режим: 100% (нажмите для Заполнить)';
            btn.classList.remove('active-mode');
        }
    }

    disableSmoothing(ctx) {
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
    }

    clearCanvas() {
        if (!this.fabricCanvas || !this.fabricCanvas.contextContainer) return;
        const ctx = this.fabricCanvas.contextContainer;
        ctx.clearRect(0, 0, this.fabricCanvas.width, this.fabricCanvas.height);
        this.disableSmoothing(ctx);
    }

    forceRender() {
        if (!this.fabricCanvas) return;
        this.fabricCanvas.renderAll();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async initCanvas() {
        if (this.fabricCanvas) {
            this.fabricCanvas.dispose();
        }
        
        const container = this.imageArea;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        const canvasEl = document.getElementById(this.canvasId);
        canvasEl.style.width = '100%';
        canvasEl.style.height = '100%';
        
        canvasEl.style.imageRendering = 'pixelated';
        canvasEl.style.imageRendering = 'crisp-edges';
        
        this.fabricCanvas = new fabric.Canvas(this.canvasId, {
            width: width,
            height: height,
            selection: false,
            enableRetinaScaling: false,
            imageSmoothingEnabled: false,
            preserveObjectStacking: false,
            renderOnAddRemove: true,
            includeDefaultValues: false,
            viewportTransform: [1, 0, 0, 1, 0, 0],
            objectCaching: false
        });
        
        this.fabricCanvas.setDimensions({ width: width, height: height });
        
        if (this.fabricCanvas.contextContainer) {
            this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
            this.fabricCanvas.contextContainer.mozImageSmoothingEnabled = false;
            this.fabricCanvas.contextContainer.webkitImageSmoothingEnabled = false;
            this.fabricCanvas.contextContainer.msImageSmoothingEnabled = false;
        }
        if (this.fabricCanvas.contextTop) {
            this.fabricCanvas.contextTop.imageSmoothingEnabled = false;
            this.fabricCanvas.contextTop.mozImageSmoothingEnabled = false;
            this.fabricCanvas.contextTop.webkitImageSmoothingEnabled = false;
            this.fabricCanvas.contextTop.msImageSmoothingEnabled = false;
        }
        
        const originalRender = this.fabricCanvas.renderAll.bind(this.fabricCanvas);
        this.fabricCanvas.renderAll = () => {
            if (this.fabricCanvas.contextContainer) {
                this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
            }
            originalRender();
        };
        
        this.zoomCtrl = new ZoomController(this.fabricCanvas, this.currentImage);
        this.transformCtrl = new TransformController(this.fabricCanvas, this.currentImage);
        this.filterCtrl = new FilterController(this.fabricCanvas, this.currentImage);
        
        this.setupCanvasEvents();
    }

    setupCanvasEvents() {
        this.fabricCanvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.fabricCanvas.getZoom();
            zoom *= 0.999 ** delta;
            zoom = Math.min(Math.max(zoom, 0.05), 20);
            const point = { x: opt.e.offsetX, y: opt.e.offsetY };
            this.fabricCanvas.zoomToPoint(point, zoom);
            setTimeout(() => this.forceRender(), 10);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });
        
        let isPanning = false;
        let lastX = 0, lastY = 0;
        
        this.fabricCanvas.on('mouse:down', (opt) => {
            const evt = opt.e;
            if (evt.altKey || evt.button === 1 || evt.button === 0) {
                isPanning = true;
                lastX = evt.clientX;
                lastY = evt.clientY;
                this.fabricCanvas.selection = false;
                evt.preventDefault();
                this.fabricCanvas.defaultCursor = 'grabbing';
            }
        });
        
        this.fabricCanvas.on('mouse:move', (opt) => {
            if (!isPanning) return;
            const evt = opt.e;
            const deltaX = evt.clientX - lastX;
            const deltaY = evt.clientY - lastY;
            if (deltaX === 0 && deltaY === 0) return;
            this.clearCanvas();
            this.fabricCanvas.relativePan({ x: deltaX, y: deltaY });
            this.clearCanvas();
            this.fabricCanvas.renderAll();
            lastX = evt.clientX;
            lastY = evt.clientY;
            evt.preventDefault();
        });
        
        this.fabricCanvas.on('mouse:up', () => {
            isPanning = false;
            this.fabricCanvas.defaultCursor = 'default';
            this.fabricCanvas.selection = false;
            this.clearCanvas();
            this.fabricCanvas.renderAll();
        });
        
        this.fabricCanvas.on('mouse:leave', () => {
            if (isPanning) {
                isPanning = false;
                this.fabricCanvas.defaultCursor = 'default';
                this.clearCanvas();
                this.fabricCanvas.renderAll();
            }
        });
    }

    async loadImage(imageData) {
        console.log(`loadImage START: ${imageData.name}, тип: ${imageData.fileObj?.type}`);
        
        if (!this.fabricCanvas) {
            await this.initCanvas();
        }
        
        this.isLoading = true;
        
        try {
            const fabricImg = await window.imageLoader.loadImage(
                imageData.url,
                imageData.name,
                this.fabricCanvas,
                this.ui.settings
            );
            
            if (!fabricImg) throw new Error('Не удалось загрузить изображение');
            
            if (this.currentImage) this.fabricCanvas.remove(this.currentImage);
            
            this.currentImage = fabricImg;
            this.currentImage.name = imageData.name;
            this.currentImage.path = imageData.path;
            this.currentImage.fileObj = imageData.fileObj;
            
            this.clearCanvas();
            this.fabricCanvas.clear();
            this.fabricCanvas.add(this.currentImage);
            
            if (this.fabricCanvas.contextContainer) {
                this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
                this.fabricCanvas.contextContainer.mozImageSmoothingEnabled = false;
                this.fabricCanvas.contextContainer.webkitImageSmoothingEnabled = false;
            }
            if (this.currentImage.set) {
                this.currentImage.set({ imageSmoothing: false, imageSmoothingEnabled: false });
            }
            
            if (this.zoomCtrl) this.zoomCtrl.setImage(this.currentImage);
            if (this.transformCtrl) this.transformCtrl.setImage(this.currentImage);
            if (this.filterCtrl) this.filterCtrl.setImage(this.currentImage);
            
        } catch(e) {
            console.error('Ошибка загрузки:', e);
            throw e;
        } finally {
            this.isLoading = false;
        }
    }

    async open(imageData, index, totalCount) {
        if (this.isLoading) return;
        
        this.currentIndex = index;
        this.totalCount = totalCount;
        this.isVisible = true;
        
        document.body.classList.add('modal-open');
        this.modal.classList.add('active');
        
        this.ui.infoVisible = true;
        if (this.ui.infoPanel) this.ui.infoPanel.classList.remove('hidden');
        
        await this.sleep(50);
        
        const canvasEl = document.getElementById(this.canvasId);
        if (canvasEl) canvasEl.style.opacity = '0';
        
        await this.initCanvas();
        await this.loadImage(imageData);
        await this.ui.updateFileInfo(imageData.fileObj);
        
        this.applyViewMode();  // применяем текущий режим
        
        if (canvasEl) {
            canvasEl.style.transition = 'opacity 0.2s ease';
            canvasEl.style.opacity = '1';
            setTimeout(() => { if (canvasEl) canvasEl.style.transition = ''; }, 200);
        }
    }

    async updateImage(imageData, newIndex) {
        if (!imageData || this.isLoading) return;
        
        this.currentIndex = newIndex;
        if (this.currentImage) {
            this.fabricCanvas.remove(this.currentImage);
            this.currentImage = null;
        }
        this.clearCanvas();
        
        const canvasEl = document.getElementById(this.canvasId);
        if (canvasEl) canvasEl.style.opacity = '0';
        
        await this.loadImage(imageData);
        await this.ui.updateFileInfo(imageData.fileObj);
        
        // Применяем режим с учётом полноэкранного режима
        if (document.fullscreenElement) {
            // в fullscreen всегда FIT
            if (this.zoomCtrl) this.zoomCtrl.zoomToFit();
        } else {
            this.applyViewMode();
        }
        
        if (canvasEl) {
            canvasEl.style.transition = 'opacity 0.2s ease';
            canvasEl.style.opacity = '1';
            setTimeout(() => { if (canvasEl) canvasEl.style.transition = ''; }, 200);
        }
    }

    async next() {
        if (this.onNavigate && !this.isLoading) {
            const newIndex = await this.onNavigate(1);
            if (newIndex !== undefined && newIndex !== this.currentIndex) this.currentIndex = newIndex;
        }
    }

    async prev() {
        if (this.onNavigate && !this.isLoading) {
            const newIndex = await this.onNavigate(-1);
            if (newIndex !== undefined && newIndex !== this.currentIndex) this.currentIndex = newIndex;
        }
    }

    setNavigationCallback(callback) {
        this.onNavigate = callback;
    }

    close() {
        this.modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        this.isVisible = false;
        if (this.fabricCanvas) {
            this.fabricCanvas.dispose();
            this.fabricCanvas = null;
        }
        this.currentImage = null;
        this.isLoading = false;
    }

    // ========== UI МЕТОДЫ ==========
    
    toggleViewMode() {
        this.viewMode = this.viewMode === 'fit' ? '100' : 'fit';
        this.saveViewMode();
        this.updateViewModeButton();
        this.applyViewMode();
        if (document.fullscreenElement) this._viewModeBeforeFullscreen = this.viewMode;
    }

    zoomIn()   { if (this.zoomCtrl) this.zoomCtrl.zoomIn(); }
    zoomOut()  { if (this.zoomCtrl) this.zoomCtrl.zoomOut(); }
    zoom100()  { if (this.zoomCtrl) this.zoomCtrl.zoomTo100(); }
    fitToCanvas() { if (this.zoomCtrl) this.zoomCtrl.zoomToFit(); }
    
    rotateRight() { if (this.transformCtrl) this.transformCtrl.rotateRight(); }
    rotateLeft()  { if (this.transformCtrl) this.transformCtrl.rotateLeft(); }
    
    applyFilter()      { if (this.filterCtrl) this.filterCtrl.applyFilter(); }
    resetFilter()      { if (this.filterCtrl) this.filterCtrl.resetFilter(); }
    removeAllFilters() { if (this.filterCtrl) this.filterCtrl.resetFilter(); }
    applyBrightness(v) { if (this.filterCtrl) this.filterCtrl.applyBrightness(v); }
    applyContrast(v)   { if (this.filterCtrl) this.filterCtrl.applyContrast(v); }
    
    toggleInfoPanel() {
        this.ui.infoVisible = !this.ui.infoVisible;
        if (this.ui.infoVisible) this.ui.infoPanel?.classList.remove('hidden');
        else this.ui.infoPanel?.classList.add('hidden');
        this.ui.saveSettings();
        if (document.fullscreenElement) this._infoVisibleBeforeFullscreen = this.ui.infoVisible;
        
        setTimeout(() => {
            this.handleResize();
            this.applyViewMode();
        }, 50);
    }
    
    setBackground(color) {
        if (this.ui) {
            this.ui.setBackground(color);
            this.ui.updateActiveBgButton(color);
        }
    }
    
    // ========== КОПИРОВАНИЕ ==========
    
    copyFileName() {
        if (!this.currentImage?.name) return this.showNotification('❌ Нет информации о файле');
        this.copyToClipboard(this.currentImage.name, '✅ Имя файла скопировано');
    }
    
    copyFilePath() {
        if (!this.currentImage?.path) return this.showNotification('❌ Нет информации о пути');
        let fullPath = this.currentImage.path;
        if (this.currentImage.fileObj?.webkitRelativePath) fullPath = this.currentImage.fileObj.webkitRelativePath;
        this.copyToClipboard(fullPath, '📁 Путь к файлу скопирован (относительный)');
        console.log('Скопирован путь:', fullPath);
    }
    
    copyToClipboard(text, successMessage) {
        if (!text) return this.showNotification('❌ Нет данных для копирования');
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => this.showNotification(successMessage || '✅ Скопировано'))
                .catch(() => this.fallbackCopy(text));
        } else {
            this.fallbackCopy(text);
        }
    }
    
    fallbackCopy(text) {
        const textarea = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;opacity:0' });
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showNotification('✅ Скопировано (резервный способ)');
    }
    
    showNotification(message) {
        const notification = Object.assign(document.createElement('div'), {
            textContent: message,
            style: 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;z-index:9999;backdrop-filter:blur(8px);border:1px solid #ffaa44'
        });
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => notification.remove(), 300); }, 2000);
    }
    
    applyViewMode() {
        if (!this.currentImage || !this.fabricCanvas) return;
        if (this.viewMode === 'fit') this.zoomCtrl?.zoomToFit();
        else this.zoomCtrl?.zoomTo100();
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ==========
    
    initEventListeners() {
        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.close());
        document.getElementById('prevFullBtn')?.addEventListener('click', () => this.prev());
        document.getElementById('nextFullBtn')?.addEventListener('click', () => this.next());
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
        
        document.getElementById('zoomFitBtn')?.addEventListener('click', () => this.toggleViewMode());
        this.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('toggleInfoBtn')?.addEventListener('click', () => this.toggleInfoPanel());
        document.getElementById('rotateLeftBtn')?.addEventListener('click', () => this.rotateLeft());
        document.getElementById('rotateRightBtn')?.addEventListener('click', () => this.rotateRight());
        
        document.getElementById('applyFilterBtn')?.addEventListener('click', () => this.applyFilter());
        document.getElementById('resetFilterBtn')?.addEventListener('click', () => this.resetFilter());
        document.getElementById('removeFiltersBtn')?.addEventListener('click', () => this.removeAllFilters());
        
        document.getElementById('copyNameBtn')?.addEventListener('click', () => this.copyFileName());
        document.getElementById('copyPathBtn')?.addEventListener('click', () => this.copyFilePath());
        
        document.querySelectorAll('.bg-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setBackground(btn.getAttribute('data-bg'));
            });
        });
        
		// Шахматный фон для превью
        const previewCheckerToggle = document.getElementById('previewCheckerBg');
        if (previewCheckerToggle) {
            previewCheckerToggle.checked = this.ui.settings.previewCheckerBg;
            previewCheckerToggle.addEventListener('change', (e) => {
                this.ui.settings.previewCheckerBg = e.target.checked;
                this.ui.saveSettings();
                // ВОТ ЭТА СТРОКА — ОБНОВЛЯЕТ ВСЕ ПРЕВЬЮ
                if (typeof window.applyCheckerBackgroundToPreviews === 'function') {
                    window.applyCheckerBackgroundToPreviews();
                }
            });
        }
        
        // Режим пиксельной графики
        const pixelArtToggle = document.getElementById('pixelArtMode');
        if (pixelArtToggle) {
            pixelArtToggle.checked = this.ui.settings.preservePixelArt;
            pixelArtToggle.addEventListener('change', (e) => {
                this.ui.settings.preservePixelArt = e.target.checked;
                this.ui.saveSettings();
                // Применяем к canvas
                const canvasEl = document.getElementById(this.canvasId);
                if (canvasEl) {
                    if (e.target.checked) {
                        canvasEl.style.imageRendering = 'pixelated';
                        canvasEl.style.imageRendering = 'crisp-edges';
                    } else {
                        canvasEl.style.imageRendering = 'auto';
                    }
                }
                if (this.fabricCanvas && this.fabricCanvas.contextContainer) {
                    this.fabricCanvas.contextContainer.imageSmoothingEnabled = !e.target.checked;
                    this.forceRender();
                }
            });
        }
        
        document.querySelectorAll('[data-brightness]').forEach(btn => {
            btn.addEventListener('click', () => this.applyBrightness(parseInt(btn.getAttribute('data-brightness')) / 100));
        });
        document.querySelectorAll('[data-contrast]').forEach(btn => {
            btn.addEventListener('click', () => this.applyContrast(parseInt(btn.getAttribute('data-contrast')) / 100));
        });
        
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
        
        window.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); this.prev(); }
            if (e.key === 'Escape') this.close();
            if (e.key === 'i') this.toggleInfoPanel();
            if (e.key === '+') { e.preventDefault(); this.zoomIn(); }
            if (e.key === '-') { e.preventDefault(); this.zoomOut(); }
            if (e.key === '0') { e.preventDefault(); this.zoom100(); }
            if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.toggleFullscreen(); }
            if (e.key === 'r') { e.preventDefault(); this.rotateRight(); }
            if (e.key === 'R') { e.preventDefault(); this.rotateLeft(); }
        });
        
        window.addEventListener('resize', () => this.handleResize());
        
        document.addEventListener('fullscreenchange', () => {
            const fullscreenBtn = document.getElementById('fullscreenToggleBtn');
            if (document.fullscreenElement) {
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                if (this.infoPanel) this.infoPanel.style.display = 'none';
                document.querySelector('.fullscreen-menu')?.style.setProperty('display', 'none');
                document.querySelector('.close-modal')?.style.setProperty('display', 'none');
                document.querySelector('.top-bar')?.style.setProperty('display', 'none');
                if (this.imageArea) {
                    this.imageArea.style.width = '100vw';
                    this.imageArea.style.height = '100vh';
                    this.imageArea.style.borderRadius = '0';
                }
                setTimeout(() => {
                    this.fabricCanvas.setDimensions({ width: this.imageArea.clientWidth, height: this.imageArea.clientHeight });
                    this.zoomCtrl?.zoomToFit();
                }, 150);
            } else {
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                if (this.infoPanel) this.infoPanel.style.display = '';
                document.querySelector('.fullscreen-menu')?.style.setProperty('display', '');
                document.querySelector('.close-modal')?.style.setProperty('display', '');
                document.querySelector('.top-bar')?.style.setProperty('display', '');
                if (this.imageArea) {
                    this.imageArea.style.width = '';
                    this.imageArea.style.height = '';
                    this.imageArea.style.borderRadius = '';
                }
                setTimeout(() => {
                    this.fabricCanvas.setDimensions({ width: this.imageArea.clientWidth, height: this.imageArea.clientHeight });
                    // Восстанавливаем режим, который был до fullscreen
                    const savedMode = this._savedViewModeBeforeFullscreen || '100';
                    this.viewMode = savedMode;
                    this.updateViewModeButton();
                    this.applyViewMode();
                    this.forceRender();
                }, 150);
            }
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.currentImage) {
                this._savedViewModeBeforeFullscreen = this.viewMode; // только режим, позицию не трогаем
            }
            document.documentElement.requestFullscreen?.().catch(err => console.log('Fullscreen error:', err));
        } else {
            document.exitFullscreen?.().catch(err => console.log('Exit fullscreen error:', err));
        }
    }

    handleResize() {
        if (!this.isVisible || !this.fabricCanvas) return;
        const newWidth = this.imageArea.clientWidth;
        const newHeight = this.imageArea.clientHeight;
        if (newWidth > 0 && newHeight > 0) {
            this.fabricCanvas.setDimensions({ width: newWidth, height: newHeight });
            if (!document.fullscreenElement && this.currentImage) {
                this.applyViewMode();  // пересчёт масштаба при изменении размера окна
            }
        }
    }
	
	resetFilter() { 
    if (this.filterCtrl) this.filterCtrl.resetFilter(); 
	}
	removeAllFilters() { 
		if (this.filterCtrl) this.filterCtrl.resetFilter(); 
	}
}