# Data model — Bloco 3

## `public.regimes_de_horario` (nova)

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` pk | `gen_random_uuid()` |
| `codigo` | `text` unique not null | `RGH-NNNNNN`, gerado por sequência (`DEFAULT`, com `grant execute` — gotcha 5.1) |
| `curso_id` | `uuid` not null | FK `cursos`, `restrict`; **imutável** |
| `nome` | `text` not null | 1 a 60 caracteres; único entre os **ativos** do curso (sem diferença de maiúscula e espaço nas pontas) |
| `regime_tempos` | `smallint` not null | 1 a 12; **imutável** (`RF-HOR-02`) |
| `ta_duracao_min` | `smallint` not null | 45 ou 50; **imutável** (`RF-HOR-02`) |
| `intervalo_manha_min`, `intervalo_tarde_min` | `smallint` not null | 0 a 120 |
| `hora_inicio_manha`, `hora_inicio_tarde` | `time` not null | a tarde depois da manhã |
| `configuracao_horario_id` | `uuid` null | FK `configuracoes_horario`; quando dado, o relógio vem do catálogo |
| `observacao` | `text` null | até 500 |
| `status` | `status_registro` not null | `ativo` por padrão; inativar exige `horarios.desativar` |
| `origem_migracao_v1` | `text` null | |
| auditoria | quarteto | `app.set_auditoria()` |

- Unique `(id, curso_id)`, alvo da FK composta da turma.
- **Guarda** (`BEFORE UPDATE`): curso, quantidade e duração imutáveis (`23514`); horários, intervalos e configuração
  imutáveis enquanto alguma turma que usa o regime tiver lançamento (`23514`); mudar a situação exige
  `horarios.desativar` (`42501`).
- **RLS**: ler com `cursos.ler` e o curso no alcance; criar com `horarios.criar`, alcance e curso em oferta; editar com
  `horarios.editar`, alcance e curso em oferta. Sem `DELETE` nem `TRUNCATE`.

## `public.turmas.regime_de_horario_id` (coluna nova)

- `uuid` **nulável**; FK composta `(regime_de_horario_id, curso_id)` → `regimes_de_horario (id, curso_id)`, `restrict`.
  Nula = o regime vigente do curso (como hoje).
- **Guarda** (`BEFORE INSERT OR UPDATE OF regime_de_horario_id`): ao mudar, recusa se a turma já tem lançamento
  (`23514`, *hint* `regime_da_turma_travado`); recusa regime inativo (`23514`, `regime_inativo`). O corpo não tem a
  palavra *status* (pgTAP 101 e 138): a lógica está nas funções de apoio.

## Funções de apoio (novas, `app`, `security definer`, `stable`)

- `app.turma_tem_lancamento_no_dsa(uuid) → boolean` — a lista de `research.md` R-3.
- `app.regime_escolhivel(uuid) → boolean` — o regime está ativo.
- `app.regime_em_uso_com_lancamento(uuid) → boolean` — alguma turma que o usa tem lançamento.

## `public.vw_dias_parados_turma` (recriada, mesmas colunas)

O TA do dia passa a ser `coalesce(regime da turma, regime padrão vigente do curso, 8)`; antes era
`coalesce(regime padrão vigente do curso, 8)`. `with (security_invoker = true)`.
