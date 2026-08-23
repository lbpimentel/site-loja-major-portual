# Banco de dados — ordem de execução

Todos os scripts rodam em **Supabase → SQL Editor → New query → colar → Run**.
Todos são idempotentes: rodar de novo não quebra nada e não duplica dados.

> O SQL Editor executa com o papel de serviço, que **ignora o RLS**. É o que
> permite à carga gravar dependentes em nome de outros Irmãos — coisa que o
> aplicativo, corretamente, não deixa ninguém fazer.

---

## Ordem

| # | Arquivo | O que faz |
|---|---|---|
| 1 | `01_rls.sql` | Fecha a exposição pública das 7 tabelas originais |
| 2 | `02_storage.sql` | Policies dos buckets de arquivo |
| 3 | `03_ajuste_oficial.sql` | Define quem é "oficial" para fins financeiros |
| 4 | `migrations/20260823_01_fraternidadezap.sql` | `dependentes`, `fraternidade_templates`, `cargo_normalizado()` |
| 5 | `migrations/20260823_02_cargos_sem_acento.sql` | Corrige `is_oficial()` e padroniza o cargo de Hospitaleiro |
| 6 | `migrations/20260823_03_ano_nascimento_desconhecido.sql` | `ano_conhecido`, `telefone_e164_br()`, `nome_normalizado()` |
| 7 | `seed_aniversariantes_major_portugal.sql` | Carga do quadro de aniversariantes |

A ordem importa: o passo 5 usa `cargo_normalizado()`, criada no 4, e o 7 usa
`telefone_e164_br()` e `nome_normalizado()`, criadas no 6. Fora de ordem, o
Postgres recusa a criação com a mensagem dizendo qual função falta — é de
propósito, para não deixar um `is_oficial()` quebrado no lugar do bom.

---

## Ao provisionar uma Loja NOVA

Cada Loja tem seu próprio projeto Supabase. Rode os passos **1 a 6** no
projeto novo — eles não contêm dado nenhum de Loja alguma.

O passo **7 é exclusivo da Major Portugal**: contém o quadro de
aniversariantes dela. Nunca rode esse arquivo no banco de outra Loja.

Declare o slug da Loja uma vez, no projeto novo:

```sql
alter database postgres set app.loja_slug = 'loja-b';
```

Ver também `replicar/GUIA.md`.

---

## Depois da carga (passo 7) — confira o relatório

O script termina com um `SELECT` que lista **o que não entrou**. Ele não falha
quando um nome do quadro não existe em `profiles`: seria pior desfazer 128
linhas por causa de um Irmão que ainda não se cadastrou no portal.

Duas situações aparecem ali:

**`IRMAO NAO ENCONTRADO EM profiles`** — o Irmão não tem conta no portal, ou o
nome está escrito de forma diferente no cadastro. Nos dois casos, **os
dependentes dele também ficaram de fora**.

**`DEPENDENTE NAO IMPORTADO (responsavel ausente)`** — consequência do anterior.

Para resolver: crie a conta do Irmão (ou corrija o `full_name` no cadastro) e
**rode o passo 7 de novo**. Só entra quem faltava.

### Conferências rápidas

```sql
-- Quantos dependentes entraram
select count(*) from public.dependentes;

-- O quadro do mês corrente, como a tela monta
select nome_completo, parentesco, to_char(data_nascimento, 'DD/MM') as dia_mes
from public.dependentes
where extract(month from data_nascimento) = extract(month from current_date)
order by extract(day from data_nascimento);

-- Irmãos com aniversário mas sem telefone válido
select full_name from public.profiles
where data_nascimento is not null and telefone is null
order by full_name;
```

---

## Sobre o ano de nascimento

O quadro da Loja registra só **dia e mês** — é o que a Chancelaria precisa.
Como `data_nascimento` é `date NOT NULL`, a carga grava o ano-sentinela
**1904** (bissexto, para aceitar 29 de fevereiro) e marca
`ano_conhecido = false`.

A tela lê essa marca e **não exibe idade** nessas linhas. Sem ela, o quadro
mostraria "122 anos" ao lado do nome de uma criança, e a mensagem de parabéns
sairia com a idade errada.

Quando alguém informar o ano verdadeiro:

```sql
update public.dependentes
set data_nascimento = date '2015-03-13', ano_conhecido = true
where id = '...';
```

---

## Se precisar desfazer a carga

```sql
-- Remove SÓ o que a carga inseriu (as linhas sem ano conhecido).
-- Confira antes com um select; um dependente cadastrado pela tela sem ano
-- também cairia neste filtro.
select count(*) from public.dependentes where ano_conhecido = false;
delete from public.dependentes where ano_conhecido = false;

-- Limpa os aniversários dos Irmãos gravados pela carga
update public.profiles
set data_nascimento = null, ano_conhecido = true
where ano_conhecido = false;
```
