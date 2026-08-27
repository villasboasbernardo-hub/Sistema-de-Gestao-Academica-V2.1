---
title: "CIAARA-11 v2.1 — Camada de Dados e Estado (Fase 2, documento 25)"
author: "Arquiteto Chefe de Software — CIAARA-11 / Departamento de Ensino"
date: "25/08/2026"
version: "2.1"
origem: "BRIEF-v2.1 §1, §6 · documento 20 (Arquitetura Alvo) · documento 24 (Estrutura e Convenções) · docs/arquitetura/04-appstate.md (v2.0) · RF-NAV-01..03 · RNF-MAN-02"
---

# Camada de Dados e Estado

> Este documento decide **onde cada pedaço de estado vive** na v2.1 e **como o dado chega à tela**.
> Ele detalha o BRIEF §6 e pressupõe o documento 20 (fronteira servidor/cliente, fluxo de leitura,
> fluxo de escrita, tradução de erro). O que já está lá **não é repetido aqui** — é citado.

## 0. O mapa de decisão em uma tabela

A pergunta operacional é sempre a mesma: *"onde este estado mora?"*. Há quatro respostas possíveis,
e apenas quatro.

| Natureza do estado | Mora em | Sobrevive a F5? | Vai no link? | Exemplo no CIAARA-11 |
|---|---|---|---|---|
| **Navegação e contexto de tela** | **URL** (`searchParams` via `nuqs`) | sim | sim | curso, turma, semana, ano, filtros, aba ativa |
| **Dado do sistema** | **servidor** (RSC + Server Actions) | sim | — | instrutores, disciplinas, lançamentos do DSA |
| **Interação intensa no cliente** | **TanStack Query** (exceção) | não | — | grade do DSA em edição inline |
| **Efêmero de UI** | **Zustand / `useState`** | não | não | rascunho de formulário longo, seleção múltipla |

**Regra de precedência:** tente a URL primeiro. Se não couber na URL, tente o servidor. Se o servidor
não bastar, TanStack Query. Zustand é o último recurso, e é raro. Todo estado que "vaza" para o
nível seguinte precisa de justificativa escrita no PR.

---

## 1. Estado na URL — `nuqs` no lugar do `AppState`

### 1.1 O que a v2.0 fazia, e por quê

O `AppState` (`_Comum.html`, `04-appstate.md`) foi a resposta certa para o problema errado. Ele
resolveu a dispersão de globais da v1.0 (`CTX`, `turmaSel`, `cursoSel`, `DIAG`, `CRONOS_STATE`,
`INICIO_STATE`, `CRUD_UI`) num objeto único com `setCurso`/`setTurma`/`setFiltro`/`invalidar`/
`onChange`. Funcionou: o Épico D fechou a lacuna de invalidação cruzada entre views.

Mas o `AppState` vivia **na memória da aba do navegador**. Consequências que o próprio documento
04 registra como não resolvidas:

- deep-link e histórico do navegador eram **"avaliação, não compromisso"** — entrariam só se não
  arriscassem `RF-NAV-03`;
- `irPara(alvo)` trocava a view sem mexer na URL, então voltar/avançar não funcionava;
- recarregar a página zerava curso, turma, semana e todos os filtros;
- compartilhar "a tela que eu estou vendo" era impossível — só se descrevia por escrito o caminho
  de cliques;
- os deep-links que existiam (`?editarInstrutor=ID`, `?novoInstrutor=1`, specs 016/017) foram
  enxertados um a um, cada um com o seu próprio scriptlet injetado no `Index.html` e a sua própria
  função de verificação no boot.

**[MIGRAÇÃO v2.1]** Na v2.1 o `AppState` **deixa de existir como objeto**. `RF-NAV-01/02/03` são
**[PRESERVADOS]**; o mecanismo passa a ser a URL, e o que era "avaliação" vira consequência
automática do mecanismo.

| Global v1.0 | Destino v2.0 (`AppState`) | Destino v2.1 |
|---|---|---|
| `CTX` | `AppState.ctx` | sessão do Supabase + RSC (o servidor resolve a cada requisição) |
| `cursoSel` | `AppState.cursoSelecionado` | `?curso=` na URL |
| `turmaSel` | `AppState.turmaSelecionada` | segmento `/turmas/[turma]` ou `?turma=` |
| `DIAG.filtros`, filtros de Instrutores | `AppState.filtros.<view>` | `?filtros=` / parâmetros nomeados |
| `INICIO_STATE.dash`, `CRONOS_STATE.dados`, `DIAG.dados` | `AppState.cache.<view>` | cache do Next.js + `revalidatePath`/`revalidateTag` (§5) |
| `TAB_LOADERS` / `irPara` | `Router.navegar` | roteador do App Router (`<Link>`, `router.push`) |
| `CRUD_UI` | local ao componente | `useState` no componente — **continua não sendo estado de navegação** |

### 1.2 O que isso destrava (`RF-NAV`, BRIEF §0)

| Capacidade | v2.0 | v2.1 | Como funciona |
|---|---|---|---|
| **Deep-link** | enxertado caso a caso | nativo | `/turmas/TUR-000012/dsa?semana=34&ano=2026` abre exatamente aquela grade |
| **Voltar / avançar** | não | sim | cada mudança de filtro é uma entrada no histórico (ou não — ver `history: "replace"`) |
| **Recarregar sem perder contexto** | não | sim | o estado está na barra de endereço, não na memória |
| **Compartilhar a tela** | não | sim | copiar a URL e colar no chat é o fluxo inteiro |
| **Favoritar uma visão** | não | sim | "DSA da turma X, semana corrente" vira um favorito do navegador |
| **Abrir em nova aba** | perdia o contexto | preserva | duas semanas do DSA lado a lado, para comparar |
| **Reportar um problema** | "clique em tal, depois tal" | colar a URL | reduz o custo de suporte a quase zero |

### 1.3 Mapa de parâmetros por tela

Contrato único do sistema. Nome de parâmetro é **`snake_case` curto**; valor é **o `codigo` de
negócio** (`CUR-000004`, `TUR-000012`) e nunca o `uuid` — o `codigo` é legível, estável e rastreável
até a v2.0 (BRIEF §2), e um `uuid` na barra de endereço não diz nada a ninguém.

