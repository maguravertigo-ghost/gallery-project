// ========== ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ ==========

// Константы для оптимизации
const MAX_FILES_TO_SHOW = 1000;      // Максимум файлов для отображения
const FILES_PER_CHUNK = 100;         // Файлов за один чанк
const METADATA_BATCH = 50;           // Метаданных за один раз

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Pixel Gallery Pro запущена');
    
    let currentImages = [];
    let currentIndex = 0;
    let gallery = null;
    let viewer = null;
    let isProcessing = false;
    
    // Функция загрузки изображений из папки с ограничениями
    function readFolder(files) {
        const images = [];
        let skippedCount = 0;
        
        for (let file of files) {
            // Пропускаем если уже достигли лимита
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
    
    // Асинхронная загрузка метаданных порциями
    async function loadMetadataBatched(images, onProgress) {
        const total = images.length;
        
        for (let i = 0; i < total; i += METADATA_BATCH) {
            const batch = images.slice(i, i + METADATA_BATCH);
            
            // Загружаем метаданные для батча параллельно
            await Promise.all(batch.map(async (img, idx) => {
                const metadata = await getImageMetadata(img.fileObj);
                img.duration = metadata.duration;
                img.width = metadata.width;
                img.height = metadata.height;
                img.loaded = true;
                
                if (onProgress) {
                    onProgress(i + idx + 1, total);
                }
            }));
            
            // Даём браузеру отдохнуть
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    // Функция открытия изображения
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
        if (imgData && imgData.url) {
            await viewer.open(imgData, currentIndex, currentImages.length);
        }
    }
    
    // Инициализация галереи
    gallery = new Gallery('galleryContainer', openImage);
    window.gallery = gallery;
    
    // Функция применения шахматного фона для превью
    function applyCheckerBackgroundToPreviews() {
        const saved = localStorage.getItem('gallerySettings');
        let useCheckerBg = true;
        
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.previewCheckerBg !== undefined) {
                    useCheckerBg = settings.previewCheckerBg;
                }
            } catch(e) {}
        }
        
        const previewImages = document.querySelectorAll('.card-img');
        previewImages.forEach(img => {
            if (useCheckerBg) {
                img.classList.add('checker-bg');
            } else {
                img.classList.remove('checker-bg');
            }
        });
    }
    
    // Обработчик выбора папки (оптимизированный)
    const folderBtn = document.getElementById('folderSelectorBtn');
    const folderInput = document.getElementById('folderInput');
    
    folderBtn?.addEventListener('click', () => folderInput.click());
    
    folderInput?.addEventListener('change', async (ev) => {
        const files = Array.from(ev.target.files);
        if (!files.length) return;
        if (isProcessing) return;
        
        isProcessing = true;
        
        // Показываем прогресс-бар
        window.loadingController.show('Анализ папки...');
        window.loadingController.setProgress(0);
        
        // Очищаем старые URL и память
        if (currentImages.length) {
            revokeUrls(currentImages);
            currentImages = [];
        }
        
        // Принудительная сборка мусора (подсказка браузеру)
        if (window.gc) window.gc();
        
        // Фильтруем изображения и ограничиваем количество
        const imageFiles = files.filter(file => 
            file.type.startsWith('image/') || isImage(file.name)
        );
        
        const totalFound = imageFiles.length;
        let filesToLoad = imageFiles;
        let skippedCount = 0;
        
        if (totalFound > MAX_FILES_TO_SHOW) {
            filesToLoad = imageFiles.slice(0, MAX_FILES_TO_SHOW);
            skippedCount = totalFound - MAX_FILES_TO_SHOW;
            window.loadingController.setMessage(`⚠️ Лимит ${MAX_FILES_TO_SHOW} файлов. Пропущено: ${skippedCount}`);
        }
        
        window.loadingController.setMessage(`Загрузка ${filesToLoad.length} изображений...`);
        
        // Загружаем изображения порциями
        currentImages = [];
        
        for (let i = 0; i < filesToLoad.length; i += FILES_PER_CHUNK) {
            const chunk = filesToLoad.slice(i, i + FILES_PER_CHUNK);
            
            for (let j = 0; j < chunk.length; j++) {
                const file = chunk[j];
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
            
            // Даём браузеру отдохнуть
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        currentIndex = 0;
        
        if (currentImages.length) {
            window.loadingController.setMessage(`Обработка метаданных...`);
            window.loadingController.setProgress(50);
            
            // Загружаем метаданные порциями
            await loadMetadataBatched(currentImages, (loaded, total) => {
                const percent = 50 + (loaded / total) * 50;
                window.loadingController.setProgress(percent);
                window.loadingController.setMessage(`Обработка: ${loaded} из ${total}`);
            });
            
            gallery.loadFromFiles(filesToLoad);
            setTimeout(applyCheckerBackgroundToPreviews, 50);
        } else {
            gallery.loadFromFiles([]);
        }
        
        // Скрываем прогресс-бар
        setTimeout(() => {
            window.loadingController.hide();
            isProcessing = false;
        }, 500);
        
        folderInput.value = '';
    });
    
    // Обработчик смены режима отображения (сетка/список)
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-view');
            if (mode) {
                gallery.setView(mode);
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setTimeout(applyCheckerBackgroundToPreviews, 50);
            }
        });
    });
    
    // Устанавливаем начальный фон для области просмотра
    const imageArea = document.getElementById('imageArea');
    if (imageArea) {
        imageArea.style.backgroundColor = '#1a1a2a';
    }
    
    // Применяем шахматный фон при старте
    setTimeout(applyCheckerBackgroundToPreviews, 100);
    
    // Наблюдатель за изменениями в DOM для применения шахматного фона
    const observer = new MutationObserver(() => {
        applyCheckerBackgroundToPreviews();
    });
    
    const galleryContainer = document.getElementById('galleryContainer');
    if (galleryContainer) {
        observer.observe(galleryContainer, { childList: true, subtree: true });
    }
    
    console.log('✅ Приложение готово к работе');
});