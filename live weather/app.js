/* ==========================================
   AETHERIS WEATHER ENGINE (V2) - CLIENT JS
   Light Glassmorphic Theme, Particle Canvas & AQI
   ========================================== */

// --- Global Application State ---
const state = {
  activeCity: {
    name: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278
  },
  useFahrenheit: false,
  favorites: [],
  currentWeather: null,
  hourlyForecast: null,
  dailyForecast: null,
  aqiData: null,
  activeChartTab: "temp",
  chartInstance: null,
  ambientEngine: null
};

// --- Default Favorites on First Run ---
const defaultFavorites = [
  { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060 },
  { name: "Tokyo", country: "Japan", lat: 35.6895, lon: 139.6917 },
  { name: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 }
];

// --- Weather Code Mapping to Themes & Names ---
const weatherCodeMap = {
  0: { name: "Clear Sky", theme: "clear", icon: "clear-day" },
  1: { name: "Mainly Clear", theme: "clear", icon: "clear-day" },
  2: { name: "Partly Cloudy", theme: "clouds", icon: "cloudy" },
  3: { name: "Overcast", theme: "clouds", icon: "cloudy" },
  45: { name: "Fog", theme: "clouds", icon: "fog" },
  48: { name: "Depositing Rime Fog", theme: "clouds", icon: "fog" },
  51: { name: "Light Drizzle", theme: "rain", icon: "rainy" },
  53: { name: "Moderate Drizzle", theme: "rain", icon: "rainy" },
  55: { name: "Dense Drizzle", theme: "rain", icon: "rainy" },
  56: { name: "Light Freezing Drizzle", theme: "rain", icon: "rainy" },
  57: { name: "Dense Freezing Drizzle", theme: "rain", icon: "rainy" },
  61: { name: "Slight Rain", theme: "rain", icon: "rainy" },
  63: { name: "Moderate Rain", theme: "rain", icon: "rainy" },
  65: { name: "Heavy Rain", theme: "rain", icon: "rainy" },
  66: { name: "Light Freezing Rain", theme: "rain", icon: "rainy" },
  67: { name: "Heavy Freezing Rain", theme: "rain", icon: "rainy" },
  71: { name: "Slight Snow Fall", theme: "snow", icon: "snowy" },
  73: { name: "Moderate Snow Fall", theme: "snow", icon: "snowy" },
  75: { name: "Heavy Snow Fall", theme: "snow", icon: "snowy" },
  77: { name: "Snow Grains", theme: "snow", icon: "snowy" },
  80: { name: "Slight Rain Showers", theme: "rain", icon: "rainy" },
  81: { name: "Moderate Rain Showers", theme: "rain", icon: "rainy" },
  82: { name: "Violent Rain Showers", theme: "rain", icon: "rainy" },
  85: { name: "Slight Snow Showers", theme: "snow", icon: "snowy" },
  86: { name: "Heavy Snow Showers", theme: "snow", icon: "snowy" },
  95: { name: "Thunderstorm", theme: "storm", icon: "stormy" },
  96: { name: "Thunderstorm with Slight Hail", theme: "storm", icon: "stormy" },
  99: { name: "Thunderstorm with Heavy Hail", theme: "storm", icon: "stormy" }
};

