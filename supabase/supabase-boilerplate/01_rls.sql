-- =============================================================================
-- 01 — RLS: FECHAR A EXPOSIÇÃO PÚBLICA
-- =============================================================================
--
-- CONTEXTO
--   O RLS já estava LIGADO nas 7 tabelas — o problema eram as POLÍTICAS, que
--   concediam acesso ao papel `public`. No Postgres/Supabase, `public` inclui o
--   `anon`, ou seja, qualquer visitante da internet. O resultado era:
--
--     candidatos_interesse  → leitura pública de nome, telefone, e-mail, idade
--     financial_documents   → leitura pública dos documentos financeiros
--     gallery_photos        → INSERT e DELETE públicos (um estranho podia APAGAR
--                             todas as fotos da Loja)
--     session_presences     → ALL para public
--
--   Não dá para remendar: este script DERRUBA todas as políticas atuais das 7
--   tabelas e recria do zero, usando `authenticated` e checagens de papel.
--
-- MODELO DE ACESSO
--   anônimo         → só INSERT em candidatos_interesse (formulário de ingresso)
--                     e leitura da Agenda (colunas selecionadas, ver abaixo)
--   membro aprovado → lê quadro, avisos, calendário, galeria, presenças
--   oficial         → + documentos financeiros (Tesouraria)
--   admin           → gerencia tudo
--
-- ESTE PROJETO ATENDE UMA ÚNICA LOJA.
--   Cada Loja tem seu próprio projeto Supabase, então não existe `loja_id`:
--   não há tabela compartilhada de onde uma Loja possa ler a outra. Rode este
--   mesmo script, sem alteração, no projeto de cada Loja nova.
--
-- COMO RODAR
--   Supabase → SQL Editor → New query → cole tudo → Run.
--   É idempotente: pode rodar de novo sem quebrar nada.
--
-- ATENÇÃO — APLIQUE JUNTO COM AS MUDANÇAS DE CÓDIGO
--   Este script sozinho QUEBRA duas coisas até você publicar o código novo:
--     1. O login por CIM  (passa a usar a função email_por_cim)
--     2. A Agenda da home (passa a selecionar colunas explícitas)
--   Os dois ajustes já estão em index.html e login.html. Publique junto.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. FUNÇÕES AUXILIARES
--
-- Todas são SECURITY DEFINER: rodam com os privilégios do dono e, por isso,
-- conseguem consultar `profiles` sem disparar o RLS da própria `profiles`.
-- Sem isso, uma política de `profiles` que consulta `profiles` entraria em
-- recursão infinita — a pegadinha clássica do RLS no Supabase.
--
-- `set search_path = public` evita sequestro de search_path, ataque conhecido
-- contra funções SECURITY DEFINER.
-- -----------------------------------------------------------------------------

create or replace function public.is_membro_aprovado()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_approved = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_approved = true
      and lower(trim(coalesce(role, ''))) = 'admin'
  );
$$;

-- Espelha exatamente a regra que tesouraria.html já aplica na tela
-- (isPowerUser): admin OU um dos cargos da administração.
create or replace function public.is_oficial()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_approved = true
      and (
        lower(trim(coalesce(role, ''))) = 'admin'
        or lower(trim(coalesce(position, ''))) in (
          'secretario', 'veneravel mestre', 'mestre de cerimonias',
          'orador', 'tesoureiro'
        )
      )
  );
$$;


-- -----------------------------------------------------------------------------
-- 2. LOGIN POR CIM — SEM ABRIR A TABELA `profiles`
--
-- O login.html precisa converter CIM → e-mail ANTES de o usuário se autenticar.
-- Hoje isso é feito com um SELECT anônimo direto em `profiles`, e é a razão de
-- a tabela estar aberta para o mundo.
--
-- Esta função devolve APENAS o e-mail daquele CIM exato. O anônimo passa a
-- poder executá-la, mas continua sem conseguir ler a tabela.
--
-- Limitação honesta: alguém que teste CIMs em sequência consegue descobrir que
-- um CIM existe e qual o e-mail dele. É uma superfície MUITO menor do que
-- baixar o quadro inteiro, mas não é zero. Se isso incomodar, o passo seguinte
-- é pôr rate limit (ou trocar o login por CIM por login só com e-mail).
-- -----------------------------------------------------------------------------

