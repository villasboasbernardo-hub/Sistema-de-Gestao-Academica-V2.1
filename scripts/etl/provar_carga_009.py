"""Prova o que a fatia (a) do Épico 5 acrescentou à carga — sobre a base JÁ CARREGADA.

O QUÊ  : (1) as quatro sequências de código ficaram à frente do maior valor carregado;
         (2) a grafia das salas foi reconciliada e cada troca virou evento `corrigido`.

PARA QUÊ: as duas coisas são invisíveis numa carga que termina 0. A sequência mal
         posicionada só aparece na **primeira turma que alguém criar**, semanas depois,
         como `23505` — erro que parece defeito do schema. A sala mal reconciliada nem
         aparece: a turma fica com a grafia antiga e some do filtro por sala.

COMO   : `python -m scripts.etl.provar_carga_009`   (depois da carga; saída 0 = provado)

⚠️ **AS PROVAS DE SEQUÊNCIA CRIAM LINHA DE VERDADE E DESFAZEM A TRANSAÇÃO.** Criar um
   código e conferir que ele é o esperado é a única forma de provar a posição da
   sequência pelo caminho que o sistema usa — ler `last_value` provaria que o número
   está lá, não que o gerador o entrega.

⚠️ **E A TRANSAÇÃO É DESFEITA, NÃO LIMPA COM `DELETE`**: `curso_regime_historico` é
   append-only com `DELETE` recusado por gatilho inclusive para a chave administrativa
   (`FR-020`), e a FK de `cursos` é `restrict` — uma amostra que criasse e apagasse não
   teria como apagar.

⚠️ **MAS `ROLLBACK` NÃO DESFAZ SEQUÊNCIA** — `nextval` e `setval` são não transacionais.
   Foi o que tornou a primeira versão desta prova NÃO IDEMPOTENTE: ela consumia os quatro
   geradores, e na segunda execução `app.proximo_codigo_turma_disciplina()` devolvia
   `TDI-000212` onde a asserção exigia `211`, reprovando **sem nada de errado na carga**.
   Por isso as quatro sequências são lidas no início e **restauradas explicitamente no
   fim**, e a prova roda quantas vezes for preciso com o mesmo veredito.

⚠️ **E ELA É PARA RODAR LOGO DEPOIS DA CARGA.** A asserção é `maior carregado + 1`, que é
   o que a T074 pede e a afirmação mais forte possível; ela deixa de valer — legitimamente
   — assim que alguém criar a primeira turma pelo sistema.
"""

from __future__ import annotations

import sys

import psycopg

from . import carregar

CONEXAO = carregar.CONEXAO_LOCAL


def _uma(k, sql: str, args: tuple = ()) -> object:
    k.execute(sql, args)
    linha = k.fetchone()
    return linha[0] if linha else None


# =================================================================================
# T074 — as sequências, provadas pelo caminho que o sistema usa
# =================================================================================
def provar_sequencias(con: psycopg.Connection) -> list[str]:
    problemas: list[str] = []
    with con.cursor() as k:
        k.execute("savepoint prova_sequencias")

        # --- turma_disciplina: o maior carregado é TDI-000210; o próximo tem de ser 211.
        maior_tdi = _uma(
            k,
            "select coalesce(max(substring(codigo from 5)::bigint), 0) "
            "from public.turma_disciplina where codigo ~ '^TDI-[0-9]+$'",
        )
        proximo_tdi = _uma(k, "select app.proximo_codigo_turma_disciplina()")
        esperado_tdi = f"TDI-{int(maior_tdi) + 1:06d}"
        if proximo_tdi != esperado_tdi:
            problemas.append(
                f"sequencia de `turma_disciplina`: o proximo codigo deveria ser "
                f"{esperado_tdi} (maior carregado: {maior_tdi}), e veio {proximo_tdi}. "
                f"Sem o passo da T073 a primeira turma nova colide com 23505."
            )
        else:
            print(f"  [ok] turma_disciplina · maior carregado {maior_tdi} → proximo {proximo_tdi}")

        # --- curso_regime_historico: o maior carregado é REG-000029; o próximo, 30.
        maior_reg = _uma(
            k,
            "select coalesce(max(substring(codigo from 5)::bigint), 0) "
            "from public.curso_regime_historico where codigo ~ '^REG-[0-9]+$'",
        )
        proximo_reg = _uma(k, "select app.proximo_codigo_vigencia_regime()")
        esperado_reg = f"REG-{int(maior_reg) + 1:06d}"
        if proximo_reg != esperado_reg:
            problemas.append(
                f"sequencia de `curso_regime_historico`: esperado {esperado_reg} "
                f"(maior carregado: {maior_reg}), veio {proximo_reg}"
            )
        else:
            print(f"  [ok] curso_regime_historico · maior carregado {maior_reg} → proximo {proximo_reg}")

        # --- as duas da fatia (c).
        for funcao, tabela, extrair, rotulo in (
            ("app.proximo_codigo_vinculo()", "instrutor_disciplina",
             "substring(codigo from 5)::bigint", "VIN"),
            ("app.proximo_codigo_instrutor()", "instrutores", "codigo::bigint", "numerico"),
        ):
            padrao = "'^VIN-[0-9]+$'" if rotulo == "VIN" else "'^[0-9]+$'"
            maior = _uma(
                k,
                f"select coalesce(max({extrair}), 0) from public.{tabela} "
                f"where codigo ~ {padrao}",
            )
            k.execute(f"select {funcao}")
            gerado = k.fetchone()[0]
            numero = int(str(gerado).split("-")[-1])
            if numero <= int(maior):
                problemas.append(
                    f"sequencia de `{tabela}`: gerou {gerado}, que nao passa do maior "
                    f"carregado ({maior}) — a rede do MAX+1 (T132) e que esta segurando"
                )
            else:
                print(f"  [ok] {tabela} · maior carregado {maior} → gerou {gerado}")

        k.execute("rollback to savepoint prova_sequencias")
    return problemas


