# Filtros no mapa Ao vivo — iOS contra o backend

04/11/2026: iPhone 17 (simulador iOS 26.5, Expo Go), com
`EXPO_PUBLIC_API_BASE_URL` apontando para o backend da branch
`tid295/filtros-mapa` rodando localmente com o seed (`python -m app.seed`),
logado como `user@hangy.com`. Sem mocks.

- `01-mapa-sem-filtro.jpg`: botão de filtro no canto, sem contador.
- `02-painel-esportes-futebol.jpg`: painel `Live` com Esportes e Futebol.
- `03-futebol-aplicado.jpg`: contador 1. Request:
  `tag_ids=<Futebol>` — a macro Esportes saiu porque tem uma micro marcada.
- `04-painel-hoje.jpg` / `05-futebol-hoje.jpg`: "Hoje" + Futebol, contador 2,
  só "Fut society no fim de tarde". Request:
  `starts_from=2026-11-04T00:00:00.000-03:00&starts_until=2026-11-04T23:59:59.999-03:00&tag_ids=<Futebol>`.
- `06-vazio-com-filtro.jpg`: "Este fim de semana" + Futebol não tem evento
  público → estado vazio com "Limpar filtros".
- `07-limpar-filtros.jpg`: depois de "Limpar filtros", request sem filtros, sem
  contador e os pins de volta.

**Android não foi testado.** Mover o mapa com filtro ativo usa o mesmo caminho
da busca, mas não aparece nos prints.
