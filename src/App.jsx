import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Search, Loader2, Volume2, Heart, ListMusic 
} from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';
import { createClient } from '@supabase/supabase-js';

// --- ИНИЦИАЛИЗАЦИЯ SUPABASE ---
// --- ИНИЦИАЛИЗАЦИЯ SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);
const fac = new FastAverageColor();

function App() {
  // Состояния для Telegram пользователя
  const [user, setUser] = useState(null);

  // --- СОСТОЯНИЯ (Оригинальные) ---
  const [tracks, setTracks] = useState([
    { id: '1', title: "Starboy", artist: "The Weeknd", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "https://upload.wikimedia.org/wikipedia/en/3/39/The_Weeknd_-_Starboy.png" },
    { id: '2', title: "Midnight City", artist: "M83", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", cover: "https://upload.wikimedia.org/wikipedia/en/7/73/M83_-_Midnight_City.jpg" }
  ]);
  const [favorites, setFavorites] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('player'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [bgColor, setBgColor] = useState('#1DB954');

  const audioRef = useRef(new Audio());
  const currentTrack = tracks[currentTrackIndex];

  // 1. Эффект инициализации Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Разворачиваем на весь экран
      
      const webAppData = tg.initDataUnsafe?.user;
      if (webAppData) {
        setUser(webAppData);
      }
    }
  }, []);

  // Формируем ID для запросов к базе
  const userId = user?.id?.toString() || 'guest_user';

  // 2. Загрузка лайков из Supabase при изменении пользователя
  useEffect(() => {
    const fetchLikes = async () => {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('*')
        .eq('user_id', userId);
      
      if (!error && data) {
        setFavorites(data.map(f => ({
          ...f,
          id: f.track_id,
          cover: f.cover_url,
          src: f.track_url
        })));
      }
    };
    fetchLikes();
  }, [userId]);

  // --- ЛОГИКА (Оптимизированная) ---

  const toggleLike = async (e, track) => {
    e.stopPropagation();
    const trackId = track.videoId || track.id;
    const isLiked = favorites.some(f => f.id === trackId);

    if (isLiked) {
      setFavorites(prev => prev.filter(f => f.id !== trackId));
      await supabase.from('liked_songs').delete().eq('track_id', trackId).eq('user_id', userId);
    } else {
      const newLike = {
        user_id: userId,
        track_id: trackId,
        title: track.title,
        artist: track.author?.name || track.artist,
        cover_url: track.image || track.thumbnail || track.cover,
        track_url: track.src || `https://alicefy.duckdns.org/api/play?url=${encodeURIComponent(track.url)}`
      };
      // Оптимистичное обновление UI
      setFavorites(prev => [{...newLike, id: newLike.track_id, cover: newLike.cover_url, src: newLike.track_url}, ...prev]);
      await supabase.from('liked_songs').insert([newLike]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://alicefy.duckdns.org/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
      setView('search');
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const selectTrack = (track) => {
    const newTrack = {
      id: track.videoId || Date.now().toString(),
      title: track.title,
      artist: track.author?.name || "YouTube Artist",
      src: `https://alicefy.duckdns.org/api/play?url=${encodeURIComponent(track.url)}`,
      cover: track.image || track.thumbnail || track.cover,
    };
    setTracks(prev => [newTrack, ...prev]);
    setCurrentTrackIndex(0);
    setView('player');
  };

  // Эффекты управления аудио и цветом (без изменений)
  useEffect(() => {
    const audio = audioRef.current;
    if (currentTrack?.src) {
      setIsLoading(true);
      audio.pause();
      audio.src = currentTrack.src;
      audio.load();
      audio.volume = volume;
      audio.play()
        .then(() => { setIsPlaying(true); setIsLoading(false); })
        .catch(() => { setIsLoading(false); setIsPlaying(false); });
    }
  }, [currentTrack?.src]);

  useEffect(() => {
    if (currentTrack?.cover) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = currentTrack.cover;
      img.onload = () => {
        fac.getColorAsync(img)
          .then(color => setBgColor(color.hex))
          .catch(() => setBgColor('#1DB954'));
      };
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    const up = () => audio.duration && setProgress((audio.currentTime / audio.duration) * 100);
    audio.addEventListener('timeupdate', up);
    audio.addEventListener('ended', () => nextTrack());
    return () => audio.removeEventListener('timeupdate', up);
  }, [tracks]);

  const nextTrack = () => setCurrentTrackIndex(p => (p + 1) % tracks.length);
  const prevTrack = () => setCurrentTrackIndex(p => (p - 1 + tracks.length) % tracks.length);

  return (
    <div className="h-screen w-full bg-[#050505] text-white overflow-hidden relative font-sans">
      <div className="liquid-bg" style={{ '--tw-gradient-from': bgColor, opacity: 0.35, pointerEvents: 'none', transition: 'all 2s ease-in-out' }} />

      {/* Поиск */}
      <div className="relative z-20 p-6 flex gap-2">
        <div className="flex-1 relative">
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск музыки..."
            className="w-full bg-white/10 backdrop-blur-xl rounded-full py-3.5 pl-11 pr-4 outline-none border border-white/5 focus:ring-2 ring-white/20 transition-all"
          />
          <Search size={18} className="absolute left-4 top-4 opacity-40" />
        </div>
      </div>

      <div className="relative z-10 h-[calc(100%-160px)] flex flex-col p-6 overflow-y-auto custom-scrollbar">
        {view === 'player' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center py-6">
              <motion.img 
                key={currentTrack?.cover}
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: isPlaying ? 1 : 0.96, opacity: 1 }}
                src={currentTrack?.cover} className="w-full max-w-[280px] aspect-square rounded-[48px] object-cover shadow-2xl border border-white/10"
              />
            </div>

            <div className="bg-white/5 backdrop-blur-2xl rounded-[40px] p-8 border border-white/10 shadow-xl">
              <div className="text-center relative px-10 mb-8">
                <h1 className="text-2xl font-bold truncate">{currentTrack?.title}</h1>
                <p className="opacity-40 font-medium">{currentTrack?.artist}</p>
                <button onClick={(e) => toggleLike(e, currentTrack)} className="absolute right-0 top-1 active:scale-150 transition-transform">
                  <Heart 
                    size={26} 
                    fill={favorites.some(f => f.id === (currentTrack?.videoId || currentTrack?.id)) ? "white" : "none"} 
                    className={favorites.some(f => f.id === (currentTrack?.videoId || currentTrack?.id)) ? "text-white" : "opacity-20"} 
                  />
                </button>
              </div>

              <input type="range" value={progress} step="0.1" onChange={e => {
                const time = (e.target.value / 100) * audioRef.current.duration;
                audioRef.current.currentTime = time;
                setProgress(e.target.value);
              }} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white mb-10" />

              <div className="flex justify-between items-center px-4 mb-8">
                <button onClick={prevTrack} className="active:opacity-50 transition"><SkipBack size={34} fill="white" /></button>
                <button onClick={() => { isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); }} 
                  className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition">
                  {isLoading ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause size={36} fill="black" /> : <Play size={36} fill="black" className="ml-1" />}
                </button>
                <button onClick={nextTrack} className="active:opacity-50 transition"><SkipForward size={34} fill="white" /></button>
              </div>

              <div className="flex items-center gap-4 opacity-30 hover:opacity-100 transition">
                <Volume2 size={18} />
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => { setVolume(e.target.value); audioRef.current.volume = e.target.value; }} className="flex-1 h-1 bg-white/20 rounded-full appearance-none accent-white" />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'favorites' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="mb-8">
               <h2 className="text-3xl font-bold text-white">Моя музыка</h2>
               {user && <p className="text-white/40 text-sm mt-1">Привет, {user.first_name}! Вот твои лайки:</p>}
            </div>
            <div className="grid gap-3">
              {favorites.length === 0 && <p className="opacity-20 text-center mt-20">Здесь пока пусто...</p>}
              {favorites.map(f => (
                <div key={f.id} onClick={() => { setTracks(p => [f, ...p]); setCurrentTrackIndex(0); setView('player'); }} className="flex items-center p-3 bg-white/5 rounded-3xl cursor-pointer hover:bg-white/10 active:scale-95 transition-all">
                  <img src={f.cover} className="w-14 h-14 rounded-2xl mr-4 object-cover shadow-md" />
                  <div className="flex-1 truncate text-sm">
                    <p className="font-bold truncate">{f.title}</p>
                    <p className="opacity-40 truncate">{f.artist}</p>
                  </div>
                  <button onClick={(e) => toggleLike(e, f)} className="p-2">
                    <Heart size={20} fill="white" className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Результаты поиска */}
      <AnimatePresence>
        {view === 'search' && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute inset-0 z-50 bg-[#050505] p-6 pt-12 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">Результаты</h2>
              <button onClick={() => setView('player')} className="bg-white/10 px-6 py-2 rounded-full text-sm font-medium transition active:scale-95">Закрыть</button>
            </div>
            <div className="grid gap-4">
              {searchResults.map(t => (
                <div key={t.videoId} onClick={() => selectTrack(t)} className="flex items-center p-4 bg-white/5 rounded-[32px] hover:bg-white/10 active:scale-95 transition-all">
                  <img src={t.image || t.thumbnail} className="w-16 h-16 rounded-2xl mr-4 object-cover shadow-lg" />
                  <div className="flex-1 truncate">
                    <p className="font-bold text-sm truncate">{t.title}</p>
                    <p className="text-xs opacity-40 truncate">{t.author?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Навигация */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-2xl border-t border-white/5 flex justify-around py-6">
        <button onClick={() => setView('player')} className={`transition-all ${view === 'player' ? "text-white scale-110" : "text-white/20"}`}>
          <Play size={26} fill={view === 'player' ? "white" : "none"} />
        </button>
        <button onClick={() => setView('favorites')} className={`transition-all ${view === 'favorites' ? "text-white scale-110" : "text-white/20"}`}>
          <Heart size={26} fill={view === 'favorites' ? "white" : "none"} />
        </button>
      </div>
    </div>
  );
}

export default App;