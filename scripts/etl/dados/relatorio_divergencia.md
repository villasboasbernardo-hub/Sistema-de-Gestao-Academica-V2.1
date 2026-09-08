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
| U-02 | `atividades_nao_letivas` | TAD/AEC sem tempos — afeta os tetos | 0 | 3 |

## O que é esperado — previsto por decisão, não é defeito

- **U-03** · `registros_aula` · sem Unidade de Ensino: 1566 — previsto — decisão de 07/09/2026, 17 cursos sem fonte
- **U-03** · `config_parametros` · chaves legadas desativadas: 13 — previsto — decisão de 08/09/2026, a canônica da v2.1 é a que vale

## Checksums canônicos (R-08)

`md5()` sobre as colunas de negócio ordenadas, sem `id` nem o quarteto de
auditoria. Reexecutar a carga com a mesma origem tem de reproduzi-los.

| tabela | md5 |
| --- | --- |
| `arquivo_avaliacoes_v1` | `b5ba85d350e63587e0db7027f7f9a1c5` |
| `atividades_nao_letivas` | `f544859dc80cbee62f9023435697e390` |
| `avaliacoes` | `f9210ca924fe6068b6f71a625e75ba8a` |
| `avaliacoes_planejadas` | `3561143000e7fe590914feffd0d8a633` |
| `config_listas` | `e79ccae48b56eec362257cfa40beb03d` |
| `config_parametros` | `d5895f5da552fe6af571d4ebb28f4a72` |
| `configuracoes_horario` | `b647c78e497c19b7a7a94c58f8e575b8` |
| `curso_regime_historico` | `94f00d73debd016414ee487d29d1f4db` |
| `cursos` | `ed9ed2ca79dc75dd64d3ec6325dd374e` |
| `disciplinas` | `62695a39b2d67bde327004da06243b21` |
| `feriados` | `972cfa330000bde5b9e58ffeb1cbd955` |
| `horarios_tempos_aula` | `0ade5a411c23711191e0cc35445e701c` |
| `instrutor_disciplina` | `ad7c1e0115c6681c2aa983b644f0ef28` |
| `instrutores` | `fb3d170e34e11310d894141691cf993d` |
| `janelas_curso` | `e7aa8822feec755ba74ecf6133534896` |
| `planejamento_anual` | `d41d8cd98f00b204e9800998ecf8427e` |
| `registros_aula` | `6417218774f9d89a4ae305f599ede878` |
| `reservas_proens` | `ee386f349489b09de1ec40232cfb82f3` |
| `responsaveis_curso` | `9af18c376b74b4e056f6fa55bde802a3` |
| `turma_disciplina` | `cf3132c4039000ffb819f0720d5e4bbe` |
| `turmas` | `83e3d04a1c7197ba66eed3b1b28616c1` |
| `usuario_curso` | `d41d8cd98f00b204e9800998ecf8427e` |
| `usuarios` | `f3b3368fe962bbf2d611df48807ca960` |
