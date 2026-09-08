"""Etapa 1 — extração da base da v2.0, de arquivo LOCAL (FR-008, FR-021.1).

O QUÊ  : lê as 24 abas de `Banco de dados CIAARA-11 v2.0.xlsx` e grava uma cópia fiel
         em `dados/bruto/<aba>.csv`, **tudo texto**, sem conversão.

PARA QUÊ: é a etapa 1 do pipeline. O artefato que ela produz é o que torna a carga
         reproduzível sem depender da origem viva.

⚠️ MUDANÇA DE ARQUITETURA — 08/09/2026, decisão de Bernardo:
         a extração **não usa a API do Google Sheets**. A base foi salva localmente e
         é lida do disco. Consequências, todas boas para este épico:

         · o pipeline inteiro deixa de depender de rede — a etapa 1 era a única que
           dependia (documento 30 §1.1), e agora nenhuma depende;
         · não há credencial de serviço a guardar, o que remove `ETL_CREDENCIAL_GOOGLE`
           e `ETL_PLANILHA_ID` do caminho crítico;
         · o arquivo local **já é** a cópia datada e imutável que o FR-008 exige — o
           snapshot deixa de ser algo que a extração precisa fabricar.

⚠️ O QUE ISSO CUSTA, e precisa ficar escrito: o arquivo é de **20/08/2026 22:21**.
         A planilha viva continua sendo escrita todo dia. Esta extração retrata o
         estado de 20/08, **não o de hoje** — o que é exatamente o que FR-008 pede de
         um snapshot, desde que ninguém o confunda com "o estado atual". A conferência
         de quanto a origem andou desde então é a sondagem prévia (T061.1).
"""

from __future__ import annotations

import csv
import unicodedata
from pathlib import Path

import openpyxl

from . import _comum  # noqa: F401  — importa para silenciar os avisos do openpyxl
from . import snapshot

# ---------------------------------------------------------------------------------
# Caminho absoluto, declarado aqui e em nenhum outro lugar.
# Fica no código, e não em variável de ambiente, de propósito: é um caminho de
# arquivo local numa máquina só, não um segredo nem uma configuração de ambiente.
# Se mudar de máquina, muda aqui — e o erro de "arquivo não encontrado" é imediato e
# legível, em vez de um `None` silencioso vindo de um `os.environ.get`.
# ---------------------------------------------------------------------------------
BASE_V20 = Path(
    r"C:\Users\VILLAS BOAS\OneDrive\Documentos\SIS11\Versão 2.0"
    r"\Fase 2 - Arquitetura\Banco de dados CIAARA-11 v2.0.xlsx"
)

DESTINO = Path(__file__).parent / "dados" / "bruto" / "v20"

# Abas que NÃO são dado de negócio. `_Meta_Colunas` é o contrato de coluna da v2.0 —
# substituído nesta versão por `lib/tipos/database.ts`, gerado do banco (Glossário,
# "tipos gerados"). Extrair não custa nada e serve de referência na reconciliação.
ABAS_DE_APOIO = frozenset({"_Meta_Colunas"})


class BaseNaoEncontrada(FileNotFoundError):
    """A base da v2.0 não está no caminho esperado. Erro nomeado, não `None`."""


def _sem_acento(texto: str) -> str:
    """`Registro_Aulas_E_Atividades` → nome de arquivo previsível, sem acento."""
    normal = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normal if not unicodedata.combining(c))


def extrair(destino: Path = DESTINO) -> tuple[snapshot.Snapshot, dict[str, int]]:
    """Grava uma aba por CSV e devolve o snapshot mais a contagem por aba.

    A contagem devolvida é **a linha de base real** (FR-009.2): é ela que a sondagem
    prévia compara com o documento 05 §10, e o delta vai à aprovação nominal de
    Bernardo antes de virar critério de bloqueio (FR-009.1).
    """
    if not BASE_V20.exists():
        raise BaseNaoEncontrada(
            f"A base da v2.0 não está em:\n  {BASE_V20}\n"
            f"É arquivo local, não a API do Google (decisão de 08/09/2026). "
            f"Confira o caminho — a extração não tem plano B."
        )

    destino.mkdir(parents=True, exist_ok=True)
    livro = openpyxl.load_workbook(BASE_V20, read_only=True, data_only=True)
    contagem: dict[str, int] = {}
    conteudo_para_hash: list[bytes] = []

    for aba in livro.sheetnames:
        planilha = livro[aba]
        arquivo = destino / f"{_sem_acento(aba)}.csv"
        linhas_de_dado = 0

        with arquivo.open("w", encoding="utf-8", newline="") as saida:
            escritor = csv.writer(saida)
            for indice, linha in enumerate(planilha.iter_rows(values_only=True)):
                # TUDO texto, sem conversão. A conversão é da etapa 2, e fazê-la aqui
                # faria o erro acontecer na porta — com a origem já corrompida, a
                # reconciliação compararia duas cópias do mesmo erro.
                celulas = ["" if v is None else str(v) for v in linha]
                if indice > 0 and not any(c.strip() for c in celulas):
                    continue  # linha inteiramente vazia não é dado
                escritor.writerow(celulas)
                if indice > 0:
                    linhas_de_dado += 1

        contagem[aba] = linhas_de_dado
        conteudo_para_hash.append(arquivo.read_bytes())

    livro.close()

    marca = snapshot.gerar(
        origem=f"Banco de dados CIAARA-11 v2.0.xlsx ({BASE_V20.stat().st_mtime_ns})",
        conteudo=b"".join(conteudo_para_hash),
    )
    marca.gravar(destino)
    return marca, contagem


if __name__ == "__main__":
    marca, contagem = extrair()
    print(f"snapshot {marca.identificador} · {len(contagem)} abas")
    for aba, n in sorted(contagem.items(), key=lambda kv: -kv[1]):
        print(f"  {aba:<30} {n:>6}")
