"""Prova de `conta_local.py` — ele é IDEMPOTENTE e RECUSA destino que não seja o local.

    python -m scripts.manutencao.provar_conta_local

PARA QUÊ: o script roda **sozinho** ao fim de `pnpm db:reset`, da carga do ETL e da cópia do
         remoto. Um script automático que duplicasse conta, ou que rodasse contra o projeto
         remoto, faria estrago sem ninguém ter digitado nada — as duas promessas precisam ser
         medidas, e não lidas no código.

⚠️ **A IDEMPOTÊNCIA SE PROVA NA SEGUNDA EXECUÇÃO, e é o P1.** A primeira cria; a segunda tem
   de dizer *"já existia"* nos três passos e deixar o banco **exatamente** como estava —
   mesma contagem de contas no Auth, mesma linha de `usuarios`, mesmo vínculo.

⚠️ **O PORTEIRO SE PROVA APONTANDO PARA FORA, e é o P3.** Um controle positivo sozinho daria
   o mesmo veredito com o porteiro apagado.

⚠️ **ELA ESCREVE NO BANCO LOCAL**, porque é isso que o script faz — e não desfaz nada ao
   final, de propósito: a conta é para ficar. O que ela confere é que a segunda execução não
   acrescentou nada.
"""

from __future__ import annotations

import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.manutencao import conta_local as alvo  # noqa: E402

REMOTO = "https://cqhpfuaweoyglhtrckcp.supabase.co"


def _psql(sql: str) -> str:
    nomes = subprocess.run(
        ["docker", "ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"],
        capture_output=True, text=True, shell=True, check=False,
    ).stdout.strip().splitlines()
    if len(nomes) != 1:
        raise SystemExit("[NAO CONFERIDA] o stack local nao esta de pe.")
    r = subprocess.run(
        ["docker", "exec", "-i", nomes[0], "psql", "-U", "postgres", "-d", "postgres", "-Atc", sql],
        capture_output=True, text=True, shell=True, check=False,
    )
    return r.stdout.strip()


def retrato() -> str:
    """Conta, cadastro e vínculo — o que a segunda execução não pode mudar."""
    return _psql(
        "select (select count(*) from auth.users)::text||'/'"
        "||(select count(*) from public.usuarios)::text||'/'"
        "||(select count(*) from public.usuarios where auth_user_id is not null)::text"
    )


def main() -> int:
    veredito: list[bool] = []

    # -- P0 — a primeira execução deixa a conta de pé -----------------------------------
    print("P0  primeira execucao:")
    if alvo.main([]) != 0:
        print("    -> NAO CRIOU")
        return 1
    depois_da_primeira = retrato()
    print(f"    retrato (auth/usuarios/vinculados) = {depois_da_primeira}\n")

    # -- P1 — A PROVA: a segunda execução não muda nada ---------------------------------
    print("P1  segunda execucao seguida:")
    saida = alvo.main([])
    depois_da_segunda = retrato()
    ok1 = saida == 0 and depois_da_segunda == depois_da_primeira
    veredito.append(ok1)
    print(
        f"    retrato = {depois_da_segunda}  "
        f"{'-> IDEMPOTENTE' if ok1 else '-> MUDOU A BASE'}\n"
    )

    # -- P2 — e não duplicou conta nem cadastro ------------------------------------------
    duplicadas = _psql(
        "select (select count(*) from (select lower(email) from auth.users "
        "         group by 1 having count(*)>1) x)::text||'/'"
        "||(select count(*) from (select lower(email) from public.usuarios "
        "         group by 1 having count(*)>1) y)::text"
    )
    ok2 = duplicadas == "0/0"
    veredito.append(ok2)
    print(f"P2  duplicatas (auth/usuarios) = {duplicadas}  {'-> nenhuma' if ok2 else '-> DUPLICOU'}")

    # -- P3 — O PORTEIRO: destino remoto é recusado, sem escrever nada -------------------
    original = alvo._do_cli
    try:
        alvo._do_cli = lambda chave: REMOTO  # type: ignore[assignment]
        antes = retrato()
        codigo = alvo.main([])
        depois = retrato()
    finally:
        alvo._do_cli = original
    ok3 = codigo == 3 and antes == depois
    veredito.append(ok3)
    print(
        f"P3  destino REMOTO: saida={codigo} (3 = recusado) · base intacta={antes == depois}  "
        f"{'-> RECUSOU' if ok3 else '-> NAO RECUSOU'}"
    )

    print()
    if all(veredito):
        print("PROVADO: idempotente, sem duplicata, e recusa destino que nao seja o local.")
        return 0
    print("NAO PROVADO: ver os casos acima.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
