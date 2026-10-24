# Animes no MangaVerse

A seção **Animes** está disponível na navegação desktop e mobile. A **Minha Biblioteca** alterna entre Mangás e Animes. Favoritos, status e quantidade de episódios assistidos são armazenados apenas no navegador (`mangaverse_anime_library_v1`), sem alterar a biblioteca de mangás. Limpar os dados do navegador apaga esse acompanhamento.

## Desenvolvimento

Use o checkout existente, instale com Bun 1.4.4 (`bun install --frozen-lockfile`) e execute `npm run dev`. Node 24 foi validado. Em ambientes que exigem um proxy HTTPS, como este ambiente na nuvem, use `NODE_USE_ENV_PROXY=1 npm run dev` para que o `fetch` do Node respeite o proxy. Não desative a verificação TLS.

O frontend e as rotas `/api` são servidos pelo Express em `server.ts`, por padrão na porta 3000. Para produção, execute `npm run build` e depois `NODE_ENV=production npm start`. Apenas hospedar `dist/` não fornece o backend. A sincronização com Lovable exige que ele esteja conectado ao repositório/branch correto e que suas chamadas `/api` alcancem esse backend.

## Contrato Tenrai

Documentação consultada: https://api.tenrai.org/llms.txt (Jikan v4). A API é pública, somente leitura e não exige chave.

| Rota local | Fonte Tenrai |
| --- | --- |
| `/api/anime?mode=popular&page=1` | `/v1/top/anime?filter=bypopularity` |
| `/api/anime?mode=seasonal&page=1` | `/v1/seasons/now` |
| `/api/anime?mode=ranked&page=1` | `/v1/top/anime` |
| `/api/anime?q=nome&page=1` | `/v1/anime?q=nome` |
| `/api/anime/:id` | `/v1/anime/:id` |
| `/api/anime/:id/episodes?page=1` | `/v1/anime/:id/episodes` |

Listas do catálogo usam 24 itens por página. A paginação de episódios segue o tamanho definido pela Tenrai. Títulos, sinopses e títulos de episódios são exibidos no idioma recebido; não há tradução automática. Campos ausentes ou nulos não recebem valores inventados. A seção apresenta informações, capas, notas, gêneros, estúdios, ano, episódios e trailers oficiais do YouTube; não hospeda nem reproduz episódios completos. O YouTube pode limitar um trailer por região ou por decisão do proprietário.

O backend utiliza cache em memória por cinco minutos, revalidação por ETag e deduplicação das consultas simultâneas ao mesmo recurso. As chamadas externas são serializadas com intervalo mínimo de 550 ms para respeitar os limites públicos de 4/s e 120/min por IP. Esses limites se aplicam ao IP: em múltiplas instâncias, será necessário coordenar cache e limites entre elas. Um 429 propaga `Retry-After` e suspende novas chamadas até o prazo informado. Falhas não se convertem em catálogos fictícios.

Destinos usados pela nova seção: `api.tenrai.org` (servidor), `cdn.myanimelist.net` (capas) e `www.youtube-nocookie.com` (player de trailers). O YouTube pode carregar seus próprios recursos adicionais no navegador.

## Validação

```sh
npm run lint
npm run build
node --import tsx --test tests/animeApi.test.ts
```

Os testes do backend simulam a Tenrai e cobrem roteamento de filtros e busca, validação de entrada, campos nulos, cache, paginação de episódios, erros 404/502, validação de URLs do YouTube e limitação 429. Não precisam de acesso externo.

Com o servidor iniciado, consulte `/api/anime/1` (Cowboy Bebop) e `/api/anime/1/episodes` para validar conectividade real. Para verificar o fluxo visual: abra Animes, alterne os filtros, busque Cowboy Bebop, abra os detalhes, adicione à biblioteca, marque Favorito, selecione Assistindo e altere a quantidade de episódios assistidos. Recarregue e confira os dados em Minha Biblioteca → Animes.
