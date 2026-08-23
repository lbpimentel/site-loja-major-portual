/**
 * ============================================================================
 * /api/cron/birthdays — DISPARO AUTOMÁTICO DOS ANIVERSÁRIOS
 * ============================================================================
 *
 * Roda todo dia às 10:00 UTC = 07:00 de Brasília (ver vercel.json).
 *
 * O que faz, nesta ordem:
 *   1. Aniversariantes de HOJE. Havendo alguém e estando o disparo diário
 *      ligado, manda a mensagem no grupo.
 *   2. Sendo SEGUNDA-FEIRA e estando o resumo semanal ligado, manda também o
 *      consolidado dos próximos 7 dias.
 *
 * Em ambos os casos: dia vazio, nenhuma mensagem. Um grupo que recebe
 * "hoje não temos aniversariantes" todo dia vira um grupo silenciado, e aí a
 * mensagem que importa também deixa de ser lida.
 *
 * ---------------------------------------------------------------------------
 * POR QUE O SEGREDO DO CRON É OBRIGATÓRIO
 * ---------------------------------------------------------------------------
 * Uma função em `api/` é uma URL pública. Sem verificação, qualquer pessoa que
 * descobrisse o endereço poderia disparar mensagens no grupo da Loja quantas
 * vezes quisesse — e os logs mostrariam envios que ninguém pediu.
 *
 * A Vercel manda `Authorization: Bearer $CRON_SECRET` nas chamadas do cron
 * quando essa variável existe no projeto. Se ela não estiver configurada, esta
 * função RECUSA tudo em vez de rodar aberta: um disparo automático sem porteiro
 * é pior do que um disparo que não acontece.
 */

import {
  buscarAniversariantes,
  carregarConfig,
  enviarMensagem,
  mensagemDiaria,
  mensagemSemanal,
  registrarLog
} from '../_lib/whatsapp.js';

/** Segunda-feira no fuso de Brasília — não no UTC do servidor. */
function ehSegundaEmBrasilia() {
  const agora = new Date();
  const brasilia = new Date(
    agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );
  return brasilia.getDay() === 1;
}

function autorizado(req) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return { ok: false, motivo: 'CRON_SECRET não configurada nesta implantação.' };
  }

  const cabecalho = req.headers.authorization || req.headers.Authorization || '';
  if (cabecalho !== 'Bearer ' + segredo) {
    return { ok: false, motivo: 'Chamada não autorizada.' };
  }
  return { ok: true };
}

/**
 * Executa um disparo e registra o resultado.
 *
 * O try/catch é por disparo, e não em volta dos dois: numa segunda-feira, uma
 * falha no envio diário não pode impedir o resumo semanal de sair.
 */
async function dispararEEnvolverLog(config, tipo, texto, nomeDaLoja) {
  try {
    const envio = await enviarMensagem(config, config.whatsapp_grupo_jid, texto);

    await registrarLog({
      tipo: tipo,
      destinatario: config.whatsapp_grupo_jid,
      status: 'sucesso',
      payload: { mensagem: texto, gateway: envio.retorno }
    });

    return { tipo: tipo, status: 'sucesso' };
  } catch (erro) {
    console.error('[cron/birthdays] falha no disparo ' + tipo + ':', erro.message);

    await registrarLog({
      tipo: tipo,
      destinatario: config.whatsapp_grupo_jid,
      status: 'erro',
      payload: { mensagem: texto, erro: erro.message }
    });

    return { tipo: tipo, status: 'erro', erro: erro.message };
  }
}

export default async function handler(req, res) {
  const porteiro = autorizado(req);
  if (!porteiro.ok) {
    return res.status(401).json({ erro: porteiro.motivo });
  }

  const resultados = [];

  try {
    const config = await carregarConfig();

    if (!config) {
      return res.status(200).json({
        ok: false,
        motivo: 'Nenhuma linha em lojas_config. Rode a migração 05.'
      });
    }

    const nomeDaLoja = config.loja_slug || 'nossa Loja';

    // ------------------------------------------------------------------
    // 1. DISPARO DIÁRIO (D-0)
    // ------------------------------------------------------------------
    if (!config.disparo_diario_ativo) {
      resultados.push({ tipo: 'diario', status: 'desligado' });
    } else {
      const hoje = await buscarAniversariantes(0, 0);

      if (!hoje || hoje.length === 0) {
        // Dia vazio não vira mensagem, mas vira log: sem ele, ninguém
        // distingue "não havia aniversariante" de "o cron não rodou".
        await registrarLog({
          tipo: 'diario',
          status: 'sucesso',
          payload: { acao: 'silenciado', motivo: 'nenhum aniversariante hoje' }
        });
        resultados.push({ tipo: 'diario', status: 'silenciado', quantidade: 0 });
      } else {
        const r = await dispararEEnvolverLog(
          config, 'diario', mensagemDiaria(hoje, nomeDaLoja), nomeDaLoja
        );
        resultados.push(Object.assign(r, { quantidade: hoje.length }));
      }
    }

    // ------------------------------------------------------------------
    // 2. RESUMO SEMANAL (segundas)
    // ------------------------------------------------------------------
    if (!ehSegundaEmBrasilia()) {
      resultados.push({ tipo: 'semanal', status: 'fora do dia' });
    } else if (!config.resumo_semanal_ativo) {
      resultados.push({ tipo: 'semanal', status: 'desligado' });
    } else {
      const semana = await buscarAniversariantes(0, 6);

      if (!semana || semana.length === 0) {
        await registrarLog({
          tipo: 'semanal',
          status: 'sucesso',
          payload: { acao: 'silenciado', motivo: 'semana sem aniversariantes' }
        });
        resultados.push({ tipo: 'semanal', status: 'silenciado', quantidade: 0 });
      } else {
        const r = await dispararEEnvolverLog(
          config, 'semanal', mensagemSemanal(semana, nomeDaLoja), nomeDaLoja
        );
        resultados.push(Object.assign(r, { quantidade: semana.length }));
      }
    }

    return res.status(200).json({ ok: true, resultados: resultados });
  } catch (erro) {
    console.error('[cron/birthdays] falha geral:', erro);
    return res.status(500).json({ ok: false, erro: erro.message, resultados: resultados });
  }
}
