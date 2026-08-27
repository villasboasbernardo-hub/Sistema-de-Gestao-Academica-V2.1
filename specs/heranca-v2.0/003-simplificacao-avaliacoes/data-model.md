# Data Model — Épico I: Simplificação do Módulo de Avaliações

Nenhuma coluna ou aba nova (mesma restrição do Épico E — o schema já foi entregue pelo Épico C,
com uma correção de obrigatoriedade registrada em `docs/arquitetura/01-schema.md` §4.4, v1.4 —
`TA_Inicial`/`Tempos_Consumidos` deixam de ser `Obrig.: Sim`). Este documento cobre (a) as
validações de aplicação sobre o schema já existente, (b) a forma de dado nova produzida em memória
pelo painel, e (c) as regras de derivação de situação de execução acordadas em `/speckit-clarify`
e corrigidas na sequência (research.md, achado 0).

## Derivação da situação de execução (spec.md, FR-007 — corrigida em relação à primeira versão)

| Situação | Condição |
|---|---|
| `Cancelada` | `Status = 'Cancelada'` (única escrita manual — exclusão lógica, `cancelarAvaliacao`) |
| `Concluída` | `TA_Inicial` preenchido (aplicada no DSA via `aplicarAvaliacaoNoDsa`) |
| `Em andamento` | `TA_Inicial` vazio **e** `Data_Avaliacao` = hoje |
| `Atrasada` | `TA_Inicial` vazio **e** `Data_Avaliacao` < hoje (sem prazo de graça — research.md achado 7) |
| `Pendente` | `TA_Inicial` vazio **e** `Data_Avaliacao` > hoje |
| `Sem correspondência` | nenhum lançamento casado com o item planejado (estado do painel, não da coluna `Status`) |

A ordem de checagem importa: `Cancelada` é checada primeiro (sobrepõe qualquer outra condição),
depois `TA_Inicial` preenchido, só então a comparação de data. `Status` como coluna literal só é
escrito pelo backend com os valores `'Concluida'` (por `aplicarAvaliacaoNoDsa`) e `'Cancelada'`
(por `cancelarAvaliacao`) — `Pendente`/`Em_andamento`/`Atrasada` nunca são escritos, são sempre
calculados no momento da consulta (research.md, achado 0).

`Status_Vista` **não** é tocado por esta feature — é `FORMULA` nativa do banco desde o Épico C
(research.md, achado 3). O painel só lê o valor já computado, e só faz sentido para um lançamento
já `Concluída` (a fórmula depende de `Status=Concluida`).

## Validações de aplicação sobre entidades existentes

### `avaliacoes` (`registrarAvaliacao`, ALTERADA — agendamento, sem consumo de TA)

| Campo | Validação |
|---|---|
| `ID_Turma`, `ID_Grade`, `Tipo_Avaliacao`, `Data_Avaliacao` | Obrigatórios (inalterado do Épico E). |
| `ID_Instrutor_Responsavel` | **Corrigido nesta feature**: obrigatório; DEVE ter vínculo ativo em `instrutor_disciplina` para o `ID_Grade` informado (`instrutorHabilitado_`) — bloqueia com `"O instrutor responsável não está habilitado nesta disciplina."` se não tiver (RN-INST-01, FR-013). |
| `Tempos_Consumidos`, `TA_Inicial` | **Removidos desta função** (research.md, achado 0) — não são mais aceitos/exigidos aqui; passam a ser exclusivos de `aplicarAvaliacaoNoDsa`. |

### `avaliacoes` (`aplicarAvaliacaoNoDsa`, NOVA — aplicação efetiva, consome TA)

| Campo | Validação |
|---|---|
| `ID_Avaliacao` | Obrigatório — identifica a linha existente a atualizar (não cria linha nova, mesmo mecanismo de `registrarVistaProva`, research.md achado 2). Erro se não encontrada. |
| `TA_Inicial`, `Tempos_Consumidos` | Obrigatórios, numérico > 0 — só aqui passam a existir (RN-EVT-03, RN-AVAL-02 revisada). |
| `Local` | Opcional. |

Grava `Status = 'Concluida'` explicitamente ao concluir.

