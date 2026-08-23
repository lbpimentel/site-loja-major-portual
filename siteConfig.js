/**
 * ============================================================================
 * SITE CONFIG — SELETOR DE LOJA
 * ============================================================================
 *
 * Este arquivo NÃO contém dados. Ele apenas escolhe QUAL Loja será construída.
 * Os dados de cada Loja vivem em `lojas/<slug>.js`.
 *
 * ---------------------------------------------------------------------------
 * COMO CONSTRUIR CADA LOJA
 * ---------------------------------------------------------------------------
 *
 *   npm run build                    → Major Portugal (padrão)
 *   LOJA=loja-b npm run build        → Loja B
 *   LOJA=loja-b npm run dev          → roda a Loja B em desenvolvimento
 *
 * No Windows (PowerShell):
 *   $env:LOJA="loja-b"; npm run build
 *
 * ---------------------------------------------------------------------------
 * COMO ADICIONAR UMA LOJA NOVA (2 passos)
 * ---------------------------------------------------------------------------
 *
 *   1. Copie `lojas/_modelo.js` para `lojas/nome-da-loja.js` e preencha.
 *   2. Registre-a no objeto `LOJAS` abaixo.
 *
 * Nenhum arquivo .html precisa ser tocado.
 */

import majorPortugal from './lojas/major-portugal.js';
import lojaTeste from './lojas/loja-teste.js';

/**
 * Registro de Lojas. A chave é o valor usado na variável de ambiente LOJA.
 * Ao vender para uma Loja nova, importe o arquivo dela e acrescente aqui.
 */
const LOJAS = {
  'major-portugal': majorPortugal,
  'loja-teste': lojaTeste
};
const LOJA_PADRAO = 'major-portugal';

const slug = process.env.LOJA || LOJA_PADRAO;
const config = LOJAS[slug];

// Falhar alto: um slug errado geraria o site da Loja ERRADA sem avisar ninguém,
// e esse é o tipo de erro que só se descobre depois de entregar ao cliente.
if (!config) {
  const disponiveis = Object.keys(LOJAS).join(', ');
  throw new Error(
    `[siteConfig] Loja "${slug}" não está registrada. ` +
      `Lojas disponíveis: ${disponiveis}. ` +
      `Registre-a no objeto LOJAS em siteConfig.js.`
  );
}

// Override integrations with environment variables if present (useful for local development/tests)
if (config && config.integracoes && config.integracoes.supabase) {
  if (process.env.SUPABASE_URL) {
    config.integracoes.supabase.url = process.env.SUPABASE_URL;
  }
  if (process.env.SUPABASE_ANON_KEY) {
    config.integracoes.supabase.anonKey = process.env.SUPABASE_ANON_KEY;
  }
}

console.log(`[siteConfig] Construindo o site da Loja: ${slug}`);

export default config;
