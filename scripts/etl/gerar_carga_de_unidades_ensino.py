"""T019 — gera a migration de DADO que carrega as Unidades de Ensino.

    python -m scripts.etl.gerar_carga_de_unidades_ensino > supabase/migrations/<ts>_carga_unidades_ensino.sql

O QUE  : le `scripts/etl/dados/pareamento_ue.csv` — revisado e versionado pela T018 — e escreve o
         SQL que insere as UEs, marca os dois cursos por competencias, marca as disciplinas sem UE
         e registra um evento por curriculo em `migracao_log`.

PARA QUE: a carga tem de ser **reproduzivel e conferivel**. Gerar o SQL a partir de um arquivo
         revisado, em vez de escrever 587 linhas a mao, e o que permite reconferir de onde cada
         linha veio; e deixa a migration ser lida como o que ela e — dado, nao logica.

⚠️ **O GERADOR RECUSA UE SEM DESTINO** (D-B4: nada por digitacao ou inferencia). Ele tambem
   recusa CH ausente ou nao positiva, topico vazio e fundamento vazio — porque a coluna do banco
   e `NOT NULL` com `CHECK`, e descobrir isso no `db push` contra o REMOTO seria descobrir tarde.

⚠️ **A MIGRATION NAO ALTERA CH, NOME NEM CODIGO DE DISCIPLINA** (P-1, Q-13). Ela toca exatamente
   tres coisas: insere em `unidades_ensino`, poe `cursos.curriculo_modelo = 'competencias'` nos
   dois cursos por competencias e poe `disciplinas.sem_unidades_ensino = true` nas seis
   declaradas. Onde a soma das UEs divergir da CH da disciplina, **a tela avisa** (Q-06) e
   Bernardo corrige — nunca um script.

⚠️ **A CH DA UE ENTRA SEM CONVERSAO** — 1 TA = 1 hora (Q-12, decisao de 24/09/2026). O currículo
   diz "10 HORAS" e a coluna `ch_prevista_tempos` recebe **10**.

⚠️ **O CODIGO `UE-` VEM DO `DEFAULT`, e NAO ha `setval` no fim.** A tarefa previa um `setval`
   porque `db push` nao roda `avancar_sequencias` (gotcha 9), mas aqui a inserção passa pelo
   `DEFAULT app.proximo_codigo_unidade_ensino()`, entao a sequencia avanca **sozinha**, uma vez
   por linha. Um `setval` seria no-op no melhor caso e destrutivo no pior: ele **nao obedece a
   `ROLLBACK`** (gotcha 6), de modo que uma migration que falhasse depois dele deixaria a
   sequencia mexida. No lugar dele entra uma **assercao** de que a sequencia ficou a frente do
   numero de linhas — que e o que o gotcha 9 realmente quer garantir.
"""

from __future__ import annotations

import csv
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PAREAMENTO = RAIZ / "scripts" / "etl" / "dados" / "pareamento_ue.csv"

# Os dois cursos cujo curriculo nao declara UE nenhuma (conferencia §4.4).
CURSOS_POR_COMPETENCIAS = ("C-Espc-FR", "C-Espc-HN")


