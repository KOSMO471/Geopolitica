
let settings = {
    volume: 80,
    theme: 'dark',
    msgFilter: 'all'  
};
const SETTINGS_FILE = 'Geo_settings.json';

function loadSettings() {
    try {
        const saved = localStorage.getItem('geopolitica_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            settings = { ...settings, ...parsed };
        }
    } catch(e) {}
    applySettings();
}

function saveSettingsToDisk() {
    // JSON dosyası olarak indir
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = SETTINGS_FILE;
    a.click();
    URL.revokeObjectURL(url);    localStorage.setItem('geopolitica_settings', JSON.stringify(settings));
}

function resetSettings() {
    settings = { volume: 80, theme: 'dark', msgFilter: 'all' };
    applySettings();
    // UI'daki değerleri güncelle
    document.getElementById('settings-volume').value = settings.volume;
    document.getElementById('settings-theme').value = settings.theme;
    document.getElementById('settings-msgfilter').value = settings.msgFilter;
}

function applySettings() {
    // Ayarlar objesinden gelen tema değerini body elementine sınıf olarak atar
    document.body.className = settings.theme;
    // Ses seviyesi
    if (audioCtx) {
        // gain düzenlemesi yapılabilir, şimdilik sadece bir global değişken
        soundEnabled = settings.volume > 0;
    }
    // Tema (CSS class ekleme/çıkarma)
    document.body.className = settings.theme;
    // Mesaj filtresi (global değişken)
    window.msgFilter = settings.msgFilter;
}

// ---- DEĞİŞKENLER ----
let playerFaction = null;
let selectedNode = null;
let canvas, ctx;
let zoom = 1.0, panX = 0, panY = 0;
let isDragging = false, startX, startY, hasMoved = false;
let showCanvasUI = true;
let gameWon = false;
let mapImage = null, mapLoaded = false;
let discoveredBases = {};
let discoveredArmies = {};
let armies = [];
let merchantShips = [];
let airUnits = [];
let spies = [];
let guerrillaUnits = [];
let satellites = [];
let spaceStations = {};
let missileDefenses = {};
let tradeRoutes = [];
let taxTimer = 0, factoryTimer = 0, inflationTimer = 0, unTimer = 0, eventTimer = 0, climateTimer = 0;
let embargoActive = false;
let economicSanctions = {};
let radarStations = {};
let navalBases = {};
let warReport = { battles: 0, wins: 0, losses: 0, totalCasualties: 0 };
let soundEnabled = true;
let globalEvent = null;
let eventDuration = 0;
let climateState = 0;
let climateDuration = 0;
let peaceTreaties = {};
let onlineLobbyActive = false;
let lobbyPlayers = [];
let audioCtx = null;
let autoSaveInterval = null;

let techTree = {
    land_speed: { level: 0, max: 10, cost: 400, label: 'Kara Hız', researchTime: 150 },
    naval_speed: { level: 0, max: 10, cost: 500, label: 'Deniz Hız', researchTime: 300 },
    air_power: { level: 0, max: 10, cost: 600, label: 'Hava Gücü', researchTime: 500 },
    refinery_eff: { level: 0, max: 10, cost: 700, label: 'Rafineri Verim', researchTime: 300 },
    tank_tech: { level: 0, max: 2, cost: 1500, label: 'Tank Tek.', researchTime: 500},
    artillery_tech: { level: 0, max: 2, cost: 1000, label: 'Topçu Tek.', researchTime: 500},
    spy_tech: { level: 0, max: 2, cost: 1000, label: 'Casusluk', researchTime: 450},
    space_tech: { level: 0, max: 2, cost: 5000, label: 'Uzay Tek', researchTime: 1000}
};
let relationsScore = {};
let nonAggressionPacts = {};
let vassalStates = {};
let blockades = {};
let airDefenses = {};
let unSanction = false;
let techLevel = { land: 0, naval: 0, air: 0, spy: 0, space: 0 };

const TAX_INTERVAL = 300;
const FACTORY_INTERVAL = 150;
const INFLATION_INTERVAL = 800;
const UN_INTERVAL = 1500;
const EVENT_INTERVAL = 1200;
const CLIMATE_INTERVAL = 2000;
const AI_TICK_INTERVAL = 5000;
const GAME_TICK_INTERVAL = 100;

// ---- FRAKSİYONLAR (EKSİKSİZ) ----
const factions = {
    "TUR": { name: "Türkiye", type: "country", color: "#3182ce", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 2500, arms: 180, oil: 60, steel: 50,  fighters: 3, food: 200 },
    "GRC": { name: "Yunanistan", type: "country", color: "#2b6cb0", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1400, arms: 120, oil: 20, steel: 40, fighters: 3, food: 120 },
    "BGR": { name: "Bulgaristan", type: "country", color: "#e2e8f0", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 800, arms: 60, oil: 10, steel: 30, fighters: 1, food: 80 },
    "ROU": { name: "Romanya", type: "country", color: "#9b2c2c", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1000, arms: 80, oil: 30, steel: 35, fighters: 2, food: 100 },
    "SRB": { name: "Sırbistan", type: "country", color: "#2f855a", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 700, arms: 50, oil: 5, steel: 25, fighters: 1, food: 70 },
    "HRV": { name: "Hırvatistan", type: "country", color: "#2c5282", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 900, arms: 60, oil: 10, steel: 30, fighters: 2, food: 90 },
    "ALB": { name: "Arnavutluk", type: "country", color: "#234e52", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 500, arms: 30, oil: 0, steel: 10, fighters: 0, food: 50 },
    "ITA": { name: "İtalya", type: "country", color: "#38a169", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 2000, arms: 200, oil: 30, steel: 60, fighters: 5, food: 180 },
    "ESP": { name: "İspanya", type: "country", color: "#d69e2e", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1800, arms: 150, oil: 20, steel: 50, fighters: 4, food: 160 },
    "FRA": { name: "Fransa", type: "country", color: "#9f7aea", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 3000, arms: 300, oil: 40, steel: 80, fighters: 8, food: 250 },
    "DEU": { name: "Almanya", type: "country", color: "#d53f8c", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 3500, arms: 350, oil: 50, steel: 100,  fighters: 10, food: 280 },
    "POL": { name: "Polonya", type: "country", color: "#ed8936", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1500, arms: 150, oil: 20, steel: 50,  fighters: 4, food: 140 },
    "UKR": { name: "Ukrayna", type: "country", color: "#ecc94b", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1200, arms: 120, oil: 30, steel: 40,  fighters: 3, food: 180 },
    "RUS": { name: "Rusya", type: "country", color: "#1a365d", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 8000, arms: 800, oil: 1200, steel: 300,  fighters: 20, food: 500 },
    "GBR": { name: "İngiltere", type: "country", color: "#2b6cb0", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 3000, arms: 280, oil: 60, steel: 70,  fighters: 7, food: 220 },
    "KAZ": { name: "Kazakistan", type: "country", color: "#d69e2e", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1600, arms: 110, oil: 400, steel: 80,  fighters: 3, food: 150 },
    "UZB": { name: "Özbekistan", type: "country", color: "#9f7aea", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 900, arms: 70, oil: 30, steel: 40,  fighters: 1, food: 100 },
    "TKM": { name: "Türkmenistan", type: "country", color: "#d53f8c", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 800, arms: 60, oil: 250, steel: 30,  fighters: 1, food: 80 },
    "KGZ": { name: "Kırgızistan", type: "country", color: "#ed8936", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 600, arms: 40, oil: 5, steel: 20, fighters: 0, food: 60 },
    "TJK": { name: "Tacikistan", type: "country", color: "#ecc94b", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 500, arms: 35, oil: 0, steel: 15, fighters: 0, food: 50 },
    "CHN": { name: "Çin", type: "country", color: "#c53030", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 10000, arms: 1000, oil: 500, steel: 400, fighters: 30, food: 800 },
    "IND": { name: "Hindistan", type: "country", color: "#744210", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 5000, arms: 500, oil: 200, steel: 150, fighters: 15, food: 600 },
    "IRN": { name: "İran", type: "country", color: "#2f855a", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 2200, arms: 220, oil: 500, steel: 100, fighters: 4, food: 200 },
    "SAU": { name: "Suudi Arabistan", type: "country", color: "#cca43b", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 6000, arms: 450, oil: 900, steel: 150, fighters: 6, food: 150 },
    "EGY": { name: "Mısır", type: "country", color: "#9c4221", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1700, arms: 260, oil: 150, steel: 70, fighters: 4, food: 300 },
    "DZA": { name: "Cezayir", type: "country", color: "#2b6cb0", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1200, arms: 150, oil: 200, steel: 40, fighters: 2, food: 150 },
    "MAR": { name: "Fas", type: "country", color: "#2f855a", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 1100, arms: 80, oil: 50, steel: 35, fighters: 2, food: 140 },
    "PKK": { name: "Özgürlükçüler", type: "org", color: "#b83280", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 400, arms: 120, oil: 0, steel: 5, fighters: 0, food: 30 },
    "ISIS": { name: "Radikaller", type: "org", color: "#000000", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 600, arms: 180, oil: 50, steel: 15, fighters: 0, food: 40 },
    "HAM": { name: "Barışçılar", type: "org", color: "#276749", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 400, arms: 110, oil: 0, steel: 8, fighters: 0, food: 35 },
    "HIZ": { name: "Savaşçılar", type: "org", color: "#38a169", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 650, arms: 200, oil: 0, steel: 20, fighters: 0, food: 40 },
    "AQ": { name: "Kaçaklar", type: "org", color: "#4a5568", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 500, arms: 150, oil: 10, steel: 10, fighters: 0, food: 25 },
    "TAL": { name: "Efeler", type: "org", color: "#2d3748", borderAccess: {}, relations: {}, alliances: {}, treaties: {}, money: 450, arms: 200, oil: 5, steel: 8, fighters: 0, food: 30 }
};

