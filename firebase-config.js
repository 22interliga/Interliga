async function initFirebase() {
  try {
    const { app, db: _db, auth, fb: _fb, authMod } = await carregarFirebase('interliga-passageiro');
    fb = _fb;
    authModRef = authMod;
    fbAppInstancia = app;
    db = _db;
    authPassageiro = auth;

    firebaseReady = true;
    console.log('✅ Firebase conectado');

    // Expõe pro food.js usar — são módulos separados (sem import circular entre eles)
    window.db = db;
    window.fb = fb;
    window.firebaseReady = true;

    // Login real (e-mail/senha) — quando já tem sessão salva, entra direto sem pedir senha de novo.
    // Quando não tem (ou deslogou), mostra a tela de login pra quem já escolheu ser passageiro.
    authMod.onAuthStateChanged(authPassageir
