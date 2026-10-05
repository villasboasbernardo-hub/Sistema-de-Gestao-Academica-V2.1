# Contrato — o módulo de Turmas (PR 2)

## 1. Rotas e endereços — tudo pelo módulo único

`lib/navegacao/endereco-de-turma.ts` é o **único** lugar que escreve `/turmas/…` ou `?turma=` (guarda
`endereco-de-turma-unico.test.ts`). Ele ganha:

```ts
/** A lista, com ou sem recorte de curso. "/turmas" ou "/turmas?curso=<grafia do nuqs>". */
export function enderecoDasTurmas(sigla?: string): string;

/** A seção de disciplinas da ficha: enderecoDaTurma(codigo) + "#disciplinas". */
export function enderecoDaSecaoDeDisciplinas(codigo: string): string;

/** O padrão de rota da ficha, para revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page"). */
export const ROTA_DA_FICHA_DA_TURMA = "/turmas/[turma]";
```

`enderecoDasDisciplinas(sigla, codigoDaTurma?)` **continua existindo** — com turma, o destino passa a
redirecionar; os dois consumidores de hoje trocam de função:

| Consumidor hoje | Chamada hoje | Passa a |
|---|---|---|
| `app/(app)/cursos/[curso]/AbaGrade.tsx:125` (botão *Disciplinas*) | `enderecoDasDisciplinas(sigla, turmaAtual?.codigo)` | com turma: `enderecoDaSecaoDeDisciplinas(codigo)`; sem turma: `enderecoDasDisciplinas(sigla)` |
| `app/(app)/turmas/[turma]/page.tsx:182` (*Ver as disciplinas desta turma*) | `enderecoDasDisciplinas(sigla, codigo)` | âncora `#disciplinas` na própria página |

## 2. `/turmas` — a lista

| Elemento | Seletor | Promessa |
|---|---|---|
| Título | `getByRole("heading", { level: 1 })` = *"Turmas"* | — |
| Contagem | `[data-slot="contagem-de-turmas"]` | *"N turma(s)"* do recorte |
| Filtros | `[data-slot="filtros-de-turmas"]` com `FiltroAvancado` (curso, ano, situação) + busca | cada mudança escreve a URL (`?curso=&ano=&situacao=&busca=`) |
| Limpar | `BotaoLimparFiltros` — presente **só** com filtro fora do padrão | padrão = todos vazios (D4) |
| Tabela | `TabelaDensa` com `rotulo="Turmas"`; linha `[data-turma="<codigo>"]` | colunas: Turma (rótulo por `rotuloDaTurma`), Curso (sigla — nome), Ano, Início, Término, Situação (`BadgeStatus`), Alunos |
| Linha → ficha | ativar a linha (clique, `Enter`) → `router.push(enderecoDaTurma(codigo))` | `expect.poll(pathname).toBe(enderecoDaTurma(codigo))` |
| Vazio, há permissão | `EstadoVazio motivo="sem-dado"` — *"Nenhuma turma neste recorte. Afrouxe ou limpe os filtros."* | distingue *não há* |
| Vazio, sem permissão / fora do alcance | `EstadoVazio motivo="sem-permissao"` | distingue *você não vê* (`alcanceDoPerfil`) |
| Erro de leitura | `EstadoVazio motivo="sem-permissao"`, sem estourar | `RN-DEG-01` |

Ordem da lista: `ano_letivo` ↓, `codigo` ↑. **Uma** consulta de turmas por tela; as opções de curso
em `Promise.all`.

## 3. `/turmas/[turma]` — a ficha, com a ordem nova das seções

```
<header>
  <h1 data-slot="codigo-da-turma">                       (já existe)
  <a data-slot="voltar-a-lista" href=enderecoDasTurmas()> ← Turmas       (NOVO; substitui voltar-ao-curso)
  <a data-slot="curso-da-turma" href=/cursos/<sigla>>     {sigla} — {nome}  (o curso, a um clique — D-NAV-3)
  <dl data-slot="cabecalho-da-turma">                     início · término · situação · alunos · modalidade (FR-021)
</header>
<QuadroDeAvisosDaTurma>                                   (já existe)
<section id="andamento" data-slot="andamento-da-turma">   (PR 3)
<section id="disciplinas" data-slot="disciplinas-da-turma">  (PR 2 — o bloco movido; PR 3 acrescenta executada e %)
<FormularioDeTurma modo="edicao"> | <dl somente-leitura>  (já existe — "a ficha É o formulário")
```

⚠️ `[data-slot="voltar-ao-curso"]` **deixa de existir** — `turmas.spec.ts:180-185` é reescrito.

### 3.1 A seção Disciplinas (`DisciplinasDaTurma.tsx`, folha de cliente)

- Dado: `lerGradeDeDisciplinas({ cursoCodigo, turmaCodigo })` — a mesma função de `/disciplinas`.
- Linhas: só as disciplinas **com linha em `turma_disciplina`** (o filtro `porTurmaDisciplina` que
  `consulta.ts:412-414` já aplica).
