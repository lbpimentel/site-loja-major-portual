-- =============================================================================
-- FRATERNIDADEZAP — LEMBRADOR DE ANIVERSÁRIOS DA FAMÍLIA MAÇÔNICA
-- =============================================================================
--
-- O QUE ESTE SCRIPT CRIA
--   profiles.data_nascimento / profiles.telefone  → aniversário do próprio Irmão
--   dependentes                                   → cunhadas, filhos e filhas
--   fraternidade_templates                        → textos padrão das mensagens
--   is_diretoria_fraternidade()                   → quem enxerga o quadro todo
--   cargo_normalizado()                           → comparação de cargo sem acento
--
-- COMO RODAR
--   Supabase → SQL Editor → New query → cole tudo → Run.
--   É idempotente: pode rodar de novo sem quebrar nada.
--
-- -----------------------------------------------------------------------------
-- SOBRE `loja_slug` — LEIA ANTES DE CONFIAR NELE
-- -----------------------------------------------------------------------------
-- A coluna existe porque foi pedida, e é útil para exportar/auditar dados
-- sabendo de qual Loja vieram. Mas ela NÃO é a fronteira entre Lojas, e as
-- políticas abaixo deliberadamente não a usam para isolar nada.
--
-- A fronteira real é outra: cada Loja tem seu PRÓPRIO projeto Supabase (ver o
-- cabeçalho de 01_rls.sql). Bancos fisicamente separados — não existe tabela
-- compartilhada de onde a Loja A pudesse ler a Loja B.
--
-- Isso é uma garantia mais forte do que um filtro por coluna, e é importante
-- não confundir as duas: uma política que dependesse de `loja_slug` daria a
-- impressão de isolar, quando o que isola é o banco ser outro. Se um dia as
-- Lojas passarem a dividir um banco, ESTE arquivo precisa ser reescrito de
-- propósito, não herdado como se já cobrisse o caso.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. SLUG DA LOJA DESTE BANCO
--
-- Cada projeto Supabase declara o seu uma vez:
--     alter database postgres set app.loja_slug = 'loja-b';
-- Sem essa declaração, cai no padrão abaixo.
-- -----------------------------------------------------------------------------

create or replace function public.loja_slug_atual()
returns text
language sql
stable
set search_path = public
as $fn$
  select coalesce(nullif(current_setting('app.loja_slug', true), ''), 'major-portugal');
$fn$;


-- -----------------------------------------------------------------------------
-- 2. COMPARAÇÃO DE CARGO SEM ACENTO
--
-- O front já compara cargos normalizando com NFD (ver tesouraria.html), mas as
-- funções SQL existentes fazem apenas lower(trim(position)). Como os cargos são
-- gravados acentuados pelo formulário ("Venerável Mestre"), a comparação SQL
-- contra 'veneravel mestre' NUNCA casa — o RLS nega justamente quem a tela
-- mostrou ter permissão. Esta função fecha essa diferença.
--
-- translate() em vez da extensão unaccent: uma dependência a menos para
-- instalar em cada projeto Supabase novo.
-- -----------------------------------------------------------------------------

create or replace function public.cargo_normalizado(p_cargo text)
returns text
language sql
immutable
set search_path = public
as $fn$
  select lower(trim(translate(
    coalesce(p_cargo, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  )));
$fn$;


-- -----------------------------------------------------------------------------
-- 3. QUEM ENXERGA O QUADRO INTEIRO DE ANIVERSÁRIOS
--
-- Chanceler, Hospitaleiro e Venerável Mestre — os cargos que de fato conduzem
-- a fraternidade — mais o admin.
--
-- As várias grafias de "hospitaleiro" estão listadas de propósito: o formulário
-- de cadastro oferece "Hopitaleiro" (com o erro de digitação) e o painel do
-- dashboard oferece "Hospitalário". Enquanto os dados carregarem as duas, a
-- função precisa reconhecer as duas — caso contrário o Hospitaleiro cadastrado
-- por uma tela é aceito e o cadastrado pela outra é negado, sem explicação.
-- -----------------------------------------------------------------------------

create or replace function public.is_diretoria_fraternidade()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_approved = true
      and (
        lower(trim(coalesce(role, ''))) = 'admin'
        or public.cargo_normalizado(position) in (
          'veneravel mestre',
          'chanceler',
          'hospitaleiro',
          'hopitaleiro',
          'hospitalario',
          'hospitalar'
        )
      )
  );
$fn$;


-- -----------------------------------------------------------------------------
-- 4. ANIVERSÁRIO DO PRÓPRIO IRMÃO
--
-- `profiles` não tinha data de nascimento. Sem ela o módulo cobriria a família
-- do Irmão, mas não o Irmão — e o aniversário dele é o mais óbvio dos três.
-- -----------------------------------------------------------------------------

alter table public.profiles add column if not exists data_nascimento date;
alter table public.profiles add column if not exists telefone text;

comment on column public.profiles.data_nascimento is
  'Data de nascimento do Irmão. Só o dia e o mês são usados pelo FraternidadeZap.';
comment on column public.profiles.telefone is
  'WhatsApp em E.164 sem o "+" (ex.: 5521998887777). Gravado por js/fraternidade.js.';


-- -----------------------------------------------------------------------------
-- 5. DEPENDENTES — CUNHADAS, FILHOS E FILHAS
-- -----------------------------------------------------------------------------

