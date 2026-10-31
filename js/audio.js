// ====================================================================
// GERENCIADOR DE ÁUDIO E TRILHAS SONORAS (WEB AUDIO API PROCEDURAL)
// 100% sintetizado por código via Web Audio API (Zero arquivos MP3)
// ====================================================================

const _ = 0, T = -1, N = null;

const TITLE_THEME_SONG = {
  id: 'title',
  name: 'TITLE THEME',
  type: 'synth',
  desc: 'Tema de Abertura Arcade: recepção épica no grid de largada.',
  bpm: 130, swing: 0,
  lead: 'pulse', bassType: 'synth',
  roots: [48, 55, 45, 41, 48, 55, 41, 43],
  chords: [
    [60,64,67], [59,62,67], [57,60,64], [53,57,60],
    [60,64,67], [59,62,67], [53,57,60], [55,59,62]
  ],
  pad: 0.05,
  stab: '..x...x...x...x.', stabType: 'triangle', stabVol: 0.03,
  bass: [0,N,0,N, 12,N,0,N, 0,N,12,N, 0,N,12,N],
  drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.' },
  melody: [
    [72,T,76,T, 79,T,84,T, 83,T,79,T, 76,T,79,T],
    [79,T,74,T, 71,T,74,T, 79,T,T,T,  81,T,79,T],
    [76,T,72,T, 69,T,72,T, 76,T,79,T, 81,T,84,T],
    [81,T,77,T, 74,T,77,T, 81,T,T,T,  83,T,81,T],
    [84,T,83,T, 79,T,76,T, 79,T,84,T, 86,T,84,T],
    [86,T,83,T, 79,T,74,T, 79,T,83,T, 86,T,88,T],
    [89,T,86,T, 84,T,81,T, 84,T,86,T, 89,T,91,T],
    [91,T,86,T, 83,T,79,T, 76,T,79,T, 83,T,84,T]
  ]
};

