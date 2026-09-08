# Contrato — a reconciliação que decide o corte

**Fase 1** · 2026-09-07 · fonte: documento 30 §7 · critérios 1 a 8 do documento 06 §Épico 2

## O que bloqueia, e o que só informa

| # | Verificação | Aceite | Bloqueia? |
| --- | --- | --- | --- |
| **R-01** | Contagem por tabela × documento 05 §10 | exata | **Sim** — uma linha de diferença bloqueia |
| **R-02** | **Somatório de TA por turma**, origem × destino | `0` nas **29** turmas | **Sim**, sem tolerância |
| **R-03** | Integridade referencial | **zero** FK órfã | **Sim** |
| **R-04** | As três identidades aritméticas | 1.566+1+186=**1.753** · 663+1=**664** · 531+62+60+11=**664** | **Sim** |
| **R-05** | `codigo` não nulo e único; procedência preenchida | 100% | **Sim** |
| **R-06** | `migracao_log` histórico intacto | **717+** linhas, nenhuma reescrita | **Sim** |
| **R-07** | `turma_disciplina` com **89** herdados e **121** em branco | exato | **Sim** |
| **R-08** | Idempotência: duas execuções, mesmos checksums | idênticos | **Sim** |
| **U-01** | UEs recuperadas por cruzamento | — | Não — **informa** |
| **U-02** | Registros `ambiguo` e `sem_fonte` | — | Não — **exigem leitura humana** |
| **U-03** | Registros `fora_de_cobertura` (18 cursos) | esperado | **Não** — é o previsto |

## A que rodaria primeiro, se pudesse escolher uma só

**R-02.** Contagem total **não pega troca de FK**: mover um registro da turma A para a B mantém o
total. O somatório de tempos de aula **por turma** pega — e é a grandeza de que todo o sistema
depende: CHD, CHT, tetos, LIQ.

Inclui aula, aplicação de avaliação, vista de prova e atividade não letiva. Somar só aula infla o
saldo do DSA — é o achado A-5, já pago uma vez.

## Invariantes

- **C-1**: o relatório tem **veredito explícito**. Relatório sem veredito não é aprovação.
- **C-2**: divergência é **nomeada**, nunca contada em agregado. "2 divergências" não serve; serve
  "tabela X, linha Y, esperado Z, obtido W".
- **C-3**: a não regressão é provada **por invariante estrutural e matemática**, nunca por diff com a
  saída histórica de um curso. **A CAHO 2026 permanece rejeitada como padrão-ouro** (Bernardo,
  10/08/2026) — e nenhuma das planilhas usadas como fonte de transporte a substitui nesse papel.
  Critério **inegociável** do documento 06.
- **C-4**: a reconciliação é **só leitura**. Não corrige nada; aponta.
- **C-5**: `U-03` **não bloqueia**. Os 18 cursos sem fonte de UE são resultado esperado da decisão de
  07/09/2026, não defeito da migração.
