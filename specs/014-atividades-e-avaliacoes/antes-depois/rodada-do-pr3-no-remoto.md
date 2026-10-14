# Antes/depois — a rodada de sincronização do PR 3 (leva 1), aplicada no REMOTO

Aplicada em 14/10/2026 no banco **remoto**, com a exportação NOVA das planilhas **`2026-10-14T1149`** e as
decisões A3.1 a A3.5 de Bernardo Villas Boas (14/10/2026). Nove turmas; `C-Exp-Obs-ME 2026` fora (D-SYNC-1).

## O rito

| Passo | Artefato | Resultado |
|---|---|---|
| Ensaio no local | cópia `remoto-20261014-122503.sql`, restaurada por `dado_do_remoto` | 1ª rodada 127 mudanças, 2ª **0** |
| CI do PR | `3dda041` | verde nos três blocos |
| Ensaio no remoto (sem gravar) | — | **plano do remoto = plano do local** nas nove turmas (impressão digital do plano por turma) |
| Backup imediatamente antes | `remoto-20261014-124318.sql` | — |
| Rodada no remoto | — | 1ª rodada 127 mudanças, 2ª **0**; lido de volta: o banco é o plano, linha a linha, nas nove |
| Catálogo (SC-008) | md5 de disciplinas e UEs | igual antes e depois |
| Local × remoto | md5 de aulas, avaliações, atividades e dias parados de cada turma (sem auditoria nem ids) | **igual nas nove turmas**; totais da `vw_carga_horaria_turma` iguais |

Comando (os dois bancos):

```
python -m scripts.carga_dsa.sincronizar --rodada planilhas-de-origem/rodadas/2026-10-14T1149   --destino remoto --autor USR-ADMIN-001 --autor-local USR-DEV-LOCAL --gravar   --adiar aula_sem_instrutor,chave_sem_catalogo,chave_sem_regra,contagem_diverge,controle_diverge,instrutor_nao_casado,local_sem_traducao,ue_inexistente,vista_em_mais_de_uma_sessao,vista_sem_prova,tecnica_desconhecida   --turmas "CAHO 2026,C-Ap-HN 2026,C-Ap-FR 2026,C-Espc-HN 2026,C-Espc-FR 2026,C-Esp-ME 2026,C-Exp-MetocOf 2026,C-Exp-BATI T1 2026,C-Exp-Ag-Mag 2026"
```

A lista `--adiar` é a da carga de 06/10/2026 (C10-018), mais `tecnica_desconhecida` (D3.9).

## O TAD de cada turma — `vw_carga_horaria_turma`, banco remoto, em TA

| Turma | AEC antes → depois | **TAD antes → depois** | TR antes → depois | EI | Apoio Individualizado | Dias parados (à parte) | CHD executada |
|---|---|---|---|---|---|---|---|
| C-Ap-FR 2026 | 15 → 12 | **89 → 65** | 0 → 0 | 104 | 0 → 3 | 112 → 144 | 828 → 828 |
| C-Ap-HN 2026 | 41 → 41 | **85 → 54** | 57 → 59 | 6 | 0 → 0 | 112 → 151 | 960 → 953 |
| C-Esp-ME 2026 | 17 → 17 | **29 → 14** | 0 → 0 | 96 | 0 → 0 | 0 → 15 | 586 → 586 |
| C-Espc-FR 2026 | 126 → 108 | **51 → 28** | 1 → 1 | 167 | 0 → 18 | 147 → 177 | 1048 → 1075 |
| C-Espc-HN 2026 | 86 → 85 | **63 → 41** | 27 → 27 | 17 | 0 → 2 | 147 → 176 | 1097 → 1124 |
| C-Exp-Ag-Mag 2026 | 1 → 1 | **1 → 1** | 0 → 0 | 11 | 0 → 0 | 0 → 0 | 131 → 131 |
| C-Exp-BATI T1 2026 | 1 → 1 | **2 → 2** | 0 → 0 | 0 | 0 → 0 | 0 → 0 | 42 → 42 |
| C-Exp-MetocOf 2026 | 5 → 5 | **9 → 2** | 0 → 0 | 0 | 0 → 0 | 0 → 7 | 153 → 153 |
| CAHO 2026 | 57 → 57 | **40 → 17** | 59 → 59 | 128 | 0 → 0 | 168 → 199 | 1356 → 1355 |

| Turma | TAD cumprido | Previsto do PROENS | Limite declarado | CH curricular | % da norma |
|---|---|---|---|---|---|
| C-Ap-FR 2026 | 65 | 5 | — | 1165 | 5 |
| C-Ap-HN 2026 | 54 | 5 | — | 1257 | 5 |
| C-Esp-ME 2026 | 14 | — | — | 545 | 5 |
| C-Espc-FR 2026 | 28 | 0 | 62 | 1270 | 5 |
| C-Espc-HN 2026 | 41 | 3 | 62 | 1216 | 5 |
| C-Exp-Ag-Mag 2026 | 1 | — | — | 140 | 5 |
| C-Exp-BATI T1 2026 | 2 | — | — | 42 | 5 |
| C-Exp-MetocOf 2026 | 2 | — | — | 162 | 5 |
| CAHO 2026 | 17 | 6 | — | 1668 | 5 |


O máximo de TAD é o limite declarado pelo currículo ou, sem ele, 5 % da CH curricular. **Acima do máximo, depois
da rodada: só C-Ap-FR 2026** (65 de 58,25). As demais ficam abaixo (C-Ap-HN 54 de 62,85; C-Espc-HN 41 de 62;
C-Espc-FR 28 de 62; CAHO 17 de 83,4; C-Esp-ME 14 de 27,25; MetocOf 2 de 8,1; BATI 2 de 2,1; Ag-Mag 1 de 7).

⚠️ A CHD muda em quatro turmas porque a exportação é NOVA (lançamentos de 06 a 12/10/2026 entraram), não por
reclassificação: C-Ap-HN 960 → 953, C-Espc-FR 1048 → 1075, C-Espc-HN 1097 → 1124, CAHO 1356 → 1355.

## As listas desta rodada (fora do git, na pasta da rodada)

- `planilha-diverge-do-sistema.md` — **6 linhas**, todas editadas na tela (A3.4): em C-Ap-HN, uma aula com 4 × 5
  tempos, um local EAD × Sala 01 e três vistas; em C-Ap-FR, um local EAD × Sala 06 com a técnica. O sistema
  manteve o valor dele.
- `pendencias-de-responsavel.md` — 43 textos, 312 TA, com a classificação proposta (A3.6): 10 entidade,
  7 palestrante externo, 24 militar fora do cadastro, 1 pessoa cadastrada provável, 1 só traços. Essas linhas
  ficaram como estavam no banco (D3.10).
- `erros-de-planilha.md` — a lista para os operadores: 187 linhas de erro em nove turmas (205 linhas de tabela, menos
  os 18 cabeçalhos).
