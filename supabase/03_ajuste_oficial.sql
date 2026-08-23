-- =============================================================================
-- 03 — AJUSTE: QUEM É "OFICIAL" PARA FINS FINANCEIROS
-- =============================================================================
--
-- Redefine is_oficial() para a lista aprovada pela Loja:
--   admin, tesoureiro, orador, venerável mestre.
--
-- MUDANÇA EM RELAÇÃO AO 01_rls.sql:
--   REMOVE 'secretario' e 'mestre de cerimonias' do acesso aos documentos
--   financeiros. Antes eles tinham acesso (a função espelhava a regra antiga da
--   tela). A partir daqui, NÃO leem nem enviam documentos financeiros.
--
-- ONDE ISTO PEGA:
--   - RLS da tabela financial_documents (leitura/envio/edição)
--   - RLS do bucket 'documents' no Storage (02_storage.sql)
--   Ambos usam is_oficial(), então esta única alteração vale para os dois.
--
-- CONTROLE FUTURO:
--   Por ora a lista é fixa aqui e no gate visual de tesouraria.html
--   (treasurerActions). Quando você quiser gerenciar isso por tela, o caminho é
--   trocar esta lista fixa por uma tabela (ex.: cargos_financeiros) que o admin
--   edita — a função passaria a consultar essa tabela em vez do texto abaixo.
--
-- COMO RODAR:
--   Supabase → SQL Editor → cole → Run. Idempotente (create or replace).
-- =============================================================================

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
          'tesoureiro', 'orador', 'veneravel mestre'
        )
      )
  );
$$;

-- Conferência: liste os cargos aprovados atuais.
-- (não altera nada; só documenta o estado.)
-- select 'is_oficial agora cobre: admin, tesoureiro, orador, veneravel mestre' as info;
