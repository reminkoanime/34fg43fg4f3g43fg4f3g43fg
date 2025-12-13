// ===== Главный JavaScript файл =====

// Инициализация Supabase клиента
let supabaseClient = null;
if (typeof supabase !== 'undefined' && CONFIG.supabase) {
    supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
}

let backgroundInterval;
let currentVideo = null;
let videoInterval;

// ===== Инициализация =====
let appInitialized = false;

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
}

function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;
    
    try {
        // Установка темы
        setTheme(CONFIG.theme.default);
        
        // Загрузка библиотеки аниме
        loadAnimeLibrary();
        
        // Инициализация поиска
        initializeSearch();
        
        // Загрузка логотипа после полной загрузки (не блокируем загрузку)
        if (document.readyState === 'complete') {
            loadLogoImage();
        } else {
            window.addEventListener('load', loadLogoImage, { once: true });
        }
        
        // Инициализация авторизации
        initializeAuth();
        
        // Инициализация фонового слайдшоу после полной загрузки страницы
        if (document.readyState === 'complete') {
            // Страница уже загружена, можно загружать фоны
            setTimeout(() => {
                initializeBackgroundSlideshow();
            }, 500);
        } else {
            // Ждем полной загрузки
            window.addEventListener('load', () => {
                setTimeout(() => {
                    initializeBackgroundSlideshow();
                }, 500);
            }, { once: true });
        }
        
        // Скрытие экрана загрузки сразу
        hideLoadingScreen();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        hideLoadingScreen(); // Все равно скрываем экран загрузки
    }
}

// Загрузка логотипа с автоматическим определением расширения
function loadLogoImage() {
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];
    const logoElements = document.querySelectorAll('.logo-image, .hero-logo');
    
    if (logoElements.length === 0) return;
    
    logoElements.forEach(img => {
        let extensionIndex = 0;
        let timeoutId = null;
        let loaded = false;
        
        const tryLoadImage = () => {
            if (loaded || extensionIndex >= extensions.length) {
                if (!loaded && img.src && !img.src.includes('data:')) {
                    // Если не удалось загрузить, используем placeholder
                    img.onerror = null; // Останавливаем дальнейшие попытки
                }
                return;
            }
            
            const ext = extensions[extensionIndex];
            const testImg = new Image();
            
            // Таймаут для каждой попытки
            timeoutId = setTimeout(() => {
                if (!loaded) {
                    extensionIndex++;
                    tryLoadImage();
                }
            }, 500);
            
            testImg.onload = () => {
                if (!loaded) {
                    clearTimeout(timeoutId);
                    loaded = true;
                    img.src = `fons/Fon.${ext}`;
                    img.onerror = null; // Убираем обработчик ошибок после успешной загрузки
                }
            };
            
            testImg.onerror = () => {
                if (!loaded) {
                    clearTimeout(timeoutId);
                    extensionIndex++;
                    tryLoadImage();
                }
            };
            
            testImg.src = `fons/Fon.${ext}`;
        };
        
        // Добавляем обработчик ошибок для финального изображения
        img.onerror = function() {
            // Если изображение не загрузилось, не показываем ошибку
            this.onerror = null;
        };
        
        tryLoadImage();
    });
}

// Проверяем OAuth callback сразу при загрузке страницы (до инициализации)
if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type='))) {
    // Если есть OAuth параметры, инициализируем Supabase клиент раньше
    if (typeof supabase !== 'undefined' && CONFIG.supabase && !supabaseClient) {
        supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
    }
}

// Инициализация при полной загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        // Скрываем экран загрузки сразу после инициализации DOM
        setTimeout(hideLoadingScreen, 100);
    });
} else {
    // DOM уже загружен
    initializeApp();
    setTimeout(hideLoadingScreen, 100);
}

// Скрываем экран загрузки при полной загрузке страницы (включая все ресурсы)
window.addEventListener('load', () => {
    hideLoadingScreen();
    // Убеждаемся что браузер понимает что все загружено
    if (window.stop) {
        // Не используем window.stop, так как это может быть агрессивно
    }
}, { once: true });

// Гарантированно скрываем экран загрузки через максимум 1 секунду
setTimeout(() => {
    hideLoadingScreen();
}, 1000);

// ===== Управление темой =====
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    CONFIG.theme.default = theme;
    saveData();
}

// ===== Фоновое слайдшоу =====
function initializeBackgroundSlideshow() {
    const container = document.getElementById('background-container');
    if (!container || CONFIG.backgrounds.length === 0) return;
    
    let loadedCount = 0;
    const totalImages = CONFIG.backgrounds.length;
    
    // Создаем изображения для всех фонов
    CONFIG.backgrounds.forEach((bg, index) => {
        const img = document.createElement('img');
        img.alt = `Background ${index + 1}`;
        img.classList.add('background-slide');
        if (index === CONFIG.currentBackgroundIndex) img.classList.add('active');
        
        // Обработчики для отслеживания загрузки (не блокируют основную загрузку)
        img.onload = () => {
            loadedCount++;
            bg.loaded = true;
        };
        
        img.onerror = () => {
            // Если изображение не загрузилось, просто скрываем его
            img.style.display = 'none';
            bg.loaded = false;
            loadedCount++;
        };
        
        // Добавляем в DOM сначала
        container.appendChild(img);
        
        // Загружаем с задержкой, чтобы не блокировать основную загрузку страницы
        setTimeout(() => {
            img.src = bg.url;
        }, index * 50); // Небольшая задержка между загрузками
    });
    
    // Запускаем смену фонов сразу, не дожидаясь загрузки всех изображений
    startBackgroundSlideshow();
}

function startBackgroundSlideshow() {
    if (CONFIG.backgrounds.length <= 1) return;
    
    backgroundInterval = setInterval(() => {
        const images = document.querySelectorAll('.background-slide');
        if (images.length === 0) return;
        
        const current = images[CONFIG.currentBackgroundIndex];
        if (current) current.classList.remove('active');
        
        // Выбираем случайный следующий фон
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * images.length);
        } while (nextIndex === CONFIG.currentBackgroundIndex && images.length > 1);
        
        CONFIG.currentBackgroundIndex = nextIndex;
        
        const next = images[CONFIG.currentBackgroundIndex];
        if (next) next.classList.add('active');
    }, CONFIG.backgroundInterval);
}

// ===== Загрузка библиотеки аниме =====
function loadAnimeLibrary() {
    updateAnimeCount();
    renderAnimeGrid();
}

