/**
 * LH44 - LOW TO HIGH SPEED
 * Condições climáticas, definições de pistas e construtor de circuitos 3D
 */

const ENV_CONDITIONS = [
  { id: 'DIA',         label: 'DIA',         icon: '🌤' },
  { id: 'TARDE',       label: 'TARDE',       icon: '🌇' },
  { id: 'NOITE',       label: 'NOITE',       icon: '🌙' },
  { id: 'DINAMICO',    label: 'DINÂMICO',    icon: '🔄' },
  { id: 'CHUVA',       label: 'CHUVA DIA',   icon: '🌧' },
  { id: 'CHUVA_NOITE', label: 'CHUVA NOITE', icon: '⛈' },
  { id: 'NEVE',        label: 'NEVE DIA',    icon: '❄' },
  { id: 'NEVE_NOITE',  label: 'NEVE NOITE',  icon: '🌨' }
];
const DYN_ORDER = ['DIA', 'TARDE', 'NOITE', 'CHUVA', 'CHUVA_NOITE', 'NEVE', 'NEVE_NOITE'];
const DYN_HOLD = 24;   // segundos estáveis em cada condição
const DYN_BLEND = 9;   // segundos de transição suave

const ENV_COLOR_KEYS = [
  'skyTop', 'skyMid', 'skyBottom', 'mountainColor', 'mountainFront',
  'roadDark', 'roadLight', 'grassDark', 'grassLight', 'rumbleDark', 'rumbleLight', 'lane',
  'cloudTop', 'cloudBot', 'sunCore', 'sunGlow'
];
const ENV_SCALARS = ['night', 'rain', 'snow', 'sun', 'dusk', 'cover', 'sunY', 'sunSize', 'glare'];

const ENV_PRESETS = {
  DIA: {
    sky: ['#1557B0', '#3B8BEB', '#92CEFF'], mtn: ['#1B5E20', '#2E7D32'], cloud: ['#FFFFFF', '#D0E5FF'],
    sunC: '#FFFDE7', sunG: '#FFEE58',
    ground: { mul: [1, 1, 1], add: [0, 0, 0], sat: 1 },
    s: { night: 0, rain: 0, snow: 0, sun: 1, dusk: 0, cover: 0.75, sunY: 30, sunSize: 1.15, glare: 0 }
  },
  TARDE: {
    sky: ['#2E103D', '#8E2E52', '#F28B30'], mtn: ['#451B26', '#682836'], cloud: ['#732648', '#FFA260'],
    sunC: '#FFE082', sunG: '#FF7043',
    ground: { mul: [1, 0.74, 0.58], add: [16, 4, -6], sat: 1.05 },
    s: { night: 0, rain: 0, snow: 0, sun: 1, dusk: 1, cover: 0.7, sunY: 48, sunSize: 1.25, glare: 0.25 }
  },
  NOITE: {
    sky: ['#040610', '#0A1126', '#162447'], mtn: ['#090D1A', '#11182D'], cloud: ['#1B2742', '#0E1630'],
    sunC: '#FFFFFF', sunG: '#FFFFFF',
    ground: { mul: [0.27, 0.31, 0.5], add: [0, 0, 8], sat: 0.9 },
    s: { night: 1, rain: 0, snow: 0, sun: 0, dusk: 0, cover: 0.3, sunY: 33, sunSize: 1, glare: 0 }
  },
  CHUVA: {
    sky: ['#38424E', '#505C6A', '#7A8896'], mtn: ['#283533', '#354440'], cloud: ['#4D5763', '#2E3640'],
    sunC: '#FFFFFF', sunG: '#FFFFFF',
    ground: { mul: [0.60, 0.65, 0.68], add: [0, 0, 0], sat: 0.55 },
    s: { night: 0, rain: 1, snow: 0, sun: 0, dusk: 0, cover: 1, sunY: 33, sunSize: 1, glare: 0 }
  },
  CHUVA_NOITE: {
    sky: ['#03050C', '#070C1B', '#0E1626'], mtn: ['#060912', '#0C111E'], cloud: ['#101726', '#080C14'],
    sunC: '#FFFFFF', sunG: '#FFFFFF',
    ground: { mul: [0.22, 0.25, 0.40], add: [0, 0, 6], sat: 0.8 },
    s: { night: 1, rain: 1, snow: 0, sun: 0, dusk: 0, cover: 0.9, sunY: 33, sunSize: 1, glare: 0 }
  },
  NEVE: {
    sky: ['#869EB6', '#B0C2D4', '#E0EAF4'], mtn: ['#C8D6E4', '#E8F0F8'], cloud: ['#F2F6FA', '#C9D6E3'],
    sunC: '#FFFFFF', sunG: '#E6F0FA',
    ground: { mul: [0.96, 0.98, 1.0], add: [6, 8, 12], sat: 0.55, grass: ['#EEF4FA', '#E0EAF3'] },
    s: { night: 0, rain: 0, snow: 1, sun: 0.12, dusk: 0, cover: 0.95, sunY: 38, sunSize: 0.9, glare: 0 }
  },
  NEVE_NOITE: {
    sky: ['#03050E', '#070E20', '#121D38'], mtn: ['#091020', '#141E38'], cloud: ['#16223C', '#0A1224'],
    sunC: '#FFFFFF', sunG: '#FFFFFF',
    ground: { mul: [0.30, 0.36, 0.52], add: [8, 12, 18], sat: 0.75, grass: ['#6B7C96', '#4A5870'] },
    s: { night: 1, rain: 0, snow: 1, sun: 0, dusk: 0, cover: 0.6, sunY: 33, sunSize: 1, glare: 0 }
  }
};

const _envCache = new Map();
function finalizeEnv(T) {
  const css = {};
  for (let i = 0; i < ENV_COLOR_KEYS.length; i++) {
    const k = ENV_COLOR_KEYS[i];
    css[k] = ColorUtil.css(T.c[k]);
  }
  T.css = css;
  return T;
}

