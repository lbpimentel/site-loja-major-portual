-- =============================================================================
-- GERAR O DDL REAL DAS TABELAS (schema public)
-- =============================================================================
--
-- POR QUE ESTA QUERY EXISTE
--   Eu (Claude) escrevi as funções, gatilhos e políticas — então sei reproduzi-los
--   com certeza. Mas NUNCA vi a estrutura real das suas tabelas: os tipos exatos,
--   os defaults, os NOT NULL, as chaves. Inventar isso quebraria a Loja nova de
--   formas silenciosas. Esta query extrai o CREATE TABLE VERDADEIRO do seu banco.
--
-- COMO USAR
--   1. Supabase → SQL Editor → cole esta query → Run.
--   2. O resultado é UMA ÚNICA célula (coluna "ddl_completo") com todo o SQL.
--      Clique na célula e copie (Ctrl+C). Como é uma célula só, o texto vem
--      limpo — sem número de linha e sem cabeçalho de coluna.
--   3. Cole no SQL Editor do projeto da Loja nova e rode.
--
--   O conteúdo vem na ordem certa: primeiro os CREATE TABLE, depois os
--   ALTER TABLE das chaves estrangeiras (FKs).
--
-- É SOMENTE LEITURA. Não altera nada.
-- =============================================================================

with tabelas as (
  select t.oid, t.relname
  from pg_class t
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r'
),
colunas as (
  select tb.relname,
    string_agg(
      '  ' || quote_ident(a.attname) || ' ' ||
      pg_catalog.format_type(a.atttypid, a.atttypmod) ||
      case when a.attnotnull then ' not null' else '' end ||
      case when ad.adbin is not null
           then ' default ' || pg_get_expr(ad.adbin, ad.adrelid)
           else '' end,
      ',' || chr(10) order by a.attnum
    ) as cols
  from tabelas tb
  join pg_attribute a
    on a.attrelid = tb.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef ad
    on ad.adrelid = tb.oid and ad.adnum = a.attnum
  group by tb.relname
),
pk as (
  select tb.relname,
    '  primary key (' ||
    string_agg(quote_ident(att.attname), ', '
               order by array_position(c.conkey, att.attnum)) || ')' as def
  from tabelas tb
  join pg_constraint c on c.conrelid = tb.oid and c.contype = 'p'
  join pg_attribute att on att.attrelid = tb.oid and att.attnum = any(c.conkey)
  group by tb.relname
),
linhas as (
  -- Um CREATE TABLE por tabela (ordem = 1).
  select 1 as ordem, tb.relname as objeto,
    'create table if not exists public.' || quote_ident(tb.relname) || ' (' || chr(10)
    || colunas.cols
    || coalesce(',' || chr(10) || pk.def, '')
    || chr(10) || ');' as ddl
  from tabelas tb
  join colunas on colunas.relname = tb.relname
  left join pk on pk.relname = tb.relname

  union all

  -- Chaves estrangeiras como ALTER TABLE (ordem = 2: rodam após as tabelas).
  select 2 as ordem, cl.relname as objeto,
    'alter table public.' || quote_ident(cl.relname) ||
    ' add constraint ' || quote_ident(con.conname) || ' ' ||
    pg_get_constraintdef(con.oid) || ';' as ddl
  from pg_constraint con
  join pg_class cl on cl.oid = con.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public' and con.contype = 'f'
)
-- Junta tudo numa célula só, para o copiar sair limpo.
select string_agg(ddl, chr(10) || chr(10) order by ordem, objeto) as ddl_completo
from linhas;
