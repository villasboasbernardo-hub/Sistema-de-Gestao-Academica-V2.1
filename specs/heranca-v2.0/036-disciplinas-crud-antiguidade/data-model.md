# Data Model: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

Nenhuma mudança de schema (nenhuma coluna nova, nenhuma migração). Este documento descreve as
entidades já existentes consumidas/escritas pela feature e o formato dos novos pontos de leitura/
escrita.

## Entidades existentes tocadas

### disciplinas (primeira escrita de criação de linha desde a migração original)
| Campo | Tipo | Uso nesta feature |
|---|---|---|
| `ID_Grade` | TEXTO (PK) | Gerado no cadastro: `"{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}"` (research.md §4) |
| `ID_Disciplina` | TEXTO (inteiro sequencial puro) | Gerado via `gerarProximoIdSequencial_` (já existente) |
| `ID_Curso` | TEXTO (FK) | Obrigatório no cadastro (FR-010); base da checagem de unicidade de Código |
| `Cod_Disciplina` | TEXTO | Editável (FR-004); único dentro do `ID_Curso` (FR-006) |
| `Nome_Disciplina` | TEXTO | Editável (FR-004) |
| `Carga_Horaria_Tempos` | NÚMERO | Editável (FR-004) — já editável hoje via célula inline, passa a estar também no painel |
| `Modo_Atribuicao_Padrao` | ENUM(`Dividido`,`Simultaneo`) | Editável (FR-004), `Dividido` como padrão no cadastro (RN-MAT-05) |
| `Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor` | — | Semente de grade — **não tocados** por esta feature (permanecem intocados desde a spec 033) |
| `Status` | ENUM | Gravado `Ativo` no cadastro; alvo do rollback (FR-013) — vira inativo/cancelado se o vínculo de turma falhar |

### turma_disciplina (primeira escrita de criação de linha pelo motor genérico do backend)
| Campo | Tipo | Uso nesta feature |
|---|---|---|
| `ID_turma_disciplina` | TEXTO (PK) | Gerado via `gerarProximoId_` depois da correção do prefixo (research.md §5) — `TDI-NNNNNN` |
| `ID_Turma` | TEXTO (FK) | Obrigatório no cadastro (FR-010) |
| `ID_Curso` | TEXTO (FK) | Copiado do Curso selecionado |
| `ID_Grade` | TEXTO (FK) | Copiado do `ID_Grade` recém-criado em `disciplinas` |
| `Cod_Disciplina`/`Nome_Disciplina` | TEXTO | Copiados no cadastro; **atualizados por propagação** sempre que a disciplina é editada no catálogo (FR-006.1) |
| `Previsao_Inicio`/`Previsao_Termino` | DATA | Opcionais no cadastro (podem ficar vazios, preenchidos depois via o painel de edição já existente) |
| `Origem_Periodo` | ENUM(`Herdado_Grade`,`Manual`,`Nao_Informado`) | Gravado `Manual` no cadastro (período veio de um formulário, não herdado da grade) |
| `ID_Instrutor` | TEXTO (CSV) | Opcional no cadastro |
| `Status` | ENUM | Gravado `Ativo` |

### config_parametros (primeira leitura pública do peso de Prioridade)
| Campo | Uso nesta feature |
|---|---|
| `Chave` (`PRIORIDADE_DISCIPLINA_{ID_Grade}`) / `Valor` | Lidos por `getPesosPrioridadeDisciplinas()` (nova) — mesmo par chave/valor já escrito por `definirPrioridadeDisciplina` (Épico G), agora também lido de volta |

### instrutores (só leitura, sem mudança)
| Campo | Uso nesta feature |
|---|---|
| `Posto_Graduacao` | Entrada da ordenação por precedência (FR-001/FR-002) |

## Retorno de `getPesosPrioridadeDisciplinas()` (novo)

```
{ [idGrade: string]: number }   // mesmo mapa já calculado por lerPesosPrioridadeDisciplina_
```

## Retorno de `cadastrarDisciplina(dados)` (novo)

**Entrada** (`dados`):
```
{
  idCurso: string,            // obrigatório (FR-010)
  idTurma: string,            // obrigatório (FR-010)
  Cod_Disciplina: string,     // obrigatório, único dentro do idCurso (FR-006)
  Nome_Disciplina: string,    // obrigatório
  Carga_Horaria_Tempos: number,
  Modo_Atribuicao_Padrao: string,  // 'Dividido' (padrão) | 'Simultaneo'
  Previsao_Inicio: string,    // opcional, 'yyyy-MM-dd' ou ''
  Previsao_Termino: string,   // opcional
  ID_Instrutor: string,       // opcional, CSV
}
```

**Saída** (sucesso):
```
{ idGrade: string, idTurmaDisciplina: string }
```

**Erro**: lança `Error` com mensagem clara — Código duplicado (FR-006), Turma não pertence ao Curso
selecionado, Curso/Turma ausentes (FR-010), ou falha na criação do vínculo de turma (nesse último
caso, o catálogo já foi desfeito via rollback antes do erro ser relançado — FR-013).

## Retorno de `atualizarDisciplina(idGrade, obj)` (estendida, mesma assinatura)

Sem mudança de assinatura nem de formato de retorno (`{ ok: true, id: idGrade }`, já existente via
`crudAtualizar`). Mudança de comportamento interna: valida unicidade de Código quando
`obj.Cod_Disciplina` está presente (FR-006); propaga `Cod_Disciplina`/`Nome_Disciplina` para toda
linha de `turma_disciplina` com o mesmo `ID_Grade` quando esses campos mudam (FR-006.1).

## Estados de UI (frontend, sem entidade de dados nova)

- **Painel de edição (existente, expandido)**: ganha os campos Código/Nome/Carga Horária/
  Prioridade/Modo de Atribuição antes do bloco Início/Término/Instrutores já existente (spec 035).
- **Painel de cadastro (novo)**: mesma estrutura do painel de edição, campos vazios, mais 2
  seletores no topo (Curso, Turma — cascata igual à já existente no módulo). Reaproveita a mesma
  `.modal-content`/`Tailwind.Modal` introduzida na spec 035, com um `modo` (`'editar'`|`'cadastrar'`)
  controlando o título e o handler de salvar.
