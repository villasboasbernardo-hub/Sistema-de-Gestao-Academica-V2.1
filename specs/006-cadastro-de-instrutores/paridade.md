# Paridade — as oito specs da v2.0 e onde cada refinamento mora na v2.1

**Spec 006** · 15/09/2026 · `SC-007`, quickstart passo 9 · fonte da lista: documento 06, §4

> Cada linha responde: *o refinamento da v2.0 reaparece? onde?* **Nenhuma fica sem resposta.** Quando a
> resposta é "não nesta fatia" ou "diverge", a linha diz por quê e quem decide.

Legenda: ✅ reaparece · 🟨 reaparece com diferença registrada · ⏸️ travado por decisão pendente ·
➡️ outra fatia ou outro épico

**Atualização de 15/09/2026, depois da verificação com dado real**: as divergências de filtros, de
rótulos de classificação e da coluna de posto foram **decididas por Bernardo** e implementadas; a T082
(painel) foi destravada; a ficha imprimível entrou nesta fatia e parou nos brasões. *(decisão de
Bernardo Villas Boas, 15/09/2026)*

**Fechamento de 15/09/2026**: das seis pendências, quatro foram **decididas e implementadas** — carga
semanal por semana ISO, `FR-017` com data vazia, escolaridade em barras e especialidade opcional — e
duas **pararam depois de conferência**: a legenda clicável não está no código da v2.0, e falta um dos
dois brasões da ficha A4. *(decisão de Bernardo Villas Boas, 15/09/2026)*

---

## `014-refatoracao-modulo-instrutores` — Módulo de Instrutores (destino: Épico 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Indicadores: total, com capacitação, CH ministrada no ano, habilitados × selecionados | 🟨 | **Três** indicadores desde 15/09/2026: o cartão de CH do ano saiu por decisão de Bernardo, e a CH do ano corrente ficou como coluna da listagem. `lib/dominio/indicadores-instrutor.ts` · `PainelDeInstrutores.tsx` |
| 7 gráficos, posto/graduação em antiguidade, nunca alfabético | ✅ ampliado | **Nove** gráficos desde 15/09/2026 — os sete da 014 mais círculo hierárquico e o índice de capacitação geral da spec 021. `lib/dominio/graficos-instrutor.ts` · ponta a ponta lê `data-barras` e `data-forma` |
| Capacitação multivalorada, separada por vírgula, conta em cada fatia | ✅ | `qualificacoesDe`; desde 15/09/2026 com a fatia **"Nenhuma"** (`FR-026.4` emendado) |
| Carga horária calculada a partir dos lançamentos | ✅ | `vw_instrutor_carga_anual.ta_ministrado_ano` · coluna da listagem e ficha |
| Colunas da listagem | ✅ | Instrutor, categoria, OM, regime e CH do ano (`FR-027.1` emendado; ver a spec 020 abaixo) |
| Rótulos de exibição do gráfico de classificação (*Militares da Ativa*, *Civis*, *Magistério Militar Naval*) | ✅ decidido | `ROTULO_DA_CATEGORIA` em `lib/constantes/instrutor.ts`, aplicado na pizza de classificação |
| Gráficos com cor por categoria e valor escrito | ✅ | `GraficoBarras` com `corPorCategoria` e rótulo de valor; `GraficoPizza` com percentual escrito |
| Painel de estatísticas que se expande e recolhe | ✅ | `EstatisticasRecolhiveis.tsx`, começando recolhido, estado fora da URL (`FR-026.5`) |
| Legenda clicável que liga e desliga categorias | ⏸️ | **Não descrita** nas specs 014, 015 e 021 da herança, e **não está no código** da v2.0: `renderizarGrafico_` (`SIS11/CIAARA-11-v2/src/frontend/_Comum.html`, linhas 253 a 264) não configura legenda nem evento, conferido em 15/09/2026 (`FR-026.6`, T119). Sem origem na v2.0, é novidade e espera Bernardo |
| Editar abre em nova aba (`SC-006` da 014) | 🟨 | A ficha abre em `/instrutores/<codigo>`, na mesma aba, com endereço compartilhável (`FR-028`) |

