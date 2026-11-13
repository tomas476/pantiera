(() => {
  /* ---------- chegar à página inicial com #âncora, vindo do rodapé de /models/ ou de outra página ----------
     o núcleo limpa o endereço e começa no topo para a abertura do logótipo; quando o logótipo pousa e a página
     se solta, vai-se de uma vez à secção pedida e o endereço volta a mostrar a âncora */
  if (!window.DA || !DA.abertura) return;
  let h = location.hash;
  if (!h) { try { const nav = performance.getEntriesByType('navigation')[0]; if (nav && nav.type !== 'reload') h = new URL(nav.name).hash; } catch (e) {} }
  if (!h || h.length < 2) return;
  let alvo = null; try { alvo = document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) {}
  if (!alvo || alvo.id === 'conteudo') return;
  const html = document.documentElement;
  const vai = () => {
    const topo = document.querySelector('.topo')?.getBoundingClientRect().height || 0;
    const pad = parseFloat(getComputedStyle(alvo).paddingTop) || 0;
    const y = Math.max(0, alvo.getBoundingClientRect().top + scrollY - (pad >= topo ? 0 : topo));
    const antes = html.style.scrollBehavior; html.style.scrollBehavior = 'auto'; scrollTo(0, y); html.style.scrollBehavior = antes;
    return y;
  };
  // a página só se mexe depois de a abertura soltar o scroll; um gesto da pessoa a seguir ganha sempre
  let mexeu = false; const mexe = () => { mexeu = true; };
  const solto = () => new Promise((r) => { const t0 = performance.now(); const f = () => (html.style.overflow !== 'hidden' || performance.now() - t0 > 5000 ? r() : requestAnimationFrame(f)); f(); });
  DA.abertura.then(solto).then(() => {
    const y = vai();
    ['wheel', 'touchstart', 'keydown'].forEach((t) => addEventListener(t, mexe, { once: true, passive: true }));
    history.replaceState(null, '', location.pathname + location.search + h);
    // imagens tardias acima da secção podem empurrá-la: um acerto, só se a pessoa ainda não se mexeu
    setTimeout(() => { if (!mexeu && Math.abs(scrollY - y) < 4) vai(); }, 700);
  });
})();
(() => {
  const { $, reduz } = DA;
  /* «Reducir movimiento»: guarda a escolha e recarrega, para todas as secções lerem a preferência desde o início
     (quem a aplica é o script em linha do 90-fim.html, antes dos módulos) */
  const CH = 'pt-mov', bt = $('[data-mov]');
  if (bt) {
    const meu = document.documentElement.classList.contains('sem-mov');
    const doSistema = !meu && reduz;
    bt.setAttribute('aria-checked', String(meu || doSistema));
    // quando é o sistema a pedir menos movimento, o interruptor mostra-o e não o contraria
    if (doSistema) { bt.disabled = true; bt.title = 'Activado en los ajustes de tu dispositivo'; }
    bt.addEventListener('click', () => {
      const novo = bt.getAttribute('aria-checked') !== 'true';
      try { if (novo) localStorage.setItem(CH, 'reduz'); else localStorage.removeItem(CH); } catch (e) { return; }
      bt.setAttribute('aria-checked', String(novo));
      location.reload();
    });
  }
})();
