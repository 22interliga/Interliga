// ═══════════════════════════════════════
// INTERLIGA — Configuração central do Firebase
// firebase-config.js — ÚNICO lugar pra trocar projeto ou versão do SDK.
// ═══════════════════════════════════════

export const FIREBASE_SDK = '10.12.0';

export const firebaseConfig = {
  apiKey: "AIzaSyAENmAi_4xE4jjcSGi4tAu9LlEafHEbKHc",
  authDomain: "interliga-mobilidade.firebaseapp.com",
  projectId: "interliga-mobilidade",
  storageBucket: "interliga-mobilidade.firebasestorage.app",
  messagingSenderId: "1071971171958",
  appId: "1:1071971171958:web:b04980bd1abd4dcc7c2957"
};

export async function carregarFirebase(nomeApp) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const fb = await import(`${base}/firebase-firestore.js`);
  const authMod = await import(`${base}/firebase-auth.js`);

  const app = initializeApp(firebaseConfig, nomeApp);
  const db = fb.getFirestore(app);
  const auth = authMod.getAuth(app);

  return { app, db, auth, fb, authMod };
}
