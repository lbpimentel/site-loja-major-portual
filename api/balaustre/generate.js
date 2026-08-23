/**
 * ============================================================================
 * /api/balaustre/generate — REDAÇÃO DA MINUTA DO BALAÚSTRE
 * ============================================================================
 *
 * Função serverless da Vercel. Existe por um motivo específico: a chave da IA
 * não pode ir para o navegador. Se a chamada ao Gemini fosse feita do
 * cliente, a chave estaria no código-fonte da página, visível a qualquer
 * visitante, e seria usada por terceiros na conta da Loja.
 *
 * ---------------------------------------------------------------------------
 * VARIÁVEIS DE AMBIENTE (Vercel → Settings → Environment Variables)
 * ---------------------------------------------------------------------------
 *   GEMINI_API_KEY     obrigatória — chave do provedor
 *   SUPABASE_URL       obrigatória — projeto Supabase DESTA Loja
 *   SUPABASE_ANON_KEY  obrigatória — chave publicável DESTA Loja
 *
 * Cada Loja é um projeto Vercel próprio (ver README-TEMPLATE.md), então cada
 * uma tem o seu conjunto. Uma chave de IA por Loja também mantém o custo
 * separado por cliente.
 *
 * ---------------------------------------------------------------------------
 * AS TRÊS BARREIRAS ANTES DE O TEXTO SAIR
 * ---------------------------------------------------------------------------
 *   1. O navegador suprime o conteúdo ritualístico (balaustre-sanitizer.js)
 *   2. O Secretário lê o texto suprimido e confirma explicitamente
 *   3. ESTE arquivo confere de novo e RECUSA se ainda houver rótulo ritual
 *
 * A terceira existe porque as duas primeiras rodam no navegador, e o servidor
 * não tem como saber se rodaram: um script alterado, uma extensão intrometida
 * ou uma requisição forjada com curl chegariam aqui sem ter passado por nada.
 * A mesma implementação roda dos dois lados justamente para não divergirem.
 */

import { GoogleGenAI } from '@google/genai';

import { sessaoValida } from '../_lib/auth.js';
import { contemResiduoRitual, MARCA_SUPRESSAO } from '../../public/js/balaustre-sanitizer.js';

/** Teto de entrada. Uma ata longa cabe folgada; um despejo de arquivo, não. */
const LIMITE_NOTAS = 40000;

const MODELO = 'gemini-2.5-flash';

/**
 * Instrução de sistema.
 *
 * A regra sobre os trechos suprimidos é a mais importante do prompt: sem ela,
 * um modelo prestativo tentaria "completar" a lacuna a partir do contexto, e
 * reconstruiria por dedução justamente o que a supressão tirou.
 */
const INSTRUCAO_SISTEMA = `Você é o Secretário de uma Loja Maçônica filiada ao Grande Oriente do Brasil e redige o Balaústre (ata) da sessão a partir das notas fornecidas.

REGRA INVIOLÁVEL SOBRE TRECHOS SUPRIMIDOS
As notas podem conter a marca "${MARCA_SUPRESSAO}". Ela cobre conteúdo ritualístico que não pode circular.
- Nunca tente adivinhar, deduzir ou reconstruir o que estava ali.
- Nunca escreva palavras de passe, palavras sagradas, toques, sinais, baterias ou qualquer elemento ritualístico, mesmo que consiga inferi-los.
- Ao narrar um momento cujo conteúdo foi suprimido, descreva apenas o ATO em termos genéricos ("cumpriram-se as formalidades ritualísticas do Grau"), sem detalhá-lo.

ESTRUTURA OBRIGATÓRIA DO BALAÚSTRE
Redija exatamente nesta ordem, usando os títulos como cabeçalhos:

1. Cabeçalho com a invocação "À Glória do Grande Arquiteto do Universo" e a forma abreviada A∴G∴D∴G∴A∴D∴U∴
2. Identificação: nome da Loja, número, Oriente, número da sessão, número do Balaústre, grau, tipo de sessão, data e horário.
3. ABERTURA DOS TRABALHOS
4. EXPEDIENTE E SACO DE PROPOSTAS
5. ORDEM DO DIA
6. TRONCO DE BENEFICÊNCIA
7. PALAVRA A BEM DA ORDEM
8. CONCLUSÕES DO ORADOR
9. ENCERRAMENTO
10. Fecho com espaço para as assinaturas do Venerável Mestre, do Orador e do Secretário.

VERNÁCULO
- Terceira pessoa, pretérito perfeito, tom formal e sóbrio.
- Trate os membros por "Ir∴" (Irmão) e as autoridades pelo cargo ("o Venerável Mestre", "o Ir∴ Orador").
- Use as abreviaturas maçônicas com o ponto triangular: Ir∴, Loja, Or∴, Ven∴ Mest∴.
- Registre valores em reais por extenso seguidos do algarismo, como manda a praxe de ata.

HONESTIDADE COM AS LACUNAS
Se as notas não trouxerem alguma informação, escreva "[A COMPLETAR PELO SECRETÁRIO]" no lugar. Nunca invente nomes, valores, números de sessão ou deliberações que não estejam nas notas: um Balaústre é documento oficial da Loja, e um dado inventado nele é pior do que um espaço em branco.

Devolva apenas o texto do Balaústre, sem comentários seus antes ou depois.`;

