"""Etapa 2-B — recupera a Unidade de Ensino cruzando v1.0 × v2.0.

O QUÊ  : para cada registro de aula da v2.0, decide **qual Unidade de Ensino** ele
         cobria, cruzando com os lançamentos das planilhas de planejamento da v1.0.

PARA QUÊ: a decisão UE-1 pôs `registros_aula` no grão de UE, e a v2.0 nunca guardou
         essa informação. Este módulo é o único lugar do épico que **atribui
         significado a dado histórico** — e por isso é o mais perigoso.

         Uma linha casada errado **não produz erro**: produz um registro apontando
         para a UE errada, que vai alimentar CHD, CHT, tetos normativos e a LIQ. E
         ninguém vai questionar, porque o campo estará preenchido.
         **Erro que preenche é pior que erro que falha.**

COMO   : chave em três passos, e cinco vereditos com domínio fechado. O que não se
         encaixa **não casa** — nunca se escolhe "a mais provável".

A CHAVE, medida na origem (não suposta):
  · `Cad_Cursos.ID_Curso` **já é a sigla** — `C-Ap-FR`, `CAHO`. Mesmo espaço de nomes
    do `curso_sigla` das planilhas da v1.0. Passo 1 é igualdade, não mapeamento.
  · `Turmas_Ativas` traz `Data_Inicio` e `Data_Termino` — a janela do passo 2.
  · `Registro.ID_Grade` é `"<n> - <ID_Curso> - <COD>"`, e o `COD` é o mesmo romano do
    `PREENCHIMENTO` da v1.0. Passo 3 fecha sem tradução.

Contrato: `specs/003-etl-sheets-postgresql/contracts/cruzamento-ue.md`
"""

from __future__ import annotations

import csv
import glob
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from ._comum import data_civil

BRUTO = Path(__file__).parent / "dados" / "bruto"
DESTINO = Path(__file__).parent / "dados" / "normalizado"

# Domínio FECHADO. O banco também o impõe, em `staging.ue_cruzamento`
# (constraint ue_cruzamento_veredito_fechado) — aqui e lá, de propósito.
CASADO = "casado"
AMBIGUO = "ambiguo"
SEM_FONTE = "sem_fonte"
FORA_DE_COBERTURA = "fora_de_cobertura"
NAO_APLICAVEL = "nao_aplicavel"

# Códigos que NÃO são disciplina — 270 linhas só no C-AP-FR (FR-025.10).
# Não têm UE **por natureza**: são atividade não letiva ou evento de calendário.
# Marcá-los `sem_fonte` seria mentir: `sem_fonte` afirma "procurei e não achei", e
# aqui não havia o que procurar. A distinção evita 270 falsos negativos por arquivo.
CODIGOS_NAO_DISCIPLINA = frozenset({"AD", "FE", "PL", "TR", "TE", "LP"})


@dataclass
class Turma:
    id_turma: str
    id_curso: str
    inicio: date | None
    termino: date | None

    def cobre(self, quando: date) -> bool:
        if self.inicio is None or self.termino is None:
            return False
        return self.inicio <= quando <= self.termino


@dataclass
class Resultado:
    registro: str
    veredito: str
    numero_ue: int | None = None
    sufixo: str = ""
    fonte_arquivo: str = ""
    fonte_aba: str = ""
    fonte_linha: int | None = None
    motivo: str = ""


@dataclass
class Resumo:
    por_veredito: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    cursos_cobertos: set[str] = field(default_factory=set)
    cursos_sem_fonte: set[str] = field(default_factory=set)
    turmas_sobrepostas: list[str] = field(default_factory=list)
    pontes: list[dict] = field(default_factory=list)


def _cod_da_grade(id_grade: str) -> str:
    """`"39 - C-Ap-HN - XVI"` → `"XVI"`. Cadeia vazia quando o formato não bate."""
    partes = [p.strip() for p in id_grade.split(" - ")]
    return partes[-1] if len(partes) >= 3 else ""


