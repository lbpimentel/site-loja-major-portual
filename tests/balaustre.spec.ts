import { expect, test } from './fixtures';

/**
 * Balaústre Bot — supressão de conteúdo ritualístico e barreiras de acesso.
 *
 * A supressão é testada no NAVEGADOR, contra o mesmo arquivo que a página
 * carrega: um teste que rodasse contra uma cópia em Node poderia passar
 * enquanto a versão servida ao Secretário falhasse.
 */

async function carregarSanitizador(page) {
  await page.goto('/login.html');
  await page.addScriptTag({ url: '/js/balaustre-sanitizer.js', type: 'module' });
  await page.waitForFunction(() => !!(window as any).BalaustreSanitizer);
}

test.describe('Balaustre - supressao ritualistica', () => {
  test.beforeEach(async ({ page }) => {
    await carregarSanitizador(page);
  });

  test('suprime do rotulo ate o fim do trecho', async ({ page }) => {
    const r = await page.evaluate(() => {
      const S = (window as any).BalaustreSanitizer;
      return S.sanitizar('O Venerável abriu os trabalhos. A palavra de passe do grau e ACACIA. Depois houve a leitura da ata.');
    });

    // O que importa: o que vinha DEPOIS do rótulo não sobreviveu.
    expect(r.texto).not.toContain('ACACIA');
    expect(r.texto).toContain('[SUPRIMIDO - CONFORME RITUAL]');
    // E o que não era ritualístico continua legível.
    expect(r.texto).toContain('O Venerável abriu os trabalhos.');
    expect(r.texto).toContain('Depois houve a leitura da ata.');
  });

  test('cobre os rotulos ritualisticos conhecidos', async ({ page }) => {
    const vazou = await page.evaluate(() => {
      const S = (window as any).BalaustreSanitizer;
      const casos = [
        'A palavra sagrada e SEGREDO1.',
        'O toque foi conferido assim: SEGREDO2.',
        'Bateria de jubilo: SEGREDO3.',
        'Fez-se o retejamento com SEGREDO4.',
        'Deu o sinal de ordem apontando SEGREDO5.',
        'Os sinais do grau sao SEGREDO6.',
        'A marcha maconica do grau e SEGREDO7.',
        'A senha do semestre e SEGREDO8.'
      ];
      return casos
        .map((c, i) => ({ caso: c, vazou: S.sanitizar(c).texto.includes('SEGREDO' + (i + 1)) }))
        .filter((x) => x.vazou)
        .map((x) => x.caso);
    });

    expect(vazou).toEqual([]);
  });

  test('deixa intacto o texto sem conteudo ritualistico', async ({ page }) => {
    const original = 'Sessao ordinaria do 1o grau. O Tronco de Beneficencia arrecadou R$ 250,00. Aprovada a ata anterior por unanimidade.';
    const r = await page.evaluate((texto) => {
      return (window as any).BalaustreSanitizer.sanitizar(texto);
    }, original);

    expect(r.texto).toBe(original);
    expect(r.houveSupressao).toBe(false);
  });

  test('respeita o bloco marcado a mao pelo Secretario', async ({ page }) => {
    const r = await page.evaluate(() => {
      return (window as any).BalaustreSanitizer.sanitizar('Antes ((isto nao deve sair daqui)) depois.');
    });

    expect(r.texto).toBe('Antes [SUPRIMIDO - CONFORME RITUAL] depois.');
    expect(r.texto).not.toContain('nao deve sair');
  });

  test('suprime os termos extras declarados pela Loja', async ({ page }) => {
    const r = await page.evaluate(() => {
      return (window as any).BalaustreSanitizer.sanitizar(
        'O Ir. Fulano mencionou Betelgeuse na sessao.',
        { termosExtras: ['Betelgeuse'] }
      );
    });

    expect(r.texto).not.toContain('Betelgeuse');
  });

  test('detecta residuo ritualistico num texto ja processado', async ({ page }) => {
    const r = await page.evaluate(() => {
      const S = (window as any).BalaustreSanitizer;
      return {
        comResiduo: S.contemResiduoRitual('a palavra de passe e X').encontrou,
        limpo: S.contemResiduoRitual('Sessao ordinaria. Ata aprovada.').encontrou
      };
    });

    expect(r.comResiduo).toBe(true);
    expect(r.limpo).toBe(false);
  });
});

test.describe('Balaustre - barreiras de acesso', () => {
  test('a pagina exige sessao', async ({ page }) => {
    await page.goto('/balaustre.html');
    await page.waitForURL('**/login.html', { timeout: 15000 });
    expect(page.url()).toContain('login.html');
  });

  test('a funcao serverless recusa GET', async ({ request }) => {
    const r = await request.get('/api/balaustre/generate');
    expect(r.status()).toBe(405);
  });

  test('a funcao serverless recusa requisicao sem sessao', async ({ request }) => {
    // Esta é a barreira que impede o endpoint de virar uma conta de IA aberta
    // na internet: sem token, nada chega ao provedor.
    const r = await request.post('/api/balaustre/generate', {
      data: { notas: 'Sessao ordinaria.', metadados: {} }
    });

    expect(r.status()).toBe(401);
    expect((await r.json()).erro).toContain('token');
  });
});
