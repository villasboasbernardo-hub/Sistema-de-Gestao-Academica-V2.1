# Antes/depois — a rodada da sincronização da leva 2 (PR 6), aplicada no REMOTO

Aplicada em **14/10/2026** no banco **remoto**, com as aprovações **A6.1** e **A6.2** de Bernardo Villas Boas (14/10/2026),
o código da `main` depois dos merges de #52 (`cd27abd`), #53 (`eacde13`) e #54 (`1807007`), e a exportação NOVA das
planilhas **`2026-10-14T1916`**. Dez turmas: a `C-Exp-Obs-ME 2026` **volta** nesta rodada (D-SYNC-1), com a
`PEND-DSA-VISTA` fechada antes (A6.1).

## O rito

| Passo | Artefato | Resultado |
|---|---|---|
| Ensaio no local | cópia `remoto-20261014-204938.sql`, restaurada por `dado_do_remoto`, + a A6.1 | 1ª rodada 318 mudanças, 2ª **0**; `lançado na tela: 0` nas dez; a carga por turma **igual** à do primeiro ensaio (cópia `remoto-20261014-191624.sql`) |
| Backup imediatamente antes | `remoto-20261014-205951.sql` | a carga das 28 turmas no remoto **igual** à da cópia do ensaio |
| A6.1 no remoto | `antes-depois/pend-dsa-vista.sql` (transação com conferência) | Obs-ME: CHD 113 → **114**, vista 3 → **4** — igual ao ensaio |
| Ensaio no remoto (sem gravar) | — | **impressão digital do plano igual à do local nas dez turmas**; 318 mudanças |
| Rodada no remoto | — | 1ª rodada 318 mudanças, lida de volta nas dez (*"o banco é o plano, linha a linha"*); catálogo igual (`avaliacoes_do_curriculo d98f14d5…`, `disciplinas c1c8e134…`) |
| Segunda rodada | — | **0 mudança** nas dez |
| Local × remoto | md5 de aulas, avaliações (com o item), sessões de vista, atividades e ajustes de cada turma | **iguais nas dez**; a carga das **18 outras** turmas igual nos dois e sem mudança |
| Esquema | `scripts/provas/impressao_digital_do_esquema.sql` | **`19d845f0…`, 1.935 objetos**, igual no local e no remoto; 70 e 70 migrations |
| Trilha do arbitrado | `avaliacoes_curriculo_arbitragens` | **6** linhas, as 6 sugestões da planilha (autor nulo = carga) |

Comando (os dois bancos; no local, `--destino local --autor USR-DEV-LOCAL`):

```
python -m scripts.carga_dsa.sincronizar --rodada planilhas-de-origem/rodadas/2026-10-14T1916 --destino remoto --autor USR-ADMIN-001 --autor-local USR-DEV-LOCAL --gravar --adiar aula_sem_instrutor,chave_sem_catalogo,chave_sem_regra,contagem_diverge,controle_diverge,instrutor_nao_casado,local_sem_traducao,ue_inexistente,vista_em_mais_de_uma_sessao,vista_sem_prova,tecnica_desconhecida --turmas "CAHO 2026,C-Ap-HN 2026,C-Ap-FR 2026,C-Espc-HN 2026,C-Espc-FR 2026,C-Esp-ME 2026,C-Exp-MetocOf 2026,C-Exp-BATI T1 2026,C-Exp-Ag-Mag 2026,C-Exp-Obs-ME 2026"
```

## A carga por turma — `vw_carga_horaria_turma`, banco remoto, em TA

*Antes* = o remoto antes da A6.1 e da rodada; *depois* = depois das duas.

| Turma | CHD | Avaliação | Vista | AEC | TAD | TR | Apoio Individualizado | **CHT** |
|---|---|---|---|---|---|---|---|---|
| C-Ap-FR 2026 | 828 | 45 | 11 | 12 | 65 | 0 | 3 | 905 |
| C-Ap-HN 2026 | 953 | 73 | 24 | 41 | 54 | 59 → **58** | 0 → **1** | 1107 → **1106** |
| C-Esp-ME 2026 | 586 | 49 | 19 | 17 | 14 → **0** | 0 | 0 → **14** | 617 → **603** |
| C-Espc-FR 2026 | 1075 | 75 → **73** | 22 | 108 | 28 → **15** | 1 | 18 → **31** | 1212 → **1199** |
| C-Espc-HN 2026 | 1124 → **1126** | 76 | 23 → **25** | 85 → **83** | 41 → **31** | 27 | 2 → **12** | 1277 → **1267** |
| C-Exp-Ag-Mag 2026 | 131 | 4 | 1 | 1 | 1 → **0** | 0 | 0 → **1** | 133 → **132** |
| C-Exp-BATI T1 2026 | 42 | 6 | 2 | 1 | 2 → **0** | 0 | 0 → **2** | 45 → **43** |
| C-Exp-MetocOf 2026 | 153 | 8 | 3 | 5 | 2 → **0** | 0 | 0 → **2** | 160 → **158** |
| C-Exp-Obs-ME 2026 | 113 → **114** | 11 | 3 → **4** | 5 | 1 → **0** | 0 | 0 → **1** | 119 |
| CAHO 2026 | 1355 → **1356** | 144 | 35 → **36** | 57 | 17 | 59 | 0 | 1488 → **1489** |