# =================================================================================
# PASSO 4 — a ponte romano ↔ mnemônico (achado de 08/09/2026)
#
# O PROBLEMA, medido: os cursos de APERFEIÇOAMENTO usam romano dos dois lados e casam
# direto. Os de ESPECIALIZAÇÃO não: a v1.0 grava `I`, `II`, `III`, e a v2.0 grava
# `ADMANFR-014`, `AUXNAVFR-008`, `HN-1104-0506`. Espaços de nome diferentes.
#
# Isso concentrava **607 dos 717 `sem_fonte`** em dois cursos — C-Espc-FR e C-Espc-HN.
# Não faltava aula na planilha: a chave nunca teve chance de casar.
#
# A PONTE: os dois lados trazem o NOME da disciplina — `BD DISCIPLINAS.disciplina` na
# v1.0, `Cad_Disciplinas.Nome_Disciplina` na v2.0. Mas os nomes são ABREVIADOS de
# formas diferentes: "ADM DE AUXÍLIOS À NAVEGAÇÃO" contra "ADMINISTRAÇÃO DE AUXÍLIOS
# À NAVEGA...". Igualdade não serve.
#
# POR QUE ISTO NÃO É "ADIVINHAR", que o épico proíbe: o pareamento só é aceito quando
# é **melhor par mútuo** — A é o melhor de B **e** B é o melhor de A — e supera um
# piso de similaridade. Empate, ou par assimétrico, **não casa**. E toda ponte aceita
# é gravada com os dois nomes, para conferência humana. É o mesmo princípio do
# desempate de UE: na dúvida, não casa.
# =================================================================================

_SEM_PONTUACAO = re.compile(r"[^A-Z0-9 ]+")
PISO_DE_SIMILARIDADE = 0.60


def _normalizar_nome(bruto: str) -> list[str]:
    """Sem acento, maiúsculo, sem pontuação, sem palavra vazia — devolve os tokens."""
    plano = unicodedata.normalize("NFKD", bruto.upper())
    plano = "".join(c for c in plano if not unicodedata.combining(c))
    plano = _SEM_PONTUACAO.sub(" ", plano)
    vazias = {"DE", "DA", "DO", "DAS", "DOS", "E", "A", "O", "EM", "COM", "PARA"}
    return [t for t in plano.split() if t and t not in vazias]


def _similaridade(a: list[str], b: list[str]) -> float:
    """Fração de tokens de `a` com correspondente em `b`, aceitando ABREVIAÇÃO.

    Um token casa com outro quando são iguais **ou** quando um é prefixo do outro com
    ao menos 3 caracteres — é o que reconhece `ADM` ↔ `ADMINISTRACAO` e `NAV` ↔
    `NAVEGACAO` sem precisar de um dicionário de abreviações, que seria justamente o
    tipo de tabela inventada que este épico recusa.
    """
    if not a or not b:
        return 0.0

    def casa(x: str, y: str) -> bool:
        if x == y:
            return True
        menor, maior = (x, y) if len(x) <= len(y) else (y, x)
        return len(menor) >= 3 and maior.startswith(menor)

    acertos = sum(1 for t in a if any(casa(t, u) for u in b))
    return acertos / len(a)