## `015-hotfix-filtros-cross-instrutores` — filtros e *cross-filtering* (destinos: Épicos 5 e 4)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Filtros combinados em E lógico, na mesma consulta | ✅ | `montarConsultaDeInstrutores` · colunas `habilitado`, `selecionado`, `cursos_vinculados` e `classificacoes_vinculadas` de `vw_instrutores` (migration `20260915091717`) |
| Barra com curso, classificação de curso, posto/graduação, círculo hierárquico, categoria, OM e capacitação | ✅ decidido | Todos na barra desde 15/09/2026, **mais** regime e escolaridade da 014 |
| Filtro "Status" (Qualificados / Selecionados / Inativos) | 🟨 decidido | Por decisão de Bernardo, **dois** filtros independentes — habilitado (sim/não) e selecionado (sim/não) —, e inativos em `?situacao=`, visível na barra. Habilitado não é selecionado |
| Opção "Sem capacitação didática" | ✅ | Opção **"Nenhuma"** (`capacitacao=nenhuma`), casando com o campo vazio |
| Círculo hierárquico pelo mapa de postos | ✅ | `lib/dominio/circulo-hierarquico.ts`, com SC fora dos dois círculos, como na v2.0 |
| Classificação comparada sem sensibilidade a caixa | ✅ | O domínio é o enum `escopo_curso`, sem variação de grafia possível; a barra oferece os cinco nomes do glossário |
| Indicadores e gráficos recalculados sobre o recorte filtrado | ✅ | `app/(app)/instrutores/page.tsx` calcula sobre as mesmas linhas da tabela |
| Recorte vazio sem travar | ✅ | `EstadoVazio` distinguindo *não há* de *você não vê*; pizza e barras com estado vazio |
| Terminologia "qualificado" no lugar de "habilitado" | 🟨 | A v2.1 escreve **habilitado**, como o `FR-026.1`, o `RN-INST-01` e a decisão de 15/09/2026 sobre os filtros |
| Filtragem sem chamada de rede | 🟨 | Filtrar refaz a leitura no servidor (`avisaServidor`) — arquitetura da v2.1, não omissão |

## `016-ficha-formulario-instrutores` — ficha e formulário avançado (destinos: Épicos 5 e 11)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Ficha individual em tela | ✅ | `app/(app)/instrutores/[codigo]/page.tsx` e `FichaEmLeitura.tsx` |
| Formulário com seções e todos os campos | ✅ | `FormularioDeInstrutor.tsx`, com o painel de disciplinas no fim |
| Máscara estrita de NIP `00.0000.00` | ✅ | `lib/formato/mascaras.ts` · Zod |
| Datas por seletor nativo | ✅ | `type="date"` · `dataParaLeitura` sem `Date` |
| "Disciplinas Habilitadas" calculada na ficha | ✅ | Seção "Disciplinas habilitadas" em `FichaEmLeitura.tsx` |
| **Ficha imprimível em retrato, com `window.print()`** | ⏸️ | Entrou **nesta** fatia pela emenda de 15/09/2026 ao `FR-031`, e **parou**: o layout oficial (specs 025 e 026) é o export HTML de `FICHA CADASTRO DE DOCENTES CIAARA(2).docx` e depende de dois brasões, `image1.png` e `image2.png`, em `SIS11/modelos/Ficha de cadastro/images/`. **Conferido em 15/09/2026**: o do CIAARA já está em `public/marca/brasao-ciaara-impressao.png`; o selo "Marinha do Brasil — Hidrografia e Navegação" **não está** no repositório (T111) |
| Salvar como arquivo ou PDF no sistema | ➡️ | Épico 11 (`FR-031`) |

## `019-atribuicao-disciplinas-instrutor` — painel de atribuição (destino: Épico 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Painel com busca e disciplinas marcáveis, no fim do cadastro e da edição | ✅ | `PainelDeDisciplinas.tsx`, rótulo "Disciplina (SIGLA)", busca por nome e sigla |
| Grava o instrutor primeiro, depois os vínculos | ✅ | `FormularioDeInstrutor.tsx` chama `sincronizarHabilitacoes` só depois do cadastro gravado |
| Sincroniza: cria, reativa sem duplicar, inativa sem apagar, não toca disciplina descontinuada | ✅ | `public.sincronizar_habilitacoes` (migration `20260915084857`) · RLS com sessão real, bloco `FR-022` |
| Código do vínculo | ✅ decidido | `VIN-NNNNNN`, 6 dígitos, por sequência acima do maior existente. ⚠️ Diverge dos 4 dígitos do `RN-CRUD-03`, anotado sem alterar o documento 04 |
| Policy de escrita do vínculo | ✅ conferida | `app.pode('instrutores', 'editar')` e `app.alcanca_disciplina(disciplina_id)` |

## `020-hotfix-refinamento-listagem-instrutores` — listagem e nome de guerra (destinos: Épicos 5 e 4)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Negrito em cada fragmento do nome de guerra | ✅ | `lib/dominio/nome-instrutor.ts` e `NomeInstrutor` · `tests/unidade/nome-padronizado.test.ts` |
| Uma coluna "Instrutor" formatada no lugar de posto e nome separados | ✅ decidido | `TabelaDeInstrutores.tsx` desde 15/09/2026 (`FR-027.1` emendado); ordenar a coluna é ordenar por antiguidade |
| Remoção das telas legadas | ✅ | Não há tela legada na v2.1 |

