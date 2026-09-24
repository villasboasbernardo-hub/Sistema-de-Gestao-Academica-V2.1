"""Prova do caso que discrimina: `ultimo_acesso` fora do checksum canônico da R-08.

O QUÊ  : mede o checksum de `usuarios` **pelas duas regras** — a velha, que incluía
         `usuarios.ultimo_acesso`, e a nova, que o exclui — **antes e depois de um acesso**.

PARA QUÊ: o negativo e o controle positivo dariam o MESMO veredito antes e depois desta
         mudança. O que a observa é a comparação cruzada:

             regra velha:  antes != depois   (um acesso mudava o hash)
             regra nova :  antes == depois   (só o que veio da origem entra)

         Sem o eixo "regra velha", a prova diria apenas que dois hashes iguais são iguais.

⚠️ A REGRA VELHA NÃO É REESCRITA AQUI. O eixo velho roda **o mesmo código** de
   `reconciliar.r08_checksums`, com `ordem.COLUNAS_FORA_DO_CHECKSUM` temporariamente sem
   `ultimo_acesso`. Reimplementar a consulta faria a prova concordar consigo mesma em vez de
   concordar com o carregador — que é exatamente o modo de falha que ela existe para pegar.

COMO   : `python -m scripts.etl.provar_r08_ultimo_acesso`, contra o banco LOCAL, com `usuarios`
         povoada. Escreve e desfaz: o valor anterior de `ultimo_acesso` é lido antes e devolvido
         no fim, e a prova confere que devolveu.

⚠️ NUNCA CONTRA O REMOTO: ela escreve em `usuarios`.

Origem: decisão de Bernardo Villas Boas, 23/09/2026. `FR-006`, `FR-006.1`, R-08.
"""

from __future__ import annotations

import sys

import psycopg

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.etl import ordem, reconciliar  # noqa: E402

C = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def checksum(con: psycopg.Connection, *, com_ultimo_acesso: bool) -> str:
    """O hash de `usuarios` pela regra pedida — sempre pelo código do carregador."""
    guardado = ordem.COLUNAS_FORA_DO_CHECKSUM
    if com_ultimo_acesso:
        ordem.COLUNAS_FORA_DO_CHECKSUM = frozenset(guardado - {"ultimo_acesso"})
    try:
        return reconciliar.r08_checksums(con)["usuarios"]
    finally:
        ordem.COLUNAS_FORA_DO_CHECKSUM = guardado


def main() -> int:
    con = psycopg.connect(C)
    con.autocommit = True
    k = con.cursor()

    k.execute("select codigo, ultimo_acesso from public.usuarios order by codigo limit 1")
    linha = k.fetchone()
    if linha is None:
        print("[NAO CONFERIDA] `usuarios` esta vazia: nao ha acesso a simular.")
        return 2
    codigo, guardado = linha

    velho_antes = checksum(con, com_ultimo_acesso=True)
    novo_antes = checksum(con, com_ultimo_acesso=False)

    # O acesso: é o que `usuarios.ultimo_acesso` registra, e nada mais da linha muda.
    k.execute(
        "update public.usuarios set ultimo_acesso = now() where codigo = %s", (codigo,)
    )

    velho_depois = checksum(con, com_ultimo_acesso=True)
    novo_depois = checksum(con, com_ultimo_acesso=False)

    print(f"um acesso de {codigo}, entre as duas medicoes:\n")
    print(f"  regra VELHA (com ultimo_acesso)   {velho_antes[:12]}… -> {velho_depois[:12]}…  "
          f"{'DIFERENTES' if velho_antes != velho_depois else 'iguais'}")
    print(f"  regra NOVA  (sem ultimo_acesso)   {novo_antes[:12]}… -> {novo_depois[:12]}…  "
          f"{'diferentes' if novo_antes != novo_depois else 'IGUAIS'}")

    # Restaura o valor anterior — a prova não deixa a base diferente de como a encontrou.
    k.execute(
        "update public.usuarios set ultimo_acesso = %s where codigo = %s", (guardado, codigo)
    )
    k.execute("select ultimo_acesso from public.usuarios where codigo = %s", (codigo,))
    devolvido = k.fetchone()[0]
    restaurado = devolvido == guardado

    ok = velho_antes != velho_depois and novo_antes == novo_depois and restaurado
    print(f"\n  restaurado: {'sim' if restaurado else 'NAO — a base ficou diferente'}")
    print(
        "\nPROVA:",
        "o caso discrimina — a regra velha acusava o acesso, a nova nao"
        if ok
        else "FALHOU",
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