function updateAnimeCount() {
    const totalAnime = CONFIG.animeLibrary.length;
    const totalEpisodes = CONFIG.animeLibrary.reduce((sum, anime) => sum + (anime.episodes || 0), 0);
    
    document.getElementById('anime-count').textContent = totalAnime;
    document.getElementById('total-anime').textContent = totalAnime;
    document.getElementById('total-episodes').textContent = totalEpisodes;
}

function renderAnimeGrid() {
    const grid = document.getElementById('anime-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (!grid) return;
    
    let filteredAnime = [...CONFIG.animeLibrary];
    
    // Применяем поиск
    if (CONFIG.filters.searchQuery) {
        const query = CONFIG.filters.searchQuery.toLowerCase();
        filteredAnime = filteredAnime.filter(anime => {
            const title = (anime.titleRu || anime.title || '').toLowerCase();
            const originalTitle = (anime.title || '').toLowerCase();
            return title.includes(query) || originalTitle.includes(query);
        });
    }
    
    // Применяем сортировку
    filteredAnime.sort((a, b) => {
        switch (CONFIG.filters.sortBy) {
            case 'year':
                return (b.year || 0) - (a.year || 0);
            case 'episodes':
                return (b.episodes || 0) - (a.episodes || 0);
            case 'rating':
                const ratingA = CONFIG.ratings[a.id] || a.rating || 0;
                const ratingB = CONFIG.ratings[b.id] || b.rating || 0;
                return ratingB - ratingA;
            case 'title':
            default:
                const titleA = (a.titleRu || a.title || '').toLowerCase();
                const titleB = (b.titleRu || b.title || '').toLowerCase();
                return titleA.localeCompare(titleB, 'ru');
        }
    });
    
    // Обновляем счетчик
    document.getElementById('filtered-count').textContent = `(${filteredAnime.length})`;
    
    // Очищаем сетку
    grid.innerHTML = '';
    
    // Показываем/скрываем пустое состояние
    if (filteredAnime.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = 'grid';
    
    // Рендерим карточки аниме
    filteredAnime.forEach(anime => {
        const card = createAnimeCard(anime);
        grid.appendChild(card);
    });
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.setAttribute('data-anime-id', anime.id);
    
    const posterWrapper = document.createElement('div');
    posterWrapper.className = 'anime-poster-wrapper';
    
    const poster = document.createElement('img');
    poster.className = 'anime-poster';
    poster.src = anime.poster || 'https://via.placeholder.com/300x450/6366f1/ffffff?text=Anime';
    poster.alt = anime.titleRu || anime.title || 'Anime';
    poster.onerror = function() {
        this.src = 'https://via.placeholder.com/300x450/6366f1/ffffff?text=Anime';
    };
    
    // Overlay с кнопками
    const overlay = document.createElement('div');
    overlay.className = 'anime-card-overlay';
    
    // Кнопка воспроизведения
    const playBtn = document.createElement('button');
    playBtn.className = 'card-action-btn play-btn';
    playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    `;
    playBtn.onclick = (e) => {
        e.stopPropagation();
        openPlayer(anime);
    };
    
    // Кнопка избранного
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `card-action-btn favorite-btn ${CONFIG.favorites.includes(anime.id) ? 'active' : ''}`;
    favoriteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="${CONFIG.favorites.includes(anime.id) ? 'currentColor' : 'none'}" stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    `;
    favoriteBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(anime.id, favoriteBtn);
    };
    
    overlay.appendChild(playBtn);
    overlay.appendChild(favoriteBtn);
    
    posterWrapper.appendChild(poster);
    posterWrapper.appendChild(overlay);
    
    // Рейтинг
    const rating = document.createElement('div');
    rating.className = 'anime-rating';
    const userRating = CONFIG.ratings[anime.id] || anime.rating || 0;
    rating.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>${userRating.toFixed(1)}</span>
    `;
    rating.onclick = (e) => {
        e.stopPropagation();
        showRatingModal(anime);
    };
    posterWrapper.appendChild(rating);
    
    const info = document.createElement('div');
    info.className = 'anime-info';
    
    const title = document.createElement('div');
    title.className = 'anime-title';
    title.textContent = anime.titleRu || anime.title || 'Без названия';
    
    // Теги
    if (anime.tags && anime.tags.length > 0) {
        const tags = document.createElement('div');
        tags.className = 'anime-tags';
        anime.tags.slice(0, 2).forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'anime-tag';
            tagEl.textContent = tag;
            tags.appendChild(tagEl);
        });
        info.appendChild(tags);
    }
    
    const meta = document.createElement('div');
    meta.className = 'anime-meta';
    
    const year = document.createElement('span');
    year.className = 'anime-year';
    year.textContent = anime.year || '—';
    
    const episodes = document.createElement('span');
    episodes.className = 'anime-episodes';
    episodes.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        ${anime.episodes || 0}
    `;
    
    meta.appendChild(year);
    meta.appendChild(episodes);
    info.appendChild(title);
    info.appendChild(meta);
    
    card.appendChild(posterWrapper);
    card.appendChild(info);
    
    return card;
}

// ===== Поиск =====
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }
}

function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    if (!searchInput) return;
    
    CONFIG.filters.searchQuery = searchInput.value.trim();
    
    if (searchClear) {
        searchClear.style.display = CONFIG.filters.searchQuery ? 'flex' : 'none';
    }
    
    renderAnimeGrid();
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    if (searchInput) {
        searchInput.value = '';
        CONFIG.filters.searchQuery = '';
    }
    
    if (searchClear) {
        searchClear.style.display = 'none';
    }
    
    renderAnimeGrid();
}

// ===== Фильтры и сортировка =====
function applyFilters() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        CONFIG.filters.sortBy = sortSelect.value;
    }
    renderAnimeGrid();
}

function toggleFilters() {
    // В будущем можно добавить расширенные фильтры
    alert('Расширенные фильтры будут добавлены в следующих обновлениях!');
}

// ===== Навигация =====
function scrollToSection(sectionId, event) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Обновляем активную ссылку
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // Если event не передан, находим ссылку по href
            const link = document.querySelector(`a[href="#${sectionId}"]`);
            if (link) link.classList.add('active');
        }
    }
}

