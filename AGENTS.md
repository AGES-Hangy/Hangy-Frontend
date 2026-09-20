# Instruções para agentes — Hangy Frontend

Estas regras valem para este repositório. Antes de implementar ou revisar, leia os
arquivos afetados e as instruções mais específicas que existirem. A origem e as
ressalvas das regras estão em [aprendizados dos PRs](docs/pr-review-learning.md).
Para revisão de PR, use a [skill revisar-pr-hangy](.agents/skills/revisar-pr-hangy/SKILL.md).

## Contexto e comandos

- React Native + Expo + Expo Router + TypeScript; código em `src/`, assets em `assets/` e alias `@/*` para `src/*`.
- Consulte `package.json` no commit trabalhado antes de escolher checks. Use os scripts existentes, como `npm run typecheck`, `npm start` e `npm run web`. Testes e lint só quando configurados; ausência de script não significa teste aprovado nem falho.
- `npm run start:stub`, quando disponível, liga mocks de desenvolvimento. Informe esse uso; mock ou export Web não comprova integração HTTP nem funcionamento nativo.
- Mudanças de feature/correção normalmente têm base `develop`. Promoções de sprint para `main` e PRs empilhados são exceções: confirme finalidade e dependências antes de tratar a base como erro. Preserve a branch e as alterações locais do usuário.

## Escopo e estrutura

- Mantenha componentes compartilhados em `src/components/Nome/index.tsx`, com export nomeado e `types.ts` quando houver tipos separados. Telas usam pasta PascalCase e export default.
- `src/app/` contém rotas/layouts. Helpers, tipos, hooks, componentes internos de wizard e testes ficam fora dali; o Expo Router pode interpretá-los como rotas.
- Confira `_layout.tsx`, `useTopAppBar`, `BottomNav` e `noNavbarScreens.ts` antes de alterar navegação. Preserve histórico de voltar, entrada do app e comportamento de fechar/retornar. Não transforme uma tela interna em nova aba sem requisito.
- Showcases, telas `Teste`/`Sample`, dados de demonstração e desvios de autenticação usados no QA são temporários. Não inclua esses artefatos nem redirecione a entrada do produto para eles na entrega.
- Não misture alterações no mirror/CI, dependências ou configuração global com um componente sem relação demonstrável. Explique mudanças em tokens, props e outros contratos compartilhados e confira seus consumidores.

## Design System e comportamento

- Reutilize `colors`/`palette`, `typography`, `spacing`, `radius` e `elevation` em `src/constants/`; prefira token semântico existente. Use `Icon`/`IconButton` do projeto em vez de recriar ícones ou importar outro conjunto no consumidor. Medidas específicas sem token equivalente precisam de justificativa; não invente token só para eliminar um número.
- Compare variantes, tamanhos, estados e ações opcionais com a task e o nó correto do Figma. Se texto e frame divergirem, registre a diferença e a decisão pendente; não invente uma especificação. Não aplique `fontFamily.base` antes de verificar que a fonte está carregada no app.
- Larguras do frame não são automaticamente larguras fixas. Faça grades caberem no espaço disponível, considerando colunas, gaps e margens. Verifique telas estreitas, títulos longos, tags em várias linhas, fonte ampliada e safe areas. Use altura flexível quando o conteúdo exigir.
- `disabled`, `selected`, `off` e `loading` são estados diferentes. Desabilitado/loading deve bloquear a ação de fato; desligado ou não selecionado não implica indisponível. Loading não deve causar salto de layout.
- Preserve a tipagem de nomes de ícones (`IconName`); uma união com `ReactNode` pode aceitar qualquer string e anular essa proteção. Modele combinações de variantes válidas. Ao repassar props, componha callbacks e estilos explicitamente para não sobrescrever comportamento interno sem intenção.

## Acessibilidade e interação

- Controles sem texto precisam de nome acessível específico; exponha papel e estados corretos. Preserve os alvos de toque de pelo menos 44 unidades lógicas adotados no DS, usando `hitSlop` quando necessário.
- Ícones decorativos não devem gerar anúncios duplicados. Grupos e galerias precisam de rótulos distinguíveis; placeholder não deve anunciar uma foto existente. Erros/toasts devem ser anunciados quando aplicável.
- Ações independentes, como remover uma foto/chip e abrir seu container, não devem produzir botões HTML aninhados. Prefira alvos irmãos e confira o DOM/comportamento Web; trocar `TouchableOpacity` por `Pressable` sozinho não garante a correção.

## Dados, formulários e ciclo de vida

- Confira método, payload, enums, campos opcionais, paginação e permissões no contrato vigente da API. Mocks e descrições antigas de PR são evidência auxiliar. Preserve a fonte de verdade do evento: um default visual não pode transformar `PRIVATE` em `PUBLIC`.
- Diferencie URI local de imagem, preview e upload confirmado. Para pickers/imagens, trate cancelamento, resultado vazio e falha de carregamento; libere object URLs/recursos ao substituir ou desmontar. Em listas recicladas, confira identidade da imagem e reset do fallback quando a URI mudar.
- Revise permissões nativas adicionadas por plugins; seleção de fotos não justifica adicionar microfone por padrão.
- Em operações assíncronas, trate saída da tela, respostas atrasadas e estado atual dos callbacks. Em formulários por etapas, preserve os dados ao voltar e resete estado/erros no momento previsto ao descartar ou concluir — trocar de aba pode não desmontar a tela.
- Validação deve reagir também à segunda tentativa sem mudança de campos. Para scroll até erro, confira medição após alterações de layout e com a página já rolada. No fluxo atual, preserve refs nativas do container compatíveis com Fabric; não copie `findNodeHandle`/`getInnerViewNode` de reviews antigas sem validar a plataforma.

## Evidência e aprendizado

- Valide a mudança no fluxo real e, para UI, no servidor de desenvolvimento: export de produção pode ocultar warnings. Rode checks proporcionais ao diff; documentação pura não exige iniciar o app.
- Siga o template do PR com evidência reproduzível. Separe checks executados, declaração do autor, teste com mock, Web, Android, iOS e pendências. Uma aprovação histórica não comprova que todas as plataformas foram testadas.
- Revise a cronologia de comentários e respostas: confirme cenário alcançável e diff antes de repetir um finding. Sugestão, hipótese, nit e decisão de design não viram bloqueadores automaticamente.
- Ao incorporar feedback novo, atualize a menor regra aplicável e acrescente fonte/contexto em `docs/pr-review-learning.md`. Substitua regras superadas; não acumule instruções duplicadas nem copie snippets históricos cegamente. Atualizar estas instruções não faz parte de toda review: faça isso quando a tarefa incluir aprendizado/manutenção das regras.
