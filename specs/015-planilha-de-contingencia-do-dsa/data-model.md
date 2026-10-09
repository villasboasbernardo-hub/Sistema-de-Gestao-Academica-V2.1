# Modelo de dados — Planilha de contingência do DSA (spec 015)

**Data**: 09/10/2026

> ⚠️ **NENHUMA TABELA, COLUNA, VIEW OU FUNÇÃO NOVA NO BANCO.** Tudo o que esta página descreve vive
> **em memória**, no servidor, entre a leitura e o arquivo — e a planilha é só de ida (`Q-1`). A prova
> é a mesma do Épico 5.5: `git diff main -- supabase/` vazio e a impressão digital do esquema
> idêntica antes e depois.

## 1. De onde vem cada coisa

| Na planilha | Vem de | Quem monta |
|---|---|---|
| Dias, TA, blocos, sem posição, feriado de dia inteiro | `vw_ocupacao_ta`, `registros_aula`, `avaliacoes`, `atividades_nao_letivas`, `feriados` | `montarSemanaDoDsa` → `montarSemana` (R-2) |
| Relógio de cada semana | `curso_regime_historico` + `horarios_tempos_aula` | `relogioDaSemana` |
| Linhas impressas, legenda, CH do rodapé | a semana montada + `vw_disciplinas_execucao` | `documentoImpresso`, `legendaDeTecnicas`, `execucaoAteASemana` (via `montarDocumentoDoDsa`) |
| Nº do DSA | datas de aula e de avaliação da turma | `numeroDoDsa` |
| Assinaturas | `responsaveis_curso` | `assinaturasDoDsa` / `resolverAssinatura` |
| Sugestões do catálogo | `unidades_ensino`, `turma_disciplina_unidade`, `turma_disciplina_instrutor`, `turmas.sala_alocada` | `preencherLancamento` (R-9) |
| Nomes de instrutor | `vw_instrutores` | o mesmo nome do DSA, em antiguidade (`RN-ANT-01`) |
| Etapa presencial | `turmas` | `etapaDaSemana` (`D-DSA-2`) |
| EAD puro | `turmas.modalidade` | `ehEadPuro` |

## 2. As entidades

### 2.1 `PlanilhaDeContingencia` — a pasta inteira, antes de virar arquivo

| Campo | Tipo | Regra |
|---|---|---|
| `turma` | código, sigla do curso, modalidade, nº de alunos, data de início e de término | da linha de `turmas` lida **com a sessão de quem pede** (`FR-003`) |
| `geradaEm` | instante | relógio do servidor; exibido em `America/Sao_Paulo` (R-13) |
| `geradaPor` | nome | `usuarioDaSessao()` — o mesmo nome que o `/print/dsa` imprime |
| `lancamentosAte` | instante | igual a `geradaEm`: o que o sistema tinha naquele momento (`FR-005`) |
| `semanas` | `SemanaDaPlanilha[]` | **o ano inteiro** (`FR-030`), ressalvado o `FR-014` |
| `semanaInicial` | identidade da semana | a corrente, ou a primeira do período se a corrente estiver fora dele (`FR-022`) |
| `catalogo` | `ItemDoCatalogo[]` | chave única (§3) |
| `relogios` | `RelogioDaPlanilha[]` | um por vigência distinta do período (medido: até 2 por curso) |
| `instrutores` | nomes | só os da turma, em antiguidade (R-9, `FR-029`) |
| `tecnicas` | sigla e nome | `config_listas.metodologias` |
| `siglasDeAvaliacao` | texto[] | `SIGLAS_DE_AVALIACAO` — escrita numa faixa, **nunca** dentro da fórmula (R-6) |
| `avisos` | texto[] | degradações (`RN-DEG-01`): turma sem período, semana sem relógio, etapa não cadastrada |

### 2.2 `SemanaDaPlanilha`

| Campo | Tipo | Regra |
|---|---|---|
| `identidade` | ano ISO + número | `semanaIsoDe` (`RN-DIST-01`) |
| `rotulo` | texto | `Semana <n> — DD/MM a DD/MM/AAAA` — único na pasta; é o valor do seletor da IMPRESSÃO |
| `primeiroDia`, `ultimoDia` | data | os dias do documento (`diasDaTela`) |
| `relogio` | id de `RelogioDaPlanilha` ou nulo | nulo = TA numerados, sem horário, com aviso (`FR-009`) |
| `numeroDoDsa` | número ou nulo | **fórmula** com cache de `numeroDoDsa` (R-6) |
| `alunos` | número ou nulo | `turmas.alunos`; editável |
| `alt` | texto | vazio; editável |
| `assinaturaEsquerda`, `assinaturaDireita` | nome, posto por extenso, função | resolvidas pela vigência **na data da semana** (`FR-010`); editáveis — é aqui que vive a *Assinatura por vigência* do `spec.md` §4.7, já resolvida por semana |
| `dias` | `DiaDaPlanilha[]` | seg a sáb — o sábado **sempre** na entrada |
| `linhas` | `LinhaDeTa[]` | dias × TA da grade da pasta (§4) |
| `semPosicao` | lançamento + motivo | lista própria da semana (`FR-013`) |
| `etapa` | presencial / fora / sem etapa | só as semanas presenciais quando a etapa existe (`FR-014`) |

### 2.3 `DiaDaPlanilha`

`data`, `sigla` (`SEG`…`SÁB`), `bloqueio` (descrição do feriado de dia inteiro, ou nulo) e `avisos`
(feriado parcial ou informativo). Dia bloqueado **não** recusa lançamento na planilha — a marca fica à
vista (*Edge Cases*).

### 2.4 `LinhaDeTa` — uma linha da PREENCHIMENTO

