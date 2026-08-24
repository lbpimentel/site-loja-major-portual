# Imagens originais

Aqui ficam os arquivos **antes** da conversão para WebP. Esta pasta está fora de
`public/`, então nada daqui vai para o site publicado — ela existe só para não
perdermos os masters.

## Por que a conversão aconteceu

A home carregava **3,3 MB** em 21 requisições, quase tudo PNG sem otimização. Só
`background.png` eram 732 KB, e os retratos dos Veneráveis vinham em resolução
muito acima do círculo de 192 px em que aparecem na tela. Numa rede de celular
isso são vários segundos de espera na primeira visita — justamente o visitante
que a home precisa segurar.

Depois da conversão a home ficou em **571 KB**.

| Arquivo | Antes | Depois |
|---|---|---|
| `background.png` → `.webp` | 732 KB | 45 KB |
| `img/veneraveis/*.png` → `.webp` | 1 355 KB | 65 KB |
| `img/institucional/*.png` → `.webp` | 402 KB | 28 KB |
| `galeria/foto1-3.jpg` → `.webp` | 365 KB | 236 KB |
| `logo.png` (segue PNG) | 281 KB | 79 KB |

`logo.png` continua sendo PNG de propósito: ele também é o ícone do PWA
(`manifest.json`) e o `apple-touch-icon`, e o WebP não é confiável nesses dois
lugares no iOS.

## Como regerar

Precisa do `sharp` (`npm install --no-save sharp`). A largura de cada imagem foi
escolhida como ~2× o tamanho real de exibição:

| Imagem | Largura |
|---|---|
| `background` | 1200 px |
| `veneraveis/*` | 400 px (círculo de 192 px) |
| `institucional/*` | 240 px (exibidos a ≤ 80 px) |
| `galeria/*` | 1080 px (o lightbox amplia) |
| `logo` | 512 px |

```js
const sharp = require('sharp');
await sharp(entrada)
  .resize({ width: LARGURA, withoutEnlargement: true })
  .webp({ quality: 82, effort: 6 })
  .toFile(saida);
```

## Ao trocar uma imagem

Os caminhos vivem em `lojas/<slug>.js`, não no HTML — `marca.logo`,
`marca.heroBackground`, `veneraveis.itens[].foto`, `galeria.fotos[].src` e
`rodape.orientes[].logo`. Converta, salve o original aqui e atualize o caminho
no arquivo da Loja.
