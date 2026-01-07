import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Heart, List, Search, Volume2, Loader2 } from 'lucide-react';

function App() {
  const [tracks, setTracks] = useState([
    { id: 1, title: "Starboy", artist: "The Weeknd", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "https://upload.wikimedia.org/wikipedia/en/3/39/The_Weeknd_-_Starboy.png", color: "#7f1d1d" },
    { id: 2, title: "Midnight City", artist: "M83", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", cover: "https://upload.wikimedia.org/wikipedia/en/7/73/M83_-_Midnight_City.jpg", color: "#4c1d95" }
  ]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Состояние загрузки
  const [view, setView] = useState('player'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(new Audio(tracks[0].src));
  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleCanPlay = () => setIsLoading(false); // Выключаем лоадер, когда песня готова

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextTrack);
    audio.addEventListener('canplay', handleCanPlay);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', nextTrack);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentTrackIndex, volume]);

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const url = `https://music-app-backend-sharutia.waw0.amvera.tech/api/search?q=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data);
      setView('search');
    } catch (err) {
      console.error("Ошибка поиска:", err);
    }
  };

  const selectTrack = (track) => {
    setIsLoading(true); // Включаем лоадер
    const streamUrl = `https://music-app-backend-sharutia.waw0.amvera.tech/api/play?url=${encodeURIComponent(track.url)}`;
    
    const newTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      src: streamUrl,
      cover: track.cover,
      color: "#1e1e1e" 
    };
    
    setTracks(prev => [newTrack, ...prev]);
    setCurrentTrackIndex(0);
    
    audioRef.current.pause();
    audioRef.current.src = streamUrl;
    audioRef.current.play().catch(() => setIsLoading(false));
    setIsPlaying(true);
    setView('player');
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Остальные функции (nextTrack, changeTrack и т.д.) остаются прежними
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
    <div className="h-screen w-full bg-[#050505] text-white overflow-hidden relative font-sans">
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
      </div>

      <div className="relative z-10 h-full flex flex-col p-6 pt-4">
        {/* Album Art Section */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <motion.div 
            animate={{ 
              scale: isPlaying ? 1 : 0.9,
              rotate: isPlaying ? 0 : -2
            }} 
            className="w-full max-w-[280px] aspect-square rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
          >
            <img src={currentTrack?.cover} className="w-full h-full object-cover" alt="cover" />
          </motion.div>
        </div>

        {/* Player Controls Card */}
        <div className="glass rounded-[40px] p-8 mb-20 border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2 truncate px-4">{currentTrack?.title}</h1>
            <p className="text-white/40 text-base">{currentTrack?.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="px-2 mb-8 relative">
            <input 
              type="range" 
              value={progress} 
              onChange={(e) => {
                const newTime = (e.target.value / 100) * audioRef.current.duration;
                audioRef.current.currentTime = newTime;
                setProgress(e.target.value);
              }} 
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" 
            />
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center px-4">
            <button onClick={prevTrack} className="hover:scale-110 active:scale-90 transition opacity-80"><SkipBack size={32} fill="white" /></button>
            
            <button 
              onClick={togglePlay} 
              disabled={isLoading}
              className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={36} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={36} fill="black" />
              ) : (
                <Play size={36} fill="black" className="ml-1" />
              )}
            </button>

            <button onClick={nextTrack} className="hover:scale-110 active:scale-90 transition opacity-80"><SkipForward size={32} fill="white" /></button>
          </div>
        </div>
      </div>

      {/* Search Results Modal */}
      <AnimatePresence>
        {view === 'search' && (
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }} 
            className="absolute inset-0 z-50 glass-dark backdrop-blur-3xl p-6 pt-12 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Results</h2>
              <button onClick={() => setView('player')} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-sm font-medium transition">Close</button>
            </div>
            <div className="grid gap-4">
              {searchResults.map((track) => (
                <div 
                  key={track.id} 
                  onClick={() => selectTrack(track)} 
                  className="flex items-center p-4 rounded-[24px] glass border-white/5 hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
                >
                  <img src={track.cover} className="w-16 h-16 rounded-2xl mr-4 object-cover shadow-lg" alt="r" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate text-sm">{track.title}</p>
                    <p className="text-xs opacity-50 truncate mt-1">
                      {track.artist} • {typeof track.duration === 'object' ? track.duration.timestamp : (track.duration || '0:00')}
                    </p>
                  </div>
                  <Play size={16} className="ml-2 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;