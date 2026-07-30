async function initFirebase() {
  try {
    const { app, db: _db, auth, fb: _fb, authMod } = await carregarFirebase('interliga-motorista');
    fb = _fb;
    authModRef = authMod;
    fbAppInstancia = app;
    db = _db;
    authMotorista = auth;

    firebaseReady = true;
    console.log('Firebase conectado (motorista)');

    // Login real (e-mail/senha) — com sessão salva, entra direto. Sem sessão, pede login.
    authMod.onAuthStateChanged(authMotorista, (user) => {
      if (user) {
        meuMotoristaId = user.uid;
        verificarCadastroMotorista();
      } else {
        meuMotoristaId = null;
        // Aguarda 800ms antes de redirecionar pro login
        // Isso evita o loop quando o app volta de outra aba ou é reaberto
        // (o Firebase demora um pouco pra restaurar a sessão)
        setTimeout(() => {
          if (meuMotoristaId) return; // sessão restaurou nesse tempo, ignora
          const telaAtual = document.querySelector('.screen[data-active="true"]')?.id;
          const processandoLogin = document.getElementById('btn-fazer-login-motorista')?.disabled;
          if (!processandoLogin &&
              telaAtual !== 'screen-cadastro-motorista' &&
              telaAtual !== 'screen-login-motorista') {
            go('screen-login-motorista');
          }
        }, 800);
      }
    });
  } catch (e) {
    console.warn('Firebase nao disponivel:', e);
    firebaseReady = false;
    alert('⚠️ Erro ao conectar no Firebase:\n\n' + (e.message || e) + '\n\nManda esse texto pro suporte.');
    meuMotoristaId = obterMotoristaIdReserva();
    go('screen-home'); // modo totalmente offline — libera a Home sem cadastro, já que não tem como verificar nada
  }
}
