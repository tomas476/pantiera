(() => {
  const { $, $$ } = DA;
  const topo = $('[data-topo]');
  /* ---------- menu ---------- */
  const mb = $('[data-menu-botao]'), menu = $('[data-menu]');
  let aberto = false;
  const fechaMenu = () => { aberto = false; mb.setAttribute('aria-expanded', 'false'); menu.classList.remove('aberto'); document.body.classList.remove('menu-aberto'); setTimeout(() => { if (!aberto) menu.hidden = true; }, 300); document.body.style.overflow = ''; estado(true); };
  mb.addEventListener('click', () => {
    if (aberto) return fechaMenu();
    aberto = true; menu.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('aberto')));
    mb.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-aberto'); document.body.style.overflow = 'hidden'; estado(true);
    $('a', menu).focus({ preventScroll: true });
  });
  menu.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; if (a.dataset.irBarco && DA.escolheBarco) DA.escolheBarco(a.dataset.irBarco); fechaMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && aberto) { fechaMenu(); mb.focus(); } });

  /* ---------- estado do cabeçalho ----------
     .vidro: a página saiu do topo (ao primeiro scroll; no topo do hero fica transparente).
     .claro: o que está por baixo do cabeçalho é uma secção de fundo claro (lido do CSS, não de uma lista). */
  let claras = [];
  const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return 0; const [r, g, b, a = 1] = m.map(Number); return a < 0.5 ? -1 : (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  const lerClaras = () => { claras = $$('main section, main > div').filter((el) => lum(getComputedStyle(el).backgroundColor) > 0.6); };
  lerClaras(); addEventListener('load', lerClaras); addEventListener('resize', lerClaras, { passive: true });
  // a altura do cabeçalho, para saber o que está por baixo dele: lida fora do laço
  let alt = topo.offsetHeight;
  addEventListener('resize', () => { alt = topo.offsetHeight; }, { passive: true });
  let vAnt = null, cAnt = null;
  const estado = (forca) => {
    const y = DA.ecra.y;
    let v = y > 24;
    let c = false;
    if (v) { const meio = y + alt / 2; c = claras.some((el) => { const k = DA.caixa(el); return k.top <= meio && k.bottom > meio; }); }
    if (aberto) { v = false; c = false; }
    if (forca || v !== vAnt) { vAnt = v; topo.classList.toggle('vidro', v); }
    if (forca || c !== cAnt) { cAnt = c; topo.classList.toggle('claro', c); }
  };
  DA.aCada((t, ecra) => { if (ecra.mexeu || vAnt === null) estado(); });

  /* ---------- o configurador por cima da home (86-paginas.js): o cabeçalho continua por cima;
     tocar num link dele fecha a camada e segue para onde aponta ---------- */
  topo.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    const f = document.querySelector('.camada-3d .camada-fecha');
    if (f && document.documentElement.classList.contains('com-camada')) f.click();
  }, true);
})();
