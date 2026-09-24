# Checklist de qualidade da especificação: Épico 5, fatia (a) — Cursos e turmas

**Propósito**: validar a completude e a qualidade da especificação antes de planejar
**Criado**: 16/09/2026
**Feature**: [spec.md](../spec.md)

## Qualidade do conteúdo

- [X] Sem detalhe de implementação (linguagem, framework, biblioteca) — os nomes de tabela, view,
      componente e rota aparecem **como fatos medidos e como restrição de plataforma** (critério 9
      do pedido), não como desenho; o *como* fica para o plano.
      **Fechado em 23/09/2026** (T208): a implementação do PR 2 inteiro coube no plano sem emendar
      nenhum `FR-` por motivo de plataforma — as duas emendas que houve (`FR-031.1`, e a rota de
      edição atendendo `horarios.criar`) vieram de **restrição medida** e de **decisão de Bernardo**,
      e estão datadas no texto
- [x] Focado em valor para o usuário e necessidade de negócio
- [x] Escrito para quem decide, não só para quem implementa — cada ponto em aberto traz o que os
      documentos e o código real dizem, para a pergunta ser feita com contexto
- [x] Todas as seções obrigatórias preenchidas

## Completude dos requisitos

- [x] Nenhum marcador literal `[NEEDS CLARIFICATION]` no texto — **mas isto não significa que não há
      o que esclarecer**: por instrução expressa de 16/09/2026, os **29 pontos em aberto** (Q-01 a
      Q-29) e a tensão **T-1** foram reunidos numa seção única, enumerada, para o `/speckit-clarify`
      percorrer item a item, em vez de espalhados como marcadores. Os requisitos que dependem de
      resposta apontam a pergunta (`→ Q-nn`) em vez de fixar um valor
- [X] Requisitos testáveis e sem ambiguidade — era **parcial, de propósito**, enquanto havia
      pergunta aberta. **Fechado em 23/09/2026** (T208), com a medição: a spec tem **14** ponteiros
      `→ Q-nn` e **os 14 estão riscados** — nenhum `→ Q-nn` em aberto sobrou. Nenhum foi fechado por
      suposição: cada um traz a decisão datada de Bernardo
- [x] Critérios de sucesso mensuráveis — contagens exatas (24 cursos, 5 grupos, 28 de 28 rótulos,
      um construtor de seletor, zero cores literais, zero campos de carga digitáveis)
- [X] Critérios de sucesso independentes de tecnologia — **medido em 23/09/2026** (T208) sobre os
      **41** `SC-` da spec: **2** citam tecnologia, e as duas citam **pgTAP**, que é o instrumento da
      prova (*"asserção pgTAP nomeada"*), não a plataforma do produto. ⚠️ **A exceção fica escrita em
      vez de marcada em silêncio**: quem reler sabe exatamente o que passou e por quê
- [x] Todos os cenários de aceitação definidos — os que dependem de decisão dizem *"a regra decidida
      em Q-nn"* em vez de inventar a regra
- [x] Casos de fronteira identificados — a partir do **dado real** (turma sem datas, sem rótulo,
      curso sem turma, EAD com regime zero, duração nula em 12 de 24)
- [x] Escopo delimitado — *Conferência do escopo item a item*, *Fora de escopo*, e a fatia (b)
      explicitamente não tocada
- [x] Dependências e premissas identificadas — inclusive a **T-1**, que decide se a US6 fica

## Prontidão da feature

- [X] Todo requisito funcional tem critério de aceite claro — era **parcial** enquanto havia
      `→ Q-nn` aberto. **Fechado em 23/09/2026** (T208), pela mesma medição do item acima, e pela
      implementação: os `FR-` desta fatia têm caso de teste nomeado em `tasks.md`, e **212 de 215**
      tarefas estão feitas. As 3 que faltam são o PR e a conferência de Bernardo
- [x] Os cenários de usuário cobrem os percursos principais — catálogo, página do curso, seletor,
      cadastro de curso, cadastro de turma, regime com vigência (condicionado), menu
- [x] A feature atende aos resultados mensuráveis dos Critérios de Sucesso
- [x] Nenhum detalhe de implementação vaza para a especificação além do que o pedido exigiu registrar

## Notas

- ⚠️ **A spec está deliberadamente incompleta, e isso é o resultado certo.** Cursos e turmas
  **não têm spec de herança**: a v1.0 tinha um formulário genérico de curso só para Admin e nenhum
  de turma; a **v2.0 em produção não tem caminho de escrita** de curso, turma ou regime pela
  aplicação (o `CRUD_CONFIG` não os lista; quem cadastra, cadastra na planilha). O "cadastro
  completo" desta fatia é a **primeira tela de escrita** que essas entidades terão — e todo campo,
  regra e transição que os documentos não fixam está na seção *Pontos em aberto*, não inventado.
- **O que foi procurado antes de dizer que não há**: `SIS11/Versão 1.0/{Código.gs,index.html}`,
  `SIS11/CIAARA-11-v2/src/{backend,frontend}/*`, `specs/heranca-v2.0/009-refatoracao-ui-ux/`,
  documentos 01, 02, 04, 05, 06, 08, 24, 25, 42, o schema real (migrations do Épico 1 e 2) e o
  banco local povoado. Tudo citado com caminho e linha na seção *Contexto*.
- **Números medidos em 16/09/2026** no banco local: 24 cursos (5 classificações em uso, de 7 no
  `ENUM`), **28 turmas** (não 29 — a 29ª linha da planilha não tem `ID_Turma`), 29 vigências de
  regime **sem nenhuma sucessão real**, 2 responsáveis de curso (ambos gerais), 210
  `turma_disciplina`. **O remoto tem 0 linhas** nas seis tabelas.
- **Treze divergências (D-1 a D-13) foram listadas e não corrigidas**, conforme a regra 1 do
  `CLAUDE.md`. Três têm efeito imediato nesta fatia: a `vw_turmas_rotulo` devolve `NULL` em 18 de
  28 turmas (D-3); o seed de `perfil_permissao` não tem o recurso `horarios` nem a ação
  `desativar` da matriz do documento 01 (D-1, D-2); e a imutabilidade do `RF-HOR-02` não está
  imposta no banco (D-4).
- **A tensão T-1** (documento 42 × documento 06 sobre a fatia da mudança de regime com vigência
  futura) é **decisão de Bernardo** e precede o plano: sem ela, o plano não sabe se tem a US6.
- **O seletor de turma é entregue nesta fatia** — registrado em seção própria, porque a fatia (b)
  depende dele.
- **A correção dos quatro rótulos de épico do menu** entrou como requisito (`FR-038` a `FR-040`),
  com emenda datada ao registro da MENU-1 em `specs/008-shell-e-estado-na-url/contracts/casca.md`.
- Próximo passo: `/speckit-clarify`. **Não** `/speckit-plan` antes das respostas — em especial
  T-1, Q-01, Q-02, Q-06, Q-08, Q-13, Q-21, Q-22 e Q-28, que mudam o tamanho da fatia.
