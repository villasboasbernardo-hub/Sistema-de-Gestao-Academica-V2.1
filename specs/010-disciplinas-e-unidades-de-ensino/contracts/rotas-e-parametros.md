# Contrato — rotas, parâmetros de URL e caminhos clicáveis (fatia (b))

**Spec**: [../spec.md](../spec.md) · **Guia**: `docs/guias/estado-na-url.md` · **Contrato tipado**:
`lib/navegacao/contrato.ts` (parâmetro fora dele **não compila**, spec 008).

## 1. Rotas — uma página nova, edição por painel

| Rota | Segmento | Tipo | Chega por clique de | Permissão da página |
|---|---|---|---|---|
| `/disciplinas` | `app/(app)/disciplinas/page.tsx` (+ `loading.tsx`, `error.tsx`, `consulta.ts`) | Server Component | menu **Disciplinas** (`menu.ts:73` passa a `disponivel: true`); botão *"Disciplinas"* na aba *Grade* de `/cursos/[curso]` (leva com `?curso=` preenchido) e na ficha `/turmas/[turma]` (leva com `?curso=&turma=`) | `disciplinas.ler` (os 9 perfis) — a página abre para todos; botões de escrita sob `SePodeVer` |

**Não existem** `/disciplinas/nova`, `/disciplinas/[id]` nem `/disciplinas/[id]/editar` — decisão Q-15
(painel): criar, editar, período/instrutores, UEs e excluir abrem **diálogos sobre a página**, e o
estado do diálogo **não vai para a URL** (proibição 3 do documento 25 §3.3: estado efêmero de UI).

## 2. Parâmetros de `/disciplinas` (`contrato.ts`)

| Parâmetro | Tipo | Padrão | Histórico | Avisa servidor | Significado |
|---|---|---|---|---|---|
| `curso` | `texto` (sigla, `cursos.codigo`) | `""` | `empilha` | sim | 1º degrau da cascata. Vazio = tela pede o curso; **não** é beco |
| `turma` | `texto` (código de turma **codificado**, pela função única de `endereco-de-turma.ts`) | `""` | `empilha` | sim | 2º degrau. Vazio = visão de catálogo do curso (`FR-004`). Turma de **outro** curso → a turma resolve o curso e o parâmetro incoerente é descartado com aviso |
| `instrutor` | `texto` (`instrutores.codigo`) | `""` | `substitui` | sim | filtro: só disciplinas com este instrutor **na turma** |
| `situacao_turma` | `escolha` (`planejada`, `ativa`, `concluida`, `cancelada`, `""`) | `""` | `substitui` | sim | filtro da spec 037 `FR-001` |
| `situacao` | `escolha` (`nao_iniciada`, `em_andamento`, `concluida`, `atrasada`, `""`) | `""` | `substitui` | sim | situação de **execução** (Q-14) |
| `busca` | `texto` | `""` | `substitui` | não | texto livre em código/nome (cliente) |
| `aberta` | `texto` (`disciplinas.codigo`) | `""` | `substitui` | não | a linha **expandida** — reproduz a vista para quem cola o endereço (`FR-003`) |

Trocar `curso` ou `turma` **reinicia** `instrutor`, `situacao_turma`, `situacao` e `aberta` (spec 037
`FR-005`). `Limpar filtros` (`botao-limpar-filtros.tsx`) volta `instrutor`, `situacao_turma`,
`situacao` e `busca` ao padrão — **mantém** `curso` e `turma`, que são navegação, não filtro.

Divergência com o documento 25 (que lista `curso, status, busca`) fica registrada como **D-6** na spec;
o contrato tipado é a fonte.

## 3. Caminhos clicáveis novos — todos varridos por `toda-tela-tem-caminho.test.ts`

| De | Para | Rótulo | Condição |
|---|---|---|---|
| menu | `/disciplinas` | Disciplinas | sempre (a página é de leitura) |
| `/cursos/[curso]` aba Grade | `/disciplinas?curso=<sigla>` | *Ver disciplinas* | sempre |
| `/turmas/[turma]` | `/disciplinas?curso=<sigla>&turma=<código>` | *Disciplinas da turma* | sempre |
| `/disciplinas` (atribuição sem habilitado) | `/instrutores/[codigo]` | *habilitar na ficha do instrutor* | quando a lista de habilitados está vazia (`FR-033`) |
| `/disciplinas` linha | `/turmas/[turma]` | código da turma | quando há turma |

## 4. Percursos e2e por clique (só o primeiro `goto`)

`tests/e2e/disciplinas.spec.ts`: `goto('/inicio')` → menu *Disciplinas* → escolhe curso → escolhe turma
→ expande linha → painel de período → salva → confere `T1` intacta; volta ao curso pela aba Grade e
chega em `/disciplinas` pelo botão. Casos que discriminam: operador vê *Excluir* **ausente** e, por
chamada direta à RPC, recebe `42501`; ajudante exclui a de amostra; excluir com dependente recebe a
frase de *"desative em vez de excluir"*.