| Rota | Parâmetros | Tipo | Padrão | Origem |
|---|---|---|---|---|
| `/inicio` | `classificacao` | texto | `""` (todas) | RF-INI |
| `/cursos/[curso]` | `aba`, `turma` | texto | `"grade"`, `""` | RF-CURSOS |
| `/turmas/[turma]/dsa` | `semana`, `ano` | inteiro | semana/ano correntes | RF-DSA-01 |
| `/cronograma` | `curso`, `ano`, `granularidade`, `visao` | texto/int | `""`, ano corrente, `"semana"`, `"previsto_executado"` | RF-CRONOS-01..08 |
| `/avaliacoes` | `curso`, `turma`, `status` | texto | `""` | RF-AVAL |
| `/atividades` | `curso`, `turma`, `categoria` | texto | `""` | RN-EVT-01 |
| `/relatorio` | `curso`, `ano`, `secoes` | texto/lista | `""`, ano corrente, todas | RF-REL |
| `/instrutores` | `curso`, `posto`, `circulo`, `categoria`, `om`, `capacitacao`, `status`, `busca` | texto | `""` | spec 015 (8 filtros estritos) |
| `/disciplinas` | `curso`, `status`, `busca` | texto | `""` | RF-MATERIAS |
| `/admin/usuarios` | `perfil`, `escopo`, `status` | texto | `""` | RF-AUTH-05 |
| `/print/*` | os mesmos da tela de origem | — | — | RNF-COMP-01 |

Regras do contrato:

1. **Parâmetro no valor padrão não aparece na URL.** `nuqs` remove `?status=` quando o valor volta
   ao padrão — a URL fica curta e o link compartilhado não carrega ruído.
2. **A rota de impressão herda os parâmetros da tela de origem**, sem tradução. `/print/dsa?turma=…&semana=…&ano=…`
   imprime exatamente o que está na tela.
3. **Identidade vai no caminho; recorte vai na query.** A turma identifica a tela do DSA → segmento
   dinâmico. A semana recorta a mesma tela → query. Isso mantém `revalidatePath` preciso (§5).

### 1.4 O código

```ts
// lib/estado/parametros-dsa.ts
//
// Um módulo de parâmetros por tela. Centraliza parser, padrão e política de histórico —
// para que duas telas nunca discordem sobre o que "?semana=" significa.

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { semanaIsoDeHoje } from "@/lib/dominio/calendario/semana-iso"; // função pura (documento 20 §6)

/**
 * Definição dos parâmetros da tela de DSA.
 *
 * O quê: descreve cada parâmetro da URL — como ler, como escrever, qual o padrão.
 * Para quê: substituir `AppState.setTurma()/setFiltro()` por algo que o navegador já sabe fazer.
 * Como: `parseAsInteger` converte string→number nos dois sentidos; `.withDefault()` define o
 *       valor quando o parâmetro está ausente — e faz `nuqs` OMITIR o parâmetro quando ele
 *       volta ao padrão, mantendo a URL limpa.
 */
export const parametrosDsa = {
  // Semana ISO (1..53). Padrão calculado, não constante: a tela abre na semana corrente.
  semana: parseAsInteger.withDefault(semanaIsoDeHoje()),
  // Ano letivo. Padrão: ano corrente.
  ano: parseAsInteger.withDefault(new Date().getFullYear()),
  // Filtro opcional de disciplina, por `codigo` de negócio (nunca uuid).
  disciplina: parseAsString.withDefault(""),
};

/**
 * Hook de leitura/escrita dos parâmetros do DSA (Client Component).
 *
 * O quê: devolve `[valores, definir]`, como um `useState` — só que a fonte de verdade é a URL.
 * Para quê: navegar de semana em semana sem estado local e sem perder o link.
 * Como: `useQueryStates` assina os parâmetros; escrever dispara navegação do App Router, que
 *       re-executa o Server Component da rota com os novos `searchParams`. O dado novo vem do
 *       servidor — não há refetch manual, não há `AppState.invalidar()`.
 */
export function useParametrosDsa() {
  return useQueryStates(parametrosDsa, {
    // "push" = cria entrada no histórico. Trocar de semana é navegação de verdade: o usuário
    // espera que "voltar" retorne à semana anterior. Para filtros de digitação use "replace",
    // senão cada tecla vira uma entrada no histórico (§1.6).
    history: "push",
    // Mantém a UI responsiva durante a transição do RSC: os controles não "congelam" enquanto
    // o servidor devolve a grade nova.
    shallow: false,
  });
}
```

```tsx
// app/(app)/turmas/[turma]/dsa/_componentes/barra-navegacao-semana.tsx
"use client"; // ILHA: precisa de manipulador de evento. A grade continua Server Component (doc. 20 §2).

import { useParametrosDsa } from "@/lib/estado/parametros-dsa";

/**
 * Navegação semanal do DSA — o sucessor direto de `AppState.setSemana()` da v2.0.
 *
 * Diferença essencial: aqui não existe "estado da barra". A barra LÊ a URL e ESCREVE na URL.
 * Não há como a barra e a grade discordarem sobre qual semana está aberta, porque só há uma
 * fonte de verdade — e ela está visível na barra de endereço.
 */
export function BarraNavegacaoSemana() {
  const [{ semana, ano }, definir] = useParametrosDsa();

  // Avança/retrocede tratando a virada de ano. 53 semanas ISO existem em anos específicos;
  // a aritmética exata mora em lib/dominio/calendario/ — aqui só se navega.
  function irPara(delta: number) {
    const nova = semana + delta;
    if (nova < 1) definir({ ano: ano - 1, semana: 52 });        // aproximação; o servidor normaliza
    else if (nova > 53) definir({ ano: ano + 1, semana: 1 });
    else definir({ semana: nova });                              // atualiza só o que mudou
  }

  return (
    <nav aria-label="Navegação de semana">
      <button type="button" onClick={() => irPara(-1)} aria-label="Semana anterior">←</button>
      <strong>Semana {semana} / {ano}</strong>
      <button type="button" onClick={() => irPara(+1)} aria-label="Próxima semana">→</button>
      {/* Voltar à semana corrente = escrever `null`, que restaura o padrão E remove o parâmetro da URL. */}
      <button type="button" onClick={() => definir({ semana: null, ano: null })}>Semana atual</button>
    </nav>
  );
}
```

Do lado do servidor não há hook nenhum — a página lê `searchParams` diretamente (padrão no
documento 20 §3.2). Isso é o ponto: **o mesmo estado serve à ilha cliente e ao Server Component,
sem sincronização.**

### 1.5 Filtros combinados — o caso dos instrutores

A tela de instrutores tem 8 filtros estritos (spec 015). Duas formas de representá-los:

