"""Carrega o PDF de cada currículo 1 no balde `curriculos` — o item 7 da conferência do passo 0 do Bloco 18 (spec 033).

    python -X utf8 -m scripts.manutencao.carregar_pdfs_dos_curriculos --destino local|remoto [--gravar] [--pasta P]

> "7. AUTORIZAÇÃO NOMINAL para carregar no Storage do remoto (balde 'curriculos') os 24 PDFs que você leu em
> SIS11/Curriculos, cada um no currículo 1 do seu curso, pelo mesmo caminho que a tela de Editar curso → Currículo usa
> (mesmo nome de objeto e mesmo registro no banco). Sem apagar nem sobrescrever nada que exista. Conferir depois que o
> 'Baixar PDF' de 3 cursos abre o arquivo certo; listar os 24 no relatório." — Bernardo Villas Boas, 03/11/2026

O MESMO CAMINHO DA TELA (`lib/acoes/curriculo.ts`, `registrarPdfDoCurriculo`, e `lib/dominio/curriculo-em-pdf.ts`):
o objeto em `<curso_id>/<curriculo_id>/<instante em ms>.pdf`, `application/pdf`, sem substituir (`x-upsert: false`);
depois, `curriculos.pdf_caminho` e `pdf_carregado_em` — só onde os dois estão VAZIOS (completar o vazio é livre na RC-6,
sem justificativa nem trilha).

⚠️ SEM APAGAR NEM SOBRESCREVER: o currículo que já tem PDF (ou com objeto já na pasta dele) é PULADO e listado; o upload
   não substitui; o `update` só toca a linha com as duas colunas nulas, e confere quantas linhas mudaram.
⚠️ O par arquivo → curso é o revisado na carga das UEs (`scripts/etl/dados/pareamento_ue.csv`, mais os dois C-Espc —
   o mesmo `curso_por_arquivo` da extração das avaliações), 24 de 24, medido no passo 0.
⚠️ A CHAVE ADMINISTRATIVA só por script de manutenção versionado rodado à mão (gotcha 2): a do remoto vem do
   `.env.local`; a do local, do `supabase status`. Nunca é impressa.
⚠️ Sem `--gravar`, só LÊ e mostra o plano.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from scripts.carga_dsa import banco
from scripts.carga_dsa.banco import lit

RAIZ = Path(__file__).resolve().parents[2]
PAREAMENTO = RAIZ / "scripts" / "etl" / "dados" / "pareamento_ue.csv"
PASTA_PADRAO = Path(r"C:\Users\VILLAS BOAS\OneDrive\Documentos\SIS11\Curriculos")
BALDE = "curriculos"
# Os dois C-Espc são currículos por competência, sem UE, e por isso não estão no pareamento (o mesmo par nominal de
# `scripts/etl/extrair_avaliacoes_curriculo.py`).
SEM_UE = {
    "of10-82-2024-densm-ana-c-espc-fr.pdf": "C-Espc-FR",
    "of10-82-2024-densm-anb-c-espc-hn.pdf": "C-Espc-HN",
}


def curso_por_arquivo() -> dict[str, str]:
    mapa: dict[str, str] = dict(SEM_UE)
    with PAREAMENTO.open(encoding="utf-8") as f:
        for linha in csv.DictReader(f, delimiter=";"):
            if linha["arquivo"] and linha["curso_codigo"]:
                mapa.setdefault(linha["arquivo"], linha["curso_codigo"])
    return mapa


def credencial(destino: str) -> tuple[str, str]:
    """A URL da API e a chave administrativa do destino — sem imprimir a chave."""
    if destino == "remoto":
        valores: dict[str, str] = {}
        for linha in (RAIZ / ".env.local").read_text(encoding="utf-8").splitlines():
            if "=" in linha and not linha.lstrip().startswith("#"):
                k, v = linha.split("=", 1)
                valores[k.strip()] = v.strip().strip('"')
        return valores["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"), valores["SUPABASE_SERVICE_ROLE_KEY"]
    saida = subprocess.run(
        "supabase status -o env", shell=True, capture_output=True, text=True, encoding="utf-8", check=True
    ).stdout
    env = {}
    for linha in saida.splitlines():
        if "=" in linha:
            k, v = linha.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env["API_URL"].rstrip("/"), env.get("SERVICE_ROLE_KEY") or env["SECRET_KEY"]


def cabecalhos(chave: str) -> dict[str, str]:
    # A chave nova (`sb_secret_`) vai só no `apikey`; a legada (JWT) vai também como Bearer.
    if chave.startswith("sb_"):
        return {"apikey": chave}
    return {"apikey": chave, "Authorization": f"Bearer {chave}"}


def pedir(url: str, chave: str, metodo: str, corpo: bytes | None = None, tipo: str = "application/json",
          extra: dict[str, str] | None = None) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=corpo, method=metodo,
                                 headers={**cabecalhos(chave), "Content-Type": tipo, **(extra or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def objetos_na_pasta(api: str, chave: str, pasta: str) -> list[str]:
    status, corpo = pedir(f"{api}/storage/v1/object/list/{BALDE}", chave, "POST",
                          json.dumps({"prefix": pasta, "limit": 100}).encode())
    if status != 200:
        raise RuntimeError(f"listar {pasta}: HTTP {status} {corpo[:200]!r}")
    return [o["name"] for o in json.loads(corpo) if o.get("id")]


def conferir(destino: str, pasta: Path, siglas: list[str]) -> int:
    """O «Baixar PDF» da tela, sem a tela: o link assinado de 60 s do objeto que `curriculos.pdf_caminho` aponta."""
    arquivo_da_sigla = {s: a for a, s in curso_por_arquivo().items()}
    api, chave = credencial(destino)
    linhas = banco.consultar(destino, f"""
