// Future Web/WebView ingress. No IAM token, persistence, fallback or retry.
import {criarFetchEntradaCmd119} from './entrada-cliente-cmd119.mjs';
import {CONFIG_INGRESSO_V004} from './gateway-producao-config.mjs';
const ENTRADA='https://us-central1-interliga-mobilidade.cloudfunctions.net/entradaMobilidadeCmd119';
const V004=new Set(['administracao/contexto','administracao/pagina','administracao/revisao','administracao/resultado','administracao/comando','administracao/aceites/gate','privacidade/indicacao','privacidade/cadastro','privacidade/apresentacao'].map(p=>'/mobilidade-v004/'+p));
export function conectarIngressoV004Cmd125({app,auth,appCheck,appCheckMod,cliente,config=CONFIG_INGRESSO_V004,fetchFn=globalThis.fetch}={}){
 if(config?.habilitado!==true)return Object.freeze({habilitado:false});
 if(globalThis.location?.origin!=='https://interliga.app.br'||app?.options?.projectId!=='interliga-mobilidade'||app.options.appId!=='1:1071971171958:web:b04980bd1abd4dcc7c2957'||auth?.app!==app||appCheck?.app!==app||typeof appCheckMod?.getToken!=='function'||typeof cliente?.conectarFirebase!=='function')throw Error('CONTEXTO_INGRESSO_INVALIDO');
 const enviar=criarFetchGatewayCmd125({...config,fetchFn});
 return cliente.conectarFirebase({app,auth,appCheck,appCheckMod,fetch:enviar});
}
export function criarFetchGatewayCmd125({urlGateway,publicacaoConfirmada=false,rotas,fetchFn=globalThis.fetch}={}){
 const gateway=new URL(urlGateway);
 if(publicacaoConfirmada!==true||gateway.protocol!=='https:'||!gateway.hostname.endsWith('.gateway.dev')||gateway.port||gateway.username||gateway.password||gateway.pathname!=='/'||gateway.search||gateway.hash||typeof fetchFn!=='function')throw Error('GATEWAY_REAL_NAO_CONFIRMADO');
 if(!Array.isArray(rotas)||!rotas.length||new Set(rotas).size!==rotas.length||rotas.some(p=>!V004.has(p)&&p!=='/consultarCarteiraMotorista'))throw Error('ROTAS_NAO_SELECIONADAS');
 const selecionadas=new Set(rotas);
 return criarFetchEntradaCmd119({base:ENTRADA,publicacaoConfirmada:true,fetchFn:async(input,opcoes)=>{
  const u=new URL(input),p=u.pathname.slice(new URL(ENTRADA).pathname.length),h=new Headers(opcoes.headers);
  if(!selecionadas.has(p)||opcoes.method!==(V004.has(p)?'POST':'GET')||h.has('x-forwarded-authorization')||h.has('x-apigateway-api-userinfo')||h.has('x-goog-iap-jwt-assertion'))throw Error('CONTRATO_GATEWAY_INVALIDO');
  if(V004.has(p)&&!h.get('x-firebase-appcheck'))throw Error('APPCHECK_OBRIGATORIO');
  const target=new URL(p,gateway);target.search=u.search;
  return fetchFn(target.href,opcoes); // One request, preserving the original body and command id.
 }});
}
