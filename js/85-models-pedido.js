(() => {
  /* ---------- chegar ao pedido vindo de /models/ ----------
     1. ?modelo=Pantiera 32: marca essa opção no formulário, se ele a tiver (o evento change deixa o formulário e a placa coerentes);
     2. a configuração escolhida no 3D viaja em sessionStorage («pt-config») e entra na mensagem do pedido, se estiver vazia. */
  let pedido = null, config = null;
  try { pedido = new URLSearchParams(location.search).get('modelo'); } catch (e) { /* nada */ }
  try { config = sessionStorage.getItem('pt-config'); } catch (e) { /* nada */ }
  if (pedido) {
    const caixas = [...document.querySelectorAll('input[name=modelo]')];
    const alvos = caixas.filter((c) => c.value === pedido || c.value.startsWith(pedido + ' '));
    alvos.forEach((c) => { if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); } });
    // o endereço fica limpo: só a âncora, que o rodapé repõe quando a página se solta
    if (caixas.length) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* nada */ } }
  }
  if (config && !document.querySelector('[data-mp-3d]')) {
    const msg = document.querySelector('form[data-form] textarea[name=msg], form textarea[name=msg], form textarea[name=mensaje]');
    if (msg && !msg.value.trim()) { msg.value = config; msg.dispatchEvent(new Event('input', { bubbles: true })); msg.dispatchEvent(new Event('change', { bubbles: true })); }
  }
})();
