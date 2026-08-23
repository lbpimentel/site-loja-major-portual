/**
 * ============================================================================
 * MODELO DE LOJA — copie este arquivo para criar uma Loja nova
 * ============================================================================
 *
 *   1. cp lojas/_modelo.js lojas/nome-da-loja.js
 *   2. Preencha TODOS os campos abaixo com os dados da Loja.
 *   3. Coloque as imagens em public/ (veja a regra de caminhos abaixo).
 *   4. Registre a Loja no objeto LOJAS em siteConfig.js.
 *   5. LOJA=nome-da-loja npm run build
 *
 * REGRA DAS IMAGENS:
 *   Caminhos sempre absolutos a partir de public/.
 *   public/img/veneraveis/fulano.png  ->  "/img/veneraveis/fulano.png"
 *
 * Marcador que não encontra valor QUEBRA O BUILD — então não há risco de
 * entregar ao cliente uma página com {{loja.nome}} aparecendo na tela.
 */

export default {
  // ---------------------------------------------------------------------------
  // IDENTIDADE DA LOJA
  // ---------------------------------------------------------------------------
  loja: {
    // Nome completo, como aparece no cabeçalho, rodapé e title da página.
    nomeCompleto: "A∴R∴L∴S∴ NOME DA LOJA Nº 1111",
    // Versão curta, usada no cabeçalho em telas pequenas.
    nomeCurto: "NOME DA LOJA",
    numero: "1111",
    // Aparece sob o nome no rodapé.
    obediencia: "GOB - Rito REAA",
    rito: "Rito REAA",
    // Complemento do <title>. O título final é montado como:
    //   "<nomeCompleto> - <slogan>"  — Lapidando a Pedra Bruta a cada dia.
    slogan: "Formando Homens Bons e Homens Melhores",
    metaDescricao:
      "Loja Maçônica Nome da Loja Nº 1111, do Grande Oriente do Brasil no Rio de Janeiro. Formando Homens Bons e Homens Melhores.",
    // Ano exibido no aviso de copyright do rodapé.
    anoCopyright: "2026",
  },

  // ---------------------------------------------------------------------------
  // MARCA / IMAGENS  (caminhos sempre a partir de public/)
  // ---------------------------------------------------------------------------
  marca: {
    logo: "/teste1.png",
    heroBackground: "/teste.jpg",
    // Cor de destaque (âmbar). Usada na meta theme-color do PWA.
    corPrimaria: "#e9c349",
  },

  // ---------------------------------------------------------------------------
  // CONTATO
  // ---------------------------------------------------------------------------
  contato: {
    email: "contato@lojateste.org.br",
    endereco:
      "Av. Pref. Dulcídio Cardoso, 406 - Barra da Tijuca, Rio de Janeiro - RJ",
    instagramUrl: "https://www.instagram.com/lojamaconicamajorportugal_4424/",
    // URL de embed do Google Maps (Maps > Compartilhar > Incorporar um mapa).
    mapaEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.693247070119!2d-43.3245228!3d-23.0125442!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9bd0e98031d791%3A0xe546b7a54f02a64c!2sAv.%20Prefeito%20Dulc%C3%ADdio%20Cardoso%2C%20406%20-%20Barra%20da%20Tijuca%2C%20Rio%20de%20Janeiro%20-%20RJ!5e0!3m2!1spt-BR!2sbr!4v1716300000000!5m2!1spt-BR!2sbr",
  },

  // ---------------------------------------------------------------------------
  // HERO (primeira dobra)
  // ---------------------------------------------------------------------------
  hero: {
    tagline: "REAA",
    // O título é dividido em duas partes: a segunda sai em itálico dourado.
    tituloLinha1: "Luz, Razão e",
    tituloDestaque: "Liberdade",
    subtitulo:
      "Buscando a síntese entre os valores ancestrais e o pensamento contemporâneo em uma instituição dedicada ao aperfeiçoamento humano.",
    ctaTexto: "Entre em Contato",
  },

  // ---------------------------------------------------------------------------
  // VALORES / PILARES
  // Adicione ou remova itens à vontade: o grid se ajusta sozinho.
  // `icone` = nome do ícone no Material Symbols (fonts.google.com/icons).
  // ---------------------------------------------------------------------------
  valores: {
    titulo: "Os Três Pilares",
    itens: [
      {
        icone: "menu_book",
        titulo: "Sabedoria",
        descricao:
          "O cultivo incessante do intelecto e a busca pela verdade através do estudo rigoroso do Rito Moderno.",
      },
      {
        icone: "account_balance",
        titulo: "Estabilidade",
        descricao:
          "A preservação das tradições institucionais que fundamentam nossa conduta e nossa presença na sociedade.",
      },
      {
        icone: "diversity_3",
        titulo: "Fraternidade",
        descricao:
          "O fortalecimento dos laços entre os membros, criando uma rede de apoio e crescimento mútuo inestimável.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // GALERIA DE EX-VENERÁVEIS
  // A ordem aqui é a ordem exibida na tela (do mais recente ao mais antigo).
  // As fotos ficam em public/img/veneraveis/.
  // ---------------------------------------------------------------------------
  veneraveis: {
    chapeu: "HISTÓRIA E TRADIÇÃO",
    titulo: "Galeria de Ex-Veneráveis",
    itens: [
      {
        nome: "Ir. Marcelo",
        foto: "/img/veneraveis/marcelo.png",
        cargo: "Venerável Mestre",
        anos: "2022 — 2023",
      },
      {
        nome: "Ir. Elton",
        foto: "/img/veneraveis/elton.png",
        cargo: "Venerável Mestre",
        anos: "2021 — 2022",
      },
      {
        nome: "Ir. Cezar",
        foto: "/img/veneraveis/cezar.png",
        cargo: "Venerável Mestre",
        anos: "2020 — 2021",
      },
      {
        nome: "Ir. Leonardo",
        foto: "/img/veneraveis/leonardo.png",
        cargo: "Venerável Mestre",
        anos: "2019 — 2020",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // CITAÇÃO INSTITUCIONAL
  // ---------------------------------------------------------------------------
  citacao: {
    texto:
      "Onde a tradição encontra o progresso, nasce a verdadeira evolução da consciência humana.",
    autor: "— REGULAMENTO GERAL",
  },

  // ---------------------------------------------------------------------------
  // GALERIA DE FOTOS
  // Imagens em public/img/galeria/ (ou mantenha em img/galeria/ como hoje).
  // ---------------------------------------------------------------------------
  galeria: {
    chapeu: "INSTITUCIONAL",
    titulo: "Galeria de Fotos",
    linkTexto: "Ver Galeria Completa",
    fotos: [
      { src: "img/galeria/foto1.jpg", alt: "Foto institucional 1" },
      { src: "img/galeria/foto2.jpg", alt: "Foto institucional 2" },
      { src: "img/galeria/foto3.jpg", alt: "Foto institucional 3" },
    ],
  },

  // ---------------------------------------------------------------------------
  // NAVEGAÇÃO
  //
  // Desktop e mobile são arrays SEPARADOS de propósito: os dois menus do site
  // realmente diferem. O desktop tem "Agenda" (que abre um modal) e o mobile
  // não; o mobile diz "Nossos Valores" onde o desktop diz apenas "Valores".
  // Um array único forçaria os dois a ficarem iguais e mudaria o layout atual.
  //
  // `onclick` só é usado por itens que disparam uma ação em vez de navegar.
  // `icone` (só no mobile) = nome no Material Symbols (fonts.google.com/icons).
  // ---------------------------------------------------------------------------
  navegacao: {
    // As 5 seções da home. Usadas no menu mobile (com `icone` e `labelMobile`)
    // e no menu desktop das subpáginas (historia/patrono), que não têm Agenda.
    secoes: [
      { label: "Início", labelMobile: "Início", href: "#inicio", icone: "home" },
      { label: "Valores", labelMobile: "Nossos Valores", href: "#valores", icone: "verified" },
      { label: "Veneráveis", labelMobile: "Veneráveis", href: "#veneraveis", icone: "history_edu" },
      { label: "Galeria", labelMobile: "Galeria", href: "#galeria", icone: "groups" },
      { label: "Contato", labelMobile: "Contato", href: "#contact", icone: "mail" },
    ],

    // Menu desktop da HOME. Repete as seções acima porque precisa intercalar
    // "Agenda" na 4ª posição — item que abre um modal e só existe na home.
    // Ao acrescentar uma seção, lembre de acrescentá-la nas duas listas.
    desktop: [
      { label: "Início", href: "#inicio", onclick: "" },
      { label: "Valores", href: "#valores", onclick: "" },
      { label: "Veneráveis", href: "#veneraveis", onclick: "" },
      { label: "Agenda", href: "#", onclick: "openAgenda(); return false;" },
      { label: "Galeria", href: "#galeria", onclick: "" },
      { label: "Contato", href: "#contact", onclick: "" },
    ],
    // Dropdown "Sobre nós".
    sobreNos: [
      { label: "História", href: "historia.html" },
      { label: "Patrono", href: "patrono.html" },
      { label: "Timbre", href: "timbre.html" },
      { label: "Solidariedade", href: "#solidariedade" },
    ],
    ctaInteresse: "Quero ser Maçom",
    ctaPortal: "Portal do Membro",
  },

  // ---------------------------------------------------------------------------
  // RODAPÉ — AFILIAÇÃO INSTITUCIONAL
  // Troque aqui ao vender para uma Loja de outra Potência/Estado.
  // ---------------------------------------------------------------------------
  rodape: {
    potenciaNome: "Grande Oriente do Brasil no Rio de Janeiro",
    potenciaFederacao: "Federado ao Grande Oriente do Brasil",
    // Logos das Potências, exibidos lado a lado.
    orientes: [
      {
        nome: "Grande Oriente do Brasil no Rio de Janeiro",
        logo: "/img/institucional/logo_gob_rj-2.png",
        url: "https://gob-rj.org.br/home",
      },
      {
        nome: "Grande Oriente do Brasil",
        logo: "/img/institucional/logo-gob-brasilia-df-selo.png",
        url: "https://www.gob.org.br/",
      },
    ],
    // Crédito do desenvolvedor. Mantenha ao revender — é a sua assinatura.
    desenvolvedor: {
      nome: "LEANDRO BESSA PIMENTEL",
      email: "leandrobessa@hotmail.com",
    },
  },

  // ---------------------------------------------------------------------------
  // PÁGINAS INTERNAS (historia.html e patrono.html)
  //
  // Os parágrafos usam o marcador CRU {{{item.html}}}, então podem conter
  // marcação (<strong>, <em>, <a>). O campo `classe` permite destacar um
  // parágrafo específico sem precisar mexer no HTML.
  //
  // Ao vender para a Loja B, é AQUI que você reescreve a história e o patrono
  // dela — o HTML das páginas não precisa ser tocado.
  // ---------------------------------------------------------------------------
  paginas: {
    historia: {
      chapeu: "Sobre Nós",
      titulo: "Conheça nossa História",
      paragrafos: [
        {
          classe: "",
          html: "A rica herança histórica que inspira nossa Loja remonta aos primórdios da maçonaria brasileira e à Independência do Brasil. O patrono de nossa Oficina, Major Manoel dos Santos Portugal, cujo nome heroico e simbólico era <strong>Brutus</strong>, foi uma figura central nas memoráveis sessões maçônicas de 1822.",
        },
        {
          classe: "",
          html: 'Em sessões magnas e extraordinárias da época, Brutus não apenas participou da criação do Grande Oriente Brasiliano, sob a liderança do Grão-Mestre José Bonifácio de Andrada, como foi eleito Venerável Mestre de uma das três Lojas Metropolitanas erigidas naquele momento histórico (a célebre Loja "Commércio e Artes").',
        },
        {
          classe: "",
          html: "O auge de sua atuação maçônica deu-se em agosto de 1822, ocasião em que a alta administração do Grande Oriente encarregou o Irmão Major Manuel dos Santos Portugal para exaltar o Irmão <strong>Guatimozim</strong> (codinome histórico de <strong>D. Pedro I</strong>) ao Grau de Mestre, selando um dos momentos mais importantes da história maçônica do Brasil.",
        },
        {
          classe: "font-semibold text-amber-500 pt-4",
          html: "Inspirada por esse legado de honra, determinação e compromisso com os valores da pátria, a A∴R∴L∴S∴ Major Manoel dos Santos Portugal Nº 4424 foi fundada para dar continuidade ao aperfeiçoamento humano, perpetuando a memória de seu ilustre patrono.",
        },
      ],
    },

    patrono: {
      chapeu: "Nosso Patrono",
      // Nome do patrono — normalmente o mesmo que dá nome à Loja.
      titulo: "Major Manoel dos Santos Portugal",
      paragrafos: [
        {
          classe: "",
          html: "O Major Manoel dos Santos Portugal foi um militar brasileiro que ingressou na vida militar no exército real português e, após atingir o posto de Capitão, em 23 de Dezembro de 1810 foi nomeado por Dom João VI para custear a primeira companhia de Cavalaria da Divisão Militar da Guarda Real de Polícia, unidade esta que foi instalada em 1811, no Quartel de Mata Porcos, situado na atual Rua de Santana, centro da cidade do Rio de Janeiro.",
        },
        {
          classe: "",
          html: "Em 1822, comandou o confrontamento entre as tropas da Guarda Real de Polícia e a Divisão Auxiliadora do exército português, que em 11 de Janeiro ocupara o Morro do Castelo, a fim de pressionar o Príncipe Dom Pedro a retornar para Portugal e jurar fidelidade à constituição promulgada pelas Cortes daquele país. A determinação do então major Portugal na batalha fez com que as forças portuguesas se retirassem e partissem do Brasil.",
        },
        {
          classe: "",
          html: "Após a Independência do Brasil, em reconhecimento aos serviços prestados à causa, bem como sua importância na criação da Guarda Real de Polícia, Dom Pedro I concede-lhe o título nobiliárquico de Conde de Paraty.",
        },
      ],
    },

    // Descrição do timbre/brasão. É totalmente específica desta Loja (Ouroboros,
    // fascio, lanças...), então a Loja B reescreve estes parágrafos por inteiro.
    timbre: {
      chapeu: "SÍMBOLO OFICIAL",
      titulo: "O Timbre e suas Descrições",
      paragrafos: [
        {
          classe: "",
          html: 'O timbre é utilizado para identificar os documentos oficiais da Loja, bem como para servir de chancela, sendo configurado em formato circular. No centro do aro externo contém as inscrições: <strong>"A ∴ R ∴ L ∴ S ∴ Major Manoel dos Santos Portugal n. 4424, Or ∴ do Rio de Janeiro"</strong>, referindo-se ao nome, número e oriente de funcionamento da Loja.',
        },
        {
          classe: "",
          html: "Circundando o brasão original, vê-se a <strong>OUROBOROS</strong>, uma serpente devorando a própria cauda. Este símbolo místico representa o nascimento, a criação, a destruição e o renascimento. Significa a perenidade das ideias da Maçonaria através do tempo.",
        },
        {
          classe: "",
          html: "O brasão original é disposto em três dimensões: a primeira é composta pelo <strong>COMPASSO</strong> formado pelas espadas templária e o sabre, representando as principais armas utilizadas na defesa contra a Tirania; o compasso encima, em alusão ao grau de Mestre Maçom, o <strong>ESQUADRO</strong>, representando o instrumento que se afere o terreno, o palco das lutas e da glória da virtude sobre os vícios.",
        },
        {
          classe: "",
          html: "A segunda dimensão é composta pelo <strong>FASCIO</strong>, símbolo romano da justiça. O fascio é um símbolo que está presente em outras organizações, como a República Francesa e o Judiciário brasileiro, representa, neste caso, os limites da justiça social, nos caminhos que devem seguir a ordem em prol da sociedade.",
        },
        {
          classe: "",
          html: "A terceira e última dimensão disposta sobre o brasão original é visto duas <strong>LANÇAS</strong> de cavalaria ostentando bandeiras com as cores nacionais e estaduais, representam a identidade da Loja com os valores pátrios, um signo de compromisso com a territorialidade e com a tradição nacional.",
        },
      ],
    },
  },

// ---------------------------------------------------------------------------
  // INTEGRAÇÕES
  // ---------------------------------------------------------------------------
  integracoes: {
    supabase: {
      url: "http://localhost:54321",
      anonKey: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    },
    emailjs: {
      publicKey: "3_NB2T2Qn95kj4IUQ",
      serviceId: "service_ael7cfa",
      templateId: "template_g2lhxaq",
    },
  },
};
