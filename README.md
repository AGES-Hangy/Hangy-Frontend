# Hangy Frontend

Aplicativo mobile do Hangy, construído com React Native, Expo e TypeScript.

## Requisitos

- Node.js 22.13 ou superior
- Expo Go no celular, ou um emulador Android/iOS

## Rodando localmente

```bash
npm install
npm start
```

Depois, use o QR Code exibido pelo Expo ou escolha uma plataforma no terminal:

```bash
npm run android
npm run ios
npm run web
```

Para validar os tipos:

```bash
npm run typecheck
```

## Organização do repositório

Todo o código-fonte (exceto assets estáticos) fica dentro de `src/`. Essa
estrutura espelha a do projeto irmão `bite-alegre-front`.

- `assets/`: imagens, fontes e outros arquivos estáticos. Fica na raiz, fora
  de `src/`.
- `src/app/`: rotas do app, gerenciadas pelo [Expo Router](https://docs.expo.dev/router/introduction/).
  Cada arquivo/pasta aqui define uma rota — a estrutura de pastas *é* a
  navegação. Convenções:
  - Cada página fica em sua própria pasta com um `index.tsx` (ex.:
    `src/app/(tabs)/Home/index.tsx`, `src/app/Login/index.tsx`), com o
    componente da tela exportado como `export default`.
  - `src/app/index.tsx` é a rota raiz (`/`) — só faz um `<Redirect href="/Home" />`
    para a aba inicial, não deve renderizar conteúdo próprio.
  - `src/app/_layout.tsx` é o layout raiz (Stack do expo-router).
  - `src/app/(tabs)/` é um grupo de rotas com bottom tab bar e é o local
    padrão para páginas novas: cada subpasta (`Home`, `Feed`, `Live`,
    `CreateEvent`, `Search`, `Profile`) é uma tela do grupo, e
    `(tabs)/_layout.tsx` define a `Tabs` navigator. Nomes entre parênteses
    são "route groups" do expo-router — não aparecem na URL. Tanto os nomes
    das pastas quanto os títulos exibidos ao usuário (`title` em cada
    `Tabs.Screen`) ficam em inglês.
  - `Home` fica dentro de `(tabs)` (por isso mostra a bottom tab bar e é o
    destino do redirect da raiz), mas é registrada com
    `options={{ href: null }}` em `(tabs)/_layout.tsx`, o que a remove da
    lista de botões da barra — ela existe e é navegável, só não aparece como
    aba clicável. Use o mesmo `href: null` para qualquer outra tela que deva
    ficar dentro de `(tabs)` sem um botão próprio.
  - **Toda página nova deve entrar em `src/app/(tabs)/` (com sua própria
    aba) por padrão**, a menos que esteja na lista de exceções abaixo.
  - Páginas sem bottom tab bar (ficam fora de `src/app/(tabs)/`, direto em
    `src/app/NomeDaTela/index.tsx`) — lista mantida manualmente, atualizar
    ao adicionar uma nova exceção:
    - `Login`
  - Novas telas internas às abas, que não são elas mesmas uma aba mas são
    acessadas a partir de uma aba (ex.: detalhes de um evento, editar
    perfil), devem ficar em um grupo
    `src/app/(tabs)/(screens)/NomeDaTela/index.tsx` (ainda não criado neste
    projeto — criar apenas quando a primeira tela desse tipo existir).
- `src/components/`: componentes de UI reutilizáveis entre telas (um
  componente por pasta, com `index.tsx`).
- `src/constants/`: valores fixos compartilhados, como `colors.ts`.
- `src/hooks/`: hooks React reutilizáveis (ex.: chamadas de API, lógica de
  formulário).
- `src/utils/`: funções utilitárias puras, sem estado de React.
- `app.json`: configuração do projeto Expo.
- `package.json`: dependências e scripts.

O alias de import `@/*` aponta para `src/*` (configurado em
`tsconfig.json`), então prefira `import { colors } from '@/constants/colors'`
em vez de caminhos relativos longos.

O GitLab é a origem do projeto neste primeiro momento. O espelho para o
GitHub será configurado depois que esta base for validada.

