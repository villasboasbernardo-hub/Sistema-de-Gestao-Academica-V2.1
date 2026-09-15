# Paridade — as oito specs da v2.0 e onde cada refinamento mora na v2.1

**Spec 006** · 15/09/2026 · `SC-007`, quickstart passo 9 · fonte da lista: documento 06, §4

> Cada linha responde: *o refinamento da v2.0 reaparece? onde?* **Nenhuma fica sem resposta.** Quando a
> resposta é "não nesta fatia" ou "diverge", a linha diz por quê e quem decide.

Legenda: ✅ reaparece · 🟨 reaparece com diferença registrada · ⏸️ travado por decisão pendente ·
➡️ outra fatia ou outro épico

---

## `014-refatoracao-modulo-instrutores` — Módulo de Instrutores (destino: Épico 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| 4 indicadores: total, com capacitação, CH ministrada no ano, habilitados × selecionados | ✅ | `lib/dominio/indicadores-instrutor.ts` · `app/(app)/instrutores/PainelDeInstrutores.tsx` · `tests/unidade/indicadores-instrutor.test.ts` |
| 7 gráficos, posto/graduação em antiguidade, nunca alfabético | ✅ | `lib/dominio/graficos-instrutor.ts` · `tests/unidade/graficos-instrutor.test.ts` · ponta a ponta do passo 5 lê `data-barras` |
| Capacitação multivalorada, separada por vírgula, conta em cada barra | ✅ | `qualificacoesDe` em `lib/dominio/graficos-instrutor.ts` (`FR-026.4`) |
| Carga horária calculada a partir dos lançamentos, nunca do campo vazio da planilha | ✅ | `vw_instrutor_carga_anual.ta_ministrado_ano` · coluna da listagem e ficha · `tests/unidade/carga-horaria-digitavel.test.ts` |
| Colunas posto/graduação, nome completo, categoria, OM, regime e CH no ano | ✅ | `app/(app)/instrutores/TabelaDeInstrutores.tsx` (`FR-027.1`) |
| Rótulos de exibição do gráfico de classificação (*Militares da Ativa*, *Civis*, *Magistério Militar Naval*) | 🟨 | O gráfico mostra o valor da coluna `categoria` como está (`Militar da Ativa`, `TTC`, `SCNS`, `MMN`). O `FR-026.2` da spec 006 fixa a **coluna**, não o rótulo; reproduzir o de-para é decisão de Bernardo |
| Editar abre em nova aba (`SC-006` da 014) | 🟨 | A ficha abre em `/instrutores/<codigo>`, na mesma aba, e o endereço é compartilhável (`FR-028`). Abrir em nova aba fica com o navegador |

## `015-hotfix-filtros-cross-instrutores` — filtros e *cross-filtering* (destinos: Épicos 5 e 4)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Filtros combinados em E lógico | ✅ | `montarConsultaDeInstrutores` em `app/(app)/instrutores/consulta.ts` · ponta a ponta: categoria sobre o resultado da OM |
| Indicadores e gráficos recalculados sobre o recorte filtrado, sem mostrar o total antes | ✅ | `app/(app)/instrutores/page.tsx` calcula os três sobre as mesmas linhas da tabela, no servidor |
| Recorte vazio: lista vazia com mensagem, indicadores zero, gráficos vazios sem travar | ✅ | `EstadoVazio` distinguindo *não há* de *você não vê* (`FR-027.4`) · `MolduraDeGrafico` sem dado |
| Estado de filtro compartilhável | ✅ | URL, pelo contrato de `/instrutores` (`FR-028`) · ponta a ponta: aba nova reproduz a tela |
| **Barra de 8 filtros** (curso, classificação de curso, status qualificado/selecionado/inativo, posto, círculo hierárquico, categoria, OM, capacitação), trocando a de 5 | 🟨 | A spec 006 decidiu no `FR-025` os **5** filtros da 014 — OM, categoria, capacitação, regime e escolaridade —, mais busca e situação. Os três que a 015 acrescentou (curso, círculo hierárquico, status qualificado/selecionado) **não** estão aqui. Decisão pendente de Bernardo |
| Opção "Sem capacitação didática" no filtro de capacitação | 🟨 | Não existe: o parâmetro `capacitacao` é texto e casa por conteúdo. Depende da mesma decisão acima |
| Terminologia "qualificado" no lugar de "habilitado" (FR-001 da 015) | 🟨 | A v2.1 escreve **habilitado**, como o `FR-026.1` e o `RN-INST-01`. Decisão pendente |
| Filtragem sem chamada de rede (FR-014 da 015) | 🟨 | Filtrar refaz a leitura no servidor (`avisaServidor`). É a arquitetura da v2.1 — estado na URL e Server Components —, não omissão |

