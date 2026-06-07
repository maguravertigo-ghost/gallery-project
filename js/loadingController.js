// ========== КОНТРОЛЛЕР ЗАГРУЗКИ ==========

class LoadingController {
    constructor() {
        this.overlay = null;
        this.progressBar = null;
        this.percentText = null;
        this.statusText = null;
        this.isActive = false;
        this.minDisplayTime = 300;
        this.showTime = 0;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.overlay = document.getElementById('loadingOverlay');
        this.progressBar = document.getElementById('loadingProgressBar');
        this.percentText = document.getElementById('loadingPercent');
        this.statusText = document.getElementById('loadingStatus');
        
        console.log('LoadingController инициализирован');
    }

    show(message = 'Загрузка...') {
        if (!this.overlay) return;
        this.overlay.classList.add('active');
        this.isActive = true;
        this.showTime = Date.now();
        this.setProgress(0);
        this.setMessage(message);
    }

    hide() {
        if (!this.overlay || !this.isActive) return;
        
        const elapsed = Date.now() - this.showTime;
        const remaining = this.minDisplayTime - elapsed;
        
        if (remaining > 0) {
            setTimeout(() => {
                this.overlay.classList.remove('active');
                this.isActive = false;
            }, remaining);
        } else {
            this.overlay.classList.remove('active');
            this.isActive = false;
        }
    }

    setProgress(percent) {
        const p = Math.min(100, Math.max(0, percent));
        if (this.progressBar) {
            this.progressBar.style.width = `${p}%`;
        }
        if (this.percentText) {
            this.percentText.textContent = `${Math.floor(p)}%`;
        }
    }

    setMessage(message) {
        const textElement = document.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }
    }

    updateProgress(loaded, total) {
        if (total > 0) {
            this.setProgress((loaded / total) * 100);
        }
    }
}

window.loadingController = new LoadingController();