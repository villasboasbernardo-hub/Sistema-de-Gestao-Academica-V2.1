# Plan: Bloco 6 — currículo versionado (spec 021)

## Resumo

O currículo deixa de ser o curso e passa a ser uma **versão** do curso: a tabela `curriculos`, dona das disciplinas (e,
por elas, das UEs e das avaliações do currículo) e dos limites; toda turma segue uma versão. O currículo de hoje vira a
versão 1 de cada curso. Tudo o que juntava o currículo **pelo curso** passa a juntar **pela versão da turma**, e com uma
versão por curso isso dá exatamente as mesmas linhas — provado na cópia do remoto.

## Constituição e CLAUDE.md

| Regra | Como o desenho cumpre |
|---|---|
| Regra 1 (documento 04) | nenhuma `RN-` muda: `RN-MAT-01` preservada (e reforçada pela versão); `RN-MAT-02` aposentada, intocada; `RF-HOR-05` é o fundamento da trava. O `RF-DADOS-06` (documento **02**) é emendado: único **na versão** (D-10) |
| Regra 3 (paridade) | novidade autorizada nominalmente (16/10/2026) |
| Regra 4 (nada se apaga) | versão inativa-se (só sem turma); a troca de versão inativa linhas, atribuições, rateio e ajustes; sem policy de DELETE |
| Regra 9.4 (portão) | a M2 altera o que existe: este plano para no portão, com o desenho, a medição e a reversão |
| D20 (nada de relógio do servidor) | a vigência resolve pela data que quem chama passa; pgTAP guarda |
| Gotcha 10 | as três views recriadas com `with (security_invoker = true)`; pgTAP guarda |
| Gotcha 4.1 | a cópia gera os ids antes, sem `RETURNING` |
| Gotcha 5 | `turmas.curriculo_id` é preenchido pelo gatilho; o `insert` tipado da turma segue compilando sem a coluna |
| Gotcha 9 | `app.curriculos_codigo_seq` em `SEQUENCIAS_DE_CODIGO` |
| Gotcha 15 | o porteiro da cópia é `coalesce(…, false) is not true` |

## Os PRs (D-13)

**PR 1 — banco (este portão).** M1 + M2, o pgTAP `144`, as guardas emendadas, as traduções das recusas, o ETL (índice
provisório da D-1 e a sequência nova), os instrumentos de medição. **Nenhum número de tela muda**; muda o que a tela
**aceita**: a trava da versão em uso (10 dos 24 cursos) e a versão obrigatória quando houver duas.

**PR 2 — código e telas (só acrescenta no banco).** A cópia (`public.criar_versao_do_curriculo`, rascunho em
`contracts/copia-da-versao-rascunho.sql`); os leitores do código pela versão (`contracts/codigo.md`), incluindo a
sincronização da VIRADA-1 e a duração da versão; as telas (D-16); o retrato das telas de novo, antes × depois.

**Por que dois:** o PR 1 é o único que altera o que existe e tem de ir ao remoto antes do merge; o PR 2 depende dele e
só acrescenta. E a ordem protege: sem a cópia, nenhuma versão 2 existe enquanto o código ainda lê pelo curso.

## O rito do remoto (PR 1, depois da aprovação do desenho)

1. Backup: `python -m scripts.manutencao.dado_do_remoto --somente-copia` (arquivo citado).
2. **Remedir sobre esse backup** a impressão do currículo e o retrato das telas, antes × depois (o remoto mudou desde a
   cópia de 20/10).
3. Dry-run listando **só** `20261021030049` e `20261021030050`; `supabase db push --linked` (pedido de permissão).
4. Conferência só de leitura: 89 e 89 migrations, impressão digital do esquema igual nos dois bancos, `security_invoker`,
   0 policies de DELETE, 24 versões e toda turma na versão 1, Production respondendo.

## O que fica para depois do portão (PR 1)

`pnpm verificar:tudo` com a ponta a ponta (ainda não rodada: a trava pode esbarrar em percursos que editam CH de curso
com lançamento na semente), o PR com o template, o CI verde, o rito do remoto.
