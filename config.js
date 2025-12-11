// ===== Конфигурация приложения =====

const CONFIG = {
    // Supabase настройки
    supabase: {
        url: 'https://kxyiabsrnrtsgemmsdim.supabase.co',
        anonKey: 'sb_publishable_60f3JAaTq0w2cHjUjJv_lA_d1i4t5HY'
    },
    // Путь к папке с фоновыми изображениями
    backgroundsPath: 'fons/',
    
    // Путь к локальным файлам аниме (на вашем ПК)
    // Пример: 'file:///C:/Users/Labubu/Videos/Anime/'
    localAnimePath: '',
    
    // Список фоновых изображений (будут загружены автоматически)
    backgrounds: [],
    
    // Интервал смены фона (в миллисекундах)
    backgroundInterval: 8000,
    
    // Хранилище аниме (в реальном приложении это может быть база данных)
    animeLibrary: [],
    
    // Текущий индекс фона
    currentBackgroundIndex: 0,
    
    // Текущее выбранное аниме
    currentAnime: null,
    
    // Настройки видеоплеера
    player: {
        defaultVolume: 1.0,
        playbackRate: 1.0,
        skipTime: 10, // секунды для перемотки
    },
    
    // Настройки темы
    theme: {
        default: 'dark', // 'dark' или 'light'
    },
    
    // Настройки сортировки и фильтров
    filters: {
        sortBy: 'title', // 'title', 'year', 'episodes'
        searchQuery: '',
        showFilters: false,
    },
    
    // История просмотра (сохраняется в localStorage)
    history: [],
    
    // Избранное (сохраняется в localStorage)
    favorites: [],
    
    // Рейтинги аниме (сохраняется в localStorage)
    ratings: {},
    
    // Статистика просмотра
    watchStats: {
        totalWatched: 0,
        totalTime: 0, // в секундах
        byAnime: {}
    },
    
    // Теги и жанры
    tags: ['Экшен', 'Драма', 'Комедия', 'Романтика', 'Фэнтези', 'Приключения', 'Триллер', 'Мистика'],
    
    // Пользователь
    currentUser: null,
    users: [], // Хранилище пользователей
};

// Инициализация: загрузка фоновых изображений
function initializeBackgrounds() {
    const backgroundFiles = [
        '1008514.jpg',
        '1008522.jpg',
        '1134698.jpg',
        '1261854.jpg',
        '1372121.jpeg',
        '1378507.png',
        '729589.png',
        '750799.png',
        '778481.jpg',
        '961768.png',
        'anime-re_zero_starting_life_in_another_world-black_hair-blue_hair-emilia_re_zero-rem_re_zero-snow-subaru_natsuki-sword-760980.jpeg',
        'anime-re_zero_starting_life_in_another_world-blue_hair-rem_re_zero-short_hair-subaru_natsuki-768244.jpeg',
        'grok_image_x6223tz.jpg',
        'wp5181467-subaru-natsuki-4k-wallpapers.png',
        'wp5181474-subaru-natsuki-4k-wallpapers.jpg',
        'wp5927962-subaru-natsuki-wallpapers.jpg',
        'wp6045177-subaru-natsuki-wallpapers.png',
        'wp6045205-subaru-natsuki-wallpapers.jpg',
        'wp6045251-subaru-natsuki-wallpapers.jpg',
        'wp6045344-subaru-natsuki-wallpapers.png',
        'wp6045392-subaru-natsuki-wallpapers.jpg',
    ];
    
    // Исключаем Fon из списка фонов (проверяем все возможные расширения)
    const excludeNames = ['fon']; // Имя файла без расширения (в нижнем регистре)
    const filteredFiles = backgroundFiles.filter(file => {
        const fileName = file.split('/').pop().split('.')[0].toLowerCase();
        return !excludeNames.includes(fileName);
    });
    
    // Перемешиваем массив случайным образом
    const shuffled = filteredFiles.sort(() => Math.random() - 0.5);
    
    CONFIG.backgrounds = shuffled.map(file => ({
        url: `${CONFIG.backgroundsPath}${file}`,
        loaded: false
    }));
    
    // Выбираем случайный начальный фон
    if (CONFIG.backgrounds.length > 0) {
        CONFIG.currentBackgroundIndex = Math.floor(Math.random() * CONFIG.backgrounds.length);
    } else {
        CONFIG.currentBackgroundIndex = 0;
    }
}

