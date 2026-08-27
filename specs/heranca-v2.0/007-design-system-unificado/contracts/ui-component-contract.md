# Contrato — Objeto UI e componentes reutilizáveis (Épico A)

Não há contrato de função de backend nesta spec (nenhum arquivo `.ts` é tocado). O contrato real é
de **CSS Custom Properties**, do objeto `UI` em JavaScript, e das assinaturas dos componentes/
funções novos — o que qualquer view futura pode/deve consumir.

## CSS Custom Properties (`app/globals.css`, `:root` + `[data-bs-theme="dark"]`)

**Atualizado durante `/speckit-implement` (tasks.md T006)**: o atributo de tema é `data-bs-theme`
— o mecanismo **nativo do Tailwind CSS + shadcn/ui** (já pinado no projeto), não um `[data-theme]` inventado.
Tailwind CSS já restiliza automaticamente cards/tabelas/navbar/formulários com esse mesmo atributo;
só os componentes verdadeiramente customizados deste projeto (badges de categoria) precisam de
override próprio sob `[data-bs-theme="dark"]`.

| Variável | Papel | Valor tema claro (`03-design-system.md` §2) |
|---|---|---|
| `--cor-primaria` | Header, sidebar, `bg-primary` | `#003366` |
| `--cor-sucesso` | Aprovado, matriculado, concluído, no prazo | mapeada a `text-success`/`bg-success` do Tailwind CSS |
| `--cor-atencao` | Pendente, prazo apertado (Aviso Nível 2) | mapeada a `text-warning`/`bg-warning` |
| `--cor-critico` | Erro, conflito, bloqueio (Alerta Nível 3) | mapeada a `text-danger`/`bg-danger` |
| `--cor-neutro` | Estado padrão/inativo | mapeada a `text-secondary`/`bg-secondary` |
| `--fonte-principal` | Tipografia de todo o sistema | `'Rawline', system-ui, sans-serif` (fallback automático) |

Tema escuro (`[data-bs-theme="dark"]`) redefine os mesmos nomes com contraste corrigido (valores
exatos são detalhe de implementação de `/speckit-tasks`, não pré-decididos aqui — `03-design-system.md`
§2 já autoriza isso explicitamente: "o tema escuro... fica para a implementação, não para este
documento de decisão").

**Regra**: nenhuma view pode declarar uma cor semântica fora dessas variáveis (FR-001) — cores
"cruas" (hex literal) só são aceitáveis para casos genuinamente fora do domínio semântico (ex.: um
ícone institucional único, já uma exceção documentada em `03-design-system.md` UI-03).

## Objeto `UI` (JavaScript, `components/ciaara/`)

```js
const UI = {
  cor(nome) { /* le --cor-{nome} via getComputedStyle, para os poucos casos que precisam do valor
                  em JS (montar HTML dinamico) - nunca hardcoded duas vezes */ },
};
```

## `alternarTema()` / detecção automática (`components/ciaara/` + script inline em `app/layout.tsx`)

- **Script inline em `app/layout.tsx` (`<head>`, antes do `<body>` renderizar)**: lê `localStorage`
  (`chave: 'tema'`); se ausente, usa `window.matchMedia('(prefers-color-scheme: dark)').matches`
  (RF-DS-03.1); aplica `document.documentElement.setAttribute('data-bs-theme', 'dark'|'light')`
  **antes de qualquer pintura visível** (research.md achado 1) — nunca depende de `components/ciaara/`.
- **`alternarTema()`** (`components/ciaara/`, chamada pelo botão de toggle da navbar): inverte o
  `data-bs-theme` atual, grava em `localStorage['tema']` — a partir daí, essa escolha manual sempre
  prevalece sobre a detecção automática, mesmo que a preferência do SO mude depois (Clarifications
  2026-08-15).

## `formatarNomeInstrutor_(instrutor)` (função pura, `components/ciaara/`)

- **Parâmetros**: objeto com `Posto_Graduacao`, `Esp_Hab_Obs`, `Nome_Guerra` (campos reais de
  `instrutores`, research.md achado 5) — qualquer um pode estar vazio/ausente.
- **Retorno**: string HTML `"{Posto_Graduacao} {Esp_Hab_Obs} <strong>{Nome_Guerra}</strong>"`
  (RF-INSTR-15), sem espaços duplos nem `"undefined"` visível quando um campo estiver vazio.
- **Consumidores**: `app/(app)/instrutores/page.tsx` (migração desta spec); qualquer view futura que exiba
  nome de instrutor deve usar esta função, nunca montar a string inline.

## `.card-kpi` (componente CSS, `app/globals.css`)

Card `.card` com número grande (`fs-3`/`fs-4`) + ícone lucide-react + rótulo — mesmo padrão já
descrito em `03-design-system.md` §7, aplicável a qualquer tela futura que precise de um indicador
numérico, sem CSS específico de página (RF-DS-04).

## `.grade-semanal` (componente CSS, `app/globals.css`)

Extraído da estilização de tabela já construída em `app/(app)/cronograma/page.tsx` (Épico G) — única grade de
alocação semanal do sistema hoje. Extração não pode alterar o comportamento/aparência de
`app/(app)/cronograma/page.tsx` (constitution, Princípio VI) — é reuso de nome de classe, não reescrita.

## Identidade institucional (navbar, `app/layout.tsx`)

- **Slot de imagem**: `<img id="brasaoCiaara" alt="Brasão do CIAARA" style="display:none">` — sem
  `src` (implementado em `/speckit-implement`, tasks.md T018: `src=""` dispara uma requisição para
  a própria página no navegador, quirk conhecido — nunca um "sem imagem" limpo). Fica invisível até
  Bernardo preencher `src` com o asset real (research.md achado 4, RN-DEG-01).
- **Título de exibição**: "Sistema de Gestão Acadêmica" (`03-design-system.md` §3), substituindo o
  atual "CIAARA-11 — Gestão Acadêmica" na navbar — nome técnico "CIAARA-11" continua nos documentos
  técnicos, não muda.