// --- Object-Oriented HTML5 Ambient Particle Canvas Physics Engine ---
class AmbientEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.animationId = null;
    this.theme = "clear";
    this.lightningFlash = 0;
    
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.initParticles();
    this.startLoop();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    let count = 40;
    
    // Performance optimization for mobile screens
    if (window.innerWidth < 768) {
      count = 15;
    }

    if (this.theme === "clear") {
      // Golden solar dust motes floating up
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          radius: Math.random() * 4 + 1,
          vx: Math.random() * 0.4 - 0.2,
          vy: -(Math.random() * 0.5 + 0.1),
          alpha: Math.random() * 0.5 + 0.1,
          color: "rgba(234, 88, 12, " // Warm amber/orange base
        });
      }
    } else if (this.theme === "clouds") {
      // Drifting ambient mist gray circles
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          radius: Math.random() * 30 + 10,
          vx: Math.random() * 0.3 + 0.1,
          vy: Math.random() * 0.2 - 0.1,
          alpha: Math.random() * 0.15 + 0.05,
          color: "rgba(100, 116, 139, " // Slate gray
        });
      }
    } else if (this.theme === "rain") {
      // Diagonal falling rain streaks
      const rainCount = count * 2.5;
      for (let i = 0; i < rainCount; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * -this.canvas.height,
          length: Math.random() * 15 + 8,
          vx: Math.random() * 2 + 3, // Wind slide speed
          vy: Math.random() * 10 + 12, // Gravity fall speed
          alpha: Math.random() * 0.4 + 0.1
        });
      }
    } else if (this.theme === "snow") {
      // Soft floating snowflakes
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          radius: Math.random() * 3 + 1,
          vx: Math.random() * 0.5 - 0.25,
          vy: Math.random() * 0.8 + 0.4,
          density: Math.random() * 10,
          alpha: Math.random() * 0.6 + 0.2
        });
      }
    } else if (this.theme === "storm") {
      // Fast rain streaks + lightning flash triggers
      const rainCount = count * 3.5;
      for (let i = 0; i < rainCount; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * -this.canvas.height,
          length: Math.random() * 20 + 10,
          vx: Math.random() * 4 + 6,
          vy: Math.random() * 14 + 18,
          alpha: Math.random() * 0.5 + 0.1
        });
      }
    }
  }

  startLoop() {
    const loop = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.updateAndDraw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  updateAndDraw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw thundery flash overlay if active
    if (this.theme === "storm" && Math.random() < 0.003 && this.lightningFlash === 0) {
      this.lightningFlash = Math.random() * 15 + 10;
    }

    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(124, 58, 237, ${this.lightningFlash / 80})`; // Electric purple sheet
      ctx.fillRect(0, 0, w, h);
      this.lightningFlash--;
    }

    // Render themed physics particle updates
    if (this.theme === "clear" || this.theme === "clouds") {
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Reset boundary overlaps
        if (p.y < -p.radius) p.y = h + p.radius;
        if (p.x < -p.radius) p.x = w + p.radius;
        if (p.x > w + p.radius) p.x = -p.radius;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ")";
        ctx.fill();
      });
    } else if (this.theme === "rain" || this.theme === "storm") {
      ctx.strokeStyle = this.theme === "storm" ? "rgba(124, 58, 237, 0.45)" : "rgba(2, 132, 199, 0.35)";
      ctx.lineWidth = 1.2;
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > h) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x > w) {
          p.x = -20;
          p.y = Math.random() * -h;
        }

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.8, p.y + p.vy * 0.8);
        ctx.stroke();
      });
    } else if (this.theme === "snow") {
      ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
      this.particles.forEach(p => {
        p.y += p.vy;
        p.x += Math.sin(p.density) * 0.5;
        p.density += 0.01;

        if (p.y > h) {
          p.y = -10;
          p.x = Math.random() * w;
        }
        if (p.x < 0 || p.x > w) {
          p.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

// --- Dynamic Weather SVGs Generative Engine ---
function getWeatherSvg(iconName, customClass = "") {
  const animations = `
    <style>
      .spin-slow { animation: spin 20s linear infinite; transform-origin: center; }
      .drift { animation: drift 4s ease-in-out infinite alternate; }
      .rain-drop { animation: fall 1.5s linear infinite; }
      .rain-drop:nth-child(2) { animation-delay: 0.5s; }
      .rain-drop:nth-child(3) { animation-delay: 1s; }
      .lightning { animation: flash 2s infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes drift { from { transform: translate(-4px, 0); } to { transform: translate(4px, 0); } }
      @keyframes fall { 0% { transform: translateY(-8px); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(12px); opacity: 0; } }
      @keyframes flash { 0%, 90%, 100% { opacity: 0; } 92%, 93%, 96% { opacity: 1; filter: drop-shadow(0 0 8px #7c3aed); } }
    </style>
  `;

  if (iconName === "clear-day") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="${customClass}">
        ${animations}
        <circle cx="32" cy="32" r="14" fill="url(#sunGradient)" filter="drop-shadow(0 0 10px rgba(234, 88, 12, 0.4))"/>
        <g class="spin-slow">
          <line x1="32" y1="6" x2="32" y2="12" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="32" y1="52" x2="32" y2="58" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="6" y1="32" x2="12" y2="32" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="52" y1="32" x2="58" y2="32" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="13.6" y1="13.6" x2="17.9" y2="17.9" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="46.1" y1="46.1" x2="50.4" y2="50.4" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="13.6" y1="50.4" x2="17.9" y2="46.1" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="46.1" y1="17.9" x2="50.4" y2="13.6" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
        </g>
        <defs>
          <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#ea580c" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  if (iconName === "cloudy") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="${customClass}">
        ${animations}
        <path class="drift" d="M46 36a8 8 0 0 0-8-8 8.4 8.4 0 0 0-1.8.2 11 11 0 0 0-20.2 3.8 8 8 0 0 0-1 16h31a8 8 0 0 0 0-16z" fill="url(#cloudGrad1)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))"/>
        <path class="drift" style="animation-delay: -2s; opacity: 0.85;" d="M50 40a6 6 0 0 0-6-6 6.3 6.3 0 0 0-1.3.1 8 8 0 0 0-15-1.1 6 6 0 0 0 1.3 12h21a6 6 0 0 0 0-12z" fill="url(#cloudGrad2)"/>
        <defs>
          <linearGradient id="cloudGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#94a3b8" />
          </linearGradient>
          <linearGradient id="cloudGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#475569" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  if (iconName === "rainy") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="${customClass}">
        ${animations}
        <path class="drift" d="M46 32a8 8 0 0 0-8-8 8.4 8.4 0 0 0-1.8.2 11 11 0 0 0-20.2 3.8 8 8 0 0 0-1 16h31a8 8 0 0 0 0-16z" fill="url(#rainCloudGrad)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))"/>
        <g stroke="url(#rainDropGrad)" stroke-width="2" stroke-linecap="round">
          <line class="rain-drop" x1="20" y1="46" x2="18" y2="52" />
          <line class="rain-drop" x1="30" y1="46" x2="28" y2="52" />
          <line class="rain-drop" x1="40" y1="46" x2="38" y2="52" />
        </g>
        <defs>
          <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#bae6fd" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="rainDropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0ea5e9" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  if (iconName === "snowy") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="${customClass}">
        ${animations}
        <path class="drift" d="M46 32a8 8 0 0 0-8-8 8.4 8.4 0 0 0-1.8.2 11 11 0 0 0-20.2 3.8 8 8 0 0 0-1 16h31a8 8 0 0 0 0-16z" fill="url(#snowCloudGrad)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))"/>
        <circle class="rain-drop" cx="20" cy="48" r="2.5" fill="#94a3b8"/>
        <circle class="rain-drop" cx="30" cy="48" r="2.5" fill="#cbd5e1" style="animation-delay: 0.6s;"/>
        <circle class="rain-drop" cx="40" cy="48" r="2.5" fill="#f1f5f9" style="animation-delay: 1.2s;"/>
        <defs>
          <linearGradient id="snowCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#94a3b8" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  if (iconName === "stormy") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="${customClass}">
        ${animations}
        <path class="drift" d="M46 32a8 8 0 0 0-8-8 8.4 8.4 0 0 0-1.8.2 11 11 0 0 0-20.2 3.8 8 8 0 0 0-1 16h31a8 8 0 0 0 0-16z" fill="url(#stormCloudGrad)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))"/>
        <polygon class="lightning" points="30,42 22,52 28,52 24,62 36,48 30,48" fill="url(#boltGrad)"/>
        <defs>
          <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e9d5ff" />
            <stop offset="100%" stop-color="#a855f7" />
          </linearGradient>
          <linearGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#c084fc" />
            <stop offset="100%" stop-color="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // Fog fallback
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="${customClass}">
      ${animations}
      <path class="drift" d="M46 32a8 8 0 0 0-8-8 8.4 8.4 0 0 0-1.8.2 11 11 0 0 0-20.2 3.8 8 8 0 0 0-1 16h31a8 8 0 0 0 0-16z" fill="#94a3b8" opacity="0.6"/>
      <line class="drift" x1="12" y1="46" x2="52" y2="46" stroke="#475569" stroke-width="3" stroke-linecap="round" />
      <line class="drift" style="animation-delay: -2s;" x1="16" y1="52" x2="48" y2="52" stroke="#64748b" stroke-width="3" stroke-linecap="round" />
    </svg>
  `;
}

// --- LocalStorage Favorites Managers ---
function loadFavorites() {
  const saved = localStorage.getItem("aetheris_favorites");
  if (saved) {
    state.favorites = JSON.parse(saved);
  } else {
    state.favorites = [...defaultFavorites];
    saveFavorites();
  }
}

function saveFavorites() {
  localStorage.setItem("aetheris_favorites", JSON.stringify(state.favorites));
}

// --- App Initialization Block ---
document.addEventListener("DOMContentLoaded", () => {
  loadFavorites();
  setupEventListeners();
  
  // Initialize canvas-based ambient physics engine
  state.ambientEngine = new AmbientEngine("ambientCanvas");
  
  // Geolocation Auto-Detection
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        state.activeCity = {
          name: "Local Area",
          country: "Detected Position",
          lat: lat,
          lon: lon
        };
        fetchWeatherData();
      },
      () => {
        fetchWeatherData();
      }
    );
  } else {
    fetchWeatherData();
  }
});

// --- Setup Event Listeners ---
function setupEventListeners() {
  const searchInput = document.getElementById("citySearch");
  const searchBtn = document.getElementById("searchBtn");
  
  searchBtn.addEventListener("click", () => triggerSearch(searchInput.value));
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") triggerSearch(searchInput.value);
  });
  
  searchInput.addEventListener("input", debounce((e) => {
    const val = e.target.value.trim();
    if (val.length < 2) {
      hideSearchDropdown();
      return;
    }
    showAutocompleteSuggestions(val);
  }, 250));

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-bar-container")) {
      hideSearchDropdown();
    }
  });

  // Celsius/Fahrenheit Unit Switcher
  const toggle = document.getElementById("unitToggle");
  toggle.addEventListener("change", (e) => {
    state.useFahrenheit = e.target.checked;
    
    document.getElementById("labelCelsius").classList.toggle("active", !state.useFahrenheit);
    document.getElementById("labelFahrenheit").classList.toggle("active", state.useFahrenheit);
    
    updateDashboardUI();
    renderFavoritesDock();
  });

  // Pin city
  const pinBtn = document.getElementById("pinCityBtn");
  pinBtn.addEventListener("click", () => {
    togglePinCity();
  });

  // Chart dataset tab switching listeners
  const tabs = document.querySelectorAll(".chart-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      tabs.forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");
      
      state.activeChartTab = e.target.getAttribute("data-tab");
      if (state.hourlyForecast) {
        renderAnalyticsChart(state.hourlyForecast, state.useFahrenheit, (c) => Math.round((c * 9/5) + 32));
      }
    });
  });
}