// Инициализация: загрузка сохраненных данных
function loadSavedData() {
    try {
        // Загрузка темы
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            CONFIG.theme.default = savedTheme;
        }
        
        // Загрузка истории
        const savedHistory = localStorage.getItem('watchHistory');
        if (savedHistory) {
            CONFIG.history = JSON.parse(savedHistory);
        }
        
        // Загрузка библиотеки аниме (если есть)
        const savedLibrary = localStorage.getItem('animeLibrary');
        if (savedLibrary) {
            CONFIG.animeLibrary = JSON.parse(savedLibrary);
        }
        
        // Загрузка избранного
        const savedFavorites = localStorage.getItem('favorites');
        if (savedFavorites) {
            CONFIG.favorites = JSON.parse(savedFavorites);
        }
        
        // Загрузка рейтингов
        const savedRatings = localStorage.getItem('ratings');
        if (savedRatings) {
            CONFIG.ratings = JSON.parse(savedRatings);
        }
        
        // Загрузка статистики
        const savedStats = localStorage.getItem('watchStats');
        if (savedStats) {
            CONFIG.watchStats = JSON.parse(savedStats);
        }
        
        // Загрузка пользователей
        const savedUsers = localStorage.getItem('users');
        if (savedUsers) {
            CONFIG.users = JSON.parse(savedUsers);
        }
        
        // Загрузка текущего пользователя
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            CONFIG.currentUser = JSON.parse(savedUser);
        }
    } catch (error) {
        console.error('Ошибка загрузки сохраненных данных:', error);
    }
}

// Сохранение данных
function saveData() {
    try {
        localStorage.setItem('theme', CONFIG.theme.default);
        localStorage.setItem('watchHistory', JSON.stringify(CONFIG.history));
        localStorage.setItem('animeLibrary', JSON.stringify(CONFIG.animeLibrary));
        localStorage.setItem('favorites', JSON.stringify(CONFIG.favorites));
        localStorage.setItem('ratings', JSON.stringify(CONFIG.ratings));
        localStorage.setItem('watchStats', JSON.stringify(CONFIG.watchStats));
        localStorage.setItem('users', JSON.stringify(CONFIG.users));
        if (CONFIG.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(CONFIG.currentUser));
        }
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Пример данных аниме (можно расширить или загружать из API)
// ВАЖНО: videoUrl должен указывать на локальные файлы на вашем ПК
// Примеры путей:
// - file:///C:/Users/Labubu/Videos/Anime/Attack_on_Titan/Episode_01.mp4
// - Или используйте локальный сервер: http://localhost:8080/anime/episode1.mp4
const EXAMPLE_ANIME = [
    {
        id: 1,
        title: 'Re:Zero - Starting Life in Another World',
        titleRu: 'Ре:Зеро - Жизнь с нуля в альтернативном мире',
        year: 2016,
        episodes: 25,
        poster: 'https://via.placeholder.com/300x450/6366f1/ffffff?text=Re%3AZero',
        description: 'Субару Нацуки попадает в альтернативный мир, где у него есть способность "Возвращение из смерти".',
        tags: ['Фэнтези', 'Драма', 'Романтика', 'Приключения'],
        rating: 8.5,
        episodesList: Array.from({ length: 25 }, (_, i) => ({
            number: i + 1,
            title: `Эпизод ${i + 1}`,
            // ВАЖНО: Замените на путь к локальному файлу на вашем ПК
            // Пример: `file:///C:/Users/Labubu/Videos/Anime/ReZero/Episode_${String(i + 1).padStart(2, '0')}.mp4`
            videoUrl: `#episode-${i + 1}` // Укажите путь к локальному файлу
        }))
    },
    {
        id: 2,
        title: 'Attack on Titan',
        titleRu: 'Атака титанов',
        year: 2013,
        episodes: 75,
        poster: 'https://via.placeholder.com/300x450/ef4444/ffffff?text=Attack+on+Titan',
        description: 'Человечество борется за выживание против гигантских титанов.',
        tags: ['Экшен', 'Драма', 'Триллер', 'Мистика'],
        rating: 9.0,
        episodesList: Array.from({ length: 75 }, (_, i) => ({
            number: i + 1,
            title: `Эпизод ${i + 1}`,
            // ВАЖНО: Замените на путь к локальному файлу
            // Пример: `file:///C:/Users/Labubu/Videos/Anime/Attack_on_Titan/Episode_${String(i + 1).padStart(2, '0')}.mp4`
            videoUrl: `#episode-${i + 1}` // Укажите путь к локальному файлу
        }))
    },
    {
        id: 3,
        title: 'Demon Slayer',
        titleRu: 'Истребитель демонов',
        year: 2019,
        episodes: 44,
        poster: 'https://via.placeholder.com/300x450/10b981/ffffff?text=Demon+Slayer',
        description: 'Тандзиро становится истребителем демонов, чтобы спасти свою сестру.',
        tags: ['Экшен', 'Фэнтези', 'Приключения', 'Драма'],
        rating: 8.7,
        episodesList: Array.from({ length: 44 }, (_, i) => ({
            number: i + 1,
            title: `Эпизод ${i + 1}`,
            // ВАЖНО: Замените на путь к локальному файлу
            // Пример: `file:///C:/Users/Labubu/Videos/Anime/Demon_Slayer/Episode_${String(i + 1).padStart(2, '0')}.mp4`
            videoUrl: `#episode-${i + 1}` // Укажите путь к локальному файлу
        }))
    },
];

// Инициализация при загрузке
initializeBackgrounds();
loadSavedData();

// Если библиотека пуста, добавляем примеры
if (CONFIG.animeLibrary.length === 0) {
    CONFIG.animeLibrary = EXAMPLE_ANIME;
    saveData();
}
