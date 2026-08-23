/**
 * ============================================================================
 * VALIDAÇÃO DE SESSÃO NAS FUNÇÕES SERVERLESS
 * ============================================================================
 *
 * Uma função em `api/` é uma URL pública. Sem esta checagem, qualquer pessoa
 * poderia chamar os endpoints que gastam dinheiro (IA) ou falam em nome da
 * Loja (WhatsApp), e a conta chegaria sem ninguém saber de onde veio.
 *
 * A verificação é feita por fetch contra o próprio Supabase, em vez do SDK:
 * são duas chamadas HTTP simples, e carregar uma dependência inteira numa
 * função que só precisa saber se um token vale não se justifica.
 *
 * As duas funções abaixo usam o token DO USUÁRIO, nunca a service_role. É de
 * propósito: assim `auth.uid()` existe do lado do banco e as políticas de RLS
 * e as funções como `is_diretoria_zap()` respondem sobre a pessoa certa. Com a
 * service_role, tudo responderia "sim" e a checagem não checaria nada.
 */

import { normalizarUrlSupabase } from '../../supabase-url.js';

function ambiente() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return null;
  }
  return { url: normalizarUrlSupabase(url), anon: anon };
}

/** Extrai o token do cabeçalho `Authorization: Bearer ...`. */
export function tokenDaRequisicao(req) {
  const cabecalho = req.headers.authorization || req.headers.Authorization || '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7).trim() : '';
}

/** Confirma que quem chamou tem sessão ativa no Supabase desta Loja. */
export async function sessaoValida(req) {
  const token = tokenDaRequisicao(req);
  if (!token) {
    return { ok: false, motivo: 'Requisição sem token de sessão.' };
  }

  const env = ambiente();
  if (!env) {
    return {
      ok: false,
      motivo: 'SUPABASE_URL/SUPABASE_ANON_KEY não configuradas nesta implantação.'
    };
  }

  try {
    const resposta = await fetch(env.url + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: env.anon }
    });

    if (!resposta.ok) {
      return { ok: false, motivo: 'Sessão inválida ou expirada.' };
    }
    return { ok: true, usuario: await resposta.json(), token: token };
  } catch (erro) {
    return { ok: false, motivo: 'Não consegui validar a sessão: ' + erro.message };
  }
}

/**
 * Pergunta ao BANCO se o usuário da sessão administra o Zap.
 *
 * Chamar a função SQL em vez de reimplementar a regra aqui é o ponto: a lista
 * de cargos vive num lugar só (migração 05). Uma cópia em JavaScript ficaria
 * para trás na primeira vez que a Loja mudasse quem manda no grupo.
 */
export async function ehDiretoriaZap(token) {
  const env = ambiente();
  if (!env) return false;

  try {
    const resposta = await fetch(env.url + '/rest/v1/rpc/is_diretoria_zap', {
      method: 'POST',
      headers: {
        apikey: env.anon,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });

    if (!resposta.ok) return false;
    return (await resposta.json()) === true;
  } catch (erro) {
    return false;
  }
}