// ---- ŞEHİRLER (EKSİKSİZ) ----
const mapNodes = [
    { id: "ankara", name: "Ankara", faction: "TUR", isCapital: true, isSea: false, isCoastal: false, terrain: "PLATEAU", pop: 5500000, x: 500, y: 290, garrison: 30000, industry: 25, resourceBonus: { steel: 2 }, refinery: false, neighbors: ["istanbul", "izmir", "diyarbakir"] },
    { id: "istanbul", name: "İstanbul", faction: "TUR", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 16000000, x: 440, y: 220, garrison: 20000, industry: 40, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["ankara", "edirne", "bursa"] },
    { id: "izmir", name: "İzmir", faction: "TUR", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 4500000, x: 410, y: 310, garrison: 15000, industry: 20, resourceBonus: {}, refinery: false, neighbors: ["ankara", "antalya", "athens"] },
    { id: "diyarbakir", name: "Diyarbakır", faction: "TUR", isCapital: false, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 1800000, x: 540, y: 300, garrison: 12000, industry: 10, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["ankara", "pkk_camp", "halep"] },
    { id: "edirne", name: "Edirne", faction: "TUR", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1500000, x: 400, y: 190, garrison: 8000, industry: 12, resourceBonus: {}, refinery: false, neighbors: ["istanbul", "sofia"] },
    { id: "bursa", name: "Bursa", faction: "TUR", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 3000000, x: 450, y: 250, garrison: 10000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["istanbul", "izmir"] },
    { id: "antalya", name: "Antalya", faction: "TUR", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 2500000, x: 460, y: 340, garrison: 9000, industry: 15, resourceBonus: {}, refinery: false, neighbors: ["izmir", "lefkosa"] },
    { id: "athens", name: "Atina", faction: "GRC", isCapital: true, isSea: false, isCoastal: false, terrain: "HILLY", pop: 4000000, x: 370, y: 350, garrison: 18000, industry: 28, resourceBonus: {}, refinery: false, neighbors: ["izmir", "tirana", "lefkosa"] },
    { id: "thessaloniki", name: "Selanik", faction: "GRC", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1500000, x: 390, y: 300, garrison: 10000, industry: 16, resourceBonus: {}, refinery: false, neighbors: ["athens", "sofia"] },
    { id: "sofia", name: "Sofya", faction: "BGR", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 1500000, x: 380, y: 250, garrison: 12000, industry: 20, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["edirne", "thessaloniki", "bucharest"] },
    { id: "bucharest", name: "Bükreş", faction: "ROU", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 2000000, x: 430, y: 200, garrison: 15000, industry: 25, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["sofia", "budapest", "chisinau"] },
    { id: "belgrade", name: "Belgrad", faction: "SRB", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1500000, x: 340, y: 200, garrison: 12000, industry: 20, resourceBonus: {}, refinery: false, neighbors: ["budapest", "zagreb", "sofia"] },
    { id: "zagreb", name: "Zagreb", faction: "HRV", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 1000000, x: 300, y: 180, garrison: 10000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["belgrade", "ljubljana", "budapest"] },
    { id: "tirana", name: "Tiran", faction: "ALB", isCapital: true, isSea: false, isCoastal: false, terrain: "HILLY", pop: 800000, x: 340, y: 290, garrison: 8000, industry: 15, resourceBonus: {}, refinery: false, neighbors: ["athens", "skopje"] },
    { id: "rome", name: "Roma", faction: "ITA", isCapital: true, isSea: false, isCoastal: false, terrain: "HILLY", pop: 3000000, x: 270, y: 320, garrison: 25000, industry: 35, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["milan", "napoli"] },
    { id: "milan", name: "Milano", faction: "ITA", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1500000, x: 250, y: 270, garrison: 12000, industry: 22, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["rome", "zurich"] },
    { id: "napoli", name: "Napoli", faction: "ITA", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1000000, x: 280, y: 360, garrison: 10000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["rome"] },
    { id: "madrid", name: "Madrid", faction: "ESP", isCapital: true, isSea: false, isCoastal: false, terrain: "PLATEAU", pop: 3000000, x: 120, y: 270, garrison: 22000, industry: 30, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["barcelona", "lisbon"] },
    { id: "barcelona", name: "Barselona", faction: "ESP", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 2000000, x: 160, y: 240, garrison: 14000, industry: 20, resourceBonus: {}, refinery: false, neighbors: ["madrid", "marseille"] },
    { id: "lisbon", name: "Lizbon", faction: "ESP", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1500000, x: 80, y: 290, garrison: 10000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["madrid"] },
    { id: "paris", name: "Paris", faction: "FRA", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 12000000, x: 180, y: 170, garrison: 35000, industry: 50, resourceBonus: { steel: 2, }, refinery: false, neighbors: ["marseille", "lyon", "brussels", "london"] },
    { id: "marseille", name: "Marsilya", faction: "FRA", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1500000, x: 200, y: 220, garrison: 15000, industry: 20, resourceBonus: {}, refinery: false, neighbors: ["paris", "barcelona", "nice"] },
    { id: "lyon", name: "Lyon", faction: "FRA", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1500000, x: 190, y: 200, garrison: 12000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["paris", "marseille"] },
    { id: "nice", name: "Nice", faction: "FRA", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1000000, x: 220, y: 230, garrison: 10000, industry: 16, resourceBonus: {}, refinery: false, neighbors: ["marseille", "monaco"] },
    { id: "berlin", name: "Berlin", faction: "DEU", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 4000000, x: 250, y: 120, garrison: 30000, industry: 45, resourceBonus: { steel: 2, }, refinery: false, neighbors: ["hamburg", "munich", "warsaw"] },
    { id: "hamburg", name: "Hamburg", faction: "DEU", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 2000000, x: 230, y: 100, garrison: 15000, industry: 25, resourceBonus: {}, refinery: false, neighbors: ["berlin", "copenhagen"] },
    { id: "munich", name: "Münih", faction: "DEU", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1500000, x: 270, y: 160, garrison: 14000, industry: 22, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["berlin", "zurich", "prague"] },
    { id: "warsaw", name: "Varşova", faction: "POL", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 2000000, x: 310, y: 130, garrison: 20000, industry: 28, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["berlin", "minsk", "prague"] },
    { id: "krakow", name: "Krakow", faction: "POL", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1000000, x: 330, y: 160, garrison: 12000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["warsaw", "lviv"] },
    { id: "kyiv", name: "Kiev", faction: "UKR", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 3000000, x: 420, y: 140, garrison: 25000, industry: 30, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["lviv", "minsk", "chisinau"] },
    { id: "lviv", name: "Lviv", faction: "UKR", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1000000, x: 390, y: 170, garrison: 10000, industry: 16, resourceBonus: {}, refinery: false, neighbors: ["kyiv", "krakow", "chisinau"] },
    { id: "moscow", name: "Moskova", faction: "RUS", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 15000000, x: 500, y: 70, garrison: 80000, industry: 70, resourceBonus: { steel: 4 }, refinery: false, neighbors: ["stpetersburg", "minsk", "kazan", "volgograd"] },
    { id: "stpetersburg", name: "St. Petersburg", faction: "RUS", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 5000000, x: 440, y: 30, garrison: 30000, industry: 35, resourceBonus: {}, refinery: false, neighbors: ["moscow", "helsinki"] },
    { id: "kazan", name: "Kazan", faction: "RUS", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1000000, x: 570, y: 90, garrison: 15000, industry: 20, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["moscow", "ekaterinburg"] },
    { id: "volgograd", name: "Volgograd", faction: "RUS", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1000000, x: 540, y: 160, garrison: 14000, industry: 18, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["moscow", "astana"] },
    { id: "london", name: "Londra", faction: "GBR", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 9000000, x: 140, y: 120, garrison: 40000, industry: 50, resourceBonus: { steel: 2 }, refinery: false, neighbors: ["paris", "edinburgh"] },
    { id: "edinburgh", name: "Edinburgh", faction: "GBR", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 1000000, x: 120, y: 90, garrison: 12000, industry: 18, resourceBonus: {}, refinery: false, neighbors: ["london", "dublin"] },
    { id: "astana", name: "Astana", faction: "KAZ", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 1200000, x: 780, y: 140, garrison: 20000, industry: 30, resourceBonus: { oil: 2, steel: 1 }, refinery: false, neighbors: ["volgograd", "tashkent", "almaty"] },
    { id: "almaty", name: "Almatı", faction: "KAZ", isCapital: false, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 1500000, x: 820, y: 210, garrison: 15000, industry: 22, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["astana", "tashkent", "bishkek"] },
    { id: "tashkent", name: "Taşkent", faction: "UZB", isCapital: true, isSea: false, isCoastal: false, terrain: "DESERT", pop: 2500000, x: 760, y: 240, garrison: 15000, industry: 22, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["astana", "almaty", "dushanbe"] },
    { id: "ashgabat", name: "Aşkabat", faction: "TKM", isCapital: true, isSea: false, isCoastal: false, terrain: "DESERT", pop: 1000000, x: 710, y: 220, garrison: 12000, industry: 20, resourceBonus: { oil: 2 }, refinery: false, neighbors: ["tehran", "dushanbe"] },
    { id: "bishkek", name: "Bişkek", faction: "KGZ", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 1000000, x: 800, y: 270, garrison: 10000, industry: 18, resourceBonus: { steel: 1 }, refinery: false, neighbors: ["almaty", "dushanbe"] },
    { id: "dushanbe", name: "Duşanbe", faction: "TJK", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 800000, x: 780, y: 300, garrison: 9000, industry: 16, resourceBonus: {}, refinery: false, neighbors: ["tashkent", "ashgabat", "bishkek"] },
    { id: "beijing", name: "Pekin", faction: "CHN", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 20000000, x: 1400, y: 190, garrison: 100000, industry: 80, resourceBonus: { steel: 5}, refinery: false, neighbors: ["shanghai", "seoul", "harbin", "xi'an"] },
    { id: "shanghai", name: "Şanghay", faction: "CHN", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 25000000, x: 1480, y: 270, garrison: 60000, industry: 70, resourceBonus: { steel: 3}, refinery: false, neighbors: ["beijing", "guangzhou"] },
    { id: "guangzhou", name: "Guangzhou", faction: "CHN", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 15000000, x: 1520, y: 370, garrison: 45000, industry: 50, resourceBonus: { steel: 2 }, refinery: false, neighbors: ["shanghai", "hanoi"] },
    { id: "xi'an", name: "Xi'an", faction: "CHN", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 8000000, x: 1350, y: 250, garrison: 30000, industry: 35, resourceBonus: { steel: 2 }, refinery: false, neighbors: ["beijing", "chengdu"] },
    { id: "chengdu", name: "Chengdu", faction: "CHN", isCapital: false, isSea: false, isCoastal: false, terrain: "HILLY", pop: 10000000, x: 1300, y: 300, garrison: 35000, industry: 30, resourceBonus: {}, refinery: false, neighbors: ["xi'an", "lhasa"] },
    { id: "newdelhi", name: "Yeni Delhi", faction: "IND", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 20000000, x: 1050, y: 340, garrison: 70000, industry: 60, resourceBonus: { steel: 2 }, refinery: false, neighbors: ["karachi", "mumbai", "kolkata"] },
    { id: "mumbai", name: "Mumbai", faction: "IND", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 18000000, x: 1010, y: 400, garrison: 50000, industry: 50, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["newdelhi", "karachi", "hyderabad"] },
    { id: "kolkata", name: "Kolkata", faction: "IND", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 12000000, x: 1120, y: 380, garrison: 40000, industry: 40, resourceBonus: {}, refinery: false, neighbors: ["newdelhi", "dhaka", "hyderabad"] },
    { id: "hyderabad", name: "Hyderabad", faction: "IND", isCapital: false, isSea: false, isCoastal: false, terrain: "PLATEAU", pop: 8000000, x: 1050, y: 430, garrison: 30000, industry: 30, resourceBonus: {}, refinery: false, neighbors: ["mumbai", "kolkata", "chennai"] },
    { id: "chennai", name: "Chennai", faction: "IND", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 10000000, x: 1080, y: 470, garrison: 35000, industry: 32, resourceBonus: {}, refinery: false, neighbors: ["hyderabad"] },
    { id: "tehran", name: "Tahran", faction: "IRN", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 15000000, x: 650, y: 310, garrison: 40000, industry: 50, resourceBonus: { oil: 2, steel: 2 }, refinery: false, neighbors: ["ashgabat", "isfahan", "tabriz"] },
    { id: "isfahan", name: "İsfahan", faction: "IRN", isCapital: false, isSea: false, isCoastal: false, terrain: "DESERT", pop: 3000000, x: 670, y: 350, garrison: 15000, industry: 22, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["tehran", "shiraz"] },
    { id: "tabriz", name: "Tebriz", faction: "IRN", isCapital: false, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 2000000, x: 600, y: 280, garrison: 12000, industry: 18, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["tehran", "pkk_camp"] },
    { id: "riyadh", name: "Riyad", faction: "SAU", isCapital: true, isSea: false, isCoastal: false, terrain: "DESERT", pop: 8000000, x: 570, y: 510, garrison: 45000, industry: 40, resourceBonus: { oil: 4 }, refinery: false, neighbors: ["doha", "basra", "jeddah"] },
    { id: "jeddah", name: "Cidde", faction: "SAU", isCapital: false, isSea: false, isCoastal: false, terrain: "DESERT", pop: 4000000, x: 520, y: 530, garrison: 20000, industry: 25, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["riyadh", "mecca"] },
    { id: "cairo", name: "Kahire", faction: "EGY", isCapital: true, isSea: false, isCoastal: false, terrain: "DESERT", pop: 20000000, x: 330, y: 510, garrison: 30000, industry: 35, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["alexandria", "khartoum"] },
    { id: "alexandria", name: "İskenderiye", faction: "EGY", isCapital: false, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 5000000, x: 310, y: 490, garrison: 18000, industry: 22, resourceBonus: {}, refinery: false, neighbors: ["cairo", "tripoli"] },
    { id: "algiers", name: "Cezayir", faction: "DZA", isCapital: true, isSea: false, isCoastal: false, terrain: "HILLY", pop: 4500000, x: 170, y: 440, garrison: 20000, industry: 28, resourceBonus: { oil: 2 }, refinery: false, neighbors: ["tripoli", "rabat"] },
    { id: "rabat", name: "Rabat", faction: "MAR", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 4000000, x: 110, y: 420, garrison: 15000, industry: 20, resourceBonus: { oil: 1}, refinery: false, neighbors: ["algiers", "marrakech"] },
    { id: "med_sea", name: "Akdeniz", faction: "NEUTRAL", isCapital: false, isSea: true, isCoastal: false, terrain: "SEA", pop: 0, x: 400, y: 390, garrison: 0, industry: 0, resourceBonus: {}, refinery: false, neighbors: [] },
    { id: "black_sea", name: "Karadeniz", faction: "NEUTRAL", isCapital: false, isSea: true, isCoastal: false, terrain: "SEA", pop: 0, x: 440, y: 170, garrison: 0, industry: 0, resourceBonus: {}, refinery: false, neighbors: [] },
    { id: "caspian_sea", name: "Hazar Denizi", faction: "NEUTRAL", isCapital: false, isSea: true, isCoastal: false, terrain: "SEA", pop: 0, x: 610, y: 230, garrison: 0, industry: 0, resourceBonus: {}, refinery: false, neighbors: [] },
    { id: "pkk_camp", name: "Kandil", faction: "PKK", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 20000, x: 560, y: 280, garrison: 9000, industry: 5, isOrgBase: true, resourceBonus: {}, refinery: false, neighbors: ["diyarbakir", "tabriz"] },
    { id: "isis_camp", name: "Anbar", faction: "ISIS", isCapital: true, isSea: false, isCoastal: false, terrain: "DESERT", pop: 30000, x: 530, y: 390, garrison: 11000, industry: 6, isOrgBase: true, resourceBonus: { oil: 1 }, refinery: false, neighbors: ["bagdat", "basra"] },
    { id: "hamas_hq", name: "Gazze", faction: "HAM", isCapital: true, isSea: false, isCoastal: false, terrain: "PLAIN", pop: 40000, x: 440, y: 470, garrison: 14000, industry: 8, isOrgBase: true, resourceBonus: {}, refinery: false, neighbors: ["cairo", "amman"] },
    { id: "hizbullah_hq", name: "Bekaa", faction: "HIZ", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 50000, x: 450, y: 410, garrison: 15000, industry: 7, isOrgBase: true, resourceBonus: {}, refinery: false, neighbors: ["damascus", "beyrut"] },
    { id: "aq_hq", name: "Afganistan", faction: "AQ", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 60000, x: 720, y: 360, garrison: 12000, industry: 6, isOrgBase: true, resourceBonus: {}, refinery: false, neighbors: ["kabul", "karachi"] },
    { id: "tal_hq", name: "Kandahar", faction: "TAL", isCapital: true, isSea: false, isCoastal: false, terrain: "MOUNTAIN", pop: 50000, x: 750, y: 400, garrison: 15000, industry: 5, isOrgBase: true, resourceBonus: {}, refinery: false, neighbors: ["kabul", "karachi"] }
];

// Bağlantıları iki yönlü yap
mapNodes.forEach(n => {
    if (n.neighbors) {
        n.neighbors.forEach(nid => {
            const neighbor = mapNodes.find(m => m.id === nid);
            if (neighbor && (!neighbor.neighbors || !neighbor.neighbors.includes(n.id))) {
                if (!neighbor.neighbors) neighbor.neighbors = [];
                neighbor.neighbors.push(n.id);
            }
        });
    }
});

// ---- FİLTRE FONKSİYONLARI ----
function isAllyOrPlayer(factionCode) {
    if (!playerFaction) return false;
    if (factionCode === playerFaction) return true;
    if (factions[playerFaction] && factions[playerFaction].alliances && factions[playerFaction].alliances[factionCode]) return true;
    return false;
}

function isUnitVisible(unit) {
    if (!playerFaction) return true;
    if (unit.id && mapNodes.some(n => n.id === unit.id)) return true;
    if (unit.isOrgBase && discoveredBases[unit.id]) return true;
    if (unit.owner) {
        if (unit.owner === playerFaction) return true;
        if (factions[playerFaction] && factions[playerFaction].alliances && factions[playerFaction].alliances[unit.owner]) return true;
        if (discoveredArmies[unit.id]) return true;
        for (let rid in radarStations) {
            const r = radarStations[rid];
            if (Math.hypot(unit.x - r.x, unit.y - r.y) < 120) return true;
        }
        for (let s of satellites) {
            if (s.active && Math.hypot(unit.x - s.x, unit.y - s.y) < 200) return true;
        }
        return false;
    }
    return true;
}

function addLogFiltered(text, color, node, sourceFaction) {
    if (!playerFaction) { addLog(text, color); return; }
    let show = false;
    const filter = window.msgFilter || 'all';
    if (filter === 'all') show = true;
    else if (filter === 'self') {
        // Sadece oyuncuyu ilgilendirenler (node veya sourceFaction oyuncu veya müttefiki değilse gösterme)
        if (sourceFaction === playerFaction) show = true;
        else if (node && node.faction === playerFaction) show = true;
        else if (node && node.faction && factions[playerFaction] && factions[playerFaction].alliances[node.faction]) show = true;
        else if (sourceFaction && factions[playerFaction] && factions[playerFaction].alliances[sourceFaction]) show = true;
        else show = false;
    } else if (filter === 'allies') {
        // Müttefikler ve oyuncu
        if (sourceFaction === playerFaction) show = true;
        else if (node && node.faction === playerFaction) show = true;
        else if (sourceFaction && factions[playerFaction] && factions[playerFaction].alliances[sourceFaction]) show = true;
        else if (node && node.faction && factions[playerFaction] && factions[playerFaction].alliances[node.faction]) show = true;
        else show = false;
    }
    if (show) addLog(text, color);
}

function addLog(text, color) {
    const ticker = document.getElementById("notification-ticker");
    const log = document.createElement("div");
    log.className = "ticker-log";
    log.style.color = color || "#c9d1d9";
    log.innerHTML = text;
    ticker.appendChild(log);
    if (ticker.children.length > 25) ticker.removeChild(ticker.firstChild);
    playSound('click');
}

// ---- SES SİSTEMİ ----
function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        let freq = 400, dur = 100, wave = 'sine';
        if (type === 'click') { freq = 600; dur = 80; }
        else if (type === 'explosion') { freq = 150; dur = 300; wave = 'sawtooth'; }
        else if (type === 'bombardment') { freq = 200; dur = 400; wave = 'square'; }
        else if (type === 'war') { freq = 100; dur = 600; wave = 'sawtooth'; }
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur/1000);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur/1000);
    } catch(e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    addLog(`🔊 Ses ${soundEnabled ? 'açıldı' : 'kapatıldı'}`, "#58a6ff");
}

// ---- YARDIMCI FONKSİYONLAR ----
function buildTradeDropdown() {
    const sel = document.getElementById("trade-target-select");
    sel.innerHTML = "";
    const coastal = mapNodes.filter(n => n.isCoastal && !n.isSea && n.faction !== playerFaction);
    coastal.forEach(n => {
        const opt = document.createElement("option");
        opt.value = n.id;
        opt.text = `${n.name} (${factions[n.faction].name})`;
        sel.appendChild(opt);
    });
}

function loadMapImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() { mapImage = img; mapLoaded = true; document.getElementById("mapStatus").innerHTML = "✅ Yüklendi!"; drawMap(); };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => { if (playerFaction) saveGame(); }, 30000);
}

function saveGame() {
    const data = {
        playerFaction, factions, mapNodes, armies, merchantShips, airUnits, spies, guerrillaUnits, satellites,
        discoveredBases, discoveredArmies, gameWon, zoom, panX, panY,
        techLevel, blockades, airDefenses, unSanction, radarStations, navalBases, spaceStations, missileDefenses,
        tradeRoutes, embargoActive, techTree, relationsScore,
        nonAggressionPacts, vassalStates, warReport, globalEvent, eventDuration,
        climateState, climateDuration, peaceTreaties, economicSanctions, lobbyPlayers, onlineLobbyActive
    };
    localStorage.setItem('geopolitica_save', JSON.stringify(data));
    addLog("💾 Kaydedildi.", "#58a6ff");
}

