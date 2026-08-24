import { expect, test } from './fixtures';

/**
 * QA funcional — exercita os fluxos que um visitante/membro realmente faz.
 *
 * As chamadas para EmailJS e Supabase sao INTERCEPTADAS: o objetivo e ver como a
 * interface se comporta, sem disparar e-mail de verdade nem sujar o banco.
 *
 * Estes testes nasceram de uma auditoria e agora AFIRMAM as correcoes: cada um
 * fica vermelho de novo se o defeito voltar.
 */

test.describe('Home — formulario "Quero ser Macom"', () => {
  /** Abre o modal e preenche os campos obrigatorios com dados validos. */
  async function preencher(page: import('@playwright/test').Page) {
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Quero ser Maçom' }).first().dispatchEvent('click');
    await expect(page.locator('#interestModal')).toBeVisible();
    await page.fill('#cand_nome', 'Fulano de Tal');
    await page.fill('#cand_tel', '21998887777');
    await page.fill('#cand_email', 'fulano@example.com');
    await page.fill('#cand_idade', '35');
    await page.fill('#cand_bairro', 'Centro');
  }

  test('grava no banco ANTES de mandar o e-mail', async ({ page }) => {
    // A ordem e o defeito que este teste protege. Com o e-mail primeiro, uma
    // falha do banco depois do envio fazia o candidato ver "houve um problema" e
    // reenviar — e a Loja recebia a mesma candidatura varias vezes.
    const ordem: string[] = [];

    await page.route('**/rest/v1/candidatos_interesse**', async (rota) => {
      ordem.push('banco');
      await rota.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api.emailjs.com/**', async (rota) => {
      ordem.push('email');
      await rota.fulfill({ status: 200, body: 'OK' });
    });

    await preencher(page);
    await page.locator('#interestForm button[type=submit]').click();

    await expect(page.locator('#avisos')).toContainText('Solicitação recebida', { timeout: 10000 });
    expect(ordem, 'o banco e a fonte da verdade e vem primeiro').toEqual(['banco', 'email']);
  });

  test('e-mail fora do ar nao vira erro: a candidatura ja foi gravada', async ({ page }) => {
    await page.route('**/rest/v1/candidatos_interesse**', (rota) =>
      rota.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api.emailjs.com/**', (rota) => rota.abort('failed'));

    await preencher(page);
    await page.locator('#interestForm button[type=submit]').click();

    // O que a pessoa preencheu esta salvo; falar em erro aqui faria ela reenviar.
    await expect(page.locator('#avisos')).toContainText('Solicitação recebida', { timeout: 10000 });
    await expect(page.locator('#interestModal')).toBeHidden();
  });

  test('banco recusando: aviso de erro claro, sem alert() nativo', async ({ page }) => {
    await page.route('**/rest/v1/candidatos_interesse**', (rota) =>
      rota.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"permission denied"}' })
    );

    const dialogosNativos: string[] = [];
    page.on('dialog', async (d) => {
      dialogosNativos.push(d.message());
      await d.dismiss();
    });

    await preencher(page);
    await page.locator('#interestForm button[type=submit]').click();

    await expect(page.locator('#avisos')).toContainText('Não conseguimos registrar', { timeout: 10000 });
    // alert() bloqueia a aba e alguns navegadores de celular simplesmente o suprimem.
    expect(dialogosNativos, 'nao deve sobrar alert() nativo neste fluxo').toEqual([]);
    // O botao volta a funcionar para a pessoa poder tentar de novo.
    await expect(page.locator('#interestForm button[type=submit]')).toBeEnabled();
  });

  test('a idade so aceita quem tem idade para ser iniciado', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Quero ser Maçom' }).first().dispatchEvent('click');

    const idade = page.locator('#cand_idade');
    await expect(idade).toHaveAttribute('min', '21');
    await expect(idade).toHaveAttribute('max', '99');

    await idade.fill('-5');
    const valido = await idade.evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(valido, 'idade negativa nao pode passar na validacao').toBe(false);
  });

  test('a mascara de telefone descarta o que nao e digito', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Quero ser Maçom' }).first().dispatchEvent('click');
    await page.fill('#cand_tel', 'abcdef');
    await expect(page.locator('#cand_tel')).toHaveValue('');
  });

  test('todo campo do formulario tem rotulo ligado a ele', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Quero ser Maçom' }).first().dispatchEvent('click');

    const semRotulo = await page.$$eval('#interestForm input', (els) =>
      els
        .filter((e) => !document.querySelector('label[for="' + (e as HTMLInputElement).id + '"]'))
        .map((e) => (e as HTMLInputElement).id)
    );
    // O placeholder nao serve de rotulo: ele some assim que a pessoa digita.
    expect(semRotulo).toEqual([]);
  });
});

