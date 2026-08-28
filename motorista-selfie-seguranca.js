// INTERLIGA — Etapa de teste: selfie de segurança somente pela câmera
// Não faz reconhecimento facial automático. Apenas captura ao vivo e grava separadamente
// para futura integração com serviço de comparação facial/prova de vida.
(() => {
  'use strict';

  let selfieSegurancaBase64 = null;
  let stream = null;
  let modal = null;
  let video = null;
  let statusEl = null;

  function criarUI() {
    if (document.getElementById('selfie-seguranca-card')) return;

    // A foto de perfil pode vir da galeria OU câmera.
    const perfilInput = document.getElementById('cad-mot-selfie-input');
    if (perfilInput) {
      perfilInput.removeAttribute('capture');
      const label = perfilInput.closest('label');
      if (label) {
        for (const node of [...label.childNodes]) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = 'Escolher foto de perfil ';
            break;
          }
        }
      }
    }

    const previewPerfil = document.getElementById('cad-mot-selfie-preview');
    const perfilCard = previewPerfil?.closest('.form-card');
    if (!perfilCard) return;

    const sec = document.createElement('div');
    sec.id = 'selfie-seguranca-card';
    sec.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid var(--border);text-align:center;';
    sec.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px;">🔐 Selfie de segurança</div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.45;margin-bottom:10px;">Feita somente pela câmera frontal, no momento do cadastro. A galeria não é aceita nesta etapa.</div>
      <div id="selfie-seguranca-preview" class="selfie-preview" style="margin:0 auto 10px;">🔒</div>
      <button type="button" class="btn-upload-selfie" id="btn-selfie-seguranca">Abrir câmera frontal</button>
      <div id="selfie-seguranca-status" style="font-size:11px;color:var(--text-soft);margin-top:8px;">Pendente</div>`;
    perfilCard.appendChild(sec);

    statusEl = document.getElementById('selfie-seguranca-status');
    document.getElementById('btn-selfie-seguranca')?.addEventListener('click', abrirCamera);

    modal = document.createElement('div');
    modal.id = 'modal-selfie-seguranca';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:#05080eeF;z-index:99999;align-items:center;justify-content:center;padding:18px;';
    modal.innerHTML = `
      <div style="width:min(430px,100%);background:var(--surface,#fff);border-radius:18px;padding:16px;text-align:center;">
        <div style="font-size:17px;font-weight:800;margin-bottom:6px;">Selfie de segurança</div>
        <div style="font-size:12px;color:var(--text-soft);margin-bottom:12px;">Centralize o rosto e olhe para a câmera.</div>
        <video id="selfie-seguranca-video" autoplay playsinline muted style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:14px;background:#111;transform:scaleX(-1);"></video>
        <canvas id="selfie-seguranca-canvas" style="display:none;"></canvas>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button type="button" class="btn-primary" id="capturar-selfie-seguranca" style="flex:1;margin:0;">📷 Capturar</button>
          <button type="button" class="btn-secondary" id="cancelar-selfie-seguranca" style="flex:1;margin:0;">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    video = document.getElementById('selfie-seguranca-video');
    document.getElementById('capturar-selfie-seguranca')?.addEventListener('click', capturar);
    document.getElementById('cancelar-selfie-seguranca')?.addEventListener('click', fecharCamera);

    // Exige a selfie de segurança antes do cadastro ser enviado.
    document.getElementById('btn-enviar-cadastro-motorista')?.addEventListener('click', (e) => {
      if (!selfieSegurancaBase64) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const err = document.getElementById('cad-mot-erro');
        if (err) {
          err.hidden = false;
          err.textContent = 'Tire a selfie de segurança pela câmera para concluir o cadastro.';
        }
        try { showToast('🔐 Selfie de segurança obrigatória'); } catch (_) {}
        return;
      }
      // O cadastro principal cria o usuário. Depois gravamos a selfie separadamente.
      salvarQuandoUsuarioExistir();
    }, true);
  }

  async function abrirCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      statusEl.textContent = '⚠️ Câmera não disponível neste dispositivo/navegador.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      });
      video.srcObject = stream;
      modal.style.display = 'flex';
      statusEl.textContent = 'Câmera aberta';
    } catch (e) {
      console.warn('[selfie-seguranca] câmera negada/indisponível:', e);
      statusEl.textContent = '⚠️ Permita o acesso à câmera frontal para continuar.';
    }
  }

  function fecharCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (video) video.srcObject = null;
    if (modal) modal.style.display = 'none';
  }

  function capturar() {
    if (!video || !video.videoWidth) return;
    const canvas = document.getElementById('selfie-seguranca-canvas');
    const maxW = 720;
    const escala = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    selfieSegurancaBase64 = canvas.toDataURL('image/jpeg', 0.78);

    const prev = document.getElementById('selfie-seguranca-preview');
    if (prev) prev.innerHTML = `<img src="${selfieSegurancaBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
    statusEl.textContent = '✅ Selfie capturada ao vivo — aguardando validação';
    fecharCamera();
  }

  async function salvarQuandoUsuarioExistir() {
    const limite = Date.now() + 12000;
    while (Date.now() < limite) {
      try {
        const uid = authMotorista?.currentUser?.uid || meuMotoristaId;
        if (uid && db && fb?.setDoc) {
          await fb.setDoc(fb.doc(db, 'motoristas', uid), {
            selfieSeguranca: selfieSegurancaBase64,
            selfieSegurancaOrigem: 'camera_ao_vivo',
            selfieSegurancaStatus: 'pendente_comparacao',
            selfieSegurancaCapturadaEm: fb.serverTimestamp(),
            validacaoFacialAutomatica: false
          }, { merge: true });
          return;
        }
      } catch (e) {
        console.warn('[selfie-seguranca] aguardando cadastro principal:', e);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', criarUI);
  else criarUI();
})();