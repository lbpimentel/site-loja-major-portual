-- =============================================================================
-- CARGOS: COMPARAÇÃO SEM ACENTO EM is_oficial() + PADRONIZAÇÃO DOS DADOS
-- =============================================================================
--
-- O BUG QUE ESTE SCRIPT CORRIGE
--   is_oficial() compara lower(trim(position)) contra 'veneravel mestre', sem
--   acento. Mas o formulário grava o cargo acentuado — "Venerável Mestre" —
--   e lower() não remove acento. A comparação NUNCA casa.
--
--   O efeito prático é traiçoeiro porque as duas camadas discordam: o front
--   normaliza com NFD antes de comparar (ver tesouraria.html), então a tela
--   MOSTRA os botões de documento financeiro ao Venerável Mestre; o RLS, que
--   não normaliza, NEGA a operação. O usuário vê o botão e recebe erro.
--
--   Mesmo problema, menor, com o Orador e o Tesoureiro: esses não têm acento,
--   e por isso funcionavam — o que mascarou a falha por todo esse tempo.
--
-- DEPENDÊNCIA
--   Requer public.cargo_normalizado(), criada em
--   20260823_01_fraternidadezap.sql. Rode aquele primeiro. Se não rodar, este
--   script falha na criação da função, com a mensagem do Postgres dizendo
--   exatamente qual função falta — em vez de criar um is_oficial() quebrado.
--
-- COMO RODAR
--   Supabase → SQL Editor → New query → cole tudo → Run. Idempotente.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. PADRONIZAR O CARGO DE HOSPITALEIRO NOS DADOS EXISTENTES
--
-- Duas telas ofereciam grafias diferentes do mesmo cargo: cadastro.html
-- gravava "Hopitaleiro" (com o erro de digitação) e dashboard.html gravava
-- "Hospitalário". As duas telas foram padronizadas para "Hospitaleiro", mas
-- isso só vale para cadastros NOVOS — as linhas já gravadas continuariam com
-- a grafia antiga, e um Irmão veria seu acesso depender de qual tela o
-- cadastrou.
--
-- Roda ANTES da função nova de propósito: assim, quando is_oficial() e
-- is_diretoria_fraternidade() forem consultadas, os dados já estão limpos.
-- -----------------------------------------------------------------------------

update public.profiles
set position = 'Hospitaleiro'
where public.cargo_normalizado(position) in (
  'hopitaleiro',
  'hospitalario',
  'hospitalar'
);


-- -----------------------------------------------------------------------------
-- 2. is_oficial() RESILIENTE A ACENTO
--
-- A lista de cargos é a mesma aprovada pela Loja em 03_ajuste_oficial.sql —
-- admin, tesoureiro, orador e Venerável Mestre. Este script NÃO amplia nem
-- reduz quem tem acesso: apenas faz a comparação funcionar para quem já
-- deveria ter passado por ela.
--
-- Onde isto pega: RLS de financial_documents e as policies do bucket
-- 'documents' no Storage (02_storage.sql). As duas chamam is_oficial(), então
-- esta única alteração vale para ambas.
-- -----------------------------------------------------------------------------

create or replace function public.is_oficial()
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
          'tesoureiro',
          'orador',
          'veneravel mestre'
        )
      )
  );
$fn$;


-- -----------------------------------------------------------------------------
-- 3. CONFERÊNCIA
--
-- Roda logado como o Irmão em questão. Se `sou_oficial` vier false para um
-- Venerável Mestre aprovado, o problema passa a ser o dado (cargo escrito de
-- outra forma), não mais a comparação.
-- -----------------------------------------------------------------------------
-- select position, public.cargo_normalizado(position) as normalizado,
--        public.is_oficial() as sou_oficial
-- from public.profiles where id = auth.uid();

-- Cargos distintos gravados hoje, para achar grafias fora do padrão:
-- select position, count(*) from public.profiles group by position order by 2 desc;
