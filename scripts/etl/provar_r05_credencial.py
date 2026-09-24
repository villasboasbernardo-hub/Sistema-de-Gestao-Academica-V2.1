"""Prova da exceção da R-05 — procedência dispensada SÓ para credencial do Auth.

O QUÊ  : mede os quatro casos que delimitam a exceção autorizada por Bernardo Villas Boas
         em 23/09/2026 — *"vale só para `usuarios`, só para linha vinculada a uma
         credencial do Auth, e não dispensa procedência em nenhuma outra tabela"*.

PARA QUÊ: o caso que discrimina. Um negativo (linha sem procedência acusa) e um controle
         positivo (base limpa aprova) dariam o MESMO veredito antes e depois desta
         mudança — logo não provariam nada sobre ela. O que a observa é o P1: a mesma
         linha, com a mesma procedência nula, acusada pela regra velha e dispensada pela
         nova. Por isso o P1 mede as duas contagens lado a lado.

⚠️ **ELA MEDE DELTA, NÃO LISTA ABSOLUTA — e a razão é medida, não zelo.** Toda execução de
   ponta a ponta cria curso pela RPC, e **curso não é apagável** (regra 9.1 do `CLAUDE.md`):
   os cursos de teste ficam no banco para sempre, sem `origem_migracao_v1`, porque não
   vieram da v2.0. Medido em 23/09/2026 no banco local: **55 cursos sem procedência de 79**,
   todos com prefixo de amostra (`CT0-…`, `CUR-…`). Uma versão anterior desta prova
   comparava a lista inteira de divergências e passou a reprovar por isso — **reprovando
   pelo estado da base, não pela regra que ela mede**. Comparar o antes e o depois da
   própria alteração é o que a torna independente de quantos restos de teste existem.

⚠️ **CONSEQUÊNCIA MAIOR, REGISTRADA E NÃO CORRIGIDA AQUI:** pelo mesmo motivo, rodar
   `python -m scripts.etl.executar --somente-reconciliar` contra o banco **local** depois de
   qualquer execução de ponta a ponta devolve **BLOQUEADA** na R-05 — e o bloqueio é honesto
   sobre o que vê, mas não é sobre a carga. `pnpm verificar:tudo` não vê, porque faz
   `db:reset` antes. É da mesma família da `PEND-5a-5`.

COMO   : `python -m scripts.etl.provar_r05_credencial`, contra o banco LOCAL, com a base
         já carregada. Escreve e desfaz: ao fim, o P4 confere que as contagens voltaram
         exatamente ao que eram — se não voltarem, a prova sujou a base e diz isso.

⚠️ NUNCA CONTRA O REMOTO. A prova apaga procedência de propósito; fazê-lo no remoto é
   corromper a base carregada para conferir a verificação que existe para protegê-la.
"""

from __future__ import annotations

import sys

import psycopg

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.etl import reconciliar  # noqa: E402

C = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# A consulta da R-05 **sem** o recorte: é a regra como era antes de 23/09/2026. Existe só
# para o P1 conseguir mostrar os dois vereditos sobre a mesma linha.
SEM_RECORTE = (
    "select count(*) from public.{t} "
    "where origem_migracao_v1 is null or btrim(origem_migracao_v1) = ''"
)


def procedencia(con: psycopg.Connection) -> dict[str, int]:
    """As divergências de procedência da R-05, por tabela — o retrato contra o qual se compara."""
    return {
        d.tabela: int(d.obtido)
        for d in reconciliar.r05_identidade_e_procedencia(con)
        if d.linha == "sem procedência"
    }


def delta(antes: dict[str, int], depois: dict[str, int]) -> dict[str, int]:
    """O que a alteração acrescentou — só o que mudou, e só para mais."""
    return {
        t: depois.get(t, 0) - antes.get(t, 0)
        for t in set(antes) | set(depois)
        if depois.get(t, 0) != antes.get(t, 0)
    }