function loadGame() {
    const raw = localStorage.getItem('geopolitica_save');
    if (!raw) { alert("Kayıt yok."); return; }
    try {
        const data = JSON.parse(raw);
        Object.assign(factions, data.factions);
        mapNodes.length = 0; mapNodes.push(...data.mapNodes);
        armies = data.armies.map(a => ({ ...a }));
        merchantShips = data.merchantShips || [];
        airUnits = data.airUnits || [];
        spies = data.spies || [];
        guerrillaUnits = data.guerrillaUnits || [];
        satellites = data.satellites || [];
        discoveredBases = data.discoveredBases || {};
        discoveredArmies = data.discoveredArmies || {};
        gameWon = data.gameWon || false;
        playerFaction = data.playerFaction;
        zoom = data.zoom || 1.0; panX = data.panX || 0; panY = data.panY || 0;
        techLevel = data.techLevel || { land: 0, naval: 0, air: 0, spy: 0, space: 0 };
        blockades = data.blockades || {};
        airDefenses = data.airDefenses || {};
        unSanction = data.unSanction || false;
        radarStations = data.radarStations || {};
        navalBases = data.navalBases || {};
        spaceStations = data.spaceStations || {};
        missileDefenses = data.missileDefenses || {};
        tradeRoutes = data.tradeRoutes || [];
        embargoActive = data.embargoActive || false;
        techTree = data.techTree || techTree;
        relationsScore = data.relationsScore || {};
        nonAggressionPacts = data.nonAggressionPacts || {};
        vassalStates = data.vassalStates || {};
        warReport = data.warReport || { battles: 0, wins: 0, losses: 0, totalCasualties: 0 };
        globalEvent = data.globalEvent || null;
        eventDuration = data.eventDuration || 0;
        climateState = data.climateState || 0;
        climateDuration = data.climateDuration || 0;
        peaceTreaties = data.peaceTreaties || {};
        economicSanctions = data.economicSanctions || {};
        lobbyPlayers = data.lobbyPlayers || [];
        onlineLobbyActive = data.onlineLobbyActive || false;
        document.getElementById("start-screen").style.display = "none";
        document.getElementById("game-container").style.display = "flex";
        document.getElementById("current-faction").innerText = factions[playerFaction].name;
        buildTradeDropdown();
        updateLedger();
        updateTechUI();
        updateTradeRoutesUI();
        updateAirUI();
        updateWarReport();
        updateSpaceUI();
        updateGuerrillaUI();
        updateClimateUI();
        addLog("💾 Yüklendi.", "#58a6ff");
        drawMap();
        startAutoSave();
    } catch(e) { alert("Kayıt bozuk!" + e); }
}

// ---- BAŞLATMA (Liste doldurma düzeltildi) ----
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-play').addEventListener('click', function() {
    // Mevcut start ekranındaki fraksiyon seçimini göster, oyun başlatma işlemini yap
    // Eğer zaten bir fraksiyon seçili değilse uyarı ver
    if (!playerFaction) { alert("Lütfen bir fraksiyon seçin!"); return; }
    startGame();
});

document.getElementById('btn-tutorial').addEventListener('click', function() {
    document.getElementById('tutorial-modal').style.display = 'flex';
    // İçeriği doldur
    document.getElementById('tutorial-content').innerHTML = `
        <h3>GEOPOLITICA - Temel Kılavuz</h3>
        <p>Bu oyunda bir ülke veya örgütü yönetiyorsunuz. Amaç tüm başkentleri ele geçirerek dünya hakimiyeti kurmak.</p>
        <ul>
            <li>Diplomasi, yanınızda güçlü bir ordu yoksa sadece boş bir gürültüdür.</li>
            <li>1. Ekonomi Döngüsü: "Para Yoksa, Ordu da Yok!"</li>
            <li>Oyundaki en büyük gücün hazinen ve kaynak stoklarındır.</li>
            <li>Elindeki kaynakları (Demir, Petrol, Teknoloji) satarken dikkat et! Bir kaynağı ne kadar çok satarsan, piyasadaki değeri o kadar düşer </li>
            <li>İhtiyacın olmayan kaynakları piyasa fiyatı yüksekken elden çıkar, ucuza gördüğün kaynağı depola. Sol paneldeki borsa grafiğini her saniye gözünle takip et!</li>
            <li>2. Savaş ve Lojistik: "Sadece Tıklamak Yetmez"</li>
            <li>Savaşı sadece asker sayısı değil, planlama ve lojistik kazanır.</li>
            <li>Bir ülkeye sadece karadan saldırmak intihardır. Önce deniz yollarını kapatıp kaynak akışını kes, ardından hava bombardımanıyla savunmasını zayıflat.</li>
            <li>Gücünü tek bir noktaya yığma; asimetrik tehditlere karşı sınır bölgelerinde her zaman mobil yedek kuvvetler bulundur.</li>
            <li>3. Doğa En Büyük Düşmanın: İklim ve Göç Yönetimi</li>
            <li>Sadece diğer devletlerle değil, gezegenin kendisiyle de savaşıyorsun.</li>
            <li>Haritada beliren kuraklık, sel veya nükleer sızıntı gibi olaylar o bölgenin nüfusunu ve askeri gücünü eritir.</li>
            <li>Felaket bölgelerinden kaçan göçmenler sınırlarına dayanabilir. Onları kabul etmek iş gücü (ekonomi) kazandırır ancak çok hızlı kabul edersen iç istikrarını (stabilite) sıfıra indirip isyanlara yol açabilir.</li>
            <li>4. Gölge Savaşları: İstihbarat ve Asimetrik Tehditler</li>
            <li>Bazen en büyük savaşlar cephede değil, karanlık odalarda verilir.</li>
            <li>Rakip devletlerin teknolojilerini çalmak, ekonomilerini sabote etmek veya iç isyanlar tetiklemek için Spy (Casus) menüsünü aktif kullan.</li>
            <li>Sınırlarında palazlanan ve devlet dışı aktörler olan bağımsız silahlı grupları küçümseme. Doğrudan saldırmak yerine önce onların finansal kaynaklarını kurutmalısın.</li>
            <li>5. Nihai Hedef: "Yıldızlara Ulaşmak" (Uzay Yarışı)</li>
            <li>Dünya üzerindeki kaynaklar sınırlıdır ve er ya da geç tükenecektir.</li>
            <li>Oyunu kazanmanın en prestijli yolu, teknoloji ağacını sonuna kadar geliştirip ilk uzay üssünü kurmaktır.</li>
            <li>Uzay yarışı başladığında diğer tüm ülkeler seni sabote etmek için birleşebilir. Bu yüzden uzay projesine başlamadan önce güçlü bir hava savunma ağı kurduğundan emin ol!</li>
            <li>İyi oyunlar.</li>

        </ul>
        <p><b>İpucu:</b> Haritaya tıklayarak şehir seçin, sağ panelde detayları görün. H ile HUD'u gizleyin/gösterin.</p>
    `;
});

document.getElementById('tutorial-close').addEventListener('click', function() {
    document.getElementById('tutorial-modal').style.display = 'none';
});

document.getElementById('btn-settings').addEventListener('click', function() {
    // Ayarları UI'a yükle
    document.getElementById('settings-volume').value = settings.volume;
    document.getElementById('settings-theme').value = settings.theme;
    document.getElementById('settings-msgfilter').value = settings.msgFilter;
    document.getElementById('settings-modal').style.display = 'flex';
});

document.getElementById('settings-cancel').addEventListener('click', function() {
    // Son kaydedilen ayarlara dön (settings değişkeni zaten güncel)
    document.getElementById('settings-modal').style.display = 'none';
});

document.getElementById('settings-save').addEventListener('click', function() {
    settings.volume = parseInt(document.getElementById('settings-volume').value);
    settings.theme = document.getElementById('settings-theme').value;
    settings.msgFilter = document.getElementById('settings-msgfilter').value;
    saveSettingsToDisk();
    applySettings();
    document.getElementById('settings-modal').style.display = 'none';
    addLog("⚙ Ayarlar kaydedildi.", "#58a6ff");
});

document.getElementById('settings-reset').addEventListener('click', function() {
    if (confirm("Fabrika ayarlarına dönmek istediğinize emin misiniz?")) {
        resetSettings();
        document.getElementById('settings-modal').style.display = 'none';
        addLog("⚙ Ayarlar sıfırlandı.", "#58a6ff");
    }
});

document.getElementById('btn-quit').addEventListener('click', function() {
    if (confirm("Oyundan çıkmak istediğinize emin misiniz?")) {
        window.close(); // Tarayıcıda çalışmaz, ama kullanıcıya mesaj gösterilebilir
        alert("Oyun kapatılıyor... (Tarayıcıda bu işlev sınırlıdır)");
    }
});
    // İlişkileri başlat
    for (let f1 in factions) {
        factions[f1].relations = {};
        factions[f1].borderAccess = {};
        factions[f1].alliances = {};
        factions[f1].treaties = {};
        for (let f2 in factions) {
            if (f1 === f2) continue;
            factions[f1].relations[f2] = "PEACE";
            factions[f1].borderAccess[f2] = false;
            factions[f1].alliances[f2] = false;
            factions[f1].treaties[f2] = false;
            const key = f1 < f2 ? f1 + '_' + f2 : f2 + '_' + f1;
            if (!relationsScore[key]) relationsScore[key] = 0;
        }
    }
    mapNodes.forEach(n => { if (n.isOrgBase) discoveredBases[n.id] = false; });

    // ---- LİSTE DOLDURMA (DÜZELTİLDİ) ----
    const cList = document.getElementById('country-select-list');
    const oList = document.getElementById('org-select-list');
    
    if (!cList || !oList) {
        console.error('❌ Liste elementleri bulunamadı!');
        return;
    }

    cList.innerHTML = '';
    oList.innerHTML = '';

    for (let code in factions) {
        const fac = factions[code];
        if (!fac) continue;

        const div = document.createElement('div');
        div.className = 'faction-option';
        div.innerText = fac.name;
        div.dataset.code = code;

        div.onclick = function() {
            document.querySelectorAll('.faction-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            playerFaction = code;
            const btn = document.getElementById('btn-start-game');
            btn.innerText = `${fac.name} Olarak Başla`;
            btn.disabled = false;
        };

        if (fac.type === 'country') {
            cList.appendChild(div);
        } else if (fac.type === 'org') {
            oList.appendChild(div);
        }
    }

    console.log(`✅ Ülkeler: ${cList.children.length}, Örgütler: ${oList.children.length}`);

    // ---- DİĞER BAŞLATMA İŞLEMLERİ ----
    canvas = document.getElementById("geoMap");
    ctx = canvas.getContext("2d");

    canvas.addEventListener('mousedown', e => { isDragging = true; hasMoved = false; startX = e.clientX - panX; startY = e.clientY - panY; });
    canvas.addEventListener('mousemove', e => { if (isDragging) { panX = e.clientX - startX; panY = e.clientY - startY; hasMoved = true; } });
    canvas.addEventListener('mouseup', e => { isDragging = false; if (!hasMoved) handleMapClick(e); });
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const mapX = (mouseX - panX)/zoom, mapY = (mouseY - panY)/zoom;
        if (e.deltaY < 0) zoom *= 1.1; else zoom /= 1.1;
        zoom = Math.max(0.4, Math.min(zoom, 4.0));
        panX = mouseX - mapX*zoom; panY = mouseY - mapY*zoom;
    });
    window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'h') toggleHUD(); });

    setTimeout(() => { generateTradeRoutes(); }, 1000);
});

function startGame() {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-container").style.display = "flex";
    document.getElementById("current-faction").innerText = factions[playerFaction].name;
    mapNodes.forEach(n => { if (n.faction === playerFaction) discoveredBases[n.id] = true; });
    const capital = mapNodes.find(n => n.isCapital && n.faction === playerFaction);
    if (capital) {
        const count = factions[playerFaction].fighters || 0;
        for (let i = 0; i < count; i++) {
            airUnits.push({ id: "air_" + Date.now() + "_" + i, type: 'bomber', status: 'idle', x: capital.x, y: capital.y, returnX: capital.x, returnY: capital.y, targetX: null, targetY: null, progress: 0 });
        }
    }
    buildTradeDropdown();
    updateLedger();
    updateTechUI();
    updateTradeRoutesUI();
    updateAirUI();
    updateWarReport();
    updateSpaceUI();
    updateGuerrillaUI();
    updateClimateUI();
    startAutoSave();
    setInterval(gameTick, GAME_TICK_INTERVAL);
    setInterval(aiTick, AI_TICK_INTERVAL);
    addLog("🛰️ Oyun başladı. H ile HUD.", "#58a6ff");
}

// ---- YENİ ÖZELLİK FONKSİYONLARI ----