- Colunas no PR 2: Disciplina · CH prevista · Período previsto · Instrutores · Situação. No PR 3
  entram CH executada e %.
- Detalhe (linha expandida, `?aberta=`): `PainelDePeriodo` e `PainelDeInstrutores` — **os mesmos
  arquivos** de `app/(app)/disciplinas/paineis/`, com as **mesmas** Server Actions. A edição é a de hoje.
- `useParametro("/turmas/[turma]", "aberta")` — exige `aberta` no contrato da ficha.
- Vazia: *"Esta turma ainda não tem disciplinas na grade."*

## 4. `/disciplinas` — o que sai, e o redirecionamento

| Antes | Depois |
|---|---|
| `?turma=` escolhe uma turma e liga o bloco por turma | `?turma=Y` → `redirect(enderecoDaSecaoDeDisciplinas(Y))` **antes de qualquer consulta**; `?curso=` é descartado no caminho |
| `[data-slot="seletor-turma"]` na cascata | some — a cascata vira só curso (`CascataDeCursoETurma` perde a turma e é renomeada para `SeletorDeCursoDoCatalogo` *(nome a confirmar no tasks)*) |
| filtros `situacao_turma` e `instrutor` | saem do contrato e da tela (D5) |
| detalhe com *"Período previsto e instrutores são por turma. Escolha uma turma acima"* | o detalhe por curso mostra o cadastro e as UEs; a frase passa a apontar para a ficha da turma |

**Endereços antigos que a suíte cobre (`SC-004` da spec):**

| Endereço | Resultado esperado |
|---|---|
| `/disciplinas?curso=X&turma=Y` | 307 → `/turmas/<Y codificado>#disciplinas`, ficha aberta, seção visível |
| `/disciplinas?turma=Y` (sem curso) | idem |
| `/disciplinas?curso=X` | catálogo do curso, como hoje |
| `/cursos/X?turma=Y` | página do curso com a turma selecionada, como hoje |
| `/cursos/X?aba=grade&turma=Y` | idem |
| `/turmas/<Y>` | a ficha, como hoje |
| `/disciplinas?curso=X&turma=<inexistente>` | redireciona; a ficha diz *"não encontrada"* com caminho para a lista |

## 5. `/cursos/[curso]` — a aba Grade

- A tabela `turmas-do-curso` continua; cada linha → `enderecoDaTurma(codigo)` (já é assim).
- **Novo:** link *"Ver todas as turmas"* (`data-slot="ver-todas-as-turmas"`) → `enderecoDasTurmas(sigla)`.
- O botão *Disciplinas* com turma selecionada → `enderecoDaSecaoDeDisciplinas(codigo)`.

## 6. Menu e guardas

- `MENU` ganha `{ rotulo: "Turmas", rota: "/turmas", icone: "turmas", disponivel: true, entregaEm: "Épico 5.5" }`
  na terceira posição — **no mesmo commit** da página (`shell.spec.ts:70-92` cobra os dois sentidos).
- `contrato-de-parametros.test.ts:407-438` (`FR-031.7`) é **invertido** em guarda de presença, citando a
  **D-NAV-1 (04/10/2026)** como a validação que substitui a MENU-1.
- `fronteira-das-telas.test.ts` `FOLHAS_DE_CLIENTE` ganha `FiltrosDeTurmas.tsx`, `TabelaDeTurmas.tsx` e
  `turmas/[turma]/DisciplinasDaTurma.tsx`, com uma frase cada.
- Revalidação: `definirPeriodoDaTurma` e `definirInstrutoresDaTurma` acrescentam
  `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")`.

## 7. Percursos por clique (e2e)

1. **menu → Turmas → lista → ficha:** `entrar(page, EMAIL, "/inicio")` → link *Turmas* no `nav` →
   pathname `/turmas` → `[data-turma="<codigo>"]` → pathname `enderecoDaTurma(codigo)` →
   `[data-slot="codigo-da-turma"]` com o texto → `[data-slot="voltar-a-lista"]` → `/turmas`.
2. **filtros na URL:** escolher curso e situação → URL carrega `?curso=&situacao=` → `page.goto(url)`
   em contexto novo reproduz a lista → `BotaoLimparFiltros` presente → clicar → URL limpa.
3. **curso → turma → ficha:** `/cursos` → `[data-curso]` → aba Grade → `[data-linha-turma] a` → ficha;
   e `[data-slot="ver-todas-as-turmas"]` → `/turmas?curso=<sigla>` com a lista recortada.
4. **disciplina → turma → ficha na seção:** menu → Disciplinas → curso → (não há mais turma ali) → o
   detalhe aponta para a ficha; e o **endereço antigo** `/disciplinas?curso=X&turma=Y` por `goto`
   chega a `#disciplinas` com `[data-slot="disciplinas-da-turma"]` visível.
5. **editar na seção:** abrir uma linha → `PainelDePeriodo` → gravar → a ficha mostra o período novo
   **sem recarregar à mão** (revalidação).
