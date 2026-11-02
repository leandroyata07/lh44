/**
 * LH44 - LOW TO HIGH SPEED
 * Ponto de entrada do jogo - Inicialização e loop principal
 */

window.addEventListener('load', () => {
  window.gameInstance = new LH44RacingGame();

  // Destravamento imediato do Web Audio e início da música tema no primeiríssimo gesto do usuário
  const unlockAudioImmediate = () => {
    if (window.gameInstance && window.gameInstance.audio) {
      const g = window.gameInstance;
      const isMenuState = (g.state === 'MENU' || g.state === 'MODE_SELECT' || g.state === 'DIFFICULTY_SELECT' || g.state === 'TRACK_SELECT' || g.state === 'CAR_SELECT' || g.state === 'COLOR_SELECT' || g.state === 'NAME_INPUT');
      window.gameInstance.audio.unlockAudio(isMenuState);
    }
  };
  window.addEventListener('pointerdown', unlockAudioImmediate, { passive: true });
  window.addEventListener('touchstart', unlockAudioImmediate, { passive: true });
  window.addEventListener('click', unlockAudioImmediate, { passive: true });
  window.addEventListener('keydown', unlockAudioImmediate, { passive: true });
});
