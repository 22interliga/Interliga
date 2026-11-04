// Optional callback for CustomProvider; no Firebase initialization or automatic execution.
export function criarGetTokenCmd132({app,auth,config,resolverProva,fetchFn=globalThis.fetch,agora=Date.now,monotono=()=>performance.now()}={}){
 if(config?.aprovado!==true||config.publicacaoConfirmada!==true||globalThis.location?.origin!=='https://interliga.app.br'||
 app?.options?.projectId!=='interliga-mobilidade'||app.options.appId!=='1:1071971171958:web:b04980bd1abd4dcc7c2957'||
 auth?.app!==app||typeof resolverProva!=='function'||typeof fetchFn!=='function')throw Error('CUSTOM_PROVIDER_NAO_CONFIGURADO');
 const base=new URL(config.urlGateway);
 if(base.protocol!=='https:'||!base.hostname.endsWith('.gateway.dev')||base.port||base.username||base.password||
 base.pathname!=='/'||base.search||base.hash||typeof config.siteKey!=='string'||!config.siteKey.length)throw Error('GATEWAY_REAL_AUSENTE');
 return async()=>{
  const u=auth.currentUser;if(!u?.uid||u.isAnonymous===true)throw Error('SESSAO_OBRIGATORIA');
  const token=await u.getIdToken();
  const enviar=async(acao,body)=>{
   if(auth.currentUser!==u)throw Error('SESSAO_ALTERADA');
   const r=await fetchFn(new URL('/app-check/'+acao,base).href,{method:'POST',credentials:'omit',redirect:'error',
   signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!r.ok)throw Error('EMISSOR_RECUSOU');const data=await r.json();
   if(auth.currentUser!==u)throw Error('SESSAO_ALTERADA');return data;
  };
  const inicioDesafio=monotono();
  const d=await enviar('desafio',{});
  if(!/^[a-f0-9]{64}$/.test(d.nonce||'')||d.siteKey!==config.siteKey||d.action!=='interliga_appcheck'||
  !Number.isFinite(d.expireTimeMillis)||d.expireTimeMillis<=agora()||d.expireTimeMillis>agora()+300000)throw Error('DESAFIO_INVALIDO');
  const prova=await resolverProva({siteKey:d.siteKey,action:d.action,cData:d.nonce});
  if(typeof prova!=='string'||!prova.length||prova.length>2048||d.expireTimeMillis<=agora())throw Error('PROVA_INVALIDA');
  const r=await enviar('troca',{nonce:d.nonce,prova});
  // O desafio informa o instante do emissor mais cinco minutos. O tempo
  // monotônico desde o envio dá um limite superior conservador para esse relógio.
  const agoraEmissorMaximo=d.expireTimeMillis-300000+Math.ceil(monotono()-inicioDesafio);
  const restante=r.expireTimeMillis-agoraEmissorMaximo;
  if(typeof r.token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(r.token)||
  !Number.isFinite(restante)||restante<=0||restante>1800000)throw Error('TOKEN_INVALIDO');
  // CustomProvider usa a época local para o cache. Conservar a duração restante.
  return {token:r.token,expireTimeMillis:agora()+restante};
 };
}