create or replace function public.email_por_cim(p_cim text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email
  from public.profiles
  where cim = trim(p_cim)
  limit 1;
$$;

revoke all on function public.email_por_cim(text) from public;
grant execute on function public.email_por_cim(text) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. IMPEDIR AUTO-APROVAÇÃO E AUTO-PROMOÇÃO
--
-- Sem isto, um usuário recém-cadastrado poderia inserir/atualizar o próprio
-- perfil com is_approved = true e role = 'admin' — e viraria administrador da
-- Loja sozinho. A política de RLS permite ele escrever na PRÓPRIA linha; estes
-- gatilhos garantem que ele não escreva nos CAMPOS que dão poder.
-- -----------------------------------------------------------------------------

create or replace function public.forca_perfil_pendente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Um admin pode cadastrar alguém já aprovado. Qualquer outro entra pendente.
  if not public.is_admin() then
    new.is_approved := false;
    new.role        := 'member';
  end if;
  return new;
end;
$$;

create or replace function public.protege_campos_sensiveis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Não sendo admin, os campos de poder são preservados como estavam:
  -- o usuário pode editar nome, cargo, e-mail... mas não se aprovar.
  if not public.is_admin() then
    new.is_approved := old.is_approved;
    new.role        := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_insert_pendente on public.profiles;
create trigger trg_profiles_insert_pendente
  before insert on public.profiles
  for each row execute function public.forca_perfil_pendente();

drop trigger if exists trg_profiles_update_protege on public.profiles;
create trigger trg_profiles_update_protege
  before update on public.profiles
  for each row execute function public.protege_campos_sensiveis();


-- -----------------------------------------------------------------------------
-- 4. LIMPAR TODAS AS POLÍTICAS ANTIGAS
--
-- As políticas atuais concedem acesso a `public`. Não há como corrigi-las uma a
-- uma com segurança — é mais seguro apagar tudo e reconstruir explicitamente.
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'calendar_events', 'announcements', 'session_presences',
        'gallery_photos', 'candidatos_interesse', 'financial_documents'
      )
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$$;

-- Garantir RLS ligado (já estava, mas deixa explícito e idempotente).
alter table public.profiles             enable row level security;
alter table public.calendar_events      enable row level security;
alter table public.announcements        enable row level security;
alter table public.session_presences    enable row level security;
alter table public.gallery_photos       enable row level security;
alter table public.candidatos_interesse enable row level security;
alter table public.financial_documents  enable row level security;


-- -----------------------------------------------------------------------------
-- 5. PROFILES — o quadro de Obreiros
-- -----------------------------------------------------------------------------

-- Um membro ainda pendente precisa ler a PRÓPRIA linha (o login checa
-- is_approved). Já o quadro completo, só membro aprovado enxerga.
create policy "profiles: le a propria linha ou o quadro se aprovado"
  on public.profiles for select to authenticated
  using ( id = auth.uid() or public.is_membro_aprovado() );

create policy "profiles: cria o proprio perfil (admin cria qualquer um)"
  on public.profiles for insert to authenticated
  with check ( id = auth.uid() or public.is_admin() );

create policy "profiles: edita o proprio perfil (admin edita qualquer um)"
  on public.profiles for update to authenticated
  using      ( id = auth.uid() or public.is_admin() )
  with check ( id = auth.uid() or public.is_admin() );

create policy "profiles: so admin remove"
  on public.profiles for delete to authenticated
  using ( public.is_admin() );


-- -----------------------------------------------------------------------------
-- 6. CALENDAR_EVENTS — a Agenda
--
-- A Agenda da home é pública de propósito. Mas o anônimo NÃO precisa ver a
-- tabela inteira: `select('*')` exporia qualquer coluna nova que você criar no
-- futuro. Aqui o anônimo recebe permissão coluna a coluna, apenas nas 7 que a
-- home realmente renderiza. `temple` fica de fora (a home não usa).
-- -----------------------------------------------------------------------------

revoke select on public.calendar_events from anon;
grant select (id, event_date, event_time, degree, attire, session_type, description)
  on public.calendar_events to anon;

create policy "agenda: leitura publica (colunas restritas pelo GRANT acima)"
  on public.calendar_events for select to anon
  using ( true );

create policy "agenda: membro aprovado le tudo"
  on public.calendar_events for select to authenticated
  using ( public.is_membro_aprovado() );

