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
| 7 | `migrations/20260823_04_quadro_sem_conta.sql` | Desacopla o quadro das contas de acesso |
| 8 | `seed_aniversariantes_major_portugal.sql` | Carga do quadro de aniversariantes |

> **O passo 8 não está no git.** `supabase/seed_*.sql` está no `.gitignore`:
> o arquivo traz nome, telefone e data de nascimento de Irmãos, esposas e
> crianças, e este repositório é o mesmo template servido a todas as Lojas —
> o histórico do git não esquece. O arquivo existe no disco de quem o gerou.
> Se ele se perder, refaça a partir do quadro da Loja seguindo o formato das
> tabelas temporárias `_quadro_irmaos` e `_quadro_dependentes`, ou peça uma
> cópia a quem já o tem. Guarde-o como você guarda o quadro em papel.

A ordem importa: o passo 5 usa `cargo_normalizado()`, criada no 4; o 7 usa
`nome_normalizado()`, criada no 6; e o 8 depende das funções e do gatilho de
vinculação instalados no 7. Fora de ordem, o
Postgres recusa a criação com a mensagem dizendo qual função falta — é de
propósito, para não deixar um `is_oficial()` quebrado no lugar do bom.

---

## Ao provisionar uma Loja NOVA

Cada Loja tem seu próprio projeto Supabase. Rode os passos **1 a 7** no
projeto novo — eles não contêm dado nenhum de Loja alguma.

O passo **8 é exclusivo da Major Portugal**: contém o quadro de
aniversariantes dela. Nunca rode esse arquivo no banco de outra Loja.

Declare o slug da Loja uma vez, no projeto novo:

```sql
alter database postgres set app.loja_slug = 'loja-b';
```

Ver também `replicar/GUIA.md`.

---

## Depois da carga — confira o relatório

**Nada mais é recusado por falta de responsável.** O quadro da Loja existe desde
antes do site; as contas de acesso são um detalhe de quem já se cadastrou. A
carga entra inteira nos dois casos:

| Situação do Irmão | O que acontece |
|---|---|
| Tem perfil no portal | Data e telefone vão para o perfil dele; os familiares apontam para ele |
| Ainda não tem perfil | A data dele fica como linha de quadro (`parentesco = 'irmao'`), e os familiares entram **sem dono**, identificados por `responsavel_nome` |

A Chancelaria enxerga o quadro completo **hoje**, sem esperar ninguém se
cadastrar.

### A vinculação é automática

Quando o Irmão finalmente criar conta, o gatilho `trg_profiles_vincula_quadro`
(migração 07) faz sozinho, no mesmo instante:

1. move a data de nascimento da linha provisória para o perfil dele e **apaga
   essa linha** — sem isso, ele apareceria duas vezes no quadro;
2. liga todos os familiares dele ao perfil.

**Não é preciso rodar o seed de novo.** O mesmo vale para uma correção de nome:
o gatilho também dispara em `update of full_name`, então consertar a grafia de
um cadastro basta para o vínculo acontecer.

Para forçar à mão, se precisar:

```sql
select public.vincular_quadro_ao_perfil('<uuid-do-perfil>');
```

### O que o relatório mostra

O `SELECT` final lista quem **ainda não tem conta no portal**, com quantos
familiares dele já estão no quadro. Não é erro: é a lista de quem ainda não
consegue ver nem editar a própria família pela tela.

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