// ===== Видеоплеер =====
function openPlayer(anime) {
    CONFIG.currentAnime = anime;
    const modal = document.getElementById('player-modal');
    const playerInfo = document.getElementById('player-info');
    const episodesList = document.getElementById('episodes-list');
    
    if (!modal) return;
    
    // Обновляем информацию о сериале
    if (playerInfo) {
        playerInfo.innerHTML = `
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
                ${anime.titleRu || anime.title || 'Без названия'}
            </h2>
            <div style="display: flex; gap: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
                <span>${anime.year || '—'}</span>
                <span>•</span>
                <span>${anime.episodes || 0} эпизодов</span>
            </div>
            ${anime.description ? `<p style="margin-top: 1rem; color: var(--text-secondary); line-height: 1.6;">${anime.description}</p>` : ''}
        `;
    }
    
    // Рендерим список эпизодов
    if (episodesList) {
        episodesList.innerHTML = '';
        
        if (anime.episodesList && anime.episodesList.length > 0) {
            anime.episodesList.forEach((episode, index) => {
                const btn = document.createElement('button');
                btn.className = 'episode-btn';
                btn.textContent = `Эп. ${episode.number}`;
                btn.title = episode.title || `Эпизод ${episode.number}`;
                btn.onclick = () => loadEpisode(episode, index);
                episodesList.appendChild(btn);
            });
        } else {
            episodesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Эпизоды не найдены</p>';
        }
    }
    
    // Показываем модальное окно
    modal.classList.add('active');
    
    // Сбрасываем видеоплеер
    const playerContainer = document.getElementById('player-container');
    if (playerContainer) {
        playerContainer.innerHTML = `
            <div class="player-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <p>Выберите эпизод</p>
            </div>
        `;
    }
    
    // Скрываем контролы
    const controls = document.getElementById('player-controls');
    if (controls) controls.style.display = 'none';
}

function closePlayer() {
    const modal = document.getElementById('player-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Останавливаем видео
    if (currentVideo) {
        currentVideo.pause();
        currentVideo = null;
    }
    
    if (videoInterval) {
        clearInterval(videoInterval);
        videoInterval = null;
    }
    
    // Обновляем историю
    updateHistory();
}

function loadEpisode(episode, index) {
    const playerContainer = document.getElementById('player-container');
    const controls = document.getElementById('player-controls');
    const episodesList = document.getElementById('episodes-list');
    
    if (!playerContainer) return;
    
    // Обновляем активный эпизод
    if (episodesList) {
        episodesList.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('active'));
        episodesList.children[index]?.classList.add('active');
    }
    
    // Создаем видеоплеер
    const video = document.createElement('video');
    video.id = 'video-player';
    
    // Поддержка локальных файлов
    // Если videoUrl начинается с #, это означает что файл еще не указан
    // Если это file:// путь, используем его напрямую
    // Если это относительный путь, добавляем базовый путь из конфига
    let videoSrc = episode.videoUrl || '';
    
    if (videoSrc && !videoSrc.startsWith('#') && !videoSrc.startsWith('http') && !videoSrc.startsWith('file://')) {
        // Относительный путь - добавляем базовый путь
        if (CONFIG.localAnimePath) {
            videoSrc = CONFIG.localAnimePath + videoSrc;
        }
    }
    
    video.src = videoSrc;
    video.controls = false;
    video.preload = 'metadata';
    
    // Обработчики событий
    video.addEventListener('loadedmetadata', () => {
        updateTimeDisplay();
    });
    
    video.addEventListener('timeupdate', () => {
        updateProgressBar();
        updateTimeDisplay();
    });
    
    video.addEventListener('play', () => {
        updatePlayButton(true);
    });
    
    video.addEventListener('pause', () => {
        updatePlayButton(false);
    });
    
    video.addEventListener('ended', () => {
        // Автоматически загружаем следующий эпизод
        if (index < CONFIG.currentAnime.episodesList.length - 1) {
            loadEpisode(CONFIG.currentAnime.episodesList[index + 1], index + 1);
        }
    });
    
    video.addEventListener('volumechange', () => {
        updateVolumeControls();
    });
    
    // Обработка ошибок
    video.onerror = function() {
        playerContainer.innerHTML = `
            <div class="player-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>Ошибка загрузки видео</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.7;">
                    Укажите корректный URL видео в конфигурации
                </p>
            </div>
        `;
        if (controls) controls.style.display = 'none';
    };
    
    playerContainer.innerHTML = '';
    playerContainer.appendChild(video);
    
    currentVideo = video;
    
    // Показываем контролы
    if (controls) controls.style.display = 'flex';
    
    // Загружаем видео
    video.load();
    
    // Устанавливаем громкость
    video.volume = CONFIG.player.defaultVolume;
    
    // Сохраняем прогресс просмотра
    const historyEntry = CONFIG.history.find(h => 
        h.animeId === CONFIG.currentAnime.id && h.episode === episode.number
    );
    
    if (historyEntry && historyEntry.currentTime > 0) {
        video.currentTime = historyEntry.currentTime;
    }
    
    // Обновляем интервал времени
    if (videoInterval) clearInterval(videoInterval);
    videoInterval = setInterval(() => {
        if (currentVideo && !currentVideo.paused) {
            saveWatchProgress(CONFIG.currentAnime.id, episode.number, currentVideo.currentTime);
        }
    }, 5000);
}

// ===== Управление видеоплеером =====
function togglePlay() {
    if (!currentVideo) return;
    
    if (currentVideo.paused) {
        currentVideo.play();
    } else {
        currentVideo.pause();
    }
}

function updatePlayButton(playing) {
    const playBtn = document.getElementById('play-btn');
    if (!playBtn) return;
    
    playBtn.innerHTML = playing ? `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
    ` : `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    `;
}

function skipBackward() {
    if (!currentVideo) return;
    currentVideo.currentTime = Math.max(0, currentVideo.currentTime - CONFIG.player.skipTime);
}

function skipForward() {
    if (!currentVideo) return;
    currentVideo.currentTime = Math.min(currentVideo.duration, currentVideo.currentTime + CONFIG.player.skipTime);
}

function seekVideo(value) {
    if (!currentVideo) return;
    const time = (value / 100) * currentVideo.duration;
    currentVideo.currentTime = time;
}

function updateProgressBar() {
    if (!currentVideo) return;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && currentVideo.duration) {
        const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
        progressBar.value = progress;
    }
}

function updateTimeDisplay() {
    if (!currentVideo) return;
    
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(currentVideo.currentTime);
    }
    
    if (totalTimeEl) {
        totalTimeEl.textContent = formatTime(currentVideo.duration || 0);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function toggleMute() {
    if (!currentVideo) return;
    currentVideo.muted = !currentVideo.muted;
    updateVolumeControls();
}

function changeVolume(value) {
    if (!currentVideo) return;
    currentVideo.volume = value / 100;
    currentVideo.muted = false;
    updateVolumeControls();
}

function updateVolumeControls() {
    if (!currentVideo) return;
    
    const volumeBar = document.getElementById('volume-bar');
    const muteBtn = document.getElementById('mute-btn');
    
    if (volumeBar) {
        volumeBar.value = currentVideo.muted ? 0 : currentVideo.volume * 100;
    }
    
    if (muteBtn) {
        muteBtn.innerHTML = currentVideo.muted || currentVideo.volume === 0 ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
        ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
        `;
    }
}

function toggleFullscreen() {
    if (!currentVideo) return;
    
    const playerWrapper = currentVideo.closest('.player-wrapper');
    if (!playerWrapper) return;
    
    if (!document.fullscreenElement) {
        playerWrapper.requestFullscreen().catch(err => {
            console.error('Ошибка полноэкранного режима:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Обработка полноэкранного режима
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.innerHTML = document.fullscreenElement ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
        ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
        `;
    }
});