```ts
// lib/estado/parametros-instrutores.ts
import { parseAsString, parseAsArrayOf, useQueryStates } from "nuqs";

export const parametrosInstrutores = {
  // Filtros de valor único: um parâmetro nomeado cada. URL legível, favoritável, depurável.
  curso: parseAsString.withDefault(""),
  posto: parseAsString.withDefault(""),
  circulo: parseAsString.withDefault(""),
  categoria: parseAsString.withDefault(""),
  om: parseAsString.withDefault(""),
  capacitacao: parseAsString.withDefault(""),
  status: parseAsString.withDefault("ativo"), // padrão de negócio: a tela abre nos ativos
  busca: parseAsString.withDefault(""),

  // Filtro multivalorado: lista separada por vírgula (`?classificacoes=regular,expedito`).
  // Preferido a JSON codificado — continua legível na barra de endereço, que é metade do valor
  // de ter o estado na URL.
  classificacoes: parseAsArrayOf(parseAsString, ",").withDefault([]),
};

export function useParametrosInstrutores() {
  return useQueryStates(parametrosInstrutores, {
    // "replace" para filtros: digitar "Silva" na busca não deve empilhar 5 entradas no histórico.
    // Trocar de semana é navegação ("push"); refinar um filtro é ajuste da mesma tela ("replace").
    history: "replace",
    // Agrupa escritas do mesmo tick numa única navegação — marcar 3 caixas seguidas gera
    // uma requisição ao servidor, não três.
    throttleMs: 300,
  });
}
```

**Por que não `?filtros=<json-base64>`:** cabe tudo, mas mata a legibilidade, quebra o favorito
quando o formato muda, impede que alguém edite a URL à mão para investigar, e transforma um bug de
filtro em arqueologia de decodificação. `?filtros=` só é aceitável para estado realmente opaco —
e no CIAARA-11 não há nenhum. **Decisão: parâmetros nomeados sempre.**

### 1.6 `push` × `replace` — a única regra que se erra na prática

| Ação | Política | Motivo |
|---|---|---|
| Trocar semana, ano, curso, turma, aba | `push` | é navegação; "voltar" precisa desfazer |
| Digitar numa busca | `replace` + `throttleMs` | senão cada tecla vira uma entrada no histórico |
| Marcar/desmarcar filtro | `replace` | refinamento da mesma tela |
| Ordenar coluna de tabela | `replace` | idem |
| Abrir painel/modal que altera a URL | `push` | "voltar" fecha o painel — comportamento esperado no celular |

---

## 2. Estado de servidor — RSC é o padrão, TanStack Query é a exceção

### 2.1 O padrão

**Todo dado do sistema chega por Server Component.** O fluxo de leitura está no documento 20 §3 e
não se repete aqui. O que importa registrar neste documento é a *consequência de estado*: um Server
Component **não tem estado de servidor no cliente**. Não há cache a invalidar no navegador, não há
`isLoading`, não há `staleTime`, não há sincronização entre abas. O dado é renderizado; se mudou, a
página é revalidada (§5) e o servidor manda a versão nova.

Isso apaga uma categoria inteira de bug da v2.0 — a de `AppState.cache` desatualizado porque uma
view esqueceu de invalidar a chave de outra (o achado cross-file do Épico D: lançar aula no DSA muda
a CH executada exibida em Disciplinas). Na v2.1 a invalidação é declarada **ao lado da mutação**, no
servidor, uma vez só.

### 2.2 Quando TanStack Query se justifica

Critério **explícito**, para não virar preferência pessoal:

> Use TanStack Query **somente** quando a tela precisar de **mutação otimista repetida sobre o
> mesmo conjunto de dados, sem navegação entre uma e outra**, e a ida ao servidor a cada
> interação degradar o uso de forma perceptível.

Isso é uma conjunção: **todas** as condições precisam valer.

| Condição | Verificação |
|---|---|
| A interação é repetida (dezenas de vezes na mesma sessão de tela)? | — |
| Não há navegação entre as interações? | — |
| O dado é o mesmo conjunto o tempo todo? | — |
| A latência do round-trip é perceptível **e medida**, não presumida? | — |

| Tela | Veredito | Justificativa |
|---|---|---|
| **Grade do DSA em edição inline** (arrastar bloco, mudar TA, `moverLancamentoDsa`) | **TanStack Query** | Único caso que satisfaz as quatro. O Operador reposiciona vários blocos em sequência; recarregar a grade a cada arrasto seria intolerável |
| Listagem de instrutores com 8 filtros | **RSC** | Filtro é navegação; a URL já resolve, e o filtro roda no SQL |
| Cronograma previsto × executado | **RSC** | Leitura pesada, interação rara |
| Painel de estatísticas | **RSC** | Agregação no banco; Recharts recebe a série pronta |
| Cadastro de instrutor / disciplina | **RSC + Server Action** | Uma escrita, depois navegação |
| Relatório | **RSC + streaming** | Só leitura |
| Rotas `/print/*` | **RSC obrigatório** | Hidratação pendente estraga a impressão (documento 20 §9.3) |

**Um caso hoje.** Se aparecer um segundo candidato, ele passa pela mesma tabela antes de entrar.

### 2.3 O padrão híbrido — RSC hidrata o Query

Quando TanStack Query entra, ele **não substitui** o Server Component: recebe dele o estado inicial.
A primeira pintura continua vindo pronta do servidor.

