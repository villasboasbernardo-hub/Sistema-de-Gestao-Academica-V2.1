"""Os quatro defeitos deliberados do PR 1 da fatia (b) — T011 —, cada um PROVADO e DESFEITO.

    python -m scripts.provas.provar_defeitos_5b

O QUÊ  : para cada defeito, planta a falha, roda a suíte que deveria pegá-la e exige que
         REPROVE; desfaz explicitamente; confere que a estrutura voltou idêntica; e roda a
         mesma suíte de novo, exigindo que PASSE.

PARA QUÊ: teste que nunca foi visto reprovando não é teste. É o item 8 da *Definition of Done*
         do `CLAUDE.md` levado até o fim: o caso que discrimina prova que a regra MUDOU, e o
         defeito deliberado prova que a suíte PEGARIA se ela voltasse.

⚠️ **OS QUATRO ALVOS SÃO AS QUATRO DECISÕES QUE ESTA FATIA TOMOU**, e não objetos escolhidos ao
   acaso:

   1. **o porteiro da exclusão** (`FR-021`, D-B1) — se ele cair, o Operador exclui, e a regra 4
      emendada deixa de valer sem que nada acuse;
   2. **o adiamento da conferência do rateio** (`FR-043`, A-1) — trocá-la por gatilho POR LINHA é
      o erro natural de quem não sabe por que ela é adiada, e o efeito é reprovar gravação
      CORRETA no meio do caminho;
   3. **a cláusula `origem_periodo = 'manual'` da janela** (`FR-030.1`, Q-07) — sem ela, as 4
      linhas que já estão fora da janela viram bomba: a carga do ETL para de passar;
   4. **a sequência `DIS-` na lista única** (`FR-012`, gotcha 9) — fora dela, quem restaurar dado
      quebra na primeira criação, com mensagem que manda procurar um valor repetido inexistente.

⚠️ **A RESTAURAÇÃO É EXPLÍCITA, NUNCA `ROLLBACK`** — as suítes rodam em outras conexões, e a de
   RLS entra pelo PostgREST com sessão de verdade, então o defeito precisa estar **commitado**
   para que elas o vejam. E a lição do `setval` (gotcha 6) vale inteira.

⚠️ **COMO SE CONFERE QUE VOLTOU: `pg_dump` da estrutura, antes e depois, byte a byte** — os
   esquemas `public` e `app` inteiros. Conferir só o objeto mexido provaria que ele voltou, não
   que nada mais mudou; e o dump pega o que a restauração esquecer, como um `REVOKE` que não foi
   reposto.

⚠️ **NUNCA CONTRA O REMOTO.** Ela planta defeito de propósito no banco local.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass

# Os auxiliares são os da prova da fatia (a): um só lugar que sabe tirar o retrato da estrutura,
# comparar dumps e ler o veredito de uma suíte. Uma segunda cópia divergiria na primeira mudança.
from scripts.provas.provar_defeitos_deliberados import (
    Veredito,
    diferenca,
    estrutura,
    pgtap,
    sql,
    uma,
    vitest,
)


def definicao(assinatura: str) -> str:
    """O `CREATE OR REPLACE FUNCTION` da função, lido do catálogo.

    ⚠️ **NÃO se usa `secoes_do_dump` aqui, e a razão foi medida**: o cabeçalho que o `pg_dump`
    escreve é `-- Name: excluir_disciplina(uuid, text); Type: FUNCTION; Schema: app` — o nome
    **não** vem qualificado pelo schema, então procurar `app.excluir_disciplina` casa **zero**
    seções e a prova aborta dizendo que a função mudou de forma, quando ela não mudou.
    `pg_get_functiondef` resolve isso e emite `CREATE OR REPLACE`, que preserva o comentário e a
    ACL — os dois vivem em entradas próprias do catálogo e sobrevivem à substituição. É o que faz
    o `pg_dump` de depois voltar idêntico.
    """
    d = uma(f"select pg_get_functiondef('{assinatura}'::regprocedure)")
    if not d.strip():
        raise SystemExit(f"[NAO CONFERIDA] nao achei a definicao de {assinatura}")
    return d

RAIZ_PROVA = "scripts/provas/provar_defeitos_5b.py"


@dataclass
class Defeito:
    tarefa: str
    descricao: str
    plantar: object
    desfazer: object
    provas: tuple
    rastro: str | None = None


def rls_disciplinas(filtro: str = "") -> Veredito:
    return vitest("tests/invariantes/rls/disciplinas.test.ts --no-file-parallelism", filtro)


def montar() -> list[Defeito]:
    # -- 1 — o porteiro da exclusão --------------------------------------------------
    #
    # ⚠️ O DEFEITO TEM DE CAIR NAS DUAS FUNÇÕES, e isso foi MEDIDO em 25/09/2026: tirando o
    #    porteiro só de `app.excluir_disciplina`, a suíte de RLS continuou **verde** — porque
    #    `app.impedimentos_de_exclusao_da_disciplina`, que ela chama em seguida, tem o SEU
    #    porteiro e devolve o mesmo `42501`. **São duas defesas independentes**, e a segunda
    #    segurou o que a primeira deixou de segurar — exatamente o que aconteceu no T101 da
    #    fatia (a). Um defeito que só derruba a primeira não prova nada sobre a suíte: prova
    #    que existe uma segunda. Para observar a suíte, as duas caem juntas.
    def_excluir = definicao("app.excluir_disciplina(uuid, text)")
    def_impedimentos = definicao("app.impedimentos_de_exclusao_da_disciplina(uuid)")
    porteiro_a = "if not app.pode('disciplinas', 'criar') then"
    assert porteiro_a in def_excluir and porteiro_a in def_impedimentos, (
        "o porteiro das funcoes de exclusao mudou de forma; a prova precisa ser revista"
    )

    def plantar_1() -> None:
        sql(def_excluir.replace(porteiro_a, "if not true then"))
        sql(def_impedimentos.replace(porteiro_a, "if not true then"))

    def desfazer_1() -> None:
        sql(def_excluir)
        sql(def_impedimentos)

    # -- 2 — o adiamento da conferência do rateio -------------------------------------
    def plantar_2() -> None:
        sql(
            """
            drop trigger if exists trg_tdi_soma_do_rateio on public.turma_disciplina_instrutor;
            create trigger trg_tdi_soma_do_rateio
              after insert or update on public.turma_disciplina_instrutor
              for each row execute function app.trg_soma_do_rateio();
            """
        )

    def desfazer_2() -> None:
        sql(
            """
            drop trigger if exists trg_tdi_soma_do_rateio on public.turma_disciplina_instrutor;
            create constraint trigger trg_tdi_soma_do_rateio
              after insert or update on public.turma_disciplina_instrutor
              deferrable initially deferred
              for each row execute function app.trg_soma_do_rateio();
            """
        )

    # -- 3 — a cláusula de origem do gatilho da janela --------------------------------
    def_janela = definicao("app.trg_turma_disciplina_janela()")
    clausula = "if new.origem_periodo <> 'manual' then"
    assert clausula in def_janela, (
        "a cláusula de origem do gatilho da janela mudou de forma; a prova precisa ser revista"
    )

    def plantar_3() -> None:
        sql(def_janela.replace(clausula, "if false then"))

    def desfazer_3() -> None:
        sql(def_janela)

    return [
        Defeito(
            tarefa="D-1",
            descricao="porteiro de `app.excluir_disciplina` trocado por `true` (FR-021, D-B1)",
            plantar=plantar_1,
            desfazer=desfazer_1,
            provas=(
                ("RLS · o Operador NÃO exclui", lambda: rls_disciplinas("quem exclui disciplina")),
            ),
            rastro="select count(*) from public.exclusoes_registradas",
        ),
        Defeito(
            tarefa="D-2",
            descricao="conferência do rateio POR LINHA, em vez de adiada (FR-043, A-1)",
            plantar=plantar_2,
            desfazer=desfazer_2,
            provas=(("pgTAP · o 110 e o resto da suíte", pgtap),),
        ),
        Defeito(
            tarefa="D-3",
            descricao="gatilho da janela conferindo TODA origem, não só `manual` (FR-030.1, Q-07)",
            plantar=plantar_3,
            desfazer=desfazer_3,
            provas=(("pgTAP · o 109 e o resto da suíte", pgtap),),
        ),
    ]


def provar_de_banco(d: Defeito) -> list[str]:
    problemas: list[str] = []
    print(f"\n{'=' * 78}\n{d.tarefa} · {d.descricao}\n{'=' * 78}")

    antes = estrutura()
    rastro_antes = uma(d.rastro) if d.rastro else None

    d.plantar()  # type: ignore[operator]
    print("  defeito PLANTADO e commitado")
    try:
        for rotulo, prova in d.provas:
            v = prova()
            if v.passou:
                problemas.append(
                    f"{d.tarefa}: '{rotulo}' PASSOU com o defeito no lugar — ela nao prova nada ({v.resumo})"
                )
                print(f"  X {rotulo}: PASSOU com o defeito — {v.resumo}")
            else:
                extra = f" · {', '.join(v.reprovados)}" if v.reprovados else ""
                print(f"  OK {rotulo}: REPROVOU, como devia — {v.resumo}{extra}")
    finally:
        d.desfazer()  # type: ignore[operator]
        print("  defeito DESFEITO, explicitamente")

    fora = diferenca(antes, estrutura())
    if fora:
        problemas.append(
            f"{d.tarefa}: a estrutura NAO voltou identica — {len(fora)} linha(s):\n      "
            + "\n      ".join(fora[:12])
        )
        print(f"  X estrutura DIFERENTE da de antes em {len(fora)} linha(s)")
    else:
        print(f"  OK estrutura IDENTICA — pg_dump de public e app, {len(antes.splitlines())} linhas")

    for rotulo, prova in d.provas:
        v = prova()
        if not v.passou:
            problemas.append(f"{d.tarefa}: '{rotulo}' continua REPROVANDO depois de desfeito ({v.resumo})")
            print(f"  X {rotulo}: reprova DEPOIS de desfeito — {v.resumo}")
        else:
            print(f"  OK {rotulo}: verde de novo — {v.resumo}")

    if d.rastro:
        print(f"  (dado) linhas que o defeito deixou passar: {rastro_antes} antes -> {uma(d.rastro)} depois")
    return problemas


def prova_das_sequencias() -> Veredito:
    """A prova do gotcha 9 — e é ELA que conta as sequências, não a varredura de unidade.

    ⚠️ **MEDIDO em 25/09/2026**: com a `DIS-` fora da lista,
    `sequencias-apos-restaurar.test.ts` continuou **verde**, e com razão — ele prova que *quem
    restaura chama `avancar_sequencias`* e que ninguém usa `setval` por fora, não *quais*
    sequências estão declaradas. Quem conta é o **P3** de `provar_sequencias_apos_copia.py`
    (`N no banco, N declaradas`). Apontar o defeito para a suíte errada daria um "PASSOU com o
    defeito" que acusaria a suíte inocente.
    """
    import subprocess

    r = subprocess.run(
        "python -m scripts.manutencao.provar_sequencias_apos_copia",
        shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    saida = r.stdout + r.stderr
    p3 = next((l.strip() for l in saida.splitlines() if l.startswith("P3")), "sem P3")
    return Veredito(r.returncode == 0, p3)


def provar_d4() -> list[str]:
    """D-4 — o defeito de CÓDIGO: a sequência `DIS-` fora da lista única."""
    from pathlib import Path

    problemas: list[str] = []
    alvo = Path("scripts/etl/carregar.py")
    trecho = """    ("app.disciplinas_codigo_seq", "disciplinas",
     "case when codigo ~ '^DIS-[0-9]+$' then substring(codigo from 5)::bigint end"),
