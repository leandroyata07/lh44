/**
 * LH44 - LOW TO HIGH SPEED (PHASER 3 EDITION)
 * RaceScene: Execução da corrida, integração do motor Pseudo-3D, Shaders GLSL,
 * Rádio do Engenheiro de Pista, Retrovisor Funcional e Partículas WebGL.
 */

class RaceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RaceScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Configura os pipelines de Shaders WebGL pós-processamento
    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      try {
        this.cameras.main.setPostPipeline('CRTPipeline');
        this.glitchPipeline = this.renderer.pipelines.getPostPipeline('GlitchAberrationPipeline');
      } catch (_) {}
    }

    // Inicializa a instância do motor de corrida retrô LH44
    this.gameEngine = new LH44RacingGame();
    this.gameEngine.selectedCarIndex = window.selectedCarIndex || 0;
    this.gameEngine.colorIndex = window.selectedColorIndex || 0;
    this.gameEngine.trackIndex = window.selectedTrackIndex || 0;
    this.gameEngine.envCond = window.selectedEnvCond || 'DIA';
    this.gameEngine.playerName = localStorage.getItem('lh44_player_name') || 'LEANDRO';

    // Inicializa o sistema de rádio do engenheiro de equipe
    this.radio = new PitRadio(this.gameEngine.audio);
    this.gameEngine.radio = this.radio;

    // Carrega a pista selecionada e monta o grid de largada
    this.gameEngine.loadTrack(this.gameEngine.trackIndex);
    this.gameEngine.startRaceCountdown();

    // Canvas Texture para renderizar os gráficos do motor dentro do Phaser
    this.renderCanvas = this.gameEngine.canvas;
    this.renderTexture = this.textures.addCanvas('race_canvas_texture', this.renderCanvas);
    this.raceImage = this.add.image(w / 2, h / 2, 'race_canvas_texture')
      .setDisplaySize(w, h);

    // Sistema de som da pista via Phaser Sound
    this.setupTrackMusic();

    // Sistema de partículas de chuva/neve via GPU WebGL do Phaser
    this.setupWeatherParticles(w, h);

    // Mensagem de rádio na largada
    this.time.delayedCall(1200, () => {
      this.radio.speak('Atenção no grid! Mantenha o giro alto!', false);
    });

    // Tecla ESC para pausar a corrida
    this.input.keyboard.on('keydown-ESC', () => {
      this.pauseGame();
    });

    // Botão de pausa na barra utilitária
    const pauseBtn = document.getElementById('pause-touch-btn');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.pauseGame();
    }

    this.aberrationTimer = 0;
  }

  setupTrackMusic() {
    const trackIdx = this.gameEngine.trackIndex;
    let trackKey = 'track_brazil';
    if (trackIdx === 1) trackKey = 'track_serra';
    else if (trackIdx === 2) trackKey = 'track_night';

    try {
      this.music = this.sound.add(trackKey, { loop: true, volume: 0.52 });
      this.music.play();
    } catch (_) {}
  }

  setupWeatherParticles(w, h) {
    const env = this.gameEngine.envCond;
    if (env === 'CHUVA') {
      this.weatherParticles = this.add.particles(0, 0, null, {
        x: { min: -50, max: w + 50 },
        y: -10,
        speedY: { min: 280, max: 480 },
        speedX: { min: -80, max: -40 },
        scaleY: { min: 4, max: 8 },
        scaleX: 1,
        alpha: { start: 0.45, end: 0.1 },
        lifespan: 1200,
        frequency: 18,
        blendMode: 'ADD'
      });
    } else if (env === 'NEVE') {
      this.weatherParticles = this.add.particles(0, 0, null, {
        x: { min: 0, max: w },
        y: -10,
        speedY: { min: 40, max: 80 },
        speedX: { min: -20, max: 20 },
        scale: { min: 1.2, max: 2.4 },
        alpha: { start: 0.8, end: 0.2 },
        lifespan: 3000,
        frequency: 45
      });
    }
  }

  triggerGlitchImpact(intensity = 0.015, durationMs = 280) {
    if (this.glitchPipeline) {
      this.glitchPipeline.offset = intensity;
      this.aberrationTimer = durationMs;
    }
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);

    // Atualiza o motor da corrida
    this.gameEngine.update(dt);

    // Atualiza o rádio do engenheiro
    this.radio.update(dt);

    // Efeito de aberração cromática ao bater ou acionar nitro
    if (this.aberrationTimer > 0) {
      this.aberrationTimer -= delta;
      if (this.aberrationTimer <= 0 && this.glitchPipeline) {
        this.glitchPipeline.offset = 0.0;
      }
    } else if (this.gameEngine.player && this.gameEngine.player.isNitro) {
      if (this.glitchPipeline) this.glitchPipeline.offset = 0.005 + Math.random() * 0.003;
    } else if (this.gameEngine.shake > 1.2) {
      this.triggerGlitchImpact(0.012, 180);
    }

    // Renderiza a cena no Canvas 2D interno
    this.gameEngine.render();

    // Renderiza o Retrovisor Funcional e o Rádio sobre o Canvas da corrida
    const ctx = this.gameEngine.ctx;
    this.renderRearViewMirror(ctx);
    this.radio.render(ctx, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    // Atualiza a textura do Phaser
    this.renderTexture.refresh();

    // Verifica se a corrida acabou para ir ao Pódio
    if (this.gameEngine.state === 'RACE_RESULT' || (this.gameEngine.player && this.gameEngine.player.laps >= TOTAL_LAPS)) {
      this.finishAndGoToPodium();
    }
  }

  renderRearViewMirror(ctx) {
    // Espelho Retrovisor Funcional no Topo Central do HUD (estilo F1 e Top Gear)
    const mirrorW = 76;
    const mirrorH = 17;
    const mirrorX = (INTERNAL_WIDTH - mirrorW) / 2;
    const mirrorY = 5;

    ctx.save();
    // Moldura aerodinâmica do espelho
    ctx.fillStyle = '#080C14';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(mirrorX, mirrorY, mirrorW, mirrorH, 3);
    ctx.fill();
    ctx.stroke();

    // Reflexo do asfalto no espelho
    ctx.fillStyle = '#181E29';
    ctx.fillRect(mirrorX + 1.5, mirrorY + 1.5, mirrorW - 3, mirrorH - 3);

    // Pista e linha central no espelho
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(mirrorX + mirrorW / 2, mirrorY + mirrorH);
    ctx.lineTo(mirrorX + mirrorW / 2, mirrorY + 2);
    ctx.stroke();

    // Projeta os carros rivais que estão logo ATRÁS do jogador
    const p = this.gameEngine.player;
    if (p) {
      for (let i = 0; i < this.gameEngine.cars.length; i++) {
        const bot = this.gameEngine.cars[i];
        if (bot.isPlayer) continue;

        // dz > 0: rival está atrás do jogador
        const dz = this.gameEngine.shortestDeltaZ(p.z, bot.z);
        if (dz > 0 && dz < 600) {
          const proxRatio = 1 - (dz / 600); // 1 = colado na traseira, 0 = longe
          const carDotW = Math.max(3, 11 * proxRatio);
          const carDotH = Math.max(2, 6 * proxRatio);
          // Inverte o eixo X porque é um espelho
          const mirrorCarX = (mirrorX + mirrorW / 2) - (bot.x - p.x) * (mirrorW * 0.42);
          const mirrorCarY = mirrorY + mirrorH - (proxRatio * (mirrorH - 3));

          // Desenha o carro rival aproximando no espelho
          ctx.fillStyle = bot.bodyColor || '#FF1744';
          ctx.fillRect(mirrorCarX - carDotW / 2, mirrorCarY - carDotH / 2, carDotW, carDotH);

          // Faróis acesos do rival se aproximando
          ctx.fillStyle = '#FFF9A6';
          ctx.fillRect(mirrorCarX - carDotW * 0.4, mirrorCarY, 1.2, 1.2);
          ctx.fillRect(mirrorCarX + carDotW * 0.4 - 1.2, mirrorCarY, 1.2, 1.2);
        }
      }
    }

    ctx.restore();
  }

  pauseGame() {
    this.scene.launch('PauseScene', { raceScene: this });
    this.scene.pause();
    if (this.music) this.music.pause();
    this.gameEngine.audio.silenceEffects();
  }

  finishAndGoToPodium() {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.radio.speak('Bandeira quadriculada! Corrida finalizada!', true);

    if (this.music) {
      this.tweens.add({
        targets: this.music,
        volume: 0,
        duration: 800,
        onComplete: () => this.music.stop()
      });
    }

    this.time.delayedCall(1500, () => {
      const rankedCars = this.gameEngine.getRankedCars();
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('PodiumScene', {
          rankedCars: rankedCars,
          trackIndex: this.gameEngine.trackIndex,
          playerCar: this.gameEngine.player
        });
      });
    });
  }
}