```tsx
// app/(app)/turmas/[turma]/dsa/_componentes/grade-editavel.tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { moverBlocoDsa } from "@/lib/acoes/dsa";           // Server Action (documento 20 §4)
import type { GradeSemanal } from "@/lib/dominio/dsa/grade";

/**
 * Grade do DSA com edição inline — o único uso autorizado de TanStack Query na v2.1.
 *
 * O quê: mantém uma cópia cliente da grade para que arrastar um bloco responda instantaneamente.
 * Para quê: `moverLancamentoDsa` é acionado dezenas de vezes seguidas ao remontar uma semana.
 * Como: `initialData` vem do Server Component — a primeira pintura NÃO espera requisição nenhuma;
 *       o Query só assume a partir da primeira mutação.
 */
export function GradeEditavel({
  gradeInicial,
  turma, semana, ano,
}: { gradeInicial: GradeSemanal; turma: string; semana: number; ano: number }) {
  const cliente = useQueryClient();
  const chave = ["dsa", turma, ano, semana] as const; // chave estável: os 4 eixos que identificam a grade

  const { data: grade } = useQuery({
    queryKey: chave,
    // `initialData` dispensa o fetch inicial: o servidor já entregou a grade renderizada.
    initialData: gradeInicial,
    // `staleTime` alto porque a fonte de verdade é a Server Action + revalidatePath, não um polling.
    staleTime: 30_000,
    // Sem `queryFn` de recarga automática: quando algo muda de verdade, quem avisa é a revalidação
    // do Next.js, que re-renderiza o Server Component pai e refaz `initialData`.
    queryFn: () => Promise.resolve(gradeInicial),
  });

  const mover = useMutation({
    mutationFn: (mov: { blocoId: string; novoDia: string; novoTa: number }) => moverBlocoDsa(mov),

    // OPTIMISTIC UI — ver §7 para o critério de quando isto é legítimo.
    async onMutate(mov) {
      await cliente.cancelQueries({ queryKey: chave });        // evita corrida com refetch em voo
      const anterior = cliente.getQueryData<GradeSemanal>(chave); // snapshot para rollback
      cliente.setQueryData<GradeSemanal>(chave, (atual) =>
        atual ? aplicarMovimentoLocal(atual, mov) : atual       // função PURA de lib/dominio/dsa/grade
      );
      return { anterior };
    },

    // Falhou: desfaz. O usuário vê o bloco voltar ao lugar — sinal honesto de que não salvou.
    onError(_erro, _mov, contexto) {
      if (contexto?.anterior) cliente.setQueryData(chave, contexto.anterior);
    },

    // Terminou (sucesso ou erro): marca como obsoleto para reconciliar com o servidor.
    onSettled() {
      void cliente.invalidateQueries({ queryKey: chave });
    },
  });

  return <GradeVisual grade={grade} aoMover={(mov) => mover.mutate(mov)} />;
}
```

---

## 3. Estado efêmero de UI — Zustand com escopo mínimo

### 3.1 O critério

Zustand entra quando o estado **não pertence à URL** (não é contexto compartilhável), **não pertence
ao servidor** (não é dado do sistema) e **precisa ser lido por componentes irmãos distantes**
(passar props atravessaria 4+ níveis).

Se o estado é lido por um componente só, é `useState`. Se atravessa 2 níveis, é prop. Zustand começa
a valer no terceiro.

### 3.2 Usos legítimos

| Caso | Por que Zustand | Por que não URL | Por que não servidor |
|---|---|---|---|
| **Rascunho do formulário longo do instrutor** (30 colunas, 3 abas — spec 016/022) | O usuário troca de aba e não pode perder o que digitou; abas e blocos são componentes distantes | Dado pessoal não vai na barra de endereço | Não foi submetido; não é dado do sistema |
| **Seleção múltipla em massa** (marcar N disciplinas para atribuir a um instrutor — spec 019) | A barra de ação flutuante e as caixas estão em subárvores diferentes | Uma lista de 40 ids polui a URL sem benefício | Seleção não é fato |
| **Estado do painel lateral de conflitos do DSA** (aberto, largura, bloco em foco) | Aberto pela grade, lido pelo painel | É preferência visual, não contexto | Idem |

```ts
// lib/estado/rascunho-instrutor.ts
import { create } from "zustand";

/**
 * Rascunho do formulário de instrutor.
 *
 * O quê: guarda os campos digitados enquanto o usuário navega entre as 3 abas do formulário.
 * Para quê: o formulário tem 30 colunas divididas em abas; trocar de aba desmonta a subárvore,
 *           e sem isto o que foi digitado se perde — regressão em relação à v2.0.
 * Como: store minúscula, com escopo declarado no nome. NÃO é um "store global do app".
 *
 * LIMITE DELIBERADO: nada de dado do sistema aqui. Nada que precise sobreviver a F5.
 * Nada que outro usuário precise ver. `limpar()` é chamado no submit bem-sucedido — um rascunho
 * que sobrevive ao salvamento é a origem do bug "o formulário reabriu com dados do anterior".
 */
type RascunhoInstrutor = {
  campos: Record<string, unknown>;
  abaAtiva: "pessoais" | "profissionais" | "complementares";
  definirCampo: (nome: string, valor: unknown) => void;
  definirAba: (aba: RascunhoInstrutor["abaAtiva"]) => void;
  limpar: () => void;
};

export const useRascunhoInstrutor = create<RascunhoInstrutor>((set) => ({
  campos: {},
  abaAtiva: "pessoais",
  definirCampo: (nome, valor) => set((s) => ({ campos: { ...s.campos, [nome]: valor } })),
  definirAba: (abaAtiva) => set({ abaAtiva }),
  limpar: () => set({ campos: {}, abaAtiva: "pessoais" }),
}));
```

### 3.3 Usos **ilegítimos** — a lista de proibições

| Tentação | Por que é errado | Onde vai |
|---|---|---|
| `useUsuarioStore` com perfil e permissões | Estado de autorização no cliente é decorativo; a fronteira é a RLS (documento 20 §8.2) | Servidor, a cada requisição |
| `useCursoSelecionadoStore` | É contexto de navegação — recriaria o `AppState` com outro nome | URL |
| `useInstrutoresStore` com a lista carregada | É dado do sistema; vira cache paralelo que ninguém invalida | RSC |
| `useFiltrosStore` | Filtro é recorte de tela — perde deep-link e voltar/avançar | URL |
| `useTemaStore` | `next-themes` já resolve com persistência e sem flash (BRIEF §5) | `next-themes` |
| `useNotificacoesStore` global | Vira depósito de responsabilidades acumuladas | Toast local / `ResultadoAcao.avisos` |

**Regra dura: uma store por tela ou por fluxo, nomeada pelo escopo.** `useRascunhoInstrutor`, sim;
`useAppStore`, não — um store global é o `AppState` voltando pela porta dos fundos, com todos os
problemas do original e nenhum dos benefícios da URL.

---

## 4. Camada de acesso a dados

### 4.1 Os três clientes

Os quatro arquivos de `lib/supabase/` estão no documento 24 §1; `server.ts` e `admin.ts` estão
comentados no documento 20 §3.1 e §8.3. Aqui fica só a tabela de decisão, que é o que se consulta
no dia a dia:

