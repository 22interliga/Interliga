import {criarGetTokenCmd132} from './appcheck-custom-cliente-cmd132.mjs';
import {CONFIG_APPCHECK_V004} from './gateway-producao-config.mjs';
// Caller must supply the SAME Firebase app/auth/module instances from its only bootstrap.
export function inicializarAppCheckCmd133({app,auth,appCheckMod,config=CONFIG_APPCHECK_V004,resolverProva,fetchFn}={}){
 if(config?.habilitado!==true)return Object.freeze({habilitado:false});
 if(config.compatibilidadeDistribuidaConfirmada!==true||typeof config.reciboCompatibilidade!=='string'||!config.reciboCompatibilidade.length||
 typeof appCheckMod?.CustomProvider!=='function'||typeof appCheckMod?.initializeAppCheck!=='function')
  throw Error('APPCHECK_NAO_LIBERADO');
 const getToken=criarGetTokenCmd132({app,auth,config,resolverProva,fetchFn});
 // SDK rejects a second incompatible initialization; never delete/reset Auth to recover.
 const provider=new appCheckMod.CustomProvider({getToken});
 const appCheck=appCheckMod.initializeAppCheck(app,{provider,isTokenAutoRefreshEnabled:false});
 return Object.freeze({habilitado:true,appCheck});
}
export function criarResolvedorWidgetCmd133({turnstile,container,timeoutMs=300000}={}){
 if(typeof turnstile?.render!=='function'||typeof turnstile?.remove!=='function'||!container||
 !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000)throw Error('WIDGET_REAL_AUSENTE');
 let emCurso=false;
 return async({siteKey,action,cData})=>{
  if(emCurso)throw Error('DESAFIO_EM_ANDAMENTO');
  if(typeof siteKey!=='string'||!siteKey.length||action!=='interliga_appcheck'||!/^[a-f0-9]{64}$/.test(cData))throw Error('DESAFIO_INVALIDO');
  emCurso=true;let id,timer;
  try{
   return await new Promise((resolve,reject)=>{
    let concluido=false;
    const fim=(err,token)=>{if(concluido)return;concluido=true;
     if(err)reject(Error('WIDGET_NAO_COMPROVADO'));
     else if(typeof token==='string'&&token.length&&token.length<=2048)resolve(token);
     else reject(Error('WIDGET_NAO_COMPROVADO'));
    };
    timer=setTimeout(()=>fim(true),timeoutMs);
    try{id=turnstile.render(container,{sitekey:siteKey,action,cData,callback:t=>fim(false,t),
      'error-callback':()=>fim(true),'expired-callback':()=>fim(true),'timeout-callback':()=>fim(true),
      'retry':'never','refresh-expired':'never','refresh-timeout':'never'});}
    catch{fim(true);}
   });
  }finally{clearTimeout(timer);emCurso=false;if(id!==undefined)try{turnstile.remove(id);}catch{}}
 };
}