function getEnvTarget(track, cond) {
  const key = track.id + '|' + cond;
  let T = _envCache.get(key);
  if (T) return T;
  const P = ENV_PRESETS[cond];
  const base = track.day || track.colors;
  const g = P.ground;
  const rgb = (h) => ColorUtil.parse(h);
  const gx = (h) => ColorUtil.xform(h, g.mul, g.add, g.sat);
  T = { c: {}, s: {} };
  T.c.skyTop = rgb(P.sky[0]);
  T.c.skyMid = rgb(P.sky[1]);
  T.c.skyBottom = rgb(P.sky[2]);
  T.c.mountainColor = rgb(P.mtn[0]);
  T.c.mountainFront = rgb(P.mtn[1]);
  T.c.cloudTop = rgb(P.cloud[0]);
  T.c.cloudBot = rgb(P.cloud[1]);
  T.c.sunCore = rgb(P.sunC);
  T.c.sunGlow = rgb(P.sunG);
  T.c.roadDark = gx(base.roadDark);
  T.c.roadLight = gx(base.roadLight);
  T.c.rumbleDark = gx(base.rumbleDark);
  T.c.rumbleLight = gx(base.rumbleLight);
  T.c.lane = gx(base.lane);
  T.c.grassDark = g.grass ? rgb(g.grass[1]) : gx(base.grassDark);
  T.c.grassLight = g.grass ? rgb(g.grass[0]) : gx(base.grassLight);
  for (let i = 0; i < ENV_SCALARS.length; i++) {
    T.s[ENV_SCALARS[i]] = P.s[ENV_SCALARS[i]];
  }
  finalizeEnv(T);
  _envCache.set(key, T);
  return T;
}

function lerpEnv(A, B, t) {
  const R = { c: {}, s: {} };
  for (let i = 0; i < ENV_COLOR_KEYS.length; i++) {
    const k = ENV_COLOR_KEYS[i];
    R.c[k] = ColorUtil.mix(A.c[k], B.c[k], t);
  }
  for (let i = 0; i < ENV_SCALARS.length; i++) {
    const k = ENV_SCALARS[i];
    R.s[k] = A.s[k] + (B.s[k] - A.s[k]) * t;
  }
  return finalizeEnv(R);
}

const BOT_BODY_COLORS = [
  '#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#9B59B6',
  '#E67E22', '#1ABC9C', '#ECF0F1', '#34495E', '#D35400',
  '#C0392B', '#2980B9', '#27AE60', '#8E44AD', '#F39C12',
  '#16A085', '#BDC3C7', '#7F8C8D', '#E84393'
];

