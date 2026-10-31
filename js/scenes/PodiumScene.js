/**
 * LH44 - LOW TO HIGH SPEED
 * PodiumScene: Cerimônia de Premiação, Pódio com Confetes WebGL e Classificação Oficial F1
 */

class PodiumScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PodiumScene' });
  }

  init(data) {
    this.rankedCars = data.rankedCars || [];
    this.trackIndex = data.trackIndex || 0;
    this.playerCar = data.playerCar || null;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      try { this.cameras.main.setPostPipeline('CRTPipeline'); } catch (_) {}
    }

    // Toca o tema musical de celebração
    try {
      const music = this.sound.add('theme_title', { loop: true, volume: 0.55 });
      music.play();
    } catch (_) {}

    // Fundo escuro esportivo
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a101f, 0x0a101f, 0x04060c, 0x04060c, 1);
    bg.fillRect(0, 0, w, h);

    // Chuva de confetes coloridos via emissor de partículas do Phaser
    this.createConfettiParticles(w, h);

    // Título do Pódio
    this.add.text(w / 2, 16, '🏆 RESULTADO OFICIAL DO GRANDE PRÊMIO', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#FFB300',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Destaque do 1º Lugar (Campeão da Etapa)
    const winner = this.rankedCars[0];
    if (winner) {
      const isPlayer = winner.isPlayer;
      const champBanner = isPlayer ? '🎉 VOCÊ VENCEU O GRANDE PRÊMIO! 🎉' : `VITÓRIA DE ${winner.driverName}!`;
      this.add.text(w / 2, 34, champBanner, {
        fontFamily: '"Courier New", monospace',
        fontSize: '10.5px',
        color: isPlayer ? '#00E5FF' : '#FFD54F',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // Tabela dos 10 Primeiros Colocados (Zona de Pontuação da Fórmula 1)
    this.createResultsTable(w, h);

    // Botão de Avançar
    const nextBtn = this.add.text(w / 2, h - 20, '► CONTINUAR CAMPEONATO ◄', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#FFFFFF',
      backgroundColor: '#00B4D844',
      padding: { left: 14, right: 14, top: 6, bottom: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const proceed = () => {
      this.sound.stopAll();
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        // Se ainda há pistas no campeonato, vai para a próxima; senão volta à garagem
        window.selectedTrackIndex = ((this.trackIndex + 1) % TRACK_DEFINITIONS.length);
        this.scene.start('TrackSelectScene');
      });
    };

    nextBtn.on('pointerdown', proceed);
    this.input.keyboard.on('keydown-ENTER', proceed);
    this.input.keyboard.on('keydown-SPACE', proceed);
  }

  createConfettiParticles(w, h) {
    const colors = [0xff1744, 0x00e5ff, 0xffb300, 0x00e676, 0xffffff];

    colors.forEach(col => {
      this.add.particles(0, 0, null, {
        x: { min: 0, max: w },
        y: -10,
        speedY: { min: 60, max: 140 },
        speedX: { min: -25, max: 25 },
        scale: { min: 1.5, max: 3.5 },
        alpha: { start: 1, end: 0.6 },
        tint: col,
        lifespan: 4000,
        frequency: 90
      });
    });
  }

  createResultsTable(w, h) {
    const tableX = w * 0.12;
    const tableY = 52;
    const tableW = w * 0.76;
    const rowH = 12.5;

    // Cabeçalho da Tabela
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x182436, 0.9);
    headerBg.fillRect(tableX, tableY, tableW, 14);

    this.add.text(tableX + 8, tableY + 2, 'POS', { fontFamily: 'monospace', fontSize: '7.5px', color: '#00E5FF' });
    this.add.text(tableX + 38, tableY + 2, 'PILOTO', { fontFamily: 'monospace', fontSize: '7.5px', color: '#00E5FF' });
    this.add.text(tableX + 130, tableY + 2, 'CARRO', { fontFamily: 'monospace', fontSize: '7.5px', color: '#00E5FF' });
    this.add.text(tableX + 215, tableY + 2, 'PONTOS', { fontFamily: 'monospace', fontSize: '7.5px', color: '#00E5FF' });

    // 10 Primeiros da Classificação
    const displayCount = Math.min(10, this.rankedCars.length);

    for (let i = 0; i < displayCount; i++) {
      const car = this.rankedCars[i];
      const isPlayer = car.isPlayer;
      const ry = tableY + 16 + i * rowH;

      const rowBg = this.add.graphics();
      if (isPlayer) {
        rowBg.fillStyle(0x00e5ff, 0.22);
        rowBg.fillRect(tableX, ry, tableW, rowH - 1);
        rowBg.lineStyle(1, 0x00e5ff, 0.8);
        rowBg.strokeRect(tableX, ry, tableW, rowH - 1);
      } else if (i % 2 === 0) {
        rowBg.fillStyle(0x101726, 0.5);
        rowBg.fillRect(tableX, ry, tableW, rowH - 1);
      }

      const txtCol = isPlayer ? '#FFFFFF' : (i === 0 ? '#FFD700' : '#CBD5E1');
      const pts = (i < F1_POINTS.length) ? `+${F1_POINTS[i]} PTS` : '-';

      this.add.text(tableX + 8, ry + 2, `${i + 1}º`, {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: i === 0 ? '#FFD700' : txtCol,
        fontStyle: isPlayer ? 'bold' : 'normal'
      });

      this.add.text(tableX + 38, ry + 2, `${car.driverCode} ${car.driverName}`, {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: txtCol,
        fontStyle: isPlayer ? 'bold' : 'normal'
      });

      this.add.text(tableX + 130, ry + 2, car.model ? car.model.name : 'RIVAL', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: isPlayer ? '#FFB300' : '#8899A6'
      });

      this.add.text(tableX + 215, ry + 2, pts, {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: '#00E676',
        fontStyle: 'bold'
      });
    }
  }
}

