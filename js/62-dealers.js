/* /dealers/: os portos do mapa e a lista por zona abrem a mesma ficha.
   Rato por cima de um porto: pré-visualização junto ao ponto e a rota dele realçada. Clique ou toque: a ficha grande.
   Fecha com Esc, com o botão, com um clique fora (no telemóvel, no véu). */
(() => {
  const palco = document.querySelector('[data-dl-palco]');
  if (!palco) return;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ficha = palco.querySelector('[data-dl-ficha]'), veu = palco.querySelector('[data-dl-veu]'), previa = palco.querySelector('[data-dl-previa]');
  const btFecha = ficha.querySelector('[data-dl-fecha]');
  const artigos = $$('[data-dl-f]', ficha), pinos = $$('[data-dl-pin]', palco), itens = $$('[data-dl-abre]');
  const rotas = $$('.dl-arco,.dl-fluxo', palco);
  const estreito = matchMedia('(max-width:900px)');
  let aberto = '', origem = null;

  // marca um porto em tudo o que o representa: ponto, rota e linha da lista
  const marca = (k, cls) => {
    pinos.forEach((p) => p.classList.toggle(cls, p.dataset.dlPin === k));
    itens.forEach((b) => b.classList.toggle(cls, b.dataset.dlAbre === k));
    rotas.forEach((r) => r.classList.toggle(cls, r.dataset.d === k));
    palco.classList.toggle('com-' + cls, !!k);
  };

  const mostraPrevia = (p) => {
    if (estreito.matches || aberto === p.dataset.dlPin) return;
    previa.querySelector('[data-p-zona]').textContent = p.dataset.zona;
    previa.querySelector('[data-p-nome]').textContent = p.dataset.nome;
    previa.querySelector('[data-p-local]').textContent = p.dataset.local;
    previa.style.setProperty('--x', p.style.getPropertyValue('--x'));
    previa.style.setProperty('--y', p.style.getPropertyValue('--y'));
    // perto do topo do mapa a pré-visualização abre para baixo
    previa.classList.toggle('abaixo', parseFloat(p.style.getPropertyValue('--y')) < 40);
    previa.classList.add('ve');
  };
  const escondePrevia = () => previa.classList.remove('ve');

  // no computador a ficha inteira tem de ficar entre a navbar e o fundo do ecrã: se não fica, a página desliza até ela
  const mostraFicha = () => requestAnimationFrame(() => {
    if (estreito.matches) return;
    const topo = document.querySelector('.topo'), cab = (topo ? topo.getBoundingClientRect().bottom : 80) + 16;
    const r = ficha.getBoundingClientRect(), m = palco.querySelector('.dl-marco').getBoundingClientRect();
    let alvo = null;
    if (r.top < cab) alvo = scrollY + r.top - cab;
    else if (r.bottom > innerHeight - 16) alvo = scrollY + Math.min(r.bottom - innerHeight + 16, r.top - cab);
    if (alvo === null && (m.bottom < cab || m.top > innerHeight)) alvo = scrollY + m.top - cab;
    if (alvo !== null) scrollTo({ top: alvo, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  });
  const abre = (k, de) => {
    escondePrevia();
    aberto = k; origem = de || origem;
    artigos.forEach((a) => { a.hidden = a.dataset.dlF !== k; });
    const art = artigos.find((a) => a.dataset.dlF === k);
    ficha.setAttribute('aria-label', 'Ficha de ' + art.querySelector('.dl-f-nome').textContent);
    ficha.scrollTop = 0;
    ficha.inert = false;
    ficha.classList.add('aberta');
    mostraFicha();
    [...pinos, ...itens].forEach((b) => b.setAttribute('aria-expanded', String((b.dataset.dlPin || b.dataset.dlAbre) === k)));
    marca(k, 'sel');
    if (estreito.matches) {
      ficha.setAttribute('aria-modal', 'true');
      veu.hidden = false; requestAnimationFrame(() => veu.classList.add('ve'));
      document.documentElement.classList.add('dl-trava');
    }
    btFecha.focus({ preventScroll: true });
  };

  const fecha = (devolve = true) => {
    if (!aberto) return;
    aberto = '';
    ficha.classList.remove('aberta');
    ficha.inert = true;
    ficha.setAttribute('aria-modal', 'false');
    [...pinos, ...itens].forEach((b) => b.setAttribute('aria-expanded', 'false'));
    marca('', 'sel');
    veu.classList.remove('ve');
    document.documentElement.classList.remove('dl-trava');
    if (devolve && origem) origem.focus({ preventScroll: true });
  };

  pinos.forEach((p) => {
    const k = p.dataset.dlPin;
    p.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; marca(k, 'foco'); mostraPrevia(p); });
    p.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; marca('', 'foco'); escondePrevia(); });
    p.addEventListener('focus', () => { if (p.matches(':focus-visible')) { marca(k, 'foco'); mostraPrevia(p); } });
    p.addEventListener('blur', () => { marca('', 'foco'); escondePrevia(); });
    p.addEventListener('click', () => abre(k, p));
  });
  itens.forEach((b) => {
    const k = b.dataset.dlAbre;
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') marca(k, 'foco'); });
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') marca('', 'foco'); });
    b.addEventListener('click', () => {
      abre(k, b);
      // no computador a ficha abre sobre o mapa: se o mapa não está à vista, leva-se até lá
      if (!estreito.matches) {
        mostraFicha();
      }
    });
  });
  btFecha.addEventListener('click', () => fecha());
  veu.addEventListener('click', () => fecha());
  veu.addEventListener('transitionend', () => { if (!veu.classList.contains('ve')) veu.hidden = true; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && aberto) { e.preventDefault(); fecha(); } });
  document.addEventListener('click', (e) => {
    if (!aberto || ficha.contains(e.target) || e.target.closest('[data-dl-pin],[data-dl-abre]')) return;
    fecha(false);
  });
  // mudar de largura com a ficha aberta: o véu e a trava só existem no telemóvel
  estreito.addEventListener('change', () => { if (aberto) { const k = aberto; fecha(false); abre(k); } });
  // /dealers/#mallorca abre a ficha desse porto
  const h = location.hash.slice(1);
  if (artigos.some((a) => a.dataset.dlF === h)) abre(h);
})();
