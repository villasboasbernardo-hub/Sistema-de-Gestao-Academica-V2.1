# Specification Quality Checklist: Épico 2 — ETL Sheets → PostgreSQL com reconciliação verificável

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-07
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

**Resultado: 16 de 16** *(2026-09-07, terceira iteração)*. Zero marcadores. A spec está pronta para
`/speckit-plan`.

**Dois achados seguem abertos e não são marcadores de clarificação** — são questões de **identidade de
arquivo**, que não impedem desenhar o plano, mas impedem rodar a extração:

| # | Achado | Efeito |
| --- | --- | --- |
| **A-1** | A planilha **"CAL 2026" não existe**. Procurei nos três caminhos e em `Documentos/`: não está lá. Se "CAL" é a CAHO, a autorização contradiz a frase anterior, que manda ignorá-la por inteiro | Enquanto não se decidir, **a CAHO segue excluída** — instrução explícita e leitura mais conservadora |
| **A-2** | `C-AP-HN 2026.xlsx` (214 UEs, 891 lançamentos) e `Cópia de C-AP-HN 2026 - Sabado.xlsx` (215 UEs, 1.041) descrevem o mesmo curso e divergem | Usar os dois **duplica**; escolher errado **perde 150** lançamentos |

## Notes

### Atualização de 07/09/2026 — as três foram respondidas, e a Q1 abriu uma quarta

**Q1 mudou de figura.** A premissa da minha recomendação era falsa: eu disse que o dado não existia.
Existe — nas planilhas de planejamento da **v1.0**, que trazem `Nº U.E` por lançamento. Abri os oito
arquivos e contei: **1.484 UEs** e **8.312 lançamentos com UE**, em **7 cursos**.

**Mas a resposta não fecha a questão, e o resíduo é grande:**

| Resíduo | Número |
| --- | --- |
| **Q1.c — cobertura** | 7 cursos cobertos de **24**; 29 turmas no total |
| **Q1.d — grão** | 8.312 lançamentos da v1.0 × 1.566 registros da v2.0. Grãos diferentes: casar exige chave declarada, e casamento é inferência |
| **Q1.e — autoridade** | Dois arquivos para C-Ap-HN, divergindo em 1 UE e 150 lançamentos. E o `CAHO_2026.xlsx` entra como fonte, ainda que a CAHO 2026 siga rejeitada como padrão-ouro |

**Consequência de escopo, que o plano precisa dimensionar:** o épico deixou de ser "transportar a
v2.0" e passou a ser "transportar a v2.0 **e** recuperar a UE cruzando com a v1.0". Os documentos 30
e 31 **não cobrem essa segunda fonte**.

**Risco de exposição, tratado na hora:** as oito planilhas estavam **não rastreadas e não ignoradas**
dentro do diretório do repositório, que é **público**. Um `git add -A` as publicaria — com nome de
instrutor e estrutura de curso. Acrescentadas ao `.gitignore` em 07/09/2026, antes de qualquer commit.

### Por que os 3 marcadores originais ficaram, em vez de virarem suposição

O guia manda fazer suposição informada e reservar o marcador para o que não tem padrão razoável.
Nenhuma das três tem:

| # | Por que não dá para supor |
| --- | --- |
| **Q1** — grão de UE do histórico | O dado **não existe na origem**. A v2.0 nunca guardou a UE dos 1.566 registros. Qualquer preenchimento é invenção, e duas das três opções violam a regra do próprio épico: "o ETL transporta, não reinterpreta" |
| **Q2** — P-6 e P-7 | Escolher por conta própria significa decidir se o Épico 2 pode tocar schema — fronteira que o documento 06 traça e que só o Bernardo move |
| **Q3** — banco de destino | Depende da **CIAARA-14.2**, que é externa ao projeto. Supor "preview" mandaria dado real da MB para hospedagem externa antes da decisão institucional |

Cada uma vem com opções, implicações e **recomendação declarada** — A, C e A —, para que responder
custe uma linha.

### Sobre "No implementation details" — aprovado, com a mesma ressalva do Épico 0

A spec nomeia planilha, banco e transação. Nesta fatia isso **é** o requisito: a origem é uma planilha
específica que está em produção, e o destino é um schema que já existe. Especificar sem nomeá-los
produziria documento que não descreve nada verificável.

Mitigação aplicada: os **Success Criteria** e os **Acceptance Scenarios** foram escritos em resultado
observável — "zero divergência nas 29 turmas", "a tentativa é recusada pelo banco", "uma linha pode
ser rastreada até a origem" — sem citar linguagem, biblioteca ou nome de arquivo. Quem valida o épico
não precisa ler código. O *como* vive no documento 30, que é plano de execução e não contrato.

### O que foi lido antes de escrever, e não recordado

`docs/fase-3/30-Plano-de-Migracao-ETL.md` (1.768 linhas — §1.1 as cinco etapas, §4 ordem de carga das
25 tabelas, §7.2 a reconciliação que importa, §13 as pendências) · `docs/fase-1/06-Backlog-de-Epicos-V2.1.md`
§Épico 2 (escopo, 8 critérios de aceite, riscos) · o inventário de `docs/fase-3/31` e `32`.

Os números desta spec — 1.566, 210, 89/121, 717+, 29 turmas, 5.400 linhas — saíram desses documentos,
não de memória.

### O que o `/speckit-plan` precisa resolver

1. **Q1, Q2 e Q3 respondidas.** A Q1 antes de qualquer modelagem; a Q2 antes da primeira carga.
2. **Reaproveitamento dos scripts da v2.0** — o documento 06 manda reaproveitar `migracao/*.py`. O
   plano precisa dizer o que se reaproveita e o que se reescreve, e por quê.
3. **P-8**: a sondagem prévia precisa reconferir o inventário, porque o de 02/08/2026 já não
   corresponde à planilha ao vivo.