def construir_ponte() -> tuple[dict[tuple[str, str], str], list[dict]]:
    """Devolve `(curso, cod_v1) → cod_v2` e o registro auditável de cada ponte."""
    # lado v1.0: COD romano -> nome
    nomes_v1: dict[tuple[str, str], str] = {}
    for caminho in glob.glob(str(BRUTO / "ue_v1" / "*__disciplinas.csv")):
        with open(caminho, encoding="utf-8") as h:
            for linha in csv.DictReader(h):
                chave = (linha["curso_sigla"], linha["cod"].upper())
                if chave not in nomes_v1 and linha["disciplina"]:
                    nomes_v1[chave] = linha["disciplina"]

    # lado v2.0: mnemônico -> nome
    nomes_v2: dict[tuple[str, str], str] = {}
    with (BRUTO / "v20" / "Cad_Disciplinas.csv").open(encoding="utf-8") as h:
        for linha in csv.DictReader(h):
            chave = (linha["ID_Curso"], linha["Cod_Disciplina"].upper())
            if linha["Nome_Disciplina"]:
                nomes_v2[chave] = linha["Nome_Disciplina"]

    ponte: dict[tuple[str, str], str] = {}
    auditoria: list[dict] = []
    cursos = {c for c, _ in nomes_v1} & {c for c, _ in nomes_v2}

    for curso in sorted(cursos):
        lado_v1 = {cod: _normalizar_nome(n) for (c, cod), n in nomes_v1.items() if c == curso}
        lado_v2 = {cod: _normalizar_nome(n) for (c, cod), n in nomes_v2.items() if c == curso}
        if not lado_v1 or not lado_v2:
            continue

        # Se os dois lados já falam a mesma língua (romano ↔ romano), não há ponte a
        # construir — e construí-la só criaria risco. Cursos de aperfeiçoamento caem aqui.
        if set(lado_v1) & set(lado_v2):
            continue

        for cod1, tokens1 in lado_v1.items():
            notas = {cod2: _similaridade(tokens1, t2) for cod2, t2 in lado_v2.items()}
            melhor2 = max(notas, key=lambda k: notas[k])
            nota = notas[melhor2]
            # empate no melhor => ambíguo, não casa
            if nota < PISO_DE_SIMILARIDADE or list(notas.values()).count(nota) > 1:
                continue
            # exigência de RECIPROCIDADE: melhor2 também precisa eleger cod1
            de_volta = {c1: _similaridade(lado_v2[melhor2], t1) for c1, t1 in lado_v1.items()}
            if max(de_volta, key=lambda k: de_volta[k]) != cod1:
                continue

            ponte[(curso, cod1)] = melhor2
            auditoria.append(
                {
                    "curso": curso, "cod_v1": cod1, "cod_v2": melhor2,
                    "similaridade": f"{nota:.2f}",
                    "nome_v1": nomes_v1[(curso, cod1)],
                    "nome_v2": nomes_v2[(curso, melhor2)],
                }
            )
    return ponte, auditoria


def _ler_turmas() -> tuple[dict[str, Turma], list[str]]:
    """Carrega as turmas e detecta **sobreposição de janela no mesmo curso**.

    POR QUE IMPORTA: quatro cursos rodam duas turmas no mesmo ano (documento 30 §5.2).
    A planilha da v1.0 **não tem turma**, só curso — então, se duas turmas do mesmo
    curso cobrem a mesma data, um lançamento daquela data **não diz a qual pertence**.
    O passo 2 devolve `ambiguo` nesses casos, em vez de casar na turma errada.
    """
    turmas: dict[str, Turma] = {}
    with (BRUTO / "v20" / "Turmas_Ativas.csv").open(encoding="utf-8") as h:
        for linha in csv.DictReader(h):
            def _data(bruto: str) -> date | None:
                try:
                    return data_civil(bruto[:10])
                except ValueError:
                    return None

            turmas[linha["ID_Turma"]] = Turma(
                id_turma=linha["ID_Turma"],
                id_curso=linha["ID_Curso"],
                inicio=_data(linha["Data_Inicio"]),
                termino=_data(linha["Data_Termino"]),
            )

    por_curso: dict[str, list[Turma]] = defaultdict(list)
    for t in turmas.values():
        por_curso[t.id_curso].append(t)

    sobrepostas: list[str] = []
    for curso, lista in por_curso.items():
        for i, a in enumerate(lista):
            for b in lista[i + 1 :]:
                if a.inicio and a.termino and b.inicio and b.termino:
                    if a.inicio <= b.termino and b.inicio <= a.termino:
                        sobrepostas.append(f"{curso}: {a.id_turma} × {b.id_turma}")
    return turmas, sobrepostas


