/**
 * LH44 - LOW TO HIGH SPEED (PHASER 3 EDITION)
 * Ponto de Entrada Oficial e Configuração do Phaser 3
 */

window.addEventListener('load', () => {
  const config = {
    type: Phaser.WEBGL,
    parent: 'viewport',
    width: 384,
    height: 216,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
      gamepad: true
    },
    scene: [
      BootScene,
      TitleScene,
      GarageScene,
      TrackSelectScene,
      RaceScene,
      PauseScene,
      PodiumScene
    ]
  };

  // Se o elemento gameCanvas antigo existir, oculta-o pois o Phaser cria o canvas dele dentro de #viewport
  const oldCanvas = document.getElementById('gameCanvas');
  if (oldCanvas) {
    oldCanvas.style.display = 'none';
  }

  // Inicializa a instância principal do Phaser
  window.phaserGame = new Phaser.Game(config);
});

