// ========== ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ ==========

// Константы для оптимизации
const MAX_FILES_TO_SHOW = 1000;
const FILES_PER_CHUNK = 100;
const METADATA_BATCH = 50;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Pixel Gallery Pro запущена');
    
    let currentImages = [];
    let currentIndex = 0;
    let gallery = null;
    let viewer = null;
    let isProcessing = false;
    
    function readFolder(files) {
        const images = [];
        let skippedCount = 0;
        for (let file of files) {
            if (images.length >= MAX_FILES_TO_SHOW) {
                skippedCount++;
                continue;
            }
            if (file.type.startsWith('image/') || isImage(file.name)) {
                images.push({
                    name: file.name,
                    path: file.webkitRelativePath || file.name,
                    url: URL.createObjectURL(file),
                    fileObj: file,
                    loaded: false
                });
            }
        }
        if (skippedCount > 0) {
            console.warn(`Пропущено ${skippedCount} файлов (превышен лимит в ${MAX_FILES_TO_SHOW})`);
            window.loadingController.setMessage(`Загружено ${images.length} из ${files.length} (лимит ${MAX_FILES_TO_SHOW})`);
        }
        return images;
    }
    
    async function loadMetadataBatched(images, onProgress) {
        const total = images.length;
        for (let i = 0; i < total; i += METADATA_BATCH) {
            const batch = images.slice(i, i + METADATA_BATCH);
            await Promise.all(batch.map(async (img, idx) => {
                const metadata = await getImageMetadata(img.fileObj);
                img.duration = metadata.duration;
                img.width = metadata.width;
                img.height = metadata.height;
                img.loaded = true;
                if (onProgress) onProgress(i + idx + 1, total);
            }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    async function openImage(index) {
        if (!currentImages.length) return;
        if (isProcessing) return;
        currentIndex = Math.min(Math.max(index, 0), currentImages.length - 1);
        if (!viewer) {
            viewer = new ImageViewer('modal', 'imageArea', 'fabricCanvas');
            viewer.setNavigationCallback(async (delta) => {
                let newIndex = currentIndex + delta;
                if (newIndex < 0) newIndex = currentImages.length - 1;
                if (newIndex >= currentImages.length) newIndex = 0;
                if (newIndex === currentIndex) return currentIndex;
                const imgData = currentImages[newIndex];
                if (imgData) {
                    await viewer.updateImage(imgData, newIndex);
                    currentIndex = newIndex;
                    return newIndex;
                }
                return currentIndex;
            });
        }
        const imgData = currentImages[currentIndex];
        if (imgData && imgData.url) await viewer.open(imgData, currentIndex, currentImages.length);
    }
    
    gallery = new Gallery('galleryContainer', openImage);
    window.gallery = gallery;
    
    // ===== ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПРИМЕНЕНИЯ ШАХМАТНОГО ФОНА =====
    window.applyCheckerBackgroundToPreviews = function() {
        const saved = localStorage.getItem('gallerySettings');
        let useCheckerBg = true;
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.previewCheckerBg !== undefined) useCheckerBg = settings.previewCheckerBg;
            } catch(e) {}
        }
        document.querySelectorAll('.card-img').forEach(img => {
            if (useCheckerBg) img.classList.add('checker-bg');
            else img.classList.remove('checker-bg');
        });
    };
    
    const folderBtn = document.getElementById('folderSelectorBtn');
    const folderInput = document.getElementById('folderInput');
    
    folderBtn?.addEventListener('click', () => folderInput.click());
    
    folderInput?.addEventListener('change', async (ev) => {
        const files = Array.from(ev.target.files);
        if (!files.length) return;
        if (isProcessing) return;
        isProcessing = true;
        
        window.loadingController.show('Анализ папки...');
        window.loadingController.setProgress(0);
        
        if (currentImages.length) {
            revokeUrls(currentImages);
            currentImages = [];
        }
        if (window.gc) window.gc();
        
        const imageFiles = files.filter(file => file.type.startsWith('image/') || isImage(file.name));
        let filesToLoad = imageFiles;
        let skippedCount = 0;
        if (imageFiles.length > MAX_FILES_TO_SHOW) {
            filesToLoad = imageFiles.slice(0, MAX_FILES_TO_SHOW);
            skippedCount = imageFiles.length - MAX_FILES_TO_SHOW;
            window.loadingController.setMessage(`⚠️ Лимит ${MAX_FILES_TO_SHOW} файлов. Пропущено: ${skippedCount}`);
        }
        
        window.loadingController.setMessage(`Загрузка ${filesToLoad.length} изображений...`);
        currentImages = [];
        
        for (let i = 0; i < filesToLoad.length; i += FILES_PER_CHUNK) {
            const chunk = filesToLoad.slice(i, i + FILES_PER_CHUNK);
            for (let file of chunk) {
                currentImages.push({
                    name: file.name,
                    path: file.webkitRelativePath || file.name,
                    url: URL.createObjectURL(file),
                    fileObj: file,
                    loaded: false
                });
            }
            const percent = ((i + chunk.length) / filesToLoad.length) * 50;
            window.loadingController.setProgress(percent);
            window.loadingController.setMessage(`Загрузка: ${currentImages.length} из ${filesToLoad.length}`);
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        currentIndex = 0;
        
        if (currentImages.length) {
            window.loadingController.setMessage(`Обработка метаданных...`);
            window.loadingController.setProgress(50);
            await loadMetadataBatched(currentImages, (loaded, total) => {
                const percent = 50 + (loaded / total) * 50;
                window.loadingController.setProgress(percent);
                window.loadingController.setMessage(`Обработка: ${loaded} из ${total}`);
            });
            gallery.loadFromFiles(filesToLoad);
            setTimeout(window.applyCheckerBackgroundToPreviews, 50);
        } else {
            gallery.loadFromFiles([]);
        }
        
        setTimeout(() => {
            window.loadingController.hide();
            isProcessing = false;
        }, 500);
        folderInput.value = '';
    });
    
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-view');
            if (mode) {
                gallery.setView(mode);
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setTimeout(window.applyCheckerBackgroundToPreviews, 50);
            }
        });
    });
    
    const imageArea = document.getElementById('imageArea');
    if (imageArea) imageArea.style.backgroundColor = '#1a1a2a';
    
    setTimeout(window.applyCheckerBackgroundToPreviews, 100);
    
    const observer = new MutationObserver(() => window.applyCheckerBackgroundToPreviews());
    const galleryContainer = document.getElementById('galleryContainer');
    if (galleryContainer) observer.observe(galleryContainer, { childList: true, subtree: true });
    
    console.log('✅ Приложение готово к работе');
});