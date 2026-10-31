  const CarArt = {
    SPRITE_W: 108,
    SPRITE_H: 68,
    SPRITE_SCALE: 3,
    ORIGIN_X: 54,
    ORIGIN_Y: 40,
    OUTLINE: '#0E131B',
    _cache: new Map(),
    _spriteCache: new Map(),


    // Silhueta traseira curva (bézier) simétrica: teto arqueado -> ombros -> cintura larga -> para-choque.
    // Apenas desenha o caminho (path); quem chama preenche (fill) e contorna (stroke).
    curvedBody(c, tx, rx, sx, o) {
      const rw = o.roofW * sx, sw = o.shW * sx, mw = o.midW * sx, bw = o.botW * sx;
      const ry = o.roofY, sy = o.shY, my = o.midY, by = o.botY;
      const rr = o.round || 5;
      const arch = o.arch || 0;
      c.beginPath();
      c.moveTo(tx - rw + rr, ry);
      c.quadraticCurveTo(tx, ry - arch, tx + rw - rr, ry);
      c.quadraticCurveTo(tx + rw, ry, tx + rw + (sw - rw) * 0.12, ry + rr * 1.5);
      c.bezierCurveTo(tx + rw + (sw - rw) * 0.45, ry + (sy - ry) * 0.45, rx + sw, sy - (sy - ry) * 0.30, rx + sw, sy);
      c.bezierCurveTo(rx + sw + (mw - sw) * 0.9, sy + (my - sy) * 0.30, rx + mw, my - (my - sy) * 0.4, rx + mw, my);
      c.bezierCurveTo(rx + mw, my + (by - my) * 0.4, rx + bw + 0.6, by - (by - my) * 0.25, rx + bw, by);
      c.lineTo(rx - bw, by);
      c.bezierCurveTo(rx - bw - 0.6, by - (by - my) * 0.25, rx - mw, my + (by - my) * 0.4, rx - mw, my);
      c.bezierCurveTo(rx - mw, my - (my - sy) * 0.4, rx - sw - (mw - sw) * 0.9, sy + (my - sy) * 0.30, rx - sw, sy);
      c.bezierCurveTo(rx - sw, sy - (sy - ry) * 0.30, tx - rw - (sw - rw) * 0.45, ry + (sy - ry) * 0.45, tx - rw - (sw - rw) * 0.12, ry + rr * 1.5);
      c.quadraticCurveTo(tx - rw, ry, tx - rw + rr, ry);
      c.closePath();
    },

    // Vidro traseiro com cantos arredondados e laterais levemente abauladas
    glassCurve(c, tx, rx, sx, y1, y2, w1, w2, bulge, arch) {
      const x1a = tx - w1 * sx, x1b = tx + w1 * sx, x2a = rx - w2 * sx, x2b = rx + w2 * sx;
      const my = (y1 + y2) / 2;
      const mxr = (x1b + x2b) / 2 + bulge;
      const mxl = (x1a + x2a) / 2 - bulge;
      c.beginPath();
      c.moveTo(x1a + 2.2, y1);
      c.quadraticCurveTo(tx, y1 - arch, x1b - 2.2, y1);
      c.quadraticCurveTo(x1b, y1, x1b + 0.5, y1 + 1.8);
      c.quadraticCurveTo(mxr, my, x2b - 0.3, y2 - 2.2);
      c.quadraticCurveTo(x2b, y2, x2b - 2.4, y2);
      c.lineTo(x2a + 2.4, y2);
      c.quadraticCurveTo(x2a, y2, x2a + 0.3, y2 - 2.2);
      c.quadraticCurveTo(mxl, my, x1a - 0.5, y1 + 1.8);
      c.quadraticCurveTo(x1a, y1, x1a + 2.2, y1);
      c.closePath();
      const gg = c.createLinearGradient(0, y1, 0, y2);
      gg.addColorStop(0, '#0F1824');
      gg.addColorStop(0.55, '#1D2D40');
      gg.addColorStop(1, '#263B52');
      c.fillStyle = gg;
      c.fill();
      c.strokeStyle = this.OUTLINE;
      c.lineWidth = 1.35;
      c.lineJoin = 'round';
      c.stroke();
      this.poly(c, [
        [x1a + (x1b - x1a) * 0.14, y1 + 1.0], [x1a + (x1b - x1a) * 0.36, y1 + 1.0],
        [x2a + (x2b - x2a) * 0.26, y2 - 1.0], [x2a + (x2b - x2a) * 0.07, y2 - 1.0]
      ], 'rgba(165, 210, 248, 0.24)', null, 0);
    },

    shade(hex, amt) {
      const key = `${hex}_${amt}`;
      const cached = this._cache.get(key);
      if (cached) return cached;
      let col = (hex || '#CCCCCC').replace('#', '');
      if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
      const num = parseInt(col, 16);
      const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amt));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amt));
      const b = Math.max(0, Math.min(255, (num & 255) + amt));
      const res = `rgb(${r},${g},${b})`;
      this._cache.set(key, res);
      return res;
    },

    bodyGrad(c, body, yTop, yBot) {
      const g = c.createLinearGradient(0, yTop, 0, yBot);
      g.addColorStop(0, this.shade(body, 28));
      g.addColorStop(0.28, body);
      g.addColorStop(0.72, this.shade(body, -14));
      g.addColorStop(1, this.shade(body, -34));
      return g;
    },

    poly(c, pts, fill, stroke = '#0E131B', lw = 1.25) {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        c.lineTo(pts[i][0], pts[i][1]);
      }
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke && lw > 0) {
        c.strokeStyle = stroke;
        c.lineWidth = lw;
        c.lineJoin = 'round';
        c.lineCap = 'round';
        c.stroke();
      }
    },

    roundRect(c, x, y, w, h, r, fill, stroke = '#0E131B', lw = 1.1) {
      const rad = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
      c.beginPath();
      c.moveTo(x + rad, y);
      c.arcTo(x + w, y, x + w, y + h, rad);
      c.arcTo(x + w, y + h, x, y + h, rad);
      c.arcTo(x, y + h, x, y, rad);
      c.arcTo(x, y, x + w, y, rad);
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke && lw > 0) {
        c.strokeStyle = stroke;
        c.lineWidth = lw;
        c.stroke();
      }
    },

    line(c, x1, y1, x2, y2, stroke = '#0E131B', lw = 1.1) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.strokeStyle = stroke;
      c.lineWidth = lw;
      c.lineCap = 'round';
      c.stroke();
    },

    box(c, x, y, w, h, fill, stroke = '#0E131B', lw = 1.2) {
      if (fill) {
        c.fillStyle = fill;
        c.fillRect(x, y, w, h);
      }
      if (stroke && lw > 0) {
        c.strokeStyle = stroke;
        c.lineWidth = lw;
        c.strokeRect(x, y, w, h);
      }
    },

    // Desenha retrovisor com base/haste conectada à lataria e lente com reflexo especular
    drawMirror(c, x, y, w, h, r, fill, stemX, stemY, isLeft) {
      const out = this.OUTLINE;
      this.line(c, stemX, stemY, isLeft ? x + w - 0.5 : x + 0.5, y + h * 0.5, '#12161F', 1.6);
      this.roundRect(c, x, y, w, h, r, fill, out, 1.15);
      c.fillStyle = 'rgba(255, 255, 255, 0.28)';
      c.fillRect(x + 0.8, y + 0.8, w - 1.6, 1.0);
    },

    drawRearTire(c, x, y, w, h) {
      const tg = c.createLinearGradient(x, y, x + w, y);
      tg.addColorStop(0, '#0B0E14');
      tg.addColorStop(0.5, '#252C3A');
      tg.addColorStop(1, '#0B0E14');
      this.roundRect(c, x, y, w, h, 2.2, tg, this.OUTLINE, 1.2);
      c.strokeStyle = 'rgba(10, 12, 18, 0.75)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(x + w * 0.33, y + 1.5);
      c.lineTo(x + w * 0.33, y + h - 1.5);
      c.moveTo(x + w * 0.67, y + 1.5);
      c.lineTo(x + w * 0.67, y + h - 1.5);
      c.stroke();
    },

    drawSideWheel(c, wx, wy, rx, ry, style = 'alloy', side = -1) {
      c.save();
      c.translate(wx, wy);
      c.fillStyle = '#0B0E14';
      c.beginPath();
      c.ellipse(-side * 1.6, 0, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = this.OUTLINE;
      c.lineWidth = 1.1;
      c.stroke();

      c.fillStyle = '#1D2430';
      c.beginPath();
      c.ellipse(0, 0, rx * 0.92, ry * 0.96, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      if (style === 'hubcap') {
        c.fillStyle = '#9AA9B8';
        c.beginPath();
        c.ellipse(side * 0.2, 0, rx * 0.62, ry * 0.64, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#EDF3F8';
        c.beginPath();
        c.ellipse(side * 0.3, -0.3, rx * 0.38, ry * 0.40, 0, 0, Math.PI * 2);
        c.fill();
      } else if (style === 'steel') {
        c.fillStyle = '#B5C0CC';
        c.beginPath();
        c.ellipse(side * 0.2, 0, rx * 0.62, ry * 0.64, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#242C38';
        c.beginPath();
        c.ellipse(side * 0.2, 0, rx * 0.22, ry * 0.22, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = '#D5DEE8';
        c.beginPath();
        c.ellipse(side * 0.2, 0, rx * 0.65, ry * 0.67, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#28313E';
        for (let s = 0; s < 5; s++) {
          const ang = (s * Math.PI * 2) / 5;
          c.beginPath();
          c.ellipse(Math.cos(ang) * rx * 0.34, Math.sin(ang) * ry * 0.34, rx * 0.16, ry * 0.16, 0, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
    },

    // Desenha a lateral sólida em perspectiva 2.5D no estilo clássico Top Gear 1:
    // A capota e o teto permanecem 100% lisos e conectados, sem nenhum recorte solto ou porta aberta!
    drawDiscreetSideFlank(c, body, turn, opts) {
      const at = Math.abs(turn);
      if (at < 0.05) return;
      const side = turn < 0 ? -1 : 1; // -1 = curva à esquerda, 1 = curva à direita
      const rx = opts.rx;
      const tx = opts.tx;
      const rearW = opts.rearW;
      const roofW = opts.roofW;
      const roofY = opts.roofY;
      const beltY = opts.beltY;
      const botY = opts.botY;
      const wheelStyle = opts.wheelStyle || 'alloy';
      const isCurvedRoof = !!opts.curvedRoof;

      // Proporção de profundidade sutil e harmônica Top Gear 1
      const flankW = at * 3.2;

      const rearShoulderX = rx + side * rearW;
      const rearBotX = rx + side * (opts.botW !== undefined ? opts.botW : rearW);

      // A linha de cintura se estende suavemente para a dianteira em direção ao ponto de fuga
      const frontNoseX = rearShoulderX + side * flankW;
      const frontNoseY = beltY - at * 0.5;
      const frontBotX = frontNoseX - side * 0.4;
      const frontBotY = botY - at * 0.8;

      // 1. Roda dianteira discreta sob o para-lama dianteiro, tocando o asfalto (estilo Top Gear 1)
      this.drawSideWheel(c, frontNoseX - side * 1.5, botY - 1.2, 2.3, 5.0, wheelStyle, side);

      if (isCurvedRoof) {
        // Para carros de silhueta curva (Peugeot 206 e HB20):
        // Estilo Top Gear 1 puro — o teto/capota em bézier permanece 100% íntegro, limpo e conectado!
        // A lateral estende a lataria da porta e para-lama abaixo da cintura (beltline) até a dianteira.
        const sideGrad = c.createLinearGradient(0, beltY, 0, botY);
        sideGrad.addColorStop(0, this.shade(body, -16));
        sideGrad.addColorStop(0.5, this.shade(body, -26));
        sideGrad.addColorStop(1, this.shade(body, -36));

        c.beginPath();
        c.moveTo(rearShoulderX, beltY);
        c.lineTo(frontNoseX, frontNoseY);
        c.lineTo(frontBotX, frontBotY);
        c.lineTo(rearBotX, botY);
        c.closePath();
        c.fillStyle = sideGrad;
        c.fill();

        // Contorno externo contínuo da carroceria
        c.beginPath();
        c.moveTo(rearShoulderX, beltY);
        c.lineTo(frontNoseX, frontNoseY);
        c.lineTo(frontBotX, frontBotY);
        c.lineTo(rearBotX, botY);
        c.strokeStyle = this.OUTLINE;
        c.lineWidth = 1.35;
        c.lineJoin = 'round';
        c.stroke();

        // Friso da soleira
        this.line(c, frontBotX, frontBotY, rearBotX, botY, '#0E121A', 1.2);

        // Retrovisor integrado na cintura (lado da curva)
        const mirrorW = 5.2, mirrorH = 3.6;
        const mirrorX = frontNoseX - (side > 0 ? 0.6 : mirrorW - 0.6);
        const mirrorY = beltY - 2.8;
        const mirrorColor = opts.mirrorColor || body;
        this.drawMirror(c, mirrorX, mirrorY, mirrorW, mirrorH, 1.8, mirrorColor, frontNoseX - side * 2.0, beltY - 0.5, side < 0);
      } else {
        // Carros com teto plano / caixa clássica (Uno Mille e Fusca 1300):
        const roofCornerX = tx + side * roofW;
        const sideGrad = c.createLinearGradient(0, roofY, 0, botY);
        sideGrad.addColorStop(0, this.shade(body, -16));
        sideGrad.addColorStop(0.5, this.shade(body, -26));
        sideGrad.addColorStop(1, this.shade(body, -36));

        c.beginPath();
        c.moveTo(roofCornerX, roofY);
        c.lineTo(frontNoseX, frontNoseY);
        c.lineTo(frontBotX, frontBotY);
        c.lineTo(rearBotX, botY);
        c.lineTo(rearShoulderX, beltY);
        c.closePath();
        c.fillStyle = sideGrad;
        c.fill();

        if (beltY > roofY + 3) {
          c.beginPath();
          c.moveTo(roofCornerX - side * 0.6, roofY + 1.2);
          c.lineTo(frontNoseX - side * 0.8, beltY - 0.4);
          c.lineTo(rearShoulderX - side * 0.6, beltY - 0.4);
          c.closePath();
          c.fillStyle = '#0F1622';
          c.fill();
        }

        this.line(c, frontBotX, frontBotY, rearBotX, botY, '#0E121A', 1.2);

        c.beginPath();
        c.moveTo(roofCornerX, roofY);
        c.lineTo(frontNoseX, frontNoseY);
        c.lineTo(frontBotX, frontBotY);
        c.lineTo(rearBotX, botY);
        c.strokeStyle = this.OUTLINE;
        c.lineWidth = 1.35;
        c.lineJoin = 'round';
        c.stroke();

        if (wheelStyle === 'hubcap') {
          // Fusca: espelho redondo clássico cromado com haste
          const mx = frontNoseX - (side > 0 ? 0.5 : 4.5);
          const my = beltY - 5.5;
          this.drawMirror(c, mx, my, 4.4, 3.4, 1.8, '#DCE5EE', frontNoseX - side * 2.5, beltY - 1.5, side < 0);
        } else {
          // Uno Mille
          const mirrorW = 5.2, mirrorH = 3.8;
          const mirrorX = frontNoseX - (side > 0 ? 0.6 : mirrorW - 0.6);
          const mirrorY = beltY - 2.8;
          const mirrorColor = opts.mirrorColor || '#1D222B';
          this.drawMirror(c, mirrorX, mirrorY, mirrorW, mirrorH, 1.0, mirrorColor, frontNoseX - side * 2.0, beltY - 0.5, side < 0);
        }
      }
    },

    drawPlateStraight(c, x, y, w, h) {
      this.roundRect(c, x, y, w, h, 1.0, '#F0F4F8', this.OUTLINE, 1.0);
      c.fillStyle = '#1552B8';
      c.fillRect(x + 0.6, y + 0.5, w - 1.2, Math.max(1.5, h * 0.30));
      c.fillStyle = '#1F2A38';
      c.fillRect(x + 2.4, y + h * 0.54, w - 4.8, 1.2);
    },

    drawGlassQuad(c, pts) {
      const minY = Math.min(pts[0][1], pts[1][1]);
      const maxY = Math.max(pts[2][1], pts[3][1]);
      const gg = c.createLinearGradient(0, minY, 0, maxY);
      gg.addColorStop(0, '#0F1824');
      gg.addColorStop(0.55, '#1D2D40');
      gg.addColorStop(1, '#263B52');
      this.poly(c, pts, gg, this.OUTLINE, 1.35);

      // Reflexo diagonal suave no vidro HD
      const lx0 = pts[0][0] + (pts[1][0] - pts[0][0]) * 0.14;
      const ly0 = pts[0][1] + (pts[1][1] - pts[0][1]) * 0.14 + 0.8;
      const lx1 = pts[0][0] + (pts[1][0] - pts[0][0]) * 0.38;
      const ly1 = pts[0][1] + (pts[1][1] - pts[0][1]) * 0.38 + 0.8;
      const bx1 = pts[3][0] + (pts[2][0] - pts[3][0]) * 0.24;
      const by1 = pts[3][1] + (pts[2][1] - pts[3][1]) * 0.24 - 0.8;
      const bx0 = pts[3][0] + (pts[2][0] - pts[3][0]) * 0.07;
      const by0 = pts[3][1] + (pts[2][1] - pts[3][1]) * 0.07 - 0.8;
      this.poly(c, [[lx0, ly0], [lx1, ly1], [bx1, by1], [bx0, by0]], 'rgba(165, 210, 248, 0.26)', null, 0);
    },

    drawTailGlow(c, x, y, rx, ry, isBraking, isNight) {
      if (!isBraking && !isNight) return;
      if (isBraking) {
        // Freio acionado: luz ultra-forte que sobrepoe a lanterna com nucleo incandescente
        const r = Math.max(rx, ry) * 2.8;
        const grad = c.createRadialGradient(x, y, 0.5, x, y, r);
        grad.addColorStop(0, 'rgba(255, 250, 240, 0.95)');
        grad.addColorStop(0.25, 'rgba(255, 25, 0, 0.88)');
        grad.addColorStop(0.65, 'rgba(235, 15, 0, 0.42)');
        grad.addColorStop(1, 'rgba(220, 10, 0, 0)');
        c.fillStyle = grad;
        c.beginPath();
        c.ellipse(x, y, rx * 2.6, ry * 2.6, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        // Lanterna de noite: vermelho rubi continuo e suave
        const r = Math.max(rx, ry) * 1.5;
        const grad = c.createRadialGradient(x, y, 0.5, x, y, r);
        grad.addColorStop(0, 'rgba(255, 45, 20, 0.60)');
        grad.addColorStop(0.55, 'rgba(220, 20, 10, 0.25)');
        grad.addColorStop(1, 'rgba(180, 15, 0, 0)');
        c.fillStyle = grad;
        c.beginPath();
        c.ellipse(x, y, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2);
        c.fill();
      }
    },

    drawExhaustPipe(c, x, y, r = 2.0) {
      this.roundRect(c, x - r, y - r * 0.85, r * 2, r * 1.7, r * 0.8, '#DCE4EC', this.OUTLINE, 0.95);
      c.fillStyle = '#181E26';
      c.beginPath();
      c.arc(x, y, r * 0.52, 0, Math.PI * 2);
      c.fill();
    },

    getSprite(model, bodyColor, angleIdx, isBraking, isNight) {
      const key = `${model.id}|${bodyColor}|${angleIdx}|${isBraking ? 1 : 0}|${isNight ? 1 : 0}`;
      let canvas = this._spriteCache.get(key);
      if (canvas) return canvas;

      const S = this.SPRITE_SCALE;
      canvas = document.createElement('canvas');
      canvas.width = this.SPRITE_W * S;
      canvas.height = this.SPRITE_H * S;
      const c = canvas.getContext('2d');

      c.save();
      c.scale(S, S);
      c.translate(this.ORIGIN_X, this.ORIGIN_Y);
      const turn = angleIdx * 0.5; // -1.0, -0.5, 0, +0.5, +1.0 (discreto e progressivo!)
      model.drawHD(c, bodyColor, turn, isBraking, isNight);
      c.restore();

      // Zero getImageData/putImageData: preserva anti-aliasing HD e evita travamentos na GPU!
      this._spriteCache.set(key, canvas);
      return canvas;
    },

    // Pré-aquece os sprites dos carros principais no carregamento para zero engasgos na pista
    warmUp(models) {
      const angles = [-2, -1, 0, 1, 2];
      for (let m = 0; m < models.length; m++) {
        const mod = models[m];
        for (let a = 0; a < angles.length; a++) {
          this.getSprite(mod, mod.primaryColor, angles[a], false, false);
          this.getSprite(mod, mod.primaryColor, angles[a], true, false);
          this.getSprite(mod, mod.primaryColor, angles[a], false, true);
        }
      }
    },

    drawGroundShadow(ctx, w, h, turn, isBraking, isNight) {
      ctx.save();
      const shiftX = -turn * w * 0.025;
      ctx.translate(shiftX, h * 0.34);
      ctx.rotate(-turn * 0.045);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.39, h * 0.115, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.015, w * 0.32, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isBraking || isNight) {
        ctx.fillStyle = isBraking ? 'rgba(255, 34, 12, 0.28)' : 'rgba(255, 22, 8, 0.13)';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.02, w * 0.33, h * 0.085, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawNitroFlame(ctx, ex, ey, r, isNitro) {
      if (!isNitro) return;
      const flick = 0.88 + Math.random() * 0.38;
      ctx.fillStyle = 'rgba(0, 165, 255, 0.48)';
      ctx.beginPath();
      ctx.ellipse(ex, ey + r * 1.55 * flick, r * 1.4, r * 2.4 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.ellipse(ex, ey + r * 1.0 * flick, r * 0.92, r * 1.55 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(ex, ey + r * 0.42, r * 0.50, r * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
    },

    // Coordenadas EXATAS da borracha visível dos pneus traseiros (abaixo do para-choque)
    // Garantia total: NUNCA invade o para-choque nem altera o tamanho dos pneus
    TIRE_SPECS: {
      uno:      { lx: 30.5, rx: 21.0, y: 20.8, w: 9.5,  h: 3.4 },
      fusca:    { lx: 29.5, rx: 20.7, y: 20.2, w: 8.8,  h: 3.8 },
      peugeot:  { lx: 31.6, rx: 21.4, y: 20.2, w: 10.2, h: 3.8 },
      hb20:     { lx: 31.8, rx: 21.4, y: 20.4, w: 10.4, h: 3.6 },
      opala:    { lx: 34.0, rx: 22.5, y: 19.8, w: 11.5, h: 4.4 },
      gol:      { lx: 31.8, rx: 22.0, y: 20.2, w: 9.8,  h: 3.6 },
      chevette: { lx: 31.0, rx: 21.8, y: 20.0, w: 9.2,  h: 4.0 },
      brasilia: { lx: 31.5, rx: 22.0, y: 20.2, w: 9.4,  h: 3.8 }
    },

    // Efeito discreto de movimento/rolamento APENAS na borracha dos pneus traseiros
    drawWheelMotionEffect(ctx, model, w, h, turn, phase, spd) {
      if (spd < 3) return; // Parado: sem efeito

      const spec = this.TIRE_SPECS[model.id] || { lx: 31.0, rx: 21.5, y: 20.2, w: 9.8, h: 3.8 };
      const sx = w / this.SPRITE_W;
      const sy = h / this.SPRITE_H;
      const at = Math.abs(turn);
      const rx = -turn * 4.6;
      const sxTurn = 1 - at * 0.05;

      const tires = [
        { x: (rx - spec.lx * sxTurn) * sx, y: spec.y * sy, w: spec.w * sx, h: spec.h * sy },
        { x: (rx + spec.rx * sxTurn) * sx, y: spec.y * sy, w: spec.w * sx, h: spec.h * sy }
      ];

      // Frequência de rolamento proporcional à velocidade
      const stepH = Math.max(1.6, spec.h * sy * 0.45);
      const rollOffset = ((phase * 8) % stepH + stepH) % stepH;
      const blurIntensity = Math.min(1.0, spd / 180);
      const lineH = Math.max(0.6, spec.h * sy * 0.22);

      for (let t = 0; t < tires.length; t++) {
        const tire = tires[t];
        ctx.save();
        // Não aumenta o tamanho da roda e NUNCA invade o para-choque: clip exato na borracha inferior
        ctx.beginPath();
        ctx.rect(tire.x + 0.6, tire.y, tire.w - 1.2, tire.h);
        ctx.clip();

        // 1. Ranhuras horizontais em rolamento sutil
        ctx.fillStyle = `rgba(6, 8, 12, ${0.45 + blurIntensity * 0.25})`;
        for (let gy = tire.y - stepH + rollOffset; gy < tire.y + tire.h + stepH; gy += stepH) {
          ctx.fillRect(tire.x + 0.6, gy, tire.w - 1.2, lineH);
        }

        // 2. Reflexo dinâmico de rotação da borracha (shimmer sutil)
        const shineY = tire.y + ((phase * 12) % tire.h);
        const shineGrad = ctx.createLinearGradient(0, shineY - 1, 0, shineY + 2);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shineGrad.addColorStop(0.5, `rgba(255, 255, 255, ${(0.04 + blurIntensity * 0.06).toFixed(3)})`);
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGrad;
        ctx.fillRect(tire.x + 0.6, tire.y, tire.w - 1.2, tire.h);

        ctx.restore();
      }
    },

    renderModel(ctx, model, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
      const isNitro = opts ? !!opts.isNitro : false;
      const isNight = opts ? !!opts.isNight : false;
      const phase = opts ? (opts.wheelPhase || 0) : 0;
      const spd = opts ? (opts.speed || 0) : 0;
      const vib = spd > 8 ? Math.sin(phase * 3.2) * (h * 0.0035) : 0;

      // 5 estágios sutis de perspectiva (-2, -1, 0, +1, +2) — ângulos discretos e naturais!
      let angleIdx = 0;
      if (steer <= -0.56) angleIdx = -2;
      else if (steer <= -0.18) angleIdx = -1;
      else if (steer >= 0.56) angleIdx = 2;
      else if (steer >= 0.18) angleIdx = 1;

      const turn = angleIdx * 0.5;
      const body = customBody || model.primaryColor;
      const sprite = this.getSprite(model, body, angleIdx, !!isBraking, isNight);

      ctx.save();
      ctx.translate(x, y + vib);

      this.drawGroundShadow(ctx, w, h, turn, isBraking, isNight);

      // Leve rolagem realista da suspensão na curva (~1.8° máx.)
      if (Math.abs(steer) > 0.01) {
        ctx.rotate(steer * 0.032);
      }

      const drawX = -w * (this.ORIGIN_X / this.SPRITE_W);
      const drawY = -h * (this.ORIGIN_Y / this.SPRITE_H);
      ctx.drawImage(sprite, drawX, drawY, w, h);

      // Efeito discreto de rodas em movimento proporcional à velocidade (sem alterar dimensões)
      this.drawWheelMotionEffect(ctx, model, w, h, turn, phase, spd);

      if (isNitro) {
        const sx = w / this.SPRITE_W;
        const sy = h / this.SPRITE_H;
        const rxShift = -turn * 4.5;
        const pipes = model.exhaustPipes;
        for (let i = 0; i < pipes.length; i++) {
          this.drawNitroFlame(ctx, (pipes[i][0] + rxShift) * sx, pipes[i][1] * sy, Math.max(2, w * 0.042), true);
        }
      }

      ctx.restore();
    }
  };

  const CAR_MODELS = [
    {
      id: 'uno',
      name: 'UNO MILLE',
      badge: 'COM ESCADINHA DE FIRMA - O MAIS RÁPIDO',
      desc: 'O lendário bólido da firma! Com a escada no teto rompe as leis da física e atinge a maior velocidade final do campeonato!',
      maxSpeed: 298,
      acceleration: 0.82,
      braking: 0.90,
      handling: 0.60,
      grip: 0.65,
      centrifugalResistance: 0.62,
      primaryColor: '#EEF2F6',
      roofColor: '#2B2B33',
      exhaustPipes: [[-18.5, 21.5]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        // Pneus traseiros
        CarArt.drawRearTire(c, rx - 30.5 * sx, 13, 9.5, 11.2);
        CarArt.drawRearTire(c, rx + 21.0 * sx, 13, 9.5, 11.2);

        // Carroceria trapezoidal Giugiaro HD com pintura metálica/verniz
        const rearBody = [
          [tx - 24.8 * sx, -24], [tx + 24.8 * sx, -24],
          [rx + 31.2 * sx, -6],  [rx + 32.0 * sx, 13.5],
          [rx - 32.0 * sx, 13.5],[rx - 31.2 * sx, -6]
        ];
        CarArt.poly(c, rearBody, CarArt.bodyGrad(c, body, -24, 14), out, 1.45);

        // Lateral contínua e integrada Top Gear 1 (sem recortes, sem porta aberta solta!)
        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 31.2 * sx, roofW: 24.8 * sx,
          roofY: -24, beltY: -6, botY: 13.5, wheelStyle: 'steel', mirrorColor: '#1D222B'
        });

        // Retrovisores clássicos pretos: visíveis em linha reta de ambos os lados e no lado oposto na curva
        if (turn >= -0.1) {
          CarArt.drawMirror(c, tx - 35.2 * sx, -9.6, 5.2, 3.8, 1.0, '#1D222B', tx - 29.8 * sx, -7.0, true);
        }
        if (turn <= 0.1) {
          CarArt.drawMirror(c, tx + 30.0 * sx, -9.6, 5.2, 3.8, 1.0, '#1D222B', tx + 24.6 * sx, -7.0, false);
        }

        // Brilho superior no teto e vinco sob o vidro
        CarArt.line(c, tx - 23 * sx, -22.6, tx + 23 * sx, -22.6, CarArt.shade(body, 32), 1.4);
        CarArt.line(c, rx - 29 * sx, -5.2, rx + 29 * sx, -5.2, CarArt.shade(body, 26), 1.2);

        // Recorte da tampa do porta-malas
        c.strokeStyle = CarArt.shade(body, -42);
        c.lineWidth = 0.9;
        c.strokeRect(rx - 24.5 * sx, -5.2, 49 * sx, 16.2);

        // Vigia traseira ampla com borracha preta + limpador inclinado à direita (igual ao print!)
        CarArt.drawGlassQuad(c, [
          [tx - 21.5 * sx, -20.8], [tx + 21.5 * sx, -20.8],
          [rx + 26.2 * sx, -6.8],  [rx - 26.2 * sx, -6.8]
        ]);
        CarArt.line(c, rx - 1.5, -7.4, rx + 12.5 * sx, -12.6, '#0E131B', 1.6);
        c.fillStyle = '#0E131B';
        c.beginPath();
        c.arc(rx - 1.5, -7.4, 1.5, 0, Math.PI * 2);
        c.fill();

        // Emblema redondo bordô/vermelho FIAT no centro da tampa (fiel ao print!)
        c.fillStyle = '#DCE4EC';
        c.beginPath();
        c.arc(rx, 1.8, 3.1, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 0.8;
        c.stroke();
        c.fillStyle = '#8E1B24';
        c.beginPath();
        c.arc(rx, 1.8, 2.2, 0, Math.PI * 2);
        c.fill();
        CarArt.line(c, rx - 1.0, 2.5, rx + 1.0, 1.1, '#F5F7FA', 0.7);

        // Lanternas verticais quadradas tricolores (laranja topo, vermelho centro/base, ré branca)
        const lxL = rx - 31.4 * sx;
        const lxR = rx + 22.4 * sx;
        CarArt.roundRect(c, lxL, -0.2, 9.0 * sx, 10.8, 1.3, tailRed, out, 1.2);
        CarArt.roundRect(c, lxR, -0.2, 9.0 * sx, 10.8, 1.3, tailRed, out, 1.2);
        c.fillStyle = '#F59E0B';
        c.fillRect(lxL + 0.9, 0.7, 7.2 * sx, 3.2);
        c.fillRect(lxR + 0.9, 0.7, 7.2 * sx, 3.2);
        c.fillStyle = '#F1F5F9';
        c.fillRect(lxL + 4.8 * sx, 7.0, 3.2 * sx, 2.6);
        c.fillRect(lxR + 1.0 * sx, 7.0, 3.2 * sx, 2.6);
        CarArt.drawTailGlow(c, lxL + 4.5 * sx, 5.5, 5, 5, isBraking, isNight);
        CarArt.drawTailGlow(c, lxR + 4.5 * sx, 5.5, 5, 5, isBraking, isNight);

        // Ponteira cromada do escapamento à esquerda + Para-choque preto fosco envolvente + Placa Mercosul
        CarArt.drawExhaustPipe(c, rx - 18.5 * sx, 21.4, 2.0);
        const bmpGrad = c.createLinearGradient(0, 11, 0, 20.8);
        bmpGrad.addColorStop(0, '#2C333F');
        bmpGrad.addColorStop(0.5, '#1F242D');
        bmpGrad.addColorStop(1, '#13171E');
        CarArt.roundRect(c, rx - 32.8 * sx, 11.0, 65.6 * sx, 9.6, 2.0, bmpGrad, out, 1.35);
        CarArt.line(c, rx - 31.2 * sx, 14.0, rx + 31.2 * sx, 14.0, '#10141B', 1.0);
        CarArt.drawPlateStraight(c, rx - 10.0, 14.4, 20.0, 5.4);

        // === RACK E ESCADA METÁLICA 3D NO TETO (perspectiva sutil acompanhando a curva) ===
        const ladderFrontShift = -turn * 3.8;
        const lBackL = tx - 17.5 * sx;
        const lBackR = tx + 17.5 * sx;
        const lFrontL = tx - 14.5 * sx + ladderFrontShift;
        const lFrontR = tx + 14.5 * sx + ladderFrontShift;

        // Sapatas pretas do rack de teto
        CarArt.line(c, tx - 20.5 * sx, -24, lBackL, -29.5, '#171C24', 2.4);
        CarArt.line(c, tx + 20.5 * sx, -24, lBackR, -29.5, '#171C24', 2.4);
        CarArt.line(c, lBackL - 1.5, -28.2, lBackR + 1.5, -28.2, '#1F2630', 1.8);

        // Degraus horizontais de alumínio entre as longarinas
        for (let k = 0; k < 5; k++) {
          const f = k / 4;
          const x1 = lBackL + (lFrontL - lBackL) * f;
          const x2 = lBackR + (lFrontR - lBackR) * f;
          const ry = -27.5 - f * 5.8;
          CarArt.line(c, x1, ry, x2, ry, out, 2.2);
          CarArt.line(c, x1 + 0.5, ry, x2 - 0.5, ry, '#CFD8E3', 1.15);
        }
        // Longarinas laterais da escada
        CarArt.poly(c, [[lBackL - 1.6, -27.0], [lFrontL - 1.4, -33.6], [lFrontL + 1.0, -33.6], [lBackL + 1.0, -27.0]], '#9AA5B4', out, 1.0);
        CarArt.poly(c, [[lBackR - 1.0, -27.0], [lFrontR - 1.0, -33.6], [lFrontR + 1.6, -33.6], [lBackR + 1.6, -27.0]], '#9AA5B4', out, 1.0);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'fusca',
      name: 'FUSCA 1300',
      badge: 'HANDLING PERFEITO',
      desc: 'Mais lento em reta, mas faz curvas de pé cravado com aderência lendária!',
      maxSpeed: 208,
      acceleration: 0.58,
      braking: 0.75,
      handling: 1.0,
      grip: 1.0,
      centrifugalResistance: 1.0,
      primaryColor: '#4678A2',
      exhaustPipes: [[-6.5, 21.5], [6.5, 21.5]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.5;
        const tx = -turn * 2.1;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        // Pneus estreitos clássicos
        CarArt.drawRearTire(c, rx - 29.5 * sx, 13, 8.8, 11.2);
        CarArt.drawRearTire(c, rx + 20.7 * sx, 13, 8.8, 11.2);

        // Para-lamas traseiros abaulados esquerdo e direito
        const fenderGrad = CarArt.bodyGrad(c, CarArt.shade(body, -6), -2, 20);
        c.fillStyle = fenderGrad;
        c.beginPath();
        c.ellipse(rx - 23.8 * sx, 9.8, 8.8 * sx, 11.2, -0.08, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.4;
        c.stroke();

        c.fillStyle = fenderGrad;
        c.beginPath();
        c.ellipse(rx + 23.8 * sx, 9.8, 8.8 * sx, 11.2, 0.08, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Cabine arredondada clássica do Fusca
        c.fillStyle = CarArt.bodyGrad(c, body, -26, 19);
        c.beginPath();
        c.moveTo(rx - 20.2 * sx, 18);
        c.quadraticCurveTo(rx - 26.2 * sx, -4, tx - 18.2 * sx, -21.2);
        c.quadraticCurveTo(tx, -27.2, tx + 18.2 * sx, -21.2);
        c.quadraticCurveTo(rx + 26.2 * sx, -4, rx + 20.2 * sx, 18);
        c.closePath();
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.45;
        c.stroke();

        // Lateral contínua Top Gear 1 integrada à cabine do Fusca
        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 26.2 * sx, roofW: 18.2 * sx,
          roofY: -21.2, beltY: -4, botY: 18, wheelStyle: 'hubcap', mirrorColor: '#DCE5EE'
        });

        // Retrovisores redondos cromados clássicos: visíveis em reta de ambos os lados e no lado oposto na curva (zero duplicidade!)
        if (turn >= -0.1) {
          CarArt.drawMirror(c, tx - 29.5 * sx, -12.0, 4.4, 3.4, 1.8, '#DCE5EE', tx - 22.0 * sx, -8.5, true);
        }
        if (turn <= 0.1) {
          CarArt.drawMirror(c, tx + 25.1 * sx, -12.0, 4.4, 3.4, 1.8, '#DCE5EE', tx + 17.6 * sx, -8.5, false);
        }

        // Reflexo especular suave no teto abaulado
        c.fillStyle = 'rgba(255, 255, 255, 0.20)';
        c.beginPath();
        c.ellipse(tx, -21.2, 11.5 * sx, 2.3, 0, 0, Math.PI * 2);
        c.fill();

        // Vigia traseira oval com borracha preta e reflexo curvo
        c.fillStyle = '#152232';
        c.beginPath();
        c.ellipse(tx * 0.65 + rx * 0.35, -12.5, 14.4 * sx, 5.9, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.45;
        c.stroke();
        c.fillStyle = 'rgba(165, 212, 250, 0.28)';
        c.beginPath();
        c.ellipse(tx * 0.65 + rx * 0.35 - 4.5, -13.6, 5.6 * sx, 2.2, -0.22, 0, Math.PI * 2);
        c.fill();

        // Grelha curva de aletas de refrigeração logo abaixo do vidro (fiel ao print!)
        for (let gx = -11; gx <= 11; gx += 2.2) {
          const archY = -4.8 + (gx * gx) * 0.011;
          CarArt.line(c, rx + gx * sx, archY, rx + gx * sx, archY + 2.3, '#101822', 1.05);
        }

        // Tampa curva do motor Boxer
        c.strokeStyle = CarArt.shade(body, -42);
        c.lineWidth = 1.15;
        c.beginPath();
        c.moveTo(rx - 15.2 * sx, -1.5);
        c.quadraticCurveTo(rx, -4.5, rx + 15.2 * sx, -1.5);
        c.quadraticCurveTo(rx + 16.5 * sx, 14.5, rx, 17.5);
        c.quadraticCurveTo(rx - 16.5 * sx, 14.5, rx - 15.2 * sx, -1.5);
        c.stroke();

        // Emblema redondo cromado/branco VW acima da placa (fiel ao print!)
        c.fillStyle = '#EFF4F8';
        c.beginPath();
        c.arc(rx, 2.2, 3.0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 0.85;
        c.stroke();
        CarArt.line(c, rx - 1.3, 1.2, rx, 3.2, '#1C4E80', 0.8);
        CarArt.line(c, rx + 1.3, 1.2, rx, 3.2, '#1C4E80', 0.8);

        // Placa Mercosul centralizada na tampa do motor
        CarArt.drawPlateStraight(c, rx - 8.5, 7.0, 17.0, 5.2);

        // Lanternas ovais bicolores nos para-lamas (laranja em cima, vermelho embaixo + aro cromado)
        const drawFuscaLamp = (lx) => {
          c.fillStyle = '#DCE5EE';
          c.beginPath();
          c.ellipse(lx, 9.2, 4.1 * sx, 5.3, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = out;
          c.lineWidth = 1.0;
          c.stroke();

          c.fillStyle = tailRed;
          c.beginPath();
          c.ellipse(lx, 9.4, 3.1 * sx, 4.2, 0, 0, Math.PI * 2);
          c.fill();

          c.fillStyle = '#F59E0B';
          c.beginPath();
          c.ellipse(lx, 7.4, 2.6 * sx, 2.0, 0, Math.PI, Math.PI * 2);
          c.fill();
          CarArt.drawTailGlow(c, lx, 9.6, 4.2, 4.6, isBraking, isNight);
        };
        drawFuscaLamp(rx - 24.2 * sx);
        drawFuscaLamp(rx + 24.2 * sx);

        // Ponteira dupla Boxer + Para-choque cromado clássico com os 2 poleiros verticais
        CarArt.drawExhaustPipe(c, rx - 6.5 * sx, 21.3, 1.7);
        CarArt.drawExhaustPipe(c, rx + 6.5 * sx, 21.3, 1.7);

        const chrGrad = c.createLinearGradient(0, 15.5, 0, 20.2);
        chrGrad.addColorStop(0, '#FFFFFF');
        chrGrad.addColorStop(0.45, '#CFDCE8');
        chrGrad.addColorStop(0.75, '#7E90A2');
        chrGrad.addColorStop(1, '#DCE6F0');
        CarArt.roundRect(c, rx - 31.2 * sx, 15.6, 62.4 * sx, 4.3, 2.0, chrGrad, out, 1.25);
        CarArt.roundRect(c, rx - 16.5 * sx, 12.8, 3.6, 8.2, 1.4, '#F2F7FB', out, 1.1);
        CarArt.roundRect(c, rx + 12.9 * sx, 12.8, 3.6, 8.2, 1.4, '#F2F7FB', out, 1.1);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'peugeot',
      name: 'PEUGEOT 206',
      badge: 'ÁGIL & EQUILIBRADO',
      desc: 'Hatch esportivo clássico, aceleração rápida e ágil nas curvas. Exige precisão e controle nas retomadas.',
      maxSpeed: 236,
      acceleration: 1.0,
      braking: 0.85,
      handling: 0.84,
      grip: 0.88,
      centrifugalResistance: 0.88,
      primaryColor: '#C5CDD6',
      exhaustPipes: [[-19.0, 21.2]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        // Pneus
        CarArt.drawRearTire(c, rx - 31.6 * sx, 13, 10.2, 11.2);
        CarArt.drawRearTire(c, rx + 21.4 * sx, 13, 10.2, 11.2);

        // Carroceria hatch curva (teto abaulado, quadris largos) — silhueta em bézier
        const shape = { roofY: -22, roofW: 18.6, shY: -7.5, shW: 29.2, midY: 4.5, midW: 33.0, botY: 19.6, botW: 31.2, round: 7, arch: 1.9 };
        CarArt.curvedBody(c, tx, rx, sx, shape);
        c.fillStyle = CarArt.bodyGrad(c, body, -23, 20);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.45;
        c.lineJoin = 'round';
        c.stroke();

        // Lateral contínua Top Gear 1 perfeitamente integrada à carroceria do 206 (sem recortes, sem porta aberta solta!)
        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 31.2 * sx, roofW: 18.6 * sx,
          roofY: -22, beltY: -7.5, botY: 19.6, wheelStyle: 'alloy', mirrorColor: body,
          curvedRoof: true
        });

        // Retrovisores aerodinâmicos na cor da carroceria: visíveis em reta de ambos os lados e no lado oposto na curva
        if (turn >= -0.1) {
          CarArt.drawMirror(c, tx - 33.6 * sx, -9.6, 5.2, 3.6, 1.8, body, tx - 28.2 * sx, -7.2, true);
        }
        if (turn <= 0.1) {
          CarArt.drawMirror(c, tx + 28.4 * sx, -9.6, 5.2, 3.6, 1.8, body, tx + 23.0 * sx, -7.2, false);
        }

        // Brilho do teto e vinco curvo do para-choque
        c.beginPath();
        c.moveTo(tx - 13.5 * sx, -20.7);
        c.quadraticCurveTo(tx, -22.6, tx + 13.5 * sx, -20.7);
        c.strokeStyle = CarArt.shade(body, 32);
        c.lineWidth = 1.2;
        c.stroke();
        c.beginPath();
        c.moveTo(rx - 30.6 * sx, 13.6);
        c.quadraticCurveTo(rx, 15.2, rx + 30.6 * sx, 13.6);
        c.strokeStyle = CarArt.shade(body, -38);
        c.lineWidth = 0.9;
        c.stroke();

        // Terceira luz de freio na borda do teto
        CarArt.roundRect(c, tx - 6.0 * sx, -21.4, 12 * sx, 1.7, 0.8, isBraking ? '#FF2A00' : '#961414', null, 0);

        // Vigia traseira curva (formato de gota) + limpador
        CarArt.glassCurve(c, tx, rx, sx, -18.3, -5.0, 16.6, 24.2, 1.9, 1.7);
        CarArt.line(c, rx + 0.5, -5.6, rx + 12.5 * sx, -10.2, '#0E131B', 1.4);

        // Emblema quadrado do Leão Peugeot no centro + inscrição "206" à direita (igual ao print!)
        CarArt.roundRect(c, rx - 2.3, -1.0, 4.6, 4.4, 1.0, '#171E28', '#E8EFF5', 0.85);
        CarArt.line(c, rx - 0.8, 2.4, rx + 0.9, 0.0, '#F2F6FA', 1.0);
        c.fillStyle = '#2A3442';
        c.font = 'bold 3.5px sans-serif';
        c.textAlign = 'center';
        c.fillText('206', rx + 15.0 * sx, 6.0);

        // Lanternas "olho de gato" — gota rubi que sobe pelo canto da tampa
        const catEye = (sg) => {
          c.beginPath();
          c.moveTo(rx + sg * 31.6 * sx, -6.2);
          c.bezierCurveTo(rx + sg * 29.2 * sx, -9.0, rx + sg * 24.6 * sx, -8.4, rx + sg * 22.4 * sx, -4.8);
          c.bezierCurveTo(rx + sg * 20.6 * sx, -1.4, rx + sg * 21.2 * sx, 3.8, rx + sg * 24.8 * sx, 5.8);
          c.bezierCurveTo(rx + sg * 28.2 * sx, 7.2, rx + sg * 32.0 * sx, 6.4, rx + sg * 33.0 * sx, 3.4);
          c.bezierCurveTo(rx + sg * 33.6 * sx, 0.2, rx + sg * 33.0 * sx, -3.4, rx + sg * 31.6 * sx, -6.2);
          c.closePath();
          c.fillStyle = tailRed;
          c.fill();
          c.strokeStyle = out;
          c.lineWidth = 1.2;
          c.stroke();
          c.fillStyle = '#FCE7D6';
          c.beginPath();
          c.ellipse(rx + sg * 25.4 * sx, 3.0, 2.0 * sx, 1.3, 0, 0, Math.PI * 2);
          c.fill();
        };
        catEye(-1);
        catEye(1);
        CarArt.drawTailGlow(c, rx - 27.0 * sx, 0.4, 5.5, 5.0, isBraking, isNight);
        CarArt.drawTailGlow(c, rx + 27.0 * sx, 0.4, 5.5, 5.0, isBraking, isNight);

        // Friso protetor preto curvo no para-choque + placa Mercosul + escape esquerdo
        c.beginPath();
        c.moveTo(rx - 32.0 * sx, 9.4);
        c.quadraticCurveTo(rx, 7.8, rx + 32.0 * sx, 9.4);
        c.lineTo(rx + 31.4 * sx, 12.8);
        c.quadraticCurveTo(rx, 11.2, rx - 31.4 * sx, 12.8);
        c.closePath();
        c.fillStyle = '#1B2029';
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.0;
        c.stroke();
        CarArt.drawPlateStraight(c, rx - 9.8, 12.4, 19.6, 5.2);
        CarArt.drawExhaustPipe(c, rx - 19.0 * sx, 20.6, 2.0);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'hb20',
      name: 'HB20',
      badge: 'EQUILIBRADO & CONFIÁVEL',
      desc: 'Hatch compacto com equilíbrio entre arrancada, velocidade final e curvas.',
      maxSpeed: 260,
      acceleration: 0.76,
      braking: 0.82,
      handling: 0.82,
      grip: 0.84,
      centrifugalResistance: 0.84,
      primaryColor: '#C81D25',
      exhaustPipes: [[-17.5, 21.5]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        // Pneus
        CarArt.drawRearTire(c, rx - 31.8 * sx, 13, 10.4, 11.2);
        CarArt.drawRearTire(c, rx + 21.4 * sx, 13, 10.4, 11.2);

        // Antena curta no teto (igual ao print)
        CarArt.line(c, tx + 1.5 * sx, -22.6, tx + 3.4 * sx, -27.2, '#141922', 1.1);

        // Carroceria curva esculpida do HB20 (teto fluido, ombros marcados) — silhueta em bézier
        const shape = { roofY: -22.5, roofW: 19.4, shY: -7.0, shW: 30.4, midY: 4.5, midW: 33.4, botY: 20.0, botW: 31.4, round: 5.5, arch: 1.5 };
        CarArt.curvedBody(c, tx, rx, sx, shape);
        c.fillStyle = CarArt.bodyGrad(c, body, -23, 20);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.45;
        c.lineJoin = 'round';
        c.stroke();

        // Lateral contínua Top Gear 1 integrada à carroceria do HB20 (sem recortes, sem porta aberta solta!)
        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 31.4 * sx, roofW: 19.4 * sx,
          roofY: -22.5, beltY: -7.0, botY: 20.0, wheelStyle: 'alloy', mirrorColor: body,
          curvedRoof: true
        });

        // Retrovisores fluidos na cor da carroceria: visíveis em reta de ambos os lados e no lado oposto na curva
        if (turn >= -0.1) {
          CarArt.drawMirror(c, tx - 34.6 * sx, -9.4, 5.2, 3.6, 1.8, body, tx - 29.2 * sx, -7.0, true);
        }
        if (turn <= 0.1) {
          CarArt.drawMirror(c, tx + 29.4 * sx, -9.4, 5.2, 3.6, 1.8, body, tx + 24.0 * sx, -7.0, false);
        }

        // Brilho do teto + vinco curvo do para-choque
        c.beginPath();
        c.moveTo(tx - 14.5 * sx, -20.9);
        c.quadraticCurveTo(tx, -22.8, tx + 14.5 * sx, -20.9);
        c.strokeStyle = CarArt.shade(body, 34);
        c.lineWidth = 1.2;
        c.stroke();
        c.beginPath();
        c.moveTo(rx - 30.8 * sx, 14.4);
        c.quadraticCurveTo(rx, 16.0, rx + 30.8 * sx, 14.4);
        c.strokeStyle = CarArt.shade(body, -38);
        c.lineWidth = 0.9;
        c.stroke();

        // Pequeno aerofólio-lábio integrado no teto com luz de freio LED
        CarArt.roundRect(c, tx - 17.0 * sx, -22.4, 34 * sx, 2.0, 1.0, CarArt.shade(body, -18), null, 0);
        c.fillStyle = isBraking ? '#FF3B20' : '#8A1216';
        c.fillRect(tx - 6.5 * sx, -21.9, 13 * sx, 1.0);

        // Vigia traseira larga e afunilada + limpador
        CarArt.glassCurve(c, tx, rx, sx, -19.2, -5.4, 17.8, 25.0, 1.5, 1.3);
        CarArt.line(c, rx, -6.0, rx + 12.8 * sx, -10.0, '#0E131B', 1.4);

        // Emblema oval cromado "H" da Hyundai no centro + badge "HB20" à esquerda (fiel ao print!)
        c.strokeStyle = '#EFF4F9';
        c.lineWidth = 1.05;
        c.beginPath();
        c.ellipse(rx, 1.4, 3.3, 1.8, 0, 0, Math.PI * 2);
        c.stroke();
        CarArt.line(c, rx - 1.2, 0.3, rx - 1.2, 2.5, '#EFF4F9', 0.85);
        CarArt.line(c, rx + 1.2, 0.3, rx + 1.2, 2.5, '#EFF4F9', 0.85);
        CarArt.line(c, rx - 1.2, 1.4, rx + 1.2, 1.4, '#EFF4F9', 0.85);
        c.fillStyle = '#F0F4F8';
        c.font = 'bold 3.3px sans-serif';
        c.textAlign = 'center';
        c.fillText('HB20', rx - 14.2 * sx, 7.6);

        // Lanternas bumerangue (curvas) que invadem a tampa traseira
        const boomerang = (sg) => {
          c.beginPath();
          c.moveTo(rx + sg * 33.0 * sx, -4.6);
          c.bezierCurveTo(rx + sg * 27.0 * sx, -5.4, rx + sg * 19.5 * sx, -3.8, rx + sg * 14.2 * sx, -0.6);
          c.bezierCurveTo(rx + sg * 13.2 * sx, 1.4, rx + sg * 14.6 * sx, 3.6, rx + sg * 17.0 * sx, 4.0);
          c.bezierCurveTo(rx + sg * 22.0 * sx, 4.2, rx + sg * 28.0 * sx, 4.8, rx + sg * 32.6 * sx, 6.4);
          c.closePath();
          c.fillStyle = tailRed;
          c.fill();
          c.strokeStyle = out;
          c.lineWidth = 1.2;
          c.stroke();
          // Faixa clara (ré / pisca) no trecho interno
          c.beginPath();
          c.moveTo(rx + sg * 16.4 * sx, -0.4);
          c.quadraticCurveTo(rx + sg * 21.0 * sx, -3.0, rx + sg * 26.0 * sx, -3.4);
          c.strokeStyle = '#FFF0DC';
          c.lineWidth = 1.1;
          c.stroke();
        };
        boomerang(-1);
        boomerang(1);
        CarArt.drawTailGlow(c, rx - 23.0 * sx, 0.6, 6.5, 4.0, isBraking, isNight);
        CarArt.drawTailGlow(c, rx + 23.0 * sx, 0.6, 6.5, 4.0, isBraking, isNight);

        // Difusor inferior preto curvo + refletores + placa Mercosul
        CarArt.roundRect(c, rx - 30.6 * sx, 13.6, 5.0 * sx, 1.7, 0.8, '#5A0E14', null, 0);
        CarArt.roundRect(c, rx + 25.6 * sx, 13.6, 5.0 * sx, 1.7, 0.8, '#5A0E14', null, 0);
        c.beginPath();
        c.moveTo(rx - 27.6 * sx, 17.0);
        c.quadraticCurveTo(rx, 18.8, rx + 27.6 * sx, 17.0);
        c.lineTo(rx + 25.6 * sx, 19.8);
        c.lineTo(rx - 25.6 * sx, 19.8);
        c.closePath();
        c.fillStyle = '#151A23';
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 1.0;
        c.stroke();
        CarArt.drawPlateStraight(c, rx - 9.8, 10.6, 19.6, 5.2);
        CarArt.drawExhaustPipe(c, rx - 17.5 * sx, 21.0, 1.9);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'opala',
      name: 'OPALA SS 4.100',
      badge: 'MONSTRO 6 CILINDROS',
      desc: 'O lendário 250-S de 6 canecos! Torque bruto, arrancada devastadora e as clássicas 4 lanternas redondas.',
      maxSpeed: 284,
      acceleration: 1.05,
      braking: 0.72,
      handling: 0.70,
      grip: 0.74,
      centrifugalResistance: 0.70,
      primaryColor: '#D87A00',
      roofColor: '#12151B',
      exhaustPipes: [[-19.0, 21.0], [-14.0, 21.0]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        // Pneus largos de muscle car com tala esportiva
        CarArt.drawRearTire(c, rx - 34.0 * sx, 12.0, 11.5, 12.5);
        CarArt.drawRearTire(c, rx + 22.5 * sx, 12.0, 11.5, 12.5);

        // Carroceria larga, musculosa e quadris em curva suave (estilo garrafa de coca-cola)
        const opalaBody = [
          [tx - 26.5 * sx, -23.5], [tx + 26.5 * sx, -23.5],
          [rx + 34.8 * sx, -5.5],  [rx + 35.2 * sx, 13.5],
          [rx - 35.2 * sx, 13.5],  [rx - 34.8 * sx, -5.5]
        ];
        CarArt.poly(c, opalaBody, CarArt.bodyGrad(c, body, -24, 14), out, 1.45);

        // Faixas pretas clássicas de corrida do Opala SS descendo pelo teto
        const ssw = 4.2 * sx;
        c.fillStyle = '#11141A';
        c.fillRect(tx - 6.5 * sx, -23.5, ssw, 4.0);
        c.fillRect(tx + 2.5 * sx, -23.5, ssw, 4.0);

        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 34.8 * sx, roofW: 26.5 * sx,
          roofY: -23.5, beltY: -5.5, botY: 13.5, wheelStyle: 'alloy', mirrorColor: '#DCE5EE'
        });

        // Vidro traseiro com caimento cupê suave e moldura cromada
        CarArt.drawGlassQuad(c, [
          [tx - 23.2 * sx, -20.5], [tx + 23.2 * sx, -20.5],
          [rx + 29.0 * sx, -6.0],  [rx - 29.0 * sx, -6.0]
        ]);
        CarArt.line(c, rx - 28.5 * sx, -6.2, rx + 28.5 * sx, -6.2, '#CBD5E1', 1.0); // Friso cromado sob o vidro

        // Painel traseiro preto fosco característico dos Opalas SS
        CarArt.roundRect(c, rx - 34.2 * sx, -3.2, 68.4 * sx, 12.2, 1.2, '#101318', out, 1.1);
        CarArt.line(c, rx - 33.5 * sx, -2.8, rx + 33.5 * sx, -2.8, '#CBD5E1', 0.8);
        CarArt.line(c, rx - 33.5 * sx, 8.6, rx + 33.5 * sx, 8.6, '#CBD5E1', 0.8);

        // As 4 Lendárias Lanternas Redondas do Opala SS (2 de cada lado com aro cromado duplo e profundidade)
        const lampPositions = [-26.2, -18.2, 18.2, 26.2];
        for (let i = 0; i < lampPositions.length; i++) {
          const lx = rx + lampPositions[i] * sx;
          const ly = 2.8;
          // Aro cromado externo
          c.fillStyle = '#E2E8F0';
          c.beginPath();
          c.arc(lx, ly, 4.2, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = out;
          c.lineWidth = 0.8;
          c.stroke();
          // Borda interna preta
          c.fillStyle = '#0F172A';
          c.beginPath();
          c.arc(lx, ly, 3.4, 0, Math.PI * 2);
          c.fill();
          // Lente vermelha rubi estriada com brilho
          c.fillStyle = tailRed;
          c.beginPath();
          c.arc(lx, ly, 2.9, 0, Math.PI * 2);
          c.fill();
          // Ponto de luz interno / reflexo
          c.fillStyle = isBraking ? '#FFE4E6' : 'rgba(255, 255, 255, 0.45)';
          c.beginPath();
          c.arc(lx - 0.7, ly - 0.7, 0.9, 0, Math.PI * 2);
          c.fill();
          CarArt.drawTailGlow(c, lx, ly, 4.5, 4.5, isBraking, isNight);
        }

        // Emblema "SS" clássico central em prata brilhante
        c.fillStyle = '#FFFFFF';
        c.font = 'bold 5px sans-serif';
        c.textAlign = 'center';
        c.fillText('SS', rx, 4.6);
        c.fillStyle = '#CBD5E1';
        c.font = 'bold 2.5px sans-serif';
        c.fillText('4.100', rx, 7.5);

        // Para-choque cromado maciço com batentes (garras)
        const chrGrad = c.createLinearGradient(0, 11, 0, 17.5);
        chrGrad.addColorStop(0, '#FFFFFF');
        chrGrad.addColorStop(0.3, '#E2E8F0');
        chrGrad.addColorStop(0.6, '#94A3B8');
        chrGrad.addColorStop(1, '#475569');
        CarArt.roundRect(c, rx - 35.5 * sx, 11.2, 71.0 * sx, 5.8, 2.0, chrGrad, out, 1.35);
        // Garras cromadas verticais
        CarArt.box(c, rx - 16.0 * sx, 10.0, 3.2, 7.4, '#E2E8F0', out, 0.8);
        CarArt.box(c, rx + 12.8 * sx, 10.0, 3.2, 7.4, '#E2E8F0', out, 0.8);

        CarArt.drawPlateStraight(c, rx - 9.0, 12.2, 18.0, 4.6);

        // Duplo escapamento 6 cilindros esportivo cromado na lateral esquerda
        CarArt.drawExhaustPipe(c, rx - 19.0 * sx, 20.8, 2.3);
        CarArt.drawExhaustPipe(c, rx - 14.0 * sx, 20.8, 2.3);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'gol',
      name: 'GOL GTS 1.8S',
      badge: 'O QUADRADO MAIS DESEJADO',
      desc: 'Linhas retas e agressivas, aerofólio envolvente, lanternas fumê frisadas e friso vermelho GTS. O turbo dos anos 90!',
      maxSpeed: 270,
      acceleration: 0.94,
      braking: 0.86,
      handling: 0.86,
      grip: 0.86,
      centrifugalResistance: 0.85,
      primaryColor: '#96121B',
      roofColor: '#171B22',
      exhaustPipes: [[-18.0, 21.0]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        CarArt.drawRearTire(c, rx - 31.8 * sx, 12.5, 9.8, 11.5);
        CarArt.drawRearTire(c, rx + 22.0 * sx, 12.5, 9.8, 11.5);

        // Carroceria clássica "Gol Quadrado" com ângulos retos e vincos marcantes
        const golBody = [
          [tx - 24.0 * sx, -23.5], [tx + 24.0 * sx, -23.5],
          [rx + 32.0 * sx, -6.0],  [rx + 32.6 * sx, 13.8],
          [rx - 32.6 * sx, 13.8],  [rx - 32.0 * sx, -6.0]
        ];
        CarArt.poly(c, golBody, CarArt.bodyGrad(c, body, -24, 14), out, 1.45);

        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 32.0 * sx, roofW: 24.0 * sx,
          roofY: -23.5, beltY: -6.0, botY: 13.8, wheelStyle: 'alloy', mirrorColor: '#1A202C'
        });

        // Aerofólio de borracha preto envolvente icônico do Gol GTS (cobre topo e laterais da vigia)
        CarArt.roundRect(c, rx - 29.5 * sx, -8.6, 59.0 * sx, 3.8, 1.4, '#141820', out, 1.2);
        // Descidas laterais do aerofólio na coluna
        CarArt.poly(c, [
          [rx - 29.5 * sx, -8.6], [rx - 27.0 * sx, -8.6],
          [rx - 27.5 * sx, -4.5], [rx - 30.0 * sx, -4.5]
        ], '#141820', out, 0.9);
        CarArt.poly(c, [
          [rx + 27.0 * sx, -8.6], [rx + 29.5 * sx, -8.6],
          [rx + 30.0 * sx, -4.5], [rx + 27.5 * sx, -4.5]
        ], '#141820', out, 0.9);

        // Vidro traseiro com limpador e desembaçador térmico vermelho/laranja
        CarArt.drawGlassQuad(c, [
          [tx - 21.2 * sx, -21.0], [tx + 21.2 * sx, -21.0],
          [rx + 26.8 * sx, -7.5],  [rx - 26.8 * sx, -7.5]
        ]);
        // Linhas horizontais do desembaçador traseiro
        for (let l = 1; l <= 3; l++) {
          CarArt.line(c, rx - 24.0 * sx, -18.0 + l * 2.8, rx + 24.0 * sx, -18.0 + l * 2.8, 'rgba(239, 68, 68, 0.55)', 0.6);
        }
        // Limpador traseiro preto inclinado
        CarArt.line(c, rx - 2.0, -8.0, rx + 12.0 * sx, -12.5, '#0F172A', 1.5);

        // Plástico preto texturizado entre as lanternas (marca registrada da linha quadrada GTS/GTi)
        CarArt.roundRect(c, rx - 23.5 * sx, 0.2, 47.0 * sx, 8.5, 0.8, '#131822', out, 1.0);

        // Logo VW cromado e letreiro GTS 1.8S
        c.fillStyle = '#CBD5E1';
        c.beginPath();
        c.arc(rx, 4.2, 2.6, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = out;
        c.lineWidth = 0.6;
        c.stroke();
        c.fillStyle = '#131822';
        c.beginPath();
        c.arc(rx, 4.2, 1.8, 0, Math.PI * 2);
        c.fill();
        CarArt.line(c, rx - 0.9, 4.8, rx + 0.9, 3.6, '#CBD5E1', 0.8);

        // Letreiro GTS em vermelho esportivo
        c.fillStyle = '#EF4444';
        c.font = 'bold 4.5px sans-serif';
        c.textAlign = 'left';
        c.fillText('GTS', rx + 6.0 * sx, 6.0);
        c.fillStyle = '#FFFFFF';
        c.font = 'bold 2.5px sans-serif';
        c.fillText('1.8S', rx + 15.5 * sx, 6.0);

        // Lanternas horizontais largas frisadas fumê (estilo clássico VW dos anos 90)
        const drawGolLamp = (lx, isLeft) => {
          CarArt.roundRect(c, lx, 0.2, 10.2 * sx, 8.5, 1.0, tailRed, out, 1.0);
          // Pisca âmbar
          c.fillStyle = '#D97706';
          c.fillRect(isLeft ? lx + 0.8 : lx + 6.0 * sx, 1.0, 3.4 * sx, 2.8);
          // Luz de ré branca
          c.fillStyle = '#E2E8F0';
          c.fillRect(isLeft ? lx + 4.6 * sx : lx + 1.2 * sx, 5.0, 4.2 * sx, 2.6);
          // Frisos horizontais pretos característicos do GTS
          for (let f = 1; f <= 3; f++) {
            CarArt.line(c, lx, 0.2 + f * 2.1, lx + 10.2 * sx, 0.2 + f * 2.1, '#0F131A', 0.9);
          }
          CarArt.drawTailGlow(c, lx + 5.1 * sx, 4.4, 5.2, 4.2, isBraking, isNight);
        };
        drawGolLamp(rx - 32.2 * sx, true);
        drawGolLamp(rx + 22.0 * sx, false);

        // Para-choque largo envolvente cinza chumbo com o lendário FRISO VERMELHO contínuo do GTS
        const bmp = c.createLinearGradient(0, 11, 0, 19.5);
        bmp.addColorStop(0, '#2C3440');
        bmp.addColorStop(0.5, '#1E242C');
        bmp.addColorStop(1, '#11151B');
        CarArt.roundRect(c, rx - 33.5 * sx, 11.2, 67.0 * sx, 8.8, 1.8, bmp, out, 1.35);
        // Friso vermelho do GTS
        CarArt.line(c, rx - 32.0 * sx, 13.0, rx + 32.0 * sx, 13.0, '#EF4444', 1.2);

        CarArt.drawPlateStraight(c, rx - 9.5, 13.6, 19.0, 5.0);
        // Ponteira esportiva oval de inox chanfrada
        CarArt.drawExhaustPipe(c, rx - 18.0 * sx, 21.0, 2.2);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'chevette',
      name: 'CHEVETTE TUBARÃO',
      badge: 'REI DO DRIFT TRAÇÃO TRASEIRA',
      desc: 'Frente em cunha e tração traseira ágil! Especialista em entrar nas curvas escorregando e acelerar com precisão.',
      maxSpeed: 250,
      acceleration: 0.82,
      braking: 0.82,
      handling: 0.96,
      grip: 0.92,
      centrifugalResistance: 0.90,
      primaryColor: '#1F5B9E',
      roofColor: '#131A26',
      exhaustPipes: [[-16.5, 21.2]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        CarArt.drawRearTire(c, rx - 31.0 * sx, 12.8, 9.2, 11.5);
        CarArt.drawRearTire(c, rx + 21.8 * sx, 12.8, 9.2, 11.5);

        // Carroceria clássica sedã compacta com caimento fastback e vinco dorsal do Tubarão
        const chevetteBody = [
          [tx - 22.8 * sx, -23.0], [tx + 22.8 * sx, -23.0],
          [rx + 30.6 * sx, -5.5],  [rx + 31.2 * sx, 13.8],
          [rx - 31.2 * sx, 13.8],  [rx - 30.6 * sx, -5.5]
        ];
        CarArt.poly(c, chevetteBody, CarArt.bodyGrad(c, body, -24, 14), out, 1.45);

        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 30.6 * sx, roofW: 22.8 * sx,
          roofY: -23.0, beltY: -5.5, botY: 13.8, wheelStyle: 'steel', mirrorColor: '#DCE5EE'
        });

        // Vidro traseiro com moldura cromada fina
        CarArt.drawGlassQuad(c, [
          [tx - 20.0 * sx, -20.5], [tx + 20.0 * sx, -20.5],
          [rx + 25.8 * sx, -6.5],  [rx - 25.8 * sx, -6.5]
        ]);
        CarArt.line(c, rx - 25.0 * sx, -6.6, rx + 25.0 * sx, -6.6, '#CBD5E1', 0.9);

        // Vinco dorsal central na tampa do porta-malas (o formato em cunha do Tubarão)
        CarArt.line(c, rx, -5.5, rx, 3.5, CarArt.shade(body, 30), 1.2);
        CarArt.line(c, rx - 28.0 * sx, -4.5, rx + 28.0 * sx, -4.5, '#E2E8F0', 1.0); // Friso cromado de cintura

        // Emblema azul da GM no centro da tampa
        c.fillStyle = '#2563EB';
        c.fillRect(rx - 2.0, 1.8, 4.0, 3.0);
        c.strokeStyle = '#FFFFFF';
        c.lineWidth = 0.7;
        c.strokeRect(rx - 2.0, 1.8, 4.0, 3.0);

        // Letreiro "CHEVETTE" cromado na tampa direita
        c.fillStyle = '#E2E8F0';
        c.font = 'bold 3.2px sans-serif';
        c.textAlign = 'right';
        c.fillText('CHEVETTE', rx + 20.5 * sx, 5.0);

        // Lanternas quadradas clássicas do Tubarão (1973-1977) com aro cromado saliente
        const drawChevetteLamp = (lx) => {
          // Aro cromado externo
          c.fillStyle = '#E2E8F0';
          c.fillRect(lx - 1.0, -0.6, 8.2 * sx, 9.2);
          c.strokeStyle = out;
          c.lineWidth = 0.8;
          c.strokeRect(lx - 1.0, -0.6, 8.2 * sx, 9.2);

          // Luz de freio vermelha (topo)
          c.fillStyle = tailRed;
          c.fillRect(lx, 0.4, 6.2 * sx, 3.8);
          // Pisca âmbar (base)
          c.fillStyle = '#D97706';
          c.fillRect(lx, 4.4, 6.2 * sx, 3.4);

          CarArt.line(c, lx, 4.2, lx + 6.2 * sx, 4.2, '#0F172A', 0.7);
          CarArt.drawTailGlow(c, lx + 3.1 * sx, 2.5, 4.6, 4.0, isBraking, isNight);
        };
        drawChevetteLamp(rx - 29.2 * sx);
        drawChevetteLamp(rx + 23.0 * sx);

        // Para-choque de lâmina cromada fina com batentes (garras) pretos emborrachados
        const chrGrad = c.createLinearGradient(0, 11, 0, 16.5);
        chrGrad.addColorStop(0, '#FFFFFF');
        chrGrad.addColorStop(0.4, '#CBD5E1');
        chrGrad.addColorStop(1, '#64748B');
        CarArt.roundRect(c, rx - 32.2 * sx, 11.5, 64.4 * sx, 5.2, 1.5, chrGrad, out, 1.3);

        // Dois batentes pretos verticais clássicos da GM dos anos 70
        CarArt.box(c, rx - 18.2 * sx, 10.5, 3.5, 7.2, '#151A22', out, 0.9);
        CarArt.box(c, rx + 14.7 * sx, 10.5, 3.5, 7.2, '#151A22', out, 0.9);

        CarArt.drawPlateStraight(c, rx - 9.0, 12.0, 18.0, 4.6);
        CarArt.drawExhaustPipe(c, rx - 16.5 * sx, 20.8, 1.9);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    },
    {
      id: 'brasilia',
      name: 'BRASÍLIA AMARELA',
      badge: 'O ÍCONE IRREVERENTE',
      desc: 'Espaçosa, motor boxer com dupla carburação e muita história! Estabilidade impressionante em retas e curvas abertas.',
      maxSpeed: 232,
      acceleration: 0.70,
      braking: 0.80,
      handling: 0.89,
      grip: 0.92,
      centrifugalResistance: 0.92,
      primaryColor: '#F5BE00',
      roofColor: '#2B2610',
      exhaustPipes: [[-7.5, 21.5], [7.5, 21.5]],
      drawHD(c, body, turn, isBraking, isNight) {
        const out = CarArt.OUTLINE;
        const at = Math.abs(turn);
        const rx = -turn * 4.6;
        const tx = -turn * 2.2;
        const sx = 1 - at * 0.05;
        const tailRed = isBraking ? '#FF0500' : (isNight ? '#E61E14' : '#6A1016');

        CarArt.drawRearTire(c, rx - 31.5 * sx, 12.8, 9.4, 11.5);
        CarArt.drawRearTire(c, rx + 22.0 * sx, 12.8, 9.4, 11.5);

        // Carroceria ampla, teto quase plano e colunas traseiras marcantes da Brasília
        const brBody = [
          [tx - 25.2 * sx, -23.5], [tx + 25.2 * sx, -23.5],
          [rx + 32.5 * sx, -6.0],  [rx + 33.0 * sx, 14.0],
          [rx - 33.0 * sx, 14.0],  [rx - 32.5 * sx, -6.0]
        ];
        CarArt.poly(c, brBody, CarArt.bodyGrad(c, body, -24, 14), out, 1.45);

        CarArt.drawDiscreetSideFlank(c, body, turn, {
          rx, tx, rearW: 32.5 * sx, roofW: 25.2 * sx,
          roofY: -23.5, beltY: -6.0, botY: 14.0, wheelStyle: 'hubcap', mirrorColor: '#DCE5EE'
        });

        // AS FAMOSAS GUELRAS / ALETAS DE ARREFECECIMENTO NAS COLUNAS TRASEIRAS (Marca registrada da Brasília!)
        const drawGills = (gx, isLeft) => {
          for (let g = 0; g < 4; g++) {
            const gy = -18.5 + g * 3.2;
            CarArt.line(c, gx, gy, gx + (isLeft ? 4.5 : -4.5) * sx, gy, '#151A22', 1.4);
          }
        };
        drawGills(tx - 24.2 * sx, true);
        drawGills(tx + 24.2 * sx, false);

        // Vidro traseiro panorâmico gigante com borracha preta e moldura cromada
        CarArt.drawGlassQuad(c, [
          [tx - 22.5 * sx, -20.8], [tx + 22.5 * sx, -20.8],
          [rx + 28.0 * sx, -6.8],  [rx - 28.0 * sx, -6.8]
        ]);
        CarArt.line(c, rx - 27.5 * sx, -7.0, rx + 27.5 * sx, -7.0, '#CBD5E1', 0.9);

        // Venezianas horizontais de resfriamento do motor boxer a ar abaixo do vidro
        for (let a = -16; a <= 16; a += 3.2) {
          CarArt.line(c, rx + a * sx, -4.8, rx + a * sx, -1.8, '#181E28', 1.2);
        }

        // Letreiro cromado em itálico "Brasilia" na tampa direita
        c.fillStyle = '#CBD5E1';
        c.font = 'italic bold 3.2px sans-serif';
        c.textAlign = 'right';
        c.fillText('Brasilia', rx + 20.0 * sx, 4.5);

        // Lanternas horizontais frisadas bicolores (clássica da Brasília com estrias em relevo)
        const drawBrasiliaLamp = (lx) => {
          CarArt.roundRect(c, lx, 0.4, 10.0 * sx, 8.8, 1.0, tailRed, out, 1.0);
          // Pisca âmbar no topo
          c.fillStyle = '#D97706';
          c.fillRect(lx + 0.8, 1.2, 8.4 * sx, 3.4);
          // Estrias horizontais em relevo por toda a lanterna
          for (let f = 1; f <= 3; f++) {
            CarArt.line(c, lx, 1.2 + f * 1.9, lx + 10.0 * sx, 1.2 + f * 1.9, '#11151D', 0.85);
          }
          CarArt.drawTailGlow(c, lx + 5.0 * sx, 4.6, 5.0, 4.2, isBraking, isNight);
        };
        drawBrasiliaLamp(rx - 32.2 * sx);
        drawBrasiliaLamp(rx + 22.2 * sx);

        // Para-choque clássico cromado com borrachão preto grosso contínuo no centro
        const chrGrad = c.createLinearGradient(0, 11, 0, 16.8);
        chrGrad.addColorStop(0, '#FFFFFF');
        chrGrad.addColorStop(0.5, '#CBD5E1');
        chrGrad.addColorStop(1, '#64748B');
        CarArt.roundRect(c, rx - 33.2 * sx, 11.2, 66.4 * sx, 5.8, 1.6, chrGrad, out, 1.35);
        // Borrachão preto central
        CarArt.line(c, rx - 31.8 * sx, 14.1, rx + 31.8 * sx, 14.1, '#1A202C', 1.8);

        CarArt.drawPlateStraight(c, rx - 9.0, 12.0, 18.0, 4.8);

        // Duplo escapamento clássico simétrico do motor boxer VW
        CarArt.drawExhaustPipe(c, rx - 7.5 * sx, 21.0, 1.85);
        CarArt.drawExhaustPipe(c, rx + 7.5 * sx, 21.0, 1.85);
      },
      render: function(ctx, x, y, w, h, isBraking, steer = 0, customBody = null, opts = null) {
        CarArt.renderModel(ctx, this, x, y, w, h, isBraking, steer, customBody, opts);
      }
    }
  ];

  // ==========================================
  // CORES DOS CARROS, PILOTOS CLÁSSICOS DA F1 E AMBIENTES (HORÁRIO + CLIMA)
  // ==========================================
  const CAR_COLORS = [
    { id: 'vermelho', name: 'VERMELHO', hex: '#D1232B' },
    { id: 'branco',   name: 'BRANCO',   hex: '#EEF2F6' },
    { id: 'amarelo',  name: 'AMARELO',  hex: '#F5C400' },
    { id: 'azul',     name: 'AZUL',     hex: '#1E63C9' },
    { id: 'preto',    name: 'PRETO',    hex: '#181B21' },
    { id: 'verde',    name: 'VERDE',    hex: '#1F9444' }
  ];
  const MODEL_DEFAULT_COLOR = { uno: 1, fusca: 3, peugeot: 1, hb20: 0, opala: 2, gol: 0, chevette: 3, brasilia: 2 };

  const ColorUtil = {
    _cache: new Map(),
    clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); },
    parse(col) {
      let v = this._cache.get(col);
      if (v) return v;
      let r = 128, g = 128, b = 128;
      if (col.charAt(0) === '#') {
        let h = col.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        const n = parseInt(h, 16);
        r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
      } else {
        const m = col.match(/\d+(\.\d+)?/g);
        if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2]; }
      }
      v = [r, g, b];
      this._cache.set(col, v);
      return v;
    },
    css(rgb) {
      return `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
    },
    mix(a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    },
    xform(col, mul, add, sat) {
      const p = this.parse(col);
      let R = p[0] * mul[0] + add[0];
      let G = p[1] * mul[1] + add[1];
      let B = p[2] * mul[2] + add[2];
      const l = 0.3 * R + 0.59 * G + 0.11 * B;
      R = l + (R - l) * sat;
      G = l + (G - l) * sat;
      B = l + (B - l) * sat;
      return [this.clamp(R), this.clamp(G), this.clamp(B)];
    }
  };

