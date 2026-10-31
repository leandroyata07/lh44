/**
 * LH44 - LOW TO HIGH SPEED
 * TrackSelectScene: Seleção de circuitos do campeonato e ajuste de condições climáticas
 */

class TrackSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TrackSelectScene' });
  }

  init() {
    this.selectedTrackIndex = window.selectedTrackIndex || 0;
    this.selectedEnvIndex = window.selectedEnvIndex || 0;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      try { this.cameras.main.setPostPipeline('CRTPipeline'); } catch (_) {}
    }

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070c16, 0x070c16, 0x020408, 0x020408, 1);
    bg.fillRect(0, 0, w, h);

    // Título Superior
    this.add.text(w / 2, 16, '🏁 SELEÇÃO DE CIRCUITO & CLIMA', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#00E5FF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Painel do Minimapa da Pista à Esquerda
    this.mapGraphics = this.add.graphics();

    // Botões de navegação de Pista
    const prevTrackBtn = this.add.text(w * 0.06, h * 0.44, '◀', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#00E5FF'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const nextTrackBtn = this.add.text(w * 0.48, h * 0.44, '▶', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#00E5FF'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    prevTrackBtn.on('pointerdown', () => this.changeTrack(-1));
    nextTrackBtn.on('pointerdown', () => this.changeTrack(1));

    // Informações da Pista à Direita
    const infoX = w * 0.54;
    const infoY = 44;

    this.trackNameText = this.add.text(infoX, infoY, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      color: '#FFB300',
      fontStyle: 'bold'
    });

    this.trackDescText = this.add.text(infoX, infoY + 22, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      color: '#A0B4C8',
      wordWrap: { width: w * 0.42 }
    });

    // Seletor de Clima
    this.createWeatherSelector(w, h, infoX, infoY + 68);

    // Dica de Pista
    this.trackTipText = this.add.text(infoX, infoY + 125, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '7.5px',
      color: '#00E5FF',
      wordWrap: { width: w * 0.42 }
    });

    // Botões de Ação no Rodapé
    const backBtn = this.add.text(w * 0.22, h - 22, '◀ VOLTAR À GARAGEM', {
      fontFamily: '"Courier New", monospace',
      fontSize: '9.5px',
      color: '#90A4AE'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const startRaceBtn = this.add.text(w * 0.72, h - 22, '► LARGADA DA CORRIDA ◄', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#FFFFFF',
      backgroundColor: '#00E5FF44',
      padding: { left: 14, right: 14, top: 6, bottom: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.cameras.main.fade(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('GarageScene'));
    });

    startRaceBtn.on('pointerdown', () => this.startRace());

    // Teclas de navegação
    this.input.keyboard.on('keydown-LEFT', () => this.changeTrack(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.changeTrack(1));
    this.input.keyboard.on('keydown-UP', () => this.changeEnv(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.changeEnv(1));
    this.input.keyboard.on('keydown-ENTER', () => this.startRace());
    this.input.keyboard.on('keydown-SPACE', () => this.startRace());
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('GarageScene');
    });

    this.updateTrackDisplay();
  }

  createWeatherSelector(w, h, startX, startY) {
    this.add.text(startX, startY, 'CONDIÇÃO CLIMÁTICA:', {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      color: '#FFB300'
    });

    this.weatherButtons = [];
    const envs = ENV_CONDITIONS;
    const btnW = 34;
    const btnH = 22;

    envs.forEach((env, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const bx = startX + col * (btnW + 4);
      const by = startY + 14 + row * (btnH + 4);

      const btnBg = this.add.graphics();
      const txt = this.add.text(bx + btnW / 2, by + btnH / 2, `${env.icon}\n${env.label.slice(0, 3)}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '6.5px',
        color: '#FFFFFF',
        align: 'center'
      }).setOrigin(0.5);

      const hitZone = this.add.zone(bx + btnW / 2, by + btnH / 2, btnW, btnH)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerdown', () => {
        this.selectedEnvIndex = idx;
        this.updateWeatherDisplay();
      });

      this.weatherButtons.push({ bg: btnBg, text: txt, x: bx, y: by, w: btnW, h: btnH });
    });
  }

  changeTrack(dir) {
    this.selectedTrackIndex = (this.selectedTrackIndex + dir + TRACK_DEFINITIONS.length) % TRACK_DEFINITIONS.length;
    this.updateTrackDisplay();
  }

  changeEnv(dir) {
    this.selectedEnvIndex = (this.selectedEnvIndex + dir + ENV_CONDITIONS.length) % ENV_CONDITIONS.length;
    this.updateWeatherDisplay();
  }

  updateTrackDisplay() {
    const def = TRACK_DEFINITIONS[this.selectedTrackIndex];
    this.trackNameText.setText(def.name);

    const trackDescriptions = [
      'Circuito oficial do Brasil. Curvas em descida, freadas técnicas no S do Senna e uma reta longa com subida desafiadora.',
      'Sinuosa serra com aclives e declives radicais. Curvas fechadas entre despenhadeiros que exigem precisão no volante.',
      'Circuito noturno iluminado por arranha-céus e neon. Asfalto rápido e fluido que favorece carros velozes de ponta.'
    ];

    const trackTips = [
      '💡 DICA: Use o vácuo dos adversários na Reta dos Boxes para ganhar velocidade máxima.',
      '💡 DICA: Em descidas acentuadas a velocidade ultrapassa os 280 km/h. Cuidado na freada da curva!',
      '💡 DICA: Faróis acesos na noite refletem o asfalto. Mantenha os olhos nas zebras luminosas.'
    ];

    this.trackDescText.setText(trackDescriptions[this.selectedTrackIndex] || '');
    this.trackTipText.setText(trackTips[this.selectedTrackIndex] || '');

    this.drawCircuitMap(def);
    this.updateWeatherDisplay();
  }

  drawCircuitMap(def) {
    const g = this.mapGraphics;
    g.clear();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const mapBoxX = w * 0.12;
    const mapBoxY = h * 0.22;
    const mapBoxW = w * 0.32;
    const mapBoxH = h * 0.52;

    // Moldura do minimapa
    g.fillStyle(0x0c1422, 0.9);
    g.fillRoundedRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH, 6);
    g.lineStyle(1.5, 0x00e5ff, 0.4);
    g.strokeRoundedRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH, 6);

    // Gera o traçado da pista usando o TrackBuilder
    const trackData = TrackBuilder.build(def);
    const pts = trackData.mapPoints;

    if (pts && pts.length > 0) {
      // Traçado do asfalto
      g.lineStyle(4, 0x1f2e46, 1);
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const px = mapBoxX + 12 + pts[i].x * (mapBoxW - 24);
        const py = mapBoxY + 12 + pts[i].z * (mapBoxH - 24);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();

      // Linha central neon
      g.lineStyle(1.5, 0x00e5ff, 1);
      g.stroke();

      // Marcador da linha de largada
      const startPt = pts[START_LINE_SEG % pts.length];
      const sx = mapBoxX + 12 + startPt.x * (mapBoxW - 24);
      const sy = mapBoxY + 12 + startPt.z * (mapBoxH - 24);

      g.fillStyle(0xffffff, 1);
      g.fillRect(sx - 3, sy - 3, 6, 6);
    }
  }

  updateWeatherDisplay() {
    this.weatherButtons.forEach((b, idx) => {
      b.bg.clear();
      const isSelected = (idx === this.selectedEnvIndex);
      b.bg.fillStyle(isSelected ? 0x00e5ff : 0x1a2436, isSelected ? 0.35 : 0.6);
      b.bg.fillRoundedRect(b.x, b.y, b.w, b.h, 3);
      b.bg.lineStyle(1.2, isSelected ? 0x00e5ff : 0x334460, 1);
      b.bg.strokeRoundedRect(b.x, b.y, b.w, b.h, 3);
    });
  }

  startRace() {
    window.selectedTrackIndex = this.selectedTrackIndex;
    window.selectedEnvCond = ENV_CONDITIONS[this.selectedEnvIndex].id;

    // Para a música tema suavemente
    const titleMusic = this.sound.get('theme_title');
    if (titleMusic && titleMusic.isPlaying) {
      this.tweens.add({
        targets: titleMusic,
        volume: 0,
        duration: 400,
        onComplete: () => titleMusic.stop()
      });
    }

    this.cameras.main.fade(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.start('RaceScene');
    });
  }
}

