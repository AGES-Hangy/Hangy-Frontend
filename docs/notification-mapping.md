# Tipos de notificação — task 132

Escopo desta entrega: **somente mapeamento na develop**, conforme decisão do
João. Não altera a central nem incorpora a branch da task 130. Não consome API,
marca leitura, dispara notificações ou executa decisões de aceitar/recusar.

Referências:

- [Task 132](https://app.clickup.com/t/90171450474/86e2v0vgm)
- [US6.2](https://app.clickup.com/t/90171450474/86e2v0uxb)
- Backend `develop` em `e29412e`: `NotificationTypeEnum`,
  `NotificationItemResponse` e `_build_payload` em
  `app/infrastructure/repository/notification.py`.

## Contrato

`getNotificationPresentation(notification)` recebe `type` e `payload` do
`GET /notifications` e retorna `icon`, `title`, `requiresAction` e `navigation`.
O envelope completo está em `src/types/notification.ts`. O tipo recebido é
`string` deliberadamente: um backend mais novo não deve derrubar o aplicativo.

O backend devolve `event_id`, `event_title` e/ou `sender: { id, name }` no
payload. Conexões também têm `connection_id`; ele **não** é o ID do usuário.
Notificações de participação usam `event_id`, nunca o ID da notificação ou da
participação para abrir o evento. Payload vazio é um caso previsto pelo backend.

| Tipo | Ícone do DS | Destino |
| --- | --- | --- |
| `CONNECTION_REQUEST` | `users` | Solicitações de conexão; depende da 130 |
| `CONNECTION_ACCEPTED` | `circle-check` | `/Profile`, `userId = sender.id`, `name = sender.name` |
| `EVENT_PARTICIPATION_REQUEST` | `users` | `/ManageEvent`, `id = event_id` |
| `EVENT_REQUEST_APPROVED` | `circle-check` | `/EventDetail`, `id = event_id` |
| `EVENT_REQUEST_REJECTED` | `circle-alert` | `/EventDetail`, `id = event_id` |
| `EVENT_PARTICIPANT_CANCELLED` | `calendar-x` | `/ManageEvent`, `id = event_id` |
| `EVENT_PARTICIPANT_REMOVED` | `circle-alert` | `/EventDetail`, `id = event_id` |
| `EVENT_PARTICIPANT_JOINED` | `users` | `/ManageEvent`, `id = event_id` |
| `EVENT_UPDATED` | `pencil` | `/EventDetail`, `id = event_id` |
| `EVENT_CANCELLED` | `calendar-x` | `/EventDetail`, `id = event_id` |
| `EVENT_STARTING_SOON` | `clock` | `/EventDetail`, `id = event_id` |
| Desconhecido (inclui legado `EVENT_INVITE`) | `bell` | Sem navegação |

Somente as duas solicitações têm `requiresAction: true`. A solicitação de evento
leva à gestão, onde o organizador já pode aprovar/recusar. O destino continua
sujeito às permissões e à disponibilidade do evento verificadas pela tela/API.

## Integração posterior com a central

- `navigation.kind === 'route'`: passe `navigation.href` ao `router.push`.
- `pending-screen`: a rota `/Notifications/ConnectionRequests` existe na branch
  `tid130/tela-notificacoes`, mas não na develop desta entrega. Não há `href`
  acionável. Quando a 130 entrar, atualize o destino para `route` e teste o fluxo.
- `unavailable`: renderize o conteúdo sem ação de navegação. Pode indicar tipo
  desconhecido ou ID ausente; não encaminhe para o perfil próprio por engano.

Os ícones pertencem à união `IconName` existente; sua associação semântica está
centralizada em `NOTIFICATION_DEFINITIONS`. Não foi feita validação visual contra
o Figma, nem alteração de componente. A central deverá consumir esses ícones e
textos junto aos tokens e componentes existentes. O backend não informa qual
campo do evento mudou nem um horário para o lembrete; os textos não inventam esses
detalhes. Não há tipo específico para conexão recusada ou convite no app.

## Verificação

```sh
npm run typecheck
node --test tests/notifications.test.cjs
```

Os testes executam os módulos puros reais com TypeScript já instalado no projeto;
não precisam iniciar Expo nem adicionam biblioteca de testes. Cobrem os 11 tipos,
destinos/IDs, dependência da 130, payloads incompletos, tipos futuros e proteção
contra chaves herdadas do objeto. Não são testes HTTP, visuais ou de Expo Go.
