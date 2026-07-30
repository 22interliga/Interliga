// ═══════════════════════════════════════
// INTERLIGA — Configuração central do Firebase
// firebase-config.js — ÚNICO lugar pra trocar projeto ou versão do SDK.
// app.js, motorista.js, admin, painel-comerciante importam daqui
// em vez de repetir a config. (food.js NÃO precisa mudar — ele usa
// o window.db/window.fb que o app.js já expõe.)
// ═══════════════════════════════════════

// Versão do SDK — troca aqui e atualiza em todos os arquivos de uma vez.
export const FIREBASE_SDK = '10.12.0';

// ─────────────────────────────────────
// PROJETO ATUAL DO FIREBASE
// Pra migrar o app pro projeto novo, é SÓ trocar este objeto por inteiro.
// (Console → Configurações do projeto → Seus apps → app Web → firebaseConfig)
// A apiKey do Firebase Web é pública por design — quem protege os dados
// são as Regras do Firestore, não essa chave.
// ─────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyAAwR-TwQlWIgR4hBRjWtjfm_qFSkultUY",
  authDomain: "interliga-app.firebaseapp.com",
  projectId: "interliga-app",
  storageBucket: "interliga-app.firebasestorage.app",
  messagingSenderId: "913895237568",
  appId: "1:913895237568:web:faad95e8af089150e54a25",
};

// ─────────────────────────────────────
// CARREGADOR ÚNICO
// Importa o SDK dinamicamente (nunca bloqueia o app se a rede falhar),
// inicializa o app e devolve tudo pronto. Cada arquivo passa o SEU nome
// de instância pra manter os apps separados, como já era.
//
// Uso dentro do try do initFirebase():
//   import { carregarFirebase } from './firebase-config.js';
//   const { app, db, auth, fb, authMod } = await carregarFirebase('interliga-passageiro');
// ─────────────────────────────────────
export async function carregarFirebase(nomeApp) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const fb = await import(`${base}/firebase-firestore.js`);   // módulo do Firestore (getFirestore, onSnapshot, collection...)
  const authMod = await import(`${base}/firebase-auth.js`);   // módulo do Auth (getAuth, onAuthStateChanged...)

  const app = initializeApp(firebaseConfig, nomeApp);
  const db = fb.getFirestore(app);
  const auth = authMod.getAuth(app);

  return { app, db, auth, fb, authMod };
}
