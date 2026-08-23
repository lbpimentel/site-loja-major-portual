-- =============================================================================
-- FRATERNIDADEZAP — CONFIGURAÇÃO DO WHATSAPP E DISPARO AUTOMÁTICO
-- =============================================================================
--
-- COMO RODAR
--   Supabase → SQL Editor → New query → cole tudo → Run. Idempotente.
--   Rode DEPOIS da migração 04.
--
-- -----------------------------------------------------------------------------
-- SOBRE O TOKEN GUARDADO AQUI
-- -----------------------------------------------------------------------------
-- `whatsapp_api_token` fica nesta tabela, legível pela diretoria — é o que
-- permite o campo "mostrar/ocultar" na tela de configuração.
--
-- Vale saber o que isso implica: o token viaja para o NAVEGADOR de cada diretor
-- toda vez que a tela abre, e fica ao alcance do DevTools e de qualquer
-- extensão instalada. Um token de gateway manda mensagem em nome da Loja, então
-- trate-o como a chave do grupo: só a diretoria enxerga (RLS abaixo), e ele
-- nunca é gravado nos logs de disparo.
--
-- Se um dia isso incomodar, o caminho é mover só o token para uma tabela sem
-- política de select, gravada por função SECURITY DEFINER e lida apenas pela
-- service_role no servidor. A tela perderia o "mostrar", e ganharia um
-- "substituir".
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. QUEM ADMINISTRA O ZAP
--
-- admin, Venerável Mestre, Chanceler e Secretário. O Hospitaleiro entra junto:
-- é ele quem cuida da fraternidade na prática, e deixá-lo de fora obrigaria a
-- Chancelaria a operar por ele.
-- -----------------------------------------------------------------------------

create or replace function public.is_diretoria_zap()
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
          'veneravel mestre', 'chanceler', 'secretario',
          'hospitaleiro', 'hopitaleiro', 'hospitalario', 'hospitalar'
        )
      )
  );
$fn$;


-- -----------------------------------------------------------------------------
-- 2. CONFIGURAÇÃO
-- -----------------------------------------------------------------------------

create table if not exists public.lojas_config (
  id                   uuid primary key default gen_random_uuid(),
  loja_slug            text unique not null default 'major-portugal',
  whatsapp_api_url     text,
  whatsapp_api_token   text,
  whatsapp_grupo_jid   text,
  whatsapp_grupo_url   text,
  disparo_diario_ativo boolean not null default true,
  resumo_semanal_ativo boolean not null default true,
  updated_at           timestamptz not null default now(),

  -- Endpoint tem de ser HTTPS: o token vai no cabeçalho da requisição, e em
  -- HTTP ele trafegaria em texto puro por toda a rede até o gateway.
  constraint lojas_config_url_https
    check (whatsapp_api_url is null or whatsapp_api_url like 'https://%')
);

-- A linha da Loja deste banco. `loja_slug` é unique, então rodar de novo não
-- cria uma segunda.
insert into public.lojas_config (loja_slug)
values (public.loja_slug_atual())
on conflict (loja_slug) do nothing;

alter table public.lojas_config enable row level security;

drop policy if exists lojas_config_select on public.lojas_config;
drop policy if exists lojas_config_write  on public.lojas_config;
drop policy if exists lojas_config_update on public.lojas_config;

create policy lojas_config_select on public.lojas_config
  for select to authenticated
  using (public.is_diretoria_zap());

create policy lojas_config_update on public.lojas_config
  for update to authenticated
  using (public.is_diretoria_zap())
  with check (public.is_diretoria_zap());


-- -----------------------------------------------------------------------------
-- 3. LOGS DE DISPARO
--
-- Sem log, um disparo que não chegou é indistinguível de um que nunca foi
-- tentado — e a Chancelaria só descobriria pelo Irmão reclamando que não
-- recebeu os parabéns.
--
-- `payload` guarda o corpo enviado ao gateway e o motivo quando o disparo é
-- pulado (dia sem aniversariante, integração desligada). O TOKEN NUNCA entra
-- aqui: quem lê os logs é a tela, e um token num log é um token vazado.
-- -----------------------------------------------------------------------------

create table if not exists public.whatsapp_dispatch_logs (
  id           uuid primary key default gen_random_uuid(),
  loja_slug    text not null default public.loja_slug_atual(),
  tipo         text not null,
  destinatario text,
  status       text not null,
  payload      jsonb,
  enviado_em   timestamptz not null default now(),

  constraint whatsapp_logs_tipo_valido
    check (tipo in ('diario', 'semanal', 'alerta_diretoria', 'teste')),
  constraint whatsapp_logs_status_valido
    check (status in ('sucesso', 'erro'))
);

create index if not exists whatsapp_logs_enviado_idx
  on public.whatsapp_dispatch_logs (enviado_em desc);