create policy "agenda: so admin gerencia"
  on public.calendar_events for all to authenticated
  using      ( public.is_admin() )
  with check ( public.is_admin() );


-- -----------------------------------------------------------------------------
-- 7. ANNOUNCEMENTS — avisos internos
-- -----------------------------------------------------------------------------

create policy "avisos: membro aprovado le"
  on public.announcements for select to authenticated
  using ( public.is_membro_aprovado() );

create policy "avisos: so admin gerencia"
  on public.announcements for all to authenticated
  using      ( public.is_admin() )
  with check ( public.is_admin() );


-- -----------------------------------------------------------------------------
-- 8. SESSION_PRESENCES — presenças
-- -----------------------------------------------------------------------------

create policy "presencas: membro aprovado le"
  on public.session_presences for select to authenticated
  using ( public.is_membro_aprovado() );

create policy "presencas: confirma a propria presenca"
  on public.session_presences for insert to authenticated
  with check ( user_id = auth.uid() and public.is_membro_aprovado() );

create policy "presencas: altera a propria (admin altera qualquer uma)"
  on public.session_presences for update to authenticated
  using      ( user_id = auth.uid() or public.is_admin() )
  with check ( user_id = auth.uid() or public.is_admin() );

create policy "presencas: so admin remove"
  on public.session_presences for delete to authenticated
  using ( public.is_admin() );


-- -----------------------------------------------------------------------------
-- 9. GALLERY_PHOTOS — galeria interna (fraternidade.html, área logada)
--
-- Antes: INSERT e DELETE liberados para `public`. Qualquer estranho podia
-- apagar as fotos da Loja. Agora: membro aprovado publica, só admin apaga.
-- -----------------------------------------------------------------------------

create policy "galeria: membro aprovado le"
  on public.gallery_photos for select to authenticated
  using ( public.is_membro_aprovado() );

create policy "galeria: membro aprovado publica"
  on public.gallery_photos for insert to authenticated
  with check ( public.is_membro_aprovado() );

create policy "galeria: so admin edita"
  on public.gallery_photos for update to authenticated
  using      ( public.is_admin() )
  with check ( public.is_admin() );

create policy "galeria: so admin apaga"
  on public.gallery_photos for delete to authenticated
  using ( public.is_admin() );


-- -----------------------------------------------------------------------------
-- 10. CANDIDATOS_INTERESSE — formulário público de ingresso
--
-- O anônimo PRECISA inserir (é o formulário da home e do cadastro.html), mas
-- NUNCA pode ler: são nome, telefone, e-mail, idade e bairro de candidatos.
-- Esta era a exposição mais grave em termos de LGPD.
-- -----------------------------------------------------------------------------

create policy "candidatos: qualquer um se candidata"
  on public.candidatos_interesse for insert to anon, authenticated
  with check ( true );

create policy "candidatos: so admin le"
  on public.candidatos_interesse for select to authenticated
  using ( public.is_admin() );

create policy "candidatos: so admin gerencia"
  on public.candidatos_interesse for update to authenticated
  using      ( public.is_admin() )
  with check ( public.is_admin() );

create policy "candidatos: so admin remove"
  on public.candidatos_interesse for delete to authenticated
  using ( public.is_admin() );


-- -----------------------------------------------------------------------------
-- 11. FINANCIAL_DOCUMENTS — Tesouraria
--
-- Espelha o `isPowerUser` do tesouraria.html: admin ou cargo da administração.
-- -----------------------------------------------------------------------------

create policy "financeiro: so oficial le"
  on public.financial_documents for select to authenticated
  using ( public.is_oficial() );

create policy "financeiro: oficial publica"
  on public.financial_documents for insert to authenticated
  with check ( public.is_oficial() );

create policy "financeiro: oficial edita"
  on public.financial_documents for update to authenticated
  using      ( public.is_oficial() )
  with check ( public.is_oficial() );

create policy "financeiro: so admin apaga"
  on public.financial_documents for delete to authenticated
  using ( public.is_admin() );


-- =============================================================================
-- CONFERÊNCIA — rode depois de aplicar
-- =============================================================================
-- Nenhuma política deve mencionar o papel `public` ou `anon`, exceto:
--   candidatos_interesse (INSERT)  e  calendar_events (SELECT)
--
-- select tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public' and ('anon' = any(roles) or 'public' = any(roles))
-- order by tablename;
-- =============================================================================