select c.codigo, cu.pdf_caminho from public.cursos c join public.curriculos cu on cu.curso_id = c.id and cu.versao = 1
 where c.codigo in ({", ".join(lit(s) for s in siglas)}) order by c.codigo;""")
    falhou = 0
    for l in linhas:
        local = (pasta / arquivo_da_sigla[l["codigo"]]).read_bytes()
        if not l["pdf_caminho"]:
            print(f"  {l['codigo']}: SEM pdf_caminho")
            falhou += 1
            continue
        status, corpo = pedir(f"{api}/storage/v1/object/sign/{BALDE}/{l['pdf_caminho']}", chave, "POST",
                              json.dumps({"expiresIn": 60}).encode())
        if status != 200:
            print(f"  {l['codigo']}: link assinado recusado, HTTP {status}")
            falhou += 1
            continue
        assinado = json.loads(corpo).get("signedURL") or json.loads(corpo).get("signedUrl")
        with urllib.request.urlopen(f"{api}/storage/v1{assinado}", timeout=120) as r:
            baixado = r.read()
            tipo = r.headers.get("Content-Type")
        igual = hashlib.md5(baixado).hexdigest() == hashlib.md5(local).hexdigest()
        print(f"  {l['codigo']}: {len(baixado)} B, {tipo}, md5 {'IGUAL' if igual else 'DIFERENTE'} ao de "
              f"{arquivo_da_sigla[l['codigo']]}")
        falhou += 0 if igual else 1
    return 1 if falhou else 0


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--destino", required=True, choices=sorted(banco.DESTINOS))
    ap.add_argument("--pasta", default=str(PASTA_PADRAO))
    ap.add_argument("--gravar", action="store_true", help="sem ele, só lê e mostra o plano")
    ap.add_argument("--conferir", nargs="*", metavar="SIGLA",
                    help="só leitura: baixa o PDF de cada curso por link assinado (como o Baixar da tela) e compara o "
                         "md5 com o arquivo da pasta")
    a = ap.parse_args()
    if a.conferir is not None:
        return conferir(a.destino, Path(a.pasta), a.conferir)

    pasta = Path(a.pasta)
    mapa = curso_por_arquivo()
    pdfs = sorted(p for p in pasta.glob("*.pdf"))
    sem_par = [p.name for p in pdfs if p.name not in mapa]
    if sem_par:
        print(f"PARADO: {len(sem_par)} PDF(s) sem curso no pareamento: {sem_par}")
        return 2

    siglas = sorted({mapa[p.name] for p in pdfs})
    linhas = banco.consultar(a.destino, f"""
