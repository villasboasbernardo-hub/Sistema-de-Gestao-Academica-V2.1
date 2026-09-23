"""Prova da exceção da R-05 — procedência dispensada SÓ para credencial do Auth.

O QUÊ  : mede os quatro casos que delimitam a exceção autorizada por Bernardo Villas Boas
         em 23/09/2026 — *"vale só para `usuarios`, só para linha vinculada a uma
         credencial do Auth, e não dispensa procedência em nenhuma outra tabela"*.

PARA QUÊ: o caso que discrimina. Um negativo (linha sem procedência acusa) e um controle
         positivo (base limpa aprova) dariam o MESMO veredito antes e depois desta
         mudança — logo não provariam nada sobre ela. O que a observa é o P1: a mesma
         linha, com a mesma procedência nula, acusada pela regra velha e dispensada pela
         nova. Por isso o P1 mede as duas contagens lado a lado.

COMO   : `python -m scripts.etl.provar_r05_credencial`, contra o banco LOCAL, com a base
         já carregada. Escreve e desfaz: ao fim, o P4 confere que a reconciliação inteira
         voltou a APROVADA — se ela não voltar, a prova sujou a base e diz isso.

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


def r05(con: psycopg.Connection) -> list:
    return [
        d
        for d in reconciliar.r05_identidade_e_procedencia(con)
        if d.linha == "sem procedência"
    ]


def main() -> int:
    con = psycopg.connect(C)
    con.autocommit = True
    k = con.cursor()

    k.execute("select count(*) from public.usuarios where origem_migracao_v1 is null")
    if k.fetchone()[0]:
        print("[NAO CONFERIDA] a base local ja tem usuario sem procedencia: o P1 nao")
        print("                conseguiria distinguir a linha que ele mesmo criou.")
        return 2

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
    pela_regra_velha = k.fetchone()[0]
    pela_regra_nova = r05(con)
    ok1 = pela_regra_velha == 1 and not pela_regra_nova
    veredito.append(ok1)
    print(
        f"P1  {com_credencial} COM credencial, sem procedencia: "
        f"regra velha acusa {pela_regra_velha} · regra nova acusa {len(pela_regra_nova)}  "
        f"{'-> o veredito VIRA' if ok1 else '-> NAO VIROU'}"
    )

    # -- P2 — a mesma ausência, sem credencial, continua bloqueando ---------------------
    k.execute(
        "update public.usuarios set origem_migracao_v1 = null where codigo = %s",
        (sem_credencial,),
    )
    achados = r05(con)
    ok2 = len(achados) == 1 and achados[0].tabela == "usuarios" and achados[0].obtido == "1"
    veredito.append(ok2)
    print(
        f"P2  {sem_credencial} SEM credencial, sem procedencia: R-05 acusa "
        f"{[str(d) for d in achados]}  {'-> BLOQUEIA, como deve' if ok2 else '-> FALHOU'}"
    )
    k.execute(
        "update public.usuarios set origem_migracao_v1 = %s where codigo = %s",
        (guardado[0], sem_credencial),
    )

    # -- P3 — a isenção não alcança outra tabela ----------------------------------------
    k.execute("update public.cursos set origem_migracao_v1 = null where codigo = %s", (curso,))
    achados = r05(con)
    ok3 = any(d.tabela == "cursos" for d in achados)
    veredito.append(ok3)
    print(
        f"P3  curso {curso} sem procedencia: R-05 acusa "
        f"{[str(d) for d in achados if d.tabela == 'cursos']}  "
        f"{'-> BLOQUEIA: a excecao e so de usuarios' if ok3 else '-> FALHOU'}"
    )
    k.execute(
        "update public.cursos set origem_migracao_v1 = %s where codigo = %s",
        (curso_guardado, curso),
    )

    # -- P4 — restaurado, a reconciliação INTEIRA volta a aprovar -----------------------
    k.execute(
        "update public.usuarios set origem_migracao_v1 = %s where codigo = %s",
        (guardado[1], com_credencial),
    )
    v = reconciliar.reconciliar(C)
    ok4 = v.aprovada
    veredito.append(ok4)
    print(
        f"P4  restaurado: reconciliacao inteira {'APROVADA' if ok4 else 'BLOQUEADA'}  "
        f"{'-> a prova nao sujou a base' if ok4 else '-> A BASE FICOU SUJA: ' + str(v.bloqueantes)}"
    )

    print("\nPROVA:", "excecao delimitada como autorizada" if all(veredito) else "FALHOU")
    return 0 if all(veredito) else 1


if __name__ == "__main__":
    sys.exit(main())
