/**
 * LH44 - LOW TO HIGH SPEED
 * Condições climáticas, definições de pistas e construtor de circuitos 3D
 */

const ENV_CONDITIONS = [
  { id: 'DIA',      label: 'DIA',      icon: '🌤' },
  { id: 'TARDE',    label: 'TARDE',    icon: '🌇' },
  { id: 'NOITE',    label: 'NOITE',    icon: '🌙' },
  { id: 'CHUVA',    label: 'CHUVA',    icon: '🌧' },
  { id: 'SOL',      label: 'SOL',      icon: '☀' },
  { id: 'NEVE',     label: 'NEVE',     icon: '❄' },
  { id: 'DINAMICO', label: 'DINÂMICO', icon: '🔄' }
];
const DYN_ORDER = ['DIA', 'TARDE', 'NOITE', 'CHUVA', 'NEVE', 'SOL'];
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
    sky: ['#124DA6', '#3782E0', '#8CC8FF'], mtn: ['#1A5930', '#257B40'], cloud: ['#FFFFFF', '#BCDAF6'],
    sunC: '#FFF9C4', sunG: '#FFEB6E',
    ground: { mul: [1, 1, 1], add: [0, 0, 0], sat: 1 },
    s: { night: 0, rain: 0, snow: 0, sun: 1, dusk: 0, cover: 0.75, sunY: 33, sunSize: 1, glare: 0 }
  },
  TARDE: {
    sky: ['#2E103D', '#8E2E52', '#F28B30'], mtn: ['#451B26', '#682836'], cloud: ['#732648', '#FFA260'],
    sunC: '#FFE082', sunG: '#FF7043',
    ground: { mul: [1, 0.74, 0.58], add: [16, 4, -6], sat: 1.05 },
    s: { night: 0, rain: 0, snow: 0, sun: 1, dusk: 1, cover: 0.7, sunY: 50, sunSize: 1.15, glare: 0.25 }
  },
  NOITE: {
    sky: ['#040610', '#0A1126', '#162447'], mtn: ['#090D1A', '#11182D'], cloud: ['#1B2742', '#0E1630'],
    sunC: '#FFFFFF', sunG: '#FFFFFF',
    ground: { mul: [0.27, 0.31, 0.5], add: [0, 0, 8], sat: 0.9 },
    s: { night: 1, rain: 0, snow: 0, sun: 0, dusk: 0, cover: 0.3, sunY: 33, sunSize: 1, glare: 0 }
  },
  CHUVA: {
    sky: ['#3B4552', '#586471', '#8795A2'], mtn: ['#2D3B3C', '#3B4B49'], cloud: ['#59636E', '#343D48'],
    sunC: '#FFFFFF', sunG: '#FFFFFF',
    ground: { mul: [0.62, 0.68, 0.70], add: [0, 0, 0], sat: 0.55 },
    s: { night: 0, rain: 1, snow: 0, sun: 0, dusk: 0, cover: 1, sunY: 33, sunSize: 1, glare: 0 }
  },
  SOL: {
    sky: ['#0B5BD0', '#2F98FF', '#C2E8FF'], mtn: ['#2B7C39', '#41A551'], cloud: ['#FFFFFF', '#D8EDFF'],
    sunC: '#FFFFFF', sunG: '#FFF3A8',
    ground: { mul: [1.1, 1.08, 0.98], add: [12, 10, 0], sat: 1.2 },
    s: { night: 0, rain: 0, snow: 0, sun: 1, dusk: 0, cover: 0.35, sunY: 30, sunSize: 1.45, glare: 1 }
  },
  NEVE: {
    sky: ['#8CA3BC', '#B4C6D8', '#E4EDF6'], mtn: ['#CFDCE8', '#EEF4FA'], cloud: ['#F2F6FA', '#C9D6E3'],
    sunC: '#FFFFFF', sunG: '#E6F0FA',
    ground: { mul: [0.96, 0.98, 1.0], add: [6, 8, 12], sat: 0.55, grass: ['#EEF4FA', '#E0EAF3'] },
    s: { night: 0, rain: 0, snow: 1, sun: 0.12, dusk: 0, cover: 0.95, sunY: 40, sunSize: 0.9, glare: 0 }
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
// PISTAS DO CAMPEONATO (CIRCUITOS FECHADOS CONTÍNUOS, SEM CRUZAMENTO, COM ELEVAÇÕES NATURAIS)
// ==========================================
const TRACK_DEFINITIONS = [
  {
    id: 'brasil',
    name: 'BRASIL GP',
    theme: 'DIA',
    skyTop: '#124DA6',
    skyMid: '#3782E0',
    skyBottom: '#8CC8FF',
    mountainColor: '#1A5930',
    mountainFront: '#257B40',
    colors: {
      roadDark:   '#383C42',
      roadLight:  '#40454C',
      grassDark:  '#1D7622',
      grassLight: '#248A2A',
      rumbleDark: '#F8FAFC',
      rumbleLight:'#D62828',
      lane:       '#FACC15'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,    scenery: 'grandstand', pitWall: true, timingTower: true, overheadBridge: true }, // Reta Principal / Grid de largada
      { length: 45,  curve: -2.8, hill: -300, scenery: 'sign_left', rumbleTheme: 'brasil', guardrail: 'both' },  // S Senna 1 (Esq fechada)
      { length: 35,  curve: 1.8,  hill: -150, scenery: 'sign_right', rumbleTheme: 'brasil', guardrail: 'both' }, // S Senna 2 (Dir)
      { length: 70,  curve: -2.0, hill: 0,    scenery: 'tree', rumbleTheme: 'brasil', guardrail: 'both' },       // Curva do Sol (Esq)
      { length: 140, curve: 0,    hill: 800,  scenery: 'billboard', overheadBridge: true },  // Reta Oposta (Subida/Descida + Passarela LH44)
      { length: 85,  curve: -2.6, hill: -400, scenery: 'tree', guardrail: 'both' },       // Curva do Lago (Esq fechada)
      { length: 90,  curve: 0,    hill: 0,    scenery: 'pole' },                           // Reta do Miolo
      { length: 80,  curve: 1.8,  hill: 400,  scenery: 'billboard', guardrail: 'both' },  // Ferradura (Dir)
      { length: 65,  curve: -2.2, hill: -200, scenery: 'tree' },                           // Laranjinha / Pinheirinho (Esq)
      { length: 60,  curve: 2.0,  hill: -300, scenery: 'sign_right', guardrail: 'both' }, // Bico de Pato (Dir)
      { length: 75,  curve: -2.0, hill: -400, scenery: 'tree' },                           // Mergulho (Descida aberta)
      { length: 80,  curve: -2.4, hill: 400,  scenery: 'sign_left', rumbleTheme: 'brasil', guardrail: 'both' },  // Junção (Esq)
      { length: 130, curve: -1.0, hill: 900,  scenery: 'grandstand', rumbleTheme: 'brasil' }, // Subida dos Boxes
      { length: 60,  curve: -0.8, hill: 0,    scenery: 'billboard' }                       // Curva do Café
    ]
  },
  {
    id: 'serra',
    name: 'SERRA BRASILEIRA',
    theme: 'SERRA',
    skyTop: '#2E103D',
    skyMid: '#8E2E52',
    skyBottom: '#F28B30',
    mountainColor: '#451B26',
    mountainFront: '#682836',
    colors: {
      roadDark:   '#433936',
      roadLight:  '#4D423E',
      grassDark:  '#6E3A1E',
      grassLight: '#804524',
      rumbleDark: '#1E2024',
      rumbleLight:'#F59E0B',
      lane:       '#FBBF24'
    },
    sections: [
      { length: 140, curve: 0,    hill: 0,     scenery: 'tree' },                          // Reta do Vale
      { length: 90,  curve: -2.4, hill: 900,   scenery: 'sign_left', guardrail: 'both' },  // Subida dos Pinhais (Esq)
      { length: 85,  curve: 1.6,  hill: 1200,  scenery: 'sign_right', guardrail: 'both' }, // Mirante das Pedras (Dir)
      { length: 110, curve: -1.8, hill: 0,     tunnel: 'stone' },                          // TÚNEL DA SERRA (Esculpido na Rocha)
      { length: 130, curve: 0,    hill: -300,  bridge: true },                             // VIADUTO DA SERRA (Ponte Suspensa nas Alturas)
      { length: 95,  curve: -2.5, hill: -800,  scenery: 'sign_left', guardrail: 'both' },  // Descida da Encosta (Esq)
      { length: 80,  curve: 1.8,  hill: -1100, scenery: 'sign_right', guardrail: 'both' }, // Curva do Riacho (Dir)
      { length: 90,  curve: -2.4, hill: -600,  scenery: 'tree', guardrail: 'both' },       // Contorno da Serra (Esq)
      { length: 130, curve: 0,    hill: 0,     scenery: 'pole' }                           // Reta Final do Vale
    ]
  },
  {
    id: 'noite',
    name: 'NOITE URBANA',
    theme: 'NOITE',
    skyTop: '#040610',
    skyMid: '#0A1126',
    skyBottom: '#162447',
    mountainColor: '#090D1A',
    mountainFront: '#11182D',
    colors: {
      roadDark:   '#20242C',
      roadLight:  '#272C35',
      grassDark:  '#0E131C',
      grassLight: '#131A26',
      rumbleDark: '#5B2C6F',
      rumbleLight:'#00B4D8',
      lane:       '#E2E8F0'
    },
    sections: [
      { length: 150, curve: 0,    hill: 0,     scenery: 'streetlamp', overheadBridge: true }, // Avenida Principal
      { length: 80,  curve: -2.6, hill: 400,   scenery: 'streetlamp', guardrail: 'both' },    // Curva 90º do Obelisco (Esq)
      { length: 130, curve: 0,    hill: 800,   bridge: true, scenery: 'streetlamp' },         // VIADUTO ELEVADO URBANO (Ponte Noturna)
      { length: 85,  curve: -2.8, hill: 1200,  scenery: 'billboard', guardrail: 'both' },     // Curva da Catedral (Esq)
      { length: 120, curve: 1.2,  hill: -300,  tunnel: 'metro' },                             // TÚNEL METROPOLITANO DE NEON
      { length: 90,  curve: -2.5, hill: -800,  scenery: 'building', guardrail: 'both' },      // Avenida Marginal (Esq)
      { length: 80,  curve: -2.4, hill: -400,  scenery: 'streetlamp', guardrail: 'both' },    // Curva do Vale (Esq)
      { length: 140, curve: 0,    hill: 0,     scenery: 'billboard' }                         // Reta de Chegada
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
        if (sec.scenery && idx % 18 === 0 && !isTunnel && (!segments[idx - 1] || !segments[idx - 1].tunnel)) {
          const side = (idx % 36 === 0) ? -1.85 : 1.85;
          sceneries.push({ type: sec.scenery, offset: side });
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

