/**
 * LH44 - LOW TO HIGH SPEED
 * BootScene: Inicialização de pipelines de shaders, pré-carregamento e aquecimento de assets
 */

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Carrega as músicas de corrida e tema oficial
    this.load.audio('theme_title', 'songs/TITLE THEME.mp3');
    this.load.audio('track_brazil', 'songs/ONE SECOND AHEAD.mp3');
    this.load.audio('track_serra', 'songs/LAST TURN GLORY.mp3');
    this.load.audio('track_night', 'songs/FINAL LAP HERO.mp3');

    // Barra de progresso gráfica
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a101d, 1);
    bg.fillRect(0, 0, w, h);

    const titleText = this.add.text(w / 2, h / 2 - 25, 'LH44 - ARCADE RACING', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subText = this.add.text(w / 2, h / 2 + 30, 'CARREGANDO CIRCUITOS E MOTORES...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#FFB300'
    }).setOrigin(0.5);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a2638, 1);
    barBg.fillRoundedRect(w / 2 - 120, h / 2 + 5, 240, 10, 4);

    const progressBar = this.add.graphics();

    this.load.on('progress', (val) => {
      progressBar.clear();
      progressBar.fillStyle(0x00E5FF, 1);
      progressBar.fillRoundedRect(w / 2 - 120, h / 2 + 5, 240 * val, 10, 4);
    });
  }

  create() {
    // Registra pipelines pós-processamento WebGL se o renderer for WebGL
    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      try {
        const renderer = this.game.renderer;
        renderer.pipelines.addPostPipeline('CRTPipeline', CRTPipeline);
        renderer.pipelines.addPostPipeline('GlitchAberrationPipeline', GlitchAberrationPipeline);
      } catch (err) {
        console.warn('Shaders WebGL não puderam ser inicializados:', err);
      }
    }

    // Pré-aquece os sprites gerados proceduralmente de todos os 8 carros
    try {
      if (typeof CarArt !== 'undefined' && typeof CAR_MODELS !== 'undefined') {
        CarArt.warmUp(CAR_MODELS);
      }
    } catch (_) {}

    // Transição suave para a tela de título
    this.scene.start('TitleScene');
  }
}