def provar_que_a_prova_pega(con: psycopg.Connection) -> list[str]:
    """Defeito deliberado: as sequências de volta a 1, que é o estado SEM a T073.

    ⚠️ **`setval` NÃO OBEDECE A `ROLLBACK`.** Sequência é não transacional — é assim que
    duas sessões pegam números diferentes sem esperar uma pela outra —, e por isso esta
    prova **restaura cada sequência explicitamente**, com o valor lido antes. Medido em
    18/09/2026, com custo: a primeira versão confiava no `rollback`, deixou as quatro em
    `1`, e o pgTAP seguinte quebrou em **sete arquivos** com `duplicate key value violates
    unique constraint "turma_disciplina_codigo_key"` — erro que aponta para a tabela, e
    não para a prova que rodou antes.
    """
    problemas: list[str] = []
    antes: dict[str, int] = {}
    with con.cursor() as k:
        for sequencia, _, _ in carregar.SEQUENCIAS_DE_CODIGO:
            antes[sequencia] = int(_uma(k, "select last_value from " + sequencia))
            k.execute("select setval(%s, 1, false)", (sequencia,))

    pegou = provar_sequencias(con)
    esperadas = ("turma_disciplina", "curso_regime_historico")
    for tabela in esperadas:
        if not any(tabela in p for p in pegou):
            problemas.append(
                f"a prova das sequencias NAO pegou `{tabela}` com a sequencia em 1 — "
                f"ela nao provaria a T073"
            )

    # ⚠️ RESTAURAÇÃO EXPLÍCITA, e não `rollback`.
    with con.cursor() as k:
        for sequencia, valor in antes.items():
            k.execute("select setval(%s, %s, true)", (sequencia, valor))
    con.commit()

    if not problemas:
        print(
            f"  [ok] defeito deliberado · com as sequencias em 1, a prova reprova "
            f"{len(pegou)} vez(es), e as quatro foram restauradas"
        )
        # ⚠️ ACHADO QUE A PROVA MEDIU, e que vale mais que o resultado dela: as DUAS
        #    sequências da fatia (c) passam mesmo zeradas, porque `proximo_codigo_vinculo`
        #    e `proximo_codigo_instrutor` ainda têm a rede do `MAX+1` dentro delas. A rede
        #    mascara o defeito — e é exatamente o que a pendência T132 da spec 006 vai
        #    tirar. No dia em que sair, o passo da T073 passa a ser a única defesa.
        print(
            "  (nota) so `turma_disciplina` e `curso_regime_historico` reprovaram: as duas "
            "da fatia (c) sao mascaradas pela rede do MAX+1 (pendencia T132)"
        )
    return problemas


