-- =============================================================================
-- 00 — DIAGNÓSTICO (SOMENTE LEITURA)
-- =============================================================================
-- Este script NÃO altera nada. Ele só descreve o estado atual do banco.
--
-- COMO RODAR:
--   Supabase → SQL Editor → New query → cole tudo → Run
--   Copie a saída das 3 consultas e me mande.
--
-- Preciso disso porque o código referencia colunas conflitantes
-- (login.html usa `is_approved`, dashboard.html usa `status`) e uma política
-- que aponte para uma coluna inexistente derruba o login de todos os Irmãos.
-- =============================================================================

-- 1. Quais tabelas existem e o RLS está ligado?
select
  c.relname                       as tabela,
  c.relrowsecurity                as rls_ligado,
  c.relforcerowsecurity           as rls_forcado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;


-- 2. Quais políticas já existem? (esperado: nenhuma)
select
  tablename  as tabela,
  policyname as politica,
  cmd        as operacao,
  roles      as papeis,
  qual       as condicao_leitura,
  with_check as condicao_escrita
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- 3. Colunas de cada tabela — é isto que preciso para escrever as políticas certas.
select
  table_name  as tabela,
  column_name as coluna,
  data_type   as tipo,
  is_nullable as aceita_nulo
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'calendar_events',
    'announcements',
    'session_presences',
    'gallery_photos',
    'candidatos_interesse',
    'financial_documents'
  )
order by table_name, ordinal_position;