| Cliente | Arquivo | Quem usa | Enxerga RLS? | `auth.uid()` |
|---|---|---|---|---|
| **navegador** | `lib/supabase/client.ts` | Client Components (login, upload, realtime) | sim | do usuário |
| **servidor** | `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers | sim | do usuário |
| **admin** | `lib/supabase/admin.ts` | 3 usos autorizados (convite, ETL, manutenção) | **não** | nulo |

**Padrão: `server.ts` em 95% do código.** `client.ts` só quando a operação nasce de um evento do
navegador que não pode virar Server Action (autenticação, upload direto ao Storage). `admin.ts`
tem lista fechada de usos e regra de ESLint que a impõe (documento 24 §5.2).

### 4.2 Tipos gerados — o contrato que substituiu `_Meta_Colunas`

`lib/tipos/database.ts` é **gerado** por `pnpm db:tipos` e nunca editado (documento 24 §7). Ele é o
sucessor direto da aba `_Meta_Colunas` da v2.0 — **[ABSORVIDO PELA PLATAFORMA]**, o exemplo canônico
do BRIEF §2.1. A diferença: `_Meta_Colunas` era um contrato mantido à mão, que podia divergir do
schema real (e divergiu — três cabeçalhos fisicamente truncados na planilha viva); o tipo gerado
**não pode** divergir, porque é derivado do catálogo do PostgreSQL.

```ts
// lib/tipos/aliases.ts
//
// Atalhos sobre os tipos gerados. Este arquivo é escrito à mão; `database.ts`, nunca.

import type { Database } from "./database";

/** Linha lida de uma tabela. `Linha<"instrutores">` = o formato exato do SELECT *. */
export type Linha<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** Payload de INSERT: colunas com default (id, criado_em) já entram opcionais. */
export type Insercao<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

/** Payload de UPDATE: tudo opcional. */
export type Atualizacao<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

/** ENUM nativo do banco. `Enum<"perfil_usuario">` = a união dos ~12 perfis (BRIEF §3). */
export type Enum<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
```

O ganho concreto: renomear `carga_horaria_tempos` numa migration e esquecer de ajustar o código
**quebra o `tsc`**, no CI, antes do merge. Na v2.0 o mesmo erro produzia célula vazia em produção —
que foi exatamente o achado (f)/(g) do documento 05.

### 4.3 Funções de consulta — convenção de nomes e formato

Consulta usada por **uma** tela mora em `_consultas.ts` ao lado da rota (documento 24 §1.2).
Consulta usada por **duas ou mais** sobe para `lib/consultas/<dominio>.ts`.

| Prefixo | Devolve | Ausência | Exemplo |
|---|---|---|---|
| `buscar…` | **um** registro ou `null` | `null`, nunca erro | `buscarTurmaPorCodigo` |
| `listar…` | **array** (possivelmente vazio) | `[]`, nunca `null` | `listarInstrutoresDoCurso` |
| `contar…` | `number` | `0` | `contarLancamentosDaSemana` |
| `agregar…` | objeto de totais | zeros | `agregarTotalizadoresDoCurso` |
| `existe…` | `boolean` | `false` | `existeVinculoAtivo` |

Sufixo `…Por<Campo>` quando o critério não é a chave primária: `buscarInstrutorPorNip`.
**Nunca** `get`, `fetch`, `load` — português, como todo o resto (documento 24 §2).

```ts
// lib/consultas/instrutores.ts
import "server-only"; // consultas só existem no servidor

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Linha } from "@/lib/tipos/aliases";

/** Instrutor com os vínculos de disciplina já resolvidos — formato que 3 telas consomem. */
export type InstrutorComVinculos = Linha<"instrutores"> & {
  instrutor_disciplina: Array<{
    id: string;
    modo_atribuicao: string;
    disciplinas: Pick<Linha<"disciplinas">, "id" | "codigo" | "nome_disciplina"> | null;
  }>;
};

/**
 * Lista os instrutores qualificados num curso, com os vínculos ativos.
 *
 * O quê: uma consulta, um join, tudo o que a tela precisa.
 * Para quê: alimenta /instrutores, o dropdown de lançamento do DSA e a Ficha do Docente.
 * Como: join embutido do PostgREST (`instrutor_disciplina(...)`) — UMA viagem ao banco.
 *        É esta forma que impede o N+1 (documento 20 §11, risco R-02): jamais um `select`
 *        por instrutor dentro de um `map`.
 *
 * Segurança: nenhuma checagem de perfil aqui, DE PROPÓSITO. A RLS filtra as linhas que este
 * usuário pode ver. `if (perfil === ...)` no meio da consulta seria segunda fonte de verdade
 * de autorização — e a que erra silenciosamente.
 */
export async function listarInstrutoresDoCurso(
  cursoCodigo: string
): Promise<InstrutorComVinculos[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("instrutores")
    .select(`
      id, codigo, nome_completo, nome_guerra, posto_graduacao, esp_hab_obs, status,
      instrutor_disciplina!inner (
        id, modo_atribuicao,
        disciplinas!inner ( id, codigo, nome_disciplina, curso_codigo )
      )
    `)
    .eq("status", "ativo")                                        // exclusão lógica (BRIEF §2)
    .eq("instrutor_disciplina.status", "ativo")                   // vínculo ativo apenas
    .eq("instrutor_disciplina.disciplinas.curso_codigo", cursoCodigo)
    .order("nome_completo");

  // Degradação segura (RN-DEG-01): erro de leitura vira lista vazia + log, nunca tela derrubada.
  // A página decide se mostra "nenhum registro" ou aciona o error.tsx (documento 20 §7).
  if (error) {
    console.error("listarInstrutoresDoCurso", { cursoCodigo, code: error.code, message: error.message });
    return [];
  }

  return (data ?? []) as InstrutorComVinculos[];
}
```

**Onde a ordenação por antiguidade entra:** não aqui. A consulta ordena por nome (ordem estável de
base); `RN-ANT-01/02` é regra de negócio e roda em `lib/dominio/instrutores/antiguidade.ts`, sobre o
array já carregado (documento 20 §2.3). Ordenar por antiguidade no SQL exigiria replicar a escala de
postos no banco — segunda fonte de verdade de uma regra que já mudou três vezes na v2.0.

---

## 5. Cache e revalidação

### 5.1 Os dois mecanismos

| Mecanismo | Granularidade | Quando usar |
|---|---|---|
| `revalidatePath("/rota")` | uma rota | a mutação afeta uma tela identificável |
| `revalidateTag("etiqueta")` | todas as rotas que leram aquela etiqueta | o mesmo dado aparece em 3+ telas |

Etiqueta é declarada na leitura, com `unstable_cache`, e citada na escrita:

```ts
// lib/consultas/parametros.ts
import { unstable_cache } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Lê `config_parametros` (tetos AEC 10% / TAD 5% / TR 10%, faixas de CH docente,
 * limite de TA por dia) — Princípio VII: parâmetro normativo é dado, nunca constante em código.
 *
 * O quê: cacheia a tabela inteira sob a etiqueta "config-parametros".
 * Para quê: é lida por quase toda tela de cálculo e muda poucas vezes por ano.
 * Como: `unstable_cache` guarda o resultado; `revalidateTag("config-parametros")` na Server Action
 *       de /admin/parametros derruba o cache de TODAS as telas de uma vez — sem enumerar rotas.
 *
 * NOTA: cacheia só parâmetro NORMATIVO, que é igual para todos os usuários. Jamais cacheie
 * por etiqueta um dado filtrado por RLS — o resultado de um perfil vazaria para outro.
 */
