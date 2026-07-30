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
    authMod.onAuthStateChanged(authPassageiro, (user) => {
      if (user) {
        _loginEmAndamento = false; // login confirmado — limpa a flag
        meuPassageiroId = user.uid;
        window.meuPassageiroId = user.uid;
        verificarCadastroPassageiro();
      } else {
        meuPassageiroId = null;
        window.meuPassageiroId = null;
        setTimeout(() => {
          if (meuPassageiroId) return; // sessão restaurou, ignora
          if (_loginEmAndamento) return; // login em andamento, não redireciona
          if (localStorage.getItem('interliga_papel') === 'passageiro') {
            const telaAtual = state.currentScreen;
            if (telaAtual !== 'screen-login-passageiro' &&
                telaAtual !== 'screen-cadastro-passageiro' &&
                telaAtual !== 'screen-role-choice') {
              go('screen-login-passageiro');
            }
          }
        }, 800);
      }
    });
  } catch (e) {
    console.warn('Firebase não disponível — app funciona em modo local:', e);
    firebaseReady = false;
    alert('⚠️ Erro ao conectar no Firebase:\n\n' + (e.message || e) + '\n\nManda esse texto pro suporte.');
  }
}
