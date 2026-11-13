(() => {
  const { $, $$ } = DA;
  /* ---------- o mapa e os dealers ---------- */
  const mapas = $$('[data-mapa]');
  if (!mapas.length) return;
  // os arcos desenham-se de Cox para fora: cada arco mede 1, e o traço corre de 1 a 0 quando o mapa entra no ecrã
  mapas.forEach((m) => $$('.mapa-rotas path', m).forEach((p) => p.setAttribute('pathLength', '1')));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('acende'); io.unobserve(e.target); } }), { threshold: 0.35 });
    mapas.forEach((m) => io.observe(m));
  } else mapas.forEach((m) => m.classList.add('acende'));

  // passar por um cartão (ou tocar-lhe) acende o ponto e o arco dele no mapa; a sede acende o farol de Cox
  const lista = $('[data-dealer-lista]');
  if (!lista) return;
  const escolhe = (k) => mapas.forEach((m) => {
    const casa = k === 'cox';
    $$('.mapa-dealers circle', m).forEach((c) => c.classList.toggle('escolhido', !!k && c.dataset.d === k));
    $$('.mapa-rotas path', m).forEach((r) => r.classList.toggle('escolhida', !!k && r.dataset.d === k));
    m.classList.toggle('tem-escolha', !!k && !casa);
    m.classList.toggle('em-casa', casa);
  });
  $$('.dealer[data-d]', lista).forEach((c) => {
    const k = c.dataset.d;
    c.addEventListener('pointerenter', () => escolhe(k));
    c.addEventListener('focusin', () => escolhe(k));
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') escolhe(''); });
    c.addEventListener('focusout', () => escolhe(''));
  });
})();