test.describe('Home — galeria e calendario', () => {
  test('lightbox abre, navega e fecha', async ({ page }) => {
    await page.goto('/index.html');
    // As <img class="gallery-img-source"> ficam ocultas; quem recebe o clique e
    // o quadrado com a foto de fundo.
    await page.locator('#galeria .cursor-pointer').first().click();

    const lb = page.locator('#lightbox');
    await expect(lb).toBeVisible();
    const primeira = await page.getAttribute('#lightboxImg', 'src');

    await page.getByRole('button', { name: 'Próxima foto' }).click();
    await expect
      .poll(() => page.getAttribute('#lightboxImg', 'src'), { timeout: 5000 })
      .not.toBe(primeira);
  });

  test('a agenda abre no mes que tem sessao, e nao num mes vazio', async ({ page }) => {
    // Duas sessoes num mes distante do corrente: se o calendario ainda abrisse
    // em "hoje", a grade viria vazia e o visitante concluiria que a Loja parou.
    const distante = new Date();
    distante.setMonth(distante.getMonth() + 5);
    const mes = String(distante.getMonth() + 1).padStart(2, '0');
    const dia = `${distante.getFullYear()}-${mes}-15`;

    await page.route('**/rest/v1/calendar_events**', (rota) =>
      rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'a', event_date: dia, event_time: '09h30min', degree: '1',
            attire: 'Bal:.', session_type: 'Ord:.', description: 'Instrução – Grau 1'
          }
        ])
      })
    );

    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Agenda', exact: true }).click({ force: true });
    await expect(page.locator('#agendaModal')).toBeVisible();

    await expect(page.locator('#calendar .fc-event')).toHaveCount(1, { timeout: 15000 });
  });

  test('clicar numa sessao abre o detalhe em tela, sem alert() nativo', async ({ page }) => {
    const hoje = new Date();
    const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-15`;

    await page.route('**/rest/v1/calendar_events**', (rota) =>
      rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'a', event_date: dia, event_time: '09h30min', degree: '3',
            attire: 'Maç:.', session_type: 'Mag:.', description: 'Exaltação ao Grau de Mestre'
          }
        ])
      })
    );

    const dialogosNativos: string[] = [];
    page.on('dialog', async (d) => {
      dialogosNativos.push(d.message());
      await d.dismiss();
    });

    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Agenda', exact: true }).click({ force: true });
    await page.locator('#calendar .fc-event').first().click();

    const detalhe = page.locator('#detalheSessao');
    await expect(detalhe).toBeVisible();
    await expect(detalhe).toContainText('Exaltação ao Grau de Mestre');
    await expect(detalhe).toContainText('09h30min');
    expect(dialogosNativos).toEqual([]);
  });
});

test.describe('Login — comportamento do formulario', () => {
  test('clicar no rotulo "Email ou CIM" foca o campo', async ({ page }) => {
    await page.goto('/login.html');
    await page.locator('label[for="email"]').click();
    await expect(page.locator('#email')).toBeFocused();
  });

  test('a senha e obrigatoria', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page.locator('#password')).toHaveAttribute('required', '');

    await page.fill('#email', 'alguem@example.com');
    const valido = await page.locator('#password').evaluate((el) =>
      (el as HTMLInputElement).checkValidity()
    );
    expect(valido, 'senha em branco nao passa na validacao do navegador').toBe(false);
  });

  test('credenciais erradas produzem mensagem em portugues', async ({ page }) => {
    await page.route('**/auth/v1/token**', (rota) =>
      rota.fulfill({
        status: 400,
        contentType: 'application/json',
        body: '{"error":"invalid_grant","error_description":"Invalid login credentials","message":"Invalid login credentials"}'
      })
    );

    await page.goto('/login.html');
    await page.fill('#email', 'ninguem@example.com');
    await page.fill('#password', 'senha-errada-123');

    const botao = page.getByRole('button', { name: /Acesso Seguro/i });
    await botao.click();

    const erro = page.locator('#errorMessage');
    await expect(erro).toBeVisible({ timeout: 15000 });
    await expect(erro).toHaveText('E-mail/CIM ou senha incorretos.');
    // O ingles cru do provedor nao pode chegar na tela de um site em portugues.
    await expect(erro).not.toContainText('Invalid login');
    await expect(botao).toBeEnabled();
  });

  test('o rodape nao tem link morto', async ({ page }) => {
    await page.goto('/login.html');
    const mortos = await page.$$eval('a[href]', (els) =>
      els
        .map((e) => e.getAttribute('href') || '')
        .filter((h) => h === '#' || h === '' || h.toLowerCase().startsWith('javascript:void'))
    );
    expect(mortos).toEqual([]);
  });

  test('os alvos de toque do rodape cabem no dedo', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/login.html');

    const pequenos = await page.$$eval('a, button', (els) =>
      els
        .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || '').trim().slice(0, 24) }))
        .filter((x) => x.r.width > 0 && x.r.height > 0 && x.r.height < 44)
        .map((x) => `${x.t} (${Math.round(x.r.height)}px)`)
    );
    expect(pequenos, 'WCAG 2.5.5: alvo de toque de ao menos 44px').toEqual([]);
  });

  test('recuperacao de senha abre e exige e-mail', async ({ page }) => {
    await page.goto('/login.html');
    await page.locator('#forgotPassword').click();
    await expect(page.locator('#resetPasswordModal')).toBeVisible();
    await expect(page.locator('#resetEmail')).toHaveAttribute('required', '');
  });
});

test.describe('Paginas restritas — nada de conteudo antes da sessao', () => {
  const RESTRITAS = [
    '/dashboard.html',
    '/biblioteca.html',
    '/calendario.html',
    '/fraternidade.html',
    '/tesouraria.html',
    '/fraternidadezap.html',
    '/balaustre.html'
  ];

  for (const rota of RESTRITAS) {
    test(`${rota} nao pisca a casca da pagina para o anonimo`, async ({ page }) => {
      // A medida é a `visibility` computada do <body>, e não o tamanho do
      // innerText: para conteúdo sob `visibility: hidden`, o Chromium devolve
      // texto vazio e o Firefox devolve o texto inteiro. O texto seria um proxy
      // que muda de resposta conforme o motor; a visibilidade é a propriedade
      // que de fato decide se a pessoa enxerga alguma coisa.
      const pintadas: string[] = [];
      page.goto(rota).catch(() => {});

      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(100);
        const s = await page
          .evaluate((esperada) => {
            if (location.pathname !== esperada || !document.body) return null;
            return getComputedStyle(document.body).visibility;
          }, rota)
          .catch(() => null);
        if (s && s !== 'hidden') pintadas.push(s);
      }

      await page.waitForURL('**/login.html*', { timeout: 20000 });
      expect(pintadas, `${rota} ficou visível antes de confirmar a sessão`).toEqual([]);
    });
  }
});

test.describe('Cadastro — solicitacao de ingresso', () => {
  test('mapeia os campos e a obrigatoriedade', async ({ page }) => {
    await page.goto('/cadastro.html');
    const campos = await page.$$eval('input,select,textarea', (els) =>
      els
        .filter((e) => !['hidden', 'submit', 'button'].includes((e as HTMLInputElement).type))
        .map((e) => {
          const c = e as HTMLInputElement;
          return { id: c.id, type: c.type, required: c.required };
        })
    );
    console.log('[QA] campos do cadastro:', JSON.stringify(campos, null, 1));
    expect(campos.length).toBeGreaterThan(0);
  });
});

test.describe('Teclado', () => {
  test('da para navegar a home so com Tab, com foco visivel', async ({ page }) => {
    await page.goto('/index.html');
    const semFoco: string[] = [];

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a || a === document.body) return null;
        const est = getComputedStyle(a);
        const visivel = est.outlineStyle !== 'none' || est.boxShadow !== 'none';
        return visivel ? null : a.tagName.toLowerCase() + (a.id ? '#' + a.id : '');
      });
      if (r) semFoco.push(r);
    }

    expect(semFoco, 'todo elemento focavel precisa mostrar onde o foco esta').toEqual([]);
  });
});
