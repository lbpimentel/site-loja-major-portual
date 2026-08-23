/**
 * Cliente Supabase — configurado por Loja.
 *
 * Este arquivo NÃO contém chaves. A URL e a chave publicável da Loja que está
 * sendo servida são injetadas no HTML em tempo de build, a partir de
 * `lojas/<slug>.js` → integracoes.supabase (ver vite-plugin-site-config.js).
 *
 * Cada Loja aponta para o SEU PRÓPRIO projeto Supabase. Bancos fisicamente
 * separados: não existe tabela compartilhada de onde uma Loja possa ler a outra.
 *
 * Lembrete de segurança: a chave publicável é visível para qualquer visitante
 * — é assim por design. Quem impede a leitura indevida dos dados é o RLS no
 * banco (ver supabase/01_rls.sql), nunca o sigilo desta chave.
 */

(function () {
  const cfg = window.__SITE_CONFIG__ && window.__SITE_CONFIG__.supabase;

  // Falhar alto e claro: sem isto, as páginas quebrariam mais adiante de forma
  // confusa ("supabaseClient is undefined"), longe da causa real.
  if (!cfg || !cfg.url || !cfg.anonKey) {
    throw new Error(
      '[supabase-config] Configuracao da Loja ausente. Verifique se a pagina ' +
        'define window.__SITE_CONFIG__.supabase antes de carregar este script, ' +
        'e se integracoes.supabase esta preenchido em lojas/<slug>.js.'
    );
  }

  window.supabaseClient = supabase.createClient(cfg.url, cfg.anonKey);
})();
