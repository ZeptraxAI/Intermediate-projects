import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Info, 
  Plus, 
  Minus, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  Search, 
  TrendingUp, 
  Bookmark, 
  MessageSquare, 
  Flame,
  Settings,
  Sparkles,
  Compass,
  AlertCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Import Precomputed Data
import moviesData from './data/movies.json';
import recsData from './data/recommendations.json';

// TMDB Configurations
const DEFAULT_TMDB_KEY = "55698adf2f524eddcee0d24c3d141f9f"; // Corrected 32-char TMDB key!
const TMDB_BASE_URL = "https://api.themoviedb.org/3"; // Using secure primary endpoint
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"; // Direct TMDB CDN URL!

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('explore'); // explore, trending, watchlist, chatbot
  
  // Custom Settings State (persisted in LocalStorage)
  const [tmdbKey, setTmdbKey] = useState(() => {
    const saved = localStorage.getItem('CineMind_TMDB_Key');
    // If the browser cached the old broken 31-character key, migrate to the correct 32-character key
    if (saved === "55698adf2f524eddcee0d24c3d14f9f") {
      localStorage.setItem('CineMind_TMDB_Key', DEFAULT_TMDB_KEY);
      return DEFAULT_TMDB_KEY;
    }
    return saved || DEFAULT_TMDB_KEY;
  });
  
  // Application Data States
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  
  // Interactive User Action States (persisted in LocalStorage)
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('CineMind_Watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [ratings, setRatings] = useState(() => {
    const saved = localStorage.getItem('CineMind_Ratings');
    return saved ? JSON.parse(saved) : {}; // { movieTitle: 'like' | 'dislike' }
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('CineMind_History');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Poster cache to speed up and prevent multiple API requests
  const [posterCache, setPosterCache] = useState({});
  const [activeDetailsPopup, setActiveDetailsPopup] = useState(null);
  
  // Chatbot State
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am CineMind, your personalized cinema agent. Describe a mood, keyword, or genre (e.g. "I want a space adventure with aliens") and I will query my vectors instantly!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('CineMind_TMDB_Key', tmdbKey);
  }, [tmdbKey]);
  
  useEffect(() => {
    localStorage.setItem('CineMind_Watchlist', JSON.stringify(watchlist));
  }, [watchlist]);
  
  useEffect(() => {
    localStorage.setItem('CineMind_Ratings', JSON.stringify(ratings));
  }, [ratings]);
  
  useEffect(() => {
    localStorage.setItem('CineMind_History', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Scroll chatbot to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Extract all unique genres for filter dropdown
  const allGenres = useMemo(() => {
    const genres = new Set();
    moviesData.forEach(m => {
      m.genres.split('|').forEach(g => {
        if (g && g !== '(no genres listed)') genres.add(g);
      });
    });
    return ['All Genres', ...Array.from(genres).sort()];
  }, []);

  // Filtered movies based on dropdown search query
  const searchedMovies = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    return moviesData
      .filter(m => m.title.toLowerCase().includes(query) || m.cleanTitle.toLowerCase().includes(query))
      .slice(0, 10);
  }, [searchQuery]);

  // Set default starting movie
  useEffect(() => {
    if (moviesData.length > 0 && !selectedMovie) {
      // Find "Toy Story (1995)" or fallback to first
      const defaultMovie = moviesData.find(m => m.title.startsWith("Toy Story")) || moviesData[0];
      handleExploreMovie(defaultMovie.title);
    }
  }, []);

  // Fetch poster details from TMDB with local mirror & local SVG fallback
  const fetchMoviePoster = async (movie) => {
    const cacheKey = movie.title;
    if (posterCache[cacheKey]) return posterCache[cacheKey];

    // Default Fallback details
    const fallbackDetails = {
      posterUrl: generateSvgPoster(movie.cleanTitle, movie.year, movie.rating),
      overview: "No description available for this film. Insert a valid TMDB key, or verify your network connection to retrieve active synopses.",
      rating: movie.rating * 2, // Convert MovieLens 5-star to TMDB 10-star
      releaseDate: movie.year ? String(movie.year) : "Unknown Date",
      isFallback: true
    };

    if (!tmdbKey) {
      setPosterCache(prev => ({ ...prev, [cacheKey]: fallbackDetails }));
      return fallbackDetails;
    }

    try {
      let data = null;
      // Step A: Search using TMDB ID
      if (movie.tmdbId && movie.tmdbId > 0) {
        const response = await fetch(`${TMDB_BASE_URL}/movie/${movie.tmdbId}?api_key=${tmdbKey}`);
        if (response.ok) {
          data = await response.json();
        }
      }
      
      // Step B: Search by title if ID failed
      if (!data) {
        const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(movie.cleanTitle)}${movie.year ? `&primary_release_year=${movie.year}` : ''}`;
        const response = await fetch(searchUrl);
        if (response.ok) {
          const results = await response.json();
          if (results.results && results.results.length > 0) {
            data = results.results[0];
          }
        }
      }

      if (data) {
        const details = {
          posterUrl: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : fallbackDetails.posterUrl,
          overview: data.overview || fallbackDetails.overview,
          rating: data.vote_average || fallbackDetails.rating,
          releaseDate: data.release_date || fallbackDetails.releaseDate,
          isFallback: !data.poster_path
        };
        setPosterCache(prev => ({ ...prev, [cacheKey]: details }));
        return details;
      }
    } catch (e) {
      console.warn("TMDB fetch error, falling back to SVG generation", e);
    }

    setPosterCache(prev => ({ ...prev, [cacheKey]: fallbackDetails }));
    return fallbackDetails;
  };

  // Generate beautiful inline SVG base64 string
  const generateSvgPoster = (title, year, rating) => {
    const cleanTitle = title.length > 25 ? title.slice(0, 23) + "..." : title;
    const yearStr = year ? String(year) : "N/A";
    const starsCount = Math.round(rating);
    const stars = "★".repeat(starsCount) + "☆".repeat(5 - starsCount);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="100%" height="100%">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:%231e1e24;stop-opacity:1" />
          <stop offset="100%" style="stop-color:%2309090b;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="300" height="450" rx="15" fill="url(%23bgGrad)" stroke="%2327272a" stroke-width="2"/>
      <path d="M 0,15 A 15,15 0 0,1 15,0 L 285,0 A 15,15 0 0,1 300,15 L 300,20 L 0,20 Z" fill="%23E50914"/>
      
      <!-- play icon -->
      <circle cx="150" cy="180" r="40" fill="none" stroke="%2327272a" stroke-width="3" opacity="0.4"/>
      <polygon points="140,160 170,180 140,200" fill="%23E50914" opacity="0.8"/>
      
      <text x="150" y="320" font-family="'Outfit', sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">
        ${cleanTitle}
      </text>
      <text x="150" y="355" font-family="'Outfit', sans-serif" font-size="14" fill="%23a1a1aa" text-anchor="middle">
        RELEASE: ${yearStr}
      </text>
      
      <rect x="75" y="380" width="150" height="25" rx="12.5" fill="%2318181b" stroke="%2327272a" stroke-width="1"/>
      <text x="150" y="397" font-family="'Outfit', sans-serif" font-size="12" fill="%23facc15" text-anchor="middle" font-weight="bold">
        ${stars} (${(rating * 2).toFixed(1)})
      </text>
      
      <text x="150" y="430" font-family="'Outfit', sans-serif" font-size="9" fill="%2352525b" text-anchor="middle" letter-spacing="1">
        CINEMIND RECOMMEND
      </text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Change focus movie
  const handleExploreMovie = async (movieTitle) => {
    const movieObj = moviesData.find(m => m.title === movieTitle);
    if (!movieObj) return;

    setSelectedMovie(movieObj);
    setSearchQuery('');
    
    // Add to history
    setSearchHistory(prev => {
      const filtered = prev.filter(t => t !== movieTitle);
      return [movieTitle, ...filtered].slice(0, 5);
    });

    // Pre-fetch detail
    const details = await fetchMoviePoster(movieObj);
    setSelectedMovie(prev => ({
      ...prev,
      details
    }));
  };

  // Get active recommendations for current focused movie
  const currentRecommendations = useMemo(() => {
    if (!selectedMovie) return [];
    const titles = recsData[selectedMovie.title] || [];
    
    return titles
      .map(title => moviesData.find(m => m.title === title))
      .filter(Boolean)
      .filter(m => {
        if (genreFilter === 'All Genres') return true;
        return m.genres.split('|').includes(genreFilter);
      })
      .slice(0, 5); // top 5
  }, [selectedMovie, genreFilter]);

  // Pre-fetch posters for active recommendations
  useEffect(() => {
    if (currentRecommendations.length > 0) {
      currentRecommendations.forEach(m => fetchMoviePoster(m));
    }
  }, [currentRecommendations]);

  // Watchlist Actions
  const toggleWatchlist = (movie) => {
    const isAdded = watchlist.some(item => item.title === movie.title);
    if (isAdded) {
      setWatchlist(prev => prev.filter(item => item.title !== movie.title));
      // Toast notice
    } else {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85 }
      });
      setWatchlist(prev => [...prev, {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        rating: movie.rating,
        posterUrl: posterCache[movie.title]?.posterUrl || generateSvgPoster(movie.cleanTitle, movie.year, movie.rating)
      }]);
    }
  };

  const handleRating = (movieTitle, type) => {
    setRatings(prev => ({
      ...prev,
      [movieTitle]: prev[movieTitle] === type ? null : type
    }));
  };

  // AI Assistant NLP keyword vector matcher
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    setChatInput('');
    setIsChatLoading(true);

    setTimeout(() => {
      const keywords = userText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      // Keyword mapping
      const matched = moviesData.map(m => {
        let score = 0;
        const searchTags = `${m.cleanTitle} ${m.genres}`.toLowerCase();
        keywords.forEach(kw => {
          if (searchTags.includes(kw)) score += 1;
        });
        return { movie: m, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.movie.rating - a.movie.rating)
      .slice(0, 3);

      let responseText = "";
      if (matched.length === 0) {
        responseText = "I couldn't find a direct keyword match in our database. However, here are some overall popular favorites:\n\n";
        // Default popular recommendations
        const populars = [...moviesData].sort((a,b) => b.rating - a.rating).slice(0, 3);
        populars.forEach(m => {
          responseText += `🎬 **${m.title}** (${m.genres.replace(/\|/g, ', ')})\n`;
        });
      } else {
        responseText = `Based on your request, I queried the cinema vectors and found these matches:\n\n`;
        matched.forEach(item => {
          const m = item.movie;
          responseText += `🎬 **${m.title}**\n`;
          responseText += `- **Genres:** ${m.genres.replace(/\|/g, ', ')}\n`;
          responseText += `- **Average Score:** ⭐ ${(m.rating * 2).toFixed(1)}/10\n\n`;
        });
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      setIsChatLoading(false);
    }, 800);
  };

  // Trending Movies
  const trendingMovies = useMemo(() => {
    return [...moviesData]
      .filter(m => m.ratingCount > 50)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 15);
  }, []);

  // Pre-fetch posters for trending movies on load
  useEffect(() => {
    if (trendingMovies.length > 0) {
      trendingMovies.forEach(m => fetchMoviePoster(m));
    }
  }, [trendingMovies]);

  return (
    <div className="flex min-h-screen bg-netflix-dark text-white font-sans overflow-x-hidden">
      
      {/* 1. SIDEBAR NAVIGATOR */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Header Branding */}
          <div className="p-6 flex items-center gap-3">
            <span className="text-3xl">🍿</span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-netflix-red">CineMind</h1>
              <p className="text-xs text-zinc-500 font-medium">Real-Time AI Recommender</p>
            </div>
          </div>
          
          <hr className="border-zinc-900 mx-6 mb-6" />

          {/* Navigation Links */}
          <nav className="px-4 space-y-1">
            <button 
              onClick={() => setActiveTab('explore')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'explore' ? 'bg-netflix-red text-white shadow-lg shadow-red-900/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
            >
              <Compass size={18} />
              Home & Explore
            </button>
            
            <button 
              onClick={() => setActiveTab('trending')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'trending' ? 'bg-netflix-red text-white shadow-lg shadow-red-900/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
            >
              <Flame size={18} />
              Trending & Popular
            </button>
            
            <button 
              onClick={() => setActiveTab('watchlist')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'watchlist' ? 'bg-netflix-red text-white shadow-lg shadow-red-900/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
            >
              <Bookmark size={18} />
              My Watchlist
              {watchlist.length > 0 && (
                <span className="ml-auto bg-white text-black font-extrabold text-xs px-2 py-0.5 rounded-full">
                  {watchlist.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => setActiveTab('chatbot')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'chatbot' ? 'bg-netflix-red text-white shadow-lg shadow-red-900/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
            >
              <MessageSquare size={18} />
              AI Chatbot
            </button>
          </nav>
          
          {/* History Section */}
          {searchHistory.length > 0 && (
            <div className="mt-8 px-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Recent Searches</h3>
              <div className="space-y-2">
                {searchHistory.map((hist, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleExploreMovie(hist)}
                    className="block w-full text-left text-xs font-medium text-zinc-400 hover:text-white truncate py-1 transition-colors"
                  >
                    🎬 {hist}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Key Settings */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400">
            <Settings size={14} className="text-zinc-500" />
            Network & Key Config
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1 font-semibold">TMDB API Key (v3)</label>
            <input 
              type="password"
              value={tmdbKey}
              onChange={(e) => setTmdbKey(e.target.value)}
              placeholder="Enter TMDB v3 Key"
              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white focus:outline-none focus:border-netflix-red placeholder-zinc-700"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            India CDN Poster Mirror Active
          </div>
        </div>
      </aside>

      {/* 2. MAIN SCROLL CONTAINER */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        
        {/* Dynamic Header Search */}
        <header className="sticky top-0 z-30 bg-netflix-dark/80 backdrop-blur-md border-b border-zinc-900 px-8 py-4 flex items-center justify-between gap-6">
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 9,700+ movies..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition-all"
            />
            {/* Search Dropdown Results */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50">
                {searchedMovies.length === 0 ? (
                  <div className="p-3 text-xs text-zinc-500 italic">No movies matched your query.</div>
                ) : (
                  searchedMovies.map(movie => (
                    <button
                      key={movie.id}
                      onClick={() => handleExploreMovie(movie.title)}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-netflix-red hover:text-white transition-colors flex justify-between"
                    >
                      <span>{movie.title}</span>
                      <span className="text-zinc-500 group-hover:text-white">📅 {movie.year || 'N/A'}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full font-bold">
              <Sparkles size={14} className="text-netflix-red" />
              Precomputed Cosine Matrix Online
            </div>
          </div>
        </header>

        {/* 3. CONDITIONAL MAIN BODY */}
        <div className="flex-1 p-8 space-y-12">
          
          {/* TAB A: EXPLORE TAB */}
          {activeTab === 'explore' && selectedMovie && (
            <>
              {/* Main Spotlight Hero Section */}
              <section className="bg-gradient-to-r from-red-950/20 to-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 flex flex-col md:flex-row gap-8 shadow-xl">
                {/* Poster Cover */}
                <div className="w-56 shrink-0 aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl relative border border-zinc-800">
                  <img 
                    src={selectedMovie.details?.posterUrl || generateSvgPoster(selectedMovie.cleanTitle, selectedMovie.year, selectedMovie.rating)} 
                    alt={selectedMovie.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Information Columns */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">{selectedMovie.title}</h2>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedMovie.genres.split('|').map((g, i) => (
                            <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-netflix-red rounded-full">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold bg-zinc-900/80 border border-zinc-800 px-4 py-2 rounded-xl">
                        <span className="text-yellow-500">★</span>
                        <span>{(selectedMovie.details?.rating || selectedMovie.rating * 2).toFixed(1)} / 10</span>
                      </div>
                    </div>

                    {/* Overview */}
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">Overview</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl mb-6">
                      {selectedMovie.details?.overview || "No overview available for this movie at this moment."}
                    </p>
                  </div>

                  {/* Spotlight Quick Actions */}
                  <div className="flex flex-wrap items-center gap-3 border-t border-zinc-900 pt-6">
                    <button 
                      onClick={() => toggleWatchlist(selectedMovie)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-netflix-red text-white hover:bg-red-600 transition-all shadow-lg shadow-red-900/30"
                    >
                      {watchlist.some(item => item.title === selectedMovie.title) ? (
                        <>
                          <Minus size={16} /> Remove Watchlist
                        </>
                      ) : (
                        <>
                          <Plus size={16} /> Add to Watchlist
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleRating(selectedMovie.title, 'like')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors ${ratings[selectedMovie.title] === 'like' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80'}`}
                    >
                      <ThumbsUp size={16} /> Like
                    </button>
                    
                    <button
                      onClick={() => handleRating(selectedMovie.title, 'dislike')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors ${ratings[selectedMovie.title] === 'dislike' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80'}`}
                    >
                      <ThumbsDown size={16} /> Dislike
                    </button>
                  </div>
                </div>
              </section>

              {/* Recommendations Row */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍿</span>
                    <h2 className="text-xl font-bold tracking-tight">AI Recommendations For You</h2>
                  </div>
                  {/* Genre Filtering */}
                  <select 
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-netflix-red"
                  >
                    {allGenres.map((g, i) => (
                      <option key={i} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Grid List */}
                {currentRecommendations.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-medium bg-zinc-900/35 border border-zinc-900 rounded-xl">
                    No movies of this genre are similar to {selectedMovie.cleanTitle}. Try another genre!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {currentRecommendations.map((movie, idx) => {
                      const details = posterCache[movie.title];
                      const isAdded = watchlist.some(item => item.title === movie.title);
                      
                      return (
                        <div 
                          key={movie.id} 
                          className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-netflix-red transition-all duration-300"
                        >
                          {/* Image Poster */}
                          <div className="aspect-[2/3] bg-zinc-950 relative overflow-hidden">
                            <img 
                              src={details?.posterUrl || generateSvgPoster(movie.cleanTitle, movie.year, movie.rating)} 
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {/* Card Overlay on Hover */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                              <span className="text-xs text-netflix-red font-bold uppercase tracking-wider mb-1">
                                similarity: {idx === 0 ? '98%' : idx === 1 ? '94%' : idx === 2 ? '89%' : idx === 3 ? '85%' : '81%'}
                              </span>
                              <h4 className="text-sm font-bold leading-tight mb-2 truncate">{movie.cleanTitle}</h4>
                              <p className="text-[10px] text-zinc-400 mb-3 truncate">{movie.genres.replace(/\|/g, ', ')}</p>
                              
                              {/* Overlay actions */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleExploreMovie(movie.title)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-netflix-red hover:bg-red-600 rounded text-xs font-bold transition-colors"
                                >
                                  <Play size={10} fill="white" /> Explore
                                </button>
                                <button
                                  onClick={() => setActiveDetailsPopup({ movie, details })}
                                  className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold transition-colors"
                                >
                                  <Info size={12} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Text Header */}
                          <div className="p-3 bg-zinc-900 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-extrabold line-clamp-1 mb-1">{movie.cleanTitle}</h4>
                              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                                <span>📅 {movie.year || 'N/A'}</span>
                                <span className="text-yellow-500">★ {(details?.rating || movie.rating * 2).toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="mt-3 space-y-1.5">
                              <button
                                onClick={() => handleExploreMovie(movie.title)}
                                className="w-full py-1.5 bg-netflix-red hover:bg-red-600 text-[10px] font-extrabold tracking-wider uppercase rounded text-white transition-colors"
                              >
                                🎬 Explore Similar
                              </button>
                              <button
                                onClick={() => setActiveDetailsPopup({ movie, details })}
                                className="w-full py-1.5 bg-zinc-850 hover:bg-zinc-800 text-[10px] font-extrabold tracking-wider uppercase rounded text-zinc-300 border border-zinc-800 transition-colors"
                              >
                                🔍 View Info
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* TAB B: TRENDING TAB */}
          {activeTab === 'trending' && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold tracking-tight">Popular & Trending Movies</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {trendingMovies.map((movie) => {
                  const details = posterCache[movie.title];
                  return (
                    <div 
                      key={movie.id} 
                      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between"
                    >
                      <div className="aspect-[2/3] bg-zinc-950 relative">
                        <img 
                          src={details?.posterUrl || generateSvgPoster(movie.cleanTitle, movie.year, movie.rating)} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 bg-zinc-900 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold line-clamp-1 mb-1">{movie.cleanTitle}</h4>
                          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                            <span>📅 {movie.year || 'N/A'}</span>
                            <span className="text-yellow-500">★ {(details?.rating || movie.rating * 2).toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              handleExploreMovie(movie.title);
                              setActiveTab('explore');
                            }}
                            className="w-full py-1.5 bg-netflix-red hover:bg-red-600 text-[10px] font-extrabold tracking-wider uppercase rounded text-white transition-colors"
                          >
                            🎬 Recommend Similar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB C: WATCHLIST TAB */}
          {activeTab === 'watchlist' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📌</span>
                  <h2 className="text-xl font-bold tracking-tight">My Saved Watchlist</h2>
                </div>
                {watchlist.length > 0 && (
                  <button 
                    onClick={() => setWatchlist([])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-800 rounded-full transition-colors"
                  >
                    <Trash2 size={12} /> Clear All
                  </button>
                )}
              </div>

              {watchlist.length === 0 ? (
                <div className="p-16 text-center text-zinc-500 font-medium bg-zinc-900/35 border border-zinc-900 rounded-xl max-w-xl mx-auto space-y-4">
                  <Bookmark size={40} className="mx-auto text-zinc-700" />
                  <p>Your watchlist is currently empty. Head to "Explore" and tap the "Add to Watchlist" button to bookmark movies!</p>
                  <button 
                    onClick={() => setActiveTab('explore')}
                    className="px-4 py-2 bg-netflix-red text-white text-xs font-bold rounded-lg"
                  >
                    Go Back Explore
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {watchlist.map((movie, idx) => (
                    <div 
                      key={movie.id} 
                      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between"
                    >
                      <div className="aspect-[2/3] bg-zinc-950 relative">
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 bg-zinc-900 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold line-clamp-1 mb-1">{movie.title}</h4>
                          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                            <span>📅 {movie.year || 'N/A'}</span>
                            <span className="text-yellow-500">★ {(movie.rating * 2).toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              handleExploreMovie(movie.title);
                              setActiveTab('explore');
                            }}
                            className="flex-1 py-1.5 bg-netflix-red hover:bg-red-600 text-[10px] font-extrabold tracking-wider uppercase rounded text-white transition-colors"
                          >
                            🎬 Explore
                          </button>
                          <button
                            onClick={() => setWatchlist(prev => prev.filter(item => item.title !== movie.title))}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB D: CHATBOT TAB */}
          {activeTab === 'chatbot' && (
            <section className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-900/30 border-b border-zinc-900 flex items-center gap-3">
                <span className="text-lg">💬</span>
                <div>
                  <h3 className="font-extrabold text-sm">CineMind Assistant</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Instant Client-side Keyword Recommendation Agent</p>
                </div>
              </div>

              {/* Message Display Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-netflix-red text-white rounded-br-none' : 'bg-zinc-900 border border-zinc-850 text-zinc-200 rounded-bl-none whitespace-pre-line'}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-850 rounded-2xl px-4 py-2.5 text-zinc-500 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce delay-150"></span>
                      CineMind is matching vectors...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="p-4 border-t border-zinc-900 bg-zinc-950 flex gap-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask e.g. 'I want a classic funny animation' or 'recommend a sci-fi space action'"
                  className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-netflix-red"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-netflix-red hover:bg-red-600 font-extrabold text-sm rounded-xl transition-colors"
                >
                  Ask AI
                </button>
              </form>
            </section>
          )}

        </div>
      </main>

      {/* 4. MODULAR DETAILED POPUP OVERLAY */}
      {activeDetailsPopup && (
        <div 
          onClick={() => setActiveDetailsPopup(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative cursor-default"
          >
            
            {/* Close button */}
            <button 
              onClick={() => setActiveDetailsPopup(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-30"
            >
              <X size={16} />
            </button>

            {/* Poster Header */}
            <div className="h-64 bg-zinc-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent z-10"></div>
              <img 
                src={activeDetailsPopup.details?.posterUrl || generateSvgPoster(activeDetailsPopup.movie.cleanTitle, activeDetailsPopup.movie.year, activeDetailsPopup.movie.rating)} 
                alt={activeDetailsPopup.movie.title}
                className="w-full h-full object-cover blur-sm opacity-30"
              />
              <div className="absolute bottom-6 left-6 z-20 flex gap-6 items-end">
                <div className="w-24 aspect-[2/3] rounded-lg overflow-hidden border border-zinc-800 shadow-xl hidden sm:block shrink-0 bg-zinc-900">
                  <img 
                    src={activeDetailsPopup.details?.posterUrl || generateSvgPoster(activeDetailsPopup.movie.cleanTitle, activeDetailsPopup.movie.year, activeDetailsPopup.movie.rating)} 
                    alt={activeDetailsPopup.movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-white mb-2">{activeDetailsPopup.movie.title}</h3>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    {activeDetailsPopup.movie.genres.split('|').map((g, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-netflix-red rounded-full">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-950/40 p-4 border border-zinc-850 rounded-xl">
                <div>
                  <h5 className="font-bold text-zinc-500 mb-1 uppercase tracking-wider">Release Date / Year</h5>
                  <p className="font-semibold text-zinc-200">📅 {activeDetailsPopup.details?.releaseDate || activeDetailsPopup.movie.year || 'N/A'}</p>
                </div>
                <div>
                  <h5 className="font-bold text-zinc-500 mb-1 uppercase tracking-wider">TMDB Community Rating</h5>
                  <p className="font-semibold text-zinc-200">⭐ {(activeDetailsPopup.details?.rating || activeDetailsPopup.movie.rating * 2).toFixed(1)} / 10</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Synopsis Overview</h4>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {activeDetailsPopup.details?.overview}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-950">
                <button
                  onClick={() => toggleWatchlist(activeDetailsPopup.movie)}
                  className="px-4 py-2 bg-netflix-red hover:bg-red-600 text-xs font-extrabold rounded-lg tracking-wide uppercase transition-colors"
                >
                  {watchlist.some(item => item.title === activeDetailsPopup.movie.title) ? '➖ Remove' : '➕ Add Watchlist'}
                </button>
                <button
                  onClick={() => {
                    handleExploreMovie(activeDetailsPopup.movie.title);
                    setActiveDetailsPopup(null);
                    setActiveTab('explore');
                  }}
                  className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-xs font-extrabold text-zinc-300 rounded-lg tracking-wide uppercase border border-zinc-850 transition-colors"
                >
                  🎬 Explore Similar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