export const lerParametrosNormativos = unstable_cache(
  async () => {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.from("config_parametros").select("chave, valor, tipo");
    return Object.fromEntries((data ?? []).map((p) => [p.chave, p.valor]));
  },
  ["config-parametros"],                       // chave do cache
  { tags: ["config-parametros"], revalidate: 3600 } // etiqueta + teto de 1 h como rede de segurança
);
```

### 5.2 Matriz de invalidação

Sucessora direta do `AppState.invalidar([...])` da v2.0 — com a diferença de que aqui a linha é
escrita **na Server Action**, ao lado da mutação, e não em cada view que por acaso lembrou.

| Server Action | Origem | Invalida (caminhos) | Invalida (etiquetas) |
|---|---|---|---|
| `lancarAula` | RF-DSA-04 | `/turmas/[turma]/dsa`, `/cronograma`, `/disciplinas`, `/relatorio` | `ocupacao-semana` |
| `moverBlocoDsa` | RF-DSA-06 | `/turmas/[turma]/dsa` | `ocupacao-semana` |
| `excluirBlocoDsa` | RF-DSA-07 | `/turmas/[turma]/dsa`, `/cronograma`, `/disciplinas` | `ocupacao-semana` |
| `fecharSemanaDsa` (RPC) | RF-DSA-09 | `/turmas/[turma]/dsa`, `/avaliacoes`, `/relatorio` | `ocupacao-semana` |
| `registrarAvaliacao` | RF-AVAL-05 | `/avaliacoes`, `/turmas/[turma]/dsa` | — |
| `aplicarAvaliacaoNoDsa` | RN-AVAL-02 | `/avaliacoes`, `/turmas/[turma]/dsa`, `/cronograma`, `/relatorio` | `ocupacao-semana` |
| `registrarAtividadeNaoLetiva` | RN-EVT-01 | `/atividades`, `/relatorio`, `/cursos/[curso]` | `tetos-curso` |
| `cadastrarInstrutor` / `atualizarInstrutor` | RF-INSTR | `/instrutores`, `/disciplinas` | `catalogo-instrutores` |
| `desativarInstrutor` / `reativarInstrutor` | RF-INSTR-12 | `/instrutores`, `/disciplinas`, `/turmas/[turma]/dsa` | `catalogo-instrutores` |
| `sincronizarDisciplinasInstrutor` | spec 019 | `/instrutores`, `/disciplinas` | `catalogo-instrutores` |
| `atualizarDisciplina` | RF-MATERIAS | `/disciplinas`, `/cronograma`, `/cursos/[curso]` | `tetos-curso` |
| `salvarPlanejamento` (RPC) | RF-2027-04 | `/cronograma`, `/inicio` | `planejamento-<ano>` |
| `atualizarParametroNormativo` | RNF-NORM-08 | — | **`config-parametros`** (atinge tudo) |
| `atualizarCalendario` (feriado/janela/reserva) | RF-DADOS-04 | `/admin/calendario`, `/cronograma` | `calendario-<ano>` |
| `convidarUsuario` / `atualizarUsuario` | RF-AUTH-05 | `/admin/usuarios` | `perfis-usuario` |

Regras de uso:

1. **Toda Server Action declara suas invalidações** — mesmo que a lista seja de um item.
   Server Action sem `revalidate*` só passa no PR com a nota "não afeta leitura cacheada".
2. **Invalidação cruzada é obrigatória e vem desta tabela.** O achado do Épico D (lançar aula muda
   a CH executada exibida em Disciplinas) está na linha de `lancarAula` — não depende de ninguém
   lembrar dele durante a implementação.
3. **Etiqueta quando o dado aparece em 3+ telas.** Caminho quando é uma tela.
4. **Nunca cachear por etiqueta um dado filtrado por RLS.** O cache do Next.js não conhece o
   usuário; um resultado de um perfil serviria a outro. Só parâmetro normativo, catálogo público e
   calendário — dados iguais para todos.

---

## 6. Formulários — RHF + Zod + Server Action

### 6.1 O defeito que isso elimina (`RNF-MAN-02`)

`RNF-MAN-02` descrevia a classe de defeito da configuração duplicada em dois lados: a mesma regra
escrita no cliente (para dar feedback) e no servidor (para valer). Na v2.0 isso foi vivido de forma
literal — a spec 022 registra que `cadastrarInstrutor`/`atualizarInstrutor` ganharam validação dos
4 campos essenciais no backend como "defesa em profundidade, **mesma regra já aplicada no cliente**".
Duas cópias, dois lugares para esquecer de alterar, e a garantia de que um dia divergiriam.

**[PRESERVADO — resolvido]** Na v2.1 o schema Zod é **um arquivo só**, importado pelo formulário
(feedback) e pela Server Action (autoridade). Não há como divergir: é o mesmo objeto.

### 6.2 O schema, único

```ts
// lib/validacao/instrutores.ts
//
// ESTE ARQUIVO É A ÚNICA DEFINIÇÃO DE "instrutor válido" NO SISTEMA.
// Importado pelo formulário (Client) e pela Server Action (servidor). Uma fonte, dois consumidores.

import { z } from "zod";

/** Postos e graduações reais, na escala de RN-ANT-02. Não é lista de exibição: é domínio. */
export const POSTOS = ["AE","VA","CA","CMG","CF","CC","CT","1T","2T","GM","SO","1SG","2SG","3SG","CB","MN","SC","SCNS"] as const;