// ==========================================
// PISTAS DO CAMPEONATO NACIONAL (27 CAPITAIS DO BRASIL)
// Circuitos contínuos fechados com elevações, relevos e monumentos históricos
// ==========================================
const TRACK_DEFINITIONS = [
{
  "id": "brasil",
  "name": "BRASIL GP",
  "stateCode": "GP",
  "flag": "🏁",
  "monument": "AUTÓDROMO DE INTERLAGOS",
  "landmarkScenery": "masp",
  "themeTag": "CLÁSSICA F1",
  "theme": "DIA",
  "skyTop": "#124DA6",
  "skyMid": "#3782E0",
  "skyBottom": "#8CC8FF",
  "mountainColor": "#1A5930",
  "mountainFront": "#257B40",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#383C42",
    "roadLight": "#40454C",
    "grassDark": "#1D7622",
    "grassLight": "#248A2A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#D62828",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 45,
      "curve": -2.8,
      "hill": -300,
      "scenery": "sign_left",
      "rumbleTheme": "brasil",
      "guardrail": "both"
    },
    {
      "length": 35,
      "curve": 1.8,
      "hill": -150,
      "scenery": "sign_right",
      "rumbleTheme": "brasil",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": -2.0,
      "hill": 0,
      "scenery": "tree",
      "rumbleTheme": "brasil",
      "guardrail": "both"
    },
    {
      "length": 140,
      "curve": 0,
      "hill": 800,
      "scenery": "billboard",
      "overheadBridge": true
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -400,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 90,
      "curve": 0,
      "hill": 0,
      "scenery": "streetlamp"
    },
    {
      "length": 80,
      "curve": 1.8,
      "hill": 400,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": -2.2,
      "hill": -200,
      "scenery": "tree"
    },
    {
      "length": 60,
      "curve": 2.0,
      "hill": -300,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 75,
      "curve": -2.0,
      "hill": -400,
      "scenery": "tree"
    },
    {
      "length": 80,
      "curve": -2.4,
      "hill": 400,
      "scenery": "sign_left",
      "rumbleTheme": "brasil",
      "guardrail": "both"
    },
    {
      "length": 130,
      "curve": -1.0,
      "hill": 900,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 60,
      "curve": -0.8,
      "hill": 0,
      "scenery": "streetlamp"
    }
  ]
},
{
  "id": "serra",
  "name": "SERRA BRASILEIRA",
  "stateCode": "SER",
  "flag": "⛰️",
  "monument": "SERRA DO RIO DO RASTRO",
  "landmarkScenery": "araucaria_grove",
  "themeTag": "SERRA & MONTANHA",
  "theme": "DIA",
  "skyTop": "#1557B0",
  "skyMid": "#3B8BEB",
  "skyBottom": "#92CEFF",
  "mountainColor": "#1B4332",
  "mountainFront": "#2D6A4F",
  "defaultFlora": "pine",
  "ruralPoles": true,
  "colors": {
    "roadDark": "#3C4046",
    "roadLight": "#464B52",
    "grassDark": "#1E6B2A",
    "grassLight": "#268234",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#D62828",
    "lane": "#FBBF24"
  },
  "sections": [
    {
      "length": 130,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 900,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "araucaria_grove",
      "monumentOffset": 1.8
    },
    {
      "length": 75,
      "curve": 1.6,
      "hill": 1200,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 95,
      "curve": -2.4,
      "hill": 0,
      "scenery": "pine",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -300,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 90,
      "curve": -2.7,
      "hill": -800,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 75,
      "curve": 1.5,
      "hill": -1100,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 95,
      "curve": -2.6,
      "hill": -600,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 130,
      "curve": 0,
      "hill": 0,
      "scenery": "pole"
    },
    {
      "length": 75,
      "curve": -2.0,
      "hill": 0,
      "scenery": "pine",
      "guardrail": "both"
    }
  ]
},
{
  "id": "noite",
  "name": "CIDADE METRÓPOLE",
  "stateCode": "MET",
  "flag": "🌃",
  "monument": "METRÓPOLE CYBER",
  "landmarkScenery": "estaiada",
  "themeTag": "CIDADE NOTURNA",
  "theme": "NOITE",
  "skyTop": "#1557B0",
  "skyMid": "#3B8BEB",
  "skyBottom": "#92CEFF",
  "mountainColor": "#1A2536",
  "mountainFront": "#2C3E50",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#343842",
    "roadLight": "#3E434E",
    "grassDark": "#1C6630",
    "grassLight": "#24783A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#D62828",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 80,
      "curve": -2.6,
      "hill": 400,
      "scenery": "streetlamp",
      "guardrail": "both"
    },
    {
      "length": 110,
      "curve": 0,
      "hill": 800,
      "bridge": true,
      "scenery": "streetlamp",
      "monument": "estaiada",
      "monumentOffset": -1.8
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 1200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 100,
      "curve": 1.2,
      "hill": -300,
      "scenery": "streetlamp",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -800,
      "scenery": "building",
      "guardrail": "both"
    },
    {
      "length": 75,
      "curve": -2.4,
      "hill": -400,
      "scenery": "streetlamp",
      "guardrail": "both"
    },
    {
      "length": 130,
      "curve": 0,
      "hill": 0,
      "scenery": "billboard",
      "overheadBridge": true
    },
    {
      "length": 65,
      "curve": -1.6,
      "hill": 0,
      "scenery": "building",
      "guardrail": "both"
    }
  ]
},
{
  "id": "sertao",
  "name": "DESERTO DO SERTÃO",
  "stateCode": "CAN",
  "flag": "🏜️",
  "monument": "CÂNYONS & CHAPADA DIAMANTINA",
  "landmarkScenery": "canyon_arch",
  "themeTag": "CÂNYON DO SERTÃO",
  "theme": "TARDE",
  "skyTop": "#9A3412",
  "skyMid": "#EA580C",
  "skyBottom": "#FED7AA",
  "mountainColor": "#7C2D12",
  "mountainFront": "#9A3412",
  "defaultFlora": "mandacaru",
  "ruralPoles": true,
  "colors": {
    "roadDark": "#423832",
    "roadLight": "#4E433E",
    "grassDark": "#9A3412",
    "grassLight": "#C2410C",
    "rumbleDark": "#FEF08A",
    "rumbleLight": "#EA580C",
    "lane": "#FBBF24"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.7,
      "hill": 300,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "mandacaru",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 600,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 0,
      "scenery": "bush",
      "monument": "canyon_arch",
      "monumentOffset": -1.85
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "pole"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": -500,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "mandacaru",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 400,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "pole"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "mandacaru",
      "guardrail": "both"
    }
  ]
},
{
  "id": "sao_paulo",
  "name": "SÃO PAULO • SP",
  "stateCode": "SP",
  "flag": "🏙️",
  "monument": "MASP & PONTE ESTAIADA",
  "landmarkScenery": "masp",
  "themeTag": "METRÓPOLE",
  "theme": "DIA",
  "skyTop": "#1557B0",
  "skyMid": "#3B8BEB",
  "skyBottom": "#92CEFF",
  "mountainColor": "#1A2536",
  "mountainFront": "#2C3E50",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#343842",
    "roadLight": "#3E434E",
    "grassDark": "#1C6630",
    "grassLight": "#24783A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#D62828",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 50,
      "curve": -2.8,
      "hill": -200,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "masp",
      "monumentOffset": 1.75
    },
    {
      "length": 40,
      "curve": 1.8,
      "hill": -100,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 80,
      "curve": -2.4,
      "hill": 0,
      "scenery": "building"
    },
    {
      "length": 130,
      "curve": 0,
      "hill": 600,
      "bridge": true,
      "scenery": "streetlamp",
      "monument": "ponte_estaiada",
      "monumentOffset": -1.75
    },
    {
      "length": 85,
      "curve": -2.7,
      "hill": -300,
      "scenery": "building",
      "guardrail": "both"
    },
    {
      "length": 90,
      "curve": 0,
      "hill": 0,
      "scenery": "streetlamp"
    },
    {
      "length": 75,
      "curve": 1.8,
      "hill": 400,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": -2.4,
      "hill": -200,
      "scenery": "streetlamp"
    },
    {
      "length": 65,
      "curve": 1.8,
      "hill": -300,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 80,
      "curve": -2.6,
      "hill": 400,
      "scenery": "sign_left",
      "rumbleTheme": "brasil",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": -1.5,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 60,
      "curve": -1.2,
      "hill": 0,
      "scenery": "streetlamp"
    }
  ]
},
{
  "id": "rio_de_janeiro",
  "name": "RIO DE JANEIRO • RJ",
  "stateCode": "RJ",
  "flag": "🏖️",
  "monument": "CRISTO REDENTOR & ARCOS DA LAPA",
  "landmarkScenery": "cristo_redentor",
  "themeTag": "CIDADE MARAVILHOSA",
  "theme": "DIA",
  "skyTop": "#124DA6",
  "skyMid": "#3782E0",
  "skyBottom": "#8CC8FF",
  "mountainColor": "#1A5930",
  "mountainFront": "#257B40",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#383C42",
    "roadLight": "#40454C",
    "grassDark": "#1B7524",
    "grassLight": "#23892C",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#D62828",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 150,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true,
      "monument": "calcadao_copacabana",
      "monumentOffset": 1.8
    },
    {
      "length": 70,
      "curve": -2.6,
      "hill": 400,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "arcos_lapa",
      "monumentOffset": -1.75
    },
    {
      "length": 75,
      "curve": 1.6,
      "hill": 700,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 90,
      "curve": -2.5,
      "hill": 1100,
      "scenery": "tree",
      "monument": "cristo_redentor",
      "monumentOffset": 1.8
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -400,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": -700,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 300,
      "scenery": "palm",
      "guardrail": "both",
      "monument": "maracana",
      "monumentOffset": -1.82
    },
    {
      "length": 130,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "brasilia",
  "name": "BRASÍLIA • DF",
  "stateCode": "DF",
  "flag": "🏛️",
  "monument": "CONGRESSO NACIONAL & CATEDRAL",
  "landmarkScenery": "congresso_nacional",
  "themeTag": "CAPITAL FEDERAL",
  "theme": "DIA",
  "skyTop": "#1D4ED8",
  "skyMid": "#3B82F6",
  "skyBottom": "#93C5FD",
  "mountainColor": "#6B4226",
  "mountainFront": "#854D0E",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#334155",
    "roadLight": "#3E4C5E",
    "grassDark": "#854D0E",
    "grassLight": "#A16207",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 150,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 70,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "catedral_brasilia",
      "monumentOffset": 1.75
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 200,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 500,
      "bridge": true,
      "scenery": "streetlamp",
      "monument": "congresso_nacional",
      "monumentOffset": -1.8
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -300,
      "scenery": "billboard",
      "monument": "ponte_jk",
      "monumentOffset": 1.82
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "bridge": true,
      "scenery": "streetlamp",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": -200,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "streetlamp",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "streetlamp",
      "guardrail": "both"
    }
  ]
},
{
  "id": "salvador",
  "name": "SALVADOR • BA",
  "stateCode": "BA",
  "flag": "🌴",
  "monument": "ELEVADOR LACERDA & FAROL DA BARRA",
  "landmarkScenery": "elevador_lacerda",
  "themeTag": "PRIMEIRA CAPITAL",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#BAE6FD",
  "mountainColor": "#15803D",
  "mountainFront": "#166534",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#383E48",
    "roadLight": "#434B56",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#EA580C",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 70,
      "curve": -2.7,
      "hill": 400,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "farol_barra",
      "monumentOffset": 1.8
    },
    {
      "length": 75,
      "curve": 1.6,
      "hill": 800,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 90,
      "curve": -2.5,
      "hill": 0,
      "scenery": "tree",
      "monument": "elevador_lacerda",
      "monumentOffset": -1.8
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -600,
      "bridge": true,
      "scenery": "streetlamp",
      "monument": "mercado_modelo",
      "monumentOffset": 1.78
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": -500,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.5,
      "hill": 0,
      "scenery": "palm",
      "monument": "pelourinho",
      "monumentOffset": -1.82
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 300,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 130,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "belo_horizonte",
  "name": "BELO HORIZONTE • MG",
  "stateCode": "MG",
  "flag": "⛰️",
  "monument": "IGREJA DA PAMPULHA & SERRA DO CURRAL",
  "landmarkScenery": "igreja_pampulha",
  "themeTag": "SERRA & LAGOA",
  "theme": "DIA",
  "skyTop": "#1E3A8A",
  "skyMid": "#3B82F6",
  "skyBottom": "#93C5FD",
  "mountainColor": "#334155",
  "mountainFront": "#475569",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#3C4046",
    "roadLight": "#464B52",
    "grassDark": "#1E6B2A",
    "grassLight": "#268234",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 300,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "igreja_pampulha",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 700,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 1000,
      "scenery": "tree",
      "monument": "mineirao",
      "monumentOffset": -1.82
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -400,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.7,
      "hill": -700,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 400,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 130,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "curitiba",
  "name": "CURITIBA • PR",
  "stateCode": "PR",
  "flag": "🌲",
  "monument": "JARDIM BOTÂNICO & MUSEU DO OLHO",
  "landmarkScenery": "jardim_botanico",
  "themeTag": "CIDADE ECOLÓGICA",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#CFFAFE",
  "mountainColor": "#164E63",
  "mountainFront": "#155E75",
  "defaultFlora": "pine",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#353B42",
    "roadLight": "#3F4750",
    "grassDark": "#14532D",
    "grassLight": "#166534",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#16A34A",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.7,
      "hill": 200,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "jardim_botanico",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 500,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 0,
      "scenery": "pine",
      "monument": "museu_olho",
      "monumentOffset": -1.8
    },
    {
      "length": 110,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": -400,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.5,
      "hill": 0,
      "scenery": "pine",
      "monument": "araucaria_grove",
      "monumentOffset": 1.82
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 300,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "pine",
      "guardrail": "both"
    }
  ]
},
{
  "id": "porto_alegre",
  "name": "PORTO ALEGRE • RS",
  "stateCode": "RS",
  "flag": "🧉",
  "monument": "USINA DO GASÔMETRO & O LAÇADOR",
  "landmarkScenery": "usina_gasometro",
  "themeTag": "ORLA DO GUAÍBA",
  "theme": "DIA",
  "skyTop": "#1E3A8A",
  "skyMid": "#3B82F6",
  "skyBottom": "#93C5FD",
  "mountainColor": "#1E293B",
  "mountainFront": "#334155",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D44",
    "roadLight": "#424952",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 200,
      "scenery": "sign_left",
      "guardrail": "both",
      "monument": "usina_gasometro",
      "monumentOffset": -1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.5,
      "hill": 300,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "scenery": "billboard",
      "monument": "estatua_lacador",
      "monumentOffset": 1.78
    },
    {
      "length": 85,
      "curve": -2.7,
      "hill": -300,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "streetlamp",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "recife",
  "name": "RECIFE • PE",
  "stateCode": "PE",
  "flag": "🎭",
  "monument": "MARCO ZERO & PONTES HISTÓRICAS",
  "landmarkScenery": "marco_zero",
  "themeTag": "VENEZA BRASILEIRA",
  "theme": "DIA",
  "skyTop": "#0D9488",
  "skyMid": "#14B8A6",
  "skyBottom": "#CCFBF1",
  "mountainColor": "#0F766E",
  "mountainFront": "#115E59",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#383E46",
    "roadLight": "#424953",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#FEDD00",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.7,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "marco_zero_recife",
      "monumentOffset": 1.8
    },
    {
      "length": 60,
      "curve": 1.6,
      "hill": 300,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "monument": "calcadao_copacabana",
      "monumentOffset": -1.8
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "fortaleza",
  "name": "FORTALEZA • CE",
  "stateCode": "CE",
  "flag": "🌊",
  "monument": "DRAGÃO DO MAR & ESPIGÃO DE IRACEMA",
  "landmarkScenery": "dragao_do_mar",
  "themeTag": "TERRA DA LUZ",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#E0F2FE",
  "mountainColor": "#D97706",
  "mountainFront": "#B45309",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#3A3E45",
    "roadLight": "#444952",
    "grassDark": "#B45309",
    "grassLight": "#D97706",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 145,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "dragao_do_mar",
      "monumentOffset": -1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 200,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 300,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "manaus",
  "name": "MANAUS • AM",
  "stateCode": "AM",
  "flag": "🐆",
  "monument": "TEATRO AMAZONAS & PONTE RIO NEGRO",
  "landmarkScenery": "teatro_amazonas",
  "themeTag": "CORAÇÃO DA AMAZÔNIA",
  "theme": "DIA",
  "skyTop": "#0F766E",
  "skyMid": "#14B8A6",
  "skyBottom": "#CCFBF1",
  "mountainColor": "#064E3B",
  "mountainFront": "#065F46",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#32373E",
    "roadLight": "#3C424C",
    "grassDark": "#064E3B",
    "grassLight": "#047857",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#FEDD00",
    "lane": "#FEDD00"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.7,
      "hill": 200,
      "scenery": "sign_left",
      "monument": "teatro_amazonas",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "sign_right",
      "guardrail": "both",
      "monument": "encontro_aguas",
      "monumentOffset": -1.82
    },
    {
      "length": 90,
      "curve": -2.6,
      "hill": 400,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": -300,
      "scenery": "tree"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "belem",
  "name": "BELÉM • PA",
  "stateCode": "PA",
  "flag": "🥭",
  "monument": "MERCADO VER-O-PESO & DOCAS",
  "landmarkScenery": "ver_o_peso",
  "themeTag": "PORTAL DA AMAZÔNIA",
  "theme": "DIA",
  "skyTop": "#0369A1",
  "skyMid": "#0EA5E9",
  "skyBottom": "#E0F2FE",
  "mountainColor": "#064E3B",
  "mountainFront": "#047857",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#353B44",
    "roadLight": "#404752",
    "grassDark": "#047857",
    "grassLight": "#059669",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#EA580C",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "ver_o_peso",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "monument": "estacao_docas",
      "monumentOffset": -1.8
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "goiania",
  "name": "GOIÂNIA • GO",
  "stateCode": "GO",
  "flag": "🌻",
  "monument": "MONUMENTO ÀS TRÊS RAÇAS & ART DÉCO",
  "landmarkScenery": "tres_racas",
  "themeTag": "CORAÇÃO DO CERRADO",
  "theme": "DIA",
  "skyTop": "#1D4ED8",
  "skyMid": "#3B82F6",
  "skyBottom": "#BFDBFE",
  "mountainColor": "#713F12",
  "mountainFront": "#854D0E",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373E47",
    "roadLight": "#414954",
    "grassDark": "#854D0E",
    "grassLight": "#A16207",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#16A34A",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 145,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "tres_racas",
      "monumentOffset": 1.75
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 200,
      "scenery": "sign_right",
      "guardrail": "both",
      "monument": "bosque_buritis",
      "monumentOffset": -1.82
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "florianopolis",
  "name": "FLORIANÓPOLIS • SC",
  "stateCode": "SC",
  "flag": "🌉",
  "monument": "PONTE HERCÍLIO LUZ & ILHA DA MAGIA",
  "landmarkScenery": "ponte_hercilio_luz",
  "themeTag": "ILHA DA MAGIA",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#E0F2FE",
  "mountainColor": "#155E75",
  "mountainFront": "#0E7490",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#353B44",
    "roadLight": "#404752",
    "grassDark": "#0E7490",
    "grassLight": "#06B6D4",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.7,
      "hill": 200,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 500,
      "bridge": true,
      "scenery": "streetlamp",
      "monument": "ponte_hercilio_luz",
      "monumentOffset": -1.8
    },
    {
      "length": 90,
      "curve": -2.6,
      "hill": -300,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": -400,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 70,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 300,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "vitoria",
  "name": "VITÓRIA • ES",
  "stateCode": "ES",
  "flag": "⛵",
  "monument": "CONVENTO DA PENHA & TERCEIRA PONTE",
  "landmarkScenery": "convento_penha",
  "themeTag": "CIDADE SOL",
  "theme": "DIA",
  "skyTop": "#0369A1",
  "skyMid": "#0EA5E9",
  "skyBottom": "#BAE6FD",
  "mountainColor": "#15803D",
  "mountainFront": "#166534",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414952",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.7,
      "hill": 500,
      "scenery": "sign_left",
      "monument": "convento_penha",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 800,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -400,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -500,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "natal",
  "name": "NATAL • RN",
  "stateCode": "RN",
  "flag": "☀️",
  "monument": "FORTE DOS REIS MAGOS & MORRO DO CARECA",
  "landmarkScenery": "forte_reis_magos",
  "themeTag": "CIDADE DO SOL",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#FEF08A",
  "mountainColor": "#CA8A04",
  "mountainFront": "#EAB308",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#3C3F46",
    "roadLight": "#464B53",
    "grassDark": "#CA8A04",
    "grassLight": "#EAB308",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 300,
      "scenery": "sign_left",
      "monument": "forte_reis_magos",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 600,
      "scenery": "palm",
      "guardrail": "both",
      "monument": "morro_careca",
      "monumentOffset": -1.82
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -400,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -300,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 300,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "maceio",
  "name": "MACEIÓ • AL",
  "stateCode": "AL",
  "flag": "🥥",
  "monument": "ORLA DE PAJUÇARA & PISCINAS NATURAIS",
  "landmarkScenery": "farol_cabo_branco",
  "themeTag": "PARAÍSO DAS ÁGUAS",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#99F6E4",
  "mountainColor": "#0F766E",
  "mountainFront": "#14B8A6",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414953",
    "grassDark": "#0F766E",
    "grassLight": "#14B8A6",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0D9488",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "cadeira_gigante",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": 0,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "joao_pessoa",
  "name": "JOÃO PESSOA • PB",
  "stateCode": "PB",
  "flag": "🌅",
  "monument": "FAROL DO CABO BRANCO & PONTA DO SEIXAS",
  "landmarkScenery": "farol_cabo_branco",
  "themeTag": "PORTAL DAS AMÉRICAS",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#FEF08A",
  "mountainColor": "#15803D",
  "mountainFront": "#166534",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414953",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 300,
      "scenery": "sign_left",
      "monument": "farol_cabo_branco",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 500,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -300,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "sao_luis",
  "name": "SÃO LUÍS • MA",
  "stateCode": "MA",
  "flag": "🏛️",
  "monument": "PALÁCIO DOS LEÕES & AZULEJOS COLONIAIS",
  "landmarkScenery": "palacio_leoes",
  "themeTag": "ILHA DO AMOR",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#E0F2FE",
  "mountainColor": "#0F766E",
  "mountainFront": "#115E59",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414953",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "palacio_leoes",
      "monumentOffset": -1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "teresina",
  "name": "TERESINA • PI",
  "stateCode": "PI",
  "flag": "☀️",
  "monument": "PONTE ESTAIADA & ENCONTRO DOS RIOS",
  "landmarkScenery": "ponte_estaiada",
  "themeTag": "CIDADE VERDE",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#FED7AA",
  "mountainColor": "#854D0E",
  "mountainFront": "#A16207",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#3C3F46",
    "roadLight": "#464B53",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#EA580C",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 200,
      "scenery": "sign_left",
      "monument": "ponte_estaiada",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 400,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -200,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "aracaju",
  "name": "ARACAJU • SE",
  "stateCode": "SE",
  "flag": "🦀",
  "monument": "PASSARELA DO CARANGUEJO & ORLA DE ATALAIA",
  "landmarkScenery": "arcos_atalaia",
  "themeTag": "ORLA DE ATALAIA",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#E0F2FE",
  "mountainColor": "#15803D",
  "mountainFront": "#166534",
  "defaultFlora": "palm",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414953",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "arcos_atalaia",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both",
      "monument": "caranguejo_gigante",
      "monumentOffset": -1.8
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": 0,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "palm",
      "guardrail": "both"
    }
  ]
},
{
  "id": "cuiaba",
  "name": "CUIABÁ • MT",
  "stateCode": "MT",
  "flag": "🐆",
  "monument": "CENTRO GEODÉSICO DA AMÉRICA DO SUL",
  "landmarkScenery": "centro_geodesico",
  "themeTag": "PANTANAL & CHAPADA",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#FED7AA",
  "mountainColor": "#9A3412",
  "mountainFront": "#C2410C",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#3C3E45",
    "roadLight": "#464953",
    "grassDark": "#854D0E",
    "grassLight": "#A16207",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#EA580C",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 300,
      "scenery": "sign_left",
      "monument": "centro_geodesico",
      "monumentOffset": 1.75
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 600,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -300,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": -400,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "campo_grande",
  "name": "CAMPO GRANDE • MS",
  "stateCode": "MS",
  "flag": "🦜",
  "monument": "MONUMENTO DAS ARARAS & PARQUE DAS NAÇÕES",
  "landmarkScenery": "monumento_araras",
  "themeTag": "CIDADE MORENA",
  "theme": "DIA",
  "skyTop": "#1D4ED8",
  "skyMid": "#3B82F6",
  "skyBottom": "#DBEAFE",
  "mountainColor": "#15803D",
  "mountainFront": "#166534",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414953",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 200,
      "scenery": "sign_left",
      "monument": "monumento_araras",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 300,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "porto_velho",
  "name": "PORTO VELHO • RO",
  "stateCode": "RO",
  "flag": "🚂",
  "monument": "AS TRÊS CAIXAS D'ÁGUA & MADEIRA-MAMORÉ",
  "landmarkScenery": "tres_caixas_dagua",
  "themeTag": "ESTRADA DE FERRO",
  "theme": "DIA",
  "skyTop": "#0F766E",
  "skyMid": "#14B8A6",
  "skyBottom": "#CCFBF1",
  "mountainColor": "#064E3B",
  "mountainFront": "#065F46",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#353B44",
    "roadLight": "#404752",
    "grassDark": "#064E3B",
    "grassLight": "#047857",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "tres_caixas_dagua",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "rio_branco",
  "name": "RIO BRANCO • AC",
  "stateCode": "AC",
  "flag": "⭐",
  "monument": "PALÁCIO RIO BRANCO & PASSARELA JOAQUIM MACEDO",
  "landmarkScenery": "palacio_rio_branco",
  "themeTag": "TERRA DE CHICO MENDES",
  "theme": "DIA",
  "skyTop": "#0F766E",
  "skyMid": "#14B8A6",
  "skyBottom": "#CCFBF1",
  "mountainColor": "#064E3B",
  "mountainFront": "#065F46",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#353B44",
    "roadLight": "#404752",
    "grassDark": "#064E3B",
    "grassLight": "#047857",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 200,
      "scenery": "sign_left",
      "monument": "palacio_rio_branco",
      "monumentOffset": -1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 400,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": -200,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "macapa",
  "name": "MACAPÁ • AP",
  "stateCode": "AP",
  "flag": "🌐",
  "monument": "MARCO ZERO DO EQUADOR & FORTALEZA DE SÃO JOSÉ",
  "landmarkScenery": "marco_zero_equador",
  "themeTag": "LINHA DO EQUADOR",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#E0F2FE",
  "mountainColor": "#0F766E",
  "mountainFront": "#115E59",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#353B44",
    "roadLight": "#404752",
    "grassDark": "#15803D",
    "grassLight": "#16A34A",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#0284C7",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "marco_zero_equador",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "boa_vista",
  "name": "BOA VISTA • RR",
  "stateCode": "RR",
  "flag": "🏹",
  "monument": "MONUMENTO AOS PIONEIROS & MONTE RORAIMA",
  "landmarkScenery": "monumento_pioneiros",
  "themeTag": "CIDADE EM LEQUE",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#FED7AA",
  "mountainColor": "#1E293B",
  "mountainFront": "#334155",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#373D45",
    "roadLight": "#414953",
    "grassDark": "#854D0E",
    "grassLight": "#A16207",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#DC2626",
    "lane": "#FACC15"
  },
  "sections": [
    {
      "length": 140,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 200,
      "scenery": "sign_left",
      "monument": "monumento_pioneiros",
      "monumentOffset": 1.78
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 400,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
},
{
  "id": "palmas",
  "name": "PALMAS • TO",
  "stateCode": "TO",
  "flag": "☀️",
  "monument": "PALÁCIO ARAGUAIA & PRAÇA DOS GIRASSÓIS",
  "landmarkScenery": "palacio_araguaia",
  "themeTag": "MAIOR PRAÇA DA AMÉRICA",
  "theme": "DIA",
  "skyTop": "#0284C7",
  "skyMid": "#38BDF8",
  "skyBottom": "#FED7AA",
  "mountainColor": "#78350F",
  "mountainFront": "#92400E",
  "defaultFlora": "tree",
  "urbanLighting": true,
  "colors": {
    "roadDark": "#3A3E46",
    "roadLight": "#444952",
    "grassDark": "#92400E",
    "grassLight": "#B45309",
    "rumbleDark": "#F8FAFC",
    "rumbleLight": "#FBBF24",
    "lane": "#FFFFFF"
  },
  "sections": [
    {
      "length": 145,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "pitWall": true,
      "timingTower": true,
      "overheadBridge": true
    },
    {
      "length": 75,
      "curve": -2.6,
      "hill": 0,
      "scenery": "sign_left",
      "monument": "palacio_araguaia",
      "monumentOffset": 1.8
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 200,
      "scenery": "sign_right",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 120,
      "curve": 0,
      "hill": -200,
      "bridge": true,
      "scenery": "streetlamp"
    },
    {
      "length": 85,
      "curve": -2.8,
      "hill": 0,
      "scenery": "sign_left",
      "guardrail": "both"
    },
    {
      "length": 65,
      "curve": 1.6,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    },
    {
      "length": 85,
      "curve": -2.6,
      "hill": 200,
      "scenery": "billboard",
      "guardrail": "both"
    },
    {
      "length": 125,
      "curve": 0,
      "hill": 0,
      "scenery": "grandstand",
      "rumbleTheme": "brasil"
    },
    {
      "length": 80,
      "curve": -2.2,
      "hill": 0,
      "scenery": "tree",
      "guardrail": "both"
    }
  ]
}
];


