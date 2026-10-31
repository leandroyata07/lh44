/**
 * LH44 - LOW TO HIGH SPEED
 * GarageScene: Seleção de bólidos lendários, personalização de cor e atributos
 */

class GarageScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GarageScene' });
  }

  init() {
    this.selectedCarIndex = window.selectedCarIndex || 0;
    this.selectedColorIndex = window.selectedColorIndex || 0;
    this.playerName = localStorage.getItem('lh44_player_name') || 'LEANDRO';
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      try { this.cameras.main.setPostPipeline('CRTPipeline'); } catch (_) {}
    }

    // Fundo da Garagem com luz de teto focal
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0e1422, 0x0e1422, 0x05080e, 0x05080e, 1);
    bg.fillRect(0, 0, w, h);

    // Grid de piso de oficina quadriculado em perspectiva
    this.drawWorkshopFloor(bg, w, h);

    // Barra de Título Superior
    this.add.text(w / 2, 16, '🏎️ GARAGEM & ESCOLHA DO CARRO', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#00E5FF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Plataforma do Carro (Canvas dinâmico onde o sprite HD é exibido)
    this.carCanvas = document.createElement('canvas');
    this.carCanvas.width = 180;
    this.carCanvas.height = 110;
    this.carCtx = this.carCanvas.getContext('2d');

    this.carTexture = this.textures.addCanvas('garage_car_preview', this.carCanvas);
    this.carSprite = this.add.image(w * 0.32, h * 0.44, 'garage_car_preview');

    // Botões de navegação de Carros (Esquerda / Direita)
    const prevCarBtn = this.add.text(w * 0.08, h * 0.44, '◀', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#00E5FF'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const nextCarBtn = this.add.text(w * 0.56, h * 0.44, '▶', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#00E5FF'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    prevCarBtn.on('pointerdown', () => this.changeCar(-1));
    nextCarBtn.on('pointerdown', () => this.changeCar(1));

    // Painel de Informações e Estatísticas à Direita
    this.createStatsPanel(w, h);

    // Seletor de Cores no Rodapé do Carro
    this.createColorSelector(w, h);

    // Botão de Avançar para a Pista
    const startBtn = this.add.text(w / 2, h - 22, '► CONFIRMAR E SELECIONAR PISTA ◄', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#FFFFFF',
      backgroundColor: '#00B4D844',
      padding: { left: 14, right: 14, top: 6, bottom: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => this.proceedToTrackSelect());

    // Teclas de atalho
    this.input.keyboard.on('keydown-LEFT', () => this.changeCar(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.changeCar(1));
    this.input.keyboard.on('keydown-UP', () => this.changeColor(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.changeColor(1));
    this.input.keyboard.on('keydown-ENTER', () => this.proceedToTrackSelect());
    this.input.keyboard.on('keydown-SPACE', () => this.proceedToTrackSelect());

    this.updateCarDisplay();
  }

  drawWorkshopFloor(g, w, h) {
    const horizonY = h * 0.46;
    // Piso de oficina
    g.fillStyle(0x131824, 1);
    g.fillRect(0, horizonY, w, h - horizonY);

    // Luz de holofote cônica
    g.fillStyle(0x00e5ff, 0.04);
    g.beginPath();
    g.moveTo(w * 0.32, 0);
    g.lineTo(w * 0.52, horizonY + 50);
    g.lineTo(w * 0.12, horizonY + 50);
    g.closePath();
    g.fill();
  }

  createStatsPanel(w, h) {
    const startX = w * 0.65;
    const startY = 40;

    this.carNameText = this.add.text(startX, startY, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#FFB300',
      fontStyle: 'bold'
    });

    this.carBadgeText = this.add.text(startX, startY + 16, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      color: '#00E5FF'
    });

    this.carDescText = this.add.text(startX, startY + 28, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '7.5px',
      color: '#B0C2D4',
      wordWrap: { width: w * 0.32 }
    });

    // Barras de atributos
    this.statBars = {};
    const stats = [
      { key: 'maxSpeed', label: 'VEL. MÁXIMA', color: 0x00e5ff },
      { key: 'acceleration', label: 'ARRANCADA', color: 0xffb300 },
      { key: 'braking', label: 'FRENAGEM', color: 0xff1744 },
      { key: 'handling', label: 'CURVA / GRIP', color: 0x00e676 }
    ];

    let statY = startY + 76;
    stats.forEach(st => {
      this.add.text(startX, statY, st.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '7px',
        color: '#E2E8F0'
      });

      const barBg = this.add.graphics();
      barBg.fillStyle(0x202b3a, 1);
      barBg.fillRoundedRect(startX, statY + 9, w * 0.28, 5, 2);

      const barFill = this.add.graphics();
      this.statBars[st.key] = { fill: barFill, x: startX, y: statY + 9, maxW: w * 0.28, color: st.color };

      statY += 21;
    });
  }

  createColorSelector(w, h) {
    const selY = h * 0.72;
    this.add.text(w * 0.32, selY - 14, 'COR DA PINTURA:', {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      color: '#8CA0B8'
    }).setOrigin(0.5);

    this.colorDots = [];
    const dotSpacing = 22;
    const startX = w * 0.32 - ((CAR_COLORS.length - 1) * dotSpacing) / 2;

    CAR_COLORS.forEach((col, idx) => {
      const x = startX + idx * dotSpacing;
      const dot = this.add.circle(x, selY + 2, 6, Phaser.Display.Color.HexStringToColor(col.hex).color)
        .setInteractive({ useHandCursor: true });

      const ring = this.add.circle(x, selY + 2, 8)
        .setStrokeStyle(1.5, 0xffffff, 0);

      dot.on('pointerdown', () => {
        this.selectedColorIndex = idx;
        this.updateCarDisplay();
      });

      this.colorDots.push({ dot, ring });
    });
  }

  changeCar(dir) {
    this.selectedCarIndex = (this.selectedCarIndex + dir + CAR_MODELS.length) % CAR_MODELS.length;
    // Seleciona a cor padrão recomendada do carro se for a primeira vez
    const model = CAR_MODELS[this.selectedCarIndex];
    if (MODEL_DEFAULT_COLOR && MODEL_DEFAULT_COLOR[model.id] !== undefined) {
      this.selectedColorIndex = MODEL_DEFAULT_COLOR[model.id];
    }
    this.updateCarDisplay();
  }

  changeColor(dir) {
    this.selectedColorIndex = (this.selectedColorIndex + dir + CAR_COLORS.length) % CAR_COLORS.length;
    this.updateCarDisplay();
  }

  updateCarDisplay() {
    const model = CAR_MODELS[this.selectedCarIndex];
    const color = CAR_COLORS[this.selectedColorIndex];

    this.carNameText.setText(model.name);
    this.carBadgeText.setText(model.badge);
    this.carDescText.setText(model.desc);

    // Atualiza barras de estatísticas com tween
    const speedPct = Math.min(1, model.maxSpeed / 300);
    const accelPct = Math.min(1, model.acceleration / 1.1);
    const brakePct = Math.min(1, model.braking / 1.0);
    const handlPct = Math.min(1, model.handling / 1.0);

    const values = {
      maxSpeed: speedPct,
      acceleration: accelPct,
      braking: brakePct,
      handling: handlPct
    };

    for (let k in this.statBars) {
      const b = this.statBars[k];
      b.fill.clear();
      b.fill.fillStyle(b.color, 1);
      b.fill.fillRoundedRect(b.x, b.y, b.maxW * values[k], 5, 2);
    }

    // Atualiza anel de seleção de cor
    this.colorDots.forEach((d, idx) => {
      d.ring.setStrokeStyle(1.5, 0xffffff, idx === this.selectedColorIndex ? 1 : 0);
    });

    // Renderiza o carro no canvas do preview
    const ctx = this.carCtx;
    ctx.clearRect(0, 0, this.carCanvas.width, this.carCanvas.height);

    ctx.save();
    ctx.translate(this.carCanvas.width / 2, this.carCanvas.height / 2 + 10);
    CarArt.renderModel(ctx, model, 0, 0, 110, 68, false, 0, color.hex, { speed: 0 });
    ctx.restore();

    this.carTexture.refresh();
  }

  proceedToTrackSelect() {
    window.selectedCarIndex = this.selectedCarIndex;
    window.selectedColorIndex = this.selectedColorIndex;

    this.cameras.main.fade(250, 0, 0, 0);
    this.time.delayedCall(250, () => {
      this.scene.start('TrackSelectScene');
    });
  }
}

