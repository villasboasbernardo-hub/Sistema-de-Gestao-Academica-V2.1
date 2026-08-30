---
title: "CIAARA-11 v2.1 — Estrutura do Repositório e Convenções (Fase 2, documento 24)"
author: "Arquiteto Chefe de Software — CIAARA-11 / Departamento de Ensino"
date: "25/08/2026"
version: "2.1"
origem: "BRIEF-v2.1 §1, §4, §7, §11 · documento 20 (Arquitetura Alvo) · docs/arquitetura/02-modularizacao.md (v2.0)"
---

# Estrutura do Repositório e Convenções

> Este documento detalha o BRIEF §4. Ele decide **onde cada arquivo mora**, **como cada arquivo se
> chama** e **o que roda antes de um código entrar na `main`**. É o documento que um desenvolvedor
> novo — ou uma sessão de vibe coding — lê antes de criar o primeiro arquivo.

## 0. O que muda em relação à v2.0

Na v2.0 a modularização era uma conquista trabalhosa: o Apps Script compartilha **um único escopo
global** entre todos os `.gs`, a ordem de avaliação de código de nível superior segue a ordem dos
arquivos no projeto, e por isso nenhum arquivo podia ter `const X = outraFuncao_()` fora do corpo de
uma função (`02-modularizacao.md`, "Regra de ouro"). O `include()` do `HtmlService` era o mecanismo
de composição do front-end.

**[MIGRAÇÃO v2.1]** Nada disso continua. Módulos ES têm escopo próprio, `import` é explícito,
dependência circular é erro de build e não bug silencioso. A regra de ouro do Apps Script
**[REVOGADO — v2.1]** deixa de existir — mas o *objetivo* dela (`RF-MOD-01/02`: divisão por domínio,
sem duplicar catálogo central) **[PRESERVADO]** vira a organização de pastas abaixo.

---

## 1. Árvore do repositório, pasta por pasta

