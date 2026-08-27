# Research — Hotfix: Roteamento SPA, Fonte Rawline e Performance do DSA

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — a única ambiguidade real desta spec (manter ou
remover o mecanismo de deep-link via URL) já foi resolvida em `/speckit-clarify` (Opção A, manter).
Este documento registra as 4 decisões técnicas de implementação, todas achados desta fase de
pesquisa (não estavam no pedido original, que diagnosticava causas diferentes das reais — ver
`spec.md`, "Achados reais").

## 1. Roteamento — boot da SPA reconhece deep-link antes de decidir a aba inicial (FR-003)

**Decisão**: `app/layout.tsx` (`DOMContentLoaded`, hoje `irPara(window.location.hash.replace('#', '')
|| 'tabInicio')`) passa a checar os 2 parâmetros de deep-link **antes** do hash:

```js
const destinoInicial = (DEEP_LINK_EDITAR_INSTRUTOR || DEEP_LINK_NOVO_INSTRUTOR)
  ? 'tabInstrutores'
  : (window.location.hash.replace('#', '') || 'tabInicio');
irPara(destinoInicial);
```

Os 2 `const DEEP_LINK_*` já são declarados mais acima no mesmo `<script>` (nível superior, síncrono)
— nenhuma mudança de ordem necessária, só a leitura na hora de montar `destinoInicial`.

**Rationale**: `verificarDeepLinksInstrutor_()` (`app/(app)/instrutores/page.tsx`, spec 016) já faz o trabalho
de decidir QUAL painel mostrar dentro da aba de Instrutores (cadastro/edição/erro) — o bug nunca foi
nela, foi no roteamento de nível de SPA que decide QUAL `[data-view]` fica visível, que roda antes e
nunca sabia da existência desses 2 parâmetros.

**Alternatives considered**:
- Fazer `verificarDeepLinksInstrutor_()` chamar `irPara('tabInstrutores')` ela mesma, em vez de
  mudar o boot: rejeitado — ela já roda tarde demais (só depois de `contexto-pronto`), e o problema
  é justamente que a decisão errada (`'tabInicio'`) já foi tomada e aplicada ao DOM antes disso; a
  correção precisa estar no ponto de decisão original, não um remendo depois.

## 2. Clique nos botões passa a navegar dentro da SPA, sem `window.open` (FR-001/FR-002)

**Decisão**: Extrair um helper único, reaproveitado pelos 2 pontos de entrada (clique e deep-link),
em vez de duplicar a lógica de troca de painel:

```js
// `app/(app)/instrutores/page.tsx`
function abrirPainelEdicaoInstrutor_(instrutor) {
  irPara('tabInstrutores');
  document.getElementById('painelPrincipalInstrutores').style.display = 'none';
  document.getElementById('painelEdicaoInstrutor').style.display = '';
  renderizarPainelEdicaoInstrutor_(instrutor); // instrutor=null => modo cadastro (já existe, T020)
}

function fecharPainelEdicaoInstrutor_() {
  document.getElementById('painelEdicaoInstrutor').style.display = 'none';
  document.getElementById('painelPrincipalInstrutores').style.display = '';
}

function abrirCadastroInstrutor() {
  abrirPainelEdicaoInstrutor_(null);
}

function abrirEdicaoInstrutor(idInstrutor) {
  const instrutor = instrutoresCarregados.find(i => String(i.ID_Instrutor) === String(idInstrutor));
  if (!instrutor) { alert('Instrutor não encontrado.'); return; }
  abrirPainelEdicaoInstrutor_(instrutor);
}
```

`verificarDeepLinksInstrutor_()` passa a chamar `abrirPainelEdicaoInstrutor_(instrutor)` (ou
`abrirPainelEdicaoInstrutor_(null)` para `novoInstrutor`) em vez de duplicar o toggle de painel
inline — única fonte da lógica "mostrar o formulário", usada pelos 2 caminhos de entrada (clique
imediato e carregamento via URL).

O botão "Fechar aba" (hoje `onclick="window.close()"`) vira "Voltar" (`onclick=
"fecharPainelEdicaoInstrutor_()"`) — `window.close()` nunca funcionou de verdade em nenhum
navegador para uma aba que o próprio script não abriu, e deixa de fazer sentido semântico quando não
existe mais "aba" nenhuma a fechar (achado desta fase, consequência direta de FR-001, não um
requisito novo).