- **A A6.1** (só ela, medida entre os dois passos): C-Exp-Obs-ME 2026 CHD 113 → 114, vista 3 → 4, CHT 119 → 120. Depois, a
  rodada leva a Recepção aos alunos dela de TAD para Apoio Individualizado (abaixo), e a CHT volta a 119.
- **A vista sobe** em dois casos. C-Espc-HN (+2): as duas AEC *"VISTA DE PROVA (2ª sessão)"* viram sessão 2 da prova
  (AEC 85 → 83; `vista_extra_como_aec` sem efeito). CAHO (+1): a planilha tem **duas** linhas de vista da prova
  `DSAP-CAHO-2026-L1964-V` no mesmo dia (09/10/2026); a vista única guardava uma, e agora são duas sessões.
- **⚠️ A CHT cai em sete turmas, e a causa não é a leva 2** (D6.2): as **17 linhas** abaixo estavam no remoto como
  TAD/Administração (16) ou TR (1), travadas pela pendência de responsável desde 06/10/2026 (A3.2 trava só a linha).
  Com as decisões da **A3.6**, aplicadas no PR 4, o responsável passa a ser aceito e a linha recebe a classificação da
  **D-AA-12**: **Apoio Individualizado**, fora da CHT e dos tetos. Somam **44 TA**.
- C-Espc-FR 2026: avaliação 75 → 73 porque a prova **agendada** de 16/10/2026 (`DSAP-C-ESPC-FR-2026-L2380-V`, 2 TA) saiu
  da planilha entre as exportações de 11h49 e 19h16 — a rodada a cancelou, e a aula do mesmo dia também saiu, com duas
  aulas novas no lugar; o TAD 28 → 15 é das Monitorias.

### As 17 linhas que viram Apoio Individualizado (o remoto ANTES)

| Turma | Código | Data | TA | Antes | Descrição |
|---|---|---|---|---|---|
| C-Ap-HN 2026 | `DSAP-C-AP-HN-2026-L004-N` | 2026-04-13 | 1 | TR / Tempo Reserva | MONITORIA |
| C-Esp-ME 2026 | `DSAP-C-ESP-ME-2026-L004-N` | 2026-04-13 | 4 | TAD / Administração | MONITORIA |
| C-Esp-ME 2026 | `DSAP-C-ESP-ME-2026-L848-N` | 2026-07-20 | 3 | TAD / Administração | MONITORIA |
| C-Esp-ME 2026 | `DSAP-C-ESP-ME-2026-L1181-N` | 2026-08-28 | 7 | TAD / Administração | MONITORIA |
| C-Espc-FR 2026 | `DSAP-C-ESPC-FR-2026-L004-N` | 2026-01-12 | 4 | TAD / Administração | MONITORIA |
| C-Espc-FR 2026 | `DSAP-C-ESPC-FR-2026-L070-N` | 2026-01-19 | 1 | TAD / Administração | MONITORIA |
| C-Espc-FR 2026 | `DSAP-C-ESPC-FR-2026-L079-N` | 2026-01-20 | 1 | TAD / Administração | MONITORIA |
| C-Espc-FR 2026 | `DSAP-C-ESPC-FR-2026-L1531-N` | 2026-07-09 | 7 | TAD / Administração | MONITORIA |
| C-Espc-HN 2026 | `DSAP-C-ESPC-HN-2026-L004-N` | 2026-01-12 | 4 | TAD / Administração | MONITORIA |
| C-Espc-HN 2026 | `DSAP-C-ESPC-HN-2026-L037-N` | 2026-01-15 | 1 | TAD / Administração | MONITORIA |
| C-Espc-HN 2026 | `DSAP-C-ESPC-HN-2026-L070-N` | 2026-01-19 | 1 | TAD / Administração | MONITORIA |
| C-Espc-HN 2026 | `DSAP-C-ESPC-HN-2026-L331-N` | 2026-02-19 | 1 | TAD / Administração | MONITORIA |
| C-Espc-HN 2026 | `DSAP-C-ESPC-HN-2026-L608-N` | 2026-03-23 | 3 | TAD / Administração | MONITORIA |
| C-Exp-Ag-Mag 2026 | `DSAP-C-EXP-AG-MAG-2026-L004-N` | 2026-03-16 | 1 | TAD / Administração | MONITORIA |
| C-Exp-BATI T1 2026 | `DSAP-C-EXP-BATI-T1-2026-L046-N` | 2026-03-13 | 2 | TAD / Administração | MONITORIA |
| C-Exp-MetocOf 2026 | `DSAP-C-EXP-METOCOF-2026-L013-N` | 2026-08-04 | 2 | TAD / Administração | RECEPÇÃO AOS ALUNOS |
| C-Exp-Obs-ME 2026 | `DSAP-C-EXP-OBS-ME-2026-L004-N` | 2026-09-14 | 1 | TAD / Administração | RECEPÇÃO AOS ALUNOS |

