# Roteiro de conferência — PR 2 da fatia (b): a carga das unidades de ensino, T026

**Ponto de partida.** Os seis passos rodam contra a base **carregada**:

```
pnpm db:reset:limpo
python -m scripts.etl.executar
```

⚠️ **`db:reset:limpo` antes do ETL não é zelo.** O ETL espera base recém-migrada; rodado sobre a
base que a suíte de ponta a ponta deixou, ele **aborta com saída 3** (`curso_regime_historico_codigo_key`
duplicada) e **nada é gravado**. Medido em 26/09/2026.

⚠️ **Nada aqui escreve em banco nenhum.** Os seis passos são leitura, e o sexto é um script de
leitura que aceita `--conexao` e pode apontar para o remoto.

## Os seis passos

| # | Passo | Resultado esperado |
|---|---|---|
| 1 | `select count(*) from unidades_ensino` | **587** |
| 2 | as UEs de *INFORMÁTICA APLICADA À HIDROGRAFIA* do `CAHO` | **4** UEs somando **45** |
| 3 | as 7 UEs de `HN-2101-0621`, do `C-Ap-HN` | `23 - C-Ap-HN - I` com **6** UEs somando **105** · `24 - C-Ap-HN - I-I` com **1** UE de **21** |
| 4 | as 5 do `EST-QF-APOC` | 5 UEs, 9+18+9+20+24 = **80**, com o fundamento dizendo *"transcrito de imagem"* |
| 5 | `C-Espc-FR` e `C-Espc-HN` | **0** UEs cada, e `curriculo_modelo = 'competencias'` |
| 6 | `python -m scripts.etl.conferir_unidades_ensino` | **CONFERIDA**, 0 diferença sem explicação |

⚠️ **Duas correções ao enunciado da tarefa, e as duas são de transcrição minha:**
- ela dizia `20 - CAHO - I`; o código real é **`3 - CAHO - I`**. O prefixo numérico é a linha do
  `ID_Grade` da v2.0, **um por disciplina** — é o mesmo erro dos quatro destinos dos desdobramentos,
  corrigido na conferência dos currículos §4.2;
- ela dizia que o *"transcrito de imagem"* estaria em `origem_migracao_v1`; ele está em
  **`fundamento_normativo`**. O `origem_migracao_v1` carrega o **nome do arquivo da migration**, que
  é a procedência técnica; o fundamento carrega o **documento normativo**, que é o que a `FR-064`
  pede. São dois campos com dois papéis, e misturá-los apagaria a distinção.

## As consultas, uma por passo

```sql
-- 1
select count(*) from public.unidades_ensino;

-- 2
select u.numero_ue, u.topico, u.ch_prevista_tempos
  from public.unidades_ensino u join public.disciplinas d on d.id = u.disciplina_id
 where d.codigo = '3 - CAHO - I' order by u.numero_ue;

-- 3
select d.codigo, count(*), sum(u.ch_prevista_tempos)
  from public.unidades_ensino u join public.disciplinas d on d.id = u.disciplina_id
 where d.codigo in ('23 - C-Ap-HN - I', '24 - C-Ap-HN - I-I') group by d.codigo order by 1;

-- 4
select u.numero_ue, u.topico, u.ch_prevista_tempos, u.fundamento_normativo
  from public.unidades_ensino u join public.disciplinas d on d.id = u.disciplina_id
 where d.codigo = '150 - EST-QF-APOC - I' order by u.numero_ue;

-- 5
select c.codigo, c.curriculo_modelo, count(u.id) as ues
  from public.cursos c left join public.unidades_ensino u on u.curso_id = c.id
 where c.codigo in ('C-Espc-FR', 'C-Espc-HN') group by 1, 2;
```

## No preview do ramo

- as telas da fatia (a) abrem normalmente;
- o menu **continua** sem oferecer *Disciplinas* — este PR também não liga tela nenhuma;
- a ficha de um instrutor segue como estava: a carga não toca atribuição nem CH prevista.

## Executado em 26/09/2026 — passo, esperado, obtido

Base recriada e carregada — `db:reset:limpo` + ETL saindo **0**, com a **ETAPA 6** aplicando a
migration da carga.

| # | Passo | Esperado | Obtido | |
|---|---|---|---|---|
| 1 | `count(*)` de `unidades_ensino` | **587** | 587 | ✅ |
| 2 | UEs de *INFORMÁTICA APLICADA À HIDROGRAFIA* (`3 - CAHO - I`) | 4 UEs somando **45** | 4 UEs somando 45 | ✅ |
| 3 | o desdobramento de `HN-2101-0621` | `I` 6 UEs / **105** e `I-I` 1 UE / **21** | `23 - C-Ap-HN - I` 6 UEs / 105 · `24 - C-Ap-HN - I-I` 1 UE / 21 | ✅ |
| 4 | as 5 do `EST-QF-APOC` | 5 UEs somando **80**, fundamento com *"transcrito de imagem"* | 5 UEs somando 80 · *Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)* | ✅ |
| 5 | `C-Espc-FR` e `C-Espc-HN` | **0** UEs, `competencias` | os dois com `competencias` e 0 UEs | ✅ |
| 6 | `conferir_unidades_ensino` | **CONFERIDA**, 0 sem explicação | saiu **0**: 582 no PDF · 587 declaradas · 587 carregadas, 0 sem explicação, 6 avisos | ✅ |

**6 de 6 como esperado.**

⚠️ **O passo 4 mostra a divergência que o próprio PDF do APOC carrega**: as 5 UEs somam **80** e
a CH da disciplina é **79**, porque o currículo declara *"CARGA HORÁRIA REAL 79 HORAS | TEMPO
RESERVA 1 HORA | CARGA HORÁRIA TOTAL 80 HORAS"* e **não diz de qual UE sai a hora de reserva**.
Redistribuí-la seria inferir (D-B4), então ela fica, a asserção de soma exclui esta disciplina
**nominalmente** e a tela avisa (Q-06, P-4).
