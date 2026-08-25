// INTERLIGA — carregador de teste das faixas por KM
// Este arquivo NAO altera app.js. Ele carrega o app de producao em memoria,
// troca apenas a leitura da tabela de teste e a regra de calculo, e executa a copia resultante.

const appUrl = new URL('../app.js?v=teste-faixas-2', import.meta.url);
const firebaseUrl = new URL('../firebase-config.js', import.meta.url).href;
const swUrl = new URL('../firebase-messaging-sw.js', import.meta.url).href;
const motoristaUrl = new URL('../motorista.html', import.meta.url).href;

const resp = await fetch(appUrl, { cache: 'no-store' });
if (!resp.ok) throw new Error('Nao foi possivel carregar app.js para o ambiente de teste');
let src = await resp.text();

// Blob modules nao conseguem resolver imports relativos: aponta o Firebase para a URL real.
src = src.replace("from './firebase-config.js'", `from '${firebaseUrl}'`);

// ISOLAMENTO: no teste, le precos/teste_<cidade> em vez de precos/<cidade>.
src = src.replace(
  "fb.doc(db, 'precos', c.codigo)",
  "fb.doc(db, 'precos', 'teste_' + c.codigo)"
);

// Mantem faixasKm quando as categorias gerais sao carregadas.
src = src.replace(
  "valorFixo: Number(c.valorFixo || c.valorfixo || 0),\n          kmFixo: Number(c.kmFixo || 0),",
  "valorFixo: Number(c.valorFixo || c.valorfixo || 0),\n          faixasKm: Array.isArray(c.faixasKm) ? c.faixasKm.map(f => ({ de:Number(f.de)||0, ate:Number(f.ate)||0, valor:Number(f.valor)||0 })) : [],\n          kmFixo: Number(c.kmFixo || 0),"
);

const regraAntiga = `function calcularPrecoBase(km, t) {
  if (t.kmFixo > 0 && t.valorFixo > 0) {
    if (km <= t.kmFixo) return t.valorFixo;
    return t.valorFixo + (km - t.kmFixo) * t.tarifaKm;
  }
  return t.bandeirada + km * t.tarifaKm;
}`;

const regraTeste = `function calcularPrecoBase(km, t) {
  // TESTE FAIXAS KM: a faixa configurada tem prioridade.
  // Se nenhuma faixa corresponder, a logica atual continua funcionando como fallback.
  const faixas = (Array.isArray(t.faixasKm) ? t.faixasKm : [])
    .map(f => ({ de:Number(f.de)||0, ate:Number(f.ate)||0, valor:Number(f.valor)||0 }))
    .filter(f => f.ate >= f.de)
    .sort((a,b) => a.de - b.de);
  const faixa = faixas.find(f => km >= f.de && km <= f.ate);
  if (faixa) return faixa.valor;
  if (t.kmFixo > 0 && t.valorFixo > 0) {
    if (km <= t.kmFixo) return t.valorFixo;
    return t.valorFixo + (km - t.kmFixo) * t.tarifaKm;
  }
  return t.bandeirada + km * t.tarifaKm;
}`;

if (!src.includes(regraAntiga)) {
  throw new Error('A regra de preco do app.js mudou. Teste interrompido para nao aplicar patch incorreto.');
}
src = src.replace(regraAntiga, regraTeste);

// Salva o ponto de referencia digitado no documento da corrida de teste.
src = src.replace(
  "categoria,\n    cidade,\n    cupomCodigo:",
  "categoria,\n    cidade,\n    pontoReferencia: window.__pontoReferenciaTeste || '',\n    cupomCodigo:"
);

// Corrige caminhos relativos que, dentro da pasta de teste, apontariam para o lugar errado.
src = src.replace("navigator.serviceWorker.register('./firebase-messaging-sw.js')", `navigator.serviceWorker.register('${swUrl}')`);
src = src.replaceAll("window.location.href = 'motorista.html'", `window.location.href = '${motoristaUrl}'`);

// Marca visualmente que esta copia esta usando preco isolado.
const aviso = document.createElement('div');
aviso.textContent = '🧪 TESTE DE FAIXAS KM — preços isolados da produção';
aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#7c3aed;color:#fff;text-align:center;padding:5px 8px;font:700 11px Arial,sans-serif;box-shadow:0 1px 5px #0003';
document.body.appendChild(aviso);

// ─────────────────────────────────────
// TESTE: PONTO DE REFERENCIA ANTES DA BUSCA
// Ao tocar em Solicitar/Confirmar corrida, interrompe a busca e abre uma caixa flutuante.
// Depois que o passageiro confirma o texto, a caixa some e o clique original continua.
// ─────────────────────────────────────
window.__pontoReferenciaTeste = '';
let liberandoBuscaTeste = false;