## A ligação ao item — as 187 avaliações vivas da planilha (rodada `2026-10-14T1916`)

| | Quantas | Onde aparecem |
|---|---:|---|
| Ligadas a uma avaliação do currículo | **75** (43 PE, 21 PP, 11 trabalhos) | no item, com a situação |
| Não casam com nenhum item da disciplina | **86** | lista de erros (*"não casa"*); no card, contam no N; no quadro, *"lançadas no DSA sem avaliação do currículo ligada"* |
| Prova a mais que os itens | **6** | lista de erros (*"prova a mais"*); idem no card e no quadro |
| Disciplina **sem** avaliação do currículo carregada (A4.7) | **16** (4 PE, 9 PP, 3 trabalhos) | lista de erros (*"a disciplina não tem avaliação do currículo carregada"* — **antes desta publicação, sumiam da lista**); no card, contam no N; a disciplina sai *"não definido"* |
| Linha editada na tela (a tela vence, A3.4) | **4** (C-Ap-HN) | lista *planilha diverge do sistema* |
| Linha do banco sem par na planilha atual (turma com virada) | **2** (C-Ap-HN XIII, CAHO XII) | intocadas pela rodada |
| OD (contínua, Q-17) | **2** (CAHO V, *"OBSERVAÇÃO DE DESEMPENHO"*, tipo Prova Prática) | não se ligam a item, por desenho |

A lista de erros traz ainda **6** TA de prova diferente do currículo (estas ligadas) e **4** provas com data depois
da virada (13/10/2026) em CAHO e C-Ap-FR — a rodada não as carrega, porque ali o sistema é a fonte.

## As vistas atrasadas no `/inicio`

Antes desta publicação, o `/inicio` contava toda prova aplicada sem vista há mais de 7 dias; no remoto pré-rodada eram
**46**, todas de prova **sem** item ligado. Depois da rodada, com a regra antiga, seriam **44**: **(a) 6** de prova
ligada a item com tempo de vista — atrasadas de verdade — e **(b) 38** de prova sem item. Como (b) é a maioria, o
alerta passou a contar **só (a)** (decisão de Bernardo Villas Boas, 14/10/2026), e (b) vai para a lista de erros como
*"vista não lançada na planilha, e a prova não tem avaliação do currículo que diga se há vista"* — **35** linhas; as 3
restantes são a OD de CAHO V, a linha sem par de CAHO XII e a prova de CAHO XII de 01/10 cuja vista a planilha põe
depois da virada.

| Turma | (a) atrasada de verdade | (b) prova sem item |
|---|---:|---:|
| C-Ap-FR 2026 | 1 | 3 |
| C-Ap-HN 2026 | 1 | 2 |
| C-Espc-FR 2026 | 2 | 4 |
| C-Espc-HN 2026 | 2 | 4 |
| C-Exp-Ag-Mag 2026 | 0 | 1 |
| CAHO 2026 | 0 | 24 |
| **Total** | **6** | **38** |

Captura (fora do git): `rodada-01-inicio-vistas.png` — *"6 vistas atrasadas · 1 vencendo em breve"*.

## A lista de erros de planilha, por turma (fora do git)

`planilhas-de-origem/rodadas/2026-10-14T1916/erros-de-planilha.md`, uma seção por turma:

| Turma | Linhas | Não casa | A mais | TA diferente | Disciplina sem item | Vista não lançada |
|---|---:|---:|---:|---:|---:|---:|
| CAHO 2026 | 123 | 46 | 1 | 0 | 4 | 21 |
| C-Ap-FR 2026 | 56 | 11 | 2 | 0 | 0 | 3 |
| C-Ap-HN 2026 | 45 | 0 | 2 | 1 | 0 | 2 |
| C-Espc-FR 2026 | 29 | 12 | 0 | 2 | 7 | 4 |
| C-Espc-HN 2026 | 13 | 1 | 1 | 3 | 5 | 4 |
| C-Esp-ME 2026 | 49 | 13 | 0 | 0 | 0 | 0 |
| C-Exp-Ag-Mag 2026 | 8 | 2 | 0 | 0 | 0 | 1 |
| C-Exp-BATI T1 2026 | 2 | 1 | 0 | 0 | 0 | 0 |
| C-Exp-MetocOf 2026 | 7 | 0 | 0 | 0 | 0 | 0 |
| C-Exp-Obs-ME 2026 | 4 | 0 | 0 | 0 | 0 | 0 |

As demais linhas de cada seção são as já conhecidas da leva 1 (CH de UE da BD DISCIPLINAS × currículo, aula em dia
que a planilha marca parado).

