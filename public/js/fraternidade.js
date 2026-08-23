/**
 * ============================================================================
 * FRATERNIDADEZAP — LEMBRADOR DE ANIVERSÁRIOS DA FAMÍLIA MAÇÔNICA
 * ============================================================================
 *
 * Consome o cliente já criado por /js/supabase-config.js (window.supabaseClient).
 *
 * Este arquivo mora em `public/js/`, que o Vite copia CRU, sem passar pelo
 * vite-plugin-site-config. Isso não é acidente: os textos de mensagem usam
 * chaves para as variáveis, e um marcador de chaves duplas dentro de um .html
 * derrubaria o build ao ser resolvido contra o siteConfig. Toda manipulação de
 * template precisa ficar aqui, nunca num <script> inline da página.
 *
 * A metade de cima do arquivo (CÁLCULO) não toca no DOM nem na rede: são
 * funções puras, e é nelas que mora a parte fácil de errar — fuso horário,
 * virada de ano e 29 de fevereiro.
 */

(function (global) {
  'use strict';

  // ==========================================================================
  // CÁLCULO — funções puras
  // ==========================================================================

  /**
   * Converte "2000-05-13" numa Date do fuso LOCAL.
   *
   * `new Date('2000-05-13')` seria interpretado como meia-noite UTC, o que no
   * Brasil (UTC-3) volta como 12 de maio às 21h. Num módulo de aniversários
   * esse deslize adianta TODA data em um dia — e só aparece para quem está a
   * oeste de Greenwich, ou seja, sempre aqui. Por isso a data é montada campo
   * a campo, com o construtor de ano/mês/dia, que é local por definição.
   */
  function dataLocal(iso) {
    if (iso instanceof Date) return iso;
    if (typeof iso !== 'string') return null;

    const partes = iso.slice(0, 10).split('-');
    if (partes.length !== 3) return null;

    const ano = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);
    if (!ano || !mes || !dia) return null;

    return new Date(ano, mes - 1, dia);
  }

  /** Meia-noite de hoje, no fuso local. Comparar datas com hora embutida faria
   *  "hoje" virar "amanhã" dependendo da hora em que a página fosse aberta. */
  function hojeLocal() {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  }

  /**
   * A data em que o aniversário cai num determinado ano.
   *
   * 29 de fevereiro em ano comum não existe. Deixar o Date "corrigir" sozinho
   * empurraria a comemoração para 1º de março; a convenção civil brasileira
   * (e o bom senso da Loja) é cumprimentar em 28 de fevereiro, então o ajuste
   * é explícito em vez de ficar por conta do overflow do construtor.
   */
  function aniversarioNoAno(nascimento, ano) {
    const mes = nascimento.getMonth();
    const dia = nascimento.getDate();

    if (mes === 1 && dia === 29) {
      const bissexto = new Date(ano, 1, 29).getMonth() === 1;
      return new Date(ano, 1, bissexto ? 29 : 28);
    }
    return new Date(ano, mes, dia);
  }

  /** Próximo aniversário a partir de `hoje` (hoje inclusive). */
  function proximoAniversario(nascimento, hoje) {
    const base = hoje || hojeLocal();
    const desteAno = aniversarioNoAno(nascimento, base.getFullYear());
    if (desteAno >= base) return desteAno;
    // Virada de ano: quem faz em janeiro, visto de dezembro, é do ano seguinte.
    return aniversarioNoAno(nascimento, base.getFullYear() + 1);
  }

  const UM_DIA = 24 * 60 * 60 * 1000;

  /**
   * Dias que faltam para o próximo aniversário. 0 = hoje.
   *
   * O arredondamento existe por causa do horário de verão: um intervalo que
   * atravessa a mudança de hora tem 23 ou 25 horas, e a divisão exata daria
   * 2,96 dias — que truncado viraria 2, adiantando o alerta em um dia.
   */
  function diasAteAniversario(nascimentoIso, hoje) {
    const nascimento = dataLocal(nascimentoIso);
    if (!nascimento) return null;

    const base = hoje || hojeLocal();
    const alvo = proximoAniversario(nascimento, base);
    return Math.round((alvo - base) / UM_DIA);
  }

  /** Idade que a pessoa completa no próximo aniversário. */
  function idadeQueCompleta(nascimentoIso, hoje) {
    const nascimento = dataLocal(nascimentoIso);
    if (!nascimento) return null;

    const base = hoje || hojeLocal();
    const alvo = proximoAniversario(nascimento, base);
    return alvo.getFullYear() - nascimento.getFullYear();
  }

  /**
   * Faixa de proximidade usada pelos cartões de métrica e pelos alertas.
   * D-0 (hoje), D-1 (amanhã) e D-3 são os avisos que a diretoria pediu.
   */
  function faixaDeAlerta(dias) {
    if (dias === null) return null;
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'amanha';
    if (dias <= 3) return 'proximo';
    if (dias <= 7) return 'semana';
    return 'depois';
  }

  const MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  /** "13 de maio" — como se escreve numa mensagem, não como 13/05. */
  function porExtenso(nascimentoIso) {
    const d = dataLocal(nascimentoIso);
    if (!d) return '';
    return d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  /** "13/05" — para tabelas, onde a coluna é estreita. */
  function diaMes(nascimentoIso) {
    const d = dataLocal(nascimentoIso);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm;
  }

  /** Aniversariantes do mês corrente, do dia 1 ao 31, ordem cronológica. */
  function doMesCorrente(pessoas, hoje) {
    const base = hoje || hojeLocal();
    const mes = base.getMonth();

    return pessoas
      .filter((p) => {
        const d = dataLocal(p.data_nascimento);
        return d && d.getMonth() === mes;
      })
      .sort((a, b) => dataLocal(a.data_nascimento).getDate() - dataLocal(b.data_nascimento).getDate());
  }

  // ==========================================================================
  // TELEFONE — E.164 brasileiro
  // ==========================================================================

  function soDigitos(valor) {
    return String(valor || '').replace(/\D+/g, '');
  }

  /**
   * Normaliza para E.164 sem o "+", que é o formato que o wa.me exige.
   *
   * Aceita o que as pessoas realmente digitam: "(21) 99888-7777",
   * "21998887777", "+55 21 99888-7777", "0021...". O DDI 55 é acrescentado
   * quando ausente — nenhum número da Loja é de fora do Brasil, e exigir que
   * o Irmão digite o DDI só geraria cadastro errado.
   *
   * Devolve { ok, e164, erro } em vez de lançar: quem chama está validando um
   * campo de formulário e precisa da mensagem, não de um try/catch.
   */
  function normalizarTelefoneBR(bruto) {
    let d = soDigitos(bruto);

    if (!d) return { ok: false, e164: '', erro: 'Informe o WhatsApp.' };

    // Prefixo internacional discado ("00" + DDI) que às vezes vem colado.
    if (d.length > 13 && d.startsWith('00')) d = d.slice(2);

    // Já veio com DDI 55: 55 + DDD(2) + número(8 ou 9).
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) {
      return { ok: true, e164: d, erro: '' };
    }

    // Sem DDI: DDD(2) + número(8 ou 9).
    if (d.length === 10 || d.length === 11) {
      return { ok: true, e164: '55' + d, erro: '' };
    }

    return {
      ok: false,
      e164: '',
      erro: 'Número incompleto. Use DDD + número, ex.: (21) 99888-7777.'
    };
  }

  /** Formata para leitura: "(21) 99888-7777". Aceita E.164 ou digitação crua. */
  function mascararTelefone(valor) {
    let d = soDigitos(valor);
    if (d.startsWith('55') && d.length > 11) d = d.slice(2);

    if (d.length <= 2) return d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);

    const corte = d.length >= 11 ? 7 : 6;
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + '-' + d.slice(corte, 11);
  }

  // ==========================================================================
  // MENSAGENS
  // ==========================================================================

  /**
   * Troca as variáveis do template pelos valores da pessoa.
   *
   * Chave SIMPLES de propósito — a chave dupla é a sintaxe do build, e usá-la
   * aqui impediria que qualquer texto de exemplo aparecesse num .html.
   * Uma variável desconhecida fica como está, em vez de virar "undefined" no
   * meio de uma mensagem que sai em nome da Loja.
   */
  function interpolarTemplate(texto, variaveis) {
    return String(texto || '').replace(/\{(\w+)\}/g, function (original, chave) {
      const valor = variaveis[chave];
      return valor === undefined || valor === null || valor === '' ? original : String(valor);
    });
  }

  /** Link do WhatsApp. Sem telefone, devolve o link de "compartilhar texto". */
  function linkWhatsApp(e164, mensagem) {
    const texto = encodeURIComponent(mensagem || '');
    const numero = soDigitos(e164);
    return numero
      ? 'https://wa.me/' + numero + '?text=' + texto
      : 'https://wa.me/?text=' + texto;
  }

  // ==========================================================================
  // API PÚBLICA DE CÁLCULO
  // ==========================================================================

  const calculo = {
    dataLocal,
    hojeLocal,
    aniversarioNoAno,
    proximoAniversario,
    diasAteAniversario,
    idadeQueCompleta,
    faixaDeAlerta,
    porExtenso,
    diaMes,
    doMesCorrente,
    soDigitos,
    normalizarTelefoneBR,
    mascararTelefone,
    interpolarTemplate,
    linkWhatsApp
  };

  // ==========================================================================
  // ESTADO E DADOS
  // ==========================================================================

  const estado = {
    usuario: null,
    ehDiretoria: false,
    nomeDaLoja: '',
    meusDependentes: [],
    quadroCompleto: [],
    templates: {}
  };

  function cliente() {
    if (!global.supabaseClient) {
      throw new Error(
        '[fraternidade] window.supabaseClient nao existe. Carregue ' +
        '/js/supabase-config.js antes deste arquivo.'
      );
    }
    return global.supabaseClient;
  }

  const PARENTESCOS = {
    irmao:   { rotulo: 'Irmão',   classe: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    cunhada: { rotulo: 'Cunhada', classe: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
    filho:   { rotulo: 'Sobrinho', classe: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
    filha:   { rotulo: 'Sobrinha', classe: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
    outro:   { rotulo: 'Familiar', classe: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
  };

  function estiloParentesco(chave) {
    return PARENTESCOS[chave] || PARENTESCOS.outro;
  }

  /** Carrega os dependentes do próprio Irmão. */
  async function carregarMeusDependentes() {
    const { data, error } = await cliente()
      .from('dependentes')
      .select('*')
      .eq('membro_id', estado.usuario.id)
      .order('data_nascimento', { ascending: true });

    if (error) throw error;
    estado.meusDependentes = data || [];
    return estado.meusDependentes;
  }

  /**
   * Quadro completo: dependentes de todos + os próprios Irmãos.
   *
   * O RLS decide o que volta. Um membro comum recebe só os seus e não vê o
   * quadro — a tela esconde a aba, mas quem protege é a política, não a tela.
   */
  async function carregarQuadroCompleto() {
    const sb = cliente();

    const [dependentes, irmaos] = await Promise.all([
      sb.from('dependentes').select('*, profiles(full_name, telefone)'),
      sb.from('profiles')
        .select('id, full_name, telefone, data_nascimento, position, ano_conhecido')
        .eq('is_approved', true)
        .not('data_nascimento', 'is', null)
    ]);

    if (dependentes.error) throw dependentes.error;
    if (irmaos.error) throw irmaos.error;

    const doQuadro = (dependentes.data || []).map(function (d) {
      return {
        id: d.id,
        origem: 'dependente',
        nome: d.nome_completo,
        parentesco: d.parentesco,
        data_nascimento: d.data_nascimento,
        // `!== false` e nao `=== true`: uma linha antiga, gravada antes de a
        // coluna existir, volta como undefined e deve contar como conhecida.
        ano_conhecido: d.ano_conhecido !== false,
        telefone: d.telefone,
        observacoes: d.observacoes,
        responsavel: d.profiles ? d.profiles.full_name : null
      };
    });

    const osIrmaos = (irmaos.data || []).map(function (p) {
      return {
        id: p.id,
        origem: 'irmao',
        nome: p.full_name,
        parentesco: 'irmao',
        data_nascimento: p.data_nascimento,
        ano_conhecido: p.ano_conhecido !== false,
        telefone: p.telefone,
        observacoes: p.position || null,
        responsavel: null
      };
    });

    estado.quadroCompleto = doQuadro.concat(osIrmaos);
    return estado.quadroCompleto;
  }

  async function carregarTemplates() {
    const { data, error } = await cliente()
      .from('fraternidade_templates')
      .select('*')
      .eq('ativo', true);

    if (error) throw error;

    estado.templates = {};
    (data || []).forEach(function (t) {
      estado.templates[t.tipo] = t;
    });
    return estado.templates;
  }

  async function salvarDependente(dados) {
    const telefone = dados.telefone
      ? normalizarTelefoneBR(dados.telefone)
      : { ok: true, e164: null, erro: '' };

    if (!telefone.ok) throw new Error(telefone.erro);

    const linha = {
      membro_id: estado.usuario.id,
      nome_completo: String(dados.nome_completo || '').trim(),
      parentesco: dados.parentesco,
      data_nascimento: dados.data_nascimento,
      telefone: telefone.e164,
      observacoes: String(dados.observacoes || '').trim() || null
    };

    const sb = cliente();
    const resposta = dados.id
      ? await sb.from('dependentes').update(linha).eq('id', dados.id).select().single()
      : await sb.from('dependentes').insert(linha).select().single();

    if (resposta.error) throw resposta.error;
    return resposta.data;
  }

  async function removerDependente(id) {
    const { error } = await cliente().from('dependentes').delete().eq('id', id);
    if (error) throw error;
  }

  async function salvarTemplate(tipo, texto) {
    const { data, error } = await cliente()
      .from('fraternidade_templates')
      .update({ template_texto: texto, updated_at: new Date().toISOString() })
      .eq('tipo', tipo)
      .select()
      .single();

    if (error) throw error;
    estado.templates[tipo] = data;
    return data;
  }

  /** Monta a mensagem de um tipo para uma pessoa do quadro. */
  function mensagemPara(tipo, pessoa) {
    const template = estado.templates[tipo];
    if (!template) return '';

    return interpolarTemplate(template.template_texto, {
      nome: pessoa.nome,
      parentesco: estiloParentesco(pessoa.parentesco).rotulo.toLowerCase(),
      loja: estado.nomeDaLoja,
      data: porExtenso(pessoa.data_nascimento),
      // Sem o ano, {idade} fica sem valor e o interpolador devolve o marcador
      // cru — melhor o Chanceler ver "{idade}" e apagar do que a Loja mandar
      // "parabens pelos 122 anos" para uma crianca.
      idade: pessoa.ano_conhecido === false ? null : idadeQueCompleta(pessoa.data_nascimento)
    });
  }

  /**
   * Copia para a área de transferência.
   *
   * O fallback com textarea existe porque navigator.clipboard só funciona em
   * contexto seguro: em http://localhost:3000 durante o desenvolvimento ele
   * some, e o botão pareceria quebrado justamente para quem está testando.
   */
  async function copiar(texto) {
    try {
      if (global.navigator && navigator.clipboard && global.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch (e) {
      // cai no método antigo abaixo
    }

    try {
      const campo = document.createElement('textarea');
      campo.value = texto;
      campo.setAttribute('readonly', '');
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      const deu = document.execCommand('copy');
      document.body.removeChild(campo);
      return deu;
    } catch (e) {
      return false;
    }
  }

  // ==========================================================================
  // EXPORTAÇÃO
  // ==========================================================================

  global.FraternidadeZap = {
    calculo: calculo,
    estado: estado,
    PARENTESCOS: PARENTESCOS,
    estiloParentesco: estiloParentesco,
    carregarMeusDependentes: carregarMeusDependentes,
    carregarQuadroCompleto: carregarQuadroCompleto,
    carregarTemplates: carregarTemplates,
    salvarDependente: salvarDependente,
    removerDependente: removerDependente,
    salvarTemplate: salvarTemplate,
    mensagemPara: mensagemPara,
    copiar: copiar
  };
})(window);
