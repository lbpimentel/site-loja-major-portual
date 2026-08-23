# Replicar o banco para uma Loja nova

Objetivo: montar, num projeto Supabase novo e vazio, o mesmo banco da Major
Portugal — tabelas, funções, gatilhos, políticas e o bucket de documentos.

O que precisa entrar no projeto novo, **nesta ordem**:

1. **Tabelas** (schema `public`)
2. **Segurança do schema public** — funções, gatilhos, políticas RLS
3. **Storage** — bucket privado `documents` e suas políticas
4. **Primeiro admin** — criar o usuário e promovê-lo
5. **Config** — apontar `lojas/<slug>.js` para o projeto novo

Há dois caminhos para os passos 1–2. O **A** é o mais fiel (usa o dump real do
Supabase). O **B** não exige a CLI — só o SQL Editor do navegador.

---

## Caminho A — CLI do Supabase (recomendado)

A CLI já está instalada (`supabase --version` → 2.109.1). Ela extrai o schema
`public` inteiro (tabelas + funções + gatilhos + políticas) de uma vez, na ordem
correta de dependências.

```bash
# 1. Autenticar e ligar ao projeto de ORIGEM (Major Portugal)
supabase login
supabase link --project-ref dnemzaksujqnywbnfamf

# 2. Extrair o schema public (pede a senha do banco de origem)
supabase db dump --schema public -f schema_publico.sql

# 3. Ligar ao projeto NOVO (troque pelo ref da Loja nova) e aplicar
supabase link --project-ref <REF_DA_LOJA_NOVA>
psql "<CONNECTION_STRING_DA_LOJA_NOVA>" -f schema_publico.sql
```

> A senha do banco e a connection string ficam com você — eu não as vejo nem
> preciso delas. Pegue em: Supabase → Project Settings → Database.

Isso cobre os passos **1 e 2**. O `db dump` do schema `public` **não** inclui o
bucket de Storage (ele vive no schema `storage`), então o passo 3 continua sendo
o `02_storage.sql`, aplicado à parte.

---

## Caminho B — só pelo SQL Editor (sem CLI)

No SQL Editor do projeto **novo e vazio**, rode nesta ordem:

1. **Tabelas.** Primeiro, no projeto de **origem**, rode
   [`gerar_ddl_tabelas.sql`](gerar_ddl_tabelas.sql) e copie a saída (coluna
   `ddl`). Cole e rode essa saída no projeto novo. Ela cria as 7 tabelas com os
   tipos, defaults e chaves **reais**, e depois as chaves estrangeiras.

2. **Segurança.** Rode, em ordem, os scripts que já existem e estão testados:
   - [`../01_rls.sql`](../01_rls.sql) — funções, gatilhos e políticas
   - [`../03_ajuste_oficial.sql`](../03_ajuste_oficial.sql) — ajusta `is_oficial()`
     para a lista final (admin, tesoureiro, orador, venerável)

   > A ordem importa: o `01` cria a versão inicial de `is_oficial()`, e o `03` a
   > substitui pela final. Rodar o `03` depois do `01` deixa o estado correto.

---

## Passo 3 — Storage (os dois caminhos precisam)

No SQL Editor do projeto novo, rode [`../02_storage.sql`](../02_storage.sql).
Cria o bucket privado `documents` e as políticas que espelham `is_oficial()`.

---

## Passo 4 — Criar o primeiro admin

O banco novo nasce sem ninguém aprovado — e os gatilhos impedem auto-promoção
(ninguém vira admin sozinho). Então o primeiro admin é criado na mão:

1. Supabase → **Authentication → Add user** → crie o e-mail/senha do Venerável.
2. No SQL Editor, promova esse usuário. Troque o e-mail:

```sql
update public.profiles p
set is_approved = true,
    role        = 'admin'
from auth.users u
where u.email = 'veneravel@lojanova.org.br'
  and p.id = u.id;
```

> Se a linha em `profiles` ainda não existir (dependendo de como o cadastro
> cria o perfil), crie-a antes com o mesmo `id` do usuário em `auth.users`.

---

## Passo 5 — Apontar o site para o projeto novo

Em `lojas/<slug-da-loja-nova>.js`, preencha `integracoes.supabase`:

```js
supabase: {
  url:     "https://<REF_DA_LOJA_NOVA>.supabase.co",
  anonKey: "sb_publishable_...da_loja_nova...",
},
```

Pegue em: Supabase → Project Settings → API (Project URL e a chave `anon`/
publishable). Nunca use a chave `service_role`.

---

## Conferência final

No projeto novo, rode as sondas de sempre para provar que fechou:

```sql
-- Nenhuma política pode liberar 'public'/'anon', exceto:
--   candidatos_interesse (INSERT)  e  calendar_events (SELECT)
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and ('anon' = any(roles) or 'public' = any(roles))
order by tablename;

-- O bucket deve ser privado:
select id, public from storage.buckets where id = 'documents';
```

E, do seu lado, um teste de fumaça: um membro comum loga e vê o quadro mas não a
tesouraria; um anônimo consegue enviar o formulário de ingresso mas não lê os
candidatos.