def _ler_lancamentos_v1() -> dict[tuple[str, date, str], list[dict]]:
    """Indexa os lançamentos da v1.0 por `(curso, data, cod)` — a chave do passo 3."""
    indice: dict[tuple[str, date, str], list[dict]] = defaultdict(list)
    for caminho in glob.glob(str(BRUTO / "ue_v1" / "*__lancamentos.csv")):
        with open(caminho, encoding="utf-8") as h:
            for linha in csv.DictReader(h):
                # Três filtros, cada um com uma razão diferente:
                #   · sem UE  → ruído estrutural da planilha (confirmado em 08/09);
                #   · sem data → as 14 linhas que o forward-fill não alcança;
                #   · não-disciplina → AD/FE/PL/TR/TE/LP não têm UE por natureza, e o
                #     FR-025.10 os situa no lado do LANÇAMENTO, que é aqui.
                if not linha["numero_ue"] or not linha["data"] or linha["e_disciplina"] != "1":
                    continue
                try:
                    quando = data_civil(linha["data"])
                except ValueError:
                    continue
                indice[(linha["curso_sigla"], quando, linha["cod"].upper())].append(linha)
    return indice


def cruzar() -> tuple[list[Resultado], Resumo]:
    """Percorre os registros da v2.0 e decide o veredito de cada um."""
    turmas, sobrepostas = _ler_turmas()
    lancamentos = _ler_lancamentos_v1()
    ponte, auditoria = construir_ponte()
    # a ponte mapeia v1 -> v2; o cruzamento percorre a v2, entao inverte-se.
    ponte_invertida = {(c, v2): v1 for (c, v1), v2 in ponte.items()}
    cursos_com_fonte = {chave[0] for chave in lancamentos}

    resultados: list[Resultado] = []
    resumo = Resumo()
    resumo.turmas_sobrepostas = sobrepostas
    resumo.pontes = auditoria

    with (BRUTO / "v20" / "Registro_Aulas_E_Atividades.csv").open(encoding="utf-8") as h:
        for linha in csv.DictReader(h):
            registro = linha["ID_Registro"]
            turma = turmas.get(linha["ID_Turma"])
            curso = turma.id_curso if turma else ""
            cod = _cod_da_grade(linha["ID_Grade"]).upper()

            # ---- veredito 5: o código não é disciplina. Não há UE a procurar.
            if cod in CODIGOS_NAO_DISCIPLINA:
                resultados.append(
                    Resultado(registro, NAO_APLICAVEL, motivo=f"codigo {cod} nao e disciplina")
                )
                resumo.por_veredito[NAO_APLICAVEL] += 1
                continue

            # ---- veredito 4: o curso não tem planilha da v1.0.
            if curso not in cursos_com_fonte:
                resultados.append(
                    Resultado(registro, FORA_DE_COBERTURA, motivo=f"curso {curso} sem planilha v1.0")
                )
                resumo.por_veredito[FORA_DE_COBERTURA] += 1
                resumo.cursos_sem_fonte.add(curso)
                continue

            resumo.cursos_cobertos.add(curso)

            try:
                quando = data_civil(linha["Data"][:10])
            except ValueError:
                resultados.append(Resultado(registro, SEM_FONTE, motivo="data ilegivel na v2.0"))
                resumo.por_veredito[SEM_FONTE] += 1
                continue

            # ---- passo 2: a data cai na janela de DUAS turmas do mesmo curso?
            concorrentes = [
                t for t in turmas.values() if t.id_curso == curso and t.cobre(quando)
            ]
            if len(concorrentes) > 1:
                resultados.append(
                    Resultado(
                        registro,
                        AMBIGUO,
                        motivo=f"{len(concorrentes)} turmas de {curso} cobrem {quando}",
                    )
                )
                resumo.por_veredito[AMBIGUO] += 1
                continue

            # ---- passo 4: traduzir o mnemônico da v2.0 para o romano da v1.0,
            #      quando os dois lados falarem línguas diferentes (achado de 08/09).
            cod_v1 = ponte_invertida.get((curso, cod), cod)

            # ---- passo 3: casar por (curso, data, cod)
            candidatos = lancamentos.get((curso, quando, cod_v1), [])
            if not candidatos:
                resultados.append(
                    Resultado(registro, SEM_FONTE, motivo=f"sem lancamento em {curso}/{quando}/{cod}")
                )
                resumo.por_veredito[SEM_FONTE] += 1
                continue

            ues = {int(c["numero_ue"]) for c in candidatos}
            if len(ues) > 1:
                # NUNCA se escolhe a mais frequente. Frequência não é evidência.
                resultados.append(
                    Resultado(
                        registro,
                        AMBIGUO,
                        motivo=f"{len(candidatos)} lancamentos apontam UEs {sorted(ues)}",
                    )
                )
                resumo.por_veredito[AMBIGUO] += 1
                continue

            escolhido = candidatos[0]
            resultados.append(
                Resultado(
                    registro,
                    CASADO,
                    numero_ue=int(escolhido["numero_ue"]),
                    sufixo=escolhido["sufixo_ue"],
                    fonte_arquivo=escolhido["arquivo"],
                    fonte_aba=escolhido["aba"],
                    fonte_linha=int(escolhido["linha"]),
                )
            )
            resumo.por_veredito[CASADO] += 1

    return resultados, resumo