const modalRef = document.createElement('div');
modalRef.id = 'modal-ponto-referencia-teste';
modalRef.hidden = true;
modalRef.innerHTML = `
  <div class="ref-overlay-teste"></div>
  <div class="ref-box-teste" role="dialog" aria-modal="true" aria-labelledby="ref-titulo-teste">
    <button type="button" class="ref-fechar-teste" aria-label="Fechar">×</button>
    <div class="ref-icone-teste">📍</div>
    <div id="ref-titulo-teste" class="ref-titulo-teste">Ponto de referência</div>
    <div class="ref-sub-teste">Informe um ponto fácil para o motorista localizar você.</div>
    <input id="ref-input-teste" class="ref-input-teste" type="text" maxlength="120" placeholder="Ex.: Portão azul, em frente à farmácia" autocomplete="off">
    <div id="ref-erro-teste" class="ref-erro-teste" hidden>Digite o ponto de referência para continuar.</div>
    <button type="button" id="ref-confirmar-teste" class="ref-confirmar-teste">Confirmar e buscar motorista</button>
  </div>`;
document.body.appendChild(modalRef);

const styleRef = document.createElement('style');
styleRef.textContent = `
#modal-ponto-referencia-teste[hidden]{display:none!important}
#modal-ponto-referencia-teste{position:fixed;inset:0;z-index:1000002;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
.ref-overlay-teste{position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px)}
.ref-box-teste{position:relative;width:min(92vw,390px);background:#fff;border-radius:18px;padding:22px 18px 18px;box-shadow:0 20px 60px rgba(0,0,0,.28);font-family:Inter,Arial,sans-serif;color:#111827}
.ref-fechar-teste{position:absolute;right:12px;top:9px;border:0;background:transparent;font-size:28px;line-height:1;color:#6b7280;cursor:pointer;padding:4px 8px}
.ref-icone-teste{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#f3e8ff;font-size:23px;margin-bottom:10px}
.ref-titulo-teste{font-size:20px;font-weight:800;margin-bottom:5px}
.ref-sub-teste{font-size:13px;line-height:1.4;color:#6b7280;margin-bottom:14px}
.ref-input-teste{width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:12px;padding:14px 13px;font-size:16px;outline:none;background:#fff}
.ref-input-teste:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12)}
.ref-erro-teste{font-size:12px;color:#b91c1c;margin-top:7px;font-weight:600}
.ref-confirmar-teste{width:100%;border:0;border-radius:12px;margin-top:14px;padding:14px;background:#7c3aed;color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(124,58,237,.23)}
.ref-confirmar-teste:active{transform:translateY(1px)}
`;
document.head.appendChild(styleRef);

const inputRef = modalRef.querySelector('#ref-input-teste');
const erroRef = modalRef.querySelector('#ref-erro-teste');
const fecharRef = () => {
  modalRef.hidden = true;
  erroRef.hidden = true;
};
modalRef.querySelector('.ref-fechar-teste').addEventListener('click', fecharRef);
modalRef.querySelector('.ref-overlay-teste').addEventListener('click', fecharRef);

// Captura antes do listener original do app para impedir que a busca comece antes do ponto de referencia.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-confirmar-corrida');
  if (!btn) return;
  if (liberandoBuscaTeste) {
    liberandoBuscaTeste = false;
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  modalRef.hidden = false;
  inputRef.value = window.__pontoReferenciaTeste || '';
  erroRef.hidden = true;
  setTimeout(() => inputRef.focus(), 80);
}, true);

modalRef.querySelector('#ref-confirmar-teste').addEventListener('click', () => {
  const valor = inputRef.value.trim();
  if (!valor) {
    erroRef.hidden = false;
    inputRef.focus();
    return;
  }
  window.__pontoReferenciaTeste = valor;
  fecharRef(); // caixa e botao somem imediatamente apos confirmar
  const btnCorrida = document.getElementById('btn-confirmar-corrida');
  if (btnCorrida) {
    liberandoBuscaTeste = true;
    btnCorrida.click(); // agora executa o fluxo original e abre a busca por motorista
  }
});

inputRef.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    modalRef.querySelector('#ref-confirmar-teste').click();
  }
});

const blob = new Blob([src], { type: 'text/javascript' });
const blobUrl = URL.createObjectURL(blob);
try {
  await import(blobUrl);
  console.log('[teste-faixas] app de teste carregado com sucesso');
} finally {
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}