// --- debounced Helper Function ---
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// --- Autocomplete Search suggestions ---
async function showAutocompleteSuggestions(query) {
  const dropdown = document.getElementById("searchDropdown");
  const spinner = document.getElementById("searchLoading");
  
  spinner.style.display = "block";
  
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const data = await res.json();
    
    dropdown.innerHTML = "";
    
    if (data.results && data.results.length > 0) {
      dropdown.style.display = "block";
      data.results.forEach(res => {
        const item = document.createElement("div");
        item.className = "search-dropdown-item";
        
        const region = res.admin1 ? `${res.admin1}, ` : "";
        item.innerHTML = `
          <span><strong>${res.name}</strong>, <span style="font-size: 11px; color: var(--text-muted);">${region}${res.country || ""}</span></span>
          <span class="country-code">${res.country_code ? res.country_code.toUpperCase() : ""}</span>
        `;
        
        item.addEventListener("click", () => {
          state.activeCity = {
            name: res.name,
            country: res.country || "",
            lat: res.latitude,
            lon: res.longitude
          };
          
          document.getElementById("citySearch").value = "";
          hideSearchDropdown();
          fetchWeatherData();
        });
        
        dropdown.appendChild(item);
      });
    } else {
      dropdown.style.display = "none";
    }
  } catch (error) {
    console.error("Geocoding lookup failed:", error);
  } finally {
    spinner.style.display = "none";
  }
}

