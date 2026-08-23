/**
 * ============================================================================
 * BALAÚSTRE BOT — camada de tela
 * ============================================================================
 *
 * Módulo ES: importa o sanitizador diretamente, de modo que a MESMA
 * implementação que roda aqui é a que a função serverless importa do outro
 * lado. Duas cópias de uma regra de sigilo divergiriam com o tempo, e a
 * divergência apareceria como um vazamento.
 *
 * Os manipuladores usados por `onclick=` são pendurados em `window` no fim do
 * arquivo: dentro de um módulo, as funções não entram no escopo global
 * sozinhas, e os botões da página não as encontrariam.
 */

import { sanitizar, MARCA_SUPRESSAO } from './balaustre-sanitizer.js';

const CHAVE_RASCUNHO = 'balaustre:rascunho';

const estado = {
  usuario: null,
  token: null,
  temAcesso: false,
  passo: 1,
  sanitizado: null,
  minuta: ''
};

// ==========================================================================
// UTILIDADES
// ==========================================================================

function $(id) {
  return document.getElementById(id);
}

function esc(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let timerAviso = null;
function avisar(texto, tipo) {
  const el = $('aviso');
  const cores = {
    ok: 'bg-emerald-500 text-black',
    erro: 'bg-red-500 text-white',
    info: 'bg-amber-500 text-black'
  };
  el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl font-medium shadow-2xl max-w-[90vw] text-center ' + (cores[tipo] || cores.info);
  el.textContent = texto;
  el.classList.remove('hidden');

  clearTimeout(timerAviso);
  timerAviso = setTimeout(function () { el.classList.add('hidden'); }, 4200);
}

/**
 * Copia para a área de transferência.
 *
 * O caminho antigo com textarea existe porque navigator.clipboard só funciona
 * em contexto seguro: em http://localhost durante o desenvolvimento ele some,
 * e o botão pareceria quebrado justamente para quem está testando.
 */
async function copiar(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (e) { /* cai no método antigo */ }

  try {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const deu = document.execCommand('copy');
    document.body.removeChild(campo);
    return deu;
  } catch (e) {
    return false;
  }
}

/**
 * Entrega um arquivo ao navegador a partir de texto em memória.
 *
 * O `revokeObjectURL` no fim não é zelo decorativo: sem ele, cada download
 * deixaria o conteúdo do Balaústre retido na memória da aba até o recarregamento.
 */
function baixarTexto(nomeArquivo, conteudo, mime) {
  const blob = new Blob([conteudo], { type: (mime || 'text/plain') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// ==========================================================================
// PASSOS
// ==========================================================================

function irParaPasso(numero) {
  estado.passo = numero;

  [1, 2, 3].forEach(function (n) {
    const secao = $('passo' + n);
    const trilha = $('trilha' + n);
    if (secao) secao.classList.toggle('hidden', n !== numero);

    if (trilha) {
      const feito = n < numero;
      const atual = n === numero;
      trilha.className = 'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ' +
        (atual ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
               : feito ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/80'
                       : 'bg-white/5 border-white/5 text-slate-500');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function coletarMetadados() {
  return {
    loja: (window.__SITE_CONFIG__ && window.__SITE_CONFIG__.loja && window.__SITE_CONFIG__.loja.nomeCompleto) || '',
    oriente: $('mdOriente').value,
    numeroSessao: $('mdNumeroSessao').value,
    numeroBalaustre: $('mdNumeroBalaustre').value,
    grau: $('mdGrau').value,
    tipoSessao: $('mdTipoSessao').value,
    data: $('mdData').value,
    horaAbertura: $('mdHoraAbertura').value,
    horaEncerramento: $('mdHoraEncerramento').value,
    tronco: $('mdTronco').value,
    oficiais: $('mdOficiais').value,
    visitantes: $('mdVisitantes').value
  };
}

// ==========================================================================
// RASCUNHO
//
// A transcrição de uma sessão inteira é caro de refazer. Um refresh acidental
// ou uma aba fechada por engano apagariam tudo, então as notas ficam gravadas
// no próprio navegador enquanto o Secretário digita.
// ==========================================================================

function salvarRascunho() {
  try {
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
      notas: $('notas').value,
      metadados: coletarMetadados(),
      em: new Date().toISOString()
    }));
  } catch (e) { /* modo privado ou armazenamento cheio: seguir sem gravar */ }
}

function carregarRascunho() {
  try {
    const cru = localStorage.getItem(CHAVE_RASCUNHO);
    if (!cru) return;

    const dados = JSON.parse(cru);
    if (dados.notas) $('notas').value = dados.notas;

    const m = dados.metadados || {};
    const campos = {
      mdOriente: m.oriente, mdNumeroSessao: m.numeroSessao,
      mdNumeroBalaustre: m.numeroBalaustre, mdGrau: m.grau,
      mdTipoSessao: m.tipoSessao, mdData: m.data,
      mdHoraAbertura: m.horaAbertura, mdHoraEncerramento: m.horaEncerramento,
      mdTronco: m.tronco, mdOficiais: m.oficiais, mdVisitantes: m.visitantes
    };
    Object.keys(campos).forEach(function (id) {
      if (campos[id] && $(id)) $(id).value = campos[id];
    });

    if (dados.notas) {
      avisar('Rascunho recuperado deste navegador.', 'info');
    }
  } catch (e) { /* rascunho corrompido: começar limpo */ }
}

function descartarRascunho() {
  if (!confirm('Descartar o rascunho e limpar os campos?')) return;
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (e) { /* ignora */ }
  window.location.reload();
}

// ==========================================================================
// SUPRESSÃO E ENVIO
// ==========================================================================

function termosExtrasDaLoja() {
  const cru = $('termosExtras') ? $('termosExtras').value : '';
  return cru.split(/[\n,;]+/).map(function (t) { return t.trim(); }).filter(Boolean);
}

/**
 * Passo intermediário obrigatório: mostra ao Secretário exatamente o que sairá
 * do navegador, com as supressões destacadas, e só então libera o envio.
 *
 * A conferência humana é a barreira que importa. O filtro automático erra por
 * excesso de confiança em padrões; o Secretário sabe o que ele mesmo escreveu.
 */
function revisarSupressao() {
  const notas = $('notas').value.trim();
  if (!notas) {
    avisar('Cole ou digite as notas da sessão antes de continuar.', 'erro');
    return;
  }

  const resultado = sanitizar(notas, { termosExtras: termosExtrasDaLoja() });
  estado.sanitizado = resultado;

  $('previaSanitizada').textContent = resultado.texto;

  const painel = $('painelOcorrencias');
  const lista = $('listaOcorrencias');

  if (resultado.houveSupressao) {
    painel.classList.remove('hidden');
    $('contagemSupressoes').textContent = resultado.ocorrencias.length;

    // O trecho original aparece só aqui, na tela do Secretário, para ele
    // conferir o que foi coberto. Este dado nunca entra no que é enviado.
    lista.innerHTML = resultado.ocorrencias.map(function (o) {
      return '<li class="border-l-2 border-red-500/40 pl-3 py-1">' +
             '<p class="text-[10px] uppercase tracking-widest text-red-400/80 font-bold">' + esc(o.regras.join(' + ')) + '</p>' +
             '<p class="text-slate-500 text-xs mt-0.5 line-through">' + esc(o.trecho.slice(0, 160)) + '</p>' +
             '</li>';
    }).join('');
  } else {
    painel.classList.add('hidden');
    lista.innerHTML = '';
  }

  $('confirmacaoEnvio').checked = false;
  $('modalRevisao').classList.remove('hidden');
}

function fecharRevisao() {
  $('modalRevisao').classList.add('hidden');
}

async function gerarMinuta() {
  if (!$('confirmacaoEnvio').checked) {
    avisar('Confirme que revisou o texto suprimido antes de enviar.', 'erro');
    return;
  }
  if (!estado.sanitizado) {
    avisar('Revise a supressão antes de gerar.', 'erro');
    return;
  }

  const botao = $('botaoGerar');
  botao.disabled = true;
  botao.textContent = 'Redigindo...';

  try {
    const resposta = await fetch('/api/balaustre/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + estado.token
      },
      body: JSON.stringify({
        metadados: coletarMetadados(),
        notas: estado.sanitizado.texto
      })
    });

    const dados = await resposta.json().catch(function () { return {}; });

    if (!resposta.ok) {
      throw new Error(dados.erro || ('O servidor respondeu ' + resposta.status + '.'));
    }

    estado.minuta = dados.minuta || '';
    $('editorMinuta').value = estado.minuta;
    fecharRevisao();
    irParaPasso(3);
    avisar('Minuta redigida. Revise antes de levar à aprovação.', 'ok');
  } catch (erro) {
    avisar(erro.message, 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Gerar minuta';
  }
}

// ==========================================================================
// SAÍDAS DO PASSO 3
// ==========================================================================

function nomeArquivo(extensao) {
  const numero = $('mdNumeroBalaustre').value.trim() || 's-n';
  const data = $('mdData').value || new Date().toISOString().slice(0, 10);
  return 'balaustre-' + numero + '-' + data + '.' + extensao;
}

async function copiarMinuta() {
  const deu = await copiar($('editorMinuta').value);
  avisar(deu ? 'Balaústre copiado.' : 'Não consegui copiar.', deu ? 'ok' : 'erro');
}

function baixarTxt() {
  baixarTexto(nomeArquivo('txt'), $('editorMinuta').value, 'text/plain');
}

function baixarMarkdown() {
  baixarTexto(nomeArquivo('md'), $('editorMinuta').value, 'text/markdown');
}

/**
 * Imprime só o Balaústre, em A4.
 *
 * O texto é jogado num contêiner próprio que o CSS de impressão revela,
 * escondendo o resto da página. Uma janela nova seria bloqueada pelo
 * navegador como pop-up em boa parte dos casos, e o Secretário veria o botão
 * não fazer nada.
 */
function imprimirMinuta() {
  $('areaImpressao').textContent = $('editorMinuta').value;
  window.print();
}

// ==========================================================================
// SESSÃO E CONTROLE DE ACESSO
// ==========================================================================

/** Cargos que redigem ou assinam o Balaústre. Espelha o gate do banco. */
const CARGOS_SECRETARIA = ['secretario', 'veneravel mestre', 'orador'];

function normalizarCargo(valor) {
  return String(valor || '')
    .toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function iniciar() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  estado.usuario = session.user;
  estado.token = session.access_token;

  const { data: perfil } = await window.supabaseClient
    .from('profiles')
    .select('full_name, role, position')
    .eq('id', session.user.id)
    .single();

  const primeiroNome = ((perfil && perfil.full_name) || 'Irmão').split(' ')[0];
  $('navName').textContent = 'Ir. ' + primeiroNome;
  $('navInitial').textContent = primeiroNome.charAt(0);
  $('navPosition').textContent = (perfil && perfil.position) || 'Mestre Maçom';

  const papel = ((perfil && perfil.role) || '').toLowerCase().trim();
  const cargo = normalizarCargo(perfil && perfil.position);

  estado.temAcesso = papel === 'admin' || CARGOS_SECRETARIA.indexOf(cargo) !== -1;

  if (papel === 'admin') {
    ['adminMenuLink', 'adminMenuLinkMobile'].forEach(function (id) {
      const el = $(id);
      if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
    });
  }

  if (!estado.temAcesso) {
    // A tela esconde; quem de fato barra a geração é a função serverless, que
    // valida a sessão do lado de fora do navegador.
    $('semAcesso').classList.remove('hidden');
    $('fluxo').classList.add('hidden');
    return;
  }

  $('fluxo').classList.remove('hidden');

  if (!$('mdData').value) {
    $('mdData').value = new Date().toISOString().slice(0, 10);
  }
  carregarRascunho();

  ['notas', 'mdOriente', 'mdNumeroSessao', 'mdNumeroBalaustre', 'mdGrau',
   'mdTipoSessao', 'mdData', 'mdHoraAbertura', 'mdHoraEncerramento',
   'mdTronco', 'mdOficiais', 'mdVisitantes'].forEach(function (id) {
    const campo = $(id);
    if (campo) campo.addEventListener('input', salvarRascunho);
  });
}

// ==========================================================================
// LIGAÇÃO COM A PÁGINA
// ==========================================================================

window.irParaPasso = irParaPasso;
window.revisarSupressao = revisarSupressao;
window.fecharRevisao = fecharRevisao;
window.gerarMinuta = gerarMinuta;
window.copiarMinuta = copiarMinuta;
window.baixarTxt = baixarTxt;
window.baixarMarkdown = baixarMarkdown;
window.imprimirMinuta = imprimirMinuta;
window.descartarRascunho = descartarRascunho;

window.BalaustreBot = {
  estado: estado,
  sanitizar: sanitizar,
  MARCA_SUPRESSAO: MARCA_SUPRESSAO,
  normalizarCargo: normalizarCargo,
  CARGOS_SECRETARIA: CARGOS_SECRETARIA
};

document.addEventListener('DOMContentLoaded', function () {
  iniciar().catch(function (erro) {
    console.error('[balaustre] falha na inicializacao:', erro);
    avisar('Erro ao abrir a página. Veja o console.', 'erro');
  });
});
