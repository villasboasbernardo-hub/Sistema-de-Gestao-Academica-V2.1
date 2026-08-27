# Research — Hotfix: Regras Estritas de Nomenclatura Militar e Formatação

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — `/speckit-clarify` não encontrou ambiguidade
crítica (toda decisão técnica já estava grounded em `spec.md`, "Achados reais"/"Assumptions"). Este
documento registra as 5 decisões técnicas de implementação.

## 1. Nova assinatura de `formatarNomeInstrutor_` e as 4 regras de círculo (FR-001 a FR-010)

**Decisão**:

```js
// `components/ciaara/` — círculos hierárquicos para formatação de nome, cópia local (achado 4 de spec.md:
// `components/ciaara/` é carregado por todas as views, inclusive `app/(app)/turmas/[turma]/dsa/page.tsx`, que não tem
// CIRCULO_HIERARQUICO_POR_POSTO definido — não pode depender da constante de `app/(app)/instrutores/page.tsx`).
const OFICIAIS_POSTO_ = ['AE', 'VA', 'CA', 'CMG', 'CF', 'CC', 'CT', '1ºTen', '2ºTen'];
const PRACAS_POSTO_ = ['SO', '1ºSG', '2ºSG', '3ºSG'];

// normalizarEspHabObsComum_ — cópia mínima de normalizarEspHabObs_ (`app/(app)/instrutores/page.tsx`, spec
// 016): só remove hífen/parênteses das pontas. Achado crítico de dado real (spec.md achado 5):
// sem isso, "-HN"/"(T)" virariam "--HN"/"((T))" ao aplicar o hífen/parênteses da regra de círculo.
function normalizarEspHabObsComum_(valorLegado) {
  return String(valorLegado || '').replace(/^[-(]+|[-)]+$/g, '').trim();
}

function formatarNomeInstrutor_(posto, esp, nomeCompleto, nomeGuerra, isHTML = false) {
  const nomeBase = nomeCompleto || nomeGuerra || '';
  let nomeFormatado = nomeBase;
  if (isHTML && nomeGuerra && nomeBase.toUpperCase().includes(nomeGuerra.toUpperCase())) {
    const guerraEscapado = nomeGuerra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nomeFormatado = nomeBase.replace(new RegExp(guerraEscapado, 'i'), m => `<strong>${m}</strong>`);
  }

  const espNormalizado = normalizarEspHabObsComum_(esp);
  let prefixo;
  if (OFICIAIS_POSTO_.indexOf(posto) !== -1) {
    // FR-002/FR-003: CA nunca aparece ao lado do posto de um Oficial (0 casos reais hoje,
    // exceção preventiva — spec.md achado 6).
    prefixo = (espNormalizado && espNormalizado !== 'CA') ? `${posto} (${espNormalizado})` : posto;
  } else if (PRACAS_POSTO_.indexOf(posto) !== -1) {
    // FR-004/FR-005: CA (Controle Aéreo) SEMPRE aparece para Praças — a exceção do Oficial nunca
    // se aplica aqui.
    prefixo = espNormalizado ? `${posto}-${espNormalizado}` : posto;
  } else {
    // FR-006: Civil (SC) ou posto fora dos 2 círculos conhecidos — nunca uma exceção não tratada
    // (Princípio V).
    prefixo = posto || '';
  }

  return `${prefixo} ${nomeFormatado}`.trim();
}
```

**Rationale**: A comparação case-insensitive + escape de caracteres especiais na substituição do
nome de guerra é o comportamento já validado desde o Épico A (`tests/unidade/design_system.test.ts`,
achado "Nome_Guerra com caractere especial de regex não lança exceção de sintaxe") — mantido em vez
do `.replace()` literal ingênuo descrito no pedido original, estritamente mais robusto para os
mesmos 177 registros reais (vários com `Nome_Guerra` vazio) sem mudar nenhum resultado visível
correto. `isHTML` com default `false` casa com a assinatura pedida; todo ponto de chamada passa o
valor explicitamente (nunca depende do default) para deixar a intenção clara em cada call site.

**Alternatives considered**:
- Mover `CIRCULO_HIERARQUICO_POR_POSTO`/`normalizarEspHabObs_` de `app/(app)/instrutores/page.tsx` para
  `components/ciaara/` (compartilhar em vez de duplicar): rejeitado — mudaria o arquivo "dono" de 2
  constantes já usadas por outras specs (015/016) só para evitar uma 3ª cópia pequena; risco maior
  que o benefício para um hotfix (Princípio VI), e o padrão de duplicar pequenas constantes entre
  arquivos `.html` que não se importam já está aceito no projeto (`ORDEM_ANTIGUIDADE_POSTO`).
- `.replace(nomeGuerra, ...)` literal (string, não regex) exatamente como o pedido descreve:
  rejeitado — é case-sensitive (o atual é case-insensitive, comportamento já validado); nenhum
  ganho real já que `String.replace` com argumento string não precisa de escape de regex de
  qualquer forma.

## 2. Unificação dos 5 pontos de chamada (FR-011/012/013)

**Decisão**: Os 4 call sites existentes de `formatarNomeInstrutor_` passam a usar a nova assinatura
posicional; o dropdown de vínculo de qualificação (`app/(app)/instrutores/page.tsx`, hoje com concatenação
ad-hoc própria, spec 014 FR-014) migra para a mesma função.

