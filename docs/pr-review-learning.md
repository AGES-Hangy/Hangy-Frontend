# Aprendizados das revisões do Hangy Frontend

Levantamento de 20/09/2026, feito pela API do GitHub a partir da
[listagem de PRs fechados](https://github.com/AGES-Hangy/Hangy-Frontend/pulls?q=is%3Apr+state%3Aclosed).

## Decisão

Usar os dois mecanismos, com responsabilidades distintas:

- [AGENTS.md](../AGENTS.md): regras curtas de implementação e revisão que acompanham o repositório.
- [revisar-pr-hangy](../.agents/skills/revisar-pr-hangy/SKILL.md): procedimento contextual de revisão, versionado em `.agents/skills/` junto do projeto.
- Este documento: rastreabilidade e ressalvas, consultadas quando relevantes, sem carregar o histórico inteiro em cada tarefa.
- [CLAUDE.md](../CLAUDE.md): encaminha às mesmas regras. A skill pessoal geral `revisar-pr-frontend` não foi alterada; os aprendizados específicos do Hangy não devem mudar outros projetos.

A skill do repositório pode ser invocada como `$revisar-pr-hangy` em ambientes que
carregam skills locais. O link explícito em AGENTS.md permite localizar o procedimento
mesmo quando o cliente não faz descoberta de skills. Não se presume que todo agente
ou integração do GitHub leia automaticamente esses arquivos.

## Cobertura e método

Foram consultados **39 PRs fechados: 36 merged e 3 sem merge (#24, #27 e #29)**.
A API retornou **15 comentários gerais, 61 submissões de review e 57 comentários
inline (incluindo respostas)**: 133 registros de discussão, não 133 problemas.
Reviews vazias, dispensadas e avisos de cota estão incluídos nesses totais.
Foram coletadas todas as páginas dos endpoints de PRs, issue comments, reviews,
review comments e arquivos alterados (`per_page=100`, com paginação).

A análise leu as discussões completas e usou descrições e patches como contexto,
com conferência direcionada na `develop` em
`aeff0ee` (base desta alteração). Não foi uma nova auditoria de funcionamento de
cada PR: nenhum teste histórico foi repetido, nem todos os vídeos/anexos foram
revalidados. A imagem que constitui o comentário do #24 foi aberta e conferida.
Não foram reconferidos todos os nós do Figma ou tarefas do ClickUp nesta coleta;
a fidelidade histórica mencionada abaixo é o relato das reviews, não uma nova
validação visual. Campos/permissões de API permanecem sujeitos ao backend vigente.

Cada categoria foi avaliada separadamente: comentário humano, comentário de bot,
descrição do autor, correção em patch e inferência preventiva. Aprovação/merge não
transforma toda sugestão em convenção, nem prova que uma hipótese foi reproduzida.
PRs agregadores de sprint não contam como ocorrências independentes do mesmo defeito.

## Regras e evidências

| Tema | Evidência específica | Regra extraída / limite |
| --- | --- | --- |
| Base e escopo | [#13: develop](https://github.com/AGES-Hangy/Hangy-Frontend/pull/13#issuecomment-5516996656), [#23: base e Teste](https://github.com/AGES-Hangy/Hangy-Frontend/pull/23#pullrequestreview-5122481793), [#29: reabertura](https://github.com/AGES-Hangy/Hangy-Frontend/pull/29#issuecomment-5624586901) | Features para develop; promoções #4/#39 para main são exceções legítimas. Não entregar Showcase ou entrada de teste. |
| Escopo compartilhado | [#9: token global](https://github.com/AGES-Hangy/Hangy-Frontend/pull/9#issuecomment-5470671566), [#18: workflow](https://github.com/AGES-Hangy/Hangy-Frontend/pull/18#discussion_r3910272883) | Explicar impacto em consumidores e excluir alterações alheias ao objetivo. |
| Tokens e ícones | [#15: radius](https://github.com/AGES-Hangy/Hangy-Frontend/pull/15#discussion_r3909878738), [#18: review](https://github.com/AGES-Hangy/Hangy-Frontend/pull/18#pullrequestreview-5085089475), [#31: padronização](https://github.com/AGES-Hangy/Hangy-Frontend/pull/31#pullrequestreview-5184717539) | Reutilizar DS; medidas sem token não justificam inventar um equivalente incorreto. |
| Variantes completas | [#11: contexto do header](https://github.com/AGES-Hangy/Hangy-Frontend/pull/11#issuecomment-5500890665), [#15: variantes ausentes](https://github.com/AGES-Hangy/Hangy-Frontend/pull/15#pullrequestreview-5084669328), [#20: AvatarGroup](https://github.com/AGES-Hangy/Hangy-Frontend/pull/20#issuecomment-5554479876) | Enumerar estados/ações e verificar uso real, não só existência do componente. |
| Fonte | [#13: Inter sem carregamento](https://github.com/AGES-Hangy/Hangy-Frontend/pull/13#discussion_r3973188549) | Um token de fontFamily não instala nem carrega a fonte; conferir o app atual. |
| Responsividade | [#14: width fixo](https://github.com/AGES-Hangy/Hangy-Frontend/pull/14#discussion_r3909786863), [#26: cálculo da grade](https://github.com/AGES-Hangy/Hangy-Frontend/pull/26#discussion_r3973829792), [#31: minHeight](https://github.com/AGES-Hangy/Hangy-Frontend/pull/31#pullrequestreview-5184717539) | Projetar pelo espaço disponível e conteúdo; 360/393 são casos úteis do histórico, não os únicos tamanhos aceitos. |
| Estado e acessibilidade | [#7: disabled/loading](https://github.com/AGES-Hangy/Hangy-Frontend/pull/7#pullrequestreview-5059492336), [#8: label/toque](https://github.com/AGES-Hangy/Hangy-Frontend/pull/8#pullrequestreview-5059553433), [#16: off versus disabled](https://github.com/AGES-Hangy/Hangy-Frontend/pull/16#pullrequestreview-5096039799), [#18: anúncios](https://github.com/AGES-Hangy/Hangy-Frontend/pull/18#discussion_r3910283671) | Estados visuais e interativos consistentes; nomes/papéis e toque conforme DS. A review #7 citada foi dispensada e complementada por nova aprovação. |
| Composição | [#15: botão aninhado](https://github.com/AGES-Hangy/Hangy-Frontend/pull/15#discussion_r3917578985), [#15: style](https://github.com/AGES-Hangy/Hangy-Frontend/pull/15#discussion_r3917591475), [#28: handlers](https://github.com/AGES-Hangy/Hangy-Frontend/pull/28#discussion_r3991760196) | Verificar DOM e propagação; preservar estilo e callbacks internos ao expor extensões. O nome Pressable sozinho não garante semântica válida. |
| Tipagem | [#7: ReactElement](https://github.com/AGES-Hangy/Hangy-Frontend/pull/7#pullrequestreview-5059574369), [#20: variantes válidas](https://github.com/AGES-Hangy/Hangy-Frontend/pull/20#pullrequestreview-5158474583) | Não enfraquecer unions fechadas com ReactNode; preservar contratos de variantes e defaults. |
| API e privacidade | [#19: default incorreto](https://github.com/AGES-Hangy/Hangy-Frontend/pull/19#discussion_r3950223766), [#38: descrição e patch](https://github.com/AGES-Hangy/Hangy-Frontend/pull/38) | Enums/dados da API como fonte de verdade; validar método, payload, paginação e papéis. #38 não tem comentários: é evidência de correção posterior. |
| Imagens e permissões | [#17: object URL](https://github.com/AGES-Hangy/Hangy-Frontend/pull/17#discussion_r3900061199), [#17: picker](https://github.com/AGES-Hangy/Hangy-Frontend/pull/17#discussion_r3906327564), [#17: microfone](https://github.com/AGES-Hangy/Hangy-Frontend/pull/17#discussion_r3941959672), [#26: recyclingKey](https://github.com/AGES-Hangy/Hangy-Frontend/pull/26#discussion_r3973829800), [#26: fallback](https://github.com/AGES-Hangy/Hangy-Frontend/pull/26#discussion_r3973829804) | Conferir ciclo de vida, identidade/falha da imagem e permissões reais. Inferência de MIME pelo URI não dispensa validação do arquivo no serviço de upload. |
| Formulário e navegação | [#28: tentativas/validação](https://github.com/AGES-Hangy/Hangy-Frontend/pull/28#discussion_r3991783415), [#35: correção posterior](https://github.com/AGES-Hangy/Hangy-Frontend/pull/35), [#38: onBack atualizado](https://github.com/AGES-Hangy/Hangy-Frontend/pull/38) | Testar repetição sem mudar campos, transições, reabertura e estado atual dos callbacks; não depender só de unmount de tabs. |
| Evidência e versões | [#6: descrição do dev server](https://github.com/AGES-Hangy/Hangy-Frontend/pull/6), [#24: erro de typecheck](https://github.com/AGES-Hangy/Hangy-Frontend/pull/24#issuecomment-5553817017), [#36: execução remota falhou](https://github.com/AGES-Hangy/Hangy-Frontend/pull/36#issuecomment-5656771640) | Export não substitui dev server; configuração depende da versão instalada; checks locais não provam backend/nativo/mirror. |

## O que não virou regra cega

1. **Scroll do #28:** a sugestão com `findNodeHandle` foi ajustada na resposta para
   `getInnerViewNode` e a correção #35 substituiu isso por ref de componente nativo
   para Fabric. O aprendizado é medir corretamente no conteúdo e validar na
   plataforma, não eternizar o snippet da primeira review.
2. **Upload do #28:** a review afirmou que `result.url` já era remota, mas a
   descrição final registra upload simulado devolvendo URI local. O nome do campo
   não comprova transferência. A resposta também esclareceu que Continuar já
   bloqueava upload em curso: cleanup é útil, mas aquele gatilho não era alcançável.
3. **Props do TextField no #28:** a resposta corrigiu a lista de props atribuída
   ao PR. A revisão deve comparar com a base e não repetir a lista inicial do reviewer.
4. **API de #32 → #38:** cancelamento passou de `POST` para `PATCH` com `reason`;
   participantes passaram a refletir paginação/papéis, sem `can_manage`. Esses são
   exemplos datados de correção, não substituem consultar o contrato atual.
5. **Rota inicial do #4:** a sugestão do bot de redirecionar para Home conflita com
   instruções posteriores no #23 e com `src/app/index.tsx` da develop consultada,
   que usa Login. Não foi convertida em regra de trocar a entrada para Home.
6. **Dúvidas de design:** selected/disabled no #14 e overlay/raio/ação da câmera no
   #26 requeriam confirmação. Medidas como raio do Avatar Store e largura do Dialog
   pertencem às variantes, não a todo componente do projeto.
7. **Sugestões estruturais:** mover AuthGuard e migrar armazenamento de token no
   #4 eram comentários de bot, não prova de convenção aprovada. Não foram impostas
   refatorações globais. Follow-ups de JSDoc, contador de avatares e restrição de
   style tampouco viraram bloqueadores universais.
8. **Mirror:** #36 demonstrou falha remota apesar de checks locais; #41 documentou
   uma resolução específica com force e merge commit. Não foi criada uma regra
   geral de force-push, retries ilimitados ou forma de merge obrigatória.
9. **Ferramentas:** ausência de testes/lint em reviews antigas não vale para sempre.
   A develop consultada tem typecheck, mas a branch local de integração já tem
   testes; as regras mandam consultar scripts no SHA efetivamente trabalhado.
10. **Aprovações e avisos:** aprovação sem texto, comentário de cota do Copilot e
    PR fechado sem discussão não sustentam novas regras. O #24 teve aprovação, mas
    ficou sem merge e sua imagem mostra erro TS5103; aprovação não prova check verde.

## Inventário completo

C = comentários gerais; R = submissões de review; I = comentários inline/respostas.
Os números incluem registros sem texto. Head abreviado identifica o snapshot
coletado, não o commit de merge nem um SHA testado nesta análise.

| PR | Estado | C/R/I | Head | Leitura / encaminhamento |
| --- | --- | --- | --- | --- |
| [#1 — docs: adiciona template de pull request](https://github.com/AGES-Hangy/Hangy-Frontend/pull/1) | Merged | 0/1/3 | `d570185b` | Remover seções redundantes do template; não recriar burocracia por padrão. |
| [#2 — Adicionando no README instruções para executar o projeto](https://github.com/AGES-Hangy/Hangy-Frontend/pull/2) | Merged | 0/2/1 | `48e21ec7` | Preferir scripts do projeto; sugestão do Copilot, não requisito independente de ferramenta. |
| [#3 — ci: add GitHub to GitLab mirror workflow](https://github.com/AGES-Hangy/Hangy-Frontend/pull/3) | Merged | 0/1/0 | `ffb2adb6` | Aprovação sem texto; workflow fornece contexto, não regra geral de force-push. |
| [#4 — Entrega da sprint 0](https://github.com/AGES-Hangy/Hangy-Frontend/pull/4) | Merged | 0/2/6 | `7ba65171` | Comentários do Copilot sobre arquitetura, documentação, localhost e storage; sugestões não equivalem a decisões do time. |
| [#5 — adiciona constantes de tipografia, raio, espaçamento e elevação](https://github.com/AGES-Hangy/Hangy-Frontend/pull/5) | Merged | 0/1/0 | `a25896ca` | Somente aviso de cota do Copilot; nenhuma conclusão técnica de review. |
| [#6 — Componente Icon — 39 ícones Lucide do Design System](https://github.com/AGES-Hangy/Hangy-Frontend/pull/6) | Merged | 0/1/0 | `8afbe203` | Acessibilidade de ícones decorativos; descrição explica por que export de produção ocultou warnings. |
| [#7 — Componente Button — 5 variantes, 3 tamanhos e 4 estados](https://github.com/AGES-Hangy/Hangy-Frontend/pull/7) | Merged | 0/2/0 | `e0afc215` | Disabled/loading efetivos, layout estável e IconName com ReactElement; texto antigo da descrição ainda menciona ReactNode. |
| [#8 — Componente IconButton — 4 variantes e 3 tamanhos](https://github.com/AGES-Hangy/Hangy-Frontend/pull/8) | Merged | 0/2/0 | `4cc017bc` | Rótulo obrigatório e alvo de toque; nit de tipo foi corrigido conforme review posterior. |
| [#9 — Componente TextField — 8 tipos e 6 estados](https://github.com/AGES-Hangy/Hangy-Frontend/pull/9) | Merged | 1/1/0 | `49897976` | Justificar alteração de token global e registrar dependência do Chip. |
| [#10 — Adiciona constantes de tipografia, raio, espaçamento e elevação](https://github.com/AGES-Hangy/Hangy-Frontend/pull/10) | Merged | 0/3/0 | `a64bdf8a` | Dois avisos de cota e aprovação vazia; não contam como análise técnica. |
| [#11 — Componente TopAppBar — 5 variantes, substituindo o Header](https://github.com/AGES-Hangy/Hangy-Frontend/pull/11) | Merged | 2/1/0 | `d26050b5` | Variantes/contexto do header, slot de ação, truncamento, safe area e nomes acessíveis; autor respondeu que corrigiu. |
| [#12 — Componente BottomNav — 4 abas, botão de criar evento e reestruturação das rotas](https://github.com/AGES-Hangy/Hangy-Frontend/pull/12) | Merged | 1/2/0 | `16e69530` | Alinhamento móvel e dependência do #11; review Web não valida nativo. |
| [#13 — feat (145 FE): SectionHeader component](https://github.com/AGES-Hangy/Hangy-Frontend/pull/13) | Merged | 2/2/1 | `b972eda3` | Base develop, draft para trabalho incompleto e não aplicar Inter sem carregamento. |
| [#14 — feat: componente  de tabs](https://github.com/AGES-Hangy/Hangy-Frontend/pull/14) | Merged | 0/3/2 | `5a992ec5` | Largura fluida; disabled na aba selecionada foi pergunta de design, não proibição universal. |
| [#15 — Tid148/componente chip](https://github.com/AGES-Hangy/Hangy-Frontend/pull/15) | Merged | 0/4/4 | `7d3c0ba5` | Variantes com remover/contador; botão aninhado e style sobrescrito; preservação de JSDoc/tipo foi nit não bloqueante. |
| [#16 — ParticipantLimit component](https://github.com/AGES-Hangy/Hangy-Frontend/pull/16) | Merged | 2/3/9 | `1e720d9d` | Off não é disabled; contador legível e cores conforme design. Valores específicos pertencem ao componente. |
| [#17 — Componente FileUpload — 4 estados](https://github.com/AGES-Hangy/Hangy-Frontend/pull/17) | Merged | 0/4/3 | `0afb5383` | Object URL, picker vazio/MIME ausente e permissão de microfone adicionada pelo plugin. |
| [#18 — feat: componente de toast](https://github.com/AGES-Hangy/Hangy-Frontend/pull/18) | Merged | 0/2/5 | `423fcd6d` | Tokens, Icon compartilhado, acessibilidade e remoção de workflow fora do escopo. |
| [#19 — Tid 144 161/badge event card components](https://github.com/AGES-Hangy/Hangy-Frontend/pull/19) | Merged | 2/3/1 | `4974bb79` | Enums reais e privacidade com fonte única; default estava anunciando evento privado como público. |
| [#20 — Tid149/componente avatar](https://github.com/AGES-Hangy/Hangy-Frontend/pull/20) | Merged | 1/2/2 | `9808e531` | AvatarGroup ausente, formato Store distinto de User; rótulo do contador foi follow-up. |
| [#21 — feat: componente de EmptyState com as 5 variações e os 6 estados necessários](https://github.com/AGES-Hangy/Hangy-Frontend/pull/21) | Merged | 0/1/0 | `519a3326` | Aprovação textual confirma variantes e CTA condicionado a label/handler; sem novo defeito relatado. |
| [#23 — feat: componente switch](https://github.com/AGES-Hangy/Hangy-Frontend/pull/23) | Merged | 1/3/3 | `e11c8502` | Base develop e retirada de rota Teste/redirecionamento; review posterior aprovou. |
| [#24 — Ignore deprecations](https://github.com/AGES-Hangy/Hangy-Frontend/pull/24) | Fechado sem merge | 1/1/0 | `bed6b839` | Fechado sem merge. Imagem do comentário mostra TS5103 com ignoreDeprecations="6.0"; conferir versão instalada. |
| [#25 — feat: criacao do componente de dialog com as tres variacoes de modal](https://github.com/AGES-Hangy/Hangy-Frontend/pull/25) | Merged | 0/1/0 | `c2e38553` | Aprovação textual do Dialog; largura 340 e demais medidas são contexto do componente, não regra global. |
| [#26 — feat: componente PhotoTile](https://github.com/AGES-Hangy/Hangy-Frontend/pull/26) | Merged | 0/2/8 | `1b5f0e02` | Grade responsiva, recyclingKey, fallback, nomes acessíveis, style; overlay/raio/câmera continham dúvidas de design. |
| [#27 — Tid092/tela criar evento etapa 1](https://github.com/AGES-Hangy/Hangy-Frontend/pull/27) | Fechado sem merge | 0/0/0 | `75e45539` | Fechado sem merge e sem discussões; não presumir motivo do fechamento. |
| [#28 — Criar evento — etapa 1](https://github.com/AGES-Hangy/Hangy-Frontend/pull/28) | Merged | 0/6/9 | `acdc7f0e` | Validação, lifecycle, scroll e documentação; respostas corrigem premissas do reviewer. Ver ressalvas acima. |
| [#29 — Tid112/tela home feed](https://github.com/AGES-Hangy/Hangy-Frontend/pull/29) | Fechado sem merge | 1/0/0 | `847f5874` | Fechado sem merge; autor declara base main por engano e reabertura para develop. |
| [#30 — feat: Home page (5 states)](https://github.com/AGES-Hangy/Hangy-Frontend/pull/30) | Merged | 0/0/0 | `a55af6a2` | Sem discussões. Descrição/arquivos dão contexto do feed; não atribuir findings inexistentes aos reviewers. |
| [#31 — fix: alinha o EventCard ao Figma (todas as variantes)](https://github.com/AGES-Hangy/Hangy-Frontend/pull/31) | Merged | 0/1/0 | `58937df1` | Review confirma Icon centralizado, formato de data, minHeight e props opcionais retrocompatíveis. |
| [#32 — feat: tela de detalhe e gestão do evento](https://github.com/AGES-Hangy/Hangy-Frontend/pull/32) | Merged | 0/1/0 | `b6be8d30` | Aprovação delegada textual sem findings; contrato descrito foi ajustado posteriormente no #38. |
| [#33 — tid094/tela-criar-evento-etapa-2](https://github.com/AGES-Hangy/Hangy-Frontend/pull/33) | Merged | 0/0/0 | `2280e80f` | Sem discussões; descrição registra integração entre etapas e remoção de duplicatas. |
| [#34 — Tid102/tela evento publicado](https://github.com/AGES-Hangy/Hangy-Frontend/pull/34) | Merged | 0/1/0 | `11fd48b6` | Aprovação vazia; descrição registra fluxo publicado/share e contém afirmações divergentes sobre evidência anexada. |
| [#35 — fix(create-event): scroll-to-error na Fabric e reset do formulário ao sair](https://github.com/AGES-Hangy/Hangy-Frontend/pull/35) | Merged | 0/1/0 | `b0df9958` | Aprovação vazia; descrição e patch documentam correção Fabric e reset ao sair de tab persistente. |
| [#36 — ci: restore GitLab mirror on develop without force push](https://github.com/AGES-Hangy/Hangy-Frontend/pull/36) | Merged | 1/0/0 | `3eff295e` | Comentário distingue checks locais aprovados de execução remota falha (HTTP 524). |
| [#37 — Tid115/tela home pull to refresh](https://github.com/AGES-Hangy/Hangy-Frontend/pull/37) | Merged | 0/1/0 | `0edcc0bc` | Aprovação vazia; descrição registra refresh silencioso e descarte de respostas antigas. |
| [#38 — fix: alinha participantes e cancelamento de evento ao contrato real da API](https://github.com/AGES-Hangy/Hangy-Frontend/pull/38) | Merged | 0/0/0 | `cc989a82` | Sem discussões; descrição e patches documentam correção de contrato, callbacks e detalhes nativos. |
| [#39 — Sprint 1](https://github.com/AGES-Hangy/Hangy-Frontend/pull/39) | Merged | 0/0/0 | `aeff0eef` | Promoção Sprint 1 para main, sem descrição/discussões; não contar o agregado como novas ocorrências. |
| [#41 — merge: resolve conflicts for Sprint 1 PR](https://github.com/AGES-Hangy/Hangy-Frontend/pull/41) | Merged | 0/0/0 | `49c19715` | Sem discussões; descrição registra merge específico e parentesco necessário para resolver #39, não norma universal. |

## Como atualizar este aprendizado

Quando solicitado a incorporar novas reviews:

1. Atualize a listagem completa de fechados e as três categorias de discussão,
   inclusive PRs já vistos que ganharam comentários. Use paginação e preserve links,
   datas e SHAs; não dependa só do número do último PR.
2. Leia o encadeamento: problema relatado → resposta → mudança → review posterior.
   Para algo contraditório, consulte patch/código e a fonte atual de design/API.
3. Classifique como regra durável, exemplo específico, dúvida, sugestão não
   bloqueante ou orientação superada. Um defeito concreto pode justificar prevenção;
   não exija repetição artificial, mas não generalize preferências isoladas.
4. Edite a menor regra já existente no AGENTS.md. Procedimentos de revisão ficam na
   skill; detalhes e fontes ficam aqui. Atualize o bridge do CLAUDE.md apenas se
   os caminhos mudarem. Não copie o corpus inteiro para instruções permanentes.
5. Valide links locais, frontmatter da skill e diff. Confira cenários em que a
   regra não deve bloquear (promoção para main, medida sem token, teste só Web,
   dúvida de design, comentário corrigido). Mudanças externas seguem a autorização
   do usuário; este procedimento não agenda monitoramento nem publica reviews.
