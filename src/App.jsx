import React, { useState, useRef, useEffect, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Search, Heart, Music, ArrowLeft
} from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';
import { createClient } from '@supabase/supabase-js';

import Glass from './components/Glass';
import Aurora from './components/Aurora';

// Инициализация Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const fac = new FastAverageColor();
const tg = window.Telegram?.WebApp;

const formatTime = (time) => {
  // Добавляем проверку на Infinity и отрицательные числа
  if (!time || isNaN(time) || time === Infinity || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const getUserId = () => {
  // 1. Пытаемся взять данные из Telegram
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser?.id) {
    return `tg_${tgUser.id}`;
  }
  
  // 2. Если мы на обычном сайте, проверяем localStorage
  let userId = localStorage.getItem('alicefy_user_id');
  
  // 3. Если ID еще нет, создаем новый случайный ID
  if (!userId) {
    userId = 'web_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('alicefy_user_id', userId);
  }
  
  return userId;
};

const USER_ID = getUserId();

const MusicService = {
  // Автоматически определяем базу: если мы на домене, то используем его origin
  baseUrl: window.location.origin + '/api',
  
  async search(query) {
    try {
      const r = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      return await r.json();
    } catch (e) { return []; }
  },
  
  getStreamUrl(url) {
    // Теперь ссылка всегда будет полной: https://alicefy.duckdns.org/api/play?url=...
    return `${this.baseUrl}/play?url=${encodeURIComponent(url)}`;
  },



  async like(track, userId) {
    try {
      const params = new URLSearchParams({
        id: track.id,
        url: track.originUrl,
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        userId: userId // ПЕРЕДАЕМ НАШ ID
      });
      await fetch(`${this.baseUrl}/cache-like?${params.toString()}`);
    } catch(e) { console.error(e); }
  }
};

function App() {
  const [view, setView] = useState('player'); 
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [colors, setColors] = useState({ primary: '#4c1d95', secondary: '#2e1065' });

  // 1. Сначала объявляем переменные, которые зависят от состояния
  const currentTrack = tracks[currentIndex];
  const isLiked = currentTrack && favorites.some(f => f.id === currentTrack.id);

  // 2. И только ПОТОМ идут useEffect
  const [playerState, dispatch] = useReducer((state, action) => ({ ...state, ...action }), {
    isPlaying: false, isLoading: false, duration: 0, currentTime: 0, volume: 1
  });

  // Аудио элемент
  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }
  // --- 1. Управление с экрана блокировки и шторки уведомлений ---
  useEffect(() => {
    if (currentTrack && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: [{ src: currentTrack.cover, sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    }
  }, [currentTrack]);

  // --- 2. Логика аудио (исправлена громкость) ---
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = playerState.volume; // Применяем громкость

    const onTimeUpdate = () => dispatch({ currentTime: audio.currentTime });
    const onLoadedMetadata = () => {
      const audio = audioRef.current;
      // Если браузер вернул Infinity, используем данные из нашего объекта трека
      const finalDuration = (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) 
        ? audio.duration 
        : (currentTrack?.duration || 0);

      dispatch({ duration: finalDuration });
    };
    const onEnded = () => handleNext();
    const onPlay = () => dispatch({ isPlaying: true, isLoading: false });
    const onPause = () => dispatch({ isPlaying: false });
    const onWaiting = () => dispatch({ isLoading: true });
    
    // Добавляем обработчик ошибок, чтобы не висел "вечный спиннер"
    const onError = (e) => {
        console.error("Audio error", e);
        dispatch({ isPlaying: false, isLoading: false });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
    };
  }, [tracks]); // Зависимость для переключений

  useEffect(() => {
  if (currentTrack && audioRef.current) {
    const audio = audioRef.current;
    
    // Сбрасываем старый поток полностью
    audio.pause();
    audio.src = currentTrack.src;
    audio.load(); // Важно для переинициализации сетевого соединения
    
    if (playerState.isPlaying) {
      audio.play().catch(e => console.error("Playback failed", e));
    }
  }
}, [currentIndex]); // Срабатывает именно при переключении трека
  // Инициализация
  useEffect(() => {
    if (tg) { 
      tg.ready(); 
      tg.expand();
      if (tg.isVersionAtLeast('6.2')) tg.enableClosingConfirmation();
    }
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      // Добавляем .eq('user_id', USER_ID)
      const { data } = await supabase
        .from('liked_songs')
        .select('*')
        .eq('user_id', USER_ID) // <--- Фильтруем по нашему ID
        .order('created_at', { ascending: false });
        
      if (data) {
        const formatted = data.map(d => ({
          id: d.track_id,
          title: d.title,
          artist: d.artist,
          cover: d.cover_url,
          originUrl: d.track_url,
          src: MusicService.getStreamUrl(d.track_url)
        }));
        setFavorites(formatted);
      }
    } catch (e) { console.error("Load favs error", e); }
  };

  

const handleSelectTrack = (track) => {
  const duration = track.seconds || 0; // Берем секунды из поиска
  
  const normalized = {
    id: track.videoId,
    title: track.title,
    artist: track.author?.name || "Unknown",
    cover: track.thumbnail,
    duration: duration,
    src: MusicService.getStreamUrl(track.url),
  };
  
  setTracks(prev => [normalized, ...prev]);
  setCurrentIndex(0);
  setView('player');

  // ПРИНУДИТЕЛЬНО ставим длительность сразу!
  dispatch({ 
    duration: duration, 
    currentTime: 0, 
    isPlaying: true,
    isLoading: true 
  });
};
  const handleNext = () => {
    if (tracks.length > 0) {
      setCurrentIndex(prev => (prev + 1) % tracks.length);
    }
  };

  const handlePrev = () => {
      setCurrentIndex(prev => prev > 0 ? prev - 1 : tracks.length - 1);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (playerState.isPlaying) audio.pause();
    else audio.play();
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  };

  const toggleLike = async () => {
      if (!currentTrack) return;
      
      if (isLiked) {
          // Удаляем запись, которая совпадает и по ID трека, и по ID юзера
          const { error } = await supabase
              .from('liked_songs')
              .delete()
              .eq('track_id', currentTrack.id)
              .eq('user_id', USER_ID); // <--- Важно!
              
          if (!error) setFavorites(prev => prev.filter(f => f.id !== currentTrack.id));
      } else {
          setFavorites(prev => [currentTrack, ...prev]);
          // Передаем USER_ID в сервис
          MusicService.like(currentTrack, USER_ID); 
      }
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white font-sans overflow-hidden">
      <Aurora colors={colors} />
      
      {/* Главный контейнер */}
      <div className="relative z-10 h-full flex flex-col max-w-md mx-auto px-6 pt-12 pb-8">
        
        {/* Хедер навигации */}
        <div className="flex justify-between items-center mb-6 min-h-[48px]">
          {view === 'player' ? (
              <button onClick={() => setView('search')} className="ios-glass w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform">
                <Search size={20} />
              </button>
          ) : (
              <button onClick={() => setView('player')} className="ios-glass w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform">
                  <ArrowLeft size={20} />
              </button>
          )}
          
          <div className="flex flex-col items-center">
             <div className="w-8 h-1 rounded-full bg-white/20 mb-1" />
             <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">
               {view === 'favorites' ? 'Library' : 'AliceFY'}
             </span>
          </div>

          <button 
            onClick={() => setView(view === 'favorites' ? 'player' : 'favorites')}
            className={`ios-glass w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${view === 'favorites' ? 'bg-white text-black' : ''}`}
          >
            {view === 'favorites' ? <Music size={20} /> : <Heart size={20} className={favorites.length > 0 ? "fill-white/20" : ""} />}
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            
            {/* ПЛЕЕР */}
            {view === 'player' && (
              <motion.div 
                key="player"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col"
              >
                {currentTrack ? (
                  <>
                    <div className="flex-1 flex items-center justify-center py-4">
                      <motion.img 
                        key={currentTrack.cover}
                        initial={{ opacity: 0.5, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        src={currentTrack.cover} 
                        className="w-full aspect-square object-cover rounded-[32px] shadow-2xl shadow-black/40 border border-white/5" 
                      />
                    </div>

                    <Glass className="ios-glass p-6 mt-4 backdrop-blur-2xl">
                      {/* Заголовок и Лайк */}
                      <div className="flex justify-between items-center mb-8">
                        <div className="overflow-hidden pr-4">
                          <h2 className="text-2xl font-bold truncate tracking-tight text-white">{currentTrack.title}</h2>
                          <p className="text-white/60 truncate text-base font-medium mt-1">{currentTrack.artist}</p>
                        </div>
                        <button onClick={toggleLike} className="active:scale-75 transition-transform p-2">
                          <Heart size={28} fill={isLiked ? "#ec4899" : "none"} stroke={isLiked ? "#ec4899" : "white"} strokeWidth={2} />
                        </button>
                      </div>

                      {/* --- ПРОГРЕСС БАР --- */}
                      <div className="mb-6 group">
                        <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          {/* Заполненная часть */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-300 ease-linear" 
                            style={{ 
                              width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%` 
                            }}
                          />
                          {/* Ползунок (input) */}
                          <input 
                            type="range" min="0" max={playerState.duration || 100} step="1"
                            value={playerState.currentTime}
                            onChange={e => {
                                const time = Number(e.target.value);
                                audioRef.current.currentTime = time;
                                dispatch({ currentTime: time });
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                          />
                        </div>
                        {/* Таймеры */}
                        <div className="flex justify-between text-xs font-medium text-white/40 mt-2 font-mono tracking-wider">
                            <span>{formatTime(playerState.currentTime)}</span>
                            <span>{formatTime(playerState.duration)}</span>
                        </div>
                      </div>

                      {/* --- КНОПКИ УПРАВЛЕНИЯ --- */}
                      <div className="flex justify-between items-center px-2 mb-8">
                        <button onClick={handlePrev} className="p-4 active:scale-90 transition-transform hover:text-white/80">
                            <SkipBack size={36} fill="white" className="text-white"/>
                        </button>
                        
                        <button 
                            onClick={togglePlay} 
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-[0_8px_24px_rgba(255,255,255,0.2)] active:scale-95 transition-all hover:scale-105"
                        >
                          {playerState.isLoading ? (
                              <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                          ) : (
                              playerState.isPlaying ? <Pause size={32} fill="black"/> : <Play size={32} fill="black" className="ml-1"/>
                          )}
                        </button>
                        
                        <button onClick={handleNext} className="p-4 active:scale-90 transition-transform hover:text-white/80">
                            <SkipForward size={36} fill="white" className="text-white"/>
                        </button>
                      </div>

                      {/* --- ГРОМКОСТЬ (Filling style) --- */}
                      <div className="flex items-center gap-4 px-2">
                          <div className="text-xs font-bold text-white/30 uppercase tracking-widest">Vol</div>
                          <div className="relative flex-1 h-12 bg-white/5 rounded-2xl overflow-hidden border border-white/5 group active:scale-[0.99] transition-transform">
                              {/* Фон уровня громкости (заливка) */}
                              <div 
                                className="absolute top-0 left-0 h-full bg-white/20 backdrop-blur-md transition-all duration-75 ease-out"
                                style={{ width: `${playerState.volume * 100}%` }}
                              />
                              
                              {/* Текст процентов по центру (как в iOS control center) */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-sm font-bold text-white/50">{Math.round(playerState.volume * 100)}%</span>
                              </div>

                              <input 
                                type="range" min="0" max="1" step="0.01"
                                value={playerState.volume}
                                onChange={e => {
                                    const vol = Number(e.target.value);
                                    audioRef.current.volume = vol;
                                    dispatch({ volume: vol });
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                          </div>
                      </div>
                    </Glass>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-center gap-4">
                    <Music size={64} />
                    <p>Найди свой вайб</p>
                    <button onClick={() => setView('search')} className="px-6 py-2 bg-white/10 rounded-full text-sm font-medium">Поиск</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* БИБЛИОТЕКА (ИЗБРАННОЕ) */}
            {view === 'favorites' && (
              <motion.div 
                key="favs"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="h-full overflow-y-auto no-scrollbar pb-20"
              >
                <h2 className="text-2xl font-bold mb-6 px-1">Моя коллекция</h2>
                {favorites.length === 0 ? (
                    <div className="text-center opacity-30 mt-20">Пока пусто :(</div>
                ) : (
                    <div className="space-y-3">
                    {favorites.map((f, i) => (
                        <div key={f.id} onClick={() => { setTracks(favorites); setCurrentIndex(i); setView('player'); }} 
                            className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl active:scale-95 transition-transform border border-white/5">
                        <img src={f.cover} className="w-12 h-12 rounded-xl object-cover bg-neutral-800" />
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold truncate text-sm">{f.title}</p>
                            <p className="text-xs text-white/40 truncate">{f.artist}</p>
                        </div>
                        {currentTrack?.id === f.id && playerState.isPlaying && (
                             <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                        )}
                        </div>
                    ))}
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ПОИСК (Overlay) */}
      <AnimatePresence>
        {view === 'search' && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
          >
            <div className="p-6 pt-12 flex flex-col h-full max-w-md mx-auto w-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 group">
                  <input 
                    autoFocus
                    placeholder="Название трека или исполнитель..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const res = await MusicService.search(searchQuery);
                        setSearchResults(res);
                      }
                    }}
                    className="w-full bg-white/10 h-12 rounded-2xl pl-11 pr-4 outline-none border border-white/5 focus:border-white/20 transition-colors placeholder:text-white/20"
                  />
                  <Search className="absolute left-4 top-3.5 opacity-30 group-focus-within:opacity-100 transition-opacity" size={18} />
                </div>
                <button onClick={() => setView('player')} className="text-sm font-medium opacity-70 hover:opacity-100">Отмена</button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
                {searchResults.map(t => (
                  <div key={t.videoId} onClick={() => handleSelectTrack(t)} className="flex items-center gap-4 p-2 rounded-xl active:bg-white/5 transition-colors">
                    <img src={t.thumbnail} className="w-14 h-14 rounded-xl object-cover bg-neutral-800" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{t.title}</p>
                      <p className="text-xs text-white/40 truncate mt-0.5">{t.author?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;