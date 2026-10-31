  class Car {
    constructor(id, model, isPlayer = false) {
      this.id = id;
      this.model = model;
      this.isPlayer = isPlayer;
      const dIdx = Math.max(0, (id - 1) % F1_DRIVERS.length);
      this.driverName = isPlayer ? 'LEANDRO' : (F1_DRIVERS[dIdx]?.name || 'PILOTO');
      this.driverCode = isPlayer ? 'LEA' : (F1_DRIVERS[dIdx]?.code || 'CPU');
      this.bodyColor = isPlayer ? model.primaryColor : BOT_BODY_COLORS[id % BOT_BODY_COLORS.length];

      this.z = 0;
      this.x = 0;
      this.bumpVelX = 0;
      this.speed = 0;
      this.laps = 0;
      this.totalDistance = 0;
      this.nextLapTarget = 0;
      this.finishTime = 0;
      this.isBraking = false;
      this.steer = 0;
      this.steerAngle = 0;
      this.inSlipstream = false;
      this.collisionCooldown = 0;
      this.bumpBoostTimer = 0;

      this.currentGear = 1;
      this.rpm = 1000;

      this.nitroCharges = 3;
      this.nitroTimer = 0;
      this.isNitro = false;

      this.targetX = 0;
      this.launchDelay = 0;
      this.aiSkill = 0.86 + Math.random() * 0.22;
      this.laneChangeTimer = 1.5 + Math.random() * 2.5;
    }

    getTotalDistance() {
      return this.totalDistance;
    }

    updateTransmission() {
      const speedRatio = Math.max(0, Math.min(1, this.speed / this.model.maxSpeed));
      let gInfo = GEAR_RATIOS[0];
      for (let i = GEAR_RATIOS.length - 1; i >= 0; i--) {
        if (speedRatio >= GEAR_RATIOS[i].minRatio) {
          gInfo = GEAR_RATIOS[i];
          break;
        }
      }
      this.currentGear = gInfo.gear;
      const gProgress = (speedRatio - gInfo.minRatio) / Math.max(0.01, gInfo.maxRatio - gInfo.minRatio);
      this.rpm = Math.floor(gInfo.minRpm + Math.min(1, Math.max(0, gProgress)) * (gInfo.maxRpm - gInfo.minRpm));
    }
  }

  // ==========================================
  // MOTOR CENTRAL LH44
  // ==========================================
  class LH44RacingGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.audio = new AudioManager();
      this.input = new InputManager(
        () => {
          this.audio.init();
          if (this.state === 'MENU' && this.audio) {
            this.audio.playTitleMusic();
          }
        },
        () => this.syncCanvasResolution()
      );
      this.particlePool = new ParticlePool(180);

      this.state = 'MENU';
      this.trackIndex = 0;
      this.track = null;
      this.selectedCarIndex = 0;
      this.colorIndex = 1;
      this.playerName = 'JOGADOR';
      this.envCond = 'DIA';
      this.envTime = 0;
      this.envCur = null;
      this.envFrom = null;
      this.envBlend = 1;
      this.skyScroll = 0;
      this.setupGroup = 0;
      this.setupCooldown = 0;
      this.songIndex = 0;
      this.nameInput = document.getElementById('player-name-input');
      if (this.nameInput) {
        this.nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            this.confirmName();
          }
        });
      }
      this.nameWrapper = document.getElementById('player-name-wrapper');
      if (this.nameInput) {
        try {
          const savedName = localStorage.getItem('lh44_player_name');
          if (savedName) this.nameInput.value = savedName;
        } catch (_) {}
      }
      this.menuCameraZ = 0;

      this.pauseBtn = document.getElementById('pause-btn');
      this.player = null;
      this.cars = [];

      this.championshipPoints = new Array(TOTAL_RACERS).fill(0);
      this.lastRacePositions = [];
      this.seasonBots = [];
      this.confetti = [];
      this.fixedStep = 1 / 60;
      this.accumulator = 0;
      this.initSeasonRoster();

      this.gameMode = 'CHAMPIONSHIP'; // 'CHAMPIONSHIP' ou 'QUICK_RACE'
      this.selectedModeIndex = 0;     // 0: Campeonato F1, 1: Corrida Rápida
      this.selectedQuickTrackIndex = 0; // 0: Brasil GP, 1: Serra, 2: Noite

      this.countdown = 3.6;
      this.startLightsStage = 0;
      this.greenLightsTimer = 0;

      this.raceTimer = 0;
      this.currentLapTime = 0;
      this.bestLapTime = 0;
      this.lastLapTime = 0;

      this.cameraRoll = 0;
      this.shake = 0;
      this.smoothCurveScreenX = 0;
      this.smoothRoadY = INTERNAL_HEIGHT - 12;

      this.finishingRace = false;
      this.finishTimer = 0;
      this.finishDuration = 3.0;
      this.finishCamOriginZ = 0;
      this.finishCameraX = 0;
      this.finishCameraY = 0;
      this.finishFadeAlpha = 0;

      this.lapBannerTimer = 0;
      this.lapBannerText = '';

      this.syncCanvasResolution();
      CarArt.warmUp(CAR_MODELS);

      this.lastTime = performance.now();
      this.boundGameLoop = this.gameLoop.bind(this);

      this.loadTrack(this.trackIndex);
      this.updateEnv(0.016);
      const onFirstUserGesture = () => {
        if (this.audio) {
          if (!this.audio.ctx) this.audio.init();
          if (this.audio.ctx && this.audio.ctx.state === 'suspended') {
            this.audio.ctx.resume().catch(() => {});
          }
          if (this.state === 'MENU') {
            this.audio.playTitleMusic();
          }
        }
      };
      window.addEventListener('pointerdown', onFirstUserGesture, { once: true });
      window.addEventListener('keydown', onFirstUserGesture, { once: true });
      window.addEventListener('touchstart', onFirstUserGesture, { once: true });
      requestAnimationFrame(this.boundGameLoop);
    }

    confirmName() {
      if (this.state !== 'NAME_INPUT') return;
      if (this.nameInput) {
        const val = this.nameInput.value.trim().toUpperCase();
        this.playerName = val || 'JOGADOR';
        try { localStorage.setItem('lh44_player_name', this.playerName); } catch (_) {}
        this.nameInput.blur();
      }
      if (this.nameWrapper) this.nameWrapper.classList.remove('show');
      this.audio.playBeep(523, 0.12);
      this.state = 'RACE_SETUP';
      this.setupCooldown = 0.55;
      this.setupGroup = 0;
      this.audio.stopTitleMusic();
      this.audio.musicPlaying = true;
      if (this.audio && typeof this.audio.setSong === 'function') {
        this.audio.setSong(this.songIndex);
      }
      if (this.input) {
        this.input.lastCanvasClick = null;
        this.input.enter = false;
        this.input.justPressedEnter = false;
        this.input.clearPulses();
      }
    }

    get songIndex() {
      return (this.audio && typeof this.audio.songIndex === 'number') ? this.audio.songIndex : 0;
    }
    set songIndex(idx) {
      if (this.audio && typeof this.audio.setSong === 'function') {
        this.audio.setSong(idx);
      }
    }

    // Ajusta dinamicamente a resolução interna em Alta Definição (RENDER_SCALE = 3x -> 1152x648+)
    // mantendo as coordenadas lógicas intactas e leves para Intel HD Graphics e Mobile!
    syncCanvasResolution() {
      if (!this.canvas) return;
      const vp = document.getElementById('viewport');
      let targetW = REF_WIDTH;
      if (vp && (document.body.classList.contains('mobile-mode') || document.body.classList.contains('is-fullscreen'))) {
        const w = vp.clientWidth || window.innerWidth;
        const h = vp.clientHeight || window.innerHeight;
        if (w > 0 && h > 0) {
          const aspect = w / h;
          targetW = Math.max(REF_WIDTH, Math.min(540, Math.round(INTERNAL_HEIGHT * aspect)));
        }
      }
      const backingW = Math.round(targetW * RENDER_SCALE);
      const backingH = Math.round(INTERNAL_HEIGHT * RENDER_SCALE);
      if (INTERNAL_WIDTH !== targetW || this.canvas.width !== backingW || this.canvas.height !== backingH) {
        INTERNAL_WIDTH = targetW;
        this.canvas.width = backingW;
        this.canvas.height = backingH;
      }
    }

    initSeasonRoster() {
      this.seasonBots = [];
      for (let i = 0; i < F1_DRIVERS.length; i++) {
        const drv = F1_DRIVERS[i];
        const randModel = CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)];
        const randColor = BOT_BODY_COLORS[i % BOT_BODY_COLORS.length];
        const baseSkill = 0.98 - (i * 0.007) + (Math.random() - 0.5) * 0.035;
        this.seasonBots.push({
          driverName: drv.name,
          driverCode: drv.code,
          model: randModel,
          bodyColor: randColor,
          baseAiSkill: baseSkill
        });
      }
    }

    loadTrack(index) {
      this.trackIndex = index;
      const def = TRACK_DEFINITIONS[index];
      this.track = TrackBuilder.build(def);
    }

    setupRaceGrid() {
      const selectedModel = CAR_MODELS[this.selectedCarIndex];
      this.cars = [];

      if (!this.seasonBots || this.seasonBots.length < 19) {
        this.initSeasonRoster();
      }

      // Garante que cada um dos 19 adversários da CPU use um dos 19 modelos restantes (todos distintos no grid de 20 carros!)
      const remainingModels = CAR_MODELS.filter((_, idx) => idx !== this.selectedCarIndex);
      for (let i = remainingModels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingModels[i], remainingModels[j]] = [remainingModels[j], remainingModels[i]];
      }

      // 19 Adversários da CPU com seus carros únicos e distintos
      for (let slot = 1; slot <= 19; slot++) {
        const profile = this.seasonBots[slot - 1];
        const botModel = remainingModels[slot - 1] || profile.model;
        const bot = new Car(slot, botModel, false);
        bot.driverName = profile.driverName;
        bot.driverCode = profile.driverCode;
        bot.bodyColor = profile.bodyColor;
        const rowFromBack = Math.floor((TOTAL_RACERS - slot) / 2);
        const isLeft = (slot % 2 === 1);
        bot.z = 1600 + rowFromBack * GRID_ROW_SPACING + (isLeft ? GRID_STAGGER_Z : 0);
        bot.x = isLeft ? -GRID_COL_X : GRID_COL_X;
        bot.targetX = bot.x;
        bot.speed = 0;
        bot.laps = 0;
        bot.totalDistance = bot.z;
        bot.nextLapTarget = START_LINE_Z + this.track.totalLength;
        bot.finishTime = 0;
        bot.steerAngle = 0;
        bot.nitroCharges = 3;
        bot.nitroTimer = 0;
        bot.isNitro = false;
        bot.nitroCooldown = 3.5 + Math.random() * 5.0;
        bot.inSlipstream = false;
        bot.slipstreamIntensity = 0;
        bot.launchDelay = 0.04 + ((slot - 1) * 0.01) + Math.random() * 0.14;
        bot.aiSkill = Math.max(0.78, Math.min(0.99, profile.baseAiSkill + (Math.random() - 0.5) * 0.025));
        this.cars.push(bot);
      }

      // O JOGADOR COMEÇA EM ÚLTIMO LUGAR (P20) COM O CARRO E COR ESCOLHIDOS!
      this.player = new Car(0, selectedModel, true);
      this.player.driverName = (this.playerName || 'LEANDRO').slice(0, 12);
      const cleanCode = (this.playerName || 'LEA').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
      this.player.driverCode = cleanCode.length === 3 ? cleanCode : (cleanCode + '___').slice(0, 3);
      this.player.bodyColor = CAR_COLORS[this.colorIndex].hex;
      this.player.z = 1600;
      this.player.x = GRID_COL_X;
      this.player.targetX = GRID_COL_X;
      this.player.speed = 0;
      this.player.laps = 0;
      this.player.totalDistance = this.player.z;
      this.player.nextLapTarget = START_LINE_Z + this.track.totalLength;
      this.player.finishTime = 0;
      this.player.steerAngle = 0;
      this.player.inSlipstream = false;
      this.player.nitroCharges = 3;
      this.player.nitroTimer = 0;
      this.cars.push(this.player);

      this.playerRenderPos = { x: INTERNAL_WIDTH / 2, y: INTERNAL_HEIGHT - 38 };
      this.smoothCurveScreenX = 0;
      this.foregroundBots = [];
      if (this.track && this.track.segments) {
        for (let i = 0; i < this.track.segments.length; i++) {
          this.track.segments[i].skidUntil = 0;
        }
      }

      this.raceTimer = 0;
      this.currentLapTime = 0;
      this.bestLapTime = 0;
      this.lastLapTime = 0;
      this.lapBannerTimer = 0;
      this.greenLightsTimer = 0;
      this.finishingRace = false;
      this.finishTimer = 0;
      this.finishFadeAlpha = 0;
      this.particlePool.clear();
    }
    startRaceCountdown() {
      this.setupRaceGrid();
      this.state = 'COUNTDOWN';
      this.countdown = 3.6;
      this.startLightsStage = 0;
      this.greenLightsTimer = 0;
      this.finishingRace = false;
      this.finishTimer = 0;
      this.finishFadeAlpha = 0;
      if (this.audio) {
        this.audio.stopTitleMusic();
        this.audio.musicPlaying = true;
        this.audio.restartMusic();
      }
    }

    wrapZ(z) {
      const len = this.track.totalLength;
      return ((z % len) + len) % len;
    }

    shortestDeltaZ(zA, zB) {
      const len = this.track.totalLength;
      let dz = (zA - zB) % len;
      if (dz > len / 2) dz -= len;
      if (dz < -len / 2) dz += len;
      return dz;
    }

    findSegment(z) {
      const segIndex = Math.floor(z / SEGMENT_LENGTH) % this.track.segments.length;
      return this.track.segments[(segIndex + this.track.segments.length) % this.track.segments.length];
    }

    project(p, cameraX, cameraY, cameraZ) {
      const depth = this.currentCameraDepth || CAMERA_DEPTH;
      p.camera.x = (p.world.x || 0) - cameraX;
      p.camera.y = (p.world.y || 0) - cameraY;
      p.camera.z = (p.world.z || 0) - cameraZ;
      p.screen.scale = depth / p.camera.z;
      p.screen.x = (INTERNAL_WIDTH / 2) + (p.screen.scale * p.camera.x * REF_WIDTH / 2);
      p.screen.y = (INTERNAL_HEIGHT / 2) - (p.screen.scale * p.camera.y * INTERNAL_HEIGHT / 2);
      p.screen.w = (p.screen.scale * ROAD_WIDTH * REF_WIDTH / 2);
    }

    projectInterpolated(seg, pct) {
      const depth = this.currentCameraDepth || CAMERA_DEPTH;
      const camX = (1 - pct) * seg.p1.camera.x + pct * seg.p2.camera.x;
      const camY = (1 - pct) * seg.p1.camera.y + pct * seg.p2.camera.y;
      const camZ = Math.max(depth + 1, (1 - pct) * seg.p1.camera.z + pct * seg.p2.camera.z);
      const scale = depth / camZ;
      return {
        x: (INTERNAL_WIDTH / 2) + (scale * camX * REF_WIDTH / 2),
        y: (INTERNAL_HEIGHT / 2) - (scale * camY * INTERNAL_HEIGHT / 2),
        w: scale * ROAD_WIDTH * REF_WIDTH / 2
      };
    }

    // ==========================================
    // FÍSICA E ATUALIZAÇÃO
    // ==========================================
    update(dt) {
      if (this.input && typeof this.input.pollGamepad === 'function') {
        this.input.pollGamepad(dt);
      }
      if (this.input.justPressedM) {
        this.audio.enabled = !this.audio.enabled;
        if (!this.audio.enabled) {
          this.audio.silenceEffects();
        } else {
          this.audio.playBeep(440, 0.08);
        }
      }

      if (this.pauseBtn) {
        const isPaused = (this.state === 'PAUSED');
        this.pauseBtn.textContent = isPaused ? '▶' : '⏸';
        this.pauseBtn.title = isPaused ? 'Continuar Corrida' : 'Pausar Jogo';
        this.pauseBtn.classList.toggle('active', isPaused);
      }

      if (this.state === 'MENU') {
        if (this.nameWrapper) this.nameWrapper.classList.remove('show');
        this.audio.silenceEffects();
        this.audio.playTitleMusic();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 1100 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        let shouldAdvance = false;
        if (this.input.lastCanvasClick) {
          this.input.lastCanvasClick = null;
          shouldAdvance = true;
        }
        if (this.input.justPressedEnter) {
          shouldAdvance = true;
        }

        if (shouldAdvance) {
          this.audio.playBeep(440, 0.08);
          this.state = 'MODE_SELECT';
          this.input.clearPulses();
          return;
        }
        this.input.clearPulses();
        return;
      }

      if (this.state === 'MODE_SELECT') {
        if (this.nameWrapper) this.nameWrapper.classList.remove('show');
        this.audio.silenceEffects();
        this.audio.playTitleMusic();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 850 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        const L = this.getModeSelectLayout();
        if (this.input.lastCanvasClick) {
          const click = this.input.lastCanvasClick;
          this.input.lastCanvasClick = null;

          // Clique no botão VOLTAR
          if (click.x >= L.btnBack.x && click.x <= L.btnBack.x + L.btnBack.w &&
              click.y >= L.btnBack.y && click.y <= L.btnBack.y + L.btnBack.h) {
            this.audio.playBeep(330, 0.06);
            this.state = 'MENU';
            this.input.clearPulses();
            return;
          }

          // Clique no card 0 (Campeonato)
          if (click.x >= L.card0.x && click.x <= L.card0.x + L.card0.w &&
              click.y >= L.card0.y && click.y <= L.card0.y + L.card0.h) {
            if (this.selectedModeIndex === 0) {
              this.input.justPressedEnter = true;
            } else {
              this.selectedModeIndex = 0;
              this.audio.playBeep(440, 0.06);
            }
          }

          // Clique no card 1 (Corrida Rápida)
          if (click.x >= L.card1.x && click.x <= L.card1.x + L.card1.w &&
              click.y >= L.card1.y && click.y <= L.card1.y + L.card1.h) {
            if (this.selectedModeIndex === 1) {
              this.input.justPressedEnter = true;
            } else {
              this.selectedModeIndex = 1;
              this.audio.playBeep(440, 0.06);
            }
          }

          // Clique no botão CONFIRMAR
          if (click.x >= L.btnConfirm.x && click.x <= L.btnConfirm.x + L.btnConfirm.w &&
              click.y >= L.btnConfirm.y && click.y <= L.btnConfirm.y + L.btnConfirm.h) {
            this.input.justPressedEnter = true;
          }
        }

        if (this.input.justPressedLeft || this.input.justPressedRight || this.input.justPressedUp || this.input.justPressedDown) {
          this.selectedModeIndex = this.selectedModeIndex === 0 ? 1 : 0;
          this.audio.playBeep(440, 0.05);
        }

        if (this.input.justPressedEnter) {
          this.audio.playBeep(523, 0.12);
          if (this.selectedModeIndex === 0) {
            this.gameMode = 'CHAMPIONSHIP';
            this.trackIndex = 0;
            this.loadTrack(0);
            this.colorIndex = MODEL_DEFAULT_COLOR[CAR_MODELS[this.selectedCarIndex].id] || 0;
            this.state = 'CAR_SELECT';
          } else {
            this.gameMode = 'QUICK_RACE';
            this.selectedQuickTrackIndex = 0;
            this.trackIndex = 0;
            this.loadTrack(0);
            this.state = 'TRACK_SELECT';
          }
          this.input.clearPulses();
          return;
        }

        if (this.input.justPressedEsc) {
          this.audio.playBeep(330, 0.06);
          this.state = 'MENU';
        }
        this.input.clearPulses();
        return;
      }

      if (this.state === 'TRACK_SELECT') {
        if (this.nameWrapper) this.nameWrapper.classList.remove('show');
        this.audio.silenceEffects();
        this.audio.playTitleMusic();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 850 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        const L = this.getTrackSelectLayout();
        if (this.input.lastCanvasClick) {
          const click = this.input.lastCanvasClick;
          this.input.lastCanvasClick = null;

          // Clique no botão VOLTAR
          if (click.x >= L.btnBack.x && click.x <= L.btnBack.x + L.btnBack.w &&
              click.y >= L.btnBack.y && click.y <= L.btnBack.y + L.btnBack.h) {
            this.audio.playBeep(330, 0.06);
            this.state = 'MODE_SELECT';
            this.input.clearPulses();
            return;
          }

          // Clique nos cards de pista
          for (let k = 0; k < L.cards.length; k++) {
            const c = L.cards[k];
            if (click.x >= c.x && click.x <= c.x + c.w && click.y >= c.y && click.y <= c.y + c.h) {
              if (this.selectedQuickTrackIndex === c.i) {
                this.input.justPressedEnter = true;
              } else {
                this.selectedQuickTrackIndex = c.i;
                this.trackIndex = c.i;
                this.loadTrack(c.i);
                this.audio.playBeep(440, 0.06);
              }
              break;
            }
          }

          // Clique no botão CONFIRMAR
          if (click.x >= L.btnConfirm.x && click.x <= L.btnConfirm.x + L.btnConfirm.w &&
              click.y >= L.btnConfirm.y && click.y <= L.btnConfirm.y + L.btnConfirm.h) {
            this.input.justPressedEnter = true;
          }
        }

        if (this.input.justPressedLeft || this.input.justPressedUp) {
          this.selectedQuickTrackIndex = (this.selectedQuickTrackIndex - 1 + TRACK_DEFINITIONS.length) % TRACK_DEFINITIONS.length;
          this.trackIndex = this.selectedQuickTrackIndex;
          this.loadTrack(this.trackIndex);
          this.audio.playBeep(440, 0.05);
        }
        if (this.input.justPressedRight || this.input.justPressedDown) {
          this.selectedQuickTrackIndex = (this.selectedQuickTrackIndex + 1) % TRACK_DEFINITIONS.length;
          this.trackIndex = this.selectedQuickTrackIndex;
          this.loadTrack(this.trackIndex);
          this.audio.playBeep(440, 0.05);
        }

        if (this.input.justPressedEnter) {
          this.audio.playBeep(523, 0.12);
          this.trackIndex = this.selectedQuickTrackIndex;
          this.loadTrack(this.trackIndex);
          this.colorIndex = MODEL_DEFAULT_COLOR[CAR_MODELS[this.selectedCarIndex].id] || 0;
          this.state = 'CAR_SELECT';
          this.input.clearPulses();
          return;
        }

        if (this.input.justPressedEsc) {
          this.audio.playBeep(330, 0.06);
          this.state = 'MODE_SELECT';
        }
        this.input.clearPulses();
        return;
      }

      if (this.state === 'CAR_SELECT') {
        if (this.nameWrapper) this.nameWrapper.classList.remove('show');
        this.audio.silenceEffects();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 850 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        const L = this.getCarSelectLayout();
        if (this.input.lastCanvasClick) {
          const click = this.input.lastCanvasClick;
          this.input.lastCanvasClick = null;
          const { bX, bY, bW, bH, chips, btnBack, btnConfirm } = L;

          // Clique no botão VOLTAR
          if (btnBack && click.x >= btnBack.x && click.x <= btnBack.x + btnBack.w &&
              click.y >= btnBack.y && click.y <= btnBack.y + btnBack.h) {
            this.audio.playBeep(330, 0.06);
            this.state = (this.gameMode === 'QUICK_RACE') ? 'TRACK_SELECT' : 'MODE_SELECT';
            this.input.clearPulses();
            return;
          }

          // Clique no botão ESCOLHER COR (Avança para a Etapa de Seleção de Cor!)
          if (btnConfirm && click.x >= btnConfirm.x && click.x <= btnConfirm.x + btnConfirm.w &&
              click.y >= btnConfirm.y && click.y <= btnConfirm.y + btnConfirm.h) {
            this.audio.playBeep(523, 0.12);
            this.state = 'COLOR_SELECT';
            this.input.clearPulses();
            return;
          }

          // Clique direto em qualquer um dos 20 chips de carros da grade
          if (chips) {
            for (let c = 0; c < chips.length; c++) {
              const chip = chips[c];
              if (click.x >= chip.x && click.x <= chip.x + chip.w &&
                  click.y >= chip.y && click.y <= chip.y + chip.h) {
                if (this.selectedCarIndex !== chip.i) {
                  this.selectedCarIndex = chip.i;
                  this.colorIndex = MODEL_DEFAULT_COLOR[CAR_MODELS[this.selectedCarIndex].id] || 0;
                  this.audio.playBeep(440, 0.05);
                }
                this.input.clearPulses();
                return;
              }
            }
          }

          // Setas laterais de troca de carro
          if (click.x < bX + 26 && click.y >= bY - 10 && click.y <= bY + bH + 10) {
            this.input.justPressedLeft = true;
            this.input.justPressedEnter = false;
          } else if (click.x > bX + bW - 26 && click.y >= bY - 10 && click.y <= bY + bH + 10) {
            this.input.justPressedRight = true;
            this.input.justPressedEnter = false;
          }
        }

        if (this.input.justPressedLeft) {
          this.audio.playBeep(330, 0.06);
          this.selectedCarIndex = (this.selectedCarIndex - 1 + CAR_MODELS.length) % CAR_MODELS.length;
          this.colorIndex = MODEL_DEFAULT_COLOR[CAR_MODELS[this.selectedCarIndex].id] || 0;
        }
        if (this.input.justPressedRight) {
          this.audio.playBeep(330, 0.06);
          this.selectedCarIndex = (this.selectedCarIndex + 1) % CAR_MODELS.length;
          this.colorIndex = MODEL_DEFAULT_COLOR[CAR_MODELS[this.selectedCarIndex].id] || 0;
        }
        if (this.input.justPressedUp || this.input.justPressedDown) {
          this.audio.playBeep(330, 0.06);
          // Salta 10 posições entre a 1ª e 2ª fileira de carros
          this.selectedCarIndex = (this.selectedCarIndex + 10) % CAR_MODELS.length;
          this.colorIndex = MODEL_DEFAULT_COLOR[CAR_MODELS[this.selectedCarIndex].id] || 0;
        }

        if (this.input.justPressedEnter) {
          this.audio.playBeep(523, 0.12);
          this.state = 'COLOR_SELECT';
          this.input.clearPulses();
          return;
        }
        if (this.input.justPressedEsc) {
          this.audio.playBeep(330, 0.06);
          this.state = (this.gameMode === 'QUICK_RACE') ? 'TRACK_SELECT' : 'MODE_SELECT';
        }
        this.input.clearPulses();
        return;
      }

      // ========================================================
      // ETAPA 2 : SELEÇÃO DE COR DO CARRO (CONTROLE, TECLADO OU TOQUE)
      // ========================================================
      if (this.state === 'COLOR_SELECT') {
        if (this.nameWrapper) this.nameWrapper.classList.remove('show');
        this.audio.silenceEffects();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 850 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        const L = this.getColorSelectLayout();
        if (this.input.lastCanvasClick) {
          const click = this.input.lastCanvasClick;
          this.input.lastCanvasClick = null;
          const { bX, bY, bW, bH, sw, btnBack, btnConfirm } = L;

          // Clique no botão VOLTAR AO CARRO
          if (btnBack && click.x >= btnBack.x && click.x <= btnBack.x + btnBack.w &&
              click.y >= btnBack.y && click.y <= btnBack.y + btnBack.h) {
            this.audio.playBeep(330, 0.06);
            this.state = 'CAR_SELECT';
            this.input.clearPulses();
            return;
          }

          // Clique no botão CONFIRMAR COR (Avança para Digitação do Nome do Piloto)
          if (btnConfirm && click.x >= btnConfirm.x && click.x <= btnConfirm.x + btnConfirm.w &&
              click.y >= btnConfirm.y && click.y <= btnConfirm.y + btnConfirm.h) {
            this.audio.playBeep(523, 0.12);
            this.state = 'NAME_INPUT';
            if (this.nameWrapper) this.nameWrapper.classList.add('show');
            if (this.nameInput) {
              this.nameInput.value = this.playerName || 'JOGADOR';
              setTimeout(() => { try { this.nameInput.focus(); this.nameInput.select(); } catch (_) {} }, 40);
            }
            this.input.clearPulses();
            return;
          }

          // Clique direto nas 10 amostras circulares de cores
          let clickedSwatch = false;
          if (sw) {
            for (let k = 0; k < sw.length; k++) {
              const s = sw[k];
              if (Math.hypot(click.x - s.x, click.y - s.y) <= Math.max(s.r + 7, 14)) {
                if (this.colorIndex !== s.i) {
                  this.colorIndex = s.i;
                  this.audio.playBeep(480, 0.05);
                }
                clickedSwatch = true;
                break;
              }
            }

            // Toque em qualquer ponto da faixa horizontal das cores
            if (!clickedSwatch && sw.length > 0) {
              const swY = sw[0].y;
              if (click.y >= swY - 14 && click.y <= swY + 14 && click.x >= sw[0].x - 14 && click.x <= sw[sw.length - 1].x + 14) {
                let bestIdx = 0, bestDist = 999999;
                for (let k = 0; k < sw.length; k++) {
                  const d = Math.abs(click.x - sw[k].x);
                  if (d < bestDist) {
                    bestDist = d;
                    bestIdx = sw[k].i;
                  }
                }
                this.colorIndex = bestIdx;
                this.audio.playBeep(480, 0.05);
                clickedSwatch = true;
              }
            }
          }

          // Toque no lado esquerdo ou direito do painel para navegar nas cores
          if (!clickedSwatch) {
            if (click.x < bX + 32 && click.y >= bY && click.y <= bY + bH) {
              this.input.justPressedLeft = true;
            } else if (click.x > bX + bW - 32 && click.y >= bY && click.y <= bY + bH) {
              this.input.justPressedRight = true;
            }
          }
        }

        // Navegação de Cores via Controle (D-pad / Analógico) ou Teclado (Setas / A / D)
        if (this.input.justPressedLeft) {
          this.audio.playBeep(440, 0.05);
          this.colorIndex = (this.colorIndex - 1 + CAR_COLORS.length) % CAR_COLORS.length;
        }
        if (this.input.justPressedRight) {
          this.audio.playBeep(440, 0.05);
          this.colorIndex = (this.colorIndex + 1) % CAR_COLORS.length;
        }
        if (this.input.justPressedNitro || this.input.justPressedColor) {
          this.audio.playBeep(440, 0.05);
          this.colorIndex = (this.colorIndex + 1) % CAR_COLORS.length;
        }
        if (this.input.lastDigit !== null && this.input.lastDigit !== undefined) {
          const d = this.input.lastDigit;
          const targetColor = (d === 0) ? 9 : (d - 1);
          if (targetColor >= 0 && targetColor < CAR_COLORS.length) {
            this.colorIndex = targetColor;
            this.audio.playBeep(480, 0.05);
          }
        }

        if (this.input.justPressedEnter) {
          this.audio.playBeep(523, 0.12);
          this.state = 'NAME_INPUT';
          if (this.nameWrapper) this.nameWrapper.classList.add('show');
          if (this.nameInput) {
            this.nameInput.value = this.playerName || 'JOGADOR';
            setTimeout(() => { try { this.nameInput.focus(); this.nameInput.select(); } catch (_) {} }, 40);
          }
          this.input.clearPulses();
          return;
        }

        if (this.input.justPressedEsc) {
          this.audio.playBeep(330, 0.06);
          this.state = 'CAR_SELECT';
          this.input.clearPulses();
          return;
        }

        this.input.clearPulses();
        return;
      }

      if (this.state === 'NAME_INPUT') {
        this.audio.silenceEffects();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 850 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        if (this.nameWrapper && !this.nameWrapper.classList.contains('show')) {
          this.nameWrapper.classList.add('show');
        }

        if (this.input.lastCanvasClick) {
          const click = this.input.lastCanvasClick;
          this.input.lastCanvasClick = null;
          const touchSafe = this.input.touchControlsVisible;
          const boxW = touchSafe ? 228 : 260;
          const boxH = touchSafe ? 132 : 144;
          const boxX = INTERNAL_WIDTH / 2 - boxW / 2;
          const boxY = touchSafe ? 34 : 38;
          const btnW = touchSafe ? 88 : 100;
          const btnH = touchSafe ? 18 : 20;
          const btnY = boxY + boxH - (touchSafe ? 24 : 26);
          const btnBack = { x: boxX + 12, y: btnY, w: btnW, h: btnH };
          const btnConfirm = { x: boxX + boxW - 12 - btnW, y: btnY, w: btnW, h: btnH };

          if (click.x >= btnBack.x && click.x <= btnBack.x + btnBack.w &&
              click.y >= btnBack.y && click.y <= btnBack.y + btnBack.h) {
            if (this.nameWrapper) this.nameWrapper.classList.remove('show');
            if (this.nameInput) this.nameInput.blur();
            this.audio.playBeep(330, 0.06);
            this.state = 'COLOR_SELECT';
            this.input.clearPulses();
            return;
          }

          if (click.x >= btnConfirm.x && click.x <= btnConfirm.x + btnConfirm.w &&
              click.y >= btnConfirm.y && click.y <= btnConfirm.y + btnConfirm.h) {
            this.confirmName();
            return;
          }
        }

        if (this.input.justPressedEnter) {
          this.input.justPressedEnter = false;
          this.confirmName();
          return;
        }
        if (this.input.justPressedEsc) {
          if (this.nameWrapper) this.nameWrapper.classList.remove('show');
          if (this.nameInput) this.nameInput.blur();
          this.audio.playBeep(330, 0.06);
          this.state = 'COLOR_SELECT';
          this.input.clearPulses();
          return;
        }
        this.input.clearPulses();
        return;
      }

      if (this.state === 'RACE_SETUP') {
        if (this.nameWrapper) this.nameWrapper.classList.remove('show');
        if (this.setupCooldown > 0) {
          this.setupCooldown -= dt;
          this.input.lastCanvasClick = null;
          this.input.justPressedEnter = false;
        }
        this.audio.silenceEffects();
        this.menuCameraZ = this.wrapZ(this.menuCameraZ + 850 * dt);
        this.cameraRoll = 0;
        this.shake = 0;
        this.updateSkyScroll(dt);
        this.updateEnv(dt);

        const L = this.getSetupLayout();
        let clickedInteractive = false;
        if (this.input.lastCanvasClick && this.setupCooldown <= 0) {
          const click = this.input.lastCanvasClick;
          for (let k = 0; k < L.conds.length; k++) {
            const c = L.conds[k];
            if (click.x >= c.x && click.x <= c.x + c.w && click.y >= c.y && click.y <= c.y + c.h) {
              this.envCond = ENV_CONDITIONS[c.i].id;
              this.setupGroup = 0;
              this.audio.playBeep(440, 0.06);
              clickedInteractive = true;
              break;
            }
          }
          if (!clickedInteractive) {
            for (let k = 0; k < L.songs.length; k++) {
              const c = L.songs[k];
              if (click.x >= c.x && click.x <= c.x + c.w && click.y >= c.y && click.y <= c.y + c.h) {
                this.songIndex = c.i;
                this.setupGroup = 1;
                this.audio.stopTitleMusic();
                this.audio.musicPlaying = true;
                if (this.audio && typeof this.audio.setSong === 'function') {
                  this.audio.setSong(c.i);
                }
                this.audio.playBeep(523, 0.08);
                clickedInteractive = true;
                break;
              }
            }
          }
          if (!clickedInteractive && L.btnBack) {
            const b = L.btnBack;
            if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
              this.audio.playBeep(330, 0.06);
              this.state = 'NAME_INPUT';
              if (this.nameWrapper) this.nameWrapper.classList.add('show');
              if (this.nameInput) {
                this.nameInput.value = this.playerName || 'JOGADOR';
                setTimeout(() => { try { this.nameInput.focus(); } catch (_) {} }, 40);
              }
              this.audio.musicPlaying = false;
              this.audio.playTitleMusic();
              this.input.clearPulses();
              return;
            }
          }
          if (!clickedInteractive && L.startBtn) {
            const b = L.startBtn;
            if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
              this.audio.playBeep(659, 0.18);
              this.startRaceCountdown();
              this.input.clearPulses();
              return;
            }
          }
          // Qualquer toque/clique fora dos botoes nao deve disparar a largada
          this.input.justPressedEnter = false;
        }

        if (this.input.justPressedUp) {
          this.setupGroup = 0;
          this.audio.playBeep(380, 0.04);
        }
        if (this.input.justPressedDown) {
          this.setupGroup = 1;
          this.audio.playBeep(380, 0.04);
        }
        if (this.input.justPressedLeft) {
          if (this.setupGroup === 0) {
            const curIdx = ENV_CONDITIONS.findIndex(e => e.id === this.envCond);
            const nextIdx = (curIdx - 1 + ENV_CONDITIONS.length) % ENV_CONDITIONS.length;
            this.envCond = ENV_CONDITIONS[nextIdx].id;
            this.audio.playBeep(330, 0.05);
          } else {
            this.songIndex = (this.songIndex - 1 + SONGS.length) % SONGS.length;
            this.audio.stopTitleMusic();
            this.audio.musicPlaying = true;
            if (this.audio && typeof this.audio.setSong === 'function') {
              this.audio.setSong(this.songIndex);
            }
            this.audio.playBeep(330, 0.05);
          }
        }
        if (this.input.justPressedRight) {
          if (this.setupGroup === 0) {
            const curIdx = ENV_CONDITIONS.findIndex(e => e.id === this.envCond);
            const nextIdx = (curIdx + 1) % ENV_CONDITIONS.length;
            this.envCond = ENV_CONDITIONS[nextIdx].id;
            this.audio.playBeep(330, 0.05);
          } else {
            this.songIndex = (this.songIndex + 1) % SONGS.length;
            this.audio.stopTitleMusic();
            this.audio.musicPlaying = true;
            if (this.audio && typeof this.audio.setSong === 'function') {
              this.audio.setSong(this.songIndex);
            }
            this.audio.playBeep(330, 0.05);
          }
        }

        if (this.input.justPressedEnter && this.setupCooldown <= 0) {
          this.audio.playBeep(659, 0.18);
          this.startRaceCountdown();
          this.input.clearPulses();
          return;
        }
        if (this.input.justPressedEsc) {
          this.audio.playBeep(330, 0.06);
          this.state = 'NAME_INPUT';
          if (this.nameWrapper) this.nameWrapper.classList.add('show');
          if (this.nameInput) {
            this.nameInput.value = this.playerName || 'JOGADOR';
            setTimeout(() => { try { this.nameInput.focus(); } catch (_) {} }, 40);
          }
          this.audio.musicPlaying = false;
          this.audio.playTitleMusic();
          this.input.clearPulses();
          return;
        }
        this.input.clearPulses();
        return;
      }
      if (this.input.justPressedEsc) {
        if (this.state === 'RACING') {
          this.state = 'PAUSED';
          this.audio.silenceEffects();
          this.audio.playBeep(300, 0.1);
          this.input.clearPulses();
          return;
        } else if (this.state === 'PAUSED') {
          this.state = 'RACING';
          this.audio.playBeep(523, 0.1);
          this.input.clearPulses();
          return;
        }
      }

      if (this.state === 'PAUSED') {
        this.audio.silenceEffects();
        let shouldResume = false;

        if (this.input.lastCanvasClick) {
          const click = this.input.lastCanvasClick;
          this.input.lastCanvasClick = null;
          // Área de alternar áudio
          if (Math.abs(click.x - INTERNAL_WIDTH / 2) <= 115 && click.y >= 114 && click.y <= 134) {
            this.audio.enabled = !this.audio.enabled;
            if (!this.audio.enabled) this.audio.silenceEffects();
            else this.audio.playBeep(440, 0.08);
          } else {
            // Qualquer outro toque/clique na tela (incluindo no botão CONTINUAR) retoma a corrida!
            shouldResume = true;
          }
        }

        if (this.input.justPressedEnter || this.input.justPressedEsc || this.input.justPressedNitro) {
          shouldResume = true;
        }

        if (shouldResume) {
          this.state = 'RACING';
          this.audio.playBeep(523, 0.1);
          this.input.clearPulses();
          return;
        }

        this.input.clearPulses();
        return;
      }

      if (this.state === 'RACE_RESULT') {
        this.audio.silenceEffects();
        if (this.input.lastCanvasClick) {
          this.input.lastCanvasClick = null;
          this.input.justPressedEnter = true;
        }
        if (this.input.justPressedEnter) {
          this.audio.playBeep(440, 0.1);
          if (this.gameMode === 'QUICK_RACE') {
            this.state = 'MENU';
            this.audio.musicPlaying = false;
            this.audio.playTitleMusic();
          } else if (this.trackIndex < TRACK_DEFINITIONS.length - 1) {
            this.loadTrack(this.trackIndex + 1);
            // Sorteia uma música aleatória diferente da anterior para a próxima etapa do campeonato
            const curSong = this.songIndex;
            let nextSong = curSong;
            if (SONGS.length > 1) {
              do {
                nextSong = Math.floor(Math.random() * SONGS.length);
              } while (nextSong === curSong);
            }
            this.songIndex = nextSong;
            this.startRaceCountdown();
          } else {
            this.state = 'CHAMPIONSHIP_RESULT';
            this.initConfetti();
          }
        }
        this.input.clearPulses();
        return;
      }

      if (this.state === 'CHAMPIONSHIP_RESULT') {
        this.audio.silenceEffects();
        this.updateConfetti(dt);
        if (this.input.lastCanvasClick) {
          this.input.lastCanvasClick = null;
          this.input.justPressedEnter = true;
        }
        if (this.input.justPressedEnter) {
          this.audio.playBeep(440, 0.1);
          this.championshipPoints.fill(0);
          this.initSeasonRoster();
          this.loadTrack(0);
          this.state = 'MENU';
          this.audio.musicPlaying = false;
          this.audio.playTitleMusic();
        }
        this.input.clearPulses();
        return;
      }

      // --- LARGADA ESTILO F1 (TODOS PARADOS NO GRID) ---
      if (this.state === 'COUNTDOWN') {
        for (let i = 0; i < this.cars.length; i++) {
          this.cars[i].speed = 0;
        }

        this.countdown -= dt;
        if (this.countdown > 2.7) {
          if (this.startLightsStage !== 1) {
            this.startLightsStage = 1;
            this.audio.playBeep(440, 0.15);
          }
        } else if (this.countdown > 1.8) {
          if (this.startLightsStage !== 2) {
            this.startLightsStage = 2;
            this.audio.playBeep(440, 0.15);
          }
        } else if (this.countdown > 0.9) {
          if (this.startLightsStage !== 3) {
            this.startLightsStage = 3;
            this.audio.playBeep(440, 0.15);
          }
        } else if (this.countdown > 0) {
          if (this.startLightsStage !== 4) {
            this.startLightsStage = 4;
            this.audio.playBeep(440, 0.15);
          }
        } else {
          this.startLightsStage = 5; // LUZES VERDES: LARGADA IMEDIATA!
          this.greenLightsTimer = 0.85;
          this.audio.playBeep(880, 0.35);
          this.state = 'RACING';
        }

        this.audio.updateEngineRpm(1200, false, false);
        this.input.clearPulses();
        return;
      }

      // --- CORRIDA EM ANDAMENTO ---
      this.updateSkyScroll(dt);
      this.updateEnv(dt);
      if (this.greenLightsTimer > 0) this.greenLightsTimer -= dt;
      if (this.state === 'RACING') {
        this.raceTimer += dt;
        this.currentLapTime += dt;
      }
      if (this.lapBannerTimer > 0) this.lapBannerTimer -= dt;

      const p = this.player;
      const model = p.model;
      const playerSeg = this.findSegment(p.z);

      if (this.finishingRace) {
        this.finishTimer -= dt;
        const elapsed = this.finishDuration - this.finishTimer;

        // Desaceleração suave e alinhamento reto do carro pós-bandeirada
        p.speed = Math.max(80, p.speed * 0.993);
        p.steerAngle *= 0.88;
        p.x += (0 - p.x) * 0.02;
        p.isBraking = false;
        p.isNitro = false;

        const stepZ = p.speed * 20 * dt;
        p.z = this.wrapZ(p.z + stepZ);
        p.totalDistance += stepZ;

        this.audio.updateEngineRpm(Math.max(1200, p.speed * 20), false, false);
        this.audio.setSkid(false);

        // Efeito fade até a classificação: inicia suave em 1.0s e chega a 1.0 em 3.0s
        const fadeStart = 1.0;
        if (elapsed >= fadeStart) {
          this.finishFadeAlpha = Math.min(1.0, (elapsed - fadeStart) / (this.finishDuration - fadeStart));
        } else {
          this.finishFadeAlpha = 0;
        }

        if (this.finishTimer <= 0) {
          this.finishingRace = false;
          this.finishFadeAlpha = 0;
          this.finishRace();
          this.input.clearPulses();
          return;
        }
      } else {
        if (this.input.justPressedNitro && p.nitroCharges > 0 && p.nitroTimer <= 0 && this.state === 'RACING') {
          p.nitroCharges--;
          p.nitroTimer = 2.4;
          this.audio.triggerNitroSound();
        }
        if (p.nitroTimer > 0) {
          p.nitroTimer -= dt;
          p.isNitro = true;
        } else {
          p.isNitro = false;
        }

      // Detecção de Vácuo (Slipstream) progressivo e gradual:
      // Inicia suavemente a ~480 unidades (~9-10 carros) e atinge o ápice de 100% de sucção
      // na distância de dois carros à frente (<= 95 unidades), crescendo gradativamente!
      p.inSlipstream = false;
      p.slipstreamIntensity = 0;
      p.slipstreamTarget = null;
      if (this.state === 'RACING' && p.speed > 42) {
        let bestIntensity = 0;
        let bestTarget = null;
        for (let i = 0; i < this.cars.length; i++) {
          const other = this.cars[i];
          if (other.isPlayer) continue;
          const aheadDz = this.shortestDeltaZ(other.z, p.z);
          if (aheadDz > 38 && aheadDz < 480) {
            let distW = 0;
            if (aheadDz <= 95) {
              distW = 1.0;
            } else {
              distW = Math.pow(1.0 - ((aheadDz - 95) / (480 - 95)), 1.20);
            }
            const maxLat = 0.44 + 0.16 * (aheadDz / 480);
            const latDiff = Math.abs(other.x - p.x);
            if (latDiff < maxLat) {
              const alignW = Math.max(0, 1.0 - (latDiff / maxLat));
              const intensity = Math.max(0, Math.min(1.0, distW * alignW));
              if (intensity > bestIntensity) {
                bestIntensity = intensity;
                bestTarget = other;
              }
            }
          }
        }
        if (bestIntensity > 0.03) {
          p.inSlipstream = true;
          p.slipstreamIntensity = bestIntensity;
          p.slipstreamTarget = bestTarget;
        }
      }

      // Ganho progressivo de velocidade e aceleração conforme a proximidade (Fórmula 1):
      // Permite que carros mais lentos (Fusca, Brasília, Uno, Corsa, etc.) utilizem o vácuo
      // de carros mais velozes para emparelhar, ganhar giro e executar a ultrapassagem!
      const slipInt = p.slipstreamIntensity || 0;
      const slipMaxMul = 1.0 + (0.16 * slipInt);
      const slipAccMul = 1.0 + (0.55 * slipInt);
      const targetDraftBonus = (p.slipstreamTarget && p.slipstreamTarget.speed > p.speed)
        ? (p.slipstreamTarget.speed - p.speed) * 0.24 * slipInt
        : 0;
      const effectiveMaxSpeed = ((p.isNitro ? (model.maxSpeed * 1.30) : model.maxSpeed) * slipMaxMul) + targetDraftBonus;
      const effectiveAccel = (p.isNitro ? (model.acceleration * 1.85) : model.acceleration) * slipAccMul;
      const speedRatio = Math.min(1.2, p.speed / Math.max(1, effectiveMaxSpeed));

      const isAccelerating = (this.input.up || p.isNitro) && (this.state === 'RACING');
      p.isBraking = this.input.down && (this.state === 'RACING');

      // Curva de torque progressiva por marcha + efeito gravitacional de subida/descida
      const slope = (playerSeg.p2.world.y - playerSeg.p1.world.y) / SEGMENT_LENGTH;
      const torqueFactor = 1.18 - Math.min(1, speedRatio) * 0.42;

      // Descida de ladeira (slope < 0): ganha aceleracao gravitacional e ultrapassa o limite de velocidade nominal!
      // Se um carro e limitado a 230 km/h, na descida pode ultrapassar 255-270+ km/h!
      const downhillBonus = Math.max(0, -slope * 230);
      const dynamicMaxSpeed = effectiveMaxSpeed + downhillBonus;

      if (isAccelerating && p.isBraking) {
        // Trail Braking / Frenagem esportiva simultânea:
        // Pressionar freio e acelerador ao mesmo tempo reduz suavemente a velocidade,
        // permitindo dosar a tangência ideal em curvas sem perder totalmente o giro do motor!
        const trailBrakeRate = (125 + model.braking * 95) * dt;
        p.speed = Math.max(0, p.speed - trailBrakeRate);
      } else if (isAccelerating) {
        const rate = (132 + effectiveAccel * 135) * torqueFactor * dt;
        p.speed = Math.min(p.speed + rate, dynamicMaxSpeed);
      } else if (p.isBraking) {
        const brakeRate = (255 + model.braking * 175) * dt;
        p.speed = Math.max(p.speed - brakeRate, 0);
      } else {
        const drag = (48 + speedRatio * 34) * dt;
        p.speed = Math.max(p.speed - drag, 0);
      }

      // Gravidade fisica continua:
      // - Descendo (slope < 0): acelera o carro para frente!
      // - Subindo (slope > 0): puxa o carro para tras, reduzindo velocidade!
      if (p.speed > 10 && slope !== 0) {
        const gravityForce = -slope * 340 * dt;
        p.speed = Math.max(25, Math.min(dynamicMaxSpeed, p.speed + gravityForce));
      }

      p.updateTransmission();

      // Esterçamento Analógico Suave (controla física + troca dos 3 sprites de curva/reta)
      let steerInput = 0;
      if (this.state === 'RACING') {
        if (this.input && Math.abs(this.input.analogSteer) > 0.04) {
          steerInput = this.input.analogSteer;
        } else {
          if (this.input.left) steerInput -= 1;
          if (this.input.right) steerInput += 1;
        }
      }
      p.steer = steerInput;

      if (steerInput !== 0) {
        const rampRate = (steerInput * p.steerAngle < 0) ? 13.5 : 8.8;
        p.steerAngle += (steerInput - p.steerAngle) * Math.min(1, rampRate * dt);
      } else {
        p.steerAngle += (0 - p.steerAngle) * Math.min(1, 10.8 * dt);
        if (Math.abs(p.steerAngle) < 0.01) p.steerAngle = 0;
      }

      if (Math.abs(p.steerAngle) > 0.01 && p.speed > 2) {
        const lowSpeedAuthority = Math.min(1, p.speed / 45);
        const highSpeedAuthority = 1.0 - Math.min(0.22, speedRatio * 0.18);
        const steerPower = (2.15 * model.handling + 0.42) * lowSpeedAuthority * highSpeedAuthority;
        p.x += p.steerAngle * steerPower * dt;

        // Leve perda de velocidade por atrito lateral em curvas fortes
        if (Math.abs(playerSeg.curve) > 1.4 && speedRatio > 0.72) {
          const scrub = Math.abs(p.steerAngle) * (1.15 - model.grip * 0.65) * 22 * dt;
          p.speed = Math.max(40, p.speed - scrub);
        }
      }

      // Força Centrífuga progressiva e equilibrada + amortecimento elástico de toque lateral
      if (playerSeg.curve !== 0 && p.speed > 15) {
        const centrifugal = (playerSeg.curve * (speedRatio * speedRatio) * 0.40) / model.centrifugalResistance;
        p.x -= centrifugal * dt;
      }
      if (Math.abs(p.bumpVelX) > 0.005) {
        p.x += p.bumpVelX * dt;
        p.bumpVelX *= Math.exp(-11 * dt);
      } else {
        p.bumpVelX = 0;
      }
      p.x = Math.max(Math.min(p.x, 2.25), -2.25);

      // Física diferenciada entre Zebra (Curb) e Grama (Off-road) — sem tremer a tela à toa!
      const absX = Math.abs(p.x);
      const isOffroad = absX > 1.08;

      if (isOffroad && p.speed > 45) {
        const offDepth = Math.min(1.5, (absX - 1.08) * 1.8 + 0.5);
        p.speed = Math.max(p.speed - (155 * offDepth) * dt, 42);
        this.shake = Math.max(this.shake * 0.85, 1.5);
        this.particlePool.spawn(p.x + (Math.random() - 0.5) * 0.18, 0, p.z, (Math.random() - 0.5) * 0.45, -0.26, 0.28, playerSeg.color.grass);
      } else {
        // Pista asfaltada lisa: zero vibração na câmera para eliminar qualquer sensação de náusea/enjoo
        this.shake = Math.max(0, this.shake - 25 * dt);
      }

      const targetRoll = (-playerSeg.curve * 0.0065) + (p.steerAngle * 0.010);
      this.cameraRoll += (targetRoll - this.cameraRoll) * 6.5 * dt;

      if (p.isNitro) {
        this.particlePool.spawn(p.x - 0.07, 0.02, p.z, (Math.random() - 0.5) * 0.22, -0.15, 0.16, '#00B4D8');
        this.particlePool.spawn(p.x + 0.07, 0.02, p.z, (Math.random() - 0.5) * 0.22, -0.15, 0.16, '#FFF');
      } else if (p.inSlipstream && Math.random() < 0.45) {
        this.particlePool.spawn(p.x + (Math.random() - 0.5) * 0.28, -0.12, p.z + 40, 0, -0.05, 0.14, 'rgba(210, 245, 255, 0.45)');
      }

      const isSkidding = (Math.abs(p.steerAngle) > 0.58 && speedRatio > 0.66 && Math.abs(playerSeg.curve) > 0.95) || (isOffroad && p.speed > 80);
      if (isSkidding && !isOffroad && this.state === 'RACING') {
        playerSeg.skidX = p.x;
        playerSeg.skidUntil = this.raceTimer + 7.0;
        if (Math.random() < 0.68) {
          this.particlePool.spawn(p.x - 0.11, 0.04, p.z, (Math.random() - 0.5) * 0.20, -0.18, 0.22, 'rgba(215, 222, 232, 0.58)');
          this.particlePool.spawn(p.x + 0.11, 0.04, p.z, (Math.random() - 0.5) * 0.20, -0.18, 0.22, 'rgba(215, 222, 232, 0.58)');
        }
      }
      this.audio.updateEngineRpm(p.rpm, isAccelerating, p.isNitro);
      this.audio.setSkid(isSkidding);

      const stepZ = p.speed * 20 * dt;
      p.z = this.wrapZ(p.z + stepZ);
      p.totalDistance += stepZ;

      // Inicia a cronometragem da Volta 1 exatamente na passagem inicial da linha de largada
      if (!p.passedStartLine && p.totalDistance >= START_LINE_Z) {
        p.passedStartLine = true;
        this.currentLapTime = 0;
        if (this.radio) this.radio.speak("Largada autorizada! Volta 1 em andamento!", false);
      }

      if (this.state === 'RACING' && p.totalDistance >= p.nextLapTarget) {
        p.nextLapTarget += this.track.totalLength;
        p.laps++;
        const thisLap = this.currentLapTime;
        this.lastLapTime = thisLap;
        if (this.bestLapTime === 0 || thisLap < this.bestLapTime) {
          this.bestLapTime = thisLap;
          if (this.radio) this.radio.speak("Volta mais rápida da corrida!", false);
        }
        this.currentLapTime = 0;

        this.audio.playBeep(659, 0.25);
        this.lapBannerTimer = 2.0;

        if (p.laps >= TOTAL_LAPS) {
          p.finishTime = this.raceTimer;
          p.finished = true;
          if (this.radio) this.radio.speak("Bandeira quadriculada! Corrida finalizada!", true);

          // Inicia transição de finalização: aguarda 3 segundos com câmera parada e fade até a classificação
          this.finishingRace = true;
          this.finishDuration = 3.0;
          this.finishTimer = 3.0;
          this.finishFadeAlpha = 0;

          // A CÂMERA PARA exatamente no momento em que o nosso carro bandeirou:
          this.finishCamOriginZ = this.wrapZ(p.z - PLAYER_Z_OFFSET);
          this.finishCameraX = p.x * ROAD_WIDTH * 0.65;
          const refSeg = this.findSegment(p.z);
          const refPercent = (p.z % SEGMENT_LENGTH) / SEGMENT_LENGTH;
          const playerWorldY = (1 - refPercent) * refSeg.p1.world.y + refPercent * refSeg.p2.world.y;
          this.finishCameraY = CAMERA_HEIGHT + playerWorldY;

          this.audio.playBeep(523, 0.2);
          setTimeout(() => this.audio.playBeep(659, 0.2), 200);
          setTimeout(() => this.audio.playBeep(880, 0.4), 400);

          this.input.clearPulses();
        } else {
          this.lapBannerText = `VOLTA ${p.laps + 1} / ${TOTAL_LAPS}`;
          if (p.laps + 1 === TOTAL_LAPS) {
            if (this.radio) this.radio.speak("Atenção: última volta! Dê tudo de si!", true);
          } else {
            if (this.radio) this.radio.speak(`Volta ${p.laps + 1}! Mantenha a pressão!`, false);
          }
        }
      }
    }

      // --- IA DOS 19 BOTS (LARGADA F1 + TRAÇADO + VÁCUO + 3 NITROS E ULTRAPASSAGEM) ---
      for (let i = 0; i < this.cars.length; i++) {
        const bot = this.cars[i];
        if (bot.isPlayer) continue;

        if (this.raceTimer < bot.launchDelay) {
          bot.speed = 0;
          continue;
        }

        // Atualiza contadores de Nitro do Bot
        if (bot.nitroTimer > 0) {
          bot.nitroTimer -= dt;
          bot.isNitro = true;
        } else {
          bot.isNitro = false;
        }
        if (bot.nitroCooldown > 0) {
          bot.nitroCooldown -= dt;
        }

        const botSeg = this.findSegment(bot.z);
        const botSlope = (botSeg.p2.world.y - botSeg.p1.world.y) / SEGMENT_LENGTH;
        let baseTargetSpeed = bot.model.maxSpeed * bot.aiSkill * 0.96;
        if (Math.abs(botSeg.curve) > 2.0) baseTargetSpeed *= 0.86;
        // Gravidade para os rivais também (embalam na descida e pesam na subida)
        baseTargetSpeed += Math.max(-45, -botSlope * 210);

        // Vácuo para os Bots: detecta carros à frente (jogador ou outros bots)
        bot.inSlipstream = false;
        bot.slipstreamIntensity = 0;
        let leadCar = null;
        let leadDist = 9999;
        if (this.state === 'RACING' && bot.speed > 40) {
          let bestIntensity = 0;
          for (let k = 0; k < this.cars.length; k++) {
            if (i === k) continue;
            const other = this.cars[k];
            const aheadDz = this.shortestDeltaZ(other.z, bot.z);
            if (aheadDz > 38 && aheadDz < 480) {
              const distW = (aheadDz <= 95) ? 1.0 : Math.pow(1.0 - ((aheadDz - 95) / (480 - 95)), 1.20);
              const maxLat = 0.44 + 0.16 * (aheadDz / 480);
              const latDiff = Math.abs(other.x - bot.x);
              if (latDiff < maxLat) {
                const alignW = Math.max(0, 1.0 - (latDiff / maxLat));
                const intensity = Math.max(0, Math.min(1.0, distW * alignW));
                if (intensity > bestIntensity) {
                  bestIntensity = intensity;
                  leadCar = other;
                  leadDist = aheadDz;
                }
              }
            }
          }
          if (bestIntensity > 0.03) {
            bot.inSlipstream = true;
            bot.slipstreamIntensity = bestIntensity;
          }
        }

        // Aplica bônus de vácuo ao bot (velocidade máxima e aceleração)
        let targetSpeed = baseTargetSpeed * (1.0 + (0.15 * (bot.slipstreamIntensity || 0)));
        if (leadCar && leadCar.speed > bot.speed) {
          targetSpeed += (leadCar.speed - bot.speed) * 0.22 * (bot.slipstreamIntensity || 0);
        }

        // Bônus do Nitro ativo do Bot
        if (bot.isNitro) {
          targetSpeed = bot.model.maxSpeed * 1.30;
        }

        // Inteligência de Uso dos 3 Nitros pelos Bots
        if (this.state === 'RACING' && this.raceTimer > 2.5 && bot.nitroCharges > 0 && bot.nitroTimer <= 0 && bot.nitroCooldown <= 0) {
          const isStraight = Math.abs(botSeg.curve) < 1.0;
          // Caso 1: Vácuo próximo querendo ultrapassar na reta (slingshot)
          const shouldDraftPass = leadCar && leadDist < 240 && isStraight && (bot.speed > 130);
          // Caso 2: Saída de curva para reta acelerando forte
          const shouldExitLaunch = isStraight && bot.speed < bot.model.maxSpeed * 0.82 && Math.random() < 0.04;
          // Caso 3: Disputa acirrada com o jogador (defendendo ou atacando na 2ª e 3ª voltas)
          const playerDist = Math.abs(this.shortestDeltaZ(this.player.z, bot.z));
          const shouldFightPlayer = playerDist < 260 && (this.player.laps >= 1 || isStraight) && Math.random() < 0.06;

          if (shouldDraftPass || shouldExitLaunch || shouldFightPlayer) {
            bot.nitroCharges--;
            bot.nitroTimer = 2.4;
            bot.nitroCooldown = 7.0 + Math.random() * 8.0;
            bot.isNitro = true;
          }
        }

        // Traçado e Tangência dos Bots
        if (this.raceTimer > 2.8) {
          if (botSeg.curve !== 0) {
            const apexX = Math.max(-0.68, Math.min(0.68, -botSeg.curve * 0.22));
            bot.targetX += (apexX - bot.targetX) * 1.4 * dt;
          } else if (bot.inSlipstream && leadCar && leadDist > 120) {
            // Em vácuo distante: o bot se posiciona atrás do carro da frente para sugar velocidade!
            bot.targetX += (leadCar.x - bot.targetX) * 2.0 * dt;
          } else {
            bot.laneChangeTimer -= dt;
            if (bot.laneChangeTimer <= 0) {
              bot.laneChangeTimer = 2.4 + Math.random() * 3.2;
              bot.targetX = (Math.random() - 0.5) * 1.24;
            }
          }
        }

        let blocked = false;
        if (bot.bumpBoostTimer > 0) {
          bot.bumpBoostTimer -= dt;
        }

        // Manobra inteligente de ultrapassagem / desvio
        for (let j = 0; j < this.cars.length; j++) {
          if (i === j) continue;
          const other = this.cars[j];
          const distZ = this.shortestDeltaZ(other.z, bot.z);
          if (distZ > 0 && distZ < 260 && Math.abs(other.x - bot.x) < 0.40) {
            blocked = true;
            if (this.raceTimer > 1.6) {
              // Slingshot: puxa para a lateral livre para ultrapassar
              const passDir = (other.x > 0) ? -0.44 : 0.44;
              bot.targetX = Math.max(-0.78, Math.min(0.78, other.x + passDir));
            }
            if (distZ < 100 && bot.bumpBoostTimer <= 0 && !bot.isNitro) {
              targetSpeed = Math.min(targetSpeed, other.speed * 0.94);
            }
            break;
          }
        }

        // Aplicação de aceleração e frenagem do Bot
        if (blocked && bot.speed > targetSpeed + 12 && bot.bumpBoostTimer <= 0 && !bot.isNitro) {
          bot.speed = Math.max(bot.speed - 190 * dt, targetSpeed);
          bot.isBraking = true;
        } else {
          bot.isBraking = false;
          if (bot.speed < targetSpeed) {
            const accelMul = bot.isNitro ? 2.0 : (1.0 + (0.45 * (bot.slipstreamIntensity || 0)));
            const launchRate = (120 + bot.model.acceleration * 125) * accelMul * dt;
            bot.speed = Math.min(bot.speed + launchRate, targetSpeed);
          } else if (bot.bumpBoostTimer <= 0 && !bot.isNitro) {
            bot.speed = Math.max(bot.speed - 65 * dt, targetSpeed);
          }
        }

        bot.targetX = Math.max(-0.80, Math.min(0.80, bot.targetX));
        const prevBotX = bot.x;
        bot.x += (bot.targetX - bot.x) * 2.4 * dt;

        // Angulo visual dos bots para acionar os 3 sprites (curva a esquerda, reto, curva a direita)
        const lateralVel = (bot.x - prevBotX) / Math.max(0.001, dt);
        const desiredBotSteer = Math.max(-1, Math.min(1, lateralVel * 1.15 + botSeg.curve * 0.16));
        bot.steerAngle += (desiredBotSteer - bot.steerAngle) * Math.min(1, 7.5 * dt);

        const botStepZ = bot.speed * 20 * dt;
        bot.z = this.wrapZ(bot.z + botStepZ);
        bot.totalDistance += botStepZ;

        if (bot.totalDistance >= bot.nextLapTarget) {
          bot.nextLapTarget += this.track.totalLength;
          bot.laps++;
          if (bot.laps >= TOTAL_LAPS && bot.finishTime === 0) {
            bot.finishTime = this.raceTimer;
          }
        }

        if (bot.collisionCooldown > 0) bot.collisionCooldown -= dt;
      }

      // --- FISICA DE COLISAO REALISTA (ESTILO TOP GEAR + RESPEITO A LARGURA REAL DO CARRO) ---
      if (p.collisionCooldown > 0) p.collisionCooldown -= dt;

      for (let i = 0; i < this.cars.length; i++) {
        const bot = this.cars[i];
        if (bot.isPlayer) continue;
        if (this.finishingRace) continue; // Após bandeirar, o carro do jogador desacelera em segurança sem colisão

        // dz < 0: bot esta a frente do jogador | dz > 0: bot esta atras do jogador
        const dz = this.shortestDeltaZ(p.z, bot.z);
        const dx = p.x - bot.x;
        const absDx = Math.abs(dx);

        // Largura fisica real do carro na pista: 0.385 (impede que o carro passe por dentro!)
        const COLLISION_WIDTH = 0.385;

        // Ignora carros fora do alcance visual e fisico
        if (dz <= -85 || dz >= 65 || absDx >= COLLISION_WIDTH || p.collisionCooldown > 0) continue;

        let didCollide = false;

        if (dz <= -26) {
          // ========================================================
          // 1. COLISAO TRASEIRA (ESTILO TOP GEAR):
          // Jogador bateu na traseira do rival a frente!
          // O jogador perde velocidade (bate no "muro") e o rival ganha impulso para frente!
          // ========================================================
          didCollide = true;
          const speedDiff = Math.max(0, p.speed - bot.speed);

          // Jogador perde velocidade significativa e eh contido atras do rival
          p.speed = Math.max(30, Math.min(p.speed - 42 - speedDiff * 0.45, bot.speed * 0.86));
          p.z = this.wrapZ(bot.z - 46);

          // Rival recebe um impulso direto para frente (estilo Top Gear)
          const forwardImpulse = 28 + Math.min(42, speedDiff * 0.55);
          bot.speed = Math.min(bot.speed + forwardImpulse, bot.model.maxSpeed * 1.25);
          bot.bumpBoostTimer = 1.8; // Mantem o impulso sem a IA frear de imediato
          bot.z = this.wrapZ(bot.z + 20);
          bot.totalDistance += 20;

          // Se bateu descentralizado, desvia levemente para o lado
          if (absDx > 0.08) {
            p.bumpVelX = (dx >= 0 ? 0.95 : -0.95);
          }
          this.shake = 2.6;
        } else if (dz >= 26) {
          // ========================================================
          // 2. RIVAL BATEU NA TRASEIRA DO JOGADOR
          // ========================================================
          if (bot.speed > p.speed + 10) {
            didCollide = true;
            bot.speed = Math.max(30, p.speed * 0.82);
            const playerTopSpeed = (p.isNitro ? (model.maxSpeed * 1.30) : model.maxSpeed);
            p.speed = Math.min(p.speed + 22, playerTopSpeed * 1.10);
            bot.z = this.wrapZ(p.z - 46);
            this.shake = 2.0;
          }
        } else {
          // ========================================================
          // 3. CONTATO PORTA-A-PORTA LATERAL / DISPUTA DE ESPACO:
          // Respeita o volume do carro para NAO passar por dentro!
          // Empurra os dois carros para fora proporcionalmente ao overlap.
          // ========================================================
          didCollide = true;
          const overlap = COLLISION_WIDTH - absDx;
          const dirX = (dx >= 0) ? 1 : -1;

          // Afasta fisicamente para nao sobrepor o sprite
          p.x = Math.max(-1.08, Math.min(1.08, p.x + dirX * overlap * 0.60));
          bot.x = Math.max(-0.85, Math.min(0.85, bot.x - dirX * overlap * 0.40));
          bot.targetX = bot.x; // Rival defende a posicao e fecha a porta

          p.bumpVelX = dirX * 1.75;
          p.speed = Math.max(30, p.speed * 0.94); // Atrito lateral
          bot.speed = Math.max(30, bot.speed * 0.95);
          this.shake = 1.6;
        }

        if (didCollide) {
          this.audio.playCrash();
          p.collisionCooldown = 0.22;
          bot.collisionCooldown = 0.22;

          for (let k = 0; k < 6; k++) {
            this.particlePool.spawn(
              (p.x + bot.x) / 2, -0.06, p.z,
              (Math.random() - 0.5) * 1.2, -Math.random() * 0.65,
              0.22, '#FFB300'
            );
          }
          break; // Processa uma colisao por frame para maxima estabilidade
        }
      }

      // Colisão mútua entre bots da CPU para evitar que passem um por dentro do outro
      for (let i = 0; i < this.cars.length; i++) {
        const carA = this.cars[i];
        if (carA.isPlayer) continue;
        for (let j = i + 1; j < this.cars.length; j++) {
          const carB = this.cars[j];
          if (carB.isPlayer) continue;

          const dz = Math.abs(this.shortestDeltaZ(carA.z, carB.z));
          const dx = carA.x - carB.x;
          const absDx = Math.abs(dx);

          if (dz < 42 && absDx < 0.36) {
            const overlap = (0.36 - absDx) * 0.5;
            const dirX = (dx >= 0) ? 1 : -1;
            carA.x = Math.max(-0.88, Math.min(0.88, carA.x + dirX * overlap));
            carB.x = Math.max(-0.88, Math.min(0.88, carB.x - dirX * overlap));
            carA.speed = Math.max(30, carA.speed * 0.98);
            carB.speed = Math.max(30, carB.speed * 0.98);
          }
        }
      }

      this.particlePool.update(dt);
      this.input.clearPulses();
    }

    getRankedCars() {
      return [...this.cars].sort((a, b) => {
        // Carros que já receberam a bandeirada (finishTime > 0) têm prioridade pelo menor tempo
        if (a.finishTime > 0 && b.finishTime > 0) return a.finishTime - b.finishTime;
        if (a.finishTime > 0) return -1;
        if (b.finishTime > 0) return 1;
        // Carros ainda na pista são ordenados pela maior distância percorrida
        return b.totalDistance - a.totalDistance;
      });
    }

    finishRace() {
      this.state = 'RACE_RESULT';
      this.audio.silenceEffects();
      this.audio.musicPlaying = false;
      this.audio.playBeep(523, 0.2);
      setTimeout(() => this.audio.playBeep(659, 0.2), 200);
      setTimeout(() => this.audio.playBeep(880, 0.4), 400);

      const ranked = this.getRankedCars();
      this.lastRacePositions = ranked;

      for (let pos = 0; pos < ranked.length; pos++) {
        const car = ranked[pos];
        const pts = (pos < F1_POINTS.length) ? F1_POINTS[pos] : 0;
        car.racePos = pos + 1;
        car.racePoints = pts;
        if (this.gameMode === 'CHAMPIONSHIP') {
          this.championshipPoints[car.id] += pts;
        }
      }
    }

    // ==========================================
    // RENDERIZAÇÃO GRÁFICA 2.5D ARCADE HD
    // ==========================================
    render() {
      const ctx = this.ctx;
      const def = TRACK_DEFINITIONS[this.trackIndex];

      ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
      ctx.imageSmoothingEnabled = true;

      ctx.save();

      if (this.cameraRoll !== 0 || this.shake > 0) {
        ctx.translate(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2);
        ctx.rotate(this.cameraRoll);
        if (this.shake > 0) {
          ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }
        ctx.translate(-INTERNAL_WIDTH / 2, -INTERNAL_HEIGHT / 2);
      }

      this.renderSky(ctx, def);

      // Fundo base de terreno de acordo com o clima/horário ativo (verde em dia, branco em neve, etc.)
      ctx.fillStyle = (this.segColDark && this.segColDark.grass) ? this.segColDark.grass : def.colors.grassDark;
      ctx.fillRect(-20, INTERNAL_HEIGHT / 2, INTERNAL_WIDTH + 40, INTERNAL_HEIGHT / 2 + 20);

      this.renderRoad(ctx, def);

      const isNight = this.envCur ? ((this.envCur.s.night || 0) > 0.28) : false;
      const isDusk = this.envCur ? ((this.envCur.s.dusk || 0) > 0.25) : false;

      // Neblina atmosférica sutil na linha do horizonte para profundidade
      const hazeGrad = ctx.createLinearGradient(0, INTERNAL_HEIGHT / 2 - 4, 0, INTERNAL_HEIGHT / 2 + 10);
      hazeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      hazeGrad.addColorStop(0.45, isNight ? 'rgba(0, 180, 216, 0.12)' : (isDusk ? 'rgba(255, 140, 80, 0.22)' : 'rgba(220, 242, 255, 0.22)'));
      hazeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(-20, INTERNAL_HEIGHT / 2 - 4, INTERNAL_WIDTH + 40, 14);

      // Carro do Jogador projetado exatamente no mesmo espaço 3D da pista e dos rivais
      if (this.state === 'RACING' || this.state === 'COUNTDOWN' || this.state === 'PAUSED') {
        const steerLean = this.player.steerAngle || 0;
        const playerSeg = this.findSegment(this.player.z);
        const inTunnel = (playerSeg && !!playerSeg.tunnel);
        const nightIntensity = inTunnel ? 1.0 : (this.envCur ? (this.envCur.s.night || 0) : 0);
        const isNight = (nightIntensity > 0.28);

        if (this.finishingRace) {
          // Quando bandeirou e a câmera parou, o carro se afasta pela pista em perspectiva 3D realista
          const playerZ = this.wrapZ(this.player.z);
          const camOriginZ = this.finishCamOriginZ;
          const relCamZ = (playerZ >= camOriginZ) ? (playerZ - camOriginZ) : (this.track.totalLength - camOriginZ + playerZ);

          const pSeg = this.findSegment(playerZ);
          const pPct = (playerZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
          const cRoad = this.projectInterpolated(pSeg, pPct);

          const distScale = PLAYER_Z_OFFSET / Math.max(1, relCamZ);
          const carW = PLAYER_CAR_W * distScale;
          const carH = PLAYER_CAR_H * distScale;
          const carX = cRoad.x + cRoad.w * this.player.x;
          const carY = cRoad.y - carH * (24 / 68);

          if (isNight && carW > 10) {
            this.renderHeadlightBeams(ctx, carX, carY, steerLean, nightIntensity * distScale);
          }

          this.player.model.render(
            ctx,
            carX,
            carY,
            carW,
            carH,
            false,
            steerLean,
            this.player.bodyColor,
            {
              isNitro: false,
              wheelPhase: this.player.z * 0.035,
              isNight,
              speed: this.player.speed
            }
          );
        } else {
          const pos = this.playerRenderPos || { x: INTERNAL_WIDTH / 2, y: INTERNAL_HEIGHT - 38 };
          const playerScreenX = pos.x;
          const playerScreenY = pos.y;

          if (isNight) {
            this.renderHeadlightBeams(ctx, playerScreenX, playerScreenY, steerLean, nightIntensity);
          }

          this.player.model.render(
            ctx,
            playerScreenX,
            playerScreenY,
            PLAYER_CAR_W,
            PLAYER_CAR_H,
            this.player.isBraking,
            steerLean,
            this.player.bodyColor,
            {
              isNitro: this.player.isNitro,
              wheelPhase: this.player.z * 0.035,
              isNight,
              speed: this.player.speed
            }
          );
        }

        // Rivais porta-a-porta levemente atrás do para-choque do jogador
        if (this.foregroundBots && this.foregroundBots.length > 0) {
          for (let i = 0; i < this.foregroundBots.length; i++) {
            const fb = this.foregroundBots[i];
            fb.bot.model.render(
              ctx,
              fb.x,
              fb.y,
              fb.w,
              fb.h,
              fb.bot.isBraking,
              fb.bot.steerAngle || 0,
              fb.bot.bodyColor,
              {
                isNitro: !!fb.bot.isNitro,
                wheelPhase: fb.bot.z * 0.035,
                isNight,
                speed: fb.bot.speed
              }
            );
            if (fb.w >= 14 && fb.bot.driverCode) {
              this.renderDriverBadge(ctx, fb.bot.driverCode, fb.x, fb.y - fb.h * 0.44, fb.w);
            }
          }
        }
      }

      this.renderParticles(ctx);

      if (this.player && this.state === 'RACING' && (this.player.isNitro || this.player.speed > 135)) {
        this.renderSpeedLines(ctx);
      }
      ctx.restore();

      // HUD e Menus
      if (this.state === 'COUNTDOWN' || (this.state === 'RACING' && this.greenLightsTimer > 0)) {
        this.renderStartGantry(ctx);
      }

      if (this.state === 'RACING' || this.state === 'COUNTDOWN' || this.state === 'PAUSED') {
        this.renderHUD(ctx);
      }

      if (this.state === 'RACING' || this.state === 'COUNTDOWN' || this.state === 'PAUSED') {
        this.renderWeatherFx(ctx);
      }

      // Efeito de Bandeirada: Câmera Parada e Fade out até a Classificação
      if (this.finishingRace) {
        ctx.save();
        const bannerBlink = Math.floor(performance.now() / 250) % 2 === 0;
        ctx.fillStyle = bannerBlink ? '#FFD700' : '#00E5FF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.strokeText('🏁 BANDEIRA QUADRICULADA! 🏁', INTERNAL_WIDTH / 2, 44);
        ctx.fillText('🏁 BANDEIRA QUADRICULADA! 🏁', INTERNAL_WIDTH / 2, 44);
        ctx.restore();

        if (this.finishFadeAlpha > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${this.finishFadeAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
          ctx.restore();
        }
      }

      if (this.state === 'MENU') {
        this.renderMenu(ctx);
      } else if (this.state === 'MODE_SELECT') {
        this.renderModeSelect(ctx);
      } else if (this.state === 'TRACK_SELECT') {
        this.renderTrackSelect(ctx);
      } else if (this.state === 'CAR_SELECT') {
        this.renderCarSelect(ctx);
      } else if (this.state === 'COLOR_SELECT') {
        this.renderColorSelect(ctx);
      } else if (this.state === 'NAME_INPUT') {
        this.renderNameInput(ctx);
      } else if (this.state === 'RACE_SETUP') {
        this.renderRaceSetup(ctx);
      } else if (this.state === 'PAUSED') {
        this.renderPauseMenu(ctx);
      } else if (this.state === 'RACE_RESULT') {
        this.renderRaceResult(ctx);
      } else if (this.state === 'CHAMPIONSHIP_RESULT') {
        this.renderChampionshipResult(ctx);
      }

      // Notificação Arcade de Detecção de Gamepad / Joystick Nativo
      if (this.input && this.input.gamepadBannerTimer > 0) {
        ctx.save();
        const alpha = Math.min(1, this.input.gamepadBannerTimer * 1.6);
        ctx.globalAlpha = alpha;
        const bW = 270;
        const bH = 20;
        const bX = Math.round(INTERNAL_WIDTH / 2 - bW / 2);
        const bY = 7;
        ctx.fillStyle = 'rgba(6, 12, 24, 0.94)';
        ctx.fillRect(bX, bY, bW, bH);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bX, bY, bW, bH);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 7.5px monospace';
        const cleanName = (this.input.gamepadName || 'GAMESIR / CONTROLE NATIVO').slice(0, 32);
        ctx.fillText(`🎮 CONTROLE DETECTADO: ${cleanName}`, INTERNAL_WIDTH / 2, bY + 13);
        ctx.restore();
      }
    }

    renderHeadlightBeams(ctx, px, py, steer, intensity = 1.0) {
      ctx.save();
      const tilt = steer * 14;
      const alpha = Math.min(1, Math.max(0, intensity));

      // Facho de iluminacao circular/oval no asfalto em frente ao carro do jogador
      const poolY = py - 30;
      const poolGrad = ctx.createRadialGradient(px + tilt * 0.5, poolY, 4, px + tilt * 0.5, poolY, 75);
      poolGrad.addColorStop(0, `rgba(255, 255, 235, ${(0.45 * alpha).toFixed(3)})`);
      poolGrad.addColorStop(0.35, `rgba(235, 248, 255, ${(0.26 * alpha).toFixed(3)})`);
      poolGrad.addColorStop(0.70, `rgba(195, 230, 255, ${(0.11 * alpha).toFixed(3)})`);
      poolGrad.addColorStop(1, 'rgba(180, 220, 255, 0)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(px + tilt * 0.5, poolY, 68, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    renderBotHeadlightBeams(ctx, x, y, w, h, steer, intensity = 1.0) {
      if (w <= 8 || h <= 4) return;
      ctx.save();
      const tilt = steer * w * 0.20;
      const alpha = Math.min(1, Math.max(0, intensity));

      // Facho de iluminacao circular/oval no asfalto em frente ao carro adversario
      const poolY = y - h * 0.35;
      const radiusX = Math.max(6, w * 0.65);
      const radiusY = Math.max(2, h * 0.28);
      const innerR = Math.min(2, radiusX * 0.2);
      const poolGrad = ctx.createRadialGradient(x + tilt, poolY, innerR, x + tilt, poolY, radiusX);
      poolGrad.addColorStop(0, `rgba(255, 252, 230, ${(0.38 * alpha).toFixed(3)})`);
      poolGrad.addColorStop(0.40, `rgba(230, 245, 255, ${(0.20 * alpha).toFixed(3)})`);
      poolGrad.addColorStop(1, 'rgba(190, 225, 255, 0)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(x + tilt, poolY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ==========================================
    // AMBIENTE: transição suave de horário/clima + rolagem do cenário de fundo pela CURVA
    // ==========================================
    updateEnv(dt) {
      const track = TRACK_DEFINITIONS[this.trackIndex];
      let target, key;
      if (this.envCond === 'DINAMICO') {
        this.envTime += dt;
        const seg = DYN_HOLD + DYN_BLEND;
        const total = DYN_ORDER.length * seg;
        const tt = this.envTime % total;
        const i = Math.floor(tt / seg);
        const within = tt - i * seg;
        const A = getEnvTarget(track, DYN_ORDER[i]);
        if (within < DYN_HOLD) {
          target = A;
        } else {
          const nextCond = DYN_ORDER[(i + 1) % DYN_ORDER.length];
          const B = getEnvTarget(track, nextCond);
          const k = (within - DYN_HOLD) / DYN_BLEND;
          target = lerpEnv(A, B, k * k * (3 - 2 * k));
          if (this.dynAnnounced !== i && this.state === 'RACING') {
            this.dynAnnounced = i;
            const info = ENV_CONDITIONS.find(e => e.id === nextCond);
            this.envBanner = { text: `CLIMA MUDANDO: ${info ? info.icon + ' ' + info.label : nextCond}`, t: 3.2 };
          }
        }
        key = 'DINAMICO|' + track.id;
      } else {
        target = getEnvTarget(track, this.envCond);
        key = this.envCond + '|' + track.id;
      }

      if (key !== this.envKey) {
        this.envFrom = this.envCur || target;
        this.envBlend = this.envCur ? 0 : 1;
        this.envKey = key;
      }
      if (this.envBlend < 1) {
        this.envBlend = Math.min(1, this.envBlend + dt / 0.7);
        const k = this.envBlend * this.envBlend * (3 - 2 * this.envBlend);
        this.envCur = lerpEnv(this.envFrom, target, k);
      } else {
        this.envCur = target;
      }

      const c = this.envCur.css;
      this.segColLight = { road: c.roadLight, grass: c.grassLight, rumble: c.rumbleLight, lane: c.lane };
      this.segColDark = { road: c.roadDark, grass: c.grassDark, rumble: c.rumbleDark, lane: 'transparent' };

      if (this.envBanner) {
        this.envBanner.t -= dt;
        if (this.envBanner.t <= 0) this.envBanner = null;
      }
    }

    // As montanhas/nuvens só se deslocam quando a estrada CURVA (e não mais com o simples avanço em reta)
    updateSkyScroll(dt) {
      if (!this.track) return;
      let seg = null;
      let segPerSec = 0;
      if (this.state === 'MENU' || this.state === 'MODE_SELECT' || this.state === 'TRACK_SELECT' || this.state === 'CAR_SELECT' || this.state === 'COLOR_SELECT' || this.state === 'RACE_SETUP') {
        seg = this.findSegment(this.menuCameraZ);
        segPerSec = (this.state === 'MENU' ? 1100 : 850) / SEGMENT_LENGTH;
      } else if (this.player && (this.state === 'RACING' || this.state === 'COUNTDOWN')) {
        seg = this.findSegment(this.player.z);
        segPerSec = this.player.speed * 20 / SEGMENT_LENGTH;
      }
      if (seg) this.skyScroll += seg.curve * segPerSec * dt * SKY_PARALLAX_K;
    }

    renderSky(ctx, def) {
      if (!this.envCur) this.updateEnv(0.016);
      const E = this.envCur;
      if (!E) return;
      const css = E.css;
      const S = E.s;
      const isAttract = (this.state === 'MENU' || this.state === 'MODE_SELECT' || this.state === 'TRACK_SELECT' || this.state === 'CAR_SELECT' || this.state === 'COLOR_SELECT' || this.state === 'RACE_SETUP');
      const camZ = isAttract ? this.menuCameraZ : (this.player ? this.wrapZ(this.player.z - PLAYER_Z_OFFSET) : 0);
      const baseSeg = this.findSegment(camZ);
      const curveShift = baseSeg.curve * 2.0;
      const horizonY = INTERNAL_HEIGHT / 2;
      const scroll = this.skyScroll;

      // Se a câmera estiver dentro do túnel, preenche o céu com a abóbada de rocha escura
      // evitando qualquer vazamento ou corte do céu externo no teto!
      if (baseSeg && !!baseSeg.tunnel) {
        const isStone = (baseSeg.tunnel === 'stone') || (def && def.theme === 'SERRA');
        const darkGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
        darkGrad.addColorStop(0, isStone ? '#0D0907' : '#04070D');
        darkGrad.addColorStop(1, isStone ? '#1A1410' : '#0B111A');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(-20, -20, INTERNAL_WIDTH + 40, horizonY + 20);
        return;
      }

      if (def && def.id === 'serra') {
        this.renderSkySerra(ctx, def, scroll, curveShift, horizonY, E, S);
      } else if (def && def.id === 'noite') {
        this.renderSkyNoite(ctx, def, scroll, curveShift, horizonY, E, S);
      } else {
        this.renderSkyBrasil(ctx, def, scroll, curveShift, horizonY, E, S);
      }
    }

    // =========================================================================
    // PISTA 1: BRASIL GP — ORLA COSTEIRA AO PÔR DO SOL (ESTILO EXATO DA IMAGEM!)
    // Céu crepúsculo 4 cores, estrelas, ponte pênsil iluminada, metrópole na baía com reflexos na água e montanhas roxas
    // =========================================================================
    renderSkyBrasil(ctx, def, scroll, curveShift, horizonY, E, S) {
      const nowSec = performance.now() * 0.003;
      const isNight = S.night > 0.28;
      const isDusk = S.dusk > 0.25;

      // 1. Céu dinâmico conforme E.css e E.s
      const grad = ctx.createLinearGradient(0, -20, 0, horizonY);
      grad.addColorStop(0, E.css.skyTop);
      grad.addColorStop(0.45, E.css.skyMid);
      grad.addColorStop(1.0, E.css.skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(-20, -20, INTERNAL_WIDTH + 40, horizonY + 20);

      if (isNight) {
        // Microestrelas cintilantes no céu noturno
        for (let s = 8; s < INTERNAL_WIDTH; s += 22) {
          const sx = (s * 19) % INTERNAL_WIDTH;
          const sy = (s * 11) % Math.floor(horizonY * 0.38);
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(nowSec + s));
          ctx.fillStyle = `rgba(240, 248, 255, ${tw.toFixed(2)})`;
          ctx.fillRect(sx, sy, (s % 3 === 0 ? 1.5 : 1), (s % 3 === 0 ? 1.5 : 1));
        }

        // Lua prateada
        const moonX = INTERNAL_WIDTH * 0.80 - curveShift * 0.3;
        const moonY = 24;
        const mGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 28);
        mGlow.addColorStop(0, 'rgba(215, 238, 255, 0.45)');
        mGlow.addColorStop(1, 'rgba(180, 220, 255, 0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 11, 0, Math.PI * 2);
        ctx.fill();
      } else if (S.sun > 0.1) {
        // Sol diurno ou crepuscular sobre a orla
        const sunX = INTERNAL_WIDTH * 0.72 - curveShift * 0.35;
        const sunY = S.sunY || (isDusk ? horizonY - 14 : 26);
        const sSize = S.sunSize || 1.0;
        const sGlow = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 38 * sSize);
        sGlow.addColorStop(0, E.css.sunCore || '#FFFDE7');
        sGlow.addColorStop(0.4, E.css.sunGlow || '#FFEE58');
        sGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 38 * sSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 11 * sSize, 0, Math.PI * 2);
        ctx.fill();

        // Nuvens suaves
        ctx.fillStyle = isDusk ? 'rgba(255, 170, 80, 0.30)' : 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(sunX - 45, sunY - 4, 34, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(sunX - 35, sunY - 8, 22, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(sunX + 50, sunY + 6, 42, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(sunX + 60, sunY + 3, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================================
      // CAMADA 1 (PARALLAX DISTANTE - FATOR 0.16): PONTE PÊNSIL, METRÓPOLE & BAÍA
      // =========================================================================
      const PW = 640;
      const farShift = ((scroll * 0.16 + curveShift * 0.3) % PW + PW) % PW;

      ctx.save();
      for (let tile = -1; tile <= 1; tile++) {
        const bx = tile * PW - farShift;
        if (bx + PW < -40 || bx > INTERNAL_WIDTH + 40) continue;

        // --- A. PONTE PÊNSIL (à esquerda da baía, bx + 30 até bx + 225) ---
        const bBridgeStart = bx + 30;
        const bBridgeEnd = bx + 225;
        const t1X = bx + 85;
        const t2X = bx + 170;
        const towerTopY = horizonY - 54;
        const deckY = horizonY - 18;

        // Duas torres de suspensão com treliças
        const drawTower = (tx) => {
          ctx.fillStyle = isNight ? '#2A1820' : (isDusk ? '#6E1C27' : '#D32F2F');
          ctx.fillRect(tx - 3, towerTopY, 6, deckY - towerTopY + 4);
          ctx.fillStyle = isNight ? '#44222E' : (isDusk ? '#8B2635' : '#EF5350');
          ctx.fillRect(tx - 1.5, towerTopY, 3, deckY - towerTopY + 4);
          // Travessas horizontais da torre
          ctx.fillStyle = isNight ? '#1A0E14' : (isDusk ? '#4A121A' : '#B71C1C');
          ctx.fillRect(tx - 4, towerTopY + 12, 8, 2);
          ctx.fillRect(tx - 4, towerTopY + 24, 8, 2);
          ctx.fillRect(tx - 4, towerTopY + 34, 8, 2);
          // Luz de topo
          ctx.fillStyle = isNight ? '#FFE082' : (isDusk ? '#FFE082' : '#FFF9C4');
          ctx.fillRect(tx - 1, towerTopY - 2, 2, 2);
        };
        drawTower(t1X);
        drawTower(t2X);

        // Cabo mestre de sustentação (catenária)
        ctx.strokeStyle = isNight ? '#351820' : (isDusk ? '#5A1822' : '#B71C1C');
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bBridgeStart, deckY);
        ctx.lineTo(t1X, towerTopY);
        ctx.quadraticCurveTo((t1X + t2X) * 0.5, deckY - 6, t2X, towerTopY);
        ctx.lineTo(bBridgeEnd, deckY);
        ctx.stroke();

        // Tirantes verticais
        ctx.strokeStyle = isNight ? 'rgba(230, 180, 170, 0.25)' : (isDusk ? 'rgba(230, 180, 170, 0.45)' : 'rgba(255, 255, 255, 0.65)');
        ctx.lineWidth = 0.8;
        for (let hx = bBridgeStart + 6; hx < bBridgeEnd; hx += 7) {
          let topWireY = deckY;
          if (hx < t1X) {
            topWireY = deckY + (towerTopY - deckY) * ((hx - bBridgeStart) / (t1X - bBridgeStart));
          } else if (hx < t2X) {
            const f = (hx - t1X) / (t2X - t1X);
            topWireY = towerTopY + (deckY - 6 - towerTopY) * 4 * f * (1 - f);
          } else {
            topWireY = towerTopY + (deckY - towerTopY) * ((hx - t2X) / (bBridgeEnd - t2X));
          }
          ctx.beginPath();
          ctx.moveTo(hx, topWireY);
          ctx.lineTo(hx, deckY);
          ctx.stroke();
        }

        // Tabuleiro da ponte e tráfego iluminado
        ctx.fillStyle = isNight ? '#161324' : (isDusk ? '#3A141A' : '#37474F');
        ctx.fillRect(bBridgeStart - 5, deckY, (bBridgeEnd - bBridgeStart) + 10, 3);
        ctx.fillStyle = isNight ? '#FFE082' : (isDusk ? '#FFD166' : '#ECEFF1');
        for (let tx = bBridgeStart; tx < bBridgeEnd; tx += 9) {
          ctx.fillRect(tx, deckY + 0.5, 2, 1);
        }

        // --- B. METRÓPOLE DE ARRANHA-CÉUS (bx + 210 até bx + 630) ---
        const bldgs = [
          { x: 215, w: 16, h: 42, style: 'spire' },
          { x: 233, w: 14, h: 32, style: 'flat' },
          { x: 249, w: 22, h: 56, style: 'stepped' },
          { x: 273, w: 18, h: 38, style: 'flat' },
          { x: 293, w: 15, h: 48, style: 'spire' },
          { x: 310, w: 20, h: 62, style: 'sloped' },
          { x: 332, w: 17, h: 36, style: 'flat' },
          { x: 351, w: 26, h: 68, style: 'spire' }, // Edifício mais alto estilo Willis / Empire
          { x: 379, w: 19, h: 44, style: 'stepped' },
          { x: 400, w: 16, h: 52, style: 'flat' },
          { x: 418, w: 24, h: 64, style: 'spire' },
          { x: 444, w: 17, h: 40, style: 'sloped' },
          { x: 463, w: 22, h: 58, style: 'stepped' },
          { x: 487, w: 18, h: 46, style: 'flat' },
          { x: 507, w: 15, h: 38, style: 'spire' },
          { x: 524, w: 24, h: 60, style: 'sloped' },
          { x: 550, w: 18, h: 48, style: 'stepped' },
          { x: 570, w: 22, h: 54, style: 'spire' },
          { x: 594, w: 16, h: 36, style: 'flat' },
          { x: 612, w: 18, h: 42, style: 'flat' }
        ];

        for (let b = 0; b < bldgs.length; b++) {
          const bd = bldgs[b];
          const bX = bx + bd.x;
          const bY = horizonY - 12 - bd.h;
          const bW = bd.w;
          const bH = bd.h;

          // Silhueta do prédio adaptativa
          if (isNight) {
            ctx.fillStyle = (b % 2 === 0) ? '#1E1A38' : '#2A234A';
          } else if (isDusk) {
            ctx.fillStyle = (b % 2 === 0) ? '#2B1E32' : '#3E2A48';
          } else {
            ctx.fillStyle = (b % 2 === 0) ? '#2B3D52' : '#394E66';
          }
          ctx.fillRect(bX, bY, bW, bH);
          ctx.fillStyle = isNight ? '#15122B' : (isDusk ? '#1D1424' : '#1F2C3B');
          ctx.fillRect(bX + bW - 2, bY, 2, bH);

          // Topos estilizados
          if (bd.style === 'spire') {
            ctx.fillStyle = isNight ? '#15122B' : '#1F2C3B';
            ctx.fillRect(bX + bW * 0.5 - 1, bY - 10, 2, 10);
            const beaconLit = (Math.sin(nowSec * 7 + b) > 0);
            ctx.fillStyle = beaconLit ? '#FF1744' : '#5A1122';
            ctx.fillRect(bX + bW * 0.5 - 1, bY - 11, 2, 2);
          } else if (bd.style === 'stepped') {
            ctx.fillStyle = isNight ? '#2A234A' : '#394E66';
            ctx.fillRect(bX + 3, bY - 4, bW - 6, 4);
          } else if (bd.style === 'sloped') {
            ctx.fillStyle = isNight ? '#2A234A' : '#394E66';
            ctx.beginPath();
            ctx.moveTo(bX, bY);
            ctx.lineTo(bX + bW, bY - 5);
            ctx.lineTo(bX + bW, bY);
            ctx.closePath();
            ctx.fill();
          }

          // Janelas iluminadas (amarelo quente, âmbar e ciano) ou reflexos diurnos
          for (let wy = bY + 4; wy < horizonY - 16; wy += 4) {
            for (let wx = bX + 2; wx < bX + bW - 3; wx += 4) {
              const seed = (wx * 13 + wy * 17 + b * 23);
              if (seed % 3 !== 0) {
                if (isNight || isDusk) {
                  const isCyan = (seed % 7 === 0);
                  const isAmber = (seed % 5 === 0);
                  ctx.fillStyle = isCyan ? '#80DEEA' : (isAmber ? '#FFB74D' : '#FFE082');
                } else {
                  ctx.fillStyle = (seed % 4 === 0) ? '#B2EBF2' : '#E0F7FA';
                }
                ctx.fillRect(wx, wy, 2, 2);
              }
            }
          }
        }

        // --- C. ÁGUA DA BAÍA COM REFLEXOS CINTILANTES (horizonY - 12 até horizonY) ---
        ctx.fillStyle = isNight ? '#0C1322' : (isDusk ? '#241F44' : '#1976D2');
        ctx.fillRect(bx, horizonY - 12, PW, 12);

        // Ondas de reflexo
        for (let rx = bx + 20; rx < bx + PW - 10; rx += 7) {
          const wavePhase = Math.sin(nowSec * 4 + rx * 0.12);
          const rw = 5 + Math.abs(wavePhase) * 4;
          const ry = horizonY - 10 + ((rx * 7) % 9);
          if (isNight) {
            ctx.fillStyle = '#38BDF8';
          } else if (isDusk) {
            ctx.fillStyle = (rx % 2 === 0) ? '#E77A42' : '#F4A258';
          } else {
            ctx.fillStyle = (rx % 2 === 0) ? '#64B5F6' : '#90CAF9';
          }
          ctx.fillRect(rx + wavePhase * 1.5, ry, rw, 1);
        }
      }
      ctx.restore();

      // =========================================================================
      // CAMADA 2 (PARALLAX MÉDIO - FATOR 0.38): CORDILHEIRA DE MONTANHAS
      // =========================================================================
      const midShift = ((scroll * 0.38 + curveShift * 0.6) % 640 + 640) % 640;
      ctx.fillStyle = isNight ? '#0B101E' : (isDusk ? '#1C1635' : '#1B5E20');
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -40; x <= INTERNAL_WIDTH + 40; x += 14) {
        const mx = x + midShift;
        const peak = Math.sin(mx * 0.016) * 18 + Math.cos(mx * 0.038) * 8 + 12;
        ctx.lineTo(x, horizonY - peak);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();

      // Encostas frontais sombreadas
      ctx.fillStyle = isNight ? '#11182B' : (isDusk ? '#2A2046' : '#2E7D32');
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -40; x <= INTERNAL_WIDTH + 40; x += 14) {
        const mx = x + midShift;
        const peak = Math.sin(mx * 0.016 + 1.2) * 12 + 8;
        ctx.lineTo(x, horizonY - peak);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();

      // =========================================================================
      // CAMADA 3 (PARALLAX PRÓXIMO - FATOR 0.68): LINHA DE PALMEIRAS E VEGETAÇÃO
      // =========================================================================
      const nearShift = ((scroll * 0.68 + curveShift * 0.9) % 480 + 480) % 480;
      ctx.fillStyle = isNight ? '#060A14' : (isDusk ? '#0C1613' : '#0D3315');
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -30; x <= INTERNAL_WIDTH + 30; x += 8) {
        const nx = x + nearShift;
        const bump = Math.cos(nx * 0.045) * 5 + Math.sin(nx * 0.12) * 3 + 6;
        ctx.lineTo(x, horizonY - bump);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();
    }

    // =========================================================================
    // PISTA 2: SERRA BRASILEIRA — PICOS ALPINOS E FLORESTA DE ARAUCÁRIAS
    // Adaptável ao clima: dia azul, pôr do sol dourado ou noite estrelada
    // =========================================================================
    renderSkySerra(ctx, def, scroll, curveShift, horizonY, E, S) {
      const nowSec = performance.now() * 0.003;
      const isNight = S.night > 0.28;
      const isDusk = S.dusk > 0.25;

      // 1. Céu dinâmico conforme E.css e E.s
      const grad = ctx.createLinearGradient(0, -20, 0, horizonY);
      grad.addColorStop(0, E.css.skyTop);
      grad.addColorStop(0.45, E.css.skyMid);
      grad.addColorStop(1.0, E.css.skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(-20, -20, INTERNAL_WIDTH + 40, horizonY + 20);

      // Sol ou Lua conforme clima/horário
      if (isNight) {
        // Microestrelas cintilantes no céu límpido de serra
        for (let s = 10; s < INTERNAL_WIDTH; s += 24) {
          const sx = (s * 17) % INTERNAL_WIDTH;
          const sy = (s * 9) % Math.floor(horizonY * 0.40);
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(nowSec + s));
          ctx.fillStyle = `rgba(240, 248, 255, ${tw.toFixed(2)})`;
          ctx.fillRect(sx, sy, 1.2, 1.2);
        }
        // Lua cheia de serra com halo prateado
        const moonX = INTERNAL_WIDTH * 0.74 - curveShift * 0.3;
        const moonY = 24;
        const mGlow = ctx.createRadialGradient(moonX, moonY, 3, moonX, moonY, 32);
        mGlow.addColorStop(0, 'rgba(215, 238, 255, 0.45)');
        mGlow.addColorStop(1, 'rgba(180, 220, 255, 0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.arc(moonX - 3.5, moonY - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(moonX + 3.0, moonY + 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (S.sun > 0.1) {
        // Sol diurno ou poente
        const sunX = INTERNAL_WIDTH * 0.72 - curveShift * 0.35;
        const sunY = S.sunY || (isDusk ? horizonY - 14 : 26);
        const sSize = S.sunSize || 1.0;
        const sGlow = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 44 * sSize);
        sGlow.addColorStop(0, E.css.sunCore || 'rgba(255, 246, 208, 0.95)');
        sGlow.addColorStop(0.35, E.css.sunGlow || 'rgba(255, 123, 37, 0.40)');
        sGlow.addColorStop(1, 'rgba(255, 80, 20, 0)');
        ctx.fillStyle = sGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 44 * sSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isDusk ? '#FFF8E1' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 13 * sSize, 0, Math.PI * 2);
        ctx.fill();

        // Nuvens horizontais de serra
        ctx.fillStyle = isDusk ? 'rgba(255, 170, 80, 0.32)' : 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(sunX - 35, sunY + 4, 42, 4.5, 0, 0, Math.PI * 2);
        ctx.ellipse(sunX + 32, sunY - 2, 46, 4.0, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Paletas das montanhas conforme clima/horário
      const farPeakCol = isNight ? '#161324' : (isDusk ? '#38131E' : '#2A4B58');
      const ridgeCol   = isNight ? '#251E36' : (isDusk ? '#7D2E42' : '#467182');
      const slopeCol   = isNight ? '#121C18' : (isDusk ? '#251A24' : '#1D5A3A');
      const pineCol    = isNight ? '#0A120E' : (isDusk ? '#121C16' : '#133D24');

      // Camada 1: Picos escarpados e agulhas de pedra (Parallax Lento 0.16)
      const farShift = ((scroll * 0.16 + curveShift * 0.3) % 640 + 640) % 640;
      ctx.fillStyle = farPeakCol;
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -40; x <= INTERNAL_WIDTH + 40; x += 16) {
        const fx = x + farShift;
        const peak = Math.abs(Math.sin(fx * 0.018)) * 34 + Math.sin(fx * 0.045) * 12 + 14;
        ctx.lineTo(x, horizonY - peak);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();

      // Cristas rochosas iluminadas
      ctx.fillStyle = ridgeCol;
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -40; x <= INTERNAL_WIDTH + 40; x += 16) {
        const fx = x + farShift;
        const peak = Math.abs(Math.sin(fx * 0.018 + 0.3)) * 22 + 10;
        ctx.lineTo(x, horizonY - peak);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();

      // Camada 2: Encostas florestadas de pinhais (Parallax Médio 0.40)
      const midShift = ((scroll * 0.40 + curveShift * 0.6) % 540 + 540) % 540;
      ctx.fillStyle = slopeCol;
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -30; x <= INTERNAL_WIDTH + 30; x += 12) {
        const mx = x + midShift;
        const ridge = Math.cos(mx * 0.032) * 14 + 11;
        ctx.lineTo(x, horizonY - ridge);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();

      // Camada 3: Silhuetas de Araucárias e Pinheiros no horizonte (Parallax Próximo 0.70)
      const nearShift = ((scroll * 0.70 + curveShift * 0.9) % 480 + 480) % 480;
      ctx.fillStyle = pineCol;
      ctx.beginPath();
      ctx.moveTo(-20, horizonY);
      for (let x = -20; x <= INTERNAL_WIDTH + 20; x += 6) {
        const nx = x + nearShift;
        const isAraucaria = (Math.floor(nx / 16) % 3 === 0);
        const h = isAraucaria ? (12 + (nx % 5)) : (6 + (nx % 3));
        ctx.lineTo(x, horizonY - h);
      }
      ctx.lineTo(INTERNAL_WIDTH + 20, horizonY);
      ctx.closePath();
      ctx.fill();
    }

    // =========================================================================
    // PISTA 3: CIDADE METRÓPOLE — ARRANHA-CÉUS MODERNOS E VIADUTOS EXPRESSOS
    // Totalmente adaptável ao clima: dia ensolarado, crepúsculo ou noite iluminada
    // =========================================================================
    renderSkyNoite(ctx, def, scroll, curveShift, horizonY, E, S) {
      const nowSec = performance.now() * 0.003;
      const isNight = S.night > 0.28;
      const isDusk = S.dusk > 0.25;

      // 1. Céu dinâmico conforme E.css e E.s
      const grad = ctx.createLinearGradient(0, -20, 0, horizonY);
      grad.addColorStop(0, E.css.skyTop);
      grad.addColorStop(0.45, E.css.skyMid);
      grad.addColorStop(1.0, E.css.skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(-20, -20, INTERNAL_WIDTH + 40, horizonY + 20);

      // Elementos celestes: Sol ou Lua
      if (isNight) {
        // Céu estrelado
        for (let s = 10; s < INTERNAL_WIDTH; s += 20) {
          const sx = (s * 17) % INTERNAL_WIDTH;
          const sy = (s * 9) % Math.floor(horizonY * 0.42);
          const tw = 0.45 + 0.55 * Math.abs(Math.sin(nowSec * 1.5 + s));
          ctx.fillStyle = `rgba(220, 240, 255, ${tw.toFixed(2)})`;
          ctx.fillRect(sx, sy, 1.2, 1.2);
        }

        // Lua prateada com halo
        const moonX = INTERNAL_WIDTH * 0.82 - curveShift * 0.3;
        const moonY = 24;
        const mGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 32);
        mGlow.addColorStop(0, 'rgba(215, 238, 255, 0.45)');
        mGlow.addColorStop(1, 'rgba(180, 220, 255, 0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.arc(moonX - 3.5, moonY - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(moonX + 3.0, moonY + 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (S.sun > 0.1) {
        // Sol de metrópole e nuvens
        const sunX = INTERNAL_WIDTH * 0.75 - curveShift * 0.32;
        const sunY = S.sunY || (isDusk ? horizonY - 14 : 26);
        const sSize = S.sunSize || 1.0;
        const sGlow = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 42 * sSize);
        sGlow.addColorStop(0, E.css.sunCore || '#FFFDE7');
        sGlow.addColorStop(0.4, E.css.sunGlow || '#FFEE58');
        sGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 42 * sSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 12 * sSize, 0, Math.PI * 2);
        ctx.fill();

        // Nuvens urbanas suaves
        ctx.fillStyle = isDusk ? 'rgba(255, 170, 80, 0.30)' : 'rgba(255, 255, 255, 0.48)';
        ctx.beginPath();
        ctx.ellipse(sunX - 42, sunY - 4, 36, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(sunX - 32, sunY - 8, 22, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(sunX + 48, sunY + 5, 40, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Megalópole com arranha-céus e viaduto expresso
      // Parallax Lento 0.16
      const PW = 640;
      const farShift = ((scroll * 0.16 + curveShift * 0.3) % PW + PW) % PW;

      ctx.save();
      for (let tile = -1; tile <= 1; tile++) {
        const bx = tile * PW - farShift;
        if (bx + PW < -40 || bx > INTERNAL_WIDTH + 40) continue;

        // Fileira de 26 arranha-céus futuristas
        for (let b = 0; b < 26; b++) {
          const bX = bx + b * 24;
          const seed = (b * 19) % 31;
          const bH = 36 + seed * 1.5;
          const bY = horizonY - bH;

          // Cores dos edifícios conforme dia/noite
          if (isNight) {
            ctx.fillStyle = (b % 2 === 0) ? '#0D1424' : '#141D34';
          } else if (isDusk) {
            ctx.fillStyle = (b % 2 === 0) ? '#2B1A28' : '#3E2436';
          } else {
            ctx.fillStyle = (b % 2 === 0) ? '#243B53' : '#334E68';
          }
          ctx.fillRect(bX, bY, 22, bH);

          // Sombra lateral/perspectiva
          ctx.fillStyle = isNight ? '#080C16' : (isDusk ? '#1A0F18' : '#102A43');
          ctx.fillRect(bX + 20, bY, 2, bH);

          // Faixas verticais decorativas / neon
          if (isNight) {
            if (b % 4 === 0) {
              ctx.fillStyle = '#FF007F';
              ctx.fillRect(bX + 2, bY + 2, 2, bH - 6);
            } else if (b % 4 === 2) {
              ctx.fillStyle = '#00F0FF';
              ctx.fillRect(bX + 18, bY + 2, 2, bH - 6);
            }
          } else if (!isNight && !isDusk) {
            // Vidros reflexivos diurnos
            if (b % 3 === 0) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
              ctx.fillRect(bX + 2, bY + 2, 3, bH - 4);
            }
          }

          // Janelas iluminadas (noturnas ou reflexivas diurnas)
          for (let wy = bY + 4; wy < horizonY - 10; wy += 4) {
            for (let wx = bX + 5; wx < bX + 18; wx += 4) {
              if ((wx * 11 + wy * 13 + b) % 3 !== 0) {
                if (isNight) {
                  ctx.fillStyle = (b % 3 === 0) ? '#00E5FF' : '#FFE082';
                } else if (isDusk) {
                  ctx.fillStyle = (b % 3 === 0) ? '#FF9E80' : '#FFE082';
                } else {
                  // Dia: reflexo suave das janelas de vidro
                  ctx.fillStyle = (b % 2 === 0) ? '#9FB3C8' : '#D9E2EC';
                }
                ctx.fillRect(wx, wy, 2, 2);
              }
            }
          }

          // Antena com sinalizador de topo
          if (b % 3 === 1) {
            ctx.fillStyle = isNight ? '#080C16' : '#627D98';
            ctx.fillRect(bX + 10, bY - 8, 2, 8);
            ctx.fillStyle = (Math.sin(nowSec * 8 + b) > 0) ? '#FF1744' : (isNight ? '#4A0D15' : '#D32F2F');
            ctx.fillRect(bX + 10, bY - 9, 2, 2);
          }
        }

        // Viaduto expresso no rodapé dos edifícios (conectado suavemente ao horizonte)
        const vY = horizonY - 8;
        ctx.fillStyle = isNight ? '#0B1120' : (isDusk ? '#201625' : '#1F2937');
        ctx.fillRect(bx, vY, PW, 8);
        ctx.fillStyle = isNight ? '#1E293B' : (isDusk ? '#3D2F44' : '#4B5563');
        ctx.fillRect(bx, vY, PW, 1.5); // Guarda-corpo superior

        // Fluxo contínuo de tráfego veicular sobre o viaduto
        for (let tx = bx; tx < bx + PW; tx += 14) {
          if (isNight || isDusk) {
            ctx.fillStyle = '#FF2D55'; // Lanternas vermelhas
            ctx.fillRect(tx, vY + 3, 3, 1.5);
            ctx.fillStyle = '#FFF9D2'; // Faróis brancos/dourados no fluxo oposto
            ctx.fillRect(tx + 7, vY + 3, 3, 1.5);
          } else {
            // Dia: pequenos carros em movimento no viaduto
            ctx.fillStyle = (tx % 3 === 0) ? '#DC2626' : ((tx % 3 === 1) ? '#2563EB' : '#F3F4F6');
            ctx.fillRect(tx, vY + 2, 4, 2);
          }
        }
      }
      ctx.restore();
    }

    // Efeitos de clima por cima de toda a cena (antes do HUD): luz, chuva, neve e brilho do sol
    renderWeatherFx(ctx) {
      const E = this.envCur;
      if (!E) return;
      const S = E.s;
      const W = INTERNAL_WIDTH;
      const H = INTERNAL_HEIGHT;
      const t = performance.now() / 1000;
      ctx.save();

      if (S.night > 0.02) {
        ctx.fillStyle = `rgba(6, 10, 40, ${(0.30 * S.night).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (S.dusk > 0.02) {
        ctx.fillStyle = `rgba(255, 110, 30, ${(0.09 * S.dusk).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (S.rain > 0.02) {
        ctx.fillStyle = `rgba(30, 42, 58, ${(0.20 * S.rain).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
        const n = Math.floor(120 * S.rain);
        ctx.strokeStyle = `rgba(205, 225, 245, ${(0.50 * S.rain).toFixed(2)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = ((i * 53.13 + t * 95) % (W + 40)) - 20;
          const y = ((i * 97.37 + t * (430 + (i % 5) * 45)) % (H + 30)) - 15;
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2.6, y + 10.5);
        }
        ctx.stroke();
      }
      if (S.snow > 0.02) {
        ctx.fillStyle = `rgba(235, 242, 255, ${(0.10 * S.snow).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
        const n = Math.floor(95 * S.snow);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        for (let i = 0; i < n; i++) {
          const x = ((i * 61.7 + t * 14 + Math.sin(t * 0.9 + i) * 9) % (W + 20) + (W + 20)) % (W + 20) - 10;
          const y = ((i * 83.3 + t * (32 + (i % 4) * 11)) % (H + 10)) - 5;
          ctx.beginPath();
          ctx.arc(x, y, 0.7 + (i % 3) * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (S.glare > 0.02 && S.sun > 0.1) {
        const gx = W * 0.74;
        const gy = S.sunY;
        const gg = ctx.createRadialGradient(gx, gy, 6, gx, gy, 170);
        gg.addColorStop(0, `rgba(255, 246, 200, ${(0.30 * S.glare * S.sun).toFixed(3)})`);
        gg.addColorStop(1, 'rgba(255, 246, 200, 0)');
        ctx.fillStyle = gg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255, 238, 175, ${(0.05 * S.glare).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }


    renderRoad(ctx, def) {
      const isAttract = (this.state === 'MENU' || this.state === 'MODE_SELECT' || this.state === 'TRACK_SELECT' || this.state === 'CAR_SELECT' || this.state === 'COLOR_SELECT');
      const p = isAttract ? { z: this.menuCameraZ, x: 0 } : (this.player || { z: 1600, x: 0 });
      const playerZ = this.wrapZ(p.z);
      // Quando o nosso carro bandeirou, a câmera PARA exatamente no local da bandeirada:
      const camOriginZ = this.finishingRace
        ? this.finishCamOriginZ
        : (isAttract ? playerZ : this.wrapZ(playerZ - PLAYER_Z_OFFSET));

      const baseSegment = this.findSegment(camOriginZ);
      const basePercent = (camOriginZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;

      const refSeg = this.findSegment(playerZ);
      const refPercent = (playerZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
      const playerWorldY = (1 - refPercent) * refSeg.p1.world.y + refPercent * refSeg.p2.world.y;

      let dx = -(baseSegment.curve * basePercent);
      let x = 0;
      let maxY = INTERNAL_HEIGHT;
      this.foregroundBots = [];

      const totalSegs = this.track.segments.length;
      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = this.track.segments[(baseSegment.index + n) % totalSegs];
        seg.cars = [];
        seg.clipY = INTERNAL_HEIGHT;
      }

      if (!isAttract) {
        for (let i = 0; i < this.cars.length; i++) {
          const car = this.cars[i];
          if (car.isPlayer) continue;

          const carZ = this.wrapZ(car.z);
          const relCamZ = (carZ >= camOriginZ) ? (carZ - camOriginZ) : (this.track.totalLength - camOriginZ + carZ);
          if (relCamZ >= PLAYER_Z_OFFSET - 45 && relCamZ < DRAW_DISTANCE * SEGMENT_LENGTH) {
            const carSeg = this.findSegment(carZ);
            carSeg.cars.push({
              car,
              relCamZ,
              pct: (carZ % SEGMENT_LENGTH) / SEGMENT_LENGTH
            });
          }
        }
      }

      const spd = (!isAttract && this.player) ? this.player.speed : 0;
      const spdFactor = Math.min(1.0, spd / 300);
      // Sensação de velocidade: FOV dinâmico reforçado (comprime perspectiva e faz os elementos passarem voando)
      this.currentCameraDepth = CAMERA_DEPTH * (1.0 - spdFactor * 0.22);
      const camH = CAMERA_HEIGHT * (1.0 - spdFactor * 0.12);

      const cameraX = this.finishingRace ? this.finishCameraX : (p.x * ROAD_WIDTH * 0.65);
      const cameraY = this.finishingRace ? this.finishCameraY : (camH + playerWorldY);
      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const segment = this.track.segments[(baseSegment.index + n) % totalSegs];
        const looped = segment.index < baseSegment.index;
        const cameraZ = camOriginZ - (looped ? this.track.totalLength : 0);

        this.project(segment.p1, cameraX - x, cameraY, cameraZ);
        x += dx;
        dx += segment.curve;
        this.project(segment.p2, cameraX - x, cameraY, cameraZ);

        segment.clipY = maxY;
        if ((segment.p1.camera.z <= CAMERA_DEPTH) || (segment.p2.screen.y >= maxY)) {
          continue;
        }

        this.renderSegment(ctx, segment, maxY);
        maxY = segment.p2.screen.y;
      }

      // Interpolação 3D exata em perspectiva (elimina 100% da oscilação/lag entre segmentos!)
      if (!isAttract && refSeg.p1.camera && refSeg.p2.camera) {
        const pRoad = this.projectInterpolated(refSeg, refPercent);
        const neutralX = (INTERNAL_WIDTH / 2) - (pRoad.w * 0.65 * p.x);
        const rawCurveShift = pRoad.x - neutralX;
        this.smoothCurveScreenX += (rawCurveShift - this.smoothCurveScreenX) * 0.35;
        this.smoothRoadY += (pRoad.y - this.smoothRoadY) * 0.45;
        this.playerRenderPos = {
          x: neutralX + this.smoothCurveScreenX + pRoad.w * p.x,
          y: this.smoothRoadY - 24
        };
      }

      const inTunnel = (refSeg && !!refSeg.tunnel);
      const nightIntensity = inTunnel ? 1.0 : (this.envCur ? (this.envCur.s.night || 0) : 0);
      const isNight = nightIntensity > 0.28;
      for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
        const segment = this.track.segments[(baseSegment.index + n) % totalSegs];
        if (segment.p1.camera.z <= CAMERA_DEPTH) continue;

        if (segment.index === START_LINE_SEG && segment.p1.screen.y <= segment.clipY + 4) {
          this.renderFinishArch(ctx, segment);
        }

        if (segment.tunnelPortal && segment.p1.screen.y <= segment.clipY + 8) {
          this.renderTunnelPortal(ctx, segment, def);
        }

        if (segment.overheadBridge && segment.p1.screen.y <= segment.clipY + 8) {
          this.renderOverheadBridge(ctx, segment, def);
        }

        if (segment.scenery && segment.p1.screen.y <= segment.clipY + 2) {
          if (Array.isArray(segment.scenery)) {
            for (let sc = 0; sc < segment.scenery.length; sc++) {
              this.renderScenery(ctx, segment, segment.scenery[sc], def);
            }
          } else {
            this.renderScenery(ctx, segment, segment.scenery, def);
          }
        }

        if (segment.cars.length > 0) {
          // Ordena de trás para frente (mais distante da câmera primeiro)
          segment.cars.sort((a, b) => b.relCamZ - a.relCamZ);

          for (let c = 0; c < segment.cars.length; c++) {
            const entry = segment.cars[c];
            const bot = entry.car;
            const cRoad = this.projectInterpolated(segment, entry.pct);
            const cRoadX = cRoad.x;
            const cRoadY = cRoad.y;
            const cRoadW = cRoad.w;

            if (cRoadY > segment.clipY + 12) continue;

            // Escala 1:1 rigorosa: quando emparelhado lado a lado com o jogador (durante ultrapassagem em relCamZ == PLAYER_Z_OFFSET),
            // as dimensões do rival são RIGOROSAMENTE IDÊNTICAS às do carro do jogador (PLAYER_CAR_W x PLAYER_CAR_H)!
            const distScale = PLAYER_Z_OFFSET / Math.max(1, entry.relCamZ);
            const carW = PLAYER_CAR_W * distScale;
            const carH = PLAYER_CAR_H * distScale;
            const carX = cRoadX + cRoadW * bot.x;
            const carY = cRoadY - carH * (24 / 68);

            if (carW > 3.5 && carH > 2.5) {
              if (entry.relCamZ < PLAYER_Z_OFFSET) {
                if (Math.abs(bot.x - p.x) > 0.28) {
                  this.foregroundBots.push({ bot, x: carX, y: carY, w: carW, h: carH });
                }
              } else {
                const needClip = cRoadY > segment.clipY;
                if (needClip) {
                  ctx.save();
                  ctx.beginPath();
                  ctx.rect(0, 0, INTERNAL_WIDTH, segment.clipY);
                  ctx.clip();
                }
                if (isNight && carW > 10) {
                  this.renderBotHeadlightBeams(ctx, carX, carY, carW, carH, bot.steerAngle || 0, nightIntensity);
                }
                bot.model.render(
                  ctx,
                  carX,
                  carY,
                  carW,
                  carH,
                  bot.isBraking,
                  bot.steerAngle || 0,
                  bot.bodyColor,
                  {
                    isNitro: !!bot.isNitro,
                    wheelPhase: bot.z * 0.035,
                    isNight,
                    speed: bot.speed
                  }
                );
                if (carW >= 14 && bot.driverCode) {
                  this.renderDriverBadge(ctx, bot.driverCode, carX, carY - carH * 0.44, carW);
                }
                if (needClip) ctx.restore();
              }
            }
          }
        }
      }
    }

    renderFinishArch(ctx, segment) {
      const p1 = segment.p1.screen;
      if (p1.w < 12 || p1.y <= INTERNAL_HEIGHT / 2) return;
      const archH = p1.w * 0.52;
      const postW = Math.max(2, p1.w * 0.07);
      const bannerH = Math.max(4, p1.w * 0.14);
      const leftX = p1.x - p1.w * 1.06;
      const rightX = p1.x + p1.w * 1.06;
      const topY = p1.y - archH;

      ctx.save();
      // Colunas metálicas laterais
      ctx.fillStyle = '#2C3E50';
      ctx.fillRect(leftX - postW, topY, postW, archH);
      ctx.fillRect(rightX, topY, postW, archH);
      ctx.fillStyle = '#95A5A6';
      ctx.fillRect(leftX - postW * 0.7, topY, postW * 0.35, archH);
      ctx.fillRect(rightX + postW * 0.35, topY, postW * 0.35, archH);

      // Pórtico superior
      const spanW = (rightX + postW) - (leftX - postW);
      ctx.fillStyle = '#111622';
      ctx.fillRect(leftX - postW, topY, spanW, bannerH);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = Math.max(1, p1.w * 0.012);
      ctx.strokeRect(leftX - postW, topY, spanW, bannerH);

      // Quadriculado lateral no pórtico
      const chkW = Math.max(2, bannerH * 0.5);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillStyle = ((r + c) % 2 === 0) ? '#FFF' : '#111';
          ctx.fillRect(leftX - postW + 2 + c * chkW, topY + r * (bannerH / 2), chkW, bannerH / 2);
          ctx.fillRect(rightX + postW - 2 - (c + 1) * chkW, topY + r * (bannerH / 2), chkW, bannerH / 2);
        }
      }

      if (p1.w > 34) {
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${Math.max(5, Math.floor(bannerH * 0.62))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('LH44 GRAND PRIX', p1.x, topY + bannerH * 0.73);
      }
      ctx.restore();
    }

    renderTunnelPortal(ctx, segment, def) {
      const p1 = segment.p1.screen;
      if (p1.w < 8) return;
      const isStone = (segment.tunnel === 'stone') || (def && def.theme === 'SERRA');
      const portalH = p1.w * 0.95;
      const postW = Math.max(3.5, p1.w * 0.16);
      // wallDist = 1.38 posiciona os pilares fora da pista e da zebra (zebra termina em 1.17)
      const leftInner = p1.x - p1.w * 1.38;
      const rightInner = p1.x + p1.w * 1.38;
      const leftOuter = leftInner - postW;
      const rightOuter = rightInner + postW;
      const topY = p1.y - portalH;
      const bannerH = Math.max(5.5, p1.w * 0.22);

      ctx.save();
      // Parede de rocha da montanha acima do arco (veda o céu estritamente acima do pórtico, sem invadir a pista)
      const rockCol = isStone ? '#2E221B' : '#0B111E';
      if (topY > 0) {
        ctx.fillStyle = rockCol;
        ctx.fillRect(0, 0, INTERNAL_WIDTH, topY + 2);
      }

      // Pilares laterais do portal
      ctx.fillStyle = isStone ? '#3E2F26' : '#1E293B';
      ctx.fillRect(leftOuter, topY, postW, portalH);
      ctx.fillRect(rightInner, topY, postW, portalH);
      ctx.fillStyle = isStone ? '#5A463B' : '#334155';
      ctx.fillRect(leftOuter + postW * 0.3, topY, postW * 0.35, portalH);
      ctx.fillRect(rightInner + postW * 0.35, topY, postW * 0.35, portalH);

      // Arco superior
      const spanW = rightOuter - leftOuter;
      ctx.fillStyle = isStone ? '#2E221B' : '#0F172A';
      ctx.fillRect(leftOuter, topY, spanW, bannerH);
      ctx.strokeStyle = isStone ? '#8D6E63' : '#00E5FF';
      ctx.lineWidth = Math.max(1, p1.w * 0.015);
      ctx.strokeRect(leftOuter, topY, spanW, bannerH);

      // Placa de identificação no portal
      if (p1.w > 30) {
        ctx.fillStyle = isStone ? '#FFD54F' : '#00E5FF';
        ctx.font = `bold ${Math.max(5.5, Math.floor(bannerH * 0.52))}px monospace`;
        ctx.textAlign = 'center';
        const label = isStone ? '▲ TÚNEL DA SERRA ▲' : '⚡ METRO TUNNEL ⚡';
        ctx.fillText(label, p1.x, topY + bannerH * 0.68);
      }
      ctx.restore();
    }

    renderOverheadBridge(ctx, segment, def) {
      const p1 = segment.p1.screen;
      if (p1.w < 8) return;
      const archH = p1.w * 0.66;
      const postW = Math.max(2.5, p1.w * 0.08);
      const bannerH = Math.max(5, p1.w * 0.18);
      const leftX = p1.x - p1.w * 1.10;
      const rightX = p1.x + p1.w * 1.10;
      const topY = p1.y - archH;

      ctx.save();
      // Estrutura treliçada lateral
      ctx.fillStyle = '#334155';
      ctx.fillRect(leftX - postW, topY, postW, archH);
      ctx.fillRect(rightX, topY, postW, archH);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(leftX - postW * 0.6, topY, postW * 0.3, archH);
      ctx.fillRect(rightX + postW * 0.3, topY, postW * 0.3, archH);

      // Passarela aérea superior
      const spanW = (rightX + postW) - (leftX - postW);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(leftX - postW, topY, spanW, bannerH);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = Math.max(1, p1.w * 0.012);
      ctx.strokeRect(leftX - postW, topY, spanW, bannerH);

      if (p1.w > 26) {
        const isBrasil = (!def || def.id === 'brasil');
        const isNoite = (def && def.id === 'noite');
        ctx.fillStyle = isBrasil ? '#FEDD00' : (isNoite ? '#00E5FF' : '#FFFFFF');
        ctx.font = `bold ${Math.max(5, Math.floor(bannerH * 0.58))}px monospace`;
        ctx.textAlign = 'center';
        const txt = isBrasil ? '★ LH44 BRASIL GP - INTERLAGOS ★' : (isNoite ? 'CYBER CITY GP' : 'SERRA CATARINENSE');
        ctx.fillText(txt, p1.x, topY + bannerH * 0.70);
      }
      ctx.restore();
    }

    renderSegment(ctx, segment, maxY) {
      const p1 = segment.p1.screen;
      const p2 = segment.p2.screen;
      const c = segment.color;

      const bottomY = Math.min(p1.y, maxY);
      if (p2.y >= bottomY) return;

      const r1 = p1.w / 6;
      const r2 = p2.w / 6;

      // Laterais: Túnel 3D, Ponte Suspensa ou Grama Natural
      if (segment.tunnel) {
        const isStone = (segment.tunnel === 'stone');
        const wallDist = 1.38; // Posicionado além da zebra (rumble = 1.17) para nunca cortar a pista
        const wallH1 = p1.w * 0.90;
        const wallH2 = p2.w * 0.90;
        const roofY1 = p1.y - wallH1;
        const roofY2 = p2.y - wallH2;

        const leftEdge1 = p1.x - p1.w - r1;
        const leftEdge2 = p2.x - p2.w - r2;
        const rightEdge1 = p1.x + p1.w + r1;
        const rightEdge2 = p2.x + p2.w + r2;

        const leftWall1 = p1.x - p1.w * wallDist;
        const leftWall2 = p2.x - p2.w * wallDist;
        const rightWall1 = p1.x + p1.w * wallDist;
        const rightWall2 = p2.x + p2.w * wallDist;

        const isLight = Math.floor(segment.index / 3) % 2 === 0;
        const wallBase = isStone ? (isLight ? '#2A201A' : '#1C1512') : (isLight ? '#1A2332' : '#0F1622');
        const wallHighlight = isStone ? '#3D2F27' : '#2C3B54';
        const walkCol = isStone ? (isLight ? '#382B22' : '#271D17') : (isLight ? '#1E293B' : '#131B26');

        // Acostamento/calçada entre a zebra e a parede do túnel
        this.drawPoly(ctx, leftWall1, bottomY, leftEdge1, bottomY, leftEdge2, p2.y, leftWall2, p2.y, walkCol);
        this.drawPoly(ctx, rightEdge1, bottomY, rightWall1, bottomY, rightWall2, p2.y, rightEdge2, p2.y, walkCol);

        // Parede Esquerda e Direita (além do acostamento, estendendo até as bordas da tela)
        this.drawPoly(ctx, 0, bottomY, leftWall1, bottomY, leftWall2, p2.y, 0, p2.y, wallBase);
        this.drawPoly(ctx, rightWall1, bottomY, INTERNAL_WIDTH, bottomY, INTERNAL_WIDTH, p2.y, rightWall2, p2.y, wallBase);

        // Teto do Túnel (Abóbada escura conectando os dois lados)
        const roofColor = isStone ? (isLight ? '#140E0C' : '#0D0907') : (isLight ? '#0D131C' : '#070B11');
        this.drawPoly(ctx, leftWall1, roofY1, rightWall1, roofY1, rightWall2, roofY2, leftWall2, roofY2, roofColor);

        // Preenchimento de rocha escura acima do teto para que o céu exterior nunca vaze
        const rockCap = isStone ? '#140E0C' : '#070B11';
        if (roofY2 > 0) {
          ctx.fillStyle = rockCap;
          ctx.fillRect(0, 0, INTERNAL_WIDTH, roofY2 + 2);
        }

        // Iluminação interna no teto do túnel
        if (isStone) {
          if (segment.index % 6 === 0 && p1.w > 12) {
            const lampW = Math.max(2, p1.w * 0.08);
            ctx.fillStyle = '#FFA726';
            ctx.fillRect(p1.x - lampW * 0.5, roofY1, lampW, Math.max(1.5, wallH1 * 0.06));
            // Brilho dourado no asfalto
            const spotGrad = ctx.createRadialGradient(p1.x, p1.y - 4, 2, p1.x, p1.y - 4, p1.w * 0.5);
            spotGrad.addColorStop(0, 'rgba(255, 183, 77, 0.22)');
            spotGrad.addColorStop(1, 'rgba(255, 183, 77, 0)');
            ctx.fillStyle = spotGrad;
            ctx.beginPath();
            ctx.ellipse(p1.x, p1.y - 4, p1.w * 0.5, Math.max(2, (bottomY - p2.y) * 2), 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Túnel Metro: Tiras contínuas de LED Neon no centro do teto
          const neonW1 = Math.max(1, p1.w * 0.04);
          const neonW2 = Math.max(0.6, p2.w * 0.04);
          const neonCol = (Math.floor(segment.index / 2) % 2 === 0) ? '#00E5FF' : '#FF007F';
          this.drawPoly(ctx, p1.x - neonW1, roofY1, p1.x + neonW1, roofY1, p2.x + neonW2, roofY2, p2.x - neonW2, roofY2, neonCol);
        }
      } else if (segment.bridge) {
        // Laterais da Ponte / Viaduto: Abismo escuro nas laterais (sem colunas invasivas no chão)
        const abyssCol = '#0A0E17';
        this.drawPoly(ctx, 0, bottomY, p1.x - p1.w - r1, bottomY, p2.x - p2.w - r2, p2.y, 0, p2.y, abyssCol);
        this.drawPoly(ctx, p1.x + p1.w + r1, bottomY, INTERNAL_WIDTH, bottomY, INTERNAL_WIDTH, p2.y, p2.x + p2.w + r2, p2.y, abyssCol);
      } else {
        // Grama lateral padrão
        this.drawPoly(ctx, 0, bottomY, p1.x - p1.w - r1, bottomY, p2.x - p2.w - r2, p2.y, 0, p2.y, c.grass);
        this.drawPoly(ctx, p1.x + p1.w + r1, bottomY, INTERNAL_WIDTH, bottomY, INTERNAL_WIDTH, p2.y, p2.x + p2.w + r2, p2.y, c.grass);
      }

      this.drawPoly(ctx, p1.x - p1.w - r1, bottomY, p1.x - p1.w, bottomY, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, c.rumble);
      this.drawPoly(ctx, p1.x + p1.w, bottomY, p1.x + p1.w + r1, bottomY, p2.x + p2.w + r2, p2.y, p2.x + p2.w, p2.y, c.rumble);

      // Guardrails 3D metálicos com faixas alternadas vermelho e branco (estilo Top Gear)
      if (segment.guardrailLeft && p1.w > 7) {
        const gw1 = p1.w * 0.05, gw2 = p2.w * 0.05;
        const gh1 = Math.max(2.5, p1.w * 0.11), gh2 = Math.max(1.2, p2.w * 0.11);
        const gx1 = p1.x - p1.w - r1, gx2 = p2.x - p2.w - r2;
        const railColor = (Math.floor(segment.index / 2) % 2 === 0) ? '#D62828' : '#F0F4F8';
        if (segment.index % 4 === 0) {
          ctx.fillStyle = '#8B0000';
          ctx.fillRect(gx1 - gw1 * 0.5, bottomY - gh1 * 1.15, Math.max(1, gw1 * 0.4), gh1 * 1.15);
        }
        this.drawPoly(ctx, gx1 - gw1, bottomY - gh1, gx1, bottomY - gh1, gx2, p2.y - gh2, gx2 - gw2, p2.y - gh2, railColor);
        this.drawPoly(ctx, gx1 - gw1, bottomY - gh1 * 0.5, gx1, bottomY - gh1 * 0.5, gx2, p2.y - gh2 * 0.5, gx2 - gw2, p2.y - gh2 * 0.5, railColor);
      }
      if (segment.guardrailRight && p1.w > 7) {
        const gw1 = p1.w * 0.05, gw2 = p2.w * 0.05;
        const gh1 = Math.max(2.5, p1.w * 0.11), gh2 = Math.max(1.2, p2.w * 0.11);
        const gx1 = p1.x + p1.w + r1, gx2 = p2.x + p2.w + r2;
        const railColor = (Math.floor(segment.index / 2) % 2 === 0) ? '#D62828' : '#F0F4F8';
        if (segment.index % 4 === 0) {
          ctx.fillStyle = '#8B0000';
          ctx.fillRect(gx1, bottomY - gh1 * 1.15, Math.max(1, gw1 * 0.4), gh1 * 1.15);
        }
        this.drawPoly(ctx, gx1, bottomY - gh1, gx1 + gw1, bottomY - gh1, gx2 + gw2, p2.y - gh2, gx2, p2.y - gh2, railColor);
        this.drawPoly(ctx, gx1, bottomY - gh1 * 0.5, gx1 + gw1, bottomY - gh1 * 0.5, gx2 + gw2, p2.y - gh2 * 0.5, gx2, p2.y - gh2 * 0.5, railColor);
      }

      // Mureta dos Boxes 3D contínua na Reta Principal (estilo Autódromo de Interlagos)
      if (segment.pitWall && p1.w > 6) {
        const wallDist = 1.18; // logo após a zebra amarela e verde
        const wx1 = p1.x + p1.w * wallDist;
        const wx2 = p2.x + p2.w * wallDist;
        const wh1 = Math.max(3.5, p1.w * 0.18);
        const wh2 = Math.max(1.8, p2.w * 0.18);
        const ww1 = Math.max(2.2, p1.w * 0.06);
        const ww2 = Math.max(1.2, p2.w * 0.06);

        // Mureta de concreto
        const isLightWall = Math.floor(segment.index / 3) % 2 === 0;
        const wallBase = isLightWall ? '#475569' : '#334155';
        const wallTop = '#64748B';
        // Face superior e lateral frontal
        this.drawPoly(ctx, wx1, bottomY - wh1, wx1 + ww1, bottomY - wh1, wx2 + ww2, p2.y - wh2, wx2, p2.y - wh2, wallTop);
        this.drawPoly(ctx, wx1, bottomY, wx1, bottomY - wh1, wx2, p2.y - wh2, wx2, p2.y, wallBase);

        // Faixa de advertência amarela/preta no topo da mureta
        this.drawPoly(ctx, wx1, bottomY - wh1 * 0.88, wx1, bottomY - wh1, wx2, p2.y - wh2, wx2, p2.y - wh2 * 0.88, isLightWall ? '#FBBF24' : '#1E293B');

        // Postes de tela de proteção (grade de segurança) e telas de telemetria
        if (segment.index % 4 === 0 && p1.w > 10) {
          const fenceH = wh1 * 1.5;
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = Math.max(1, p1.w * 0.015);
          ctx.beginPath();
          ctx.moveTo(wx1, bottomY - wh1);
          ctx.lineTo(wx1, bottomY - fenceH);
          ctx.stroke();

          // Monitor de telemetria da equipe voltado para a pista
          const scrW = Math.max(3, p1.w * 0.08);
          const scrH = Math.max(2, wh1 * 0.45);
          ctx.fillStyle = '#0284C7';
          ctx.fillRect(wx1, bottomY - wh1 * 0.8, scrW, scrH);
        }
      }

      // Asfalto com trilhas sutis de rolagem 2.5D HD
      this.drawPoly(ctx, p1.x - p1.w, bottomY, p1.x + p1.w, bottomY, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, c.road);
      const grooveCol = 'rgba(0, 0, 0, 0.08)';
      this.drawPoly(ctx, p1.x - p1.w * 0.55, bottomY, p1.x - p1.w * 0.18, bottomY, p2.x - p2.w * 0.18, p2.y, p2.x - p2.w * 0.55, p2.y, grooveCol);
      this.drawPoly(ctx, p1.x + p1.w * 0.18, bottomY, p1.x + p1.w * 0.55, bottomY, p2.x + p2.w * 0.55, p2.y, p2.x + p2.w * 0.18, p2.y, grooveCol);

      // Mancha de iluminação oval no asfalto e zebra gerada pelo poste arqueado (efeito dinâmico idêntico à imagem de referência!)
      if (segment.lampOffset !== null && segment.lampOffset !== undefined && p1.w > 10) {
        const lampSide = segment.lampOffset > 0 ? 1 : -1;
        const spotX = p1.x + p1.w * lampSide * 0.64;
        const spotY = (bottomY + p2.y) * 0.5;
        const rx = p1.w * 0.44;
        const ry = Math.max(2.5, (bottomY - p2.y) * 2.8);
        const glow = ctx.createRadialGradient(spotX, spotY, 2, spotX, spotY, rx);
        glow.addColorStop(0, 'rgba(255, 238, 140, 0.35)');
        glow.addColorStop(0.5, 'rgba(255, 215, 90, 0.18)');
        glow.addColorStop(1, 'rgba(255, 190, 60, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(spotX, spotY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Marcas dinâmicas de pneu no asfalto ao contornar curvas no limite
      if (segment.skidUntil && segment.skidUntil > this.raceTimer) {
        const alpha = Math.min(0.38, (segment.skidUntil - this.raceTimer) * 0.08);
        const sx = segment.skidX || 0;
        const tireOff = 0.095;
        const tw1 = Math.max(0.6, p1.w * 0.022);
        const tw2 = Math.max(0.3, p2.w * 0.022);
        const skidCol = `rgba(12, 14, 18, ${alpha.toFixed(2)})`;
        const lx1 = p1.x + p1.w * (sx - tireOff), lx2 = p2.x + p2.w * (sx - tireOff);
        const rx1 = p1.x + p1.w * (sx + tireOff), rx2 = p2.x + p2.w * (sx + tireOff);
        this.drawPoly(ctx, lx1 - tw1, bottomY, lx1 + tw1, bottomY, lx2 + tw2, p2.y, lx2 - tw2, p2.y, skidCol);
        this.drawPoly(ctx, rx1 - tw1, bottomY, rx1 + tw1, bottomY, rx2 + tw2, p2.y, rx2 - tw2, p2.y, skidCol);
      }

      // Linhas brancas contínuas de acostamento (delimitação nítida da pista)
      const edgeW1 = Math.max(0.8, p1.w / 38);
      const edgeW2 = Math.max(0.4, p2.w / 38);
      const edgeColor = 'rgba(240, 244, 250, 0.65)';
      this.drawPoly(ctx, p1.x - p1.w + edgeW1, bottomY, p1.x - p1.w + edgeW1 * 2.4, bottomY, p2.x - p2.w + edgeW2 * 2.4, p2.y, p2.x - p2.w + edgeW2, p2.y, edgeColor);
      this.drawPoly(ctx, p1.x + p1.w - edgeW1 * 2.4, bottomY, p1.x + p1.w - edgeW1, bottomY, p2.x + p2.w - edgeW2, p2.y, p2.x + p2.w - edgeW2 * 2.4, p2.y, edgeColor);

      // Faixa Quadriculada de Largada / Chegada (à frente do grid F1)
      if (segment.index === START_LINE_SEG || segment.index === START_LINE_SEG + 1) {
        const cols = 10;
        for (let k = 0; k < cols; k++) {
          const tA = -1 + (k * 2) / cols;
          const tB = -1 + ((k + 1) * 2) / cols;
          const sqColor = ((k + segment.index) % 2 === 0) ? '#FFFFFF' : '#151515';
          this.drawPoly(
            ctx,
            p1.x + p1.w * tA, bottomY,
            p1.x + p1.w * tB, bottomY,
            p2.x + p2.w * tB, p2.y,
            p2.x + p2.w * tA, p2.y,
            sqColor
          );
        }
        return;
      }

      // Colchetes brancos de posição no Grid estilo Fórmula 1 ([   ])
      if (segment.gridBox) {
        const cx = segment.gridBox === 'left' ? -GRID_COL_X : GRID_COL_X;
        const halfW = 0.165;
        const lineT = 0.022;
        const segH = bottomY - p2.y;
        const yFrontA = p2.y;
        const yFrontB = p2.y + segH * 0.22;
        const yBack = p2.y + segH * 0.78;
        const xAt = (yVal, normX) => {
          const t = (p1.y === p2.y) ? 0 : (yVal - p2.y) / (p1.y - p2.y);
          const rx = p2.x + (p1.x - p2.x) * t;
          const rw = p2.w + (p1.w - p2.w) * t;
          return rx + rw * normX;
        };
        const boxColor = 'rgba(245, 248, 255, 0.86)';
        // Barra frontal do colchete F1
        this.drawPoly(
          ctx,
          xAt(yFrontB, cx - halfW), yFrontB,
          xAt(yFrontB, cx + halfW), yFrontB,
          xAt(yFrontA, cx + halfW), yFrontA,
          xAt(yFrontA, cx - halfW), yFrontA,
          boxColor
        );
        // Hastes laterais esquerda e direita do colchete F1
        this.drawPoly(
          ctx,
          xAt(yBack, cx - halfW), yBack,
          xAt(yBack, cx - halfW + lineT), yBack,
          xAt(yFrontB, cx - halfW + lineT), yFrontB,
          xAt(yFrontB, cx - halfW), yFrontB,
          boxColor
        );
        this.drawPoly(
          ctx,
          xAt(yBack, cx + halfW - lineT), yBack,
          xAt(yBack, cx + halfW), yBack,
          xAt(yFrontB, cx + halfW), yFrontB,
          xAt(yFrontB, cx + halfW - lineT), yFrontB,
          boxColor
        );
      }

      // Faixa Central Tracejada (omitida na reta limpa do Grid de Fórmula 1)
      const inGridZone = (segment.index >= 7 && segment.index <= START_LINE_SEG + 1);
      if (!inGridZone && c.lane !== 'transparent') {
        const laneW1 = p1.w / 28;
        const laneW2 = p2.w / 28;
        this.drawPoly(ctx, p1.x - laneW1, bottomY, p1.x + laneW1, bottomY, p2.x + laneW2, p2.y, p2.x - laneW2, p2.y, c.lane);
      }
    }

    drawPoly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fill();
    }

    renderScenery(ctx, segment, scenery, def) {
      const scale = segment.p1.screen.scale;
      const sX = segment.p1.screen.x + (scale * scenery.offset * ROAD_WIDTH * REF_WIDTH / 2);
      const sY = segment.p1.screen.y;
      const size = 95 * scale * (REF_WIDTH / 2);

      if (size < 3) return;

      // Estado do clima e iluminação do circuito
      const E = this.envCur;
      const S = E ? E.s : { night: 0, dusk: 0, rain: 0, snow: 0, sun: 1 };
      const isNight = S.night > 0.28;
      const isDusk = S.dusk > 0.25;
      const isSnow = (S.snow || 0) > 0.20;

      ctx.save();
      ctx.translate(sX, sY);

      // Sombra projetada no solo (ajustada para dia/noite)
      ctx.fillStyle = isNight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.34, Math.max(1.2, size * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();

      if (scenery.type === 'timing_tower') {
        // Torre alta de cronometragem de autódromo estilo Interlagos / Suzuka
        const tw = size * 0.60;
        const th = size * 2.2;
        const ty = -th;

        // Estrutura metálica treliçada
        ctx.fillStyle = isNight ? '#0F172A' : '#1E293B';
        ctx.fillRect(-tw * 0.5, ty, tw, th);
        ctx.strokeStyle = isNight ? '#334155' : '#64748B';
        ctx.lineWidth = Math.max(1, size * 0.02);
        ctx.strokeRect(-tw * 0.5, ty, tw, th);

        // Painel digital luminoso preto
        const pw = tw * 0.88;
        const ph = th * 0.88;
        ctx.fillStyle = '#050912';
        ctx.fillRect(-pw * 0.5, ty + th * 0.06, pw, ph);

        // Topo com lâmpadas vermelhas de sinalização (piscando à noite)
        const blink = isNight ? (Math.sin(performance.now() * 0.008) > 0) : true;
        ctx.fillStyle = blink ? '#EF4444' : '#450A0A';
        ctx.fillRect(-tw * 0.4, ty - size * 0.06, tw * 0.8, size * 0.05);

        // Linhas de classificação digital luminosa (LED verde/âmbar)
        if (size >= 12) {
          ctx.fillStyle = isNight ? '#FFEB3B' : '#FFD700';
          ctx.font = `bold ${Math.max(4.5, Math.floor(size * 0.16))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('LEADER', 0, ty + th * 0.15);
          const topDrivers = ['1 HAM', '2 VER', '3 LEC', '4 NOR', '5 ALO'];
          for (let d = 0; d < topDrivers.length; d++) {
            ctx.fillStyle = d === 0 ? (isNight ? '#34D399' : '#10B981') : (isNight ? '#FDE047' : '#FBBF24');
            ctx.font = `bold ${Math.max(4, Math.floor(size * 0.13))}px monospace`;
            ctx.fillText(topDrivers[d], 0, ty + th * (0.28 + d * 0.13));
          }
        }
      } else if (scenery.type === 'pit_wall') {
        // Mureta dos boxes de autódromo com computadores e sinalização
        const pw = size * 0.90;
        const ph = size * 0.45;
        const py = -ph;

        ctx.fillStyle = isNight ? '#1E293B' : '#334155';
        ctx.fillRect(-pw * 0.5, py, pw, ph);
        ctx.fillStyle = isNight ? '#334155' : '#64748B';
        ctx.fillRect(-pw * 0.5, py, pw, ph * 0.18);

        // Monitores de telemetria dos boxes (brilham no escuro)
        if (size >= 16) {
          ctx.fillStyle = isNight ? '#38BDF8' : '#0284C7';
          ctx.fillRect(-pw * 0.38, py + ph * 0.24, pw * 0.32, ph * 0.38);
          ctx.fillStyle = isNight ? '#4ADE80' : '#10B981';
          ctx.fillRect(pw * 0.06, py + ph * 0.24, pw * 0.32, ph * 0.38);
        }
      } else if (scenery.type === 'palm') {
        // Palmeira tropical costeira (estilo autêntico Top Gear com reação de iluminação)
        const toward = scenery.offset < 0 ? 1 : -1;
        const trunkCol = isNight ? '#1F140E' : (isDusk ? '#331B12' : '#3E2419');
        const trunkLight = isNight ? '#2E1E16' : (isDusk ? '#4A2B1D' : '#5E3825');
        ctx.strokeStyle = trunkCol;
        ctx.lineWidth = Math.max(1.8, size * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(toward * size * 0.14, -size * 0.48, toward * size * 0.09, -size * 0.90);
        ctx.stroke();

        ctx.strokeStyle = trunkLight;
        ctx.lineWidth = Math.max(1.0, size * 0.045);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(toward * size * 0.14, -size * 0.48, toward * size * 0.09, -size * 0.90);
        ctx.stroke();

        // Anéis da casca do tronco
        for (let k = 1; k < 6; k++) {
          const frac = k / 6;
          const kx = toward * size * 0.12 * Math.sin(frac * Math.PI);
          const ky = -size * 0.88 * frac;
          ctx.strokeStyle = isNight ? '#140D09' : '#27160F';
          ctx.lineWidth = Math.max(0.8, size * 0.02);
          ctx.beginPath();
          ctx.moveTo(kx - size * 0.035, ky);
          ctx.lineTo(kx + size * 0.035, ky);
          ctx.stroke();
        }

        // Folhas da copa em leque exuberante
        const crownX = toward * size * 0.09;
        const crownY = -size * 0.90;
        const frondCols = isNight 
          ? ['#0A1C12', '#0E291B', '#133925', '#1B4A31']
          : (isDusk 
            ? ['#1C331B', '#274724', '#385C2E', '#4B7337']
            : ['#0F3819', '#1A5929', '#27823E', '#3AB459']);

        for (let f = 0; f < 8; f++) {
          const ang = (f / 7) * Math.PI * 1.1 - 0.15;
          const fx = crownX + Math.cos(ang) * size * 0.44;
          const fy = crownY - Math.sin(ang) * size * 0.28 + Math.abs(Math.cos(ang)) * size * 0.16;
          ctx.strokeStyle = frondCols[f % 4];
          ctx.lineWidth = Math.max(1.2, size * 0.04);
          ctx.beginPath();
          ctx.moveTo(crownX, crownY);
          ctx.quadraticCurveTo((crownX + fx) * 0.5, crownY - size * 0.20, fx, fy);
          ctx.stroke();
        }
      } else if (scenery.type === 'pine' || (scenery.type === 'tree' && def && def.theme === 'SERRA')) {
        // Pinheiro Araucária da Serra Catarinense (adaptável a dia, tarde, noite e neve)
        const trunkCol = isNight ? '#1B110B' : (isDusk ? '#2C1B12' : '#3E2419');
        ctx.fillStyle = trunkCol;
        ctx.fillRect(-size * 0.05, -size * 0.95, size * 0.10, size * 0.95);

        const layers = isNight
          ? [
              { y: -size * 0.94, rx: size * 0.46, ry: size * 0.13, c: '#0A1D13' },
              { y: -size * 0.98, rx: size * 0.36, ry: size * 0.10, c: '#0F281B' },
              { y: -size * 0.80, rx: size * 0.29, ry: size * 0.08, c: '#143624' },
              { y: -size * 0.64, rx: size * 0.23, ry: size * 0.06, c: '#122F20' }
            ]
          : (isDusk
            ? [
                { y: -size * 0.94, rx: size * 0.46, ry: size * 0.13, c: '#1B3322' },
                { y: -size * 0.98, rx: size * 0.36, ry: size * 0.10, c: '#23442D' },
                { y: -size * 0.80, rx: size * 0.29, ry: size * 0.08, c: '#2F5C3E' },
                { y: -size * 0.64, rx: size * 0.23, ry: size * 0.06, c: '#254E33' }
              ]
            : [
                { y: -size * 0.94, rx: size * 0.46, ry: size * 0.13, c: '#143C25' },
                { y: -size * 0.98, rx: size * 0.36, ry: size * 0.10, c: '#1C5233' },
                { y: -size * 0.80, rx: size * 0.29, ry: size * 0.08, c: '#267347' },
                { y: -size * 0.64, rx: size * 0.23, ry: size * 0.06, c: '#1E5E3A' }
              ]);

        for (let l of layers) {
          ctx.fillStyle = l.c;
          ctx.beginPath();
          ctx.ellipse(0, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
          ctx.fill();

          // Acúmulo de neve branca nos patamares da Araucária
          if (isSnow) {
            ctx.fillStyle = isNight ? '#CBD5E1' : '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(0, l.y - l.ry * 0.25, l.rx * 0.76, l.ry * 0.45, 0, Math.PI, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (scenery.type === 'bush') {
        // Arbustos costeiros verdes na beira da pista
        const b1 = isNight ? '#08170D' : (isDusk ? '#162C17' : '#0F3317');
        const b2 = isNight ? '#0F2617' : (isDusk ? '#204221' : '#185025');
        const b3 = isNight ? '#163821' : (isDusk ? '#2D5E32' : '#267A3B');
        ctx.fillStyle = b1;
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.14, size * 0.34, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b2;
        ctx.beginPath();
        ctx.ellipse(-size * 0.12, -size * 0.18, size * 0.22, size * 0.16, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.12, -size * 0.16, size * 0.22, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b3;
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.22, size * 0.20, size * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (scenery.type === 'tree') {
        // Árvore frondosa em camadas com iluminação solar, crepuscular ou noturna
        const trunkCol = isNight ? '#251A16' : (isDusk ? '#3B2723' : '#4E342E');
        ctx.fillStyle = trunkCol;
        ctx.fillRect(-size * 0.075, -size * 0.62, size * 0.15, size * 0.62);

        const c1 = isNight ? '#0B1F14' : (isDusk ? '#193B23' : '#145A32');
        const c2 = isNight ? '#112B1C' : (isDusk ? '#254F30' : '#1E8449');
        const c3 = isNight ? '#183825' : (isDusk ? '#32663E' : '#2ECC71');

        ctx.fillStyle = c1;
        ctx.beginPath();
        ctx.arc(0, -size * 0.66, size * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(-size * 0.14, -size * 0.72, size * 0.26, 0, Math.PI * 2);
        ctx.arc(size * 0.14, -size * 0.70, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c3;
        ctx.beginPath();
        ctx.arc(-size * 0.05, -size * 0.86, size * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Acúmulo de neve no topo da copa
        if (isSnow) {
          ctx.fillStyle = isNight ? '#CBD5E1' : '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(0, -size * 0.96, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
          ctx.ellipse(-size * 0.14, -size * 0.86, size * 0.16, size * 0.06, 0, 0, Math.PI * 2);
          ctx.ellipse(size * 0.14, -size * 0.84, size * 0.16, size * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (scenery.type === 'sign_right' || scenery.type === 'sign_left') {
        // Placas refletivas de sinalização de curva estilo Top Gear
        const postCol = isNight ? '#2A3441' : '#555555';
        ctx.fillStyle = postCol;
        ctx.fillRect(-size * 0.16, -size * 0.45, size * 0.05, size * 0.45);
        ctx.fillRect(size * 0.11, -size * 0.45, size * 0.05, size * 0.45);

        // Moldura externa da placa
        ctx.fillStyle = isNight ? '#080C14' : '#111111';
        ctx.fillRect(-size * 0.29, -size * 0.79, size * 0.58, size * 0.39);

        if (isNight) {
          // À NOITE: ACABAMENTO RETRORREFLETIVO TOP GEAR COM GLOW
          ctx.fillStyle = '#FFD54F';
          ctx.fillRect(-size * 0.26, -size * 0.76, size * 0.52, size * 0.33);

          // Borda fosforescente
          ctx.strokeStyle = '#FFF9C4';
          ctx.lineWidth = Math.max(0.8, size * 0.015);
          ctx.strokeRect(-size * 0.26, -size * 0.76, size * 0.52, size * 0.33);

          // Setas iluminadas em LED de alto brilho com foco na curva
          ctx.save();
          ctx.shadowColor = '#FFEA00';
          ctx.shadowBlur = Math.max(3, size * 0.08);
          ctx.fillStyle = '#111111';
          ctx.font = `900 ${Math.max(6, Math.floor(size * 0.24))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(scenery.type === 'sign_right' ? '▶▶' : '◀◀', 0, -size * 0.51);
          ctx.restore();
        } else if (isDusk) {
          // PÔR DO SOL: Tom âmbar crepuscular
          ctx.fillStyle = '#FFA000';
          ctx.fillRect(-size * 0.26, -size * 0.76, size * 0.52, size * 0.33);
          ctx.fillStyle = '#111111';
          ctx.font = `bold ${Math.max(6, Math.floor(size * 0.24))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(scenery.type === 'sign_right' ? '▶▶' : '◀◀', 0, -size * 0.51);
        } else {
          // DIA: Placa amarela padrão nítida
          ctx.fillStyle = '#FFC107';
          ctx.fillRect(-size * 0.26, -size * 0.76, size * 0.52, size * 0.33);
          ctx.fillStyle = '#111111';
          ctx.font = `bold ${Math.max(6, Math.floor(size * 0.24))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(scenery.type === 'sign_right' ? '▶▶' : '◀◀', 0, -size * 0.51);
        }
      } else if (scenery.type === 'grandstand') {
        // Arquibancada coberta de autódromo com torcida
        ctx.fillStyle = isNight ? '#1E293B' : '#34495E';
        ctx.fillRect(-size * 0.64, -size * 0.68, size * 1.28, size * 0.68);
        ctx.fillStyle = isNight ? '#0F172A' : '#1B2631';
        ctx.fillRect(-size * 0.60, -size * 0.58, size * 1.20, size * 0.48);

        // Fileiras de torcedores
        const rowColors = isNight
          ? ['#991B1B', '#B45309', '#1E40AF', '#166534']
          : ['#E74C3C', '#F1C40F', '#3498DB', '#2ECC71'];
        for (let r = 0; r < 4; r++) {
          ctx.fillStyle = rowColors[r];
          ctx.fillRect(-size * 0.56, -size * (0.52 - r * 0.11), size * 1.12, size * 0.065);
        }

        // Cobertura superior
        ctx.fillStyle = isNight ? '#94A3B8' : '#ECF0F1';
        ctx.fillRect(-size * 0.68, -size * 0.74, size * 1.36, size * 0.09);
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(-size * 0.68, -size * 0.66, size * 1.36, size * 0.035);
      } else if (scenery.type === 'streetlamp') {
        // Poste metálico arqueado com iluminação dinâmica dia/tarde/noite
        const towardRoad = scenery.offset < 0 ? 1 : -1;
        const poleCol = isNight ? '#3A4554' : (isDusk ? '#4B5868' : '#5E6B7A');
        ctx.strokeStyle = poleCol;
        ctx.lineWidth = Math.max(1.2, size * 0.045);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size * 0.72);
        ctx.quadraticCurveTo(0, -size * 0.94, towardRoad * size * 0.26, -size * 0.94);
        ctx.stroke();

        ctx.strokeStyle = isNight ? '#556475' : '#9AAEC4';
        ctx.lineWidth = Math.max(0.8, size * 0.02);
        ctx.beginPath();
        ctx.moveTo(towardRoad * 0.5, 0);
        ctx.lineTo(towardRoad * 0.5, -size * 0.72);
        ctx.quadraticCurveTo(towardRoad * 0.5, -size * 0.92, towardRoad * size * 0.25, -size * 0.92);
        ctx.stroke();

        const lampX = towardRoad * size * 0.26;
        const lampY = -size * 0.94;

        // Carcaça da luminária
        ctx.fillStyle = isNight ? '#1E2530' : '#2D3748';
        ctx.fillRect(lampX - size * 0.05, lampY - size * 0.03, size * 0.10, size * 0.04);

        if (isNight) {
          // NOITE: LÂMPADA ACESA BRILHANTE COM HALO E CONE DE LUZ NO SOLO
          const bulbGlow = ctx.createRadialGradient(lampX, lampY + size * 0.015, 1, lampX, lampY + size * 0.015, Math.max(4, size * 0.16));
          bulbGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          bulbGlow.addColorStop(0.35, 'rgba(255, 245, 157, 0.70)');
          bulbGlow.addColorStop(1, 'rgba(255, 235, 59, 0)');
          ctx.fillStyle = bulbGlow;
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.015, Math.max(4, size * 0.16), 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.015, Math.max(1.8, size * 0.035), 0, Math.PI * 2);
          ctx.fill();

          // Feixe cônico volumétrico descendo sobre a pista
          const coneGrad = ctx.createLinearGradient(lampX, lampY, lampX, 0);
          coneGrad.addColorStop(0, 'rgba(255, 245, 157, 0.48)');
          coneGrad.addColorStop(0.35, 'rgba(255, 235, 110, 0.22)');
          coneGrad.addColorStop(1, 'rgba(255, 215, 64, 0.03)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(lampX - size * 0.04, lampY + size * 0.02);
          ctx.lineTo(lampX + size * 0.04, lampY + size * 0.02);
          ctx.lineTo(lampX + size * 0.42, 0);
          ctx.lineTo(lampX - size * 0.42, 0);
          ctx.closePath();
          ctx.fill();

          // Poça de luz quente no solo
          ctx.fillStyle = 'rgba(255, 235, 110, 0.22)';
          ctx.beginPath();
          ctx.ellipse(lampX, 0, size * 0.38, Math.max(1.5, size * 0.09), 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (isDusk) {
          // TARDE: LÂMPADA ACENDENDO COM TOM ÂMBAR
          const bulbGlow = ctx.createRadialGradient(lampX, lampY + size * 0.015, 1, lampX, lampY + size * 0.015, Math.max(3, size * 0.10));
          bulbGlow.addColorStop(0, 'rgba(255, 224, 130, 0.70)');
          bulbGlow.addColorStop(1, 'rgba(255, 183, 77, 0)');
          ctx.fillStyle = bulbGlow;
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.015, Math.max(3, size * 0.10), 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFE082';
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.015, Math.max(1.5, size * 0.028), 0, Math.PI * 2);
          ctx.fill();

          // Feixe sutil no crepúsculo
          const coneGrad = ctx.createLinearGradient(lampX, lampY, lampX, 0);
          coneGrad.addColorStop(0, 'rgba(255, 193, 7, 0.20)');
          coneGrad.addColorStop(1, 'rgba(255, 160, 0, 0)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(lampX - size * 0.03, lampY + size * 0.02);
          ctx.lineTo(lampX + size * 0.03, lampY + size * 0.02);
          ctx.lineTo(lampX + size * 0.30, 0);
          ctx.lineTo(lampX - size * 0.30, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          // DIA: LÂMPADA TOTALMENTE APAGADA (SEM CONE DE LUZ)
          ctx.fillStyle = '#B0BEC5';
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.015, Math.max(1.2, size * 0.024), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (scenery.type === 'pole') {
        // Poste rústico de fiação elétrica estilo Top Gear clássico
        const towardRoad = scenery.offset < 0 ? 1 : -1;
        const woodCol = isNight ? '#1E1714' : (isDusk ? '#3E2A20' : '#5D4037');
        const woodLight = isNight ? '#2E221D' : (isDusk ? '#53382C' : '#795548');

        // Mastro vertical
        ctx.fillStyle = woodCol;
        ctx.fillRect(-size * 0.035, -size * 0.92, size * 0.07, size * 0.92);
        ctx.fillStyle = woodLight;
        ctx.fillRect(-size * 0.015, -size * 0.92, size * 0.03, size * 0.92);

        // Cruzeta horizontal
        const crossY = -size * 0.86;
        ctx.fillStyle = woodCol;
        ctx.fillRect(-size * 0.24, crossY, size * 0.48, size * 0.05);

        // Isoladores de porcelana
        const isoCol = isNight ? '#94A3B8' : '#F1F5F9';
        ctx.fillStyle = isoCol;
        ctx.fillRect(-size * 0.20, crossY - size * 0.03, size * 0.03, size * 0.03);
        ctx.fillRect(size * 0.17, crossY - size * 0.03, size * 0.03, size * 0.03);
        ctx.fillRect(-size * 0.015, -size * 0.95, size * 0.03, size * 0.03);

        // Fiação elétrica estendida
        ctx.strokeStyle = isNight ? '#0F172A' : '#334155';
        ctx.lineWidth = Math.max(0.6, size * 0.01);
        ctx.beginPath();
        ctx.moveTo(-size * 0.35, crossY - size * 0.01);
        ctx.lineTo(-size * 0.20, crossY - size * 0.02);
        ctx.lineTo(size * 0.17, crossY - size * 0.02);
        ctx.lineTo(size * 0.35, crossY - size * 0.01);
        ctx.stroke();

        // Luminária rural voltada para a pista
        const lampX = towardRoad * size * 0.16;
        const lampY = crossY + size * 0.06;
        ctx.strokeStyle = isNight ? '#475569' : '#64748B';
        ctx.lineWidth = Math.max(0.8, size * 0.018);
        ctx.beginPath();
        ctx.moveTo(0, crossY);
        ctx.lineTo(lampX, lampY);
        ctx.stroke();

        ctx.fillStyle = isNight ? '#1E293B' : '#475569';
        ctx.fillRect(lampX - size * 0.04, lampY, size * 0.08, size * 0.02);

        if (isNight) {
          // Lâmpada de vapor de sódio acesa à noite
          ctx.fillStyle = '#FFE082';
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.02, Math.max(1.5, size * 0.028), 0, Math.PI * 2);
          ctx.fill();

          const rGlow = ctx.createRadialGradient(lampX, lampY + size * 0.02, 1, lampX, lampY + size * 0.02, size * 0.12);
          rGlow.addColorStop(0, 'rgba(255, 235, 59, 0.80)');
          rGlow.addColorStop(1, 'rgba(255, 193, 7, 0)');
          ctx.fillStyle = rGlow;
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.02, size * 0.12, 0, Math.PI * 2);
          ctx.fill();

          // Feixe suave cônico
          const cone = ctx.createLinearGradient(lampX, lampY, lampX, 0);
          cone.addColorStop(0, 'rgba(255, 224, 130, 0.35)');
          cone.addColorStop(1, 'rgba(255, 193, 7, 0.02)');
          ctx.fillStyle = cone;
          ctx.beginPath();
          ctx.moveTo(lampX - size * 0.03, lampY + size * 0.02);
          ctx.lineTo(lampX + size * 0.03, lampY + size * 0.02);
          ctx.lineTo(lampX + size * 0.32, 0);
          ctx.lineTo(lampX - size * 0.32, 0);
          ctx.closePath();
          ctx.fill();
        } else if (isDusk) {
          ctx.fillStyle = '#FFB74D';
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.02, Math.max(1.2, size * 0.02), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Dia: lâmpada desligada
          ctx.fillStyle = '#94A3B8';
          ctx.beginPath();
          ctx.arc(lampX, lampY + size * 0.02, Math.max(1.0, size * 0.018), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (scenery.type === 'building') {
        // Prédio 3D com parede lateral e janelas adaptadas ao horário
        const bGrad = isNight ? '#16202B' : (isDusk ? '#263238' : '#37474F');
        const bSide = isNight ? '#0D131A' : (isDusk ? '#1C252B' : '#263238');
        ctx.fillStyle = bGrad;
        ctx.fillRect(-size * 0.46, -size * 1.18, size * 0.78, size * 1.18);
        ctx.fillStyle = bSide;
        ctx.fillRect(size * 0.32, -size * 1.12, size * 0.16, size * 1.12);

        // Balizamento de topo piscante
        const bBeacon = (Math.sin(performance.now() * 0.006 + segment.index) > 0);
        ctx.fillStyle = bBeacon ? '#FF1744' : (isNight ? '#4A0812' : '#D32F2F');
        ctx.fillRect(-size * 0.08, -size * 1.24, size * 0.04, size * 0.04);

        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 3; c++) {
            const lit = ((segment.index + r * 3 + c) % 4 !== 0);
            if (isNight) {
              ctx.fillStyle = lit ? ((r + c) % 2 === 0 ? '#FFE082' : '#80DEEA') : '#1E293B';
            } else if (isDusk) {
              ctx.fillStyle = lit ? ((r + c) % 2 === 0 ? '#FFD54F' : '#B2EBF2') : '#37474F';
            } else {
              // Dia: reflexo suave dos vidros
              ctx.fillStyle = (r + c) % 2 === 0 ? '#CFD8DC' : '#ECEFF1';
            }
            ctx.fillRect(-size * 0.38 + c * (size * 0.23), -size * 1.06 + r * (size * 0.20), size * 0.13, size * 0.11);
          }
        }
      } else if (scenery.type === 'billboard') {
        // Outdoors retrô com refletores superiores que acendem à noite (estilo Top Gear clássico!)
        const billIdx = Math.abs(segment.index) % 6;
        const bw = size * 0.95;
        const bh = size * 0.48;
        const by = -size * 0.88;

        // Suportes metálicos duplos e travessa
        ctx.fillStyle = isNight ? '#1E2530' : '#2D3748';
        ctx.fillRect(-bw * 0.32, by + bh, Math.max(1, size * 0.05), -by - bh);
        ctx.fillRect(bw * 0.32 - Math.max(1, size * 0.05), by + bh, Math.max(1, size * 0.05), -by - bh);
        ctx.strokeStyle = isNight ? '#334155' : '#4A5568';
        ctx.lineWidth = Math.max(0.8, size * 0.015);
        ctx.beginPath();
        ctx.moveTo(-bw * 0.30, by + bh);
        ctx.lineTo(bw * 0.30, 0);
        ctx.moveTo(bw * 0.30, by + bh);
        ctx.lineTo(-bw * 0.30, 0);
        ctx.stroke();

        ctx.fillStyle = isNight ? '#0A0F1A' : '#111622';
        ctx.fillRect(-bw * 0.5, by, bw, bh);
        ctx.strokeStyle = isNight ? '#475569' : '#E2E8F0';
        ctx.lineWidth = Math.max(0.8, size * 0.015);
        ctx.strokeRect(-bw * 0.5, by, bw, bh);

        const pad = size * 0.025;
        const pw = bw - pad * 2;
        const ph = bh - pad * 2;
        const px = -bw * 0.5 + pad;
        const py = by + pad;

        const isBrasil = (!def || def.id === 'brasil');
        const isSerra = (def && def.id === 'serra');

        if (isBrasil) {
          if (billIdx === 0 || billIdx === 3) {
            // "FICII" com arco-íris retrô
            ctx.fillStyle = isNight ? '#0F1A2E' : '#16233B';
            ctx.fillRect(px, py, pw, ph);
            const rCols = ['#E65100', '#F57C00', '#FFB300', '#00ACC1', '#1E88E5'];
            for (let r = 0; r < rCols.length; r++) {
              ctx.fillStyle = rCols[r];
              ctx.beginPath();
              ctx.moveTo(px, py + ph * 0.45 + r * (ph * 0.10));
              ctx.quadraticCurveTo(px + pw * 0.5, py + ph * 0.35 + r * (ph * 0.10), px + pw * 0.72, py + ph);
              ctx.lineTo(px + pw * 0.62, py + ph);
              ctx.quadraticCurveTo(px + pw * 0.45, py + ph * 0.40 + r * (ph * 0.10), px, py + ph * 0.52 + r * (ph * 0.10));
              ctx.fill();
            }
            if (size >= 24) {
              ctx.fillStyle = isNight ? '#FFFFFF' : '#F8FAFC';
              ctx.font = `900 ${Math.max(6, Math.floor(size * 0.19))}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText('FICII', px + pw * 0.08, py + ph * 0.48);
            }
            ctx.fillStyle = isNight ? '#FFE082' : '#FFD54F';
            ctx.beginPath();
            ctx.arc(px + pw * 0.82, py + ph * 0.55, ph * 0.28, 0, Math.PI * 2);
            ctx.fill();
          } else if (billIdx === 1 || billIdx === 4) {
            // "CHAMPION" vermelho clássico
            ctx.fillStyle = isNight ? '#7F1D1D' : '#B71C1C';
            ctx.fillRect(px, py, pw, ph);
            ctx.fillStyle = '#FFE082';
            ctx.fillRect(px, py + ph * 0.74, pw, ph * 0.14);
            if (size >= 24) {
              ctx.fillStyle = '#FFF';
              ctx.font = `bold ${Math.max(6, Math.floor(size * 0.16))}px monospace`;
              ctx.textAlign = 'center';
              ctx.fillText('CHAMPION', 0, py + ph * 0.54);
            }
          } else {
            // "CART" verde/amarelo
            ctx.fillStyle = isNight ? '#14461B' : '#1B5E20';
            ctx.fillRect(px, py, pw, ph);
            ctx.fillStyle = '#FDD835';
            ctx.fillRect(px + pw * 0.05, py + ph * 0.16, pw * 0.90, ph * 0.10);
            if (size >= 24) {
              ctx.fillStyle = '#FFF';
              ctx.font = `bold ${Math.max(6, Math.floor(size * 0.20))}px monospace`;
              ctx.textAlign = 'center';
              ctx.fillText('CART', 0, py + ph * 0.65);
            }
          }
        } else if (isSerra) {
          if (billIdx % 2 === 0) {
            // "SERRA 4X4" laranja montanha
            ctx.fillStyle = isNight ? '#9A3412' : '#E65100';
            ctx.fillRect(px, py, pw, ph);
            if (size >= 24) {
              ctx.fillStyle = '#FFF';
              ctx.font = `bold ${Math.max(6, Math.floor(size * 0.18))}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText('SERRA 4X4', 0, py + ph * 0.58);
            }
          } else {
            // "ALPINE RALLY" verde escuro
            ctx.fillStyle = isNight ? '#0E2317' : '#1A3826';
            ctx.fillRect(px, py, pw, ph);
            ctx.fillStyle = '#F59E0B';
            ctx.fillRect(px, py + ph * 0.78, pw, ph * 0.12);
            if (size >= 24) {
              ctx.fillStyle = '#FFF';
              ctx.font = `bold ${Math.max(6, Math.floor(size * 0.17))}px monospace`;
              ctx.textAlign = 'center';
              ctx.fillText('RALLY CUP', 0, py + ph * 0.56);
            }
          }
        } else {
          // Metrópole
          ctx.fillStyle = (billIdx % 2 === 0) ? (isNight ? '#17092C' : '#1E1238') : (isNight ? '#07161F' : '#0B1D28');
          ctx.fillRect(px, py, pw, ph);
          if (size >= 24) {
            ctx.fillStyle = (billIdx % 2 === 0) ? '#FF007F' : '#00F0FF';
            ctx.font = `900 ${Math.max(6, Math.floor(size * 0.18))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(billIdx % 2 === 0 ? 'NITRO GP' : 'NEO TURBO', 0, py + ph * 0.58);
          }
        }

        // HASTES DE REFLETORES SUPERIORES (ILUMINAÇÃO DE TOPO)
        const spotX1 = -bw * 0.28;
        const spotX2 = bw * 0.28;
        const spotArmY = by - size * 0.06;
        ctx.strokeStyle = isNight ? '#475569' : '#64748B';
        ctx.lineWidth = Math.max(0.8, size * 0.016);
        ctx.beginPath();
        ctx.moveTo(spotX1, by);
        ctx.lineTo(spotX1, spotArmY);
        ctx.moveTo(spotX2, by);
        ctx.lineTo(spotX2, spotArmY);
        ctx.stroke();

        // Lâmpadas dos refletores
        if (isNight) {
          // ACESAS À NOITE: feixes de luz que iluminam o outdoor
          for (let sx of [spotX1, spotX2]) {
            ctx.fillStyle = '#FFFDE7';
            ctx.beginPath();
            ctx.arc(sx, spotArmY, Math.max(1.5, size * 0.024), 0, Math.PI * 2);
            ctx.fill();

            // Feixe cônico descendo sobre a placa
            const spotGrad = ctx.createLinearGradient(sx, spotArmY, sx, by + bh);
            spotGrad.addColorStop(0, 'rgba(255, 249, 196, 0.40)');
            spotGrad.addColorStop(1, 'rgba(255, 238, 88, 0)');
            ctx.fillStyle = spotGrad;
            ctx.beginPath();
            ctx.moveTo(sx - size * 0.03, spotArmY);
            ctx.lineTo(sx + size * 0.03, spotArmY);
            ctx.lineTo(sx + size * 0.22, by + bh);
            ctx.lineTo(sx - size * 0.22, by + bh);
            ctx.closePath();
            ctx.fill();
          }
        } else if (isDusk) {
          for (let sx of [spotX1, spotX2]) {
            ctx.fillStyle = '#FFE082';
            ctx.beginPath();
            ctx.arc(sx, spotArmY, Math.max(1.2, size * 0.02), 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Dia: refletores desligados
          ctx.fillStyle = '#94A3B8';
          ctx.beginPath();
          ctx.arc(spotX1, spotArmY, Math.max(1.0, size * 0.018), 0, Math.PI * 2);
          ctx.arc(spotX2, spotArmY, Math.max(1.0, size * 0.018), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Outdoor genérico / padrão
        ctx.fillStyle = '#333';
        ctx.fillRect(-size * 0.28, -size * 0.45, size * 0.06, size * 0.45);
        ctx.fillRect(size * 0.22, -size * 0.45, size * 0.06, size * 0.45);
        ctx.fillStyle = '#0B1320';
        ctx.fillRect(-size * 0.46, -size * 0.86, size * 0.92, size * 0.44);
        ctx.fillStyle = '#00B4D8';
        ctx.fillRect(-size * 0.42, -size * 0.82, size * 0.84, size * 0.36);
        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${Math.max(5, Math.floor(size * 0.16))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('TURBO GP', 0, -size * 0.59);
      }

      ctx.restore();
    }

    renderParticles(ctx) {
      if (!this.player || (this.state !== 'RACING' && this.state !== 'COUNTDOWN' && this.state !== 'PAUSED')) return;
      const anchorX = this.playerRenderPos ? this.playerRenderPos.x : (INTERNAL_WIDTH / 2);
      const anchorY = this.playerRenderPos ? (this.playerRenderPos.y + 18) : (INTERNAL_HEIGHT - 22);
      ctx.save();
      for (let pt of this.particlePool.pool) {
        if (!pt.active) continue;
        const dz = this.shortestDeltaZ(this.player.z, pt.z);
        const scale = Math.max(0.15, pt.life / pt.maxLife);
        const sX = anchorX + (pt.x - this.player.x) * (REF_WIDTH * 0.5);
        const sY = anchorY + pt.y * 45 + dz * 0.06;
        if (sY > INTERNAL_HEIGHT + 8 || sY < INTERNAL_HEIGHT * 0.45) continue;
        ctx.globalAlpha = Math.min(1, scale * 1.15);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(sX, sY, 2.2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderSpeedLines(ctx) {
      if (!this.player) return;
      const spd = this.player.speed;
      const isNitro = this.player.isNitro;
      const spdFactor = Math.min(1.0, Math.max(0, (spd - 135) / 145));
      if (!isNitro && spdFactor <= 0.02) return;

      ctx.save();
      const count = isNitro ? 26 : Math.floor(8 + spdFactor * 16);
      const alpha = isNitro ? 0.70 : (0.18 + spdFactor * 0.45);
      const strokeColor = isNitro ? `rgba(0, 229, 255, ${alpha.toFixed(2)})` : `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isNitro ? 1.7 : (0.8 + spdFactor * 0.9);

      for (let i = 0; i < count; i++) {
        const side = (i % 2 === 0) ? -1 : 1;
        const distFromCenter = 55 + Math.random() * 135;
        const lx = INTERNAL_WIDTH / 2 + side * distFromCenter;
        const ly = Math.random() * INTERNAL_HEIGHT;
        const len = (24 + Math.random() * 52) * (isNitro ? 1.4 : (0.85 + spdFactor * 0.55));
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + side * (12 + spdFactor * 10), ly + len);
        ctx.stroke();
      }
      ctx.restore();
    }

    renderDriverBadge(ctx, code, cx, cy, carW) {
      if (!code) return;
      const bH = Math.max(5.5, Math.min(8.5, carW * 0.125));
      const bW = Math.max(14, bH * 2.3);
      const by = cy - bH - 1.5;
      const bx = cx - bW / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(8, 14, 24, 0.76)';
      ctx.fillRect(bx, by, bW, bH);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(bx, by, bW, bH);

      ctx.font = `bold ${Math.floor(bH * 0.75)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(code, cx, by + bH / 2 + 0.3);
      ctx.restore();
    }

    initConfetti() {
      this.confetti = [];
      const colors = ['#FFD700', '#00E5FF', '#FF5252', '#69F0AE', '#E040FB', '#FFFFFF', '#FFAB00'];
      for (let i = 0; i < 70; i++) {
        this.confetti.push({
          x: Math.random() * INTERNAL_WIDTH,
          y: Math.random() * INTERNAL_HEIGHT - INTERNAL_HEIGHT,
          w: 2 + Math.random() * 2.5,
          h: 3 + Math.random() * 4,
          vy: 35 + Math.random() * 45,
          vx: (Math.random() - 0.5) * 20,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 6,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    updateConfetti(dt) {
      if (!this.confetti || this.confetti.length === 0) return;
      for (let i = 0; i < this.confetti.length; i++) {
        const p = this.confetti[i];
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.rot += p.vrot * dt;
        if (p.y > INTERNAL_HEIGHT + 10) {
          p.y = -10;
          p.x = Math.random() * INTERNAL_WIDTH;
        }
      }
    }

    renderConfetti(ctx) {
      if (!this.confetti || this.confetti.length === 0) return;
      ctx.save();
      for (let i = 0; i < this.confetti.length; i++) {
        const p = this.confetti[i];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      ctx.restore();
    }
    renderStartGantry(ctx) {
      const gw = 148;
      const gh = 36;
      const gx = (INTERNAL_WIDTH - gw) / 2;
      const gy = 32;

      ctx.save();
      // Suportes superiores até o topo da tela
      ctx.fillStyle = '#222831';
      ctx.fillRect(gx + 18, 0, 6, gy);
      ctx.fillRect(gx + gw - 24, 0, 6, gy);

      ctx.fillStyle = 'rgba(10, 12, 18, 0.94)';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#6C7A89';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx, gy, gw, gh);

      for (let i = 0; i < 4; i++) {
        const lx = gx + 23 + i * 34;
        const ly = gy + gh / 2 + 1;

        let lampColor = '#262A30';
        let glowColor = null;
        if (this.startLightsStage === 5) {
          lampColor = '#00FF66';
          glowColor = 'rgba(0, 255, 102, 0.35)';
        } else if (i < this.startLightsStage) {
          lampColor = '#FF1744';
          glowColor = 'rgba(255, 23, 68, 0.38)';
        }

        // Pestana do semáforo F1
        ctx.fillStyle = '#111';
        ctx.fillRect(lx - 11, ly - 12, 22, 4);

        if (glowColor) {
          ctx.fillStyle = glowColor;
          ctx.beginPath();
          ctx.arc(lx, ly, 13, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = lampColor;
        ctx.beginPath();
        ctx.arc(lx, ly, 8.5, 0, Math.PI * 2);
        ctx.fill();

        if (glowColor) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(lx - 2.5, ly - 2.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    renderHUD(ctx) {
      ctx.save();
      const touchHud = this.input.touchControlsVisible;

      // Barra superior estilo telemetria de corrida
      ctx.fillStyle = 'rgba(8, 12, 20, 0.84)';
      ctx.fillRect(8, 5, INTERNAL_WIDTH - 16, 23);
      ctx.fillStyle = '#00E5FF';
      ctx.fillRect(8, 5, INTERNAL_WIDTH - 16, 1.5);
      ctx.strokeStyle = 'rgba(120, 150, 185, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 5, INTERNAL_WIDTH - 16, 23);

      const ranked = this.getRankedCars();
      const playerPos = ranked.findIndex(c => c.isPlayer) + 1;
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = playerPos <= 3 ? '#FFD700' : '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(`P${playerPos}`, 15, 21);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#8FA3B8';
      ctx.fillText('/20', 38, 21);

      // Posicionado à esquerda da barra central de utilitários para nunca colidir
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      const curLapDisplay = Math.min(this.player.laps + 1, TOTAL_LAPS);
      ctx.fillText(`VOLTA ${curLapDisplay}/${TOTAL_LAPS}`, 62, 20);

      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#00E5FF';
      ctx.fillText(`ATUAL  ${this.formatTime(this.currentLapTime)}`, INTERNAL_WIDTH - 14, 14);
      ctx.fillStyle = '#FFB300';
      ctx.fillText(`MELHOR ${this.bestLapTime > 0 ? this.formatTime(this.bestLapTime) : '--:--.--'}`, INTERNAL_WIDTH - 14, 24);

      // Quando controles touch estão visíveis, move Velocímetro/Nitro e Minimapa para o TOPO
      // deixando os cantos inferiores 100% livres para a Cruz SNES e os Botões 1, 2, 3!
      const spdX = 8;
      const spdY = touchHud ? 31 : (INTERNAL_HEIGHT - 46);
      const spdW = 104;
      const spdH = 40;
      ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
      ctx.fillRect(spdX, spdY, spdW, spdH);
      ctx.strokeStyle = this.player.isNitro ? '#00E5FF' : '#E74C3C';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(spdX, spdY, spdW, spdH);

      // Velocidade + KM/H
      const spdVal = String(Math.floor(this.player.speed)).padStart(3, '0');
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillText('888', spdX + 5, spdY + 16);
      ctx.fillStyle = this.player.isNitro ? '#80F8FF' : '#FFFFFF';
      ctx.fillText(spdVal, spdX + 5, spdY + 16);

      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = '#E74C3C';
      ctx.fillText('KM/H', spdX + 41, spdY + 15);

      // Indicador de Marcha em destaque
      ctx.fillStyle = '#162030';
      ctx.fillRect(spdX + 70, spdY + 4, 29, 14);
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 1;
      ctx.strokeRect(spdX + 70, spdY + 4, 29, 14);
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.currentGear}ª`, spdX + 84.5, spdY + 14.5);

      // Barra de RPM segmentada estilo F1 (12 LEDs)
      const rpmPercent = Math.min(1, this.player.rpm / 7600);
      const totalLeds = 12;
      const activeLeds = Math.round(rpmPercent * totalLeds);
      for (let l = 0; l < totalLeds; l++) {
        const lx = spdX + 5 + l * 7.9;
        if (l < activeLeds) {
          ctx.fillStyle = l >= 9 ? '#FF1744' : (l >= 6 ? '#FFB300' : '#00E676');
        } else {
          ctx.fillStyle = '#1E2430';
        }
        ctx.fillRect(lx, spdY + 21, 6.2, 4);
      }

      // Cargas de Nitro (N2O)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#90A4AE';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('N2O', spdX + 5, spdY + 35);
      for (let n = 0; n < 3; n++) {
        const nx = spdX + 27 + n * 24;
        ctx.fillStyle = '#18202C';
        ctx.fillRect(nx, spdY + 29, 20, 7);
        if (n < this.player.nitroCharges) {
          ctx.fillStyle = '#00E5FF';
          ctx.fillRect(nx + 1, spdY + 30, 18, 5);
          ctx.fillStyle = '#B2EBF2';
          ctx.fillRect(nx + 1, spdY + 30, 18, 1.5);
        } else if (n === this.player.nitroCharges && this.player.isNitro) {
          const burnRatio = Math.max(0, this.player.nitroTimer / 2.4);
          ctx.fillStyle = '#80F8FF';
          ctx.fillRect(nx + 1, spdY + 30, 18 * burnRatio, 5);
        }
      }

      // Indicador aerodinâmico de Vácuo (Slipstream) estilo F1
      // Indicador aerodinâmico de Vácuo (Slipstream) estilo F1
      if (this.player.inSlipstream) {
        const intensity = Math.min(1.0, this.player.slipstreamIntensity || 0.5);
        const vacY = touchHud ? (spdY + spdH + 2) : (spdY - 14);
        const barW = 54;
        const barH = 11;
        ctx.fillStyle = 'rgba(8, 16, 26, 0.88)';
        ctx.fillRect(spdX, vacY, barW, barH);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1;
        ctx.strokeRect(spdX, vacY, barW, barH);

        const fillW = Math.max(2, (barW - 4) * intensity);
        const vacGrad = ctx.createLinearGradient(spdX + 2, 0, spdX + barW - 2, 0);
        vacGrad.addColorStop(0, '#00E5FF');
        vacGrad.addColorStop(1, '#00FF66');
        ctx.fillStyle = vacGrad;
        ctx.fillRect(spdX + 2, vacY + 2, fillW, barH - 4);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 6.2px monospace';
        ctx.textAlign = 'center';
        const pct = Math.round(intensity * 100);
        ctx.fillText(`▲ VÁCUO ${pct}%`, spdX + barW / 2, vacY + 8);
      }
      // Minimapa com traçado duplo e linha de chegada
      const mapBoxW = 58;
      const mapBoxH = 50;
      const mapBoxX = INTERNAL_WIDTH - mapBoxW - 8;
      const mapBoxY = touchHud ? 31 : (INTERNAL_HEIGHT - mapBoxH - 6);

      ctx.fillStyle = 'rgba(8, 12, 20, 0.84)';
      ctx.fillRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH);

      const mPoints = this.track.mapPoints;
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let i = 0; i < mPoints.length; i += 4) {
        const px = mapBoxX + 5 + mPoints[i].x * (mapBoxW - 10);
        const py = mapBoxY + 5 + mPoints[i].z * (mapBoxH - 10);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = '#78909C';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Marcador da linha de largada no minimapa
      if (mPoints.length > 0) {
        const startPt = mPoints[START_LINE_SEG % mPoints.length];
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(mapBoxX + 5 + startPt.x * (mapBoxW - 10) - 2, mapBoxY + 5 + startPt.z * (mapBoxH - 10) - 2, 4, 4);
      }

      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        if (car.isPlayer) continue;
        const segIdx = ((Math.floor(car.z / SEGMENT_LENGTH) % mPoints.length) + mPoints.length) % mPoints.length;
        const pt = mPoints[segIdx];
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(mapBoxX + 5 + pt.x * (mapBoxW - 10) - 1, mapBoxY + 5 + pt.z * (mapBoxH - 10) - 1, 2.2, 2.2);
      }

      const pSegIdx = ((Math.floor(this.player.z / SEGMENT_LENGTH) % mPoints.length) + mPoints.length) % mPoints.length;
      const pPt = mPoints[pSegIdx];
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(mapBoxX + 5 + pPt.x * (mapBoxW - 10) - 2, mapBoxY + 5 + pPt.z * (mapBoxH - 10) - 2, 4, 4);

      if (this.lapBannerTimer > 0) {
        const lbW = 152;
        ctx.fillStyle = 'rgba(8, 12, 22, 0.90)';
        ctx.fillRect(INTERNAL_WIDTH / 2 - lbW / 2, 48, lbW, 24);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(INTERNAL_WIDTH / 2 - lbW / 2, 48, lbW, 24);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.lapBannerText, INTERNAL_WIDTH / 2, 64);
      }

      ctx.restore();
    }

    // Geometria da tela "Escolha de Modo de Jogo" (Campeonato vs Corrida Rápida)
    getModeSelectLayout() {
      const touchSafe = this.input.touchControlsVisible;
      const cardW = touchSafe ? 152 : 166;
      const cardH = touchSafe ? 122 : 138;
      const cardY = touchSafe ? 34 : 36;
      const gap = touchSafe ? 12 : 14;
      const totalW = cardW * 2 + gap;
      const startX = Math.round((INTERNAL_WIDTH - totalW) / 2);
      const card0 = { x: startX, y: cardY, w: cardW, h: cardH };
      const card1 = { x: startX + cardW + gap, y: cardY, w: cardW, h: cardH };
      const btnW = touchSafe ? 86 : 98;
      const btnH = touchSafe ? 18 : 20;
      const btnY = touchSafe ? 168 : 184;
      const btnBack = { x: startX, y: btnY, w: btnW, h: btnH };
      const btnConfirm = { x: startX + totalW - btnW, y: btnY, w: btnW, h: btnH };
      return { touchSafe, cardW, cardH, cardY, card0, card1, btnBack, btnConfirm };
    }

    // Geometria da tela "Escolha de Pista" para Corrida Rápida
    getTrackSelectLayout() {
      const touchSafe = this.input.touchControlsVisible;
      const cardW = touchSafe ? 104 : 112;
      const cardH = touchSafe ? 122 : 138;
      const cardY = touchSafe ? 34 : 36;
      const gap = touchSafe ? 6 : 8;
      const totalW = cardW * 3 + gap * 2;
      const startX = Math.round((INTERNAL_WIDTH - totalW) / 2);
      const cards = [
        { x: startX, y: cardY, w: cardW, h: cardH, i: 0 },
        { x: startX + cardW + gap, y: cardY, w: cardW, h: cardH, i: 1 },
        { x: startX + (cardW + gap) * 2, y: cardY, w: cardW, h: cardH, i: 2 }
      ];
      const btnW = touchSafe ? 86 : 98;
      const btnH = touchSafe ? 18 : 20;
      const btnY = touchSafe ? 168 : 184;
      const btnBack = { x: startX, y: btnY, w: btnW, h: btnH };
      const btnConfirm = { x: startX + totalW - btnW, y: btnY, w: btnW, h: btnH };
      return { touchSafe, cardW, cardH, cardY, cards, btnBack, btnConfirm };
    }

    // Geometria compartilhada da Garagem com seletor dos 20 carros em 2 fileiras x 10 colunas
    getCarSelectLayout() {
      const touchSafe = this.input.touchControlsVisible;
      const W = INTERNAL_WIDTH;
      const H = INTERNAL_HEIGHT;

      // Grade dos 20 carros (2 linhas x 10 colunas)
      const cols = 10;
      const rows = 2;
      const gapX = touchSafe ? 2 : 3;
      const gapY = 2;
      const maxGridW = touchSafe ? Math.min(W - 14, 308) : Math.min(W - 20, 360);
      const chipW = Math.max(26, Math.floor((maxGridW - (cols - 1) * gapX) / cols));
      const chipH = touchSafe ? 11 : 12;
      const gridW = cols * chipW + (cols - 1) * gapX;
      const gridH = rows * chipH + (rows - 1) * gapY;
      const gridX = Math.round((W - gridW) / 2);
      const gridY = touchSafe ? 15 : 17;

      const chips = [];
      for (let i = 0; i < CAR_MODELS.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        chips.push({
          x: gridX + col * (chipW + gapX),
          y: gridY + row * (chipH + gapY),
          w: chipW,
          h: chipH,
          i: i
        });
      }

      const gridBottom = gridY + gridH;

      // Card central do showroom dos carros
      const bW = touchSafe ? Math.min(W - 16, 260) : Math.min(W - 24, 320);
      const bH = touchSafe ? 116 : 128;
      const bX = Math.round((W - bW) / 2);
      const bY = gridBottom + (touchSafe ? 4 : 5);

      const btnW = touchSafe ? 92 : 108;
      const btnH = touchSafe ? 17 : 19;
      const btnY = bY + bH + (touchSafe ? 5 : 6);
      const btnBack = {
        x: Math.round(bX),
        y: btnY,
        w: btnW,
        h: btnH
      };
      const btnConfirm = {
        x: Math.round(bX + bW - btnW),
        y: btnY,
        w: btnW,
        h: btnH
      };
      return { touchSafe, bW, bH, bX, bY, chips, btnBack, btnConfirm };
    }

    // Geometria da tela de Pintura e Seleção de Cor do Carro (Etapa 2)
    getColorSelectLayout() {
      const touchSafe = this.input.touchControlsVisible;
      const W = INTERNAL_WIDTH;
      const H = INTERNAL_HEIGHT;

      // Card amplo e elegante de personalização e pintura
      const bW = touchSafe ? Math.min(W - 16, 280) : Math.min(W - 24, 330);
      const bH = touchSafe ? 134 : 148;
      const bX = Math.round((W - bW) / 2);
      const bY = touchSafe ? 18 : 20;

      // 10 Amostras de cores amplas e confortáveis para toque e controle
      const numColors = CAR_COLORS.length;
      const swY = bY + (touchSafe ? 88 : 98);
      const swR = touchSafe ? 6.2 : 7.6;
      const swGap = touchSafe ? 19.5 : 23.5;
      const totalSwW = (numColors - 1) * swGap;
      const swStartX = W / 2 - totalSwW / 2;
      const sw = [];
      for (let i = 0; i < numColors; i++) {
        sw.push({ x: swStartX + i * swGap, y: swY, r: swR, i });
      }

      const btnW = touchSafe ? 96 : 112;
      const btnH = touchSafe ? 18 : 20;
      const btnY = bY + bH + (touchSafe ? 6 : 7);
      const btnBack = {
        x: Math.round(bX),
        y: btnY,
        w: btnW,
        h: btnH
      };
      const btnConfirm = {
        x: Math.round(bX + bW - btnW),
        y: btnY,
        w: btnW,
        h: btnH
      };
      return { touchSafe, bW, bH, bX, bY, sw, btnBack, btnConfirm };
    }

    // Geometria da tela "Preparar Corrida" (chips de clima/hora e de música)
    getSetupLayout() {
      const touchSafe = this.input.touchControlsVisible;
      const cw = touchSafe ? 54 : 72;
      const ch = touchSafe ? 13 : 15;
      const g = 3;
      const startX = INTERNAL_WIDTH / 2 - (4 * cw + 3 * g) / 2;
      const y1 = touchSafe ? 40 : 44;
      const conds = [];
      for (let i = 0; i < ENV_CONDITIONS.length; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        conds.push({ x: startX + col * (cw + g), y: y1 + row * (ch + g), w: cw, h: ch, i });
      }
      const sw = touchSafe ? 110 : 148;
      const sStartX = INTERNAL_WIDTH / 2 - (2 * sw + g) / 2;
      const y2 = touchSafe ? 86 : 96;
      const songs = [];
      for (let i = 0; i < SONGS.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        songs.push({ x: sStartX + col * (sw + g), y: y2 + row * (ch + g), w: sw, h: ch, i });
      }
      const btnW = touchSafe ? 88 : 98;
      const startW = touchSafe ? 116 : 130;
      const btnH = touchSafe ? 18 : 20;
      const btnY = touchSafe ? 148 : 158;
      const totalBtnsW = btnW + 12 + startW;
      const btnStartX = Math.round(INTERNAL_WIDTH / 2 - totalBtnsW / 2);
      const btnBack = {
        x: btnStartX,
        y: btnY,
        w: btnW,
        h: btnH
      };
      const startBtn = {
        x: btnStartX + btnW + 12,
        y: btnY,
        w: startW,
        h: btnH
      };
      return {
        touchSafe, conds, songs, btnBack, startBtn,
        label1Y: touchSafe ? 36 : 40,
        label2Y: touchSafe ? 82 : 91,
        descY: touchSafe ? 135 : 144,
        promptY: touchSafe ? 157 : 169,
        hintY: touchSafe ? 178 : 192
      };
    }

    renderMenu(ctx) {
      const touchSafe = this.input.touchControlsVisible;
      const now = performance.now();

      // Vinheta translúcida sobre a pista 3D ao vivo ao fundo
      const bgGrad = ctx.createLinearGradient(0, 0, 0, INTERNAL_HEIGHT);
      bgGrad.addColorStop(0, 'rgba(4, 7, 16, 0.88)');
      bgGrad.addColorStop(0.5, 'rgba(5, 10, 22, 0.68)');
      bgGrad.addColorStop(1, 'rgba(3, 5, 12, 0.92)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';

      // =========================================================================
      // NOME DO JOGO CENTRALIZADO NA PRIMEIRA TELA (SEM OS 4 CARROS)
      // =========================================================================
      const logoY = touchSafe ? 68 : 74;

      // Glow sutil por trás do logotipo
      const glowGrad = ctx.createRadialGradient(INTERNAL_WIDTH / 2, logoY - 2, 4, INTERNAL_WIDTH / 2, logoY - 2, 90);
      glowGrad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
      glowGrad.addColorStop(0.6, 'rgba(255, 60, 0, 0.12)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(INTERNAL_WIDTH / 2, logoY - 2, 90, 0, Math.PI * 2);
      ctx.fill();

      // Logotipo Arcade LH44 com sombra dupla épica
      ctx.font = touchSafe ? 'bold 36px monospace' : 'bold 44px monospace';
      ctx.fillStyle = '#FF3C00';
      ctx.fillText('LH44', INTERNAL_WIDTH / 2 + 3, logoY + 3);
      ctx.fillStyle = '#00E5FF';
      ctx.fillText('LH44', INTERNAL_WIDTH / 2, logoY);

      // Subtítulo dourado com estrelas
      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 9.5px monospace' : 'bold 11.5px monospace';
      ctx.fillText('★ LOW TO HIGH SPEED ★', INTERNAL_WIDTH / 2, logoY + (touchSafe ? 17 : 20));

      // Linha decorativa de neon
      const lineW = touchSafe ? 160 : 210;
      const lineY = logoY + (touchSafe ? 24 : 28);
      const lineGrad = ctx.createLinearGradient(INTERNAL_WIDTH / 2 - lineW / 2, 0, INTERNAL_WIDTH / 2 + lineW / 2, 0);
      lineGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      lineGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.85)');
      lineGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(INTERNAL_WIDTH / 2 - lineW / 2, lineY, lineW, 1.5);

      // BOTÃO DE CONFIRMAR / INICIAR JOGO CENTRALIZADO
      const btnW = touchSafe ? 174 : 204;
      const btnH = touchSafe ? 22 : 25;
      const btnX = Math.round(INTERNAL_WIDTH / 2 - btnW / 2);
      const btnY = touchSafe ? 116 : 124;
      const blink = Math.floor(now / 380) % 2 === 0;

      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, blink ? '#00E5FF' : '#00B0FF');
      btnGrad.addColorStop(1, blink ? '#0091EA' : '#005F9E');
      ctx.fillStyle = btnGrad;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = blink ? '#FFFFFF' : '#FFD700';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = '#040914';
      ctx.font = touchSafe ? 'bold 9.5px monospace' : 'bold 11px monospace';
      const enterIcon = this.input.gamepadConnected ? '[A]' : (touchSafe ? '[3]' : '[ENTER]');
      ctx.fillText(`▶ INICIAR JOGO ${enterIcon}`, btnX + btnW / 2, btnY + btnH / 2 + 3.5);

      // Status do controle / joystick e dicas de comando
      if (this.input.gamepadConnected) {
        ctx.fillStyle = '#00E5FF';
        ctx.font = touchSafe ? 'bold 7.5px monospace' : 'bold 8.5px monospace';
        ctx.fillText('🎮 CONTROLE RECONHECIDO NATIVAMENTE', INTERNAL_WIDTH / 2, btnY + btnH + 15);
      } else {
        ctx.fillStyle = '#B0BEC5';
        ctx.font = touchSafe ? '7px monospace' : '8px monospace';
        ctx.fillText('TOQUE NO BOTÃO OU PRESSIONE [ENTER] / [A] PARA ENTRAR', INTERNAL_WIDTH / 2, btnY + btnH + 15);
      }

      ctx.fillStyle = '#78909C';
      ctx.font = touchSafe ? '6.5px monospace' : '7.5px monospace';
      const hintText = touchSafe
        ? 'JOYSTICK / CRUZ: VIRAR | [3]/[A]: ACELERA | [2]/[B]: FREIA | [1]/[X]: NITRO'
        : 'SETAS / GAMEPAD: DIRIGIR | [ENTER]/[A]: CONFIRMAR | [ESPAÇO]/[X]: NITRO | [ESC]: PAUSA';
      ctx.fillText(hintText, INTERNAL_WIDTH / 2, touchSafe ? 174 : 188);

      // Rodapé da tela inicial
      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 6.5px monospace' : 'bold 7.5px monospace';
      ctx.fillText('Desenvolvido por Leandro Yata - 2026 - (75) 99190-2534', INTERNAL_WIDTH / 2, touchSafe ? 193 : 206);

      ctx.restore();
    }

    renderModeSelect(ctx) {
      const L = this.getModeSelectLayout();
      const touchSafe = L.touchSafe;
      const now = performance.now();

      // Fundo escuro translúcido revelando a pista ao fundo
      ctx.fillStyle = 'rgba(6, 9, 18, 0.82)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 11px monospace' : 'bold 13px monospace';
      ctx.fillText('MODOS DE JOGO', INTERNAL_WIDTH / 2, touchSafe ? 19 : 23);

      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 6.8px monospace' : 'bold 7.8px monospace';
      ctx.fillText('SELECIONE O TIPO DE DISPUTA', INTERNAL_WIDTH / 2, touchSafe ? 29 : 33);

      const modes = [
        {
          id: 0,
          title: 'CAMPEONATO F1',
          icon: '🏆',
          badge: 'TEMPORADA COMPLETA',
          color: '#FFD700',
          lines: [
            '• 3 ETAPAS OFICIAIS',
            '• PONTUAÇÃO F1 (1º AO 10º)',
            '• DISPUTA DO TÍTULO & PÓDIO'
          ],
          box: L.card0
        },
        {
          id: 1,
          title: 'CORRIDA RÁPIDA',
          icon: '⚡',
          badge: 'AÇÃO IMEDIATA',
          color: '#00E5FF',
          lines: [
            '• ESCOLHA 1 CIRCUITO',
            '• DUELO CONTRA 19 BOTS',
            '• RESULTADO DIRETO'
          ],
          box: L.card1
        }
      ];

      for (let m = 0; m < modes.length; m++) {
        const item = modes[m];
        const isSelected = (this.selectedModeIndex === item.id);
        const { x, y, w, h } = item.box;

        // Fundo do card
        const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (isSelected) {
          cardGrad.addColorStop(0, 'rgba(18, 30, 52, 0.96)');
          cardGrad.addColorStop(1, 'rgba(10, 16, 30, 0.98)');
        } else {
          cardGrad.addColorStop(0, 'rgba(12, 16, 26, 0.88)');
          cardGrad.addColorStop(1, 'rgba(6, 9, 16, 0.92)');
        }
        ctx.fillStyle = cardGrad;
        ctx.fillRect(x, y, w, h);

        // Borda com brilho se selecionado
        if (isSelected) {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 1.8;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = item.color;
          ctx.fillRect(x + 2, y + 2, w - 4, 3);
        } else {
          ctx.strokeStyle = 'rgba(70, 90, 120, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, w, h);
        }

        // Tag superior
        ctx.fillStyle = isSelected ? item.color : '#78909C';
        ctx.font = 'bold 6.2px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`[ ${item.badge} ]`, x + w / 2, y + 14);

        // Ícone grande
        ctx.font = '18px monospace';
        ctx.fillText(item.icon, x + w / 2, y + 36);

        // Título do modo
        ctx.fillStyle = isSelected ? '#FFFFFF' : '#B0BEC5';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(item.title, x + w / 2, y + 54);

        // Linha divisória
        ctx.fillStyle = isSelected ? item.color : 'rgba(100, 120, 150, 0.3)';
        ctx.fillRect(x + 14, y + 60, w - 28, 1);

        // Linhas de descrição
        ctx.textAlign = 'left';
        ctx.font = '6.8px monospace';
        ctx.fillStyle = isSelected ? '#E2E8F0' : '#8898AA';
        for (let l = 0; l < item.lines.length; l++) {
          ctx.fillText(item.lines[l], x + 12, y + 74 + l * 13);
        }

        // Status no rodapé do card
        ctx.textAlign = 'center';
        if (isSelected) {
          const blink = Math.floor(now / 320) % 2 === 0;
          ctx.fillStyle = blink ? item.color : '#FFFFFF';
          ctx.font = 'bold 7.2px monospace';
          ctx.fillText('▶ SELECIONADO ◀', x + w / 2, y + h - 10);
        } else {
          ctx.fillStyle = '#64748B';
          ctx.font = '6.5px monospace';
          ctx.fillText('TOQUE PARA ESCOLHER', x + w / 2, y + h - 10);
        }
      }

      // Botões inferiores: VOLTAR e CONFIRMAR
      const btnB = L.btnBack;
      if (btnB) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.fillStyle = '#EF4444';
        ctx.font = touchSafe ? 'bold 6.8px monospace' : 'bold 7.5px monospace';
        ctx.fillText('◀ VOLTAR', btnB.x + btnB.w / 2, btnB.y + btnB.h / 2 + 2.5);
      }

      const btnC = L.btnConfirm;
      if (btnC) {
        ctx.fillStyle = '#065F46';
        ctx.fillRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = touchSafe ? 'bold 7.2px monospace' : 'bold 8px monospace';
        ctx.fillText('CONTINUAR ▶', btnC.x + btnC.w / 2, btnC.y + btnC.h / 2 + 2.5);
      }

      ctx.restore();
    }

    renderTrackSelect(ctx) {
      const L = this.getTrackSelectLayout();
      const touchSafe = L.touchSafe;
      const now = performance.now();

      // Fundo escuro translúcido permitindo ver o circuito selecionado rolar atrás da tela!
      ctx.fillStyle = 'rgba(6, 9, 18, 0.80)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 11px monospace' : 'bold 13px monospace';
      ctx.fillText('CORRIDA RÁPIDA — CIRCUITO', INTERNAL_WIDTH / 2, touchSafe ? 19 : 23);

      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 6.8px monospace' : 'bold 7.8px monospace';
      ctx.fillText('ESCOLHA O AUTÓDROMO DA SUA CORRIDA AVULSA', INTERNAL_WIDTH / 2, touchSafe ? 29 : 33);

      const trackInfo = [
        {
          id: 0,
          flag: '🇧🇷',
          name: 'BRASIL GP',
          sub: 'INTERLAGOS • SP',
          themeTag: 'CREPÚSCULO',
          color: '#FEDD00',
          lines: [
            '• 3 VOLTAS',
            '• PÔR DO SOL / ORLA',
            '• S DO SENNA & RETAS'
          ]
        },
        {
          id: 1,
          flag: '🏔️',
          name: 'SERRA BRASIL',
          sub: 'CATARINENSE • SC',
          themeTag: 'MONTANHA',
          color: '#F97316',
          lines: [
            '• 3 VOLTAS',
            '• VIADUTOS ELEVADOS',
            '• TÚNEL DE ROCHA'
          ]
        },
        {
          id: 2,
          flag: '🌃',
          name: 'NOITE URBANA',
          sub: 'CYBER CITY GP',
          themeTag: 'NOITE NEON',
          color: '#00E5FF',
          lines: [
            '• 3 VOLTAS',
            '• ARRANHA-CÉUS & LED',
            '• FARÓIS & TÚNEL METRO'
          ]
        }
      ];

      for (let t = 0; t < L.cards.length; t++) {
        const box = L.cards[t];
        const info = trackInfo[t];
        const isSelected = (this.selectedQuickTrackIndex === t);
        const { x, y, w, h } = box;

        // Fundo do card
        const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (isSelected) {
          cardGrad.addColorStop(0, 'rgba(18, 30, 52, 0.96)');
          cardGrad.addColorStop(1, 'rgba(10, 16, 30, 0.98)');
        } else {
          cardGrad.addColorStop(0, 'rgba(12, 16, 26, 0.88)');
          cardGrad.addColorStop(1, 'rgba(6, 9, 16, 0.92)');
        }
        ctx.fillStyle = cardGrad;
        ctx.fillRect(x, y, w, h);

        if (isSelected) {
          ctx.strokeStyle = info.color;
          ctx.lineWidth = 1.8;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = info.color;
          ctx.fillRect(x + 2, y + 2, w - 4, 3);
        } else {
          ctx.strokeStyle = 'rgba(70, 90, 120, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, w, h);
        }

        // Tag superior
        ctx.fillStyle = isSelected ? info.color : '#78909C';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`[ ${info.themeTag} ]`, x + w / 2, y + 13);

        // Bandeira / Ícone
        ctx.font = '16px monospace';
        ctx.fillText(info.flag, x + w / 2, y + 33);

        // Nome da pista
        ctx.fillStyle = isSelected ? '#FFFFFF' : '#B0BEC5';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(info.name, x + w / 2, y + 49);

        // Localização / Subtítulo
        ctx.fillStyle = isSelected ? info.color : '#78909C';
        ctx.font = 'bold 6.2px monospace';
        ctx.fillText(info.sub, x + w / 2, y + 59);

        // Linha divisória
        ctx.fillStyle = isSelected ? info.color : 'rgba(100, 120, 150, 0.3)';
        ctx.fillRect(x + 8, y + 64, w - 16, 1);

        // Linhas de detalhe
        ctx.textAlign = 'left';
        ctx.font = '6.4px monospace';
        ctx.fillStyle = isSelected ? '#E2E8F0' : '#8898AA';
        for (let l = 0; l < info.lines.length; l++) {
          ctx.fillText(info.lines[l], x + 8, y + 78 + l * 13);
        }

        // Rodapé do card
        ctx.textAlign = 'center';
        if (isSelected) {
          const blink = Math.floor(now / 320) % 2 === 0;
          ctx.fillStyle = blink ? info.color : '#FFFFFF';
          ctx.font = 'bold 6.8px monospace';
          ctx.fillText('▶ ESCOLHIDA ◀', x + w / 2, y + h - 10);
        } else {
          ctx.fillStyle = '#64748B';
          ctx.font = '6px monospace';
          ctx.fillText('TOQUE P/ ESCOLHER', x + w / 2, y + h - 10);
        }
      }

      // Botões inferiores: VOLTAR e CONFIRMAR
      const btnB = L.btnBack;
      if (btnB) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.fillStyle = '#EF4444';
        ctx.font = touchSafe ? 'bold 6.8px monospace' : 'bold 7.5px monospace';
        ctx.fillText('◀ VOLTAR', btnB.x + btnB.w / 2, btnB.y + btnB.h / 2 + 2.5);
      }

      const btnC = L.btnConfirm;
      if (btnC) {
        ctx.fillStyle = '#065F46';
        ctx.fillRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = touchSafe ? 'bold 7.2px monospace' : 'bold 8px monospace';
        ctx.fillText('ESCOLHER CARRO ▶', btnC.x + btnC.w / 2, btnC.y + btnC.h / 2 + 2.5);
      }

      ctx.restore();
    }

    renderNameInput(ctx) {
      const touchSafe = this.input.touchControlsVisible;
      const now = performance.now();
      const car = CAR_MODELS[this.selectedCarIndex];
      const color = CAR_COLORS[this.colorIndex];

      ctx.fillStyle = 'rgba(6, 9, 18, 0.88)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';

      // Titulo
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 11px monospace' : 'bold 13px monospace';
      ctx.fillText('IDENTIFICA\u00C7\u00C3O DO PILOTO', INTERNAL_WIDTH / 2, touchSafe ? 24 : 28);

      // Caixa Central Elegante
      const boxW = touchSafe ? 220 : 250;
      const boxH = touchSafe ? 130 : 142;
      const boxX = INTERNAL_WIDTH / 2 - boxW / 2;
      const boxY = touchSafe ? 36 : 42;

      ctx.fillStyle = 'rgba(14, 22, 38, 0.94)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Miniatura do carro escolhido
      CarArt.renderModel(
        ctx,
        car,
        INTERNAL_WIDTH / 2,
        boxY + (touchSafe ? 34 : 38),
        touchSafe ? 88 : 98,
        touchSafe ? 55 : 62,
        false,
        0,
        color.hex,
        { isNitro: false, wheelPhase: now * 0.012, isNight: false, speed: 0 }
      );

      ctx.fillStyle = '#B0BEC5';
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText(`${car.name} - ${color.name}`, INTERNAL_WIDTH / 2, boxY + (touchSafe ? 58 : 64));

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('DIGITE SEU NOME DE PILOTO ABAIXO:', INTERNAL_WIDTH / 2, boxY + (touchSafe ? 74 : 80));

      // Botões VOLTAR e CONFIRMAR
      const btnW = touchSafe ? 88 : 100;
      const btnH = touchSafe ? 18 : 20;
      const btnY = boxY + boxH - (touchSafe ? 24 : 26);
      const btnBackX = boxX + 12;
      const btnConfirmX = boxX + boxW - 12 - btnW;
      const blink = Math.floor(now / 350) % 2 === 0;

      // Botão ◀ VOLTAR
      const backGrad = ctx.createLinearGradient(btnBackX, btnY, btnBackX, btnY + btnH);
      backGrad.addColorStop(0, '#2C3E50');
      backGrad.addColorStop(1, '#1A252F');
      ctx.fillStyle = backGrad;
      ctx.fillRect(btnBackX, btnY, btnW, btnH);
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(btnBackX, btnY, btnW, btnH);
      ctx.fillStyle = '#ECF0F1';
      ctx.font = touchSafe ? 'bold 8px monospace' : 'bold 9px monospace';
      ctx.fillText('◀ VOLTAR [B]', btnBackX + btnW / 2, btnY + btnH / 2 + 3);

      // Botão CONFIRMAR ▶
      const confirmGrad = ctx.createLinearGradient(btnConfirmX, btnY, btnConfirmX, btnY + btnH);
      confirmGrad.addColorStop(0, blink ? '#00E5FF' : '#00B0FF');
      confirmGrad.addColorStop(1, blink ? '#0091EA' : '#005F9E');
      ctx.fillStyle = confirmGrad;
      ctx.fillRect(btnConfirmX, btnY, btnW, btnH);
      ctx.strokeStyle = blink ? '#FFFFFF' : '#FFD700';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(btnConfirmX, btnY, btnW, btnH);
      ctx.fillStyle = '#060D1A';
      ctx.font = touchSafe ? 'bold 8px monospace' : 'bold 9px monospace';
      ctx.fillText('CONFIRMAR [A] ▶', btnConfirmX + btnW / 2, btnY + btnH / 2 + 3);

      ctx.fillStyle = '#90A4AE';
      ctx.font = touchSafe ? '6.5px monospace' : '7.5px monospace';
      ctx.fillText('[A] / [ENTER] CONFIRMAR | [B] / [ESC] VOLTAR AO CARRO', INTERNAL_WIDTH / 2, touchSafe ? 182 : 204);

      ctx.restore();
    }

    renderCarSelect(ctx) {
      const L = this.getCarSelectLayout();
      const touchSafe = L.touchSafe;

      // Fundo translúcido deixando a pista rolar suavemente atrás da garagem
      ctx.fillStyle = 'rgba(6, 9, 18, 0.82)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 9px monospace' : 'bold 11px monospace';
      ctx.fillText('GARAGEM LH44 — ESCOLHA SUA MÁQUINA', INTERNAL_WIDTH / 2, touchSafe ? 11 : 12);

      const CAR_SHORT_NAMES = [
        '1 UNO',    '2 FUS',    '3 206',    '4 HB2',    '5 OPA',
        '6 GOL',    '7 CHE',    '8 BRA',    '9 COR',    '10 CEL',
        '11 ONX',   '12 KA',    '13 PAL',   '14 KWI',   '15 FOC',
        '16 SAN',   '17 MOB',   '18 SNT',   '19 RUR',   '20 KOM'
      ];

      // Grade dos 20 carros no topo (2 linhas x 10 colunas)
      if (L.chips) {
        for (let c = 0; c < L.chips.length; c++) {
          const chip = L.chips[c];
          const isSel = (chip.i === this.selectedCarIndex);

          if (isSel) {
            const selGrad = ctx.createLinearGradient(chip.x, chip.y, chip.x, chip.y + chip.h);
            selGrad.addColorStop(0, '#00E5FF');
            selGrad.addColorStop(1, '#0284C7');
            ctx.fillStyle = selGrad;
            ctx.fillRect(chip.x, chip.y, chip.w, chip.h);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);

            ctx.fillStyle = '#060D1A';
            ctx.font = `900 ${touchSafe ? 5.8 : 6.4}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(CAR_SHORT_NAMES[chip.i] || `${chip.i + 1}`, chip.x + chip.w / 2, chip.y + chip.h * 0.78);
          } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(chip.x, chip.y, chip.w, chip.h);
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);

            ctx.fillStyle = '#94A3B8';
            ctx.font = `bold ${touchSafe ? 5.4 : 6.0}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(CAR_SHORT_NAMES[chip.i] || `${chip.i + 1}`, chip.x + chip.w / 2, chip.y + chip.h * 0.78);
          }
        }
      }

      const car = CAR_MODELS[this.selectedCarIndex];
      const color = CAR_COLORS[this.colorIndex];
      const now = performance.now();
      const { bW, bH, bX, bY } = L;

      // Card principal do showroom
      const panelGrad = ctx.createLinearGradient(0, bY, 0, bY + bH);
      panelGrad.addColorStop(0, 'rgba(16, 22, 36, 0.95)');
      panelGrad.addColorStop(1, 'rgba(9, 13, 22, 0.97)');
      ctx.fillStyle = panelGrad;
      ctx.fillRect(bX, bY, bW, bH);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(bX, bY, bW, bH);

      // Identificação e número do carro selecionado
      const carIdxNum = (this.selectedCarIndex + 1).toString().padStart(2, '0');
      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 7.5px monospace' : 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[ ${carIdxNum} / 20 ]  ${car.name}`, INTERNAL_WIDTH / 2, bY + (touchSafe ? 11 : 13));

      // Botões laterais ◀ ▶ de navegação
      const pulseX = Math.sin(now * 0.006) * 2;
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 15px monospace' : 'bold 18px monospace';
      ctx.fillText('◀', bX - 12 - pulseX, bY + bH / 2 + 5);
      ctx.fillText('▶', bX + bW + 12 + pulseX, bY + bH / 2 + 5);

      // Plataforma iluminada centralizada
      const platX = INTERNAL_WIDTH / 2;
      const platY = bY + (touchSafe ? 44 : 50);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath();
      ctx.ellipse(platX, platY, touchSafe ? 52 : 66, touchSafe ? 9.0 : 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(platX, platY, touchSafe ? 48 : 62, touchSafe ? 7.5 : 9.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Carro em exibição perfeitamente alinhado e reto na plataforma (retrovisores nítidos de ambos os lados)
      car.render(
        ctx,
        platX,
        bY + (touchSafe ? 30 : 35),
        touchSafe ? 84 : 98,
        touchSafe ? 52 : 62,
        false,
        0,
        color.hex,
        {
          isNitro: false,
          wheelPhase: 0,
          isNight: true,
          speed: 0
        }
      );

      // Barras de estatísticas dinâmicas
      const statW = Math.floor((bW - 32) / 3);
      const s1 = bX + 10;
      const s2 = s1 + statW + 6;
      const s3 = s2 + statW + 6;
      const statY = bY + (touchSafe ? 76 : 86);
      this.drawStat(ctx, s1, statY, 'VELOCIDADE', (car.maxSpeed - 190) / 115, '#FF5252', statW);
      this.drawStat(ctx, s2, statY, 'ACELERAÇÃO', car.acceleration, '#FFB300', statW);
      this.drawStat(ctx, s3, statY, 'CONTROLE', car.handling, '#00E676', statW);

      // Descrição do carro
      ctx.textAlign = 'center';
      ctx.fillStyle = '#B0BEC5';
      ctx.font = touchSafe ? '6.0px monospace' : '7.2px monospace';
      ctx.fillText(car.desc, INTERNAL_WIDTH / 2, bY + (touchSafe ? 98 : 110));

      const blink = Math.floor(now / 380) % 2 === 0;

      // BOTÃO ◀ VOLTAR
      const btnB = L.btnBack;
      if (btnB) {
        const backGrad = ctx.createLinearGradient(btnB.x, btnB.y, btnB.x, btnB.y + btnB.h);
        backGrad.addColorStop(0, '#2C3E50');
        backGrad.addColorStop(1, '#1A252F');
        ctx.fillStyle = backGrad;
        ctx.fillRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.fillStyle = '#ECF0F1';
        ctx.font = touchSafe ? 'bold 7.8px monospace' : 'bold 8.8px monospace';
        ctx.fillText('◀ VOLTAR [B]', btnB.x + btnB.w / 2, btnB.y + btnB.h / 2 + 3);
      }

      // BOTÃO ESCOLHER COR ▶
      const btnC = L.btnConfirm;
      if (btnC) {
        const confirmGrad = ctx.createLinearGradient(btnC.x, btnC.y, btnC.x, btnC.y + btnC.h);
        confirmGrad.addColorStop(0, blink ? '#00E5FF' : '#00B0FF');
        confirmGrad.addColorStop(1, blink ? '#0091EA' : '#005F9E');
        ctx.fillStyle = confirmGrad;
        ctx.fillRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.strokeStyle = blink ? '#FFFFFF' : '#FFD700';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.fillStyle = '#060D1A';
        ctx.font = touchSafe ? 'bold 7.8px monospace' : 'bold 8.8px monospace';
        ctx.fillText('ESCOLHER COR [A] ▶', btnC.x + btnC.w / 2, btnC.y + btnC.h / 2 + 3);
      }

      ctx.fillStyle = '#90A4AE';
      ctx.font = touchSafe ? '6.0px monospace' : '7.2px monospace';
      ctx.fillText(
        touchSafe
          ? '◄ ► ▲ ▼ TROCA CARRO | TOQUE NO CARRO | [3]/[A] ESCOLHER COR | [2]/[B] VOLTAR'
          : '◄ ► ▲ ▼ NAVEGA NOS 20 CARROS | CLIQUE NO CARRO | [A] / ENTER ESCOLHER COR | [B] VOLTAR',
        INTERNAL_WIDTH / 2,
        touchSafe ? 193 : 209
      );
      ctx.restore();
    }

    // ========================================================
    // RENDERIZAÇÃO DA ETAPA 2: ESCOLHA DE COR DO CARRO
    // ========================================================
    renderColorSelect(ctx) {
      const L = this.getColorSelectLayout();
      const touchSafe = L.touchSafe;

      // Fundo translúcido deixando a pista rolar suavemente atrás da garagem
      ctx.fillStyle = 'rgba(6, 9, 18, 0.85)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 9px monospace' : 'bold 11px monospace';
      ctx.fillText('GARAGEM LH44 — ESCOLHA A COR DA SUA MÁQUINA', INTERNAL_WIDTH / 2, touchSafe ? 11 : 12);

      const car = CAR_MODELS[this.selectedCarIndex];
      const color = CAR_COLORS[this.colorIndex];
      const now = performance.now();
      const { bW, bH, bX, bY, sw } = L;

      // Card principal de personalização
      const panelGrad = ctx.createLinearGradient(0, bY, 0, bY + bH);
      panelGrad.addColorStop(0, 'rgba(16, 22, 36, 0.96)');
      panelGrad.addColorStop(1, 'rgba(9, 13, 22, 0.98)');
      ctx.fillStyle = panelGrad;
      ctx.fillRect(bX, bY, bW, bH);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bX, bY, bW, bH);

      // Título do carro e cor ativa em destaque
      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 8.0px monospace' : 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[ ETAPA 2/2 ]  ${car.name} · PINTURA RACING`, INTERNAL_WIDTH / 2, bY + (touchSafe ? 12 : 14));

      // Botões laterais ◀ ▶ de navegação de cor
      const pulseX = Math.sin(now * 0.006) * 2;
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 16px monospace' : 'bold 20px monospace';
      ctx.fillText('◀', bX - 14 - pulseX, bY + bH / 2 + 5);
      ctx.fillText('▶', bX + bW + 14 + pulseX, bY + bH / 2 + 5);

      // Plataforma iluminada centralizada
      const platX = INTERNAL_WIDTH / 2;
      const platY = bY + (touchSafe ? 54 : 62);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.beginPath();
      ctx.ellipse(platX, platY, touchSafe ? 62 : 78, touchSafe ? 11 : 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(platX, platY, touchSafe ? 56 : 72, touchSafe ? 9 : 11.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Carro em exibição na cor selecionada
      car.render(
        ctx,
        platX,
        bY + (touchSafe ? 36 : 42),
        touchSafe ? 96 : 116,
        touchSafe ? 60 : 72,
        false,
        0,
        color.hex,
        {
          isNitro: false,
          wheelPhase: 0,
          isNight: true,
          speed: 0
        }
      );

      // Badge com o nome da cor selecionada
      const colIdxNum = (this.colorIndex + 1).toString().padStart(2, '0');
      const badgeY = bY + (touchSafe ? 72 : 82);
      ctx.fillStyle = 'rgba(6, 12, 22, 0.85)';
      ctx.fillRect(INTERNAL_WIDTH / 2 - 80, badgeY, 160, touchSafe ? 12 : 13);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(INTERNAL_WIDTH / 2 - 80, badgeY, 160, touchSafe ? 12 : 13);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${touchSafe ? 6.8 : 7.6}px monospace`;
      ctx.fillText(`COR ${colIdxNum} / 10 · ${color.name.toUpperCase()}`, INTERNAL_WIDTH / 2, badgeY + (touchSafe ? 8.5 : 9.5));

      // 10 Amostras circulares de cores com destaque pulsante
      if (sw) {
        for (let k = 0; k < sw.length; k++) {
          const s = sw[k];
          const selected = (s.i === this.colorIndex);

          if (selected) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r + 3.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 229, 255, 0.30)';
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r + (selected ? 1.0 : 0), 0, Math.PI * 2);
          ctx.fillStyle = CAR_COLORS[s.i].hex;
          ctx.fill();
          ctx.lineWidth = selected ? 1.8 : 1.0;
          ctx.strokeStyle = selected ? '#FFFFFF' : 'rgba(200, 215, 230, 0.55)';
          ctx.stroke();

          // Ponto de brilho interno se selecionada
          if (selected) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
          }

          // Número do atalho (1 a 10) abaixo de cada amostra
          ctx.fillStyle = selected ? '#FFD700' : '#64748B';
          ctx.font = `bold ${touchSafe ? 5.2 : 6.0}px monospace`;
          ctx.fillText(`${(s.i + 1) % 10}`, s.x, s.y + s.r + (touchSafe ? 8 : 9));
        }
      }

      const blink = Math.floor(now / 380) % 2 === 0;

      // BOTÃO ◀ VOLTAR AO CARRO
      const btnB = L.btnBack;
      if (btnB) {
        const backGrad = ctx.createLinearGradient(btnB.x, btnB.y, btnB.x, btnB.y + btnB.h);
        backGrad.addColorStop(0, '#2C3E50');
        backGrad.addColorStop(1, '#1A252F');
        ctx.fillStyle = backGrad;
        ctx.fillRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.fillStyle = '#ECF0F1';
        ctx.font = touchSafe ? 'bold 7.8px monospace' : 'bold 8.8px monospace';
        ctx.fillText('◀ VOLTAR [B]', btnB.x + btnB.w / 2, btnB.y + btnB.h / 2 + 3);
      }

      // BOTÃO CONFIRMAR COR ▶
      const btnC = L.btnConfirm;
      if (btnC) {
        const confirmGrad = ctx.createLinearGradient(btnC.x, btnC.y, btnC.x, btnC.y + btnC.h);
        confirmGrad.addColorStop(0, blink ? '#00E5FF' : '#00B0FF');
        confirmGrad.addColorStop(1, blink ? '#0091EA' : '#005F9E');
        ctx.fillStyle = confirmGrad;
        ctx.fillRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.strokeStyle = blink ? '#FFFFFF' : '#FFD700';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(btnC.x, btnC.y, btnC.w, btnC.h);
        ctx.fillStyle = '#060D1A';
        ctx.font = touchSafe ? 'bold 7.8px monospace' : 'bold 8.8px monospace';
        ctx.fillText('CONFIRMAR [A] ▶', btnC.x + btnC.w / 2, btnC.y + btnC.h / 2 + 3);
      }

      ctx.fillStyle = '#90A4AE';
      ctx.font = touchSafe ? '6.0px monospace' : '7.2px monospace';
      ctx.fillText(
        touchSafe
          ? '◄ ► TROCA COR | TOQUE NA COR | [3]/[A] CONFIRMAR | [2]/[B] VOLTAR'
          : '◄ ► ESCOLHE A COR | CLIQUE NA COR OU TECLAS [C]/[1-0] | [A] / ENTER CONFIRMAR | [B] VOLTAR',
        INTERNAL_WIDTH / 2,
        touchSafe ? 193 : 209
      );
      ctx.restore();
    }

    renderRaceSetup(ctx) {
      const L = this.getSetupLayout();
      const touchSafe = L.touchSafe;
      const now = performance.now();

      ctx.fillStyle = 'rgba(6, 9, 18, 0.85)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00E5FF';
      ctx.font = touchSafe ? 'bold 10px monospace' : 'bold 13px monospace';
      const def = TRACK_DEFINITIONS[this.trackIndex];
      const modeBadge = (this.gameMode === 'QUICK_RACE') ? '⚡ CORRIDA RÁPIDA' : `🏆 CAMPEONATO F1 (${this.trackIndex + 1}/${TRACK_DEFINITIONS.length})`;
      ctx.fillText(`PREPARAR — ${modeBadge}`, INTERNAL_WIDTH / 2, touchSafe ? 16 : 20);

      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 6.5px monospace' : 'bold 7.5px monospace';
      ctx.fillText(`CIRCUITO: ${def.name.toUpperCase()} (3 VOLTAS)`, INTERNAL_WIDTH / 2, touchSafe ? 26 : 31);

      // Grupo 1: horario / clima
      ctx.font = touchSafe ? 'bold 7.5px monospace' : 'bold 8.5px monospace';
      ctx.fillStyle = this.setupGroup === 0 ? '#FFD700' : '#90A4AE';
      ctx.fillText((this.setupGroup === 0 ? '\u25B6 ' : '') + 'HOR\u00C1RIO / CLIMA', INTERNAL_WIDTH / 2, L.label1Y);
      const chipFont = touchSafe ? 'bold 6.4px monospace' : 'bold 7.4px monospace';
      for (let k = 0; k < L.conds.length; k++) {
        const c = L.conds[k];
        const info = ENV_CONDITIONS[c.i];
        const selected = (info.id === this.envCond);
        ctx.fillStyle = selected ? 'rgba(255, 215, 0, 0.25)' : 'rgba(16, 24, 38, 0.92)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = selected ? '#FFD700' : 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = selected ? 1.5 : 1;
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = selected ? '#FFFFFF' : '#B0BEC5';
        ctx.font = chipFont;
        ctx.fillText(info.icon + ' ' + info.label, c.x + c.w / 2, c.y + c.h / 2 + 2.6);
      }

      // Grupo 2: musica
      ctx.font = touchSafe ? 'bold 7.5px monospace' : 'bold 8.5px monospace';
      ctx.fillStyle = this.setupGroup === 1 ? '#FFD700' : '#90A4AE';
      ctx.fillText((this.setupGroup === 1 ? '\u25B6 ' : '') + 'TRILHA SONORA', INTERNAL_WIDTH / 2, L.label2Y);
      const curSongIdx = (typeof this.songIndex === 'number' && this.songIndex >= 0 && this.songIndex < SONGS.length) ? this.songIndex : 0;
      for (let k = 0; k < L.songs.length; k++) {
        const c = L.songs[k];
        const selected = (c.i === curSongIdx);
        ctx.fillStyle = selected ? 'rgba(255, 215, 0, 0.25)' : 'rgba(16, 24, 38, 0.92)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = selected ? '#FFD700' : 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = selected ? 1.5 : 1;
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = selected ? '#FFFFFF' : '#B0BEC5';
        ctx.font = chipFont;
        ctx.fillText('\u266A ' + SONGS[c.i].name, c.x + c.w / 2, c.y + c.h / 2 + 2.6);
      }
      ctx.fillStyle = '#B0BEC5';
      ctx.font = touchSafe ? '6.3px monospace' : '7.5px monospace';
      const curSong = SONGS[curSongIdx] || SONGS[0];
      ctx.fillText(curSong.desc || '', INTERNAL_WIDTH / 2, L.descY);

      // Botões ◀ VOLTAR e ▶ INICIAR CORRIDA
      const blink = Math.floor(now / 350) % 2 === 0;
      const btnB = L.btnBack;
      if (btnB) {
        const backGrad = ctx.createLinearGradient(btnB.x, btnB.y, btnB.x, btnB.y + btnB.h);
        backGrad.addColorStop(0, '#2C3E50');
        backGrad.addColorStop(1, '#1A252F');
        ctx.fillStyle = backGrad;
        ctx.fillRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(btnB.x, btnB.y, btnB.w, btnB.h);
        ctx.fillStyle = '#ECF0F1';
        ctx.font = touchSafe ? 'bold 8px monospace' : 'bold 9px monospace';
        ctx.fillText('◀ VOLTAR [B]', btnB.x + btnB.w / 2, btnB.y + btnB.h / 2 + 3);
      }

      const btnS = L.startBtn;
      if (btnS) {
        const btnGrad = ctx.createLinearGradient(btnS.x, btnS.y, btnS.x, btnS.y + btnS.h);
        btnGrad.addColorStop(0, blink ? '#00E5FF' : '#00B0FF');
        btnGrad.addColorStop(1, blink ? '#0091EA' : '#005F9E');
        ctx.fillStyle = btnGrad;
        ctx.fillRect(btnS.x, btnS.y, btnS.w, btnS.h);
        ctx.strokeStyle = blink ? '#FFFFFF' : '#FFD700';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(btnS.x, btnS.y, btnS.w, btnS.h);
        ctx.fillStyle = '#060D1A';
        ctx.font = touchSafe ? 'bold 8px monospace' : 'bold 9.5px monospace';
        ctx.fillText('▶ INICIAR CORRIDA [A]', btnS.x + btnS.w / 2, btnS.y + btnS.h / 2 + 3);
      }

      ctx.fillStyle = '#90A4AE';
      ctx.font = touchSafe ? '6.3px monospace' : '7.5px monospace';
      ctx.fillText(touchSafe ? '[3]/[A] LARGAR | [2]/[B] VOLTAR | D-PAD/TOQUE NAVEGA' : '[ENTER]/[A] LARGAR CORRIDA | [ESC]/[B] VOLTAR | D-PAD SELECIONA', INTERNAL_WIDTH / 2, L.hintY);
      ctx.restore();
    }


    drawStat(ctx, x, y, label, ratio, color, w = 68) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 6.8px monospace';
      ctx.fillStyle = '#90A4AE';
      ctx.fillText(label, x, y);

      const h = 5.5;
      ctx.fillStyle = '#1B2432';
      ctx.fillRect(x, y + 3, w, h);
      const fillW = w * Math.max(0.1, Math.min(ratio, 1));
      ctx.fillStyle = color;
      ctx.fillRect(x, y + 3, fillW, h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x, y + 3, fillW, 1.5);
    }

    renderPauseMenu(ctx) {
      const touchSafe = this.input.touchControlsVisible;
      ctx.fillStyle = 'rgba(5, 8, 16, 0.82)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      const pW = touchSafe ? 222 : 238;
      const pH = 114;
      const pX = Math.round(INTERNAL_WIDTH / 2 - pW / 2);
      const pY = 46;

      ctx.save();
      ctx.fillStyle = 'rgba(14, 20, 32, 0.96)';
      ctx.fillRect(pX, pY, pW, pH);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pX, pY, pW, pH);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('⏸ CORRIDA PAUSADA', INTERNAL_WIDTH / 2, pY + 22);

      // Botão CONTINUAR destacado e interativo
      const btnW = pW - 28;
      const btnH = 22;
      const btnX = Math.round(INTERNAL_WIDTH / 2 - btnW / 2);
      const btnY = pY + 32;
      const blink = Math.floor(performance.now() / 320) % 2 === 0;
      ctx.fillStyle = blink ? '#0284C7' : '#0369A1';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = blink ? '#38BDF8' : '#7DD3FC';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText('▶ CONTINUAR CORRIDA (TOQUE AQUI)', INTERNAL_WIDTH / 2, btnY + 14);

      // Linha de áudio
      const audY = pY + 74;
      ctx.fillStyle = this.audio.enabled ? '#10B981' : '#EF4444';
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText(`🔊 ÁUDIO: ${this.audio.enabled ? 'LIGADO' : 'DESLIGADO'} (TOQUE / [M])`, INTERNAL_WIDTH / 2, audY);

      // Rodapé com atalhos de controle
      ctx.fillStyle = '#94A3B8';
      ctx.font = '7.5px monospace';
      ctx.fillText(touchSafe ? '[3] ACELERA / TOQUE CONTINUA | [⏸] VOLTA' : '[ENTER] / [P] / [ESC] — VOLTAR À PISTA', INTERNAL_WIDTH / 2, pY + 98);
      ctx.restore();
    }

    renderRaceResult(ctx) {
      const touchSafe = this.input.touchControlsVisible;
      ctx.fillStyle = 'rgba(5, 8, 16, 0.94)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      const def = TRACK_DEFINITIONS[this.trackIndex];

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 10.5px monospace' : 'bold 12px monospace';
      const resultTitle = (this.gameMode === 'QUICK_RACE')
        ? `🏁 BANDEIRADA — CORRIDA RÁPIDA (${def.name})`
        : `🏁 BANDEIRADA FINAL — ${def.name}`;
      ctx.fillText(resultTitle, INTERNAL_WIDTH / 2, 16);

      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 7.2px monospace';
      const resultSubtitle = (this.gameMode === 'QUICK_RACE')
        ? 'CLASSIFICAÇÃO OFICIAL DA PROVA (1º AO 20º)'
        : 'CLASSIFICAÇÃO OFICIAL & PONTUAÇÃO F1 (1º AO 10º)';
      ctx.fillText(resultSubtitle, INTERNAL_WIDTH / 2, 26);

      const ranked = this.lastRacePositions || this.cars;
      const colW = Math.min(182, Math.floor((INTERNAL_WIDTH - 20) / 2));
      const leftX = Math.floor((INTERNAL_WIDTH / 2) - colW - 3);
      const rightX = Math.floor((INTERNAL_WIDTH / 2) + 3);
      const tableY = 32;
      const rowH = 12.2;
      const headH = 12;

      const drawColumn = (colX, startRank, endRank, isPointsCol) => {
        const colH = headH + (endRank - startRank + 1) * rowH + 2;
        ctx.fillStyle = 'rgba(12, 18, 30, 0.94)';
        ctx.fillRect(colX, tableY, colW, colH);
        ctx.strokeStyle = isPointsCol ? 'rgba(0, 229, 255, 0.5)' : 'rgba(100, 120, 145, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(colX, tableY, colW, colH);

        // Barra de cabeçalho
        ctx.fillStyle = isPointsCol ? 'rgba(0, 229, 255, 0.15)' : 'rgba(100, 120, 145, 0.12)';
        ctx.fillRect(colX, tableY, colW, headH);

        ctx.font = 'bold 6.8px monospace';
        ctx.fillStyle = isPointsCol ? '#00E5FF' : '#90A4AE';
        ctx.textAlign = 'left';
        ctx.fillText('POS', colX + 4, tableY + 8.5);
        ctx.fillText('PILOTO', colX + 25, tableY + 8.5);
        ctx.fillText('CARRO', colX + 112, tableY + 8.5);
        ctx.textAlign = 'right';
        ctx.fillText('PTS', colX + colW - 4, tableY + 8.5);

        for (let r = startRank; r <= endRank; r++) {
          const car = ranked[r - 1];
          if (!car) continue;
          const y = tableY + headH + (r - startRank) * rowH;
          const isPlayer = car.isPlayer;
          const pts = (r <= F1_POINTS.length) ? F1_POINTS[r - 1] : 0;

          if (isPlayer) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.24)';
            ctx.fillRect(colX + 1, y, colW - 2, rowH - 0.5);
          } else if (r % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
            ctx.fillRect(colX + 1, y, colW - 2, rowH - 0.5);
          }

          let posColor = '#90A4AE';
          let nameColor = '#ECEFF1';
          if (isPlayer) {
            posColor = '#FFD700';
            nameColor = '#FFD700';
          } else if (r === 1) {
            posColor = '#FFD700';
            nameColor = '#FFE082';
          } else if (r === 2) {
            posColor = '#ECEFF1';
            nameColor = '#E0F7FA';
          } else if (r === 3) {
            posColor = '#CD7F32';
            nameColor = '#FFE0B2';
          } else if (r > 10) {
            nameColor = '#78909C';
          }

          ctx.font = isPlayer ? 'bold 7.2px monospace' : '7px monospace';
          ctx.textAlign = 'left';
          ctx.fillStyle = posColor;
          ctx.fillText(`${String(r).padStart(2, ' ')}º`, colX + 4, y + 8.5);

          ctx.fillStyle = nameColor;
          const displayName = isPlayer ? `VOCÊ [${car.driverCode}]` : `${car.driverName} [${car.driverCode}]`;
          ctx.fillText(displayName.slice(0, 16), colX + 25, y + 8.5);

          const mName = car.model?.name || '';
          const modelShort = mName.includes('UNO') ? 'UNO' : (mName.includes('FUSCA') ? 'FUSCA' : (mName.includes('206') ? '206' : (mName.includes('HB20') ? 'HB20' : mName.slice(0, 5))));
          ctx.fillStyle = isPlayer ? '#FFD700' : '#80CBC4';
          ctx.fillText(modelShort, colX + 112, y + 8.5);

          ctx.textAlign = 'right';
          ctx.fillStyle = pts > 0 ? (isPlayer ? '#FFD700' : '#69F0AE') : '#546E7A';
          ctx.fillText(pts > 0 ? `+${pts}` : '0', colX + colW - 4, y + 8.5);
        }
      };

      // Coluna 1 (1º ao 10º) e Coluna 2 (11º ao 20º)
      drawColumn(leftX, 1, 10, true);
      drawColumn(rightX, 11, 20, false);

      // Resumo do jogador
      const pRank = ranked.findIndex(c => c.isPlayer) + 1;
      const pPts = (pRank <= F1_POINTS.length) ? F1_POINTS[pRank - 1] : 0;
      const pTotal = this.championshipPoints[0];

      ctx.textAlign = 'center';
      ctx.font = 'bold 7.8px monospace';
      if (this.gameMode === 'QUICK_RACE') {
        ctx.fillStyle = pRank <= 3 ? '#69F0AE' : '#FFD700';
        ctx.fillText(`SEU RESULTADO: ${pRank}º LUGAR  |  CORRIDA RÁPIDA FINALIZADA!`, INTERNAL_WIDTH / 2, 178);
      } else {
        ctx.fillStyle = pPts > 0 ? '#69F0AE' : '#FFB74D';
        ctx.fillText(`SEU RESULTADO: ${pRank}º LUGAR (+${pPts} PTS)  |  TOTAL NO CAMPEONATO: ${pTotal} PTS`, INTERNAL_WIDTH / 2, 178);
      }

      const blink = Math.floor(performance.now() / 400) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#FFD700';
        ctx.font = touchSafe ? 'bold 8px monospace' : 'bold 9.5px monospace';
        let nextPrompt;
        if (this.gameMode === 'QUICK_RACE') {
          nextPrompt = touchSafe ? 'TOQUE / [3] — VOLTAR AO MENU' : 'PRESSIONE [ENTER] PARA VOLTAR AO MENU';
        } else {
          const hasNext = (this.trackIndex < TRACK_DEFINITIONS.length - 1);
          nextPrompt = touchSafe
            ? (hasNext ? 'TOQUE / [3] — PRÓXIMA ETAPA' : 'TOQUE / [3] — PÓDIO FINAL')
            : (hasNext ? 'PRESSIONE [ENTER] PARA A PRÓXIMA ETAPA' : 'PRESSIONE [ENTER] PARA VER O GRANDE PÓDIO E CAMPEÃO');
        }
        ctx.fillText(nextPrompt, INTERNAL_WIDTH / 2, 196);
      }
      ctx.restore();
    }

    renderChampionshipResult(ctx) {
      const touchSafe = this.input.touchControlsVisible;
      ctx.fillStyle = 'rgba(5, 8, 16, 0.95)';
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

      // Confete comemorativo animado
      this.renderConfetti(ctx);

      const overall = this.cars.map(c => ({
        car: c,
        points: this.championshipPoints[c.id]
      })).sort((a, b) => b.points - a.points);

      const first = overall[0];
      const second = overall[1];
      const third = overall[2];
      const pFinalRank = overall.findIndex(o => o.car.isPlayer) + 1;

      ctx.save();
      // Título
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = touchSafe ? 'bold 11px monospace' : 'bold 13px monospace';
      ctx.fillText('🏆 LH44 — PÓDIO FINAL DO CAMPEONATO 🏆', INTERNAL_WIDTH / 2, 18);

      const cx1 = INTERNAL_WIDTH / 2;
      const cx2 = cx1 - 92;
      const cx3 = cx1 + 92;

      // Desenha Bloco do Pódio (3D arcade box)
      const drawPodiumBlock = (cx, topY, w, h, rankNum, gradColors, strokeColor) => {
        const x = cx - w / 2;
        ctx.save();
        ctx.fillStyle = gradColors[0];
        ctx.fillRect(x, topY, w, 5);

        const g = ctx.createLinearGradient(0, topY + 5, 0, topY + h);
        g.addColorStop(0, gradColors[1]);
        g.addColorStop(1, gradColors[2]);
        ctx.fillStyle = g;
        ctx.fillRect(x, topY + 5, w, h - 5);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x, topY, w, h);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = `bold ${rankNum === 1 ? 22 : 17}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(rankNum), cx, topY + 5 + (h - 5) / 2);
        ctx.restore();
      };

      const getModelShort = (m) => {
        const n = m?.name || m || '';
        return n.includes('UNO') ? 'UNO' : (n.includes('FUSCA') ? 'FUSCA' : (n.includes('206') ? '206' : (n.includes('HB20') ? 'HB20' : n)));
      };

      // 2º Lugar (Esquerda)
      if (second) {
        drawPodiumBlock(cx2, 118, 76, 36, 2, ['#E2E8F0', '#94A3B8', '#475569'], '#CBD5E1');
        second.car.model.render(
          ctx, cx2, 104, 46, 28, false, 0, second.car.bodyColor,
          { isNitro: false, wheelPhase: 0, isNight: false, speed: 0 }
        );
        ctx.textAlign = 'center';
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText('🥈 2º LUGAR', cx2, 70);
        ctx.fillStyle = second.car.isPlayer ? '#FFD700' : '#FFFFFF';
        ctx.fillText(second.car.isPlayer ? `VOCÊ [${second.car.driverCode}]` : `${second.car.driverName} [${second.car.driverCode}]`, cx2, 80);
        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(`${second.points} PTS (${getModelShort(second.car.model)})`, cx2, 89);
      }

      // 3º Lugar (Direita)
      if (third) {
        drawPodiumBlock(cx3, 128, 76, 26, 3, ['#EDDCD2', '#B08968', '#7F4F24'], '#DDB892');
        third.car.model.render(
          ctx, cx3, 114, 46, 28, false, 0, third.car.bodyColor,
          { isNitro: false, wheelPhase: 0, isNight: false, speed: 0 }
        );
        ctx.textAlign = 'center';
        ctx.fillStyle = '#DDB892';
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText('🥉 3º LUGAR', cx3, 80);
        ctx.fillStyle = third.car.isPlayer ? '#FFD700' : '#FFFFFF';
        ctx.fillText(third.car.isPlayer ? `VOCÊ [${third.car.driverCode}]` : `${third.car.driverName} [${third.car.driverCode}]`, cx3, 90);
        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(`${third.points} PTS (${getModelShort(third.car.model)})`, cx3, 99);
      }

      // 1º Lugar (Centro - O CAMPEÃO)
      if (first) {
        drawPodiumBlock(cx1, 102, 86, 52, 1, ['#FFF3BF', '#F59F00', '#B45309'], '#FFD700');
        first.car.model.render(
          ctx, cx1, 86, 54, 34, false, 0, first.car.bodyColor,
          { isNitro: false, wheelPhase: 0, isNight: false, speed: 0 }
        );
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('👑 O GRANDE CAMPEÃO 👑', cx1, 48);
        ctx.fillStyle = first.car.isPlayer ? '#FFD700' : '#FFFFFF';
        ctx.fillText(first.car.isPlayer ? `VOCÊ [${first.car.driverCode}]` : `${first.car.driverName} [${first.car.driverCode}]`, cx1, 58);
        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText(`${first.points} PTS (${getModelShort(first.car.model)})`, cx1, 67);
      }

      // Mensagem da Temporada do Jogador
      ctx.textAlign = 'center';
      ctx.font = 'bold 8px monospace';
      const pPts = this.championshipPoints[0];
      if (pFinalRank === 1) {
        ctx.fillStyle = '#00E676';
        ctx.fillText(`🎉 HISTÓRICO! VOCÊ É O CAMPEÃO DA FÓRMULA BRASIL LH44 COM ${pPts} PTS! 🎉`, INTERNAL_WIDTH / 2, 168);
      } else if (pFinalRank <= 3) {
        ctx.fillStyle = '#00E5FF';
        ctx.fillText(`🍾 PARABÉNS! VOCÊ CONQUISTOU O PÓDIO FINAL EM ${pFinalRank}º LUGAR COM ${pPts} PTS! 🍾`, INTERNAL_WIDTH / 2, 168);
      } else {
        ctx.fillStyle = '#FFB74D';
        ctx.fillText(`FIM DE TEMPORADA: VOCÊ TERMINOU EM ${pFinalRank}º LUGAR GERAL COM ${pPts} PONTOS.`, INTERNAL_WIDTH / 2, 168);
      }

      // Resumo dos demais pontuadores (4º ao 10º)
      ctx.font = '6.8px monospace';
      ctx.fillStyle = '#90A4AE';
      const topRow = overall.slice(3, 10).map((o, idx) => `${idx + 4}º ${o.car.driverCode}:${o.points}`).join('  ');
      ctx.fillText(topRow, INTERNAL_WIDTH / 2, 180);

      const blink = Math.floor(performance.now() / 450) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#FFD700';
        ctx.font = touchSafe ? 'bold 8px monospace' : 'bold 9.5px monospace';
        const restartMsg = touchSafe ? 'TOQUE / [3] — INICIAR NOVO CAMPEONATO' : 'PRESSIONE [ENTER] PARA INICIAR NOVO CAMPEONATO';
        ctx.fillText(restartMsg, INTERNAL_WIDTH / 2, 198);
      }
      ctx.restore();
    }

    formatTime(sec) {
      if (!sec || isNaN(sec) || sec <= 0) return '00:00.00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 100);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    }

    gameLoop(now) {
      try {
        let frameTime = (now - this.lastTime) / 1000;
        if (frameTime > 0.1) frameTime = 0.1;
        this.lastTime = now;

        this.accumulator += frameTime;
        let steps = 0;
        while (this.accumulator >= this.fixedStep && steps < 4) {
          this.update(this.fixedStep);
          this.accumulator -= this.fixedStep;
          steps++;
        }
        if (steps >= 4) {
          this.accumulator = 0;
        }

        this.render();
      } catch (err) {
        console.error('LH44 GameLoop error:', err);
      } finally {
        requestAnimationFrame(this.boundGameLoop);
      }
    }
  }