```
ciaara-11/
├── app/                                   # ROTEAMENTO. Cada pasta = um segmento de URL.
│   ├── (auth)/                            #   grupo de rotas SEM shell do app (sem menu, sem sidebar)
│   │   ├── login/page.tsx                 #     /login
│   │   ├── convite/[token]/page.tsx       #     /convite/<token> — define senha no 1º acesso (BRIEF §3)
│   │   ├── recuperar-senha/page.tsx       #     /recuperar-senha
│   │   └── layout.tsx                     #     casca mínima: brasão, card centralizado, nada mais
│   ├── (app)/                             #   grupo de rotas COM shell (menu lateral + cabeçalho)
│   │   ├── layout.tsx                     #     shell: navegação, seletor de tema, usuário logado
│   │   ├── inicio/page.tsx                #     /inicio — painel de entrada (RF-INI)
│   │   ├── cursos/[curso]/page.tsx        #     /cursos/CUR-000004 — página do curso
│   │   ├── turmas/[turma]/dsa/            #     /turmas/TUR-000012/dsa — Detalhe Semanal de Aula
│   │   │   ├── page.tsx                   #       a grade (Server Component)
│   │   │   ├── loading.tsx                #       esqueleto durante o streaming
│   │   │   └── error.tsx                  #       fronteira de erro do segmento (RN-DEG-01)
│   │   ├── cronograma/page.tsx            #     /cronograma — previsto × executado + motor preditivo
│   │   ├── avaliacoes/page.tsx            #     /avaliacoes
│   │   ├── atividades/page.tsx            #     /atividades — AEC/TAD/TR/Estudo Individual
│   │   ├── relatorio/page.tsx             #     /relatorio — RF-REL
│   │   ├── instrutores/page.tsx           #     /instrutores
│   │   ├── disciplinas/page.tsx           #     /disciplinas
│   │   └── admin/
│   │       ├── usuarios/page.tsx          #     /admin/usuarios — convite e RBAC (RF-AUTH-05)
│   │       ├── parametros/page.tsx        #     /admin/parametros — config_parametros (Princípio VII)
│   │       └── calendario/page.tsx        #     /admin/calendario — feriados, janelas, reservas PROENS
│   ├── print/                             #   ROTAS DE IMPRESSÃO — sem shell, servidor puro (RNF-COMP-01)
│   │   ├── dsa/page.tsx                   #     /print/dsa
│   │   ├── relatorio/page.tsx             #     /print/relatorio
│   │   ├── cronograma/page.tsx            #     /print/cronograma
│   │   ├── ficha-instrutor/page.tsx       #     /print/ficha-instrutor
│   │   ├── liq/page.tsx                   #     /print/liq
│   │   ├── os-instrutoria/page.tsx        #     /print/os-instrutoria
│   │   └── layout.tsx                     #     <html> mínimo + @media print; NENHUM "use client"
│   ├── layout.tsx                         #   layout raiz: <html lang="pt-BR">, fontes, ThemeProvider
│   ├── error.tsx                          #   fronteira de erro de último recurso
│   ├── global-error.tsx                   #   fronteira quando o próprio layout raiz quebra
│   ├── not-found.tsx                      #   404 institucional
│   └── globals.css                        #   Tailwind v4 + @theme com os tokens CIAARA (BRIEF §5)
│
├── components/                            # COMPONENTES. Nunca contêm regra de negócio.
│   ├── ui/                                #   shadcn/ui copiado para o repo e versionado
│   ├── ciaara/                            #   componentes do domínio: CardKpi, BadgeStatus,
│   │                                      #   GradeAlocacao, FiltroAvancado, AlertaConformidade,
│   │                                      #   TabelaDensa, SeletorTurma
│   ├── graficos/                          #   wrappers de Recharts — TODOS "use client"
│   └── impressao/                         #   blocos reutilizados pelas rotas /print/*
│
├── lib/                                   # LÓGICA. Nada aqui renderiza JSX.
│   ├── supabase/
│   │   ├── client.ts                      #   cliente de navegador (@supabase/supabase-js)
│   │   ├── server.ts                      #   cliente de servidor com cookie do usuário (@supabase/ssr)
│   │   ├── middleware.ts                  #   helper de refresh de sessão usado por /middleware.ts
│   │   └── admin.ts                       #   service_role — `import "server-only"` obrigatório
│   ├── dominio/                           #   ← O CORAÇÃO PORTADO. Regras RN-* puras. SEM I/O.
│   │   ├── cronograma/                    #     distribuição semanal, densidade, ritmo
│   │   ├── dsa/                           #     grade, conflitos (RN-CONF-01), tetos semanais
│   │   ├── planejamento/                  #     motor preditivo multi-ano (RN-2027-*)
│   │   ├── instrutores/                   #     antiguidade (RN-ANT), nome militar (RF-INSTR-15)
│   │   ├── normativo/                     #     tetos AEC/TAD/TR, faixas de CH docente
│   │   ├── horarios/                      #     regime vigente por data (RN-2027-09), 9º TA
│   │   ├── calendario/                    #     semana ISO, dias letivos, feriados
│   │   └── tipos.ts                       #     tipos compartilhados do domínio (Aviso, Resultado…)
│   ├── validacao/                         #   schemas Zod — importados por cliente E servidor
│   ├── acoes/                             #   Server Actions por domínio ("use server" no topo)
│   ├── tipos/database.ts                  #   GERADO por `supabase gen types`. Nunca editar à mão.
│   ├── formato/                           #   formatação de data, número, carga horária (§4)
│   └── constantes/                        #   rótulos institucionais, ordens fixas, mapas de ENUM
│
├── supabase/
│   ├── migrations/*.sql                   #   fonte de verdade do schema. Escritas à mão, versionadas.
│   ├── seed.sql                           #   dado mínimo para desenvolvimento local
│   └── config.toml                        #   configuração do Supabase CLI
│
├── scripts/
│   └── etl/                               #   Python — Sheets → CSV → COPY (reaproveita migracao/*.py)
│
├── supabase/tests/*.sql                   # pgTAP — É AQUI que `supabase test db` procura (§7)
├── tests/
│   ├── unidade/                           #   Vitest sobre lib/dominio/** — sem banco, sem rede
│   ├── invariantes/rls/                   #   teste NEGATIVO de RLS, por perfil, com sessão de verdade
│   └── e2e/                               #   Playwright: percursos principais + rotas /print/*

> **Os testes vivem em dois lugares, e a divisão é por natureza — não por gosto.** *(Achado A-12,
> corrigido em 30/08/2026: esta árvore punha o pgTAP em `tests/invariantes/`, enquanto o §7 define
> `"test:invariantes": "supabase test db"`, comando que **só procura em `supabase/tests/`** e não é
> configurável. Os dois pontos do mesmo documento não podiam estar certos ao mesmo tempo.)*
>
> **`supabase/tests/*.sql`** — pgTAP: estrutura, unicidade, condicionais, vigência, grão, derivados,
> imutabilidade. Roda **como dono do schema**, e prova regra de dado.
>
> **`tests/invariantes/rls/`** — o teste **negativo** de RLS, por perfil. Precisa de **cliente
> autenticado com JWT de verdade**: sob privilégio de dono a RLS não se aplica, e um teste de RLS
> escrito em pgTAP **aprovaria uma RLS desligada**. Foi rodando com sessão real que se encontrou o
> defeito do `GRANT` do schema `extensions`.
│
├── docs/                                  # esta documentação, versionada junto do código
├── public/                                # estáticos: brasão, imagens da Ficha, favicon
├── CLAUDE.md                              # instruções para o agente de código
├── AGENTS.md                              # papéis e limites dos agentes
├── .claude/                               # comandos e configuração do Claude Code
├── .env.local.example                     # gabarito de variáveis (§5)
├── .env.local                             # NUNCA versionado — está no .gitignore
├── eslint.config.mjs · .prettierrc · tsconfig.json · next.config.ts · vitest.config.ts
├── playwright.config.ts · package.json · pnpm-lock.yaml
└── .github/
    ├── workflows/ci.yml                   # typecheck · lint · unit · invariantes · build
    └── pull_request_template.md
```

### 1.1 O que entra e o que **não** entra em cada pasta

| Pasta | Entra | **Não** entra |
|---|---|---|
| `app/**` | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`, e componentes usados **por uma única rota** (colocação local) | regra de negócio; consulta reutilizável; componente usado por 2+ rotas (vai para `components/`) |
| `app/(auth)/**` | telas sem sessão: login, convite, recuperação | qualquer coisa que exija usuário autenticado |
| `app/(app)/**` | telas do sistema, todas atrás do middleware | rota pública |
| `app/print/**` | rotas de impressão, **100% Server Component** | `"use client"`, `useEffect`, animação, menu, sidebar |
| `components/ui/**` | shadcn/ui como veio (`npx shadcn add`), com ajuste de token | componente do CIAARA-11; consulta ao Supabase |
| `components/ciaara/**` | componentes do domínio, sem I/O; recebem dado por props | `await supabase` (o dado vem da página); regra `RN-` (vem de `lib/dominio/`) |
| `components/graficos/**` | wrappers Recharts, sempre `"use client"` | agregação de dado — a série chega pronta do servidor |
| `components/impressao/**` | cabeçalho institucional, blocos de página, quebras | interatividade de qualquer espécie |
| `lib/dominio/**` | funções puras, tipos do domínio, constantes normativas | **`import` de `supabase`, `next/*`, `react`, `node:fs`** — proibido por ESLint |
| `lib/validacao/**` | schemas Zod e tipos inferidos | acesso a banco; lógica de cálculo (é validação de forma, não de regra) |
| `lib/acoes/**` | Server Actions (`"use server"` no topo do arquivo) | JSX; regra de negócio inline (chama `lib/dominio/`) |
| `lib/supabase/**` | os quatro clientes e nada mais | consulta específica de tela (vai em `lib/consultas/` ou na própria página) |
| `lib/tipos/database.ts` | saída de `supabase gen types typescript` | **edição manual, jamais** |
| `lib/formato/**` | formatação de apresentação (data, número, CH) | parsing de entrada do usuário (é Zod) |
| `supabase/migrations/**` | SQL escrito à mão, um arquivo por mudança | dado de produção; `DROP` sem plano de reversão |
| `scripts/etl/**` | Python de carga e reconciliação | código chamado pelo app em runtime |
| `tests/unidade/**` | Vitest sobre `lib/dominio/**` | teste que precise de banco, rede ou DOM |
| `tests/invariantes/**` | pgTAP e SQL de asserção | asserção sobre saída histórica de um curso específico (rejeitado em 2026-08-10) |
| `tests/e2e/**` | Playwright, um arquivo por percurso | teste de unidade disfarçado |
| `docs/**` | os documentos numerados da v2.1 | anotação temporária, rascunho, TODO solto |

### 1.2 Regra de colocação (*colocation*)

**Um componente usado por uma única rota mora dentro da pasta daquela rota.** Só sobe para
`components/ciaara/` quando o segundo consumidor aparecer. Isso mantém a árvore honesta: uma pasta
`components/` inchada de coisas usadas em um lugar só é a versão moderna do `index.html` de 3.120
linhas da v1.0.

```
app/(app)/turmas/[turma]/dsa/
├── page.tsx
├── loading.tsx
├── error.tsx
├── _componentes/                 # o "_" impede que o Next.js trate a pasta como rota
│   ├── celula-ta.tsx             #   usado só pelo DSA — fica aqui
│   └── barra-navegacao-semana.tsx
└── _consultas.ts                 # consultas que só o DSA usa
```

---

## 2. Convenções de nomes

| Item | Convenção | Exemplo |
|---|---|---|
| Arquivo (todos) | `kebab-case.ts` / `.tsx` | `distribuicao-semanal.ts`, `grade-dsa.tsx` |
| Arquivo especial do Next.js | nome reservado, minúsculo | `page.tsx`, `layout.tsx`, `error.tsx` |
| Componente React | `PascalCase`, em português | `GradeDsa`, `CardKpi`, `AlertaConformidade` |
| Função de domínio | `camelCase`, verbo no infinitivo, em português | `distribuirCargaHorariaSemanal`, `detectarConflitos` |
| Server Action | `camelCase`, verbo de ação | `lancarAula`, `salvarPlanejamento`, `convidarUsuario` |
| Função de consulta | `buscarX` (uma) / `listarX` (várias) / `contarX` | `buscarTurma`, `listarInstrutoresDoCurso` |
| Schema Zod | `esquemaX` | `esquemaLancarAula`, `esquemaCadastroInstrutor` |
| Tipo/interface | `PascalCase`, sem prefixo `I` | `BlocoOcupacao`, `ResultadoAcao<T>` |
| Constante de módulo | `SCREAMING_SNAKE_CASE` | `ESCALA_ANTIGUIDADE_POSTO`, `TETO_AEC_PERCENTUAL` |
| Tabela/coluna no banco | `snake_case`, sem acento, tabela no plural (BRIEF §2) | `registros_aula`, `carga_horaria_tempos` |
| Parâmetro de URL | `snake_case` minúsculo, curto | `?curso=&turma=&semana=&ano=` |
| Branch Git | `<tipo>/<identificador>-<resumo>` | `feat/RF-DSA-08-sugestao-semanal` |
| Migration | `<timestamp>_<verbo>_<objeto>.sql` | `20260825143000_criar_registros_aula.sql` |
| Teste | `<arquivo-testado>.test.ts` espelhando o caminho | `tests/unidade/dsa/conflitos.test.ts` |

**Idioma:** **português do Brasil** em identificadores de domínio, rótulos, mensagens, comentários,
commits e documentação (BRIEF §9). Inglês só onde a plataforma impõe (`page`, `layout`, `default`,
`params`, `searchParams`, nomes de props de bibliotecas). Não se traduz **CHD, AEC, TAD, TR, TA,
DSA, CHR, PROENS, CAHO, LIQ, ROTA, LHFC, PM, OD, TFM** nem sigla de curso — são termos
intraduzíveis, jamais abreviados ou substituídos (BRIEF §9). E é **"Disciplina"**, nunca "Matéria"
(decisão P-14), em schema, código, URL e documentação.

### 2.1 Organização por domínio, não por tipo

```
lib/dominio/dsa/           ✅  conflitos.ts · grade.ts · tetos.ts · sugestao.ts
lib/dominio/tipos-todos/   ❌  um arquivo com todos os tipos do sistema
lib/utils.ts               ❌  o depósito onde vai o que ninguém sabe onde por
```

A v2.0 chegou nesse arranjo organicamente: `RegrasNormativas.gs`, `Cronograma.gs`,
`MotorPreditivo.gs`, `Dsa.gs` são divisões por **domínio**, não por tipo de artefato — e a
reconciliação de 2026-08-15 registrou que módulos surgidos organicamente foram mantidos como
estavam, porque reorganizar só para caber no mapa antigo geraria risco sem benefício
(constitution, Princípio VI). A v2.1 adota a mesma divisão desde o primeiro dia.

**Exceção deliberada:** `components/ui/` é organizada por tipo porque é código de terceiro
(shadcn/ui) e a ferramenta espera esse caminho. Não estenda a exceção.

### 2.2 Barrel files (`index.ts` que reexporta) — **não usar**

```ts
// lib/dominio/index.ts   ❌ PROIBIDO
export * from "./dsa/conflitos";
export * from "./cronograma/distribuicao-semanal";
```

Quatro motivos, em ordem de gravidade:

1. **Quebram a fronteira servidor/cliente.** Um Client Component que importa `{ formatarCH }` de um
   barrel arrasta a análise do módulo inteiro. Basta um irmão tocar `server-only` para o build
   quebrar — com uma mensagem de erro que aponta para o lugar errado.
2. **Inflam o bundle.** O *tree-shaking* funciona, mas nem sempre: um único módulo com efeito
   colateral no barrel impede a eliminação de todos os outros.
3. **Escondem a origem.** `import { calcularTeto } from "@/lib/dominio"` não diz de onde a regra vem.
   `from "@/lib/dominio/normativo/tetos"` diz — e num sistema com ~40 regras `RN-`, saber onde a
   regra mora é metade do trabalho de manutenção.
4. **Criam ciclos com facilidade.** A → barrel → B → barrel → A. Em módulos ES isso é erro; no
   escopo global do Apps Script era só um bug estranho.

**Regra:** importe sempre pelo caminho completo do módulo. A única exceção tolerada é
`components/ui/` quando o próprio shadcn gera o arquivo.

### 2.3 Ordem de imports

Ordem fixa, blocos separados por linha em branco, imposta por
`eslint-plugin-import` (`import/order`) com `--fix` automático:

```ts
// 1. Diretivas de fronteira — SEMPRE na primeira linha do arquivo, antes de tudo.
"use client";

// 2. Node / React / Next.js
import { Suspense } from "react";
import { revalidatePath } from "next/cache";

// 3. Dependências externas
import { z } from "zod";
import { BarChart } from "recharts";

// 4. Camadas internas, de baixo para cima: tipos → domínio → validação → dados → componentes
import type { Database } from "@/lib/tipos/database";
import { detectarConflitos } from "@/lib/dominio/dsa/conflitos";
import { esquemaLancarAula } from "@/lib/validacao/dsa";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GradeDsa } from "@/components/ciaara/grade-dsa";

// 5. Relativos do próprio segmento
import { CelulaTa } from "./_componentes/celula-ta";

// 6. Estilos (raro — Tailwind cobre quase tudo)
import "./impressao.css";
```

`import type` obrigatório para importação exclusivamente de tipo
(`@typescript-eslint/consistent-type-imports`): deixa explícito que aquele import some no build e
evita arrastar módulo de runtime sem necessidade.

---

## 3. Datas — a convenção mais fácil de errar

**Regra única:** o banco guarda `timestamptz` (instante absoluto, UTC); a apresentação formata em
`America/Sao_Paulo`. **Nunca** se guarda "hora local" num campo sem fuso, e **nunca** se formata
data com `toLocaleDateString()` sem `timeZone` explícito.

O motivo é concreto: o servidor da Vercel roda em UTC. `new Date("2026-08-25T23:30:00Z")` formatado
sem `timeZone` sai como **26/08** no servidor e **25/08** no navegador do usuário no Rio — e a
diferença aparece como *hydration mismatch* no React ou, pior, como lançamento de DSA no dia errado.

### 3.1 Três tipos de temporalidade, três tratamentos

| Natureza | Tipo no banco | Tipo em TS | Como formatar |
|---|---|---|---|
| **Instante** (criado em, editado em, último acesso) | `timestamptz` | `string` ISO | `formatarDataHora()` com `timeZone: "America/Sao_Paulo"` |
| **Dia civil** (data da aula, feriado, vigência) | `date` | `string` `YYYY-MM-DD` | `formatarData()` — **sem** conversão de fuso |
| **Hora do dia** (início do TA) | `time` | `string` `HH:MM` | exibida como veio; é hora de relógio da OM |

O erro clássico é tratar dia civil como instante. `new Date("2026-08-25")` é interpretado como
**meia-noite UTC** e, exibido em `America/Sao_Paulo` (UTC−3), vira **24/08 às 21:00**. O dia letivo
retrocede um dia. Por isso a formatação de dia civil **não passa por `Date`**.

```ts
// lib/formato/data.ts

/** Fuso institucional. Uma constante, um lugar. Nunca literal solto pelo código. */
export const FUSO_CIAARA = "America/Sao_Paulo";

