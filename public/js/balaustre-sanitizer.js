/**
 * ============================================================================
 * BALAÚSTRE — SUPRESSÃO DE CONTEÚDO RITUALÍSTICO
 * ============================================================================
 *
 * Roda ANTES de qualquer texto sair do navegador em direção à IA.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELE DETECTA RÓTULOS, E NÃO UMA LISTA DE SEGREDOS
 * ---------------------------------------------------------------------------
 * O caminho ingênuo seria manter aqui uma lista das palavras de passe e
 * sagradas de cada grau e trocá-las por um aviso. Isso seria pior de duas
 * formas ao mesmo tempo:
 *
 *   1. Colocaria os próprios segredos num arquivo JavaScript servido em
 *      texto puro para qualquer visitante do site. O remédio publicaria o
 *      que pretendia proteger.
 *   2. Só pegaria a grafia exata. Um Secretário que escrevesse a palavra com
 *      outra acentuação, abreviada ou com um erro de digitação passaria
 *      direto pelo filtro — e ninguém perceberia, porque o texto seria
 *      enviado sem alarme nenhum.
 *
 * Então o que este arquivo reconhece são os RÓTULOS: "palavra de passe",
 * "palavra sagrada", "toque", "sinal de ordem", "retejamento". Ao encontrar
 * um, suprime dali até o fim do trecho — porque o segredo é justamente o que
 * vem DEPOIS do rótulo. O arquivo nunca precisa saber qual é o segredo para
 * cobri-lo.
 *
 * ---------------------------------------------------------------------------
 * SUPRIMIR DEMAIS É O ERRO BARATO
 * ---------------------------------------------------------------------------
 * "toque" pode aparecer em "toque de recolher" e será suprimido junto. Isso
 * custa ao Secretário reescrever uma frase. O erro na direção oposta — deixar
 * escapar uma palavra ritualística para um provedor externo — não tem desfazer.
 * Diante da dúvida, este arquivo sempre suprime.
 *
 * A supressão NÃO substitui a leitura do Secretário: a tela mostra o texto
 * já suprimido e exige confirmação explícita antes de enviar. Este arquivo é
 * a primeira barreira, não a única.
 */

export const MARCA_SUPRESSAO = '[SUPRIMIDO - CONFORME RITUAL]';

/**
 * Rótulos que anunciam conteúdo ritualístico.
 *
 * As classes de caractere aceitam a forma acentuada e a não acentuada
 * (`ma[çc][oô]nic`) porque as duas aparecem em texto digitado às pressas, e
 * um filtro que só pega a forma correta falha exatamente para quem tem pressa.
 */
export const PADROES_RITUAL = [
  {
    nome: 'Palavra de passe',
    regex: /palavras?\s+de\s+passe/gi
  },
  {
    nome: 'Palavra sagrada',
    regex: /palavras?\s+sagradas?/gi
  },
  {
    nome: 'Palavra semestral',
    regex: /palavras?\s+(semestral|semestrais|do\s+semestre)/gi
  },
  {
    nome: 'Toque',
    regex: /toques?\b/gi
  },
  {
    nome: 'Sinal ritualístico',
    // `sina(l|is)` e nao `sinais?`: este ultimo casaria "sinai" e "sinais",
    // mas nunca "sinal" — a forma singular, que e a que aparece no texto.
    regex: /sina(l|is)\s+(de\s+ordem|de\s+socorro|gutural|peitoral|de\s+reconhecimento|do\s+grau)/gi
  },
  {
    nome: 'Marcha',
    regex: /marchas?\s+(do\s+grau|ma[çc][oô]nicas?|ritual[íi]sticas?)/gi
  },
  {
    nome: 'Bateria',
    regex: /baterias?\b/gi
  },
  {
    nome: 'Senha',
    regex: /senhas?\b/gi
  },
  {
    nome: 'Passo do grau',
    regex: /passos?\s+(do\s+grau|ma[çc][oô]nicos?)/gi
  },
  {
    nome: 'Retejamento',
    regex: /rete(ja|lha)mentos?|tegula[çc][oõ]es?|tegula[çc][aã]o/gi
  },
  {
    nome: 'Idade ritualística',
    regex: /idades?\s+ma[çc][oô]nicas?/gi
  }
];

/**
 * Blocos que o Secretário marca à mão para suprimir, escrevendo
 * `((assunto que não deve sair daqui))`.
 *
 * Existe porque nenhuma lista de rótulos cobre tudo: se ele reconhecer algo
 * sensível que este arquivo não previu, precisa de uma forma direta de
 * suprimir sem depender de uma atualização do código.
 */
const BLOCO_MANUAL = /\(\(([\s\S]*?)\)\)/g;

/** Onde termina o trecho iniciado em `inicio`. */
function fimDoTrecho(texto, inicio) {
  const terminadores = /[.;!?\n]/g;
  terminadores.lastIndex = inicio;

  const achou = terminadores.exec(texto);
  return achou ? achou.index : texto.length;
}

