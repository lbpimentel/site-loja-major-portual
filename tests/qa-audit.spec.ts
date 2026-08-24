import { expect, test, type Page } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AUDITORIA DE QA — varredura de todas as paginas do portal.
 *
 * Nao substitui os specs de comportamento: aqui o objetivo e levantar
 * problemas transversais (erros de console, assets quebrados, marcadores
 * nao substituidos, acessibilidade basica, overflow no celular) em TODAS
 * as paginas de uma vez, e despejar tudo num relatorio JSON.
 */

const PAGINAS_PUBLICAS = [
  '/index.html',
  '/login.html',
  '/cadastro.html',
  '/historia.html',
  '/patrono.html',
  '/timbre.html',
  '/privacidade.html',
  // Landing comercial do SisOriente: e publica de proposito, nao area restrita.
  '/sisoriente.html'
];

const PAGINAS_PROTEGIDAS = [
  '/dashboard.html',
  '/biblioteca.html',
  '/calendario.html',
  '/fraternidade.html',
  '/tesouraria.html',
  '/fraternidadezap.html',
  '/balaustre.html'
];

type Achado = { pagina: string; tipo: string; detalhe: string };
const achados: Achado[] = [];
const anota = (pagina: string, tipo: string, detalhe: string) =>
  achados.push({ pagina, tipo, detalhe });

const DESTINO = path.resolve('test-results/qa-audit.json');

test.afterAll(() => {
  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  const anterior = fs.existsSync(DESTINO) ? JSON.parse(fs.readFileSync(DESTINO, 'utf8')) : [];
  fs.writeFileSync(DESTINO, JSON.stringify([...anterior, ...achados], null, 2), 'utf8');
  console.log('[qa-audit] ' + achados.length + ' achados -> ' + DESTINO);
});

/** Liga os coletores de erro/rede ANTES da navegacao. */
function coletar(page: Page, rotulo: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') anota(rotulo, 'console-error', msg.text().slice(0, 300));
    if (msg.type() === 'warning' && /tailwind|production/i.test(msg.text()))
      anota(rotulo, 'console-warn', msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => anota(rotulo, 'js-exception', String(err.message).slice(0, 300)));
  page.on('requestfailed', (req) =>
    anota(rotulo, 'request-failed', req.url() + ' :: ' + req.failure()?.errorText)
  );
  page.on('response', (res) => {
    if (res.status() >= 400) anota(rotulo, 'http-' + res.status(), res.url());
  });
}

