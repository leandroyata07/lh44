/**
 * LH44 - LOW TO HIGH SPEED
 * Módulo de Monumentos e Pontos Turísticos das 27 Capitais do Brasil
 * Arte vetorial em perspectiva 2.5D com iluminação para Dia, Crepúsculo e Noite.
 */

const MonumentArt = {
  /**
   * Renderiza um monumento na beira da pista (Roadside 3D Scenery)
   * (0, 0) é a base no chão. Y negativo sobe em direção ao céu.
   */
  renderScenery(ctx, type, size, isNight, isDusk) {
    switch (type) {
      // -------------------------------------------------------------
      // SALVADOR • BA — ELEVADOR LACERDA
      // -------------------------------------------------------------
      case 'elevador_lacerda': {
        const tw = size * 0.90;
        const th = size * 3.20;
        const ty = -th;
        const bw = size * 1.80;
        const bh = size * 0.65;

        // Pilar Base da Cidade Baixa
        ctx.fillStyle = isNight ? '#1E232A' : (isDusk ? '#4A3B32' : '#8D7B68');
        ctx.fillRect(-tw * 0.65, ty + th * 0.40, tw * 1.30, th * 0.60);

        // Duas Torres Verticais Art Déco
        ctx.fillStyle = isNight ? '#2A3442' : (isDusk ? '#6A564A' : '#D7CCC8');
        ctx.fillRect(-tw * 0.50, ty, tw, th * 0.45);
        ctx.fillStyle = isNight ? '#3E4C5E' : (isDusk ? '#8A7264' : '#EFEBE9');
        ctx.fillRect(-tw * 0.15, ty, tw * 0.30, th * 0.45);

        // Passarela Suspensa Horizontal (Ligação para Cidade Alta)
        ctx.fillStyle = isNight ? '#1F2937' : (isDusk ? '#54433A' : '#BCAAA4');
        ctx.fillRect(-bw * 0.50, ty, bw, bh);

        // Janelas de fita contínua iluminadas
        ctx.fillStyle = isNight ? '#FDE047' : (isDusk ? '#FED7AA' : '#E0F2FE');
        ctx.fillRect(-bw * 0.45, ty + bh * 0.25, bw * 0.90, bh * 0.35);

        // Relógio clássico no topo da torre
        ctx.fillStyle = isNight ? '#FEF08A' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, ty + bh * 0.50, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = Math.max(0.8, size * 0.02);
        ctx.stroke();

        // Letreiro luminoso "SALVADOR" no topo
        if (size > 14) {
          ctx.fillStyle = isNight ? '#38BDF8' : '#0284C7';
          ctx.font = `bold ${Math.max(4, Math.floor(size * 0.12))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('ELEVADOR LACERDA', 0, ty - 2);
        }
        break;
      }

      // -------------------------------------------------------------
      // SALVADOR • BA — FAROL DA BARRA
      // -------------------------------------------------------------
      case 'farol_barra': {
        const fw = size * 1.90;
        const fh = size * 0.55;
        const tw = size * 0.55;
        const th = size * 2.30;
        const ty = -th;

        // Base Fortificada de Pedra (Forte de Santo Antônio da Barra)
        ctx.fillStyle = isNight ? '#1E242B' : (isDusk ? '#4B3F35' : '#795548');
        ctx.fillRect(-fw * 0.50, -fh, fw, fh);
        // Ameias do forte
        ctx.fillStyle = isNight ? '#2B333D' : (isDusk ? '#5D4037' : '#8D6E63');
        for (let a = -fw * 0.45; a <= fw * 0.45; a += fw * 0.18) {
          ctx.fillRect(a, -fh - size * 0.08, size * 0.10, size * 0.08);
        }

        // Torre Cilíndrica com faixas horizontais pretas e brancas
        const segH = (th - fh) / 4;
        for (let s = 0; s < 4; s++) {
          const sy = -fh - (s + 1) * segH;
          ctx.fillStyle = (s % 2 === 0)
            ? (isNight ? '#0F172A' : '#1E293B')   // Faixa Preta
            : (isNight ? '#94A3B8' : '#F8FAFC');  // Faixa Branca
          ctx.fillRect(-tw * 0.50 + s * 1.2, sy, tw - s * 2.4, segH);
        }

        // Lanterna do Farol
        ctx.fillStyle = isNight ? '#DC2626' : '#EF4444';
        ctx.fillRect(-tw * 0.35, ty - size * 0.18, tw * 0.70, size * 0.18);

        // Facho de luz giratório do Farol (à noite ou crepúsculo)
        if (isNight || isDusk) {
          const beamAngle = performance.now() * 0.002;
          const beamX = Math.sin(beamAngle) * size * 2.2;
          ctx.fillStyle = isNight ? 'rgba(254, 240, 138, 0.40)' : 'rgba(254, 240, 138, 0.25)';
          ctx.beginPath();
          ctx.moveTo(0, ty - size * 0.09);
          ctx.lineTo(beamX - size * 0.6, ty - size * 0.4);
          ctx.lineTo(beamX + size * 0.6, ty - size * 0.4);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      // -------------------------------------------------------------
      // SÃO PAULO • SP — MASP (MUSEU DE ARTE DE SÃO PAULO)
      // -------------------------------------------------------------
      case 'masp': {
        const mw = size * 2.60;
        const mh = size * 1.35;
        const beamW = size * 0.22;
        const boxH = mh * 0.55;
        const my = -mh;

        // Vão Livre de 70 metros (Piso da Avenida Paulista)
        ctx.fillStyle = isNight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(30, 41, 59, 0.3)';
        ctx.fillRect(-mw * 0.50, -mh * 0.45, mw, mh * 0.45);

        // Dois Pilares Pórticos Vermelhos Icônicos
        ctx.fillStyle = isNight ? '#991B1B' : '#DC2626';
        // Pilar Esquerdo
        ctx.fillRect(-mw * 0.50, my, beamW, mh);
        // Pilar Direito
        ctx.fillRect(mw * 0.50 - beamW, my, beamW, mh);
        // Viga Superior Vermelha
        ctx.fillRect(-mw * 0.50, my, mw, beamW);

        // Caixa de Vidro e Concreto Suspensa
        ctx.fillStyle = isNight ? '#0F172A' : '#1E293B';
        ctx.fillRect(-mw * 0.50 + beamW, my + beamW, mw - beamW * 2, boxH);

        // Painéis de vidro reflexivo
        ctx.fillStyle = isNight ? '#0284C7' : (isDusk ? '#F97316' : '#38BDF8');
        for (let g = 0; g < 7; g++) {
          const gx = -mw * 0.50 + beamW + g * ((mw - beamW * 2) / 7) + 1;
          const gw = ((mw - beamW * 2) / 7) - 2;
          ctx.fillRect(gx, my + beamW + 2, gw, boxH - 4);
        }
        break;
      }

      // -------------------------------------------------------------
      // SÃO PAULO • SP — PONTE ESTAIADA OCTÁVIO FRIAS DE OLIVEIRA
      // -------------------------------------------------------------
      case 'estaiada':
      case 'ponte_estaiada': {
        const th = size * 3.40;
        const tw = size * 1.50;
        const ty = -th;

        // Pylon em formato de "X" gigante
        ctx.strokeStyle = isNight ? '#475569' : '#CBD5E1';
        ctx.lineWidth = Math.max(1.5, size * 0.08);
        ctx.beginPath();
        // Perna esquerda subindo até o topo direito
        ctx.moveTo(-tw * 0.50, 0);
        ctx.lineTo(tw * 0.35, ty);
        // Perna direita subindo até o topo esquerdo
        ctx.moveTo(tw * 0.50, 0);
        ctx.lineTo(-tw * 0.35, ty);
        ctx.stroke();

        // Travessa horizontal central de cruzamento
        ctx.fillStyle = isNight ? '#64748B' : '#E2E8F0';
        ctx.fillRect(-tw * 0.25, ty + th * 0.45, tw * 0.50, size * 0.12);

        // Cabos estaiados luminosos (LED azul / ciano / neon à noite)
        ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.75)' : 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = Math.max(0.6, size * 0.015);
        ctx.beginPath();
        for (let c = 1; c <= 6; c++) {
          const cy = ty + th * 0.15 + c * (th * 0.07);
          const spread = tw * 0.15 + c * (tw * 0.07);
          ctx.moveTo(0, cy);
          ctx.lineTo(-spread, 0);
          ctx.moveTo(0, cy);
          ctx.lineTo(spread, 0);
        }
        ctx.stroke();
        break;
      }

      // -------------------------------------------------------------
      // RIO DE JANEIRO • RJ — CRISTO REDENTOR
      // -------------------------------------------------------------
      case 'cristo_redentor': {
        const pw = size * 0.70;
        const ph = size * 0.90;
        const sw = size * 1.90;
        const sh = size * 2.30;
        const totalH = ph + sh;
        const ty = -totalH;

        // Pedestal de Pedra Sabão / Granito
        ctx.fillStyle = isNight ? '#1E293B' : (isDusk ? '#4B4237' : '#94A3B8');
        ctx.fillRect(-pw * 0.50, -ph, pw, ph);
        // Detalhes do pedestal
        ctx.fillStyle = isNight ? '#334155' : (isDusk ? '#62584A' : '#CBD5E1');
        ctx.fillRect(-pw * 0.40, -ph + size * 0.10, pw * 0.80, ph - size * 0.10);

        // Corpo e Manto da Estátua (Túnica)
        ctx.fillStyle = isNight ? '#94A3B8' : (isDusk ? '#FED7AA' : '#F1F5F9');
        ctx.beginPath();
        ctx.moveTo(-size * 0.28, -ph);
        ctx.lineTo(-size * 0.18, ty + size * 0.35);
        ctx.lineTo(size * 0.18, ty + size * 0.35);
        ctx.lineTo(size * 0.28, -ph);
        ctx.closePath();
        ctx.fill();

        // Braços Abertos em Cruz (1.9x de envergadura)
        ctx.fillStyle = isNight ? '#E2E8F0' : (isDusk ? '#FFEDD5' : '#FFFFFF');
        ctx.fillRect(-sw * 0.50, ty + size * 0.35, sw, size * 0.16);

        // Cabeça com auréola suave
        ctx.beginPath();
        ctx.arc(0, ty + size * 0.20, size * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // Holofotes de iluminação cenográfica à noite (Verde e Amarelo ou Branco)
        if (isNight) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.beginPath();
          ctx.arc(0, ty + sh * 0.5, size * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      // -------------------------------------------------------------
      // RIO DE JANEIRO • RJ — ARCOS DA LAPA
      // -------------------------------------------------------------
      case 'arcos_lapa': {
        const aw = size * 2.80;
        const ah = size * 1.50;
        const ay = -ah;
        const numArcs = 5;
        const arcW = aw / numArcs;

        // Estrutura Branca Monumental do Aqueduto
        ctx.fillStyle = isNight ? '#334155' : (isDusk ? '#E2D9D0' : '#F8FAFC');
        ctx.fillRect(-aw * 0.50, ay, aw, ah);

        // Recorte dos Arcos Romanos
        ctx.fillStyle = isNight ? 'rgba(8, 12, 22, 0.95)' : 'rgba(20, 30, 45, 0.35)';
        for (let i = 0; i < numArcs; i++) {
          const ax = -aw * 0.50 + i * arcW + arcW * 0.50;
          // Arco inferior
          ctx.beginPath();
          ctx.arc(ax, ay + ah * 0.70, arcW * 0.36, Math.PI, 0, false);
          ctx.rect(ax - arcW * 0.36, ay + ah * 0.70, arcW * 0.72, ah * 0.30);
          ctx.fill();
        }

        // Bonde Amarelo de Santa Teresa passando por cima dos arcos
        ctx.fillStyle = '#EAB308';
        ctx.fillRect(-size * 0.45, ay - size * 0.16, size * 0.90, size * 0.14);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-size * 0.40, ay - size * 0.12, size * 0.80, size * 0.06);
        break;
      }

      // -------------------------------------------------------------
      // BRASÍLIA • DF — CONGRESSO NACIONAL
      // -------------------------------------------------------------
      case 'congresso_nacional': {
        const bw = size * 2.90;
        const bh = size * 0.32;
        const tw = size * 0.36;
        const th = size * 2.40;
        const ty = -th;

        // Base Horizontal de Mármore Branco (Planalto Central)
        ctx.fillStyle = isNight ? '#1E293B' : (isDusk ? '#785A48' : '#F1F5F9');
        ctx.fillRect(-bw * 0.50, -bh, bw, bh);

        // Torres Gêmeas dos Gabinetes (H)
        ctx.fillStyle = isNight ? '#334155' : (isDusk ? '#9A7864' : '#E2E8F0');
        // Torre 1
        ctx.fillRect(-tw * 1.10, ty, tw, th - bh);
        // Torre 2
        ctx.fillRect(tw * 0.10, ty, tw, th - bh);
        // Passarela de ligação entre as torres
        ctx.fillStyle = isNight ? '#0284C7' : '#0369A1';
        ctx.fillRect(-tw * 1.10, ty + th * 0.45, tw * 2.20, size * 0.16);

        // Cúpula do Senado (Côncava / Tigela Virada para Baixo)
        ctx.fillStyle = isNight ? '#E2E8F0' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-bw * 0.30, -bh, size * 0.36, Math.PI, 0, false);
        ctx.fill();

        // Cúpula da Câmara dos Deputados (Convexa / Prato Aberto para o Céu)
        ctx.beginPath();
        ctx.arc(bw * 0.30, -bh - size * 0.05, size * 0.42, 0, Math.PI, false);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // BRASÍLIA • DF — CATEDRAL METROPOLITANA
      // -------------------------------------------------------------
      case 'catedral_brasilia': {
        const cw = size * 2.10;
        const ch = size * 1.90;
        const cy = -ch;

        // Vitrais em tons de Azul, Turquesa e Verde (Marianne Peretti)
        const vitralGrad = ctx.createLinearGradient(-cw * 0.50, cy, cw * 0.50, 0);
        vitralGrad.addColorStop(0, '#0284C7');
        vitralGrad.addColorStop(0.5, '#10B981');
        vitralGrad.addColorStop(1, '#0284C7');
        ctx.fillStyle = vitralGrad;
        ctx.beginPath();
        ctx.moveTo(0, cy + size * 0.2);
        ctx.lineTo(-cw * 0.45, 0);
        ctx.lineTo(cw * 0.45, 0);
        ctx.closePath();
        ctx.fill();

        // 16 Pilares Curvos de Concreto Branco que se elevam como coroa de espinhos
        ctx.strokeStyle = isNight ? '#94A3B8' : '#FFFFFF';
        ctx.lineWidth = Math.max(1.2, size * 0.06);
        for (let p = -5; p <= 5; p++) {
          const px = p * (cw * 0.09);
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.quadraticCurveTo(px * 0.3, cy + ch * 0.5, px * 0.15, cy);
          ctx.stroke();
        }

        // Cruz do topo
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-size * 0.03, cy - size * 0.25, size * 0.06, size * 0.25);
        ctx.fillRect(-size * 0.08, cy - size * 0.18, size * 0.16, size * 0.05);
        break;
      }

      // -------------------------------------------------------------
      // MANAUS • AM — TEATRO AMAZONAS
      // -------------------------------------------------------------
      case 'teatro_amazonas': {
        const tw = size * 2.40;
        const th = size * 1.80;
        const ty = -th;

        // Fachada Rosa / Ocre Clássica da Belle Époque
        ctx.fillStyle = isNight ? '#4C1D38' : (isDusk ? '#831843' : '#DB2777');
        ctx.fillRect(-tw * 0.50, -th * 0.55, tw, th * 0.55);

        // Frontão Neoclássico
        ctx.fillStyle = isNight ? '#E2E8F0' : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-tw * 0.40, -th * 0.55);
        ctx.lineTo(0, -th * 0.75);
        ctx.lineTo(tw * 0.40, -th * 0.55);
        ctx.closePath();
        ctx.fill();

        // Cúpula Icônica com Mosaico nas Cores do Brasil (Verde, Amarelo e Azul)
        const domeR = size * 0.55;
        const domeX = 0;
        const domeY = -th * 0.75;
        ctx.beginPath();
        ctx.arc(domeX, domeY, domeR, Math.PI, 0, false);
        ctx.fillStyle = '#FEDD00'; // Amarelo Ouro
        ctx.fill();

        // Faixas verdes e azuis do mosaico da cúpula
        ctx.strokeStyle = '#009739'; // Verde
        ctx.lineWidth = Math.max(1, size * 0.04);
        ctx.beginPath();
        ctx.arc(domeX, domeY, domeR * 0.75, Math.PI, 0, false);
        ctx.stroke();
        ctx.strokeStyle = '#124DA6'; // Azul
        ctx.beginPath();
        ctx.arc(domeX, domeY, domeR * 0.45, Math.PI, 0, false);
        ctx.stroke();

        // Lanterna do topo da cúpula
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-size * 0.05, domeY - domeR - size * 0.20, size * 0.10, size * 0.20);
        break;
      }

      // -------------------------------------------------------------
      // CURITIBA • PR — ESTUFA DO JARDIM BOTÂNICO
      // -------------------------------------------------------------
      case 'jardim_botanico':
      case 'estufa_curitiba': {
        const jw = size * 2.50;
        const jh = size * 1.55;
        const jy = -jh;

        // Estrutura Metálica Branca Art Nouveau com Vidro Esmeralda
        ctx.fillStyle = isNight ? 'rgba(16, 185, 129, 0.45)' : 'rgba(52, 211, 153, 0.65)';
        ctx.fillRect(-jw * 0.50, -jh * 0.45, jw, jh * 0.45);

        // 3 Cúpulas de Vidro Arredondadas
        const drawDome = (dx, dw, dh) => {
          ctx.beginPath();
          ctx.ellipse(dx, -jh * 0.45, dw * 0.5, dh, 0, Math.PI, 0, false);
          ctx.fillStyle = isNight ? 'rgba(6, 78, 59, 0.75)' : 'rgba(16, 185, 129, 0.55)';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = Math.max(0.8, size * 0.025);
          ctx.stroke();
        };

        // Cúpula Central (Maior)
        drawDome(0, jw * 0.40, jh * 0.55);
        // Cúpula Esquerda
        drawDome(-jw * 0.32, jw * 0.28, jh * 0.42);
        // Cúpula Direita
        drawDome(jw * 0.32, jw * 0.28, jh * 0.42);

        // Jardins Geométricos Franceses na frente
        ctx.fillStyle = '#15803D';
        ctx.fillRect(-jw * 0.50, 0, jw, size * 0.06);
        break;
      }

      // -------------------------------------------------------------
      // CURITIBA • PR — MUSEU OSCAR NIEMEYER (O OLHO)
      // -------------------------------------------------------------
      case 'museu_olho': {
        const mw = size * 2.30;
        const mh = size * 1.60;
        const my = -mh;

        // Pilar Torre Central Amarelo Ouro
        ctx.fillStyle = isNight ? '#CA8A04' : '#EAB308';
        ctx.fillRect(-size * 0.28, -mh * 0.55, size * 0.56, mh * 0.55);

        // Volume do "Olho" Superior com Vidros Pretos e Brancos
        ctx.fillStyle = isNight ? '#0F172A' : '#1E293B';
        ctx.beginPath();
        ctx.ellipse(0, my + mh * 0.32, mw * 0.50, mh * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1, size * 0.035);
        ctx.stroke();

        // Pupila de Vidro
        ctx.fillStyle = isNight ? '#38BDF8' : '#0284C7';
        ctx.beginPath();
        ctx.arc(0, my + mh * 0.32, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // PORTO ALEGRE • RS — USINA DO GASÔMETRO
      // -------------------------------------------------------------
      case 'usina_gasometro': {
        const uw = size * 1.60;
        const uh = size * 1.10;
        const chW = size * 0.24;
        const chH = size * 2.90;
        const cy = -chH;

        // Prédio Histórico de Tijolos Vermelhos
        ctx.fillStyle = isNight ? '#451A03' : '#78350F';
        ctx.fillRect(-uw * 0.50, -uh, uw, uh);

        // Chaminé Alta de 117 Metros à direita
        const chimX = uw * 0.25;
        ctx.fillStyle = isNight ? '#52525B' : '#71717A';
        ctx.fillRect(chimX - chW * 0.50, cy, chW, chH);

        // Anéis e faixas brancas no topo da chaminé
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(chimX - chW * 0.50, cy, chW, size * 0.12);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(chimX - chW * 0.50, cy + size * 0.12, chW, size * 0.12);

        // Luz de alerta no topo piscando
        ctx.fillStyle = (Math.floor(performance.now() / 300) % 2 === 0) ? '#EF4444' : '#7F1D1D';
        ctx.fillRect(chimX - size * 0.04, cy - size * 0.08, size * 0.08, size * 0.08);
        break;
      }

      // -------------------------------------------------------------
      // PORTO ALEGRE • RS — ESTÁTUA DO LAÇADOR
      // -------------------------------------------------------------
      case 'lacador':
      case 'estatua_lacador': {
        const pw = size * 0.75;
        const ph = size * 0.85;
        const sh = size * 1.90;
        const ty = -(ph + sh);

        // Pedestal de Granito
        ctx.fillStyle = isNight ? '#334155' : '#64748B';
        ctx.fillRect(-pw * 0.50, -ph, pw, ph);

        // Estátua de Bronze do Gaúcho Tradicional
        ctx.fillStyle = isNight ? '#1E293B' : '#475569';
        // Corpo e Bombacha
        ctx.fillRect(-size * 0.22, ty + size * 0.40, size * 0.44, sh - size * 0.40);
        // Poncho sobre os ombros
        ctx.fillRect(-size * 0.32, ty + size * 0.40, size * 0.64, size * 0.55);
        // Chapéu de aba larga
        ctx.beginPath();
        ctx.ellipse(0, ty + size * 0.18, size * 0.30, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cabeça
        ctx.beginPath();
        ctx.arc(0, ty + size * 0.22, size * 0.14, 0, Math.PI * 2);
        ctx.fill();
        // Laço erguido na mão
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = Math.max(0.8, size * 0.025);
        ctx.beginPath();
        ctx.arc(size * 0.32, ty + size * 0.15, size * 0.24, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      // -------------------------------------------------------------
      // FLORIANÓPOLIS • SC — PONTE HERCÍLIO LUZ
      // -------------------------------------------------------------
      case 'ponte_hercilio_luz': {
        const hw = size * 2.80;
        const hh = size * 2.60;
        const hy = -hh;
        const t1 = -hw * 0.32;
        const t2 = hw * 0.32;

        // Duas Torres Treliçadas Metálicas
        const drawHercilioTower = (tx) => {
          ctx.fillStyle = isNight ? '#0F172A' : '#334155';
          ctx.fillRect(tx - size * 0.12, hy, size * 0.24, hh);
          // Treliças diagonais
          ctx.strokeStyle = isNight ? '#38BDF8' : '#CBD5E1';
          ctx.lineWidth = Math.max(0.6, size * 0.015);
          for (let k = 0; k < 5; k++) {
            const ky = hy + k * (hh * 0.18);
            ctx.beginPath();
            ctx.moveTo(tx - size * 0.12, ky);
            ctx.lineTo(tx + size * 0.12, ky + hh * 0.18);
            ctx.stroke();
          }
        };
        drawHercilioTower(t1);
        drawHercilioTower(t2);

        // Cabos de Olhal da Ponte Pênsil
        ctx.strokeStyle = isNight ? '#38BDF8' : '#64748B';
        ctx.lineWidth = Math.max(1, size * 0.03);
        ctx.beginPath();
        ctx.moveTo(-hw * 0.50, -hh * 0.35);
        ctx.lineTo(t1, hy);
        ctx.quadraticCurveTo(0, -hh * 0.40, t2, hy);
        ctx.lineTo(hw * 0.50, -hh * 0.35);
        ctx.stroke();

        // Pista de tráfego iluminada
        ctx.fillStyle = isNight ? '#FDE047' : '#E2E8F0';
        ctx.fillRect(-hw * 0.50, -hh * 0.35, hw, size * 0.08);
        break;
      }

      // -------------------------------------------------------------
      // RECIFE • PE — MARCO ZERO & PARQUE DE ESCULTURAS
      // -------------------------------------------------------------
      case 'marco_zero':
      case 'marco_zero_recife': {
        const mw = size * 1.80;
        const th = size * 2.70;
        const ty = -th;

        // Praça Rosa dos Ventos no solo
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.ellipse(0, 0, mw * 0.50, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coluna de Cristal de Francisco Brennand
        ctx.fillStyle = isNight ? '#0284C7' : (isDusk ? '#F97316' : '#E0F2FE');
        ctx.fillRect(-size * 0.14, ty, size * 0.28, th);
        ctx.strokeStyle = isNight ? '#38BDF8' : '#0284C7';
        ctx.lineWidth = Math.max(0.8, size * 0.02);
        ctx.strokeRect(-size * 0.14, ty, size * 0.28, th);

        // Escultura da Flor de Cristal no Topo
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, ty, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // BELO HORIZONTE • MG — IGREJA DA PAMPULHA
      // -------------------------------------------------------------
      case 'igreja_pampulha': {
        const iw = size * 2.30;
        const ih = size * 1.45;
        const iy = -ih;

        // Abóbada Parabólica de Concreto (Niemeyer)
        ctx.fillStyle = isNight ? '#1E293B' : '#E2E8F0';
        ctx.beginPath();
        ctx.ellipse(-iw * 0.15, 0, iw * 0.40, ih, 0, Math.PI, 0, false);
        ctx.fill();

        // Mural de Azulejos Azuis de Candido Portinari
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(-iw * 0.45, -ih * 0.50, iw * 0.60, ih * 0.50);

        // Torre Sineira Separada com sino
        ctx.fillStyle = isNight ? '#334155' : '#FFFFFF';
        ctx.fillRect(iw * 0.30, iy, size * 0.22, ih);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(iw * 0.41, iy + size * 0.25, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // VITÓRIA • ES — CONVENTO DA PENHA & TERCEIRA PONTE
      // -------------------------------------------------------------
      case 'convento_penha': {
        const cw = size * 2.20;
        const ch = size * 2.40;
        const cy = -ch;

        // Rochedo Maciço de Granito sobre o Mar
        ctx.fillStyle = isNight ? '#1F2937' : (isDusk ? '#4B3F35' : '#64748B');
        ctx.beginPath();
        ctx.moveTo(-cw * 0.50, 0);
        ctx.lineTo(-cw * 0.35, cy + ch * 0.35);
        ctx.lineTo(cw * 0.35, cy + ch * 0.35);
        ctx.lineTo(cw * 0.50, 0);
        ctx.closePath();
        ctx.fill();

        // Convento Colonial Branco no Topo do Penhasco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-size * 0.45, cy, size * 0.90, ch * 0.35);
        // Telhado Cerâmico Colonial Vermelho
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.moveTo(-size * 0.52, cy);
        ctx.lineTo(0, cy - size * 0.22);
        ctx.lineTo(size * 0.52, cy);
        ctx.closePath();
        ctx.fill();
        // Cruz no topo
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-size * 0.02, cy - size * 0.35, size * 0.04, size * 0.15);
        ctx.fillRect(-size * 0.06, cy - size * 0.30, size * 0.12, size * 0.04);
        break;
      }

      // -------------------------------------------------------------
      // FORTALEZA • CE — DRAGÃO DO MAR & JANGADAS
      // -------------------------------------------------------------
      case 'dragao_do_mar': {
        const dw = size * 2.40;
        const dh = size * 1.50;
        const dy = -dh;

        // Passarela Suspensa Vermelha Metálica
        ctx.fillStyle = isNight ? '#991B1B' : '#EF4444';
        ctx.fillRect(-dw * 0.50, dy + dh * 0.40, dw, size * 0.18);

        // Esfera Geodésica Branca do Planetário
        ctx.fillStyle = isNight ? '#E2E8F0' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dw * 0.25, dy + dh * 0.35, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = Math.max(0.8, size * 0.02);
        ctx.stroke();
        break;
      }

      // -------------------------------------------------------------
      // NATAL • RN — FORTE DOS REIS MAGOS
      // -------------------------------------------------------------
      case 'forte_reis_magos': {
        const fw = size * 2.40;
        const fh = size * 0.85;

        // Muralha Estrelada de Pedra no Recife do Mar
        ctx.fillStyle = isNight ? '#1E293B' : '#78716C';
        ctx.beginPath();
        // Formato em estrela com 5 pontas
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const r = fw * 0.50;
          const x = Math.cos(a) * r;
          const y = -fh + Math.sin(a) * (fh * 0.35);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Capela interna branca com telhado cerâmico
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-size * 0.25, -fh - size * 0.25, size * 0.50, size * 0.25);
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(-size * 0.28, -fh - size * 0.32, size * 0.56, size * 0.08);
        break;
      }

      // -------------------------------------------------------------
      // BELÉM • PA — MERCADO VER-O-PESO
      // -------------------------------------------------------------
      case 'ver_o_peso': {
        const vw = size * 2.20;
        const vh = size * 1.70;
        const vy = -vh;

        // Estrutura de Ferro Gótico Belga
        ctx.fillStyle = isNight ? '#1E293B' : '#334155';
        ctx.fillRect(-vw * 0.40, vy + vh * 0.35, vw * 0.80, vh * 0.65);

        // 4 Torres Octogonais de Zinco com Agulhas Góticas
        const drawVerTower = (tx) => {
          ctx.fillStyle = isNight ? '#38BDF8' : '#0284C7';
          ctx.fillRect(tx - size * 0.14, vy + vh * 0.20, size * 0.28, vh * 0.80);
          // Agulha cônica do topo
          ctx.beginPath();
          ctx.moveTo(tx - size * 0.16, vy + vh * 0.20);
          ctx.lineTo(tx, vy);
          ctx.lineTo(tx + size * 0.16, vy + vh * 0.20);
          ctx.closePath();
          ctx.fill();
        };
        drawVerTower(-vw * 0.40);
        drawVerTower(vw * 0.40);
        break;
      }

      // -------------------------------------------------------------
      // PORTO VELHO • RO — AS TRÊS CAIXAS D'ÁGUA (TRÊS MARIAS)
      // -------------------------------------------------------------
      case 'tres_caixas_dagua': {
        const bw = size * 2.30;
        const bh = size * 2.10;
        const by = -bh;

        // Três Caixas Cilíndricas sobre tripés de aço
        for (let i = -1; i <= 1; i++) {
          const cx = i * (bw * 0.36);
          // Tripé de aço
          ctx.strokeStyle = isNight ? '#475569' : '#1E293B';
          ctx.lineWidth = Math.max(1, size * 0.035);
          ctx.beginPath();
          ctx.moveTo(cx - size * 0.18, 0);
          ctx.lineTo(cx, by + bh * 0.40);
          ctx.moveTo(cx + size * 0.18, 0);
          ctx.lineTo(cx, by + bh * 0.40);
          ctx.stroke();

          // Tambor Metálico Preto / Ferro
          ctx.fillStyle = isNight ? '#0F172A' : '#334155';
          ctx.fillRect(cx - size * 0.22, by, size * 0.44, bh * 0.42);
          // Telhado Cônico da Caixa
          ctx.beginPath();
          ctx.moveTo(cx - size * 0.24, by);
          ctx.lineTo(cx, by - size * 0.18);
          ctx.lineTo(cx + size * 0.24, by);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      // -------------------------------------------------------------
      // MACAPÁ • AP — MARCO ZERO DO EQUADOR & FORTALEZA DE SÃO JOSÉ
      // -------------------------------------------------------------
      case 'marco_zero_equador': {
        const mw = size * 1.60;
        const mh = size * 2.80;
        const my = -mh;

        // Monólito em forma de Relógio de Sol de 30 metros
        ctx.fillStyle = isNight ? '#1E293B' : '#E2E8F0';
        ctx.fillRect(-size * 0.18, my, size * 0.36, mh);

        // Círculo vazado no topo por onde o sol do equinócio passa
        ctx.fillStyle = isNight ? '#FDE047' : '#FED7AA';
        ctx.beginPath();
        ctx.arc(0, my + size * 0.35, size * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Faixa Amarela no Asfalto marcando a LINHA DO EQUADOR (0° 00' 00")
        ctx.fillStyle = '#FEDD00';
        ctx.fillRect(-mw * 0.70, -size * 0.06, mw * 1.40, size * 0.06);

        if (size > 14) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.max(4, Math.floor(size * 0.11))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('LINHA DO EQUADOR 0°', 0, -size * 0.10);
        }
        break;
      }

      // -------------------------------------------------------------
      // CAMPO GRANDE • MS — MONUMENTO DAS ARARAS
      // -------------------------------------------------------------
      case 'monumento_araras': {
        const aw = size * 2.20;
        const ah = size * 2.10;
        const ay = -ah;

        // Pedestal de Pedra / Terra Vermelha
        ctx.fillStyle = isNight ? '#451A03' : '#9A3412';
        ctx.fillRect(-size * 0.40, -size * 0.45, size * 0.80, size * 0.45);

        // Arara Azul em Voo (Asas Abertas)
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.moveTo(0, ay + size * 0.40);
        ctx.lineTo(-aw * 0.45, ay);
        ctx.lineTo(-size * 0.10, ay + size * 0.60);
        ctx.closePath();
        ctx.fill();

        // Arara Vermelha / Canindé ao lado
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.moveTo(0, ay + size * 0.40);
        ctx.lineTo(aw * 0.45, ay);
        ctx.lineTo(size * 0.10, ay + size * 0.60);
        ctx.closePath();
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // GOIÂNIA • GO — MONUMENTO ÀS TRÊS RAÇAS
      // -------------------------------------------------------------
      case 'tres_racas': {
        const tw = size * 1.60;
        const th = size * 2.60;
        const ty = -th;

        // Pedestal de Mármore da Praça Cívica
        ctx.fillStyle = isNight ? '#334155' : '#94A3B8';
        ctx.fillRect(-size * 0.45, -size * 0.35, size * 0.90, size * 0.35);

        // Três Figuras de Bronze erguendo o mastro da capital
        ctx.fillStyle = isNight ? '#1E293B' : '#475569';
        ctx.fillRect(-tw * 0.35, ty + th * 0.45, tw * 0.70, th * 0.45);

        // Mastro Monumental subindo ao céu
        ctx.fillStyle = isNight ? '#E2E8F0' : '#F8FAFC';
        ctx.fillRect(-size * 0.05, ty, size * 0.10, th);
        break;
      }

      // -------------------------------------------------------------
      // ARACAJU • SE — ARCOS DA ORLA DE ATALAIA & CARANGUEJO GIGANTE
      // -------------------------------------------------------------
      case 'arcos_atalaia': {
        const aw = size * 2.60;
        const ah = size * 1.60;
        const ay = -ah;

        // Sequência de 4 Arcos Azuis Luminosos da Orla
        ctx.strokeStyle = isNight ? '#38BDF8' : '#0284C7';
        ctx.lineWidth = Math.max(1.2, size * 0.045);
        for (let i = 0; i < 4; i++) {
          const ax = -aw * 0.45 + i * (aw * 0.30);
          ctx.beginPath();
          ctx.ellipse(ax, 0, size * 0.28, ah, 0, Math.PI, 0, false);
          ctx.stroke();
        }

        // Escultura do Caranguejo Gigante na passarela
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.ellipse(size * 0.45, -size * 0.25, size * 0.32, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // JOÃO PESSOA • PB — FAROL DO CABO BRANCO
      // -------------------------------------------------------------
      case 'farol_cabo_branco': {
        const fw = size * 1.20;
        const fh = size * 2.70;
        const fy = -fh;

        // Torre Triangular Branca inspirada em planta de sisal
        ctx.fillStyle = isNight ? '#94A3B8' : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-fw * 0.35, 0);
        ctx.lineTo(-size * 0.08, fy);
        ctx.lineTo(size * 0.08, fy);
        ctx.lineTo(fw * 0.35, 0);
        ctx.closePath();
        ctx.fill();

        // Três Faixas Negras Horizontais
        ctx.fillStyle = isNight ? '#0F172A' : '#1E293B';
        ctx.fillRect(-fw * 0.26, fy + fh * 0.30, fw * 0.52, size * 0.15);
        ctx.fillRect(-fw * 0.20, fy + fh * 0.55, fw * 0.40, size * 0.15);

        // Lanterna no ponto mais oriental das Américas
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-size * 0.12, fy - size * 0.20, size * 0.24, size * 0.20);
        break;
      }

      // -------------------------------------------------------------
      // PALMAS • TO — PALÁCIO ARAGUAIA & PRAÇA DOS GIRASSÓIS
      // -------------------------------------------------------------
      case 'palacio_araguaia': {
        const pw = size * 2.80;
        const ph = size * 1.60;
        const py = -ph;

        // Palácio Neoclássico com colunata no centro da maior praça da América Latina
        ctx.fillStyle = isNight ? '#1E293B' : '#F8FAFC';
        ctx.fillRect(-pw * 0.50, -ph * 0.65, pw, ph * 0.65);

        // Colunata branca
        ctx.fillStyle = isNight ? '#64748B' : '#E2E8F0';
        for (let c = -5; c <= 5; c++) {
          ctx.fillRect(c * (pw * 0.08) - size * 0.03, -ph * 0.65, size * 0.06, ph * 0.65);
        }

        // Cúpula Dourada Central
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, py + ph * 0.35, size * 0.38, Math.PI, 0, false);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // SÃO LUÍS • MA — PALÁCIO DOS LEÕES & AZULEJOS PORTUGUESES
      // -------------------------------------------------------------
      case 'palacio_leoes': {
        const lw = size * 2.50;
        const lh = size * 1.50;
        const ly = -lh;

        // Fachada Colonial Amarela com Molduras Brancas
        ctx.fillStyle = isNight ? '#78350F' : (isDusk ? '#B45309' : '#FBBF24');
        ctx.fillRect(-lw * 0.50, ly, lw, lh);

        // Muros de Azulejos Portugueses Azuis na Base
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(-lw * 0.50, -lh * 0.25, lw, lh * 0.25);

        // Sacadas de ferro fundido e estátuas dos leões
        ctx.fillStyle = isNight ? '#CBD5E1' : '#FFFFFF';
        for (let w = -3; w <= 3; w++) {
          ctx.fillRect(w * (lw * 0.13) - size * 0.04, ly + lh * 0.25, size * 0.08, lh * 0.35);
        }
        break;
      }

      // -------------------------------------------------------------
      // CUIABÁ • MT — CENTRO GEODÉSICO DA AMÉRICA DO SUL
      // -------------------------------------------------------------
      case 'centro_geodesico': {
        const ow = size * 0.70;
        const oh = size * 2.60;
        const oy = -oh;

        // Obelisco Branco de Mármore marcando o centro do continente
        ctx.fillStyle = isNight ? '#94A3B8' : '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(-ow * 0.50, 0);
        ctx.lineTo(-ow * 0.20, oy + size * 0.30);
        ctx.lineTo(0, oy);
        ctx.lineTo(ow * 0.20, oy + size * 0.30);
        ctx.lineTo(ow * 0.50, 0);
        ctx.closePath();
        ctx.fill();

        // Rosa dos Ventos dourada
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, oy + oh * 0.45, size * 0.16, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // RIO BRANCO • AC — PALÁCIO RIO BRANCO
      // -------------------------------------------------------------
      case 'palacio_rio_branco': {
        const rw = size * 2.50;
        const rh = size * 1.65;
        const ry = -rh;

        // Fachada Neoclássica Branca
        ctx.fillStyle = isNight ? '#1E293B' : '#F8FAFC';
        ctx.fillRect(-rw * 0.45, -rh * 0.65, rw * 0.90, rh * 0.65);

        // Frontão com brasão do Estado do Acre
        ctx.fillStyle = isNight ? '#334155' : '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(-rw * 0.35, -rh * 0.65);
        ctx.lineTo(0, ry);
        ctx.lineTo(rw * 0.35, -rh * 0.65);
        ctx.closePath();
        ctx.fill();

        // Estrela Vermelha da Revolução Acreana
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(0, ry + rh * 0.22, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // -------------------------------------------------------------
      // BOA VISTA • RR — MONUMENTO AOS PIONEIROS
      // -------------------------------------------------------------
      case 'monumento_pioneiros': {
        const pw = size * 2.20;
        const ph = size * 1.50;
        const py = -ph;

        // Painel Esculpido em Concreto e Bronze na Orla Taumanan
        ctx.fillStyle = isNight ? '#1E293B' : '#78716C';
        ctx.fillRect(-pw * 0.50, py, pw, ph);

        // Relevo das figuras dos povos indígenas e pioneiros
        ctx.fillStyle = isNight ? '#CA8A04' : '#F59E0B';
        ctx.fillRect(-pw * 0.40, py + ph * 0.25, pw * 0.80, ph * 0.60);
        break;
      }

      default:
        // Caso padrão caso não encontre
        break;
    }
  },

  /**
   * Renderiza a linha do horizonte e monumento distante na camada de céu/parallax (Sky Skyline)
   */
  renderSkyLandmark(ctx, def, scroll, curveShift, horizonY, E, S) {
    const isNight = S.night > 0.28;
    const isDusk = S.dusk > 0.25;
    const PW = 640;
    const farShift = ((scroll * 0.16 + curveShift * 0.3) % PW + PW) % PW;
    const trackId = def ? def.id : 'brasil';

    ctx.save();
    for (let tile = -1; tile <= 1; tile++) {
      const bx = tile * PW - farShift;
      if (bx + PW < -40 || bx > INTERNAL_WIDTH + 40) continue;

      switch (trackId) {
        // --- SALVADOR: ELEVADOR LACERDA & FAROL NA BAÍA ---
        case 'salvador': {
          // Baía de Todos os Santos (Água)
          const waterY = horizonY - 14;
          ctx.fillStyle = isNight ? '#0C1B2A' : (isDusk ? '#5C2D2B' : '#0284C7');
          ctx.fillRect(bx, waterY, PW, 14);

          // Escarpas da falésia da Cidade Alta
          ctx.fillStyle = isNight ? '#1E242B' : (isDusk ? '#4E3629' : '#475569');
          ctx.beginPath();
          ctx.moveTo(bx + 40, waterY);
          ctx.lineTo(bx + 110, horizonY - 42);
          ctx.lineTo(bx + 310, horizonY - 42);
          ctx.lineTo(bx + 380, waterY);
          ctx.closePath();
          ctx.fill();

          // Elevador Lacerda silhuetado na encosta (bx + 200)
          const elX = bx + 210;
          const elTop = horizonY - 58;
          ctx.fillStyle = isNight ? '#38BDF8' : (isDusk ? '#FFEDD5' : '#E2E8F0');
          ctx.fillRect(elX - 4, elTop, 8, 38);
          ctx.fillRect(elX - 18, elTop, 36, 7); // Passarela suspensa
          // Janelas iluminadas
          ctx.fillStyle = isNight ? '#FDE047' : '#FED7AA';
          ctx.fillRect(elX - 16, elTop + 2, 32, 3);

          // Farol da Barra na ponta (bx + 460)
          const fX = bx + 480;
          ctx.fillStyle = isNight ? '#0F172A' : '#1E293B';
          ctx.fillRect(fX - 4, horizonY - 36, 8, 22);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(fX - 4, horizonY - 30, 8, 6);
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(fX - 3, horizonY - 40, 6, 5); // Lanterna
          break;
        }

        // --- RIO DE JANEIRO: CRISTO NO CORCOVADO & PÃO DE AÇÚCAR ---
        case 'rio_de_janeiro': {
          // Pão de Açúcar (Morro Cônico à esquerda)
          const pX = bx + 130;
          ctx.fillStyle = isNight ? '#0E1726' : (isDusk ? '#3D1C2A' : '#334155');
          ctx.beginPath();
          ctx.moveTo(pX - 55, horizonY);
          ctx.quadraticCurveTo(pX - 25, horizonY - 48, pX, horizonY - 50);
          ctx.quadraticCurveTo(pX + 25, horizonY - 48, pX + 55, horizonY);
          ctx.closePath();
          ctx.fill();
          // Cabo do Bondinho
          ctx.strokeStyle = isNight ? '#38BDF8' : '#94A3B8';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(pX, horizonY - 50);
          ctx.lineTo(pX + 80, horizonY - 26);
          ctx.stroke();

          // Corcovado com Cristo Redentor iluminado no topo
          const cX = bx + 360;
          ctx.fillStyle = isNight ? '#0B1320' : (isDusk ? '#321624' : '#1E293B');
          ctx.beginPath();
          ctx.moveTo(cX - 70, horizonY);
          ctx.lineTo(cX, horizonY - 60);
          ctx.lineTo(cX + 70, horizonY);
          ctx.closePath();
          ctx.fill();
          // Estátua do Cristo (Branco iluminado)
          const crTop = horizonY - 74;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cX - 1.5, crTop, 3, 14); // Corpo
          ctx.fillRect(cX - 8, crTop + 3, 16, 2.5); // Braços Abertos
          ctx.beginPath();
          ctx.arc(cX, crTop - 1, 2, 0, Math.PI * 2); // Cabeça
          ctx.fill();
          if (isNight) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.beginPath();
            ctx.arc(cX, crTop + 4, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        // --- SÃO PAULO: ARRANHA-CÉUS, MASP & PONTE ESTAIADA ---
        case 'sao_paulo': {
          // Skyline denso de metrópole (Paulista & Faria Lima)
          const bldgs = [
            { x: 30, w: 22, h: 48, col: '#1E293B' },
            { x: 56, w: 34, h: 62, col: '#0F172A' },
            { x: 94, w: 26, h: 54, col: '#334155' },
            { x: 124, w: 40, h: 72, col: '#0F172A', spire: true }, // Banespa / Altino Arantes
            { x: 168, w: 28, h: 46, col: '#1E293B' },
            { x: 200, w: 36, h: 58, col: '#334155' },
            { x: 280, w: 32, h: 50, col: '#1E293B' },
            { x: 316, w: 45, h: 68, col: '#0F172A' },
            { x: 365, w: 28, h: 52, col: '#334155' }
          ];

          for (let b of bldgs) {
            ctx.fillStyle = b.col;
            ctx.fillRect(bx + b.x, horizonY - b.h, b.w, b.h);
            if (b.spire) {
              ctx.fillStyle = '#E2E8F0';
              ctx.fillRect(bx + b.x + b.w * 0.5 - 1, horizonY - b.h - 14, 2, 14);
            }
            // Luzes das janelas nos prédios
            if (isNight) {
              ctx.fillStyle = '#FDE047';
              for (let fy = horizonY - b.h + 4; fy < horizonY - 4; fy += 7) {
                for (let fx = bx + b.x + 3; fx < bx + b.x + b.w - 3; fx += 5) {
                  if ((fx + fy) % 3 === 0) ctx.fillRect(fx, fy, 2, 2.5);
                }
              }
            }
          }

          // Ponte Estaiada (bx + 460)
          const stX = bx + 480;
          const stTop = horizonY - 62;
          ctx.strokeStyle = isNight ? '#38BDF8' : '#CBD5E1';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(stX - 16, horizonY);
          ctx.lineTo(stX + 10, stTop);
          ctx.moveTo(stX + 16, horizonY);
          ctx.lineTo(stX - 10, stTop);
          ctx.stroke();
          // Cabos estaiados
          ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.65)' : 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          for (let c = 1; c <= 4; c++) {
            const cy = stTop + c * 8;
            ctx.moveTo(stX, cy);
            ctx.lineTo(stX - c * 7, horizonY);
            ctx.moveTo(stX, cy);
            ctx.lineTo(stX + c * 7, horizonY);
          }
          ctx.stroke();
          break;
        }

        // --- BRASÍLIA: CONGRESSO NACIONAL & CATEDRAL ---
        case 'brasilia': {
          // Céu aberto do Planalto Central com chapadas ao fundo
          ctx.fillStyle = isNight ? '#0F172A' : (isDusk ? '#5C271F' : '#334155');
          ctx.beginPath();
          ctx.moveTo(bx, horizonY);
          ctx.lineTo(bx + 180, horizonY - 14);
          ctx.lineTo(bx + 420, horizonY - 14);
          ctx.lineTo(bx + PW, horizonY);
          ctx.closePath();
          ctx.fill();

          // Congresso Nacional silhuetado (bx + 160)
          const cgX = bx + 190;
          ctx.fillStyle = isNight ? '#E2E8F0' : '#FFFFFF';
          // Base
          ctx.fillRect(cgX - 45, horizonY - 8, 90, 8);
          // Torres H
          ctx.fillRect(cgX - 7, horizonY - 48, 6, 40);
          ctx.fillRect(cgX + 1, horizonY - 48, 6, 40);
          // Cúpula do Senado (tampa virada p/ baixo)
          ctx.beginPath();
          ctx.arc(cgX - 25, horizonY - 8, 10, Math.PI, 0, false);
          ctx.fill();
          // Cúpula da Câmara (aberta p/ cima)
          ctx.beginPath();
          ctx.arc(cgX + 25, horizonY - 10, 11, 0, Math.PI, false);
          ctx.fill();

          // Catedral Metropolitana (bx + 430)
          const catX = bx + 430;
          ctx.fillStyle = isNight ? '#38BDF8' : '#0284C7';
          ctx.beginPath();
          ctx.moveTo(catX - 20, horizonY);
          ctx.lineTo(catX, horizonY - 32);
          ctx.lineTo(catX + 20, horizonY);
          ctx.closePath();
          ctx.fill();
          // Pilares brancos
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          for (let p = -3; p <= 3; p++) {
            ctx.beginPath();
            ctx.moveTo(catX + p * 6, horizonY);
            ctx.lineTo(catX + p * 1.5, horizonY - 32);
            ctx.stroke();
          }
          break;
        }

        // --- MANAUS: RIO NEGRO & TEATRO AMAZONAS ---
        case 'manaus': {
          // Rio Negro refletivo
          ctx.fillStyle = isNight ? '#050A14' : (isDusk ? '#3B1824' : '#0F172A');
          ctx.fillRect(bx, horizonY - 12, PW, 12);

          // Floresta Amazônica ao fundo
          ctx.fillStyle = isNight ? '#062817' : (isDusk ? '#2A3319' : '#14532D');
          ctx.beginPath();
          for (let x = 0; x < PW; x += 18) {
            const h = 18 + Math.sin(x * 0.1) * 6;
            ctx.lineTo(bx + x, horizonY - 12 - h);
          }
          ctx.lineTo(bx + PW, horizonY);
          ctx.lineTo(bx, horizonY);
          ctx.closePath();
          ctx.fill();

          // Cúpula Colorida do Teatro Amazonas (bx + 260)
          const tmX = bx + 270;
          ctx.fillStyle = '#FEDD00'; // Amarelo
          ctx.beginPath();
          ctx.arc(tmX, horizonY - 26, 14, Math.PI, 0, false);
          ctx.fill();
          ctx.strokeStyle = '#009739'; // Verde
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Ponte Rio Negro Estaiada (bx + 480)
          const prX = bx + 490;
          ctx.strokeStyle = isNight ? '#38BDF8' : '#CBD5E1';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(prX, horizonY - 48);
          ctx.lineTo(prX, horizonY);
          ctx.moveTo(prX - 35, horizonY - 12);
          ctx.lineTo(prX + 35, horizonY - 12);
          ctx.stroke();
          break;
        }

        // --- CURITIBA: JARDIM BOTÂNICO & SERRA DO MAR ---
        case 'curitiba': {
          // Montanhas da Serra do Mar (Azul/Púrpura)
          ctx.fillStyle = isNight ? '#111827' : (isDusk ? '#4A1D36' : '#334155');
          ctx.beginPath();
          ctx.moveTo(bx, horizonY);
          ctx.lineTo(bx + 120, horizonY - 40);
          ctx.lineTo(bx + 260, horizonY - 26);
          ctx.lineTo(bx + 420, horizonY - 52);
          ctx.lineTo(bx + PW, horizonY);
          ctx.closePath();
          ctx.fill();

          // Araucárias no horizonte
          const drawPine = (px, py, ph) => {
            ctx.fillStyle = isNight ? '#062419' : '#166534';
            ctx.fillRect(px - 1, py - ph, 2, ph);
            // Copa em cálice da araucária
            ctx.beginPath();
            ctx.ellipse(px, py - ph, ph * 0.45, ph * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
          };
          drawPine(bx + 70, horizonY - 12, 28);
          drawPine(bx + 95, horizonY - 15, 34);
          drawPine(bx + 360, horizonY - 16, 32);

          // Estufa do Jardim Botânico (bx + 220)
          const jbX = bx + 220;
          ctx.fillStyle = isNight ? 'rgba(52, 211, 153, 0.65)' : 'rgba(16, 185, 129, 0.55)';
          ctx.fillRect(jbX - 25, horizonY - 14, 50, 14);
          // 3 Cúpulas de vidro
          ctx.beginPath();
          ctx.arc(jbX, horizonY - 14, 12, Math.PI, 0, false);
          ctx.arc(jbX - 16, horizonY - 14, 8, Math.PI, 0, false);
          ctx.arc(jbX + 16, horizonY - 14, 8, Math.PI, 0, false);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          break;
        }

        // --- FLORIANÓPOLIS: PONTE HERCÍLIO LUZ & BAÍA ---
        case 'florianopolis': {
          // Água da Baía de Florianópolis
          ctx.fillStyle = isNight ? '#091A2A' : (isDusk ? '#4B2636' : '#0369A1');
          ctx.fillRect(bx, horizonY - 15, PW, 15);

          // Ponte Hercílio Luz em destaque no horizonte (bx + 180 a 380)
          const pStart = bx + 160;
          const pEnd = bx + 390;
          const t1 = bx + 225;
          const t2 = bx + 325;
          const topH = horizonY - 55;
          const deckH = horizonY - 18;

          // Torres
          ctx.fillStyle = isNight ? '#0F172A' : '#1E293B';
          ctx.fillRect(t1 - 3, topH, 6, deckH - topH + 4);
          ctx.fillRect(t2 - 3, topH, 6, deckH - topH + 4);

          // Cabos de suspensão iluminados
          ctx.strokeStyle = isNight ? '#FDE047' : '#94A3B8';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pStart, deckH);
          ctx.lineTo(t1, topH);
          ctx.quadraticCurveTo((t1 + t2) * 0.5, deckH - 4, t2, topH);
          ctx.lineTo(pEnd, deckH);
          ctx.stroke();

          // Pista da ponte
          ctx.fillStyle = isNight ? '#FBBF24' : '#E2E8F0';
          ctx.fillRect(pStart, deckH, pEnd - pStart, 2);
          break;
        }

        // --- PORTO ALEGRE: USINA DO GASÔMETRO & GUAÍBA ---
        case 'porto_alegre': {
          // Lago Guaíba
          ctx.fillStyle = isNight ? '#0A1826' : (isDusk ? '#602220' : '#0284C7');
          ctx.fillRect(bx, horizonY - 14, PW, 14);

          // Usina do Gasômetro com Chaminé Alta (bx + 280)
          const ugX = bx + 290;
          ctx.fillStyle = isNight ? '#451A03' : '#78350F';
          ctx.fillRect(ugX - 22, horizonY - 26, 44, 26);
          // Chaminé esbelta
          ctx.fillStyle = isNight ? '#3F3F46' : '#52525B';
          ctx.fillRect(ugX + 8, horizonY - 65, 5, 65);
          // Luz vermelha no topo da chaminé
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(ugX + 8, horizonY - 67, 5, 2);
          break;
        }

        // --- DEMAIS CAPITAIS: HORIZONTE REGIONAL CARACTERÍSTICO COM MONUMENTO ---
        default: {
          // Relevo geográfico suave
          ctx.fillStyle = isNight ? '#0B1320' : (isDusk ? '#4A2A20' : '#2D3748');
          ctx.beginPath();
          ctx.moveTo(bx, horizonY);
          ctx.quadraticCurveTo(bx + 160, horizonY - 28, bx + 320, horizonY - 18);
          ctx.quadraticCurveTo(bx + 480, horizonY - 35, bx + PW, horizonY);
          ctx.closePath();
          ctx.fill();

          // Silhueta do monumento principal
          if (def && def.landmarkScenery) {
            ctx.save();
            ctx.translate(bx + 320, horizonY);
            MonumentArt.renderScenery(ctx, def.landmarkScenery, 18, isNight, isDusk);
            ctx.restore();
          }
          break;
        }
      }
    }
    ctx.restore();
  }
};