# =================================================================================
# T076 — a substituição de sala, e o rastro dela
# =================================================================================
def provar_salas(con: psycopg.Connection) -> list[str]:
    problemas: list[str] = []
    with con.cursor() as k:
        canonica = _uma(
            k,
            "select count(*) from public.turmas where sala_alocada = 'Laboratório de Informática'",
        )
        antiga = _uma(
            k,
            "select count(*) from public.turmas where sala_alocada = 'Laboratório de informática'",
        )
        if canonica != 9:
            problemas.append(f"esperadas 9 turmas com a grafia canonica do laboratorio, ha {canonica}")
        if antiga != 0:
            problemas.append(f"ainda ha {antiga} turma(s) com a grafia antiga do laboratorio")
        if canonica == 9 and antiga == 0:
            print(f"  [ok] salas · {canonica} turmas na grafia canonica, {antiga} na antiga")

        # ⚠️ NENHUMA sala fora do inventário — a conferência que o gatilho faria, refeita
        #    sobre o que de fato ficou gravado.
        fora = _uma(
            k,
            """
            select count(*) from public.turmas t
             where coalesce(btrim(t.sala_alocada), '') <> ''
               and not exists (select 1 from public.config_listas c
                                where c.lista = 'salas' and c.valor = t.sala_alocada)
            """,
        )
        if fora:
            problemas.append(f"{fora} turma(s) com sala fora do inventario depois da carga")
        else:
            print("  [ok] salas · nenhuma turma com sala fora do inventario")

        # O rastro: um evento `corrigido` por troca, e cada um descrevendo a troca real.
        eventos = _uma(
            k,
            "select count(*) from public.migracao_log "
            "where acao = 'corrigido' and observacao is not null and destino_tabela = 'turmas'",
        )
        if eventos != 9:
            problemas.append(
                f"esperados 9 eventos `corrigido` de sala em migracao_log, ha {eventos} — "
                f"o ETL nao reescreve em silencio (regra 5 do CLAUDE.md)"
            )
        else:
            print(f"  [ok] migracao_log · {eventos} eventos `corrigido`, um por troca")

        k.execute(
            """
            select l.codigo, l.destino_chave, l.valor_antes, l.valor_depois, t.sala_alocada
              from public.migracao_log l
              left join public.turmas t on t.codigo = l.destino_chave
             where l.acao = 'corrigido' and l.observacao is not null
               and l.destino_tabela = 'turmas'
            """
        )
        for codigo, turma, antes, depois, atual in k.fetchall():
            if atual != depois or antes == depois:
                problemas.append(
                    f"evento {codigo}: diz que a turma {turma} passou de {antes!r} para "
                    f"{depois!r}, e a turma esta com {atual!r}"
                )

        # As 930 transportadas continuam lá, intactas.
        transportadas = _uma(
            k, "select count(*) from public.migracao_log where observacao is null"
        )
        if transportadas != 930:
            problemas.append(
                f"as linhas transportadas de migracao_log deveriam ser 930, sao {transportadas}"
            )
        else:
            print(f"  [ok] migracao_log · {transportadas} linhas transportadas, intactas")
    return problemas


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 74)
    print("PROVA DA CARGA DA FATIA (a) DO EPICO 5 — sequencias e salas")
    print("=" * 74)

    problemas: list[str] = []
    with psycopg.connect(CONEXAO) as con:
        con.autocommit = False
        with con.cursor() as k:
            carregadas = _uma(k, "select count(*) from public.turmas")
        if not carregadas:
            print("[NAO CONFERIDA] a base esta vazia — rode a carga antes desta prova.")
            return 2

        # ⚠️ O ESTADO DAS QUATRO SEQUÊNCIAS, ANTES DE QUALQUER COISA — e restaurado no
        #    `finally`. Sem isto a prova estraga a base que ela acabou de conferir.
        antes: dict[str, int] = {}
        with con.cursor() as k:
            for sequencia, _, _ in carregar.SEQUENCIAS_DE_CODIGO:
                antes[sequencia] = int(_uma(k, "select last_value from " + sequencia))

        try:
            problemas.extend(provar_sequencias(con))
            print()
            problemas.extend(provar_que_a_prova_pega(con))
            print()
            problemas.extend(provar_salas(con))
            con.rollback()
        finally:
            con.rollback()
            with con.cursor() as k:
                for sequencia, valor in antes.items():
                    k.execute("select setval(%s, %s, true)", (sequencia, valor))
            con.commit()
            print(f"\n  (restaurado) as {len(antes)} sequencias voltaram ao valor de antes da prova")

    print()
    if problemas:
        print(f"[REPROVADO] {len(problemas)} problema(s):")
        for p in problemas:
            print(f"  - {p}")
        return 1
    print("[APROVADO] sequencias a frente do carregado, salas reconciliadas e com rastro.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
