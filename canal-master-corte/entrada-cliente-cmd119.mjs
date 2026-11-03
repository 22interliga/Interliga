// Opt-in fetch adapter for the existing approved clients. No token storage, IAM credential or retry.
const OLD='https://us-central1-interliga-mobilidade.cloudfunctions.net/transporteMobilidadeCmd111';
const PLANNED='https://us-central1-interliga-mobilidade.cloudfunctions.net/entradaMobilidadeCmd119';
export function criarFetchEntradaCmd119({base,publicacaoConfirmada=false,fetchFn=globalThis.fetch}={}){
 if(base!==PLANNED||publicacaoConfirmada!==true||typeof fetchFn!=='function')throw Error('ENTRADA_NAO_PUBLICADA');
 return async(input,options={})=>{
  if(typeof input!=='string')throw Error('URL_INVALIDA');
  const u=new URL(input);if(!u.href.startsWith(OLD+'/')||u.username||u.password||u.hash)throw Error('DESTINO_INVALIDO');
  const headers=new Headers(options.headers);
  if(headers.has('x-serverless-authorization')||!/^Bearer \S+$/i.test(headers.get('authorization')||''))throw Error('AUTENTICACAO_CLIENTE_INVALIDA');
  return fetchFn(base+u.href.slice(OLD.length),{...options,headers,redirect:'error',cache:'no-store',credentials:'omit'});
 };
}
