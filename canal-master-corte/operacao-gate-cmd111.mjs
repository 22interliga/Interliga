// Use with the existing normal Master Auth/App Check client. No credentials on disk/import.
export function criarOperadorGate({api,usuarioAtual,origem=()=>globalThis.location?.origin}={}){
 return async function alterar(comando,fotografia,{escoamentoConfirmado=false}={}){
  if(origem()!=='https://interliga.app.br')throw Error('ORIGEM_INVALIDA');
  if(!comando||Object.keys(comando).sort().join(',')!=='comandoId,motivo,novosAceitesPermitidos,revisaoEsperada'||
    typeof comando.novosAceitesPermitidos!=='boolean'||!Number.isSafeInteger(comando.revisaoEsperada)||comando.revisaoEsperada<0||
    !/^[A-Za-z0-9_-]{1,128}$/.test(comando.comandoId||'')||typeof comando.motivo!=='string'||!comando.motivo.length||comando.motivo.length>500)throw Error('COMANDO_INVALIDO');
  const t=Date.parse(fotografia?.readTime),agora=Date.now();
  if(fotografia?.projeto!=='interliga-mobilidade'||fotografia.origem!=='FirestoreAdminRunQuery'||fotografia.completa!==true||
    !fotografia.janelaId||!Number.isFinite(t)||agora-t>300000||t>agora+30000)throw Error('FOTOGRAFIA_NOVA_OBRIGATORIA');
  if(comando.novosAceitesPermitidos&&(!escoamentoConfirmado||fotografia.ativas!==0||fotografia.controladas!==0||fotografia.gatePausado!==true||
    fotografia.auditoriaGateConferida!==true||fotografia.faseBFinalPublicada!==true))throw Error('REABERTURA_NAO_LIBERADA');
  const u=usuarioAtual?.();if(!u?.uid||u.isAnonymous===true)throw Error('SESSAO_AUSENTE');
  const contexto=await api.exigir().contexto();
  if(contexto?.papel!=='master'||usuarioAtual()!==u)throw Error('SESSAO_MASTER_OBRIGATORIA');
  // No retry/ID generation. On uncertainty reuse this command and read the current gate/audit.
  const r=await api.transporteIntegrado('administracao')('/aceites/gate',comando,u);
  if(usuarioAtual()!==u)throw Error('SESSAO_ALTERADA');
  if(r?.ok!==true)throw Error(r?.codigo||'GATE_NAO_CONFIRMADO');return r;
 };
}