// Uzay
function buildSpaceStation() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtini seç!"); return; }
    if (spaceStations[selectedNode.id]) { alert("Zaten uzay üssü var!"); return; }
    if (factions[playerFaction].money < 5000) { alert("5000$ gerekli!"); return; }
    if (techLevel.space < 1) { alert("Uzay teknolojisi gerekli!"); return; }
    factions[playerFaction].money -= 5000;
    spaceStations[selectedNode.id] = true;
    addLogFiltered(`🚀 ${selectedNode.name}'de uzay üssü kuruldu.`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

function buildMissileDefense() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtini seç!"); return; }
    if (missileDefenses[selectedNode.id]) { alert("Zaten füze savunması var!"); return; }
    if (factions[playerFaction].money < 1200) { alert("1200$ gerekli!"); return; }
    if (techLevel.space < 1) { alert("Uzay teknolojisi gerekli!"); return; }
    factions[playerFaction].money -= 1200;
    missileDefenses[selectedNode.id] = true;
    addLogFiltered(`🛡️ ${selectedNode.name}'de füze savunma sistemi kuruldu.`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

function launchSatellite() {
    if (!selectedNode) { alert("Hedef seç!"); return; }
    if (techLevel.space < 1) { alert("Uzay teknolojisi gerekli!"); return; }
    const fac = factions[playerFaction];
    if (fac.money < 10000) { alert("10000$ gerekli!"); return; }
    fac.money -= 800;
    satellites.push({ id: "sat_" + Date.now(), x: selectedNode.x, y: selectedNode.y, active: true, targetNode: selectedNode.id });
    addLogFiltered(`🛰️ Uydu ${selectedNode.name} yörüngesine yerleştirildi.`, "#38bdf8", selectedNode, playerFaction);
    updateLedger();
    updateSpaceUI();
}

function updateSpaceUI() {
    const el = document.getElementById("space-info");
    el.innerHTML = `🛰️ Uydular: ${satellites.filter(s=>s.active).length}<br>🚀 Uzay Üsleri: ${Object.keys(spaceStations).length}<br>🛡️ Füze Savunma: ${Object.keys(missileDefenses).length}`;
}

// Gerilla Savaşı
function startGuerrilla() {
    if (!selectedNode) { alert("Hedef seç!"); return; }
    if (selectedNode.faction === playerFaction || selectedNode.faction === "NEUTRAL") { alert("Düşman veya tarafsız bir hedef seçin!"); return; }
    const fac = factions[playerFaction];
    if (fac.money < 400) { alert("400$ gerekli!"); return; }
    fac.money -= 400;
    guerrillaUnits.push({ id: "guer_" + Date.now(), targetNode: selectedNode.id, progress: 0, damage: 0, active: true });
    addLogFiltered(`🎯 ${selectedNode.name}'de gerilla savaşı başlatıldı.`, "#b83280", selectedNode, playerFaction);
    updateLedger();
    updateGuerrillaUI();
}

function processGuerrilla() {
    guerrillaUnits = guerrillaUnits.filter(g => {
        if (!g.active) return false;
        const target = mapNodes.find(n => n.id === g.targetNode);
        if (!target) return false;
        g.progress += 0.02 + (techLevel.spy || 0) * 0.01;
        if (g.progress >= 1) {
            const dmg = Math.floor(500 + Math.random() * 800);
            target.garrison = Math.max(0, target.garrison - dmg);
            target.industry = Math.max(0, (target.industry || 10) - Math.floor(Math.random() * 5));
            if (target.resourceBonus && target.resourceBonus.oil) target.resourceBonus.oil = Math.max(0, target.resourceBonus.oil - 1);
            addLogFiltered(`💥 Gerilla saldırısı! ${target.name} -${dmg} asker, sanayi azaldı.`, "#da3637", target, playerFaction);
            playSound('explosion');
            g.active = false;
            return false;
        }
        return true;
    });
    updateGuerrillaUI();
}

function updateGuerrillaUI() {
    const el = document.getElementById("guerrilla-info");
    const active = guerrillaUnits.filter(g => g.active);
    el.innerHTML = active.length > 0 ? `Aktif gerilla: ${active.length}` : "Aktif yok";
}

// Barış Antlaşmaları ve Tazminat
function proposePeaceTreaty() {
    if (!selectedNode || selectedNode.faction === "NEUTRAL") { alert("Bir ülke seçin!"); return; }
    const target = selectedNode.faction;
    const my = factions[playerFaction];
    const their = factions[target];
    if (my.relations[target] !== "WAR") { alert("Sadece savaş halinde antlaşma yapılabilir!"); return; }
    if (Math.random() < 0.3) {
        const reparations = Math.floor(Math.random() * 500) + 200;
        const ceded = selectedNode;
        if (ceded && ceded.faction === target) {
            ceded.faction = playerFaction;
            ceded.garrison = Math.floor(ceded.garrison * 0.5);
            addLogFiltered(`📄 Barış antlaşması! ${their.name} ${reparations}$ tazminat ve ${ceded.name} toprağını verdi.`, "#238636", ceded, playerFaction);
            my.money += reparations;
            their.money -= reparations;
            my.relations[target] = "PEACE";
            their.relations[playerFaction] = "PEACE";
            peaceTreaties[target] = { terms: 'Toprak ve tazminat', reparations: reparations, cededNodes: [ceded.id] };
        } else {
            my.money += reparations;
            their.money -= reparations;
            my.relations[target] = "PEACE";
            their.relations[playerFaction] = "PEACE";
            addLogFiltered(`📄 Barış antlaşması! ${their.name} ${reparations}$ tazminat ödedi.`, "#238636", selectedNode, playerFaction);
        }
        playSound('click');
    } else {
        addLogFiltered(`❌ Barış antlaşması reddedildi.`, "#f85149", selectedNode, playerFaction);
    }
    updateLedger();
}

// Ekonomik Ambargolar
function imposeEconomicSanctions() {
    if (!selectedNode || selectedNode.faction === "NEUTRAL") { alert("Bir ülke seçin!"); return; }
    const target = selectedNode.faction;
    if (target === playerFaction) { alert("Kendine ambargo uygulayamazsın!"); return; }
    const my = factions[playerFaction];
    if (my.money < 500) { alert("500$ gerekli!"); return; }
    my.money -= 500;
    economicSanctions[target] = true;
    document.getElementById("sanction-target").innerText = `${factions[target].name} yaptırım altında`;
    addLogFiltered(`🚫 ${factions[target].name} ülkesine ekonomik yaptırım uygulandı!`, "#ffd700", selectedNode, playerFaction);
    updateLedger();
}

function processSanctions() {
    for (let target in economicSanctions) {
        if (economicSanctions[target]) {
            const fac = factions[target];
            if (fac) {
                fac.money = Math.max(0, fac.money - 50);
                fac.arms = Math.max(0, fac.arms - 5);
                fac.oil = Math.max(0, fac.oil - 3);
                if (factions[playerFaction] && factions[playerFaction].treaties[target]) {
                    factions[playerFaction].treaties[target] = false;
                    factions[target].treaties[playerFaction] = false;
                    addLogFiltered(`⛔ Yaptırımlar nedeniyle ${factions[target].name} ile ticaret anlaşması iptal edildi.`, "#f85149", null, playerFaction);
                }
            }
        }
    }
}

// İklim Değişikliği
function processClimate() {
    climateTimer++;
    if (climateTimer >= CLIMATE_INTERVAL) {
        climateTimer = 0;
        const r = Math.random();
        if (r < 0.15) {
            const types = ["Kuraklık", "Sel", "Soğuk Hava", "Fırtına"];
            const type = types[Math.floor(Math.random() * types.length)];
            climateState = type;
            climateDuration = 300 + Math.floor(Math.random() * 200);
            addLogFiltered(`🌦️ İklim Değişikliği: ${type} başladı!`, "#ff9f43", null, playerFaction);
            document.getElementById("climateDisplay").innerText = type;
            const fac = factions[playerFaction];
            const owned = mapNodes.filter(n => n.faction === playerFaction);
            if (type === "Kuraklık") {
                fac.food = Math.max(0, (fac.food || 0) - 50);
                owned.forEach(n => { n.pop = Math.max(1000, n.pop - Math.floor(n.pop * 0.02)); });
            } else if (type === "Sel") {
                owned.forEach(n => { if (n.isCoastal) n.garrison = Math.max(0, n.garrison - Math.floor(n.garrison * 0.1)); });
            } else if (type === "Soğuk Hava") {
                fac.steel = Math.max(0, (fac.steel || 0) - 15);
                fac.oil = Math.max(0, (fac.oil || 0) - 10);
            } else if (type === "Fırtına") {
                fac.arms = Math.max(0, (fac.arms || 0) - 20);
                fac.money = Math.max(0, fac.money - 200);
            }
            if (Math.random() < 0.3) {
                const from = owned[Math.floor(Math.random() * owned.length)];
                if (from) {
                    const to = mapNodes.filter(n => n.faction !== playerFaction && n.faction !== "NEUTRAL" && Math.hypot(n.x - from.x, n.y - from.y) < 150);
                    if (to.length > 0) {
                        const target = to[Math.floor(Math.random() * to.length)];
                        const migrants = Math.floor(from.pop * 0.01);
                        from.pop = Math.max(1000, from.pop - migrants);
                        target.pop += migrants;
                        addLogFiltered(`🚶 İklim nedeniyle ${migrants} kişi ${from.name}'den ${target.name}'e göç etti.`, "#8b949e", from, playerFaction);
                    }
                }
            }
        } else if (climateDuration > 0) {
            climateDuration--;
            if (climateDuration === 0) {
                climateState = 0;
                document.getElementById("climateDisplay").innerText = "Normal";
                addLogFiltered(`🌤️ İklim normale döndü.`, "#58a6ff", null, playerFaction);
            }
        }
    }
}

function updateClimateUI() {
    document.getElementById("climateDisplay").innerText = climateState || "Normal";
}

// Online Mod (Simülasyon)
function onlineLobby() {
    if (onlineLobbyActive) {
        onlineLobbyActive = false;
        document.getElementById("online-lobby").style.display = "none";
        document.getElementById("online-status").innerText = "Çevrimdışı";
        addLog("🌐 Lobi'den ayrıldı.", "#8b949e");
        return;
    }
    onlineLobbyActive = true;
    document.getElementById("online-lobby").style.display = "block";
    document.getElementById("online-status").innerText = "Çevrimiçi (Lobi)";
    lobbyPlayers = [];
    const names = ["Ateş", "Kar", "Rüzgar", "Toprak", "Yıldırım", "Deniz", "Dağ", "Nehir"];
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        lobbyPlayers.push({ name: names[Math.floor(Math.random() * names.length)] + (i+1), ready: Math.random() > 0.5 });
    }
    updateLobbyUI();
    addLog(`🌐 Lobi oluşturuldu, ${lobbyPlayers.length} oyuncu bağlandı.`, "#58a6ff");
}

function updateLobbyUI() {
    const el = document.getElementById("lobby-players");
    el.innerHTML = lobbyPlayers.map(p => `${p.name} ${p.ready ? '✅' : '⏳'}`).join('<br>');
}

// ---- TİCARET (Gıda eklendi) ----
function initiateTrade(resourceType, amount, isBuy) {
    const fac = factions[playerFaction];
    const targetId = document.getElementById("trade-target-select").value;
    const dest = mapNodes.find(n => n.id === targetId);
    if (!dest) { alert("Hedef liman seçin!"); return; }
    if (fac.relations[dest.faction] === "WAR") { alert("Savaşta ticaret olmaz!"); return; }
    if (embargoActive) { alert("Ambargo aktif!"); return; }
    if (economicSanctions[dest.faction]) { alert(`${factions[dest.faction].name} yaptırım altında!`); return; }
    
    // Fiyat hesapla (arz-talep)
    const price = getDynamicPrice(resourceType, isBuy);
    const totalCost = amount * price;
    if (isBuy) {
        if (fac.money < totalCost) { alert("Yeterli para yok!"); return; }
        fac.money -= totalCost; // Para peşin alınır, mal gemi gelince verilir
    } else {
        if (fac[resourceType] < amount) { alert("Yeterli kaynak yok!"); return; }
        // Satışta kaynak hemen düşer, para gemi gelince alınır
        fac[resourceType] -= amount;
    }
    
    // Liman bul
    const port = mapNodes.find(n => n.isCoastal && n.faction === playerFaction);
    if (!port) { alert("Kendi limanınız yok!"); return; }
    
    // Gemi oluştur
    merchantShips.push({
        id: "trade_" + Date.now(),
        owner: playerFaction,
        x: port.x, y: port.y,
        targetX: dest.x, targetY: dest.y,
        startX: port.x, startY: port.y,
        destFaction: dest.faction,
        speed: 0.4,
        state: 'going',
        tradeType: isBuy ? 'buy' : 'sell',
        resource: resourceType,
        amount: amount,
        price: price,
        totalValue: totalCost
    });
    addLogFiltered(`🚢 Ticaret gemisi ${dest.name}'e ${resourceType} ${isBuy?'alım':'satım'} için yola çıktı.`, "#ecc94b", dest, playerFaction);
    updateLedger();
}

function getDynamicPrice(resource, isBuy) {
    // Arz-talep: oyuncunun stokuna göre fiyat değişsin
    const fac = factions[playerFaction];
    const stock = fac[resource] || 0;
    let basePrice = { oil: 20, food: 10, arms: 15, steel: 12 }[resource] || 10;
    // Talep yüksekse (stok az) fiyat artar
    let factor = 1 + (100 - Math.min(stock, 100)) / 200;
    if (!isBuy) factor = 1 - (Math.min(stock, 100)) / 300; // satışta düşük stok fiyatı düşürür
    return Math.max(1, Math.round(basePrice * factor));
}

// ---- İNŞAAT VE ASKERİ FONKSİYONLAR (EKSİKSİZ) ----
function buildFactory(type) {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtinizi seçin!"); return; }
    const fac = factions[playerFaction];
    const cost = { steel: 200 };
    if (fac.money < cost[type]+1500) { alert(`Yeterli bütçe yok! (${cost[type],"1500 para"})`); return; }
    fac.money -= cost[type] + 1500;
    if (type === 'steel') fac.steel = (fac.steel || 0) + 5;
    selectedNode.industry = (selectedNode.industry || 10) + 5;
    addLogFiltered(`🏗️ ${type} fabrikası kuruldu, sanayi +5`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

function buildRefinery() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtinizi seçin!"); return; }
    if (selectedNode.refinery) { alert("Zaten rafineri var!"); return; }
    if (factions[playerFaction].money < 3000) { alert("3000$ gerekli!"); return; }
    factions[playerFaction].money -= 3000;
    selectedNode.refinery = true;
    addLogFiltered(`🛢️ ${selectedNode.name}'de rafineri kuruldu.`, "#ecc94b", selectedNode, playerFaction);
    updateLedger();
}

function buildPort() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtinizi seçin!"); return; }
    if (selectedNode.isCoastal) { alert("Zaten liman var!"); return; }
    if (factions[playerFaction].money < 1500) { alert("1500$ gerekli!"); return; }
    factions[playerFaction].money -= 1500;
    selectedNode.isCoastal = true;
    addLogFiltered(`🏗️ ${selectedNode.name} limanı inşa edildi.`, "#ecc94b", selectedNode, playerFaction);
    buildTradeDropdown();
    updateLedger();
}

function buildAirDefense() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtini seç!"); return; }
    if (airDefenses[selectedNode.id]) { alert("Zaten hava savunması var!"); return; }
    if (factions[playerFaction].money < 5000) { alert("5000$ gerekli!"); return; }
    factions[playerFaction].money -= 5000;
    airDefenses[selectedNode.id] = true;
    addLogFiltered(`🛡️ ${selectedNode.name} hava savunma sistemi kuruldu.`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

function buildRadar() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtini seç!"); return; }
    if (radarStations[selectedNode.id]) { alert("Zaten radar var!"); return; }
    if (factions[playerFaction].money < 5000) { alert("5000$ gerekli!"); return; }
    factions[playerFaction].money -= 5000;
    radarStations[selectedNode.id] = { x: selectedNode.x, y: selectedNode.y };
    addLogFiltered(`📡 ${selectedNode.name}'de radar kuruldu.`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

function buildNavalBase() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtini seç!"); return; }
    if (!selectedNode.isCoastal) { alert("Sadece kıyı şehirlerine deniz üssü kurulabilir!"); return; }
    if (navalBases[selectedNode.id]) { alert("Zaten deniz üssü var!"); return; }
    if (factions[playerFaction].money < 8000) { alert("8000$ gerekli!"); return; }
    factions[playerFaction].money -= 8000;
    navalBases[selectedNode.id] = true;
    addLogFiltered(`⚓ ${selectedNode.name}'de deniz üssü kuruldu.`, "#38bdf8", selectedNode, playerFaction);
    updateLedger();
}

function buildAsset(type) {
    const fac = factions[playerFaction];
    const capital = mapNodes.find(n => n.isCapital && n.faction === playerFaction);
    if (!capital) { alert("Başkent bulunamadı!"); return; }
    if (type === 'warship' && fac.money >= 10000 && fac.steel >= 250) {
        fac.money -= 10000; fac.steel -= 250;
        const sea = mapNodes.find(n => n.isSea);
        if (!sea) { alert("Deniz bulunamadı!"); return; }
        armies.push({ id:"fl_"+Date.now(), name:"Fırkateyn", size:1, type:"FLEET", owner:playerFaction, x:sea.x, y:sea.y, targetNode:null, status:"STANDBY" });
        addLog("⚓ Fırkateyn denize indi.", "#38bdf8");
    } else if (type === 'sub' && fac.money >= 10000 && fac.steel >= 250) {
        fac.money -= 10000; fac.steel -= 250;
        const sea = mapNodes.find(n => n.isSea);
        if (!sea) { alert("Deniz bulunamadı!"); return; }
        armies.push({ id:"fl_"+Date.now(), name:"Denizaltı", size:1, type:"FLEET", owner:playerFaction, x:sea.x, y:sea.y, targetNode:null, status:"STANDBY" });
        addLog("⚓ Denizaltı göreve başladı.", "#38bdf8");
    } else if (type === 'plane' && fac.money >= 10000 && fac.steel >= 250) {
        fac.money -= 10000; fac.steel -= 250;
        const tip = confirm("Bombardıman uçağı mı? (Tamam -> Bombardıman, İptal -> Keşif)") ? 'bomber' : 'scout';
        airUnits.push({ id: "air_" + Date.now(), type: tip, status: 'idle', x: capital.x, y: capital.y, returnX: capital.x, returnY: capital.y, targetX: null, targetY: null, progress: 0 });
        fac.fighters = (fac.fighters || 0) + 1;
        addLog(`✈️ ${tip === 'bomber' ? 'Bombardıman' : 'Keşif'} uçağı eklendi.`, "#38bdf8");
        updateAirUI();
    } else if (type === 'tank' && fac.money >= 10000 && fac.steel >= 250 && techLevel.land >= 2) {
        fac.money -= 10000; fac.steel -= 250;
        armies.push({ id:"tk_"+Date.now(), name:"Zırhlı Tugay", size:800, type:"LAND", owner:playerFaction, x: selectedNode ? selectedNode.x : capital.x, y: selectedNode ? selectedNode.y : capital.y, targetNode:null, status:"STANDBY", isTank: true });
        addLog("🎖️ Tank birliği kuruldu.", "#ffd700");
    } else if (type === 'artillery' && fac.money >= 10000 && fac.steel >= 250 && techLevel.land >= 1) {
        fac.money -= 10000; fac.steel -= 250;
        armies.push({ id:"art_"+Date.now(), name:"Topçu Birliği", size:500, type:"LAND", owner:playerFaction, x: selectedNode ? selectedNode.x : capital.x, y: selectedNode ? selectedNode.y : capital.y, targetNode:null, status:"STANDBY", isArtillery: true });
        addLog("💥 Topçu birliği kuruldu.", "#ff9f43");
    } else if (type === 'commando' && fac.money >= 10000 && fac.steel >= 250 && fac.arms >= 30) {
        fac.money -= 10000; fac.steel -= 250; fac.arms -= 30;
        armies.push({ id:"cmd_"+Date.now(), name:"Komando Birliği", size:300, type:"LAND", owner:playerFaction, x: selectedNode ? selectedNode.x : capital.x, y: selectedNode ? selectedNode.y : capital.y, targetNode:null, status:"STANDBY", isCommando: true });
        addLog("🎯 Komando birliği kuruldu.", "#ff9f43");
    } else if (type === 'marine' && fac.money >= 10000 && fac.steel >= 250 && fac.arms >= 20) {
        fac.money -= 10000; fac.steel -= 250; fac.arms -= 20;
        armies.push({ id:"mar_"+Date.now(), name:"Deniz Piyade Tugayı", size:400, type:"LAND", owner:playerFaction, x: selectedNode ? selectedNode.x : capital.x, y: selectedNode ? selectedNode.y : capital.y, targetNode:null, status:"STANDBY", isMarine: true });
        addLog("⚓ Deniz piyade birliği kuruldu.", "#38bdf8");
    } else if (type === 'drone' && fac.money >= 10000 && fac.steel >= 250 && techLevel.air >= 1) {
        fac.money -= 10000; fac.steel -= 250;
        airUnits.push({ id: "drone_" + Date.now(), type: 'drone', status: 'idle', x: capital.x, y: capital.y, returnX: capital.x, returnY: capital.y, targetX: null, targetY: null, progress: 0 });
        addLog("🛸 İHA eklendi.", "#38bdf8");
        updateAirUI();
    } else alert("Kaynak yetersiz veya teknoloji seviyesi yetersiz!");
    updateLedger();
}

function launchBomber() {
    if (!selectedNode) { alert("Hedef seç!"); return; }
    if (selectedNode.faction === playerFaction || selectedNode.faction === "NEUTRAL") { alert("Düşman veya tarafsız bir hedef seçin!"); return; }
    const bomber = airUnits.find(u => u.status === 'idle' && u.type === 'bomber');
    if (!bomber) { alert("Müsait bombardıman uçağı yok!"); return; }
    const fac = factions[playerFaction];
    if (fac.oil < 30) { alert("30 petrol gerekli!"); return; }
    fac.oil -= 30;
    bomber.status = 'mission';
    bomber.targetX = selectedNode.x;
    bomber.targetY = selectedNode.y;
    bomber.progress = 0;
    addLogFiltered(`✈️ Bombardıman uçağı ${selectedNode.name}'e gidiyor.`, "#ff9f43", selectedNode, playerFaction);
}

function launchScout() {
    if (!selectedNode) { alert("Keşif yapılacak hedef seç!"); return; }
    const scout = airUnits.find(u => u.status === 'idle' && (u.type === 'scout' || u.type === 'drone'));
    if (!scout) { alert("Müsait keşif uçağı veya İHA yok!"); return; }
    const fac = factions[playerFaction];
    if (fac.oil < 15) { alert("15 petrol gerekli!"); return; }
    fac.oil -= 15;
    scout.status = 'mission';
    scout.targetX = selectedNode.x;
    scout.targetY = selectedNode.y;
    scout.progress = 0;
    addLogFiltered(`🛰️ Keşif uçağı ${selectedNode.name}'e gidiyor.`, "#38bdf8", selectedNode, playerFaction);
}

function deploySpy() {
    if (!selectedNode) { alert("Hedef seç!"); return; }
    if (selectedNode.faction === playerFaction || selectedNode.faction === "NEUTRAL") { alert("Düşman veya tarafsız bir hedef seçin!"); return; }
    const fac = factions[playerFaction];
    if (fac.money < 1000) { alert("1000$ gerekli!"); return; }
    if (techLevel.spy < 1) { alert("Casusluk teknolojisi gerekli!"); return; }
    fac.money -= 1000;
    spies.push({ id: "spy_" + Date.now(), targetNode: selectedNode.id, progress: 0, success: false });
    addLogFiltered(`🕵️ Casus ${selectedNode.name}'e gönderildi.`, "#8b949e", selectedNode, playerFaction);
    updateLedger();
}

function processSpies() {
    spies = spies.filter(s => {
        const target = mapNodes.find(n => n.id === s.targetNode);
        if (!target) return false;
        s.progress += 0.02 + (techLevel.spy || 0) * 0.01;
        if (s.progress >= 1) {
            const info = {
                garrison: target.garrison,
                industry: target.industry,
                money: factions[target.faction] ? factions[target.faction].money : 0,
                arms: factions[target.faction] ? factions[target.faction].arms : 0,
                food: factions[target.faction] ? factions[target.faction].food : 0
            };
            addLogFiltered(`🕵️ Casus ${target.name} bilgilerini çaldı: Garnizon ${info.garrison}, Sanayi ${info.industry}`, "#8b949e", target, playerFaction);
            return false;
        }
        return true;
    });
}

function recruitTroops() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi semtini seç!"); return; }
    const amount = parseInt(document.getElementById("recruit-amount").value);
    const max = Math.floor(selectedNode.pop * 0.10);
    if (amount > max) { alert(`Maks ${max} asker!`); return; }
    const costGold = Math.floor(amount * 1.0);
    const costArms = Math.floor(amount * 2.0);
    const fac = factions[playerFaction];
    if (fac.money < costGold || fac.arms < costArms) { alert("Yetersiz kaynak!"); return; }
    fac.money -= costGold; fac.arms -= costArms;
    armies.push({ id: "army_" + Date.now() + Math.random(), name: `${armies.filter(a=>a.owner===playerFaction).length+1}. Kolordu`, size: amount, type: "LAND", owner: playerFaction, x: selectedNode.x, y: selectedNode.y, targetNode: null, status: "STANDBY" });
    addLogFiltered(`🪖 ${selectedNode.name}'de ordu kuruldu.`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

function orderMove(unitType) {
    const select = document.getElementById('army-select');
    const armyId = select.value;
    const army = armies.find(a => a.id === armyId);
    if (!army) { alert("Ordu seç!"); return; }
    if (!selectedNode) { alert("Hedef seç!"); return; }
    if (unitType === 'LAND' && selectedNode.isSea) { alert("Kara denize açılamaz!"); return; }
    if (unitType === 'FLEET' && !selectedNode.isSea && !selectedNode.isCoastal) { alert("Donanma sadece liman kentlerine veya denize gidebilir!"); return; }
    const armyi = armies.find(a => a.owner === playerFaction && a.status === "STANDBY" && a.type === unitType);
    if (!army) { alert(`Hazır ${unitType} birliği yok!`); return; }
    const currentNode = mapNodes.find(n => n.x === army.x && n.y === army.y);
    if (!currentNode) { alert("Birliğin bulunduğu şehir bulunamadı!"); return; }
    if (!currentNode.neighbors || !currentNode.neighbors.includes(selectedNode.id)) {
        alert(`${selectedNode.name} şehrine doğrudan bağlantı yok! Sadece komşu şehirlere gidilebilir.`);
        return;
    }
    if (selectedNode.faction !== playerFaction && selectedNode.faction !== "NEUTRAL") {
        const rel = factions[playerFaction].relations[selectedNode.faction];
        const key = playerFaction < selectedNode.faction ? playerFaction + '_' + selectedNode.faction : selectedNode.faction + '_' + playerFaction;
        if (rel !== "WAR" && !factions[selectedNode.faction].borderAccess[playerFaction] && !nonAggressionPacts[key]) {
            alert("Askeri geçiş izni yok!");
            return;
        }
    }
    army.targetNode = selectedNode;
    army.status = "MOVING";
    addLogFiltered(`🏹 ${army.name} ${selectedNode.name}'e yürüyor.`, "#ff9f43", selectedNode, playerFaction);
}

function sabotageNode() {
    if (!selectedNode || selectedNode.faction === playerFaction) { alert("Düşman veya tarafsız bir bölge seçin!"); return; }
    const fac = factions[playerFaction];
    if (fac.money < 300) { alert("300$ gerekli!"); return; }
    fac.money -= 300;
    const target = selectedNode;
    const damage = Math.floor(Math.random() * 500) + 200;
    target.garrison = Math.max(0, target.garrison - damage);
    if (target.industry) target.industry = Math.max(0, target.industry - Math.floor(Math.random() * 10));
    if (target.resourceBonus && target.resourceBonus.oil) target.resourceBonus.oil = Math.max(0, target.resourceBonus.oil - 1);
    addLogFiltered(`💣 ${target.name} sabotaj! -${damage} asker, sanayi azaldı.`, "#f85149", target, playerFaction);
    playSound('explosion');
    updateLedger();
}

function blockadePort() {
    if (!selectedNode || !selectedNode.isCoastal || selectedNode.faction === playerFaction) { alert("Düşman limanı seçin!"); return; }
    const fac = factions[playerFaction];
    if (fac.money < 400) { alert("400$ gerekli!"); return; }
    const fleet = armies.find(a => a.owner === playerFaction && a.type === "FLEET" && a.status === "STANDBY");
    if (!fleet) { alert("Hazır donanma birliği yok!"); return; }
    fac.money -= 400;
    blockades[selectedNode.id] = true;
    fleet.targetNode = selectedNode;
    fleet.status = "MOVING";
    addLogFiltered(`⛔ ${selectedNode.name} limanı ablukaya alınıyor.`, "#ecc94b", selectedNode, playerFaction);
    updateLedger();
}

function toggleEmbargo() {
    embargoActive = !embargoActive;
    document.getElementById("embargo-status").innerText = embargoActive ? "✅ Aktif" : "Kapalı";
    addLog(`⛔ Ambargo ${embargoActive ? 'etkinleştirildi' : 'devre dışı'}.`, "#ecc94b");
}

function launchManualTradeShip() {
    const fac = factions[playerFaction];
    const targetId = document.getElementById("trade-target-select").value;
    const dest = mapNodes.find(n => n.id === targetId);
    if (!dest) return;
    const cargoType = document.getElementById('cargo-type').value; 
    const amount = parseInt(document.getElementById('cargo-amount').value);
    if (isNaN(amount) || amount <= 0) { 
        alert("Lütfen geçerli bir miktar girin!"); 
        return; 
    }
    if (fac.relations[dest.faction] === "WAR") { alert("Savaşta ticaret olmaz!"); return; }
    if (embargoActive) { alert("Ambargo aktif!"); return; }
    if (economicSanctions[dest.faction]) { alert(`${factions[dest.faction].name} yaptırım altında, ticaret yapılamaz!`); return; }
    if (fac.money < 200) { alert("Lojistik için 200$ gerekli!"); return; }
    if (fac[cargoType] < amount) { alert("Yetersiz hammadde!"); return; }
    const port = mapNodes.find(n => n.isCoastal && n.faction === playerFaction);
    if (!port) { alert("Kendi limanınız yok!"); return; }
    fac[cargoType] -= amount;
    fac.money -= 200;
    merchantShips.push({
        id: "ship_" + Date.now(),
        owner: playerFaction,
        x: port.x, y: port.y,
        targetX: dest.x, targetY: dest.y,
        startX: port.x, startY: port.y,
        destFaction: dest.faction,
        speed: 0.3,
        state: 'going',
        cargoValue: 300 + Math.floor(Math.random() * 200),
        cargo: { type: cargoType, amount: amount }
    });

    addLogFiltered(`🚢 Kargo gemisi ${dest.name}'e gidiyor.`, "#ecc94b", dest, playerFaction);
    updateLedger();
}

// ---- DİPLOMASİ ----
function negotiatePeace() {
    if (!selectedNode || selectedNode.faction === "NEUTRAL") { alert("Bir ülke seçin!"); return; }
    const target = selectedNode.faction;
    const my = factions[playerFaction];
    const their = factions[target];
    const key = playerFaction < target ? playerFaction + '_' + target : target + '_' + playerFaction;
    if (my.relations[target] !== "WAR") { alert("Zaten barış durumundasınız!"); return; }
    if (Math.random() < 0.4 + (relationsScore[key] || 0) / 200) {
        my.relations[target] = "PEACE";
        their.relations[playerFaction] = "PEACE";
        their.borderAccess[playerFaction] = false;
        relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 15);
        addLogFiltered(`🤝 ${their.name} ile barış sağlandı (müzakere).`, "#238636", selectedNode, playerFaction);
        playSound('click');
    } else {
        addLogFiltered(`❌ ${their.name} barış teklifini reddetti.`, "#f85149", selectedNode, playerFaction);
    }
    updateLedger();
}

function callUN() {
    if (!selectedNode || selectedNode.faction === "NEUTRAL") { alert("Bir ülke seçin!"); return; }
    const target = selectedNode.faction;
    const my = factions[playerFaction];
    const their = factions[target];
    if (my.relations[target] !== "WAR") { alert("Sadece savaş halinde BM'ye başvurabilirsiniz!"); return; }
    if (Math.random() < 0.3) {
        unSanction = true;
        their.money = Math.max(0, their.money - 2000);
        addLogFiltered(`🇺🇳 BM, ${their.name} ülkesine yaptırım uyguladı! -2000$`, "#ffd700", selectedNode, playerFaction);
        playSound('war');
    } else {
        addLogFiltered(`🇺🇳 BM talebiniz reddedildi.`, "#8b949e", selectedNode, playerFaction);
    }
    updateLedger();
}

function dipAction(type) {
    if (!selectedNode || selectedNode.faction === "NEUTRAL") { alert("Geçerli hedef seçin!"); return; }
    const target = selectedNode.faction;
    const my = factions[playerFaction];
    const their = factions[target];
    const key = playerFaction < target ? playerFaction + '_' + target : target + '_' + playerFaction;

    if (type === 'war') {
        my.relations[target] = "WAR";
        their.relations[playerFaction] = "WAR";
        my.alliances[target] = false;
        relationsScore[key] = Math.max(-100, (relationsScore[key] || 0) - 30);
        for (let f in factions) {
            if (f !== playerFaction && f !== target && my.alliances[f]) {
                factions[f].relations[target] = "WAR";
                factions[target].relations[f] = "WAR";
                addLogFiltered(`⚔️ Müttefik ${factions[f].name} savaşa katıldı!`, "#f85149", selectedNode, playerFaction);
            }
        }
        addLogFiltered(`🚨 Savaş ilan edildi!`, "#f85149", selectedNode, playerFaction);
    } else if (type === 'alliance') {
        if (my.relations[target] === "WAR") { alert("Savaşta ittifak olmaz!"); return; }
        if (Math.random() < 0.4 + (relationsScore[key] || 0) / 200) {
            my.alliances[target] = true;
            their.alliances[playerFaction] = true;
            relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 20);
            addLogFiltered("🤝 İttifak kuruldu.", "#58a6ff", selectedNode, playerFaction);
        } else addLogFiltered("İttifak reddedildi.", "#8b949e", selectedNode, playerFaction);
    } else if (type === 'treaty') {
        if (Math.random() < 0.5 + (relationsScore[key] || 0) / 200) {
            my.treaties[target] = true;
            their.treaties[playerFaction] = true;
            relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 10);
            addLogFiltered("📜 Ticaret anlaşması.", "#238636", selectedNode, playerFaction);
        } else addLogFiltered("Anlaşma reddedildi.", "#8b949e", selectedNode, playerFaction);
    } else if (type === 'access') {
        if (Math.random() < 0.35 + (relationsScore[key] || 0) / 200) {
            their.borderAccess[playerFaction] = true;
            relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 5);
            addLogFiltered("🔓 Geçiş izni alındı.", "#38bdf8", selectedNode, playerFaction);
        } else addLogFiltered("Geçiş izni reddedildi.", "#f85149", selectedNode, playerFaction);
    } else if (type === 'peace') {
        my.relations[target] = "PEACE";
        their.relations[playerFaction] = "PEACE";
        their.borderAccess[playerFaction] = false;
        relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 15);
        addLogFiltered("🕊️ Barış sağlandı.", "#58a6ff", selectedNode, playerFaction);
    } else if (type === 'nonaggression') {
        if (my.relations[target] === "WAR") { alert("Savaşta saldırmazlık olmaz!"); return; }
        if (Math.random() < 0.5 + (relationsScore[key] || 0) / 200) {
            nonAggressionPacts[key] = true;
            relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 10);
            addLogFiltered("📜 Saldırmazlık paktı imzalandı.", "#2d3748", selectedNode, playerFaction);
        } else addLogFiltered("Saldırmazlık reddedildi.", "#8b949e", selectedNode, playerFaction);
    } else if (type === 'vassal') {
        if (my.relations[target] === "WAR") { alert("Savaşta haraca bağlama olmaz!"); return; }
        if (their.money < 1000 && Math.random() < 0.3) {
            vassalStates[key] = true;
            relationsScore[key] = Math.min(100, (relationsScore[key] || 0) + 5);
            addLogFiltered(`👑 ${their.name} haraca bağlandı!`, "#b83280", selectedNode, playerFaction);
        } else addLogFiltered("Haraca bağlama başarısız.", "#8b949e", selectedNode, playerFaction);
    }
    updateLedger();
    updateDiplomacyUI(target);
}

