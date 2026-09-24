"""Garante a SUA conta de desenvolvimento no banco LOCAL — idempotente, e roda sozinha.

    python -m scripts.manutencao.conta_local            # o e-mail vem do `git config user.email`
    python -m scripts.manutencao.conta_local <e-mail>   # ou explicitamente

O QUÊ  : cria a credencial no Auth **local**, cria (ou reaproveita) a linha de `usuarios` com
         perfil `admin`, e liga as duas. Rodar de novo não duplica nada: cada passo confere
         antes de escrever, e o script diz o que fez e o que já estava lá.

PARA QUÊ: depois de `pnpm db:reset` ou de uma carga, o banco local fica **sem nenhuma conta com
         credencial** — a v2.0 não tinha senha para migrar, e o `FR-008` só admite cadastro por
         convite do Admin. Só que não há Admin nenhum para convidar: é o ovo e a galinha, e
         resolvê-lo à mão a cada reset é a espécie de atrito que faz alguém parar de conferir o
         dado na tela. Por isso o script roda **ao fim do `db:reset` e ao fim da carga local**.

⚠️ **O E-MAIL NÃO ESTÁ ESCRITO NESTE ARQUIVO, E ISSO É DELIBERADO.** O repositório é
   **público** desde 26/08/2026. O script descobre o endereço nesta ordem: o argumento, a
   variável `CIAARA_CONTA_LOCAL`, e por fim o `git config user.email` — que é de quem está na
   máquina e **não viaja para o repositório**. Fixar um e-mail aqui seria publicar dado pessoal
   de alguém em texto versionado.

⚠️ **SÓ NO STACK LOCAL, E A RECUSA É EXPLÍCITA** — o mesmo porteiro de `credencial_local.py` e
   de `dado_do_remoto.py`. Ele usa a chave de serviço, que **ignora a RLS inteira**: é um dos
   três usos autorizados do `CLAUDE.md` (*"script de manutenção versionado rodado à mão"*).
   Criar conta `admin` em preview ou em produção por engano é erro que não se desfaz.

⚠️ **ELE CRIA A LINHA DE `usuarios` SE ELA NÃO EXISTIR — e aqui ele difere de
   `credencial_local.py` DE PROPÓSITO.** Aquele recusa inventar cadastro, porque serve para
   olhar o dado **migrado**: se o e-mail não veio da planilha, criar a linha seria fabricar um
   usuário que ninguém autorizou. Este serve para o ambiente **recém-criado**, onde não há
   ninguém — e a conta que ele cria é a de quem está no teclado, com o e-mail da própria
   máquina. São dois problemas diferentes, e é por isso que são dois scripts.

⚠️ **A SENHA É FIXA E PÚBLICA, e não é descuido:** ela abre um banco descartável que só existe
   no Docker desta máquina. Escondê-la daria a impressão de proteger algo.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SENHA_LOCAL = "conferencia-local-12345"
CODIGO = "USR-DEV-LOCAL"
NOME = "Conta de desenvolvimento local"


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


def _email_de_quem_esta_na_maquina(argv: list[str]) -> str:
    """O argumento, ou o ambiente, ou o git — nesta ordem. Nunca um valor escrito no arquivo."""
    for candidato in argv:
        if "@" in candidato:
            return candidato.strip().lower()
    doambiente = os.environ.get("CIAARA_CONTA_LOCAL", "").strip()
    if doambiente:
        return doambiente.lower()
    dogit = subprocess.run(
        ["git", "config", "user.email"],
        capture_output=True,
        text=True,
        shell=True,
        check=False,
    ).stdout.strip()
    if dogit:
        return dogit.lower()
    raise SystemExit(
        "[ABORTADO] nao descobri para quem criar a conta. Passe o e-mail como argumento, "
        "ou defina CIAARA_CONTA_LOCAL, ou configure `git config user.email`."
    )


def _api(url: str, chave: str, caminho: str, metodo: str = "GET", corpo: dict | None = None):
    pedido = urllib.request.Request(
        f"{url}{caminho}",
        method=metodo,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={
            "apikey": chave,
            "Authorization": f"Bearer {chave}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(pedido) as resposta:
            texto = resposta.read().decode()
            return json.loads(texto) if texto else None
    except urllib.error.HTTPError as erro:
        detalhe = erro.read().decode()[:300]
        raise SystemExit(f"[ABORTADO] {metodo} {caminho} devolveu {erro.code}: {detalhe}")


def _conta_do_auth(url: str, chave: str, email: str) -> dict | None:
    """Procura a conta no Auth, **varrendo as páginas**.

    ⚠️ `listUsers` PAGINA, E O PADRÃO É 50 — a lição de 23/09/2026, que custou dois defeitos
       na suíte de ponta a ponta: quem lê só a primeira página conclui que a conta não existe
       e tenta criá-la, e recebe *"already registered"* como se fosse corrida.
    """
    pagina = 1
    while True:
        dados = _api(url, chave, f"/auth/v1/admin/users?page={pagina}&per_page=200")
        usuarios = (dados or {}).get("users", [])
        for u in usuarios:
            if (u.get("email") or "").lower() == email:
                return u
        if len(usuarios) < 200:
            return None
        pagina += 1


def main(argv: list[str] | None = None) -> int:
    argumentos = list(argv if argv is not None else sys.argv[1:])
    url = _do_cli("API_URL")
    if not url.startswith("http://127.0.0.1") and not url.startswith("http://localhost"):
        print(
            f"[RECUSADO] o `supabase status` aponta para {url}, que nao e o stack local. "
            f"Este script cria conta `admin` com a chave de servico — so roda contra o "
            f"Docker desta maquina."
        )
        return 3

    chave = _chave_de_servico()
    email = _email_de_quem_esta_na_maquina(argumentos)

    # ------------------------------------------------------------------ 1. a credencial
    conta = _conta_do_auth(url, chave, email)
    if conta:
        print(f"1/3  credencial: ja existia  ({email})")
    else:
        conta = _api(
            url,
            chave,
            "/auth/v1/admin/users",
            "POST",
            {"email": email, "password": SENHA_LOCAL, "email_confirm": True},
        )
        print(f"1/3  credencial: CRIADA  ({email})")
    auth_id = conta["id"]

    # ------------------------------------------------------------------ 2. a linha de usuarios
    linhas = _api(url, chave, f"/rest/v1/usuarios?email=eq.{email}&select=id,codigo,perfil,auth_user_id")
    if linhas:
        linha = linhas[0]
        print(f"2/3  cadastro: ja existia  ({linha['codigo']}, perfil {linha['perfil']})")
    else:
        criada = _api(
            url,
            chave,
            "/rest/v1/usuarios",
            "POST",
            {
                "codigo": CODIGO,
                "email": email,
                "nome": NOME,
                "perfil": "admin",
                "escopo_curso": "geral",
            },
        )
        linha = (criada or [{}])[0] if isinstance(criada, list) else {"codigo": CODIGO}
        print(f"2/3  cadastro: CRIADO  ({CODIGO}, perfil admin)")
        linhas = _api(
            url, chave, f"/rest/v1/usuarios?email=eq.{email}&select=id,codigo,perfil,auth_user_id"
        )
        linha = linhas[0]

    # ------------------------------------------------------------------ 3. o vínculo
    if linha.get("auth_user_id") == auth_id:
        print("3/3  vinculo: ja estava ligado")
    else:
        _api(
            url,
            chave,
            f"/rest/v1/usuarios?id=eq.{linha['id']}",
            "PATCH",
            {"auth_user_id": auth_id},
        )
        print("3/3  vinculo: LIGADO")

    print(f"\nPRONTO. Entre em http://localhost:3000/login com {email} / {SENHA_LOCAL}")
    return 0


def _chave_de_servico() -> str:
    """A chave que ignora a RLS, pelo nome que ESTA versão da CLI usa.

    ⚠️ **O NOME MUDOU, E O SCRIPT ACEITA OS DOIS.** As versões novas do CLI chamam
       `SECRET_KEY` o que as antigas chamavam `SERVICE_ROLE_KEY`. Fixar um só faria o script
       quebrar numa atualização de ferramenta, com uma mensagem sobre "chave não encontrada"
       que não sugere versão a ninguém.
    """
    saida = subprocess.run(
        ["supabase", "status", "-o", "env"],
        capture_output=True,
        text=True,
        shell=True,
        check=False,
    ).stdout
    for nome in ("SECRET_KEY", "SERVICE_ROLE_KEY"):
        for linha in saida.splitlines():
            if linha.startswith(f"{nome}="):
                return linha.split("=", 1)[1].strip().strip('"')
    raise SystemExit(
        "[ABORTADO] nao achei SECRET_KEY nem SERVICE_ROLE_KEY no `supabase status`. "
        "O stack local esta de pe?"
    )


if __name__ == "__main__":
    raise SystemExit(main())
