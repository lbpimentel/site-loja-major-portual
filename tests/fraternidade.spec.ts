import { expect, test } from '@playwright/test';

/**
 * FraternidadeZap — cálculo de aniversários e telefone.
 *
 * Os testes rodam contra o módulo real carregado no navegador, e não contra uma
 * cópia em Node: fuso horário e parsing de data se comportam de forma diferente
 * entre os dois, e é justamente aí que este módulo pode errar.
 *
 * A página do módulo exige sessão, então o script é carregado sobre login.html —
 * /js/fraternidade.js não depende de DOM nem do Supabase para as funções puras.
 */

async function carregarCalculo(page) {
  await page.goto('/login.html');
  await page.addScriptTag({ url: '/js/fraternidade.js' });
  await page.waitForFunction(() => !!(window as any).FraternidadeZap);
}

test.describe('FraternidadeZap - calculo de aniversarios', () => {
  test.beforeEach(async ({ page }) => {
    await carregarCalculo(page);
  });

  test('nao desloca a data por causa do fuso horario', async ({ page }) => {
    // new Date('2000-05-13') seria meia-noite UTC = 12/05 no Brasil.
    const resultado = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      return { dia: c.dataLocal('2000-05-13').getDate(), rotulo: c.diaMes('2000-05-13') };
    });

    expect(resultado.dia).toBe(13);
    expect(resultado.rotulo).toBe('13/05');
  });

  test('conta D-0, D-1 e D-3 corretamente', async ({ page }) => {
    const dias = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      const base = new Date(2026, 4, 13); // 13 de maio de 2026
      return {
        hoje: c.diasAteAniversario('1980-05-13', base),
        amanha: c.diasAteAniversario('1980-05-14', base),
        tres: c.diasAteAniversario('1980-05-16', base)
      };
    });

    expect(dias.hoje).toBe(0);
    expect(dias.amanha).toBe(1);
    expect(dias.tres).toBe(3);
  });

  test('atravessa a virada de ano', async ({ page }) => {
    const dias = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      return {
        // Visto de 31 de dezembro, quem faz em 2 de janeiro é do ano seguinte.
        viradaDeAno: c.diasAteAniversario('1980-01-02', new Date(2026, 11, 31)),
        // Quem fez ontem só volta a fazer daqui a quase um ano.
        ontem: c.diasAteAniversario('1980-05-12', new Date(2026, 4, 13))
      };
    });

    expect(dias.viradaDeAno).toBe(2);
    expect(dias.ontem).toBe(364);
  });

  test('29 de fevereiro cai em 28 nos anos comuns', async ({ page }) => {
    const dia = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      const nascimento = c.dataLocal('2000-02-29');
      return {
        comum: c.proximoAniversario(nascimento, new Date(2027, 0, 1)).getDate(),
        bissexto: c.proximoAniversario(nascimento, new Date(2028, 0, 1)).getDate()
      };
    });

    expect(dia.comum).toBe(28);
    expect(dia.bissexto).toBe(29);
  });

  test('lista o mes corrente em ordem cronologica', async ({ page }) => {
    const nomes = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      const pessoas = [
        { nome: 'C', data_nascimento: '1990-05-28' },
        { nome: 'A', data_nascimento: '1990-05-03' },
        { nome: 'fora', data_nascimento: '1990-06-10' },
        { nome: 'B', data_nascimento: '1990-05-14' }
      ];
      return c.doMesCorrente(pessoas, new Date(2026, 4, 13)).map((p: any) => p.nome);
    });

    expect(nomes).toEqual(['A', 'B', 'C']);
  });
});

test.describe('FraternidadeZap - telefone e mensagens', () => {
  test.beforeEach(async ({ page }) => {
    await carregarCalculo(page);
  });

  test('normaliza os formatos que as pessoas realmente digitam', async ({ page }) => {
    const r = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      return {
        comMascara: c.normalizarTelefoneBR('(21) 99888-7777').e164,
        comDDI: c.normalizarTelefoneBR('+55 21 99888-7777').e164,
        fixo: c.normalizarTelefoneBR('2126661234').e164,
        curto: c.normalizarTelefoneBR('9988').ok,
        vazio: c.normalizarTelefoneBR('').ok
      };
    });

    expect(r.comMascara).toBe('5521998887777');
    expect(r.comDDI).toBe('5521998887777');
    expect(r.fixo).toBe('552126661234');
    expect(r.curto).toBe(false);
    expect(r.vazio).toBe(false);
  });

  test('mascara para leitura sem perder digitos', async ({ page }) => {
    const mascarado = await page.evaluate(() =>
      (window as any).FraternidadeZap.calculo.mascararTelefone('5521998887777')
    );
    expect(mascarado).toBe('(21) 99888-7777');
  });

  test('interpola o template e deixa variavel desconhecida intacta', async ({ page }) => {
    const r = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      return {
        preenchido: c.interpolarTemplate('Ola {nome}, da {loja}!', { nome: 'Ana', loja: 'ARLS X' }),
        // Melhor a variável aparecer crua do que "undefined" numa mensagem
        // que sai em nome da Loja.
        desconhecida: c.interpolarTemplate('Oi {zzz}', {})
      };
    });

    expect(r.preenchido).toBe('Ola Ana, da ARLS X!');
    expect(r.desconhecida).toBe('Oi {zzz}');
  });

  test('monta o link do wa.me com a mensagem codificada', async ({ page }) => {
    const links = await page.evaluate(() => {
      const c = (window as any).FraternidadeZap.calculo;
      return {
        comNumero: c.linkWhatsApp('5521998887777', 'Oi Ana'),
        semNumero: c.linkWhatsApp('', 'Oi Ana')
      };
    });

    expect(links.comNumero).toBe('https://wa.me/5521998887777?text=Oi%20Ana');
    // Sem telefone cadastrado o botão ainda serve: abre para escolher o contato.
    expect(links.semNumero).toBe('https://wa.me/?text=Oi%20Ana');
  });
});

test.describe('FraternidadeZap - pagina', () => {
  test('exige sessao e manda o visitante para o login', async ({ page }) => {
    await page.goto('/fraternidadezap.html');
    await page.waitForURL('**/login.html', { timeout: 15000 });
    expect(page.url()).toContain('login.html');
  });
});