function updateDiplomacyUI(target) {
    const key = playerFaction < target ? playerFaction + '_' + target : target + '_' + playerFaction;
    const score = relationsScore[key] || 0;
    const bar = document.getElementById("dip-bar");
    const pct = Math.max(0, Math.min(100, 50 + score / 2));
    bar.style.width = pct + '%';
    bar.style.background = score > 30 ? '#238636' : (score < -30 ? '#f85149' : '#58a6ff');
    document.getElementById("dip-score").innerText = score;
}

// ---- TEKNOLOJİ ----
function researchTechTree(techId) {
    const tech = techTree[techId];
    if (!tech) return;
    if (tech.level >= tech.max) { alert("Maksimum seviye!"); return; }
    const fac = factions[playerFaction];
    const cost = tech.cost + tech.level * 200;
    if (fac.money < cost) { alert(`Yeterli para yok! (${cost}$)`); return; }
    fac.money -= cost;
    tech.level++;
    addLogFiltered(`🔬 ${tech.icon} ${tech.label} seviye ${tech.level} (${cost}$)`, "#58a6ff", null, playerFaction);
    updateTechUI();
    updateLedger();
    if (techId === 'land_speed') techLevel.land = tech.level;
    else if (techId === 'naval_speed') techLevel.naval = tech.level;
    else if (techId === 'air_power') techLevel.air = tech.level;
    else if (techId === 'spy_tech') techLevel.spy = tech.level;
    else if (techId === 'space_tech') techLevel.space = tech.level;
    
}


