# Contracts — Funções tocadas (Hotfix Roteamento/Fonte/Performance)

## Backend (`lib/acoes/dsa.ts`)

### `dadosBrutosDsaSemana_()` — NOVA, função pura (research.md §3)

```text
dadosBrutosDsaSemana_() -> { turmas, registros, avaliacoes, eventos }  (ver data-model.md §1)
```

Sem parâmetros, sem efeito colateral (só leitura). Chamada uma única vez por `getDsaSemanal`.

### `blocosBrutosDoDia_(idTurma, dataIso, dados)` — assinatura ALTERADA

Antes: `blocosBrutosDoDia_(idTurma, dataIso)`, lia `registros_aula`/`avaliacoes`/
`atividades_nao_letivas` do zero a cada chamada.

Depois: recebe `dados` (saída de `dadosBrutosDsaSemana_()`) como 3º parâmetro obrigatório, filtra
`dados.registros`/`dados.avaliacoes`/`dados.eventos` em vez de ler o banco. Mesma lógica de
filtro/montagem de bloco, mesma saída (array de blocos) — só a fonte dos dados de entrada muda.

**Sem outro ponto de chamada** (confirmado por grep em `) além de `detectarConflitosDsa_` —
mudança de assinatura sem impacto em nenhum outro arquivo.

### `detectarConflitosDsa_(dataIso, dados)` — assinatura ALTERADA

Antes: `detectarConflitosDsa_(dataIso)`, lia `turmas` do zero a cada chamada e chamava
`blocosBrutosDoDia_` (assinatura antiga) para cada turma.

Depois: recebe `dados` como 2º parâmetro obrigatório, itera `dados.turmas` em vez de reler, repassa
`dados` para `blocosBrutosDoDia_`. Mesmo algoritmo de detecção de sobreposição/conflito (RN-CONF-01,
inalterado) — só a fonte dos dados de entrada muda. Mesma saída (array de blocos com `conflito`/
`conflitoTipo` preenchidos).

**Sem outro ponto de chamada** além de `getDsaSemanal` (confirmado por grep) e nenhum teste chama
esta função diretamente (só via `getDsaSemanal`, confirmado em `tests/unidade/regras_dsa.test.ts`).

### `getDsaSemanal(idTurma, semanaIso)` — contrato externo INALTERADO

Mesma assinatura, mesmo formato de retorno (FR-007) — só o corpo da função passa a chamar
`dadosBrutosDsaSemana_()` uma vez no topo e repassar `dados` para as 5 chamadas de
`detectarConflitosDsa_` dentro do loop de dias, em vez de cada uma reler o banco.

## Backend (`app/layout.tsx` + `lib/supabase/server.ts``)

Nenhuma mudança — `app/layout.tsx` (layout raiz) já injeta `deepLinkEditarInstrutor`/`deepLinkNovoInstrutor` desde as
specs 014/016 (Clarifications desta spec, Sessão 2026-08-17: mecanismo mantido).

## Frontend (`app/layout.tsx`)

### Boot (`DOMContentLoaded`) — lógica ALTERADA

Antes: `irPara(window.location.hash.replace('#', '') || 'tabInicio')`.

Depois: `irPara(destinoInicial)`, onde `destinoInicial` prioriza `'tabInstrutores'` quando
`DEEP_LINK_EDITAR_INSTRUTOR`/`DEEP_LINK_NOVO_INSTRUTOR` está presente (research.md §1, data-model.md
§2). Mesmos 2 `const DEEP_LINK_*` já declarados no arquivo (specs 014/016), nenhuma mudança neles.

## Frontend (`app/(app)/instrutores/page.tsx`)

### `abrirPainelEdicaoInstrutor_(instrutor)` — NOVA, função de efeito (research.md §2)

```text
abrirPainelEdicaoInstrutor_(instrutor | null) -> void
```

Navega para a aba de Instrutores (`irPara('tabInstrutores')`), alterna os painéis interno/edição
(mesmo toggle já usado por `verificarDeepLinksInstrutor_` antes desta mudança) e chama
`renderizarPainelEdicaoInstrutor_(instrutor)` (já existente desde spec 016, suporta `instrutor=null`
= modo cadastro). Única fonte da lógica "mostrar o formulário de instrutor", reaproveitada pelos 2
pontos de entrada abaixo.

### `fecharPainelEdicaoInstrutor_()` — NOVA, função de efeito

```text
fecharPainelEdicaoInstrutor_() -> void
```

Esconde o painel de edição, mostra de novo o painel principal (listagem/filtros/estatísticas) — sem
recarregar dados (já em memória). Substitui `window.close()` no botão antes rotulado "Fechar aba"
(agora "Voltar").

### `abrirCadastroInstrutor()` / `abrirEdicaoInstrutor(idInstrutor)` — comportamento ALTERADO

Antes: `window.open(\`${urlWebApp}?novoInstrutor=1\`, '_blank')` /
`window.open(\`${urlWebApp}?editarInstrutor=${id}\`, '_blank')`.

Depois: chamam `abrirPainelEdicaoInstrutor_(null)` / `abrirPainelEdicaoInstrutor_(instrutor)`
diretamente — nenhuma nova aba/janela, nenhuma nova requisição ao servidor (o instrutor já está em
`instrutoresCarregados`, em memória desde o boot desta tela).

### `verificarDeepLinksInstrutor_()` — corpo ALTERADO, contrato externo inalterado

Passa a chamar `abrirPainelEdicaoInstrutor_(instrutor)` (ramo `editarInstrutor`) ou
`abrirPainelEdicaoInstrutor_(null)` (ramo `novoInstrutor`) em vez de duplicar o toggle de painel
inline — mesmo comportamento observável de antes (spec 016), só sem duplicação de código.

## Frontend (`app/globals.css`)

### `<link>` da fonte Rawline — URL ALTERADA

`href="https://cdn.jsdelivr.net/npm/@govbr-ds/core@latest/dist/fonts/rawline/rawline.css"` →
`href="https://fonts.cdnfonts.com/css/rawline"`. Mesma tag, mesma posição, nenhuma outra mudança.