/**
 * Formata um DIA CIVIL (`YYYY-MM-DD`) como `dd/mm/aaaa`.
 *
 * O quê: converte a string do banco no formato brasileiro.
 * Para quê: data de aula, de feriado e de vigência são dias civis — não têm hora e não têm fuso.
 * Como: fatiamento de string, deliberadamente SEM `new Date()`. Isso torna impossível o
 *       deslocamento de um dia causado por interpretação UTC da meia-noite.
 */
export function formatarData(diaCivil: string | null | undefined): string {
  // Degradação segura (RN-DEG-01): dado ausente vira travessão, nunca "Invalid Date" nem exceção.
  if (!diaCivil) return "—";
  const [ano, mes, dia] = diaCivil.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata um INSTANTE (`timestamptz`) como `dd/mm/aaaa HH:MM` no fuso institucional.
 *
 * O quê: converte o instante absoluto vindo do banco para a hora de Brasília.
 * Para quê: carimbos de auditoria (`criado_em`, `editado_em`, `ultimo_acesso`).
 * Como: `Intl.DateTimeFormat` com `timeZone` EXPLÍCITO — nunca o fuso do processo.
 *        Com fuso explícito, servidor e cliente produzem a mesma string e não há hydration mismatch.
 */
export function formatarDataHora(instanteIso: string | null | undefined): string {
  if (!instanteIso) return "—";
  const data = new Date(instanteIso);
  if (Number.isNaN(data.getTime())) return "—"; // string corrompida não derruba a tela
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: FUSO_CIAARA, // ← a linha que impede o bug de um dia
  }).format(data);
}
```

---

## 4. Números e carga horária

O sistema fala em **TA (Tempos de Aula)** e em **horas**. Confundir os dois é erro de domínio, não
de formatação — por isso os tipos e as funções são separados.

```ts
// lib/formato/numero.ts

