# Antes/depois — as correções da lista de erros de 16/10/2026 (noite), no remoto

Decisões de Bernardo Villas Boas, 16/10/2026 (noite), sobre `sugestoes-de-correcao.xlsx` da rodada `2026-10-14T1916`
(registro em `aprovacoes-pendentes.md`, seção «16/10/2026 (noite)»). Código e migration de dado no **PR #63**, mesclado
em `2bc77a9`; CI verde nos três blocos sobre `be68413` (run `38980372715`) e na `main` (run `38982341072`); deploy de
Production `success`.

## O rito

| Passo | Resultado | Artefato |
|---|---|---|
| Backup antes da D-11 | `remoto-20261016-203431.sql` (`--somente-copia`) | fora do git |
| Dry-run | só `20261016225643_correcoes_da_lista_16_10.sql` | — |
| `db push --linked` | saída 0 | — |
| Migrations | **75 e 75**, nenhuma divergente | `supabase migration list --linked` |
| Impressão digital do esquema | **`dcd9297b…`, 2.000 objetos, igual nos dois** (as 2.001 linhas), a mesma de antes: migration de dado | `scripts/provas/impressao_digital_do_esquema.sql` |
| Efeito da D-11 no remoto | **13** sugestões sem valor inativadas (`MLOG-014-D11-SUG-…`, «13 ativas»); D1: PM 1, «U.E. 1 a 3», a marca, e a vista `DSAP-C-AP-HN-2026-L1182-S` (27/08, 6º tempo, 1 TA, Sala 01, instrutor 39) como sessão 2, com a `VST-000160` intacta; D2: PP 3 e a marca, com a `VST-000028` intacta | `migracao_log`, consulta só de leitura |
| Backup da rodada | `remoto-20261016-203720.sql` (o `dado_do_remoto` completo, que restaurou a cópia no local) | fora do git |
| Ensaio na cópia (local) | 1ª rodada **246** mudanças; 2ª **0** nas 10 | `lista-local-r1.log`, `-r2.log` (fora do git) |
| Ensaio no remoto (sem gravar) | **plano do remoto = plano do local nas 10 turmas** (`dc25d87c…`, `2376e2ef…`, `2c98a720…`, `1653801b…`, `7cc1be4d…`, `75f54c3b…`, `3fab0617…`, `5ee766ab…`, `8c68713e…`, `afc6fa10…`); as mesmas 246 mudanças | `lista-remoto-ensaio.log` |
| Remoto grava | **246** mudanças, lidas de volta linha a linha nas 10 | `lista-remoto-gravar-r1.log` |
| 2ª rodada no remoto | **0** nas 10 | `lista-remoto-gravar-r2.log` |
| Junção da CAHO-06 | `scripts/manutencao/juntar_como_sessao.py --gravar`, **primeiro no remoto, depois na cópia**: a `DSAP-CAHO-2026-L1743-V` (27/07, 3 TA) virou a sessão 2 (`SAP-000002`, o mesmo código nos dois) da TI 1 `DSAP-CAHO-2026-L1636-V`, que soma **4 TA**, o tempo do currículo | — |
| 3ª rodada | **0** no remoto (plano = local nas 10) e **0** no local | `lista-remoto-gravar-r3.log`, `lista-local-r3.log` |
| Execução final no remoto (só ensaio, escreve as listas) | **0** nas 10, plano = local | `lista-remoto-final.log` |
| Local × remoto | `scripts/provas/dados_das_turmas.sql`: **iguais nas 29 turmas**, total `655b2fd1` nos dois | — |

As 246 mudanças da 1ª rodada, por turma: CAHO **4** · C-Ap-FR **190** (186 aulas de UE, R1, e 4 provas ligadas) ·
C-Espc-HN **8** · C-Espc-FR **11** · C-Esp-ME **6** · BATI **5** · Ag-Mag **22** (20 aulas de UE e 2 provas) ·
C-Ap-HN, MetocOf e Obs-ME **0**. A C-Ap-HN com **zero** prova que a marca da D-11 mantém a D1 e a D2 protegidas.

## Antes e depois

