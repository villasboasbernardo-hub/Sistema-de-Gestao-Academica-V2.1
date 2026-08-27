# Data Model — Épico E: Categorização de Atividades Letivas

Nenhuma coluna ou aba nova. Este documento cobre (a) as validações de aplicação que passam a
existir sobre o schema já entregue pelo Épico C, e (b) as formas de dado novas que só existem em
memória (nunca persistidas), produzidas pelas funções de cálculo desta feature.

## Validações de aplicação sobre entidades existentes

### `atividades_nao_letivas` (lançamento novo, via `registrarEventoExtracurricular`)

| Campo | Validação |
|---|---|
| `Categoria_Normativa` | Obrigatório. Um de `AEC`, `TAD`, `TR`, `Estudo_Individual`. Rejeitado (erro, não alerta) se ausente ou fora do domínio — é erro de formulário (IND-01), não uma condição normativa incerta. |
| `Escopo` | Obrigatório. `Global` ou `Turma`. Se `Categoria_Normativa = Estudo_Individual`, `Escopo` só pode ser `Turma` — `Global` é rejeitado na validação (FR-009). |
| `ID_Turma` | Obrigatório se `Escopo = Turma`; ignorado (a função resolve todas as turmas ativas na data) se `Escopo = Global`. |
| `Tempos_Consumidos` | Obrigatório, numérico > 0 (mesma regra já aplicada em V1.0). |
| `Data`, `Descricao` | Obrigatórios (RF-EXTRA-01). |

### `avaliacoes` (lançamento novo, via `registrarAvaliacao`)

| Campo | Validação |
|---|---|
| `ID_Turma`, `ID_Grade`, `Tipo_Avaliacao`, `Data_Avaliacao` | Obrigatórios (já validado em V1.0, preservado). |
| `Tempos_Consumidos`, `TA_Inicial` | **Novo nesta feature** — obrigatórios; alimentam o cômputo automático de CHD (RN-EVT-03). |
| `ID_Instrutor_Responsavel` | Se preenchido, **não** exige habilitação na disciplina para o papel de fiscal (RN-INST-01 delimitada) — diferente da validação de `registrarAula`, que continua exigindo habilitação para quem ministra Aula. |

## Formas de dado novas (só em memória, não persistidas)

### Resultado de cálculo de teto (`calcularTetoAEC_`/`calcularTetoTAD_`/`calcularTetoTR_`)

```text
{
  categoria: "AEC" | "TAD" | "TR",
  idCurso: string,
  denominador: number,       // soma curricular de CHD (AEC) ou CHR (TAD/TR) — ver research.md, achado 3
  numerador: number,         // soma de Tempos_Consumidos da categoria para o curso
  percentualAtual: number,   // numerador / denominador
  limitePercentual: number,  // lido de config_parametros
  ultrapassado: boolean,     // percentualAtual > limitePercentual
  semBaseDeCalculo: boolean, // true quando denominador = 0 (ver spec.md, Edge Cases)
}
```

Consumida pelo frontend para decidir se mostra o Aviso Nível 2 (banner amarelo, `ultrapassado=true`)
ou o estado neutro ("sem base de cálculo ainda", `semBaseDeCalculo=true`).

### Totalizador de 5 categorias (`getCronos`/`getRelatorio`/`getDsaSemanal`)

```text
{
  idTurma: string,
  chd: number,              // Aula + Avaliação/Vista, por disciplina e total
  aec: number,
  tad: number,
  tr: number,
  estudoIndividual: number, // informativo, nunca somado a chd/aec/tad/tr
  cht: number,               // = chd + aec + tad + tr (Estudo Individual fora, RN-EVT-01)
}
```

## Entidades consumidas, inalteradas (referência)

- `config_parametros`: chaves de teto (AEC/TAD/TR) e da referência de Estudo Individual (10% —
  CIAARA sem regime de Estudo Obrigatório, ver `spec.md` Clarifications). Lidas por
  `lerConfigParametros_`, nunca gravadas por esta feature.
- `disciplinas.Carga_Horaria_Tempos`: fonte do denominador curricular de CHD/CHR.
- `turmas`: fonte de "todas as turmas ativas na data" para lançamento `Escopo = Global`.