| Campo | Tipo | Regra |
|---|---|---|
| `data`, `dia`, `ta` | data, sigla, número | fixos na geração |
| `horario`, `periodo` | texto, manhã/tarde | **fórmula** sobre a HORÁRIOS, pelo relógio da semana |
| `cod` | texto | entrada; lista `LISTA_COD` |
| `item` | texto | entrada; lista `LISTA_ITEM` |
| `chave` | texto | `cod & "|" & item` (apoio) |
| `topico`, `local`, `te`, `instrutor` | **célula de valor** (§2.7) | sugeridos pela chave; o escrito prevalece (`FR-016`) |
| `codigoDoLancamento` | texto ou vazio | o `codigo` da linha no sistema (`FR-011`, `Q-1`) |
| `conferencia` | texto | vazio quando a chave existe; frase quando não (`FR-018`) |

### 2.5 `ItemDoCatalogo` — uma linha da BD DISCIPLINAS

| Campo | Regra |
|---|---|
| `chave` | `COD|ITEM`, **única** na pasta, sem `*`, `?` nem `~` (curingas do `MATCH`) |
| `cod` | `cod_disciplina` da disciplina ativa do curso, ou a categoria `AEC`, `TAD`, `TR` ou `Estudo Individual` — o vocabulário do sistema (`FR-021`); `EI` é só a sigla que o papel imprime na coluna T/E |
| `item` | `numero_ue`; `SEM UE` (`D-DSA-1`); o tipo de avaliação; `VISTA`; `AEC` (só AEC tem disciplina — `CHECK ativ_disciplina_so_aec_da_turma`); `—` nas categorias sem disciplina |
| `tipo` | aula · aula sem UE · avaliação · vista de prova · AEC · TAD · TR · Estudo Individual |
| `disciplina` | código e nome, ou vazio |
| `topico` | tópico da UE; vazio em aula sem UE (o operador digita) |
| `chPrevista` | CH da UE, em TA, quando há UE |
| `local`, `te`, `instrutor` | `preencherLancamento` — vazio quando o cadastro não tem (R-9) |
| `contaNoNumeroDoDsa` | sim/não — preenchida pelo gerador pela mesma origem do sistema (R-6) |
| `disciplinaDaCh` | o código da disciplina cuja CH o item consome, ou vazio (R-6) |

O catálogo traz também, por disciplina, a **CH prevista** (`carga_horaria_tempos`) — é o que o rodapé
compara com a cumprida.

### 2.6 `RelogioDaPlanilha` — um bloco da HORÁRIOS

`id`, `vigenteDe`, `vigenteAte`, `origem` (regime ou catálogo), `temposDoRegime` e, por TA:
`numero`, `inicio`, `fim`, `periodo`, `excepcional` — exatamente o `Relogio` do domínio
(`horario-do-bloco.ts`), nunca recalculado.

### 2.7 `CelulaDeValor` — sugerido ou escrito

Cada um dos quatro campos sugeridos de uma `LinhaDeTa` tem **um** estado:

| Estado | O que a célula tem | Quando |
|---|---|---|
| **sugerido** | a fórmula de busca no catálogo, com o valor em cache | linha vazia; ou lançamento do sistema cujo valor é **igual** ao do catálogo |
| **escrito** | o valor, como constante | lançamento do sistema cujo valor **difere** do catálogo; ou o que o operador digitar |

Transições: digitar sobre a fórmula → **escrito** (o catálogo não a muda mais — `D-4`, `SC-006`);
apagar o escrito deixa a célula vazia, **sem** voltar a sugerir — a linha de instrução da aba diz como
restaurar (copiar a fórmula da linha de cima). ⚠️ **Por que o lançamento igual ao catálogo nasce
sugerido, e não escrito:** se nascesse escrito, trocar a chave dele offline deixaria o tópico da UE
antiga na linha, sem erro nenhum.

### 2.8 `Formula` — a árvore tipada (R-4)

Um nó é: referência (aba, linha, coluna, absoluta ou não), intervalo, número, texto, lógico,
operação binária, ou chamada de **uma das funções do vocabulário fechado**. Cada nó sabe
`escrever()` (o texto OOXML) e `avaliar(planilha)` (o valor). Não existe nó de texto livre.

## 3. Regras de validação, todas do `spec.md`

| Regra | Origem |
|---|---|
| Chave do catálogo única, sem curinga | `FR-008`, `D-6` |
| Listas de escolha tiradas do catálogo, nunca escritas à mão na regra | `FR-019` |
| Nenhum valor de erro em cache, em nenhuma célula | `FR-023`, `SC-002` |
| Nenhuma função fora do vocabulário, nenhum `_xlfn.` | `FR-031` |
| Nenhuma célula bloqueada; colunas de apoio ocultas, não protegidas | `FR-020` |
| Nenhum CPF, RG, telefone ou endereço; instrutores só da turma | `FR-029` |
| Nenhuma escrita no banco | `FR-004`, `SC-009` |

## 4. Dimensões — cálculo, não medição

- **TA por dia na grade da pasta:** o maior número de TA entre os relógios do período (≤ 12, o
  `TA_MAXIMO`) — a grade não muda de tamanho entre semanas, e as linhas sem tempo no relógio da semana
  ficam vazias.
- **Linhas da PREENCHIMENTO, na turma de 50 semanas com relógio de 9 TA:** 50 × (cabeçalho da semana +
  6 dias × 9 TA + sem posição) ≈ **3.000 linhas**. As planilhas de hoje têm 1.260 a 2.760 na mesma aba
  (`estado-atual.md` §3).
- **Fórmulas:** a IMPRESSÃO passa a ter as de **uma** semana (o seletor), contra 7.693 a 16.856 hoje
  (`estado-atual.md` §3). Contagem real e tamanho do arquivo: **[pendente — PR 1]**.