// ===== История просмотра =====
function saveWatchProgress(animeId, episode, currentTime) {
    const existingIndex = CONFIG.history.findIndex(h => 
        h.animeId === animeId && h.episode === episode
    );
    
    const entry = {
        animeId,
        episode,
        currentTime,
        watchedAt: Date.now()
    };
    
    if (existingIndex >= 0) {
        CONFIG.history[existingIndex] = entry;
    } else {
        CONFIG.history.push(entry);
    }
    
    saveData();
}

function updateHistory() {
    // Обновляем историю при закрытии плеера
    if (currentVideo && CONFIG.currentAnime) {
        const currentEpisode = CONFIG.currentAnime.episodesList?.find((_, i) => {
            const btn = document.querySelectorAll('.episode-btn')[i];
            return btn?.classList.contains('active');
        });
        
        if (currentEpisode) {
            saveWatchProgress(CONFIG.currentAnime.id, currentEpisode.number, currentVideo.currentTime);
        }
    }
}

function showHistory() {
    if (CONFIG.history.length === 0) {
        alert('История просмотра пуста');
        return;
    }
    
    let historyText = 'История просмотра:\n\n';
    CONFIG.history.slice(-10).reverse().forEach(entry => {
        const anime = CONFIG.animeLibrary.find(a => a.id === entry.animeId);
        if (anime) {
            historyText += `• ${anime.titleRu || anime.title} - Эп. ${entry.episode}\n`;
        }
    });
    
    alert(historyText);
}

// ===== Избранное =====
function toggleFavorite(animeId, button) {
    const index = CONFIG.favorites.indexOf(animeId);
    
    if (index > -1) {
        CONFIG.favorites.splice(index, 1);
        button.classList.remove('active');
        button.querySelector('svg').setAttribute('fill', 'none');
    } else {
        CONFIG.favorites.push(animeId);
        button.classList.add('active');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
    }
    
    saveData();
    
    // Анимация
    button.style.transform = 'scale(1.2)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 200);
}

function showFavorites() {
    if (CONFIG.favorites.length === 0) {
        CONFIG.filters.searchQuery = '';
        alert('В избранном пока нет аниме');
        return;
    }
    
    // Фильтруем по избранному
    const favoriteAnime = CONFIG.animeLibrary.filter(a => CONFIG.favorites.includes(a.id));
    const originalLibrary = [...CONFIG.animeLibrary];
    
    CONFIG.animeLibrary = favoriteAnime;
    renderAnimeGrid();
    
    document.getElementById('section-title').innerHTML = `
        <span>Избранное</span>
        <span class="title-count">(${favoriteAnime.length})</span>
    `;
    
    // Восстанавливаем через 5 секунд или при следующем поиске
    setTimeout(() => {
        if (CONFIG.filters.searchQuery === '') {
            CONFIG.animeLibrary = originalLibrary;
            renderAnimeGrid();
            document.getElementById('section-title').innerHTML = `
                <span>Все аниме</span>
                <span class="title-count" id="filtered-count"></span>
            `;
        }
    }, 30000);
}

// ===== Рейтинги =====
function showRatingModal(anime) {
    const currentRating = CONFIG.ratings[anime.id] || 0;
    const rating = prompt(`Оцените "${anime.titleRu || anime.title}" от 0 до 10:`, currentRating);
    
    if (rating !== null) {
        const numRating = parseFloat(rating);
        if (!isNaN(numRating) && numRating >= 0 && numRating <= 10) {
            CONFIG.ratings[anime.id] = numRating;
            saveData();
            renderAnimeGrid();
            
            // Анимация успеха
            const card = document.querySelector(`.anime-card[data-anime-id="${anime.id}"]`);
            if (card) {
                card.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    card.style.transform = 'scale(1)';
                }, 300);
            }
        } else {
            alert('Введите число от 0 до 10');
        }
    }
}

// ===== Статистика =====
function showStats() {
    const totalWatched = CONFIG.watchStats.totalWatched || 0;
    const totalTime = CONFIG.watchStats.totalTime || 0;
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    
    let statsText = `📊 Статистика просмотра\n\n`;
    statsText += `Всего просмотрено: ${totalWatched} эпизодов\n`;
    statsText += `Общее время: ${hours}ч ${minutes}м\n\n`;
    
    if (Object.keys(CONFIG.watchStats.byAnime || {}).length > 0) {
        statsText += `По сериалам:\n`;
        Object.entries(CONFIG.watchStats.byAnime).forEach(([animeId, data]) => {
            const anime = CONFIG.animeLibrary.find(a => a.id == animeId);
            if (anime) {
                statsText += `• ${anime.titleRu || anime.title}: ${data.episodes || 0} эп.\n`;
            }
        });
    }
    
    alert(statsText);
}

// ===== Авторизация =====
function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('active');
        // Очищаем ошибки
        document.querySelectorAll('.auth-error').forEach(err => {
            err.classList.remove('active');
            err.textContent = '';
        });
        // Очищаем успешные сообщения
        document.querySelectorAll('.auth-success').forEach(success => {
            success.style.display = 'none';
            success.textContent = '';
        });
        // Сбрасываем форму регистрации
        const verifySection = document.getElementById('register-verify-section');
        const formFields = document.getElementById('register-form-fields');
        if (verifySection) verifySection.style.display = 'none';
        if (formFields) formFields.style.display = 'block';
        pendingRegistration = { email: null, username: null, password: null };
        document.getElementById('register-form')?.reset();
        // Сбрасываем чекбокс
        const policyCheck = document.getElementById('register-policy-check');
        if (policyCheck) policyCheck.checked = false;
        updateRegisterButton();
        
        // Сбрасываем форму сброса пароля
        const loginFields = document.getElementById('login-form-fields');
        const codeSection = document.getElementById('reset-password-code-section');
        const passwordFormSection = document.getElementById('reset-password-form-section');
        if (codeSection) codeSection.style.display = 'none';
        if (passwordFormSection) passwordFormSection.style.display = 'none';
        if (loginFields) loginFields.style.display = 'block';
        document.getElementById('login-form')?.reset();
        document.getElementById('reset-code').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        pendingPasswordReset.email = null;
        updateResetButton();
    }
}

