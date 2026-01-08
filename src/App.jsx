import React, { useState, useRef, useEffect, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Search, Heart, Music
} from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';
import { createClient } from '@supabase/supabase-js';

import Glass from './components/Glass';
import Aurora from './components/Aurora';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const fac = new FastAverageColor();
const tg = window.Telegram?.WebApp;

const MusicService = {
  baseUrl: 'https://alicefy.duckdns.org/api',
  async search(query) {
    try {
      const r = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      return r.json();
    } catch (e) { return []; }
  },
  getStreamUrl(url, id) {
    return `${this.baseUrl}/play?url=${encodeURIComponent(url)}&id=${id}`;
  }
};

function App() {
  const [view, setView] = useState('player'); 
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const userId = 'guest_user'; 
  
  const [colors, setColors] = useState({ primary: '#4c1d95', secondary: '#2e1065' });

  const [playerState, dispatch] = useReducer((state, action) => ({ ...state, ...action }), {
    isPlaying: false, isLoading: false, duration: 0, currentTime: 0, volume: 1
  });

  const audioRef = useRef(new Audio());
  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
    
    // Загрузка избранного
    (async function load() {
      try {
        const { data } = await supabase.from('liked_songs').select('*').limit(200);
        if (data) setFavorites(data.map(d => ({ 
            id: d.track_id, title: d.title, artist: d.artist, 
            cover: d.cover_url, src: d.track_url 
        })));
      } catch (e) {
        const raw = localStorage.getItem('favorites');
        if (raw) setFavorites(JSON.parse(raw));
      }
    })();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const handlers = {
      timeupdate: () => dispatch({ currentTime: audio.currentTime }),
      loadedmetadata: () => dispatch({ duration: audio.duration }),
      ended: () => handleNext(),
      playing: () => dispatch({ isPlaying: true }),
      pause: () => dispatch({ isPlaying: false }),
    };
    Object.entries(handlers).forEach(([e, f]) => audio.addEventListener(e, f));
    return () => Object.entries(handlers).forEach(([e, f]) => audio.removeEventListener(e, f));
  }, [tracks, currentIndex]);

  useEffect(() => {
    if (currentTrack?.src) {
      audioRef.current.src = currentTrack.src;
      audioRef.current.play().catch(() => {});
      
      fac.getColorAsync(currentTrack.cover)
        .then(c => {
          setColors({ primary: c.hex, secondary: c.isDark ? '#000' : '#444' });
          if (tg) tg.setHeaderColor(c.hex);
        })
        .catch(() => {});
    }
  }, [currentTrack]);

  const handleSelectTrack = (track) => {
    const normalized = {
      id: track.videoId || Date.now().toString(),
      title: track.title,
      artist: track.author?.name || "Unknown Artist",
      src: MusicService.getStreamUrl(track.url, track.videoId),
      cover: track.image || track.thumbnail,
    };
    setTracks(prev => [normalized, ...prev.filter(t => t.id !== normalized.id)]);
    setCurrentIndex(0);
    setView('player');
    setSearchQuery('');
    tg?.HapticFeedback.impactOccurred('medium');
  };

  const handleNext = () => {
    if (tracks.length > 0) {
      setCurrentIndex(prev => (prev + 1) % tracks.length);
    }
  };

  const togglePlay = () => {
    playerState.isPlaying ? audioRef.current.pause() : audioRef.current.play();
    tg?.HapticFeedback.impactOccurred('light');
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white font-sans overflow-hidden">
      <Aurora colors={colors} />
      
      {/* Главный контейнер с ограничением ширины */}
      <div className="relative z-10 h-full flex flex-col max-w-md mx-auto px-6 pt-12 pb-8">
        
        {/* Хедер */}
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setView('search')} className="ios-glass w-12 h-12 rounded-full flex items-center justify-center">
            <Search size={22} />
          </button>
          
          <div className="flex flex-col items-center">
             <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
             <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">
               {view === 'favorites' ? 'Library' : 'Now Playing'}
             </span>
          </div>

          <button 
            onClick={() => setView(view === 'favorites' ? 'player' : 'favorites')}
            className={`ios-glass w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'favorites' ? 'bg-white text-black' : ''}`}
          >
            <Heart size={22} fill={view === 'favorites' ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Основной контент */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            
            {view === 'player' && (
              <motion.div 
                key="player"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col"
              >
                {currentTrack ? (
                  <>
                    <div className="flex-1 flex items-center justify-center py-4">
                      <img 
                        src={currentTrack.cover} 
                        className="w-full aspect-square object-cover rounded-[40px] shadow-2xl shadow-black/50" 
                      />
                    </div>

                    <Glass className="ios-glass p-6 mt-4">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold truncate">{currentTrack.title}</h2>
                        <p className="text-white/50 truncate">{currentTrack.artist}</p>
                      </div>

                      <div className="relative h-1 w-full bg-white/10 rounded-full mb-8">
                        <motion.div 
                          className="absolute h-full bg-white rounded-full" 
                          style={{ width: `${(playerState.currentTime / (playerState.duration || 1)) * 100}%` }}
                        />
                        <input 
                          type="range" min="0" max={playerState.duration || 0} step="0.1"
                          value={playerState.currentTime}
                          onChange={e => audioRef.current.currentTime = e.target.value}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <SkipBack size={32} fill="white" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} />
                        <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black">
                          {playerState.isPlaying ? <Pause size={30} fill="black"/> : <Play size={30} fill="black" className="ml-1"/>}
                        </button>
                        <SkipForward size={32} fill="white" onClick={handleNext} />
                      </div>
                      
                      <div className="mt-6 flex items-center gap-3">
                        <Music size={14} className="opacity-30" />
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={playerState.volume}
                          onChange={e => dispatch({ volume: parseFloat(e.target.value) })}
                          className="volume-slider" 
                        />
                      </div>
                    </Glass>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    <Music size={64} className="mb-4" />
                    <p>Найдите трек, чтобы начать</p>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'favorites' && (
              <motion.div 
                key="favs"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="h-full overflow-y-auto no-scrollbar"
              >
                <h2 className="text-2xl font-bold mb-6">Избранное</h2>
                <div className="space-y-3">
                  {favorites.map(f => (
                    <div key={f.id} onClick={() => { setTracks([f]); setCurrentIndex(0); setView('player'); }} 
                         className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl active:scale-95 transition-transform">
                      <img src={f.cover} className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{f.title}</p>
                        <p className="text-xs text-white/40 truncate">{f.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Поиск */}
      <AnimatePresence>
        {view === 'search' && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col"
          >
            <div className="p-6 pt-12 flex flex-col h-full max-w-md mx-auto w-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative flex-1">
                  <input 
                    autoFocus
                    placeholder="Название трека..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const res = await MusicService.search(searchQuery);
                        setSearchResults(res);
                      }
                    }}
                    className="w-full bg-white/10 h-12 rounded-xl pl-10 pr-4 outline-none border border-white/10"
                  />
                  <Search className="absolute left-3 top-3.5 opacity-30" size={18} />
                </div>
                <button onClick={() => setView('player')} className="text-sm font-medium">Отмена</button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                {searchResults.map(t => (
                  <div key={t.videoId} onClick={() => handleSelectTrack(t)} className="flex items-center gap-4 active:opacity-60">
                    <img src={t.thumbnail} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{t.title}</p>
                      <p className="text-sm text-white/40 truncate">{t.author?.name}</p>
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