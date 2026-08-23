/**
 * ============================================================================
 * /api/whatsapp/test — DISPARO DE TESTE
 * ============================================================================
 *
 * Serve ao botão "Testar disparo" da aba de Configurações do Zap.
 *
 * Existe como função de servidor, e não como um fetch direto do navegador ao
 * gateway, por dois motivos:
 *
 *   1. O teste precisa exercitar EXATAMENTE o mesmo caminho do cron — mesma
 *      montagem de requisição, mesmos cabeçalhos, mesmo tratamento de erro.
 *      Um teste que passa por outro caminho não prova nada sobre o disparo das
 *      07h.
 *   2. O gateway quase sempre não permite chamada de outra origem (CORS). Do
 *      navegador, o teste falharia por um motivo que nada tem a ver com a
 *      configuração, e a diretoria ficaria caçando um erro que não existe.
 *
 * Duas barreiras antes de enviar: sessão válida, e o cargo conferido no BANCO
 * (`is_diretoria_zap()`), não na tela.
 */

import { ehDiretoriaZap, sessaoValida } from '../_lib/auth.js';
import {
  carregarConfig,
  enviarMensagem,
  mensagemTeste,
  registrarLog
} from '../_lib/whatsapp.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Use POST.' });
  }

  const sessao = await sessaoValida(req);
  if (!sessao.ok) {
    return res.status(401).json({ erro: sessao.motivo });
  }

  if (!(await ehDiretoriaZap(sessao.token))) {
    return res.status(403).json({
      erro: 'Apenas a diretoria pode disparar mensagens em nome da Loja.'
    });
  }

  try {
    const config = await carregarConfig();
    if (!config) {
      return res.status(400).json({
        erro: 'Nenhuma configuração encontrada. Rode a migração 05 no Supabase.'
      });
    }

    // Falhar aqui, com a lista do que falta, poupa a diretoria de interpretar
    // um erro genérico do gateway.
    const faltando = [];
    if (!config.whatsapp_api_url) faltando.push('URL da API');
    if (!config.whatsapp_api_token) faltando.push('token');
    if (!config.whatsapp_grupo_jid) faltando.push('JID do grupo');

    if (faltando.length) {
      return res.status(400).json({
        erro: 'Falta preencher: ' + faltando.join(', ') + '. Salve antes de testar.'
      });
    }

    const texto = mensagemTeste(config.loja_slug || 'nossa Loja');
    const envio = await enviarMensagem(config, config.whatsapp_grupo_jid, texto);

    await registrarLog({
      tipo: 'teste',
      destinatario: config.whatsapp_grupo_jid,
      status: 'sucesso',
      payload: { mensagem: texto, gateway: envio.retorno, por: sessao.usuario.email }
    });

    return res.status(200).json({
      ok: true,
      destino: config.whatsapp_grupo_jid,
      mensagem: texto
    });
  } catch (erro) {
    console.error('[whatsapp/test] falhou:', erro.message);

    await registrarLog({
      tipo: 'teste',
      status: 'erro',
      payload: { erro: erro.message, por: sessao.usuario.email }
    });

    return res.status(502).json({ erro: erro.message });
  }
}
