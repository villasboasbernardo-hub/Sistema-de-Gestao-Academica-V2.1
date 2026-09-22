"""Dá credencial LOCAL a um cadastro que já existe em `usuarios` — para conferir com os olhos.

    python -m scripts.manutencao.credencial_local villasboasbernardo@gmail.com

O QUÊ  : cria a conta de acesso (`auth.users`) para uma linha de `usuarios` que veio da carga
         e a vincula, para que a pessoa consiga **entrar no sistema local** e olhar os dados
         reais na tela.

PARA QUÊ: depois do ETL, `usuarios` tem os cadastros da v2.0 — e **nenhum deles tem
         credencial**, porque a v2.0 não tinha senha para migrar. Sem isto não há como
         abrir o sistema e conferir o que foi carregado, que é a única forma de alguém que
         conhece o dado dizer se ele está certo.

⚠️ **SÓ NO STACK LOCAL, E A RECUSA É EXPLÍCITA.** O script usa a chave de serviço, que ignora
   a RLS inteira — é um dos três usos autorizados do `CLAUDE.md` (*"script de manutenção
   versionado rodado à mão"*). Ele **recusa** qualquer endereço que não seja o do Docker
   desta máquina: criar credencial em preview ou em produção por engano, achando que se está
   no local, é erro que não se desfaz.

⚠️ **E ELE NÃO INVENTA CADASTRO.** Se o e-mail não estiver em `usuarios`, o script para e diz
   — criar a linha seria fabricar um usuário que ninguém autorizou, e o `FR-008` manda que
   cadastro de pessoa venha por convite do Admin.
"""

from __future__ import annotations

import subprocess
import sys

SENHA_LOCAL = "conferencia-local-12345"
ENDERECO_LOCAL = "http://127.0.0.1:54321"


def _do_cli(chave: str) -> str:
    """Lê um valor do `supabase status` — a mesma fonte que as suítes usam."""
    saida = subprocess.run(
        ["supabase", "status", "-o", "env"],
        capture_output=True,
        text=True,
        shell=True,
        check=False,
    ).stdout
    for linha in saida.splitlines():
        if "=" in linha:
            nome, valor = linha.split("=", 1)
            if nome.strip() == chave:
                return valor.strip().strip('"')
    raise SystemExit(
        f"[ABORTADO] nao achei {chave} no `supabase status`. O stack local esta de pe? "
        f"Rode `pnpm db:start`."
    )


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    email = sys.argv[1].strip().lower()

    url = _do_cli("API_URL")
    if not url.startswith("http://127.0.0.1") and not url.startswith("http://localhost"):
        print(
            f"[RECUSADO] o `supabase status` aponta para {url}, que nao e o stack local. "
            f"Este script so roda contra o Docker desta maquina."
        )
        return 3

    return _criar(email)


def _criar(email: str) -> int:
    import json
    import urllib.error
    import urllib.request

    import psycopg

    chave = _do_cli("SERVICE_ROLE_KEY")
    conexao = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

    with psycopg.connect(conexao) as con, con.cursor() as k:
        k.execute(
            "select id, codigo, perfil, auth_user_id from public.usuarios where lower(email) = %s",
            (email,),
        )
        linha = k.fetchone()
        if linha is None:
            k.execute("select email from public.usuarios order by email")
            conhecidos = ", ".join(r[0] for r in k.fetchall())
            print(
                f"[ABORTADO] {email} nao esta em `usuarios`. Este script nao cria cadastro.\n"
                f"           Cadastros que existem: {conhecidos}"
            )
            return 1
        usuario_id, codigo, perfil, ja_tem = linha

    if ja_tem:
        print(
            f"[NADA A FAZER] {codigo} ({perfil}) ja tem credencial. "
            f"Entre com {email} e a senha {SENHA_LOCAL!r}, subindo o sistema com "
            f"`pnpm dev:local` (NAO `pnpm dev`, que fala com o banco remoto)."
        )
        return 0

    corpo = json.dumps(
        {"email": email, "password": SENHA_LOCAL, "email_confirm": True}
    ).encode()
    pedido = urllib.request.Request(
        f"{ENDERECO_LOCAL}/auth/v1/admin/users",
        data=corpo,
        headers={
            "apikey": chave,
            "Authorization": f"Bearer {chave}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(pedido) as resposta:
            criado = json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        detalhe = erro.read().decode(errors="replace")[:300]
        print(f"[ABORTADO] a criacao da conta falhou ({erro.code}): {detalhe}")
        return 1

    with psycopg.connect(conexao) as con, con.cursor() as k:
        k.execute(
            "update public.usuarios set auth_user_id = %s where id = %s",
            (criado["id"], usuario_id),
        )
        con.commit()

    print(
        f"[PRONTO] {codigo} ({perfil}) agora entra no sistema local.\n"
        f"         Suba o sistema com:  pnpm dev:local   (NAO `pnpm dev`, que fala com o remoto)\n"
        f"         Endereco: http://localhost:3000/login\n"
        f"         E-mail:   {email}\n"
        f"         Senha:    {SENHA_LOCAL}\n\n"
        f"         ⚠️ Esta senha vale SO no Docker desta maquina. Ela nao existe em preview "
        f"nem em producao, e o banco local e descartavel."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
