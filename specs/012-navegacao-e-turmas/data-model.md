# Modelo de dados — spec 012

> **Nenhuma tabela, coluna, view ou policy muda nesta fatia.** O que há de "modelo" aqui são (1) um
> estado de interface que vive em cookie, (2) três entradas do contrato de parâmetros da URL,
> (3) um campo novo numa estrutura de código (`EntradaDeMenu`) e (4) os tipos de entrada e saída do
> módulo puro de andamento. Tudo medido em 04/10/2026 contra `lib/tipos/database.ts` e as migrations
> citadas em `research.md`.

## 1. Estado da lateral — cookie, fora do banco e fora da URL

| Campo | Valor |
|---|---|
| Nome | `ciaara-lateral` |
| Valores | `fixada` · `recolhida` — qualquer outro valor (ou ausência) vale `recolhida` |
| Escopo | `path=/`, `SameSite=Lax`, `Max-Age=31536000` (um ano); `Secure` quando a página é `https:` |
| Quem escreve | a folha de cliente da lateral, por `document.cookie`, ao acionar o controle de fixar |
| Quem lê | `app/(app)/layout.tsx`, por `cookies()` de `next/headers`, a cada requisição |
| Onde se aplica | só acima do ponto de quebra `lg` (1024px); abaixo dele o estado **não tem efeito** (gaveta) |
| Por que não está na URL | **D-NAV-2** — estado de interface, não de navegação; compartilhar um endereço não impõe a largura do menu de quem o abriu |
| Por que não está no banco | não é dado de negócio nem de conta; é preferência de **um navegador** |

**Regras:** ausência → recolhida (primeiro acesso); valor desconhecido → recolhida, sem erro;
o servidor renderiza o atributo `data-fixada` já com o valor lido (sem flash, `FR-005`).

## 2. `EntradaDeMenu` — ganha o ícone

```ts
export type NomeDeIcone =
  | "inicio" | "cursos" | "turmas" | "disciplinas"
  | "instrutores" | "cronograma" | "atividades" | "administracao";

export type EntradaDeMenu = {
  readonly rotulo: string;
  readonly rota: string;
  readonly icone: NomeDeIcone;      // NOVO — identificador, nunca componente (menu.ts é lido sem DOM)
  readonly disponivel: boolean;
  readonly entregaEm: string;
};
```

A lista `MENU` passa a ter **oito** entradas, na ordem da **D-NAV-1**: Início · Cursos · **Turmas** ·
Disciplinas · Instrutores · Cronograma · Atividades · Administração. `Turmas` entra com
`disponivel: true` **no mesmo commit** da página (`FR-015`). O mapa `NomeDeIcone → componente lucide`
vive em `components/casca/icones-do-menu.tsx`; a proposta dos oito está no lote de dúvidas (D2).

## 3. O contrato de parâmetros — o que entra, o que sai, o que muda

### 3.1 `/turmas` — rota NOVA

| Parâmetro | Tipo | Padrão | Opções | Histórico | Avisa servidor |
|---|---|---|---|---|---|
| `curso` | texto | `""` | — (o domínio é o dado) | substitui | sim |
| `ano` | texto | `""` | — | substitui | sim |
| `situacao` | escolha | `""` *(D4)* | `SITUACOES_DE_TURMA` = `status_turma` do banco: `planejada`, `ativa`, `concluida`, `cancelada` | substitui | sim |
| `busca` | texto | `""` | — | substitui | sim, com `limiteDeFrequenciaMs` |

`origem: "RF-CURSO-01"`. ⚠️ `SITUACOES_DE_TURMA` é constante **nova** no contrato — `SITUACOES_DE_CADASTRO`
é `status_registro` (`ativo|inativo`) e não serve. Os rótulos de tela vêm de
`ROTULO_DO_STATUS_DE_TURMA` (`lib/dominio/seletor-de-turma.ts`), único lugar.

### 3.2 `/turmas/[turma]` — ganha `aberta`

| Parâmetro | Tipo | Padrão | Histórico | Avisa servidor |
|---|---|---|---|---|
| `aberta` | texto | `""` | substitui | **não** (é parâmetro visual: a linha expandida da seção Disciplinas) |

Hoje `parametros: {}`, com asserção em `contrato-de-parametros.test.ts:400-404` de que as rotas de
formulário não declaram parâmetro — a asserção é emendada para nomear `aberta` como a exceção, com a
razão (a folha `DisciplinasDaTurma` usa `useParametro("/turmas/[turma]", "aberta")`, tipado por rota).

### 3.3 `/disciplinas` — perde dois, mantém um por razão declarada *(D5)*

| Parâmetro | Destino | Por quê |
|---|---|---|
| `turma` | **fica**, com papel único de **endereço antigo**: presente → `redirect` para a ficha | sem ele `lerParametros` descarta o valor e o endereço antigo quebra (`FR-019`) |
| `situacao_turma` | **sai** | só tinha efeito com o bloco por turma (`GradeDeDisciplinas.tsx:204-224`) |
| `instrutor` | **sai** | idem |
| `curso`, `situacao`, `busca`, `aberta` | ficam | são do catálogo por curso |

