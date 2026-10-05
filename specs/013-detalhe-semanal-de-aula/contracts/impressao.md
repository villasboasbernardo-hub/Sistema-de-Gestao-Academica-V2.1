# Contrato da impressão — `/print/dsa`, coluna a coluna contra o PDF assinado

> `RF-PDF-01` **[NOVO — v2.1]**, `RF-DSA-06`, `RNF-COMP-01` (*paridade inegociável*). O padrão de
> comparação é a **§1.2 de `praticas-da-planilha.md`**, medida nos PDFs assinados — não a memória de
> ninguém. **Caber em uma página A4 paisagem é asserção**, não recomendação.

## O documento, de cima para baixo

| Região | Conteúdo | De onde sai | Formato |
|---|---|---|---|
| **Cabeçalho 1** | `CIAARA` · `CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO` | texto fixo do documento oficial | — |
| **Cabeçalho 2** | sigla do curso · `DETALHE SEMANAL DE AULAS Nº <n>` · `SEMANA DE <data> A <data>` | `cursos.codigo` · `numero-do-dsa.ts` (`Nº —` se nulo, D-7) · segunda e sábado/sexta da semana | datas em **`DD/MM/AAAA`** por `dataParaLeitura` |
| **Corpo** — por dia | uma faixa por dia da semana (5, ou 6 com sábado); dia com feriado `dia_inteiro` sai como **uma linha** com a descrição (`Q-16`) | `grade.ts` | `DIA` = data e dia da semana, **uma vez por dia** |
| coluna **HORÁRIO** | início `às` fim **do bloco**; bloco que atravessa o almoço sai em **duas linhas** | `horario-do-bloco.ts` — `trechos` | `HH:MM às HH:MM` |
| coluna **DISCIPLINA** | o `cod_disciplina` (algarismo romano) | `disciplinas` via UE **ou** `disciplina_id` | — |
| coluna **`<n>` TA** | tempos do bloco | `tempos_consumidos` | número |
| coluna **UNIDADES DE ENSINO E TÓPICOS** | `UE <numero_ue> — <topico>`, ou o `conteudo_resumo` quando sem UE; em avaliação, o tipo | `unidades_ensino` · `conteudo_resumo` | — |
| coluna **LOCAL** | **por linha** (`Q-11`) | `registros_aula.local` · `avaliacoes.local`/`local_vista` · `atividades.local` | vazio quando nulo — **não** inventa sala |
| coluna **T/E** | a **sigla** da técnica (`EO`, `AP`…); em avaliação, o **tipo** | **`config_listas.metodologias.metadados.sigla`** (a lista que já existe, `H1`) · `tipo_avaliacao` | ⚠️ **linha sem sigla imprime o nome POR EXTENSO** — 13 das 22 ficam assim por decisão, e a coluna é estreita mas legível (`RN-DEG-01`) |
| coluna **INSTRUTOR/PROFESSOR** | `P/G Especialidade Nome Completo` pelo `NomeInstrutor` **único**; em avaliação, o nome seguido de **`(FISCAL)`**; fiscal externo: o `nome_fiscal_externo` + `(FISCAL)`; atividade: `responsavel_externo` ou o instrutor | `RF-INSTR-15` | nome de guerra em **negrito** |
| **última linha de cada dia** | `ESTUDO INDIVIDUAL` · T/E `EI` · **sem instrutor** | o lançamento de EI do dia (ou a linha fixa, se não houver — D-4) | — |
| **Rodapé — linha 1** | `Gerado em: <data hora>` | `instanteComHoraParaLeitura(now)` | `DD/MM/AAAA, HH:MM` |
| **Rodapé — nota** | `*É FACULTADO AO ALUNO PERMANECER A BORDO PARA ESTUDO INDIVIDUAL.` | texto fixo (`Q-7`) | — |
| **Rodapé — `ALT <n>`** | **não aparece** nesta fatia (`Q-3` no PR 6) | — | — |
| **Rodapé — `OBSERVAÇÕES:`** | a linha, **em branco**, para escrever à mão | texto fixo | ⚠️ é o campo que o `RF-DSA-06` e o `RF-PDF-01` exigem **literalmente** e que **nenhum** PDF medido tem. Decisão de Bernardo (`H8`, opção **a**): sai **em branco** — satisfaz o requisito **[PRESERVADO]** sem inventar conteúdo |
| **Rodapé — efetivo** | `<n> ALUNOS` | `turmas.alunos`; nulo → omitido com aviso **na tela** antes de imprimir | — |
| **Rodapé — tabela de CH** | `CÓD. \| DISCIPLINA \| CH. PREVISTA \| CH. CUMPRIDA`, **só das disciplinas que aparecem naquela semana** (`SC-014`) | `vw_disciplinas_execucao` (prevista = `carga_horaria_tempos`; cumprida = `ta_executados` **sem corte de data**, `Q-2`) | — |
| **Rodapé — legenda** | `TÉCNICAS DE ENSINO: EO — Exposição Oral; …`, **só as siglas usadas** (`SC-014`) | a lista | — |
| **Assinaturas** | **esquerda**: `elaborador` · **direita**: `encarregado_divisao`; nome completo, posto/graduação e `funcao_descricao` | `assinaturas.ts` — curso → GERAL; `dinamico_usuario_logado` resolve para **quem imprime**; sem vigente → **linha em branco** | — |

## O que NÃO vai para o papel

- Nenhuma cadeia técnica: `undefined`, `null`, `NaN`, `#REF!`, código de erro, `uuid` (`SC-013`).
- Nenhum aviso: dado faltante vira aviso **na tela da grade**, ao lado do botão *Imprimir*, **antes**
  de abrir a impressão (`FR-039`). A rota de impressão recebe o que a tela já validou.
- ⚠️ *(Vencido em 05/10/2026, pelo `H8` do analyze: o **campo de observação** passou a aparecer, em
  branco, na linha `OBSERVAÇÕES:` do rodapé. A divergência do `spec.md` §11 item 1 — os PDFs medidos
  não o têm — fica **registrada**, e a decisão de Bernardo foi satisfazer o requisito literal com uma
  linha vazia.)*

## Página: as regras físicas

- `@page { size: A4 landscape; margin: 10mm }`; `@media print` em `app/print/dsa/impressao.css` — o
  **primeiro** `@media print` do repositório.
- Fonte do sistema (Rawline já auto-hospedada); corpo 9pt; cabeçalhos 8pt em caixa alta como no
  PDF; `thead` repetido se quebrar (não deve quebrar).
- **Cabe em uma página** para a semana cheia de **45 TA + sábado 5** → medido no e2e por
  `page.pdf({ format: "A4", landscape: true })` e contagem de páginas **= 1** (`SC-001`). Para uma
  semana de 9 dias úteis não existe: a semana tem no máximo 6 dias.
- Sem casca, sem menu, sem faixa de ambiente, sem botão: a rota é **só** o documento.

## Como se chega

Botão **Imprimir** na grade → `/print/dsa?turma=&semana=&ano=&sabado=` com os **mesmos**
parâmetros (doc 25 §1.3 item 2) → `window.print()` é do usuário, não da tela.
