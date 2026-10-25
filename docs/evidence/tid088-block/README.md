# Bloqueio — Web com API real local

25/10/2026: frontend desta branch + backend correspondente, FastAPI/SQLAlchemy
com SQLite local exclusivo. Sem mocks de rota, credenciais ou contas reais.

- `01-before.png`: Ana tem três avisos: conexão de Carla, conexão de Bruno e
  presença de Bruno em seu evento.
- `02-confirmation.png`: perfil aberto pelo aviso de conexão → confirmação de
  bloqueio explica retirada dos eventos e remoção de notificações.
- `03-after.png`: após POST 204 e retorno, apenas Carla permanece; nenhuma
  recarga manual entre bloquear e retornar à lista.
- `04-badge.png`: Home mantém um aviso não lido (o valor 1 foi conferido pelo
  nome acessível do botão; visualmente o componente usa um ponto).

O backend conferiu também retirada das participações cruzadas, proibição de nova
entrada e inscrição explícita após desbloqueio. Evidências HTTP no PR do backend.
Os prints representam Web desktop; **Android e iOS físicos não foram testados**.
Não foi feita mudança de layout nem certificação de correspondência com Figma.

## Atualização de dados

204/409 de bloquear e 204/404 de desbloquear invalidam notificações, detalhe,
listas de eventos e participantes. Lista/cursor/contador antigos são descartados
antes da recarga, mesmo offline. Respostas e rollbacks anteriores à invalidação
não podem recolocar dados. A retomada do app também recarrega essas informações,
para refletir bloqueios realizados pela outra conta. Não há sincronização em
tempo real para duas contas que permanecem continuamente abertas em primeiro plano.

## Checks e roteiro

`npm run typecheck`, `npm test` (32 testes, incluindo quatro regressões de bloqueio),
`git diff --check`; fluxo Web com login real e sem erros no console consultado.
As regressões controlam promessas HTTP dos hooks reais em host mínimo de hooks;
não substituem React nativo nem teste físico.

1. Em ambiente descartável, criar A/B/C, conectar A com B/C e gerar avisos.
2. A abre notificações → perfil de B → bloquear → confirmar.
3. Conferir que B desaparece e C permanece; voltar à Home e conferir contador.
4. Abrir detalhe/participantes/lista de eventos já visitados; verificar recarga.
5. Na outra conta, retomar app e verificar remoção; links antigos não permitem
   inscrição. Desbloquear não restaura nada; uma nova inscrição é permitida.
6. Simular resposta atrasada de lista/paginação e falha de leitura em voo durante
   o bloqueio: nenhum card/contador antigo pode voltar. Offline deve exibir erro
   de carga sem conservar os avisos removidos.

A semântica completa depende do PR de backend vinculado. Só atualizar o frontend
não remove notificações persistidas nem impede ingresso por HTTP.
