# Specification Quality Checklist: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões

**Purpose**: Validar a completude e a qualidade da especificação antes do planejamento
**Created**: 2026-08-28
**Updated**: 2026-08-28 (iteração 3 — reescrita dos requisitos por comportamento)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Iteração 3 — 28/08/2026 · o item reprovado foi corrigido, não rejustificado

**16 de 16 itens passam.**

**A justificativa das iterações 1 e 2 estava errada, e o erro era meu.** Eu havia sustentado que os
requisitos precisavam citar `unique`, `CHECK`, `GENERATED` e `SECURITY DEFINER` porque *"a constitution
(Princípio I) exige que a decisão técnica cite o identificador e o mecanismo"*. **A constitution não
exige isso.** O texto do Princípio I é: *"Toda decisão técnica de arquitetura, plano ou tarefa deve
citar o(s) identificador(es) `RF-`/`RN-`/`RNF-` correspondente(s)"* — ele exige o **identificador da
regra**, não a sintaxe que a implementa. Atribuí à constitution uma obrigação que ela não tem, e usei
isso para dispensar uma correção legítima.

**O que foi reescrito**, mantendo **todas** as citações `RN-`/`RF-`/`RNF-`:

| Seção | Antes | Agora |
|---|---|---|
| **Requirements** | 46 requisitos em sintaxe de banco | **60 requisitos** enunciados como garantia observável, agrupados por regra de negócio |
| **User Scenarios** | Cenários com códigos de erro (`23505`, `42501`) e comandos literais | Cenários em linguagem de operação: *"a gravação é recusada"*, *"perde o acesso imediatamente"* |
| **Edge Cases** | Nomes de função, `GRANT`, `daterange`, `NOT NULL` | As mesmas nove armadilhas, descritas pelo **defeito que produzem** |
| **Key Entities** | 27 nomes de tabela | As 27 entidades pelo nome de domínio do glossário |
| **Success Criteria** | Dois itens citavam `CHECK` e `schema` | Reescritos por resultado observável |

**Onde o mecanismo foi parar.** Num aviso no topo de *Requirements*: o **como** é decisão do
`/speckit-plan`, e o desenho já está escrito em `docs/fase-2/21`, `docs/fase-2/22` e
`docs/sql-referencia/`. Nada se perdeu — mudou de endereço, para o endereço certo.

**Por que a correção melhorou a spec, e não só o checklist.** Enunciar por comportamento obrigou a
dizer a regra em vez do artefato, e isso expôs requisitos que a redação anterior escondia dentro de
uma linha de DDL. As sete regras de unicidade eram **um** requisito citando "documento 05 §7.2";
agora são **onze** requisitos nomeados (FR-008 a FR-018), cada um com a sua citação e o seu teste
próprio. FR-025 (numeração de unidade pode ter lacuna) simplesmente **não existia** — apareceu ao
descrever a garantia em vez da constraint, e é justamente o tipo de regra que alguém acrescentaria
por engano depois.

**O que permanece citando mecanismo, e por quê.** Quatro seções que **não são** requisito:
*Verificação de premissa* (registro do que foi lido em disco, com os números conferidos),
*Restrição fechada — UE-1* (citação literal da decisão de Bernardo — reescrevê-la seria adulterar o
registro), *Assumptions* (o que se reaproveita de `docs/sql-referencia/`) e *Achados* (defeitos
documentais que são, eles próprios, sobre contagens de policies e de tipos). Nessas, citar o
documento **é** o conteúdo.

### Iteração 4 — 29/08/2026 · achados de `/speckit-analyze` aplicados

**13 achados, todos fechados.** Dois eram **CRÍTICOS** e tinham a mesma raiz:

**C1 — `RN-MAT-01` sustentava a decisão central do plano e não existia em requisito nenhum.** A regra,
de *Risco: Alto*, aparecia em `plan.md`, `research.md`, `data-model.md`, `tasks.md`, `quickstart.md` e
`contracts/` — **e em zero lugares da spec**. O plano até admitia: *"a decisão que este plano toma e a
spec não tomava"*. Uma decisão de projeto sem requisito de origem contraria o Princípio I.
→ **FR-061** (a garantia) e **FR-062** (a asserção obrigatória).

**C2 — a mesma regra não tinha asserção nomeada**, contra a DoD (BRIEF §7 item 3) e o Princípio VIII.
Uma cadeia de chaves compostas **com uma das duas FKs faltando passaria em todos os outros testes**.
→ **T040**, que cruza cursos e espera a recusa, em `registros_aula` **e** em `avaliacoes`.

**O que mudou nos números:**

| | Antes | Depois |
|---|---|---|
| Requisitos | 60 | **62** |
| Tarefas | 90 | **91** |
| Cobertura de FR | 85% | **100%** |
| **Cobertura de SC** | **0%** | **100%** |
| Regras `RN-` da spec nomeadas nas tarefas | 5 de 10 | **11 de 11** |

**A cobertura de SC era zero e ninguém tinha notado** — a tabela de rastreabilidade mapeava só
requisitos. Ao construí-la, **SC-013 revelou-se inatingível nesta fatia**: prometia as 572 UEs
"entrando integralmente", enquanto a carga é do Épico 2. Foi reescrito para medir **prontidão**, como
já se fizera com FR-022 e FR-023.

**Sobre a numeração.** FR-061/062 ficam na seção temática a que pertencem, fora de ordem numérica.
Renumerar invalidaria as citações em cinco artefatos — os identificadores são estáveis, pelo mesmo
princípio que impede reescrever chave em uso. Já as tarefas foram renumeradas (T040 inserida, T040–T090
deslocadas), porque IDs de tarefa só são referenciados dentro de `tasks.md` e em duas linhas de
`plan.md` que não se moveram.

**Achados menores fechados:** FR-007 ganhou implementação (T024) e guarda (T041); FR-019 e FR-026
ganharam asserção; a cadeia de `avaliacoes` deixou de ser descrita como "a mesma" de `registros_aula`
— **não é**, e quem seguisse a descrição antiga procuraria uma FK inexistente; as faixas `FR-x a FR-y`
viraram IDs enumerados; e a view por UE foi rejustificada pelo que ela é (origem da agregação), não
pela tela que ainda não existe.

### Estado

**Pronta para `/speckit-implement`.** Nada bloqueia. Q1.b é do Épico 2 e o grão do registro de execução é
o mesmo nas três saídas possíveis.

**Seis itens levados adiante como achado, não como bloqueio** — A-6 a A-11 no quadro da spec. Dois
pedem resposta do Bernardo em algum momento, nenhum agora: **A-8** (o catálogo de UE indo para
repositório público) e **A-9** (os três currículos sem UE, que é a própria Q1.b).
