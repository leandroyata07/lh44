  class InputManager {
    constructor(onUserGesture = null, onViewportChange = null) {
      this.onUserGesture = onUserGesture;
      this.onViewportChange = onViewportChange;

      this.keys = { up: false, down: false, left: false, right: false, nitro: false };
      this.touch = {
        dpadUp: false,
        dpadDown: false,
        dpadLeft: false,
        dpadRight: false,
        btn1Nitro: false,
        btn2Brake: false,
        btn3Gas: false
      };

      this.up = false;
      this.down = false;
      this.left = false;
      this.right = false;
      this.nitro = false;
      this.enter = false;
      this.esc = false;
      this.keyM = false;

      this.justPressedUp = false;
      this.justPressedDown = false;
      this.justPressedLeft = false;
      this.justPressedRight = false;
      this.justPressedEnter = false;
      this.justPressedEsc = false;
      this.justPressedM = false;
      this.justPressedNitro = false;
      this.justPressedColor = false;
      this.lastDigit = null;
      this.lastCanvasClick = null;

      // Suporte nativo a Gamepads / Joysticks (Gamesir X5 Lite, Xbox, etc.)
      this.gamepadConnected = false;
      this.gamepadName = '';
      this.gamepadBannerTimer = 0;
      this.analogSteer = 0;
      this.gpActiveGas = false;
      this.gpActiveBrake = false;
      this.gpActiveLeft = false;
      this.gpActiveRight = false;
      this.gpActiveNitro = false;
      this.prevGamepadButtons = {};

      this.isMobileDevice = this.detectMobile();
      this.touchControlsVisible = this.isMobileDevice;
      this.userExitedFullscreen = false;

      this.dpadOpacity = this.loadOpacity('lh44_dpad_opacity', 0.78);
      this.btnsOpacity = this.loadOpacity('lh44_btns_opacity', 0.78);
      this.controlsScale = this.loadScale('lh44_controls_scale', 1.0);

      this.syncBodyClasses();
      this.initEvents();
      this.setupTouchControls();
      this.setupOpacityAndFullscreenUI();
    }

    detectMobile() {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 560;
      return Boolean((coarse && touchCapable) || smallScreen || (touchCapable && window.innerWidth <= 960));
    }

    loadOpacity(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const v = parseFloat(raw);
          if (!isNaN(v)) return Math.max(0.15, Math.min(1.0, v));
        }
      } catch (_) {}
      return fallback;
    }

    saveOpacity(key, val) {
      try {
        localStorage.setItem(key, val.toFixed(2));
      } catch (_) {}
    }

    loadScale(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const v = parseFloat(raw);
          if (!isNaN(v)) return Math.max(0.65, Math.min(1.50, v));
        }
      } catch (_) {}
      return fallback;
    }

    saveScale(key, val) {
      try {
        localStorage.setItem(key, val.toFixed(2));
      } catch (_) {}
    }

    isFullscreenActive() {
      return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    }

    syncBodyClasses() {
      this.isMobileDevice = this.detectMobile();
      document.body.classList.toggle('mobile-mode', this.isMobileDevice);
      document.body.classList.toggle('is-fullscreen', this.isFullscreenActive());
      if (this.onViewportChange) this.onViewportChange();
    }

    tryAutoEnterMobileFullscreen() {
      if (!this.isMobileDevice || this.userExitedFullscreen || this.isFullscreenActive()) return;
      this.requestFullscreenAndLandscape();
    }

    requestFullscreenAndLandscape() {
      const root = document.documentElement;
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) {
        try {
          const p = req.call(root);
          if (p && typeof p.then === 'function') {
            p.then(() => {
              this.lockLandscape();
              this.syncBodyClasses();
            }).catch(() => {});
          } else {
            this.lockLandscape();
          }
        } catch (_) {}
      } else {
        this.lockLandscape();
      }
    }

    lockLandscape() {
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }

    toggleFullscreen() {
      if (this.isFullscreenActive()) {
        this.userExitedFullscreen = true;
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) {
          try {
            const p = exit.call(document);
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }
      } else {
        this.userExitedFullscreen = false;
        this.requestFullscreenAndLandscape();
      }
    }

    notifyGesture(allowAutoFs = true) {
      if (this.onUserGesture) this.onUserGesture();
      if (allowAutoFs) this.tryAutoEnterMobileFullscreen();
    }

    syncCombinedInputs() {
      const prevUp = this.up;
      const prevDown = this.down;
      const prevLeft = this.left;
      const prevRight = this.right;
      const prevNitro = this.nitro;

      this.up = this.keys.up || this.touch.dpadUp || this.touch.btn3Gas || !!this.gpActiveGas;
      this.down = this.keys.down || this.touch.dpadDown || this.touch.btn2Brake || !!this.gpActiveBrake;
      this.left = this.keys.left || this.touch.dpadLeft || !!this.gpActiveLeft;
      this.right = this.keys.right || this.touch.dpadRight || !!this.gpActiveRight;
      this.nitro = this.keys.nitro || this.touch.btn1Nitro || !!this.gpActiveNitro;

      if (this.up && !prevUp) this.justPressedUp = true;
      if (this.down && !prevDown) this.justPressedDown = true;
      if (this.left && !prevLeft) this.justPressedLeft = true;
      if (this.right && !prevRight) this.justPressedRight = true;
      if (this.nitro && !prevNitro) this.justPressedNitro = true;
    }

    // Converte coordenadas de tela (clientX/clientY) para coordenadas locais do #viewport
    // suportando também a rotação automática de 90° em modo retrato mobile!
    toViewportLocal(clientX, clientY) {
      const vp = document.getElementById('viewport');
      if (!vp) return { x: clientX, y: clientY, w: window.innerWidth, h: window.innerHeight };
      const rect = vp.getBoundingClientRect();
      const localW = vp.clientWidth || rect.width || 1;
      const localH = vp.clientHeight || rect.height || 1;
      const isRotatedPortrait = document.body.classList.contains('mobile-mode') && (window.innerHeight > window.innerWidth);

      if (isRotatedPortrait && rect.width > 0 && rect.height > 0) {
        return {
          x: ((clientY - rect.top) / rect.height) * localW,
          y: ((rect.right - clientX) / rect.width) * localH,
          w: localW,
          h: localH
        };
      }
      return {
        x: rect.width > 0 ? ((clientX - rect.left) / rect.width) * localW : 0,
        y: rect.height > 0 ? ((clientY - rect.top) / rect.height) * localH : 0,
        w: localW,
        h: localH
      };
    }

    getElementLocalRect(el) {
      const vp = document.getElementById('viewport');
      let x = 0;
      let y = 0;
      let cur = el;
      while (cur && cur !== vp && cur !== document.body) {
        x += cur.offsetLeft || 0;
        y += cur.offsetTop || 0;
        cur = cur.offsetParent;
      }
      return { x, y, w: el.offsetWidth || 1, h: el.offsetHeight || 1 };
    }

    initEvents() {
      // Proteção de navegação para botões físicos/virtuais no Android (ex: GameSir X5 B / Back)
      try {
        history.pushState({ app: 'lh44' }, document.title, location.href);
        window.addEventListener('popstate', (e) => {
          history.pushState({ app: 'lh44' }, document.title, location.href);
          if (!this.esc) this.justPressedEsc = true;
          this.esc = true;
          this.notifyGesture(false);
        });
      } catch (_) {}

      // Detecção de conexão de Joystick / Gamepad Nativo (HTML5 Gamepad API)
      window.addEventListener('gamepadconnected', (e) => {
        this.gamepadConnected = true;
        this.gamepadName = (e.gamepad && e.gamepad.id) ? e.gamepad.id : 'GAMESIR / CONTROLE';
        this.gamepadBannerTimer = 4.0;
        this.notifyGesture(false);
      });
      window.addEventListener('gamepaddisconnected', () => {
        this.gamepadConnected = false;
      });

      window.addEventListener('keydown', (e) => {
        this.notifyGesture(false);
        const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
        if (isInput) {
          if (e.key === 'Escape' || e.keyCode === 4 || e.key === 'Back') {
            e.preventDefault();
            e.target.blur();
            if (!this.esc) this.justPressedEsc = true;
            this.esc = true;
          }
          return;
        }

        // Intercepta e previne ações do sistema Android quando botões do GameSir X5 são pressionados!
        const isAndroidBack = (e.key === 'Back' || e.code === 'GoBack' || e.keyCode === 4);
        const isGamepadKey = (e.keyCode >= 96 && e.keyCode <= 110) || (e.keyCode >= 19 && e.keyCode <= 23);
        if (isAndroidBack || isGamepadKey || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }

        if (isAndroidBack) {
          if (!this.esc) this.justPressedEsc = true;
          this.esc = true;
          return;
        }

        // Mapeamento de KeyCodes sintetizados pelo Android para botões de controle físico (GameSir X5 / etc.)
        switch (e.keyCode) {
          case 96: // BUTTON_A (Acelera na corrida e Confirma nos menus)
            this.keys.up = true;
            if (!this.enter) this.justPressedEnter = true;
            this.enter = true;
            this.syncCombinedInputs();
            return;
          case 97: // BUTTON_B (Freia na corrida e Volta nos menus)
            this.keys.down = true;
            if (!this.esc) this.justPressedEsc = true;
            this.esc = true;
            this.syncCombinedInputs();
            return;
          case 105: // BUTTON_R2 / RT (Gatilho de aceleração do Android)
            this.keys.up = true;
            this.syncCombinedInputs();
            return;
          case 104: // BUTTON_L2 / LT (Gatilho de frenagem do Android)
            this.keys.down = true;
            this.syncCombinedInputs();
            return;
          case 23: // DPAD_CENTER
          case 108: // BUTTON_START
            if (!this.enter) this.justPressedEnter = true;
            this.enter = true;
            return;
          case 109: // BUTTON_SELECT
            if (!this.esc) this.justPressedEsc = true;
            this.esc = true;
            return;
          case 99: // BUTTON_X
          case 100: // BUTTON_Y
          case 102: // BUTTON_L1
          case 103: // BUTTON_R1
            if (!this.keys.nitro) this.justPressedNitro = true;
            this.keys.nitro = true;
            this.syncCombinedInputs();
            return;
          case 19: // DPAD_UP
            this.keys.up = true;
            this.justPressedUp = true;
            this.syncCombinedInputs();
            return;
          case 20: // DPAD_DOWN
            this.keys.down = true;
            this.justPressedDown = true;
            this.syncCombinedInputs();
            return;
          case 21: // DPAD_LEFT
            this.keys.left = true;
            this.justPressedLeft = true;
            this.syncCombinedInputs();
            return;
          case 22: // DPAD_RIGHT
            this.keys.right = true;
            this.justPressedRight = true;
            this.syncCombinedInputs();
            return;
        }

        // Teclado padrão PC
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            this.keys.up = true;
            this.syncCombinedInputs();
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            this.keys.down = true;
            this.syncCombinedInputs();
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            this.keys.left = true;
            this.syncCombinedInputs();
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            this.keys.right = true;
            this.syncCombinedInputs();
            break;
          case ' ':
          case 'n':
          case 'N':
            if (!this.keys.nitro && e.key === ' ') this.justPressedEnter = true;
            this.keys.nitro = true;
            this.syncCombinedInputs();
            break;
          case 'c':
          case 'C':
            this.justPressedColor = true;
            break;
          case '1': case '2': case '3': case '4': case '5':
          case '6': case '7': case '8': case '9': case '0':
            this.lastDigit = parseInt(e.key, 10);
            break;
          case 'Enter':
            if (!this.enter) this.justPressedEnter = true;
            this.enter = true;
            break;
          case 'Escape':
          case 'p':
          case 'P':
            if (!this.esc) this.justPressedEsc = true;
            this.esc = true;
            break;
          case 'm':
          case 'M':
            if (!this.keyM) this.justPressedM = true;
            this.keyM = true;
            break;
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          return;
        }
        if (e.keyCode === 96) {
          this.keys.up = false;
          this.enter = false;
          this.syncCombinedInputs();
          return;
        }
        if (e.keyCode === 97) {
          this.keys.down = false;
          this.esc = false;
          this.syncCombinedInputs();
          return;
        }
        if (e.keyCode === 105) {
          this.keys.up = false;
          this.syncCombinedInputs();
          return;
        }
        if (e.keyCode === 104) {
          this.keys.down = false;
          this.syncCombinedInputs();
          return;
        }
        if (e.keyCode === 4 || e.key === 'Back' || e.code === 'GoBack' || e.keyCode === 109) {
          this.esc = false;
          return;
        }
        if (e.keyCode === 23 || e.keyCode === 108) {
          this.enter = false;
          return;
        }
        if (e.keyCode === 99 || e.keyCode === 100 || e.keyCode === 102 || e.keyCode === 103) {
          this.keys.nitro = false;
          this.syncCombinedInputs();
          return;
        }
        if (e.keyCode === 19) { this.keys.up = false; this.syncCombinedInputs(); return; }
        if (e.keyCode === 20) { this.keys.down = false; this.syncCombinedInputs(); return; }
        if (e.keyCode === 21) { this.keys.left = false; this.syncCombinedInputs(); return; }
        if (e.keyCode === 22) { this.keys.right = false; this.syncCombinedInputs(); return; }

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            this.keys.up = false;
            this.syncCombinedInputs();
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            this.keys.down = false;
            this.syncCombinedInputs();
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            this.keys.left = false;
            this.syncCombinedInputs();
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            this.keys.right = false;
            this.syncCombinedInputs();
            break;
          case ' ':
          case 'n':
          case 'N':
            this.keys.nitro = false;
            this.syncCombinedInputs();
            break;
          case 'Enter':
            this.enter = false;
            break;
          case 'Escape':
          case 'p':
          case 'P':
            this.esc = false;
            break;
          case 'm':
          case 'M':
            this.keyM = false;
            break;
        }
      });

      const onResizeOrFs = () => this.syncBodyClasses();
      window.addEventListener('resize', onResizeOrFs);
      window.addEventListener('orientationchange', () => setTimeout(onResizeOrFs, 80));
      document.addEventListener('fullscreenchange', onResizeOrFs);
      document.addEventListener('webkitfullscreenchange', onResizeOrFs);
    }

    setupOpacityAndFullscreenUI() {
      const vp = document.getElementById('viewport');
      const panel = document.getElementById('opacity-panel');
      const pauseBtn = document.getElementById('pause-btn');
      const gearBtn = document.getElementById('gear-btn');
      const closeBtn = document.getElementById('opacity-close-btn');
      const resumeBtn = document.getElementById('panel-resume-btn');
      const panelFsBtn = document.getElementById('panel-fullscreen-btn');

      const scaleValEl = document.getElementById('ctrl-scale-val');
      const scaleFill = document.getElementById('scale-slider-fill');
      const scaleThumb = document.getElementById('scale-slider-thumb');
      const scaleSlider = document.getElementById('scale-slider');
      const scaleMinus = document.getElementById('scale-minus');
      const scalePlus = document.getElementById('scale-plus');

      const dpadValEl = document.getElementById('dpad-opacity-val');
      const dpadFill = document.getElementById('dpad-slider-fill');
      const dpadThumb = document.getElementById('dpad-slider-thumb');
      const dpadSlider = document.getElementById('dpad-slider');

      const btnsValEl = document.getElementById('btns-opacity-val');
      const btnsFill = document.getElementById('btns-slider-fill');
      const btnsThumb = document.getElementById('btns-slider-thumb');
      const btnsSlider = document.getElementById('btns-slider');

      const applyScaleUI = () => {
        if (vp) {
          vp.style.setProperty('--controls-scale', this.controlsScale.toFixed(2));
        }
        const sPct = Math.round(this.controlsScale * 100);
        if (scaleValEl) scaleValEl.textContent = `${sPct}%`;
        const sRatio = ((this.controlsScale - 0.65) / 0.85) * 100;
        if (scaleFill) scaleFill.style.width = `${Math.max(0, Math.min(100, sRatio))}%`;
        if (scaleThumb) scaleThumb.style.left = `${Math.max(0, Math.min(100, sRatio))}%`;
      };

      const setControlsScale = (val) => {
        this.controlsScale = Math.max(0.65, Math.min(1.50, val));
        this.saveScale('lh44_controls_scale', this.controlsScale);
        applyScaleUI();
      };

      const applyOpacityUI = () => {
        if (vp) {
          vp.style.setProperty('--dpad-opacity', this.dpadOpacity.toFixed(2));
          vp.style.setProperty('--btns-opacity', this.btnsOpacity.toFixed(2));
        }
        const dPct = Math.round(this.dpadOpacity * 100);
        const bPct = Math.round(this.btnsOpacity * 100);
        if (dpadValEl) dpadValEl.textContent = `${dPct}%`;
        if (btnsValEl) btnsValEl.textContent = `${bPct}%`;

        const dRatio = ((this.dpadOpacity - 0.15) / 0.85) * 100;
        const bRatio = ((this.btnsOpacity - 0.15) / 0.85) * 100;
        if (dpadFill) dpadFill.style.width = `${dRatio}%`;
        if (dpadThumb) dpadThumb.style.left = `${dRatio}%`;
        if (btnsFill) btnsFill.style.width = `${bRatio}%`;
        if (btnsThumb) btnsThumb.style.left = `${bRatio}%`;
      };

      const setDpadOpacity = (val) => {
        this.dpadOpacity = Math.max(0.15, Math.min(1.0, val));
        this.saveOpacity('lh44_dpad_opacity', this.dpadOpacity);
        applyOpacityUI();
      };

      const setBtnsOpacity = (val) => {
        this.btnsOpacity = Math.max(0.15, Math.min(1.0, val));
        this.saveOpacity('lh44_btns_opacity', this.btnsOpacity);
        applyOpacityUI();
      };

      applyScaleUI();
      applyOpacityUI();

      const bindCustomSlider = (sliderEl, setter) => {
        if (!sliderEl) return;
        let dragging = false;
        const updateFromPoint = (clientX, clientY) => {
          const pt = this.toViewportLocal(clientX, clientY);
          const rect = this.getElementLocalRect(sliderEl);
          const ratio = Math.max(0, Math.min(1, (pt.x - rect.x) / Math.max(1, rect.w)));
          setter(ratio);
        };

        sliderEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dragging = true;
          if (e.touches[0]) updateFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        sliderEl.addEventListener('touchmove', (e) => {
          if (!dragging) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.touches[0]) updateFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        sliderEl.addEventListener('touchend', () => { dragging = false; });
        sliderEl.addEventListener('touchcancel', () => { dragging = false; });

        sliderEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dragging = true;
          updateFromPoint(e.clientX, e.clientY);
          const onMove = (ev) => { if (dragging) updateFromPoint(ev.clientX, ev.clientY); };
          const onUp = () => {
            dragging = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      };

      bindCustomSlider(scaleSlider, (ratio) => setControlsScale(0.65 + ratio * 0.85));
      bindCustomSlider(dpadSlider, (ratio) => setDpadOpacity(0.15 + ratio * 0.85));
      bindCustomSlider(btnsSlider, (ratio) => setBtnsOpacity(0.15 + ratio * 0.85));

      const bindTap = (el, fn) => {
        if (!el) return;
        let touched = false;
        let resetTimer = null;
        el.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          touched = true;
          clearTimeout(resetTimer);
          resetTimer = setTimeout(() => { touched = false; }, 350);
          fn(e);
        }, { passive: false });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (touched) { touched = false; return; }
          fn(e);
        });
      };

      bindTap(scaleMinus, () => setControlsScale(this.controlsScale - 0.10));
      bindTap(scalePlus, () => setControlsScale(this.controlsScale + 0.10));
      bindTap(document.getElementById('dpad-minus'), () => setDpadOpacity(this.dpadOpacity - 0.10));
      bindTap(document.getElementById('dpad-plus'), () => setDpadOpacity(this.dpadOpacity + 0.10));
      bindTap(document.getElementById('btns-minus'), () => setBtnsOpacity(this.btnsOpacity - 0.10));
      bindTap(document.getElementById('btns-plus'), () => setBtnsOpacity(this.btnsOpacity + 0.10));

      if (panel) {
        panel.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        panel.addEventListener('click', (e) => e.stopPropagation());
        const presets = panel.querySelectorAll('.preset-btn');
        presets.forEach((btn) => {
          bindTap(btn, () => {
            const v = parseFloat(btn.getAttribute('data-preset') || '0.75');
            if (!this.touchControlsVisible) {
              this.touchControlsVisible = true;
              this.updateTouchVisibility();
            }
            setDpadOpacity(v);
            setBtnsOpacity(v);
          });
        });
      }

      bindTap(pauseBtn, () => {
        this.notifyGesture(false);
        this.justPressedEsc = true;
      });

      bindTap(gearBtn, () => {
        this.notifyGesture(false);
        if (panel) {
          const isOpen = panel.classList.contains('open');
          if (isOpen) {
            panel.classList.remove('open');
            if (gearBtn) gearBtn.classList.remove('active');
          } else {
            panel.classList.add('open');
            if (gearBtn) gearBtn.classList.add('active');
            // Clicar na engrenagem pausa o jogo (envia pulso Esc)
            this.justPressedEsc = true;
          }
        }
      });

      bindTap(closeBtn, () => {
        if (panel) panel.classList.remove('open');
        if (gearBtn) gearBtn.classList.remove('active');
      });

      bindTap(resumeBtn, () => {
        if (panel) panel.classList.remove('open');
        if (gearBtn) gearBtn.classList.remove('active');
        // Botão Continuar despausa o jogo
        this.justPressedEsc = true;
      });

      const handleFsToggle = () => {
        this.notifyGesture(false);
        this.toggleFullscreen();
      };
      bindTap(panelFsBtn, handleFsToggle);

      const updateFsLabels = () => {
        const active = this.isFullscreenActive();
        const label = active ? '⛶ SAIR' : '⛶ TELA CHEIA';
        if (panelFsBtn) panelFsBtn.textContent = label;
      };
      document.addEventListener('fullscreenchange', updateFsLabels);
      document.addEventListener('webkitfullscreenchange', updateFsLabels);
      updateFsLabels();
    }

    updateTouchVisibility() {
      const controlsEl = document.getElementById('touch-controls');
      const toggleBtn = document.getElementById('touch-toggle-btn');
      if (controlsEl) controlsEl.style.display = this.touchControlsVisible ? 'block' : 'none';
      if (toggleBtn) toggleBtn.textContent = this.touchControlsVisible ? 'CONTROLES: ON' : 'CONTROLES: OFF';
      if (this.onViewportChange) this.onViewportChange();
    }

    setupTouchControls() {
      const toggleBtn = document.getElementById('touch-toggle-btn');
      const panel = document.getElementById('opacity-panel');
      const openBtn = document.getElementById('opacity-toggle-btn');

      this.updateTouchVisibility();

      if (toggleBtn) {
        let tFlag = false;
        const doToggle = (e) => {
          e.stopPropagation();
          this.notifyGesture(false);
          this.touchControlsVisible = !this.touchControlsVisible;
          this.updateTouchVisibility();
          toggleBtn.blur();
        };
        toggleBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          tFlag = true;
          doToggle(e);
        }, { passive: false });
        toggleBtn.addEventListener('click', (e) => {
          if (tFlag) { tFlag = false; return; }
          doToggle(e);
        });
      }

      // Toque na tela fora dos botões avança menus ou fecha o painel de opacidade
      const canvasEl = document.getElementById('gameCanvas');
      if (canvasEl) {
        const handleCanvasTap = (clientX, clientY) => {
          this.notifyGesture(true);
          if (panel && panel.classList.contains('open')) {
            panel.classList.remove('open');
            const gearBtn = document.getElementById('gear-btn');
            if (gearBtn) gearBtn.classList.remove('active');
            return;
          }
          const pt = this.toViewportLocal(clientX, clientY);
          if (pt.w > 0 && pt.h > 0) {
            this.lastCanvasClick = {
              x: (pt.x / pt.w) * INTERNAL_WIDTH,
              y: (pt.y / pt.h) * INTERNAL_HEIGHT
            };
          }
          this.justPressedEnter = true;
        };

        let canvasTouched = false;
        canvasEl.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches[0]) {
            canvasTouched = true;
            handleCanvasTap(e.touches[0].clientX, e.touches[0].clientY);
          }
        }, { passive: true });

        canvasEl.addEventListener('click', (e) => {
          if (canvasTouched) { canvasTouched = false; return; }
          handleCanvasTap(e.clientX, e.clientY);
        });
      }

      // =====================================================
      // 1. SETAS DIRECIONAIS TOUCH: APENAS ESQUERDA (◀) E DIREITA (▶)
      // =====================================================
      const dpadCluster = document.getElementById('dpad-cluster');
      const armLeft = document.getElementById('dpad-left');
      const armRight = document.getElementById('dpad-right');

      const applySteerState = (l, r, vibrateOnNew = false) => {
        const changed = (l !== this.touch.dpadLeft) || (r !== this.touch.dpadRight);
        const newPress = (l && !this.touch.dpadLeft) || (r && !this.touch.dpadRight);

        this.touch.dpadUp = false;
        this.touch.dpadDown = false;
        this.touch.dpadLeft = l;
        this.touch.dpadRight = r;

        if (armLeft) armLeft.classList.toggle('active', l);
        if (armRight) armRight.classList.toggle('active', r);

        if (changed) this.syncCombinedInputs();
        if (vibrateOnNew && newPress && navigator.vibrate) navigator.vibrate(12);
      };

      const evalSteerPoint = (clientX, clientY) => {
        if (!dpadCluster) return { l: false, r: false };
        const pt = this.toViewportLocal(clientX, clientY);
        const rect = this.getElementLocalRect(dpadCluster);
        const pad = Math.max(12, rect.w * 0.22);
        if (pt.x < rect.x - pad || pt.x > rect.x + rect.w + pad ||
            pt.y < rect.y - pad || pt.y > rect.y + rect.h + pad) {
          return { l: false, r: false };
        }

        const midX = rect.x + rect.w * 0.5;
        const deadzone = rect.w * 0.05;
        return {
          l: pt.x < midX - deadzone,
          r: pt.x > midX + deadzone
        };
      };

      if (dpadCluster) {
        const updateSteerFromTouches = (e, isStart = false) => {
          e.preventDefault();
          e.stopPropagation();
          if (isStart) this.notifyGesture(true);
          let l = false, r = false;
          for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            const res = evalSteerPoint(t.clientX, t.clientY);
            l = l || res.l;
            r = r || res.r;
          }
          applySteerState(l, r, true);
        };

        dpadCluster.addEventListener('touchstart', (e) => updateSteerFromTouches(e, true), { passive: false });
        dpadCluster.addEventListener('touchmove', (e) => updateSteerFromTouches(e, false), { passive: false });
        dpadCluster.addEventListener('touchend', (e) => updateSteerFromTouches(e, false), { passive: false });
        dpadCluster.addEventListener('touchcancel', (e) => updateSteerFromTouches(e, false), { passive: false });

        let mouseSteerDown = false;
        dpadCluster.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          mouseSteerDown = true;
          this.notifyGesture(false);
          const res = evalSteerPoint(e.clientX, e.clientY);
          applySteerState(res.l, res.r, false);
        });
        window.addEventListener('mousemove', (e) => {
          if (!mouseSteerDown) return;
          const res = evalSteerPoint(e.clientX, e.clientY);
          applySteerState(res.l, res.r, false);
        });
        window.addEventListener('mouseup', () => {
          if (!mouseSteerDown) return;
          mouseSteerDown = false;
          applySteerState(false, false, false);
        });
      }

      // =====================================================
      // 2. BOTÕES 1 (NITRO), 2 (FREIA), 3 (ACELERA) MULTITOUCH
      // =====================================================
      const btnsCluster = document.getElementById('buttons-cluster');
      const btn1El = document.getElementById('btn-1');
      const btn2El = document.getElementById('btn-2');
      const btn3El = document.getElementById('btn-3');

      const applyBtnsState = (b1, b2, b3, vibrateOnNew = false) => {
        const newB1 = b1 && !this.touch.btn1Nitro;
        const newB2 = b2 && !this.touch.btn2Brake;
        const newB3 = b3 && !this.touch.btn3Gas;

        // Botão 3 (Acelera) e Botão 1 confirmam menus; Botão 2 (Freia) volta nas telas de menu
        if (newB3 || newB1) {
          this.justPressedEnter = true;
        }
        if (newB2) {
          this.justPressedEsc = true;
        }

        this.touch.btn1Nitro = b1;
        this.touch.btn2Brake = b2;
        this.touch.btn3Gas = b3;

        if (btn1El) btn1El.classList.toggle('active', b1);
        if (btn2El) btn2El.classList.toggle('active', b2);
        if (btn3El) btn3El.classList.toggle('active', b3);

        this.syncCombinedInputs();
        if (vibrateOnNew && (newB1 || newB2 || newB3) && navigator.vibrate) {
          navigator.vibrate(newB1 ? 22 : 12);
        }
      };

      const hitTestButtons = (clientX, clientY) => {
        const pt = this.toViewportLocal(clientX, clientY);
        const checkBtn = (el) => {
          if (!el) return false;
          const r = this.getElementLocalRect(el);
          const cx = r.x + r.w * 0.5;
          const cy = r.y + r.h * 0.5;
          const radius = Math.max(r.w, r.h) * 0.58; // margem ergonômica generosa para o polegar
          return Math.hypot(pt.x - cx, pt.y - cy) <= radius;
        };
        return {
          b1: checkBtn(btn1El),
          b2: checkBtn(btn2El),
          b3: checkBtn(btn3El)
        };
      };

      if (btnsCluster) {
        const updateBtnsFromTouches = (e, isStart = false) => {
          e.preventDefault();
          e.stopPropagation();
          if (isStart) this.notifyGesture(true);

          // Inspeciona todos os toques ativos na região direita (suporta segurar 3 e tocar 1 juntos!)
          let b1 = false, b2 = false, b3 = false;
          for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            const hit = hitTestButtons(t.clientX, t.clientY);
            b1 = b1 || hit.b1;
            b2 = b2 || hit.b2;
            b3 = b3 || hit.b3;
          }
          applyBtnsState(b1, b2, b3, true);
        };

        btnsCluster.addEventListener('touchstart', (e) => updateBtnsFromTouches(e, true), { passive: false });
        btnsCluster.addEventListener('touchmove', (e) => updateBtnsFromTouches(e, false), { passive: false });
        btnsCluster.addEventListener('touchend', (e) => updateBtnsFromTouches(e, false), { passive: false });
        btnsCluster.addEventListener('touchcancel', (e) => updateBtnsFromTouches(e, false), { passive: false });

        let mouseBtnDown = false;
        btnsCluster.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          mouseBtnDown = true;
          this.notifyGesture(false);
          const hit = hitTestButtons(e.clientX, e.clientY);
          applyBtnsState(hit.b1, hit.b2, hit.b3, false);
        });
        window.addEventListener('mousemove', (e) => {
          if (!mouseBtnDown) return;
          const hit = hitTestButtons(e.clientX, e.clientY);
          applyBtnsState(hit.b1, hit.b2, hit.b3, false);
        });
        window.addEventListener('mouseup', () => {
          if (!mouseBtnDown) return;
          mouseBtnDown = false;
          applyBtnsState(false, false, false, false);
        });
      }
    }

    pollGamepad(dt) {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) {
          gp = gamepads[i];
          break;
        }
      }

      if (!gp) {
        this.gamepadConnected = false;
        this.analogSteer = 0;
        this.gpActiveGas = false;
        this.gpActiveBrake = false;
        this.gpActiveLeft = false;
        this.gpActiveRight = false;
        this.gpActiveNitro = false;
        return;
      }

      if (!this.gamepadConnected) {
        this.gamepadConnected = true;
        this.gamepadName = gp.id || 'GAMESIR / CONTROLE NATIVO';
        this.gamepadBannerTimer = 3.8;
        this.notifyGesture(false);
      }
      if (this.gamepadBannerTimer > 0) {
        this.gamepadBannerTimer -= dt;
      }

      const DEADZONE = 0.16;

      // Leitura ampla de eixos (Stick analógico principal e alternativo no Android)
      let rawAxisX = 0;
      if (gp.axes && gp.axes.length > 0) rawAxisX = gp.axes[0];
      if (Math.abs(rawAxisX) < 0.05 && gp.axes && gp.axes.length > 2 && Math.abs(gp.axes[2]) > 0.05) {
        rawAxisX = gp.axes[2];
      }

      let rawAxisY = 0;
      if (gp.axes && gp.axes.length > 1) rawAxisY = gp.axes[1];
      if (Math.abs(rawAxisY) < 0.05 && gp.axes && gp.axes.length > 3 && Math.abs(gp.axes[3]) > 0.05) {
        rawAxisY = gp.axes[3];
      }

      // Detecção de D-Pad por eixos (Hat Switch / Android DPAD axes 4, 5, 6, 7)
      const hatX = (gp.axes && gp.axes.length > 4) ? gp.axes[4] : ((gp.axes && gp.axes.length > 6) ? gp.axes[6] : 0);
      const hatY = (gp.axes && gp.axes.length > 5) ? gp.axes[5] : ((gp.axes && gp.axes.length > 7) ? gp.axes[7] : 0);

      // Direção analógica de alta precisão pelo stick analógico esquerdo
      if (Math.abs(rawAxisX) > DEADZONE) {
        const sign = rawAxisX > 0 ? 1 : -1;
        const mag = (Math.abs(rawAxisX) - DEADZONE) / (1 - DEADZONE);
        this.analogSteer = sign * Math.min(1, Math.max(0, mag));
      } else {
        this.analogSteer = 0;
      }

      const isBtnPressed = (btnIdx, threshold = 0.35) => {
        if (!gp.buttons || !gp.buttons[btnIdx]) return false;
        const b = gp.buttons[btnIdx];
        return typeof b === 'object' ? (b.pressed || b.value >= threshold) : b >= threshold;
      };

      // D-Pad por botões ou eixos (cobre 100% dos controles Android e GameSir)
      const gpUp = isBtnPressed(12) || (rawAxisY < -0.42) || (hatY < -0.42);
      const gpDown = isBtnPressed(13) || (rawAxisY > 0.42) || (hatY > 0.42);
      const gpLeft = isBtnPressed(14) || (rawAxisX < -0.35) || (hatX < -0.42);
      const gpRight = isBtnPressed(15) || (rawAxisX > 0.35) || (hatX > 0.42);

      // Botões A / B / X / Y
      const btnA = isBtnPressed(0);
      const btnB = isBtnPressed(1);
      const btnX = isBtnPressed(2);
      const btnY = isBtnPressed(3);
      const btnLB = isBtnPressed(4);
      const btnRB = isBtnPressed(5);

      // Gatilhos analógicos LT (freio) e RT (aceleração)
      let axisTriggerL = 0;
      let axisTriggerR = 0;
      if (gp.axes) {
        if (gp.axes.length > 2 && gp.axes[2] > 0.15 && gp.axes.length > 5) axisTriggerL = gp.axes[2];
        if (gp.axes.length > 5 && gp.axes[5] > 0.15) axisTriggerR = gp.axes[5];
      }
      const btnLT = isBtnPressed(6, 0.20) || (axisTriggerL > 0.20);
      const btnRT = isBtnPressed(7, 0.20) || (axisTriggerR > 0.20);
      const btnSelect = isBtnPressed(8);
      const btnStart = isBtnPressed(9);

      this.gpActiveGas = btnA || btnRT || (gpUp && this.analogSteer === 0);
      this.gpActiveBrake = btnB || btnLT || (gpDown && this.analogSteer === 0);
      this.gpActiveLeft = gpLeft || (this.analogSteer < -0.25);
      this.gpActiveRight = gpRight || (this.analogSteer > 0.25);
      this.gpActiveNitro = btnX || btnY || btnRB;

      const checkPulse = (key, isDown) => {
        const prev = !!this.prevGamepadButtons[key];
        this.prevGamepadButtons[key] = isDown;
        return isDown && !prev;
      };

      // Pulsos para navegação em menus
      if (checkPulse('btnA', btnA) || checkPulse('btnStart', btnStart)) {
        this.justPressedEnter = true;
      }
      if (checkPulse('btnB', btnB) || checkPulse('btnSelect', btnSelect)) {
        this.justPressedEsc = true;
      }
      if (checkPulse('btnX', btnX) || checkPulse('btnRB', btnRB)) {
        this.justPressedNitro = true;
      }
      if (checkPulse('dpadUp', gpUp)) this.justPressedUp = true;
      if (checkPulse('dpadDown', gpDown)) this.justPressedDown = true;
      if (checkPulse('dpadLeft', gpLeft)) this.justPressedLeft = true;
      if (checkPulse('dpadRight', gpRight)) this.justPressedRight = true;

      this.syncCombinedInputs();
    }

    clearPulses() {
      this.justPressedUp = false;
      this.justPressedDown = false;
      this.justPressedLeft = false;
      this.justPressedRight = false;
      this.justPressedEnter = false;
      this.justPressedEsc = false;
      this.justPressedM = false;
      this.justPressedNitro = false;
      this.justPressedColor = false;
      this.lastDigit = null;
      this.lastCanvasClick = null;
    }
  }