## 4. O que a lista `/turmas` lê

Uma consulta em `turmas`, com embed do curso, sob a policy `turmas_ler`
(`app.pode('turmas','ler') and app.alcanca_curso(curso_id)`):

```
turmas: id, codigo, turma, ano_letivo, status, modalidade, data_inicio, data_termino, alunos,
        cursos!inner(codigo, nome_curso)
```

Filtros aplicados por `montarConsultaDeTurmas` (pura): `cursos.codigo = curso` · `ano_letivo = ano` ·
`status = situacao` · `busca` normalizada contra `codigo` (ilike). Ordem: `ano_letivo` ↓, `codigo` ↑.
Rótulo de linha: `rotuloDaTurma({ codigo, ano, dataInicio, status })`. As opções do filtro de curso vêm
de `cursos` (`codigo, nome_curso`, `status = ativo`) — também recortadas por `cursos_ler`, logo já são
só o alcance.

## 5. O andamento — tipos do módulo puro

```ts
export type RegimeDoCurso = {
  readonly regimePadraoTempos: number | null;     // vw_cursos_regime_vigente.regime_padrao_tempos (TA/dia)
  readonly limiteDiarioEadHoras: number | null;   // vw_cursos_regime_vigente.limite_diario_ead_horas (horas/dia; 1 TA = 1 h)
};

export type TurmaParaAndamento = {
  readonly status: string;                        // turmas.status — 'ativa' é o único que acusa atraso
  readonly modalidade: string;                    // turmas.modalidade — escolhe a coluna do regime (RN-MAT-04)
  readonly dataTermino: string | null;            // turmas.data_termino, yyyy-mm-dd
  readonly prevista: number;                      // vw_carga_horaria_turma.chr_curricular
  readonly executada: number;                     // vw_carga_horaria_turma.chd_executada (RN-CRONOS-01, via view)
};

export type SituacaoDaCapacidade = "calculada" | "sem_regime" | "sem_termino";

export type Andamento = {
  readonly prevista: number;
  readonly executada: number;
  readonly restante: number;                      // max(prevista − executada, 0)
  readonly percentual: number | null;             // round(100·executada/prevista); null se prevista = 0
  readonly semLancamentos: boolean;               // executada = 0  → "ainda sem lançamentos"
  readonly capacidadeDiaria: number | null;       // TA/dia pela modalidade; null = sem dado
  readonly diasUteis: number | null;              // seg–sex de hoje a termino, inclusivos, − feriados dia inteiro (datas distintas)
  readonly capacidade: number | null;             // diasUteis × capacidadeDiaria
  readonly saldo: number | null;                  // capacidade − restante   ← "Saldo de capacidade (TA)"
  readonly saldoEmDias: number | null;            // floor(saldo / capacidadeDiaria)
  readonly situacaoDaCapacidade: SituacaoDaCapacidade;
  readonly emAtraso: boolean;                     // status = 'ativa' && saldo < 0  (RF-INI-01)
};
```

**Invariantes:** `emAtraso` só é `true` com `situacaoDaCapacidade = "calculada"`; `restante ≥ 0`;
`capacidadeDiaria ≤ 0` ou nula → `sem_regime`; `dataTermino` nula → `sem_termino`; `termino < hoje` →
`diasUteis = 0` (capacidade zero, saldo = −restante).

### 5.1 Feriado — o que o módulo recebe

Uma lista de datas `yyyy-mm-dd`, já filtrada por `impacto = 'dia_inteiro'` e `status = 'ativo'`, no
intervalo `[hoje, termino]`. O módulo trata como **conjunto** (datas distintas) e ignora as que caem
em sábado ou domingo. Lida de `public.feriados` sob `feriados_ler` (leitura ampla a conta ativa).
`parcial` e `informativo` **não** entram na lista — é a `RN-EVT-02` aplicada antes do módulo, e o
módulo não precisa conhecer o enum.

### 5.2 Por disciplina — reaproveitado, não modelado de novo

A seção Disciplinas da ficha consome `LinhaDaGradeDeDisciplinas` de
`app/(app)/disciplinas/consulta.ts` (já existente): `cargaHorariaTempos` (prevista),
`temposExecutados` (de `vw_disciplinas_execucao.ta_executados`), `previsaoInicio`/`previsaoTermino`,
instrutores atribuídos com `temposPrevistos`. O percentual por disciplina é
`round(100·executados/previstos)` com prevista zero → `null`, calculado na folha a partir dessas
colunas — **nenhum tipo novo**.

## 6. O que NÃO muda, e é verificado

- Zero migrations. A impressão digital do esquema (`scripts/provas/impressao_digital_do_esquema.sql`)
  é a mesma antes e depois dos três PRs.
- Zero policies novas; `turmas_ler`, `cursos_ler`, `feriados_ler` e `curso_regime_historico_ler`
  seguem como estão (migration `20260830000111`).
- `vw_carga_horaria_turma`, `vw_cursos_regime_vigente` e `vw_disciplinas_execucao` não são tocadas —
  o que falta a elas (`data_termino`, `modalidade` da turma) vem de `turmas` por junção em memória.
