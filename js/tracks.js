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
  // -------------------------------------------------------------
  // 1. SÃO PAULO • SP
  // -------------------------------------------------------------
  {
    id: 'sao_paulo',
    name: 'SÃO PAULO • SP',
    stateCode: 'SP',
    flag: '🏙️',
    monument: 'MASP & PONTE ESTAIADA',
    landmarkScenery: 'masp',
    themeTag: 'METRÓPOLE',
    theme: 'DIA',
    skyTop: '#1557B0',
    skyMid: '#3B8BEB',
    skyBottom: '#92CEFF',
    mountainColor: '#1A2536',
    mountainFront: '#2C3E50',
    colors: {
      roadDark:   '#343842',
      roadLight:  '#3E434E',
      grassDark:  '#1C6630',
      grassLight: '#24783A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#D62828',
      lane:       '#FFFFFF'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Reta da Paulista
      { length: 50,  curve: -2.8, hill: -200, scenery: 'sign_left', guardrail: 'both', monument: 'masp', monumentOffset: 1.75 },     // Curva do MASP
      { length: 40,  curve: 1.8,  hill: -100, scenery: 'sign_right', guardrail: 'both' },                                     // S do Ibirapuera
      { length: 80,  curve: -2.0, hill: 0,    scenery: 'building' },                                                          // Avenida 23 de Maio
      { length: 130, curve: 0,    hill: 600,  bridge: true, scenery: 'streetlamp', monument: 'ponte_estaiada', monumentOffset: -1.75 }, // Viaduto da Estaiada
      { length: 85,  curve: -2.6, hill: -300, scenery: 'building', guardrail: 'both' },                                       // Curva da Marginal
      { length: 90,  curve: 0,    hill: 0,    scenery: 'pole' },                                                              // Reta Faria Lima
      { length: 80,  curve: 1.8,  hill: 400,  scenery: 'billboard', guardrail: 'both' },                                      // Curva do Banespa
      { length: 70,  curve: -2.2, hill: -200, scenery: 'streetlamp' },                                                        // Descida da Consolação
      { length: 65,  curve: 2.0,  hill: -300, scenery: 'sign_right', guardrail: 'both' },                                     // Curva do Vale do Anhangabaú
      { length: 80,  curve: -2.4, hill: 400,  scenery: 'sign_left', rumbleTheme: 'brasil', guardrail: 'both' },              // Subida da Sé
      { length: 120, curve: -0.8, hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 2. RIO DE JANEIRO • RJ
  // -------------------------------------------------------------
  {
    id: 'rio_de_janeiro',
    name: 'RIO DE JANEIRO • RJ',
    stateCode: 'RJ',
    flag: '🏖️',
    monument: 'CRISTO REDENTOR & ARCOS DA LAPA',
    landmarkScenery: 'cristo_redentor',
    themeTag: 'CIDADE MARAVILHOSA',
    theme: 'DIA',
    skyTop: '#124DA6',
    skyMid: '#3782E0',
    skyBottom: '#8CC8FF',
    mountainColor: '#1A5930',
    mountainFront: '#257B40',
    colors: {
      roadDark:   '#383C42',
      roadLight:  '#40454C',
      grassDark:  '#1B7524',
      grassLight: '#23892C',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#D62828',
      lane:       '#FACC15'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Orla de Copacabana
      { length: 60,  curve: -2.4, hill: 400,  scenery: 'sign_left', guardrail: 'both', monument: 'arcos_lapa', monumentOffset: -1.75 }, // Curva da Lapa
      { length: 80,  curve: 1.6,  hill: 700,  scenery: 'palm', guardrail: 'both' },                                           // Subida de Santa Teresa
      { length: 90,  curve: -2.2, hill: 1100, scenery: 'tree', monument: 'cristo_redentor', monumentOffset: 1.80 },            // Mirante do Corcovado
      { length: 120, curve: 0,    hill: -400, bridge: true, scenery: 'streetlamp' },                                          // Aterro do Flamengo
      { length: 85,  curve: -2.6, hill: -700, scenery: 'palm', guardrail: 'both' },                                           // Curva da Enseada de Botafogo
      { length: 90,  curve: 1.8,  hill: 0,    scenery: 'billboard' },                                                         // Contorno do Pão de Açúcar
      { length: 80,  curve: -2.0, hill: 300,  scenery: 'palm', guardrail: 'both' },                                           // Curva do Leblon
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada Maracanã
    ]
  },

  // -------------------------------------------------------------
  // 3. BRASÍLIA • DF
  // -------------------------------------------------------------
  {
    id: 'brasilia',
    name: 'BRASÍLIA • DF',
    stateCode: 'DF',
    flag: '🏛️',
    monument: 'CONGRESSO NACIONAL & CATEDRAL',
    landmarkScenery: 'congresso_nacional',
    themeTag: 'CAPITAL FEDERAL',
    theme: 'DIA',
    skyTop: '#1D4ED8',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#6B4226',
    mountainFront: '#854D0E',
    colors: {
      roadDark:   '#334155',
      roadLight:  '#3E4C5E',
      grassDark:  '#854D0E',
      grassLight: '#A16207',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FACC15'
    },
    sections: [
      { length: 160, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Eixo Monumental
      { length: 60,  curve: -2.2, hill: 0,    scenery: 'sign_left', monument: 'catedral_brasilia', monumentOffset: 1.75 },     // Esplanada dos Ministérios
      { length: 90,  curve: 1.8,  hill: 200,  scenery: 'sign_right', guardrail: 'both' },                                     // Curva do Itamaraty
      { length: 140, curve: 0,    hill: 500,  bridge: true, scenery: 'streetlamp', monument: 'congresso_nacional', monumentOffset: -1.80 }, // Praça dos Três Poderes
      { length: 90,  curve: -2.5, hill: -300, scenery: 'billboard', guardrail: 'both' },                                      // Contorno da Ponte JK
      { length: 130, curve: 0,    hill: 0,    bridge: true, scenery: 'streetlamp' },                                          // Travessia do Lago Paranoá
      { length: 80,  curve: 2.0,  hill: -200, scenery: 'sign_right', guardrail: 'both' },                                     // Alça Sul
      { length: 120, curve: -1.0, hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 4. SALVADOR • BA
  // -------------------------------------------------------------
  {
    id: 'salvador',
    name: 'SALVADOR • BA',
    stateCode: 'BA',
    flag: '🌴',
    monument: 'ELEVADOR LACERDA & FAROL DA BARRA',
    landmarkScenery: 'elevador_lacerda',
    themeTag: 'PRIMEIRA CAPITAL',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#15803D',
    mountainFront: '#166534',
    colors: {
      roadDark:   '#383E48',
      roadLight:  '#434B56',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#EA580C',
      lane:       '#FFFFFF'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Orla da Barra
      { length: 65,  curve: -2.5, hill: 400,  scenery: 'sign_left', guardrail: 'both', monument: 'farol_barra', monumentOffset: 1.80 }, // Curva do Farol
      { length: 85,  curve: 1.8,  hill: 800,  scenery: 'palm', guardrail: 'both' },                                           // Ladeira da Barra
      { length: 90,  curve: -2.2, hill: 0,    scenery: 'tree', monument: 'elevador_lacerda', monumentOffset: -1.80 },          // Praça Thomé de Souza (Cidade Alta)
      { length: 120, curve: 0,    hill: -600, bridge: true, scenery: 'streetlamp' },                                          // Contorno da Baía de Todos os Santos
      { length: 80,  curve: -2.6, hill: -500, scenery: 'sign_left', guardrail: 'both' },                                      // Descida do Comércio
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Mercado Modelo
      { length: 85,  curve: -2.0, hill: 300,  scenery: 'billboard', guardrail: 'both' },                                      // Curva do Pelourinho
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 5. BELO HORIZONTE • MG
  // -------------------------------------------------------------
  {
    id: 'belo_horizonte',
    name: 'BELO HORIZONTE • MG',
    stateCode: 'MG',
    flag: '⛰️',
    monument: 'IGREJA DA PAMPULHA & SERRA DO CURRAL',
    landmarkScenery: 'igreja_pampulha',
    themeTag: 'SERRA & LAGOA',
    theme: 'DIA',
    skyTop: '#1E3A8A',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#334155',
    mountainFront: '#475569',
    colors: {
      roadDark:   '#3C4046',
      roadLight:  '#464B52',
      grassDark:  '#1E6B2A',
      grassLight: '#268234',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#D62828',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Reta da Lagoa da Pampulha
      { length: 70,  curve: -2.2, hill: 0,    scenery: 'palm', monument: 'igreja_pampulha', monumentOffset: 1.75 },            // Curva de São Francisco
      { length: 85,  curve: 1.8,  hill: 700,  scenery: 'tree', guardrail: 'both' },                                           // Subida da Mangabeiras
      { length: 90,  curve: -2.5, hill: 1000, scenery: 'sign_left', guardrail: 'both' },                                      // Mirante da Serra do Curral
      { length: 120, curve: 0,    hill: -500, bridge: true, scenery: 'streetlamp' },                                          // Viaduto da Afonso Pena
      { length: 80,  curve: 2.0,  hill: -800, scenery: 'sign_right', guardrail: 'both' },                                     // Curva da Praça da Liberdade
      { length: 85,  curve: -2.0, hill: 0,    scenery: 'tree' },                                                              // Contorno do Mineirão
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta dos Boxes
    ]
  },

  // -------------------------------------------------------------
  // 6. CURITIBA • PR
  // -------------------------------------------------------------
  {
    id: 'curitiba',
    name: 'CURITIBA • PR',
    stateCode: 'PR',
    flag: '🌲',
    monument: 'JARDIM BOTÂNICO & MUSEU DO OLHO',
    landmarkScenery: 'jardim_botanico',
    themeTag: 'CAPITAL ECOLÓGICA',
    theme: 'DIA',
    skyTop: '#1E3A8A',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#1E3A2F',
    mountainFront: '#2D5A46',
    colors: {
      roadDark:   '#383D44',
      roadLight:  '#434952',
      grassDark:  '#166534',
      grassLight: '#15803D',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#15803D',
      lane:       '#FACC15'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Reta das Araucárias
      { length: 65,  curve: -2.4, hill: 300,  scenery: 'pine', monument: 'jardim_botanico', monumentOffset: 1.80 },            // Curva da Estufa
      { length: 80,  curve: 1.6,  hill: 500,  scenery: 'pine', guardrail: 'both' },                                           // Bosque do Papa
      { length: 85,  curve: -2.5, hill: 0,    scenery: 'sign_left', monument: 'museu_olho', monumentOffset: -1.75 },          // Curva do MON (O Olho)
      { length: 120, curve: 0,    hill: -400, bridge: true, scenery: 'streetlamp' },                                          // Viaduto do Parque Barigui
      { length: 75,  curve: 2.0,  hill: -300, scenery: 'sign_right', guardrail: 'both' },                                     // Curva da Ópera de Arame
      { length: 80,  curve: -2.0, hill: 0,    scenery: 'pine' },                                                              // Pinheiros de Santa Felicidade
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 7. PORTO ALEGRE • RS
  // -------------------------------------------------------------
  {
    id: 'porto_alegre',
    name: 'PORTO ALEGRE • RS',
    stateCode: 'RS',
    flag: '🧉',
    monument: 'USINA DO GASÔMETRO & O LAÇADOR',
    landmarkScenery: 'usina_gasometro',
    themeTag: 'PÔR DO SOL NO GUAÍBA',
    theme: 'DIA',
    skyTop: '#1E293B',
    skyMid: '#854D0E',
    skyBottom: '#F97316',
    mountainColor: '#334155',
    mountainFront: '#475569',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#444952',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#DC2626',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Orla do Guaíba
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'sign_left', monument: 'usina_gasometro', monumentOffset: 1.80 },      // Curva do Gasômetro
      { length: 80,  curve: 1.8,  hill: 400,  scenery: 'tree', guardrail: 'both' },                                           // Parque Marinha do Brasil
      { length: 85,  curve: -2.2, hill: 600,  scenery: 'tree', monument: 'estatua_lacador', monumentOffset: -1.75 },          // Rotatória do Laçador
      { length: 120, curve: 0,    hill: -300, bridge: true, scenery: 'streetlamp' },                                          // Ponte Móvel do Guaíba
      { length: 75,  curve: -2.5, hill: -500, scenery: 'sign_left', guardrail: 'both' },                                      // Curva do Beira-Rio
      { length: 80,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque Farroupilha (Redenção)
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 8. RECIFE • PE
  // -------------------------------------------------------------
  {
    id: 'recife',
    name: 'RECIFE • PE',
    stateCode: 'PE',
    flag: '☀️',
    monument: 'MARCO ZERO & ESCULTURAS DE BRENNAND',
    landmarkScenery: 'marco_zero',
    themeTag: 'VENEZA BRASILEIRA',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#0F766E',
    mountainFront: '#115E59',
    colors: {
      roadDark:   '#383E46',
      roadLight:  '#424953',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#FEDD00',
      lane:       '#FFFFFF'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Cais do Apolo
      { length: 60,  curve: -2.5, hill: 0,    scenery: 'sign_left', monument: 'marco_zero_recife', monumentOffset: 1.80 },    // Praça do Marco Zero
      { length: 120, curve: 0,    hill: 300,  bridge: true, scenery: 'streetlamp' },                                          // Ponte Maurício de Nassau
      { length: 75,  curve: 1.8,  hill: 0,    scenery: 'palm', guardrail: 'both' },                                           // Bairro do Recife Antigo
      { length: 110, curve: 0,    hill: -200, bridge: true, scenery: 'streetlamp' },                                          // Ponte Buarque de Macedo
      { length: 80,  curve: -2.6, hill: 0,    scenery: 'palm', guardrail: 'both' },                                           // Curva da Bacia do Pina
      { length: 85,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Orla de Boa Viagem
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 9. FORTALEZA • CE
  // -------------------------------------------------------------
  {
    id: 'fortaleza',
    name: 'FORTALEZA • CE',
    stateCode: 'CE',
    flag: '🌊',
    monument: 'DRAGÃO DO MAR & ESPIGÃO DE IRACEMA',
    landmarkScenery: 'dragao_do_mar',
    themeTag: 'TERRA DA LUZ',
    theme: 'DIA',
    skyTop: '#0369A1',
    skyMid: '#38BDF8',
    skyBottom: '#E0F2FE',
    mountainColor: '#854D0E',
    mountainFront: '#A16207',
    colors: {
      roadDark:   '#3A4048',
      roadLight:  '#444C56',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#EA580C',
      lane:       '#FACC15'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Beira-Mar
      { length: 65,  curve: -2.4, hill: 200,  scenery: 'sign_left', monument: 'dragao_do_mar', monumentOffset: -1.75 },       // Curva do Dragão do Mar
      { length: 85,  curve: 1.8,  hill: 0,    scenery: 'palm', guardrail: 'both' },                                           // Praia de Iracema
      { length: 90,  curve: -2.2, hill: 400,  scenery: 'billboard', guardrail: 'both' },                                      // Espigão da Rui Barbosa
      { length: 120, curve: 0,    hill: -200, bridge: true, scenery: 'streetlamp' },                                          // Ponte dos Ingleses
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Praia do Futuro
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 10. MANAUS • AM
  // -------------------------------------------------------------
  {
    id: 'manaus',
    name: 'MANAUS • AM',
    stateCode: 'AM',
    flag: '🐆',
    monument: 'TEATRO AMAZONAS & PONTE RIO NEGRO',
    landmarkScenery: 'teatro_amazonas',
    themeTag: 'CORAÇÃO DA AMAZÔNIA',
    theme: 'DIA',
    skyTop: '#0F766E',
    skyMid: '#14B8A6',
    skyBottom: '#CCFBF1',
    mountainColor: '#064E3B',
    mountainFront: '#065F46',
    colors: {
      roadDark:   '#32373E',
      roadLight:  '#3C424C',
      grassDark:  '#064E3B',
      grassLight: '#047857',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#FEDD00',
      lane:       '#FEDD00'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Reta da Ponta Negra
      { length: 60,  curve: -2.6, hill: 200,  scenery: 'sign_left', monument: 'teatro_amazonas', monumentOffset: 1.80 },      // Largo de São Sebastião
      { length: 85,  curve: 1.8,  hill: 0,    scenery: 'tree', guardrail: 'both' },                                           // Encontro das Águas
      { length: 140, curve: 0,    hill: 600,  bridge: true, scenery: 'streetlamp', monument: 'ponte_estaiada', monumentOffset: -1.75 }, // Travessia da Ponte Rio Negro
      { length: 80,  curve: -2.5, hill: -400, scenery: 'tree', guardrail: 'both' },                                           // Curva da Selva Amazônica
      { length: 90,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Margens do Solimões
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 11. BELÉM • PA
  // -------------------------------------------------------------
  {
    id: 'belem',
    name: 'BELÉM • PA',
    stateCode: 'PA',
    flag: '⚓',
    monument: 'VER-O-PESO & FORTE DO PRESÉPIO',
    landmarkScenery: 'ver_o_peso',
    themeTag: 'PORTAL DA AMAZÔNIA',
    theme: 'DIA',
    skyTop: '#0369A1',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#064E3B',
    mountainFront: '#047857',
    colors: {
      roadDark:   '#343940',
      roadLight:  '#3E444E',
      grassDark:  '#065F46',
      grassLight: '#059669',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#D62828',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Visconde de Souza Franco (Doca)
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'sign_left', monument: 'ver_o_peso', monumentOffset: 1.80 },          // Curva do Ver-o-Peso
      { length: 80,  curve: 1.8,  hill: 200,  scenery: 'tree', guardrail: 'both' },                                           // Forte do Presépio (Baía do Guajará)
      { length: 90,  curve: -2.2, hill: 0,    scenery: 'palm', guardrail: 'both' },                                           // Estação das Docas
      { length: 110, curve: 0,    hill: 0,    scenery: 'pole' },                                                              // Reta da Praça da República
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Túnel das Mangueiras
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta dos Boxes
    ]
  },

  // -------------------------------------------------------------
  // 12. GOIÂNIA • GO
  // -------------------------------------------------------------
  {
    id: 'goiania',
    name: 'GOIÂNIA • GO',
    stateCode: 'GO',
    flag: '🌻',
    monument: 'MONUMENTO ÀS TRÊS RAÇAS & ART DÉCO',
    landmarkScenery: 'tres_racas',
    themeTag: 'CAPITAL DO CERRADO',
    theme: 'DIA',
    skyTop: '#1E3A8A',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#78350F',
    mountainFront: '#92400E',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#434952',
      grassDark:  '#854D0E',
      grassLight: '#A16207',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Goiás (Art Déco)
      { length: 65,  curve: -2.5, hill: 0,    scenery: 'sign_left', monument: 'tres_racas', monumentOffset: 1.75 },           // Praça Cívica
      { length: 80,  curve: 1.8,  hill: 300,  scenery: 'tree', guardrail: 'both' },                                           // Bosque dos Buritis
      { length: 120, curve: 0,    hill: 500,  bridge: true, scenery: 'streetlamp' },                                          // Viaduto Latif Sebba
      { length: 80,  curve: -2.2, hill: -400, scenery: 'billboard', guardrail: 'both' },                                      // Parque Vaca Brava
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Setor Marista
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 13. FLORIANÓPOLIS • SC
  // -------------------------------------------------------------
  {
    id: 'florianopolis',
    name: 'FLORIANÓPOLIS • SC',
    stateCode: 'SC',
    flag: '🌉',
    monument: 'PONTE HERCÍLIO LUZ & ILHA DA MAGIA',
    landmarkScenery: 'ponte_hercilio_luz',
    themeTag: 'ILHA DA MAGIA',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#E0F2FE',
    mountainColor: '#1E3A2F',
    mountainFront: '#2D5A46',
    colors: {
      roadDark:   '#383D46',
      roadLight:  '#434A54',
      grassDark:  '#166534',
      grassLight: '#15803D',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FACC15'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Beira-Mar Norte
      { length: 150, curve: 0,    hill: 600,  bridge: true, scenery: 'streetlamp', monument: 'ponte_hercilio_luz', monumentOffset: -1.80 }, // Travessia da Ponte Hercílio Luz
      { length: 75,  curve: -2.6, hill: -400, scenery: 'sign_left', guardrail: 'both' },                                      // Alça de Acesso Insular
      { length: 85,  curve: 1.8,  hill: 500,  scenery: 'pine', guardrail: 'both' },                                           // Subida do Morro da Cruz
      { length: 80,  curve: -2.2, hill: -500, scenery: 'tree', guardrail: 'both' },                                           // Lagoa da Conceição
      { length: 85,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Dunas da Joaquina
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 14. VITÓRIA • ES
  // -------------------------------------------------------------
  {
    id: 'vitoria',
    name: 'VITÓRIA • ES',
    stateCode: 'ES',
    flag: '⛪',
    monument: 'CONVENTO DA PENHA & TERCEIRA PONTE',
    landmarkScenery: 'convento_penha',
    themeTag: 'CIDADE ILHA',
    theme: 'DIA',
    skyTop: '#0369A1',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#334155',
    mountainFront: '#475569',
    colors: {
      roadDark:   '#383E46',
      roadLight:  '#434B54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#E11D48',
      lane:       '#FFFFFF'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Praia de Camburi
      { length: 150, curve: 0,    hill: 800,  bridge: true, scenery: 'streetlamp', monument: 'convento_penha', monumentOffset: 1.80 }, // Terceira Ponte sobre a Baía
      { length: 80,  curve: -2.6, hill: -500, scenery: 'sign_left', guardrail: 'both' },                                      // Curva da Enseada do Suá
      { length: 85,  curve: 1.8,  hill: 0,    scenery: 'palm', guardrail: 'both' },                                           // Curva da Ilha do Frade
      { length: 75,  curve: -2.0, hill: 300,  scenery: 'tree' },                                                              // Contorno do Penedo
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta dos Boxes
    ]
  },

  // -------------------------------------------------------------
  // 15. NATAL • RN
  // -------------------------------------------------------------
  {
    id: 'natal',
    name: 'NATAL • RN',
    stateCode: 'RN',
    flag: '⛵',
    monument: 'FORTE DOS REIS MAGOS & MORRO DO CARECA',
    landmarkScenery: 'forte_reis_magos',
    themeTag: 'CIDADE DO SOL',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#E0F2FE',
    mountainColor: '#B45309',
    mountainFront: '#D97706',
    colors: {
      roadDark:   '#3A4048',
      roadLight:  '#454D58',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#EA580C',
      lane:       '#FACC15'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Via Costeira
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'sign_left', monument: 'forte_reis_magos', monumentOffset: 1.80 },     // Curva do Forte dos Reis Magos
      { length: 130, curve: 0,    hill: 600,  bridge: true, scenery: 'streetlamp' },                                          // Ponte Newton Navarro sobre o Potengi
      { length: 80,  curve: -2.5, hill: -400, scenery: 'palm', guardrail: 'both' },                                           // Dunas de Genipabu
      { length: 85,  curve: 1.8,  hill: 500,  scenery: 'palm', guardrail: 'both' },                                           // Morro do Careca (Ponta Negra)
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 16. MACEIÓ • AL
  // -------------------------------------------------------------
  {
    id: 'maceio',
    name: 'MACEIÓ • AL',
    stateCode: 'AL',
    flag: '🥥',
    monument: 'ORLA DE PAJUÇARA & FAROL DE PONTA VERDE',
    landmarkScenery: 'farol_barra',
    themeTag: 'PARAÍSO DAS ÁGUAS',
    theme: 'DIA',
    skyTop: '#0D9488',
    skyMid: '#2DD4BF',
    skyBottom: '#CCFBF1',
    mountainColor: '#15803D',
    mountainFront: '#166534',
    colors: {
      roadDark:   '#383E46',
      roadLight:  '#434B54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#059669',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Orla de Pajuçara
      { length: 60,  curve: -2.5, hill: 0,    scenery: 'palm', monument: 'farol_barra', monumentOffset: 1.80 },               // Curva do Farol de Ponta Verde
      { length: 80,  curve: 1.8,  hill: 200,  scenery: 'palm', guardrail: 'both' },                                           // Praia de Jatiúca
      { length: 85,  curve: -2.2, hill: 0,    scenery: 'palm', guardrail: 'both' },                                           // Piscinas Naturais
      { length: 110, curve: 0,    hill: 0,    scenery: 'pole' },                                                              // Reta da Lagoa Mundaú
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Coqueirais Alagoanos
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 17. JOÃO PESSOA • PB
  // -------------------------------------------------------------
  {
    id: 'joao_pessoa',
    name: 'JOÃO PESSOA • PB',
    stateCode: 'PB',
    flag: '🌅',
    monument: 'FAROL DO CABO BRANCO & FALÉSIAS',
    landmarkScenery: 'farol_cabo_branco',
    themeTag: 'ONDE O SOL NASCE PRIMEIRO',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#B45309',
    mountainFront: '#92400E',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#434A54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#EA580C',
      lane:       '#FACC15'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Orla de Tambaú
      { length: 70,  curve: -2.4, hill: 500,  scenery: 'sign_left', monument: 'farol_cabo_branco', monumentOffset: 1.75 },     // Subida do Cabo Branco
      { length: 85,  curve: 1.8,  hill: 300,  scenery: 'palm', guardrail: 'both' },                                           // Estação Cabo Branco (Niemeyer)
      { length: 80,  curve: -2.2, hill: -400, scenery: 'tree', guardrail: 'both' },                                           // Falésias do Litoral Sul
      { length: 120, curve: 0,    hill: 0,    scenery: 'palm' },                                                              // Praia do Bessa
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque Solon de Lucena
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta dos Boxes
    ]
  },

  // -------------------------------------------------------------
  // 18. SÃO LUÍS • MA
  // -------------------------------------------------------------
  {
    id: 'sao_luis',
    name: 'SÃO LUÍS • MA',
    stateCode: 'MA',
    flag: '🏺',
    monument: 'PALÁCIO DOS LEÕES & AZULEJOS',
    landmarkScenery: 'palacio_leoes',
    themeTag: 'ILHA DO AMOR',
    theme: 'DIA',
    skyTop: '#0369A1',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#065F46',
    mountainFront: '#047857',
    colors: {
      roadDark:   '#383D46',
      roadLight:  '#434A54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FFFFFF'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Litorânea
      { length: 65,  curve: -2.5, hill: 200,  scenery: 'sign_left', monument: 'palacio_leoes', monumentOffset: 1.80 },         // Curva do Palácio dos Leões
      { length: 80,  curve: 1.8,  hill: 0,    scenery: 'tree', guardrail: 'both' },                                           // Centro Histórico de Azulejos
      { length: 120, curve: 0,    hill: 400,  bridge: true, scenery: 'streetlamp' },                                          // Ponte José Sarney
      { length: 85,  curve: -2.4, hill: -300, scenery: 'palm', guardrail: 'both' },                                           // Espigão da Ponta d'Areia
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Praia do Calhau
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 19. TERESINA • PI
  // -------------------------------------------------------------
  {
    id: 'teresina',
    name: 'TERESINA • PI',
    stateCode: 'PI',
    flag: '🌉',
    monument: 'PONTE ESTAIADA & ENCONTRO DOS RIOS',
    landmarkScenery: 'ponte_estaiada',
    themeTag: 'CIDADE VERDE',
    theme: 'DIA',
    skyTop: '#1E3A8A',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#78350F',
    mountainFront: '#92400E',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#444B54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#EAB308',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Raul Lopes
      { length: 140, curve: 0,    hill: 600,  bridge: true, scenery: 'streetlamp', monument: 'ponte_estaiada', monumentOffset: -1.75 }, // Travessia da Ponte Estaiada com Mirante
      { length: 75,  curve: -2.5, hill: -400, scenery: 'sign_left', guardrail: 'both' },                                      // Alça do Rio Poti
      { length: 85,  curve: 1.8,  hill: 0,    scenery: 'tree', guardrail: 'both' },                                           // Encontro dos Rios Parnaíba e Poti
      { length: 80,  curve: -2.0, hill: 0,    scenery: 'tree' },                                                              // Parque Ambiental
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 20. ARACAJU • SE
  // -------------------------------------------------------------
  {
    id: 'aracaju',
    name: 'ARACAJU • SE',
    stateCode: 'SE',
    flag: '🦀',
    monument: 'ARCOS DE ATALAIA & CARANGUEJO',
    landmarkScenery: 'arcos_atalaia',
    themeTag: 'ORLA MAIS BONITA',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#065F46',
    mountainFront: '#047857',
    colors: {
      roadDark:   '#383E46',
      roadLight:  '#434B54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Orla de Atalaia
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'palm', monument: 'arcos_atalaia', monumentOffset: 1.80 },             // Curva dos Arcos e do Caranguejo
      { length: 80,  curve: 1.8,  hill: 200,  scenery: 'palm', guardrail: 'both' },                                           // Passarela do Caranguejo
      { length: 120, curve: 0,    hill: 400,  bridge: true, scenery: 'streetlamp' },                                          // Ponte Construtor João Alves
      { length: 80,  curve: -2.5, hill: -300, scenery: 'tree', guardrail: 'both' },                                           // Rio Sergipe
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'palm' },                                                              // Praia de Aruana
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 21. CUIABÁ • MT
  // -------------------------------------------------------------
  {
    id: 'cuiaba',
    name: 'CUIABÁ • MT',
    stateCode: 'MT',
    flag: '🧭',
    monument: 'CENTRO GEODÉSICO DA AMÉRICA DO SUL',
    landmarkScenery: 'centro_geodesico',
    themeTag: 'CORAÇÃO DA AMÉRICA',
    theme: 'DIA',
    skyTop: '#1E3A8A',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#9A3412',
    mountainFront: '#C2410C',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#434A54',
      grassDark:  '#854D0E',
      grassLight: '#A16207',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#FEDD00',
      lane:       '#FEDD00'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida do CPA
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'sign_left', monument: 'centro_geodesico', monumentOffset: 1.75 },     // Praça Pascoal Moreira Cabral
      { length: 80,  curve: 1.8,  hill: 300,  scenery: 'tree', guardrail: 'both' },                                           // Contorno da Arena Pantanal
      { length: 90,  curve: -2.2, hill: 600,  scenery: 'billboard', guardrail: 'both' },                                      // Vista da Chapada dos Guimarães
      { length: 110, curve: 0,    hill: -400, bridge: true, scenery: 'streetlamp' },                                          // Ponte Sérgio Motta sobre o Rio Cuiabá
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque Mãe Bonifácia
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 22. CAMPO GRANDE • MS
  // -------------------------------------------------------------
  {
    id: 'campo_grande',
    name: 'CAMPO GRANDE • MS',
    stateCode: 'MS',
    flag: '🦜',
    monument: 'PARQUE DAS NAÇÕES & ARARAS GIGANTES',
    landmarkScenery: 'monumento_araras',
    themeTag: 'CIDADE MORENA',
    theme: 'DIA',
    skyTop: '#1E293B',
    skyMid: '#9A3412',
    skyBottom: '#FB923C',
    mountainColor: '#78350F',
    mountainFront: '#92400E',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#434A53',
      grassDark:  '#9A3412',
      grassLight: '#C2410C',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Afonso Pena
      { length: 65,  curve: -2.4, hill: 200,  scenery: 'sign_left', monument: 'monumento_araras', monumentOffset: 1.80 },     // Curva das Araras Gigantes
      { length: 85,  curve: 1.8,  hill: 0,    scenery: 'tree', guardrail: 'both' },                                           // Parque das Nações Indígenas
      { length: 80,  curve: -2.2, hill: 300,  scenery: 'billboard', guardrail: 'both' },                                      // Museu das Culturas Dom Bosco
      { length: 120, curve: 0,    hill: 0,    scenery: 'pole' },                                                              // Reta dos Ipês Amarelos
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque dos Poderes
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 23. PORTO VELHO • RO
  // -------------------------------------------------------------
  {
    id: 'porto_velho',
    name: 'PORTO VELHO • RO',
    stateCode: 'RO',
    flag: '🚂',
    monument: 'AS TRÊS CAIXAS D\'ÁGUA & RIO MADEIRA',
    landmarkScenery: 'tres_caixas_dagua',
    themeTag: 'PIONEIROS DA FERROVIA',
    theme: 'DIA',
    skyTop: '#0F766E',
    skyMid: '#14B8A6',
    skyBottom: '#CCFBF1',
    mountainColor: '#064E3B',
    mountainFront: '#065F46',
    colors: {
      roadDark:   '#343941',
      roadLight:  '#3E444D',
      grassDark:  '#065F46',
      grassLight: '#059669',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#D62828',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Sete de Setembro
      { length: 65,  curve: -2.5, hill: 0,    scenery: 'sign_left', monument: 'tres_caixas_dagua', monumentOffset: 1.80 },   // Praça das Três Caixas D'Água
      { length: 80,  curve: 1.8,  hill: 200,  scenery: 'tree', guardrail: 'both' },                                           // Pátio da Estrada de Ferro Madeira-Mamoré
      { length: 140, curve: 0,    hill: 500,  bridge: true, scenery: 'streetlamp' },                                          // Ponte sobre as Corredeiras do Rio Madeira
      { length: 80,  curve: -2.4, hill: -300, scenery: 'tree', guardrail: 'both' },                                           // Curva da Selva de Rondônia
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque Natural de Porto Velho
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta dos Boxes
    ]
  },

  // -------------------------------------------------------------
  // 24. RIO BRANCO • AC
  // -------------------------------------------------------------
  {
    id: 'rio_branco',
    name: 'RIO BRANCO • AC',
    stateCode: 'AC',
    flag: '⭐',
    monument: 'PALÁCIO RIO BRANCO & PASSARELA',
    landmarkScenery: 'palacio_rio_branco',
    themeTag: 'ESTRELA DA BORRACHA',
    theme: 'DIA',
    skyTop: '#047857',
    skyMid: '#10B981',
    skyBottom: '#D1FAE5',
    mountainColor: '#064E3B',
    mountainFront: '#065F46',
    colors: {
      roadDark:   '#343940',
      roadLight:  '#3E444D',
      grassDark:  '#065F46',
      grassLight: '#059669',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#DC2626',
      lane:       '#FEDD00'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Brasil
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'sign_left', monument: 'palacio_rio_branco', monumentOffset: 1.80 },  // Praça Eurico Gaspar Dutra
      { length: 120, curve: 0,    hill: 400,  bridge: true, scenery: 'streetlamp' },                                          // Passarela Joaquim Macedo sobre o Rio Acre
      { length: 80,  curve: 1.8,  hill: -200, scenery: 'tree', guardrail: 'both' },                                           // Gameleira Histórica
      { length: 85,  curve: -2.2, hill: 0,    scenery: 'tree', guardrail: 'both' },                                           // Bosque dos Seringueiros
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque da Maternidade
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 25. MACAPÁ • AP
  // -------------------------------------------------------------
  {
    id: 'macapa',
    name: 'MACAPÁ • AP',
    stateCode: 'AP',
    flag: '☀️',
    monument: 'MARCO ZERO DO EQUADOR & FORTALEZA',
    landmarkScenery: 'marco_zero_equador',
    themeTag: 'LATITUDE ZERO',
    theme: 'DIA',
    skyTop: '#0284C7',
    skyMid: '#38BDF8',
    skyBottom: '#BAE6FD',
    mountainColor: '#064E3B',
    mountainFront: '#047857',
    colors: {
      roadDark:   '#363B43',
      roadLight:  '#414751',
      grassDark:  '#065F46',
      grassLight: '#059669',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#FEDD00',
      lane:       '#FEDD00'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Rodovia Juscelino Kubitschek
      { length: 65,  curve: 0,    hill: 0,    scenery: 'pole', monument: 'marco_zero_equador', monumentOffset: 1.75 },        // Reta do Monumento Marco Zero (Linha do Equador)
      { length: 75,  curve: -2.5, hill: 200,  scenery: 'sign_left', guardrail: 'both' },                                      // Curva do Hemisfério Norte
      { length: 85,  curve: 1.8,  hill: 0,    scenery: 'tree', guardrail: 'both' },                                           // Fortaleza de São José de Macapá
      { length: 120, curve: 0,    hill: 0,    scenery: 'palm' },                                                              // Orla do Rio Amazonas
      { length: 80,  curve: -2.2, hill: 0,    scenery: 'sign_right', guardrail: 'both' },                                     // Curva do Hemisfério Sul
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
    ]
  },

  // -------------------------------------------------------------
  // 26. BOA VISTA • RR
  // -------------------------------------------------------------
  {
    id: 'boa_vista',
    name: 'BOA VISTA • RR',
    stateCode: 'RR',
    flag: '⛰️',
    monument: 'MONUMENTO AOS PIONEIROS & MONTE RORAIMA',
    landmarkScenery: 'monumento_pioneiros',
    themeTag: 'EXTREMO NORTE',
    theme: 'DIA',
    skyTop: '#1E3A8A',
    skyMid: '#3B82F6',
    skyBottom: '#93C5FD',
    mountainColor: '#334155',
    mountainFront: '#475569',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#434A54',
      grassDark:  '#15803D',
      grassLight: '#16A34A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#0284C7',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Ene Garcez (Traçado Radial)
      { length: 65,  curve: -2.4, hill: 0,    scenery: 'sign_left', monument: 'monumento_pioneiros', monumentOffset: 1.80 },  // Orla Taumanan
      { length: 80,  curve: 1.8,  hill: 300,  scenery: 'tree', guardrail: 'both' },                                           // Praça do Centro Cívico
      { length: 120, curve: 0,    hill: 500,  bridge: true, scenery: 'streetlamp' },                                          // Ponte dos Macuxis sobre o Rio Branco
      { length: 85,  curve: -2.4, hill: -300, scenery: 'tree', guardrail: 'both' },                                           // Vista do Monte Roraima ao longe
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque Anauá
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta dos Boxes
    ]
  },

  // -------------------------------------------------------------
  // 27. PALMAS • TO
  // -------------------------------------------------------------
  {
    id: 'palmas',
    name: 'PALMAS • TO',
    stateCode: 'TO',
    flag: '☀️',
    monument: 'PALÁCIO ARAGUAIA & PRAÇA DOS GIRASSÓIS',
    landmarkScenery: 'palacio_araguaia',
    themeTag: 'MAIS JOVEM CAPITAL',
    theme: 'DIA',
    skyTop: '#1E293B',
    skyMid: '#B45309',
    skyBottom: '#FDE047',
    mountainColor: '#78350F',
    mountainFront: '#92400E',
    colors: {
      roadDark:   '#383D45',
      roadLight:  '#434A54',
      grassDark:  '#854D0E',
      grassLight: '#A16207',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#FEDD00',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Avenida Teotônio Segurado
      { length: 70,  curve: -2.2, hill: 0,    scenery: 'sign_left', monument: 'palacio_araguaia', monumentOffset: 1.75 },     // Contorno da Praça dos Girassóis
      { length: 85,  curve: 1.8,  hill: 200,  scenery: 'tree', guardrail: 'both' },                                           // Memorial Coluna Prestes
      { length: 150, curve: 0,    hill: 400,  bridge: true, scenery: 'streetlamp' },                                          // Ponte da Amizade (8 km sobre o Lago de Palmas)
      { length: 80,  curve: -2.5, hill: -300, scenery: 'palm', guardrail: 'both' },                                           // Praia da Graciosa
      { length: 75,  curve: 2.0,  hill: 0,    scenery: 'tree' },                                                              // Parque Cesamar
      { length: 130, curve: 0,    hill: 0,    scenery: 'grandstand', rumbleTheme: 'brasil' }                                  // Reta de Chegada
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
      const maxHill  = sec.hill;

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
        if (sec.hill && sec.hill !== 0) {
          // Subida seguida de descida senoidal completa (0 -> pico -> 0 sem degrau)
          const phase = (i / segCount) * Math.PI * 2;
          const currentH = (1 - Math.cos(phase)) * 0.5 * sec.hill;
          const nextPhase = ((i + 1) / segCount) * Math.PI * 2;
          const nextH = (1 - Math.cos(nextPhase)) * 0.5 * sec.hill;
          y2 = prevY + (nextH - currentH);
        }

        const isLight = Math.floor(idx / 3) % 2 === 0;
        const segColors = {
          road:   isLight ? trackDef.colors.roadLight   : trackDef.colors.roadDark,
          grass:  isLight ? trackDef.colors.grassLight  : trackDef.colors.grassDark,
          rumble: (sec.rumbleTheme === 'brasil')
            ? (isLight ? '#FEDD00' : '#009739') // Zebras Verde e Amarelo do Brasil GP!
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

        const isOverhead = !!sec.overheadBridge && (s === 0 ? (i === 44) : (i === Math.floor(segCount / 2)));

        const sceneries = [];
        if (sec.timingTower && i === 26) {
          sceneries.push({ type: 'timing_tower', offset: -1.28 });
        }
        if (sec.monument && i === Math.floor(segCount * 0.45)) {
          const mOffset = (typeof sec.monumentOffset === 'number')
            ? sec.monumentOffset
            : (sec.curve > 0 ? -1.75 : 1.75);
          sceneries.push({ type: sec.monument, offset: mOffset });
        }
        if (sec.scenery) {
          const interval = (sec.scenery === 'streetlamp' || sec.scenery === 'pole') ? 14 : 18;
          if (idx % interval === 0) {
            let side;
            if (sec.scenery === 'sign_left') {
              side = 1.78; // Placa na margem direita (iluminada na aproximação da curva à esquerda)
            } else if (sec.scenery === 'sign_right') {
              side = -1.78; // Placa na margem esquerda (iluminada na aproximação da curva à direita)
            } else if (sec.scenery === 'streetlamp') {
              side = (idx % 28 === 0) ? -1.80 : 1.80; // Postes de luz ritmados na margem da pista
            } else {
              side = (idx % (interval * 2) === 0) ? -1.88 : 1.88;
            }
            sceneries.push({ type: sec.scenery, offset: side });
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

    // 1. Calcula o fechamento angular e espacial do circuito no minimapa (-2*PI para sentido anti-horário)
    let sumTurn = 0;
    for (let i = 0; i < segments.length; i++) {
      sumTurn += segments[i].curve;
    }
    const targetAngle = -Math.PI * 2;
    const anglePerCurve = (sumTurn !== 0) ? (targetAngle / sumTurn) : 0.0035;

    const rawPoints = [];
    let curX = 0, curZ = 0, curAngle = 0;
    for (let i = 0; i < segments.length; i++) {
      curAngle += segments[i].curve * anglePerCurve;
      curX += Math.sin(curAngle);
      curZ -= Math.cos(curAngle);
      rawPoints.push({ x: curX, z: curZ });
    }

    // Aplica correção linear de deriva para fechamento perfeito
    const totalPts = rawPoints.length;
    if (totalPts > 0) {
      const driftX = rawPoints[totalPts - 1].x;
      const driftZ = rawPoints[totalPts - 1].z;
      for (let i = 0; i < totalPts; i++) {
        const factor = (i + 1) / totalPts;
        rawPoints[i].x -= driftX * factor;
        rawPoints[i].z -= driftZ * factor;
      }
    }

    // Normaliza para caixa 0..1 preservando as proporções naturais da pista (aspect ratio)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let p of rawPoints) {
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

    const normMap = rawPoints.map(p => ({
      x: (p.x - minX + padX) / maxDim,
      z: (p.z - minZ + padZ) / maxDim
    }));

    return {
      segments: segments,
      totalLength: segments.length * SEGMENT_LENGTH,
      mapPoints: normMap
    };
  }
}

