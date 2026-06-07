// ========== КЛАСС ГАЛЕРЕИ ==========

class Gallery {
    constructor(containerId, onImageSelect) {
        this.container = document.getElementById(containerId);
        this.images = [];
        this.currentView = 'grid';
        this.onImageSelect = onImageSelect;
        this.statsPanel = document.getElementById('statsPanel');
        this.folderNameSpan = document.getElementById('folderName');
    }

    /**
     * Получить настройку шахматного фона из localStorage
     */
    getCheckerBgSetting() {
        const saved = localStorage.getItem('gallerySettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                return settings.previewCheckerBg !== undefined ? settings.previewCheckerBg : true;
            } catch(e) {}
        }
        return true; // по умолчанию true
    }

    /**
     * Загрузить изображения из папки
     */
    loadFromFiles(files) {
        const newImages = [];
        
        for (let file of files) {
            if (file.type.startsWith('image/') || isImage(file.name)) {
                newImages.push({
                    name: file.name,
                    path: file.webkitRelativePath || file.name,
                    url: URL.createObjectURL(file),
                    fileObj: file
                });
            }
        }
        
        if (newImages.length) {
            revokeUrls(this.images);
            this.images = newImages;
            
            let folderLabel = newImages[0].path.split('/')[0] || 'папка';
            this.folderNameSpan.innerText = folderLabel;
            
            this.render();
        } else {
            this.images = [];
            this.render();
            this.folderNameSpan.innerText = 'Нет изображений';
        }
        
        return this.images.length;
    }

    /**
     * Получить изображение по индексу
     */
    getImage(index) {
        return this.images[index];
    }

    /**
     * Получить количество изображений
     */
    getCount() {
        return this.images.length;
    }

    /**
     * Установить режим отображения
     */
    setView(mode) {
        this.currentView = mode;
        this.render();
    }

    /**
     * Отрисовать галерею
     */
    render() {
        if (!this.images.length) {
            this.container.innerHTML = `<div class="empty-folder">
                <i class="fas fa-folder-open"></i> Нет изображений в выбранной папке
            </div>`;
            this.statsPanel.innerText = '0 изображений';
            return;
        }

        this.statsPanel.innerText = `${this.images.length} изображений`;

        if (this.currentView === 'grid') {
            this.renderGrid();
        } else {
            this.renderList();
        }

        this.attachCardHandlers();
        this.applyCheckerBackground(); // Применяем шахматный фон после рендера
    }

    /**
     * Применить шахматный фон ко всем превью
     */
    applyCheckerBackground() {
        const useCheckerBg = this.getCheckerBgSetting();
        const previewImages = document.querySelectorAll('.card-img');
        
        previewImages.forEach(img => {
            if (useCheckerBg) {
                img.classList.add('checker-bg');
            } else {
                img.classList.remove('checker-bg');
            }
        });
    }

    /**
     * Обновить шахматный фон для превью (вызывается из настроек)
     */
    updateCheckerBackground(useChecker) {
        const previewImages = document.querySelectorAll('.card-img');
        previewImages.forEach(img => {
            if (useChecker) {
                img.classList.add('checker-bg');
            } else {
                img.classList.remove('checker-bg');
            }
        });
    }

    /**
     * Отрисовать сеткой
     */
    renderGrid() {
        this.container.className = 'gallery-grid';
        
        // Используем DocumentFragment для улучшения производительности
        const fragment = document.createDocumentFragment();
        
        this.images.forEach((img, i) => {
            const displayName = img.name.length > 30 ? img.name.slice(0, 27) + '…' : img.name;
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('data-index', i);
            card.innerHTML = `
                <img class="card-img" src="${img.url}" loading="lazy" alt="${escapeHtml(img.name)}">
                <div class="card-info">
                    <span>${escapeHtml(displayName)}</span>
                    <i class="fas fa-expand"></i>
                </div>
            `;
            fragment.appendChild(card);
        });
        
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }

    /**
     * Отрисовать списком
     */
    renderList() {
        this.container.className = 'gallery-list';
        let html = `<div style="display:flex; flex-direction:column; gap:12px; padding:20px;">`;
        
        this.images.forEach((img, i) => {
            html += `
                <div class="card" data-index="${i}" style="display:flex; align-items:center; gap:15px; padding:10px 20px;">
                    <img src="${img.url}" style="width:60px; height:60px; object-fit:cover; border-radius:14px; image-rendering: pixelated;" class="card-img" alt="${escapeHtml(img.name)}">
                    <span style="flex:1;">${escapeHtml(img.name)}</span>
                    <i class="fas fa-eye"></i>
                </div>
            `;
        });
        
        html += `</div>`;
        this.container.innerHTML = html;
    }

    /**
     * Добавить обработчики на карточки
     */
    attachCardHandlers() {
        document.querySelectorAll('.card').forEach(card => {
            // Удаляем старый обработчик, чтобы не накапливались
            card.removeEventListener('click', this.cardClickHandler);
            this.cardClickHandler = (e) => {
                e.preventDefault();
                const index = parseInt(card.getAttribute('data-index'));
                if (!isNaN(index) && this.onImageSelect) {
                    this.onImageSelect(index);
                }
            };
            card.addEventListener('click', this.cardClickHandler);
        });
    }
}