/**
 * Formata um número decimal no padrão brasileiro (vírgula decimal, ponto de milhar).
 *
 * O quê: `1234.5` → `"1.234,5"`.
 * Para quê: percentuais de teto (AEC 10%, TAD 5%, TR 10%) e indicadores do painel.
 * Como: `Intl.NumberFormat("pt-BR")` — não se faz `.replace(".", ",")` à mão.
 */
export function formatarNumero(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

/**
 * Formata Tempos de Aula.
 *
 * O quê: `18` → `"18 TA"`.
 * Para quê: TA é a unidade normativa do CIAARA-11. É SEMPRE inteiro e NUNCA vira "horas" por conta
 *           própria — a conversão depende da duração do TA no regime vigente na data (45 ou 50 min,
 *           RN-2027-09), e por isso não pode ser feita por um formatador.
 * Como: trunca e concatena a sigla, que jamais é traduzida ou expandida (BRIEF §9).
 */
export function formatarTempos(ta: number | null | undefined): string {
  if (ta === null || ta === undefined || !Number.isFinite(ta)) return "—";
  return `${Math.trunc(ta)} TA`;
}

/**
 * Formata carga horária em horas.
 *
 * O quê: `12.5` → `"12h30"`; `8` → `"8h"`.
 * Para quê: faixas de CH docente (20h → 8–12 h; 40h → 16–24 h; DE → 16–30 h — BRIEF §9)
 *           e totalizadores de relatório.
 * Como: separa parte inteira e minutos; omite os minutos quando forem zero, porque "8h" é como
 *       o documento normativo escreve — e a interface espelha o documento, não o contrário.
 */
export function formatarCargaHoraria(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas)) return "—";
  const inteiras = Math.trunc(horas);
  const minutos = Math.round((horas - inteiras) * 60);
  return minutos === 0 ? `${inteiras}h` : `${inteiras}h${String(minutos).padStart(2, "0")}`;
}
```

**Convenção de conversão TA → horas.** A conversão existe, mas mora em
`lib/dominio/horarios/conversao.ts` e **exige o regime vigente como parâmetro**:

```ts
// lib/dominio/horarios/conversao.ts

