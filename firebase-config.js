// ═══════════════════════════════════════
// INTERLIGA — Configuração central do Firebase
// firebase-config.js — ÚNICO lugar pra trocar projeto ou versão do SDK.
// ═══════════════════════════════════════

export const FIREBASE_SDK = '10.12.0';

export const firebaseConfig = {
  apiKey: "AIzaSyAAwR-TwQlWIgR4hBRjWtjfm_qFSkultUY",
  authDomain: "interliga-app.firebaseapp.com",
  projectId: "interliga-app",
  storageBucket: "interliga-app.firebasestorage.app",
  messagingSenderId: "913895237568",
  appId: "1:913895237568:web:faad95e8af089150e54a25",
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