function switchAuthTab(tab) {
    // Переключаем вкладки
    document.querySelectorAll('.auth-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Переключаем формы
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    if (tab === 'login') {
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('register-form').classList.add('active');
    }
    
    // Очищаем ошибки
    document.querySelectorAll('.auth-error').forEach(err => {
        err.classList.remove('active');
        err.textContent = '';
    });
    // Очищаем успешные сообщения
    document.querySelectorAll('.auth-success').forEach(success => {
        success.style.display = 'none';
        success.textContent = '';
    });
    
    // Сбрасываем форму сброса пароля при переключении вкладок
    const loginFields = document.getElementById('login-form-fields');
    const codeSection = document.getElementById('reset-password-code-section');
    const passwordFormSection = document.getElementById('reset-password-form-section');
    if (codeSection) codeSection.style.display = 'none';
    if (passwordFormSection) passwordFormSection.style.display = 'none';
    if (loginFields) loginFields.style.display = 'block';
    pendingPasswordReset.email = null;
    updateResetButton();
}

async function handleGoogleLogin() {
    if (!supabaseClient) {
        console.error('Supabase клиент не инициализирован');
        const errorEl = document.getElementById('login-error') || document.getElementById('register-error');
        if (errorEl) {
            errorEl.textContent = 'Ошибка: Supabase клиент не инициализирован';
            errorEl.classList.add('active');
        }
        return;
    }
    
    try {
        // Получаем текущий URL для перенаправления
        const redirectUrl = window.location.origin + window.location.pathname;
        
        console.log('Начинаем вход через Google, redirectTo:', redirectUrl);
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
        
        if (error) {
            console.error('Ошибка входа через Google:', error);
            const errorEl = document.getElementById('login-error') || document.getElementById('register-error');
            if (errorEl) {
                errorEl.textContent = error.message || 'Ошибка входа через Google. Проверьте настройки провайдера в Supabase.';
                errorEl.classList.add('active');
            }
            return;
        }
        
        // Если успешно, data.url будет содержать URL для перенаправления
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            console.error('Не получен URL для перенаправления');
            const errorEl = document.getElementById('login-error') || document.getElementById('register-error');
            if (errorEl) {
                errorEl.textContent = 'Ошибка: не удалось получить URL для авторизации';
                errorEl.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Исключение при входе через Google:', error);
        const errorEl = document.getElementById('login-error') || document.getElementById('register-error');
        if (errorEl) {
            errorEl.textContent = error.message || 'Ошибка входа через Google. Убедитесь, что Google провайдер включен в Supabase.';
            errorEl.classList.add('active');
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.add('active');
        return;
    }
    
    // Показываем загрузку
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Вход...';
    }
    
    try {
        if (supabaseClient) {
            // Используем Supabase
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                // Обработка ошибки "email not confirmed"
                if (error.message && error.message.includes('not confirmed') || error.message.includes('Email not confirmed')) {
                    errorEl.textContent = 'Email не подтвержден. Проверьте почту и подтвердите регистрацию, или запросите новую ссылку.';
                    errorEl.classList.add('active');
                    
                    // Добавляем кнопку для повторной отправки
                    const resendBtn = document.createElement('button');
                    resendBtn.type = 'button';
                    resendBtn.className = 'resend-confirmation-btn';
                    resendBtn.textContent = 'Отправить письмо повторно';
                    resendBtn.onclick = () => resendConfirmationEmail(email);
                    errorEl.parentElement.insertBefore(resendBtn, errorEl.nextSibling);
                    
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Войти';
                    }
                    return;
                }
                throw error;
            }
            
            if (data.user) {
                // Проверяем подтвержден ли email
                if (!data.user.email_confirmed_at) {
                    errorEl.textContent = 'Email не подтвержден. Проверьте почту.';
                    errorEl.classList.add('active');
                    const resendBtn = document.createElement('button');
                    resendBtn.type = 'button';
                    resendBtn.className = 'resend-confirmation-btn';
                    resendBtn.textContent = 'Отправить письмо повторно';
                    resendBtn.onclick = () => resendConfirmationEmail(email);
                    errorEl.parentElement.insertBefore(resendBtn, errorEl.nextSibling);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Войти';
                    }
                    return;
                }
                
                CONFIG.currentUser = {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.user_metadata?.username || data.user.email.split('@')[0]
                };
                saveData();
                updateAuthUI();
                closeAuthModal();
                document.getElementById('login-form').reset();
            }
        } else {
            // Fallback на локальное хранилище
            const user = CONFIG.users.find(u => (u.email === email || u.username === email) && u.password === password);
            
            if (user) {
                CONFIG.currentUser = { username: user.username, email: user.email };
                saveData();
                updateAuthUI();
                closeAuthModal();
                document.getElementById('login-form').reset();
            } else {
                throw new Error('Неверное имя пользователя или пароль');
            }
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Ошибка входа';
        errorEl.classList.add('active');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    }
}

let pendingRegistration = {
    email: null,
    username: null,
    password: null
};

async function handleRegister(event) {
    event.preventDefault();
    
    const verifySection = document.getElementById('register-verify-section');
    const formFields = document.getElementById('register-form-fields');
    
    // Если уже показываем секцию кода, не продолжаем
    if (verifySection && verifySection.style.display !== 'none') {
        return;
    }
    
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Скрываем предыдущие сообщения
    errorEl.classList.remove('active');
    successEl.style.display = 'none';
    
    // Валидация
    if (!username || !email || !password || !confirm) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.add('active');
        return;
    }
    
    if (password !== confirm) {
        errorEl.textContent = 'Пароли не совпадают';
        errorEl.classList.add('active');
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен быть не менее 6 символов';
        errorEl.classList.add('active');
        return;
    }
    
    // Показываем загрузку
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка кода...';
    }
    
    try {
        if (supabaseClient) {
            // Сохраняем данные регистрации
            pendingRegistration = { email, username, password };
            
            // Отправляем OTP код на email
            // Используем signInWithOtp для отправки кода
            const { data, error } = await supabaseClient.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true,
                    data: {
                        username: username,
                        display_name: username
                    },
                    emailRedirectTo: 'https://reminkoanime.github.io/34fg43fg4f3g43fg4f3g43fg/'
                }
            });
            
            if (error) {
                // Если ошибка связана с тем что пользователь уже существует, пробуем просто отправить код
                if (error.message && (error.message.includes('already') || error.message.includes('registered'))) {
                    // Пользователь уже существует, просто отправляем код для входа
                    const { data: otpData, error: otpError } = await supabaseClient.auth.signInWithOtp({
                        email: email,
                        options: {
                            shouldCreateUser: false
                        }
                    });
                    if (otpError) throw otpError;
                } else {
                    throw error;
                }
            }
            
            // Показываем секцию ввода кода
            if (formFields) formFields.style.display = 'none';
            if (verifySection) {
                verifySection.style.display = 'block';
                document.getElementById('verify-email-display').textContent = email;
                document.getElementById('register-code').focus();
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Зарегистрироваться';
            }
            
        } else {
            // Fallback на локальное хранилище (без кода)
            if (CONFIG.users.some(u => u.username === username)) {
                throw new Error('Пользователь с таким именем уже существует');
            }
            
            if (CONFIG.users.some(u => u.email === email)) {
                throw new Error('Пользователь с таким email уже существует');
            }
            
            const newUser = {
                id: Date.now(),
                username,
                email,
                password,
                createdAt: new Date().toISOString()
            };
            
            CONFIG.users.push(newUser);
            CONFIG.currentUser = { username, email };
            saveData();
            updateAuthUI();
            closeAuthModal();
            document.getElementById('register-form').reset();
            switchAuthTab('login');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Ошибка отправки кода';
        errorEl.classList.add('active');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
        }
    }
}

