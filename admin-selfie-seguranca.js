// INTERLIGA — Admin: mostra foto de perfil e selfie de segurança separadamente.
(() => {
  'use strict';

  function aplicar() {
    if (typeof window.cartaoVerificacao !== 'function' || window.__selfieSegurancaAdminAplicada) return;
    window.__selfieSegurancaAdminAplicada = true;
    const original = window.cartaoVerificacao;

    window.cartaoVerificacao = function(tipo, id, d) {
      const html = original(tipo, id, d);
      if (tipo !== 'motorista') return html;

      const status = d.selfieSegurancaStatus || 'nao_capturada';
      const badge = status === 'pendente_comparacao'
        ? '<span class="badge yellow">🔐 Aguardando comparação facial</span>'
        : status === 'validada'
          ? '<span class="badge green">✅ Identidade validada</span>'
          : status === 'rejeitada'
            ? '<span class="badge red">❌ Validação rejeitada</span>'
            : '<span class="badge gray">Selfie de segurança não capturada</span>';

      const bloco = `<div style="margin-top:12px;padding:12px;border:1px solid var(--bd);border-radius:10px;background:var(--s1);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <b>🔐 Validação de identidade</b>${badge}
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">
          <div style="text-align:center;">
            ${d.selfie ? `<img src="${d.selfie}" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);">` : '<div style="width:100px;height:100px;background:var(--s2);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--t2);">sem foto</div>'}
            <div style="font-size:10px;color:var(--t2);margin-top:4px;">Foto de perfil</div>
          </div>
          <div style="text-align:center;">
            ${d.selfieSeguranca ? `<img src="${d.selfieSeguranca}" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);">` : '<div style="width:100px;height:100px;background:var(--s2);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--t2);">não capturada</div>'}
            <div style="font-size:10px;color:var(--t2);margin-top:4px;">Selfie de segurança · câmera</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--t2);margin-top:8px;">A comparação facial automática ainda não está ativa nesta versão de teste.</div>
      </div>`;

      return html.replace(/<\/div>\s*$/, bloco + '</div>');
    };
  }

  const timer = setInterval(() => {
    aplicar();
    if (window.__selfieSegurancaAdminAplicada) clearInterval(timer);
  }, 150);
  setTimeout(() => clearInterval(timer), 5000);
})();