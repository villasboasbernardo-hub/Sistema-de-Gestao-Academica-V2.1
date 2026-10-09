# Guia de validação — Planilha de contingência do DSA (spec 015)

**Data**: 09/10/2026 · O que provar, com o quê, e o que se espera ver. Os contratos estão em
`contracts/`; o modelo, em `data-model.md`.

## 0. Pré-requisitos

- Docker com o stack local de pé (`pnpm db:start`) e a base **limpa** para a suíte
  (`pnpm db:reset:limpo` — gotcha 8; memória *e2e local exige base limpa*).
- Para a conferência no Excel (§4): esta máquina, que tem o Excel do Microsoft 365
  (`research.md` §0). Para a do Google (§5): o conector do Google Drive (autorizado na `DP-4`).
- **Nenhuma etapa deste guia lê ou escreve no remoto.** Toda planilha de conferência sai da base
  local, com dado sintético — o repositório é público, e nome real não entra nem em arquivo de teste.

## 1. A cada commit — `pnpm verificar`

| O que | Espera |
|---|---|
| Unidade do escritor de OOXML (`lib/planilha/`) | pacote reaberto pelo leitor de teste; I-P1, I-P7, I-P8 |
| Unidade da árvore de fórmulas | cada nó escreve o texto esperado e avalia o valor esperado; nó fora do vocabulário não compila (I-P3) |
| Unidade do modelo da pasta (`lib/dominio/dsa/`) | I-P2, I-P4, I-P6, I-P10, I-P11, I-P12, sobre turmas sintéticas: semana cheia, sábado, almoço no meio do bloco, relógio trocando de vigência, semana sem relógio, disciplina sem UE, semipresencial com e sem etapa, turma sem período |
| Cores | I-P13: o módulo de cores igual a `app/print/dsa/documento.css` |
| Guarda de caminho | `toda-tela-tem-caminho` encontra o `href` da rota de download fora do próprio arquivo |

## 2. Antes do PR — `pnpm verificar:tudo`

| O que | Espera |
|---|---|
| **Equivalência da leitura** (invariante, banco local semeado) | para cada semana do período, `montarSemanaDoDsa(lerPeriodoDoDsa(ano), s)` igual a `lerSemanaDoDsa(s)` (R-2) |
| **Igual ao papel** (invariante) | I-P5: a IMPRESSÃO de cada semana com lançamento tem o conteúdo de `montarDocumentoDoDsa` |
| **Mais de 1.000 linhas** (invariante) | numa turma sintética com **mais de 1.000** lançamentos, o nº do DSA e a CH acumulada da leitura **batem** com a contagem direta no banco — e o mesmo teste **reprova** com a leitura de antes da paginação (R-3, `DP-5`) |
| **Nada escrito** (invariante) | contagem das tabelas igual antes e depois do download (`SC-009`) |
| **Suíte do DSA inteira** | verde **sem mudar uma asserção** — é a prova de que a refatoração da R-2 não mudou a tela |
| **Ponta a ponta** | os casos de `contracts/rota-de-download.md` §*Como se prova*, chegando à rota **por clique** a partir do DSA e da ficha |

⚠️ **O caso que discrimina da refatoração** (DoD 8): plantar um defeito deliberado só em
`montarSemanaDoDsa` — trocar a ordem de dois fatos, por exemplo — tem de reprovar **as duas** provas,
a da tela e a da equivalência. Se reprovar só uma, uma das duas está cega.

## 3. Sem migration, provado

`git diff main -- supabase/` **vazio**, e a impressão digital do esquema no banco local
(`scripts/provas/impressao_digital_do_esquema.sql`) **igual** antes e depois — como no Épico 5.5.

## 4. No Excel de verdade — `scripts/provas/planilha_no_excel.ps1`

1. Gerar a planilha e o **gabarito** — os valores que o domínio calculou para cada célula de fórmula —
   pelo invariante `tests/invariantes/planilha-de-conferencia.test.ts`, que os grava na pasta
   temporária do sistema a partir de uma semente sintética.
2. Rodar o script: ele abre o arquivo pelo Excel (automação COM), recalcula tudo e compara cada célula
   com o gabarito.
3. **Espera:** zero diferenças e zero valores de erro em todas as abas; o seletor trocado para três
   semanas diferentes muda o papel e mantém **1** página na visualização de impressão; e preencher COD e
   ITEM num TA vazio, pela automação, faz o bloco aparecer na IMPRESSÃO daquela semana (`SC-007`).

**Defeito deliberado:** uma fórmula com o intervalo deslocado em uma linha tem de reprovar o script —
é o que mostra que ele não está cego.

## 5. No Google Planilhas — autorizado na `DP-4`

- **Pelo conector:** o arquivo sintético vai para uma pasta própria do seu Drive, convertido; a leitura
  de volta compara com o mesmo gabarito; a pasta é apagada no fim.
- **Se o conector não converter o arquivo:** você abre o arquivo no Google Planilhas e segue o roteiro
  de conferência do PR, que traz a lista do que olhar — e o relatório diz que foi assim.
- **Espera, nos dois casos:** as fórmulas recalculam sem erro; o fundo e o negrito do bloco aparecem;
  as listas de escolha aparecem e aceitam valor fora delas; a impressão da semana cabe em uma página.
  O que o Google não importar (área de impressão, ajuste de página, nome definido na validação) vira
  **instrução escrita na planilha**, medida — nunca suposta.

## 6. A conferência de Bernardo — o roteiro do PR 1

Escrito no PR 1, com estes passos no mínimo:

1. Na tela do DSA de uma turma presencial, clicar em *Baixar planilha de contingência*: o arquivo
   baixa e a tela não muda.
2. A mesma coisa a partir da ficha da turma.
3. Numa turma EAD, não há botão.
4. Abrir a planilha: o topo diz quando foi gerada, por quem, e que é contingência.
5. Na IMPRESSÃO, escolher uma semana já lançada e imprimir: comparar, lado a lado, com o `/print/dsa`
   da mesma semana — linhas, horários, CH do rodapé, técnicas e assinaturas.
6. Na PREENCHIMENTO, lançar três TA seguidos numa semana vazia escolhendo só COD e ITEM: tópico, local,
   técnica, instrutor e horário aparecem; a IMPRESSÃO mostra **um** bloco.
7. Sobrescrever o local de uma linha: a impressão usa o escrito.
8. Lançar um bloco que atravessa o almoço: a impressão mostra dois trechos.
9. Digitar uma chave que o catálogo não tem: a conferência da linha avisa, e a impressão não mostra
   erro.
10. Julgar a **legibilidade** do bloco de 1, 2 e 3 TA no papel (R-8).
