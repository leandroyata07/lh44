/**
 * LH44 - LOW TO HIGH SPEED (PHASER 3 EDITION)
 * Shaders GLSL de Pós-Processamento WebGL
 * Efeitos de Tubo CRT, Aberração Cromática e Glow de Nitro
 */

class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'CRTPipeline',
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        uniform float uTime;
        uniform float uCurvature;
        uniform float uScanlineIntensity;
        varying vec2 outTexCoord;

        vec2 curve(vec2 uv) {
          uv = (uv - 0.5) * 2.0;
          uv *= 1.1;
          uv.x *= 1.0 + pow((abs(uv.y) / 5.0), 2.0) * uCurvature;
          uv.y *= 1.0 + pow((abs(uv.x) / 4.0), 2.0) * uCurvature;
          uv = (uv / 2.0) + 0.5;
          return uv;
        }

        void main() {
          vec2 uv = curve(outTexCoord);
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          vec4 color = texture2D(uMainSampler, uv);

          // Scanlines dinâmicas baseadas na altura da tela
          float scanline = sin(uv.y * 540.0 + uTime * 2.0) * 0.04 * uScanlineIntensity;
          color.rgb -= scanline;

          // Vinheta sutil nos cantos
          float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
          color.rgb *= clamp(pow(16.0 * vignette, 0.22), 0.0, 1.0);

          gl_FragColor = color;
        }
      `
    });

    this.curvature = 0.35;
    this.scanlineIntensity = 1.0;
  }

  onPreRender() {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uCurvature', this.curvature);
    this.set1f('uScanlineIntensity', this.scanlineIntensity);
  }
}

class GlitchAberrationPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'GlitchAberrationPipeline',
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        uniform float uOffset;
        varying vec2 outTexCoord;

        void main() {
          if (uOffset <= 0.0005) {
            gl_FragColor = texture2D(uMainSampler, outTexCoord);
            return;
          }

          vec2 offset = vec2(uOffset, 0.0);
          float r = texture2D(uMainSampler, outTexCoord - offset).r;
          float g = texture2D(uMainSampler, outTexCoord).g;
          float b = texture2D(uMainSampler, outTexCoord + offset).b;
          float a = texture2D(uMainSampler, outTexCoord).a;

          gl_FragColor = vec4(r, g, b, a);
        }
      `
    });

    this.offset = 0.0;
  }

  onPreRender() {
    this.set1f('uOffset', this.offset);
  }
}