def main() -> int:
    con = psycopg.connect(C)
    con.autocommit = True
    k = con.cursor()

    k.execute("select count(*) from public.usuarios where origem_migracao_v1 is null")
    if k.fetchone()[0]:
        print("[NAO CONFERIDA] a base local ja tem usuario sem procedencia: o P1 nao")
        print("                conseguiria distinguir a linha que ele mesmo criou.")
        return 2

    base = procedencia(con)
    k.execute(SEM_RECORTE.format(t="usuarios"))
    base_velha = k.fetchone()[0]
    print(f"linha de base (restos de amostra, curso nao e apagavel): {base or 'nenhuma'}\n")

    com_credencial = "USR-02"  # única com `auth_user_id` preenchido na base local
    sem_credencial = "USR-01"
    k.execute(
        "select origem_migracao_v1 from public.usuarios where codigo = any(%s) order by codigo",
        ([sem_credencial, com_credencial],),
    )
    guardado = [r[0] for r in k.fetchall()]
    k.execute("select codigo, origem_migracao_v1 from public.cursos order by codigo limit 1")
    curso, curso_guardado = k.fetchone()

    veredito = []

    # -- P1 — O CASO QUE DISCRIMINA -----------------------------------------------------
    k.execute(
        "update public.usuarios set origem_migracao_v1 = null where codigo = %s",
        (com_credencial,),
    )
    k.execute(SEM_RECORTE.format(t="usuarios"))
    pela_regra_velha = k.fetchone()[0] - base_velha
    pela_regra_nova = delta(base, procedencia(con))
    ok1 = pela_regra_velha == 1 and not pela_regra_nova
    veredito.append(ok1)
    print(
        f"P1  {com_credencial} COM credencial, sem procedencia: "
        f"regra velha acusa +{pela_regra_velha} · regra nova acusa {pela_regra_nova or '+0'}  "
        f"{'-> o veredito VIRA' if ok1 else '-> NAO VIROU'}"
    )

    # -- P2 — a mesma ausência, sem credencial, continua bloqueando ---------------------
    k.execute(
        "update public.usuarios set origem_migracao_v1 = null where codigo = %s",
        (sem_credencial,),
    )
    d = delta(base, procedencia(con))
    ok2 = d == {"usuarios": 1}
    veredito.append(ok2)
    print(
        f"P2  {sem_credencial} SEM credencial, sem procedencia: R-05 acusa {d}  "
        f"{'-> BLOQUEIA, como deve' if ok2 else '-> FALHOU'}"
    )
    k.execute(
        "update public.usuarios set origem_migracao_v1 = %s where codigo = %s",
        (guardado[0], sem_credencial),
    )

    # -- P3 — a isenção não alcança outra tabela ----------------------------------------
    k.execute("update public.cursos set origem_migracao_v1 = null where codigo = %s", (curso,))
    d = delta(base, procedencia(con))
    ok3 = d == {"cursos": 1}
    veredito.append(ok3)
    print(
        f"P3  curso {curso} sem procedencia: R-05 acusa {d}  "
        f"{'-> BLOQUEIA: a excecao e so de usuarios' if ok3 else '-> FALHOU'}"
    )
    k.execute(
        "update public.cursos set origem_migracao_v1 = %s where codigo = %s",
        (curso_guardado, curso),
    )

    # -- P4 — restaurado, as contagens voltam EXATAMENTE ao que eram ---------------------
    k.execute(
        "update public.usuarios set origem_migracao_v1 = %s where codigo = %s",
        (guardado[1], com_credencial),
    )
    sobrou = delta(base, procedencia(con))
    ok4 = not sobrou
    veredito.append(ok4)
    print(
        f"P4  restaurado: diferenca em relacao a linha de base {sobrou or 'nenhuma'}  "
        f"{'-> a prova nao sujou a base' if ok4 else '-> A BASE FICOU SUJA'}"
    )

    print("\nPROVA:", "excecao delimitada como autorizada" if all(veredito) else "FALHOU")
    return 0 if all(veredito) else 1


if __name__ == "__main__":
    sys.exit(main())