## `016-ficha-formulario-instrutores` — ficha e formulário avançado (destinos: Épicos 5 e 11)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Ficha individual em tela | ✅ | `app/(app)/instrutores/[codigo]/page.tsx` e `FichaEmLeitura.tsx` (`FR-031`) |
| Formulário com seções e todos os campos | ✅ | `app/(app)/instrutores/FormularioDeInstrutor.tsx` |
| Máscara estrita de NIP `00.0000.00`, sem tornar obrigatório | ✅ | `lib/formato/mascaras.ts` · `tests/unidade/mascaras.test.ts` · Zod em `lib/validacao/instrutor.ts` |
| Datas por seletor nativo, gravando data real | ✅ | `type="date"` no formulário · `dataParaLeitura` sem `Date` na ficha |
| Ficha em PDF e rota de impressão | ➡️ | Épico 11 (`FR-031`) |

## `019-atribuicao-disciplinas-instrutor` — painel de atribuição (destino: Épico 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Painel com busca e disciplinas marcáveis; sincroniza criando, reativando e inativando, nunca apagando | ⏸️ | **T082 travada.** Criar vínculo novo exige gerar `instrutor_disciplina.codigo` (`VIN-NNNNNN`, sem `default` no schema). O `RN-CRUD-03` diz "prefixo + número sequencial de **4** dígitos"; o dado real e o comentário da coluna têm **6**. Por instrução de 15/09/2026, a lógica de `gerar_codigo()` não é fechada sem Bernardo |
| Policy de escrita do vínculo (T062) | ✅ conferida | `instrutor_disciplina_criar` e `_editar` consultam **`app.pode('instrutores', 'editar')` e `app.alcanca_disciplina(disciplina_id)`** — migration `20260830000111`, linhas 754–761. O painel ficaria oculto por `SePodeVer` de `instrutores`/`editar`, e a negação por alcance é do banco |

## `020-hotfix-refinamento-listagem-instrutores` — listagem e nome de guerra (destinos: Épicos 5 e 4)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Negrito em cada fragmento do nome de guerra, inclusive não contíguo | ✅ | `lib/dominio/nome-instrutor.ts` e `components/ciaara/nome-instrutor.tsx` (Épico 4 b) · `tests/unidade/nome-padronizado.test.ts` |
| Uma coluna "Instrutor" formatada no lugar de posto e nome separados | 🟨 | A listagem tem a coluna **Posto/Graduação** e a coluna **Nome** (que já sai no formato padrão), porque o `FR-027.1` da spec 006 exige posto/graduação como coluna. As duas specs da v2.0 se contradizem; a v2.1 segue a spec 006 |
| Remoção das telas legadas | ✅ | Não há tela legada na v2.1 |

## `025-ficha-spa-mascaras-schema` — página inteira, máscaras, schema (destinos: Épicos 11 e 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Ficha em página inteira, nunca modal | ✅ | `/instrutores/<codigo>` é rota |
| Máscaras de CPF, CEP, telefone (10/11) e RETELMA (8/10) | ✅ | `lib/formato/mascaras.ts` · casos literais em `tests/unidade/mascaras.test.ts` |
| Valor mascarado validado pelos dígitos | 🟨 | Validado pelos dígitos, como o documento 25 manda, mas **gravado no formato mascarado**: o NIP da v2.0 chega mascarado em 157 de 157 linhas, e gravar só dígitos criaria dois formatos no mesmo campo. O exemplo do documento 25 grava os dígitos; divergência anotada, não corrigida |
| Campo Estado com as 27 UFs | ✅ | `UFS` em `lib/constantes/instrutor.ts` · `CampoDeEscolha` no formulário · Zod recusa fora da lista |
| `RJ` pré-selecionado em modo cadastro | 🟨 | Não pré-seleciona. O cadastro da v2.1 não tem a seção de endereço — ela só existe na ficha, para quem lê a PII —, e pré-selecionar na edição gravaria `RJ` em quem nunca informou endereço |
| Remoção da coluna `Instrutor_Completo` | ✅ | Não existe no schema da v2.1 |
| Botão Imprimir | ➡️ | Épico 11 |

## `036-disciplinas-crud-antiguidade` — CRUD e ordenação por antiguidade (destino: Épico 5)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| Instrutores do painel de disciplina em ordem de precedência militar | ✅ para instrutor | Seletor único que reordena (`components/ciaara/seletor-instrutor.tsx`, Épico 4 b) · a listagem pede `ordem_antiguidade` ao banco (`tests/unidade/ordenacao-de-instrutor.test.ts`) |
| CRUD completo de disciplina e "Nova Disciplina" | ➡️ | Fatia de disciplinas do Épico 5, fora da spec 006 |

## `038-hotfix-edicao-inline-datas-admin` — edição em linha, datas, Admin (destinos: Épicos 5 e 3)

| Refinamento | Estado | Endereço na v2.1 |
|---|---|---|
| **A edição em linha continua removida** | ✅ | `FR-013` · a ponta a ponta do passo 5 conta **zero** `input`, `select`, `textarea` e `contenteditable` na grade |
| Datas do formulário persistidas | ✅ | Zod `dataOpcional` · ponta a ponta de cadastro confere o que o banco guardou |
| Admin não bloqueado por regra rígida no código | ✅ | Permissão é dado (`perfil_permissao`) e a negação é da RLS (Épico 3) |
| Colunas de carga horária e prioridade da tabela de disciplinas | ➡️ | Fatia de disciplinas |