create table if not exists public.dependentes (
  id               uuid primary key default gen_random_uuid(),
  membro_id        uuid not null references public.profiles(id) on delete cascade,
  loja_slug        text not null default public.loja_slug_atual(),
  nome_completo    text not null,
  parentesco       text not null,
  data_nascimento  date not null,
  telefone         text,
  observacoes      text,
  created_at       timestamptz not null default now(),

  constraint dependentes_parentesco_valido
    check (parentesco in ('cunhada', 'filho', 'filha', 'outro')),

  -- Um nome em branco geraria uma linha inútil no quadro do Chanceler, que
  -- não teria como saber de quem se trata nem a quem perguntar.
  constraint dependentes_nome_nao_vazio
    check (length(trim(nome_completo)) > 0),

  -- Data futura é sempre erro de digitação (ano trocado, tipicamente).
  constraint dependentes_nascimento_no_passado
    check (data_nascimento <= current_date)
);

-- O membro lista os seus dependentes a cada abertura da página.
create index if not exists dependentes_membro_idx
  on public.dependentes (membro_id);

alter table public.dependentes enable row level security;

drop policy if exists dependentes_select on public.dependentes;
drop policy if exists dependentes_insert on public.dependentes;
drop policy if exists dependentes_update on public.dependentes;
drop policy if exists dependentes_delete on public.dependentes;

-- LEITURA: o Irmão vê os seus; a diretoria vê todos (é o ponto do módulo).
create policy dependentes_select on public.dependentes
  for select to authenticated
  using (
    membro_id = auth.uid()
    or public.is_diretoria_fraternidade()
  );

-- ESCRITA: só o próprio Irmão, inclusive para a diretoria. Ver todos é
-- necessário para lembrar dos aniversários; editar a família alheia não é.
create policy dependentes_insert on public.dependentes
  for insert to authenticated
  with check (membro_id = auth.uid() and public.is_membro_aprovado());

create policy dependentes_update on public.dependentes
  for update to authenticated
  using (membro_id = auth.uid())
  with check (membro_id = auth.uid());

create policy dependentes_delete on public.dependentes
  for delete to authenticated
  using (membro_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 6. TEMPLATES DAS MENSAGENS
--
-- As variáveis do texto ({nome}, {parentesco}, {loja}) são interpoladas no
-- navegador por js/fraternidade.js — nunca pelo build.
--
-- ATENÇÃO: os marcadores do build usam chaves DUPLAS. Um texto de template
-- escrito com chaves duplas dentro de um .html derruba a compilação, porque o
-- vite-plugin-site-config tenta resolvê-lo contra o siteConfig. Por isso os
-- textos padrão moram aqui, no banco, usam chave SIMPLES, e o preenchimento
-- acontece no arquivo .js — que o Vite copia cru, sem interpolar.
-- -----------------------------------------------------------------------------

create table if not exists public.fraternidade_templates (
  id              uuid primary key default gen_random_uuid(),
  loja_slug       text not null default public.loja_slug_atual(),
  tipo            text not null,
  template_texto  text not null,
  ativo           boolean not null default true,
  updated_at      timestamptz not null default now(),

  constraint fraternidade_templates_tipo_valido
    check (tipo in ('alerta_diretoria', 'grupo_loja', 'privado_aniversariante'))
);

-- Um tipo, um texto por Loja: sem isto, duas linhas do mesmo tipo fariam a
-- tela escolher uma em silêncio e o Chanceler não entenderia por que a edição
-- "não pegou".
create unique index if not exists fraternidade_templates_tipo_unico
  on public.fraternidade_templates (loja_slug, tipo);

alter table public.fraternidade_templates enable row level security;

drop policy if exists fraternidade_templates_select on public.fraternidade_templates;
drop policy if exists fraternidade_templates_write  on public.fraternidade_templates;

-- Leitura para qualquer membro aprovado: o texto não é sigiloso, e deixá-lo
-- legível permite que o próprio Irmão use os botões de parabéns.
create policy fraternidade_templates_select on public.fraternidade_templates
  for select to authenticated
  using (public.is_membro_aprovado());

-- Edição só pela diretoria: o texto sai em nome da Loja.
create policy fraternidade_templates_write on public.fraternidade_templates
  for all to authenticated
  using (public.is_diretoria_fraternidade())
  with check (public.is_diretoria_fraternidade());


-- -----------------------------------------------------------------------------
-- 7. TEXTOS PADRÃO
--
-- `on conflict do nothing`: rodar a migração de novo não desfaz o texto que a
-- diretoria ajustou.
-- -----------------------------------------------------------------------------

insert into public.fraternidade_templates (loja_slug, tipo, template_texto)
values
  (
    public.loja_slug_atual(),
    'alerta_diretoria',
    'Lembrete da Chancelaria: {nome} ({parentesco}) faz aniversario em {data}. Vamos cumprimentar em nome da {loja}.'
  ),
  (
    public.loja_slug_atual(),
    'grupo_loja',
    'Meus Irmaos, hoje e o aniversario de {nome} ({parentesco}). Que o Grande Arquiteto do Universo lhe conceda saude e paz. Parabens em nome da {loja}!'
  ),
  (
    public.loja_slug_atual(),
    'privado_aniversariante',
    'Ola, {nome}! A {loja} deseja a voce um feliz aniversario, com muita saude, paz e alegria ao lado de quem voce ama. Um forte abraco fraterno!'
  )
on conflict (loja_slug, tipo) do nothing;


-- -----------------------------------------------------------------------------
-- 8. CONFERÊNCIA
-- -----------------------------------------------------------------------------
-- select public.loja_slug_atual() as slug, public.is_diretoria_fraternidade() as sou_diretoria;
-- select tipo, ativo from public.fraternidade_templates order by tipo;
