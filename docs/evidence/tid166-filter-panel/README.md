# FilterPanel — Web com mocks

28/10/2026: componente desta branch no Web (viewport 375×812), com
`EXPO_PUBLIC_USE_API_MOCKS=true`. As tags vêm do mock de `GET /tags/tree`
(`src/mocks/eventApi.ts`). O painel foi aberto por uma tela de rascunho
temporária, que não faz parte do PR.

- `01-search.jpg`: variante `Search` aberta, sem filtro — "Limpar" desabilitado.
- `02-intervalo-invalido.jpg`: "Escolher data" com De 15/11/2026 e Até
  01/11/2026 → erro no campo Até e "Aplicar filtros" desabilitado.
- `03-tags-micro.jpg`: macro "Esportes" marcada → as micro dela aparecem.
- `04-mostrar-pessoas.jpg`: "Mostrar: Pessoas" desabilita data e distância com
  o aviso "Não se aplica a pessoas."
- `05-live.jpg`: depois de aplicar 01/11–15/11 + Esportes/Futebol, a variante
  `Live` reabre com o valor aplicado, sem os blocos Mostrar e Distância. O
  valor entregue ao `onApply` foi
  `{"tagIds":["macro-0","micro-0-0"],"datePreset":"custom","dateFrom":"2026-11-01","dateTo":"2026-11-15"}`.
- `06-limpar.jpg`: "Limpar" zera o rascunho e mantém o painel aberto; sem macro,
  as micro sugeridas aparecem. Fechar pelo × depois disso manteve o filtro
  aplicado.

**Android e iOS não foram testados pelo agente.** Os chips aparecem com fonte
serifada no Web por causa do `Chip` existente (`fontFamily.base`), não do painel.
