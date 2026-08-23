/**
 * ============================================================================
 * VITE PLUGIN — FUNÇÕES /api EM DESENVOLVIMENTO
 * ============================================================================
 *
 * Em produção a Vercel serve sozinha tudo que está em `api/`. O `vite dev`
 * não: para ele, `api/` é só uma pasta qualquer do repositório, e uma chamada
 * a /api/balaustre/generate devolveria o index.html.
 *
 * Isso criaria o pior tipo de diferença entre ambientes — a que só aparece
 * depois do deploy. Este plugin serve as mesmas funções no dev, adaptando o
 * `res` do connect (que o Vite usa) para a interface que os handlers da
 * Vercel esperam: res.status().json().
 *
 * O módulo é recarregado a cada requisição, sem cache, para que editar o
 * arquivo da função tenha efeito sem reiniciar o servidor — o mesmo que
 * acontece com o resto do código no dev.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Acrescenta ao `res` do connect os métodos que o handler da Vercel usa. */
function adaptarResposta(res) {
  res.status = function (codigo) {
    res.statusCode = codigo;
    return res;
  };

  res.json = function (corpo) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
    return res;
  };

  res.send = function (corpo) {
    res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    return res;
  };

  return res;
}

export default function apiDevPlugin(opcoes) {
  const config = opcoes || {};
  const raiz = config.raiz || process.cwd();
  const pastaApi = path.join(raiz, 'api');

  return {
    name: 'vite-plugin-api-dev',
    apply: 'serve',

    configureServer(server) {
      server.middlewares.use(async function (req, res, next) {
        const rota = (req.url || '').split('?')[0];
        if (!rota.startsWith('/api/')) return next();

        // Sem `..` no caminho: um pedido a /api/../../.env chegaria aqui e
        // sairia da pasta api/ se o caminho fosse usado como veio.
        const relativo = path.normalize(rota.slice('/api/'.length));
        if (relativo.startsWith('..') || path.isAbsolute(relativo)) {
          res.statusCode = 400;
          return res.end('Caminho inválido.');
        }

        const candidatos = [
          path.join(pastaApi, relativo + '.js'),
          path.join(pastaApi, relativo, 'index.js')
        ];
        const arquivo = candidatos.find(function (c) { return fs.existsSync(c); });

        if (!arquivo) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.end(JSON.stringify({ erro: 'Função não encontrada: ' + rota }));
        }

        try {
          // A query serve de cache-buster do import(): sem ela, a segunda
          // requisição reusaria a versão antiga do módulo.
          const url = pathToFileURL(arquivo).href + '?t=' + Date.now();
          const modulo = await import(url);
          const handler = modulo.default;

          if (typeof handler !== 'function') {
            throw new Error('O arquivo não exporta um handler como default.');
          }

          await handler(req, adaptarResposta(res));
        } catch (erro) {
          server.config.logger.error('[api-dev] ' + rota + ': ' + erro.message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ erro: erro.message }));
          }
        }
      });
    }
  };
}