def gravar(resultados: list[Resultado], destino: Path = DESTINO) -> Path:
    destino.mkdir(parents=True, exist_ok=True)
    arquivo = destino / "ue_cruzamento.csv"
    with arquivo.open("w", encoding="utf-8", newline="") as saida:
        escritor = csv.writer(saida)
        escritor.writerow(
            [
                "registro_aula_codigo", "veredito", "numero_ue", "sufixo_ue",
                "fonte_arquivo", "fonte_aba", "fonte_linha", "motivo",
            ]
        )
        for r in resultados:
            escritor.writerow(
                [
                    r.registro, r.veredito,
                    "" if r.numero_ue is None else r.numero_ue, r.sufixo,
                    r.fonte_arquivo, r.fonte_aba,
                    "" if r.fonte_linha is None else r.fonte_linha, r.motivo,
                ]
            )
    return arquivo


def gravar_ponte(auditoria: list[dict], destino: Path = DESTINO) -> Path:
    """A ponte fica AUDITAVEL: os dois nomes, lado a lado, com a nota."""
    destino.mkdir(parents=True, exist_ok=True)
    arquivo = destino / "ue_ponte_codigos.csv"
    with arquivo.open("w", encoding="utf-8", newline="") as saida:
        campos = ["curso", "cod_v1", "cod_v2", "similaridade", "nome_v1", "nome_v2"]
        escritor = csv.DictWriter(saida, fieldnames=campos)
        escritor.writeheader()
        escritor.writerows(auditoria)
    return arquivo


if __name__ == "__main__":
    resultados, resumo = cruzar()
    arquivo = gravar(resultados)
    gravar_ponte(resumo.pontes)
    total = len(resultados)
    print(f"{total} registros de aula processados -> {arquivo.name}\n")
    for veredito in (CASADO, AMBIGUO, SEM_FONTE, FORA_DE_COBERTURA, NAO_APLICAVEL):
        n = resumo.por_veredito.get(veredito, 0)
        print(f"  {veredito:<20} {n:>6}  ({n * 100 // max(total, 1)}%)")
    print(f"\ncursos com fonte : {len(resumo.cursos_cobertos)}")
    print(f"cursos sem fonte : {len(resumo.cursos_sem_fonte)}")
    if resumo.turmas_sobrepostas:
        print(f"\n⚠️  turmas sobrepostas no mesmo curso: {len(resumo.turmas_sobrepostas)}")
        for s in resumo.turmas_sobrepostas[:5]:
            print(f"     {s}")
