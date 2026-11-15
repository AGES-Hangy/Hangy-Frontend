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

## Credenciais nativas: push e Google Maps

Num app instalado (build `development`, `preview` ou `production`), o push no
Android e o mapa da aba Ao Vivo dependem de credenciais que **não ficam no Git**.
No Expo Go nada disso é usado: desde o SDK 53 ele não recebe push remoto no
Android, então teste sempre com uma build do EAS.

`app.config.js` lê duas variáveis no momento do build:

| Variável | Tipo no EAS | Para quê |
| --- | --- | --- |
| `GOOGLE_SERVICES_JSON` | arquivo (*secret*) | vira `android.googleServicesFile` (FCM) |
| `GOOGLE_MAPS_ANDROID_API_KEY` | texto (*sensitive*) | vira o `com.google.android.geo.API_KEY` do AndroidManifest (equivale a `android.config.googleMaps.apiKey`), pelo plugin do `react-native-maps` |

Cada perfil de `eas.json` aponta para o ambiente EAS de mesmo nome
(`development`, `preview`, `production`). Build Android de `production` sem
uma das duas variáveis falha logo no início; nos outros perfis o build só avisa
no log.

### 1. Push no Android (Firebase / FCM v1)

1. No [console do Firebase](https://console.firebase.google.com), crie o projeto
   e registre um app Android com o pacote `br.pucrs.ages.hangy`.
2. Baixe o `google-services.json` e envie ao EAS, sem commitar:
   ```bash
   eas env:create --name GOOGLE_SERVICES_JSON --type file --visibility secret \
     --value ./google-services.json --environment development --environment preview --environment production
   ```
   Depois apague a cópia local ou guarde-a fora da pasta do projeto
   (`google-services*.json` está no `.gitignore` por segurança).
3. Em *Configurações do projeto → Contas de serviço*, gere uma chave privada
   (JSON) da conta de serviço. É ela que o serviço de push do Expo usa para
   entregar no Android. Envie com `eas credentials` → Android → `production` →
   *Google Service Account* → *Push Notifications (FCM V1)*.

### 2. Push no iOS (APNs)

Exige conta paga do **Apple Developer Program**. Com ela, rode
`eas credentials` → iOS e deixe o EAS gerar e guardar a chave de APNs. Sem a
conta, o iOS fica sem push remoto (o resto do app funciona).

### 3. Mapa no Android (Maps SDK for Android)

1. No Google Cloud do mesmo projeto do Firebase, ative o *Maps SDK for Android*
   e crie uma chave de API.
2. Restrinja a chave a *Apps Android* com o pacote `br.pucrs.ages.hangy` e o
   SHA-1 de **cada** certificado que assina builds. Os perfis podem usar
   certificados diferentes: liste-os com `eas credentials` → Android e inclua
   todos. Não use o SHA-1 do computador de quem desenvolve.
3. Envie ao EAS:
   ```bash
   eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --type string --visibility sensitive \
     --value SUA_CHAVE --environment development --environment preview --environment production
   ```

O iOS usa o mapa nativo da Apple e não precisa de chave.

### 4. Token de acesso do Expo (recomendado)

No painel do Expo, em *Project settings → Push notifications*, ative a
segurança avançada e gere um *access token*. Ele vai no segredo de deploy do
backend como `EXPO_ACCESS_TOKEN` (o backend já lê essa variável). Sem ele,
qualquer pessoa com um token de push do app consegue enviar notificações.

### Build local

O EAS CLI não lê `.env.local` para montar a config. Exporte no shell:

```bash
export GOOGLE_SERVICES_JSON=/caminho/fora/do/repo/google-services.json
export GOOGLE_MAPS_ANDROID_API_KEY=SUA_CHAVE
```

### Rotação

- **Chave FCM (conta de serviço) e APNs:** ficam no EAS. Gere a nova,
  substitua em `eas credentials` e revogue a antiga. Não precisa de novo build.
- **`google-services.json`:** só muda se o app Firebase for recriado. Atualize
  com `eas env:update` e gere novo build.
- **Chave do Maps:** vai dentro do APK. Crie a nova, atualize a variável no EAS,
  gere e distribua novo build e só então apague a antiga no Google Cloud.

### Dono das contas

A conta do Firebase/Google Cloud e a do Apple Developer são ponto único de
falha. Registre aqui quem é o dono e qual e-mail de equipe tem acesso de
administrador, e adicione pelo menos uma segunda pessoa como administradora:

- Firebase / Google Cloud: _a definir_
- Apple Developer Program: _a definir_
- Expo (`gbn0s-team`): _a definir_

### Como conferir

- Build Android instalado, app fechado, backend envia notificação: ela aparece.
- Tocar na notificação abre a tela certa (deep link de `NotificationResponseBridge`).
- Aba Ao Vivo renderiza o mapa.
- `git ls-files | grep -i google-services` não retorna nada e a chave do Maps
  não aparece no código (`git grep AIza -- ':!README.md'` vazio).

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

## Estados globais: erro, offline e carregamento

Nenhuma tela inventa o próprio estado de erro (task 141). O contrato é este:

| Situação | O que o usuário vê | Quem cuida |
| --- | --- | --- |
| `401` | "Sua sessão expirou. Entre de novo." e volta para o Login | `apiFetch`, uma vez só — a tela não trata |
| `5xx` na primeira carga | `ErrorScreen` "Algo deu errado do nosso lado" com "Tentar de novo" | a tela |
| Sem rede | `OfflineBanner` fixo no topo; ações de escrita desabilitadas | a tela |
| Sem rede na primeira carga | `ErrorScreen` "Você está sem internet" (+ a faixa) | a tela |
| Timeout na primeira carga | `ErrorScreen` "A conexão demorou demais" | a tela |
| Timeout ao atualizar algo já na tela | `Toast` de erro com "Tentar de novo" | a tela |
| Reconectou | some a faixa e a carga que falhou é refeita sozinha | `useRetryOnReconnect` |
| 200 com lista vazia | `EmptyState` — vazio nunca é erro | a tela |

Peças:

- `apiFetch` (`src/utils/http.ts`): toda chamada à API passa por ele. Ele põe
  o token, aplica o timeout, trata o 401 e transforma qualquer falha num
  `ApiError` (`kind`, `status`, `detail`). Não use `fetch` direto para a API.
- `describeLoadError` (`src/utils/apiErrors.ts`): o hook traduz o erro do `GET`
  num `LoadError` (`kind`, `title`, `message`, `canRetry`) e o expõe como
  `error`, junto com um `reload` que refaz a requisição original.
- `ErrorScreen` (`src/components/ErrorScreen`): tela cheia de erro, genérica
  (título, texto, ícone, tom e ação por prop). Para um `LoadError`, use
  `loadErrorScreenProps` (`src/utils/errorScreen.ts`), que escolhe ícone, cor,
  texto e o botão — "Tentar de novo" quando `canRetry`, "Voltar" quando não.
  Nas telas sem a barra de abas (`noNavbarScreens`), passe `withBottomInset`
  para o botão do rodapé não ficar sob o indicador de gestos do iOS.
- `OfflineBanner` (`src/components/OfflineBanner`): faixa absoluta (top 8,
  altura mínima 48). Não engole o conteúdo: a tela desce o conteúdo com
  `paddingTop: spacing[64]` enquanto ela aparece.
- `useRetryOnReconnect(shouldRetry, retry)` (`src/hooks`): devolve o
  `isOffline` e, quando a rede volta, chama `retry` se `shouldRetry`.
- `Skeleton` (`src/components/Skeleton`): primeira carga de lista ou detalhe,
  com a métrica do componente real para a tela não saltar.
- `LoadingScreen` (`src/components/LoadingScreen`): indicador central de tela
  cheia, só quando não há métrica para um `Skeleton`.

Uma tela nova, ou uma das que ainda não seguem o padrão (Busca e o painel
administrativo ainda usam `EmptyState` com "Tentar de novo"), fica assim:

```tsx
const { items, isLoading, error, reload } = useAlgumaLista();
// Antes de qualquer return: reconectou, refaz a carga que falhou.
const { isOffline } = useRetryOnReconnect(Boolean(error?.canRetry), reload);

if (isLoading) return <AlgumaListaSkeleton />;

if (error) {
  return (
    <View style={styles.screen}>
      <ErrorScreen
        {...loadErrorScreenProps(error, {
          onRetry: reload,
          onBack: router.back, // só para 404/410
          retryAccessibilityLabel: 'Tentar carregar a lista novamente',
        })}
      />
      {isOffline && <OfflineBanner />}
    </View>
  );
}

if (items.length === 0) return <EmptyState context="Search" />;

return (
  <View style={styles.screen}>
    <FlatList contentContainerStyle={isOffline && { paddingTop: spacing[64] }} /* ... */ />
    {isOffline && <OfflineBanner />}
  </View>
);
```

Ações de escrita (salvar, publicar, aprovar, remover, cancelar) recebem
`disabled={isOffline}`. Com conteúdo já na tela, a falha de uma atualização ou
da página seguinte vira toast, não `ErrorScreen`.

O GitLab é a origem do projeto neste primeiro momento. O espelho para o
GitHub será configurado depois que esta base for validada.

