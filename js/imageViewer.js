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
            btn.title = 'Режим: По размеру';
        } else {
            btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
            btn.title = 'Режим: 100%';
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
        
        // ПРИНУДИТЕЛЬНЫЙ ПИКСЕЛЬНЫЙ РЕНДЕРИНГ ДЛЯ CANVAS
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
        
        // ЖЁСТКОЕ ОТКЛЮЧЕНИЕ СГЛАЖИВАНИЯ ВО ВСЕХ КОНТЕКСТАХ
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
        
        // ПЕРЕОПРЕДЕЛЯЕМ RENDERALL ДЛЯ ПРИНУДИТЕЛЬНОГО ОТКЛЮЧЕНИЯ
        const originalRender = this.fabricCanvas.renderAll.bind(this.fabricCanvas);
        this.fabricCanvas.renderAll = () => {
            if (this.fabricCanvas.contextContainer) {
                this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
            }
            originalRender();
        };
        
        // Инициализация контроллеров с canvas
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
            
            console.log(`loadImage RESULT: ${imageData.name}, fabricImg: ${fabricImg ? 'есть' : 'НЕТ'}`);
            
            if (!fabricImg) {
                throw new Error('Не удалось загрузить изображение');
            }
            
            if (this.currentImage) {
                this.fabricCanvas.remove(this.currentImage);
            }
            
            // ВАЖНО: присваиваем currentImage ПЕРЕД добавлением в canvas
            this.currentImage = fabricImg;
            
            this.clearCanvas();
            this.fabricCanvas.clear();
            this.fabricCanvas.add(this.currentImage);
            
            // ПРИНУДИТЕЛЬНОЕ ОТКЛЮЧЕНИЕ СГЛАЖИВАНИЯ
            if (this.fabricCanvas.contextContainer) {
                this.fabricCanvas.contextContainer.imageSmoothingEnabled = false;
                this.fabricCanvas.contextContainer.mozImageSmoothingEnabled = false;
                this.fabricCanvas.contextContainer.webkitImageSmoothingEnabled = false;
            }
            
            // Для самого изображения тоже отключаем
            if (this.currentImage.set) {
                this.currentImage.set({
                    imageSmoothing: false,
                    imageSmoothingEnabled: false
                });
            }
            
            console.log(`Изображение добавлено в canvas: ${this.currentImage.width} x ${this.currentImage.height}`);
            
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
        
        console.log(`OPEN: ${imageData.name}, URL: ${imageData.url.substring(0, 50)}...`);
        
        this.currentIndex = index;
        this.totalCount = totalCount;
        this.isVisible = true;
        
        document.body.classList.add('modal-open');
        this.modal.classList.add('active');
        
        // При открытии панель показываем
        this.ui.infoVisible = true;
        if (this.ui.infoPanel) this.ui.infoPanel.classList.remove('hidden');
        
        await this.sleep(50);
        
        const canvasEl = document.getElementById(this.canvasId);
        if (canvasEl) canvasEl.style.opacity = '0';
        
        await this.initCanvas();
        
        console.log('Canvas инициализирован, загружаем изображение...');
        
        await this.loadImage(imageData);
        await this.ui.updateFileInfo(imageData.fileObj);
        
        console.log('Изображение загружено, применяем режим...');
        
        // Применяем режим просмотра
        if (this.viewMode === 'fit') {
            if (this.zoomCtrl) this.zoomCtrl.zoomToFit();
        } else {
            if (this.zoomCtrl) this.zoomCtrl.zoomTo100();
        }
        
        if (canvasEl) {
            canvasEl.style.transition = 'opacity 0.2s ease';
            canvasEl.style.opacity = '1';
            setTimeout(() => {
                if (canvasEl) canvasEl.style.transition = '';
            }, 200);
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
        
        // Скрываем canvas до полной загрузки
        const canvasEl = document.getElementById(this.canvasId);
        if (canvasEl) canvasEl.style.opacity = '0';
        
        await this.loadImage(imageData);
        await this.ui.updateFileInfo(imageData.fileObj);
        
        // Применяем режим просмотра
        if (this.viewMode === 'fit') {
            if (this.zoomCtrl) this.zoomCtrl.zoomToFit();
        } else {
            if (this.zoomCtrl) this.zoomCtrl.zoomTo100();
        }
        
        // Показываем canvas
        if (canvasEl) {
            canvasEl.style.transition = 'opacity 0.2s ease';
            canvasEl.style.opacity = '1';
            setTimeout(() => {
                if (canvasEl) canvasEl.style.transition = '';
            }, 200);
        }
    }

    async next() {
        if (this.onNavigate && !this.isLoading) {
            const newIndex = await this.onNavigate(1);
            if (newIndex !== undefined && newIndex !== this.currentIndex) {
                this.currentIndex = newIndex;
            }
        }
    }

    async prev() {
        if (this.onNavigate && !this.isLoading) {
            const newIndex = await this.onNavigate(-1);
            if (newIndex !== undefined && newIndex !== this.currentIndex) {
                this.currentIndex = newIndex;
            }
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
        // Переключаем режим
        this.viewMode = this.viewMode === 'fit' ? '100' : 'fit';
        this.saveViewMode();
        this.updateViewModeButton();
        
        // Применяем режим
        if (this.viewMode === 'fit') {
            if (this.zoomCtrl) this.zoomCtrl.zoomToFit();
        } else {
            if (this.zoomCtrl) this.zoomCtrl.zoomTo100();
        }
        
        // Если мы в полноэкранном режиме, запоминаем новый режим для восстановления
        if (document.fullscreenElement) {
            this._viewModeBeforeFullscreen = this.viewMode;
        }
    }

    zoomIn() { if (this.zoomCtrl) this.zoomCtrl.zoomIn(); }
    zoomOut() { if (this.zoomCtrl) this.zoomCtrl.zoomOut(); }
    zoom100() { if (this.zoomCtrl) this.zoomCtrl.zoomTo100(); }
    fitToCanvas() { if (this.zoomCtrl) this.zoomCtrl.zoomToFit(); }
    
    rotateRight() { if (this.transformCtrl) this.transformCtrl.rotateRight(); }
    rotateLeft() { if (this.transformCtrl) this.transformCtrl.rotateLeft(); }
    
    applyFilter() { 
        if (this.filterCtrl) {
            this.filterCtrl.applyFilter();
        }
    }
    
    resetFilter() { 
        if (this.filterCtrl) {
            this.filterCtrl.resetFilter();
        }
    }
    
    removeAllFilters() { 
        if (this.filterCtrl) {
            this.filterCtrl.resetFilter();
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
    
    toggleInfoPanel() { 
        console.log('toggleInfoPanel called from ImageViewer');
        
        // Переключаем состояние панели
        this.ui.infoVisible = !this.ui.infoVisible;
        
        if (this.ui.infoVisible) {
            if (this.ui.infoPanel) this.ui.infoPanel.classList.remove('hidden');
        } else {
            if (this.ui.infoPanel) this.ui.infoPanel.classList.add('hidden');
        }
        
        this.ui.saveSettings();
        
        // Если мы в полноэкранном режиме, запоминаем новое состояние для восстановления
        if (document.fullscreenElement) {
            this._infoVisibleBeforeFullscreen = this.ui.infoVisible;
        }
    }
    
    setBackground(color) { 
        console.log('setBackground вызван с цветом:', color);
        if (this.ui) {
            this.ui.setBackground(color);
            this.ui.updateActiveBgButton(color);
        } else {
            console.warn('UI Controller не инициализирован');
        }
    }

    // ========== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ==========
    
    initEventListeners() {
        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.close());
        document.getElementById('prevFullBtn')?.addEventListener('click', () => this.prev());
        document.getElementById('nextFullBtn')?.addEventListener('click', () => this.next());
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
        
        const viewModeBtn = document.getElementById('zoomFitBtn');
        if (viewModeBtn) {
            viewModeBtn.addEventListener('click', () => this.toggleViewMode());
        }
        
        this.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('toggleInfoBtn')?.addEventListener('click', () => this.toggleInfoPanel());
        document.getElementById('rotateLeftBtn')?.addEventListener('click', () => this.rotateLeft());
        document.getElementById('rotateRightBtn')?.addEventListener('click', () => this.rotateRight());
        
        document.getElementById('applyFilterBtn')?.addEventListener('click', () => this.applyFilter());
        document.getElementById('resetFilterBtn')?.addEventListener('click', () => this.resetFilter());
        document.getElementById('removeFiltersBtn')?.addEventListener('click', () => this.removeAllFilters());
        
        const bgButtons = document.querySelectorAll('.bg-color-btn');
        console.log('Найдено кнопок фона:', bgButtons.length);
        
        bgButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const bg = btn.getAttribute('data-bg');
                console.log('Нажата кнопка фона:', bg);
                this.setBackground(bg);
            });
        });
        
        const previewCheckerToggle = document.getElementById('previewCheckerBg');
        if (previewCheckerToggle) {
            previewCheckerToggle.addEventListener('change', (e) => {
                this.ui.settings.previewCheckerBg = e.target.checked;
                this.ui.saveSettings();
                const previewImages = document.querySelectorAll('.card-img');
                previewImages.forEach(img => {
                    if (e.target.checked) {
                        img.classList.add('checker-bg');
                    } else {
                        img.classList.remove('checker-bg');
                    }
                });
            });
            previewCheckerToggle.checked = this.ui.settings.previewCheckerBg;
        }
        
        const pixelArtToggle = document.getElementById('pixelArtMode');
        if (pixelArtToggle) {
            pixelArtToggle.addEventListener('change', (e) => {
                this.ui.applyPixelArtSettings(e.target.checked);
                if (this.fabricCanvas && this.fabricCanvas.contextContainer) {
                    this.disableSmoothing(this.fabricCanvas.contextContainer);
                    this.forceRender();
                }
            });
            pixelArtToggle.checked = this.ui.settings.preservePixelArt;
        }
        
        document.querySelectorAll('[data-brightness]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyBrightness(parseInt(e.target.getAttribute('data-brightness')) / 100);
            });
        });
        
        document.querySelectorAll('[data-contrast]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyContrast(parseInt(e.target.getAttribute('data-contrast')) / 100);
            });
        });
        
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        window.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
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
                // ========== ВХОД В ПОЛНОЭКРАННЫЙ РЕЖИМ ==========
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                
                // Сохраняем ТЕКУЩИЙ масштаб и позицию
                if (this.currentImage) {
                    this._savedScaleBeforeFullscreen = this.currentImage.scaleX;
                    this._savedLeftBeforeFullscreen = this.currentImage.left;
                    this._savedTopBeforeFullscreen = this.currentImage.top;
                    this._viewModeBeforeFullscreen = this.viewMode;
                    console.log('Сохранён масштаб:', this._savedScaleBeforeFullscreen);
                }
                
                // Скрываем все элементы интерфейса
                if (this.infoPanel) this.infoPanel.style.display = 'none';
                const menu = document.querySelector('.fullscreen-menu');
                if (menu) menu.style.display = 'none';
                const closeBtn = document.querySelector('.close-modal');
                if (closeBtn) closeBtn.style.display = 'none';
                const topBar = document.querySelector('.top-bar');
                if (topBar) topBar.style.display = 'none';
                
                // Растягиваем canvas на весь экран
                if (this.imageArea) {
                    this.imageArea.style.width = '100vw';
                    this.imageArea.style.height = '100vh';
                    this.imageArea.style.borderRadius = '0';
                }
                
                // Даём время на перестройку
                setTimeout(() => {
                    // Обновляем размеры canvas
                    const newWidth = this.imageArea.clientWidth;
                    const newHeight = this.imageArea.clientHeight;
                    this.fabricCanvas.setDimensions({ width: newWidth, height: newHeight });
                    
                    // Принудительный FIT на весь экран
                    if (this.currentImage) {
                        let imgWidth, imgHeight;
                        if (this.currentImage.getBoundingRect) {
                            const bounds = this.currentImage.getBoundingRect();
                            imgWidth = bounds.width;
                            imgHeight = bounds.height;
                        } else {
                            imgWidth = this.currentImage.width;
                            imgHeight = this.currentImage.height;
                        }
                        
                        const scale = Math.min(newWidth / imgWidth, newHeight / imgHeight);
                        this.currentImage.scale(scale);
                        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
                        this.fabricCanvas.setZoom(1);
                        this.fabricCanvas.centerObject(this.currentImage);
                        this.fabricCanvas.renderAll();
                        
                        console.log(`Fullscreen FIT: canvas=${newWidth}x${newHeight}, scale=${scale}`);
                    }
                }, 200);
            } else {
                // ========== ВЫХОД ИЗ ПОЛНОЭКРАННОГО РЕЖИМА ==========
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                
                // Показываем все элементы обратно
                if (this.infoPanel) this.infoPanel.style.display = '';
                const menu = document.querySelector('.fullscreen-menu');
                if (menu) menu.style.display = '';
                const closeBtn = document.querySelector('.close-modal');
                if (closeBtn) closeBtn.style.display = '';
                const topBar = document.querySelector('.top-bar');
                if (topBar) topBar.style.display = '';
                
                // Возвращаем исходные стили canvas
                if (this.imageArea) {
                    this.imageArea.style.width = '';
                    this.imageArea.style.height = '';
                    this.imageArea.style.borderRadius = '';
                }
                
                setTimeout(() => {
                    // Обновляем размеры canvas
                    const newWidth = this.imageArea.clientWidth;
                    const newHeight = this.imageArea.clientHeight;
                    this.fabricCanvas.setDimensions({ width: newWidth, height: newHeight });
                    
                    // Восстанавливаем сохранённый масштаб и позицию
                    if (this.currentImage && this._savedScaleBeforeFullscreen !== undefined) {
                        this.currentImage.scale(this._savedScaleBeforeFullscreen);
                        this.currentImage.set({
                            left: this._savedLeftBeforeFullscreen,
                            top: this._savedTopBeforeFullscreen
                        });
                        this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
                        this.fabricCanvas.setZoom(1);
                        this.fabricCanvas.renderAll();
                        console.log('Восстановлен масштаб:', this._savedScaleBeforeFullscreen);
                    } else {
                        // Если не сохранили - применяем режим
                        const savedMode = this._viewModeBeforeFullscreen || '100';
                        if (savedMode === 'fit') {
                            if (this.zoomCtrl) this.zoomCtrl.zoomToFit();
                        } else {
                            if (this.zoomCtrl) this.zoomCtrl.zoomTo100();
                        }
                    }
                    this.forceRender();
                }, 200);
            }
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
            }
        } else {
            document.exitFullscreen().catch(err => console.log('Exit fullscreen error:', err));
        }
    }

    handleResize() {
        if (!this.isVisible || !this.fabricCanvas) return;

        const newWidth = this.imageArea.clientWidth;
        const newHeight = this.imageArea.clientHeight;

        if (newWidth > 0 && newHeight > 0) {
            const currentScale = this.currentImage ? this.currentImage.scaleX : 1;
            this.fabricCanvas.setDimensions({ width: newWidth, height: newHeight });

            // ВАЖНО! Здесь отключаем вмешательство при ресайзе, чтобы не сбивать fullscreen
            if (!document.fullscreenElement) {
                if (this.currentImage) {
                    this.currentImage.scale(currentScale);
                    this.fabricCanvas.centerObject(this.currentImage);
                    this.fabricCanvas.renderAll();
                }
                if (this.viewMode === 'fit') {
                    if (this.zoomCtrl) this.zoomCtrl.zoomToFit();
                }
            } else {
                 // Если fullscreen активен, просто центрируем без изменения масштаба
                if (this.currentImage) {
                    this.fabricCanvas.centerObject(this.currentImage);
                    this.fabricCanvas.renderAll();
                }
            }
        }
    }
}