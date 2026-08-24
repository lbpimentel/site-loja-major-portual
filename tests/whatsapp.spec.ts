import { expect, test } from './fixtures';

/**
 * FraternidadeZap — barreiras das funções de disparo.
 *
 * Estes endpoints mandam mensagem em nome da Loja. O que precisa estar provado
 * é que ninguém dispara sem passar pelo porteiro: uma função em `api/` é uma
 * URL pública, e quem descobrisse o endereço poderia usar o grupo à vontade.
 */

test.describe('Cron de aniversarios', () => {
  test('recusa chamada sem o segredo do cron', async ({ request }) => {
    const r = await request.get('/api/cron/birthdays');

    expect(r.status()).toBe(401);
  });

  test('recusa um segredo errado', async ({ request }) => {
    const r = await request.get('/api/cron/birthdays', {
      headers: { Authorization: 'Bearer segredo-errado' }
    });

    expect(r.status()).toBe(401);
  });

  test('sem CRON_SECRET configurada, recusa em vez de rodar aberta', async ({ request }) => {
    // Falhar fechado é a decisão que importa aqui: um disparo automático sem
    // porteiro é pior do que um disparo que não acontece.
    const r = await request.get('/api/cron/birthdays', {
      headers: { Authorization: 'Bearer qualquer-coisa' }
    });

    expect(r.status()).toBe(401);
    expect((await r.json()).erro).toBeTruthy();
  });
});

test.describe('Disparo de teste', () => {
  test('recusa GET', async ({ request }) => {
    const r = await request.get('/api/whatsapp/test');
    expect(r.status()).toBe(405);
  });

  test('recusa requisicao sem sessao', async ({ request }) => {
    const r = await request.post('/api/whatsapp/test', { data: {} });

    expect(r.status()).toBe(401);
    expect((await r.json()).erro).toContain('token');
  });

  test('recusa um token de sessao invalido', async ({ request }) => {
    const r = await request.post('/api/whatsapp/test', {
      headers: { Authorization: 'Bearer nao-e-um-jwt' },
      data: {}
    });

    // 401 pela sessão inválida, ou 401 por falta de configuração do Supabase
    // nesta máquina — em nenhum dos dois casos a mensagem sai.
    expect(r.status()).toBe(401);
  });
});

test.describe('Aba de configuracao', () => {
  test('a pagina continua exigindo sessao', async ({ page }) => {
    await page.goto('/fraternidadezap.html');
    await page.waitForURL('**/login.html', { timeout: 15000 });
    expect(page.url()).toContain('login.html');
  });
});