class TrackBuilder {
  static build(trackDef) {
    const segments = [];
    const sections = trackDef.sections;

    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      const segCount = sec.length;
      const maxCurve = sec.curve;
      const maxHill  = sec.hill || 0;

      for (let i = 0; i < segCount; i++) {
        const idx = segments.length;

        // Transição senoidal longa (36%) na entrada e saída de cada curva para máxima fluidez
        let curveRatio = 1.0;
        const ramp = Math.floor(segCount * 0.36);
        if (ramp > 0) {
          if (i < ramp) {
            curveRatio = 0.5 - 0.5 * Math.cos((i / ramp) * Math.PI);
          } else if (i > segCount - ramp) {
            curveRatio = 0.5 - 0.5 * Math.cos(((segCount - i) / ramp) * Math.PI);
          }
        }
        const curveVal = maxCurve * curveRatio;

        const prevY = (idx === 0) ? 0 : segments[idx - 1].p2.world.y;
        let y2 = prevY;
        if (maxHill !== 0) {
          const phase = (i / segCount) * Math.PI * 2;
          const currentH = (1 - Math.cos(phase)) * 0.5 * maxHill;
          const nextPhase = ((i + 1) / segCount) * Math.PI * 2;
          const nextH = (1 - Math.cos(nextPhase)) * 0.5 * maxHill;
          y2 = prevY + (nextH - currentH);
        }

        const isLight = Math.floor(idx / 3) % 2 === 0;
        const segColors = {
          road:   isLight ? trackDef.colors.roadLight   : trackDef.colors.roadDark,
          grass:  isLight ? trackDef.colors.grassLight  : trackDef.colors.grassDark,
          rumble: (sec.rumbleTheme === 'brasil')
            ? (isLight ? '#FEDD00' : '#009739')
            : (isLight ? trackDef.colors.rumbleLight : trackDef.colors.rumbleDark),
          lane:   isLight ? trackDef.colors.lane        : 'transparent'
        };

        const guardrailBoth = (sec.guardrail === 'both') || !!sec.bridge;
        const guardLeft = guardrailBoth || (sec.guardrail === 'left');
        const guardRight = guardrailBoth || (sec.guardrail === 'right');

        const isTunnel = !!sec.tunnel;
        const isBridge = !!sec.bridge;
        let tunnelPortal = null;
        if (isTunnel) {
          if (i === 0) tunnelPortal = 'entry';
          else if (i === segCount - 1) tunnelPortal = 'exit';
        }

        // Passarela aérea / Pórtico patrocinado
        const isOverhead = !!sec.overheadBridge && (s === 0 ? (i === 44) : (i === Math.floor(segCount / 2)));

        // --- SISTEMA RICO DE CENÁRIOS E PROPS LATERAIS DUPLOS ---
        const sceneries = [];

        // 1. Elementos da Reta de Largada / Boxes (Seção 0)
        if (sec.timingTower && i === 26) {
          sceneries.push({ type: 'timing_tower', offset: -1.30 });
        }
        if (sec.pitWall && i >= 10 && i < segCount - 12 && (i % 6 === 0)) {
          sceneries.push({ type: 'pit_wall', offset: 1.15 });
        }
        if (s === 0 && i >= 12 && i < segCount - 14 && (i % 12 === 0)) {
          sceneries.push({ type: 'grandstand', offset: -1.86 });
          sceneries.push({ type: 'grandstand', offset: 1.86 });
        }

        // 2. Monumentos Principais e Secundários da Seção
        if (sec.monument && i === Math.floor(segCount * 0.45)) {
          const mOffset = (typeof sec.monumentOffset === 'number')
            ? sec.monumentOffset
            : (sec.curve > 0 ? -1.82 : 1.82);
          sceneries.push({ type: sec.monument, offset: mOffset });
        }
        if (sec.monument2 && i === Math.floor(segCount * 0.78)) {
          const mOffset2 = (typeof sec.monument2Offset === 'number')
            ? sec.monument2Offset
            : (sec.curve > 0 ? 1.82 : -1.82);
          sceneries.push({ type: sec.monument2, offset: mOffset2 });
        }

        // 3. Povoamento Rítmico das Margens (Cada 6 a 8 segmentos)
        const isSharp = Math.abs(sec.curve) >= 1.5;
        if (isSharp) {
          // Curva acentuada: Placas refletivas com setas no lado externo da curva
          if (idx % 8 === 0) {
            if (sec.curve < 0) {
              sceneries.push({ type: 'sign_left', offset: 1.76 }); // Seta para esquerda no bordo externo direito
            } else {
              sceneries.push({ type: 'sign_right', offset: -1.76 }); // Seta para direita no bordo externo esquerdo
            }
          }
          // Lado interno da curva: flora regional (palmeira, pinheiro ou árvore)
          if (idx % 12 === 4) {
            const innerSide = (sec.curve < 0) ? -1.86 : 1.86;
            const flora = sec.flora || trackDef.defaultFlora || 'tree';
            sceneries.push({ type: flora, offset: innerSide });
          }
        } else {
          // Reta ou curva suave: Postes de iluminação, flora regional e outdoors retrô
          if (sec.bridge) {
            // Pontes e viadutos contam com postes duplos iluminados
            if (idx % 10 === 0) {
              sceneries.push({ type: 'streetlamp', offset: -1.68 });
              sceneries.push({ type: 'streetlamp', offset: 1.68 });
            }
          } else if (sec.scenery === 'building') {
            if (idx % 12 === 0) {
              sceneries.push({ type: 'building', offset: (idx % 24 === 0 ? -1.92 : 1.92) });
              sceneries.push({ type: 'streetlamp', offset: (idx % 24 === 0 ? 1.78 : -1.78) });
            }
          } else {
            // Margem com iluminação rítmica
            if (idx % 8 === 0) {
              const lampSide = (idx % 16 === 0) ? -1.80 : 1.80;
              const lampType = trackDef.urbanLighting ? 'streetlamp' : (trackDef.ruralPoles ? 'pole' : 'streetlamp');
              sceneries.push({ type: lampType, offset: lampSide });
            }
            // Margem oposta com vegetação regional nativa
            if (idx % 12 === 6) {
              const floraSide = (idx % 24 === 6) ? 1.88 : -1.88;
              const floraType = sec.flora || trackDef.defaultFlora || (sec.scenery && sec.scenery !== 'streetlamp' ? sec.scenery : 'tree');
              sceneries.push({ type: floraType, offset: floraSide });
            }
            // Outdoors de patrocinadores clássicos (LH44, Champion, Pirelli, Petrobras)
            if (idx % 20 === 10) {
              const billSide = (idx % 40 === 10) ? -1.86 : 1.86;
              sceneries.push({ type: 'billboard', offset: billSide });
            }
          }
        }

        const sceneryObj = (sceneries.length === 1) ? sceneries[0] : (sceneries.length > 1 ? sceneries : null);
        const hasPitWall = !!(sec.pitWall && i >= 10 && i < segCount - 12);

        segments.push({
          index: idx,
          p1: { world: { x: 0, y: prevY, z: idx * SEGMENT_LENGTH }, camera: {}, screen: {} },
          p2: { world: { x: 0, y: y2,    z: (idx + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
          curve: curveVal,
          color: segColors,
          scenery: sceneryObj,
          guardrailLeft: guardLeft,
          guardrailRight: guardRight,
          pitWall: hasPitWall,
          tunnel: sec.tunnel || null,
          tunnelPortal: tunnelPortal,
          bridge: isBridge,
          overheadBridge: isOverhead,
          gridBox: null,
          clipY: INTERNAL_HEIGHT,
          cars: []
        });
      }
    }

    // Marca os 20 colchetes brancos do Grid de Largada estilo Fórmula 1 no asfalto
    for (let slot = 1; slot <= TOTAL_RACERS; slot++) {
      const rowFromBack = Math.floor((TOTAL_RACERS - slot) / 2);
      const isLeft = (slot % 2 === 1);
      const slotZ = 1600 + rowFromBack * GRID_ROW_SPACING + (isLeft ? GRID_STAGGER_Z : 0);
      const boxSegIdx = Math.floor((slotZ + 45) / SEGMENT_LENGTH);
      if (boxSegIdx >= 0 && boxSegIdx < segments.length) {
        segments[boxSegIdx].gridBox = isLeft ? 'left' : 'right';
      }
    }

    // Garante continuidade vertical (sem degrau na linha de chegada ao fechar a volta)
    if (segments.length > 0) {
      const totalSegs = segments.length;
      const residualY = segments[totalSegs - 1].p2.world.y;
      if (Math.abs(residualY) > 0.0001) {
        for (let i = 0; i < totalSegs; i++) {
          segments[i].p1.world.y -= (i / totalSegs) * residualY;
          segments[i].p2.world.y -= ((i + 1) / totalSegs) * residualY;
        }
      }
    }

    // =========================================================================
    // GERADOR DE MINIMAPA GEOMETRICAMENTE EXATO (CORRESPONDÊNCIA 100% COM A PISTA)
    // =========================================================================
    const K_HEADING = 0.0118;
    const angles = [0];
    let curAngle = 0;
    for (let i = 0; i < segments.length; i++) {
      curAngle += segments[i].curve * K_HEADING;
      angles.push(curAngle);
    }
    const totalAngle = angles[angles.length - 1];
    const targetTurn = -Math.PI * 2;
    const errAngle = targetTurn - totalAngle;
    const totalSegs = segments.length;

    // Distribui o resíduo angular de forma suave e contínua ao longo de toda a extensão
    const corrAngles = [];
    for (let i = 0; i < totalSegs; i++) {
      corrAngles.push(angles[i] + errAngle * (i / totalSegs));
    }

    // Integração de passos espaciais no plano cartesiano 2D
    let curX = 0, curZ = 0;
    const rawPoints = [{ x: 0, z: 0 }];
    for (let i = 0; i < totalSegs; i++) {
      curX += Math.sin(corrAngles[i]);
      curZ -= Math.cos(corrAngles[i]);
      rawPoints.push({ x: curX, z: curZ });
    }

    // Fechamento contínuo por interpolação cúbica Hermite:
    // Garante que o ponto final encoste perfeitamente no ponto inicial em (0,0) sem alterar
    // a orientação frontal retilínea da reta de largada/chegada
    const driftX = rawPoints[totalSegs].x;
    const driftZ = rawPoints[totalSegs].z;
    for (let i = 0; i <= totalSegs; i++) {
      const t = i / totalSegs;
      const w = 3 * t * t - 2 * t * t * t;
      rawPoints[i].x -= driftX * w;
      rawPoints[i].z -= driftZ * w;
    }

    // Normaliza para a caixa delimitadora 0..1 preservando as proporções naturais da pista (aspect ratio)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < totalSegs; i++) {
      const p = rawPoints[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const rangeX = Math.max(1, maxX - minX);
    const rangeZ = Math.max(1, maxZ - minZ);
    const maxDim = Math.max(rangeX, rangeZ);
    const padX = (maxDim - rangeX) * 0.5;
    const padZ = (maxDim - rangeZ) * 0.5;

    const normMap = [];
    for (let i = 0; i < totalSegs; i++) {
      normMap.push({
        x: (rawPoints[i].x - minX + padX) / maxDim,
        z: (rawPoints[i].z - minZ + padZ) / maxDim
      });
    }

    return {
      segments: segments,
      totalLength: segments.length * SEGMENT_LENGTH,
      mapPoints: normMap
    };
  }
}