/** Checagens de conteudo que valem para qualquer pagina renderizada. */
async function auditarDocumento(page: Page, rotulo: string) {
  const r = await page.evaluate(() => {
    const out: { tipo: string; detalhe: string }[] = [];
    const add = (tipo: string, detalhe: string) => out.push({ tipo, detalhe });

    // 1. Marcadores {{...}} que o build deveria ter substituido.
    const marcadores = document.documentElement.innerHTML.match(/\{\{[^}]{1,60}\}\}/g) || [];
    [...new Set(marcadores)].forEach((m) => add('marcador-nao-substituido', m));

    // 2. <head> / SEO / i18n
    if (!document.documentElement.lang) add('seo', 'sem atributo lang no <html>');
    if (!document.title.trim()) add('seo', 'sem <title>');
    if (!document.querySelector('meta[name="description"]')) add('seo', 'sem meta description');
    if (!document.querySelector('meta[name="viewport"]')) add('seo', 'sem meta viewport');
    if (!document.querySelector('link[rel*="icon"]')) add('seo', 'sem favicon');
    if (!document.querySelector('meta[property^="og:"]')) add('seo', 'sem Open Graph (og:*)');
    if (!document.querySelector('link[rel="canonical"]')) add('seo', 'sem link canonical');

    // 3. Hierarquia de titulos
    const h1 = document.querySelectorAll('h1');
    if (h1.length === 0) add('a11y', 'nenhum <h1>');
    if (h1.length > 1) add('a11y', h1.length + ' elementos <h1> (deveria haver 1)');

    // 4. Imagens: alt e src efetivamente carregado
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '(sem src)';
      if (!img.hasAttribute('alt')) add('a11y', '<img> sem alt: ' + src);
      if (img.complete && img.naturalWidth === 0) add('img-quebrada', src);
      if (!img.getAttribute('loading') && !img.closest('header,nav'))
        add('perf', '<img> sem loading=lazy: ' + src);
    });

    // 5. IDs duplicados quebram label[for], getElementById e ancoras.
    const vistos = new Set<string>();
    document.querySelectorAll('[id]').forEach((el) => {
      const id = el.id;
      if (vistos.has(id)) add('html-invalido', 'id duplicado: #' + id);
      vistos.add(id);
    });

    // 6. Campos de formulario sem rotulo acessivel
    document.querySelectorAll('input,select,textarea').forEach((el) => {
      const c = el as HTMLInputElement;
      if (['hidden', 'submit', 'button'].includes(c.type)) return;
      const temLabel =
        (c.id && document.querySelector('label[for="' + CSS.escape(c.id) + '"]')) ||
        c.closest('label') ||
        c.getAttribute('aria-label') ||
        c.getAttribute('aria-labelledby');
      if (!temLabel)
        add('a11y', 'campo sem label: <' + c.tagName.toLowerCase() + ' name="' + c.name + '" id="' + c.id + '">');
    });
    document.querySelectorAll('label[for]').forEach((l) => {
      const alvo = l.getAttribute('for')!;
      if (!document.getElementById(alvo))
        add('html-invalido', 'label[for="' + alvo + '"] sem campo correspondente');
    });

    // 7. Botoes/links so com icone e sem nome acessivel
    document.querySelectorAll('button,a').forEach((el) => {
      const texto = (el.textContent || '').trim();
      const rotulado = el.getAttribute('aria-label') || el.getAttribute('title');
      const icone = el.querySelector('.material-symbols-outlined,svg');
      if (!rotulado && icone && (!texto || /^[a-z_]{2,20}$/.test(texto)))
        add('a11y', el.tagName.toLowerCase() + ' so com icone e sem aria-label: "' + texto + '"');
    });

    // 8. target=_blank sem rel=noopener
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      const rel = a.getAttribute('rel') || '';
      if (!/noopener/.test(rel))
        add('seguranca', 'target=_blank sem rel=noopener: ' + a.getAttribute('href'));
    });

    // 9. Links mortos / placeholders
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href')!;
      if (href === '#' || href === '' || href.toLowerCase().startsWith('javascript:void'))
        add('link-placeholder', 'href="' + href + '" em "' + (a.textContent || '').trim().slice(0, 40) + '"');
    });

    // 10. Segredos plausiveis no HTML servido ao visitante
    const html = document.documentElement.innerHTML;
    const padroes: [RegExp, string][] = [
      [/eyJhbGciOiJIUzI1NiI[A-Za-z0-9._-]+/g, 'JWT (chave Supabase) embutido no HTML'],
      [/AIza[0-9A-Za-z_-]{35}/g, 'Google/Gemini API key embutida no HTML'],
      [/sk-[A-Za-z0-9]{20,}/g, 'chave secreta estilo sk-... embutida no HTML']
    ];
    padroes.forEach(([re, msg]) => {
      const m = html.match(re);
      if (m) add('seguranca', msg + ' (' + m.length + 'x)');
    });

    // 11. Links internos: colete para checagem HTTP fora do browser
    const internos = [...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href')!)
      .filter((h) => /\.html($|[?#])/.test(h) && !/^https?:/i.test(h));

    return { out, internos: [...new Set(internos)] };
  });

  r.out.forEach((x) => anota(rotulo, x.tipo, x.detalhe));
  return r.internos;
}

/** Overflow horizontal: o sintoma classico de layout quebrado no celular. */
async function auditarOverflow(page: Page, rotulo: string, largura: number) {
  await page.setViewportSize({ width: largura, height: 800 });
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    const estouro = doc.scrollWidth - doc.clientWidth;
    const culpados: string[] = [];
    if (estouro > 2) {
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > doc.clientWidth + 2 && culpados.length < 5) {
          const e = el as HTMLElement;
          const cls =
            typeof e.className === 'string' && e.className.trim()
              ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.')
              : '';
          culpados.push(
            e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls + ' (right=' + Math.round(r.right) + ')'
          );
        }
      });
    }
    return { estouro, culpados };
  });
  if (info.estouro > 2)
    anota(rotulo, 'overflow-' + largura + 'px', 'estoura ' + info.estouro + 'px — ' + info.culpados.join(' | '));
}

/** Alvos de toque pequenos demais no celular (WCAG 2.5.5). */
async function auditarAlvosDeToque(page: Page, rotulo: string) {
  const pequenos = await page.evaluate(() => {
    const res: string[] = [];
    document.querySelectorAll('a,button,input[type=checkbox],input[type=radio]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if ((r.width < 32 || r.height < 32) && res.length < 8) {
        const e = el as HTMLElement;
        res.push(
          e.tagName.toLowerCase() +
            (e.id ? '#' + e.id : '') +
            ' "' +
            (e.textContent || '').trim().slice(0, 20) +
            '" ' +
            Math.round(r.width) +
            'x' +
            Math.round(r.height)
        );
      }
    });
    return res;
  });
  pequenos.forEach((p) => anota(rotulo, 'a11y-toque', p));
}

test.describe('QA Audit — paginas publicas', () => {
  for (const rota of PAGINAS_PUBLICAS) {
    test('audita ' + rota, async ({ page, request }) => {
      coletar(page, rota);
      const resp = await page.goto(rota, { waitUntil: 'networkidle' }).catch(() => null);
      if (!resp) {
        anota(rota, 'falha-navegacao', 'page.goto nao retornou resposta');
        return;
      }
      expect(resp.status(), rota + ' deveria responder 200').toBeLessThan(400);

      const internos = await auditarDocumento(page, rota);

      for (const href of internos) {
        const alvo = href.startsWith('/') ? href : '/' + href.replace(/^\.\//, '');
        const r = await request.get(alvo.split('#')[0]).catch(() => null);
        if (!r || r.status() >= 400)
          anota(rota, 'link-quebrado', href + ' -> ' + (r ? r.status() : 'erro de rede'));
      }

      await auditarOverflow(page, rota, 375);
      await auditarAlvosDeToque(page, rota);
      await auditarOverflow(page, rota, 768);
    });
  }
});

test.describe('QA Audit — guarda de sessao', () => {
  for (const rota of PAGINAS_PROTEGIDAS) {
    test(rota + ' exige sessao', async ({ page }) => {
      coletar(page, rota);
      await page.goto(rota);
      await page
        .waitForURL('**/login.html*', { timeout: 12000 })
        .catch(() => anota(rota, 'AUTH', 'pagina protegida NAO redirecionou para o login'));
    });
  }
});
