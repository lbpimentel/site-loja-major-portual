/**
 * ============================================================================
 * FRATERNIDADEZAP — CAMADA DE SERVIDOR DO WHATSAPP
 * ============================================================================
 *
 * Compartilhada pelo cron diário e pelo botão de teste. Uma implementação só:
 * duas cópias da montagem de mensagem divergiriam, e o teste passaria a
 * validar algo diferente do que o disparo real envia.
 *
 * A pasta começa com `_`, então a Vercel não a publica como rota.
 *
 * ---------------------------------------------------------------------------
 * VARIÁVEIS DE AMBIENTE
 * ---------------------------------------------------------------------------
 *   SUPABASE_URL                obrigatória
 *   SUPABASE_SERVICE_ROLE_KEY   obrigatória — lê a config e grava os logs
 *   CRON_SECRET                 obrigatória — ver api/cron/birthdays.js
 *
 * A service_role ignora o RLS. Ela é necessária aqui porque o cron não tem
 * usuário logado: roda sozinho, às 7 da manhã, sem ninguém para autenticar.
 * NUNCA a exponha ao navegador — ela dá acesso total ao banco.
 */

const TIMEOUT_MS = 15000;

function ambiente() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    throw new Error(
      'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas ' +
      'nesta implantação da Vercel.'
    );
  }
  return { url: url.replace(/\/+$/, ''), chave: chave };
}

/** Chamada ao PostgREST com a service_role. */
async function rest(caminho, opcoes) {
  const { url, chave } = ambiente();
  const config = opcoes || {};

  const resposta = await fetch(url + '/rest/v1' + caminho, {
    method: config.method || 'GET',
    headers: Object.assign(
      {
        apikey: chave,
        Authorization: 'Bearer ' + chave,
        'Content-Type': 'application/json'
      },
      config.headers || {}
    ),
    body: config.body ? JSON.stringify(config.body) : undefined
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error('Supabase respondeu ' + resposta.status + ': ' + texto.slice(0, 300));
  }
  return texto ? JSON.parse(texto) : null;
}

/** A configuração da Loja deste banco. */
export async function carregarConfig() {
  const linhas = await rest('/lojas_config?select=*&limit=1');
  return linhas && linhas.length ? linhas[0] : null;
}

/** Aniversariantes numa janela de dias. `(0,0)` é hoje; `(0,6)` é a semana. */
export async function buscarAniversariantes(de, ate) {
  return await rest('/rpc/aniversariantes', {
    method: 'POST',
    body: { p_de: de, p_ate: ate }
  });
}

/**
 * Grava o disparo.
 *
 * Falha ao gravar NÃO derruba o envio: a mensagem já saiu, e perder o registro
 * é menos grave do que o cron estourar no meio e a próxima execução repetir
 * tudo. O erro vai para o console da função, onde a Vercel o guarda.
 */
export async function registrarLog(entrada) {
  try {
    await rest('/whatsapp_dispatch_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        tipo: entrada.tipo,
        destinatario: entrada.destinatario || null,
        status: entrada.status,
        payload: entrada.payload || null
      }
    });
  } catch (erro) {
    console.error('[whatsapp] nao consegui gravar o log:', erro.message);
  }
}

/**
 * Envia uma mensagem de texto ao gateway configurado.
 *
 * O formato cobre os gateways mais comuns no meio (Evolution API, Z-API,
 * WPPConnect e derivados de Baileys): POST no endpoint com `{ number, text }`
 * em JSON. O token vai em `apikey` E em `Authorization: Bearer` porque as duas
 * convenções convivem — o gateway lê a que entende e ignora a outra.
 *
 * `whatsapp_api_url` deve ser a URL COMPLETA do endpoint de envio de texto,
 * não a raiz da API. Ex.: https://api.exemplo.com/message/sendText/minha-instancia
 */