// Araştırma kuyruğu
let researchQueue = null; // { techId, remainingTime }

function researchTechTree(techId) {
    if (researchQueue) { alert("Zaten bir araştırma devam ediyor!"); return; }
    researchQueue = { techId, remainingTime: techTree[techId].researchTime };
}

if (researchQueue) {
    researchQueue.remainingTime--;
    if (researchQueue.remainingTime <= 0) {
        techTree[researchQueue.techId].level++;
        researchQueue = null;
        addLog("Araştırma tamamlandı!");
    }
}

function updateTechUI() {
    const grid = document.getElementById("tech-tree-grid");
    const items = grid.querySelectorAll(".tech-item");
    let totalLevel = 0;
    items.forEach(el => {
        const tid = el.dataset.tech;
        const tech = techTree[tid];
        if (tech) {
            totalLevel += tech.level;
            el.classList.toggle("unlocked", tech.level > 0);
            const costEl = el.querySelector(".tech-cost");
            if (costEl) {
                const cost = tech.cost + tech.level * 150;
                costEl.textContent = tech.level >= tech.max ? 'MAX' : cost + '$';
            }
            el.style.borderColor = tech.level >= tech.max ? '#238636' : (tech.level > 0 ? '#58a6ff' : '#21262d');
        }
    });
    document.getElementById("techStatus").innerText = `Araştırma: ${totalLevel} seviye`;
}

// ---- TİCARET ROTALARI ----
function generateTradeRoutes() {
    const nodes = mapNodes.filter(n => !n.isSea && n.faction !== "NEUTRAL");
    const newRoutes = [];
    for (let i = 0; i < Math.min(8, nodes.length); i++) {
        const from = nodes[Math.floor(Math.random() * nodes.length)];
        let candidates = nodes.filter(n => n.faction !== from.faction && n.isCoastal && n.faction !== "NEUTRAL");
        if (candidates.length === 0) continue;
        const to = candidates[Math.floor(Math.random() * candidates.length)];
        const val = Math.floor(50 + Math.random() * 150);
        newRoutes.push({ from: from.id, to: to.id, value: val, fromFaction: from.faction, toFaction: to.faction });
    }
    tradeRoutes = newRoutes;
    updateTradeRoutesUI();
}

function updateTradeRoutesUI() {
    const list = document.getElementById("trade-route-list");
    list.innerHTML = "";
    if (tradeRoutes.length === 0) { list.innerHTML = "Aktif rota yok"; return; }
    tradeRoutes.forEach(r => {
        const div = document.createElement("div");
        div.style.cssText = "display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dotted #1c212a;font-size:9px;";
        div.innerHTML = `<span>${r.from} ➔ ${r.to}</span><span style="color:#ffd700;">${r.value}💰</span>`;
        list.appendChild(div);
    });
}

// ---- ARAYÜZ GÜNCELLEMELERİ ----
function updateLedger() {
    if (!playerFaction) return;
    const fac = factions[playerFaction];
    if (!fac) return;
    document.getElementById("res-money").innerHTML = Math.round(fac.money);
    document.getElementById("res-arms").innerHTML = fac.arms;
    document.getElementById("res-oil").innerHTML = fac.oil;
    document.getElementById("res-steel").innerHTML = fac.steel || 0;
    document.getElementById("res-fighters").innerHTML = fac.fighters || 0;
    document.getElementById("res-food").innerHTML = fac.food || 0;

    const list = document.getElementById("army-ledger-list");
    list.innerHTML = "";
    const myArmies = armies.filter(a => a.owner === playerFaction);
    myArmies.forEach(a => {
        const d = document.createElement("div");
        let label = '';
        if (a.isTank) label = '🎖️';
        else if (a.isArtillery) label = '💥';
        else if (a.isCommando) label = '🎯';
        else if (a.isMarine) label = '⚓';
        d.innerText = `• ${label}${a.name} [${a.size}] ${a.status}`;
        list.appendChild(d);
    });

        const select = document.getElementById('army-select');
    if (select) {
        select.innerHTML = '';
        const myArmies = armies.filter(a => a.owner === playerFaction && a.status === "STANDBY");
        myArmies.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.text = `${a.name} (${a.size})`;
            select.appendChild(opt);
        });
    }
}

function updateAirUI() {
    const list = document.getElementById("air-unit-list");
    list.innerHTML = "";
    if (airUnits.length === 0) { list.innerHTML = "Uçak yok"; return; }
    airUnits.forEach(u => {
        const div = document.createElement("div");
        div.style.cssText = "font-size:10px;padding:2px 0;border-bottom:1px dotted #1c212a;";
        const tip = u.type === 'bomber' ? '💣' : (u.type === 'drone' ? '🛸' : '🛰️');
        div.innerText = `${tip} ${u.type.toUpperCase()} ${u.status === 'idle' ? '🟢 Hazır' : '🔴 Görevde'}`;
        list.appendChild(div);
    });
}

function updateWarReport() {
    document.getElementById("war-report").innerHTML = `
        ⚔️ Savaş: ${warReport.battles}<br>
        ✅ Galibiyet: ${warReport.wins}<br>
        ❌ Mağlubiyet: ${warReport.losses}<br>
        💀 Kayıp: ${warReport.totalCasualties}
    `;
}

function getTerrainBonus(node, type) {
    if (!node) return 1;
    if (type === 'defense') {
        if (node.terrain === 'MOUNTAIN') return 1.4;
        if (node.terrain === 'HILLY') return 1.2;
        if (node.terrain === 'PLATEAU') return 1.1;
        return 1;
    }
    if (type === 'movement') {
        if (node.terrain === 'PLAIN') return 1.3;
        if (node.terrain === 'DESERT') return 0.8;
        if (node.terrain === 'MOUNTAIN') return 0.5;
        return 1;
    }
    return 1;
}

function getLogisticsCost(fromNode, toNode) {
    if (!fromNode || !toNode) return 1;
    const dist = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
    const baseCost = 1 + Math.floor(dist / 200) * 0.1;
    return Math.min(baseCost, 2.5);
}

function triggerGlobalEvent() {
    const events = [
        { name: "Ekonomik Kriz", effect: (f) => { f.money = Math.floor(f.money * 0.8); }, msg: "📉 Ekonomik kriz! Tüm ülkelerin parası %20 azaldı." },
        { name: "Salgın", effect: (f) => { f.arms = Math.floor(f.arms * 0.9); f.pop = Math.max(1000, f.pop - Math.floor(f.pop * 0.02)); }, msg: "🦠 Salgın! Askeri güç %10 azaldı, nüfus azaldı." },
        { name: "Altın Buluntusu", effect: (f) => { f.money += 500; }, msg: "💰 Altın buluntusu! +500$." },
        { name: "Teknoloji Keşfi", effect: (f) => { if (f === factions[playerFaction]) techLevel.air += 1; }, msg: "🔬 Teknoloji keşfi! Hava teknolojisi +1." },
    ];
    const evt = events[Math.floor(Math.random() * events.length)];
    globalEvent = evt.name;
    eventDuration = 300;
    for (let code in factions) {
        const fac = factions[code];
        if (fac.type === 'org') continue;
        evt.effect(fac);
    }
    addLogFiltered(`🌍 Küresel Olay: ${evt.msg}`, "#ffd700", null, null);
    document.getElementById("globalEventDisplay").innerText = evt.name;
}

// ---- GAME TICK ----
function gameTick() {
    if (gameWon) return;

    taxTimer++;
    if (taxTimer >= TAX_INTERVAL) {
        taxTimer = 0;
        const fac = factions[playerFaction];
        const owned = mapNodes.filter(n => n.faction === playerFaction);
        let tax = 0;
        owned.forEach(n => { tax += Math.floor(n.pop / 100000) * 8 + 50; });
        if (unSanction) tax = Math.floor(tax * 0.6);
        fac.money += tax;
        addLogFiltered(`💰 Vergi +$${tax}`, "#238636", null, playerFaction);
    }

    factoryTimer++;
    if (factoryTimer >= FACTORY_INTERVAL) {
        factoryTimer = 0;
        const fac = factions[playerFaction];
        const owned = mapNodes.filter(n => n.faction === playerFaction);
        owned.forEach(n => {
            if (n.industry > 0) {
                fac.steel = (fac.steel || 0) + Math.floor(n.industry * 0.15);
                fac.food = (fac.food || 0) + Math.floor(n.industry * 0.05);
            }
            if (n.refinery && n.resourceBonus && n.resourceBonus.oil) {
                const eff = 1 + (techTree.refinery_eff ? techTree.refinery_eff.level * 0.2 : 0);
                fac.oil += n.resourceBonus.oil * 1.5 * eff;
            }
        });
    }

    inflationTimer++;
    if (inflationTimer >= INFLATION_INTERVAL) {
        inflationTimer = 0;
        let rate = (Math.random() * 8) + 3;
        const atWar = Object.values(factions[playerFaction].relations).some(r => r === "WAR");
        if (atWar) rate *= 1.5;
}

    unTimer++;
    if (unTimer >= UN_INTERVAL) {
        unTimer = 0;
        if (unSanction) { unSanction = false; addLogFiltered(`🇺🇳 BM yaptırımları kaldırıldı.`, "#58a6ff", null, playerFaction); document.getElementById("sanctionDisplay").innerText = "Yok"; }
    }

    eventTimer++;
    if (eventTimer >= EVENT_INTERVAL) {
        eventTimer = 0;
        if (Math.random() < 0.3) triggerGlobalEvent();
    }
    if (globalEvent && eventDuration > 0) {
        eventDuration--;
        if (eventDuration === 0) { globalEvent = null; document.getElementById("globalEventDisplay").innerText = "Yok"; }
    }

    processClimate();
    processSpies();
    processGuerrilla();
    processSanctions();

    armies = armies.filter(a => {
        if (a.size <= 0 || a.status === "DESTROYED") return false;
        if (a.status === "MOVING" && a.targetNode) {
            const dx = a.targetNode.x - a.x, dy = a.targetNode.y - a.y;
            const dist = Math.hypot(dx, dy);
            let speed = 0.4 + (techLevel.land || 0) * 0.05;
            if (a.type === "FLEET") speed = 0.7 + (techLevel.naval || 0) * 0.05;
            if (a.isTank) speed += 0.1;
            if (a.isCommando) speed += 0.15;
            if (a.isMarine) speed += 0.1;
            const fromNode = mapNodes.find(n => n.x === a.x && n.y === a.y);
            if (fromNode) speed *= getTerrainBonus(fromNode, 'movement');
            if (dist > 2) {
                a.x += (dx/dist)*speed;
                a.y += (dy/dist)*speed;
            } else {
                a.x = a.targetNode.x; a.y = a.targetNode.y;
                a.status = "STANDBY";
                resolveBattle(a, a.targetNode);
            }
        }
        return true;
    });

    merchantShips = merchantShips.filter(ship => {
        const targetNode = mapNodes.find(n => n.x === ship.targetX && n.y === ship.targetY);
        if (targetNode && blockades[targetNode.id] && ship.owner !== playerFaction) {
            if (isAllyOrPlayer(targetNode.faction)) {
                addLogFiltered(`⛔ ${targetNode.name} abluka altında, gemi geri döndü.`, "#f85149", targetNode, null);
            }
            return false;
        }
        if (embargoActive && ship.owner === playerFaction) {
            addLogFiltered(`⛔ Ambargo nedeniyle ticaret iptal.`, "#f85149", null, playerFaction);
            return false;
        }
        if (economicSanctions[ship.destFaction] && ship.owner === playerFaction) {
            addLogFiltered(`⛔ Yaptırımlar nedeniyle ${factions[ship.destFaction].name} ile ticaret engellendi.`, "#f85149", null, playerFaction);
            return false;
        }
        let dx, dy, dist;
        if (ship.state === 'going') {
            dx = ship.targetX - ship.x; dy = ship.targetY - ship.y;
            dist = Math.hypot(dx, dy);
            if (dist > 2) {
                ship.x += (dx/dist) * ship.speed;
                ship.y += (dy/dist) * ship.speed;
                return true;
            } else {
                ship.state = 'returning';
                ship.x = ship.targetX; ship.y = ship.targetY;
                return true;
            }
        } else {
            dx = ship.startX - ship.x; dy = ship.startY - ship.y;
            dist = Math.hypot(dx, dy);
            if (dist > 2) {
                ship.x += (dx/dist) * ship.speed;
                ship.y += (dy/dist) * ship.speed;
                return true;
            } else {
                if (ship.owner === playerFaction) {
                const fac = factions[playerFaction];
                if (ship.tradeType === 'buy') {
                    fac[ship.resource] = (fac[ship.resource] || 0) + ship.amount;
                    addLogFiltered(`💰 ${ship.resource} alındı (${ship.amount} adet).`, "#238636", null, playerFaction);
                } else {
                    fac.money += ship.totalValue;
                    addLogFiltered(`💰 ${ship.resource} satıldı, +${ship.totalValue}$.`, "#238636", null, playerFaction);
                    }
                }
                return false;
            }
        }
    });

    airUnits.forEach(unit => {
        if (unit.status !== 'mission') return;
        const dx = unit.targetX - unit.x, dy = unit.targetY - unit.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
            unit.x += (dx/dist) * 1.8;
            unit.y += (dy/dist) * 1.8;
        } else {
            if (unit.type === 'bomber') {
                const target = mapNodes.find(n => n.x === unit.targetX && n.y === unit.targetY);
                if (target) {
                    let dmg = Math.round(2000 + Math.random() * 3000);
                    if (airDefenses[target.id]) dmg = Math.round(dmg * 0.5);
                    if (missileDefenses[target.id]) dmg = Math.round(dmg * 0.6);
                    target.garrison = Math.max(0, target.garrison - dmg);
                    addLogFiltered(`💥 ${target.name} bombalandı! -${dmg} asker`, "#da3637", target, playerFaction);
                    playSound('bombardment');
                    if (target.garrison <= 0 && target.faction !== "NEUTRAL") {
                        target.faction = "NEUTRAL";
                        addLogFiltered(`⚠️ ${target.name} işgale açık.`, "#ff9f43", target, playerFaction);
                    }
                }
            } else if (unit.type === 'scout' || unit.type === 'drone') {
                const target = mapNodes.find(n => n.x === unit.targetX && n.y === unit.targetY);
                if (target) {
                    if (target.isOrgBase) {
                        discoveredBases[target.id] = true;
                        addLogFiltered(`🛰️ ${target.name} üssü keşfedildi!`, "#f85149", target, playerFaction);
                    } else {
                        const nearby = armies.filter(a => a.owner !== playerFaction && Math.hypot(a.x - target.x, a.y - target.y) < 80);
                        nearby.forEach(a => { discoveredArmies[a.id] = { x: a.x, y: a.y, owner: a.owner, size: a.size, lastSeen: Date.now() }; });
                        addLogFiltered(`🛰️ ${target.name} keşfedildi, ${nearby.length} düşman birliği.`, "#38bdf8", target, playerFaction);
                    }
                }
            }
            unit.status = 'idle';
            unit.x = unit.returnX; unit.y = unit.returnY;
            unit.targetX = null; unit.targetY = null;
            addLogFiltered(`✈️ Uçak üsse döndü.`, "#58a6ff", null, playerFaction);
            updateAirUI();
        }
    });

    if (checkAllianceVictory()) return;

    mapNodes.forEach(n => {
        if (n.resourceBonus && n.resourceBonus.oil && n.resourceBonus.oil > 0) {
            const neighbors = mapNodes.filter(m => m.faction !== n.faction && m.faction !== "NEUTRAL" && Math.hypot(m.x - n.x, m.y - n.y) < 100);
            if (neighbors.length > 0 && Math.random() < 0.005) {
                const attacker = neighbors[Math.floor(Math.random() * neighbors.length)];
                if (factions[attacker.faction] && factions[attacker.faction].relations[n.faction] !== "WAR") {
                    factions[attacker.faction].relations[n.faction] = "WAR";
                    factions[n.faction].relations[attacker.faction] = "WAR";
                    addLogFiltered(`🔥 ${factions[attacker.faction].name} ${n.name} petrolü için savaş ilan etti!`, "#f85149", n, attacker.faction);
                }
            }
        }
    });

    updateWarReport();
    updateClimateUI();
    drawMap();
    updateLedger();
    updateAirUI();
    updateSpaceUI();
    updateGuerrillaUI();
    if (onlineLobbyActive) updateLobbyUI();
}
// Birliğin savaş gücünü hesaplar
function calculatePower(army, node) {
    let power = army.size;
    if (army.isTank) power += 500;
    if (army.isArtillery) power += 300;
    if (army.isCommando) power += 200;
    if (army.isMarine) power += 250;
    // Teknoloji bonusu
    if (army.owner === playerFaction) {
        if (army.type === "LAND") power *= (1 + techLevel.land * 0.05);
        else if (army.type === "FLEET") power *= (1 + techLevel.naval * 0.05);
    }
    // Arazi savunma bonusu
    const defBonus = getTerrainBonus(node, 'defense');
    power *= defBonus;
    return power;
}
function resolveBattle(army, node) {
    const enemies = armies.filter(a => a.owner !== army.owner && a.targetNode === node && a.status === "STANDBY");
    let totalEnemy = enemies.reduce((s,a) => s + a.size, 0);
    totalEnemy += node.garrison;
    const myPower = calculatePower(army, node);
    const enemyPower = totalEnemy * getTerrainBonus(node, 'defense');
    warReport.battles++;
    if (myPower > enemyPower) {
        const loss = Math.floor(army.size * 0.1);
        army.size -= loss;
        enemies.forEach(e => e.size = 0);
        node.garrison = 0;
        warReport.wins++;
        warReport.totalCasualties += Math.floor(totalEnemy * 0.5);
        if (isAllyOrPlayer(army.owner) || isAllyOrPlayer(node.faction)) {
            addLogFiltered(`⚔️ ${army.name} (${army.size} kaldı) zafer!`, "#238636", node, army.owner);
            playSound('explosion');
        }
        // TOPRAK İŞGALİ
        if (node.faction !== army.owner && node.faction !== "NEUTRAL") {
            node.faction = army.owner;
            node.garrison = army.size;
            army.size = 0;
            if (isAllyOrPlayer(army.owner) || isAllyOrPlayer(node.faction)) {
                addLogFiltered(`🏴 ${node.name} ele geçirildi!`, "#58a6ff", node, army.owner);
            }
            checkVictory();
            checkAllianceVictory();
        }
    } else {
        const loss = Math.floor(totalEnemy * 0.2);
        army.size = Math.max(0, army.size - loss);
        enemies.forEach(e => e.size = Math.max(0, e.size - Math.floor(e.size * 0.15)));
        node.garrison = Math.max(0, node.garrison - Math.floor(node.garrison * 0.15));
        warReport.losses++;
        warReport.totalCasualties += Math.floor(army.size * 0.2);
        if (isAllyOrPlayer(army.owner) || isAllyOrPlayer(node.faction)) {
            addLogFiltered(`💀 ${army.name} yenildi! (${army.size} kaldı)`, "#da3637", node, army.owner);
        }
        if (army.size <= 0) {
            army.status = "DESTROYED";
        } else {
            // Mağlup birlikten sağ kalanlar başkente çekilir
            const capital = mapNodes.find(n => n.isCapital && n.faction === army.owner);
            if (capital) {
                army.targetNode = capital;
                army.status = "MOVING";
                addLogFiltered(`🏃 ${army.name} ${capital.name} mevzisine çekiliyor.`, "#ecc94b", capital, army.owner);
            }
        }
    }
    updateLedger();
    updateWarReport();
}

