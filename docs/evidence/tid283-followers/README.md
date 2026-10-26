# Seguidores do estabelecimento — Web com mocks

26/10/2026: frontend desta branch no Web (viewport 375×812), com
`EXPO_PUBLIC_USE_API_MOCKS=true` e `EXPO_PUBLIC_MOCK_USER_TYPE=BUSINESS`. O
backend (task 282) não foi usado: as respostas vêm de `src/mocks/eventApi.ts`.

- `01-lista.jpg`: Perfil → "Seguidores" abre a lista; título com o total (45).
- `02-busca.jpg`: busca "oliv" filtra por nome; o total do título não muda.
  Com 1 caractere ("o") nenhuma requisição é feita.
- `03-sem-resultado.jpg`: busca sem resultado mostra o EmptyState de busca.
- `04-paginacao.jpg`: rolando até o fim, as três páginas (20 + 20 + 5) carregam.
- `05-vazio.jpg`: `EXPO_PUBLIC_MOCK_FOLLOWERS=empty` → "Nenhum seguidor ainda".
- `06-erro.jpg`: `EXPO_PUBLIC_MOCK_FOLLOWERS=error` → erro com "Tentar de novo".

**Android e iOS não foram testados**, e o layout não foi conferido contra o
frame do Figma.