export const esquemaCadastroInstrutor = z.object({
  // Os 4 campos essenciais da spec 022 — a regra que estava duplicada, agora escrita uma vez.
  postoGraduacao: z.enum(POSTOS, { message: "Selecione o Posto/Graduação." }),
  espHabObs: z.string().min(1, "Informe a Especialidade/Habilitação (Esp_Hab_Obs)."),
  nomeCompleto: z.string().trim().min(3, "Nome completo é obrigatório.").max(120),
  nomeGuerra: z.string().trim().min(2, "Nome de guerra é obrigatório.").max(40),

  // Campos com máscara: valida-se o formato limpo, não o mascarado.
  cpf: z.string()
    .transform((v) => v.replace(/\D/g, ""))     // remove máscara ANTES de validar
    .refine((v) => v.length === 0 || v.length === 11, "CPF deve ter 11 dígitos.")
    .optional(),
  nip: z.string().transform((v) => v.replace(/\D/g, "")).optional(),

  // `status` fica FORA dos campos editáveis livres (RN-CRUD-02, RN-INST-02): a mudança para
  // "inativo" tem fluxo próprio, com confirmação. Aqui só se aceita o valor de criação.
  status: z.literal("ativo").default("ativo"),

  // Campo derivado por regra, NUNCA aceito do cliente: `antiguidadeDeclarada` é recalculada no
  // servidor a partir do posto (RN-ANT-02, 3ª revisão). Omiti-lo do schema é o que impede
  // que um payload forjado a sobrescreva.
});

/** Tipo inferido — o formulário e a ação usam O MESMO tipo, derivado do mesmo schema. */
export type EntradaCadastroInstrutor = z.infer<typeof esquemaCadastroInstrutor>;
```

### 6.3 O formulário

```tsx
// app/(app)/instrutores/_componentes/formulario-instrutor.tsx
"use client"; // formulário controlado com feedback por campo — caso legítimo (documento 20 §2.2)

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaCadastroInstrutor, type EntradaCadastroInstrutor } from "@/lib/validacao/instrutores";
import { cadastrarInstrutor } from "@/lib/acoes/instrutores";
import type { ResultadoAcao } from "@/lib/acoes/tipos"; // definido no documento 20 §4.1