select c.codigo, c.id::text as curso_id, c.status::text as curso_status, cu.id::text as curriculo_id,
       cu.arquivado_em is not null as arquivado, cu.pdf_caminho, cu.pdf_carregado_em::text as carregado_em,
       (select count(*) from public.curriculos o where o.curso_id = c.id) as curriculos
  from public.cursos c join public.curriculos cu on cu.curso_id = c.id and cu.versao = 1
 where c.codigo in ({", ".join(lit(s) for s in siglas)})
 order by c.codigo;""")
    por_sigla = {l["codigo"]: l for l in linhas}
    api, chave = credencial(a.destino)

    plano = []
    for p in pdfs:
        sigla = mapa[p.name]
        l = por_sigla.get(sigla)
        conteudo = p.read_bytes()
        item = {"arquivo": p.name, "sigla": sigla, "bytes": len(conteudo), "md5": hashlib.md5(conteudo).hexdigest()}
        if l is None:
            item["pulado"] = "o curso não tem o currículo 1"
        elif l["curso_status"] != "ativo":
            item["pulado"] = "curso inativo"
        elif l["arquivado"]:
            item["pulado"] = "currículo 1 arquivado"
        elif l["pdf_caminho"] or l["carregado_em"]:
            item["pulado"] = f"já tem PDF ({l['pdf_caminho']})"
        elif not conteudo.startswith(b"%PDF"):
            item["pulado"] = "o arquivo não começa com %PDF"
        else:
            pasta_do = f"{l['curso_id']}/{l['curriculo_id']}"
            existentes = objetos_na_pasta(api, chave, pasta_do)
            if existentes:
                item["pulado"] = f"a pasta do currículo já tem {len(existentes)} objeto(s)"
            else:
                item["curriculo_id"] = l["curriculo_id"]
                item["caminho"] = f"{pasta_do}/{int(time.time() * 1000)}.pdf"
                if int(l["curriculos"]) != 1:
                    item["aviso"] = f"o curso tem {l['curriculos']} currículos: o Baixar de Sobre o Curso usa o vigente"
        item["conteudo"] = conteudo
        plano.append(item)
        time.sleep(0.002)  # instantes distintos em ms, como envios separados

    print(f"[{a.destino}] {len(pdfs)} PDFs em {pasta}")
    for i in plano:
        destino = i.get("caminho") or f"PULADO: {i['pulado']}"
        print(f"  {i['sigla']:<20} {i['arquivo']:<70} {i['bytes']:>9} B  md5 {i['md5']}  → {destino}"
              + (f"  ⚠️ {i['aviso']}" if i.get("aviso") else ""))
    a_carregar = [i for i in plano if i.get("caminho")]
    if not a.gravar:
        print(f"  (só leitura) {len(a_carregar)} a carregar. Use --gravar para gravar.")
        return 0

    # 1. os objetos, sem substituir; cada um conferido na listagem da pasta
    for i in a_carregar:
        status, corpo = pedir(f"{api}/storage/v1/object/{BALDE}/{i['caminho']}", chave, "POST", i["conteudo"],
                              tipo="application/pdf", extra={"x-upsert": "false"})
        if status != 200:
            print(f"PARADO no upload de {i['arquivo']}: HTTP {status} {corpo[:300]!r}. Os já enviados ficam (regra 4).")
            return 3
        pasta_do, nome = i["caminho"].rsplit("/", 1)
        if nome not in objetos_na_pasta(api, chave, pasta_do):
            print(f"PARADO: {i['caminho']} não aparece na listagem depois do upload.")
            return 3

    # 2. o registro no banco, num bloco só, e só onde as duas colunas estão vazias
    valores = ", ".join(f"({lit(i['curriculo_id'])}::uuid, {lit(i['caminho'])})" for i in a_carregar)
    banco.consultar(a.destino, f"""
do $pdfs$
declare v_n int;
begin
  update public.curriculos c
     set pdf_caminho = v.caminho, pdf_carregado_em = now()
    from (values {valores}) as v(id, caminho)
   where c.id = v.id and c.pdf_caminho is null and c.pdf_carregado_em is null;
  get diagnostics v_n = row_count;
  if v_n <> {len(a_carregar)} then
    raise exception 'PDFs dos currículos: % linhas atualizadas, esperava {len(a_carregar)}.', v_n;
  end if;
end;
$pdfs$;""")
    print(f"  GRAVADO: {len(a_carregar)} objetos no balde e {len(a_carregar)} currículos apontados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