function updateRegisterButton() {
    const code = document.getElementById('register-code')?.value.trim().replace(/[^0-9]/g, '') || '';
    const policyCheck = document.getElementById('register-policy-check');
    const verifyBtn = document.getElementById('verify-register-btn');
    
    if (verifyBtn && policyCheck) {
        const codeValid = code.length >= 6 && code.length <= 8;
        const policyAccepted = policyCheck.checked;
        verifyBtn.disabled = !(codeValid && policyAccepted);
    }
}

async function verifyRegistrationCode() {
    const policyCheck = document.getElementById('register-policy-check');
    if (!policyCheck || !policyCheck.checked) {
        const errorEl = document.getElementById('register-error');
        errorEl.textContent = 'Необходимо принять политику конфиденциальности';
        errorEl.classList.add('active');
        return;
    }
    
    let code = document.getElementById('register-code').value.trim().replace(/[^0-9]/g, '');
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    const verifySection = document.getElementById('register-verify-section');
    const formFields = document.getElementById('register-form-fields');
    
    // Скрываем предыдущие сообщения
    errorEl.classList.remove('active');
    successEl.style.display = 'none';
    
    // Принимаем код от 6 до 8 символов (не обрезаем!)
    if (!code || code.length < 6 || code.length > 8) {
        errorEl.textContent = 'Введите код от 6 до 8 цифр';
        errorEl.classList.add('active');
        updateRegisterButton();
        return;
    }
    
    const verifyBtn = document.getElementById('verify-register-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Регистрация...';
    }
    
    if (!pendingRegistration.email || !supabaseClient) {
        errorEl.textContent = 'Ошибка: данные регистрации не найдены';
        errorEl.classList.add('active');
        return;
    }
    
    try {
        // Проверяем OTP код (используем полный код как есть - 6 или 8 цифр)
        // Supabase может генерировать токены разной длины
        const codeToVerify = code;
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: pendingRegistration.email,
            token: codeToVerify,
            type: 'email'
        });
        
        if (error) throw error;
        
        if (data.user && data.session) {
            // Регистрируем пользователя с паролем (так как OTP создал только пользователя)
            // Устанавливаем пароль и метаданные
            // Важно: делаем это сразу после verifyOtp, пока сессия активна
            const { error: updateError } = await supabaseClient.auth.updateUser({
                password: pendingRegistration.password,
                data: {
                    username: pendingRegistration.username,
                    display_name: pendingRegistration.username
                }
            });
            
            if (updateError) {
                console.error('Ошибка обновления пароля при регистрации:', updateError);
                // Если не удалось установить пароль, пробуем еще раз
                try {
                    const { error: retryError } = await supabaseClient.auth.updateUser({
                        password: pendingRegistration.password
                    });
                    if (retryError) {
                        console.error('Повторная попытка установки пароля не удалась:', retryError);
                        // Показываем предупреждение, но продолжаем регистрацию
                        console.warn('Пароль может быть не установлен. Пользователю нужно будет использовать сброс пароля.');
                    }
                } catch (err) {
                    console.error('Критическая ошибка установки пароля:', err);
                }
            }
            
            // Проверяем что пароль установлен - пробуем войти
            try {
                const { error: testSignInError } = await supabaseClient.auth.signInWithPassword({
                    email: pendingRegistration.email,
                    password: pendingRegistration.password
                });
                if (testSignInError) {
                    console.warn('Пароль не установлен правильно. Ошибка тестового входа:', testSignInError);
                } else {
                    console.log('Пароль успешно установлен и протестирован');
                }
            } catch (testErr) {
                console.error('Ошибка тестирования пароля:', testErr);
            }
            
            // Сохраняем пароль в метаданных (для локального использования, если нужно)
            // Но основная авторизация идет через Supabase
            
            // Авторизуем пользователя
            CONFIG.currentUser = {
                id: data.user.id,
                email: data.user.email,
                username: pendingRegistration.username
            };
            saveData();
            updateAuthUI();
            
            // Показываем успех
            successEl.textContent = 'Регистрация успешна! Добро пожаловать!';
            successEl.style.display = 'block';
            
            // Закрываем модальное окно через 2 секунды
            setTimeout(() => {
                closeAuthModal();
                document.getElementById('register-form').reset();
                if (formFields) formFields.style.display = 'block';
                if (verifySection) verifySection.style.display = 'none';
                pendingRegistration = { email: null, username: null, password: null };
                const policyCheck = document.getElementById('register-policy-check');
                if (policyCheck) policyCheck.checked = false;
                updateRegisterButton();
            }, 2000);
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Неверный код. Проверьте и попробуйте снова.';
        errorEl.classList.add('active');
        // Очищаем поле кода при ошибке
        document.getElementById('register-code').value = '';
        updateRegisterButton();
    } finally {
        const verifyBtn = document.getElementById('verify-register-btn');
        if (verifyBtn) {
            verifyBtn.textContent = 'Зарегистрироваться';
            updateRegisterButton();
        }
    }
}

