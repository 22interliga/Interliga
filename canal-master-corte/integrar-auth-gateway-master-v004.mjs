import {inicializarAppCheckCmd133} from './appcheck-integracao-cmd133.mjs';
import {conectarIngressoV004Cmd125} from './entrada-gateway-cmd125.mjs';
import {criarCanalMasterCorteV004} from './canal-master-corte-v004.mjs';
const ORIGEM='https://interliga.app.br',PROJETO='interliga-mobilidade';
const APP='1:1071971171958:web:b04980bd1abd4dcc7c2957';
const GATEWAY='https://interliga-v004-dogfyhyu.uc.gateway.dev';
const ROTAS=Object.freeze(['/mobilidade-v004/administracao/contexto','/mobilidade-v004/administracao/aceites/gate']);
// Actual SDK instances and normal Firebase user only. No browser session extraction or IAM credential.
export function conectarSessaoMasterProdutiva({app,auth,appCheck,appCheckMod,api,
 resolverProva,reciboCoorte,habilitado=false,fetchFn=globalThis.fetch}={}){
 if(habilitado!==true)return Object.freeze({habilitado:false});
 if(globalThis.location?.origin!==ORIGEM||app?.options?.projectId!==PROJETO||app.options.appId!==APP||auth?.app!==app||
  !auth.currentUser?.uid||auth.currentUser.isAnonymous===true)throw Error('SESSAO_PRODUTIVA_REAL_OBRIGATORIA');
 if(!reciboCoorte||reciboCoorte.comprovada!==true||reciboCoorte.projeto!==PROJETO||
  typeof reciboCoorte.id!=='string'||!reciboCoorte.id.length||!Number.isFinite(Date.parse(reciboCoorte.validadoEm))||
  Date.now()-Date.parse(reciboCoorte.validadoEm)>900000||Date.parse(reciboCoorte.validadoEm)>Date.now()+30000)
  throw Error('RECIBO_ATUAL_COORTE_OBRIGATORIO');
 if(typeof api?.conectarFirebase!=='function'||typeof api?.integracaoFoiSolicitada!=='function'||api.integracaoFoiSolicitada())
  throw Error('CLIENTE_AUSENTE_OU_JA_CONECTADO_USAR_CANAL_EXISTENTE');
 const config=Object.freeze({habilitado:true,ambiente:'producao',projeto:PROJETO,origem:ORIGEM,
  base:'https://us-central1-interliga-mobilidade.cloudfunctions.net/transporteMobilidadeCmd111/mobilidade-v004',
  appIdsPermitidos:Object.freeze([APP])});
 if(!appCheck){
  const cfg=Object.freeze({habilitado:true,aprovado:true,urlGateway:GATEWAY,publicacaoConfirmada:true,origem:ORIGEM,appId:APP,
   siteKey:'0x4AAAAAAFuXeZQEg_rv7BeQ',compatibilidadeDistribuidaConfirmada:true,reciboCompatibilidade:reciboCoorte.id});
  appCheck=inicializarAppCheckCmd133({app,auth,appCheckMod,config:cfg,resolverProva,fetchFn}).appCheck;
 }
 if(appCheck?.app!==app||typeof appCheckMod?.getToken!=='function')throw Error('APPCHECK_DA_MESMA_APP_OBRIGATORIO');
 const ligado=conectarIngressoV004Cmd125({app,auth,appCheck,appCheckMod,fetchFn,
  config:Object.freeze({habilitado:true,publicacaoConfirmada:true,urlGateway:GATEWAY,rotas:ROTAS}),
  cliente:{conectarFirebase:op=>api.conectarFirebase({...op,config})}});
 if(ligado?.habilitado!==true)throw Error('INGRESSO_NAO_CONECTADO');
 return criarCanalMasterCorteV004({app,auth,api,habilitado:true});
}
