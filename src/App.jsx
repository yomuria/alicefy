import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Heart, List, Search, Volume2 } from 'lucide-react';

function App() {
  const [tracks, setTracks] = useState([
    { id: 1, title: "Starboy", artist: "The Weeknd", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "https://upload.wikimedia.org/wikipedia/en/3/39/The_Weeknd_-_Starboy.png", color: "#7f1d1d" },
    { id: 2, title: "Midnight City", artist: "M83", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", cover: "https://upload.wikimedia.org/wikipedia/en/7/73/M83_-_Midnight_City.jpg", color: "#4c1d95" }
  ]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [view, setView] = useState('player'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(new Audio(tracks[0].src));
  const currentTrack = tracks[currentTrackIndex];

  // 1. Обновление прогресса и громкости
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextTrack);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', nextTrack);
    };
  }, [currentTrackIndex, volume]);

  const handleSearch = async () => {
      if (!searchQuery) return;
      try {
        const response = await fetch(`https://music-app-backend-sharutia.waw0.amvera.tech/api/search?q=${searchQuery}`);
        const data = await response.json();
        setSearchResults(data);
        setView('search');
      } catch (err) {
        console.error("Ошибка поиска. Проверь сервер на 3001", err);
      }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 1 || val === 0) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  };

  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setProgress(e.target.value);
  };

  const selectTrack = (track) => {
    const streamUrl = `https://music-app-backend-sharutia.waw0.amvera.tech/api/play?url=${encodeURIComponent(track.url)}`;
    const newTrack = { ...track, src: streamUrl, color: "#1a1a1a" };
    
    setTracks(prev => [newTrack, ...prev]);
    setCurrentTrackIndex(0);
    
    audioRef.current.pause();
    audioRef.current.src = streamUrl;
    audioRef.current.play();
    setIsPlaying(true);
    setView('player');
  };

  const togglePlay = () => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    changeTrack(nextIndex);
  };

  const prevTrack = () => {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    changeTrack(prevIndex);
  };

  const changeTrack = (index) => {
    setCurrentTrackIndex(index);
    audioRef.current.pause();
    audioRef.current.src = tracks[index].src;
    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white overflow-hidden relative">
      
      {/* Search Bar */}
      <div className="relative z-20 flex gap-2 px-6 pt-6 mb-2">
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search on YouTube..."
            className="w-full glass border-none rounded-full pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 ring-spotify/50 transition-all"
          />
          <Search size={16} className="absolute left-3 top-2.5 opacity-50" />
        </div>
        <button onClick={handleSearch} className="bg-spotify p-2 rounded-full active:scale-90 transition shadow-lg shadow-spotify/20">
          <Play size={18} fill="black" />
        </button>
      </div>

      <div className="liquid-bg transition-colors duration-1000" style={{ '--tw-gradient-from': currentTrack?.color || '#1DB954' }} />

      <div className="relative z-10 h-full flex flex-col p-6 pt-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('list')} className="glass p-2 rounded-full"><List size={20} /></motion.button>
          <p className="text-[10px] tracking-[3px] uppercase opacity-50 font-bold">Now Playing</p>
          <motion.button whileTap={{ scale: 0.9 }} className="glass p-2 rounded-full text-spotify"><Heart size={20} fill="currentColor" /></motion.button>
        </div>

        {/* Album Art */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <motion.div 
            key={currentTrackIndex}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isPlaying ? 1 : 0.9, opacity: 1 }}
            className="w-full max-w-[260px] aspect-square rounded-[40px] overflow-hidden shadow-2xl"
          >
            <img src={currentTrack?.cover} className="w-full h-full object-cover" alt="cover" />
          </motion.div>
        </div>

        {/* Controls Card */}
        <motion.div className="glass rounded-[32px] p-6 mb-16 border-white/10">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold mb-1 truncate px-4">{currentTrack?.title}</h1>
            <p className="text-white/40 text-sm">{currentTrack?.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="px-2 mb-6">
            <input type="range" value={progress} onChange={handleSeek} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" />
            <div className="flex justify-between text-[10px] mt-2 opacity-30 font-bold">
              <span>0:00</span>
              <span>{currentTrack?.duration || 'Live'}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center px-4 mb-6">
            <motion.button whileTap={{ scale: 0.8 }} onClick={prevTrack} className="opacity-70"><SkipBack size={28} fill="white" /></motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay} 
              className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl shadow-white/10"
            >
              {isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.8 }} onClick={nextTrack} className="opacity-70"><SkipForward size={28} fill="white" /></motion.button>
          </div>

          {/* Volume iOS Style */}
          <div className="flex items-center gap-3 px-2 opacity-60 hover:opacity-100 transition">
            <Volume2 size={14} />
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white" />
          </div>
        </motion.div>
      </div>

      {/* Overlays (Search & Library) */}
      <AnimatePresence>
        {view === 'list' && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30 }} className="absolute inset-0 z-50 glass backdrop-blur-3xl p-6 pt-12 overflow-y-auto">
            <div className="flex justify-center mb-4"><div className="w-12 h-1.5 bg-white/20 rounded-full" onClick={() => setView('player')} /></div>
            <h2 className="text-3xl font-bold mb-8">Library</h2>
            {tracks.map((t, i) => (
              <div key={i} onClick={() => { changeTrack(i); setView('player'); }} className={`flex items-center p-4 rounded-2xl mb-3 ${i === currentTrackIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <img src={t.cover} className="w-12 h-12 rounded-xl mr-4" alt="t" />
                <div className="flex-1"><p className="font-bold text-sm truncate">{t.title}</p><p className="text-xs opacity-50">{t.artist}</p></div>
              </div>
            ))}
          </motion.div>
        )}

        {view === 'search' && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30 }} className="absolute inset-0 z-50 glass backdrop-blur-3xl p-6 pt-12 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Results</h2>
              <button onClick={() => setView('player')} className="text-spotify font-bold px-4 py-2 glass rounded-full text-sm">Cancel</button>
            </div>
            {searchResults.map((track) => (
              <div key={track.id} onClick={() => selectTrack(track)} className="flex items-center p-4 rounded-2xl mb-3 glass border-white/5 hover:bg-white/10 active:scale-95 transition">
                <img src={track.cover} className="w-14 h-14 rounded-xl mr-4 object-cover" alt="r" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold truncate text-sm">{track.title}</p>
                  <p className="text-xs opacity-50 truncate">{track.artist} • {track.duration}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;