/**
 * Converte Tempos de Aula em horas-relógio.
 *
 * O quê: `converterTemposEmHoras(18, 50)` → `15` (18 × 50 min = 900 min = 15 h).
 * Para quê: relatórios que exigem CH em horas (LIQ, OS de Instrutoria, Ficha do Docente).
 * Como: multiplica pela duração do TA e divide por 60. A duração NÃO tem valor padrão de
 *       propósito — quem chama precisa ter resolvido o regime vigente na data (RN-2027-09).
 *       Um padrão silencioso aqui reintroduziria o achado (j) da v2.0: "regime de exceção nunca
 *       aplicado a cálculo".
 */
export function converterTemposEmHoras(tempos: number, duracaoTaMinutos: number): number {
  return (tempos * duracaoTaMinutos) / 60;
}
```

---

## 5. Configuração

### 5.1 `tsconfig.json` — `strict` não é opcional

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": false,                          // TypeScript puro; nada de .js escapando da checagem
    "skipLibCheck": true,                      // não checa .d.ts de terceiros (custo sem retorno)
    "incremental": true,
    "noEmit": true,                            // quem emite é o Next.js; o tsc só valida

    // ── Rigor (BRIEF §1: TypeScript `strict`) ──────────────────────────────────────────────────
    "strict": true,                            // liga o pacote inteiro de checagens estritas
    "noUncheckedIndexedAccess": true,          // `array[0]` passa a ser `T | undefined` — força tratar
                                               //   o caso "linha inexistente", que é REAL num sistema
                                               //   alimentado por dado migrado
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,        // impede `case` que vaza — bug clássico em máquina de estado
    "forceConsistentCasingInFileNames": true,  // Linux (CI) e macOS divergem em maiúsculas; isso alinha
    "exactOptionalPropertyTypes": true,        // distingue "propriedade ausente" de "propriedade = undefined";
                                               //   importante com coluna nullable do PostgreSQL

    "paths": { "@/*": ["./*"] },               // alias único; sem `../../../` em lugar nenhum
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "scripts/etl"]   // ETL é Python; não é território do tsc
}
```

### 5.2 ESLint — as regras que sustentam a arquitetura

```js
// eslint.config.mjs
import next from "eslint-config-next";
import ts from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default [
  ...next(),
  ...ts.configs.recommendedTypeChecked,

  {
    plugins: { import: importPlugin },
    rules: {
      // Ordem de imports do §2.3, com correção automática.
      "import/order": ["error", {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      }],
      // `import type` obrigatório quando o import é só de tipo.
      "@typescript-eslint/consistent-type-imports": "error",
      // Promise não aguardada é a origem do N+1 silencioso e do "salvou mas não salvou".
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      // `any` explícito só com justificativa em comentário no PR.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // ── REGRA QUE PROTEGE O CORAÇÃO PORTADO (documento 20 §6, risco R-10) ────────────────────────
  {
    files: ["lib/dominio/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@supabase/*"],       message: "lib/dominio/ é PURO: sem acesso a banco. Receba o dado por parâmetro." },
          { group: ["next", "next/*"],    message: "lib/dominio/ não conhece o framework. Regra pura, testável sem Next.js." },
          { group: ["react", "react-dom"],message: "lib/dominio/ não renderiza. Componentes ficam em components/." },
          { group: ["node:fs", "node:*"], message: "lib/dominio/ não faz I/O. Nenhum. Nunca." },
          { group: ["@/lib/supabase/*"],  message: "lib/dominio/ não importa cliente de dados." },
        ],
      }],
    },
  },

  // ── REGRA QUE PROTEGE A service_role (documento 20 §8.3, risco R-09) ─────────────────────────
  {
    files: ["app/**/*.tsx", "components/**/*.tsx", "lib/dominio/**", "lib/validacao/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/lib/supabase/admin",
          message: "service_role só em lib/acoes/** e scripts/**. Se a RLS está barrando, conserte a policy.",
        }],
      }],
    },
  },
];
```

### 5.3 Prettier

```jsonc
// .prettierrc
{
  "semi": true,
  "singleQuote": false,          // aspas duplas: alinha com JSX e com o SQL das migrations
  "trailingComma": "all",        // diff limpo ao acrescentar item em lista
  "printWidth": 100,             // acomoda comentário didático ao lado do código sem quebrar
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",             // evita ruído de CRLF entre máquinas
  "plugins": ["prettier-plugin-tailwindcss"]   // ordena as classes Tailwind; acaba a discussão
}
```

Prettier **formata**; ESLint **julga**. Não há regra de estilo no ESLint — a sobreposição entre os
dois é a origem clássica de conflito de `--fix`.

### 5.4 `.env.local.example` — completo e comentado

