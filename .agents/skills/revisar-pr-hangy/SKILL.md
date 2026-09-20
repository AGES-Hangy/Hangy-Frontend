---
name: revisar-pr-hangy
description: Revisar PRs do AGES-Hangy/Hangy-Frontend com base no diff, nos comentários anteriores, no Design System, nos contratos da API e em evidências de execução. Use ao pedir revisão ou re-revisão de um PR deste frontend.
---

# Revisar PR do Hangy

Leia o [AGENTS.md](../../../AGENTS.md) da raiz. Ele contém as regras do projeto;
esta skill organiza a revisão sem duplicá-las. Consulte o
[histórico comentado](../../../docs/pr-review-learning.md) apenas nos temas do diff.
Se a skill geral `revisar-pr-frontend` estiver disponível, ela complementa a
execução visual; esta skill também funciona sem ela.

## Fixar o alvo e entender as discussões

1. Registre repositório, número, base, head SHA, estado e dependências. Leia descrição, arquivos alterados, comentários gerais, reviews e comentários inline, incluindo respostas e reviews dispensadas. Paginação incompleta deve aparecer como limitação.
2. Para PR empilhado, distinga mudanças da dependência e mudanças próprias. Features normalmente miram `develop`; uma promoção de sprint para `main` é legítima. Não altere a base durante uma revisão.
3. Relacione cada cobrança anterior ao código atual: corrigida, ainda reproduzível, superada ou dependente de decisão. Confirme o caminho de reprodução: no #28, a resposta do autor mostrou que um cenário de avanço durante upload estava bloqueado pela UI.
4. Leia o diff e os consumidores relevantes; não trate descrição, aprovação anterior, texto de bot ou snippets de review como especificação executável. Preserve o checkout do usuário e use worktree isolado quando precisar executar outro SHA.

## Escolher verificações pelo risco do diff

| Mudança | Verificação direcionada |
| --- | --- |
| Componente visual | Variantes/estados no Figma, tokens, fonte carregada, largura móvel estreita e de referência, texto longo e consumidor real. Use Showcase temporário só para variantes inacessíveis. |
| Controle interativo | Disabled/loading bloqueiam toque; nomes e estados acessíveis; alvo de toque; remover não aciona o pai; DOM Web sem botões aninhados. |
| Formulário/wizard | Blur, primeira e segunda submissão inválida, scroll já deslocado, voltar mantendo dados, descarte, reabertura limpa, envio em curso e callbacks lendo estado atual. |
| API/feed/gestão | Método/payload/enums/nullable/paginação do backend vigente; papel do viewer; loading/vazio/erro; resposta tardia; falha de mutação e atualização dos consumidores. Mock não valida contrato sozinho. |
| Foto/upload | Resultado vazio/cancelado, falha e troca de URI, limpeza de recursos, imagem reciclada, permissão nativa gerada e distinção entre preview local e upload. |
| Token/prop compartilhado | Motivo explícito, consumidores afetados, compatibilidade dos defaults e composição de handlers/estilos. |
| Configuração/documentação/CI | Scripts e versões do commit, links e instruções coerentes. Para mirror, check local não prova sincronização remota: confira execução e SHAs se isso fizer parte da revisão. |

Use só as linhas aplicáveis. Não refatore o projeto nem amplie o PR para resolver
dívida anterior. Contradição relevante de design/API deve ser apresentada com
suas fontes, não resolvida por palpite.

## Executar e preservar a validade da evidência

- Leia `package.json`, instale conforme o lockfile e rode `typecheck` e os checks existentes pertinentes. Rode `git diff --check`. Não invente scripts de teste/lint nem atualize dependências para fazer a revisão passar.
- Para UI, inicie o servidor de desenvolvimento numa porta livre e teste a entrada real, a ação principal, retorno/fechar e estados afetados. Confira console e acessibilidade observável. Export/build sozinho não basta para validar interação.
- Se necessário, use mocks/Showcase descartáveis no ambiente isolado e identifique o alcance exato da evidência. Remova esses artefatos, bypasses de auth e mudanças de redirecionamento antes de concluir. Não limpe arquivos preexistentes do usuário.
- Separe Web, Android e iOS. Problemas de Fabric, recorte de texto, permissões, safe area e share nativo exigem evidência na plataforma relevante; se indisponível, registre o teste faltante e seu impacto.
- Antes de concluir ou publicar uma review autorizada, releia o head SHA. Se mudou, avalie o delta e repita os checks afetados ou declare que a conclusão vale apenas para o SHA anterior.

## Entregar a decisão

Priorize findings acionáveis, com arquivo/linha do diff, condição que dispara,
efeito para o usuário e evidência. Distinga bug bloqueante, melhoria não bloqueante,
dúvida de produto/design e limitação da validação. Evite comentários de aprovação
por arquivo e recomendações genéricas sem relação com a mudança.

Apresente decisão recomendada, SHA revisado, checks/fluxos de fato executados,
findings e pendências. Sem bugs identificados não significa plataformas não
testadas aprovadas. Revisar não autoriza publicar comentários, aprovar ou fazer
merge; siga a autorização explícita existente e confira o resultado após a ação.

## Quando a tarefa incluir aprender com novos PRs

Colete também PRs fechados sem merge e as três categorias de discussão, com todas
as páginas. Distinga comentários de descrições e patches. Uma aprovação vazia não
gera regra; uma falha concreta pode justificar uma regra mesmo sem repetição.
Cheque respostas corretivas e PRs posteriores antes de promovê-la. Atualize a
regra existente e o registro de fontes, mantendo exceções e removendo orientação
superada. Não acrescente checklists por quantidade nem automatize decisões de design.