function resolveBattle(army, node) {
    const enemies = armies.filter(a => a.owner !== army.owner && a.targetNode === node && a.status === "STANDBY");
    let totalEnemy = enemies.reduce((s,a) => s + a.size, 0);
    totalEnemy += node.garrison;
    let attackBonus = 1;
    if (army.owner === playerFaction) {
        if (army.type === "LAND") attackBonus += techLevel.land * 0.1;
        else if (army.type === "FLEET") attackBonus += techLevel.naval * 0.1;
    }
    if (army.isTank) attackBonus += 0.3;
    if (army.isArtillery) attackBonus += 0.2;
    if (army.isCommando) attackBonus += 0.25;
    if (army.isMarine) attackBonus += 0.15;
    const defenseBonus = getTerrainBonus(node, 'defense');
    const myPower = army.size * attackBonus;
    const enemyPower = totalEnemy * defenseBonus;
    warReport.battles++;
    if (myPower > enemyPower) {
        const loss = Math.floor(army.size * 0.1);
        army.size -= loss;
        enemies.forEach(e => e.size = 0);
        node.garrison = 0;
        warReport.wins++;
        warReport.totalCasualties += Math.floor(totalEnemy * 0.5);
        if (isAllyOrPlayer(army.owner) || isAllyOrPlayer(node.faction)) {
            addLogFiltered(`⚔️ ${army.name} (${army.size} kaldı) zafer!`, "#238636", node, army.owner);
            playSound('explosion');
        }
        if (node.faction !== army.owner && node.faction !== "NEUTRAL") {
            node.faction = army.owner;
            node.garrison = army.size;
            army.size = 0;
            if (isAllyOrPlayer(army.owner) || isAllyOrPlayer(node.faction)) {
                addLogFiltered(`🏴 ${node.name} ele geçirildi!`, "#58a6ff", node, army.owner);
            }
            checkVictory();
            checkAllianceVictory();
        }
    } else {
        const loss = Math.floor(totalEnemy * 0.2);
        army.size = Math.max(0, army.size - loss);
        enemies.forEach(e => e.size = Math.max(0, e.size - Math.floor(e.size * 0.15)));
        node.garrison = Math.max(0, node.garrison - Math.floor(node.garrison * 0.15));
        warReport.losses++;
        warReport.totalCasualties += Math.floor(army.size * 0.2);
        if (isAllyOrPlayer(army.owner) || isAllyOrPlayer(node.faction)) {
            addLogFiltered(`💀 ${army.name} yenildi! (${army.size} kaldı)`, "#da3637", node, army.owner);
        }
        if (army.size <= 0) army.status = "DESTROYED";
    }
    updateLedger();
    updateWarReport();
}

function checkVictory() {
    const capitals = mapNodes.filter(n => n.isCapital && n.faction !== "NEUTRAL");
    const allMine = capitals.every(n => n.faction === playerFaction);
    if (allMine && !gameWon) {
        gameWon = true;
        addLog("🏆 TÜM BAŞKENTLER ELE GEÇİRİLDİ! ZAFER!", "#ffd700");
        document.getElementById("victory-status").innerText = "🏆 ZAFER!";
        document.getElementById("victory-detail").innerText = "Dünya sizin!";
        playSound('war');
    } else {
        document.getElementById("victory-status").innerText = "Devam ediyor...";
        document.getElementById("victory-detail").innerText = "";
    }
}

function checkAllianceVictory() {
    if (!playerFaction) return false;
    const myAllies = Object.keys(factions).filter(f => factions[playerFaction].alliances[f]);
    myAllies.push(playerFaction);
    const capitals = mapNodes.filter(n => n.isCapital && n.faction !== "NEUTRAL");
    const alliedCapitals = capitals.filter(n => myAllies.includes(n.faction));
    if (alliedCapitals.length === capitals.length && capitals.length > 0) {
        gameWon = true;
        addLog("🏆 İTTİFAK ZAFERİ! Tüm başkentler müttefiklerin elinde!", "#ffd700");
        document.getElementById("victory-status").innerText = "🏆 İTTİFAK ZAFERİ!";
        document.getElementById("victory-detail").innerText = `${factions[playerFaction].name} ve müttefikleri dünyaya hükmediyor!`;
        playSound('war');
        return true;
    }
    return false;
}

