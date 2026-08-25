// INTERLIGA — carregador de teste das faixas por KM
// Este arquivo NAO altera app.js. Ele carrega o app de producao em memoria,
// troca apenas a leitura da tabela de teste e a regra de calculo, e executa a copia resultante.

const appUrl = new URL('../app.js?v=teste-faixas-1', import.meta.url);
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

// Corrige caminhos relativos que, dentro da pasta de teste, apontariam para o lugar errado.
src = src.replace("navigator.serviceWorker.register('./firebase-messaging-sw.js')", `navigator.serviceWorker.register('${swUrl}')`);
src = src.replaceAll("window.location.href = 'motorista.html'", `window.location.href = '${motoristaUrl}'`);

// Marca visualmente que esta copia esta usando preco isolado.
const aviso = document.createElement('div');
aviso.textContent = '🧪 TESTE DE FAIXAS KM — preços isolados da produção';
aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#7c3aed;color:#fff;text-align:center;padding:5px 8px;font:700 11px Arial,sans-serif;box-shadow:0 1px 5px #0003';
document.body.appendChild(aviso);

const blob = new Blob([src], { type: 'text/javascript' });
const blobUrl = URL.createObjectURL(blob);
try {
  await import(blobUrl);
  console.log('[teste-faixas] app de teste carregado com sucesso');
} finally {
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}
