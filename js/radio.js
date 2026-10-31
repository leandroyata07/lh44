/**
 * LH44 - LOW TO HIGH SPEED
 * Sistema de Rádio do Engenheiro de Pista (Estilo F1 / Pit Radio)
 * Comunicação por voz e mensagens táticas no HUD com efeito de rádio autêntico
 */

class PitRadio {
  constructor(audioManager) {
    this.audio = audioManager;
    this.activeMessage = null;
    this.timer = 0;
    this.queue = [];
    this.voiceAvailable = 'speechSynthesis' in window;
    this.synth = window.speechSynthesis;
    this.selectedVoice = null;
    this.isMuted = false;
    this.radioBeepGain = null;

    if (this.voiceAvailable) {
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.voiceAvailable) return;
    try {
      const voices = this.synth.getVoices();
      this.selectedVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR')) ||
                           voices.find(v => v.lang.includes('pt')) ||
                           voices[0] || null;
    } catch (_) {}
  }

  playRadioChirp() {
    // Efeito sonoro característico de abertura de transmissão de rádio da Fórmula 1
    if (!this.audio || !this.audio.ctx) return;
    try {
      const ctx = this.audio.ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 4.0;

      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (_) {}
  }

  speak(text, priority = false, displayDuration = 3.5) {
    if (this.isMuted) return;

    const msg = { text, duration: displayDuration, time: displayDuration };

    if (priority) {
      this.activeMessage = msg;
      this.queue = [];
    } else if (!this.activeMessage) {
      this.activeMessage = msg;
    } else {
      if (this.queue.length < 3) this.queue.push(msg);
    }

    this.playRadioChirp();

    if (this.voiceAvailable && this.synth) {
      try {
        this.synth.cancel(); // Evita acúmulo de falas
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        utterance.rate = 1.15;
        utterance.pitch = 0.95;
        utterance.volume = 0.85;
        this.synth.speak(utterance);
      } catch (_) {}
    }
  }

  update(dt) {
    if (this.activeMessage) {
      this.activeMessage.time -= dt;
      if (this.activeMessage.time <= 0) {
        this.activeMessage = this.queue.shift() || null;
        if (this.activeMessage) {
          this.playRadioChirp();
        }
      }
    }
  }

  render(ctx, width, height) {
    if (!this.activeMessage) return;

    const text = this.activeMessage.text;
    const boxW = Math.min(width - 24, 280);
    const boxH = 22;
    const boxX = (width - boxW) / 2;
    const boxY = 26;

    ctx.save();
    // Fundo estilo rádio militar/automobilístico
    ctx.fillStyle = 'rgba(10, 16, 26, 0.88)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    // Ícone de transmissão piscando (rádio aberto)
    const waveProgress = (Date.now() / 180) % 4;
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(boxX + 12, boxY + boxH / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Ondas de rádio
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.lineWidth = 1;
    for (let w = 1; w <= 2; w++) {
      if (waveProgress >= w) {
        ctx.beginPath();
        ctx.arc(boxX + 12, boxY + boxH / 2, 3.5 + w * 2.8, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
      }
    }

    // Texto do engenheiro
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`BOX: "${text}"`, boxX + 28, boxY + boxH / 2);

    ctx.restore();
  }
}