| Ponto | Arquivo | `isHTML` | posto/esp |
|---|---|---|---|
| Célula da grade do DSA | ``app/(app)/turmas/[turma]/dsa/page.tsx`:177` | `true` | do objeto `bloco.instrutor` |
| Dropdown de lançar Aula manual | ``app/(app)/turmas/[turma]/dsa/page.tsx`:262` | `false` | do objeto `i` (remove o `.replace(/<[^>]+>/g,'')`) |
| Coluna Nome Completo (listagem) | ``app/(app)/instrutores/page.tsx`:418` | `true` | `''`/`''` (Posto já é coluna própria) |
| Cabeçalho da Ficha do Instrutor | ``app/(app)/instrutores/page.tsx`:1174` | `true` | `''`/`''` (Posto já é linha própria na Ficha) |
| Dropdown de vínculo de qualificação | ``app/(app)/instrutores/page.tsx`:285-290` | `false` | do objeto `i` (era `${Posto} ${Nome}` sem Esp) |

**Rationale**: Reaproveitar a mesma função nos 5 pontos elimina a gambiarra `.replace(/<[^>]+>/g,
'')` (fonte real do risco que motivou o pedido — gerar HTML e depois arrancar as tags é frágil,
gerar direto em texto puro é a correção de verdade) e a divergência de comportamento entre o
dropdown de vínculo e o resto do sistema (achado real: FR-014 da spec 014 nunca mostrava
especialidade ali). A migração do dropdown de vínculo é uma revisão deliberada de FR-014
(documentada em `spec.md`, Assumptions), não um bug — pedida explicitamente pelo item 3 do pedido
("interfaces de VÍNCULO DE INSTRUTOR").

**Alternatives considered**:
- Manter os 2 pontos "só nome" (`c`/`d` na tabela acima) mostrando posto/especialidade também,
  merging com a coluna/linha que já mostra essa informação: rejeitado — duplicaria a mesma
  informação 2× na mesma tela, sem nenhum pedido explícito para isso (Assumptions de `spec.md`).

## 3. Dropdown de `Esp_Hab_Obs` — "SIGLA - Nome" (FR-014/015)

**Decisão**: `app/(app)/instrutores/page.tsx`, dentro de `renderizarCampoEdicaoInstrutor_` (tipo
`dropdown-fechado-sigla`), o texto de cada `<option>` passa de `${CATALOGO_ESP_HAB_OBS[sigla]}`
para `${sigla} - ${CATALOGO_ESP_HAB_OBS[sigla]}`. O `value="${sigla}"` já é só a sigla — nenhuma
mudança nele.

**Rationale**: Mudança isolada de 1 linha, sem relação técnica com a função de formatação de nome
(é o mesmo catálogo, mas um problema de exibição diferente) — mantida como User Story separada
(P3) exatamente por essa independência.

**Alternatives considered**: Nenhuma — mudança direta de template string, sem decisão técnica a
fazer.

## 4. Migração (não extensão) da suíte de testes existente (achado real ao planejar)

**Decisão**: Os 10 testes existentes de `tests/unidade/design_system.test.ts` (`describe("RF-INSTR-15/
RF-DS-05 - formatarNomeInstrutor_...")`, contagem exata confirmada por grep — achado do
`/speckit-analyze` F1, uma versão anterior deste documento citava "9" por erro de contagem) chamam
a assinatura antiga (`formatarNomeInstrutor_({ Posto_Graduacao, Esp_Hab_Obs, Nome_Completo,
Nome_Guerra })`, um único objeto) — todos precisam ser reescritos para a nova assinatura posicional
antes de qualquer teste novo ser adicionado, e não apenas estendidos.

**Rationale**: Achado real ao carregar o arquivo de teste durante o planejamento — não estava
previsto no pedido original. Sem essa migração, os 10 testes quebrariam imediatamente (chamada com
um objeto onde a função agora espera `posto` como 1º argumento posicional), mascarando qualquer
teste novo genuinamente relevante às 4 regras de círculo.

**Alternatives considered**:
- Manter a assinatura antiga (objeto) como *também* aceita, além da nova posicional (overload):
  rejeitado — complexidade desnecessária para uma função interna de um hotfix (Princípio VI/IX);
  nenhum dos 5 call sites precisa da forma antiga depois da migração.

## 5. Normalização de `esp` antes de aplicar hífen/parênteses (FR-007, achado crítico de dado real)

**Decisão**: `esp` é normalizado (`normalizarEspHabObsComum_`) **antes** de ser combinado com o
separador de círculo — não depois, não condicionalmente.

**Rationale**: Sem isso, os 2 artefatos de formatação legados confirmados na base real
(`"-HN"` em Praças, `"(T)"` em Oficiais, spec.md achado 5) produziriam separador duplicado
(`"SO--HN"`, `"CT ((T))"`) — um bug novo e concreto que a própria regra pedida introduziria em dado
já existente, não uma hipótese teórica.

**Alternatives considered**: Nenhuma — é a aplicação direta do achado, sem decisão técnica
alternativa razoável (não normalizar produz um bug visível e conhecido).
