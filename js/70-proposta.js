(() => {
  const { $, $$, reduz, clamp } = DA;
  /* ---------- «Agenda tu visita»: três boias, a placa do estaleiro e o pedido pronto (email ou WhatsApp) ---------- */
  const sec = $('#proposta'); if (!sec) return;
  const form = $('[data-form]', sec), passos = $$('[data-passo]', form);
  const bVoltar = $('[data-voltar]', form), bSeguir = $('[data-seguir]', form);
  const obrigado = $('[data-obrigado]', sec), placa = $('[data-placa]', sec), bPlaca = $('[data-placa-abre]', placa);
  const caixaDealer = $('[data-dealer-p]', sec), ind = $('#pq-ind', sec);
  const VENDAS = 'sales@pantiera.com', WA = '34634901017', WA_VISTO = '+34 634 901 017';
  // quem responde em cada zona (dealer oficial ou o astillero): vem do gerador, num JSON junto do formulário
  let ZONAS = {}; try { ZONAS = JSON.parse($('[data-zonas]', sec).textContent); } catch (e) { /* sem zonas: responde o astillero */ }
  const HQ = Object.values(ZONAS).find((d) => d.hq) || { nome: 'Pantiera Yachts', empresa: 'Astillero', local: 'C/ Segadores, 6, Pol. Ind. San Fernando, 03350 Cox (Alicante)', tel: WA_VISTO, email: VENDAS, hq: true };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ms = (v) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v)) || 700;

  let passo = 1, max = 1, tentou = {}, dealer = null;

  /* ---------- a origem: cada CTA do site traz data-cta; guarda-se na sessão (o telemóvel muda de página até /quote/) e segue no pedido ---------- */
  const CH = 'pt-cta', campoOrigem = $('[data-origen]', form);
  const pagina = () => (document.body.classList.contains('pg-quote') ? '/quote/' : location.pathname);
  let origem = '';
  try { origem = new URLSearchParams(DA.buscaInicial || location.search).get('cta') || sessionStorage.getItem(CH) || ''; } catch (e) { /* sem sessão */ }
  const fixaOrigem = (o) => { origem = o || origem; if (campoOrigem) campoOrigem.value = origem || 'directo'; if (o) { try { sessionStorage.setItem(CH, o); } catch (e) { /* nada */ } } };
  fixaOrigem(origem);
  // as ligações directas de WhatsApp do site levam a origem no próprio texto
  const comOrigem = (a) => {
    try { const u = new URL(a.href); const t = u.searchParams.get('text'); if (t && !/\(web: /.test(t)) { u.searchParams.set('text', `${t} (web: ${a.dataset.cta})`); a.href = u.toString().replace(/\+/g, '%20'); } } catch (e) { /* fica como está */ }
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('[data-cta]'); if (!a) return;
    const h = a.getAttribute('href') || '';
    // só os CTA que levam ao pedido mudam a origem; telefone e email seguem directos
    if (/wa\.me/.test(h)) comOrigem(a); else if (/#proposta|quote\//.test(h)) fixaOrigem(a.dataset.cta);
  }, true);

  /* ---------- mailto e tel não são saídas: o núcleo volta ao topo no beforeunload (corre antes deste), aqui repõe-se o lugar ---------- */
  let saida = -1e9, ySaida = 0;
  const marcaSaida = (y = scrollY) => { saida = performance.now(); ySaida = y; };
  const repoe = () => {
    const h = document.documentElement, antes = h.style.scrollBehavior;
    h.style.scrollBehavior = 'auto'; scrollTo(0, ySaida); h.style.scrollBehavior = antes;
  };
  document.addEventListener('click', (e) => { if (e.target.closest?.('a[href^="mailto:"],a[href^="tel:"]')) marcaSaida(); }, true);
  addEventListener('beforeunload', () => { if (performance.now() - saida < 1500) { repoe(); setTimeout(repoe, 60); } });

  // rolar até um elemento sem o deixar debaixo do cabeçalho fixo
  const hTopo = () => ($('.topo')?.getBoundingClientRect().bottom || 96);
  const rolaPara = (el, folga = 24, sempre = false) => {
    const r = el.getBoundingClientRect(), topo = hTopo();
    if (sempre || r.top < topo + 8 || r.top > innerHeight * 0.6) { const y = Math.max(0, scrollY + r.top - topo - folga); scrollTo({ top: y, behavior: reduz ? 'auto' : 'smooth' }); return y; }
    return scrollY;
  };

  const val = (n) => { const e = form.elements[n]; return e ? String(e.value || '').trim() : ''; };
  const marcados = (n) => $$(`[name="${n}"]:checked`, form).map((i) => i.value);

  /* ---------- a rota: o caminho desenha-se ao tamanho real, as boias pousam nele ---------- */
  const rota = $('[data-percurso]', sec), svg = $('.percurso-mar', rota), pFundo = $('.percurso-fundo', rota), pFeita = $('[data-percurso-feita]', rota);
  // o Pantiera 32 visto de cima anda ao longo da linha com o scroll da secção; a linha cheia marca o passo do formulário
  const barco = $('[data-percurso-barco]', rota), boias = $$('[data-boia]', rota);
  const MOLDE = pFundo.getAttribute('d');
  let L = 1, sB = [0, 0, 0, 0], sAgora = null, anim = null;
  // curva única do site, cubic-bezier(.16,1,.3,1), resolvida em JS para a linha que se enche
  const bez = (x1, y1, x2, y2) => {
    const c = (a, b) => [3 * a, 3 * (b - a) - 3 * a, 1 - 3 * a - 3 * (b - a) + 3 * a];
    const [cx, bx, ax] = c(x1, x2), [cy, by, ay] = c(y1, y2);
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
    return (x) => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; } return Y(t); };
  };
  const curva = bez(.16, 1, .3, 1);
  const pousa = (s) => {
    sAgora = s;
    pFeita.style.strokeDasharray = `${s.toFixed(1)} ${L + 10}`;
  };

  /* ---------- o barco da rota: ligado ao scroll, só transform, proa na tangente da curva ----------
     a curva amostra-se uma vez por desenho (getPointAtLength nunca corre no laço do scroll);
     de 0, quando o topo da secção chega a três quartos do ecrã, ao último passo, quando o meio da secção passa pelo meio do ecrã */
  const N = 240; let amostra = [], escrito = '';
  const amostrar = () => {
    amostra = [];
    for (let i = 0; i <= N; i++) {
      const s = L * i / N, a = pFundo.getPointAtLength(s), b = pFundo.getPointAtLength(clamp(s - 3, 0, L)), c = pFundo.getPointAtLength(clamp(s + 3, 0, L));
      amostra.push([a.x, a.y, Math.atan2(c.y - b.y, c.x - b.x) * 180 / Math.PI]);
    }
    escrito = '';
  };
  const poeBarco = (s) => {
    if (!amostra.length) return;
    const f = clamp(s / L) * N, i = Math.floor(f), j = Math.min(N, i + 1), t = f - i, A = amostra[i], B = amostra[j];
    const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, ang = A[2] + (B[2] - A[2]) * t;
    const v = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) rotate(${ang.toFixed(2)}deg)`;
    if (v !== escrito) { escrito = v; barco.style.transform = v; }
  };
  const fimBarco = () => sB[form.hidden ? 3 : 2];
  DA.aCada((t, { y, h }) => {
    if (reduz) { poeBarco(sB[(form.hidden ? 4 : passo) - 1]); return; } // sem movimento: o barco espera no passo em que a pessoa está
    const c = DA.caixa(sec); if (!c.height) return;
    // em scroll da página: começa quando o topo da secção chega a três quartos do ecrã e acaba quando o meio da secção
    // passa pelo meio do ecrã; os dois limites cabem no scroll que a página tem (em /quote/ a secção abre a página)
    const maxY = Math.max(0, DA.caixa(document.documentElement).height - h);
    const ini = clamp(c.top - h * 0.75, 0, maxY), fim = clamp(c.top + c.height * 0.5 - h * 0.5, 0, maxY);
    const k = fim - ini < 40 ? 1 : clamp((y - ini) / (fim - ini));
    const s0 = Math.min(30, fimBarco()); // começa meio barco para dentro: a popa nunca sai da linha
    poeBarco(s0 + k * (fimBarco() - s0));
  });
  const desenha = () => {
    const W = rota.clientWidth, H = 64; // a altura do mar é fixa no CSS (.percurso-mar)
    if (!W) return;
    let k = 0;
    const d = MOLDE.replace(/-?\d+(\.\d+)?/g, (n) => (+n * (k++ % 2 ? H / 100 : W / 1000)).toFixed(1));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    pFundo.setAttribute('d', d); pFeita.setAttribute('d', d);
    L = pFundo.getTotalLength();
    // no telemóvel as boias juntam-se à esquerda para o porto ter o seu lugar, longe da última boia
    const estreito = W < 520, XB = estreito ? [60, 430, 760, 975] : [60, 500, 880, 990];
    sB = XB.map((x, i) => {
      // as pontas afastam-se da margem para o barco caber inteiro
      const alvo = clamp(x * W / 1000, 34, W - (estreito ? 14 : 30)); let lo = 0, hi = L;
      for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (pFundo.getPointAtLength(m).x < alvo) lo = m; else hi = m; }
      return lo;
    });
    boias.forEach((b, i) => { const p = pFundo.getPointAtLength(sB[i]); b.style.setProperty('--bx', p.x + 'px'); b.style.setProperty('--by', p.y + 'px'); });
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    pousa(sB[(form.hidden ? 4 : passo) - 1]);
    amostrar(); DA.remede();
  };
  const navega = (n) => {
    const alvo = sB[n - 1];
    if (sAgora === null || reduz) return pousa(alvo);
    if (anim) cancelAnimationFrame(anim);
    const de = sAgora, t0 = performance.now(), dur = ms('--duration-cena');
    const passoA = (t) => { const k = clamp((t - t0) / dur); pousa(de + (alvo - de) * curva(k)); anim = k < 1 ? requestAnimationFrame(passoA) : null; };
    anim = requestAnimationFrame(passoA);
  };
  if ('ResizeObserver' in window) new ResizeObserver(desenha).observe(rota); else addEventListener('resize', desenha);
  desenha(); addEventListener("load", desenha);

  /* ---------- a placa do estaleiro ---------- */
  // local: a segunda parte do texto, que a placa compacta do telemóvel esconde (o nome do dealer chega)
  const grava = (k, texto, vazio, local = '') => {
    const dd = $(`[data-p="${k}"]`, placa); if (!dd) return;
    const novo = texto || vazio || 'Elegir';
    if (dd.textContent === novo + local) return;
    dd.innerHTML = esc(novo) + (local ? `<span class="placa-local">${esc(local)}</span>` : ''); dd.classList.toggle('vazio', !texto);
    dd.classList.remove('muda'); void dd.offsetWidth; dd.classList.add('muda');
  };
  const curtos = (n) => $$(`[name="${n}"]:checked`, form).map((i) => i.dataset.curto || i.value);
  const actualizaPlaca = () => {
    grava('quero', curtos('quero').join(', '));
    grava('zona', val('zona'));
    grava('motor', val('motor'));
    grava('dealer', val('zona') && dealer ? dealer.nome : '', 'Según tu zona', val('zona') && dealer && !dealer.hq ? `, ${dealer.empresa}` : (dealer && dealer.hq && val('zona') ? ', astillero' : ''));
  };

  /* ---------- passo 1: o cais ---------- */
  const bercos = $$('.berco', form);
  const marcaBercos = () => bercos.forEach((b) => b.classList.toggle('on', $('input', b).checked));
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'quero') marcaBercos();
    if (t.name === 'zona') pintaDealer(true);
    if (t.name === 'via' && tentou[3]) valida(3, false);
    actualizaPlaca();
    if (tentou[passo]) valida(passo, false);
  });
  form.addEventListener('input', () => { if (tentou[passo]) valida(passo, false); });

  /* ---------- passo 2: a zona mostra quem responde ---------- */
  const contactos = (d, tag = 'p') => `<${tag} class="dealer-c">${d.tel ? `<a href="tel:${esc(d.tel.replace(/[^+\d]/g, ''))}">${esc(d.tel)}</a>` : ''}${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}</${tag}>`;
  const cartao = (d, rotulo) => `<div class="dealer-escolhido"><p class="dealer-r">${rotulo}</p><p class="dealer-n">${esc(d.hq ? d.nome : `${d.nome} · ${d.empresa}`)}</p><p class="dealer-l">${esc(d.local)}</p>${contactos(d)}</div>`;
  function pintaDealer(nova) {
    const z = val('zona');
    if (!z) { caixaDealer.hidden = true; caixaDealer.innerHTML = ''; dealer = null; return; }
    dealer = ZONAS[z] || HQ;
    caixaDealer.innerHTML = cartao(dealer, dealer.hq ? 'Te contesta el astillero' : 'Tu dealer oficial');
    if (caixaDealer.hidden || nova) { caixaDealer.hidden = false; caixaDealer.classList.remove('entra'); void caixaDealer.offsetWidth; caixaDealer.classList.add('entra'); }
  }

  /* ---------- validação, com mensagens junto do campo ---------- */
  const aviso = (k, msg, el) => {
    const a = $(`[data-aviso="${k}"]`, form); if (a) a.textContent = msg || '';
    if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return msg ? (el || a) : null;
  };
  function valida(n, focar = true) {
    const erros = [];
    if (n === 1 && !marcados('quero').length) {
      aviso('quero', 'Elige al menos una opción para seguir.', null);
      if (focar) { $('[name=quero]', form).focus({ preventScroll: true }); tituloVisivel(); }
      return false;
    }
    if (n === 1) aviso('quero', '', null);
    if (n === 2) erros.push(aviso('zona', val('zona') ? '' : 'Elige tu zona para saber quién te contesta.', null) && $('[name=zona]', form));
    if (n === 3) {
      const nome = val('nome'), email = val('email'), tel = val('tel').replace(/\D/g, ''), via = val('via');
      erros.push(aviso('nome', nome ? '' : 'Dinos tu nombre.', form.elements.nome));
      erros.push(aviso('email', !email ? 'Necesitamos un email para contestarte.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Ese email parece incompleto.', form.elements.email));
      const precisa = via === 'Teléfono' || via === 'WhatsApp';
      erros.push(aviso('tel', precisa && tel.length < 6 ? (via === 'WhatsApp' ? 'Añade tu número para escribirte por WhatsApp.' : 'Añade tu número para llamarte.') : (tel && tel.length < 6 ? 'Ese número parece corto.' : ''), form.elements.tel));
      erros.push(aviso('ok', form.elements.ok.checked ? '' : 'Marca esta casilla para que podamos contestarte.', form.elements.ok));
    }
    const primeiro = erros.find(Boolean);
    // o campo inteiro, com a mensagem por baixo, fica acima das acções presas ao fundo
    if (primeiro && focar) { primeiro.focus(); (primeiro.closest('.campo, .consentir, .grupo') || primeiro).scrollIntoView({ block: 'nearest' }); }
    return !primeiro;
  }

  /* ---------- entre passos ---------- */
  // no computador o título da secção fica logo abaixo do cabeçalho; no telemóvel não se volta ao título:
  // a rota encosta ao cabeçalho, a placa compacta logo abaixo, e o passo com o seu primeiro campo antes das acções
  const tituloSec = $('#proposta-t', sec);
  const estreito = matchMedia('(max-width: 900px)');
  const slot = $('[data-placa-slot]', sec);
  const tituloVisivel = () => (estreito.matches ? rolaPara(rota, 8, true) : rolaPara(tituloSec, 16));
  const fechaPlaca = () => { placa.classList.remove('aberta'); bPlaca?.setAttribute('aria-expanded', 'false'); const t = bPlaca?.querySelector('span'); if (t) t.textContent = 'Ver todo'; };
  function irPara(n, rolar = true) {
    const dir = n >= passo ? 'entra-d' : 'entra-e';
    passo = n; max = Math.max(max, n); sec.dataset.agora = n;
    passos.forEach((p) => {
      const este = +p.dataset.passo === n;
      p.hidden = !este; p.classList.remove('entra-d', 'entra-e');
      if (este && !reduz) { void p.offsetWidth; p.classList.add(dir); }
    });
    bVoltar.hidden = n === 1;
    bSeguir.textContent = n === 3 ? 'Enviar solicitud' : 'Continuar';
    $$('[data-ir]', rota).forEach((b) => {
      const k = +b.dataset.ir;
      b.disabled = k > max; b.closest('li').classList.toggle('feito', k < n || (k < max && k !== n));
      if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    navega(n);
    fechaPlaca();
    if (rolar) { tituloVisivel(); $(`[data-passo="${n}"] h3`, form).focus({ preventScroll: true }); }
  }
  bVoltar.addEventListener('click', () => irPara(Math.max(1, passo - 1)));
  rota.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]'); if (!b || b.disabled || form.hidden) return;
    const n = +b.dataset.ir; if (n === passo) return;
    if (n > passo) { tentou[passo] = true; if (!valida(passo)) return; }
    irPara(n);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    tentou[passo] = true;
    if (!valida(passo)) return;
    if (passo < 3) irPara(passo + 1); else envia();
  });

  /* ---------- o envio: o mecanismo de sempre (o pedido abre pronto na aplicação da pessoa), por email para o astillero com cópia para o dealer, ou por WhatsApp ---------- */
  let textoPedido = '';
  // telemóvel: a placa selada e o obrigado juntos quando cabem; senão a placa sai por cima e o obrigado abre o ecrã, com as três acções à vista
  const rolaFim = () => {
    const topo = hTopo(), sl = slot.getBoundingClientRect(), fim = $('.obrigado-acoes', obrigado).getBoundingClientRect();
    const y = fim.bottom - sl.top + topo + 8 <= innerHeight - 16 ? scrollY + sl.top - topo - 8 : scrollY + sl.bottom;
    scrollTo({ top: Math.max(0, y), behavior: reduz ? 'auto' : 'smooth' }); return y;
  };
  function envia() {
    const quero = marcados('quero'), zona = val('zona'), nome = val('nome'), via = val('via');
    const tel = val('tel') ? `${val('ind')} ${val('tel')}`.trim() : '';
    const d = dealer || HQ;
    const cc = d.email && d.email !== VENDAS ? d.email : '';
    fixaOrigem();
    const linhas = [
      'Solicitud de visita · Pantiera 32',
      '',
      `Quiero: ${quero.join(', ')}`,
      `Zona: ${zona}`,
      `Motorización: ${val('motor') || 'Sin indicar'}`,
      `Contacto asignado: ${d.hq ? 'Astillero, Cox (Alicante)' : `${d.nome}, ${d.empresa}`}`,
      '',
      `Nombre: ${nome}`,
      `Email: ${val('email')}`,
      `Teléfono: ${tel || 'Sin indicar'}`,
      `Responder por: ${via}`,
    ];
    if (val('msg')) linhas.push('', val('msg'));
    linhas.push('', `Origen: ${campoOrigem ? campoOrigem.value : (origem || 'directo')} (${pagina()})`);
    textoPedido = linhas.join('\n');
    const assunto = `Agenda tu visita · Pantiera 32 · ${zona}`;
    const href = `mailto:${VENDAS}?${cc ? `cc=${encodeURIComponent(cc)}&` : ''}subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(textoPedido)}`;
    const wa = `https://wa.me/${WA}?text=${encodeURIComponent(textoPedido)}`;
    const porWa = via === 'WhatsApp';
    const bMail = $('[data-reabrir]', obrigado), bWa = $('[data-reabrir-wa]', obrigado);
    bMail.href = href; bWa.href = wa;
    // o botão cheio é o do canal escolhido; o outro fica como alternativa
    bMail.textContent = porWa ? 'Enviar por email' : 'Abrir el email otra vez';
    bWa.textContent = porWa ? 'Abrir WhatsApp otra vez' : 'Enviar por WhatsApp';
    bMail.className = `botao ${porWa ? 'botao-volta' : 'botao-segue'}`; bWa.className = `botao ${porWa ? 'botao-segue' : 'botao-volta'}`;
    bMail.style.order = porWa ? 1 : 0; bWa.style.order = porWa ? 0 : 1;
    $('[data-obrigado-t]', obrigado).textContent = `Gracias, ${nome.split(/\s+/)[0]}.`;
    $('[data-obrigado-p]', obrigado).textContent = porWa
      ? `Se ha abierto WhatsApp con tu solicitud lista para enviar al ${WA_VISTO}. Pulsa enviar y ya está en camino.`
      : `Se ha abierto tu correo con la solicitud lista para enviar a ${VENDAS}${cc ? `, con copia a ${d.nome}` : ''}. Pulsa enviar y ya está en camino.`;
    $('[data-copiado]', obrigado).textContent = '';
    grava('data', `Solicitada el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`);
    placa.classList.add('selada');
    form.hidden = true; obrigado.hidden = false; sec.dataset.agora = 'fim';
    $$('[data-ir]', rota).forEach((b) => { b.disabled = true; b.removeAttribute('aria-current'); b.closest('li').classList.add('feito'); });
    navega(4);
    fechaPlaca();
    const yFim = estreito.matches ? rolaFim() : tituloVisivel(); $('[data-obrigado-t]', obrigado).focus({ preventScroll: true });
    if (porWa) { const j = window.open(wa, '_blank', 'noopener'); if (j) j.opener = null; }
    else { marcaSaida(yFim); location.href = href; }
  }
  $('[data-copiar]', obrigado).addEventListener('click', () => {
    const ok = () => { $('[data-copiado]', obrigado).textContent = `Copiada. Pégala en un email a ${VENDAS} o en un WhatsApp al ${WA_VISTO}.`; };
    const plano = () => { const t = document.createElement('textarea'); t.value = textoPedido; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) {} t.remove(); };
    if (navigator.clipboard) navigator.clipboard.writeText(textoPedido).then(ok, plano); else plano();
  });
  function recomeca() {
    form.reset(); tentou = {}; dealer = null; max = 1;
    fixaOrigem(); // o reset limpa o campo escondido: a origem volta a ele
    $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid')); $$('[data-aviso]', form).forEach((a) => { a.textContent = ''; });
    pintaDealer(true); marcaBercos();
    $('[data-p="data"]', placa).textContent = ''; placa.classList.remove('selada');
    obrigado.hidden = true; form.hidden = false;
    actualizaPlaca(); irPara(1);
  }
  $('[data-novo]', obrigado).addEventListener('click', recomeca);

  /* ---------- pré-escolha: qualquer ligação com data-quero (palma, astillero, dealer, dossier) ou data-pedido-zona (mallorca, ibiza, barcelona, alicante, otra), nesta página ou vinda de outra ---------- */
  const CHQ = 'pt-quero';
  const preEscolhe = (q, z) => {
    let mudou = false;
    if (q) $$('[name=quero]', form).forEach((c) => { const on = q.split(',').includes(c.dataset.queroId); if (on && !c.checked) { c.checked = true; mudou = true; } });
    if (z) { const r = $(`[name=zona][data-zona="${z}"]`, form); if (r && !r.checked) { r.checked = true; mudou = true; pintaDealer(true); } }
    if (mudou) { marcaBercos(); actualizaPlaca(); if (tentou[1]) valida(1, false); }
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('[data-quero],[data-pedido-zona]'); if (!a || sec.contains(a)) return;
    const q = a.dataset.quero || '', z = a.dataset.pedidoZona || '';
    try { sessionStorage.setItem(CHQ, JSON.stringify([q, z])); } catch (err) { /* nada */ }
    if (form.hidden) recomeca();
    preEscolhe(q, z);
    if (passo !== 1) irPara(1, false);
  }, true);
  try {
    const ps = new URLSearchParams(DA.buscaInicial || location.search), g = JSON.parse(sessionStorage.getItem(CHQ) || '[]');
    sessionStorage.removeItem(CHQ);
    preEscolhe(ps.get('quero') || g[0] || '', ps.get('zona') || g[1] || '');
  } catch (e) { /* nada */ }

  /* ---------- no telemóvel a placa sobe para junto da rota, compacta, e abre ao toque ---------- */
  const ancora = $('.ancora', sec);
  const arruma = () => { if (estreito.matches) { if (placa.parentNode !== slot) slot.append(placa); } else if (placa.parentNode !== ancora) ancora.append(placa); };
  estreito.addEventListener ? estreito.addEventListener('change', arruma) : estreito.addListener(arruma);
  arruma();
  bPlaca.addEventListener('click', () => {
    const abre = bPlaca.getAttribute('aria-expanded') !== 'true';
    bPlaca.setAttribute('aria-expanded', String(abre)); placa.classList.toggle('aberta', abre);
    bPlaca.querySelector('span').textContent = abre ? 'Menos' : 'Ver todo';
  });

  /* ---------- a barra de contacto recolhe-se enquanto o pedido está à vista: nunca tapa um campo nem um botão ---------- */
  // a secção inteira (formulário e a fotografia do stand) e, no telemóvel, também o rodapé, que já tem telefone, email e voltar ao topo
  const barra = $('[data-barra]'), rodape = $('[data-rodape]');
  if (barra) {
    const vis = new Map();
    const aplica = () => {
      const esconde = vis.get(sec) || (estreito.matches && vis.get(rodape));
      barra.classList.toggle('recolhe', !!esconde); barra.inert = !!esconde;
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => vis.set(e.target, e.isIntersecting)); aplica(); }, { threshold: 0 });
    io.observe(sec); if (rodape) io.observe(rodape);
    estreito.addEventListener ? estreito.addEventListener('change', aplica) : estreito.addListener(aplica);
  }

  sec.dataset.agora = 1;
  actualizaPlaca();
})();
