import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, MoreHorizontal } from 'lucide-react';

const tracks = [
  { 
    id: 1, 
    title: "Starboy", 
    artist: "The Weeknd, Daft Punk", 
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
    cover: "https://upload.wikimedia.org/wikipedia/en/3/39/The_Weeknd_-_Starboy.png",
    color: "from-red-900" // Цвет фона под обложку
  },
  { 
    id: 2, 
    title: "Midnight City", 
    artist: "M83", 
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", 
    cover: "https://upload.wikimedia.org/wikipedia/en/7/73/M83_-_Midnight_City.jpg",
    color: "from-purple-900"
  },
  { 
    id: 3, 
    title: "Get Lucky", 
    artist: "Daft Punk", 
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", 
    cover: "https://upload.wikimedia.org/wikipedia/en/a/a7/Random_Access_Memories.jpg",
    color: "from-yellow-700"
  },
];

function App() {
  useEffect(() => {
    if (window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Разворачивает приложение на весь экран
      tg.setHeaderColor('#121212'); // Цвет верхней полоски телефона
    }
  }, []);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio(tracks[0].src));
  const [view, setView] = useState('player'); // 'player' или 'list'

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    
    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => nextTrack();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const changeTrack = (index) => {
    audioRef.current.pause();
    setCurrentTrackIndex(index);
    audioRef.current = new Audio(tracks[index].src);
    setProgress(0);
    if (isPlaying) audioRef.current.play();
  };

  const nextTrack = () => {
    changeTrack((currentTrackIndex + 1) % tracks.length);
  };

  const prevTrack = () => {
    changeTrack((currentTrackIndex - 1 + tracks.length) % tracks.length);
  };

  return (
    // ГЛАВНЫЙ КОНТЕЙНЕР С ГРАДИЕНТОМ
    <div className={`flex flex-col h-screen bg-gradient-to-b ${currentTrack.color} to-dark transition-colors duration-1000 ease-in-out`}>
      
      {/* Верхняя панель */}
      <div className="flex justify-between items-center p-6 pt-8">
        <button className="text-white/70 hover:text-white"><MoreHorizontal /></button>
        <span className="text-xs font-bold tracking-widest uppercase text-white/70">Playing Now</span>
        <button className="text-white/70 hover:text-white"><Heart /></button>
      </div>

      {/* Обложка */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xs aspect-square shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden transform transition hover:scale-105 duration-500">
          <img 
            src={currentTrack.cover} 
            alt="Album Art" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Информация о треке и контролы */}
      <div className="px-6 pb-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{currentTrack.title}</h1>
            <p className="text-text-gray text-lg">{currentTrack.artist}</p>
          </div>
          <Heart className="text-spotify w-6 h-6 mb-2 cursor-pointer" fill="#1DB954" />
        </div>

        {/* Прогресс бар */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-2 cursor-pointer group">
          <div 
            className="bg-white h-full rounded-full relative group-hover:bg-spotify transition-colors" 
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-text-gray mb-8 font-medium">
          <span>0:00</span>
          <span>3:45</span>
        </div>

        {/* Кнопки управления */}
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button className="text-white/70 hover:text-white transition"><SkipBack size={28} onClick={prevTrack}/></button>
          
          <button 
            onClick={togglePlay} 
            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
          >
            {isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1"/>}
          </button>
          
          <button className="text-white/70 hover:text-white transition"><SkipForward size={28} onClick={nextTrack}/></button>
        </div>
      </div>
		{view === 'list' && (
	  <div className="absolute inset-0 bg-dark z-50 p-6 overflow-y-auto anim-slide-up">
		<div className="flex justify-between items-center mb-8">
		  <h2 className="text-2xl font-bold">Your Library</h2>
		  <button onClick={() => setView('player')} className="text-spotify font-bold">Close</button>
		</div>
		{tracks.map((track, i) => (
		  <div 
			key={track.id} 
			onClick={() => { changeTrack(i); setView('player'); }}
			className="flex items-center mb-4 p-2 hover:bg-white/5 rounded-lg transition"
		  >
			<img src={track.cover} className="w-12 h-12 rounded mr-4" />
			<div className="flex-1">
			  <p className={`font-semibold ${i === currentTrackIndex ? 'text-spotify' : 'text-white'}`}>{track.title}</p>
			  <p className="text-xs text-text-gray">{track.artist}</p>
			</div>
		  </div>
		))}
	  </div>
	)}
    </div>
  );
}

export default App;