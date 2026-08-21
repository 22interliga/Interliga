// ============================================================
// NAVEGAÇÃO
// ============================================================
export function attachAddressAutocomplete(inputEl, onSelect, suggestionsBoxParam) {
export function go(screenId) {

  const next = document.getElementById(screenId);

  if (!next) {
    console.warn('[go] Tela não encontrada:', screenId);
    return;
  }

  const current =
    document.querySelector('.screen[data-active="true"]');

  if (current === next) return;

  if (current) {
    current.removeAttribute('data-active');
  }

  next.setAttribute('data-active', 'true');

  if (typeof state !== 'undefined') {
    state.currentScreen = screenId;
  }

  // Executa ações específicas ao entrar em cada tela
  if (screenId === 'screen-home') {
    if (typeof onEnterHome === 'function') {
      onEnterHome();
    }
  }

  if (screenId === 'screen-ride') {
    if (typeof onEnterRide === 'function') {
      onEnterRide();
    }
  }

  if (screenId === 'screen-schedule') {
    if (typeof onEnterSchedule === 'function') {
      onEnterSchedule();
    }
  }

  if (screenId === 'screen-food-list') {
    if (typeof window.renderRestaurantList === 'function') {
      window.renderRestaurantList();
    }
  }

  if (screenId === 'screen-trips') {
    if (typeof renderTripsScreen === 'function') {
      renderTripsScreen();
    }
  }
}


// ============================================================
// AUTOCOMPLETE DE ENDEREÇO
// ============================================================

export function attachAddressAutocomplete(
  inputEl,
  onSelect,
  suggestionsBoxParam
) {

  const suggestionsBox =
    suggestionsBoxParam ||
    inputEl
      .closest('.form-card')
      ?.querySelector('.address-suggestions');

  if (!suggestionsBox) return;

  const jaTemBotaoProprio =
    inputEl.parentElement
      ?.querySelector('.stop-remove');

  let btnLimpar = null;

  if (!jaTemBotaoProprio) {

    btnLimpar =
      document.createElement('span');

    btnLimpar.className =
      'address-clear-btn';

    btnLimpar.textContent = '✕';

    inputEl.insertAdjacentElement(
      'afterend',
      btnLimpar
    );
  }


  function atualizarVisibilidadeLimpar() {

    if (btnLimpar) {

      btnLimpar.style.display =
        inputEl.value.trim()
          ? 'flex'
          : 'none';
    }
  }


  atualizarVisibilidadeLimpar();


  if (btnLimpar) {

    btnLimpar.addEventListener(
      'click',
      () => {

        inputEl.value = '';

        atualizarVisibilidadeLimpar();

        suggestionsBox
          .classList
          .remove('is-open');

        onSelect(null);

        inputEl.focus();
      }
    );
  }


  const search =
    debounce(
      async () => {

        const termo =
          inputEl.value;

        const results =
          await buscarEnderecos(termo);

        if (results.length === 0) {

          suggestionsBox
            .classList
            .remove('is-open');

          suggestionsBox.innerHTML = '';

          return;
        }

        suggestionsBox.innerHTML =
          results.map(
            (r, i) =>
              `<div class="suggestion-item" data-idx="${i}">${r.texto}</div>`
          ).join('');

        suggestionsBox
          .classList
          .add('is-open');

        suggestionsBox._results =
          results;

        suggestionsBox._activeInput =
          inputEl;

      },
      400
    );


  inputEl.addEventListener(
    'focus',
    () => {

      suggestionsBox._activeInput =
        inputEl;
    }
  );


  inputEl.addEventListener(
    'input',
    () => {

      search();

      atualizarVisibilidadeLimpar();
    }
  );


  inputEl.addEventListener(
    'blur',
    () => {

      setTimeout(
        () => {

          const textoAtual =
            inputEl.value.trim();

          if (
            textoAtual &&
            textoAtual.length >= 3
          ) {

            const resultAtual =
              suggestionsBox
                ._results
                ?.find(
                  r =>
                    r.texto ===
                    textoAtual
                );

            if (!resultAtual) {

              onSelect({
                texto: textoAtual,
                lat: null,
                lon: null
              });
            }
          }

          suggestionsBox
            .classList
            .remove('is-open');

        },
        200
      );
    }
  );


  suggestionsBox.addEventListener(
    'click',
    (e) => {

      const item =
        e.target.closest(
          '.suggestion-item'
        );

      if (!item) return;

      if (
        suggestionsBox._activeInput
        !== inputEl
      ) {
        return;
      }

      const idx =
        parseInt(
          item.dataset.idx,
          10
        );

      const result =
        suggestionsBox
          ._results[idx];

      inputEl.value =
        result.texto;

      suggestionsBox
        .classList
        .remove('is-open');

      atualizarVisibilidadeLimpar();

      onSelect(result);
    }
  );


  const containerPai =
    inputEl.closest('.form-card') ||
    inputEl.closest('.address-field') ||
    inputEl.parentElement;


  document.addEventListener(
    'click',
    (e) => {

      if (
        containerPai &&
        !containerPai.contains(e.target)
      ) {

        suggestionsBox
          .classList
          .remove('is-open');
      }
    }
  );
}


// ============================================================
// CRIAR CORRIDA NO FIRESTORE
// ============================================================

async function criarCorrida(
  origem,
  destino,
  preco,
  categoria,
  precoOriginal
) {

  // Nunca deixa undefined ir para o Firestore
  origem = origem || {};
  destino = destino || {};

  const origemLat =
    typeof origem.lat === 'number'
      ? origem.lat
      : null;

  const origemLon =
    typeof origem.lon === 'number'
      ? origem.lon
      : null;

  const destinoLat =
    typeof destino.lat === 'number'
      ? destino.lat
      : null;

  const destinoLon =
    typeof destino.lon === 'number'
      ? destino.lon
      : null;


  const cidade =
    origemLat !== null &&
    origemLon !== null

      ? detectarCidade(
          origemLat,
          origemLon
        )

      : (
          state.passageiroDados
            ?.cidade ||
          'madre'
        );


  const precoCheio =
    (
      precoOriginal !== undefined &&
      precoOriginal !== null
    )
      ? precoOriginal
      : preco;


  const cashbackUsado =
    Math.min(
      Number(
        state.cashbackAplicado || 0
      ),
      precoCheio
    );


  const descontoCupomValor =
    Math.max(
      0,
      precoCheio -
      preco -
      cashbackUsado
    );


  const corridaLocal = {

    origem:
      origem.texto || '',

    destino:
      destino.texto || '',

    origemLat,
    origemLon,

    destinoLat,
    destinoLon,

    preco,

    precoOriginal:
      precoCheio,

    categoria,

    cidade,

    cupomCodigo:
      state.cupomAplicado
        ?.codigo ||
      null,

    descontoCupomValor,

    cashbackUsado,

    formaPagamento:
      state.formaPagamento ||
      'pix',

    passageiroId:
      meuPassageiroId ||
      null,

    passageiroNome:
      localStorage.getItem(
        'interliga_pax_nome'
      ) ||
      'Passageiro',

    status:
      'aguardando',

    criadoEm:
      new Date()
        .toISOString(),
  };


  // ============================================================
  // HISTÓRICO LOCAL
  // ============================================================

  const historico =
    getStorageJSON(
      'interliga_corridas',
      []
    );


  const localId =
    'local-' +
    Date.now();


  historico.unshift({
    ...corridaLocal,
    id: localId
  });


  setStorageJSON(
    'interliga_corridas',
    historico.slice(0, 50)
  );


  state.corridaId =
    localId;

  state.corridaLocalId =
    localId;


  // ============================================================
  // FIREBASE
  // ============================================================

  if (
    firebaseReady &&
    db
  ) {

    try {

      const docRef =
        await fb.addDoc(
          fb.collection(
            db,
            'corridas'
          ),
          {
            ...corridaLocal,

            criadoEm:
              fb.serverTimestamp(),
          }
        );


      state.corridaId =
        docRef.id;


      // ========================================================
      // CUPOM
      // ========================================================

      if (
        state.cupomAplicado
          ?.id
      ) {

        fb.updateDoc(
          fb.doc(
            db,
            'cupons',
            state.cupomAplicado.id
          ),
          {
            usosAtuais:
              fb.increment(1),
          }
        )
        .catch(
          (e) =>
            console.warn(
              '[passageiro] erro ao registrar uso do cupom:',
              e
            )
        );
      }


      // ========================================================
      // CASHBACK UTILIZADO
      // ========================================================

      if (
        cashbackUsado > 0 &&
        meuPassageiroId
      ) {

        lancarCarteira(
          meuPassageiroId,

          -cashbackUsado,

          'Cashback usado numa corrida',

          docRef.id
        );
      }


      // ========================================================
      // SALVA CORRIDA ATIVA
      // ========================================================

      localStorage.setItem(
        'interliga_corrida_ativa',

        JSON.stringify({
          corridaId:
            docRef.id,

          origem:
            origem.texto || '',

          destino:
            destino.texto || '',

          preco,

          categoria,

          criadoEm:
            Date.now(),
        })
      );


      // ========================================================
      // FILA DE MOTORISTAS
      // ========================================================

      try {

        const fila =
          await montarFilaPrioridade(
            {
              texto:
                origem.texto || '',

              lat:
                origemLat,

              lon:
                origemLon
            },

            cidade,

            categoria
          );


        if (
          fila.length > 0
        ) {

          await fb.updateDoc(
            docRef,
            {
              filaMotoristas:
                fila,

              filaIndiceAtual:
                0,

              motoristaAlvoAtual:
                fila[0],

              ofertaExpiraEm:
                Date.now() +
                15000,
            }
          );
        }


      } catch (e) {

        console.warn(
          '[passageiro] erro ao montar fila de prioridade, seguindo em modo aberto:',
          e
        );
      }


      // ========================================================
      // MONITORES DA CORRIDA
      // ========================================================

      ouvirAceiteCorrida(
        docRef.id
      );

      iniciarFilaWatchdog(
        docRef.id
      );

      iniciarMonitorNativo(
        docRef.id
      );

      sincronizarRotaNoFirebase();


    } catch (e) {

      console.warn(
        'Erro ao salvar corrida no Firebase, seguindo apenas local:',
        e
      );

      simularBuscaLocal();
    }


  } else {

    simularBuscaLocal();
  }
}
