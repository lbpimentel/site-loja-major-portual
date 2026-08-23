-- =============================================================================
-- 02 — STORAGE: BUCKET PRIVADO PARA DOCUMENTOS FINANCEIROS
-- =============================================================================
--
-- CONTEXTO
--   tesouraria.html envia arquivos para o bucket 'documents' (pasta financial/).
--   Esse bucket NUNCA foi criado — o upload sempre falhou com "Bucket not found".
--   Ou seja, a funcionalidade de documentos da Tesouraria nunca funcionou.
--
-- POR QUE PRIVADO
--   O código antigo usava getPublicUrl, que só funciona em bucket público — e
--   bucket público significa que qualquer pessoa com o link baixa o arquivo, SEM
--   login. As URLs são previsíveis (financial/timestamp_nome.pdf). Isso anularia
--   o RLS que protege `financial_documents`: os metadados ficariam trancados, mas
--   o PDF em si, aberto. Por isso o bucket é PRIVADO e o acesso é por URL
--   assinada temporária (ver tesouraria.html, createSignedUrl).
--
-- DEPENDÊNCIA
--   Reutiliza as funções is_oficial() e is_admin() criadas em 01_rls.sql.
--   Rode 01_rls.sql ANTES deste script.
--
-- COMO RODAR
--   Supabase → SQL Editor → cole tudo → Run. É idempotente.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. CRIAR O BUCKET (privado)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;


-- -----------------------------------------------------------------------------
-- 2. POLÍTICAS DE ACESSO AOS ARQUIVOS (storage.objects)
--
-- O RLS de storage.objects já vem ligado por padrão no Supabase. Sem política,
-- ninguém acessa — inclusive createSignedUrl falha. Espelhamos a mesma regra da
-- tabela financial_documents: quem é oficial lê e envia; só admin apaga.
-- -----------------------------------------------------------------------------

-- Limpa versões anteriores destas políticas (idempotência).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'documents financeiros:%'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end;
$$;

create policy "documents financeiros: oficial le"
  on storage.objects for select to authenticated
  using ( bucket_id = 'documents' and public.is_oficial() );

create policy "documents financeiros: oficial envia"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'documents' and public.is_oficial() );

create policy "documents financeiros: oficial atualiza"
  on storage.objects for update to authenticated
  using      ( bucket_id = 'documents' and public.is_oficial() )
  with check ( bucket_id = 'documents' and public.is_oficial() );

create policy "documents financeiros: admin remove"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'documents' and public.is_admin() );


-- =============================================================================
-- CONFERÊNCIA — rode depois de aplicar
-- =============================================================================
-- O bucket deve aparecer como public = false:
--   select id, public from storage.buckets where id = 'documents';
--
-- E devem existir 4 políticas 'documents financeiros: ...':
--   select policyname, cmd from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and policyname like 'documents financeiros:%';
-- =============================================================================
