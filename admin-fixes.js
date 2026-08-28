// INTERLIGA — correções seguras do Painel Admin (Etapa 1)
// Carregado somente pela página admin-corrigido.html na branch de teste.

(() => {
  'use strict';

  // 1) RELATÓRIOS: usar Timestamp real do Firestore e comissão editável.
  carregarRelatorios = async function carregarRelatoriosCorrigido() {
    if (!dbAdmin) return;
    const range = obterRangeData(relPeriodoAtual);
    if (!range) return;

    const loading = document.getElementById('rel-loading');
    const conteudo = document.getElementById('rel-conteudo');
    if (loading) loading.style.display = 'block';
    if (conteudo) conteudo.style.display = 'none';

    try {
      const inicioTs = fbAdmin.Timestamp?.fromDate?.(range.inicio) || range.inicio;
      const fimTs = fbAdmin.Timestamp?.fromDate?.(range.fim) || range.fim;
      const [snapCorridas, snapPedidos, comissaoPct] = await Promise.all([
        fbAdmin.getDocs(fbAdmin.query(
          fbAdmin.collection(dbAdmin, 'corridas'),
          fbAdmin.where('status', '==', 'finalizada'),
          fbAdmin.where('criadoEm', '>=', inicioTs),
          fbAdmin.where('criadoEm', '<=', fimTs),
        )),
        fbAdmin.getDocs(fbAdmin.query(
          fbAdmin.collection(dbAdmin, 'pedidos_food'),
          fbAdmin.where('status', '==', 'entregue'),
          fbAdmin.where('criadoEm', '>=', inicioTs),
          fbAdmin.where('criadoEm', '<=', fimTs),
        )),
        carregarComissaoPlataforma(),
      ]);

      let totalCorridas = 0, faturamento = 0, totalPedidos = 0, faturamentoPedidos = 0;
      const rankMotoristas = {}, rankPassageiros = {};

      snapCorridas.forEach(d => {
        const c = d.data();
        if (meuPapelAdmin === 'franqueado' && c.cidade !== minhaCidadeFranqueado) return;
        totalCorridas++;
        const preco = Number(c.preco || 0);
        faturamento += preco;
        if (c.motoristaId) {
          if (!rankMotoristas[c.motoristaId]) rankMotoristas[c.motoristaId] = { nome: c.motoristaNome || '—', corridas: 0, ganhos: 0 };
          rankMotoristas[c.motoristaId].corridas++;
          rankMotoristas[c.motoristaId].ganhos += preco;
        }
        if (c.passageiroId) {
          if (!rankPassageiros[c.passageiroId]) rankPassageiros[c.passageiroId] = { nome: c.passageiroNome || '—', corridas: 0, gasto: 0 };
          rankPassageiros[c.passageiroId].corridas++;
          rankPassageiros[c.passageiroId].gasto += preco;
        }
      });

      snapPedidos.forEach(d => {
        const p = d.data();
        if (meuPapelAdmin === 'franqueado' && p.cidade && p.cidade !== minhaCidadeFranqueado) return;
        totalPedidos++;
        faturamentoPedidos += Number(p.total || 0);
      });

      const faturamentoTotal = faturamento + faturamentoPedidos;
      const comissao = faturamento * ((Number(comissaoPct) || 0) / 100);

      document.getElementById('rel-total-corridas').textContent = totalCorridas;
      document.getElementById('rel-total-pedidos').textContent = totalPedidos;
      document.getElementById('rel-faturamento').textContent = formatMoeda(faturamentoTotal);
      document.getElementById('rel-comissao').textContent = formatMoeda(comissao);

      const topMot = Object.values(rankMotoristas).sort((a,b) => b.corridas - a.corridas).slice(0, 5);
      const medalhas = ['🥇','🥈','🥉','4°','5°'];
      document.getElementById('rel-top-motoristas').innerHTML = topMot.length
        ? topMot.map((m, i) => `<tr><td>${medalhas[i]||''}</td><td>${m.nome}</td><td>${m.corridas}</td><td>${formatMoeda(m.ganhos)}</td></tr>`).join('')
        : '<tr><td colspan="4" style="text-align:center;color:var(--t2);padding:14px;">Nenhuma corrida no período</td></tr>';

      const topPax = Object.values(rankPassageiros).sort((a,b) => b.corridas - a.corridas).slice(0, 5);
      document.getElementById('rel-top-passageiros').innerHTML = topPax.length
        ? topPax.map((p, i) => `<tr><td>${medalhas[i]||''}</td><td>${p.nome}</td><td>${p.corridas}</td><td>${formatMoeda(p.gasto)}</td></tr>`).join('')
        : '<tr><td colspan="4" style="text-align:center;color:var(--t2);padding:14px;">Nenhuma corrida no período</td></tr>';
    } catch (e) {
      console.error('[admin-fixes] erro ao carregar relatórios:', e);
      showToast('⚠️ Erro ao carregar relatórios');
    } finally {
      if (loading) loading.style.display = 'none';
      if (conteudo) conteudo.style.display = 'block';
    }
  };

  // 2) COMISSÃO: uma única comissão de corridas, editável e sincronizada.
  salvarComissaoPlataforma = async function salvarComissaoPlataformaCorrigida() {
    const percentual = Number(document.getElementById('rep-comissao-percentual')?.value);
    if (isNaN(percentual) || percentual < 0 || percentual > 100) {
      showToast('⚠️ Informe um percentual válido (0 a 100)');
      return;
    }
    try {
      await Promise.all([
        fbAdmin.setDoc(fbAdmin.doc(dbAdmin, 'config', 'comissao'), {
          percentual,
          atualizadoEm: fbAdmin.serverTimestamp(),
        }, { merge:true }),
        fbAdmin.setDoc(fbAdmin.doc(dbAdmin, 'configuracoes', 'app'), {
          comissoes: { corridas: percentual },
          atualizadoEm: fbAdmin.serverTimestamp(),
        }, { merge:true }),
      ]);
      const cfgInput = document.getElementById('cfg-com-corridas');
      if (cfgInput) cfgInput.value = percentual;
      registrarAlteracao('comissao_corridas_atualizada','configuracoes',`Comissão de corridas alterada para ${percentual}%`);
      showToast('✅ Comissão salva: ' + percentual + '%');
      carregarRepasses();
      if (document.getElementById('s-relatorios')?.classList.contains('active')) carregarRelatorios();
    } catch (e) {
      console.error('[admin-fixes] erro ao salvar comissão:', e);
      showToast('⚠️ Erro ao salvar — confirme as regras do Firestore');
    }
  };

  const salvarConfigAppOriginal = salvarConfigApp;
  salvarConfigApp = async function salvarConfigAppCorrigida() {
    if(!dbAdmin){ showToast('⚠️ Sem conexão'); return; }
    const num = id => Number(document.getElementById(id)?.value) || 0;
    const txt = id => (document.getElementById(id)?.value || '').trim();
    const tog = id => (document.getElementById(id)?.dataset.on === '1');
    const cfg = {
      corridas: { raioBuscaKm:num('cfg-raio'), tempoAceitarSeg:num('cfg-tempo-aceitar'), tempoGratuitoMin:num('cfg-tempo-gratis'), taxaEsperaMin:num('cfg-taxa-espera'), multaCancelamento:num('cfg-multa'), valorKmParada:num('cfg-km-parada') },
      comissoes: { corridas:num('cfg-com-corridas'), interifood:num('cfg-com-food'), franqueadoCorridas:num('cfg-com-franq-corridas'), franqueadoFood:num('cfg-com-franq-food') },
      app: { nome:txt('cfg-nome-app'), telefoneSuporte:txt('cfg-tel-suporte'), emailSuporte:txt('cfg-email-suporte'), versao:txt('cfg-versao') },
      seguranca: { verificarCpf:tog('cfg-tog-cpf'), selfie:tog('cfg-tog-selfie'), antecedentes:tog('cfg-tog-antecedentes') },
      atualizadoEm: fbAdmin.serverTimestamp(),
    };
    if (cfg.comissoes.corridas < 0 || cfg.comissoes.corridas > 100) {
      showToast('⚠️ Comissão de corridas deve ficar entre 0 e 100%');
      return;
    }
    try {
      await Promise.all([
        fbAdmin.setDoc(fbAdmin.doc(dbAdmin,'configuracoes','app'), cfg, { merge:true }),
        fbAdmin.setDoc(fbAdmin.doc(dbAdmin,'config','comissao'), { percentual: cfg.comissoes.corridas, atualizadoEm: fbAdmin.serverTimestamp() }, { merge:true }),
      ]);
      const repInput = document.getElementById('rep-comissao-percentual');
      if (repInput) repInput.value = cfg.comissoes.corridas;
      showToast('✅ Configurações salvas!');
      registrarAlteracao('config_app_salva','configuracoes',`Configurações do app atualizadas · comissão corridas ${cfg.comissoes.corridas}%`);
    } catch(e) {
      console.error('[admin-fixes] erro ao salvar config:', e);
      showToast('⚠️ Erro ao salvar — '+(e.code||e.message));
    }
  };

  const carregarConfigAppOriginal = carregarConfigApp;
  carregarConfigApp = async function carregarConfigAppCorrigida() {
    await carregarConfigAppOriginal();
    try {
      const percentual = await carregarComissaoPlataforma();
      const input = document.getElementById('cfg-com-corridas');
      if (input) input.value = percentual;
    } catch (_) {}
  };

  // 3) DASHBOARD: alinhar as 5 colunas e exibir o passageiro.
  carregarDashboard = async function carregarDashboardCorrigido() {
    try {
      const [corridas, motoristas] = await Promise.all([buscarTodasCorridas(), buscarTodosMotoristas()]);
      _todasCorridasCache = corridas;
      _todosMotoristasCache = motoristas;

      const hoje = new Date().toDateString();
      const corridasHoje = corridas.filter(c => {
        const ms = c.criadoEm?.toMillis ? c.criadoEm.toMillis() : null;
        return ms && new Date(ms).toDateString() === hoje;
      });
      const faturamentoHoje = corridasHoje.filter(c => c.status === 'finalizada').reduce((acc, c) => acc + Number(c.preco || 0), 0);
      const motoristasOnline = motoristas.filter(m => m.online).length;

      document.getElementById('dash-faturamento-hoje').textContent = formatMoeda(faturamentoHoje);
      document.getElementById('dash-corridas-hoje').textContent = corridasHoje.length;
      document.getElementById('dash-motoristas-online').textContent = motoristasOnline;

      const tbody = document.getElementById('dash-atividade-recente');
      const recentes = corridas.slice(0, 10);
      if (recentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t2);padding:24px;">Nenhuma corrida ainda</td></tr>';
      } else {
        tbody.innerHTML = recentes.map(c => `
          <tr><td>${(c.origem||'—').slice(0,20)} → ${(c.destino||'—').slice(0,20)}</td><td>${c.passageiroNome || '—'}</td><td>${formatMoeda(c.preco)}</td><td>${badgeStatusCorrida(c.status)}</td><td>${formatHora(c.criadoEm)}</td></tr>
        `).join('');
      }
    } catch (e) {
      console.error('[admin-fixes] erro ao carregar dashboard:', e);
      showToast('⚠️ Erro ao carregar dados do dashboard');
    }
  };

  // 4) PRECIFICAÇÃO: preservar "fixo" x "acumulado + R$/km" no Salvar tudo.
  salvarPrecos = async function salvarPrecosCorrigido() {
    const cidade = document.getElementById('prec-cidade')?.value || 'madre';
    if (!dbAdmin) { showToast('⚠️ Sem conexão com o servidor'); return; }
    const dados = {};
    for (const base of (_categoriasCacheAdmin || [])) {
      const c = obterCategoriaEfetivaAdmin(base);
      const codigo = c.codigo || c.id;
      if (!codigo) continue;
      dados[codigo] = {
        bandeirada: Number(c.bandeirada)||0,
        tarifaKm: Number(c.tarifaKm ?? c.tarifakm)||0,
        minimo: Number(c.minimo)||0,
        multiplicador: Number(c.multiplicador)||1,
        kmFixo: Number(c.kmFixo)||0,
        valorFixo: Number(c.valorFixo)||0,
        faixasKm: Array.isArray(c.faixasKm) ? c.faixasKm.map(f => ({
          de:Number(f.de)||0,
          ate:Number(f.ate)||0,
          tipo:f.tipo === 'por_km' ? 'por_km' : 'fixo',
          valor:Number(f.valor)||0,
        })) : [],
        ativo: c.ativo !== false,
        nome: c.nome || codigo,
        icone: c.icone || '🚗'
      };
    }
    try {
      await fbAdmin.setDoc(fbAdmin.doc(dbAdmin, 'precos', cidade), dados, { merge: true });
      _precificacaoCidadeAtual = { ...(_precificacaoCidadeAtual||{}), ...dados };
      registrarAlteracao('precificacao_salva','precos','Precificação salva preservando tipo das faixas',cidade);
      showToast('💾 Precificação por faixas salva!');
      renderCategoriasAdmin();
      atualizarSimCategorias();
    } catch (e) {
      console.error('[admin-fixes] erro ao salvar preços:', e);
      showToast('⚠️ Erro ao salvar — confirme as regras do Firestore');
    }
  };

  // 5) REPASSES: manter telefone na linha para o botão de WhatsApp funcionar.
  carregarRepasses = async function carregarRepassesCorrigido() {
    try {
      const [motoristas, corridas, pagos, comissaoPct] = await Promise.all([
        _todosMotoristasCache.length ? Promise.resolve(_todosMotoristasCache) : buscarTodosMotoristas(),
        _todasCorridasCache.length ? Promise.resolve(_todasCorridasCache) : buscarTodasCorridas(),
        buscarRepassesPagos(),
        carregarComissaoPlataforma(),
      ]);
      _todosMotoristasCache = motoristas;
      _todasCorridasCache = corridas;

      let totalRecebidoDiretoGeral = 0, totalRecebidoPlataformaGeral = 0, totalComissaoGeral = 0, totalAjusteGeral = 0;
      const linhas = motoristas.map(m => {
        const corridasMotorista = corridas.filter(c => c.motoristaId === m.id && c.status === 'finalizada');
        const recebidoDireto = corridasMotorista
          .filter(c => !c.formaPagamento || c.formaPagamento === 'dinheiro' || c.formaPagamento === 'pix')
          .reduce((acc, c) => acc + Number(c.preco || 0), 0);
        const recebidoPlataforma = corridasMotorista
          .filter(c => c.formaPagamento === 'cartao' || c.formaPagamento === 'carteira')
          .reduce((acc, c) => acc + Number(c.preco || 0), 0);

        const ganhoBruto = recebidoDireto + recebidoPlataforma;
        const comissao = ganhoBruto * (comissaoPct / 100);
        const saldoBruto = recebidoPlataforma - comissao;
        const ajuste = pagos[m.id] || 0;
        const saldo = saldoBruto - ajuste;

        totalRecebidoDiretoGeral += recebidoDireto;
        totalRecebidoPlataformaGeral += recebidoPlataforma;
        totalComissaoGeral += comissao;
        totalAjusteGeral += ajuste;

        return { id: m.id, nome: m.nome || 'Sem nome', celular: m.celular || m.telefone || '', recebidoDireto, recebidoPlataforma, comissao, saldo };
      }).filter(l => (l.recebidoDireto + l.recebidoPlataforma) > 0);

      document.getElementById('rep-total-bruto').textContent = formatMoeda(totalRecebidoDiretoGeral + totalRecebidoPlataformaGeral);
      document.getElementById('rep-comissao-total').textContent = formatMoeda(totalComissaoGeral);
      document.getElementById('rep-pago').textContent = formatMoeda(totalAjusteGeral);
      document.getElementById('rep-pendente').textContent = formatMoeda(linhas.reduce((acc, l) => acc + Math.abs(l.saldo), 0));

      const tbody = document.getElementById('repasses-tbody');
      if (linhas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--t2);padding:24px;">Nenhum motorista com corridas concluídas ainda</td></tr>';
        return;
      }
      tbody.innerHTML = linhas.map(l => {
        const saldoTexto = Math.abs(l.saldo) < 0.01
          ? '✅ Em dia'
          : l.saldo > 0
            ? `<b style="color:var(--green)">A pagar: ${formatMoeda(l.saldo)}</b>`
            : `<b style="color:var(--red)">A cobrar: ${formatMoeda(Math.abs(l.saldo))}</b>`;
        const botao = Math.abs(l.saldo) < 0.01
          ? '—'
          : `<button class="pbtn" onclick="registrarAcertoRepasse('${l.id}', ${l.saldo})">${l.saldo > 0 ? 'Marcar pago' : 'Marcar cobrado'}</button>`;
        const whatsapp = l.celular
          ? `<span class="icon-btn" title="Enviar via WhatsApp" onclick="enviarRepasseWhatsApp('${String(l.nome).replace(/'/g,"\\'")}','${l.celular}',${l.saldo})">📲</span>`
          : '';
        return `<tr>
          <td><input type="checkbox" class="repasse-check" data-id="${l.id}" data-nome="${l.nome}" data-celular="${l.celular}" data-saldo="${l.saldo}"> <b>${l.nome}</b></td>
          <td>${formatMoeda(l.recebidoDireto)}</td>
          <td>${formatMoeda(l.recebidoPlataforma)}</td>
          <td style="color:var(--t2);">${formatMoeda(l.comissao)}</td>
          <td>${saldoTexto}</td>
          <td>${whatsapp} ${botao}</td>
        </tr>`;
      }).join('');
    } catch (e) {
      console.error('[admin-fixes] erro ao carregar repasses:', e);
      showToast('⚠️ Erro ao carregar repasses');
    }
  };

  console.log('✅ Correções do Painel Admin Interliga carregadas');
})();