async function resendRegistrationCode() {
    const errorEl = document.getElementById('register-error');
    const resendBtn = document.querySelector('.resend-code-btn');
    
    if (!pendingRegistration.email || !supabaseClient) {
        errorEl.textContent = 'Ошибка: данные регистрации не найдены';
        errorEl.classList.add('active');
        return;
    }
    
    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Отправка...';
    }
    
    try {
        const { error } = await supabaseClient.auth.signInWithOtp({
            email: pendingRegistration.email,
            options: {
                shouldCreateUser: true,
                data: {
                    username: pendingRegistration.username,
                    display_name: pendingRegistration.username
                },
                emailRedirectTo: 'https://reminkoanime.github.io/34fg43fg4f3g43fg4f3g43fg/'
            }
        });
        
        if (error) throw error;
        
        errorEl.textContent = 'Код отправлен повторно! Проверьте почту.';
        errorEl.classList.remove('auth-error');
        errorEl.classList.add('auth-success');
        errorEl.classList.add('active');
        
        setTimeout(() => {
            errorEl.classList.remove('active');
        }, 3000);
        
    } catch (error) {
        errorEl.textContent = error.message || 'Ошибка отправки кода';
        errorEl.classList.add('active');
    } finally {
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Отправить код повторно';
        }
    }
}

async function logout() {
    if (supabaseClient && CONFIG.currentUser) {
        try {
            await supabaseClient.auth.signOut();
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }
    
    CONFIG.currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
}

let pendingPasswordReset = {
    email: null
};

async function handleForgotPassword() {
    const email = document.getElementById('login-username').value.trim();
    const errorEl = document.getElementById('login-error');
    const successEl = document.getElementById('password-reset-success');
    const loginFields = document.getElementById('login-form-fields');
    const codeSection = document.getElementById('reset-password-code-section');
    
    if (!email) {
        errorEl.textContent = 'Введите email для восстановления пароля';
        errorEl.classList.add('active');
        return;
    }
    
    if (!supabaseClient) {
        errorEl.textContent = 'Ошибка: Supabase не подключен';
        errorEl.classList.add('active');
        return;
    }
    
    try {
        errorEl.classList.remove('active');
        successEl.style.display = 'none';
        
        // Отправляем OTP код для сброса пароля
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false // Не создавать пользователя, только отправить код
            }
        });
        
        if (error) {
            // Если пользователь не найден
            if (error.message && (error.message.includes('not found') || error.message.includes('not registered'))) {
                errorEl.textContent = 'Пользователь с таким email не найден';
                errorEl.classList.add('active');
                return;
            }
            throw error;
        }
        
        // Сохраняем email для дальнейшего использования
        pendingPasswordReset.email = email;
        
        // Показываем секцию ввода кода
        if (loginFields) loginFields.style.display = 'none';
        if (codeSection) {
            codeSection.style.display = 'block';
            document.getElementById('reset-email-display').textContent = email;
            document.getElementById('reset-code').focus();
        }
        
    } catch (error) {
        errorEl.textContent = error.message || 'Ошибка отправки кода восстановления';
        errorEl.classList.add('active');
    }
}

function updateResetButton() {
    const code = document.getElementById('reset-code')?.value.trim().replace(/[^0-9]/g, '') || '';
    const verifyBtn = document.getElementById('verify-reset-btn');
    
    if (verifyBtn) {
        const codeValid = code.length >= 6 && code.length <= 8;
        verifyBtn.disabled = !codeValid;
    }
}

async function verifyResetCode() {
    const code = document.getElementById('reset-code').value.trim().replace(/[^0-9]/g, '');
    const errorEl = document.getElementById('login-error');
    const codeSection = document.getElementById('reset-password-code-section');
    const passwordFormSection = document.getElementById('reset-password-form-section');
    const verifyBtn = document.getElementById('verify-reset-btn');
    
    errorEl.classList.remove('active');
    
    if (!code || code.length < 6 || code.length > 8) {
        errorEl.textContent = 'Введите код от 6 до 8 цифр';
        errorEl.classList.add('active');
        return;
    }
    
    if (!pendingPasswordReset.email || !supabaseClient) {
        errorEl.textContent = 'Ошибка: данные не найдены';
        errorEl.classList.add('active');
        return;
    }
    
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Проверка...';
    }
    
    try {
        // Проверяем OTP код
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: pendingPasswordReset.email,
            token: code,
            type: 'email'
        });
        
        if (error) throw error;
        
        if (data.user) {
            // Код подтвержден, показываем форму нового пароля
            if (codeSection) codeSection.style.display = 'none';
            if (passwordFormSection) {
                passwordFormSection.style.display = 'block';
                document.getElementById('new-password').focus();
            }
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Неверный код. Проверьте и попробуйте снова.';
        errorEl.classList.add('active');
        document.getElementById('reset-code').value = '';
        updateResetButton();
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Подтвердить код';
            updateResetButton();
        }
    }
}

async function setNewPassword() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const errorEl = document.getElementById('login-error');
    const successEl = document.getElementById('password-reset-success');
    const passwordFormSection = document.getElementById('reset-password-form-section');
    const loginFields = document.getElementById('login-form-fields');
    const saveBtn = document.getElementById('save-new-password-btn');
    
    errorEl.classList.remove('active');
    successEl.style.display = 'none';
    
    if (!newPassword || !confirmPassword) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.add('active');
        return;
    }
    
    if (newPassword.length < 6) {
        errorEl.textContent = 'Пароль должен быть не менее 6 символов';
        errorEl.classList.add('active');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Пароли не совпадают';
        errorEl.classList.add('active');
        return;
    }
    
    if (!supabaseClient) {
        errorEl.textContent = 'Ошибка: Supabase не подключен';
        errorEl.classList.add('active');
        return;
    }
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';
    }
    
    try {
        // Обновляем пароль
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        // Пароль успешно изменен
        successEl.textContent = 'Пароль успешно изменен! Теперь вы можете войти.';
        successEl.style.display = 'block';
        
        // Очищаем формы
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        document.getElementById('reset-code').value = '';
        pendingPasswordReset.email = null;
        
        // Возвращаемся к форме входа через 2 секунды
        setTimeout(() => {
            if (passwordFormSection) passwordFormSection.style.display = 'none';
            if (loginFields) loginFields.style.display = 'block';
            successEl.style.display = 'none';
            document.getElementById('login-password').value = '';
            updateResetButton();
        }, 2000);
        
    } catch (error) {
        errorEl.textContent = error.message || 'Ошибка изменения пароля';
        errorEl.classList.add('active');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить новый пароль';
        }
    }
}

async function resendResetCode() {
    const errorEl = document.getElementById('login-error');
    const resendBtn = document.querySelector('#reset-password-code-section .resend-code-btn');
    
    if (!pendingPasswordReset.email || !supabaseClient) {
        errorEl.textContent = 'Ошибка: данные не найдены';
        errorEl.classList.add('active');
        return;
    }
    
    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Отправка...';
    }
    
    try {
        const { error } = await supabaseClient.auth.signInWithOtp({
            email: pendingPasswordReset.email,
            options: {
                shouldCreateUser: false
            }
        });
        
        if (error) throw error;
        
        errorEl.classList.remove('active');
        alert('Код отправлен повторно на ' + pendingPasswordReset.email);
    } catch (error) {
        errorEl.textContent = error.message || 'Ошибка отправки кода';
        errorEl.classList.add('active');
    } finally {
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Отправить код повторно';
        }
    }
}

