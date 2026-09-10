# Checklist de qualidade da especificação: Épico 4, fatia (a) — Tokens, tema e configuração base

**Propósito**: validar a completude e a qualidade da especificação antes de planejar
**Criado**: 09/09/2026
**Feature**: [spec.md](../spec.md)

## Qualidade do conteúdo

- [x] Sem detalhe de implementação (linguagem, framework, biblioteca)
- [x] Focado em valor para o usuário e necessidade de negócio
- [x] Escrito para quem decide, não só para quem implementa
- [x] Todas as seções obrigatórias preenchidas

## Completude dos requisitos

- [x] **Nenhum marcador `[NEEDS CLARIFICATION]` remanescente** — as três foram fechadas por Bernardo em 09/09/2026
- [x] Requisitos testáveis e sem ambiguidade
- [x] Critérios de sucesso mensuráveis
- [x] Critérios de sucesso independentes de tecnologia
- [x] Todos os cenários de aceitação definidos
- [x] Casos de fronteira identificados
- [x] Escopo delimitado — inclui *Fora de escopo* com o motivo de cada exclusão, e *Fatias seguintes*
- [x] Dependências e premissas identificadas

## Prontidão da feature

- [x] Todo requisito funcional tem critério de aceite claro
- [x] Os cenários de usuário cobrem os percursos principais
- [x] A feature atende aos resultados mensuráveis dos Critérios de Sucesso
- [x] Nenhum detalhe de implementação vaza para a especificação

## Notas

- **As três perguntas foram fechadas em 09/09/2026**, e duas delas encolheram a fatia: a marca
  institucional saiu para a (c), e das nove pendências de estilo apenas quatro são pagas aqui. A
  fatia (a) ficou **puramente vocabulário, tema e tipografia**.
- ✅ **A dependência de ativo já está resolvida, não só decidida.** Os quatro arquivos da Rawline
  foram baixados, conferidos pela assinatura `wOF2` e versionados com o texto da licença OFL-1.1.
  A spec registra a procedência, incluindo o fato de que a origem oficial do gov.br não publica os
  arquivos e o empacotamento veio de terceiro.
- **Três esclarecimentos integrados em 09/09/2026** (`/speckit-clarify`), e os três **acrescentaram
  requisito** em vez de só desambiguar: a rota de vitrine, sem a qual a história 2 não teria onde
  ser exercitada; a proibição da paleta padrão além da cor literal, que trouxe um quinto arquivo
  que nenhuma lista contava; e a reconciliação das variáveis dos componentes base com os tokens,
  que é o trabalho real escondido atrás de "copiar componente".
- **Um critério estava confundindo duas coisas e foi separado.** O `SC-007` media "arquivos com cor
  fora do vocabulário" e somava peras com maçãs: quatro arquivos com cor divergente mais cinco
  telas que simplesmente ainda não usam o vocabulário. Medido: as cinco telas **não violam** o
  `FR-001`, porque não usam cor nenhuma. A verificação pode nascer bloqueante com elas intactas.
- **Uma tensão registrada, não resolvida.** O gabarito pede critérios de sucesso *independentes de
  tecnologia*, e o projeto acabou de decidir o contrário para requisito de segurança: o `FR-006` da
  spec 004 foi reescrito em 09/09/2026 **justamente para nomear o mecanismo que o impõe**, porque a
  redação agnóstica deixou o mínimo de senha viver só no navegador. Nesta spec os critérios
  descrevem **efeito observável** e os requisitos descrevem **onde a garantia vive**, sem nomear
  ferramenta. É a conciliação possível; se o projeto quiser a regra do `CHK001` valendo para todo
  requisito, e não só para os de segurança, isso é emenda ao gabarito e é decisão de Bernardo.
- **Quatro regras do documento 06 foram listadas como estranhas e não corrigidas**, conforme a
  regra 1 do `CLAUDE.md`. Três são critérios de aceite que pertencem às fatias (b) e (c) e não
  podem ser cobrados aqui; a quarta é um requisito que trocou de natureza sem trocar de
  identificador. Ver a última seção da spec.
