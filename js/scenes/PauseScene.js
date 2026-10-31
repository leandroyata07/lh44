/**
 * LH44 - LOW TO HIGH SPEED
 * PauseScene: Menu de pausa translúcido sobre a corrida com opções de controle
 */

class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.raceScene = data.raceScene;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Fundo escurecido translúcido
    const overlay = this.add.graphics();
    overlay.fillStyle(0x050a14, 0.78);
    overlay.fillRect(0, 0, w, h);

    // Caixa central do Menu de Pausa
    const boxW = 220;
    const boxH = 150;
    const boxX = (w - boxW) / 2;
    const boxY = (h - boxH) / 2;

    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x0e1726, 0.95);
    boxBg.fillRoundedRect(boxX, boxY, boxW, boxH, 6);
    boxBg.lineStyle(1.5, 0x00e5ff, 0.8);
    boxBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 6);

    // Título PAUSA
    this.add.text(w / 2, boxY + 22, '⏸ JOGO PAUSADO', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00E5FF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Itens do Menu
    const items = [
      { text: 'CONTINUAR CORRIDA', action: () => this.resumeGame() },
      { text: 'REINICIAR ETAPA', action: () => this.restartRace() },
      { text: 'SAIR PARA A GARAGEM', action: () => this.quitToGarage() }
    ];

    let itemY = boxY + 54;
    items.forEach((item, idx) => {
      const btn = this.add.text(w / 2, itemY, item.text, {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#FFFFFF',
        backgroundColor: '#1b2a40',
        padding: { left: 12, right: 12, top: 5, bottom: 5 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setBackgroundColor('#00e5ff44'));
      btn.on('pointerout', () => btn.setBackgroundColor('#1b2a40'));
      btn.on('pointerdown', item.action);

      itemY += 26;
    });

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    this.scene.stop();
    this.scene.resume('RaceScene');
    if (this.raceScene && this.raceScene.music) {
      this.raceScene.music.resume();
    }
  }

  restartRace() {
    this.scene.stop();
    this.scene.stop('RaceScene');
    this.scene.start('RaceScene');
  }

  quitToGarage() {
    this.scene.stop();
    this.scene.stop('RaceScene');
    this.scene.start('GarageScene');
  }
}

