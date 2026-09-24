"""Prova do porteiro de `dado_do_remoto.py` — ele RECUSA destino que não seja o local.

    python -m scripts.manutencao.provar_porteiro_do_dado

PARA QUÊ: o script de cópia **recria o banco de destino** (`supabase db reset`). Um porteiro
         que não recusa não é porteiro, e a forma de saber é apontá-lo para um endereço
         remoto e ver o que ele faz — não ler a linha do `if`.

⚠️ **O CASO QUE DISCRIMINA É O P1.** Um controle positivo sozinho (aponta para o local,
   passa) daria o mesmo veredito com o porteiro apagado. O que o observa é o par: **com** o
   endereço remoto ele **recusa e não escreve nada**; **com** o endereço local ele segue.

⚠️ **ELA NÃO TOCA EM BANCO NENHUM.** A prova troca `_do_cli` e as funções que escrevem por
   dublês que registram a chamada — se alguma delas for chamada no caminho da recusa, o P1
   reprova dizendo qual foi. Uma prova de porteiro que precisasse de banco para rodar seria
   a própria coisa que ela existe para impedir.
"""

from __future__ import annotations

import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.manutencao import dado_do_remoto as alvo  # noqa: E402

REMOTO = "https://cqhpfuaweoyglhtrckcp.supabase.co"
LOCAL = "http://127.0.0.1:54321"


def _rodar_com(url: str) -> tuple[int, list[str]]:
    """Roda `main()` com o `supabase status` respondendo `url`, sem deixar nada escrever."""
    tocou: list[str] = []

    original = {
        "_do_cli": alvo._do_cli,
        "_conteiner_do_banco": alvo._conteiner_do_banco,
        "_psql": alvo._psql,
        "_pasta_das_copias": alvo._pasta_das_copias,
    }
    try:
        alvo._do_cli = lambda chave: url  # type: ignore[assignment]
        alvo._conteiner_do_banco = lambda: tocou.append("descobriu o conteiner") or "dublê"  # type: ignore[assignment,func-returns-value]
        alvo._psql = lambda *a, **k: tocou.append("executou SQL") or ""  # type: ignore[assignment,func-returns-value]
        # ⚠️ Se a execução passar do porteiro, ela para aqui — e o registro diz que passou.
        alvo._pasta_das_copias = lambda: (_ for _ in ()).throw(  # type: ignore[assignment]
            RuntimeError("passou do porteiro e foi procurar a pasta das copias")
        )
        try:
            return alvo.main(), tocou
        except RuntimeError as erro:
            tocou.append(str(erro))
            return -1, tocou
    finally:
        for nome, funcao in original.items():
            setattr(alvo, nome, funcao)


def main() -> int:
    veredito: list[bool] = []

    # -- P1 — O CASO QUE DISCRIMINA: endereço remoto -----------------------------------
    codigo, tocou = _rodar_com(REMOTO)
    escreveu = [t for t in tocou if t != "descobriu o conteiner"]
    ok1 = codigo == 3 and not escreveu
    veredito.append(ok1)
    print(
        f"P1  destino REMOTO: saida={codigo} (3 = recusado) · escreveu={escreveu or 'nada'}  "
        f"{'-> RECUSOU sem tocar em nada' if ok1 else '-> NAO RECUSOU'}"
    )

    # -- P2 — controle positivo: endereço local passa do porteiro ----------------------
    codigo, tocou = _rodar_com(LOCAL)
    passou = any("passou do porteiro" in t for t in tocou)
    ok2 = codigo == -1 and passou
    veredito.append(ok2)
    print(
        f"P2  destino LOCAL:  o porteiro deixa seguir = {passou}  "
        f"{'-> aprova' if ok2 else '-> BARROU O LOCAL, que e o caso legitimo'}"
    )

    # -- P3 — a recusa não depende do formato exato do endereço ------------------------
    for outro in ("https://exemplo.supabase.co", "postgres://db.exemplo:5432", "http://10.0.0.7"):
        codigo, _ = _rodar_com(outro)
        if codigo != 3:
            veredito.append(False)
            print(f"P3  {outro}: saida={codigo}  -> DEIXOU PASSAR")
            break
    else:
        veredito.append(True)
        print("P3  tres enderecos nao-locais: os tres recusados  -> aprova")

    print()
    if all(veredito):
        print("PROVADO: o porteiro recusa destino que nao seja o Docker desta maquina.")
        return 0
    print("NAO PROVADO: ver os casos acima.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