Medido no **remoto**, só leitura, por `scripts/provas/lista_16_10_medidas.sql` (rodado por
`scripts/provas/medir_no_remoto.py`): o *antes* sobre o remoto antes da D-11 e o *depois* depois da 3ª rodada
(`lista-16-10/antes-remoto.txt` e `depois-remoto.txt`, na pasta da rodada, fora do git). ⚠️ Duas linhas da tabela
vêm das **listas**, não do SQL: as provas que não casam (`antes-da-lista-16-10/provas-sem-casar.md` → `provas-sem-casar.md`)
e os itens a corrigir (`antes-da-lista-16-10/erros-por-turma/` → `erros-por-turma/`), todos na pasta da rodada.

| Medida | Antes | Depois |
|---|---:|---:|
| Provas vivas da planilha (`DSAP-`) | 169 | **168** (a de 27/07 da CAHO XVII virou sessão) |
| … ligadas a item do currículo | 140 | **161** |
| … sem item, com instrumento gravado | 17 | **0** |
| … sem item e sem instrumento | 12 | **7** |
| Provas que não casam (`provas-sem-casar.md`) | 19 | **0** |
| Vistas atrasadas (regra de 16/10, `app.fn_status_vista`) | 8 | **5** |
| Sugestões da planilha ativas sem valor | 13 | **0** |
| Itens «a corrigir» na lista por turma (`erros-por-turma/`) | 79 | **29**, dos quais **12 novos**: 10 da R4 (A + C ≠ D) e 2 da C-Esp-ME VI (a PM 1 e a PM 2 ligadas, com 2 TA contra 3 do currículo) |

**As vistas atrasadas que saíram:** a V2 (C-Espc-FR, PM 1 de 13/05 — a vista de 27/05 dividida), a V3 (C-Espc-HN, PO 1 de
12/03 — a VP3 de 13/03 pela aba de datas) e a V4 (C-Espc-HN, PM 1 de 24/09 — a VP1 de 30/09). **As 5 que ficam** são as
que estão com os cursos: V1 (C-Ap-FR I, PM 1 de 09/09), V5 (Ag-Mag I, 31/03 — agora PM 2), V6 (Obs-ME II, PE 1 de 25/09),
V7 (CAHO IX, PM 1 de 13/03) e V8 (CAHO VI, PM 3 de 02/07).

**TA e CHT por turma** (`vw_carga_horaria_turma`; CHT = CHD + AEC + TAD + TR; em negrito o que mudou):

| Turma | CHD | AEC | TAD | TR | CHT | vista (TA) |
|---|---:|---:|---:|---:|---:|---:|
| C-Ap-FR 2026 | 868 | 12 | 65 | 0 | 945 | 11 |
| C-Ap-HN 2026 | 1008 → **1009** | 41 | 54 | 58 | 1161 → **1162** | 26 → **27** |
| C-Esp-ME 2026 | 586 | 17 | 0 | 0 | 603 | 19 |
| C-Espc-FR 2026 | 1075 | 108 → **132** | 15 | 1 | 1199 → **1223** | 22 |
| C-Espc-HN 2026 | 1160 | 83 | 31 | 27 | 1301 | 25 |
| C-Exp-Ag-Mag 2026 | 131 | 1 | 0 | 0 | 132 | 1 |
| C-Exp-BATI T1 2026 | 42 | 1 | 0 | 0 | 43 | 2 |
| C-Exp-MetocOf 2026 | 153 | 5 | 0 | 0 | 158 | 3 |
| C-Exp-Obs-ME 2026 | 114 | 5 | 0 | 0 | 119 | 4 |
| CAHO 2026 | 1367 | 57 | 11 | 88 | 1523 | 38 |

A CH mudou **só onde a decisão previa**: a C-Espc-FR ganhou os **24 TA** da visita a Macaé (18, 19 e 22/05) como AEC
«Apoio à Instrução», como a visita de 20 e 21/05 já estava (R4, pela rodada); a C-Ap-HN ganhou **1 TA** de vista, a
sessão de 27/08 da D1 (pela **D-11** — a rodada teve zero mudança na C-Ap-HN). Na CAHO, a junção e as vistas movidas não mudam a CH (os mesmos TA trocam de prova).

