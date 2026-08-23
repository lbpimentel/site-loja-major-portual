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
 *   EVOLUTION_URL=https://sua-api.com \
 *   EVOLUTION_INSTANCE=nome-da-instancia \
 *   EVOLUTION_KEY=sua-apikey \
 *   node scripts/listar-grupos-whatsapp.mjs
 *
 * No PowerShell:
 *   $env:EVOLUTION_URL="https://sua-api.com"
 *   $env:EVOLUTION_INSTANCE="nome-da-instancia"
 *   $env:EVOLUTION_KEY="sua-apikey"
 *   node scripts/listar-grupos-whatsapp.mjs
 *
 * Filtrando pelo nome do grupo:
 *   node scripts/listar-grupos-whatsapp.mjs major portugal
 *
 * ---------------------------------------------------------------------------
 * A CHAVE FICA NO SEU COMPUTADOR
 * ---------------------------------------------------------------------------
 * As credenciais vêm do ambiente, nunca de dentro deste arquivo. Assim o
 * script pode ser versionado e usado por qualquer Loja sem carregar segredo
 * nenhum — e ninguém precisa colar uma apikey num chat, num commit ou num
 * ticket para pedir ajuda.
 */

const url = (process.env.EVOLUTION_URL || '').trim().replace(/\/+$/, '');
const instancia = (process.env.EVOLUTION_INSTANCE || '').trim();
const chave = (process.env.EVOLUTION_KEY || '').trim();

const filtros = process.argv.slice(2).filter((a) => !a.startsWith('-'));

function sair(mensagem) {
  console.error('\n' + mensagem + '\n');
  process.exit(1);
}

if (!url || !instancia || !chave) {
  const faltando = [];
  if (!url) faltando.push('EVOLUTION_URL');
  if (!instancia) faltando.push('EVOLUTION_INSTANCE');
  if (!chave) faltando.push('EVOLUTION_KEY');

  sair(
    'Faltam variáveis de ambiente: ' + faltando.join(', ') + '\n\n' +
    'Exemplo:\n' +
    '  EVOLUTION_URL=https://sua-api.com \\\n' +
    '  EVOLUTION_INSTANCE=minha-instancia \\\n' +
    '  EVOLUTION_KEY=sua-apikey \\\n' +
    '  node scripts/listar-grupos-whatsapp.mjs'
  );
}

/** Tira acento e caixa, para "Major Portugal" casar com "major portugal". */
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

async function buscar(caminho) {
  const resposta = await fetch(url + caminho, {
    headers: { apikey: chave, 'Content-Type': 'application/json' }
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    const erro = new Error('HTTP ' + resposta.status + ': ' + texto.slice(0, 300));
    erro.status = resposta.status;
    throw erro;
  }

  try {
    return JSON.parse(texto);
  } catch (e) {
    throw new Error('A API respondeu algo que não é JSON: ' + texto.slice(0, 200));
  }
}

/**
 * A rota de grupos mudou de nome entre versões da Evolution API, e nem toda
 * instalação expõe as duas. Tentar em ordem evita que o script falhe por um
 * detalhe de versão quando a informação está ali, em outra rota.
 */
async function listarGrupos() {
  const tentativas = [
    '/group/fetchAllGroups/' + instancia + '?getParticipants=false',
    '/group/fetchAllGroups/' + instancia,
    '/chat/findChats/' + instancia
  ];

  const problemas = [];

  for (const caminho of tentativas) {
    try {
      const dados = await buscar(caminho);
      const lista = Array.isArray(dados) ? dados : (dados.groups || dados.data || []);

      if (Array.isArray(lista) && lista.length) {
        return { caminho, lista };
      }
      problemas.push(caminho + ' → respondeu vazio');
    } catch (erro) {
      problemas.push(caminho + ' → ' + erro.message.split('\n')[0]);
    }
  }

  sair(
    'Nenhuma rota devolveu grupos. O que foi tentado:\n  ' +
    problemas.join('\n  ') + '\n\n' +
    'Confira se a instância está conectada (QR code lido) e se a apikey é a certa.'
  );
}

/** Cada versão nomeia os campos de um jeito. */
function extrair(item) {
  const jid = item.id || item.remoteJid || item.jid || '';
  const nome = item.subject || item.name || item.pushName || '(sem nome)';
  const participantes = item.size
    || (Array.isArray(item.participants) ? item.participants.length : null);

  return { jid: String(jid), nome: String(nome), participantes };
}

const { caminho, lista } = await listarGrupos();

const grupos = lista
  .map(extrair)
  .filter((g) => g.jid.endsWith('@g.us'))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

if (!grupos.length) {
  sair('A API respondeu, mas nenhum grupo veio na lista (rota usada: ' + caminho + ').');
}

const casam = filtros.length
  ? grupos.filter((g) => filtros.every((f) => normalizar(g.nome).includes(normalizar(f))))
  : [];

console.log('\nGrupos encontrados: ' + grupos.length + '   (rota: ' + caminho + ')\n');

const largura = Math.min(
  44,
  Math.max(...grupos.map((g) => g.nome.length), 10)
);

for (const g of grupos) {
  const destacado = casam.includes(g);
  const marca = destacado ? '►' : ' ';
  const nome = g.nome.length > largura ? g.nome.slice(0, largura - 1) + '…' : g.nome;
  const qtd = g.participantes != null ? String(g.participantes).padStart(4) + ' membros' : '';

  console.log(' ' + marca + ' ' + nome.padEnd(largura) + '  ' + g.jid + '  ' + qtd);
}

if (filtros.length) {
  console.log('');
  if (casam.length === 1) {
    console.log('Grupo da Loja (marcado com ►):');
    console.log('');
    console.log('  Nome : ' + casam[0].nome);
    console.log('  JID  : ' + casam[0].jid);
    console.log('');
    console.log('Cole esse JID em FraternidadeZap → Configurações do Zap → ID do grupo.');
  } else if (casam.length === 0) {
    console.log('Nenhum grupo casou com: ' + filtros.join(' '));
    console.log('Rode sem filtro e escolha o JID na lista acima.');
  } else {
    console.log(casam.length + ' grupos casaram com o filtro. Refine os termos ou escolha na lista.');
  }
} else {
  console.log('');
  console.log('Para destacar o grupo da Loja, passe parte do nome:');
  console.log('  node scripts/listar-grupos-whatsapp.mjs major portugal');
}

console.log('');
console.log('A outra metade da configuração é a URL de envio de texto:');
console.log('  ' + url + '/message/sendText/' + instancia);
console.log('');
