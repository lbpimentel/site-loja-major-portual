-- =============================================================================
-- O QUADRO DE ANIVERSARIANTES NÃO DEPENDE DE QUEM TEM LOGIN
-- =============================================================================
--
-- O PROBLEMA REAL
--   `dependentes.membro_id` era `not null` e aponta para `profiles`. Mas
--   `profiles.id` é o id do usuário no Supabase Auth: a linha de perfil nasce
--   de um `auth.signUp()`, não de um INSERT solto. Enquanto um Irmão não cria
--   conta no portal, ele não existe em `profiles` — e a família dele não tinha
--   como entrar no banco.
--
--   Foi exatamente o que aconteceu na primeira carga: 4 perfis cadastrados, 36
--   Irmãos no quadro, e os 92 dependentes recusados por falta de responsável.
--
-- O CAMINHO QUE NÃO SEGUIMOS
--   Inserir os 35 Irmãos faltantes em `profiles` com `gen_random_uuid()`.
--   Isso quebra de duas formas: a chave estrangeira para `auth.users` recusa o
--   id inventado; e, se não recusasse, no dia em que o Irmão se cadastrasse de
--   verdade o signUp criaria um SEGUNDO perfil, com outro id. A Loja ficaria
--   com dois registros da mesma pessoa — o fantasma com a família e o real
--   vazio — e ninguém entenderia por que os aniversários sumiram.
--
-- O QUE ESTA MIGRAÇÃO FAZ
--   Separa duas coisas que estavam grudadas: o QUADRO da Loja e as CONTAS de
--   acesso. O quadro é da Loja e existe desde sempre, em papel; a conta é um
--   detalhe de quem já se cadastrou no site.
--
--   `membro_id` passa a ser opcional, e `responsavel_nome` guarda de quem é
--   aquele familiar. Quando o Irmão finalmente criar conta, um gatilho liga os
--   registros pelo nome, sozinho.
--
-- COMO RODAR
--   Supabase → SQL Editor → New query → cole tudo → Run. Idempotente.
--   Rode DEPOIS da 03 e ANTES do seed.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. O VÍNCULO PASSA A SER OPCIONAL
-- -----------------------------------------------------------------------------

alter table public.dependentes alter column membro_id drop not null;

alter table public.dependentes
  add column if not exists responsavel_nome text;

comment on column public.dependentes.responsavel_nome is
  'Nome do Irmão responsável, como consta no quadro da Loja. Preenchido sempre; '
  'é o que permite vincular o registro quando ele criar conta no portal.';

-- Preenche o nome nas linhas que já existiam, para que toda linha tenha a
-- referência textual — sem isso, uma linha antiga ficaria sem como se explicar
-- caso o perfil dela fosse removido.
update public.dependentes d
set responsavel_nome = p.full_name
from public.profiles p
where d.membro_id = p.id
  and d.responsavel_nome is null;

-- Uma linha sem NENHUMA das duas referências seria um familiar de ninguém: não
-- apareceria para membro algum e a diretoria não teria a quem perguntar.
alter table public.dependentes drop constraint if exists dependentes_tem_responsavel;
alter table public.dependentes add constraint dependentes_tem_responsavel
  check (membro_id is not null or nullif(btrim(coalesce(responsavel_nome, '')), '') is not null);

-- O gatilho de vinculação busca por nome normalizado a cada perfil novo.
create index if not exists dependentes_responsavel_nome_idx
  on public.dependentes (public.nome_normalizado(responsavel_nome))
  where membro_id is null;


-- -----------------------------------------------------------------------------
-- 2. O PRÓPRIO IRMÃO PODE ESTAR NO QUADRO SEM TER CONTA
--
-- O aniversário do Irmão mora em `profiles`, que exige conta. Para os 35 sem
-- cadastro, a data fica aqui como linha de quadro, com parentesco 'irmao'.
-- É um lugar provisório: assim que ele cria conta, o gatilho abaixo move a data
-- para o perfil dele e apaga a linha — senão o quadro o mostraria duas vezes.
-- -----------------------------------------------------------------------------

alter table public.dependentes drop constraint if exists dependentes_parentesco_valido;
alter table public.dependentes add constraint dependentes_parentesco_valido
  check (parentesco in ('irmao', 'cunhada', 'filho', 'filha', 'outro'));


-- -----------------------------------------------------------------------------
-- 3. VINCULAÇÃO AUTOMÁTICA
--
-- Roda quando um perfil é criado ou tem o nome corrigido. Duas coisas
-- acontecem, nesta ordem:
--
--   a) a linha de quadro do PRÓPRIO Irmão (parentesco 'irmao') é transferida
--      para o perfil e apagada;
--   b) os familiares dele passam a apontar para o perfil.
--
-- `coalesce` em todo lugar: o que o Irmão preencheu no portal é mais atual que
-- o quadro impresso, e vincular não pode sobrescrever o que ele mesmo digitou.
-- -----------------------------------------------------------------------------

