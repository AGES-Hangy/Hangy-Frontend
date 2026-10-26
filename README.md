# Hangy Frontend

Aplicativo mobile do Hangy, construído com React Native, Expo e TypeScript.

## Requisitos

- Node.js 22.13 ou superior
- Build de desenvolvimento compatível com Expo SDK 58 no celular (ou Expo Go compatível, para testes sem push remoto)
- Para compilar localmente: Xcode compatível no iOS ou Android SDK/JDK no Android

## Rodando localmente

Instale as dependências:

```bash
npm ci
```

Depois, inicie o servidor de desenvolvimento do Expo:

```bash
npm start
```

Para validar os tipos:

```bash
npm run typecheck
```

## Validação da atualização para SDK 58

O projeto usa Expo 58, React 19.3 e React Native 0.88. Builds de desenvolvimento
feitas com SDK 57 precisam ser reconstruídas; atualizar apenas o JavaScript não basta.

```bash
npm ci
npx expo install --check
npx expo-doctor
npm run typecheck
npm test
npx expo export --platform all
```

Para testar no celular, configure `.env.local` (não versionado):

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://ENDERECO-DO-BACKEND-DE-TESTE
EXPO_PUBLIC_USE_API_MOCKS=false
```

Substitua o endereço pelo backend de teste real. Para API no Mac, use seu IP
na rede local, servidor acessível pela rede e celular no mesmo Wi-Fi; `localhost`
no celular aponta para o próprio aparelho.

Use o perfil `development` de `eas.json` para gerar uma nova build, caso não
compile localmente. iOS exige acesso às credenciais e provisionamento do projeto.
Depois de instalar a build compatível:

```bash
npx expo start --dev-client --lan --clear
```

Antes do PR, registrar modelo, sistema, build e resultado de cada cenário em iOS
e Android:

- Abrir a frio, entrar, fechar/reabrir preservando a sessão, sair e entrar novamente.
- Alternar Início/Ao vivo/Buscar/Perfil, repetir toque na aba atual, abrir detalhes
  e voltar; conferir botão voltar do Android, cabeçalhos e áreas seguras.
- Criar/editar evento: tentar avançar com campos vazios duas vezes e após rolar;
  conferir foco/rolagem até o erro, teclado e preservação dos dados entre etapas.
- Escolher/cancelar foto, trocar capa, selecionar data/hora, salvar e reabrir
  para confirmar persistência no backend.
- Negar e depois permitir localização nos ajustes; retornar ao app e conferir
  mapa, marcadores e seleção de endereço.
- Favoritar/desfavoritar e participar/cancelar; reabrir detalhe para conferir estado.
- Abrir diálogos, cancelar e confirmar; verificar retorno do foco com leitor de tela,
  especialmente no perfil e nos botões de carregar mais.
- Em build de desenvolvimento, validar push com app aberto, em segundo plano e
  fechado; tocar na notificação deve abrir o destino correto.
- Desligar/religar rede, repetir operação e conferir recuperação sem travamento.
- Rodar também build Android `preview` (release), pois o SDK 58 habilita otimização
  R8 por padrão. Bundle exportado não substitui esse teste.

A saída web é explicitamente `single`: hospedagem estática deve encaminhar rotas
para `index.html`. As pastas nativas continuam geradas e ignoradas pelo Git.

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