export async function enviarMensagem(config, destinatario, texto) {
  if (!config || !config.whatsapp_api_url) {
    throw new Error('URL da API de WhatsApp não configurada.');
  }
  if (!config.whatsapp_api_token) {
    throw new Error('Token da API de WhatsApp não configurado.');
  }
  if (!destinatario) {
    throw new Error('Destinatário não configurado (JID do grupo).');
  }

  const corpo = { number: destinatario, text: texto };

  // Sem timeout, um gateway fora do ar seguraria a função até o limite da
  // plataforma e o disparo do dia morreria sem log.
  const controlador = new AbortController();
  const relogio = setTimeout(function () { controlador.abort(); }, TIMEOUT_MS);

  try {
    const resposta = await fetch(config.whatsapp_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.whatsapp_api_token,
        Authorization: 'Bearer ' + config.whatsapp_api_token
      },
      body: JSON.stringify(corpo),
      signal: controlador.signal
    });

    const retorno = await resposta.text();

    if (!resposta.ok) {
      throw new Error('Gateway respondeu ' + resposta.status + ': ' + retorno.slice(0, 300));
    }
    // Devolve o corpo enviado para o log — sem o token, que não entra em log
    // nenhum.
    return { corpo: corpo, retorno: retorno.slice(0, 500) };
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error('O gateway não respondeu em ' + (TIMEOUT_MS / 1000) + ' segundos.');
    }
    throw erro;
  } finally {
    clearTimeout(relogio);
  }
}


// ==========================================================================
// MENSAGENS
// ==========================================================================

const ROTULO = {
  irmao: 'Irmão',
  cunhada: 'Cunhada',
  filho: 'Sobrinho',
  filha: 'Sobrinha',
  outro: 'Familiar'
};

function rotulo(parentesco) {
  return ROTULO[parentesco] || ROTULO.outro;
}

/** "Ir∴ FULANO" — o tratamento que a Loja usa por escrito. */
function comTratamento(nome) {
  return 'Ir∴ ' + nome;
}

/** Mensagem do dia. `lista` vem de aniversariantes(0, 0). */
export function mensagemDiaria(lista, nomeDaLoja) {
  const linhas = lista.map(function (p) {
    const quem = p.parentesco === 'irmao' ? comTratamento(p.nome) : p.nome;
    const vinculo = p.parentesco === 'irmao'
      ? ''
      : ' (' + rotulo(p.parentesco) + (p.responsavel ? ', da família do ' + comTratamento(p.responsavel) : '') + ')';
    return '• *' + quem + '*' + vinculo;
  });

  const abertura = lista.length === 1
    ? '🎂 *Aniversariante de hoje*'
    : '🎂 *Aniversariantes de hoje*';

  return [
    abertura,
    '',
    linhas.join('\n'),
    '',
    'Que o Grande Arquiteto do Universo lhes conceda saúde, paz e longa vida.',
    'Parabéns em nome da ' + nomeDaLoja + '! 🕊️'
  ].join('\n');
}

/** Consolidado da semana. `lista` vem de aniversariantes(0, 6). */
export function mensagemSemanal(lista, nomeDaLoja) {
  const linhas = lista.map(function (p) {
    const quem = p.parentesco === 'irmao' ? comTratamento(p.nome) : p.nome;
    const marca = p.dias_ate === 0 ? '  ← hoje' : '';
    return '• *' + p.dia_mes + '* — ' + quem + ' (' + rotulo(p.parentesco) + ')' + marca;
  });

  return [
    '📅 *Aniversariantes da semana*',
    '',
    linhas.join('\n'),
    '',
    'Vamos lembrar de cumprimentar cada um no seu dia.',
    nomeDaLoja
  ].join('\n');
}

/** Mensagem do botão "Testar disparo". */
export function mensagemTeste(nomeDaLoja) {
  return [
    '✅ *Teste do FraternidadeZap*',
    '',
    'Se esta mensagem chegou ao grupo, a integração está funcionando: o disparo',
    'automático dos aniversários acontecerá às 07h, nos dias em que houver',
    'aniversariante.',
    '',
    nomeDaLoja
  ].join('\n');
}