function cancelPasswordReset() {
    const loginFields = document.getElementById('login-form-fields');
    const codeSection = document.getElementById('reset-password-code-section');
    const passwordFormSection = document.getElementById('reset-password-form-section');
    const errorEl = document.getElementById('login-error');
    const successEl = document.getElementById('password-reset-success');
    
    // Очищаем все поля
    document.getElementById('reset-code').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    pendingPasswordReset.email = null;
    
    // Скрываем секции
    if (codeSection) codeSection.style.display = 'none';
    if (passwordFormSection) passwordFormSection.style.display = 'none';
    if (loginFields) loginFields.style.display = 'block';
    
    // Очищаем сообщения
    errorEl.classList.remove('active');
    successEl.style.display = 'none';
    updateResetButton();
}

async function resendConfirmationEmail(email) {
    if (!supabaseClient || !email) return;
    
    try {
        // Отправляем OTP код
        const { error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false
            }
        });
        
        if (error) throw error;
        alert('Код подтверждения отправлен на ' + email);
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        alert('Ошибка отправки письма: ' + error.message);
    }
}

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const authBtnText = document.getElementById('auth-btn-text');
    
    if (!authBtn || !authBtnText) return;
    
    if (CONFIG.currentUser) {
        authBtnText.textContent = CONFIG.currentUser.username || 'Профиль';
        authBtn.onclick = () => {
            openProfileModal();
        };
    } else {
        authBtnText.textContent = 'Войти';
        authBtn.onclick = openAuthModal;
    }
}

function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        loadProfileData();
        modal.classList.add('active');
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function loadProfileData() {
    if (!CONFIG.currentUser) return;
    
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const statsEl = document.getElementById('profile-stats');
    
    if (usernameEl) usernameEl.textContent = CONFIG.currentUser.username || 'Пользователь';
    if (emailEl) emailEl.textContent = CONFIG.currentUser.email || '';
    
    if (statsEl) {
        const favoritesCount = CONFIG.favorites.length;
        const watchedEpisodes = CONFIG.watchStats.totalWatched || 0;
        const watchedTime = CONFIG.watchStats.totalTime || 0;
        const hours = Math.floor(watchedTime / 3600);
        const minutes = Math.floor((watchedTime % 3600) / 60);
        
        statsEl.innerHTML = `
            <div class="profile-stat">
                <span class="stat-value">${favoritesCount}</span>
                <span class="stat-label">В избранном</span>
            </div>
            <div class="profile-stat">
                <span class="stat-value">${watchedEpisodes}</span>
                <span class="stat-label">Эпизодов просмотрено</span>
            </div>
            <div class="profile-stat">
                <span class="stat-value">${hours}ч ${minutes}м</span>
                <span class="stat-label">Время просмотра</span>
            </div>
        `;
    }
}

async function initializeAuth() {
    // Проверяем сессию в Supabase
    if (supabaseClient) {
        try {
            // Проверяем наличие hash параметров от OAuth callback
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const hasOAuthParams = hashParams.has('access_token') || hashParams.has('type') || hashParams.has('code');
            
            if (hasOAuthParams) {
                console.log('Обнаружены OAuth параметры, обрабатываем...');
                // Даем Supabase время обработать hash параметры
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Проверяем сессию
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) {
                console.error('Ошибка проверки сессии:', error);
            }
            
            if (session && session.user) {
                console.log('Сессия найдена, пользователь:', session.user.email);
                CONFIG.currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    username: session.user.user_metadata?.full_name || 
                             session.user.user_metadata?.name || 
                             session.user.user_metadata?.username || 
                             session.user.email.split('@')[0]
                };
                saveData();
                updateAuthUI();
                
                // Очищаем URL от параметров OAuth после успешного входа
                if (hasOAuthParams) {
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                }
            } else if (hasOAuthParams) {
                console.log('OAuth параметры есть, но сессия не найдена. Пытаемся повторить...');
                // Пытаемся еще раз через небольшую задержку
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabaseClient.auth.getSession();
                    if (retrySession && retrySession.user) {
                        CONFIG.currentUser = {
                            id: retrySession.user.id,
                            email: retrySession.user.email,
                            username: retrySession.user.user_metadata?.full_name || 
                                     retrySession.user.user_metadata?.name || 
                                     retrySession.user.user_metadata?.username || 
                                     retrySession.user.email.split('@')[0]
                        };
                        saveData();
                        updateAuthUI();
                        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Ошибка проверки сессии:', error);
        }
        
        // Слушаем изменения авторизации
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change:', event, session?.user?.email);
            if (event === 'SIGNED_IN' && session) {
                CONFIG.currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    username: session.user.user_metadata?.full_name || 
                             session.user.user_metadata?.name || 
                             session.user.user_metadata?.username || 
                             session.user.email.split('@')[0]
                };
                saveData();
                updateAuthUI();
                closeAuthModal(); // Закрываем модальное окно если оно открыто
                
                // Очищаем URL от OAuth параметров
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                if (hashParams.has('access_token') || hashParams.has('type') || hashParams.has('code')) {
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                }
            } else if (event === 'SIGNED_OUT') {
                CONFIG.currentUser = null;
                localStorage.removeItem('currentUser');
                updateAuthUI();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                // Обновляем пользователя при обновлении токена
                CONFIG.currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    username: session.user.user_metadata?.full_name || 
                             session.user.user_metadata?.name || 
                             session.user.user_metadata?.username || 
                             session.user.email.split('@')[0]
                };
                saveData();
                updateAuthUI();
            }
        });
    }
    
    updateAuthUI();
    
    // Закрытие модального окна по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const authModal = document.getElementById('auth-modal');
            if (authModal && authModal.classList.contains('active')) {
                closeAuthModal();
            }
        }
    });
}

// ===== Горячие клавиши =====
document.addEventListener('keydown', (e) => {
    // Закрытие модального окна по Escape
    if (e.key === 'Escape') {
        const modal = document.getElementById('player-modal');
        if (modal && modal.classList.contains('active')) {
            closePlayer();
        }
    }
    
    // Управление видеоплеером
    if (currentVideo && document.getElementById('player-modal')?.classList.contains('active')) {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                skipBackward();
                break;
            case 'ArrowRight':
                e.preventDefault();
                skipForward();
                break;
            case 'm':
            case 'M':
                toggleMute();
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
        }
    }
});