**Rationale**: `irPara()` já é o mecanismo de navegação de toda a SPA (8 abas) — reaproveitá-lo
aqui, em vez de inventar um "gerenciador de estado" novo, é a menor mudança possível (Princípio VI)
e elimina ao mesmo tempo os 2 riscos conhecidos: mutação de `window.location.hash` (nunca usada por
`irPara`) e a nova aba com o bug de roteamento (`window.open` removido). Um único ponto de
renderização (`renderizarPainelEdicaoInstrutor_`, já existente desde spec 016, suporta
`instrutor=null`) serve os 2 modos, mesmo padrão já usado.

**Alternatives considered**:
- Modal Tailwind CSS para cadastro/edição: rejeitado pela própria spec 014 (Assumptions) — risco de
  mutação de estado dentro do página isolado do a URL do projeto na Vercel, mesmo raciocínio de sempre.
- Manter `window.open` só corrigindo o roteamento da aba nova: rejeitado — não atende ao critério de
  aceite explícito do pedido ("sem... abrir nova aba") nem à FR-001, mesmo que tecnicamente
  funcionasse depois da correção de roteamento.

## 3. Performance do DSA — leitura das 4 abas envolvidas uma única vez por requisição (FR-006/007/008)

**Decisão**: Nova função pura de carregamento em `lib/acoes/dsa.ts`, chamada uma única vez no topo de
`getDsaSemanal`:

```js
function dadosBrutosDsaSemana_() {
  return {
    turmas: lerAbaComoObjetos_('turmas'),
    registros: lerAbaComoObjetos_('registros_aula'),
    avaliacoes: lerAbaComoObjetos_('avaliacoes'),
    eventos: lerAbaComoObjetos_('extracurriculares'),
  };
}
```

`blocosBrutosDoDia_(idTurma, dataIso, dados)` e `detectarConflitosDsa_(dataIso, dados)` ganham um
3º/2º parâmetro obrigatório (`dados`, a saída de `dadosBrutosDsaSemana_()`) e filtram os arrays já
carregados em memória (`dados.registros.filter(...)` etc.) em vez de chamar `lerAbaComoObjetos_` elas
mesmas. `getDsaSemanal` chama `dadosBrutosDsaSemana_()` uma vez, guarda em `var dados`, e passa
`dados` para cada uma das 5 chamadas de `detectarConflitosDsa_(dataIso, dados)` dentro do loop de
dias — reduzindo de até ~435 leituras completas de planilha (5 dias × 29 turmas × 3 abas, dados reais
confirmados) para exatamente 4, uma por aba.

Nenhum outro ponto do código chama `detectarConflitosDsa_`/`blocosBrutosDoDia_` (confirmado por
grep) e nenhum teste as chama diretamente (só via `getDsaSemanal`) — mudança de assinatura sem
nenhum ponto de chamada externo a atualizar além do próprio `getDsaSemanal`.

**Rationale**: O gargalo nunca foi "ler uma célula de cada vez" (não existe esse padrão no código) —
foi reler as mesmas 3 abas grandes do zero, do zero, do zero, uma vez por combinação dia×turma. A
correção certa é fazer o hoisting da leitura para fora dos 2 loops aninhados (dias × turmas dentro
de `detectarConflitosDsa_`), preservando 100% da lógica de cruzamento/filtro (só a fonte dos dados
muda de "ler de novo" para "já em memória").

**Alternatives considered**:
- Cache com `o cache do Next.js (`revalidateTag`)` do Next.js entre requisições: rejeitado — complexidade e risco de
  dado desatualizado (cache expirando no meio de uma sessão de lançamento de aula) desnecessários
  quando o problema real é redundância *dentro da mesma requisição*, resolvida sem cache nenhum.
- Reescrever `detectarConflitosDsa_` para não reagrupar por turma (ex.: um único `filter` sobre todos
  os registros por dia, sem o loop de turmas): rejeitado — mudaria a estrutura do algoritmo de
  detecção de conflito (RN-CONF-01, Risco Alto) mais do que o necessário para resolver o problema de
  performance; a redundância de I/O é o problema, não o algoritmo de comparação em si (que já é
  O(n²) sobre uma lista pequena de blocos do dia, nunca foi o gargalo).

## 4. Fonte Rawline — troca direta de URL (FR-005)

**Decisão**: `app/globals.css`:16` troca
`https://cdn.jsdelivr.net/npm/@govbr-ds/core@latest/dist/fonts/rawline/rawline.css` por
`https://fonts.cdnfonts.com/css/rawline` — URL exigida explicitamente pelo pedido do usuário.

**Rationale**: Nenhuma decisão técnica a fazer — troca direta de valor de atributo `href`, mesma tag
`<link rel="stylesheet">`, mesma posição no `<head>`.

**Alternatives considered**: Nenhuma — fora do escopo deste hotfix investigar CDNs alternativos
(Assumptions de `spec.md`).