export function FormularioInstrutor() {
  // `useActionState` liga o formulário à Server Action mantendo o retorno tipado entre renderizações.
  // Com JS desabilitado, `<form action={acao}>` continua funcionando — degradação real, não teórica.
  const [resultado, acao, enviando] = useActionState<ResultadoAcao<{ id: string }> | null, FormData>(
    cadastrarInstrutor,
    null
  );

  // MESMO schema do servidor. É esta linha que mata RNF-MAN-02: não há segunda definição para
  // manter em sincronia, porque não há segunda definição.
  const form = useForm<EntradaCadastroInstrutor>({
    resolver: zodResolver(esquemaCadastroInstrutor),
    mode: "onBlur", // valida ao sair do campo; "onChange" em formulário de 30 campos é ruidoso
  });

  return (
    <form action={acao} noValidate>
      {/* Erro de AUTORIZAÇÃO (RLS recusou): faixa no topo, não erro de campo. A distinção e o
          porquê estão no documento 20 §4.4 — a mensagem e a ação sugerida são diferentes. */}
      {resultado?.ok === false && resultado.erro.tipo === "autorizacao" && (
        <div role="alert" data-nivel="permissao">{resultado.erro.mensagem}</div>
      )}

      {/* Avisos não bloqueantes (RN-DEG-02): informam, não impedem. */}
      {resultado?.ok && resultado.avisos.length > 0 && (
        <ul role="status">{resultado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
      )}

      <label htmlFor="nomeCompleto">Nome completo</label>
      <input id="nomeCompleto" {...form.register("nomeCompleto")} aria-invalid={!!form.formState.errors.nomeCompleto} />
      {/* Erro do CLIENTE: instantâneo, vindo do zodResolver. */}
      {form.formState.errors.nomeCompleto && <span role="alert">{form.formState.errors.nomeCompleto.message}</span>}
      {/* Erro do SERVIDOR para o mesmo campo: mesma mensagem, porque é o mesmo schema. */}
      {resultado?.ok === false && resultado.erro.tipo === "validacao" &&
        resultado.erro.campos.nomeCompleto?.map((m) => <span key={m} role="alert">{m}</span>)}

      <button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Cadastrar instrutor"}
      </button>
    </form>
  );
}
```

### 6.4 Por que a validação no cliente **não** dispensa a do servidor

A validação do cliente é **conveniência**: dá feedback imediato e evita ida ao servidor. A do
servidor é **autoridade**: a Server Action é um endpoint HTTP de fato (documento 20 §11, risco
R-07) e aceita qualquer payload que alguém forje. Por isso, na v2.1:

- **cliente:** o schema roda no `zodResolver` — melhora a experiência;
- **servidor:** o mesmo schema roda no `safeParse` da Server Action — decide;
- **banco:** `CHECK`, `NOT NULL`, `UNIQUE`, FK e RLS — a última palavra.

Três camadas, **uma definição de regra por camada de competência**, zero duplicação de texto. É
defesa em profundidade sem o custo que a v2.0 pagava.

---

## 7. Optimistic UI

### 7.1 O critério

> Vale otimismo quando a operação **quase sempre dá certo**, o **usuário é o único dono** daquele
> dado naquele instante, e o **rollback é visualmente óbvio**.
> Não vale quando dois usuários podem disputar o mesmo recurso, quando a operação depende de
> validação que só o servidor conhece, ou quando desfazer confundiria mais do que esperar.

### 7.2 Onde vale

| Operação | Por quê |
|---|---|
| **Mover bloco na grade do DSA** (`moverBlocoDsa`) | O Operador é dono da grade da sua turma naquele momento; o bloco voltar ao lugar é rollback autoexplicativo; a operação é repetida dezenas de vezes (§2.3) |
| **Marcar/desmarcar disciplina** no painel de qualificação (spec 019) | Estado local de seleção; o efeito só é gravado no salvamento |
| **Reordenar prioridade de disciplina** (`definirPrioridadeDisciplina`) | Ordenação visual, sem disputa entre usuários |
| **Alternar status de leitura de um aviso** | Estritamente pessoal |

### 7.3 Onde **não** vale

| Operação | Por quê não |
|---|---|
| **Lançar aula nova no DSA** | Pode colidir com `RN-CONF-01` (instrutor ou sala já ocupados por **outra turma**, possivelmente de outro Operador). Mostrar o bloco como lançado e depois removê-lo é pior que esperar 200 ms |
| **Agendar avaliação** | Consome TA e disputa a mesma grade; e `RN-AVAL-02` tem transições de estado que só o servidor conhece |
| **Fechar semana do DSA** | RPC multi-tabela (documento 20 §5.1a). Ou aconteceu inteiro, ou não aconteceu |
| **Salvar planejamento anual** | Promoção `Rascunho`→`Salvo` com arquivamento da versão anterior. Invariante "no máximo 1 `Salvo` por ano" não admite estado intermediário na tela |
| **Convidar usuário** | Efeito externo (e-mail enviado). Não se pode desfazer um e-mail |
| **Desativar instrutor** | `RN-INST-02` exige confirmação e tem efeito em cascata na exibição de vínculos |
| **Qualquer escrita sujeita a RLS de alçada duvidosa** | Otimismo aqui mostra sucesso e reverte com "você não tinha permissão" — a pior mensagem possível |

**A regra prática, em uma frase:** *otimismo em operação que não disputa recurso.* Tudo que toca a
ocupação de TA, instrutor ou sala espera a confirmação do servidor — porque a disputa é justamente
o que o servidor existe para arbitrar.

### 7.4 O padrão sem TanStack Query (`useOptimistic`)

Para o caso simples — reordenar, marcar, alternar — não é preciso trazer TanStack Query:

```tsx
"use client";
import { useOptimistic, startTransition } from "react";
import { definirPrioridadeDisciplina } from "@/lib/acoes/disciplinas";

/**
 * Reordenação otimista de prioridade de disciplina.
 *
 * O quê: reordena a lista na hora e chama a Server Action em segundo plano.
 * Para quê: ordenação é preferência de exibição, sem disputa entre usuários — caso legítimo (§7.2).
 * Como: `useOptimistic` mantém um estado derivado que o React descarta sozinho quando a
 *       revalidação traz a lista real. Se a ação falhar, o estado otimista some e a ordem
 *       anterior reaparece — rollback sem código de rollback.
 */
export function ListaPrioridades({ disciplinas }: { disciplinas: Array<{ id: string; nome: string; ordem: number }> }) {
  const [otimista, aplicarOtimista] = useOptimistic(
    disciplinas,
    (atual, mov: { id: string; novaOrdem: number }) =>
      [...atual].map((d) => (d.id === mov.id ? { ...d, ordem: mov.novaOrdem } : d))
             .sort((a, b) => a.ordem - b.ordem)
  );

  function mover(id: string, novaOrdem: number) {
    // `startTransition` é obrigatório: `useOptimistic` só aceita atualização dentro de transição.
    startTransition(async () => {
      aplicarOtimista({ id, novaOrdem });                 // a tela responde imediatamente
      await definirPrioridadeDisciplina({ id, novaOrdem }); // a verdade chega depois, e revalida
    });
  }

  return <ol>{otimista.map((d) => <li key={d.id}>{d.nome}</li>)}</ol>;
}
```

---

## 8. Rastreabilidade

| Origem v2.0 | Destino v2.1 | Onde |
|---|---|---|
| `AppState` (objeto) | **[REVOGADO — v2.1]** — substituído por URL + cache do Next.js | §1.1 |
| `AppState.cursoSelecionado` / `turmaSelecionada` | **[PRESERVADO — nova implementação]** — `?curso=` / segmento `[turma]` | §1.1, §1.3 |
| `AppState.filtros.<view>` | **[PRESERVADO — nova implementação]** — parâmetros nomeados na URL | §1.5 |
| `AppState.cache` + `invalidar()` | **[PRESERVADO — nova implementação]** — `revalidatePath`/`revalidateTag` | §5 |
| `AppState.onChange()` | **[ABSORVIDO PELA PLATAFORMA]** — re-render do RSC na navegação | §2.1 |
| `Router.navegar` / `irPara` / `TAB_LOADERS` | **[REVOGADO — v2.1]** — roteador do App Router | §1.1 |
| `CRUD_UI` (estado do modal) | **[PRESERVADO]** — continua local ao componente | §3.1 |
| `RF-NAV-01/02/03` | **[PRESERVADO — destravado]** — deep-link, histórico, recarga, compartilhamento | §1.2 |
| Deep-links enxertados (`?editarInstrutor`, `?novoInstrutor`) | **[ABSORVIDO PELA PLATAFORMA]** — todo estado já é deep-link | §1.2 |
| `RNF-MAN-02` (config duplicada) | **[PRESERVADO — resolvido]** — schema Zod único | §6.1 |
| `_Meta_Colunas` | **aposentada — [ABSORVIDO PELA PLATAFORMA]** — tipos gerados | §4.2 |
| `RN-DEG-01` | **[PRESERVADO]** — consulta devolve neutro, nunca derruba | §4.3 |
| `RN-DEG-02` | **[PRESERVADO]** — `ResultadoAcao.avisos` na UI | §6.3 |
| `RN-ANT-01/02` | **[PRESERVADO]** — ordenação no domínio, não no SQL | §4.3 |
| `RN-CRUD-02` / `RN-INST-02` | **[PRESERVADO]** — campos derivados fora do schema de entrada | §6.2 |
| Princípio VII (parâmetro como dado) | **[PRESERVADO]** — `config_parametros` + etiqueta de cache | §5.1 |

## 9. Pontos que dependem de confirmação

1. **Chave de negócio na URL.** A proposta usa `codigo` (`TUR-000012`), não `uuid` — legível e
   rastreável até a v2.0. Confirma-se que o `codigo` é estável o bastante para virar URL pública
   (um link favoritado quebra se o `codigo` for reemitido)?
2. **`?semana=` como semana ISO pura.** Alternativa seria `?inicio=2026-08-24` (a segunda-feira).
   A semana ISO é mais curta e casa com `planejamento_anual.semana_ano`, mas exige o par `ano`.
3. **TanStack Query restrito à grade do DSA.** É o único caso que satisfaz os quatro critérios do
   §2.2. Confirma-se que a edição inline da grade é mesmo requisito da v2.1, ou o DSA continua com
   lançamento por formulário (e então TanStack Query não entra no projeto)?
4. **Rascunho de formulário em Zustand, sem persistência.** Hoje o rascunho morre ao fechar a aba.
   Persistir em `localStorage` traria "recuperar rascunho", mas também dado pessoal de instrutor
   guardado no navegador — decisão do Bernardo, não do arquiteto.

---

*Fim do documento 25. Ver também `20-Arquitetura-Alvo-NextJS-Supabase.md` e
`24-Estrutura-do-Repositorio-e-Convencoes.md`.*
