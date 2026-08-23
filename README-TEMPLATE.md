# Template Multi-Loja — Como funciona

Este site é um **template revendável**. Os dados de cada Loja vivem num único
arquivo. Nenhum `.html` precisa ser tocado para lançar a versão de uma Loja nova.

---

## Arquitetura

```
siteConfig.js                  ← seletor: escolhe QUAL Loja construir
lojas/
  ├── major-portugal.js        ← dados da Loja Major Portugal
  ├── _modelo.js               ← modelo em branco para copiar
  └── (uma Loja = um arquivo)
vite-plugin-site-config.js     ← injeta os dados no HTML durante o build
index.html / historia.html / patrono.html   ← marcação com marcadores {{...}}
```

O site é **HTML estático**, não React. A substituição acontece **em tempo de
build**: o HTML entregue ao navegador já vem preenchido. Isso preserva o SEO e o
preview de link no WhatsApp, que se perderiam se o conteúdo fosse montado por
JavaScript no cliente.

---

## Sintaxe nos arquivos HTML

**Valor simples** — caminho com ponto dentro do config:

```html
<h1>{{loja.nomeCompleto}}</h1>
<img src="{{marca.logo}}">
```

**Lista** — repete o bloco para cada item do array. Dentro do bloco, `item` é o
elemento atual e `i` é o índice:

```html
<!-- @each veneraveis.itens -->
  <img src="{{item.foto}}" alt="{{item.nome}}">
  <h3>{{item.nome}}</h3>
  <p>{{item.anos}}</p>
<!-- @endeach -->
```

**Texto com marcação** — três chaves não escapam o HTML (usado nos parágrafos da
História, que contêm `<strong>`):

```html
<p>{{{item.html}}}</p>
```

> Um marcador que não existe no config **quebra o build**, em vez de gerar uma
> página com `{{loja.nome}}` cru aparecendo na tela do cliente.

---

## Criar a Loja B (4 passos)

**1. Copie o modelo**

```bash
cp lojas/_modelo.js lojas/loja-b.js
```

**2. Preencha os dados da Loja B** em `lojas/loja-b.js` — nome, contato,
Ex-Veneráveis, história, patrono, Grandes Orientes.

**3. Coloque as imagens em `public/`** e referencie com caminho absoluto:

```
public/img/veneraveis/fulano.png   →   foto: "/img/veneraveis/fulano.png"
public/logo.png                    →   logo: "/logo.png"
```

**4. Registre a Loja** em `siteConfig.js`:

```js
import lojaB from './lojas/loja-b.js';

const LOJAS = {
  'major-portugal': majorPortugal,
  'loja-b': lojaB,          // ← acrescente
};
```

Pronto. Agora:

```bash
LOJA=loja-b npm run build     # gera o site da Loja B em dist/
LOJA=loja-b npm run dev       # roda a Loja B em desenvolvimento
npm run build                 # sem a variável, constrói a Major Portugal
```

No **PowerShell** (Windows):

```powershell
$env:LOJA="loja-b"; npm run build
```

---

## Respondendo à pergunta: um repositório ou vários?

**Um repositório só.** Não crie um fork do projeto por Loja — se você corrigir um
bug ou melhorar o design, teria de repetir a correção em N repositórios, e eles
vão divergir. Aqui, uma melhoria no HTML beneficia todas as Lojas de uma vez.

**Um projeto na Vercel por Loja**, todos apontando para o **mesmo repositório**,
cada um com a variável de ambiente `LOJA` diferente:

| Projeto Vercel | Env var             | Domínio                    |
|----------------|---------------------|----------------------------|
| loja-4424      | `LOJA=major-portugal` | majorportugal.org.br     |
| loja-b         | `LOJA=loja-b`         | lojab.org.br             |

Na Vercel: *Settings → Environment Variables → `LOJA` = `loja-b`*. Cada projeto
faz seu próprio build a partir do mesmo código, com o config da sua Loja.

---

## O que já está no template

Todas as páginas — o site público (`index`, `historia`, `patrono`) **e** as de
sistema (`dashboard`, `tesouraria`, `biblioteca`, `calendario`, `login`,
`cadastro`, `fraternidade`, `timbre`, `sisoriente`) — leem nome, logo, contato
e listas do arquivo da Loja. Não resta nenhum dado da Major Portugal cravado
em `.html`.

O **PWA** acompanha a Loja: `manifest.json` e `sw.js` não existem como arquivos
em `public/` — são gerados no build a partir do config (ver
`vite-plugin-site-config.js` e `pwa/sw-template.js`). O nome do cache do service
worker carrega o slug da Loja, para que duas Lojas visitadas no mesmo navegador
não disputem a mesma chave de cache.

As **chaves do Supabase** ficam em `lojas/<slug>.js` → `integracoes.supabase`.
Cada Loja aponta para o seu próprio projeto: bancos fisicamente separados, sem
tabela compartilhada de onde uma Loja pudesse ler a outra. A chave publicável é
visível no navegador por design — quem protege os dados é o RLS
(`supabase/01_rls.sql`), e `supabase/replicar/GUIA.md` traz o passo a passo para
provisionar o banco da Loja seguinte.

---

## O que ainda NÃO está no template

- **Conteúdo dentro do banco** (membros, atas, eventos, arquivos da biblioteca)
  não é copiado por este build: nasce vazio em cada projeto Supabase novo.
- **`css/mobile.css`** carrega a paleta âmbar como cor de destaque em regras
  fixas. `marca.corPrimaria` cobre a `theme-color` do PWA, mas uma Loja que
  queira outra cor ainda precisa de um passe no CSS.