// ---- AI TICK (gelişmiş) ----
function aiTick() {
    // (mevcut AI aynen, tüm kararları alır)
    for (let code in factions) {
        if (code === playerFaction) continue;
        const fac = factions[code];
        if (fac.type === 'org') {
            if (Math.random() < 0.1 && fac.money > 200) {
                const targets = mapNodes.filter(n => n.faction !== code && n.faction !== "NEUTRAL");
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    fac.relations[target.faction] = "WAR";
                    factions[target.faction].relations[code] = "WAR";
                    addLogFiltered(`💀 ${fac.name} ${target.name}'e saldırdı!`, "#f85149", target, code);
                }
            }
            continue;
        }
        // Ekonomi, ticaret, ittifak, askeri kararlar (önceki sürümdeki gibi)
        if (fac.money > 500 && Math.random() < 0.15) {
            const myNodes = mapNodes.filter(n => n.faction === code);
            if (myNodes.length > 0) {
                const node = myNodes[Math.floor(Math.random() * myNodes.length)];
                if (!node.refinery && fac.money > 600) {
                    node.refinery = true;
                    fac.money -= 600;
                    addLogFiltered(`🏭 ${fac.name} ${node.name}'de rafineri kurdu.`, "#58a6ff", node, code);
                } else if (fac.money > 400) {
                    fac.money -= 200;
                    node.industry = (node.industry || 10) + 5;
                    addLogFiltered(`🏭 ${fac.name} ${node.name}'de sanayi inşa etti.`, "#58a6ff", node, code);
                }
            }
        }
        if (Math.random() < 0.05) {
            const others = Object.keys(factions).filter(f => f !== code && factions[f].type === 'country');
            if (others.length > 0) {
                const partner = others[Math.floor(Math.random() * others.length)];
                if (fac.relations[partner] !== "WAR" && !fac.treaties[partner]) {
                    if (Math.random() < 0.4) {
                        fac.treaties[partner] = true;
                        factions[partner].treaties[code] = true;
                        addLogFiltered(`📜 ${fac.name} ve ${factions[partner].name} ticaret anlaşması imzaladı.`, "#238636", null, code);
                    }
                }
            }
        }
        if (Math.random() < 0.03) {
            const threats = Object.keys(factions).filter(f => f !== code && factions[f].type === 'country' && fac.relations[f] === "WAR");
            if (threats.length > 0) {
                const potentialAllies = Object.keys(factions).filter(f => f !== code && factions[f].type === 'country' && fac.relations[f] !== "WAR" && !fac.alliances[f]);
                if (potentialAllies.length > 0) {
                    const ally = potentialAllies[Math.floor(Math.random() * potentialAllies.length)];
                    if (Math.random() < 0.5) {
                        fac.alliances[ally] = true;
                        factions[ally].alliances[code] = true;
                        addLogFiltered(`🤝 ${fac.name} ve ${factions[ally].name} ittifak kurdu.`, "#58a6ff", null, code);
                    }
                }
            }
        }
        if (Math.random() < 0.08 && fac.money > 300) {
            const myNodes = mapNodes.filter(n => n.faction === code);
            if (myNodes.length > 0) {
                const from = myNodes[Math.floor(Math.random() * myNodes.length)];
                let targets = mapNodes.filter(n => n.faction !== code && n.faction !== "NEUTRAL");
                const enemies = Object.keys(fac.relations).filter(f => fac.relations[f] === "WAR");
                if (enemies.length > 0) {
                    targets = targets.filter(n => enemies.includes(n.faction));
                }
                if (targets.length === 0) {
                    targets = mapNodes.filter(n => n.faction !== code && n.faction !== "NEUTRAL" && Math.random() < 0.02);
                }
                if (targets.length > 0 && from.neighbors) {
                    const reachable = targets.filter(t => from.neighbors.includes(t.id));
                    if (reachable.length > 0) {
                        const dest = reachable[Math.floor(Math.random() * reachable.length)];
                        if (dest) {
                            fac.money -= 200;
                            armies.push({
                                id: "ai_" + Date.now() + Math.random(),
                                name: `${fac.name} Ordusu`,
                                size: Math.round(1500 + Math.random() * 2500),
                                type: "LAND",
                                owner: code,
                                x: from.x, y: from.y,
                                targetNode: dest,
                                status: "MOVING"
                            });
                            if (isAllyOrPlayer(dest.faction)) {
                                addLogFiltered(`⚔️ ${fac.name} ${dest.name}'e saldırı başlattı!`, "#f85149", dest, code);
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---- ÇİZİM ----
function drawMap() {
    ctx.fillStyle = "#0b1820";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    if (mapLoaded && mapImage) {
        const cw = canvas.width / zoom, ch = canvas.height / zoom;
        const imgAspect = mapImage.width / mapImage.height;
        let drawW = cw, drawH = ch;
        if (imgAspect > cw/ch) { drawH = cw / imgAspect; } else { drawW = ch * imgAspect; }
        const offsetX = (cw - drawW)/2, offsetY = (ch - drawH)/2;
        ctx.drawImage(mapImage, offsetX, offsetY, drawW, drawH);
    } else {
        ctx.strokeStyle = "rgba(0,255,100,0.12)";
        ctx.lineWidth = 0.5;
        for (let y = 0; y < 1200; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(2000,y); ctx.stroke(); }
        for (let x = 0; x < 2000; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1200); ctx.stroke(); }
        ctx.strokeStyle = "rgba(0,255,100,0.15)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(1000,600,500,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(1000,600,250,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = "rgba(20,80,30,0.3)";
        ctx.beginPath(); ctx.moveTo(200,80); ctx.lineTo(450,60); ctx.lineTo(650,120); ctx.lineTo(600,250); ctx.lineTo(400,280); ctx.lineTo(200,220); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(30,100,40,0.25)";
        ctx.beginPath(); ctx.moveTo(400,320); ctx.lineTo(700,380); ctx.lineTo(650,550); ctx.lineTo(400,520); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(25,90,35,0.25)";
        ctx.beginPath(); ctx.moveTo(100,380); ctx.lineTo(350,380); ctx.lineTo(320,520); ctx.lineTo(100,520); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(30,90,40,0.2)";
        ctx.beginPath(); ctx.moveTo(700,100); ctx.lineTo(1600,100); ctx.lineTo(1800,400); ctx.lineTo(1500,600); ctx.lineTo(700,400); ctx.closePath(); ctx.fill();
    }

    ctx.strokeStyle = "rgba(0,255,150,0.15)";
    ctx.lineWidth = 1;
    mapNodes.forEach(n => {
        if (n.neighbors) {
            n.neighbors.forEach(nid => {
                const neighbor = mapNodes.find(m => m.id === nid);
                if (neighbor) { ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(neighbor.x,neighbor.y); ctx.stroke(); }
            });
        }
    });

    tradeRoutes.forEach(r => {
        const from = mapNodes.find(n => n.id === r.from);
        const to = mapNodes.find(n => n.id === r.to);
        if (from && to && (isUnitVisible(from) || isUnitVisible(to))) {
            ctx.strokeStyle = "rgba(255,215,0,0.35)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6,8]);
            ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
            ctx.setLineDash([]);
            const mx = (from.x+to.x)/2, my = (from.y+to.y)/2;
            ctx.fillStyle = "#ffd700";
            ctx.font = "10px sans-serif";
            ctx.fillText("🚢", mx-6, my+4);
        }
    });

    armies.forEach(a => {
        if (a.status === "MOVING" && a.targetNode && isUnitVisible(a.targetNode)) {
            ctx.strokeStyle = "rgba(255,215,0,0.25)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4,6]);
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(a.targetNode.x,a.targetNode.y); ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    mapNodes.forEach(node => {
        if (node.isOrgBase && !discoveredBases[node.id]) return;
        const fac = factions[node.faction] || { color: "#6b7280" };
        ctx.fillStyle = node.isSea ? "#1d4ed8" : fac.color;
        ctx.shadowColor = "rgba(0,200,255,0.3)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        if (node.isCapital) ctx.rect(node.x-14, node.y-14, 28, 28);
        else ctx.arc(node.x, node.y, node.isSea ? 18 : 12, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (node.isCoastal && !node.isSea) { ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(node.x,node.y,16,0,Math.PI*2); ctx.stroke(); }
        if (node.refinery) { ctx.fillStyle = "#ffd700"; ctx.font = "14px sans-serif"; ctx.fillText("🛢", node.x-10, node.y-22); }
        if (airDefenses[node.id]) { ctx.fillStyle = "#58a6ff"; ctx.font = "14px sans-serif"; ctx.fillText("🛡️", node.x-20, node.y-28); }
        if (radarStations[node.id]) { ctx.fillStyle = "#38bdf8"; ctx.font = "14px sans-serif"; ctx.fillText("📡", node.x+12, node.y-22); }
        if (navalBases[node.id]) { ctx.fillStyle = "#38bdf8"; ctx.font = "14px sans-serif"; ctx.fillText("⚓", node.x-14, node.y+16); }
        if (spaceStations[node.id]) { ctx.fillStyle = "#58a6ff"; ctx.font = "14px sans-serif"; ctx.fillText("🚀", node.x-16, node.y-32); }
        if (missileDefenses[node.id]) { ctx.fillStyle = "#ff9f43"; ctx.font = "14px sans-serif"; ctx.fillText("🛡️", node.x+18, node.y-32); }
        if (blockades[node.id]) { ctx.fillStyle = "#f85149"; ctx.font = "14px sans-serif"; ctx.fillText("⛔", node.x+8, node.y-22); }
        if (selectedNode === node) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(node.x,node.y,22,0,Math.PI*2); ctx.stroke(); }

        if (showCanvasUI) {
            ctx.fillStyle = "#e6edf3";
            ctx.font = "bold 10px 'Segoe UI', sans-serif";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 6;
            let labelX = node.x - 20, labelY = node.y - 18;
            if (node.x > 1800) labelX = node.x - 80;
            else if (node.x > 1500) labelX = node.x - 60;
            if (node.y > 1100) labelY = node.y - 16;
            if (node.y < 40) labelY = node.y + 20;
            const neighbors = mapNodes.filter(n => n !== node && Math.hypot(n.x-node.x, n.y-node.y) < 60);
            if (neighbors.length > 2) { labelX = node.x + 18; labelY = node.y - 4; }
            ctx.fillText(node.name, labelX, labelY);
            ctx.shadowBlur = 0;
        }
    });

    armies.forEach(a => {
        if (a.size <= 0) return;
        if (!isUnitVisible(a)) return;
        ctx.fillStyle = a.owner === playerFaction ? "#58a6ff" : "#f85149";
        if (a.isTank) ctx.fillStyle = "#ffd700";
        if (a.isArtillery) ctx.fillStyle = "#ff9f43";
        if (a.isCommando) ctx.fillStyle = "#b83280";
        if (a.isMarine) ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "rgba(255,255,255,0.2)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        if (a.type === "FLEET") ctx.rect(a.x-8, a.y-8, 16, 16);
        else ctx.arc(a.x, a.y, 9, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (a.isTank || a.isArtillery || a.isCommando || a.isMarine) {
            ctx.fillStyle = "#fff";
            ctx.font = "8px sans-serif";
            ctx.fillText(a.isTank ? "T" : (a.isArtillery ? "A" : (a.isCommando ? "C" : "M")), a.x-3, a.y+3);
        }
    });

    merchantShips.forEach(s => {
        if (isUnitVisible(s)) {
            ctx.fillStyle = "#ffd700";
            ctx.shadowColor = "rgba(255,215,0,0.3)";
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(s.x,s.y,5,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    });

    satellites.forEach(s => {
        if (s.active) {
            ctx.fillStyle = "#38bdf8";
            ctx.font = "12px sans-serif";
            ctx.fillText("🛰️", s.x-8, s.y-8);
        }
    });

    ctx.restore();
}


function handleMapClick(e) {
    const rect = canvas.getBoundingClientRect();

    // Canvas'ın CSS'e göre gerilme oranları
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Tıklanan noktanın canvas piksel koordinatları
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Harita koordinatları (pan ve zoom uygulanmış)
    const mapX = (canvasX - panX) / zoom;
    const mapY = (canvasY - panY) / zoom;

    // En yakın şehri bul (eşik değeri 30 piksel)
    let closest = null;
    let minDist = 30;
    mapNodes.forEach(node => {
        if (node.isOrgBase && !discoveredBases[node.id]) return;
        const d = Math.hypot(node.x - mapX, node.y - mapY);
        if (d < minDist) {
            minDist = d;
            closest = node;
        }
    });

    if (!closest) return;
    selectedNode = closest;

    // ---- BURADAN SONRASI ESKİ KODUNUZUN AYNISI ----
    // (Bilgi panelini güncelleme kısmını buraya kopyalayın)
    document.getElementById("dst-name").innerText = `📍 ${selectedNode.name}`;
    document.getElementById("dst-pop").innerText = selectedNode.pop.toLocaleString();
    document.getElementById("dst-terrain").innerText = selectedNode.terrain;
    document.getElementById("dst-industry").innerText = selectedNode.industry || 10;
    document.getElementById("dst-garrison").innerText = selectedNode.garrison;
    document.getElementById("dst-harbor").innerText = selectedNode.isCoastal ? '✅' : '❌';
    document.getElementById("dst-refinery").innerText = selectedNode.refinery ? '✅' : '❌';
    document.getElementById("dst-airdef").innerText = airDefenses[selectedNode.id] ? '✅' : '❌';
    document.getElementById("dst-radar").innerText = radarStations[selectedNode.id] ? '✅' : '❌';
    document.getElementById("dst-navalbase").innerText = navalBases[selectedNode.id] ? '✅' : '❌';
    document.getElementById("dst-spacebase").innerText = spaceStations[selectedNode.id] ? '✅' : '❌';
    document.getElementById("dst-missiledef").innerText = missileDefenses[selectedNode.id] ? '✅' : '❌';
    document.getElementById("dst-blockade").innerText = blockades[selectedNode.id] ? '✅' : '❌';
    let prod = "Yok";
    if (selectedNode.refinery && selectedNode.resourceBonus && selectedNode.resourceBonus.oil) {
        const eff = 1 + (techTree.refinery_eff ? techTree.refinery_eff.level * 0.2 : 0);
        prod = Math.round(selectedNode.resourceBonus.oil * 2 * eff) + " varil/tick";
    }
    document.getElementById("dst-oilprod").innerText = prod;
    let neighText = "Yok";
    if (selectedNode.neighbors && selectedNode.neighbors.length > 0) {
        neighText = selectedNode.neighbors.map(id => {
            const n = mapNodes.find(m => m.id === id);
            return n ? n.name : id;
        }).join(", ");
    }
    document.getElementById("dst-neighbors").innerText = neighText;

    // Diplomasi panelini güncelle
    const dipPanel = document.getElementById("diplomacy-panel");
    if (selectedNode.faction !== playerFaction && selectedNode.faction !== "NEUTRAL" && selectedNode.faction !== undefined) {
        dipPanel.style.display = "block";
        const tf = factions[selectedNode.faction];
        if (tf) {
            document.getElementById("dip-title").innerHTML = `Diplomasi: ${tf.name}`;
            const rel = factions[playerFaction] ? factions[playerFaction].relations[selectedNode.faction] : "BİLİNMİYOR";
            document.getElementById("dip-relation").innerHTML = rel;
            const key = playerFaction < selectedNode.faction ? playerFaction + '_' + selectedNode.faction : selectedNode.faction + '_' + playerFaction;
            const score = relationsScore[key] || 0;
            document.getElementById("dip-score").innerHTML = score;
            const bar = document.getElementById("dip-bar");
            const pct = Math.max(0, Math.min(100, 50 + score / 2));
            bar.style.width = pct + '%';
            bar.style.background = score > 30 ? '#238636' : (score < -30 ? '#f85149' : '#58a6ff');
            document.getElementById("dip-access").innerHTML = factions[playerFaction] && factions[playerFaction].alliances[selectedNode.faction] ? 'MÜTTEFİK' : 'Yok';
        }
    } else dipPanel.style.display = "none";

    buildTradeDropdown();
    updateLedger();
}

function hasSupplyLine(army) {
    // army'nin bulunduğu şehirden başkente kadar olan yol boyunca tüm şehirler oyuncunun kontrolünde mi?
    // BFS veya DFS ile kontrol et
    const startNode = mapNodes.find(n => n.x === army.x && n.y === army.y);
    if (!startNode) return false;
    const capital = mapNodes.find(n => n.isCapital && n.faction === army.owner);
    if (!capital) return false;
    // Basitçe, aradaki tüm şehirler kontrolümüzde mi?
    // Burada graph üzerinden yol bulup kontrol edebilirsiniz.
    // Şimdilik basit: eğer ordu kendi şehrinde değilse ve bağlantı yoksa false.
    return true; // placeholder
}

function buildAntiSatellite() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi şehrini seç!"); return; }
    if (factions[playerFaction].money < 15000) { alert("15000$ gerekli!"); return; }
    if (techLevel.space < 1) { alert("Uzay teknolojisi gerekli!"); return; }
    factions[playerFaction].money -= 15000;
    // Anti-uydu füzelerini depolamak için bir değişken
    if (!factions[playerFaction].antiSat) factions[playerFaction].antiSat = 0;
    factions[playerFaction].antiSat += 1;
    addLogFiltered(`🛰️ Anti-uydu füzesi üretildi.`, "#58a6ff", selectedNode, playerFaction);
    updateLedger();
}

// Kullanım: bir düşman uydusunu vurmak için
function fireAntiSatellite(targetSatId) {
    // targetSatId ile uyduyu bul, maliyet vs.
}

// ---- JSON DOSYASI OLARAK KAYDET (Export) ----
function exportSave() {
    const data = {
        playerFaction, factions, mapNodes, armies, merchantShips, airUnits, spies, guerrillaUnits, satellites,
        discoveredBases, discoveredArmies, gameWon, zoom, panX, panY,
        techLevel, blockades, airDefenses, unSanction, radarStations, navalBases, spaceStations, missileDefenses,
        tradeRoutes, embargoActive, techTree, relationsScore,
        nonAggressionPacts, vassalStates, warReport, globalEvent, eventDuration,
        climateState, climateDuration, peaceTreaties, economicSanctions, lobbyPlayers, onlineLobbyActive
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geopolitica_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("💾 JSON dosyası olarak kaydedildi.", "#58a6ff");
}

// ---- JSON DOSYASINDAN YÜKLE (Import) ----
function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                // Tüm verileri uygula
                Object.assign(factions, data.factions);
                mapNodes.length = 0; mapNodes.push(...data.mapNodes);
                armies = data.armies.map(a => ({ ...a }));
                merchantShips = data.merchantShips || [];
                airUnits = data.airUnits || [];
                spies = data.spies || [];
                guerrillaUnits = data.guerrillaUnits || [];
                satellites = data.satellites || [];
                discoveredBases = data.discoveredBases || {};
                discoveredArmies = data.discoveredArmies || {};
                gameWon = data.gameWon || false;
                playerFaction = data.playerFaction;
                zoom = data.zoom || 1.0; panX = data.panX || 0; panY = data.panY || 0;
                techLevel = data.techLevel || { land: 0, naval: 0, air: 0, spy: 0, space: 0 };
                blockades = data.blockades || {};
                airDefenses = data.airDefenses || {};
                unSanction = data.unSanction || false;
                radarStations = data.radarStations || {};
                navalBases = data.navalBases || {};
                spaceStations = data.spaceStations || {};
                missileDefenses = data.missileDefenses || {};
                tradeRoutes = data.tradeRoutes || [];
                embargoActive = data.embargoActive || false;
                techTree = data.techTree || techTree;
                relationsScore = data.relationsScore || {};
                nonAggressionPacts = data.nonAggressionPacts || {};
                vassalStates = data.vassalStates || {};
                warReport = data.warReport || { battles: 0, wins: 0, losses: 0, totalCasualties: 0 };
                globalEvent = data.globalEvent || null;
                eventDuration = data.eventDuration || 0;
                climateState = data.climateState || 0;
                climateDuration = data.climateDuration || 0;
                peaceTreaties = data.peaceTreaties || {};
                economicSanctions = data.economicSanctions || {};
                lobbyPlayers = data.lobbyPlayers || [];
                onlineLobbyActive = data.onlineLobbyActive || false;

                // Arayüzü güncelle
                document.getElementById("start-screen").style.display = "none";
                document.getElementById("game-container").style.display = "flex";
                document.getElementById("current-faction").innerText = factions[playerFaction].name;
                buildTradeDropdown();
                updateLedger();
                updateTechUI();
                updateTradeRoutesUI();
                updateAirUI();
                updateWarReport();
                updateSpaceUI();
                updateGuerrillaUI();
                updateClimateUI();
                addLog("📂 JSON dosyası yüklendi.", "#58a6ff");
                drawMap();
                startAutoSave();
            } catch(err) {
                alert("JSON dosyası bozuk veya uyumsuz!");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function buildPowerPlant() {
    if (!selectedNode || selectedNode.faction !== playerFaction) { alert("Kendi şehrini seç!"); return; }
    if (selectedNode.powerPlant) { alert("Zaten santral var!"); return; }
    if (factions[playerFaction].money < 1500) { alert("Yetersiz bütçe!"); return; }
    factions[playerFaction].money -= 1500;
    selectedNode.powerPlant = true;
}

function isBuildingVisible(node) {
    if (!playerFaction) return true;
    if (node.faction === playerFaction) return true;
    if (factions[playerFaction] && factions[playerFaction].alliances[node.faction]) return true;
    // Radar veya uydu ile tespit
    for (let rid in radarStations) {
        const r = radarStations[rid];
        if (Math.hypot(node.x - r.x, node.y - r.y) < 120) return true;
    }
    for (let s of satellites) {
        if (s.active && Math.hypot(node.x - s.x, node.y - s.y) < 200) return true;
    }
    return false;
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        let freq = 400, dur = 100, wave = 'sine';
        if (type === 'click') { freq = 600; dur = 80; }
        else if (type === 'explosion') { freq = 150; dur = 400; wave = 'sawtooth'; }
        else if (type === 'bombardment') { freq = 200; dur = 500; wave = 'square'; }
        else if (type === 'war') { freq = 100; dur = 700; wave = 'sawtooth'; }
        else if (type === 'trade') { freq = 800; dur = 150; wave = 'sine'; }
        else if (type === 'spy') { freq = 1200; dur = 100; wave = 'sine'; }
        else if (type === 'rocket') { freq = 50; dur = 600; wave = 'sawtooth'; }
        // Hacim ayarı
        const vol = (settings.volume || 80) / 100;
        gain.gain.setValueAtTime(0.15 * vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001 * vol, audioCtx.currentTime + dur/1000);
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur/1000);
    } catch(e) {}
}

function toggleHUD() {
    showCanvasUI = !showCanvasUI;
    document.getElementById("left-ui-panel").style.display = showCanvasUI ? "flex" : "none";
    document.getElementById("right-ui-panel").style.display = showCanvasUI ? "flex" : "none";
}
