#!/usr/bin/env node
/**
 * ============================================================================
 * LISTAR GRUPOS DO WHATSAPP — descobrir o JID para o FraternidadeZap
 * ============================================================================
 *
 * O campo "ID do grupo (JID)" da tela de configuração precisa de um valor no
 * formato `120363028394829384@g.us`. Esse número não aparece em lugar nenhum
 * do aplicativo do WhatsApp: só a API sabe. Este script pergunta a ela.
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 *   EVOLUTION_URL=http://localhost:8081 \
 *   EVOLUTION_INSTANCE=nome-da-instancia \
 *   EVOLUTION_KEY=sua-apikey \
 *   node scripts/listar-grupos-whatsapp.mjs major
 *
 * No PowerShell:
 *   $env:EVOLUTION_URL="http://localhost:8081"
 *   $env:EVOLUTION_INSTANCE="nome-da-instancia"
 *   $env:EVOLUTION_KEY="sua-apikey"
 *   node scripts/listar-grupos-whatsapp.mjs major
 *
 * ---------------------------------------------------------------------------
 * A CHAVE FICA NO SEU COMPUTADOR
 * ---------------------------------------------------------------------------
 * As credenciais vêm do ambiente, nunca de dentro deste arquivo. Assim o
 * script pode ser versionado e usado por qualquer Loja sem carregar segredo
 * nenhum — e ninguém precisa colar uma apikey num chat, num commit ou num
 * ticket para pedir ajuda.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELE CONFERE A INSTÂNCIA ANTES DE PEDIR OS GRUPOS
 * ---------------------------------------------------------------------------
 * Uma instância desconectada faz a Evolution responder 500 "Cannot convert
 * undefined or null to object" — mensagem que não tem relação nenhuma com a
 * causa real, que é simplesmente não haver sessão do WhatsApp aberta.
 *
 * E passar o ID da instância no lugar do NOME devolve "instance does not
 * exist", sem dizer qual seria o nome certo.
 *
 * Os dois casos aconteceram de verdade na primeira execução. Por isso o script
 * checa o estado antes e, quando o nome está errado, lista os nomes existentes.
 */

const url = (process.env.EVOLUTION_URL || '').trim().replace(/\/+$/, '');
const instancia = (process.env.EVOLUTION_INSTANCE || '').trim();
const chave = (process.env.EVOLUTION_KEY || '').trim();

const filtros = process.argv.slice(2).filter((a) => !a.startsWith('-'));

/**
 * Encerra com mensagem.
 *
 * `process.exitCode` em vez de `process.exit()`: sair no meio de um fetch
 * pendente derruba o Node no Windows com um "Assertion failed" do libuv, e o
 * erro de verdade fica soterrado por um despejo de stack irrelevante.
 */
function sair(mensagem) {
  console.error('\n' + mensagem + '\n');
  process.exitCode = 1;
}

/** Tira acento e caixa, para "Major Portugal" casar com "major portugal". */
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

async function chamar(caminho, opcoes) {
  const config = opcoes || {};

  const resposta = await fetch(url + caminho, {
    method: config.method || 'GET',
    headers: { apikey: chave, 'Content-Type': 'application/json' },
    body: config.body ? JSON.stringify(config.body) : undefined
  });

  const texto = await resposta.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch (e) { /* não é JSON */ }

  return { ok: resposta.ok, status: resposta.status, corpo, texto };
}

/** Nomes das instâncias existentes, para sugerir quando o informado não bate. */
async function nomesDeInstancias() {
  try {
    const r = await chamar('/instance/fetchInstances');
    if (!r.ok || !r.corpo) return [];

    const lista = Array.isArray(r.corpo) ? r.corpo : (r.corpo.instances || []);
    return lista
      .map((it) => {
        const i = it.instance || it;
        return {
          nome: i.instanceName || i.name || '',
          estado: i.connectionStatus || i.state || '?',
          numero: i.owner || i.ownerJid || i.number || ''
        };
      })
      .filter((i) => i.nome);
  } catch (e) {
    return [];
  }
}

/**
 * Confirma que a instância existe E tem sessão aberta.
 * Devolve true quando dá para seguir.
 */
async function instanciaPronta() {
  const r = await chamar('/instance/connectionState/' + encodeURIComponent(instancia));

  if (r.status === 401) {
    sair('A apikey foi recusada (401). Confira EVOLUTION_KEY.');
    return false;
  }

  if (r.status === 404) {
    const nomes = await nomesDeInstancias();
    const sugestao = nomes.length
      ? '\n\nInstâncias que existem nesta Evolution:\n' +
        nomes.map((i) => '  • ' + i.nome + '   (estado: ' + i.estado + ')'
                        + (i.numero ? '   ' + i.numero : '')).join('\n') +
        '\n\nUse o NOME da instância em EVOLUTION_INSTANCE — não o id.'
      : '';

    sair('A instância "' + instancia + '" não existe nesta Evolution.' + sugestao);
    return false;
  }

  const estado = r.corpo && r.corpo.instance
    ? (r.corpo.instance.state || r.corpo.instance.connectionStatus)
    : null;

  if (estado !== 'open') {
    sair(
      'A instância "' + instancia + '" existe, mas o WhatsApp está DESCONECTADO ' +
      '(estado: ' + (estado || 'desconhecido') + ').\n\n' +
      'Sem sessão aberta não há grupos para listar — a Evolution responde 500 com uma\n' +
      'mensagem que não aponta para essa causa.\n\n' +
      'Abra ' + url + '/manager, escolha a instância e leia o QR code no celular.\n' +
      'Depois rode este script de novo.'
    );
    return false;
  }

  return true;
}

