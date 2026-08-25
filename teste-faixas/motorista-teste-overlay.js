import { carregarFirebase } from '../firebase-config.js';

const aviso = document.createElement('div');
aviso.textContent = '🧪 MOTORISTA TESTE';
aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#7c3aed;color:#fff;text-align:center;padding:5px 8px;font:700 11px Arial,sans-serif;box-shadow:0 1px 5px #0003;pointer-events:none';
document.body.appendChild(aviso);

const style = document.createElement('style');
style.textContent = `
#request-ponto-ref-teste{margin:12px 0 4px;padding:12px 14px;border:1px solid #f4d27a;background:#fff8e7;border-radius:12px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;font-family:Inter,Arial,sans-serif}
#request-ponto-ref-teste .lbl{font-size:12px;color:#7c6a2b;font-weight:700}
#request-ponto-ref-teste .txt{font-size:14px;color:#5b4300;font-weight:800;text-align:right;max-width:68%;word-break:break-word}
`;
document.head.appendChild(style);

function dinheiro(v){
  const n = Number(v || 0);
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function garantirLinhaReferencia(){
  let row = document.getElementById('request-ponto-ref-teste');
  if (row) return row;
  const card = document.getElementById('request-card');
  if (!card) return null;
  row = document.createElement('div');
  row.id = 'request-ponto-ref-teste';
  row.innerHTML = '<span class="lbl">📍 Ponto de referência</span><span class="txt" id="request-ponto-ref-texto">Não informado</span>';
  const btnAceitar = document.getElementById('btn-aceitar');
  const blocoAcoes = btnAceitar?.parentElement;
  if (blocoAcoes && blocoAcoes.parentElement === card) card.insertBefore(row, blocoAcoes);
  else card.appendChild(row);
  return row;
}

function aplicarNaTela(corrida){
  if (!corrida) return;
  const valor = document.getElementById('request-valor');
  if (valor) valor.textContent = dinheiro(corrida.preco);
  garantirLinhaReferencia();
  const ref = document.getElementById('request-ponto-ref-texto');
  if (ref) ref.textContent = corrida.pontoReferencia || 'Não informado';
}

const f = await carregarFirebase('interliga-motorista');
const { db, auth, fb, authMod } = f;
let unsub = null;

function iniciar(uid){
  if (unsub) { try { unsub(); } catch(e) {} }
  const q = fb.query(fb.collection(db,'corridas'), fb.where('status','==','aguardando'));
  unsub = fb.onSnapshot(q, snap => {
    const agora = Date.now();
    let lista = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    lista = lista.filter(c => {
      const criado = c.criadoEm?.toMillis ? c.criadoEm.toMillis() : 0;
      const recente = !criado || (agora - criado) <= 120000;
      const destinada = !c.motoristaAlvoAtual || c.motoristaAlvoAtual === uid;
      return recente && destinada;
    });
    lista.sort((a,b) => {
      const ta = a.criadoEm?.toMillis ? a.criadoEm.toMillis() : 0;
      const tb = b.criadoEm?.toMillis ? b.criadoEm.toMillis() : 0;
      return tb - ta;
    });
    const c = lista[0];
    if (!c) return;
    aplicarNaTela(c);
    setTimeout(() => aplicarNaTela(c), 200);
    setTimeout(() => aplicarNaTela(c), 700);
  }, err => console.warn('[motorista-teste] erro ao ler corrida:', err));
}

authMod.onAuthStateChanged(auth, user => {
  if (!user) return;
  iniciar(user.uid);
});
