-- =============================================================================
-- ANO DE NASCIMENTO DESCONHECIDO
-- =============================================================================
--
-- O PROBLEMA
--   O quadro de aniversariantes da Loja registra apenas DIA e MÊS. É o que a
--   Chancelaria precisa: ninguém consulta o quadro para saber a idade de
--   alguém, consulta para saber quando cumprimentar.
--
--   Só que `data_nascimento` é `date NOT NULL` — não existe data sem ano. Os
--   caminhos possíveis eram três, e dois deles são ruins:
--
--     a) inventar um ano plausível → passa a existir no banco um dado falso
--        que ninguém consegue distinguir de um dado real, e alguém acabaria
--        confiando nele;
--     b) gravar um ano-sentinela e deixar a tela calcular a idade em cima
--        dele → o quadro exibiria "122 anos" ao lado do nome de uma criança;
--     c) gravar o ano-sentinela E marcar a linha como "ano desconhecido",
--        para que a tela saiba que não deve calcular idade nenhuma.
--
--   Esta migração implementa (c). A coluna existe justamente para que a
--   ausência do dado seja explícita, em vez de virar um número errado.
--
--   O ano-sentinela usado pela carga é 1904, escolhido por ser bissexto: um
--   aniversário em 29 de fevereiro seria recusado pelo Postgres em qualquer
--   ano comum.
--
-- COMO RODAR
--   Supabase → SQL Editor → New query → cole tudo → Run. Idempotente.
--   Rode ANTES de supabase/seed_aniversariantes_major_portugal.sql.
-- =============================================================================

alter table public.dependentes
  add column if not exists ano_conhecido boolean not null default true;

alter table public.profiles
  add column if not exists ano_conhecido boolean not null default true;

comment on column public.dependentes.ano_conhecido is
  'false quando só o dia e o mês são conhecidos. A tela não exibe idade nessas linhas.';
comment on column public.profiles.ano_conhecido is
  'false quando só o dia e o mês são conhecidos. A tela não exibe idade nessas linhas.';


-- -----------------------------------------------------------------------------
-- TELEFONE EM E.164 — a mesma regra que o navegador aplica
--
-- A carga em massa não passa pelo formulário, então a normalização que
-- js/fraternidade.js faz no campo precisa existir também aqui. Sem isso, os
-- telefones importados ficariam num formato e os digitados na tela em outro,
-- e o link do wa.me só funcionaria para metade do quadro.
-- -----------------------------------------------------------------------------

create or replace function public.telefone_e164_br(p_bruto text)
returns text
language plpgsql
immutable
set search_path = public
as $fn$
declare
  d text;
begin
  d := regexp_replace(coalesce(p_bruto, ''), '\D', '', 'g');

  if d = '' then
    return null;
  end if;

  -- Prefixo internacional discado ("00" + DDI) que às vezes vem colado.
  if length(d) > 13 and left(d, 2) = '00' then
    d := substring(d from 3);
  end if;

  -- Já veio com DDI 55: 55 + DDD(2) + número(8 ou 9).
  if length(d) in (12, 13) and left(d, 2) = '55' then
    return d;
  end if;

  -- Sem DDI: DDD(2) + número(8 ou 9).
  if length(d) in (10, 11) then
    return '55' || d;
  end if;

  -- Fora de qualquer formato reconhecido. Devolver NULL em vez de um número
  -- torto: um telefone inválido gravado abriria uma conversa com o
  -- desconhecido que por acaso tivesse aquele número.
  return null;
end;
$fn$;


-- -----------------------------------------------------------------------------
-- NOME NORMALIZADO — para casar o quadro em papel com o cadastro
--
-- Os nomes do quadro e os de `profiles` divergem em acentuação, espaços
-- duplicados e pontuação de abreviatura ("JOSE" x "JOSÉ", "M." x "M"). Casar
-- por igualdade exata deixaria de fora justamente os nomes mais longos.
-- -----------------------------------------------------------------------------

create or replace function public.nome_normalizado(p_nome text)
returns text
language sql
immutable
set search_path = public
as $fn$
  select btrim(regexp_replace(
    upper(translate(
      coalesce(p_nome, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    )),
    '[^A-Z0-9]+', ' ', 'g'
  ));
$fn$;


-- -----------------------------------------------------------------------------
-- CONFERÊNCIA
-- -----------------------------------------------------------------------------
-- select public.telefone_e164_br('(21) 99999-0000');  -- 5521999990000
-- select public.nome_normalizado('JOSÉ  FERREIRA SOARES NETO'); -- JOSE FERREIRA SOARES NETO
