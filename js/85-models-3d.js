(() => {
  /* ---------- «Configura tu Pantiera 32»: visor 3D próprio (three r160 local) sobre o modelo do CAD do configurador oficial ----------
     As opções, os nomes, as cores, os packs, os extras e os movimentos das peças vêm do configurador oficial
     (config.pantiera.com/pantiera-32/), passados para #mp-dados por gerar/models.mjs. */
  const sec = document.querySelector('[data-mp-3d]'); if (!sec || !window.DA) return;
  const { $, $$, reduz } = DA;
  const SRC = document.currentScript ? document.currentScript.src : '';
  const BASE = new URL('../', SRC || location.href); // js/ vive na raiz do site
  const dados = JSON.parse($('#mp-dados').textContent);
  const visorEl = $('[data-mp-visor]', sec), semVisorEl = $('[data-mp-oficial]', sec);
  const url = (p) => new URL(p, BASE).href;
  const P = dados.padrao;
  // a configuração: o pack, um acabamento por grupo, os extras escolhidos à mão e a posição de cada peça móvel
  const cfg = { pack: P.pack, fin: {}, extras: [], estados: {} };
  for (const g of Object.keys(dados.looks)) cfg.fin[g] = P[g];
  for (const e of dados.estados) cfg.estados[e.id] = e.padrao;
  // a escolha pode chegar pelo endereço (?casco=&motor=&teca=&pack=&vista=), vinda do convite da página inicial; valores desconhecidos ignoram-se
  const pedidoUrl = new URLSearchParams(location.search);
  [['casco', 'hull'], ['motor', 'motor'], ['teca', 'teak']].forEach(([k, g]) => { const v = pedidoUrl.get(k); if (v && dados.looks[g] && dados.looks[g][v]) cfg.fin[g] = v; });
  if (dados.packs.some((p) => p.id === pedidoUrl.get('pack'))) cfg.pack = pedidoUrl.get('pack');
  const vistaUrl = pedidoUrl.get('vista');
  let perto = false, visivel = false, gesto = false, visor = null, aCarregar = null;

  /* ---------- regras do configurador oficial: packs, extras incluídos, escondidos, exclusões e requisitos ---------- */
  const packDe = () => dados.packs.find((p) => p.id === cfg.pack) || dados.packs[0];
  const extra = (id) => dados.extras.find((e) => e.id === id);
  const incluido = (id) => packDe().inclui.includes(id);
  const escondido = (id) => (packDe().esconde || []).includes(id);
  const tem = (id) => incluido(id) || cfg.extras.includes(id);
  const satisfeito = (e) => !e.requer || e.requer.some(tem);
  const exclusoes = (id) => new Set([...(extra(id).exclui || []), ...dados.extras.filter((e) => (e.exclui || []).includes(id)).map((e) => e.id)]);
  // tirar um extra tira os que dependiam dele
  function cascata() {
    const fora = [];
    for (let mudou = true; mudou;) {
      mudou = false;
      for (const id of [...cfg.extras]) if (!satisfeito(extra(id))) { cfg.extras = cfg.extras.filter((x) => x !== id); fora.push(extra(id).nome); mudou = true; }
    }
    return fora;
  }
  function liga(id) {
    const e = extra(id), novos = [id], avisos = [];
    if (!satisfeito(e)) { novos.unshift(e.requer[0]); avisos.push(`Se añade también: ${extra(e.requer[0]).nome}.`); }
    const tira = new Set(); novos.forEach((n) => exclusoes(n).forEach((x) => tira.add(x)));
    const fora = cfg.extras.filter((x) => tira.has(x));
    cfg.extras = cfg.extras.filter((x) => !tira.has(x));
    for (const n of novos) if (!tem(n)) cfg.extras.push(n);
    const dep = cascata();
    if (fora.length || dep.length) avisos.push(`Retirado: ${[...fora.map((x) => extra(x).nome), ...dep].join(', ')}.`);
    return avisos.join(' ');
  }
  function desliga(id) { cfg.extras = cfg.extras.filter((x) => x !== id); const dep = cascata(); return dep.length ? `Retirado: ${dep.join(', ')}.` : ''; }
  function mudaPack(id) { cfg.pack = id; cfg.extras = cfg.extras.filter((x) => !incluido(x) && !escondido(x)); cascata(); }

  /* ---------- painel: separadores e opções ---------- */
  const abas = $$('[data-mp-aba]', sec);
  const abre = (aba, foco) => {
    abas.forEach((a) => { const on = a === aba; a.classList.toggle('activo', on); a.setAttribute('aria-selected', on); a.tabIndex = on ? 0 : -1; });
    $$('[data-mp-painel]', sec).forEach((p) => p.classList.toggle('activo', p.dataset.mpPainel === aba.dataset.mpAba));
    // com os separadores presos e a lista já corrida, o grupo novo começa logo por baixo deles
    const ctlEl = $('[data-mp-controlos]', sec), abasEl = aba.parentElement;
    if (ctlEl && abasEl) { const dy = ctlEl.getBoundingClientRect().top - abasEl.getBoundingClientRect().top; if (dy < -1) scrollBy({ top: dy, behavior: 'instant' }); }
    if (foco) aba.focus();
  };
  abas.forEach((a, i) => {
    a.addEventListener('click', () => abre(a));
    a.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); abre(abas[(i + d + abas.length) % abas.length], true); } });
  });
  abre(abas[0]);

  const amostras = $$('.mp-amostra[data-grupo]', sec), pilEstado = $$('[data-estado]', sec), linhasExtra = $$('[data-mp-extra]', sec);
  // o resumo e o pedido vivem no fecho da página, depois do configurador: um só «Agenda tu visita»
  const resumoEl = $('[data-mp-resumo]'), cta = $('[data-mp-c-cta]'), avisoEl = $('[data-mp-extra-aviso]', sec), nExtras = $('[data-mp-n-extras]', sec);
  const valorDe = (g) => (g === 'pack' ? cfg.pack : cfg.fin[g]);
  const nomeDe = (g) => (g === 'pack' ? packDe().nome : dados.looks[g][cfg.fin[g]].nome);
  const comRal = (g) => { const b = amostras.find((x) => x.dataset.grupo === g && x.dataset.valor === valorDe(g)); return nomeDe(g) + (b && b.dataset.nota ? ` (${b.dataset.nota})` : ''); };
  const escolhidos = () => dados.extras.filter((e) => cfg.extras.includes(e.id)).map((e) => e.nome);
  // o resumo que segue para o pedido, com os nomes do configurador oficial
  function resumo(longo) {
    const fin = ['motor', 'hull', 'teak', 'teakLine', 'upholstery', 'interior', 'joinery'];
    if (!longo) return [`Pack ${packDe().nome}`, nomeDe('motor'), nomeDe('hull'), `Teca ${nomeDe('teak').toLowerCase()}`, nomeDe('upholstery'), `${cfg.extras.length} ${cfg.extras.length === 1 ? 'extra' : 'extras'}`].join(' · ');
    const ex = escolhidos();
    return [`Pack ${packDe().nome}`, ...fin.map((g) => `${dados.rotulos[g]}: ${comRal(g)}`), `Opciones extra: ${ex.length ? ex.join(', ') : 'ninguna'}`].join('; ');
  }
  function pinta() {
    for (const b of amostras) { const on = b.dataset.valor === valorDe(b.dataset.grupo); b.classList.toggle('activo', on); b.setAttribute('aria-pressed', on); }
    for (const g of [...new Set(amostras.map((b) => b.dataset.grupo))]) { const n = $(`[data-mp-nome="${g}"]`, sec); if (n) n.textContent = comRal(g); }
    $$('[data-mp-pack-inc]', sec).forEach((d) => { d.hidden = d.dataset.mpPackInc !== cfg.pack; });
    for (const b of pilEstado) { const on = cfg.estados[b.dataset.estado] === b.dataset.valor; b.classList.toggle('activo', on); b.setAttribute('aria-pressed', on); }
    for (const l of linhasExtra) {
      const id = l.dataset.mpExtra, e = extra(id), cx = $('input', l), nota = $('[data-mp-extra-nota]', l);
      l.hidden = escondido(id);
      cx.checked = tem(id); cx.disabled = incluido(id);
      l.classList.toggle('incluido', incluido(id));
      nota.textContent = incluido(id) ? `Incluido en el pack ${packDe().nome}` : (!satisfeito(e) && e.requerNota && !e.nota ? e.requerNota : '');
    }
    const n = dados.extras.filter((e) => tem(e.id)).length;
    if (nExtras) nExtras.textContent = n ? `${n} ${n === 1 ? 'seleccionada' : 'seleccionadas'}` : 'Ninguna seleccionada';
    if (resumoEl) resumoEl.textContent = resumo(false);
  }
  /* ---------- a entrada: o configurador abre-se com um toque (ou chegando por #construir); antes disso só a imagem e as famílias ---------- */
  const palcoEl = $('[data-mp-palco]', sec), painelEl = $('[data-mp-painel-w]', sec), configEl = $('[data-mp-config]');
  let aberto = false;
  function abrir(comGesto) {
    if (comGesto) marca();
    if (aberto) return; aberto = true;
    sec.classList.add('aberto');
    painelEl.hidden = false;
    $$('[data-mp-abrir]', sec).forEach((b) => b.setAttribute('aria-expanded', 'true'));
    if (configEl) configEl.hidden = false;
    semBarra(); acorda();
  }
  $$('[data-mp-abrir]', sec).forEach((b) => b.addEventListener('click', () => abrir(true)));
  document.addEventListener('mp:abrir', () => abrir(false));
  const mexe = (vista) => { if (visor) { visor.aplica(); if (vista) visor.vista(vista); } };
  amostras.forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.grupo, v = b.dataset.valor;
    if (g === 'pack') mudaPack(v); else cfg.fin[g] = v;
    if (avisoEl) avisoEl.textContent = '';
    pinta(); mexe(dados.vistas[g]);
  }));
  pilEstado.forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.estado; cfg.estados[id] = b.dataset.valor;
    pinta(); mexe(dados.estados.find((e) => e.id === id).vista);
  }));
  linhasExtra.forEach((l) => $('input', l).addEventListener('change', (ev) => {
    const id = l.dataset.mpExtra, msg = ev.target.checked ? liga(id) : desliga(id);
    if (avisoEl) avisoEl.textContent = msg;
    pinta(); mexe(extra(id).cena ? 'perspective' : null);
  }));
  $$('[data-vista]', sec).forEach((b) => b.addEventListener('click', () => { if (visor) visor.vista(b.dataset.vista); }));
  pinta();
  // a barra fixa de contacto sai com o configurador aberto e à vista (as abas ficam livres)
  let corpoVisto = false;
  function semBarra() { document.body.classList.toggle('mp-sem-barra', aberto && corpoVisto); }
  // o pedido leva a configuração: fica guardada para a página do formulário a pôr na mensagem (85-models-pedido.js)
  if (cta) cta.addEventListener('click', () => { if (!aberto) return; try { sessionStorage.setItem('pt-config', `Configuración ${dados.nome}: ${resumo(true)}.`); } catch (e) { /* sem armazenamento, o pedido segue sem o resumo */ } });

  /* ---------- quando carregar: nada pesado antes do primeiro gesto, e só perto do ecrã ---------- */
  const cargaTxt = $('[data-mp-carga-txt]', sec), cargaPct = $('[data-mp-carga-pct]', sec), cargaBarra = $('[data-mp-carga-barra]', sec);
  const progresso = (k) => { cargaBarra.style.setProperty('--p', k.toFixed(3)); cargaPct.textContent = Math.round(k * 100) + '%'; };
  function acorda() { if (aberto && perto && gesto) montaVisor(); }
  const GESTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  function marca() { if (gesto) return; gesto = true; GESTOS.forEach((t) => removeEventListener(t, marca, true)); acorda(); }
  GESTOS.forEach((t) => addEventListener(t, marca, { capture: true, passive: true }));
  new IntersectionObserver(([e]) => { perto = e.isIntersecting; acorda(); }, { rootMargin: '700px 0px 700px 0px', threshold: 0 }).observe(sec);
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }, { threshold: 0 }).observe(visorEl);
  // com o painel à vista, a barra fixa de contacto sai: o painel já tem o seu pedido
  new IntersectionObserver(([e]) => { corpoVisto = e.isIntersecting; semBarra(); }, { threshold: 0 }).observe($('.mp-c-corpo', sec));

  // abre sozinho: #construir, o configurador sozinho (camada da home) ou uma escolha vinda no endereço
  if (/^#construir$/i.test(window.MP_HASH || '') || pedidoUrl.get('so') === 'construir' || ['casco', 'motor', 'teca', 'pack', 'vista'].some((k) => pedidoUrl.has(k))) abrir(false);
  // na camada por cima da home, o pedido sai da camada
  if (pedidoUrl.get('so') === 'construir' && cta) cta.target = '_top';

  // sem WebGL (ou se o modelo falhar) fica uma imagem oficial no lugar do visor; as opções continuam a seguir para o pedido
  function semVisor(e) {
    if (e) console.error(e);
    const im = $('[data-mp-poster-img]', semVisorEl); if (im && !im.getAttribute('src')) im.src = url(dados.v3d.poster);
    semVisorEl.hidden = false; visor = null;
  }
  function montaVisor() {
    if (aCarregar) return aCarregar;
    cargaTxt.textContent = 'Preparando el modelo 3D'; progresso(0);
    // o three, o ambiente PMREM e o renderer nascem quando o scroll pára: o trabalho pesado nunca cai a meio de um gesto
    aCarregar = import(url('vendor/three-r160.js')).then((T) => DA.quieto(200).then(() => T)).then((T) => criaVisor(T)).then((v) => (visor = v)).catch(semVisor);
    return aCarregar;
  }

  /* O ÚNICO sítio onde o barco nasce. Lê o GLB do CAD (meshopt) e as duas texturas, e devolve o barco já arrumado:
     um material por zona («slot» nos extras do GLB: hull, deck, teak, upholstery, hardware, engine…), as peças móveis
     montadas nos seus pivôs e os grupos de opções («option»: hardtop, fenders, flaps, gates-open…) para ligar e desligar. */
  function carregaModelo(T, cfg3d) {
    const baixa = (u, total) => fetch(u).then((r) => {
      if (!r.ok) throw new Error('GLB ' + r.status);
      if (!r.body || !r.body.getReader) return r.arrayBuffer();
      const tam = +r.headers.get('content-length') || total || 1, ler = r.body.getReader(), partes = []; let n = 0;
      const passo = () => ler.read().then(({ done, value }) => {
        if (done) { const b = new Uint8Array(n); let o = 0; for (const c of partes) { b.set(c, o); o += c.length; } return b.buffer; }
        partes.push(value); n += value.length; progresso(Math.min(0.99, n / tam)); return passo();
      });
      return passo();
    });
    const tex = (u, srgb) => new Promise((ok) => new T.TextureLoader().load(url(u), (t) => { if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; ok(t); }, undefined, () => ok(null)));
    const glb = url(cfg3d.glb), loader = new T.GLTFLoader().setMeshoptDecoder(T.MeshoptDecoder);
    return Promise.all([baixa(glb, cfg3d.bytes), tex(cfg3d.teca, true), tex(cfg3d.piel, false)])
      .then((r) => DA.quieto(200).then(() => new Promise((ok) => DA.ocioso(() => ok(r), 500))))
      .then(([buf, teca, piel]) => new Promise((ok, falha) => loader.parse(buf, glb.slice(0, glb.lastIndexOf('/') + 1), (g) => ok([g.scene, teca, piel]), falha)))
      .then(([raiz, teca, piel]) => arruma(T, raiz, teca, piel));
  }

  function arruma(T, raiz, teca, piel) {
    const UV = new T.PlaneGeometry(1, 1).attributes.uv.constructor;
    const ud = (o) => (o.userData && o.userData.dynamic ? o.userData : (o.parent && o.parent.userData) || {});
    // UV em metros, projectada pela face: as tábuas da teca correm ao longo da eslora, como no configurador oficial
    const v = new T.Vector3(), n = new T.Vector3();
    function uvMetros(o) {
      const g = o.geometry, p = g.attributes.position, nn = g.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        n.fromBufferAttribute(nn, i).transformDirection(o.matrixWorld);
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        if (ay >= ax && ay >= az) { uv[i * 2] = v.x; uv[i * 2 + 1] = v.z; } else if (ax >= az) { uv[i * 2] = v.y; uv[i * 2 + 1] = v.z; } else { uv[i * 2] = v.x; uv[i * 2 + 1] = v.y; }
      }
      g.setAttribute('uv', new UV(uv, 2));
    }
    // a teca do configurador oficial: tábuas de 55 mm, junta com a cor da «Línea de la teca», tinte e saturação por acabamento
    const tecaU = { teakTint: { value: new T.Color(1, 1, 1) }, teakSaturation: { value: 0.82 }, teakSeamColor: { value: new T.Color(0x1f1f1e) } };
    function matTeca(m) {
      m.map = teca; m.color.set(0xffffff); m.roughness = 0.62; m.metalness = 0;
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, tecaU);
        sh.fragmentShader = `uniform vec3 teakTint,teakSeamColor;uniform float teakSaturation;
float teakHash(float p){return fract(sin(p*127.1)*43758.5453);}
vec2 teakUV(vec2 p){float plank=floor(p.x/.055);return vec2(p.y*.48+teakHash(plank+31.),.51+fract(p.x/.055)*.038+teakHash(plank)*.06);}
float teakSeam(vec2 p){float edge=min(fract(p.x/.055),1.-fract(p.x/.055))*.055;return 1.-smoothstep(.0007,.0019+fwidth(p.x)*.5,edge);}
` + sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
vec4 sampledDiffuseColor=texture2D(map,teakUV(vMapUv));
float luminance=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
sampledDiffuseColor.rgb=mix(vec3(luminance),sampledDiffuseColor.rgb,teakSaturation)*1.08*teakTint;
diffuseColor*=sampledDiffuseColor;
float plank=floor(vMapUv.x/.055);
diffuseColor.rgb*=.91+teakHash(plank)*.16;
diffuseColor.rgb=mix(diffuseColor.rgb,teakSeamColor,teakSeam(vMapUv)*.92);
#endif`);
      };
      m.customProgramCacheKey = () => 'pt-teca-tabuas-v1';
    }
    const PINTA = new Set(['hull', 'deck', 'accent', 'hardtop', 'carbon', 'engine', 'hardware', 'glass', 'teak', 'upholstery', 'joinery', 'frames']);
    const mats = {}, opcoes = {}, partes = {}, interior = [];
    raiz.updateMatrixWorld(true);
    raiz.traverse((o) => {
      if (!o.isMesh) return;
      const d = ud(o), slot = o.material.userData.slot;
      // o camarote fica de fora: daqui só se vê o barco por fora, e são menos triângulos para desenhar
      if (d.zone === 'interior' || d.dynamic === 'stair-stringer') { interior.push(o); return; }
      if (PINTA.has(slot)) {
        if (!mats[slot]) {
          const m = mats[slot] = o.material.clone();
          m.envMapIntensity = 0.62;
          if (slot === 'teak') matTeca(m);
          else if (slot === 'joinery') { const t = teca && teca.clone(); if (t) { t.repeat.set(0.48, 0.48); t.needsUpdate = true; } m.map = t; m.color.set(0xbd9059); m.roughness = 0.8; m.metalness = 0; }
          else if (slot === 'upholstery') { const t = piel && piel.clone(); if (t) { t.repeat.set(3.5, 3.5); t.needsUpdate = true; } m.normalMap = t; m.normalScale.set(0.3, 0.3); m.roughness = 0.72; m.metalness = 0; }
          else if (slot === 'glass') { m.transparent = true; m.depthWrite = false; }
          else if (slot === 'frames') { m.color.set(0x2d2d2d); m.roughness = 0.6; m.metalness = 0.55; }
        }
        o.material = mats[slot];
        if (slot === 'teak' || slot === 'joinery' || slot === 'upholstery') uvMetros(o);
      }
      if (d.option) (opcoes[d.option] = opcoes[d.option] || []).push(o);
      if (d.part && dados.movimentos[d.part]) (partes[d.part] = partes[d.part] || []).push(o);
    });
    interior.forEach((o) => { o.visible = false; });
    // as peças móveis: um grupo por peça, no pivô do configurador oficial
    const rigs = {};
    function rig(nome) {
      if (rigs[nome]) return rigs[nome];
      const mv = dados.movimentos[nome], pai = mv.pai ? rig(mv.pai).g : raiz, g = new T.Group();
      if (mv.rodar) g.position.fromArray(mv.rodar);
      pai.add(g); g.updateMatrixWorld(true);
      (partes[nome] || []).forEach((o) => g.attach(o));
      return (rigs[nome] = { g, mv, rest: g.position.clone(), v: 0, alvo: 0, eixo: new T.Vector3().fromArray(mv.eixo || [0, 0, 1]).normalize(), off: new T.Vector3().fromArray(mv.deslizar || [0, 0, 0]) });
    }
    Object.keys(partes).forEach(rig);
    return { raiz, mats, opcoes, rigs, tecaU };
  }

  function criaVisor(T) {
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    const tela = renderer.domElement;
    tela.setAttribute('aria-label', 'Vista 3D del Pantiera 32. Arrastra para girarlo.'); tela.setAttribute('role', 'img');
    visorEl.prepend(tela);

    const cena = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    cena.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture;
    // estúdio: a principal alta, do lado de estibordo (o lado que se vê ao abrir); o enchimento no outro bordo,
    // e uma luz de baixo para o fundo do casco não ficar negro
    const luz = new T.DirectionalLight(0xfff4e6, 1.3); luz.position.set(-2.4, 3.2, 2.2); cena.add(luz);
    const luz2 = new T.DirectionalLight(0xe6eefc, 0.55); luz2.position.set(2.5, 1.6, -2); cena.add(luz2);
    const baixo = new T.DirectionalLight(0xdfe6ee, 0.45); baixo.position.set(-0.6, -2, 0.8); cena.add(baixo);
    cena.add(new T.HemisphereLight(0xdfe6ee, 0x5a6068, 0.6));
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 400);
    const ctl = new T.OrbitControls(cam, tela);
    tela.style.touchAction = 'pan-y'; // um dedo na vertical continua a descer a página: o 3D nunca prende o scroll
    Object.assign(ctl, { enableDamping: true, dampingFactor: 0.07, enablePan: false, autoRotate: false, rotateSpeed: 0.7, zoomSpeed: 0.6, minPolarAngle: 0.12 * Math.PI, maxPolarAngle: 0.5 * Math.PI });
    ctl.addEventListener('start', () => { voo = null; visorEl.classList.add('tocado'); marcaVista(null); });
    // a roda do rato desce a página; só com Ctrl (ou o gesto de pinça do trackpad) aproxima
    visorEl.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true, passive: true });

    // sombra de contacto: um degradê radial por baixo do casco
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const cx = cv.getContext('2d'), gr = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(0.45, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
    const sombra = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.visible = false; cena.add(sombra);

    let modelo = null, sujo = true, base = 0, compilando = true, voo = null, centro = new T.Vector3();
    const D = 700, ease = (k) => 1 - Math.pow(1 - k, 4);
    const anim = [];
    function corPara(m, hex, ja) {
      const alvo = new T.Color(hex);
      if (ja || reduz) { m.color.copy(alvo); return; }
      const i = anim.findIndex((a) => a.m === m); if (i >= 0) anim.splice(i, 1);
      if (!m.color.equals(alvo)) anim.push({ m, de: m.color.clone(), para: alvo, t0: performance.now() });
    }
    function look(m, l, ja) {
      if (!m || !l) return;
      corPara(m, l.cor, ja);
      if (l.r != null) m.roughness = l.r;
      m.metalness = l.m != null ? l.m : 0;
      if (l.o != null) m.opacity = l.o;
    }
    // a configuração inteira, de uma vez: barato, e o barco nunca fica a meio entre duas regras
    function aplica(ja) {
      if (!modelo) return;
      const { mats, tecaU, rigs } = modelo, L = dados.looks, F = dados.fixos;
      const casco = { tipo: 'tinta', ...L.hull[cfg.fin.hull] };
      look(mats.hull, casco, ja); look(mats.deck, casco, ja);
      const t = L.teak[cfg.fin.teak]; tecaU.teakTint.value.setRGB(...t.tinte); tecaU.teakSaturation.value = t.sat;
      tecaU.teakSeamColor.value.set(L.teakLine[cfg.fin.teakLine].cor);
      if (mats.upholstery) corPara(mats.upholstery, L.upholstery[cfg.fin.upholstery].cor, ja);
      for (const g of ['accent', 'hardtop', 'carbon', 'glass']) look(mats[g], F[g].look, ja);
      look(mats.hardware, tem('phanter-black') ? F.hardware.alt : F.hardware.look, ja);
      look(mats.engine, tem('engine-white') ? F.engine.alt : F.engine.look, ja);
      for (const e of dados.estados) {
        const c = e.escolhas.find((x) => x.id === cfg.estados[e.id]);
        for (const [p, val] of Object.entries(c.pose)) if (rigs[p]) { rigs[p].alvo = val; if (ja || reduz) { rigs[p].v = val; pose(rigs[p]); } }
      }
      visibilidade();
      sujo = true;
    }
    function pose(r) {
      const k = r.v * r.v * (3 - 2 * r.v);
      if (r.mv.rodar) r.g.quaternion.setFromAxisAngle(r.eixo, r.mv.ang * k);
      else r.g.position.copy(r.rest).addScaledVector(r.off, k);
    }
    // os grupos de opções: o de série, os dos extras escolhidos, e os que dependem de uma peça aberta ou fechada
    function visibilidade() {
      const { opcoes, rigs } = modelo, on = new Set(dados.cena);
      for (const e of dados.extras) if (tem(e.id)) (e.cena || []).forEach((c) => on.add(c));
      for (const [op, os] of Object.entries(opcoes)) {
        let v = on.has(op);
        for (const r of Object.values(rigs)) {
          if (r.mv.aberto === op) v = r.v >= 0.999;
          if (r.mv.fechado === op) v = r.v < 0.999;
          if (r.mv.revela === op) v = r.v > 0;
        }
        for (const o of os) o.visible = v;
      }
    }
    function anima(t, dt) {
      let mexe = false;
      for (let i = anim.length - 1; i >= 0; i--) { const a = anim[i], k = Math.min(1, (t - a.t0) / D); a.m.color.copy(a.de).lerp(a.para, ease(k)); if (k >= 1) anim.splice(i, 1); mexe = true; }
      if (modelo) {
        let peca = false;
        for (const r of Object.values(modelo.rigs)) {
          if (r.v === r.alvo) continue;
          const passo = dt / (r.mv.dur || 1.3);
          r.v = r.alvo > r.v ? Math.min(r.alvo, r.v + passo) : Math.max(r.alvo, r.v - passo);
          pose(r); peca = true;
        }
        if (peca) { visibilidade(); mexe = true; }
      }
      if (voo) {
        const k = Math.min(1, (t - voo.t0) / voo.dur), e = ease(k);
        poeCamara(voo.de[0] + (voo.para[0] - voo.de[0]) * e, voo.de[1] + (voo.para[1] - voo.de[1]) * e, voo.de[2] + (voo.para[2] - voo.de[2]) * e);
        if (k >= 1) { voo = null; ctl.update(); }
        mexe = true;
      }
      return mexe;
    }

    /* ---------- câmara: as vistas do configurador oficial, com a câmara a voar até elas ---------- */
    // [azimute, elevação]: x positivo é bombordo, z positivo é a proa
    const VISTAS = { perspective: [2.31, 0.2], side: [Math.PI, 0.07], bow: [1.75, 0.36], stern: [-2.67, 0.42], top: [2.4, 1.15], deck: [-2.3, 0.7], dinette: [-1.95, 0.8], helm: [-2.1, 0.55] };
    const dir = (az, el) => new T.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    function poeCamara(az, el, d) { cam.position.copy(ctl.target).addScaledVector(dir(az, el), d); cam.lookAt(ctl.target); }
    const botoesV = $$('[data-vista]', sec);
    function marcaVista(nome) { botoesV.forEach((b) => b.classList.toggle('activo', b.dataset.vista === nome)); }
    function agora() {
      const o = cam.position.clone().sub(ctl.target), d = o.length();
      return [Math.atan2(o.z, o.x), Math.asin(T.MathUtils.clamp(o.y / d, -1, 1)), d];
    }
    function vista(nome, dur = 1100) {
      const p = VISTAS[nome]; if (!p || !modelo) return;
      marcaVista(VISTAS[nome] && botoesV.some((b) => b.dataset.vista === nome) ? nome : null);
      const de = agora(), para = [p[0], p[1], ajuste(p[0], p[1])];
      // o caminho mais curto à volta do barco
      while (para[0] - de[0] > Math.PI) para[0] -= 2 * Math.PI;
      while (para[0] - de[0] < -Math.PI) para[0] += 2 * Math.PI;
      if (reduz || !dur) { voo = null; poeCamara(...para); ctl.update(); sujo = true; return; }
      voo = { t0: performance.now(), dur, de, para };
    }
    let cantos = [];
    // a distância que enche o palco nesta direcção exacta (a caixa projectada), sem passar dos limites do zoom
    function ajuste(az, el) {
      const dd = dir(az, el), q = new T.Vector3(), w = visorEl.clientWidth, enche = w < 600 ? 0.96 : 0.86;
      let d = base || 20;
      for (let it = 0; it < 5; it++) {
        cam.position.copy(ctl.target).addScaledVector(dd, d); cam.lookAt(ctl.target); cam.updateMatrixWorld();
        let m = 0; for (const p of cantos) { q.copy(p).project(cam); m = Math.max(m, Math.abs(q.x), Math.abs(q.y)); }
        d *= m / enche;
      }
      return T.MathUtils.clamp(d, ctl.minDistance, ctl.maxDistance);
    }
    function enquadra() {
      if (!modelo) return;
      const w = visorEl.clientWidth, h = visorEl.clientHeight; if (!w || !h) return;
      cam.aspect = w / h; cam.updateProjectionMatrix();
      // a caixa do que se vê por fora (o camarote e as peças desligadas não contam)
      const caixa = new T.Box3();
      modelo.raiz.traverse((o) => { if (o.isMesh && o.visible && o.parent.visible) caixa.expandByObject(o); });
      const c = caixa.getCenter(new T.Vector3()), tam = caixa.getSize(new T.Vector3());
      const r = tam.length() / 2, vf = T.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
      // enquadra pela caixa projectada, à volta toda: o barco enche o palco no ângulo mais largo e nunca sai dele a rodar
      cantos = []; for (let k = 0; k < 8; k++) cantos.push(new T.Vector3(k & 1 ? caixa.max.x : caixa.min.x, k & 2 ? caixa.max.y : caixa.min.y, k & 4 ? caixa.max.z : caixa.min.z));
      centro = new T.Vector3(c.x, c.y - tam.y * 0.06, c.z);
      const enche = w < 600 ? 0.98 : 0.9, q = new T.Vector3(), guarda = agora();
      base = 0;
      for (let i = 0; i < 12; i++) {
        const dd = dir(i * Math.PI / 6, 0.2);
        let d = r / Math.sin(Math.min(vf, hf) / 2);
        for (let it = 0; it < 4; it++) {
          cam.position.copy(centro).addScaledVector(dd, d); cam.lookAt(centro); cam.updateMatrixWorld();
          let m = 0; for (const p of cantos) { q.copy(p).project(cam); m = Math.max(m, Math.abs(q.x), Math.abs(q.y)); }
          d *= m / enche;
        }
        base = Math.max(base, d);
      }
      ctl.minDistance = base * 0.4; ctl.maxDistance = base * 1.4;
      ctl.target.copy(centro);
      if (!visorEl.classList.contains('tocado') && !voo) poeCamara(VISTAS.perspective[0], VISTAS.perspective[1], ajuste(...VISTAS.perspective));
      else poeCamara(guarda[0], guarda[1], T.MathUtils.clamp(guarda[2], ctl.minDistance, ctl.maxDistance));
      cam.near = base / 50; cam.far = base * 10; cam.updateProjectionMatrix();
      ctl.update(); sujo = true;
      // a sombra assenta por baixo da peça mais baixa (as pernas dos motores)
      sombra.scale.set(tam.x * 1.25, tam.z * 1.5, 1); sombra.position.set(c.x, caixa.min.y - tam.y * 0.01, c.z); sombra.visible = true;
    }

    const pronto = carregaModelo(T, dados.v3d).then((m) => {
      modelo = m; cena.add(m.raiz);
      aplica(true); enquadra(); progresso(1);
      // os shaders compilam em paralelo (KHR_parallel_shader_compile) e o visor só desenha quando estão prontos
      const mostra = () => {
        compilando = false; sujo = true;
        // uma volta curta ao aparecer, e depois o barco só se mexe com a mão
        const inicial = VISTAS[vistaUrl] ? vistaUrl : 'perspective';
        if (!reduz) { const [az, el, d] = agora(); poeCamara(az + 0.7, el, d); vista(inicial, 1800); }
        else if (inicial !== 'perspective') vista(inicial, 1);
        requestAnimationFrame(() => { visorEl.classList.add('pronto'); palcoEl.classList.add('pronto'); });
      };
      if (renderer.compileAsync) renderer.compileAsync(cena, cam).then(mostra, mostra);
      else { renderer.compile(cena, cam); mostra(); }
    });

    new ResizeObserver(() => {
      const w = visorEl.clientWidth, h = visorEl.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); enquadra(); sujo = true;
    }).observe(visorEl);

    // o laço único do site: só desenha com o visor à vista e com algo a mudar (arrasto, inércia, cor, peça ou voo da câmara)
    let antes = performance.now();
    DA.aCada((t) => {
      const dt = Math.min(0.1, (t - antes) / 1000); antes = t;
      if (!visivel || !modelo || compilando || document.hidden) return;
      const animou = anima(t, dt), mexeu = voo ? false : ctl.update();
      if (animou || mexeu || sujo) { renderer.render(cena, cam); sujo = false; }
    });
    return pronto.then(() => ({ aplica: () => aplica(false), vista }), (e) => { tela.remove(); cargaTxt.textContent = 'No se ha podido cargar el modelo 3D'; cargaPct.textContent = ''; throw e; });
  }
})();