def sql_texto(valor: str) -> str:
    """Literal de texto, com a aspa simples dobrada. Nenhuma interpolacao sem isto."""
    return "'" + valor.replace("'", "''") + "'"


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    nome_da_migration = argv[1] if len(argv) > 1 else "<ts>_carga_unidades_ensino.sql"

    with PAREAMENTO.open(encoding="utf-8") as fh:
        todas = list(csv.DictReader(fh, delimiter=";"))

    ues = [l for l in todas if l["numero_ue"].strip()]
    exclusoes = [l for l in todas if l["motivo_da_exclusao"].strip()]

    # ---------------------------------------------------------------- as recusas do gerador
    recusas: list[str] = []
    for l in ues:
        onde = f"{l['curso_codigo']} · {l['curriculo_ordinal']} · UE {l['numero_ue']}"
        if not l["destino_disciplina_codigo"].strip():
            recusas.append(f"{onde}: SEM DESTINO — nenhuma UE nasce de inferencia (D-B4)")
        if not l["ue_ch_horas"].strip() or int(l["ue_ch_horas"]) <= 0:
            recusas.append(f"{onde}: CH ausente ou nao positiva ({l['ue_ch_horas']!r})")
        if not l["topico"].strip():
            recusas.append(f"{onde}: topico vazio")
        if not l["fundamento_normativo"].strip():
            recusas.append(f"{onde}: fundamento normativo vazio (FR-064)")
    if recusas:
        print("[RECUSADO] o pareamento nao esta carregavel:", file=sys.stderr)
        for r in recusas[:20]:
            print(f"  {r}", file=sys.stderr)
        return 1

    # As disciplinas sem UE que a carga MARCA (as dos cursos por competencias nao entram aqui:
    # o curso inteiro muda de modelo, e marcar disciplina por disciplina seria redundante).
    sem_ue = [l for l in exclusoes if l["curso_codigo"] not in CURSOS_POR_COMPETENCIAS]

    por_curriculo: dict[str, list[dict[str, str]]] = defaultdict(list)
    for l in ues:
        por_curriculo[l["arquivo"] or f"(sem arquivo) {l['curso_codigo']}"].append(l)

    destinos = sorted({l["destino_disciplina_codigo"] for l in ues})
    # ⚠️ Os codigos das seis disciplinas SEM UE entram no porteiro junto com os destinos: se um
    #    deles estiver errado, a marca `sem_unidades_ensino` nao acontece e a tela passa a avisar
    #    "esta disciplina nao tem UE" para sempre, sem erro nenhum na aplicacao.
    codigos_declarados = sorted(set(destinos) | {l["destino_disciplina_codigo"] for l in sem_ue})
    total = len(ues)
    ch_total = sum(int(l["ue_ch_horas"]) for l in ues)

    p = print
    p("-- =================================================================================")
    p(f"-- CARGA DAS UNIDADES DE ENSINO — {total} linhas, {len(destinos)} disciplinas")
    p("--")
    p("-- ⚠️ GERADA, NAO ESCRITA A MAO. Refaca com:")
    p("--      python -m scripts.etl.gerar_carga_de_unidades_ensino \\")
    p(f"--        {nome_da_migration} > supabase/migrations/{nome_da_migration}")
    p("--    A entrada e `scripts/etl/dados/pareamento_ue.csv`, revisado e versionado (T018).")
    p("--")
    p("-- O QUE  : (1) insere as UEs dos curriculos oficiais da DEnsM; (2) marca os dois cursos")
    p("--          por competencias; (3) marca as disciplinas que nao tem UE por natureza; e")
    p("--          (4) registra um evento por curriculo em `migracao_log`.")
    p("--")
    p("-- POR QUE: a decisao UE-1 (rota (b), 26/08/2026) poe `registros_aula` no grao de UE, e a")
    p("--          UE nao existe em aba nenhuma da v2.0 — ela vive nos curriculos aprovados pela")
    p("--          DEnsM. Esta carga e a unica origem autorizada (D-B4).")
    p("--")
    p("-- ⚠️ NAO ALTERA CH, NOME NEM CODIGO DE DISCIPLINA (P-1, Q-13). Onde a soma das UEs")
    p("--    divergir da CH da disciplina, a TELA avisa (Q-06) e Bernardo corrige — nunca um")
    p("--    script. Foram medidas 8 divergencias de CH na conferencia; nenhuma e tocada aqui.")
    p("--")
    p("-- ⚠️ A CH DA UE ENTRA SEM CONVERSAO: 1 TA = 1 hora (Q-12). O curriculo diz \"10 HORAS\" e")
    p(f"--    `ch_prevista_tempos` recebe 10. Soma de todas: {ch_total}.")
    p("--")
    p("-- ⚠️ O NUMERO DA UE E O DO CURRICULO, e nao e renumerado. Nos dois desdobramentos isso")
    p("--    aparece: `2 - CAHO - FIS` fica com a UE numero **2** e `24 - C-Ap-HN - I-I` com a")
    p("--    numero **7**, porque e essa a posicao delas no curriculo de origem. Renumerar para 1")
    p("--    ficaria mais bonito na tela e perderia a rastreabilidade ao PDF — e seria inferencia.")
    p("--")
    p("-- ⚠️ ABORTA se algum destino declarado nao existir em `disciplinas` NA HORA DE APLICAR. O")
    p("--    `join` por codigo descartaria a linha em silencio, e carga silenciosamente incompleta")
    p("--    e o pior resultado possivel: contagem menor, nenhum erro.")
    p("--")
    p("-- REVERSAO (executada numa base descartavel antes do PR):")
    p(f"--    delete from public.unidades_ensino where origem_migracao_v1 = '{nome_da_migration}';")
    p("--    update public.cursos set curriculo_modelo = 'unidades_de_ensino'")
    p(f"--     where codigo in ({', '.join(sql_texto(c) for c in CURSOS_POR_COMPETENCIAS)});")
    p("--    update public.disciplinas set sem_unidades_ensino = false where codigo in (...);")
    p("--    ⚠️ O `delete` vale **enquanto nenhuma aula apontar** para a UE: `registros_aula`")
    p("--       tem FK `restrict` para `unidades_ensino`, entao o proprio banco recusa depois")
    p("--       disso — e e assim que a regra 4 protege o historico. A partir do Epico 6, a")
    p("--       reversao passa a ser exclusao LOGICA (`status = 'inativo'`).")
    p("--    ⚠️ O evento de `migracao_log` NAO e apagado: corrigir ali e logar evento novo")
    p("--       (regra 5).")
    p("-- =================================================================================")
    p()

    # ---------------------------------------------------------------- 1. o porteiro
    p("-- ---------------------------------------------------------------------------------")
    p("-- PARTE A — o porteiro: todo destino declarado tem de existir ANTES de inserir")
    p("-- ---------------------------------------------------------------------------------")
    p("-- ⚠️ **ELE SE ABSTEM NUMA BASE SEM CADASTROS, E ISSO NAO E COMPLACENCIA.** Toda migration")
    p("--    roda tambem no `db reset`, contra uma base VAZIA, antes de o ETL carregar qualquer")
    p("--    coisa: ali nenhum destino existe, e abortar derrubaria `db:reset:limpo` e o CI")
    p("--    inteiro. A distincao que importa e outra: **base sem cadastro nenhum** e estado")
    p("--    legitimo e a carga simplesmente nao se aplica; **base COM cadastros e faltando um")
    p("--    destino declarado** e inconsistencia, e aborta nomeando qual.")
    p("-- ⚠️ E POR ISSO A CARGA TEM DOIS CAMINHOS, como a marcacao `simultaneo` do PR 1: a")
    p("--    migration carrega no REMOTO, que tem os cadastros, e no LOCAL quem carrega e a")
    p("--    ETAPA 6 do `scripts/etl/executar.py`, que aplica **este mesmo arquivo** depois do")
    p("--    ETL. Nao ha segunda copia do dado — ha uma segunda EXECUCAO do mesmo SQL.")
    p("do $porteiro$")
    p("declare")
    p("  v_faltando text;")
    p("begin")
    p("  if not exists (select 1 from public.disciplinas) then")
    p("    raise notice 'carga de UE: base sem cadastros, a carga nao se aplica aqui "
      "(db reset). No local ela vem pela ETAPA 6 do ETL.';")
    p("    return;")
    p("  end if;")
    p()
    p("  select string_agg(codigo, ', ' order by codigo) into v_faltando")
    p("    from (values")
    for i, codigo in enumerate(codigos_declarados):
        p(f"      ({sql_texto(codigo)}){',' if i < len(codigos_declarados) - 1 else ''}")
    p("    ) as declarados(codigo)")
    p("   where not exists (select 1 from public.disciplinas d where d.codigo = declarados.codigo);")
    p()
    p("  if v_faltando is not null then")
    p("    raise exception 'carga de UE abortada: destino declarado que nao existe em "
      "disciplinas: %', v_faltando")
    p("      using hint = 'destino_inexistente';")
    p("  end if;")
    p("end")
    p("$porteiro$;")
    p()

    # ---------------------------------------------------------------- 2. a carga
    p("-- ---------------------------------------------------------------------------------")
    p("-- PARTE B — as UEs")
    p("--")
    p("-- `disciplina_id` e `curso_id` saem da MESMA linha de `disciplinas`, e por isso a FK")
    p("-- composta `ue_curso_coerente` fecha por construcao — nao ha como pendurar uma UE num")
    p("-- curso que nao e o da disciplina dela.")
    p("--")
    p("-- `on conflict (disciplina_id, numero_ue) do nothing` torna a carga idempotente. A")
    p("-- unicidade `ue_unica_na_disciplina` e TOTAL, nao parcial — conferido no catalogo, porque")
    p("-- `on conflict` contra unique parcial falha com `42P10`, que foi o que aconteceu duas")
    p("-- vezes no PR 1 desta fatia.")
    p("--")
    p("-- `codigo` NAO aparece na lista de colunas: ele vem do `DEFAULT`")
    p("-- `app.proximo_codigo_unidade_ensino()`, o gerador unico. Escrever o codigo aqui seria")
    p("-- inventar identificador (gotcha 9 / FR-012).")
    p("-- ---------------------------------------------------------------------------------")
    p("with entrada (destino, numero_ue, topico, ch, fundamento) as (values")
    for i, l in enumerate(ues):
        virgula = "," if i < len(ues) - 1 else ""
        p(f"  ({sql_texto(l['destino_disciplina_codigo'])}, {int(l['numero_ue'])}::smallint, "
          f"{sql_texto(l['topico'])}, {int(l['ue_ch_horas'])}::smallint, "
          f"{sql_texto(l['fundamento_normativo'])}){virgula}")
    p(")")
    p("insert into public.unidades_ensino")
    p("  (disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos,")
    p("   fundamento_normativo, origem_migracao_v1)")
    p("select d.id, d.curso_id, e.numero_ue, e.topico, e.ch, e.fundamento,")
    p(f"       {sql_texto(nome_da_migration)}")
    p("  from entrada e")
    p("  join public.disciplinas d on d.codigo = e.destino")
    p("on conflict (disciplina_id, numero_ue) do nothing;")
    p()

    # ---------------------------------------------------------------- 3. as marcas
    p("-- ---------------------------------------------------------------------------------")
    p("-- PARTE C — os dois cursos por competencias e as seis disciplinas sem UE")
    p("--")
    p("-- ⚠️ `curriculo_modelo` e DADO, nao deducao (D-B3): a tela nao pode concluir \"este curso")
    p("--    nao tem UE porque nao achei nenhuma\". Sem esta marca, um curso por competencias")
    p("--    apareceria como curso incompleto para sempre.")
    p("-- ---------------------------------------------------------------------------------")
    p("update public.cursos")
    p("   set curriculo_modelo = 'competencias'")
    p(f" where codigo in ({', '.join(sql_texto(c) for c in CURSOS_POR_COMPETENCIAS)})")
    p("   and curriculo_modelo <> 'competencias';")
    p()
    p("-- As que nao tem UE por NATUREZA, uma a uma, com o motivo no comentario:")
    for l in sem_ue:
        motivo = l["motivo_da_exclusao"].replace("\n", " ")[:150]
        p(f"--   {l['curso_codigo']} · {l['curriculo_disciplina']}: {motivo}")
    p("-- ⚠️ A chave e `disciplinas.codigo`, NAO o nome: `EFEITOS ATMOSFERICOS SOBRE A PROPAGACAO")
    p("--    ELETROMAGNETICA / C-Exp-METOC-OF` existe com o MESMO nome nos DOIS cursos METOC, e so")
    p("--    a copia do SP e marcada — no presencial a disciplina e legitima e recebe 5 UEs.")
    p("--    Casar por nome marcaria a errada, ou as duas.")
    p("update public.disciplinas")
    p("   set sem_unidades_ensino = true")
    p(" where sem_unidades_ensino = false")
    p("   and codigo in (")
    for i, l in enumerate(sem_ue):
        virgula = "," if i < len(sem_ue) - 1 else ""
        p(f"     {sql_texto(l['destino_disciplina_codigo'])}{virgula}"
          f"   -- {l['curso_codigo']} · {l['curriculo_disciplina'][:46]}")
    p("   );")
    p()

    # ---------------------------------------------------------------- 4. o log
    p("-- ---------------------------------------------------------------------------------")
    p("-- PARTE D — um evento por curriculo em `migracao_log` (append-only, regra 5)")
    p("-- ---------------------------------------------------------------------------------")
    p("insert into public.migracao_log")
    p("  (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,")
    p("   acao, regra_aplicada, valor_antes, valor_depois, observacao)")
    p("select * from (values")
    itens = sorted(por_curriculo.items())
    for i, (arquivo, linhas) in enumerate(itens):
        virgula = "," if i < len(itens) - 1 else ""
        cursos = sorted({l["curso_codigo"] for l in linhas})
        fundamento = linhas[0]["fundamento_normativo"]
        origem = linhas[0]["fundamento_origem"]
        obs = (f"Carga das UEs do curriculo {arquivo}: {len(linhas)} unidades em "
               f"{len({l['destino_disciplina_codigo'] for l in linhas})} disciplinas de "
               f"{', '.join(cursos)}. Fundamento por {origem}. Conferido por leitura independente "
               f"em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv.")
        codigo_log = "MLOG-5B-UE-" + "".join(
            c for c in arquivo.upper() if c.isalnum()
        )[:40]
        p(f"  ({sql_texto(codigo_log)}, 'curriculo_densm', {sql_texto(arquivo)},")
        # ⚠️ O cast em `acao` e obrigatorio: a coluna e do ENUM `acao_migracao`, e um `values`
        #    entrega `text` — o banco recusa com `42804` no PLANEJAMENTO, antes de avaliar o
        #    `where`, entao nem a base vazia escapa. Medido no `db reset` de 26/09/2026.
        p(f"   'unidades_ensino', {sql_texto(', '.join(cursos))},")
        p("   'adicionado'::public.acao_migracao,")
        p(f"   'UE-1 / FR-064', NULL, {sql_texto(str(len(linhas)) + ' UEs')},")
        p(f"   {sql_texto(obs + ' Fundamento: ' + fundamento)}){virgula}")
    p(") as novos(codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,")
    p("           acao, regra_aplicada, valor_antes, valor_depois, observacao)")
    p("-- Idempotente sem `on conflict`: `migracao_log` recusa UPDATE e DELETE por gatilho, e")
    p("-- `where not exists` e o que deixa a migration poder ser reaplicada sem duplicar evento.")
    p("-- ⚠️ E `exists (disciplinas)`: numa base sem cadastros a carga nao aconteceu, e gravar o")
    p("--    evento dela seria registrar por antecipacao um fato que nao ocorreu (regra 9.3).")
    p("where not exists (")
    p("  select 1 from public.migracao_log m where m.codigo = novos.codigo")
    p(")")
    p("  and exists (select 1 from public.unidades_ensino);")
    p()

    # ---------------------------------------------------------------- 5. a asserção
    p("-- ---------------------------------------------------------------------------------")
    p("-- PARTE E — a assercao: a carga fechou, ou a migration nao vale")
    p("--")
    p("-- ⚠️ Ela conta o que esta NO BANCO com esta procedencia, nao o que o INSERT devolveu: o")
    p("--    `do nothing` esconde a diferenca entre \"inseri 587\" e \"ja havia 587\", e as duas")
    p("--    situacoes sao aceitaveis; o que NAO e aceitavel e 586.")
    p("-- ---------------------------------------------------------------------------------")
    p("do $assercao$")
    p("declare")
    p("  v_ues              integer;")
    p("  v_disciplinas      integer;")
    p("  v_sem_fundamento   integer;")
    p("  v_sem_procedencia  integer;")
    p("  v_ch               integer;")
    p("  v_competencias     integer;")
    p("  v_sem_ue           integer;")
    p("  v_sequencia        bigint;")
    p("begin")
    p("  if not exists (select 1 from public.disciplinas) then")
    p("    raise notice 'carga de UE: nada a conferir numa base sem cadastros.';")
    p("    return;")
    p("  end if;")
    p()
    p(f"  select count(*), count(distinct disciplina_id), coalesce(sum(ch_prevista_tempos), 0)")
    p("    into v_ues, v_disciplinas, v_ch")
    p(f"    from public.unidades_ensino where origem_migracao_v1 = {sql_texto(nome_da_migration)};")
    p()
    p(f"  if v_ues <> {total} then")
    p(f"    raise exception 'carga de UE: % linhas com esta procedencia, esperava {total}', v_ues;")
    p("  end if;")
    p(f"  if v_disciplinas <> {len(destinos)} then")
    p(f"    raise exception 'carga de UE: % disciplinas, esperava {len(destinos)}', v_disciplinas;")
    p("  end if;")
    p(f"  if v_ch <> {ch_total} then")
    p(f"    raise exception 'carga de UE: soma de CH %, esperava {ch_total}', v_ch;")
    p("  end if;")
    p()
    p("  -- FR-064: procedencia e fundamento em TODA linha, sem excecao.")
    p("  select count(*) filter (where fundamento_normativo is null or btrim(fundamento_normativo) = ''),")
    p("         count(*) filter (where origem_migracao_v1 is null)")
    p("    into v_sem_fundamento, v_sem_procedencia")
    p("    from public.unidades_ensino;")
    p("  if v_sem_fundamento > 0 or v_sem_procedencia > 0 then")
    p("    raise exception 'carga de UE: % sem fundamento e % sem procedencia',")
    p("      v_sem_fundamento, v_sem_procedencia;")
    p("  end if;")
    p()
    p("  select count(*) into v_competencias from public.cursos")
    p("   where curriculo_modelo = 'competencias';")
    p(f"  if v_competencias <> {len(CURSOS_POR_COMPETENCIAS)} then")
    p(f"    raise exception 'carga de UE: % cursos por competencias, esperava "
      f"{len(CURSOS_POR_COMPETENCIAS)}', v_competencias;")
    p("  end if;")
    p()
    p("  select count(*) into v_sem_ue from public.disciplinas where sem_unidades_ensino;")
    p(f"  if v_sem_ue <> {len(sem_ue)} then")
    p(f"    raise exception 'carga de UE: % disciplinas marcadas sem UE, esperava {len(sem_ue)}',")
    p("      v_sem_ue;")
    p("  end if;")
    p()
    p("  -- gotcha 9, na forma que importa: a sequencia NAO pode ficar atras do que ja existe,")
    p("  -- senao a primeira UE criada na tela colide com uma que esta carga acabou de trazer.")
    p("  -- Nao ha `setval` aqui: o `DEFAULT` avancou a sequencia sozinho, uma vez por linha, e")
    p("  -- `setval` nao obedece a ROLLBACK (gotcha 6).")
    p("  select last_value into v_sequencia from app.unidades_ensino_codigo_seq;")
    p("  if v_sequencia < (select count(*) from public.unidades_ensino) then")
    p("    raise exception 'carga de UE: sequencia em % e a tabela tem % linhas',")
    p("      v_sequencia, (select count(*) from public.unidades_ensino);")
    p("  end if;")
    p()
    p("  raise notice 'carga de UE conferida: % linhas, % disciplinas, % de CH, sequencia em %',")
    p("    v_ues, v_disciplinas, v_ch, v_sequencia;")
    p("end")
    p("$assercao$;")

    print(f"\n-- gerada de {PAREAMENTO.name}: {total} UEs, {len(destinos)} disciplinas, "
          f"{len(itens)} curriculos, {len(sem_ue)} disciplinas sem UE.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