```bash
# =============================================================================================
# CIAARA-11 v2.1 — variáveis de ambiente
#
# COMO USAR:  cp .env.local.example .env.local   e preencha com os valores do SEU ambiente.
# NUNCA versione o `.env.local` — ele está no .gitignore e precisa continuar lá.
#
# REGRA DE OURO DO NEXT.JS:
#   toda variável com prefixo NEXT_PUBLIC_ é EMBUTIDA NO BUNDLE e visível a qualquer usuário.
#   Toda variável sem o prefixo existe apenas no servidor.
#   Consequência prática: se você precisou pôr NEXT_PUBLIC_ num segredo, o desenho está errado.
# =============================================================================================

# ---------------------------------------------------------------------------------------------
# SUPABASE — público (pode ir ao navegador)
# ---------------------------------------------------------------------------------------------

# URL do projeto Supabase. Pública por natureza: é o endereço da API.
# Local (Supabase CLI): http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"

# Chave anônima (anon / publishable). Vai para o navegador — e isso é SEGURO **porque existe RLS**.
# Ela só concede o papel `anon`/`authenticated`; toda linha ainda passa pelas policies.
# Se alguma tabela estiver sem RLS, esta chave lê a tabela inteira. Daí a regra do BRIEF §2:
# TODA tabela tem ENABLE ROW LEVEL SECURITY, e tabela sem policy é inacessível — intencionalmente.
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."

# ---------------------------------------------------------------------------------------------
# SUPABASE — SEGREDO (jamais no navegador)
# ---------------------------------------------------------------------------------------------

# Chave `service_role`. IGNORA TODA A RLS. É equivalente a acesso administrativo ao banco.
#
#   ⚠️  NUNCA prefixe com NEXT_PUBLIC_.
#   ⚠️  NUNCA importe `lib/supabase/admin.ts` de um Client Component (o `server-only` quebra o build).
#   ⚠️  Usos autorizados, e só estes três:
#        1. convite de usuário pelo Admin — auth.admin.inviteUserByEmail() (BRIEF §3)
#        2. carga do ETL Sheets → PostgreSQL (Épico 2)
#        3. script de manutenção versionado, executado à mão, nunca por requisição de tela
#   ⚠️  Se vazar: rotacione IMEDIATAMENTE no painel do Supabase. Ela não expira sozinha.
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."

# String de conexão direta (Postgres). Usada por pgTAP, ETL e migrations no CI.
# Contém a senha do banco — segredo. Em produção, prefira o pooler (porta 6543).
DATABASE_URL="postgresql://postgres:SENHA@db.xxxxxxxxxxxx.supabase.co:5432/postgres"

# ---------------------------------------------------------------------------------------------
# APLICAÇÃO
# ---------------------------------------------------------------------------------------------

# URL canônica desta instância. Usada nos links de convite e de recuperação de senha —
# se estiver errada, o e-mail de convite leva o usuário para o ambiente errado.
# Local: http://localhost:3000  ·  Preview: a URL da Vercel  ·  Produção: o domínio institucional
NEXT_PUBLIC_URL_APLICACAO="http://localhost:3000"

# Rótulo do ambiente, exibido numa faixa no topo em local/preview.
# Serve para que ninguém lance DSA de verdade achando que está em homologação.
# Valores: local | preview | producao
NEXT_PUBLIC_AMBIENTE="local"

# ---------------------------------------------------------------------------------------------
# ETL (scripts/etl — Python). Só na máquina de quem roda a carga; nunca no ambiente da Vercel.
# ---------------------------------------------------------------------------------------------

# ID da planilha `Banco de dados CIAARA-11 v2.0` (23 abas), origem da migração.
ETL_PLANILHA_ID="1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"

# Caminho do JSON da conta de serviço do Google com leitura na planilha.
# O arquivo fica FORA do repositório. Nunca commite credencial de serviço.
ETL_CREDENCIAL_GOOGLE="/caminho/absoluto/fora/do/repo/credencial-servico.json"
```

---

## 6. Git

### 6.1 Conventional Commits com identificador de origem

Formato obrigatório (BRIEF §7, item 7 — Princípio VIII):

```
<tipo>(<identificador>): <resumo no imperativo, em português, ≤ 72 caracteres>

<corpo opcional: o porquê, não o quê — o diff já mostra o quê>

<rodapé opcional: BREAKING CHANGE, Refs, Closes>
```

`<identificador>` é **o `RF-`/`RN-`/`RNF-`/épico de origem**. É isso que mantém a trilha da v2.0
até a v2.1 legível — e é o que permite responder "de onde veio esta linha de código?" sem
arqueologia.

| Tipo | Uso | Exemplo |
|---|---|---|
| `feat` | requisito funcional novo ou portado | `feat(RF-DSA-08): gerar sugestão semanal do DSA` |
| `fix` | correção de comportamento | `fix(RN-CONF-01): ignorar bloco sem TA inicial na detecção` |
| `refactor` | mudança sem efeito observável | `refactor(RF-MOD-02): extrair grade do DSA para lib/dominio` |
| `perf` | desempenho medido | `perf(RF-CRONOS-03): substituir N+1 por join no PostgREST` |
| `test` | teste | `test(RN-ANT-02): cobrir empate de posto por antiguidade declarada` |
| `db` | migration | `db(RN-2027-09): criar curso_regime_historico com vigência` |
| `docs` | documentação | `docs(BRIEF): registrar revogação de RNF-PLAT-01..04` |
| `chore` | infraestrutura, dependências, CI | `chore(CI): validar tipos gerados contra o schema` |
| `style` | só formatação | `style: aplicar Prettier em lib/formato` |

Commit **sem identificador** só é aceito em `chore`, `style` e `docs` genéricos. Todo `feat`, `fix`,
`perf`, `db` e `test` cita o seu.

### 6.2 Estratégia de branch

```
main ──────────────●────────────●────────────●──────────▶  produção (deploy automático)
                   ▲            ▲            ▲
                   │            │            │  merge por PR aprovado + CI verde
        feat/RF-DSA-08-…   fix/RN-CONF-01-…   db/RN-2027-09-…
```

- **`main` é sempre implantável.** Push direto é bloqueado por regra de proteção.
- **Uma branch por fatia**, nomeada `<tipo>/<identificador>-<resumo-curto>`.
- **Toda branch abre uma Vercel Preview** com o seu próprio ambiente. É onde o Bernardo valida
  antes do merge — o que a v2.0 não tinha (BRIEF §0).
- **Merge por squash**, para que a `main` tenha um commit por fatia, com o identificador no título.
- **Sem branch de longa duração.** `develop` permanente reintroduz o problema de integração que a
  preview por branch resolve.

### 6.3 Template de Pull Request