/** Une intervalos que se sobrepõem, para não suprimir duas vezes o mesmo trecho. */
function unirIntervalos(intervalos) {
  if (!intervalos.length) return [];

  const ordenados = intervalos.slice().sort(function (a, b) { return a.inicio - b.inicio; });
  const unidos = [ordenados[0]];

  for (let i = 1; i < ordenados.length; i++) {
    const atual = ordenados[i];
    const ultimo = unidos[unidos.length - 1];

    if (atual.inicio <= ultimo.fim) {
      ultimo.fim = Math.max(ultimo.fim, atual.fim);
      if (ultimo.regras.indexOf(atual.regras[0]) === -1) {
        ultimo.regras = ultimo.regras.concat(atual.regras);
      }
    } else {
      unidos.push(atual);
    }
  }
  return unidos;
}

/** Escapa um termo literal para uso dentro de uma expressão regular. */
function escaparRegex(termo) {
  return String(termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Suprime o conteúdo ritualístico de um texto.
 *
 * @param {string} texto            Notas cruas do Secretário.
 * @param {object} [opcoes]
 * @param {string[]} [opcoes.termosExtras]  Termos literais que esta Loja quer
 *        suprimir sempre, onde quer que apareçam.
 * @returns {{texto: string, ocorrencias: Array, houveSupressao: boolean}}
 *
 * `ocorrencias` traz o trecho ORIGINAL de cada supressão, para a tela mostrar
 * ao Secretário o que foi coberto. Esse dado é só de tela: ele nunca entra no
 * que é enviado — se entrasse, a supressão não teria servido para nada.
 */
export function sanitizar(texto, opcoes) {
  const entrada = String(texto || '');
  const config = opcoes || {};
  const termosExtras = config.termosExtras || [];

  if (!entrada.trim()) {
    return { texto: entrada, ocorrencias: [], houveSupressao: false };
  }

  const intervalos = [];

  // 1) Blocos marcados à mão: suprime exatamente o que foi delimitado.
  let achado;
  BLOCO_MANUAL.lastIndex = 0;
  while ((achado = BLOCO_MANUAL.exec(entrada)) !== null) {
    intervalos.push({
      inicio: achado.index,
      fim: achado.index + achado[0].length,
      regras: ['Marcado pelo Secretário']
    });
  }

  // 2) Termos literais desta Loja: suprime a palavra onde quer que apareça.
  termosExtras.forEach(function (termo) {
    const limpo = String(termo || '').trim();
    if (!limpo) return;

    const regex = new RegExp('\\b' + escaparRegex(limpo) + '\\b', 'gi');
    let m;
    while ((m = regex.exec(entrada)) !== null) {
      intervalos.push({
        inicio: m.index,
        fim: m.index + m[0].length,
        regras: ['Termo da Loja']
      });
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  });

  // 3) Rótulos ritualísticos: suprime do rótulo até o fim do trecho, porque o
  //    segredo é o que vem depois do rótulo.
  PADROES_RITUAL.forEach(function (padrao) {
    const regex = new RegExp(padrao.regex.source, padrao.regex.flags);
    let m;
    while ((m = regex.exec(entrada)) !== null) {
      intervalos.push({
        inicio: m.index,
        fim: fimDoTrecho(entrada, m.index + m[0].length),
        regras: [padrao.nome]
      });
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  });

  const unidos = unirIntervalos(intervalos);

  // Substitui de trás para frente: mexer do início deslocaria os índices
  // seguintes, e cada supressão passaria a cortar no lugar errado.
  let resultado = entrada;
  const ocorrencias = [];

  for (let i = unidos.length - 1; i >= 0; i--) {
    const alvo = unidos[i];
    ocorrencias.unshift({
      regras: alvo.regras,
      trecho: entrada.slice(alvo.inicio, alvo.fim)
    });
    resultado = resultado.slice(0, alvo.inicio) + MARCA_SUPRESSAO + resultado.slice(alvo.fim);
  }

  return {
    texto: resultado,
    ocorrencias: ocorrencias,
    houveSupressao: ocorrencias.length > 0
  };
}

/**
 * Confere se um texto JÁ sanitizado ainda contém rótulo ritualístico.
 *
 * É a checagem de última hora, rodada no servidor logo antes da chamada à IA.
 * Não confia no cliente: um navegador com o script alterado, uma extensão
 * intrometida ou uma requisição forjada à mão chegariam ao servidor sem ter
 * passado pela supressão. Aqui a requisição é recusada em vez de seguir.
 */
export function contemResiduoRitual(texto) {
  const entrada = String(texto || '');

  for (let i = 0; i < PADROES_RITUAL.length; i++) {
    const regex = new RegExp(PADROES_RITUAL[i].regex.source, PADROES_RITUAL[i].regex.flags);
    if (regex.test(entrada)) {
      return { encontrou: true, regra: PADROES_RITUAL[i].nome };
    }
  }
  return { encontrou: false, regra: null };
}

// Disponibiliza no navegador para os scripts clássicos da página, mantendo o
// mesmo arquivo importável pela função serverless — uma implementação só,
// rodando nos dois lados, sem risco de as duas divergirem com o tempo.
if (typeof window !== 'undefined') {
  window.BalaustreSanitizer = {
    sanitizar: sanitizar,
    contemResiduoRitual: contemResiduoRitual,
    MARCA_SUPRESSAO: MARCA_SUPRESSAO,
    PADROES_RITUAL: PADROES_RITUAL
  };
}
