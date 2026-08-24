/**
 * Guarda de sessão das páginas restritas — some com o "flash" de conteúdo.
 *
 * O problema: a verificação de sessão é feita em JavaScript DEPOIS que o HTML já
 * pintou. Medindo enquanto a URL ainda era /dashboard.html, um visitante anônimo
 * chegava a ver ~1.100 caracteres da própria página antes de ser mandado ao
 * login. Nenhum dado de membro vaza nesse instante — quem impede isso é o RLS no
 * banco, não esta tela — mas a piscada dá a impressão de site quebrado.
 *
 * O que este arquivo faz: esconde o conteúdo antes de qualquer pintura e só o
 * revela depois que a sessão foi confirmada. Sem sessão, redireciona.
 *
 * COMO USAR — no <head> da página restrita, ANTES de qualquer conteúdo:
 *
 *     <script src="/js/guarda-sessao.js"></script>
 *
 * A ordem em relação a supabase-config.js não importa: este arquivo espera o
 * cliente aparecer. As funções checkSession() que já existem em cada página
 * continuam valendo — esta guarda é a camada que roda antes delas.
 *
 * O estilo que esconde é injetado POR JAVASCRIPT, de propósito. Se estivesse no
 * HTML, um navegador com JS desligado ficaria numa página em branco para sempre;
 * do jeito que está, ele simplesmente vê o HTML (que não contém dado nenhum de
 * membro — os dados só chegam via Supabase, que exige sessão).
 */
(function () {
  'use strict';

  var CLASSE = 'sessao-pendente';
  var LIMITE_MS = 12000;
  var raiz = document.documentElement;

  var estilo = document.createElement('style');
  estilo.id = 'estilo-guarda-sessao';
  // visibility, e nao display:none: o box de layout continua existindo, entao
  // widgets que medem tamanho no carregamento (o FullCalendar, por exemplo)
  // calculam as dimensoes certas em vez de renderizar com altura zero.
  estilo.textContent = '.' + CLASSE + ' body { visibility: hidden !important; }';
  (document.head || raiz).appendChild(estilo);
  raiz.classList.add(CLASSE);

  function revelar() {
    raiz.classList.remove(CLASSE);
  }

  /**
   * Manda para o login UMA VEZ SÓ.
   *
   * Cada página restrita tem a sua própria checkSession() que também
   * redireciona. Com as duas disparando, o navegador recebe duas navegações
   * concorrentes e aborta a primeira — no Firefox isso vira NS_BINDING_ABORTED e
   * a pessoa fica parada numa página em branco. O sinalizador abaixo faz a
   * primeira chamada vencer e as seguintes não fazerem nada.
   *
   * Fica em window para que o código de cada página possa consultá-lo:
   *
   *     if (!session) return window.guardaSessao.irParaLogin();
   */
  function paraOLogin() {
    if (window.guardaSessao.indoParaLogin) return;
    window.guardaSessao.indoParaLogin = true;
    // replace, e nao href: o botao "voltar" nao deve trazer de volta para uma
    // pagina restrita que ja recusou a entrada.
    window.location.replace('login.html');
  }

  window.guardaSessao = {
    indoParaLogin: false,
    irParaLogin: paraOLogin
  };

  function esperarCliente(prazo) {
    return new Promise(function (resolve) {
      var limite = Date.now() + prazo;
      (function tentar() {
        if (window.supabaseClient) return resolve(window.supabaseClient);
        if (Date.now() > limite) return resolve(null);
        setTimeout(tentar, 60);
      })();
    });
  }

  async function verificar() {
    var cliente = await esperarCliente(LIMITE_MS);

    // Falha fechado: sem cliente não dá para afirmar que existe sessão, e o certo
    // é mandar para o login em vez de destravar a tela por otimismo.
    if (!cliente) {
      console.error('[guarda-sessao] Cliente do Supabase não apareceu; indo para o login.');
      return paraOLogin();
    }

    try {
      var resposta = await cliente.auth.getSession();
      if (resposta && resposta.data && resposta.data.session) return revelar();
      paraOLogin();
    } catch (erro) {
      console.error('[guarda-sessao] Falha ao verificar a sessão:', erro);
      paraOLogin();
    }
  }

  verificar();
})();
