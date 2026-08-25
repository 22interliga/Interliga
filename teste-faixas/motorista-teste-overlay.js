import { carregarFirebase } from '../firebase-config.js';

const aviso = document.createElement('div');
aviso.textContent = '🧪 MOTORISTA TESTE — valor e ponto de referência';
aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#7c3aed;color:#fff;text-align:center;padding:5px 8px;font:700 11px Arial,sans-serif;box-shadow:0 1px 5px #0003';
document.body.appendChild(aviso);

const style = document.createElement('style');
style.textContent = `
#mot-teste-card{position:fixed;left:12px;right:12px;bottom:86px;z-index:999998;background:#111827;color:#fff;border:1px solid #7c3aed;border-radius:16px;padding:14px 14px 12px;font-family:Inter,Arial,sans-serif;box-shadow:0 16px 40px #0008;display:none}
#mot-teste-card.show{display:block}
#mot-teste-card .t{font-size:12px;font-weight:800;color:#c4b5fd;margin-bottom:8px}
#mot-teste-card .linha{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #374151;font-size:13px}
#mot-teste-card .linha:last-child{border-bottom:0}
#mot-teste-card .rot{color:#9ca3af}
#mot-teste-card .val{font-weight:800;text-align:right;max-width:68%;word-break:break-word}
#mot-teste-card .preco{font-size:20px;color:#86efac}
#mot-teste-card .ref{color:#fde68a}
`;
document.head.appendChild(style);

const card = document.createElement('div');
card.id = 'mot-teste-card';
card.innerHTML = `
  <div class="t">DADOS DA CORRIDA — TESTE</div>
  <div class="linha"><span class="rot">Valor da corrida</span><span class="val preco" id="mt-preco">—</span></div>
  <div class="linha"><span class="rot">Ponto de referência</span><span class="val ref" id="mt-ref">—</span></div>
  <div class="linha"><span class="rot">Origem</span><span class="val" id="mt-origem">—</span></div>
  <div class="linha"><span class="rot">Destino</span><span class="val" id="mt-destino">—</span></div>
`;
document.body.appendChild(card);

function dinheiro(v){
  const n = Number(v || 0);
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

const f = await carregarFirebase('interliga-motorista');
const { db, auth, fb, authMod } = f;
let unsub = null;

function iniciar(uid){
  if (unsub) { try { unsub(); } catch(e) {} }
  const q = fb.query(fb.collection(db,'corridas'), fb.where('status','==','aguardando'));
  unsub = fb.onSnapshot(q, snap => {
    let lista = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    lista = lista.filter(c => !c.motoristaAlvoAtual || c.motoristaAlvoAtual === uid);
    lista.sort((a,b) => {
      const ta = a.criadoEm?.toMillis ? a.criadoEm.toMillis() : 0;
      const tb = b.criadoEm?.toMillis ? b.criadoEm.toMillis() : 0;
      return tb - ta;
    });
    const c = lista[0];
    if (!c) { card.classList.remove('show'); return; }
    document.getElementById('mt-preco').textContent = dinheiro(c.preco);
    document.getElementById('mt-ref').textContent = c.pontoReferencia || 'Não informado';
    document.getElementById('mt-origem').textContent = c.origem || '—';
    document.getElementById('mt-destino').textContent = c.destino || '—';
    card.classList.add('show');
  }, err => console.warn('[motorista-teste] erro listener:', err));
}

authMod.onAuthStateChanged(auth, user => {
  if (!user) { card.classList.remove('show'); return; }
  iniciar(user.uid);
});
