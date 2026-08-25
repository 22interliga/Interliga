// MOTORISTA TESTE
// Quadro flutuante de diagnóstico removido a pedido.
// O Motorista TESTE continua carregando o fluxo original sem cobrir a tela da chamada.

const aviso = document.createElement('div');
aviso.textContent = '🧪 MOTORISTA TESTE';
aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#7c3aed;color:#fff;text-align:center;padding:5px 8px;font:700 11px Arial,sans-serif;box-shadow:0 1px 5px #0003;pointer-events:none';
document.body.appendChild(aviso);
