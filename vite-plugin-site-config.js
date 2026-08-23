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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import siteConfig, { slugLoja } from './siteConfig.js';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));

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
 * Escape para valores que caem dentro de uma string JavaScript (o modelo do
 * service worker). Aqui o escape de HTML seria errado: `&` viraria `&amp;` no
 * meio de uma URL de precache.
 */
function escapeJs(value) {
  // JSON.stringify ja produz exatamente o conteudo de uma string JS entre
  // aspas duplas; so removemos as aspas externas, que o modelo ja traz.
  // Por isso os marcadores no modelo do SW usam aspas DUPLAS.
  return JSON.stringify(String(value)).slice(1, -1);
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
function interpolate(chunk, scope, filename, escape = escapeHtml) {
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

    return isRaw ? String(value) : escape(value);
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

/**
 * ---------------------------------------------------------------------------
 * PWA — manifest.json e sw.js gerados a partir do config
 * ---------------------------------------------------------------------------
 * Estes dois arquivos NAO podem morar em `public/`: o Vite copia public/ cru,
 * sem passar por aqui, e toda Loja acabaria publicando o nome e o logo da
 * Major Portugal no icone de app instalado. Sao gerados no build (e servidos
 * de memoria no dev) para acompanharem a Loja que esta sendo construida.
 */

/** Tipo MIME do icone, deduzido da extensao do arquivo de logo. */
function tipoDaImagem(caminho) {
  const ext = path.extname(caminho).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function gerarManifest() {
  const { loja, marca } = siteConfig;

  return JSON.stringify(
    {
      name: loja.nomeCompleto,
      short_name: loja.nomeCurto,
      description: loja.metaDescricao,
      start_url: '/index.html',
      display: 'standalone',
      background_color: marca.corFundo ?? '#0a0a0a',
      theme_color: marca.corPrimaria,
      orientation: 'portrait',
      icons: [192, 512].map((lado) => ({
        src: marca.logo,
        sizes: `${lado}x${lado}`,
        type: tipoDaImagem(marca.logo),
        purpose: 'any',
      })),
    },
    null,
    2
  );
}

function gerarServiceWorker() {
  const modelo = path.join(RAIZ, 'pwa', 'sw-template.js');
  const fonte = fs.readFileSync(modelo, 'utf-8');

  // O nome do cache carrega o slug: sem isso, quem visitasse duas Lojas no
  // mesmo navegador veria uma servir paginas da outra a partir do cache.
  const escopo = {
    ...siteConfig,
    pwa: { cacheName: `${slugLoja}-v1` },
  };

  return interpolate(fonte, escopo, 'pwa/sw-template.js', escapeJs);
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

    /** No build: emite manifest.json e sw.js na raiz do dist. */
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: gerarManifest(),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: gerarServiceWorker(),
      });
    },

    /**
     * No dev: serve os mesmos dois arquivos de memoria. Sem isto, /manifest.json
     * e /sw.js dariam 404 apenas em desenvolvimento, e o PWA so seria testavel
     * depois do build — o tipo de diferenca entre dev e producao que faz um bug
     * aparecer tarde demais.
     */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rota = (req.url || '').split('?')[0];

        if (rota === '/manifest.json') {
          res.setHeader('Content-Type', 'application/manifest+json');
          return res.end(gerarManifest());
        }
        if (rota === '/sw.js') {
          res.setHeader('Content-Type', 'application/javascript');
          return res.end(gerarServiceWorker());
        }
        return next();
      });
    },
  };
}
