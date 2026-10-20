# Triagem — Bloco 4 (spec 019): a página de Início

*Medida em 20/10/2026 na `main` (`747b78b`) — código — e no **remoto, só leitura** (contagens abaixo).*

## Os itens do pedido, reescritos

| # | O que está hoje | O que deve acontecer | Tipo |
|---|---|---|---|
| 1 | O Início mostra **todas** as turmas de **todos os anos** (`vw_carga_horaria_turma` sem filtro de ano). No remoto: 28 turmas de 2026 e **1 planejada de 2027**, que entra misturada nos números e na lista. | Um painel das turmas do **ano vigente**, com a mesma régua de ano do painel de Turmas (Bloco 2): padrão o ano vigente (São Paulo), seletor de ano na URL (`?ano=`); a do ano seguinte só com o seletor. | 🐛 + melhoria |
| 2 | A lista das turmas é uma coluna de linhas com `executada/prevista TA · %`, sem barra. | Os **cartões das turmas** do ano, com **barra de progresso**, num **carrossel** que passa sozinho e tem setas; pausa ao apontar e ao focar; sem movimento com *"reduzir movimento"*; navegável por teclado. Sem pacote novo. | melhoria |
| 3 | Cada turma tem um link *"DSA da semana →"*; não há resumo do que está lançado. | Um **carrossel dos DSA da semana atual**: só as turmas que **têm DSA nesta semana**, uma por vez, como manchete — semana do curso, turma, resumo do lançado e link para o DSA dela. Mesmo comportamento de carrossel. | melhoria |
| 4 | A lateral tem *Cursos* e *Turmas* como links simples. | **Submenu na lateral**: *Cursos* → classificação → curso (abre a página do curso) e *Turmas* → curso → turma (abre a ficha), expandindo dentro da lateral, com o ativo marcado; a lateral recolhida continua funcionando; arquivadas fora. | melhoria |
| 5 | A regra de turma EAD sem DSA existe (`lib/dominio/dsa/ead-puro.ts`) e o Início já troca o link pelo aviso. | A turma EAD pura **não entra** no carrossel de DSA. | regra existente, aplicada ao item 3 |

## Medido no remoto (20/10/2026, só leitura)

- **29 turmas**: 2026 — 8 ativas (5 presenciais, 1 semipresencial, 2 EAD), 12 concluídas, 3 planejadas, 5 canceladas
  (**todas as 5 arquivadas**); **2027 — 1 planejada presencial**.
- Semana de 19 a 24/10/2026: **6** turmas com janela cobrindo a semana, fora de EAD e não arquivadas; **4** com
  lançamento na ocupação dessa semana.
- Cursos ativos: 24 — regular 5, expedito 5, estágio de qualificação 7, aperfeiçoamento avançado 4, especial 3.

## Banco

Nada pede banco: o ano é filtro de leitura; o resumo do DSA sai de `vw_ocupacao_ta` (uma leitura da semana para todas as
turmas); a semana do curso sai de `semanaDoCurso` (`lib/dominio/dsa/semana-do-curso.ts`); o submenu lê cursos e turmas
pela RLS de sempre. **Sem migration.**

## Bloco

Cabe inteiro no **Bloco 4** do plano de correções (*Início*), itens 1 a 4.
