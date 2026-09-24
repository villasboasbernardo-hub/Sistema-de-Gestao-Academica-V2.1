"""Traz os DADOS do projeto remoto para o banco LOCAL — e guarda uma cópia datada.

    python -m scripts.manutencao.dado_do_remoto

O QUÊ  : lê o remoto (só leitura), guarda o retrato num arquivo **fora do repositório**,
         recria o banco local pelas migrations e restaura ali os dados do remoto.

PARA QUÊ: desde **24/09/2026** *(decisão de Bernardo Villas Boas)* o **remoto é a fonte da
         verdade dos cadastros** — cursos, turmas, instrutores, e disciplinas quando a fatia
         (b) for mesclada. Quem testa edita e completa esses dados pelo preview. Para
         conferir qualquer coisa no local com dado de verdade, o caminho deixou de ser
         recarregar a planilha: é **trazer o que está no remoto**.

⚠️ **A DIREÇÃO É UMA SÓ, E O SCRIPT SÓ SABE ANDAR NELA.** Estrutura vai do repositório para
   os dois bancos, pelas migrations. **Dado vai do remoto para o local, NUNCA do local para o
   remoto.** Não existe aqui, nem deve existir, a operação inversa: o que o local tem é
   resto de teste, amostra de suíte e experimento — empurrá-lo para o remoto apagaria o
   trabalho de quem está testando.

⚠️ **SÓ NO STACK LOCAL, E A RECUSA É EXPLÍCITA** — o mesmo porteiro de
   `credencial_local.py`. O script confere que o `supabase status` aponta para o Docker desta
   máquina **antes** de qualquer escrita, e recusa qualquer outro endereço. O passo destrutivo
   é o `db reset`: executá-lo achando que se está no local é erro que não se desfaz.

⚠️ **O ARQUIVO GUARDADO TEM DADO PESSOAL.** Ele carrega os 177 instrutores e os cadastros de
   usuário. Por isso a cópia vai para **fora do repositório e fora da pasta sincronizada**:
   `%LOCALAPPDATA%\\ciaara-11\\copias-do-remoto` no Windows, `~/.local/share/ciaara-11/...`
   nos demais — configurável em `CIAARA_COPIAS_DIR`. **Nunca** para dentro do `git`, que é
   público.

⚠️ **O SCHEMA `auth` NÃO VEM.** Credencial de pessoa não é cadastro, e copiá-la para uma base
   de desenvolvimento seria espalhar segredo sem necessidade. Quem precisa entrar no local
   usa `credencial_local.py`, que cria a credencial ali.

⚠️ **NUNCA REDIRECIONE `supabase db dump --dry-run` PARA ARQUIVO.** Medido em 24/09/2026: o
   `--dry-run` imprime no terminal a **senha** do papel de login temporário que a CLI cria.
   Este script não usa `--dry-run`, e é de propósito.

COMO   : o stack local de pé (`pnpm db:start`), a CLI autenticada e o projeto vinculado.
         Ao fim, o script imprime o retrato do que ficou no local.
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# As tabelas cujo dado é da plataforma ou do histórico do próprio ETL, e que não descrevem
# cadastro nenhum. `migracao_log` fica de fora por ser append-only: restaurá-la por cima de
# si mesma no local não acrescenta informação, e o que ela registra é a carga, não o
# cadastro.
FORA_DA_COPIA = ("public.migracao_log",)


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


def _conteiner_do_banco() -> str:
    """O contêiner do Postgres local, descoberto — nunca escrito à mão."""
    saida = subprocess.run(
        ["docker", "ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
        shell=True,
        check=False,
    ).stdout.strip()
    nomes = [n for n in saida.splitlines() if n.strip()]
    if len(nomes) != 1:
        raise SystemExit(
            f"[ABORTADO] esperava exatamente um conteiner `supabase_db_*` no ar, achei "
            f"{len(nomes)}: {nomes or 'nenhum'}."
        )
    return nomes[0]


def _pasta_das_copias() -> Path:
    escolhida = os.environ.get("CIAARA_COPIAS_DIR")
    if escolhida:
        return Path(escolhida)
    if sys.platform == "win32":
        raiz = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    else:
        raiz = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return raiz / "ciaara-11" / "copias-do-remoto"


def _psql(conteiner: str, sql: str) -> str:
    r = subprocess.run(
        ["docker", "exec", "-i", conteiner, "psql", "-U", "postgres", "-d", "postgres", "-Atc", sql],
        capture_output=True,
        text=True,
        shell=True,
        check=False,
    )
    if r.returncode != 0:
        raise SystemExit(f"[ABORTADO] psql falhou: {r.stderr.strip()[:400]}")
    return r.stdout.strip()


def main() -> int:
    # ---------------------------------------------------------------- o porteiro, primeiro
    url = _do_cli("API_URL")
    if not url.startswith("http://127.0.0.1") and not url.startswith("http://localhost"):
        print(
            f"[RECUSADO] o `supabase status` aponta para {url}, que nao e o stack local. "
            f"Este script RECRIA o banco de destino — so roda contra o Docker desta maquina."
        )
        return 3
    conteiner = _conteiner_do_banco()

    pasta = _pasta_das_copias()
    pasta.mkdir(parents=True, exist_ok=True)
    carimbo = datetime.now().strftime("%Y%m%d-%H%M%S")
    copia = pasta / f"remoto-{carimbo}.sql"

    # ---------------------------------------------------------------- 1. ler o remoto
    print(f"1/4  lendo o remoto (so leitura) -> {copia}")
    exclusoes: list[str] = []
    for tabela in FORA_DA_COPIA:
        exclusoes += ["-x", tabela]
    r = subprocess.run(
        ["supabase", "db", "dump", "--linked", "--data-only", "--schema", "public",
         *exclusoes, "-f", str(copia)],
        capture_output=True,
        text=True,
        shell=True,
        check=False,
    )
    if r.returncode != 0 or not copia.exists() or copia.stat().st_size == 0:
        print(f"[ABORTADO] o dump do remoto falhou: {(r.stderr or r.stdout).strip()[:400]}")
        return 4
    print(f"     copia guardada, {copia.stat().st_size // 1024} KB — fora do git, com dado pessoal")

    # ---------------------------------------------------------------- 2. estrutura do repo
    print("2/4  recriando o banco LOCAL pelas migrations (`supabase db reset`)")
    r = subprocess.run(
        ["supabase", "db", "reset"], capture_output=True, text=True, shell=True, check=False
    )
    if r.returncode != 0:
        print(f"[ABORTADO] o reset do banco local falhou: {(r.stderr or r.stdout).strip()[:400]}")
        return 5

    # ---------------------------------------------------------------- 3. esvaziar o semeado
    # ⚠️ O QUE O RESET DEIXA NÃO É VAZIO: as migrations semeiam a matriz de permissões, o
    #    vocabulário de `config_listas` e os parâmetros normativos. O retrato do remoto traz
    #    ESSAS MESMAS LINHAS — e mais o que foi editado na tela. Sem esvaziar, a restauração
    #    colide na chave e para no meio.
    # ⚠️ `session_replication_role = replica` desliga os gatilhos **desta sessão**, no banco
    #    LOCAL: é o mesmo recurso que o dump da própria plataforma usa para restaurar o
    #    retrato como ele é. Não é caminho de produção, e não existe fora daqui.
    print("3/4  esvaziando o que as migrations semearam, para o retrato do remoto entrar inteiro")
    _psql(
        conteiner,
        "set session_replication_role = replica; "
        "do $$ declare t record; begin "
        "  for t in select tablename from pg_tables where schemaname = 'public' loop "
        "    execute format('truncate table public.%I cascade', t.tablename); "
        "  end loop; end $$;",
    )

    # ---------------------------------------------------------------- 4. restaurar
    print("4/4  restaurando os dados do remoto no local")
    with copia.open("rb") as arquivo:
        r = subprocess.run(
            ["docker", "exec", "-i", conteiner, "psql", "-U", "postgres", "-d", "postgres",
             "-v", "ON_ERROR_STOP=1", "-q"],
            stdin=arquivo,
            capture_output=True,
            text=True,
            shell=True,
            check=False,
        )
    if r.returncode != 0:
        print(f"[ABORTADO] a restauracao falhou: {(r.stderr or r.stdout).strip()[:600]}")
        print(f"           a copia do remoto continua em {copia} — nada se perdeu.")
        return 6

    # ---------------------------------------------------------------- o retrato do que ficou
    retrato = _psql(
        conteiner,
        "select 'cursos='||(select count(*) from cursos)"
        "||' turmas='||(select count(*) from turmas)"
        "||' instrutores='||(select count(*) from instrutores)"
        "||' disciplinas='||(select count(*) from disciplinas)"
        "||' usuarios='||(select count(*) from usuarios)"
        "||' salas='||(select count(*) from config_listas where lista='salas')"
        "||' registros_aula='||(select count(*) from registros_aula)",
    )
    print(f"\nPRONTO. O local agora tem o retrato do remoto: {retrato}")
    print(f"        copia datada: {copia}")
    print("        ⚠️ credencial NAO veio (schema `auth`): use `credencial_local.py` para entrar.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