## `025-ficha-spa-mascaras-schema` — página inteira, máscaras, schema (destinos: Épicos 11 e 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Ficha em página inteira, nunca modal | ✅ | `/instrutores/<codigo>` é rota |
| Máscaras de CPF, CEP, telefone e RETELMA | ✅ | `lib/formato/mascaras.ts` |
| Valor mascarado validado pelos dígitos | 🟨 | Validado pelos dígitos, **gravado no formato mascarado**: o NIP da v2.0 chega mascarado em 157 de 157 linhas. Diverge do exemplo do documento 25, anotado |
| Campo Estado com as 27 UFs | ✅ | `UFS` · `CampoDeEscolha` · Zod |
| `RJ` pré-selecionado em modo cadastro | 🟨 | Não pré-seleciona: o cadastro não tem seção de endereço, e pré-selecionar na edição gravaria `RJ` em quem nunca o informou |
| Layout visual da ficha (template local com brasões) | ⏸️ | Ver a spec 016 acima (T111) |
| Botão Imprimir | ⏸️ | Idem |

## `036-disciplinas-crud-antiguidade` — CRUD e ordenação por antiguidade (destino: Épico 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Instrutores em ordem de precedência militar | ✅ para instrutor | Seletor único que reordena · listagem pede `ordem_antiguidade` · filtro de posto em antiguidade |
| CRUD completo de disciplina | ➡️ | Fatia de disciplinas do Épico 5 |

## `038-hotfix-edicao-inline-datas-admin` — edição em linha, datas, Admin (destinos: Épicos 5 e 3)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| **A edição em linha continua removida** | ✅ | `FR-013` · a ponta a ponta conta **zero** controles na grade |
| Datas do formulário persistidas | ✅ | Zod `dataOpcional` |
| Admin não bloqueado por regra rígida no código | ✅ | Permissão é dado e a negação é da RLS |
| Colunas da tabela de disciplinas | ➡️ | Fatia de disciplinas |

---

## Pendências de 15/09/2026 — como fecharam

*(decisão de Bernardo Villas Boas, 15/09/2026)*

| # | Pendência | Como fechou | Onde está registrada |
|---|---|---|---|
| 1 | Como compor a carga semanal **do instrutor** com várias disciplinas no ano | ✅ soma das médias das atribuições cuja janela cobre cada semana ISO; somar o ano é proibido. `lib/dominio/carga-semanal.ts`, alerta na ficha | `FR-016`, contrato, T014, T114 |
| 2 | O alerta de capacitação quando `data_inicio_docencia_ciaara` está vazia | ✅ não alerta; aviso "Data de início de docência não informada" no quadro. o recorte "e sem capacitação" é decisão desde 15/09/2026 (CHK004) | `FR-017`, `FR-027`, T053, T116 |
| 3 | Escolaridade em pizza tem 6 categorias contra o limite de 5 do documento 23 §7 | ✅ fica em barras, não reabrir: 4 barras e 5 pizzas | `FR-026.2`, `SC-007.1`, T118 |
| 4 | Legenda clicável não descrita na herança | ⏸️ conferido no código da v2.0, não existe: parada | `FR-026.6`, T119 |
| 5 | Os dois brasões da ficha A4, fora do repositório | ⏸️ o do CIAARA está no repositório, o selo de Hidrografia e Navegação não: parada | `FR-031`, T111 |
| 6 | Especialidade/habilitação: opcional no banco desde o Épico 2 (15 instrutores sem), obrigatória no `RN-INST-03` e na tela | ✅ opcional na tela, branco recusado; os 15 são militares e o aviso continua cobrando | `FR-005`, contrato, T117 |

**O que ficou pedindo decisão** está em `checklists/fechamento.md`: CHK004, CHK005, CHK008, CHK012,
CHK019, CHK020, CHK021 e CHK022.


### Respostas de Bernardo ao checklist, e duas mudanças novas — 15/09/2026

*(decisão de Bernardo Villas Boas, 15/09/2026)*

| Item | Como ficou |
|---|---|
| CHK004 e CHK005 | ✅ decididos: o aviso de data não informada cobra só quem também está sem capacitação; o alerta de faixa avalia todas as semanas ISO do ano corrente |
| CHK008 e CHK012 | ✅ o `RN-INST-03` mantém cinco obrigatórios, especialidade delimitada a militar e recusada em cadastro novo; o aviso cobra especialidade só de militar. A linha 6 da tabela acima fica assim |
| CHK019 | ✅ ficha de instrutor inativo sem alerta normativo |
| CHK020 e CHK021 | ⏸️ pendentes por falta de material — legenda clicável sem origem na v2.0; selo verde da ficha A4 |
| CHK022 | ✅ sem requisito de tempo; a medição fica registrada nas *Assumptions* da spec |
| Quadro de avisos | 🟨 **diverge da v2.0 por decisão**: nasce recolhido, no topo, com as contagens à vista (`FR-027` e `RNF-USA-04` emendados) |
| Exclusão permanente | **[NOVO — v2.1], não é paridade**: exceção única à regra 4, só para instrutor sem histórico nenhum (`FR-008.1`), autorizada nominalmente |