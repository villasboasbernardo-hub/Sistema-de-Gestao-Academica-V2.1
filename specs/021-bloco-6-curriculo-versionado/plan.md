# Plan: Bloco 6 — currículo versionado (spec 021), revisto pelas RC-1 a RC-12 (21/10/2026)

## Resumo

O currículo deixa de ser o curso e passa a ser uma tabela própria, `curriculos`: dona das disciplinas (e, por elas, das
UEs e das avaliações do currículo), dos limites, das regras de avaliação e — pela RC-1 — do propósito, da duração, do
modelo e do PDF. Toda turma segue um currículo. O currículo de hoje vira o **currículo 1** de cada curso. Tudo o que
juntava o currículo **pelo curso** passa a juntar **pelo currículo da turma**, e com um currículo por curso isso dá
exatamente as mesmas linhas e os mesmos textos — provado na cópia do remoto, no banco e nas telas.

## Constituição e CLAUDE.md

| Regra | Como o desenho cumpre |
|---|---|
| Regra 1 (documento 04) | nenhuma `RN-` muda: `RN-MAT-01` preservada e reforçada; `RN-MAT-02` aposentada, intocada; `RF-HOR-05` é o fundamento da troca de currículo só sem lançamento. O `RF-DADOS-06` (documento **02**) é emendado: único **no currículo** (D-10) |
| Regra 3 (paridade) | novidade autorizada nominalmente (16/10/2026) |
| Regra 4 (nada se apaga) | o currículo só se inativa sem turma e se arquiva (RC-10) sem sair; a troca inativa linhas e ajustes; as cinco colunas do curso ficam aposentadas; sem policy de DELETE |
| Regra 9.4 (portão) | a M2 altera; **autorizada por Bernardo em 21/10/2026, condicionada à prova** (passo 4 de "Como seguir"): se qualquer número ou texto de tela mudar, parar e mostrar |
| D20 (nada de relógio do servidor) | a vigência resolve pela data de quem chama; a do currículo 1 sai do dado (D-2); pgTAP guarda |
| Gotcha 10 | as três views recriadas com `with (security_invoker = true)`; pgTAP guarda |
| Gotcha 4.1 / 5 / 9 / 15 | a cópia gera ids antes (PR 2); `turmas.curriculo_id` por gatilho; a sequência em `SEQUENCIAS_DE_CODIGO`; porteiros `coalesce(…, false) is not true` (PR 2) |

## Os PRs (D-13, revista)

**PR 1 — banco e os leitores da RC-1.** M1 + M2; o pgTAP `144`; a prova de permissão `tests/invariantes/rls/curriculos.test.ts`;
`lib/dominio/curriculos.ts` (RC-3, RC-12) e o teste; os leitores e escritores das cinco colunas aposentadas passando ao
currículo, com a guarda `colunas-aposentadas-do-curso.test.ts`; as traduções sem "versão"; o ETL (a ETAPA 6c e a
sequência); a sincronização lendo o modelo do currículo da turma; os instrumentos (impressão digital do currículo,
retrato das telas e **retrato das páginas**). **Nada muda em tela**; **sem trava** (a RC-6 é do PR 2). Merge autorizado se
a prova passar.

**PR 2 — as telas e o resto das RC.** A cópia (RC-7), o seletor na URL (RC-8), o currículo em *Nova turma* e o rótulo
(RC-4, RC-9, RC-12), a correção pelo trio com justificativa e trilha (RC-6), o arquivamento (RC-10), o PDF por currículo
(RC-11) e os leitores por currículo do `contracts/codigo.md`, inclusive a VIRADA-1. Para no fim com CI verde, preview,
roteiro e lote de dúvidas; se o papel do DSA mudar, merge só entre semanas.

## A prova do PR 1 (passo 4 de "Como seguir")

Numa cópia **nova** do remoto (`dado_do_remoto`, só leitura lá), restaurada no local com as 87 migrations da `main`:

1. **Antes** — o código da `main` (uma cópia de trabalho em `fa372c2`, fora do OneDrive): impressão digital do esquema e do
   currículo; o retrato das telas (`tests/invariantes/retrato-das-telas.test.ts`: planilha, `.xlsx` e DSA de toda semana
   das 29 turmas); o retrato das páginas (`tests/e2e/retrato-das-paginas.spec.ts`: Início, catálogo, turmas, as seis abas e
   a edição de cada curso, a ficha e as avaliações de cada turma).
2. **Depois** — as duas migrations (`supabase migration up --local`) e o código do ramo: as mesmas três medições.
3. `diff` vazio nas três. Se não for: **parar e mostrar**.
4. A reversão, com dado: o esquema volta à impressão da `main`.

## O rito do remoto (PR 1, depois do CI verde)

1. Backup: `python -m scripts.manutencao.dado_do_remoto --somente-copia` (arquivo citado).
2. Remedir sobre esse backup a impressão do currículo, antes × depois.
3. Dry-run listando **só** `20261021030049` e `20261021030050`; `supabase db push --linked` (pedido de permissão).
4. Conferência só de leitura: 89 e 89 migrations, impressão digital do esquema igual nos dois bancos, `security_invoker`,
   0 policies de DELETE, 24 currículos e toda turma no currículo 1, o currículo 1 igual ao curso na RC-1, Production
   respondendo.
5. **Merge autorizado** (nada muda na tela) → CI na `main` → Production servindo o merge.