create or replace function public.vincular_quadro_ao_perfil(p_perfil_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_nome        text;
  v_vinculados  integer := 0;
begin
  select public.nome_normalizado(full_name) into v_nome
  from public.profiles where id = p_perfil_id;

  if v_nome is null or v_nome = '' then
    return 0;
  end if;

  -- (a) A data do próprio Irmão migra da linha de quadro para o perfil.
  update public.profiles p
  set data_nascimento = coalesce(p.data_nascimento, d.data_nascimento),
      ano_conhecido   = case when p.data_nascimento is null
                             then d.ano_conhecido else p.ano_conhecido end,
      telefone        = coalesce(p.telefone, d.telefone),
      observacoes     = coalesce(p.observacoes, d.observacoes)
  from public.dependentes d
  where p.id = p_perfil_id
    and d.membro_id is null
    and d.parentesco = 'irmao'
    and public.nome_normalizado(d.responsavel_nome) = v_nome;

  delete from public.dependentes d
  where d.membro_id is null
    and d.parentesco = 'irmao'
    and public.nome_normalizado(d.responsavel_nome) = v_nome;

  -- (b) A família dele passa a ter dono.
  update public.dependentes d
  set membro_id = p_perfil_id
  where d.membro_id is null
    and d.parentesco <> 'irmao'
    and public.nome_normalizado(d.responsavel_nome) = v_nome;

  get diagnostics v_vinculados = row_count;
  return v_vinculados;
end;
$fn$;


create or replace function public.trg_vincular_quadro()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  perform public.vincular_quadro_ao_perfil(new.id);
  return null;
end;
$fn$;

-- AFTER, e não BEFORE: a vinculação consulta a linha de `profiles` já gravada.
drop trigger if exists trg_profiles_vincula_quadro on public.profiles;
create trigger trg_profiles_vincula_quadro
  after insert or update of full_name on public.profiles
  for each row execute function public.trg_vincular_quadro();


-- -----------------------------------------------------------------------------
-- 4. RLS — QUEM ENXERGA E EDITA AS LINHAS SEM DONO
--
-- Uma linha sem `membro_id` não pertence a ninguém ainda. Com as políticas
-- antigas ela ficaria invisível e imutável para todo mundo: `membro_id =
-- auth.uid()` nunca é verdade quando membro_id é nulo.
--
-- A diretoria passa a poder corrigir e apagar essas linhas — são registros do
-- quadro da Loja, e é a Chancelaria que cuida do quadro. As linhas COM dono
-- continuam só do dono, como antes.
-- -----------------------------------------------------------------------------

drop policy if exists dependentes_select on public.dependentes;
drop policy if exists dependentes_update on public.dependentes;
drop policy if exists dependentes_delete on public.dependentes;

create policy dependentes_select on public.dependentes
  for select to authenticated
  using (
    membro_id = auth.uid()
    or public.is_diretoria_fraternidade()
  );

create policy dependentes_update on public.dependentes
  for update to authenticated
  using (
    membro_id = auth.uid()
    or (membro_id is null and public.is_diretoria_fraternidade())
  )
  with check (
    membro_id = auth.uid()
    or (membro_id is null and public.is_diretoria_fraternidade())
  );

create policy dependentes_delete on public.dependentes
  for delete to authenticated
  using (
    membro_id = auth.uid()
    or (membro_id is null and public.is_diretoria_fraternidade())
  );


-- -----------------------------------------------------------------------------
-- 5. VINCULAR O QUE JÁ EXISTE
--
-- Roda uma vez para os perfis atuais. Rodar de novo não faz mal: só encontra
-- linhas sem dono, e depois da primeira passagem não há mais nenhuma para eles.
-- -----------------------------------------------------------------------------

select public.vincular_quadro_ao_perfil(id) from public.profiles;


-- -----------------------------------------------------------------------------
-- 6. CONFERÊNCIA
-- -----------------------------------------------------------------------------
-- Quem ainda está no quadro sem conta no portal:
--   select responsavel_nome, count(*) as familiares
--   from public.dependentes where membro_id is null
--   group by responsavel_nome order by responsavel_nome;
--
-- Irmãos cuja data está no quadro esperando o cadastro:
--   select nome_completo, to_char(data_nascimento, 'DD/MM') as dia_mes
--   from public.dependentes
--   where parentesco = 'irmao' and membro_id is null
--   order by nome_completo;
