(() => {
  /* ---------- /models/: a página do Pantiera 32. A galeria, os pinos da ficha e as âncoras. Não faz nada noutras páginas ---------- */
  const raiz = document.querySelector('[data-mp]'); if (!raiz || !window.DA) return;
  const { $, $$, reduz } = DA;
  const dados = JSON.parse($('#mp-dados').textContent);
  const heroi = $('[data-mp-heroi]'), construir = $('#construir');
  const estreito = matchMedia('(max-width: 900px)');

  // topo do alvo por baixo do cabeçalho fixo; a abertura vai ao zero
  const rola = (el, suave = true) => {
    const y = el === heroi ? 0 : el.getBoundingClientRect().top + scrollY - (estreito.matches ? 64 : 96);
    scrollTo({ top: Math.max(0, y), behavior: suave && !reduz ? 'smooth' : 'instant' });
  };
  // #construir abre o configurador (85-models-3d.js ouve «mp:abrir») e desce até ele
  const abreConfig = () => document.dispatchEvent(new CustomEvent('mp:abrir'));
  const alvoDe = (h) => {
    h = decodeURIComponent(String(h || '').replace(/^#/, '')).toLowerCase();
    if (h === 'construir') return construir;
    if (h === 'ficha') return $('#ficha');
    return h === dados.id ? heroi : null;
  };
  const vai = (el, suave) => { if (el === construir) abreConfig(); requestAnimationFrame(() => rola(el, suave)); };

  raiz.addEventListener('click', (e) => {
    const c = e.target.closest('[data-mp-construir]');
    if (c) { e.preventDefault(); vai(construir); }
  });
  /* o menu e as ligações de fora mudam o #: segue-se */
  addEventListener('hashchange', () => { const a = alvoDe(location.hash); if (a) vai(a); });

  /* ---------- galeria: contador, linha de progresso e setas ---------- */
  (() => {
    const g = $('[data-mp-galeria]'); if (!g) return;
    const tr = $('[data-mp-trilho]', g), slides = $$('.mp-slide', tr), n = slides.length;
    const iEl = $('[data-mp-gal-i]', g), barra = $('[data-mp-gal-barra]', g), setas = $$('[data-mp-gal]', g);
    let i = -1, pedido = 0;
    const passo = () => (n > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : tr.clientWidth);
    const le = () => {
      pedido = 0;
      const p = passo(), max = tr.scrollWidth - tr.clientWidth;
      const k = tr.scrollLeft >= max - 4 ? n - 1 : Math.round(tr.scrollLeft / p);
      if (k === i) return; i = k;
      iEl.textContent = String(k + 1).padStart(2, '0');
      barra.style.setProperty('--k', ((k + 1) / n).toFixed(4));
      setas[0].disabled = k <= 0; setas[1].disabled = k >= n - 1;
    };
    tr.addEventListener('scroll', () => { if (!pedido) pedido = requestAnimationFrame(le); }, { passive: true });
    setas.forEach((s) => s.addEventListener('click', () => tr.scrollBy({ left: passo() * +s.dataset.mpGal, behavior: reduz ? 'instant' : 'smooth' })));
    tr.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); tr.scrollBy({ left: passo() * d, behavior: reduz ? 'instant' : 'smooth' }); } });
    le();
  })();

  /* ---------- os pinos do desenho: cada número abre a sua mini ficha, como no plano da página inicial ---------- */
  (() => {
    const fig = $('[data-mp-pinos]'); if (!fig) return;
    const mini = $('[data-mp-mini]', fig), pinos = $$('.mp-pino', fig), linhas = $$('[data-legenda]');
    let aberto = null;
    const marca = (i) => linhas.forEach((l) => l.classList.toggle('activo', String(i) === l.dataset.legenda));
    const fecha = () => { mini.hidden = true; if (aberto) aberto.setAttribute('aria-expanded', 'false'); aberto = null; marca(null); };
    const abre = (b) => {
      if (aberto === b) { fecha(); return; }
      if (aberto) aberto.setAttribute('aria-expanded', 'false');
      aberto = b; b.setAttribute('aria-expanded', 'true');
      const l = linhas[+b.dataset.pino], x = parseFloat(b.style.getPropertyValue('--x')), y = parseFloat(b.style.getPropertyValue('--y'));
      $('[data-mp-mini-n]', mini).textContent = b.textContent.trim();
      $('[data-mp-mini-t]', mini).textContent = $('b', l).textContent;
      $('[data-mp-mini-p]', mini).textContent = $('span:last-child', l).textContent;
      mini.style.setProperty('--x', x); mini.style.setProperty('--y', y);
      mini.classList.toggle('cima', y > 55); mini.classList.toggle('dir', x > 50);
      mini.hidden = false; mini.style.animation = 'none'; void mini.offsetWidth; mini.style.animation = '';
      marca(b.dataset.pino);
    };
    pinos.forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); abre(b); }));
    // a legenda também acende o seu pino
    linhas.forEach((l) => { l.addEventListener('click', (ev) => { ev.stopPropagation(); abre(pinos[+l.dataset.legenda]); }); });
    $('[data-mp-mini-x]', mini).addEventListener('click', (ev) => { ev.stopPropagation(); fecha(); });
    document.addEventListener('click', (ev) => { if (aberto && !mini.contains(ev.target)) fecha(); });
    addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && aberto) { const b = aberto; fecha(); b.focus(); } });
    // as linhas e os pontos entram quando o desenho chega ao ecrã (só transform)
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { fig.classList.add('dentro'); o.disconnect(); } }, { threshold: 0 }).observe(fig);
  })();
  // as cotas dos desenhos estendem-se ao entrar (só transform)
  $$('.mp-ga, .mp-escala, .mp-tanques').forEach((el) => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { el.classList.add('dentro'); o.disconnect(); } }, { threshold: 0 }).observe(el));

  /* ---------- arranque: o # do endereço (guardado antes de o núcleo o limpar) ---------- */
  const h = window.MP_HASH || '', alvo = alvoDe(h);
  if (alvo) {
    try { history.replaceState(null, '', h); } catch (e) { /* nada */ }
    if (alvo === construir) abreConfig();
    // espera que as imagens de cima tenham tamanho, para não parar a meio
    requestAnimationFrame(() => rola(alvo, false));
    addEventListener('load', () => { if (scrollY < 40) rola(alvo, false); }, { once: true });
  }
  // ligações de fora da secção para uma âncora desta página com o mesmo # no endereço: o hashchange não dispara, segue-se o toque
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]'); if (!a || raiz.contains(a)) return;
    let u; try { u = new URL(a.href); } catch (x) { return; }
    if (u.pathname !== location.pathname) return;
    const el = alvoDe(u.hash); if (!el) return;
    e.preventDefault(); vai(el);
  });
})();
