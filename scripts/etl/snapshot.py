"""Identidade do snapshot — o que torna a idempotência afirmável (FR-006, FR-007.1).

O QUÊ  : gera e confere o identificador da cópia datada e imutável da origem.
PARA QUÊ: a planilha da v2.0 é **escrita todo dia**. Dizer "reexecutar produz o mesmo
          resultado" só faz sentido contra a MESMA origem — e a origem estável é o
          snapshot, não a planilha viva. Sem isso, uma reexecução no dia seguinte
          divergiria, e a divergência seria lida como defeito do ETL em vez de como
          o que é: a origem mudou.
COMO   : cada artefato de `dados/` carrega o identificador do snapshot que o gerou;
          cada etapa confere na entrada e **recusa** artefato de snapshot diferente.

Sem esta conferência, a etapa 4 poderia promover uma staging da carga de ontem
misturada com um cruzamento de hoje — e a reconciliação aprovaria, porque os dois
lados estariam internamente coerentes.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

# Nome do arquivo que carimba o snapshot dentro de cada diretório de artefato.
MARCA = ".snapshot.json"


@dataclass(frozen=True)
class Snapshot:
    """A identidade de uma extração. Imutável de propósito."""

    identificador: str
    """Hash curto do conteúdo extraído. É o que as etapas comparam."""

    extraido_em: str
    """Carimbo UTC da extração, em ISO-8601. Para leitura humana, não para comparação."""

    origem: str
    """De onde veio: a planilha da v2.0 ou o conjunto de .xlsx da v1.0."""

    def gravar(self, diretorio: Path) -> None:
        """Carimba o diretório de artefatos com esta identidade."""
        diretorio.mkdir(parents=True, exist_ok=True)
        (diretorio / MARCA).write_text(
            json.dumps(
                {
                    "identificador": self.identificador,
                    "extraido_em": self.extraido_em,
                    "origem": self.origem,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )


class SnapshotDivergente(RuntimeError):
    """Artefato de um snapshot diferente do esperado.

    Erro nomeado, e não `assert`: quem o receber precisa saber QUAL artefato veio de
    QUAL extração, e a mensagem carrega os dois identificadores.
    """


def gerar(origem: str, conteudo: bytes) -> Snapshot:
    """Deriva a identidade a partir do CONTEÚDO extraído, não do relógio.

    POR QUE do conteúdo: duas extrações do mesmo dado devem produzir o mesmo
    identificador. Se ele viesse do relógio, toda reexecução seria "outro snapshot"
    e a conferência do FR-007.1 nunca deixaria nada passar.
    """
    return Snapshot(
        identificador=hashlib.sha256(conteudo).hexdigest()[:16],
        extraido_em=datetime.now(UTC).isoformat(timespec="seconds"),
        origem=origem,
    )


def ler(diretorio: Path) -> Snapshot | None:
    """Lê a marca de um diretório de artefatos. `None` quando não há marca."""
    marca = diretorio / MARCA
    if not marca.exists():
        return None
    dados = json.loads(marca.read_text(encoding="utf-8"))
    return Snapshot(
        identificador=dados["identificador"],
        extraido_em=dados["extraido_em"],
        origem=dados["origem"],
    )


def conferir(diretorio: Path, esperado: Snapshot) -> None:
    """Recusa artefato que não pertença ao snapshot corrente (FR-007.1).

    Levanta `SnapshotDivergente` nomeando os dois identificadores. Diretório **sem
    marca** também é recusado: artefato de procedência desconhecida é pior que
    artefato de procedência errada, porque não dá nem para investigar.
    """
    encontrado = ler(diretorio)
    if encontrado is None:
        raise SnapshotDivergente(
            f"O diretório '{diretorio}' não tem marca de snapshot. "
            f"Esperado: {esperado.identificador} ({esperado.origem}). "
            f"Artefato sem procedência não entra na carga — rode a etapa de extração."
        )
    if encontrado.identificador != esperado.identificador:
        raise SnapshotDivergente(
            f"Artefato de outro snapshot em '{diretorio}'.\n"
            f"  esperado:   {esperado.identificador}  ({esperado.origem}, {esperado.extraido_em})\n"
            f"  encontrado: {encontrado.identificador}  ({encontrado.origem}, {encontrado.extraido_em})\n"
            f"Reexecute a etapa que gera este artefato, ou a extração inteira."
        )
