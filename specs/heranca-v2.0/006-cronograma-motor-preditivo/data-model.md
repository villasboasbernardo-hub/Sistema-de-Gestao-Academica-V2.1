# Data Model — Épico G: Cronograma Unificado e Motor Preditivo Multi-Ano

Nenhuma tabela nova. As 4 abas abaixo já existem e estão populadas na banco de produção desde o Épico C
(`docs/arquitetura/01-schema.md` §4.1/4.2/5.10) — este documento resume só os campos e transições
relevantes para a lógica que este épico constrói, não repete o dicionário de dados inteiro.

## `planejamento_anual` (existente)

Chave: `ID_Planejamento`. Unicidade lógica: `Ano_Letivo` + `Versao` + `ID_Curso` + `ID_Grade` +
`Semana_Ano`.

Campos usados por este épico: `Ano_Letivo`, `Versao`, `Status_Previa` (`Rascunho`/`Salvo`/
`Arquivado`), `ID_Curso`, `Tipo_Linha` (`Disciplina`/`Evento_Manual`/`Reserva_PROENS`/`Feriado`/
`Licenca_Pagamento`), `ID_Grade`, `Semana_Ano`, `Data_Inicio_Semana`, `Tempos_Alocados`,
`Tempos_Alocados_Motor`, `Origem_Linha` (`Motor`/`Motor_Editado`/`Manual`), `Gerado_Por`/
`Timestamp_Geracao`, `Editado_Por`/`Timestamp_Edicao`, `Salvo_Por`/`Timestamp_Salvamento`.

**Transições de estado** (`Status_Previa`, por `Ano_Letivo`+`Versao`):

```
(gerarPlanejamento) → Rascunho
Rascunho --[editarLinhaPlanejamento]--> Rascunho (Tempos_Alocados muda, Origem_Linha vira
                                                    Motor_Editado se Tempos_Alocados <> Tempos_Alocados_Motor)
Rascunho --[salvarPlanejamento]--> Salvo (invariante: no máximo 1 Versao com Salvo por Ano_Letivo —
                                            a versão que estava Salvo, se houver, vira Arquivado
                                            na mesma operação)
```

Uma nova `gerarPlanejamento(ano)` sempre cria `Versao = MAX(Versao WHERE Ano_Letivo=ano) + 1` em
`Rascunho` — nunca apaga nem sobrescreve uma versão existente (Achado 2, `research.md`).

## `curso_regime_historico` (existente)

Chave: `ID_Regime`. Unicidade lógica: `ID_Curso` + `Tipo_Regime` + `Vigente_A_Partir_De`.

Campos usados: `ID_Curso`, `Tipo_Regime` (`Padrao`/`Excecao`), `Regime_Tempos`, `TA_Duracao_Min`,
`Intervalo_Manha_Min`/`Intervalo_Tarde_Min`, `Hora_Inicio_Manha`/`Hora_Inicio_Tarde`,
`Limite_Diario_EAD_Horas`, `Vigente_A_Partir_De`, `Vigente_Ate`, `Status` (`Ativo`/`Cancelado`).

**Resolução por vigência** (contrato já definido em `01-schema.md` §4.2, implementado pela primeira
vez neste épico — `lib/dominio/regime-curso.ts`, Achado 6):

```
getRegimeVigente(ID_Curso, data, Tipo_Regime) →
  linha de Status='Ativo' com ID_Curso e Tipo_Regime batendo,
  maior Vigente_A_Partir_De <= data
  (Vigente_Ate vazio = ainda vigente; senão, data <= Vigente_Ate)
```

Nunca reinterpreta um registro já lançado — todo consumidor passa a **data do próprio registro**
sendo calculado, nunca "hoje" (RN-2027-09).

## `feriados` (existente)

Campos usados: `Ano`, `Data`, `Descricao`, `Impacto` (`Dia_Inteiro`/`Parcial`/`Informativo`),
`Status`. Só linhas `Impacto = Dia_Inteiro` descontam capacidade (RN-EVT-02, FR-006).

## `janelas_curso` (existente)

Campos usados: `Ano`, `ID_Curso`, `Turma_Prevista`, `Data_Inicio_Prevista`, `Data_Termino_Prevista`,
`Status`. Substitui `SEMENTES_2027` — filtra por `Ano` para obter a lista de cursos com janela
oficial definida naquele ano (FR-010, "para todos os cursos com janela oficial definida").

## `reservas_proens` (existente)

Campos usados: `Ano`, `ID_Curso`, `Tipo_Reserva` (`TAD`/`TR`), `Tempos_Reservados`, `Status`.
Sentinel genérico já migrado: **`ID_Curso = 'GERAL'`** (confirmado em
`migracao/popular_calendario_reservas.py`) — usado quando o curso não tem reserva detalhada no
PROENS daquele ano (RN-2027-03).

## Peso de prioridade manual de disciplina (FR-008) — sem tabela/coluna nova

Reaproveita `config_parametros` (já existente, `Chave, Valor, Tipo, Unidade, Ano_Vigencia,
Descricao, Fundamento_Normativo, Editavel_Por`, `01-schema.md` §5.9), em vez de criar coluna nova
em `disciplinas` ou uma tabela dedicada — mesmo princípio que já motivou `config_parametros`
existir (constitution, Princípio VII, "Configuração Sobre Constante"). Convenção de chave:
`PRIORIDADE_DISCIPLINA_{ID_Grade}`, `Valor` = peso inteiro 1–10, `Editavel_Por` =
`PERFIS_DIVISAO_ADMIN_ACADEMICA`. Decidido durante `/speckit-tasks` (2026-08-15) — nenhuma
migração de schema necessária, `config_parametros` já aceita chaves novas sem alteração estrutural.

## Entidades computadas em memória (novas, não persistidas)

- **Resultado de distribuição semanal** (`distribuicaoSemanalMateria_`, portada — Achado 1):
  `{ semAlocacao: bool, alocacaoSemanal: number[], semanaIni: int, semanaFim: int }` — um array de
  tempos alocados por índice de semana, mesmo formato da V1.0.
- **Resumo de geração** (`gerarPlanejamento`, novo formato de retorno para FR-2027-02):
  `{ turmasSimuladas: int, blocosGerados: int, alertas: [{ tipo: 'SEM_INSTRUTOR'|'SOBRECARGA'|
  'CARGA_NAO_COUBE'|'JANELA_SEM_DIAS_UTEIS', idCurso, idGrade?, mensagem }] }`.
- **Regime resolvido** (`getRegimeVigente`, retorno): a própria linha de `curso_regime_historico`
  encontrada, ou `null` se nenhuma vigente na data (degrada com aviso, RN-DEG-01 — nunca lança).
