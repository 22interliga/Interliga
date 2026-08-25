// INTERLIGA — Passageiro TESTE v2
// Mantem producao intacta e aplica somente as regras de teste em memoria.

const appUrl = new URL('../app.js?v=teste-faixas-v2', import.meta.url);
const firebaseUrl = new URL('../firebase-config.js', import.meta.url).href;
const swUrl = new URL('../firebase-messaging-sw.js', import.meta.url).href;
const motoristaUrl = new URL('../motorista.html', import.meta.url).href;

const resp = await fetch(appUrl, { cache: 'no-store' });
if (!resp.ok) throw new Error('Nao foi possivel carregar app.js');
let src = await resp.text();

src = src.replace("from './firebase-config.js'", `from '${firebaseUrl}'`);
src = src.replace("fb.doc(db, 'precos', c.codigo)", "fb.doc(db, 'precos', 'teste_' + c.codigo)");

// Mantem as faixas completas, inclusive valor por KM.
src = src.replace(
  "valorFixo: Number(c.valorFixo || c.valorfixo || 0),\n          kmFixo: Number(c.kmFixo || 0),",
  "valorFixo: Number(c.valorFixo || c.valorfixo || 0),\n          faixasKm: Array.isArray(c.faixasKm) ? c.faixasKm.map(f => ({ de:Number(f.de)||0, ate:Number(f.ate)||0, valor:Number(f.valor)||0, valorKm:Number(f.valorKm)||0 })) : [],\n          kmFixo: Number(c.kmFixo || 0),"
);

const regraAntiga = `function calcularPrecoBase(km, t) {
  if (t.kmFixo > 0 && t.valorFixo > 0) {
    if (km <= t.kmFixo) return t.valorFixo;
    return t.valorFixo + (km - t.kmFixo) * t.tarifaKm;
  }
  return t.bandeirada + km * t.tarifaKm;
}`;

const regraTeste = `function calcularPrecoBase(km, t) {
  const faixas = (Array.isArray(t.faixasKm) ? t.faixasKm : [])
    .map(f => ({ de:Number(f.de)||0, ate:Number(f.ate)||0, valor:Number(f.valor)||0, valorKm:Number(f.valorKm)||0 }))
    .filter(f => f.ate >= f.de)
    .sort((a,b) => a.de - b.de);
  const faixa = faixas.find(f => km >= f.de && km <= f.ate);
  if (faixa) return faixa.valor + (km * faixa.valorKm);
  if (t.kmFixo > 0 && t.valorFixo > 0) {
    if (km <= t.kmFixo) return t.valorFixo;
    return t.valorFixo + (km - t.kmFixo) * t.tarifaKm;
  }
  return t.bandeirada + km * t.tarifaKm;
}`;

if (!src.includes(regraAntiga)) throw new Error('Regra de preco mudou; patch de teste interrompido.');
src = src.replace(regraAntiga, regraTeste);

// Salva ponto de referencia no documento da corrida.
src = src.replace(
  "categoria,\n    cidade,\n    cupomCodigo:",
  "categoria,\n    cidade,\n    pontoReferencia: window.__pontoReferenciaTeste || '',\n    cupomCodigo:"
);

src = src.replace("navigator.serviceWorker.register('./firebase-messaging-sw.js')", `navigator.serviceWorker.register('${swUrl}')`);
src = src.replaceAll("window.location.href = 'motorista.html'", `window.location.href = '${motoristaUrl}'`);

// Sinal visual do ambiente de teste.
const aviso = document.createElement('div');
aviso.textContent = '🧪 TESTE — faixas KM + ponto de referência';
aviso.style.cssText='position:fixed;top:0;left:0;right:0;z-index:999999;background:#7c3aed;color:#fff;text-align:center;padding:5px 8px;font:700 11px Arial,sans-serif';
document.body.appendChild(aviso);

// Modal de ponto de referencia antes da busca.
window.__pontoReferenciaTeste='';
let liberando=false;
const modal=document.createElement('div');
modal.hidden=true;
modal.id='ref-teste';
modal.innerHTML=`<div class="rfundo"></div><div class="rcaixa"><button class="rfechar">×</button><div style="font-size:24px">📍</div><h3>Ponto de referência</h3><p>Informe um ponto fácil para o motorista localizar você.</p><input id="rinput" maxlength="120" placeholder="Ex.: Portão azul, em frente à farmácia"><div id="rerro" hidden>Digite o ponto de referência.</div><button id="rconfirmar">Confirmar e buscar motorista</button></div>`;
document.body.appendChild(modal);
const st=document.createElement('style');
st.textContent=`#ref-teste[hidden]{display:none!important}#ref-teste{position:fixed;inset:0;z-index:1000002;display:flex;align-items:center;justify-content:center;padding:18px}.rfundo{position:absolute;inset:0;background:#0f172a99}.rcaixa{position:relative;width:min(92vw,390px);background:white;color:#111827;border-radius:18px;padding:20px;font-family:Arial;box-shadow:0 20px 60px #0005}.rcaixa h3{margin:6px 0}.rcaixa p{font-size:13px;color:#6b7280}.rcaixa input{width:100%;box-sizing:border-box;padding:14px;border:1.5px solid #d1d5db;border-radius:12px;font-size:16px}.rfechar{position:absolute;right:10px;top:7px;border:0;background:transparent;font-size:28px}#rconfirmar{width:100%;margin-top:14px;padding:14px;border:0;border-radius:12px;background:#7c3aed;color:white;font-weight:800}#rerro{color:#b91c1c;font-size:12px;margin-top:6px;font-weight:700}`;
document.head.appendChild(st);
const inp=modal.querySelector('#rinput'), erro=modal.querySelector('#rerro');
function fechar(){modal.hidden=true;erro.hidden=true}
modal.querySelector('.rfechar').onclick=fechar;modal.querySelector('.rfundo').onclick=fechar;
document.addEventListener('click',e=>{const b=e.target.closest('#btn-confirmar-corrida');if(!b)return;if(liberando){liberando=false;return}e.preventDefault();e.stopImmediatePropagation();modal.hidden=false;inp.value=window.__pontoReferenciaTeste||'';setTimeout(()=>inp.focus(),50)},true);
modal.querySelector('#rconfirmar').onclick=()=>{const v=inp.value.trim();if(!v){erro.hidden=false;return}window.__pontoReferenciaTeste=v;fechar();const b=document.getElementById('btn-confirmar-corrida');if(b){liberando=true;b.click()}};
inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();modal.querySelector('#rconfirmar').click()}});

const blob = new Blob([src], { type:'text/javascript' });
const u=URL.createObjectURL(blob);
try{await import(u)}finally{setTimeout(()=>URL.revokeObjectURL(u),30000)}