alter table public.whatsapp_dispatch_logs enable row level security;

drop policy if exists whatsapp_logs_select on public.whatsapp_dispatch_logs;

-- Leitura pela diretoria. A escrita é da service_role, no servidor: um log que
-- o cliente pudesse escrever não serviria como registro de nada.
create policy whatsapp_logs_select on public.whatsapp_dispatch_logs
  for select to authenticated
  using (public.is_diretoria_zap());


-- -----------------------------------------------------------------------------
-- 4. ANO BISSEXTO
-- -----------------------------------------------------------------------------

create or replace function public.eh_bissexto(p_ano int)
returns boolean
language sql
immutable
as $fn$
  select (p_ano % 4 = 0 and (p_ano % 100 <> 0 or p_ano % 400 = 0));
$fn$;


-- -----------------------------------------------------------------------------
-- 5. ANIVERSARIANTES POR JANELA DE DIAS
--
-- O disparo precisa da mesma conta que a tela faz, só que no servidor. Repetir
-- a lógica em JavaScript dentro do cron abriria espaço para as duas versões
-- discordarem — e a discordância apareceria como um parabéns fora de data.
--
-- `aniversariantes(0, 0)` → hoje;  `aniversariantes(0, 6)` → os próximos 7 dias.
--
-- Une o quadro (`dependentes`) com os Irmãos que já têm perfil, sem duplicar:
-- quando o Irmão se cadastra, o gatilho da migração 04 apaga a linha
-- provisória dele no quadro.
--
-- O fuso é fixado em America/Sao_Paulo: o servidor da Vercel roda em UTC, e às
-- 07h de Brasília já é o dia seguinte lá em certas horas — o disparo pegaria os
-- aniversariantes do dia errado.
-- -----------------------------------------------------------------------------

create or replace function public.aniversariantes(p_de int default 0, p_ate int default 0)
returns table (
  nome        text,
  parentesco  text,
  telefone    text,
  responsavel text,
  dia_mes     text,
  dias_ate    int
)
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ano  int  := extract(year from v_hoje)::int;
begin
  return query
  with pessoas as (
    select d.nome_completo as nome,
           d.parentesco,
           d.telefone,
           case when d.parentesco = 'irmao' then null else d.responsavel_nome end as responsavel,
           d.data_nascimento
    from public.dependentes d

    union all

    select p.full_name, 'irmao', p.telefone, null, p.data_nascimento
    from public.profiles p
    where p.is_approved = true
      and p.data_nascimento is not null
  ),
  ajustadas as (
    select x.nome, x.parentesco, x.telefone, x.responsavel, x.data_nascimento,
           extract(month from x.data_nascimento)::int as mes,
           extract(day   from x.data_nascimento)::int as dia_real,
           -- 29 de fevereiro não existe em ano comum. Deixar o Postgres tentar
           -- make_date(2027, 2, 29) levantaria erro e derrubaria o disparo do
           -- dia inteiro, para todo mundo. A convenção da Loja é cumprimentar
           -- em 28, então o ajuste é explícito.
           case
             when extract(month from x.data_nascimento) = 2
              and extract(day   from x.data_nascimento) = 29
              and not public.eh_bissexto(v_ano)
             then 28
             else extract(day from x.data_nascimento)::int
           end as dia
    from pessoas x
  ),
  calculadas as (
    select a.*,
           case
             when make_date(v_ano, a.mes, a.dia) >= v_hoje
             then make_date(v_ano, a.mes, a.dia)
             -- Virada de ano: quem faz em janeiro, visto de dezembro, é do ano
             -- que vem — e o 29 de fevereiro volta a existir se o ano seguinte
             -- for bissexto.
             else make_date(v_ano + 1, a.mes,
                    case when a.mes = 2 and a.dia_real = 29 and public.eh_bissexto(v_ano + 1)
                         then 29 else a.dia end)
           end as proximo
    from ajustadas a
  )
  select c.nome,
         c.parentesco,
         c.telefone,
         c.responsavel,
         to_char(c.proximo, 'DD/MM'),
         (c.proximo - v_hoje)::int
  from calculadas c
  where (c.proximo - v_hoje)::int between p_de and p_ate
  order by (c.proximo - v_hoje)::int, c.nome;
end;
$fn$;


-- -----------------------------------------------------------------------------
-- 6. CONFERÊNCIA
-- -----------------------------------------------------------------------------
-- Aniversariantes de hoje:            select * from public.aniversariantes(0, 0);
-- Dos próximos 7 dias:                select * from public.aniversariantes(0, 6);
-- Últimos disparos:                   select tipo, status, destinatario, enviado_em
--                                     from public.whatsapp_dispatch_logs
--                                     order by enviado_em desc limit 20;