### `avaliacoes` (`registrarVistaProva`, NOVA — inalterada em relação à versão anterior deste documento)

| Campo | Validação |
|---|---|
| `ID_Avaliacao` | Obrigatório — identifica a linha existente a atualizar. Erro se não encontrada ou se `TA_Inicial` ainda vazio (não faz sentido vista de uma avaliação ainda não aplicada). |
| `Data_Vista_Prova`, `TA_Inicial_Vista`, `Tempos_Consumidos_Vista` | Obrigatórios de uma vez só (FR-014) — a vista não passa por uma fase de agendamento sem TA. |
| `Local_Vista` | Opcional. |
| `ID_Fiscal` **ou** `Nome_Fiscal_Externo` | Exatamente um dos dois. Se `ID_Fiscal` for um instrutor cadastrado, **não exige** habilitação na disciplina (RN-INST-01 delimitada, FR-011/FR-012). |

### `avaliacoes` (`cancelarAvaliacao`, NOVA — exclusão lógica)

| Campo | Validação |
|---|---|
| `ID_Avaliacao` | Obrigatório. Grava `Status = 'Cancelada'`, `Editado_Por`, `Timestamp_Edicao` na linha existente. Nunca remove a linha (C-05). Pode ser chamada em qualquer momento do ciclo de vida (agendada ou já aplicada). |

## Formas de dado novas (só em memória, não persistidas)

### Item do painel (`painelavaliacoesCurso_`)

```text
{
  idItemPlanejado: string,
  nomeDisciplina: string,       // de avaliacoes_planejadas.Nome_Disciplina
  idGradeCasado: string | null, // disciplinas.ID_Grade, se houve correspondência
  situacao: "Concluída" | "Em andamento" | "Pendente" | "Atrasada" | "Cancelada" | "Sem correspondência",
  lancamentos: [                // 0..N — todos os lançamentos reais casados com este item (edge
                                 // case: reaplicação/recuperação gera mais de um)
    {
      idAvaliacao: string,
      situacao: string,         // situação individual deste lançamento (tabela acima)
      dataAvaliacao: string,
      taInicial: number | null, // null = ainda não aplicado no DSA
      statusVista: string | null, // valor bruto de avaliacoes.Status_Vista, null se ainda não aplicado
    }
  ],
}
```

`situacao` do item (agregada, para o resumo do painel) segue a mesma prioridade da V1.0
(`getDashboardavaliacoes`): sem nenhum `lancamentos` → `Sem correspondência`; senão, `Concluída` se
qualquer lançamento estiver `Concluída`; senão a situação do lançamento mais recente por
`dataAvaliacao` (cobre `Pendente`/`Em andamento`/`Atrasada`/`Cancelada`).

### Resultado agregado (`getPainelavaliacoesCurso`)

```text
{
  idCurso: string,
  itens: [ /* array de "Item do painel" acima */ ],
  totais: { planejadas: number, concluidas: number, emAndamento: number, pendentes: number,
            atrasadas: number, canceladas: number, semCorrespondencia: number },
}
```

### Sugestão de aplicação na prévia do DSA (`getDsaSemanal`, campo novo `avaliacoesAgendadasNaSemana`)

```text
[
  {
    idAvaliacao: string,
    idGrade: string,
    nomeDisciplina: string,
    dataAvaliacao: string,      // dentro da semana consultada
    situacao: "Pendente" | "Em andamento" | "Atrasada",  // nunca Concluída/Cancelada nesta lista
  }
]
```

## Entidades consumidas, inalteradas (referência)

- `avaliacoes_planejadas`: catálogo estático (`ID_Item`, `ID_Curso`, `Nome_Disciplina`,
  `Descricao_Instrumentos`, `Formula_MF`, `Carater`, `Observacoes` — os dois últimos lidos só para
  não quebrar nada existente, nunca exibidos, FR-008). Nunca escrita por esta feature.
- `instrutor_disciplina`: `ID_Instrutor`, `ID_Grade`, `Status` — fonte de `instrutorHabilitado_`
  (filtra `Status = 'Ativo'`, mesmo padrão de soft-delete das demais abas do schema).
- `disciplinas`: fonte do nome oficial da disciplina para o casamento por nome normalizado.
