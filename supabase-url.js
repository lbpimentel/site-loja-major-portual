/**
 * ============================================================================
 * NORMALIZAÇÃO DA URL DO SUPABASE
 * ============================================================================
 *
 * O painel do Supabase mostra vários endereços na mesma tela de API, e o que
 * o cliente precisa é o mais curto de todos — a raiz do projeto:
 *
 *   https://xxxxx.supabase.co          ← este
 *   https://xxxxx.supabase.co/rest/v1  ← endpoint REST, fácil de copiar por engano
 *
 * Copiar o errado quebra TUDO de um jeito que não parece ter relação com a
 * causa: o `createClient` acrescenta os próprios caminhos, então o cadastro
 * tenta `/rest/v1/auth/v1/signup`, uma rota que não existe, e o gateway
 * responde "Invalid path specified in request URL". Quem lê essa mensagem no
 * formulário não tem como adivinhar que o problema é uma variável de ambiente.
 *
 * Aconteceu em produção. E vai acontecer de novo a cada Loja nova, porque a
 * configuração é feita por quem está vendo o painel do Supabase pela primeira
 * vez. Por isso a correção não é só arrumar o valor: é o código passar a
 * aceitar as duas formas.
 *
 * Este arquivo é importado pelo build (siteConfig.js) e pelas funções
 * serverless (api/_lib/), para que os dois lados apliquem a MESMA regra.
 */

/**
 * Devolve a raiz do projeto Supabase, sem barra no fim.
 *
 * Tolera o que as pessoas realmente colam:
 *   https://x.supabase.co/            → https://x.supabase.co
 *   https://x.supabase.co/rest/v1/    → https://x.supabase.co
 *   https://x.supabase.co/auth/v1     → https://x.supabase.co
 *   https://x.supabase.co/storage/v1  → https://x.supabase.co
 */
export function normalizarUrlSupabase(bruta) {
  const texto = String(bruta || '').trim();
  if (!texto) return '';

  return texto
    // Sufixos de API que o painel exibe ao lado da URL do projeto.
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/?$/i, '')
    // Barras sobrando no fim: `url + '/auth/v1/user'` viraria `//auth/v1/user`,
    // e o gateway trata caminho com barra dupla como rota diferente.
    .replace(/\/+$/, '');
}
