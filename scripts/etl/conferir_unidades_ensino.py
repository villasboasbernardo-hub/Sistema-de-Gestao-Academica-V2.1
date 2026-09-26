"""T021 — a conferencia CURRICULO x BANCO das Unidades de Ensino, reexecutavel.

    python -m scripts.etl.conferir_unidades_ensino [--conexao <url>]

O QUE  : compara, curso por curso, o que os curriculos declaram com o que esta carregado no
         banco; lista o que ficou fora e POR QUE; e lista as divergencias de CH como **aviso**.

PARA QUE: a carga e de dado, e dado nao se confere por "o script saiu 0". Esta conferencia
         existe para responder, a qualquer momento e contra qualquer banco, a unica pergunta
         que importa: **o que esta lá corresponde ao curriculo, e o que nao esta tem motivo
         escrito?**

⚠️ **O CODIGO DE SAIDA E O VEREDITO, e ele distingue tres coisas**:
     0 — tudo conferido: nenhuma diferenca SEM EXPLICACAO.
     1 — ha diferenca sem explicacao. O relatorio nomeia qual.
     2 — nao foi possivel conferir (banco inalcancavel, entrada ausente). **Nao e aprovacao**.

⚠️ **DIVERGENCIA DE CH E AVISO, NUNCA REPROVACAO** *(P-1, decisao de Bernardo Villas Boas,
   25/09/2026)*. A CH da disciplina no banco divergir da soma das UEs do curriculo e
   divergencia de **cadastro**: quem corrige e Bernardo, na tela do PR 3, com rastro. Nenhum
   script corrige CH — nem este, nem a carga. O que esta conferencia faz e **nao deixar a
   divergencia passar calada**.

⚠️ **SO LEITURA.** Ela nao escreve nada, em banco nenhum. Pode rodar contra o remoto.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DADOS = RAIZ / "scripts" / "etl" / "dados"
CONEXAO_LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# As quatro divergencias de CH confirmadas com pagina na conferencia dos curriculos. Elas sao
# ESPERADAS: aparecem como aviso e nao afetam o veredito. Qualquer OUTRA e diferenca sem
# explicacao, e ai o veredito muda.
DIVERGENCIAS_DECLARADAS: dict[str, str] = {
    "44 - C-Ap-FR - III":
        "banco 76 x curriculo 75 (conferencia §4.3, p. 6 e 12) — 'o 76 nao tem respaldo'",
    "86 - C-Exp-MetocOf - I":
        "banco 48 x curriculo 30 (§4.3, p. 4 e 5) — provavelmente copiada do SP (P-2)",
    "90 - C-Exp-MetocOf - V":
        "banco 40 x curriculo 50 (§4.3, p. 4 e 15) — provavelmente copiada do SP (P-2)",
    "150 - EST-QF-APOC - I":
        "79 x 80 (§4.1, p. 4) — divergencia INTERNA do PDF: 'TEMPO RESERVA 1 HORA'. O PDF nao "
        "diz de qual UE sai a hora, e por isso ela nao e redistribuida (P-4)",
}


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--conexao", default=CONEXAO_LOCAL,
                   help="Destino da LEITURA. O padrao e o Docker desta maquina.")
    a = p.parse_args(argv)

    # ---------------------------------------------------------------- as tres entradas
    try:
        catalogo = json.loads((DADOS / "unidades_ensino.json").read_text(encoding="utf-8"))
        with (DADOS / "pareamento_ue.csv").open(encoding="utf-8") as fh:
            pareamento = list(csv.DictReader(fh, delimiter=";"))
    except OSError as erro:
        print(f"[NAO CONFERIDA] entrada ausente: {erro}")
        return 2

    try:
        import psycopg

        with psycopg.connect(a.conexao) as con:
            no_banco = con.execute("""
                select c.codigo, d.codigo, d.nome_disciplina, d.carga_horaria_tempos,
                       count(u.id), coalesce(sum(u.ch_prevista_tempos), 0),
                       bool_or(d.sem_unidades_ensino), max(c.curriculo_modelo),
                       max(d.status::text)
                  from public.cursos c
                  join public.disciplinas d on d.curso_id = c.id
                  left join public.unidades_ensino u
                         on u.disciplina_id = d.id and u.status = 'ativo'
                 -- ⚠️ SEM `where d.status = 'ativo'`, e a primeira versao TINHA esse filtro: ele
                 --    fazia as 3 UEs de `96 - C-Esp-ALH - ALH-II` (*PUBLICACOES E NORMAS*,
                 --    disciplina INATIVA) desaparecerem da conta, e a conferencia acusava
                 --    "21 declaradas x 18 carregadas" sobre uma carga que estava completa.
                 --    Alarme falso sobre dado certo e pior que silencio: manda procurar defeito
                 --    onde nao ha. O sujeito da conta e a UE, nao o status da disciplina — e
                 --    UE sob disciplina inativa tem verificacao PROPRIA, mais abaixo.
                 group by c.codigo, d.codigo, d.nome_disciplina, d.carga_horaria_tempos
                 order by 1, 2
            """).fetchall()
    except Exception as erro:  # noqa: BLE001 — sem banco nao ha conferencia, e isso e saida 2
        print(f"[NAO CONFERIDA] nao foi possivel ler o banco: {str(erro).splitlines()[0]}")
        return 2

    # ---------------------------------------------------------------- o que cada lado diz
    # Curriculo: UEs por curso, pelo pareamento (que e quem sabe o destino de cada uma).
    ue_declaradas: dict[str, int] = defaultdict(int)
    ue_por_destino: dict[str, int] = defaultdict(int)
    for l in pareamento:
        if l["numero_ue"].strip():
            ue_declaradas[l["curso_codigo"]] += 1
            ue_por_destino[l["destino_disciplina_codigo"]] += 1

    # Banco: UEs por curso e por disciplina.
    ue_carregadas: dict[str, int] = defaultdict(int)
    carregadas_por_disciplina: dict[str, int] = {}
    ch_banco: dict[str, int] = {}
    ch_das_ue: dict[str, int] = {}
    nome_da_disciplina: dict[str, str] = {}
    curso_da_disciplina: dict[str, str] = {}
    modelo_do_curso: dict[str, str] = {}
    marcadas_sem_ue: set[str] = set()
    disciplina_inativa: dict[str, str] = {}
    for curso, disc, nome, ch, n_ue, soma, sem_ue, modelo, status in no_banco:
        if status != "ativo":
            disciplina_inativa[disc] = status
        ue_carregadas[curso] += n_ue
        carregadas_por_disciplina[disc] = n_ue
        ch_banco[disc] = ch
        ch_das_ue[disc] = soma
        nome_da_disciplina[disc] = nome
        curso_da_disciplina[disc] = curso
        modelo_do_curso[curso] = modelo
        if sem_ue:
            marcadas_sem_ue.add(disc)

    # A coluna do PDF: quantas UEs o EXTRATOR leu naquele curriculo. Ela existe para que a
    # tabela seja curriculo x banco de verdade, e nao pareamento x banco — o pareamento e uma
    # decisao humana sobre o que o extrator leu, e as duas contas podem divergir de proposito.
    # ⚠️ O `EST-QF-APOC` e onde elas divergem: o extrator le **0** (PDF sem camada de texto) e o
    #    pareamento declara **5**, transcritas da imagem por dois leitores (P-4, conferencia
    #    §4.1). E a unica divergencia esperada entre as duas colunas.
    arquivo_do_curso: dict[str, str] = {
        l["curso_codigo"]: l["arquivo"] for l in pareamento if l["arquivo"].strip()
    }
    lidas_do_pdf: dict[str, int] = defaultdict(int)
    for c in catalogo:
        for d in c["disciplinas"]:
            lidas_do_pdf[c["arquivo"]] += len(d["unidades"])
    ue_no_pdf: dict[str, int] = {
        curso: lidas_do_pdf.get(arq, 0) for curso, arq in arquivo_do_curso.items()
    }

    sem_explicacao: list[str] = []
    avisos: list[str] = []

    # ---------------------------------------------------------------- 1. a tabela por curso
    print("=" * 96)
    print("UNIDADES DE ENSINO — curriculo x banco, por curso")
    print("=" * 96)
    print(f"{'Curso':<24} {'no PDF':>7} {'declaradas':>10} {'carregadas':>10} {'dif':>5}  modelo")
    print("-" * 96)
    cursos = sorted(set(ue_declaradas) | set(ue_carregadas) | set(modelo_do_curso))
    for curso in cursos:
        decl, carr = ue_declaradas.get(curso, 0), ue_carregadas.get(curso, 0)
        pdf = ue_no_pdf.get(curso, 0)
        dif = carr - decl
        modelo = modelo_do_curso.get(curso, "?")
        marca = " " if dif == 0 else "X"
        print(f"{marca} {curso:<22} {pdf:>7} {decl:>10} {carr:>10} {dif:>+5}  {modelo}")
        if dif != 0:
            sem_explicacao.append(
                f"{curso}: {decl} UEs declaradas no pareamento e {carr} carregadas (diferenca {dif:+})"
            )
        if pdf != decl:
            avisos.append(
                f"{curso}: o extrator leu {pdf} UEs do PDF e o pareamento declara {decl}"
                + (" — EST-QF-APOC, transcrito de imagem (P-4)" if curso == "EST-QF-APOC" else
                   " — divergencia NAO esperada entre PDF e pareamento")
            )
    print("-" * 96)
    print(f"{'TOTAL':<24} {sum(ue_no_pdf.values()):>7} {sum(ue_declaradas.values()):>10} "
          f"{sum(ue_carregadas.values()):>10}")

    # ---------------------------------------------------------------- 2. UE sem destino
    orfas = [l for l in pareamento
             if l["numero_ue"].strip() and not l["destino_disciplina_codigo"].strip()]
    if orfas:
        sem_explicacao.extend(
            f"UE sem destino no pareamento: {l['curso_codigo']} · {l['curriculo_ordinal']} · "
            f"UE {l['numero_ue']}" for l in orfas
        )

    # E o inverso: destino declarado que nao recebeu o que devia.
    for destino, esperadas in sorted(ue_por_destino.items()):
        obtidas = carregadas_por_disciplina.get(destino)
        if obtidas is None:
            sem_explicacao.append(f"destino {destino!r} nao existe no banco")
        elif obtidas != esperadas:
            sem_explicacao.append(
                f"{destino}: {esperadas} UEs declaradas e {obtidas} carregadas"
            )

    # ---------------------------------------------------------------- 3. o que ficou fora
    print()
    print("=" * 96)
    print("O QUE FICOU FORA DA CARGA, E POR QUE")
    print("=" * 96)
    excluidas = [l for l in pareamento if l["motivo_da_exclusao"].strip()]
    por_motivo: dict[str, list[str]] = defaultdict(list)
    for l in excluidas:
        chave = l["motivo_da_exclusao"].strip()[:120]
        por_motivo[chave].append(f"{l['curso_codigo']} · {l['curriculo_disciplina'][:46]}")
    for motivo, quais in sorted(por_motivo.items(), key=lambda x: -len(x[1])):
        print(f"\n  {len(quais)} disciplina(s) — {motivo}")
        for q in quais[:8]:
            print(f"      {q}")
        if len(quais) > 8:
            print(f"      (+{len(quais) - 8} outras)")

    # A marca no banco tem de casar com o que o pareamento declarou fora, curso por curso.
    declaradas_sem_ue = {
        l["destino_disciplina_codigo"] for l in excluidas
        if l["observacao"].strip() == "sem_unidades_ensino = true"
    }
    faltando_marca = declaradas_sem_ue - marcadas_sem_ue
    marca_a_mais = marcadas_sem_ue - declaradas_sem_ue
    if faltando_marca:
        sem_explicacao.append(
            "declarada sem UE e NAO marcada no banco: " + ", ".join(sorted(faltando_marca)))
    if marca_a_mais:
        sem_explicacao.append(
            "marcada sem UE no banco e NAO declarada: " + ", ".join(sorted(marca_a_mais)))

    # Disciplina sem UE, sem marca e sem motivo: e exatamente o caso que a D-B3 quer evitar —
    # a tela nao sabe se falta dado ou se a disciplina nao tem UE por natureza.
    muda = [
        disc for disc, n in carregadas_por_disciplina.items()
        if n == 0 and disc not in marcadas_sem_ue
        and modelo_do_curso.get(curso_da_disciplina[disc]) != "competencias"
    ]
    if muda:
        avisos.append(
            f"{len(muda)} disciplina(s) sem UE, sem marca `sem_unidades_ensino` e fora de curso "
            f"por competencias — a tela nao consegue distinguir 'nao tem' de 'falta carregar': "
            + ", ".join(sorted(muda)[:6]) + ("..." if len(muda) > 6 else "")
        )

    # ⚠️ UE sob disciplina INATIVA — aviso nomeado, nao bloqueio.
    #    A carga e fiel ao curriculo: se o curriculo declara a disciplina e as UEs dela, elas
    #    entram. Que a linha do BANCO esteja inativa e questao de CADASTRO — aqui e o caso
    #    conhecido da duplicata `ALH-II` (achado A-2 do specify): duas linhas com o mesmo
    #    `cod_disciplina` no `C-Esp-ALH`, uma delas desativada. As 3 UEs de *PUBLICACOES E
    #    NORMAS* ficam guardadas e reaparecem no dia em que a linha for reativada; apagar ou
    #    deixar de carregar seria decidir por Bernardo qual das duas linhas vale.
    sob_inativa = sorted(
        d for d in disciplina_inativa if carregadas_por_disciplina.get(d, 0) > 0
    )
    for d in sob_inativa:
        avisos.append(
            f"{carregadas_por_disciplina[d]} UE(s) carregadas sob disciplina INATIVA "
            f"{d} ({nome_da_disciplina[d][:40]}) — a carga e fiel ao curriculo; qual das duas "
            f"linhas de `ALH-II` vale e cadastro, e decisao de Bernardo (achado A-2, PEND-5b-2)"
        )

    # ---------------------------------------------------------------- 4. CH — sempre AVISO
    print()
    print("=" * 96)
    print("DIVERGENCIAS DE CH — aviso, nunca reprovacao (P-1). Quem corrige e a TELA.")
    print("=" * 96)
    divergem = sorted(
        (disc for disc, soma in ch_das_ue.items()
         if carregadas_por_disciplina.get(disc, 0) > 0 and soma != ch_banco[disc]),
        key=lambda d: (curso_da_disciplina[d], d),
    )
    if not divergem:
        print("  nenhuma — a soma das UEs fecha com a CH em toda disciplina carregada")
    for disc in divergem:
        declarada = DIVERGENCIAS_DECLARADAS.get(disc)
        rotulo = "declarada" if declarada else "NOVA"
        print(f"  [{rotulo}] {curso_da_disciplina[disc]} · {disc}")
        print(f"            banco {ch_banco[disc]} x soma das UEs {ch_das_ue[disc]} "
              f"({carregadas_por_disciplina[disc]} UEs) — {nome_da_disciplina[disc][:44]}")
        if declarada:
            print(f"            {declarada}")
            avisos.append(f"CH divergente declarada: {disc}")
        else:
            # ⚠️ Divergencia de CH NOVA nao reprova por si (P-1), mas ela nao e "so um aviso":
            #    ou alguem mexeu na CH da disciplina, ou uma UE entrou com a CH errada. Vai
            #    para o veredito como diferenca SEM EXPLICACAO, porque nao ha decisao que a
            #    explique — e e assim que ela chega a Bernardo em vez de morrer na tela.
            sem_explicacao.append(
                f"CH divergente NAO declarada: {disc} — banco {ch_banco[disc]} x "
                f"soma das UEs {ch_das_ue[disc]}"
            )
    for d, razao in DIVERGENCIAS_DECLARADAS.items():
        if d not in divergem and d in ch_banco:
            avisos.append(
                f"a divergencia declarada {d} DEIXOU de divergir — se foi correcao de cadastro, "
                f"tire-a da lista de `conferir_unidades_ensino.py` e de `112`, com a razao"
            )

    # ---------------------------------------------------------------- o veredito
    print()
    print("=" * 96)
    for aviso in avisos:
        print(f"  (aviso) {aviso}")
    if sem_explicacao:
        print(f"\nBLOQUEADA — {len(sem_explicacao)} diferenca(s) SEM EXPLICACAO:")
        for s in sem_explicacao:
            print(f"    {s}")
        return 1
    print(f"\nCONFERIDA — 0 diferencas sem explicacao, {len(avisos)} aviso(s).")
    print(f"  {sum(ue_carregadas.values())} UEs carregadas · "
          f"{sum(1 for n in carregadas_por_disciplina.values() if n > 0)} disciplinas · "
          f"{len(excluidas)} exclusoes declaradas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
