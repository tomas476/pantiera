(() => {
  const { $, $$, reduz, clamp, vh } = DA;
  /* ---------- HERO: o filme ---------- */
  const hero = $('[data-hero]'), video = $('[data-hero-video]'), texto = $('[data-hero-texto]'), poster = $('[data-hero-poster]');
  const hl0 = $('[data-hero-logo]');
  // hero em fotografia: sem filme; o cartaz respira com um Ken Burns lento
  if (!reduz) hero.classList.add('kb');
  const fimDoLogo = () => {};

  /* ---------- abertura: a linha de água risca o ecrã, as letras emergem, o logótipo voa para o cabeçalho ---------- */
  const hl = hl0, alvo = $('[data-logo-alvo]');
  // outras secções podem adiar trabalho pesado até o logótipo pousar: DA.abertura.then(...) ou o evento 'da:aberto'
  let acabou; DA.abertura = new Promise((r) => (acabou = r));
  const avisa = () => { acabou(); document.dispatchEvent(new Event('da:aberto')); fimDoLogo(); };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const quadros = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  // todos os tempos saem do token --t-toque, os mesmos que o CSS usa
  const T = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-toque')) || 200;
  const RISCA = T * 6, VOO = T * 14, VOA = T * 6; // RISCA é a --t-cena da linha de água no CSS

  const ab = $('[data-abertura]'), raiz = document.documentElement;
  if (reduz || !ab) {
    document.body.classList.remove('a-abrir'); hero.classList.add('pronto'); ab && ab.remove();
    texto.classList.add('entra', 'vivo', 'assente'); avisa();
  } else {
    // abertura Pantiera: a linha vermelha desce do topo, abre-se em dois ramos e enche as duas ondas; as letras sobem; o logótipo voa para o cabeçalho
    scrollTo(0, 0); hero.classList.add('pronto');
    raiz.style.overflow = 'hidden';
  const logo = $('[data-abertura-logo]'), svg = $('.logo', logo);
  const ctm = svg.getScreenCTM();
  const ecra = (x, y) => ({ x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f });
  // centro do símbolo, para onde o escuro se recolhe
  const sb = $('#simbolo', svg).getBBox();
  const c = ecra(sb.x + sb.width * 0.5, sb.y + sb.height * 0.55);
  document.body.style.setProperty('--ab-x', `${(c.x / innerWidth) * 100}%`);
  document.body.style.setProperty('--ab-y', `${(c.y / innerHeight) * 100}%`);
  // a linha: um tronco que desce do topo do ecrã à esquerda do símbolo e, a meia altura, abre-se em dois ramos;
  // cada ramo entra na base da sua onda pela tangente do eixo e continua pelo eixo até à ponta
  // abertura C+E: a grelha do ecrã inteiro aperta-se até à caixa do logótipo; círculos de traçado encaixam nas curvas
  // do símbolo; as ondas desenham-se por cima; o nome sobe letra a letra; um fio vermelho fecha; o traçado apaga-se
  const linhas = $('[data-linhas-svg]'), NS = 'http://www.w3.org/2000/svg', vw = innerWidth, vh = innerHeight;
  linhas.setAttribute('viewBox', `0 0 ${vw} ${vh}`); linhas.innerHTML = '';
  const BB = svg.getBoundingClientRect(), SB = $('#simbolo', svg).getBoundingClientRect();
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sg = (t, a, b) => cl((t - a) / (b - a));
  const eo = (x) => 1 - Math.pow(1 - x, 3), eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const novo = (d, cor, w, extra) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.style.stroke = cor; p.style.strokeWidth = w + 'px'; p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1 1'; if (extra) p.setAttribute('stroke-linecap', extra); linhas.append(p); return p; };
  // grelha: 9 verticais e 9 horizontais; cada uma guarda de onde parte (ecrã) e onde pousa (caixa do logótipo)
  const gv = [], gh = []; // a grelha saiu: o dono escolheu só a construção (C)
  // círculos de construção à volta do símbolo e uma cruz de eixos
  const cx = SB.left + SB.width * 0.55, cy = SB.top + SB.height * 0.42, r = SB.width * 0.62;
  const circ = (x, y, rr) => `M${x + rr} ${y} A${rr} ${rr} 0 1 1 ${x + rr - 0.01} ${y - 0.5}`;
  const cs = [[cx, cy, r, '#9198a2'], [cx + r * 0.18, cy - r * 0.1, r * 0.62, '#9198a2'], [cx - r * 0.05, cy + r * 0.2, r * 1.05, '#9198a2'], [cx, cy, r * 1.62, '#dc0532']]
    .map(([x, y, rr, cor]) => novo(circ(x, y, rr), cor, 1));
  const eixoH = novo(`M${SB.left - 40} ${cy} L${BB.right + 40} ${cy}`, '#59606a', 1), eixoV = novo(`M${cx} ${SB.top - 60} L${cx} ${SB.bottom + 60}`, '#59606a', 1);
  const mks = $$('.mk', svg), letrasA = $$('#palavra .letra', svg), yachts = $('#yachts', svg);
  mks.forEach((m) => { m.style.animation = 'none'; m.style.strokeDasharray = '1 1'; m.style.strokeDashoffset = 1; });
  letrasA.forEach((l) => { l.style.animation = 'none'; l.style.opacity = 0; });
  if (yachts) yachts.style.opacity = 0;
  const dash = (p, v, op) => { p.style.strokeDashoffset = 1 - v; p.style.opacity = op; };
  const t0 = performance.now();
  const quadro = (now) => {
    const t = (now - t0) / 1000;
    const og = 1 - sg(t, 1.9, 2.5);
    cs.forEach((p, i) => dash(p, eio(sg(t, 0.05 + i * 0.14, 0.9 + i * 0.14)), 0.8 * og));
    dash(eixoH, eio(sg(t, 0, 0.7)), 0.6 * og); dash(eixoV, eio(sg(t, 0.05, 0.75)), 0.6 * og);
    mks.forEach((m) => { const menor = m.dataset.eixo === 'menor'; m.style.strokeDashoffset = 1 - eo(sg(t, menor ? 0.7 : 0.8, menor ? 1.4 : 1.5)); });
    letrasA.forEach((l, i) => { const v = eo(sg(t, 1.25 + i * 0.045, 1.8 + i * 0.045)); l.style.opacity = v; l.style.clipPath = `inset(${((1 - v) * 100).toFixed(1)}% 0 0 0)`; l.style.transform = `translateY(${((1 - v) * 30).toFixed(1)}%)`; });
    if (yachts) yachts.style.opacity = eo(sg(t, 2.05, 2.55));
    if (t < 3.05) requestAnimationFrame(quadro);
    else { letrasA.forEach((l) => { l.style.clipPath = ''; l.style.transform = ''; l.style.opacity = ''; }); if (yachts) yachts.style.opacity = ''; mks.forEach((m) => { m.style.strokeDashoffset = 0; }); }
  };
  requestAnimationFrame(quadro);
    const al = $('svg', alvo);
    setTimeout(() => {
      const a = al.getBoundingClientRect(), b = logo.getBoundingClientRect();
      logo.style.transition = 'transform .85s cubic-bezier(.7,0,.2,1)';
      logo.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
      texto.classList.add('entra');
    }, 3100);
    setTimeout(() => { document.body.classList.remove('a-abrir'); ab.remove(); raiz.style.overflow = ''; texto.classList.add('vivo'); avisa(); setTimeout(() => texto.classList.add('assente'), 2200); }, 4000);
  }

  // o --q escreve-se só nas folhas que o usam (cartaz, filme, texto) e está registado sem herança (10-hero.css):
  // mudar o valor não recalcula o estilo de nada por baixo. Onde o browser tem animation-timeline, o CSS anima
  // o parallax no compositor (cola ao scroll do dedo) e aqui fica só o que é estado: fora e sobre-hero.
  const folhas = [poster].filter(Boolean);
  const peloCSS = !reduz && CSS.supports && CSS.supports('animation-timeline: scroll()');
  let ultimo = -1, altHero = hero.offsetHeight, qAnt = '', qtAnt = '', foraAnt = null, sobreAnt = null;
  addEventListener('resize', () => { altHero = hero.offsetHeight; ultimo = -1; }, { passive: true });
  DA.aCada((t, ecra) => {
    const y = ecra.y, h = ecra.h;
    if (y === ultimo || y > h * 1.2 && ultimo > h * 1.2) { ultimo = y; return; }
    ultimo = y;
    const qt = clamp(y / (h * 0.7));
    if (!peloCSS) {
      const s = (reduz ? 0 : qt).toFixed(4), st = qt.toFixed(4);
      if (s !== qAnt) { qAnt = s; folhas.forEach((f) => f.style.setProperty('--q', s)); }
      if (st !== qtAnt) { qtAnt = st; texto.style.setProperty('--q', st); }
    }
    const fora = qt > 0.6;
    if (fora !== foraAnt) { foraAnt = fora; texto.classList.toggle('fora', fora); }
    // enquanto o hero está por baixo do cabeçalho, o cabeçalho não usa difference (ver 10-hero.css)
    const sobre = y < altHero * 0.82;
    if (sobre !== sobreAnt) { sobreAnt = sobre; document.body.classList.toggle('sobre-hero', sobre); }
  });
})();
