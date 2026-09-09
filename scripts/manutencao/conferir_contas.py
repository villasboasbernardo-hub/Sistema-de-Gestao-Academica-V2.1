"""Confere a correspondencia entre credencial e cadastro — nos DOIS sentidos (FR-013).

    python -m scripts.manutencao.conferir_contas

⚠️ POR QUE OS DOIS SENTIDOS, e por que um deles e mais grave:

  · LINHA SEM CREDENCIAL  — `usuarios` com `auth_user_id` nulo. E VISIVEL na tela de usuarios e,
    dentro da validade do convite, e o estado LEGITIMO do FR-008. So vira achado depois disso.

  · CREDENCIAL SEM LINHA  — conta em `auth.users` sem par em `usuarios`. NAO alcanca dado nenhum
    (o teste T-09 prova), mas tambem NAO APARECE em lugar nenhum. Invisivel e pior que incompleto:
    ninguem vai encontra-la por acaso, e ela e credencial valida no projeto.

Saida 0 = consistente. Saida 1 = ha o que olhar, com cada caso NOMEADO.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone

import psycopg

CONEXAO_LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Validade do convite na plataforma. Linha sem credencial mais nova que isto NAO e achado — e a
# janela deliberada do FR-008, em que o Admin ainda revisa.
VALIDADE_DO_CONVITE = timedelta(hours=24)


def conferir(conexao: str = CONEXAO_LOCAL) -> list[str]:
    achados: list[str] = []
    corte = datetime.now(timezone.utc) - VALIDADE_DO_CONVITE

    with psycopg.connect(conexao) as con, con.cursor() as k:
        k.execute(
            """
            select u.codigo, u.email, u.criado_em
              from public.usuarios u
             where u.auth_user_id is null
               and u.status = 'ativo'
               and u.criado_em < %s
             order by u.criado_em
            """,
            (corte,),
        )
        for codigo, email, criado in k.fetchall():
            achados.append(
                f"LINHA SEM CREDENCIAL · {codigo} · {email} · convidado em "
                f"{criado:%d/%m/%Y} e nunca aceito — reenviar ou desativar"
            )

        k.execute(
            """
            select a.id, a.email, a.created_at
              from auth.users a
             where not exists (select 1 from public.usuarios u where u.auth_user_id = a.id)
             order by a.created_at
            """
        )
        for uid, email, criado in k.fetchall():
            achados.append(
                f"CREDENCIAL SEM LINHA · {uid} · {email} · criada em {criado:%d/%m/%Y} — "
                f"nao alcanca dado nenhum, mas e credencial valida no projeto e nao aparece "
                f"em tela nenhuma"
            )

    return achados


if __name__ == "__main__":
    problemas = conferir()
    if not problemas:
        print("[OK] credencial e cadastro correspondem nos dois sentidos")
        sys.exit(0)

    print(f"[{len(problemas)} achado(s)]")
    for p in problemas:
        print(f"  {p}")
    sys.exit(1)