/** Lê o corpo da requisição, com ou sem o parser da plataforma. */
async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  const pedacos = [];
  for await (const pedaco of req) pedacos.push(pedaco);
  const cru = Buffer.concat(pedacos).toString('utf-8');

  try {
    return cru ? JSON.parse(cru) : {};
  } catch (erro) {
    throw new Error('Corpo da requisição não é JSON válido.');
  }
}

/** Monta o bloco de metadados que abre o pedido ao modelo. */
function blocoMetadados(m) {
  const campos = [
    ['Loja', m.loja],
    ['Oriente', m.oriente],
    ['Número da sessão', m.numeroSessao],
    ['Número do Balaústre', m.numeroBalaustre],
    ['Grau dos trabalhos', m.grau],
    ['Tipo de sessão', m.tipoSessao],
    ['Data', m.data],
    ['Horário de abertura', m.horaAbertura],
    ['Horário de encerramento', m.horaEncerramento],
    ['Tronco de beneficência', m.tronco],
    ['Oficiais presentes', m.oficiais],
    ['Visitantes', m.visitantes]
  ];

  return campos
    .filter(function (par) { return par[1] !== undefined && par[1] !== null && String(par[1]).trim(); })
    .map(function (par) { return par[0] + ': ' + String(par[1]).trim(); })
    .join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Use POST.' });
  }

  const sessao = await sessaoValida(req);
  if (!sessao.ok) {
    return res.status(401).json({ erro: sessao.motivo });
  }

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch (erro) {
    return res.status(400).json({ erro: erro.message });
  }

  const notas = String(corpo.notas || '').trim();
  const metadados = corpo.metadados || {};

  if (!notas) {
    return res.status(400).json({ erro: 'Envie as notas da sessão.' });
  }
  if (notas.length > LIMITE_NOTAS) {
    return res.status(413).json({
      erro: 'Notas com ' + notas.length + ' caracteres; o limite é ' + LIMITE_NOTAS + '.'
    });
  }

  // Terceira barreira: recusar em vez de "limpar e seguir". Se chegou rótulo
  // ritual aqui, alguma etapa anterior não rodou, e o certo é o Secretário
  // descobrir isso agora — não depois que o texto já tiver sido enviado.
  const residuo = contemResiduoRitual(notas);
  if (residuo.encontrou) {
    return res.status(422).json({
      erro: 'Recusado: as notas ainda contêm conteúdo ritualístico (' + residuo.regra + '). ' +
            'Nada foi enviado ao provedor de IA. Revise a supressão na tela e tente de novo.',
      regra: residuo.regra
    });
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return res.status(500).json({
      erro: 'GEMINI_API_KEY não configurada nesta implantação da Vercel.'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: chave });

    const pedido =
      'DADOS DA SESSÃO\n' + blocoMetadados(metadados) +
      '\n\nNOTAS DO SECRETÁRIO\n' + notas;

    const resposta = await ai.models.generateContent({
      model: MODELO,
      contents: pedido,
      config: {
        systemInstruction: INSTRUCAO_SISTEMA,
        // Ata é documento formal: pouca variação é o que se quer aqui.
        temperature: 0.3
      }
    });

    const minuta = (resposta.text || '').trim();
    if (!minuta) {
      return res.status(502).json({ erro: 'O provedor devolveu uma resposta vazia.' });
    }

    return res.status(200).json({ minuta: minuta, modelo: MODELO });
  } catch (erro) {
    console.error('[balaustre/generate] falha na chamada ao provedor:', erro);
    return res.status(502).json({ erro: 'Falha ao gerar a minuta: ' + erro.message });
  }
}
