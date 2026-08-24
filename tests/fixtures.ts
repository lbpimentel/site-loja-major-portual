import { test as base, expect } from '@playwright/test';

/**
 * Fixture compartilhada dos testes.
 *
 * Existe por um motivo so: fazer `page.goto` esperar `domcontentloaded` em vez do
 * padrao `load`. O Playwright nao aceita um `waitUntil` global no
 * playwright.config.ts, entao o lugar de centralizar isso e aqui.
 *
 * Por que importa: esperar o evento `load` amarra a suite inteira a recursos
 * externos. Uma imagem remota que nunca resolve — foi o caso da imagem morta do
 * Google AI Studio no login — segura a navegacao ate estourar o timeout, e o
 * teste falha sem que exista defeito nenhum no comportamento. Rodando com tres
 * workers, 23 dos 36 testes falhavam assim; com um worker, so 1. Nenhum deles
 * dependia de imagem carregada.
 *
 * Uma chamada que precise mesmo do `load` continua podendo pedir:
 * `page.goto(url, { waitUntil: 'load' })` — o que o teste passa vence o padrao.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const gotoOriginal = page.goto.bind(page);
    page.goto = (url, opcoes) => gotoOriginal(url, { waitUntil: 'domcontentloaded', ...opcoes });
    await use(page);
  }
});

export { expect };