const SONGS = [
  {
    id: 'song1',
    name: 'ONE SECOND AHEAD',
    type: 'synth',
    desc: 'Fase 1 - Brasil GP: ritmo eletrizante de ultrapassagens e pura velocidade.',
    bpm: 148, swing: 0,
    lead: 'saw', bassType: 'rock',
    roots: [40, 48, 45, 50, 40, 48, 50, 47],
    chords: [
      [52,59,64], [48,55,60], [45,52,57], [50,57,62],
      [52,59,64], [48,55,60], [50,57,62], [47,54,59]
    ],
    pad: 0.04,
    stab: '..x...x...x...x.', stabType: 'sawtooth', stabVol: 0.035,
    bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.' },
    melody: [
      [76,T,76,T, 79,T,81,T, 83,T,84,T, 83,T,81,T],
      [79,T,76,T, 72,T,76,T, 79,T,T,T,  81,T,79,T],
      [77,T,76,T, 74,T,77,T, 81,T,T,T,  84,T,83,T],
      [81,T,79,T, 78,T,81,T, 86,T,85,T, 83,T,81,T],
      [83,T,79,T, 76,T,79,T, 83,T,84,T, 86,T,84,T],
      [84,T,83,T, 81,T,79,T, 76,T,79,T, 81,T,84,T],
      [86,T,84,T, 83,T,81,T, 83,T,86,T, 88,T,86,T],
      [83,T,79,T, 76,T,74,T, 71,T,74,T, 76,T,T,T]
    ]
  },
  {
    id: 'song2',
    name: 'LAST TURN GLORY',
    type: 'synth',
    desc: 'Fase 2 - Serra Brasileira: adrenalina pura nas curvas de subida.',
    bpm: 142, swing: 0,
    lead: 'saw', bassType: 'funk',
    roots: [45, 41, 43, 40, 41, 38, 40, 45],
    chords: [
      [57,60,64], [53,57,60], [55,59,62], [52,55,59],
      [53,57,60], [50,53,57], [52,56,59], [57,60,64]
    ],
    pad: 0.05,
    stab: '....x.......x...', stabType: 'triangle', stabVol: 0.04,
    bass: [0, N, 0, N, 12, N, 0, 0, N, 12, N, 0, N, 12, 10, N],
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', c: '....x.......x...', p: '..x...x.x...x...' },
    melody: [
      [69,T,72,T, 76,T,79,T, 81,T,79,T, 76,T,72,T],
      [77,T,76,T, 74,T,72,T, 74,T,77,T, 81,T,T,T],
      [79,T,77,T, 76,T,74,T, 76,T,79,T, 83,T,T,T],
      [76,T,74,T, 72,T,71,T, 72,T,76,T, 79,T,76,T],
      [81,T,79,T, 77,T,76,T, 77,T,81,T, 84,T,T,T],
      [79,T,77,T, 76,T,74,T, 76,T,79,T, 81,T,77,T],
      [76,T,74,T, 72,T,71,T, 72,T,74,T, 76,T,79,T],
      [81,T,76,T, 72,T,69,T, 64,T,69,T, 72,T,76,T]
    ]
  },
  {
    id: 'song3',
    name: 'FINAL LAP HERO',
    type: 'synth',
    desc: 'Fase 3 - Noite Urbana: duelo decisivo sob os holofotes do título.',
    bpm: 154, swing: 0,
    lead: 'saw', bassType: 'synth',
    roots: [38, 34, 36, 43, 38, 34, 41, 45],
    chords: [
      [50,57,62], [46,53,58], [48,55,60], [55,58,62],
      [50,57,62], [46,53,58], [53,57,60], [57,61,64]
    ],
    pad: 0.04,
    stab: 'x...x...x...x...', stabType: 'sawtooth', stabVol: 0.045,
    bass: [0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 12, 0, 0, 12, 10, 12],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
    melody: [
      [74,T,77,T, 81,T,86,T, 85,T,81,T, 77,T,74,T],
      [70,T,74,T, 77,T,82,T, 81,T,77,T, 74,T,70,T],
      [72,T,76,T, 79,T,84,T, 83,T,79,T, 76,T,72,T],
      [79,T,81,T, 82,T,84,T, 86,T,84,T, 82,T,81,T],
      [86,T,85,T, 81,T,77,T, 81,T,85,T, 86,T,89,T],
      [88,T,86,T, 82,T,77,T, 82,T,86,T, 88,T,90,T],
      [89,T,86,T, 84,T,81,T, 84,T,86,T, 89,T,93,T],
      [93,T,91,T, 89,T,86,T, 85,T,81,T, 77,T,74,T]
    ]
  },
  {
    id: 'turbo',
    name: 'TURBO HIGHWAY',
    type: 'synth',
    desc: 'Rock sintetizado clássico de pé embaixo (Top Gear).',
    bpm: 150, swing: 0,
    lead: 'saw', bassType: 'rock',
    roots: [40, 40, 36, 38, 40, 43, 36, 38],
    chords: [[52,59,64],[52,59,64],[48,55,60],[50,57,62],[52,59,64],[55,62,67],[48,55,60],[50,57,62]],
    pad: 0,
    stab: '....x.....x.....', stabType: 'sawtooth', stabVol: 0.03,
    bass: [0,N,0,N, 0,N,12,N, 0,N,0,N, 0,N,12,N],
    drums: { k: 'x.....x.x.x...x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
    melody: [
      [71,T,76,T, _,76,79,T, 76,T,74,T, 71,T,T,T],
      [71,T,76,T, _,76,79,T, 83,T,81,T, 79,T,76,T],
      [72,T,79,T, _,79,84,T, 79,T,76,T, 72,T,T,T],
      [74,T,78,T, _,78,81,T, 78,T,74,T, 69,71,74,78],
      [71,T,76,T, _,76,79,T, 76,T,74,T, 71,T,T,T],
      [74,T,79,T, _,79,83,T, 79,T,74,T, 71,T,74,T],
      [76,T,79,T, _,84,T,83, 79,T,76,T, 72,T,67,T],
      [74,T,78,T, _,81,T,78, 74,T,81,T, 86,T,85,T]
    ]
  }
];

class AudioManager {
  constructor() {
    this.ctx = null;
    this._enabled = true;
    this.engineOsc = null;
    this.engineGain = null;
    this.skidGain = null;
    this.turboGain = null;
    this._musicPlaying = false;
    this.musicInterval = null;
    this.step = 0;
    this.songIndex = 0;
    this.musicBus = null;
    this.noiseBuf = null;
    this.nextNoteTime = 0;
    this.audioElements = {};
    this.titleAudio = null;
    this.titlePlaying = false;
    this.musicVolume = 0.50;
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(val) {
    this._enabled = !!val;
    if (this.titleAudio) {
      this.titleAudio.volume = this._enabled ? this.musicVolume : 0;
      if (!this._enabled) {
        try { this.titleAudio.pause(); } catch (_) {}
      }
    }
    this.syncMusicPlayback();
  }

  playTitleMusic() {
    if (!this._enabled) return;
    if (this.titlePlaying) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    this.titlePlaying = true;
    this.step = 0;
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
    }
    this.startMusic();
  }

  stopTitleMusic() {
    this.titlePlaying = false;
    this.step = 0;
    if (this.titleAudio) {
      try {
        this.titleAudio.pause();
        this.titleAudio.currentTime = 0;
      } catch (_) {}
    }
  }

  get musicPlaying() {
    return this._musicPlaying;
  }
  set musicPlaying(val) {
    this._musicPlaying = !!val;
    this.syncMusicPlayback();
  }

  getFileAudio(song) {
    if (!song || song.type !== 'file' || !song.file) return null;
    if (!this.audioElements[song.id]) {
      try {
        const audio = new Audio();
        audio.src = encodeURI(song.file);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = this._enabled ? this.musicVolume : 0;
        this.audioElements[song.id] = audio;
      } catch (_) {}
    }
    return this.audioElements[song.id] || null;
  }

  initAudioElements() {
    for (let i = 0; i < SONGS.length; i++) {
      const s = SONGS[i];
      if (s.type === 'file') {
        this.getFileAudio(s);
      }
    }
  }

  pauseAllFileMusic(resetTime = false) {
    for (const id in this.audioElements) {
      const a = this.audioElements[id];
      if (a) {
        try {
          a.pause();
          if (resetTime) a.currentTime = 0;
        } catch (_) {}
      }
    }
  }

  syncMusicPlayback() {
    const song = SONGS[this.songIndex];
    if (!this._enabled || !this._musicPlaying) {
      this.pauseAllFileMusic(false);
      return;
    }

    if (!song) return;

    if (song.type === 'file') {
      const curAudio = this.getFileAudio(song);
      for (const id in this.audioElements) {
        const a = this.audioElements[id];
        if (a && a !== curAudio) {
          try {
            a.pause();
            a.currentTime = 0;
          } catch (_) {}
        }
      }
      if (curAudio) {
        curAudio.loop = true;
        curAudio.volume = this._enabled ? this.musicVolume : 0;
        const p = curAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } else {
      // Synth song (TURBO HIGHWAY): pausa qualquer áudio MP3
      this.pauseAllFileMusic(false);
    }
  }

  restartMusic() {
    this.step = 0;
    if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.08;
    const song = SONGS[this.songIndex];
    if (song && song.type === 'file') {
      const a = this.getFileAudio(song);
      if (a) {
        try { a.currentTime = 0; } catch (_) {}
      }
    }
    this.syncMusicPlayback();
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Auto-recuperação do contexto de áudio em mobile / aba minimizada
    const resumeAudio = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('focus', resumeAudio);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resumeAudio();
    });

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.setValueAtTime(0.38, this.ctx.currentTime);
    this.musicBus.connect(this.ctx.destination);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = noiseBuffer;

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1450, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(2.8, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(this.skidGain);
    this.skidGain.connect(this.ctx.destination);
    noiseSrc.start();

    const turboOsc = this.ctx.createOscillator();
    turboOsc.type = 'sine';
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);
    turboOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
    turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.ctx.destination);
    turboOsc.start();

    this.initAudioElements();
    this.startMusic();
  }

  silenceEffects() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.engineGain) {
      this.engineGain.gain.cancelScheduledValues(t);
      this.engineGain.gain.setTargetAtTime(0, t, 0.03);
    }
    if (this.skidGain) {
      this.skidGain.gain.cancelScheduledValues(t);
      this.skidGain.gain.setTargetAtTime(0, t, 0.02);
    }
    if (this.turboGain) {
      this.turboGain.gain.cancelScheduledValues(t);
      this.turboGain.gain.setTargetAtTime(0, t, 0.02);
    }
  }

  updateEngineRpm(rpm, isAccelerating, isNitro) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const baseFreq = 42 + (rpm / 7600) * 165 + (isAccelerating ? 20 : 0) + (isNitro ? 45 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.04);
    const targetGain = this._enabled ? (0.07 + (rpm / 7600) * 0.11) : 0;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.04);
  }

  setSkid(isSkidding) {
    if (!this.ctx || !this.skidGain) return;
    const t = this.ctx.currentTime;
    this.skidGain.gain.setTargetAtTime(this._enabled && isSkidding ? 0.14 : 0, t, 0.03);
  }

  triggerNitroSound() {
    if (!this.ctx || !this._enabled || !this.turboGain) return;
    const t = this.ctx.currentTime;
    this.turboGain.gain.cancelScheduledValues(t);
    this.turboGain.gain.setValueAtTime(0.18, t);
    this.turboGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    this.turboGain.gain.setTargetAtTime(0, t + 1.2, 0.02);
  }

  playCrash() {
    if (!this.ctx || !this._enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  playBeep(freq = 440, duration = 0.1) {
    if (!this.ctx || !this._enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  // ------------------------------------------------------------------
  // SINTETIZADOR DE TRILHAS (ESTILO OUT RUN / TOP GEAR)
  // ------------------------------------------------------------------
  m2f(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  voice(type, freq, t, dur, vol, o) {
    const ctx = this.ctx;
    const pick = (v, d) => (v !== undefined ? v : d);
    const a = pick(o.a, 0.005), d = pick(o.d, 0.08), s = pick(o.s, 0.7), r = pick(o.r, 0.08);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);

    const g = ctx.createGain();
    const end = t + Math.max(dur, a + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, vol * s), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0002, vol * s), end);
    g.gain.linearRampToValueAtTime(0.0001, end + r);

    let node = osc;
    if (o.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      const sweep = o.sweep || 1;
      f.frequency.setValueAtTime(o.cutoff * sweep, t);
      if (sweep !== 1) f.frequency.exponentialRampToValueAtTime(o.cutoff, t + (o.sweepT || 0.12));
      f.Q.value = o.q || 0.7;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.musicBus);

    if (o.vib && dur > 0.18) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.4;
      lg.gain.value = o.vib;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t + 0.12);
      lfo.stop(end + r + 0.02);
    }
    osc.start(t);
    osc.stop(end + r + 0.03);
  }

  marimba(freq, t, vol) {
    this.voice('sine', freq, t, 0, vol, { a: 0.002, d: 0.34, s: 0.02, r: 0.03 });
    this.voice('sine', freq * 2.0, t, 0, vol * 0.42, { a: 0.002, d: 0.16, s: 0.02, r: 0.02 });
    this.voice('triangle', freq * 4.01, t, 0, vol * 0.16, { a: 0.001, d: 0.07, s: 0.02, r: 0.02 });
  }

  noiseHit(t, dur, vol, ftype, freq, q) {
    if (!this.noiseBuf) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = ftype;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    src.start(t, Math.random() * 1.4, dur + 0.05);
  }

  kick(t, v) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(158, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.95 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.27);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.3);
  }

  snare(t, v) {
    this.noiseHit(t, 0.15, 0.55 * v, 'bandpass', 1900, 0.9);
    this.voice('triangle', 205, t, 0, 0.34 * v, { a: 0.001, d: 0.08, s: 0.02, r: 0.02 });
  }

  hat(t, v, open) {
    this.noiseHit(t, open ? 0.24 : 0.05, (open ? 0.17 : 0.13) * v, 'highpass', 7600, 0.7);
  }

  clap(t, v) {
    this.noiseHit(t, 0.05, 0.36 * v, 'bandpass', 1500, 1.1);
    this.noiseHit(t + 0.012, 0.05, 0.34 * v, 'bandpass', 1500, 1.1);
    this.noiseHit(t + 0.026, 0.19, 0.30 * v, 'bandpass', 1300, 1.0);
  }

  conga(t, f, v) {
    this.voice('sine', f, t, 0, 0.30 * v, { a: 0.001, d: 0.10, s: 0.02, r: 0.02 });
    this.voice('triangle', f * 1.5, t, 0, 0.10 * v, { a: 0.001, d: 0.04, s: 0.02, r: 0.02 });
  }

  padChord(notes, t, dur, vol) {
    for (let i = 0; i < notes.length; i++) {
      const f = this.m2f(notes[i] - 12);
      this.voice('sawtooth', f, t, dur * 0.94, vol / notes.length, { a: 0.28, d: 0.25, s: 0.8, r: 0.4, cutoff: 1300, detune: -8 });
      this.voice('sawtooth', f, t, dur * 0.94, vol / notes.length, { a: 0.28, d: 0.25, s: 0.8, r: 0.4, cutoff: 1300, detune: 8 });
    }
  }

  playLead(song, midi, t, dur) {
    if (!song || song.type !== 'synth') return;
    const f = this.m2f(midi);
    switch (song.lead) {
      case 'marimba':
        this.marimba(f, t, 0.27);
        break;
      case 'saw':
        this.voice('sawtooth', f, t, dur * 0.96, 0.075, { a: 0.008, d: 0.07, s: 0.8, r: 0.07, cutoff: 3300, vib: 6, detune: -7 });
        this.voice('sawtooth', f, t, dur * 0.96, 0.075, { a: 0.008, d: 0.07, s: 0.8, r: 0.07, cutoff: 3300, vib: 6, detune: 7 });
        break;
      case 'pulse':
        this.voice('square', f, t, dur * 0.9, 0.065, { a: 0.004, d: 0.05, s: 0.62, r: 0.05, cutoff: 2900, vib: 4 });
        this.voice('square', f * 2, t, dur * 0.9, 0.018, { a: 0.004, d: 0.05, s: 0.4, r: 0.04, cutoff: 3600 });
        break;
      default:
        this.voice('sawtooth', f, t, dur, 0.07, { a: 0.02, d: 0.16, s: 0.7, r: 0.22, cutoff: 2100, sweep: 1.9, sweepT: 0.25, vib: 5, detune: -6 });
        this.voice('sawtooth', f, t, dur, 0.07, { a: 0.02, d: 0.16, s: 0.7, r: 0.22, cutoff: 2100, sweep: 1.9, sweepT: 0.25, vib: 5, detune: 6 });
    }
  }

  playBass(song, midi, t, sd) {
    if (!song || song.type !== 'synth') return;
    const f = this.m2f(midi);
    let dur = sd * 1.7, cutoff = 560, q = 3;
    if (song.bassType === 'rock') { dur = sd * 1.8; cutoff = 820; q = 1.5; }
    else if (song.bassType === 'synth') { dur = sd * 0.95; cutoff = 480; q = 4; }
    else if (song.bassType === 'funk') { dur = sd * 0.85; cutoff = 700; q = 4; }
    this.voice('sawtooth', f, t, dur, 0.27, { a: 0.003, d: 0.1, s: 0.55, r: 0.04, cutoff: cutoff, sweep: 3.2, sweepT: 0.09, q: q });
    this.voice('sine', f, t, dur, 0.22, { a: 0.003, d: 0.08, s: 0.8, r: 0.04 });
  }

  playMusicStep(song, step, t, sd) {
    if (!song || song.type !== 'synth') return;
    const bar = Math.floor(step / 16) % 8;
    const s = step % 16;
    const tt = t + ((s % 2 === 1) ? sd * song.swing : 0);
    const hit = (str) => !!str && str.charAt(s) !== '.' && str.charAt(s) !== '';
    const dr = song.drums;

    if (s === 0 && song.pad) this.padChord(song.chords[bar], tt, sd * 16, song.pad);

    const bp = song.bass[s];
    if (bp !== null && bp !== undefined) this.playBass(song, song.roots[bar] + bp, tt, sd);

    const row = song.melody[bar];
    const n = row[s];
    if (n > 0) {
      let len = 1;
      while (s + len < 16 && row[s + len] === -1) len++;
      this.playLead(song, n, tt, len * sd);
    }

    if (hit(dr.k)) this.kick(tt, 1);
    if (hit(dr.s)) this.snare(tt, 1);
    if (hit(dr.c)) this.clap(tt, 0.9);
    if (hit(dr.h)) this.hat(tt, (s % 4 === 0) ? 1 : ((s % 2 === 0) ? 0.72 : 0.45), false);
    if (hit(dr.o)) this.hat(tt, 1, true);
    if (hit(dr.p)) this.conga(tt, (s % 3 === 0) ? 330 : 247, 1);

    if (song.stab && hit(song.stab)) {
      const ch = song.chords[bar];
      const st = song.stabType || 'triangle';
      for (let i = 0; i < ch.length; i++) {
        this.voice(st, this.m2f(ch[i]), tt, sd * 0.8, song.stabVol || 0.04, { a: 0.003, d: 0.05, s: 0.4, r: 0.05, cutoff: 2300 });
      }
    }

    if (song.arp) {
      const ch = song.chords[bar];
      const idx = song.arp[s];
      this.voice('sawtooth', this.m2f(ch[idx % ch.length] + 12), tt, sd * 0.85, 0.055, { a: 0.003, d: 0.06, s: 0.3, r: 0.05, cutoff: 2400, sweep: 2.2, sweepT: 0.07 });
    }
  }

  startMusic() {
    if (this.musicInterval) clearInterval(this.musicInterval);
    if (!this.ctx) return;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.musicInterval = setInterval(() => this.musicScheduler(), 25);
  }

  setSong(i) {
    const prevIndex = this.songIndex;
    this.songIndex = ((i % SONGS.length) + SONGS.length) % SONGS.length;
    this.step = 0;
    if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.12;
    if (prevIndex !== this.songIndex) {
      this.pauseAllFileMusic(true);
    }
    this.syncMusicPlayback();
  }

  musicScheduler() {
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;

    // Música de Abertura / Menu sintetizada por código Web Audio API
    if (this._enabled && this.titlePlaying) {
      if (this.nextNoteTime < now - 0.25) this.nextNoteTime = now + 0.05;
      const song = TITLE_THEME_SONG;
      const stepDur = 60 / song.bpm / 4;
      while (this.nextNoteTime < now + 0.14) {
        this.playMusicStep(song, this.step, this.nextNoteTime, stepDur);
        this.nextNoteTime += stepDur;
        this.step++;
      }
      return;
    }

    if (!this._enabled || !this._musicPlaying) {
      this.nextNoteTime = now + 0.1;
      return;
    }
    const song = SONGS[this.songIndex];
    if (!song || song.type !== 'synth') {
      this.nextNoteTime = now + 0.1;
      return;
    }
    if (this.nextNoteTime < now - 0.25) this.nextNoteTime = now + 0.05;
    const stepDur = 60 / song.bpm / 4;
    while (this.nextNoteTime < now + 0.14) {
      this.playMusicStep(song, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }
}
