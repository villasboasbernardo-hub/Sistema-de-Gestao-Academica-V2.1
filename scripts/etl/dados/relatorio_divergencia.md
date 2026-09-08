# Relatório de reconciliação — Épico 2

**Veredito: APROVADA**

Relatório sem veredito não é aprovação (contrato reconciliacao C-1).

## O que bloqueia

Nenhuma. As oito verificações bloqueantes fecharam:

- ✅ R-01 contagem por tabela
- ✅ R-02 tempos de aula por turma
- ✅ R-03 integridade referencial
- ✅ R-04 as três identidades
- ✅ R-05 codigo e procedência
- ✅ R-06 migracao_log intacto
- ✅ R-07 períodos de turma_disciplina
- ✅ R-08 checksum canonico

## O que informa — exige leitura humana, não bloqueia

| verificação | tabela | assunto | referência | medido |
| --- | --- | --- | --- | --- |
| U-01 | `registros_aula` | com Unidade de Ensino recuperada | quanto mais, melhor | 0 |
| U-02 | `registros_aula` | aula sem instrutor — LEITURA HUMANA | 0 no regime novo | 173 |
| U-02 | `config_parametros` | mesmo parametro, duas chaves | schema: ch_docente.20h.min | v2.0: ch_docente_20h_min |
| U-02 | `config_parametros` | mesmo parametro, duas chaves | schema: ch_docente.20h.max | v2.0: ch_docente_20h_max |
| U-02 | `config_parametros` | mesmo parametro, duas chaves | schema: ch_docente.40h.min | v2.0: ch_docente_40h_min |
| U-02 | `config_parametros` | mesmo parametro, duas chaves | schema: ch_docente.40h.max | v2.0: ch_docente_40h_max |
| U-02 | `atividades_nao_letivas` | TAD/AEC sem tempos — afeta os tetos | 0 | 3 |

## O que é esperado — previsto por decisão, não é defeito

- **U-03** · `registros_aula` · sem Unidade de Ensino: 1566 — previsto — decisão de 07/09/2026, 17 cursos sem fonte

## Checksums canônicos (R-08)

`md5()` sobre as colunas de negócio ordenadas, sem `id` nem o quarteto de
auditoria. Reexecutar a carga com a mesma origem tem de reproduzi-los.

| tabela | md5 |
| --- | --- |
| `arquivo_avaliacoes_v1` | `8f91d51fdbbd064335d7daff599d07fd` |
| `atividades_nao_letivas` | `7f7475890fb1b39769b1090e6c398d5c` |
| `avaliacoes` | `a3eb1fd012350de3107abfcbf22c583f` |
| `avaliacoes_planejadas` | `dbaacafdffca52bf20f7028b7691eaae` |
| `config_listas` | `503a4fe6d97e4476f6ec50ff22eb8522` |
| `config_parametros` | `cd33537bf029a7c4f589e058973aa45d` |
| `configuracoes_horario` | `b647c78e497c19b7a7a94c58f8e575b8` |
| `curso_regime_historico` | `5b64af5bc8a9c1bc89fbcac5687de02d` |
| `cursos` | `1a305b952d491e35d21aeaa1e321806d` |
| `disciplinas` | `53e7051c839d979107c860a778ccfb7d` |
| `feriados` | `972cfa330000bde5b9e58ffeb1cbd955` |
| `horarios_tempos_aula` | `00925e9622107a38cd8ac470c4b2ab9e` |
| `instrutor_disciplina` | `3ad4e6d514a4853701f3aff09726947c` |
| `instrutores` | `48024791b4b5425a09f8ae8269984a36` |
| `janelas_curso` | `fd2602163054b2bd52fdcf0c51151cc6` |
| `planejamento_anual` | `d41d8cd98f00b204e9800998ecf8427e` |
| `registros_aula` | `88739f5e1cf8b8d96c641c6243f86edf` |
| `reservas_proens` | `911b6983d47204ae9fe9031a2ef8261c` |
| `responsaveis_curso` | `9af18c376b74b4e056f6fa55bde802a3` |
| `turma_disciplina` | `1a5504d2cc55d010f0f682115800e4b0` |
| `turmas` | `7e5be0c4d1f889bf279da24602e2a5b5` |
| `usuario_curso` | `d41d8cd98f00b204e9800998ecf8427e` |
| `usuarios` | `27f19cc66e3301d79fe62b76fddb8f25` |
