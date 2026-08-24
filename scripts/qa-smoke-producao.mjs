import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'https://lojamajormanoelportugal-portal.vercel.app';
const PUBLICAS = ['/index.html', '/login.html', '/cadastro.html', '/historia.html', '/patrono.html', '/timbre.html', '/sisoriente.html'];
const PROTEGIDAS = ['/dashboard.html', '/biblioteca.html', '/calendario.html', '/fraternidade.html', '/tesouraria.html', '/fraternidadezap.html', '/balaustre.html'];

const b = await chromium.launch();

console.log('### PAGINAS PUBLICAS — ' + BASE + '\n');
for (const rota of PUBLICAS) {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const erros = [], falhas = [], http4xx = [];
  page.on('pageerror', (e) => erros.push('JS: ' + String(e.message).slice(0, 120)));
  page.on('console', (m) => m.type() === 'error' && erros.push('console: ' + m.text().slice(0, 120)));
  page.on('requestfailed', (r) => falhas.push(r.url().slice(0, 80) + ' :: ' + r.failure()?.errorText));
  page.on('response', (r) => r.status() >= 400 && http4xx.push(r.status() + ' ' + r.url().slice(0, 80)));

  const t0 = Date.now();
  try { await page.goto(BASE + rota, { waitUntil: 'load', timeout: 30000 }); } catch { erros.push('LOAD nao completou em 30s'); }
  const load = Date.now() - t0;

  const dados = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return {
      titulo: document.title,
      marcadores: [...new Set(document.documentElement.innerHTML.match(/\{\{[^}]{1,50}\}\}/g) || [])],
      imgsQuebradas: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.currentSrc || i.src).slice(0, 70)),
      totalImgs: imgs.length,
      h1: document.querySelectorAll('h1').length,
      peso: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0),
      pedidos: performance.getEntriesByType('resource').length,
      maiores: performance.getEntriesByType('resource')
        .filter((r) => r.transferSize > 150000)
        .map((r) => Math.round(r.transferSize / 1024) + 'KB ' + r.name.split('/').pop())
    };
  });

  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(400);
  const estouro = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  console.log(rota);
  console.log('  load=' + load + 'ms | ' + dados.pedidos + ' pedidos | ' + Math.round(dados.peso / 1024) + 'KB | h1=' + dados.h1 + ' | overflow@375px=' + estouro + 'px');
  if (dados.maiores.length) console.log('  pesados: ' + dados.maiores.join(', '));
  if (dados.marcadores.length) console.log('  !! MARCADORES: ' + dados.marcadores.join(', '));
  if (dados.imgsQuebradas.length) console.log('  !! IMGS QUEBRADAS (' + dados.imgsQuebradas.length + '/' + dados.totalImgs + '): ' + dados.imgsQuebradas.join(' | '));
  [...new Set(erros)].forEach((e) => console.log('  !! ' + e));
  [...new Set(falhas)].forEach((e) => console.log('  !! rede: ' + e));
  [...new Set(http4xx)].forEach((e) => console.log('  !! http: ' + e));
  await ctx.close();
}

console.log('\n### GUARDA DE SESSAO (visitante anonimo)\n');
for (const rota of PROTEGIDAS) {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  try { await page.goto(BASE + rota, { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch {}
  await page.waitForTimeout(4000);
  const url = page.url();
  const redirecionou = /login\.html/.test(url);
  // O que fica visivel na tela ANTES do redirecionamento?
  const vazou = await page.evaluate(() => document.body.innerText.trim().length).catch(() => -1);
  console.log('  ' + rota.padEnd(24) + (redirecionou ? 'OK -> login' : '!! FICOU EM ' + url) + '  (texto visivel: ' + vazou + ' chars)');
  await ctx.close();
}

await b.close();
