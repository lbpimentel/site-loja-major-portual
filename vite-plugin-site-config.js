/**
 * ============================================================================
 * VITE PLUGIN — SITE CONFIG
 * ============================================================================
 *
 * Injeta os dados de `siteConfig.js` dentro dos arquivos .html EM TEMPO DE BUILD.
 * O HTML final entregue ao navegador já vem preenchido: nada é montado por
 * JavaScript no cliente. Isso preserva SEO, preview de link no WhatsApp e
 * evita o "flash" de conteúdo vazio.
 *
 * ---------------------------------------------------------------------------
 * SINTAXE SUPORTADA NO HTML
 * ---------------------------------------------------------------------------
 *
 * 1) Valor simples — caminho com ponto dentro do siteConfig:
 *
 *      <h1>{{loja.nomeCompleto}}</h1>
 *      <img src="{{marca.logo}}">
 *
 * 2) Lista — repete o bloco para cada item do array.
 *    Dentro do bloco, `item` é o elemento atual e `i` é o índice (base 0):
 *
 *      <!-- @each veneraveis.itens -->
 *        <h3>{{item.nome}}</h3>
 *        <img src="{{item.foto}}" alt="{{item.nome}}">
 *        <p>{{item.anos}}</p>
 *      <!-- @endeach -->
 *
 * Os marcadores ficam em comentários HTML, então o arquivo continua sendo
 * HTML válido e abre normalmente no editor/navegador sem o build.
 *
 * ---------------------------------------------------------------------------
 * ERROS
 * ---------------------------------------------------------------------------
 * Um marcador que não corresponde a nada no config FALHA O BUILD, em vez de
 * emitir uma página com "{{loja.nome}}" cru na tela. Num template revendido
 * para várias Lojas, falhar cedo e alto é o que impede um cliente de receber
 * um site com um marcador aparecendo no meio do texto.
 */

import siteConfig from './siteConfig.js';

/** Resolve "loja.nomeCompleto" dentro do objeto de config. */
function resolvePath(path, scope) {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, scope);
}

/**
 * Escapa caracteres que quebrariam o HTML se um valor do config contivesse
 * aspas ou sinais de menor/maior. `&` vira `&amp;`, que é a forma correta
 * dentro de atributos (o navegador decodifica na leitura).
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Substitui os marcadores de um trecho, usando `scope` como raiz de busca.
 *
 *   {{caminho}}    → valor escapado (seguro para texto e atributos)
 *   {{{caminho}}}  → valor CRU, sem escape
 *
 * A forma crua existe para textos que contêm marcação, como os parágrafos da
 * História (que trazem <strong> no meio). Use-a apenas com conteúdo que você
 * mesmo escreveu no siteConfig.js — nunca com dado vindo de fora.
 */
function interpolate(chunk, scope, filename) {
  const pattern = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g;

  return chunk.replace(pattern, (_match, rawPath, escapedPath) => {
    const path = rawPath ?? escapedPath;
    const isRaw = rawPath !== undefined;
    const value = resolvePath(path, scope);

    if (value === undefined || value === null) {
      throw new Error(
        `[site-config] Marcador {{${path}}} não existe no siteConfig.js ` +
          `(arquivo: ${filename}).`
      );
    }
    if (typeof value === 'object') {
      throw new Error(
        `[site-config] Marcador {{${path}}} aponta para um objeto/array, ` +
          `não para um valor exibível (arquivo: ${filename}). ` +
          `Se a intenção era repetir um bloco, use <!-- @each ${path} -->.`
      );
    }

    return isRaw ? String(value) : escapeHtml(value);
  });
}

/** Expande os blocos <!-- @each caminho --> ... <!-- @endeach -->. */
function expandLoops(html, config, filename) {
  const loopPattern =
    /<!--\s*@each\s+([\w.]+)\s*-->([\s\S]*?)<!--\s*@endeach\s*-->/g;

  return html.replace(loopPattern, (_match, path, template) => {
    const list = resolvePath(path, config);

    if (!Array.isArray(list)) {
      throw new Error(
        `[site-config] <!-- @each ${path} --> não encontrou um array no ` +
          `siteConfig.js (arquivo: ${filename}). Valor recebido: ${typeof list}.`
      );
    }

    return list
      .map((item, i) =>
        // Dentro do laço, `item` e `i` convivem com o config global, então
        // {{loja.nomeCompleto}} continua funcionando lá dentro.
        interpolate(template, { ...config, item, i }, filename)
      )
      .join('');
  });
}

export default function siteConfigPlugin() {
  return {
    name: 'vite-plugin-site-config',

    transformIndexHtml: {
      // `pre` garante que a substituição acontece antes de o Vite processar
      // os assets do HTML — assim os caminhos vindos do config são tratados
      // como qualquer outro caminho escrito à mão.
      order: 'pre',
      handler(html, ctx) {
        const filename = ctx?.filename ?? 'html';

        // Os laços primeiro: os blocos gerados podem conter {{...}} próprios.
        const expanded = expandLoops(html, siteConfig, filename);
        return interpolate(expanded, siteConfig, filename);
      },
    },
  };
}