**R1, a distribuição por UE** da C-Ap-FR e da Ag-Mag (`lista-16-10/ue-antes-depois.md`, do bloco 4 de
`antes-remoto.txt`/`depois-remoto.txt`, fora do git): **51 das 60 UEs com aula** nas duas turmas (54 da C-Ap-FR e 6 da
Ag-Mag; o catálogo das duas tem 66) mudaram de TA, e **nenhum** total por disciplina mudou (934 TA antes e depois). A aula de 25/08 (L1153-A) passou da UE 1 à UE 2, «Dispositivos de
proteção». A L1545-A (C-Ap-FR VIII, 09/10), editada na tela, ficou como estava (D6).

## O que a rodada fez que não estava escrito no comando, e por quê

- **CAHO XVII, a vista de prova de 30/07 (L1778)** ficou na PM 1 de 24/07 (`DSAP-CAHO-2026-L1719-V`, a «PROVA ESCRITA» da planilha) por decisão por linha, consequência da CAHO-06
  (sem ela, a regra sem número a mandaria para o trabalho de 27/07, que virou sessão).
- **CAHO VI, a «VP3» de 24/06** continua sem prova (o recuo da R2 ignora a prova que outra vista numerada reivindica): é
  a V8, com o curso.
- **CAHO, a atividade `DSAP-CAHO-2026-L2380-N`** (09/10, TR, 2 TA): descrição «SEMANA OCEANOGRAFICA» → «PREPARAÇÃO PARA O
  LHFC» e instrutor 17 → nenhum, pela R4 — as linhas 336 a 338 do catálogo têm A + C **deslocados de uma posição** em
  relação à D (TR14/TR15/TR13 × TR13/TR14/TR12). ⚠️ **E o sistema passou a DIVERGIR do DSA impresso**: a IMPRESSÃO de 09/10
  traz «SEMANA OCEANOGRAFICA» **digitado por cima da fórmula**, e a regra do texto digitado (que vale) só é aplicada às
  **aulas**, não às atividades — antes da R4 o sistema acertava por coincidência (a chave por A + C caía na linha que tem
  esse tópico). A categoria e os tempos não mudam. É a dúvida 6 de `aprovacoes-pendentes.md`.
- **C-Espc-FR, o CONTROLE da planilha** soma a visita a Macaé na CH da IV, da V e da XVII (8 TA cada); o sistema a conta
  como AEC. Fica como pendência adiada de contagem (`controle_diverge`), sem tirar nada do plano.
- **C-Esp-ME VI, PM 1 e PM 2**: depois de ligadas (C-Esp-ME-02 e -03), a lista mostra *«tempo da prova diferente do
  currículo: planilha 2 TA, currículo 3 TA»* — item novo, que ninguém decidiu ainda.
- **Itens novos de baixa prioridade (R4)**: as linhas do catálogo em que A + C difere da D (CAHO 336–338, C-Ap-FR 138,
  C-Espc-FR 18, 31, 59, 70 e 207, BATI 31).

## Depois das respostas às dúvidas (16/10/2026, noite; aplicado em 17/10/2026)

- **D-12** (`20261017023430`, PR #65): a `DSAP-C-AP-HN-2026-L1550-V` — fantasma de uma versão antiga da planilha, da XIII —
  é agora a **PM 2 da VII** de 09/10 (TA 1×2, item PM 2, «U.E. 4 a 6»), com a vista de 16/10 (`VST-000160`); a vista de
  23/10 (`VST-000243`) está na PM 2 da XIII de 16/10 (`DSA-MV723OPT-V`); a vista de 27/08 é a sessão 1 da PM 1. Backup
  `remoto-20261016-235306.sql`; 76 e 76 migrations; esquema `dcd9297b…` igual nos dois.
- **A varredura da A3.3** (só leitura, cópia local igual ao remoto): 4 provas protegidas nas turmas com virada; só a
  `L1550-V` divergia da planilha.
- **O texto digitado vale para atividade** (dúvida 6): rodada só da CAHO e da C-Espc-FR (backup `remoto-20261016-235430.sql`):
  2 mudanças — a `DSAP-CAHO-2026-L2380-N` volta a «SEMANA OCEANOGRAFICA» (o DSA impresso) e a `DSAP-C-ESPC-FR-2026-L004-N`
  passa a «APRESENTAÇÃO»; 2ª rodada **0**; dados das 29 turmas iguais local × remoto (`beb49b51`).