"""
    print(f"\n{'=' * 78}\nD-4 · a sequencia DIS- fora de SEQUENCIAS_DE_CODIGO (FR-012, gotcha 9)\n{'=' * 78}")

    original = alvo.read_bytes()
    texto = original.decode("utf-8")
    assert texto.count(trecho) == 1, "o trecho da sequencia DIS- mudou; a prova precisa ser revista"

    alvo.write_bytes(texto.replace(trecho, "").encode("utf-8"))
    print("  defeito PLANTADO")
    try:
        v = prova_das_sequencias()
        if v.passou:
            problemas.append("D-4: a prova das sequencias PASSOU com a DIS- fora da lista")
            print(f"  X prova das sequencias: PASSOU com o defeito — {v.resumo}")
        else:
            print(f"  OK prova das sequencias: REPROVOU, como devia — {v.resumo}")
    finally:
        alvo.write_bytes(original)
        print("  defeito DESFEITO, com o conteudo original byte a byte")

    import subprocess

    limpo = subprocess.run(
        'git diff --quiet -- "scripts/etl/carregar.py"', shell=True, capture_output=True
    ).returncode == 0
    if not limpo:
        problemas.append("D-4: o arquivo NAO voltou ao que esta no git")
    print(f"  {'OK' if limpo else 'X'} `git diff` do arquivo: {'vazio' if limpo else 'HA DIFERENCA'}")

    v = prova_das_sequencias()
    print(f"  {'OK' if v.passou else 'X'} prova depois de desfeito: {v.resumo}")
    if not v.passou:
        problemas.append(f"D-4: a prova continua reprovando depois de desfeito ({v.resumo})")
    return problemas


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    inicial = estrutura()
    print(f"estrutura inicial: pg_dump de public e app, {len(inicial.splitlines())} linhas")

    problemas: list[str] = []
    for d in montar():
        problemas.extend(provar_de_banco(d))
    problemas.extend(provar_d4())

    fora = diferenca(inicial, estrutura())
    print(f"\n{'=' * 78}")
    if fora:
        problemas.append(f"a estrutura final difere da inicial em {len(fora)} linha(s)")
        print(f"X a estrutura FINAL difere da inicial em {len(fora)} linha(s)")
    else:
        print("OK a estrutura final e IDENTICA a inicial — os quatro defeitos foram desfeitos")

    if problemas:
        print("\nNAO PROVADO:")
        for p in problemas:
            print(f"  - {p}")
        return 1
    print("\nPROVADO: os quatro defeitos foram pegos pela suite certa, desfeitos, e a base voltou.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
