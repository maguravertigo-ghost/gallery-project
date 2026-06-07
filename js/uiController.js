// ========== УПРАВЛЕНИЕ UI И НАСТРОЙКАМИ ==========

class UIController {
    constructor() {
        this.infoPanel = document.getElementById('infoPanel');
        this.imageArea = document.getElementById('imageArea');
        this.fileDetailsDiv = document.getElementById('fileDetails');
        this.infoVisible = true;
        this.settings = {
            preservePixelArt: true,
            previewCheckerBg: true,
            backgroundColor: 'dark'
        };
        this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('gallerySettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.settings = { ...this.settings, ...settings };
                if (settings.infoVisible !== undefined) this.infoVisible = settings.infoVisible;
            } catch(e) {}
        }
        this.applySettings();
    }

    saveSettings() {
        const settingsToSave = {
            ...this.settings,
            infoVisible: this.infoVisible
        };
        localStorage.setItem('gallerySettings', JSON.stringify(settingsToSave));
    }

    applySettings() {
        if (!this.infoVisible) {
            this.infoPanel?.classList.add('hidden');
        } else {
            this.infoPanel?.classList.remove('hidden');
        }
    }

    toggleInfoPanel() {
        if (document.fullscreenElement) return;
        
        this.infoVisible = !this.infoVisible;
        if (this.infoVisible) {
            this.infoPanel?.classList.remove('hidden');
        } else {
            this.infoPanel?.classList.add('hidden');
        }
        this.saveSettings();
    }

    async updateFileInfo(fileObj) {
        if (!fileObj) {
            this.fileDetailsDiv.innerHTML = '<i class="fas fa-info-circle"></i> Нет информации';
            return;
        }
        
        const meta = await getImageMetadata(fileObj);
        this.fileDetailsDiv.innerHTML = `
            <i class="fas fa-file-image"></i> <strong>${escapeHtml(meta.name)}</strong><br>
            <i class="fas fa-arrows-alt"></i> Размер: ${meta.width} x ${meta.height} px<br>
            <i class="fas fa-weight-hanging"></i> Вес: ${meta.size}<br>
            <i class="far fa-calendar-alt"></i> Изменён: ${meta.lastModified}<br>
            <i class="fas fa-tag"></i> Тип: ${meta.type || 'изображение'}
        `;
    }

    setBackground(color) {
        console.log('UI setBackground вызван с цветом:', color);
        
        const area = this.imageArea;
        if (!area) {
            console.error('imageArea не найден');
            return;
        }
        
        // Сбрасываем классы и стили
        area.classList.remove('checker-bg');
        area.style.backgroundImage = '';
        area.style.backgroundColor = '';
        
        switch(color) {
            case 'checker':
                area.classList.add('checker-bg');
                break;
            case 'dark':
                area.style.backgroundColor = '#1a1a2a';
                break;
            case 'black':
                area.style.backgroundColor = '#000000';
                break;
            case 'white':
                area.style.backgroundColor = '#f0f0f0';
                break;
            case 'pink':
                area.style.backgroundColor = '#FF00FF';
                break;
            case 'green':
                area.style.backgroundColor = '#66FF00';
                break;
            default:
                area.style.backgroundColor = '#1a1a2a';
        }
        
        this.settings.backgroundColor = color;
        this.saveSettings();
        
        console.log('Фон изменён на:', color, 'стиль:', area.style.backgroundColor);
    }

    updateActiveBgButton(activeBg) {
        console.log('updateActiveBgButton вызван с:', activeBg);
        
        const bgButtons = document.querySelectorAll('.bg-color-btn');
        console.log('Найдено кнопок для обновления:', bgButtons.length);
        
        bgButtons.forEach(btn => {
            const btnBg = btn.getAttribute('data-bg');
            if (btnBg === activeBg) {
                btn.classList.add('active');
                console.log('Активирована кнопка:', btnBg);
            } else {
                btn.classList.remove('active');
            }
        });
    }

    applyPixelArtSettings(preservePixelArt) {
        this.settings.preservePixelArt = preservePixelArt;
        this.saveSettings();
        
        const canvasEl = document.getElementById('fabricCanvas');
        if (canvasEl) {
            if (preservePixelArt) {
                canvasEl.style.imageRendering = 'pixelated';
                canvasEl.style.imageRendering = 'crisp-edges';
            } else {
                canvasEl.style.imageRendering = 'auto';
            }
        }
    }
}