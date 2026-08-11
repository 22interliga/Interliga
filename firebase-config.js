// ═══════════════════════════════════════
// INTERLIGA — Configuração central do Firebase
// firebase-config.js — ÚNICO lugar pra trocar projeto ou versão do SDK.
// ═══════════════════════════════════════

// SDK carregado por import ESTÁTICO (antes era import() dinâmico, que travava/
// demorava no site publicado por causa do service worker — mesmo problema que
// dava no login do admin). Estático = carrega junto com o módulo, rápido e confiável.
// OBS: import estático exige a URL literal, então a versão do SDK fica fixa aqui.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import * as fb from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import * as authMod from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export const FIREBASE_SDK = '10.12.0';

export const firebaseConfig = {
  apiKey: "AIzaSyAENmAi_4xE4jjcSGi4tAu9LlEafHEbKHc",
  authDomain: "interliga-mobilidade.firebaseapp.com",
  projectId: "interliga-mobilidade",
  storageBucket: "interliga-mobilidade.firebasestorage.app",
  messagingSenderId: "1071971171958",
  appId: "1:1071971171958:web:b04980bd1abd4dcc7c2957"
};

// Mesma assinatura de antes: retorna { app, db, auth, fb, authMod }.
// Continua async pra não quebrar quem faz `await carregarFirebase(...)`,
// mas agora resolve na hora (os módulos já estão carregados).
export async function carregarFirebase(nomeApp) {
  const app = initializeApp(firebaseConfig, nomeApp);
  const db = fb.getFirestore(app);
  const auth = authMod.getAuth(app);
  return { app, db, auth, fb, authMod };
}
