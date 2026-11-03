import {criarOperadorGate} from './operacao-gate-cmd111.mjs';
// Minimal binding for an ALREADY connected normal Firebase/Auth/AppCheck client.
// Does not initialize SDKs, alter configuration, issue tokens, or perform I/O on import/creation.
export function criarCanalMasterCorteV004({app,auth,api,habilitado=false,origem=()=>globalThis.location?.origin}={}) {
 if(habilitado!==true)return Object.freeze({habilitado:false});
 function sessao(){
  if(origem()!=='https://interliga.app.br'||app?.options?.projectId!=='interliga-mobilidade'||
   app.options.appId!=='1:1071971171958:web:b04980bd1abd4dcc7c2957'||auth?.app!==app||
   typeof api?.exigir!=='function'||typeof api?.transporteIntegrado!=='function')throw Error('CONTEXTO_MASTER_INVALIDO');
  const u=auth.currentUser;
  if(!u?.uid||u.isAnonymous===true)throw Error('SESSAO_MASTER_AUSENTE');return u;
 }
 sessao();
 const alterar=criarOperadorGate({api,usuarioAtual:()=>auth.currentUser,origem});
 async function contexto(){
  const u=sessao(),r=await api.exigir().contexto();
  if(sessao()!==u)throw Error('SESSAO_ALTERADA');
  if(r?.papel!=='master')throw Error('SESSAO_MASTER_OBRIGATORIA');return r;
 }
 async function enviar(comando,fotografia,opcoes,abertura){
  const u=sessao();
  if(comando?.novosAceitesPermitidos!==abertura)throw Error('ACAO_GATE_DIVERGENTE');
  // Existing helper validates fresh photograph, live backend Master context,
  // expected revision, stable command ID, drainage and phase B for reopening.
  const r=await alterar(comando,fotografia,opcoes);
  if(sessao()!==u)throw Error('SESSAO_ALTERADA');return r;
 }
 return Object.freeze({habilitado:true,contexto,
  pausar:(comando,fotografia)=>enviar(comando,fotografia,{},false),
  reabrir:(comando,fotografia,{escoamentoConfirmado=false}={})=>enviar(comando,fotografia,{escoamentoConfirmado:escoamentoConfirmado===true},true)});
}

