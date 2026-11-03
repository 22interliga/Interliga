(function(root){
  'use strict';
  function erro(codigo,status){return Object.assign(new Error(codigo),{codigo,status});}
  function criarCliente({transporte,usuarioAtual,novoId=()=>root.crypto.randomUUID()}) {
    if(typeof transporte!=='function'||typeof usuarioAtual!=='function')throw erro('V004_DESATIVADA',503);
    const cache=new Map(),pendentes=new Map();
    const chave=(u,t,id)=>u.uid+'/'+t+'/'+id;
    async function chamar(rota,body){
      const u=usuarioAtual();if(!u?.uid)throw erro('SESSAO_AUSENTE',401);
      const r=await transporte(rota,body,u);
      if(usuarioAtual()!==u)throw erro('SESSAO_ALTERADA',401);
      if(r?.ok===false)throw erro(r.codigo||'COMANDO_RECUSADO',r.status||400);
      return r;
    }
    async function ler(tipo,id){const u=usuarioAtual(),r=await chamar('/revisao',{tipo,id});cache.set(chave(u,tipo,id),r);return r;}
    async function pagina(recurso,tipo,cursor,verificacao,busca){
      const u=usuarioAtual(),r=await chamar('/pagina',{recurso,...(tipo?{tipo}:{}),limite:20,...(cursor?{cursor}:{}),...(verificacao?{verificacao}:{}),...(busca?{busca}:{})});
      if(recurso==='cadastros')for(const row of r.itens)cache.set(chave(u,tipo,row.id),row);
      return r;
    }
    function atual(tipo,id){const u=usuarioAtual();return u?cache.get(chave(u,tipo,id)):undefined;}
    async function executar(tipo,id,comando,dados,motivo,revisao){
      const u=usuarioAtual();if(!u?.uid)throw erro('SESSAO_AUSENTE',401);
      const k=chave(u,tipo,id),s=cache.get(k);if(!s?.revisao)throw erro('ATUALIZE_O_CADASTRO',409);
      if(pendentes.has(k))throw erro('CONSULTE_RESULTADO_ANTERIOR',409);
      const entrada={versaoContrato:1,comandoId:novoId(),alvo:{tipo,id},revisaoEsperada:revisao||s.revisao,dados,...(motivo!==undefined?{motivo}:{})};
      pendentes.set(k,entrada.comandoId);
      try {const r=await chamar('/comando',{comando,entrada});pendentes.delete(k);cache.delete(k);return r;}
      catch(e){if(e.codigo!=='SESSAO_ALTERADA'&&[400,401,403,404,409,412].includes(e.status)){pendentes.delete(k);cache.delete(k);}throw e;}
    }
    async function recuperar(tipo,id){
      const u=usuarioAtual(),k=u&&chave(u,tipo,id),comandoId=k&&pendentes.get(k);if(!comandoId)throw erro('SEM_COMANDO_PENDENTE',404);
      const r=await chamar('/resultado',{comandoId});pendentes.delete(k);cache.delete(k);return r;
    }
    return Object.freeze({ler,pagina,atual,executar,recuperar,acerto:(acao,dados)=>{if(!['consulta','prova','confirmacao','resultado','demonstrativo','opcoes'].includes(acao))throw erro('ROTA_INVALIDA',400);return chamar('/acerto/'+acao,dados);},limparCache:()=>{cache.clear();root.InterligaAcertoV004?.limpar();},contexto:()=>chamar('/contexto',{})});
  }
  function transporteLoopback(opcoes) {
    const u=new URL(opcoes.base);
    if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||!u.port)throw erro('DESTINO_LOCAL_INVALIDO',503);
    return transporteValidado(opcoes);
  }
  function transporteValidado({base,fetch:enviar=root.fetch,token,appCheckToken,servico='administracao',prefixo='',usuarioAtual}) {
    const u=new URL(base);
    if(!['administracao','privacidade'].includes(servico)||![ '', '/'+servico ].includes(prefixo))throw erro('ROTA_INVALIDA',400);
    const rotas=servico==='administracao'?['/aceites/gate','/revisao','/comando','/resultado','/pagina','/contexto','/acerto/consulta','/acerto/prova','/acerto/confirmacao','/acerto/resultado','/acerto/demonstrativo','/acerto/opcoes']:['/indicacao','/cadastro','/apresentacao'];
    return async(rota,body,usuario)=>{
      if(!rotas.includes(rota))throw erro('ROTA_INVALIDA',400);
      if(usuarioAtual&&usuarioAtual()!==usuario)throw erro('SESSAO_ALTERADA',401);
      const authorization=await token(usuario);
      const atestado=appCheckToken?await appCheckToken():undefined;
      if(usuarioAtual&&usuarioAtual()!==usuario)throw erro('SESSAO_ALTERADA',401);
      if(typeof authorization!=='string'||!authorization.trim()||/[\r\n]/.test(authorization))throw erro('IDENTIDADE_INVALIDA',401);
      if(appCheckToken&&(typeof atestado!=='string'||!atestado.trim()||/[\r\n]/.test(atestado)))throw erro('APP_CHECK_AUSENTE',401);
      const r=await enviar(u.origin+(u.pathname==='/'?'':u.pathname)+prefixo+rota,{method:'POST',redirect:'error',cache:'no-store',headers:{Authorization:'Bearer '+authorization,...(appCheckToken?{'X-Firebase-AppCheck':atestado}:{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
      const dados=await r.json();
      if(usuarioAtual&&usuarioAtual()!==usuario)throw erro('SESSAO_ALTERADA',401);
      return r.ok?dados:{ok:false,codigo:dados.codigo||'FALHA_TECNICA',status:r.status};
    };
  }
  function criarProvedorAppCheck({appCheck,modulo}={}) {
    if(!appCheck||typeof modulo?.getToken!=='function')throw erro('APP_CHECK_AUSENTE',503);
    return async()=>{const r=await modulo.getToken(appCheck,false);if(typeof r?.token!=='string'||!r.token.trim())throw erro('APP_CHECK_AUSENTE',401);return r.token;};
  }
  let integracaoLocal,integracaoSolicitada=false;
  function configurarIntegracaoLocal({config,usuarioAtual,obterProjeto,appCheckToken,fetch:enviar=root.fetch}={}) {
    if(cliente||integracaoLocal)throw erro('CLIENTE_JA_CONFIGURADO',409);
    integracaoSolicitada=true;
    if(config?.habilitado!==true||config.ambiente!=='development'||config.projeto!=='demo-interliga-seguranca'||typeof usuarioAtual!=='function'||typeof obterProjeto!=='function'||typeof appCheckToken!=='function')throw erro('INTEGRACAO_LOCAL_DESATIVADA',503);
    const projeto=config.projeto,base=config.base;
    const token=async u=>{if(obterProjeto()!==projeto||!u?.uid||u.isAnonymous===true||usuarioAtual()!==u)throw erro('CONTEXTO_LOCAL_INVALIDO',401);return u.getIdToken();};
    const conexoes={};
    for(const servico of ['administracao','privacidade']){
      const atestar=async()=>{const atestado=await appCheckToken();if(obterProjeto()!==projeto)throw erro('CONTEXTO_LOCAL_INVALIDO',401);return atestado;};
      const t=transporteLoopback({base,fetch:enviar,token,appCheckToken:atestar,servico,prefixo:'/'+servico,usuarioAtual});
      conexoes[servico]=async(rota,body,u)=>{if(obterProjeto()!==projeto)throw erro('CONTEXTO_LOCAL_INVALIDO',401);const r=await t(rota,body,u);if(obterProjeto()!==projeto)throw erro('CONTEXTO_LOCAL_INVALIDO',401);return r;};
    }
    cliente=criarCliente({usuarioAtual,transporte:conexoes.administracao});
    integracaoLocal=Object.freeze(conexoes);
    return Object.freeze({projeto,ambiente:'development'});
  }

  function conectarFirebaseLocal({app,auth,appCheck,appCheckMod,config=root.INTERLIGA_V004_LOCAL}={}) {
    if(config?.habilitado!==true)return Object.freeze({habilitado:false});
    integracaoSolicitada=true;
    if(!app||!auth||auth.app!==app||app.options?.projectId!==config.projeto)throw erro('CONTEXTO_LOCAL_INVALIDO',401);
    const instanciaAppCheck=appCheck||config.appCheck;
    if(instanciaAppCheck&&instanciaAppCheck.app!==app)throw erro('CONTEXTO_LOCAL_INVALIDO',401);
    const atestar=criarProvedorAppCheck({appCheck:instanciaAppCheck,modulo:appCheckMod||config.appCheckMod});
    return configurarIntegracaoLocal({config,usuarioAtual:()=>auth.currentUser,obterProjeto:()=>app.options?.projectId,appCheckToken:atestar});
  }
  let cliente;
  let homSolicitada=false,integracaoHom;
  function conectarFirebase({app,auth,appCheck,appCheckMod,fetch:enviar=root.fetch,config=root.INTERLIGA_V004_PRODUCAO||root.INTERLIGA_V004_HOMOLOGACAO}={}) {
    if(typeof enviar!=='function')throw erro('TRANSPORTE_INVALIDO',503);
    if(config?.habilitado!==true)return conectarFirebaseLocal({app,auth,appCheck,appCheckMod});
    homSolicitada=true;
    if(cliente||root.INTERLIGA_V004_LOCAL?.habilitado===true)throw erro('CONFIGURACAO_CONFLITANTE',503);
    const producao=config.ambiente==='producao';
    const projeto=producao?'interliga-mobilidade':'ambiente-desativado',
      origem=producao?'https://interliga.app.br':'https://interliga.app.br',
      base=producao?'https://us-central1-interliga-mobilidade.cloudfunctions.net/transporteMobilidadeCmd111/mobilidade-v004':origem+'/mobilidade-v004';
    function validar(){
      if(config.habilitado!==true||config.projeto!==projeto||config.ambiente!==(producao?'producao':'homologacao')||config.base!==base||root.location?.origin!==origem||config.origem!==origem||auth?.app!==app||app?.options?.projectId!==projeto||!Array.isArray(config.appIdsPermitidos)||!config.appIdsPermitidos.includes(app.options.appId)||appCheck?.app!==app)throw erro('CONTEXTO_HOMOLOGACAO_INVALIDO',503);
    }
    validar();
    const atestar=criarProvedorAppCheck({appCheck,modulo:appCheckMod}),conexoes={};
    for(const servico of ['administracao','privacidade']){
      const t=transporteValidado({base,fetch:enviar,servico,prefixo:'/'+servico,usuarioAtual:()=>auth.currentUser,token:async u=>{validar();if(!u?.uid||u.isAnonymous===true)throw erro('IDENTIDADE_INVALIDA',401);const t=await u.getIdToken();validar();return t;},appCheckToken:async()=>{validar();const t=await atestar();validar();return t;}});
      conexoes[servico]=async(...args)=>{validar();const r=await t(...args);validar();return r;};
    }
    integracaoHom=Object.freeze(conexoes);
    cliente=criarCliente({usuarioAtual:()=>auth.currentUser,transporte:conexoes.administracao});
    return Object.freeze({habilitado:true,projeto,ambiente:producao?'producao':'homologacao'});
  }

  const api={conectarFirebase,integracaoFoiSolicitada:()=>homSolicitada||integracaoSolicitada,criarCliente,transporteLoopback,criarProvedorAppCheck,configurarIntegracaoLocal,conectarFirebaseLocal,integracaoLocalFoiSolicitada:()=>integracaoSolicitada,temIntegracaoLocal:()=>!!integracaoLocal,transporteIntegrado(servico){const conexao=homSolicitada?integracaoHom:integracaoLocal;if(!conexao||!conexao[servico])throw erro(homSolicitada?'HOMOLOGACAO_DESATIVADA':'INTEGRACAO_LOCAL_DESATIVADA',503);return conexao[servico];},configurar(opcoes){if(cliente)throw erro('CLIENTE_JA_CONFIGURADO',409);cliente=criarCliente(opcoes);return cliente;},exigir(){if(!cliente)throw erro('V004_DESATIVADA',503);return cliente;}};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.InterligaAdministracaoV004=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
