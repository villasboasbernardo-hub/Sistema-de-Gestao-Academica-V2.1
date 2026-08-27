# Data Model — Hotfix: Regras Estritas de Nomenclatura Militar e Formatação

Nenhuma coluna/aba física nova ou alterada — hotfix de formatação de exibição, zero mudança de
schema (confirmado explicitamente no pedido: "ZERO alterações na estrutura das colunas do banco de
dados"). Este documento descreve a classificação de círculo hierárquico usada só para formatação de
nome (nunca persistida) e o contrato da função reescrita.

## 1. Círculos hierárquicos para formatação de nome (research.md §1)

```text
OFICIAIS_POSTO_ = ['AE', 'VA', 'CA', 'CMG', 'CF', 'CC', 'CT', '1ºTen', '2ºTen']
PRACAS_POSTO_   = ['SO', '1ºSG', '2ºSG', '3ºSG']
(qualquer outro posto, inclusive 'SC' e qualquer valor fora do domínio fechado) -> tratado como
  Civil: nunca lança exceção, formato "[Posto] [Nome]" sem parênteses/hífen (Princípio V).
```

Presente em 3 arquivos agora (`lib/acoes/instrutores.ts`/`app/(app)/instrutores/page.tsx`, já duplicado desde as specs
014/015/016 para `ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_POSTO`/
`CIRCULO_HIERARQUICO_POR_POSTO`; `components/ciaara/`, novo aqui) — mesmo padrão de duplicação já aceito
no projeto (Next.js não importa `.ts` em `.html`, nem `.html` em `.html`). **Diferença
importante**: esta classificação (Oficial/Praça/Civil, 3 grupos) é usada só para decidir
parênteses/hífen na formatação de nome — é relacionada mas distinta de
`CIRCULO_HIERARQUICO_POR_POSTO` (2 grupos, Oficiais/Praças, spec 015), usada para o filtro
"Círculo Hierárquico" da listagem de Instrutores, onde `SC` deliberadamente não pertence a nenhum
grupo (Edge Case da spec 015, comportamento de filtro inalterado por este hotfix).

## 2. Contrato de `formatarNomeInstrutor_` (research.md §1)

```text
formatarNomeInstrutor_(posto, esp, nomeCompleto, nomeGuerra, isHTML = false) -> string

posto         : string | '' | undefined  — Posto_Graduacao bruto (ex.: '1ºTen', 'SC')
esp           : string | '' | undefined  — Esp_Hab_Obs bruto, normalizado internamente antes de uso
nomeCompleto  : string | '' | undefined  — Nome_Completo; se ausente, cai para nomeGuerra
nomeGuerra    : string | '' | undefined  — Nome_Guerra; usado só para destaque quando isHTML=true
isHTML        : boolean, default false  — true: <strong> no trecho de nomeGuerra dentro do nome;
                                            false: texto puro, nunca uma tag HTML no resultado
```

Nunca lança exceção para nenhuma combinação de entrada, inclusive todos os parâmetros
ausentes/vazios (degrada para string vazia ou só o nome disponível — Princípio V).

## 3. Nenhuma mudança em entidades persistidas

`instrutores`: zero coluna nova, zero renomeação. O catálogo `CATALOGO_ESP_HAB_OBS`
(`app/(app)/instrutores/page.tsx`, spec 016) não muda — só o texto exibido na `<option>` do dropdown de
`Esp_Hab_Obs` (research.md §3), nunca o valor gravado.
