"""Traz os DADOS do projeto remoto para o banco LOCAL — e guarda uma cópia datada.

    python -m scripts.manutencao.dado_do_remoto
    python -m scripts.manutencao.dado_do_remoto --somente-copia

O QUÊ  : lê o remoto (só leitura), guarda o retrato num arquivo **fora do repositório**,
         recria o banco local pelas migrations e restaura ali os dados do remoto.

         Com `--somente-copia`, ele **para depois de guardar o arquivo**: não toca no banco
         local, não recria nada. É este o modo que a regra de **backup antes de aplicar
         migration no remoto** usa — ver o `CLAUDE.md` e o
         `specs/009-cursos-e-turmas/plano-de-aplicacao-no-remoto.md`.

⚠️ **E É POR ISSO QUE O MODO EXISTE.** Sem ele, quem quisesse só o backup rodaria o script
   inteiro e **perderia o banco local** no `db reset` — um efeito colateral que ninguém pediu,
   no meio de um procedimento que já é delicado.

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

import psycopg

from scripts.etl import carregar

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


def main(argv: list[str] | None = None) -> int:
    somente_copia = "--somente-copia" in (argv if argv is not None else sys.argv[1:])

    # ---------------------------------------------------------------- o porteiro, primeiro
    # ⚠️ ELE VALE NOS DOIS MODOS, e no `--somente-copia` isso é cinto e suspensório de
    #    propósito: ali nada seria recriado, mas um porteiro que só aparece em alguns
    #    caminhos é um porteiro que alguém vai esquecer de pôr no caminho seguinte.
    url = _do_cli("API_URL")
    if not url.startswith("http://127.0.0.1") and not url.startswith("http://localhost"):
        print(
            f"[RECUSADO] o `supabase status` aponta para {url}, que nao e o stack local. "
            f"Este script RECRIA o banco de destino — so roda contra o Docker desta maquina."
        )
        return 3
    conteiner = "" if somente_copia else _conteiner_do_banco()

    pasta = _pasta_das_copias()
    pasta.mkdir(parents=True, exist_ok=True)
    carimbo = datetime.now().strftime("%Y%m%d-%H%M%S")
    copia = pasta / f"remoto-{carimbo}.sql"

    # ---------------------------------------------------------------- 1. ler o remoto
    print(f"1/6  lendo o remoto (so leitura) -> {copia}")
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

    if somente_copia:
        print("\nPRONTO (--somente-copia). O banco local NAO foi tocado.")
        print(f"        cite este arquivo no relatorio da aplicacao: {copia}")
        return 0

    # ---------------------------------------------------------------- 2. estrutura do repo
    print("2/6  recriando o banco LOCAL pelas migrations (`supabase db reset`)")
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
    print("3/6  esvaziando o que as migrations semearam, para o retrato do remoto entrar inteiro")
    _psql(
        conteiner,
        "set session_replication_role = replica; "
        "do $$ declare t record; begin "
        "  for t in select tablename from pg_tables where schemaname = 'public' loop "
        "    execute format('truncate table public.%I cascade', t.tablename); "
        "  end loop; end $$;",
    )

    # ---------------------------------------------------------------- 4. restaurar
    print("4/6  restaurando os dados do remoto no local")
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

    # ------------------------------------------------------- 5/6. fechar a coerência
    # ⚠️ **A RESTAURAÇÃO DEIXA REFERÊNCIA ÓRFÃ, E ISSO FOI MEDIDO — 1 linha em 24/09/2026.**
    #    `usuarios.auth_user_id` é FK para `auth.users`, e o dump da plataforma restaura com
    #    `session_replication_role = replica`, que desliga **também a verificação de chave
    #    estrangeira**. Como o schema `auth` **não vem de propósito** (credencial não é
    #    cadastro), o `auth_user_id` que veio do remoto aponta para uma conta que não existe
    #    aqui: um estado que o banco jamais aceitaria por escrita normal.
    #
    # ⚠️ **LIMPAR A COLUNA É O CONSERTO CERTO, e não apagar a linha.** O cadastro é o que se
    #    veio buscar; o que não faz sentido no local é o vínculo com uma credencial de outro
    #    ambiente. A pessoa recupera o acesso com `conta_local.py`, que religa.
    orfaos = _psql(
        conteiner,
        "with limpos as ("
        "  update public.usuarios u set auth_user_id = null "
        "   where u.auth_user_id is not null "
        "     and not exists (select 1 from auth.users a where a.id = u.auth_user_id) "
        "  returning 1) select count(*) from limpos",
    )
    if orfaos and orfaos != "0":
        print(f"     {orfaos} vinculo(s) com credencial de OUTRO ambiente foram desfeitos aqui")

    # ------------------------------------------------------- 6/6. avançar as sequências
    # ⚠️ **SEM ISTO, A PRIMEIRA CRIAÇÃO NA TELA FALHA — e com a pior mensagem possível.** Medido em
    #    24/09/2026, na conferência de Bernardo: criar curso no local dava *"Já existe um registro
    #    com este valor"* com dados **inéditos**. A causa é que este script copia só o schema
    #    `public`, e as sequências de código vivem em **`app`**: elas voltam ao início, e o próximo
    #    `REG-000001` colide com o que o retrato trouxe. A carga do ETL não sofre porque avança as
    #    sequências ao fim da promoção.
    #
    # ⚠️ **A FUNÇÃO É A DO ETL, e não uma segunda implementação.** `carregar.avancar_sequencias`
    #    declara, por tabela, como extrair o número do código — `instrutores.codigo` é numérico puro,
    #    os demais são `PREFIXO-NNNNNN`. Uma cópia dessa regra aqui divergiria no dia em que uma
    #    sequência nova nascesse, e o sintoma seria este mesmo erro, meses depois.
    print("6/6  avancando as sequencias de codigo (elas vivem em `app`, que a copia nao traz)")
    with psycopg.connect(carregar.CONEXAO_LOCAL) as con:
        avancadas = carregar.avancar_sequencias(con)
        con.commit()
    for sequencia, valor in sorted(avancadas.items()):
        print(f"     {sequencia} -> {valor if valor else '(tabela vazia, fica onde esta)'}")

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
    # ⚠️ E A CONTA LOCAL VOLTA AQUI TAMBÉM. O retrato traz os cadastros e **nenhuma
    #    credencial**; sem este passo, quem acabou de trazer o dado não consegue abrir a tela
    #    para olhá-lo — que é o motivo de ter trazido.
    print()
    try:
        from scripts.manutencao import conta_local

        conta_local.main([])
    except SystemExit as erro:
        print(f"  (conta local nao criada: {erro})")

    print(f"\nPRONTO. O local agora tem o retrato do remoto: {retrato}")
    print(f"        copia datada: {copia}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