function hideSearchDropdown() {
  document.getElementById("searchDropdown").style.display = "none";
}

// --- Manual City search handler ---
async function triggerSearch(query) {
  const clean = query.trim();
  if (!clean) return;
  
  const spinner = document.getElementById("searchLoading");
  spinner.style.display = "block";
  
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`);
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
      const match = data.results[0];
      state.activeCity = {
        name: match.name,
        country: match.country || "",
        lat: match.latitude,
        lon: match.longitude
      };
      
      document.getElementById("citySearch").value = "";
      hideSearchDropdown();
      fetchWeatherData();
    } else {
      alert(`City '${clean}' not found. Please try a different global location.`);
    }
  } catch (error) {
    alert("Meteorological Search Connection Failed. Please check internet connectivity.");
  } finally {
    spinner.style.display = "none";
  }
}

// --- Main Weather & Air Quality API Fetch Engine ---
async function fetchWeatherData() {
  const { lat, lon } = state.activeCity;
  const mainLoading = document.getElementById("searchLoading");
  mainLoading.style.display = "block";
  
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                       `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,cloud_cover,uv_index,weather_code` +
                       `&hourly=temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m,dew_point_2m` +
                       `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`;
                       
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
                   `&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide`;

    // Parallel Promise Execution for lightning-fast loads!
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(weatherUrl).then(r => r.json()),
      fetch(aqiUrl).then(r => r.json())
    ]);
    
    state.currentWeather = weatherRes.current;
    state.hourlyForecast = weatherRes.hourly;
    state.dailyForecast = weatherRes.daily;
    state.aqiData = aqiRes.current;
    
    // Apply weather theme to background AND particle canvas physics!
    applyWeatherTheme(weatherRes.current.weather_code);
    
    updateDashboardUI();
    renderFavoritesDock();
    
  } catch (error) {
    console.error("Meteorological payload error:", error);
    alert("Connection error fetching weather & AQI models.");
  } finally {
    mainLoading.style.display = "none";
  }
}

// --- Apply Weather Themes & Ambient Particle Types ---
function applyWeatherTheme(code) {
  const body = document.body;
  const mapped = weatherCodeMap[code] || { theme: "clear" };
  
  body.className = body.className.replace(/weather-theme-\S+/g, "");
  body.classList.add(`weather-theme-${mapped.theme}`);
  
  // Update Ambient Engine particle physics state!
  if (state.ambientEngine) {
    state.ambientEngine.setTheme(mapped.theme);
  }
}

// --- Pin/Unpin Favorites Toggle ---
function togglePinCity() {
  const active = state.activeCity;
  const pinBtn = document.getElementById("pinCityBtn");
  
  const existingIdx = state.favorites.findIndex(
    fav => Math.abs(fav.lat - active.lat) < 0.01 && Math.abs(fav.lon - active.lon) < 0.01
  );
  
  if (existingIdx > -1) {
    state.favorites.splice(existingIdx, 1);
    pinBtn.classList.remove("pinned");
  } else {
    if (state.favorites.length >= 8) {
      alert("Favorites capacity full. Please unpin a city to add a new one.");
      return;
    }
    state.favorites.push({ ...active });
    pinBtn.classList.add("pinned");
  }
  
  saveFavorites();
  renderFavoritesDock();
}

// --- Render Pinned Favorites horizontal scroll dock ---
async function renderFavoritesDock() {
  const dock = document.getElementById("favoritesDock");
  const countLabel = document.getElementById("favsCount");
  
  dock.innerHTML = "";
  countLabel.textContent = `${state.favorites.length} pinned`;
  
  if (state.favorites.length === 0) {
    dock.innerHTML = `<div class="empty-fav-message" style="font-size: 12px; color: var(--text-muted); padding: 10px;">No pinned cities. Click the pin icon in the main weather panel to add one.</div>`;
    return;
  }
  
  const lats = state.favorites.map(f => f.lat).join(",");
  const lons = state.favorites.map(f => f.lon).join(",");
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    const data = await res.json();
    
    const dataList = Array.isArray(data) ? data : [data];
    
    state.favorites.forEach((fav, idx) => {
      const weather = dataList[idx]?.current;
      if (!weather) return;
      
      const tempVal = Math.round(weather.temperature_2m);
      const dispTemp = state.useFahrenheit ? Math.round((tempVal * 9/5) + 32) : tempVal;
      const mapped = weatherCodeMap[weather.weather_code] || { name: "Clear", icon: "clear-day" };
      
      const card = document.createElement("div");
      card.className = "fav-card glass-card";
      
      const isActive = Math.abs(state.activeCity.lat - fav.lat) < 0.01 && Math.abs(state.activeCity.lon - fav.lon) < 0.01;
      if (isActive) {
        card.style.borderColor = "var(--accent-cyan)";
        card.style.boxShadow = "0 0 15px var(--accent-cyan-glow)";
        card.style.background = "rgba(255, 255, 255, 0.7)";
      }
      
      card.innerHTML = `
        <div class="fav-header">
          <div>
            <div class="fav-name">${fav.name}</div>
            <div class="fav-country">${fav.country}</div>
          </div>
          <button class="fav-unpin-btn" data-index="${idx}" title="Unpin location">×</button>
        </div>
        <div class="fav-details">
          <span class="fav-temp">${dispTemp}°</span>
          <div class="fav-icon-mini">${getWeatherSvg(mapped.icon)}</div>
        </div>
      `;
      
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("fav-unpin-btn")) return;
        state.activeCity = { ...fav };
        fetchWeatherData();
      });
      
      card.querySelector(".fav-unpin-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(e.target.getAttribute("data-index"));
        state.favorites.splice(index, 1);
        saveFavorites();
        renderFavoritesDock();
        
        const isCurrentActive = Math.abs(state.activeCity.lat - fav.lat) < 0.01 && Math.abs(state.activeCity.lon - fav.lon) < 0.01;
        if (isCurrentActive) {
          document.getElementById("pinCityBtn").classList.remove("pinned");
        }
      });
      
      dock.appendChild(card);
    });
  } catch (err) {
    console.error("Failed pulling favorites data:", err);
  }
}

// --- Main UI Rendering Manager ---
function updateDashboardUI() {
  if (!state.currentWeather) return;
  
  const curr = state.currentWeather;
  const hourly = state.hourlyForecast;
  const daily = state.dailyForecast;
  const isF = state.useFahrenheit;
  
  // Format Conversions
  const toF = (c) => Math.round((c * 9/5) + 32);
  const tempVal = Math.round(curr.temperature_2m);
  const feelsLikeVal = Math.round(curr.apparent_temperature);
  
  const dispTemp = isF ? toF(curr.temperature_2m) : tempVal;
  const dispFeelsLike = isF ? toF(curr.apparent_temperature) : feelsLikeVal;
  const unitLabel = isF ? "°F" : "°C";
  
  const mapped = weatherCodeMap[curr.weather_code] || { name: "Clear", icon: "clear-day" };
  
  // 1. Update Hero conditions Panel
  document.getElementById("cityName").textContent = state.activeCity.name;
  document.getElementById("countryName").textContent = state.activeCity.country || "Global Location";
  document.getElementById("currentTemp").innerHTML = `${dispTemp}<span style="font-size: 32px; font-weight: 500; vertical-align: super;">°</span>`;
  document.getElementById("weatherDesc").textContent = mapped.name;
  
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  document.getElementById("localTime").textContent = `Local Time: ${timeStr}`;
  
  document.getElementById("mainWeatherSvg").innerHTML = getWeatherSvg(mapped.icon, "weather-hero-svg");
  
  const isPinned = state.favorites.some(
    fav => Math.abs(fav.lat - state.activeCity.lat) < 0.01 && Math.abs(fav.lon - state.activeCity.lon) < 0.01
  );
  document.getElementById("pinCityBtn").classList.toggle("pinned", isPinned);
  
  // 2. Real-time Hazard Safety Banner Scanner
  scanActiveWeatherHazards(curr);
  
  // 3. Update 6-Diagnostic Metric Grid
  document.getElementById("valFeelsLike").textContent = `${dispFeelsLike}${unitLabel}`;
  
  let feelsLikeDesc = "Comfortable";
  if (feelsLikeVal < 10) feelsLikeDesc = "Chilly";
  else if (feelsLikeVal < 0) feelsLikeDesc = "Freezing";
  else if (feelsLikeVal > 30) feelsLikeDesc = "Extremely Hot";
  else if (feelsLikeVal > 25) feelsLikeDesc = "Warm";
  document.getElementById("descFeelsLike").textContent = feelsLikeDesc;
  
  document.getElementById("valWind").textContent = `${curr.wind_speed_10m} km/h`;
  const windDirDeg = curr.wind_direction_10m;
  const windCompassDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const compassIndex = Math.round(windDirDeg / 22.5) % 16;
  const compassDirection = windCompassDirections[compassIndex];
  
  document.getElementById("valWindDir").textContent = `${compassDirection} (${windDirDeg}°)`;
  document.getElementById("windArrow").style.transform = `rotate(${windDirDeg}deg)`;
  
  const hum = curr.relative_humidity_2m;
  document.getElementById("valHumidity").textContent = `${hum}%`;
  let humDesc = "Pleasant";
  if (hum < 30) humDesc = "Dry Air";
  else if (hum > 75) humDesc = "High Moisture";
  document.getElementById("descHumidity").textContent = humDesc;
  
  const uv = curr.uv_index;
  document.getElementById("valUV").textContent = uv.toFixed(1);
  const uvBadge = document.getElementById("badgeUV");
  uvBadge.className = "metric-level-badge";
  
  if (uv < 3) {
    uvBadge.textContent = "Low";
    uvBadge.classList.add("uv-low");
  } else if (uv < 6) {
    uvBadge.textContent = "Moderate";
    uvBadge.classList.add("uv-mod");
  } else if (uv < 8) {
    uvBadge.textContent = "High";
    uvBadge.classList.add("uv-high");
  } else {
    uvBadge.textContent = "Extreme";
    uvBadge.classList.add("uv-ext");
  }
  
  const clouds = curr.cloud_cover;
  document.getElementById("valClouds").textContent = `${clouds}%`;
  let cloudDesc = "Clear Sky";
  if (clouds > 80) cloudDesc = "Overcast";
  else if (clouds > 50) cloudDesc = "Broken Clouds";
  else if (clouds > 20) cloudDesc = "Partly Cloudy";
  document.getElementById("descClouds").textContent = cloudDesc;
  
  // Comfort Index logic
  const tempC = curr.temperature_2m;
  const windSpd = curr.wind_speed_10m;
  const tPenalty = Math.abs(tempC - 22.0) * 4.0;
  const hPenalty = Math.abs(hum - 45.0) * 0.8;
  const wPenalty = windSpd < 5 ? (5 - windSpd) * 2 : (windSpd > 25 ? (windSpd - 25) * 1.2 : 0);
  
  const comfortScoreVal = Math.round(Math.max(0, Math.min(100, 100.0 - (tPenalty + hPenalty + wPenalty))));
  document.getElementById("valComfort").textContent = `${comfortScoreVal}%`;
  document.getElementById("barComfort").style.width = `${comfortScoreVal}%`;
  
  // 4. Update Air Quality Index (AQI) Panel
  updateAQIPanel();
  
  // 5. Render 24-Hour Slider Cards
  renderHourlySlider(hourly, isF, toF);
  
  // 6. Render 7-Day Outlook Rows
  renderWeeklyList(daily, isF, toF);
  
  // 7. Reinitialize Chart.js Analytics (Support dynamic switch tabs)
  renderAnalyticsChart(hourly, isF, toF);
}

// --- Dynamic Active Safety Warnings Scanner ---
function scanActiveWeatherHazards(curr) {
  const container = document.getElementById("hazardBanner");
  container.innerHTML = "";
  
  const alerts = [];
  
  if (curr.uv_index >= 8) {
    alerts.push({
      title: "EXTREME ULTRAVIOLET HAZARD",
      desc: `UV index is critical at ${curr.uv_index.toFixed(1)}. Apply SPF 50+, wear protective eyewear, and seek midday shade.`
    });
  }
  
  if (curr.wind_speed_10m >= 30) {
    alerts.push({
      title: "GALE WARNING",
      desc: `High wind velocities at ${curr.wind_speed_10m} km/h. Secure loose outdoor assets and execute precaution during travel.`
    });
  }
  
  if (curr.temperature_2m >= 35) {
    alerts.push({
      title: "EXTREME THERMAL HEAT alert",
      desc: `Critical heat thresholds at ${curr.temperature_2m}°C. Stay fully hydrated, minimize direct solar exposure, and rest inside.`
    });
  } else if (curr.temperature_2m <= 0) {
    alerts.push({
      title: "SEVERE FREEZE WARNING",
      desc: `Sub-zero atmospheric temperatures at ${curr.temperature_2m}°C. Protect exposed water piping systems and stay insulated.`
    });
  }
  
  if (alerts.length > 0) {
    container.style.display = "flex";
    alerts.forEach(al => {
      const toast = document.createElement("div");
      toast.className = "hazard-toast";
      toast.innerHTML = `
        <div class="hazard-icon">⚠️</div>
        <div class="hazard-info">
          <span class="hazard-title">${al.title}</span>
          <span class="hazard-desc">${al.desc}</span>
        </div>
      `;
      container.appendChild(toast);
    });
  } else {
    container.style.display = "none";
  }
}

// --- Render Air Quality Index Panel ---
function updateAQIPanel() {
  if (!state.aqiData) return;
  
  const aqi = state.aqiData.us_aqi;
  const pm25 = state.aqiData.pm2_5;
  const pm10 = state.aqiData.pm10;
  const o3 = state.aqiData.ozone;
  const no2 = state.aqiData.nitrogen_dioxide;
  
  document.getElementById("valAQI").textContent = Math.round(aqi);
  
  // Compound statistics
  document.getElementById("valPM25").textContent = `${Math.round(pm25)} µg/m³`;
  document.getElementById("valPM10").textContent = `${Math.round(pm10)} µg/m³`;
  document.getElementById("valO3").textContent = `${Math.round(o3)} µg/m³`;
  document.getElementById("valNO2").textContent = `${Math.round(no2)} µg/m³`;
  
  const badge = document.getElementById("badgeAQI");
  const fill = document.getElementById("barAQI");
  badge.className = "aqi-badge"; // Reset classes
  
  // Calculate relative fill percentage (maximum 300 scale)
  const fillPct = Math.min(100, (aqi / 300) * 100);
  fill.style.width = `${fillPct}%`;
  
  // Reset gauge background color before applying levels
  fill.style.background = "";
  
  if (aqi <= 50) {
    badge.textContent = "Good";
    badge.classList.add("aqi-good");
    fill.style.background = "var(--accent-green)";
  } else if (aqi <= 100) {
    badge.textContent = "Moderate";
    badge.classList.add("aqi-mod");
    fill.style.background = "#d97706"; // Amber
  } else if (aqi <= 150) {
    badge.textContent = "Unhealthy (Sensitive)";
    badge.classList.add("aqi-sens");
    fill.style.background = "var(--accent-amber)";
  } else if (aqi <= 200) {
    badge.textContent = "Unhealthy";
    badge.classList.add("aqi-unhealth");
    fill.style.background = "#dc2626"; // Crimson
  } else {
    badge.textContent = "Hazardous";
    badge.classList.add("aqi-haz");
    fill.style.background = "var(--accent-pink)";
  }
}

// --- Render Hourly Slider ---
function renderHourlySlider(hourly, isF, toF) {
  const slider = document.getElementById("hourlySlider");
  slider.innerHTML = "";
  
  for (let i = 0; i < 24; i++) {
    const rawTime = new Date(hourly.time[i]);
    const hr = rawTime.getHours();
    const hourLabel = i === 0 ? "Now" : `${hr.toString().padStart(2, '0')}:00`;
    
    const tempVal = Math.round(hourly.temperature_2m[i]);
    const dispTemp = isF ? toF(hourly.temperature_2m[i]) : tempVal;
    
    let hrCode = 0;
    if (state.dailyForecast) {
      const dayIdx = Math.floor(i / 24);
      hrCode = state.dailyForecast.weather_code[dayIdx] || 0;
    }
    const mapped = weatherCodeMap[hrCode] || { icon: "clear-day" };
    
    const item = document.createElement("div");
    item.className = "hour-item";
    item.innerHTML = `
      <span class="hour-time">${hourLabel}</span>
      <div class="hour-icon">${getWeatherSvg(mapped.icon)}</div>
      <span class="hour-temp">${dispTemp}°</span>
    `;
    slider.appendChild(item);
  }
}

// --- Render Weekly List ---
function renderWeeklyList(daily, isF, toF) {
  const list = document.getElementById("weeklyList");
  list.innerHTML = "";
  
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  for (let i = 0; i < 7; i++) {
    const rawDate = new Date(daily.time[i]);
    const dayName = i === 0 ? "Today" : weekdays[rawDate.getDay()];
    
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    
    const dispMax = isF ? toF(daily.temperature_2m_max[i]) : maxTemp;
    const dispMin = isF ? toF(daily.temperature_2m_min[i]) : minTemp;
    
    const code = daily.weather_code[i];
    const mapped = weatherCodeMap[code] || { name: "Clear", icon: "clear-day" };
    
    const item = document.createElement("div");
    item.className = "weekly-item";
    item.innerHTML = `
      <span class="weekly-day">${dayName}</span>
      <div class="weekly-icon">${getWeatherSvg(mapped.icon)}</div>
      <span class="weekly-desc">${mapped.name}</span>
      <div class="weekly-temp-range">
        <span class="weekly-temp-max">${dispMax}°</span>
        <span class="weekly-temp-min">${dispMin}°</span>
      </div>
    `;
    list.appendChild(item);
  }
}

// --- Render Switchable Chart.js Analytics (Temperature vs Wind vs Humidity) ---
function renderAnalyticsChart(hourly, isF, toF) {
  const ctx = document.getElementById("forecastChart").getContext("2d");
  
  // Slice next 24 hours
  const hours = hourly.time.slice(0, 24).map(t => {
    const rawTime = new Date(t);
    return `${rawTime.getHours().toString().padStart(2, '0')}:00`;
  });
  
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }
  
  let datasets = [];
  let scales = {};
  
  // Configure Chart datasets based on active switchable tab
  if (state.activeChartTab === "temp") {
    // 1. Temperature vs Precipitation probability
    const temps = hourly.temperature_2m.slice(0, 24).map(t => isF ? toF(t) : Math.round(t));
    const rainProb = hourly.precipitation_probability.slice(0, 24);
    
    const cyanFill = ctx.createLinearGradient(0, 0, 0, 200);
    cyanFill.addColorStop(0, "rgba(2, 132, 199, 0.2)");
    cyanFill.addColorStop(1, "rgba(2, 132, 199, 0.0)");
    
    datasets = [
      {
        label: `Temperature (${isF ? "°F" : "°C"})`,
        data: temps,
        borderColor: "#0284c7", // Sky blue
        borderWidth: 2,
        pointBackgroundColor: "#0284c7",
        pointBorderColor: "#fff",
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        backgroundColor: cyanFill,
        yAxisID: "yL",
        tension: 0.4
      },
      {
        label: "Rain Probability (%)",
        type: "bar",
        data: rainProb,
        backgroundColor: "rgba(208, 28, 112, 0.15)", // Raspberry Pink
        borderColor: "rgba(208, 28, 112, 0.4)",
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: "rgba(208, 28, 112, 0.3)",
        yAxisID: "yR",
        barThickness: 10
      }
    ];
    
    scales = {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.03)", borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#64748b", font: { family: "Outfit", size: 8 } }
      },
      yL: {
        type: "linear",
        position: "left",
        grid: { color: "rgba(0, 0, 0, 0.03)", borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          color: "#0284c7",
          font: { family: "Outfit", size: 9, weight: "bold" },
          callback: function(value) { return value + "°"; }
        }
      },
      yR: {
        type: "linear",
        position: "right",
        grid: { drawOnChartArea: false, borderColor: "rgba(0, 0, 0, 0.05)" },
        min: 0,
        max: 100,
        ticks: {
          color: "#d01c70",
          font: { family: "Outfit", size: 9, weight: "bold" },
          callback: function(value) { return value + "%"; }
        }
      }
    };
  } 
  
  else if (state.activeChartTab === "wind") {
    // 2. Wind Speeds trends
    const windSpeeds = hourly.wind_speed_10m.slice(0, 24).map(w => Math.round(w));
    
    // Custom Computed Wind gusts arrays (estimate gusts based on speeds multiplier!)
    const windGusts = windSpeeds.map(w => Math.round(w * (1.3 + Math.random() * 0.2)));
    
    const amberFill = ctx.createLinearGradient(0, 0, 0, 200);
    amberFill.addColorStop(0, "rgba(234, 88, 12, 0.15)");
    amberFill.addColorStop(1, "rgba(234, 88, 12, 0.0)");
    
    datasets = [
      {
        label: "Wind Speed (km/h)",
        data: windSpeeds,
        borderColor: "#ea580c", // Orange
        borderWidth: 2,
        pointBackgroundColor: "#ea580c",
        pointBorderColor: "#fff",
        pointRadius: 3,
        fill: true,
        backgroundColor: amberFill,
        yAxisID: "yL",
        tension: 0.4
      },
      {
        label: "Estimated Wind Gusts (km/h)",
        data: windGusts,
        borderColor: "#f59e0b", // Yellow/Amber
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 1,
        fill: false,
        yAxisID: "yL",
        tension: 0.4
      }
    ];
    
    scales = {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.03)", borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#64748b", font: { family: "Outfit", size: 8 } }
      },
      yL: {
        type: "linear",
        position: "left",
        grid: { color: "rgba(0, 0, 0, 0.03)", borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          color: "#ea580c",
          font: { family: "Outfit", size: 9, weight: "bold" },
          callback: function(value) { return value + " km/h"; }
        }
      }
    };
  } 
  
  else if (state.activeChartTab === "humidity") {
    // 3. Humidity & computed Dew Point curves
    const humidities = hourly.relative_humidity_2m.slice(0, 24);
    const dewPoints = hourly.dew_point_2m.slice(0, 24).map(d => isF ? toF(d) : Math.round(d));
    
    const greenFill = ctx.createLinearGradient(0, 0, 0, 200);
    greenFill.addColorStop(0, "rgba(5, 150, 105, 0.15)");
    greenFill.addColorStop(1, "rgba(5, 150, 105, 0.0)");
    
    datasets = [
      {
        label: "Relative Humidity (%)",
        data: humidities,
        borderColor: "#059669", // Emerald
        borderWidth: 2,
        pointBackgroundColor: "#059669",
        pointBorderColor: "#fff",
        pointRadius: 3,
        fill: true,
        backgroundColor: greenFill,
        yAxisID: "yHum",
        tension: 0.4
      },
      {
        label: `Dew Point (${isF ? "°F" : "°C"})`,
        data: dewPoints,
        borderColor: "#7c3aed", // Purple
        borderWidth: 2,
        pointBackgroundColor: "#7c3aed",
        pointBorderColor: "#fff",
        pointRadius: 3,
        yAxisID: "yDew",
        tension: 0.4
      }
    ];
    
    scales = {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.03)", borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#64748b", font: { family: "Outfit", size: 8 } }
      },
      yHum: {
        type: "linear",
        position: "left",
        grid: { color: "rgba(0, 0, 0, 0.03)", borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          color: "#059669",
          font: { family: "Outfit", size: 9, weight: "bold" },
          callback: function(value) { return value + "%"; }
        }
      },
      yDew: {
        type: "linear",
        position: "right",
        grid: { drawOnChartArea: false, borderColor: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          color: "#7c3aed",
          font: { family: "Outfit", size: 9, weight: "bold" },
          callback: function(value) { return value + "°"; }
        }
      }
    };
  }

  // Draw chart in Light Mode tokens
  state.chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: hours,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#64748b",
            font: { family: "Outfit", size: 10, weight: "600" },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleFont: { family: "Outfit", weight: "700", color: "#0f172a" },
          bodyFont: { family: "Outfit", color: "#334155" },
          borderColor: "rgba(0, 0, 0, 0.08)",
          borderWidth: 1,
          titleColor: "#0f172a",
          bodyColor: "#334155",
          boxWidth: 10,
          boxHeight: 10
        }
      },
      scales: scales
    }
  });
}
