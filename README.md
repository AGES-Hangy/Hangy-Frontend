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

O código fica em `src/`; imagens, fontes e outros arquivos estáticos ficam em
`assets/`, na raiz.

- `src/app/`: rotas do app, gerenciadas pelo [Expo Router](https://docs.expo.dev/router/introduction/).
- `src/components/`: componentes de UI reutilizáveis entre telas (um
  componente por pasta, com `index.tsx`).
- `src/constants/`: valores fixos compartilhados, como `colors.ts`.
- `src/hooks/`: hooks React reutilizáveis (ex.: chamadas de API, lógica de
  formulário).
- `src/utils/`: funções utilitárias e integração de sessão e notificações.
- `src/types/`: contratos e tipos compartilhados.
- `src/mocks/`: respostas usadas pelo modo `start:stub`.
- `tests/`: testes executados por `npm test`.
- `app.json`: configuração do projeto Expo.
- `package.json`: dependências e scripts.

O alias de import `@/*` aponta para `src/*` (configurado em
`tsconfig.json`), então prefira `import { colors } from '@/constants/colors'`
em vez de caminhos relativos longos.

## Navegação

Cada tela tem uma pasta PascalCase e um `index.tsx` com export default.
Helpers, hooks e componentes internos ficam fora de `src/app/`, para não
virarem rotas. Os nomes de grupos entre parênteses não aparecem na URL.

A rota raiz redireciona para `/Splash`. A Splash verifica a sessão e consulta
`GET /users/me`: administradores seguem para `/Admin/Painel`, os demais para
`/Home`. Sem sessão, o destino é `/Login`.

As quatro abas são `Home`, `Live`, `Search` e `Profile`, dentro de
`src/app/(tabs)/`. A `BottomNav` mostra os rótulos acessíveis em português.
O botão central abre `/CreateEvent`.

Telas abertas a partir das abas ficam em
`src/app/(tabs)/(screens)/NomeDaTela/index.tsx`. Registre cada rota em
`(tabs)/_layout.tsx` com `Tabs.Screen`. Essas telas usam a variante `Limpo`
da barra, sem aba selecionada. Para ocultar a barra, acrescente o nome da
tela a `src/constants/noNavbarScreens.ts`.

Login, cadastro, recuperação de senha, Splash e a área Admin ficam fora do
grupo `(tabs)`. A área Admin usa `AdminGuard` e `AdminNav`.

O cabeçalho das abas vem de `TopAppBarSlot`. Cada tela pode configurá-lo com
`useTopAppBar({ variant, title })` ou ocultá-lo com `useTopAppBar(null)`.
Mantenha `backBehavior="history"` para que voltar respeite o histórico de
navegação.

As regras de implementação e revisão estão em [AGENTS.md](AGENTS.md).
O workflow [Mirror to AGES GitLab](.github/workflows/mirror-to-gitlab.yml)
está configurado para espelhar `main`, `develop` e tags do GitHub no GitLab.