```markdown
<!-- .github/pull_request_template.md -->
## Identificador de origem
<!-- RF-…, RN-…, RNF-…, épico ou achado. Obrigatório. Se não há origem, por que esta fatia existe? -->

## O que muda
<!-- Em uma frase, o comportamento observável que passa a existir (ou deixa de existir). -->

## Destino do requisito na v2.1
- [ ] **[PRESERVADO]** — mesma regra, mesma implementação
- [ ] **[PRESERVADO — nova implementação]** — mesma regra, mecanismo diferente
- [ ] **[ABSORVIDO PELA PLATAFORMA]** — o motor passa a garantir o que o código garantia
- [ ] **[REVOGADO — v2.1]** — motivo e substituto declarados abaixo
- [ ] **[NOVO — v2.1]** — não existia na v2.0

## Definition of Done (BRIEF §7) — todos, sem exceção
- [ ] 1. `tsc --noEmit` sem erro e `eslint` sem aviso novo
- [ ] 2. **Unidade (Vitest):** toda função de `lib/dominio/` tocada, com casos sintéticos
- [ ] 3. **Invariantes (pgTAP):** asserção nomeada por `RN-` de *Risco: Alto* (stub rastreável é
       aceito e melhor que cobertura fingida — Princípio VIII)
- [ ] 4. **RLS (teste negativo):** para cada perfil, o que ele **não** pode ler/escrever é negado
       pelo banco. Só o caminho feliz **não** vale.
- [ ] 5. **E2E (Playwright):** percurso principal da fatia, incluindo a rota `/print/*` quando houver
- [ ] 6. Migration aplicada no preview e **revertível** (script `down` ou plano descrito abaixo)
- [ ] 7. Commits no padrão `feat(RF-…): …`

## Fronteira servidor/cliente
- [ ] Nenhum `"use client"` novo em `page.tsx` ou `layout.tsx` (só em folha — risco R-01)
- [ ] Nenhum `await` dentro de laço em `app/**` (risco R-02 — N+1)
- [ ] `lib/dominio/` continua sem `import` de supabase/next/react (risco R-10)
- [ ] `lib/tipos/database.ts` regenerado se houve migration (risco R-04)

## Plano de reversão da migration
<!-- Obrigatório quando há arquivo em supabase/migrations/. "Não se aplica" também é resposta. -->

## Como validar no preview
<!-- Passo a passo curto: em que URL entrar, com qual perfil, o que observar. -->
```

### 6.4 O que roda no CI

```yaml
# .github/workflows/ci.yml  (esqueleto comentado)
name: CI
on: [pull_request, push]

jobs:
  qualidade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile   # lockfile é lei: build reprodutível

      # 1. TIPOS — barreira mais barata e a que pega mais coisa.
      - run: pnpm typecheck

      # 2. LINT — inclui as regras que protegem lib/dominio/ e a service_role (§5.2).
      - run: pnpm lint

      # 3. UNIDADE — Vitest sobre lib/dominio/**. Sem banco, sem rede. Segundos.
      - run: pnpm test:unidade

  banco:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start                   # PostgreSQL efêmero em Docker

      # 4. MIGRATIONS DO ZERO — prova que a sequência inteira aplica numa base limpa.
      - run: supabase db reset

      # 5. TIPOS GERADOS × SCHEMA — mitigação do risco R-04 (documento 20 §11).
      #    Regenera e falha se o resultado diferir do que está commitado. É a única defesa
      #    que não depende de alguém lembrar de rodar `gen types`.
      - run: |
          supabase gen types typescript --local > lib/tipos/database.ts
          git diff --exit-code lib/tipos/database.ts \
            || (echo "::error::Tipos gerados desatualizados. Rode 'pnpm db:tipos' e commite." && exit 1)

      # 6. INVARIANTES — pgTAP: contagens, integridade referencial, uma asserção por RN- de risco alto.
      - run: pnpm test:invariantes

      # 7. RLS — teste NEGATIVO por perfil (BRIEF §7, item 4). Obrigatório.
      - run: pnpm test:rls

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      # 8. BUILD — última barreira: pega erro de fronteira servidor/cliente que só aparece aqui.
      - run: pnpm build
```

**E2E (Playwright)** roda **contra a URL de preview da Vercel**, após o deploy — não no CI acima,
porque precisa de aplicação implantada e banco de preview. A comparação de layout de impressão com
o aprovado da v2.0 (`RNF-COMP-01`) mora aí.

---

## 7. Scripts de `package.json`, um a um

```jsonc
{
  "scripts": {
    // ── Desenvolvimento ────────────────────────────────────────────────────────────────────────
    // Sobe o Next.js em modo desenvolvimento com Turbopack. Recompilação incremental rápida.
    "dev": "next dev --turbo",

    // Compila para produção. É a barreira que revela erro de fronteira servidor/cliente
    // (ex.: `server-only` importado por Client Component) — erro que o `tsc` sozinho não vê.
    "build": "next build",

    // Serve o build de produção localmente. Usado para conferir a impressão (/print/*), que
    // se comporta diferente em dev por causa do overlay de desenvolvimento.
    "start": "next start",

    // ── Qualidade (itens 1 e 2 da DoD, BRIEF §7) ───────────────────────────────────────────────
    // Checagem de tipos sem emitir arquivo. Primeiro comando a rodar quando algo estranho acontece.
    "typecheck": "tsc --noEmit",

    // ESLint em todo o repositório, incluindo as regras que protegem lib/dominio/ e a service_role.
    "lint": "next lint",

    // Corrige o que é auto-corrigível (ordem de imports, aspas, ponto e vírgula).
    "lint:fix": "next lint --fix",

    // Verifica formatação sem alterar arquivo. É o que o CI usa.
    "format:check": "prettier --check .",

    // Aplica a formatação. Rodar antes de commitar; o hook de pre-commit também roda.
    "format": "prettier --write .",

    // ── Testes ─────────────────────────────────────────────────────────────────────────────────
    // Vitest em modo observador, para desenvolver a regra e o teste lado a lado.
    "test": "vitest",

    // Unidade em execução única (CI). Cobre lib/dominio/** — sem banco, sem rede, segundos.
    "test:unidade": "vitest run tests/unidade",

    // Cobertura das regras de domínio. Não se persegue número; persegue-se "toda RN- tocada tem caso".
    "test:cobertura": "vitest run tests/unidade --coverage",

    // pgTAP contra o banco local: contagens, integridade referencial e uma asserção nomeada por
    // RN- de Risco Alto. Stub explicitamente pendente é aceito (Princípio VIII).
    "test:invariantes": "supabase test db",

    // Teste NEGATIVO de RLS: para cada perfil, o que ele não pode ler/escrever é negado pelo banco.
    // Usa clientes autenticados como cada perfil. Obrigatório na DoD (BRIEF §7, item 4).
    "test:rls": "vitest run tests/invariantes/rls",

    // Playwright: percursos principais + rotas de impressão. Contra o preview, não contra o dev.
    "test:e2e": "playwright test",

    // Abre o inspetor do Playwright para depurar um percurso passo a passo.
    "test:e2e:ui": "playwright test --ui",

    // ── Banco ──────────────────────────────────────────────────────────────────────────────────
    // Sobe PostgreSQL + Auth + Studio em Docker. Primeiro comando do dia.
    "db:start": "supabase start",

    // Derruba os contêineres. Roda ao fim do dia para liberar memória.
    "db:stop": "supabase stop",

    // Derruba, reaplica TODAS as migrations do zero e roda seed.sql.
    // É o teste real de que a sequência de migrations aplica numa base limpa. Use sem medo:
    // o banco local é descartável por definição.
    "db:reset": "supabase db reset",

    // Cria um arquivo de migration vazio com timestamp. O SQL é escrito À MÃO —
    // migration gerada por diff que ninguém leu é como o schema da v2.0 divergiu do documentado.
    "db:migration": "supabase migration new",

    // Regenera lib/tipos/database.ts a partir do banco LOCAL.
    // OBRIGATÓRIO depois de toda migration. O CI falha se o resultado divergir do commitado (R-04).
    "db:tipos": "supabase gen types typescript --local > lib/tipos/database.ts",

    // Aplica as migrations pendentes no projeto remoto vinculado. No fluxo normal quem roda é o CI;
    // à mão, só com autorização explícita e para o ambiente correto.
    "db:push": "supabase db push --linked",

    // ── ETL (Épico 2) ──────────────────────────────────────────────────────────────────────────
    // Extrai as 23 abas da planilha v2.0 para CSV em scripts/etl/saida/.
    "etl:extrair": "python scripts/etl/extrair_sheets.py",

    // Carrega os CSV no PostgreSQL via COPY, gravando rastro em migracao_log.
    "etl:carregar": "python scripts/etl/carregar_postgres.py",

    // Reconcilia contagens e integridade contra a origem. Relatório de divergência, sem escrever nada.
    "etl:reconciliar": "python scripts/etl/reconciliar.py",

    // ── Composição ─────────────────────────────────────────────────────────────────────────────
    // Roda localmente a mesma sequência do CI. Rode antes de abrir o PR e economize um ciclo.
    "verificar": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unidade && pnpm build"
  }
}
```

---

## 8. Fluxo do dia a dia

```
┌─ 1. supabase start ─────────────────────────────────────────────────────────────────┐
│  Sobe PostgreSQL + Auth + Studio em Docker. `supabase status` mostra as URLs.       │
│  A anon key local é fixa e já está no .env.local.example.                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 2. Migration (se a fatia mexe no schema) ──────────────────────────────────────────┐
│  pnpm db:migration criar_registros_aula                                             │
│  → escreve o SQL À MÃO: tabela, ENABLE ROW LEVEL SECURITY, policies, índices,       │
│    trigger set_auditoria(), colunas de auditoria e `origem_migracao_v1`.            │
│  pnpm db:reset  → prova que a sequência inteira aplica do zero.                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 3. pnpm db:tipos ──────────────────────────────────────────────────────────────────┐
│  Regenera lib/tipos/database.ts. NÃO PULE ESTE PASSO — é o risco R-04.              │
│  A partir daqui o TypeScript conhece a tabela nova, e o autocompletar funciona.      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 4. Implementar, de dentro para fora ───────────────────────────────────────────────┐
│  a) lib/dominio/    → a regra RN-, pura, com o teste Vitest ao lado                 │
│  b) lib/validacao/  → o schema Zod, compartilhado cliente+servidor                  │
│  c) lib/acoes/      → a Server Action: Zod → domínio → Supabase → revalidatePath    │
│  d) app/            → a página (Server Component) e as ilhas "use client"           │
│  e) components/     → só o que for reutilizado por 2+ rotas                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 5. Testar ─────────────────────────────────────────────────────────────────────────┐
│  pnpm test:unidade · pnpm test:invariantes · pnpm test:rls (negativo!) · pnpm test:e2e│
│  pnpm verificar  → roda a sequência inteira do CI localmente                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 6. PR ─────────────────────────────────────────────────────────────────────────────┐
│  git commit -m "feat(RF-DSA-08): gerar sugestão semanal do DSA"                      │
│  git push -u origin feat/RF-DSA-08-sugestao-semanal                                 │
│  → abre o PR com o template preenchido (§6.3)                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 7. Preview ────────────────────────────────────────────────────────────────────────┐
│  A Vercel publica a URL da branch; o CI aplica as migrations no banco de preview.    │
│  É AQUI que o Bernardo valida — não em produção, não em captura de tela.             │
│  Ambiente que a v2.0 nunca teve (BRIEF §0).                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─ 8. Merge ──────────────────────────────────────────────────────────────────────────┐
│  Squash na `main` → deploy de produção + `supabase db push` pelo CI.                 │
│  A branch é apagada. O identificador RF-/RN- fica no título do commit, para sempre.  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Rastreabilidade

| Origem v2.0 | Destino v2.1 | Onde |
|---|---|---|
| `RF-MOD-01/02` (divisão por domínio) | **[PRESERVADO]** — pastas por domínio em `lib/dominio/` e `app/` | §1, §2.1 |
| `RF-MOD-03` (zero mudança de comportamento) | **[PRESERVADO]** — provado por invariantes, não por diff | §6.4 |
| `RF-MOD-04` (`BUILD_ID`) | **[ABSORVIDO PELA PLATAFORMA]** — deploy atômico da Vercel | documento 20 §0 |
| Regra de ouro do escopo global `.gs` | **[REVOGADO — v2.1]** — módulos ES têm escopo próprio | §0 |
| `include()` do `HtmlService` | **[REVOGADO — v2.1]** — composição por `import` e por layout | §0 |
| `RNF-PLAT-02/03` (sem bundler, sem CI/CD) | **[REVOGADO — v2.1]** — Next.js + GitHub Actions | §5, §6.4 |
| `RNF-MAN-04` (manutenção de calendário) | **[PRESERVADO]** — `/admin/calendario` + `supabase/migrations` | §1 |
| `RNF-CONF-02` (coluna aditiva/opcional) | **[PRESERVADO]** — coluna nullable + degradação na leitura | §3, §4 |
| Princípio VIII (rastreabilidade) | **[PRESERVADO]** — identificador no commit e no PR | §6.1, §6.3 |
| Princípio VII (parâmetro como dado) | **[PRESERVADO]** — `config_parametros`, `/admin/parametros` | §1 |

## 10. Pontos que dependem de confirmação

1. **Gerenciador de pacotes.** Este documento assume **pnpm** (lockfile determinístico, `node_modules`
   menor). Se o Bernardo preferir npm, os scripts mudam de prefixo e o `ci.yml` muda de action.
2. **`exactOptionalPropertyTypes: true`.** É rigor bem-vindo com colunas nullable, mas gera atrito
   ao integrar com bibliotecas que não o adotam. Manter ligado desde o início ou ligar no Épico 4?
3. **E2E fora do CI principal.** A proposta é rodar Playwright contra a preview após o deploy.
   Alternativa é subir a aplicação dentro do próprio job — mais lento, porém autocontido.

---

*Fim do documento 24. Ver também `20-Arquitetura-Alvo-NextJS-Supabase.md` e
`25-Camada-de-Dados-e-Estado.md`.*
