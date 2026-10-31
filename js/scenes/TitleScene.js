/**
 * LH44 - LOW TO HIGH SPEED
 * TitleScene: Abertura arcade retrô com partículas WebGL, logo luminoso e música tema
 */

class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // PostFX CRT na câmera
    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      try {
        this.cameras.main.setPostPipeline('CRTPipeline');
      } catch (_) {}
    }

    // Toca a música tema com loop e crossfade
    if (!this.sound.get('theme_title')) {
      try {
        const music = this.sound.add('theme_title', { loop: true, volume: 0.55 });
        music.play();
      } catch (_) {}
    } else {
      const music = this.sound.get('theme_title');
      if (!music.isPlaying) music.play();
    }

    // Fundo gradiente dinâmico com estrelas/partículas
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050b18, 0x050b18, 0x1a0928, 0x1a0928, 1);
    bg.fillRect(0, 0, w, h);

    // Efeito de estrada em perspectiva rolando no fundo
    this.createBackgroundRoad(w, h);

    // Emissor de partículas de velocidade estilo Arcade no fundo
    this.createSpeedParticles(w, h);

    // Logotipo estilizado LH44 com tweens de escala e brilho
    const logoContainer = this.add.container(w / 2, h * 0.32);

    const titleShadow = this.add.text(4, 4, 'LH44', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '78px',
      color: '#003366',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const titleMain = this.add.text(0, 0, 'LH44', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '78px',
      color: '#00E5FF',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const subtitleShadow = this.add.text(2, 42, 'LOW TO HIGH SPEED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      color: '#551100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subtitleMain = this.add.text(0, 40, 'LOW TO HIGH SPEED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      color: '#FFB300',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    logoContainer.add([titleShadow, titleMain, subtitleShadow, subtitleMain]);

    // Animação sutil de flutuação no logotipo
    this.tweens.add({
      targets: logoContainer,
      y: h * 0.32 - 6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Subtítulo do criador Leandro Yata
    this.add.text(w / 2, h * 0.50, 'EDITION 2026 • RETRO F1 CHAMPIONSHIP', {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      color: '#A0C4E2'
    }).setOrigin(0.5);

    // Botão de Início Piscante
    const startText = this.add.text(w / 2, h * 0.72, '► TOQUE OU PRESSIONE ENTER ◄', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      color: '#FFFFFF',
      backgroundColor: '#00E5FF22',
      padding: { left: 16, right: 16, top: 8, bottom: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startText,
      alpha: 0.25,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    // Ações para avançar para a Garagem
    const advance = () => {
      this.sound.play('theme_title', { volume: 0 }); // Interação de áudio permitida
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GarageScene');
      });
    };

    startText.on('pointerdown', advance);
    this.input.keyboard.on('keydown-ENTER', advance);
    this.input.keyboard.on('keydown-SPACE', advance);

    // Suporte nativo ao botão A do controle (Gamepad)
    this.input.gamepad.once('down', advance);

    // Rodapé de créditos
    this.add.text(w / 2, h - 14, 'Desenvolvido por Leandro Yata - 2026 - (75) 99190-2534', {
      fontFamily: '"Courier New", monospace',
      fontSize: '8.5px',
      color: '#657B9A'
    }).setOrigin(0.5);
  }

  createBackgroundRoad(w, h) {
    const horizonY = h * 0.58;
    const road = this.add.graphics();

    road.fillStyle(0x182030, 1);
    road.beginPath();
    road.moveTo(w * 0.44, horizonY);
    road.lineTo(w * 0.56, horizonY);
    road.lineTo(w * 0.95, h);
    road.lineTo(w * 0.05, h);
    road.closePath();
    road.fill();

    // Zebras animadas
    this.roadTime = 0;
  }

  createSpeedParticles(w, h) {
    // Partículas leves subindo na tela para dar sensação de arcade vivo
    const particles = this.add.particles(0, 0, null, {
      x: { min: 0, max: w },
      y: h + 10,
      speedY: { min: -40, max: -90 },
      speedX: { min: -10, max: 10 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 3500,
      frequency: 180,
      blendMode: 'ADD'
    });
  }
}