/**
 * A rota de grupos varia entre versões da Evolution. Na 2.3.x, `getParticipants`
 * é obrigatório na query, e `findChats` é POST — pedir por GET devolve 404,
 * que se confunde com "instância não existe".
 */
async function listarGrupos() {
  const tentativas = [
    { caminho: '/group/fetchAllGroups/' + encodeURIComponent(instancia) + '?getParticipants=false' },
    { caminho: '/chat/findChats/' + encodeURIComponent(instancia), opcoes: { method: 'POST', body: {} } }
  ];

  const problemas = [];

  for (const t of tentativas) {
    try {
      const r = await chamar(t.caminho, t.opcoes);

      if (!r.ok) {
        const msg = r.corpo && r.corpo.response && r.corpo.response.message
          ? JSON.stringify(r.corpo.response.message)
          : r.texto.slice(0, 160);
        problemas.push(t.caminho + ' → HTTP ' + r.status + ' ' + msg);
        continue;
      }

      const lista = Array.isArray(r.corpo) ? r.corpo : (r.corpo?.groups || r.corpo?.data || []);
      if (Array.isArray(lista) && lista.length) return { caminho: t.caminho, lista };

      problemas.push(t.caminho + ' → respondeu vazio');
    } catch (erro) {
      problemas.push(t.caminho + ' → ' + erro.message.split('\n')[0]);
    }
  }

  sair('Nenhuma rota devolveu grupos. O que foi tentado:\n  ' + problemas.join('\n  '));
  return null;
}

/** Cada versão nomeia os campos de um jeito. */
function extrair(item) {
  const jid = item.id || item.remoteJid || item.jid || '';
  const nome = item.subject || item.name || item.pushName || '(sem nome)';
  const participantes = item.size
    || (Array.isArray(item.participants) ? item.participants.length : null);

  return { jid: String(jid), nome: String(nome), participantes };
}

// ---------------------------------------------------------------------------

if (!url || !instancia || !chave) {
  const faltando = [];
  if (!url) faltando.push('EVOLUTION_URL');
  if (!instancia) faltando.push('EVOLUTION_INSTANCE');
  if (!chave) faltando.push('EVOLUTION_KEY');

  sair(
    'Faltam variáveis de ambiente: ' + faltando.join(', ') + '\n\n' +
    'Exemplo:\n' +
    '  EVOLUTION_URL=http://localhost:8081 \\\n' +
    '  EVOLUTION_INSTANCE=minha-instancia \\\n' +
    '  EVOLUTION_KEY=sua-apikey \\\n' +
    '  node scripts/listar-grupos-whatsapp.mjs major'
  );
} else if (await instanciaPronta()) {
  const resultado = await listarGrupos();

  if (resultado) {
    const grupos = resultado.lista
      .map(extrair)
      .filter((g) => g.jid.endsWith('@g.us'))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (!grupos.length) {
      sair('A API respondeu, mas nenhum grupo veio na lista (rota: ' + resultado.caminho + ').');
    } else {
      const casam = filtros.length
        ? grupos.filter((g) => filtros.every((f) => normalizar(g.nome).includes(normalizar(f))))
        : [];

      console.log('\nGrupos encontrados: ' + grupos.length + '   (rota: ' + resultado.caminho + ')\n');

      const largura = Math.min(44, Math.max(...grupos.map((g) => g.nome.length), 10));

      for (const g of grupos) {
        const marca = casam.includes(g) ? '►' : ' ';
        const nome = g.nome.length > largura ? g.nome.slice(0, largura - 1) + '…' : g.nome;
        const qtd = g.participantes != null ? String(g.participantes).padStart(4) + ' membros' : '';
        console.log(' ' + marca + ' ' + nome.padEnd(largura) + '  ' + g.jid + '  ' + qtd);
      }

      console.log('');
      if (filtros.length && casam.length === 1) {
        console.log('Grupo da Loja (►):');
        console.log('  Nome : ' + casam[0].nome);
        console.log('  JID  : ' + casam[0].jid);
      } else if (filtros.length && casam.length === 0) {
        console.log('Nenhum grupo casou com: ' + filtros.join(' '));
      } else if (filtros.length) {
        console.log(casam.length + ' grupos casaram com o filtro. Refine os termos.');
      } else {
        console.log('Para destacar o grupo da Loja, passe parte do nome:');
        console.log('  node scripts/listar-grupos-whatsapp.mjs major');
      }

      console.log('');
      console.log('URL de envio de texto (o outro campo do painel):');
      console.log('  ' + url + '/message/sendText/' + instancia);
      console.log('');
    }
  }
}
