# Specification Quality Checklist: Detalhe Semanal de Aula (DSA)

**Purpose**: Validar completude e qualidade da spec. **Revalidado em 05/10/2026, depois do clarify.**
**Created**: 05/10/2026
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — **com ressalva declarada, ver Nota 1**
- [x] Focused on user value and business needs
- [ ] Written for non-technical stakeholders — **NÃO, e por decisão do projeto. Ver Nota 1**
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — **os 3 foram respondidos no clarify de 05/10/2026. Ver Nota 2**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [ ] Success criteria are technology-agnostic — **NÃO em 3 dos 18. Ver Nota 3**
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification — **ver Nota 1**

**Medido: 13 de 16 itens marcados** (eram 12 antes do clarify de 05/10/2026). Os quatro em aberto são **deliberados**, cada um com a razão
escrita abaixo — e nenhum deles é lacuna a preencher antes do `/speckit-plan`.

---

## Notas — por que quatro itens ficam abertos, e por que fechá-los pioraria a spec

### Nota 1 — "sem detalhe de implementação" e "para público não técnico" colidem com o `CLAUDE.md`

O template do Spec Kit pede uma spec sem mecanismo e legível por quem não programa. **A convenção
deste repositório pede o contrário, nominalmente:**

- o `CLAUDE.md` manda que *"toda função de `lib/dominio/` traga no topo o identificador `RN-` e a
  citação literal da regra"* e que a spec **separe o que é mudança de banco do que é só tela**
  (`R-9` do pedido) — as duas exigem nomear o mecanismo;
- o **documento 02** escreve *"Mecanismo v2.1:"* dentro de **cada** requisito de origem, e esta spec
  cita esses requisitos;
- o **documento 24** declara o caminho dos arquivos (`lib/dominio/dsa/`, linha 262), e a spec precisa
  dizer qual dos documentos vale quando eles divergem (`V-1`).

⚠️ **Marcar esses itens como "passa" seria fingir.** A spec **é** técnica, de propósito, e o
leitor-alvo é quem vai implementá-la e Bernardo, que escreveu o pedido com nome de tabela e de
coluna. Quem precisa de linguagem sem jargão neste projeto recebe outro artefato — foi o que
`docs/testes/guia-de-testes.md` fez em 05/10/2026, para os testadores.

### Nota 2 — os três `[NEEDS CLARIFICATION]` existiram por desenho, e FORAM RESPONDIDOS

O pedido é explícito: *"Use no máximo três marcadores `[NEEDS CLARIFICATION]` no corpo, para Q-1,
Q-2 e Q-3, e coloque as demais numa seção «Perguntas para o clarify». **NÃO responda por
suposição**: o Bernardo responde todas de uma vez no `/speckit-clarify`."*

Foram exatamente três, nos três lugares pedidos, e as três têm resposta de Bernardo de 05/10/2026:

| Marcador | Por que não tinha padrão razoável | A resposta |
|---|---|---|
| `Q-1` | **2 dos 24 cursos** e **6 das 175 disciplinas**; as duas saídas mexem em coisas diferentes (catraca × catálogo da DEnsM) | **(a)** lançar por disciplina, sem UE, com tópico obrigatório — ⚠️ **contra a minha recomendação**, e custa o **PR B** |
| `Q-2` | o pedido **proíbe** reinterpretar a `RN-CRONOS-01`, e as três opções mudam número que o Épico 5.5 já publica | **(c)** conta tudo e a tela distingue — **nenhum número do 5.5 muda** |
| `Q-3` | é **novidade** sem requisito de origem, e as duas contagens da planilha **divergem entre si** | **fora do núcleo**, no PR 6; o número fica **derivado** e a `ALT` não aparece até lá |

As outras **15** (Q-4 a Q-18) estão em `spec.md` §10, com as opções consideradas, e as decisões de
todas as **18** estão em `spec.md` §Clarifications, com data e autoria. ⚠️ **Duas recusaram a minha
recomendação ou a mudaram:** a `Q-1` (adotada a (a), eu recomendava a (b)) e a `Q-14` (mudei de
recomendação depois de medir que `responsaveis_curso.curso_id` é nulável).

### Nota 3 — três critérios citam tecnologia, e é o que os torna verificáveis

| Critério | O que ele cita | Por que sem isso ele não se mede |
|---|---|---|
| `SC-013` | `#REF!`, `undefined`, `null` | são **as cadeias literais** que a varredura do e2e procura; "nenhum erro técnico" sem a lista é desejo, não asserção. E `#REF!` é o defeito **medido** em 10 de 15 planilhas |
| `SC-016` | o código `42501` | a lição mais cara desta base: *"aceitar `error not null` como prova de permissão"* deixou **seis** negativos passarem pelo motivo errado. Conferir o código **é** a asserção |
| `SC-018` | `lib/dominio/dsa/`, `supabase`, `next`, `react` | é a fronteira do **Princípio II**, e ela se verifica por import, não por intenção |

⚠️ **E um quarto, que decidi NÃO escrever assim:** o `SC-001` diz *"cabe em uma página A4
paisagem"* — e não *"a altura renderizada é ≤ 210 mm"* —, porque o `RF-PDF-01` já declara que
**caber é asserção, não recomendação**, e a forma de medir é tarefa do plan.

---

## O que esta validação encontrou e CORRIGIU na spec, antes de entregá-la

Registrado porque a correção vale mais que o acerto:

1. **A §5 do `estado-atual.md` afirmava "o pré-preenchimento tem lastro inteiro"** — escrito olhando
   a **estrutura**, antes de medir o **dado**. Medido o remoto, `turma_disciplina_unidade` tem
   **0 linhas**: o primeiro degrau da cascata do instrutor está **vazio**. Reescrita, com a razão
   declarada no próprio arquivo. É o modo de falha da **regra 9.3**, e ele aconteceu aqui.
2. **Dez `[pendente]` de medição foram substituídos por número**, porque a leitura do remoto é
   permitida e eu a tinha adiado sem motivo.
3. **A medição contrariou o `E-1` do briefing**: as 188 avaliações **não** estão sem `ta_inicial` —
   estão **todas com `ta_inicial = 1`**, sentinela do ETL. Isso criou o `SC-017` e a segunda metade
   da `Q-12`, que não estavam no pedido.
4. **Duas perguntas novas nasceram da medição** e não constavam das 16: a `Q-17` (o conflito entre
   turmas colide com a RLS) e a `Q-18` (entrada própria no menu).

## Notas

- Itens marcados incompletos exigiriam **mudar a convenção do projeto**, não a spec. Nenhum deles
  bloqueia o `/speckit-plan`.
- ✅ **Pronta para o `/speckit-plan`.** As 18 perguntas estão respondidas e gravadas; o escopo mudou
  em um ponto material — nasceu o **PR B**, de banco, e ele vem **antes** do PR 1.
