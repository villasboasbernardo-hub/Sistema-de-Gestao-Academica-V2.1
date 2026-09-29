"""Ponto de entrada ÚNICO do ETL — as seis etapas, na ordem, ou nenhuma.

O QUÊ  : encadeia extração (1 e 1-B), normalização (2), cruzamento da UE (2-B), carga
         em staging (3), promoção (4) e reconciliação (5), e devolve um código de saída
         que diz o que aconteceu.

PARA QUÊ: o contrato pipeline P-7 é explícito — **não existe "rodar só uma tabela para
         corrigir uma coisinha"**. Essa é a operação que, numa migração, produz o
         estado que ninguém sabe descrever: quinze tabelas de um snapshot e dez de
         outro, sem nada que registre a mistura. Ter um ponto de entrada só é o que
         faz "o que está no banco?" ter uma resposta.

COMO   : `python -m scripts.etl.executar [--primeira-carga] [--somente-reconciliar]`

⚠️ A RECONCILIAÇÃO NÃO É OPCIONAL, e não é um passo separado que alguém lembra de
   rodar. Ela roda ao fim de toda carga, e o **código de saída do programa é o veredito
   dela**. Uma carga que termina 0 é uma carga conferida; qualquer outra coisa não é
   carga terminada, é carga interrompida.

⚠️ **A RECUSA DA AMBIENTE-2 EXISTE** desde 22/09/2026 (`carregar.dados_ja_carregados`, saída 3):
   `--primeira-carga` contra destino que já tem dado **recusa antes de tocar no `staging`**, nomeando
   tabela e contagem, e o critério é a **procedência** — o que a plataforma semeia não conta. Era
   pré-requisito da carga, amarrado por Bernardo Villas Boas, e não tarefa do PR que a acompanha:
   até ele, o que impedia uma segunda carga era colisão de chave no meio da promoção, por acidente,
   e proteção acidental é o que a spec 009 vem eliminando.
⚠️ **E NENHUMA CARGA CONTRA O REMOTO ANTES DE BERNARDO DIZER QUE TERMINOU AS CORREÇÕES DE ORIGEM**
   (decisão de 22/09/2026). Corrigir na planilha antes da carga não custa nada; depois, exige a tela de
   turma ou de curso, que é do PR 2. As correções ficam em `dados/correcoes-de-origem.md`.

Códigos de saída, e a diferença entre eles importa:
   0 — carregou e a reconciliação APROVOU.
   1 — carregou e a reconciliação BLOQUEOU: há divergência nomeada no relatório.
   2 — **não foi possível conferir**. Não é aprovação nem reprovação: é ignorância, e
       ela tem de ser distinguível das outras duas (FR-014.2).
   3 — a carga abortou antes de escrever: domínio sem destino, chave órfã, conflito de
       parâmetro. Nada foi gravado.
"""

from __future__ import annotations

import argparse
import sys

from pathlib import Path

from . import carregar, correcoes, promover, reconciliar

# ⚠️ O console do Windows abre em cp1252, e cp1252 não tem `→` (U+2192) — o programa
#    morria com `UnicodeEncodeError` ao IMPRIMIR o título de uma etapa, depois de a
#    etapa ter rodado. Falhar na impressão do resultado é a pior forma de falhar: o
#    trabalho foi feito e o operador vê um traceback. Como este é o ponto de entrada
#    único, reconfigurar aqui cobre tudo o que o pipeline imprime.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AMBIENTES = ("local", "preview", "producao")


def _linha(titulo: str) -> None:
    print(f"\n{'=' * 74}\n{titulo}\n{'=' * 74}")


def executar(
    *, conexao: str, primeira_carga: bool, somente_reconciliar: bool
) -> int:
    if not somente_reconciliar:
        _linha("ETAPA 3 — carga em staging")
        try:
            rel = carregar.carregar(conexao, primeira_carga=primeira_carga)
        except carregar.DestinoJaCarregado as erro:
            print(f"[RECUSADO] {erro}")
            return 3
        except carregar.CoberturaIncompleta as erro:
            print(f"[ABORTADO] {erro}")
            return 3
        print(
            f"  {len(rel.staging)} tabelas, {sum(rel.staging.values())} linhas em staging"
        )

        _linha("ETAPA 4 — promoção staging → public")
        try:
            res = promover.promover(conexao)
        except (correcoes.CorrecaoObsoleta, correcoes.CorrecaoInvalida) as erro:
            print(f"[ABORTADO] {erro}")
            return 3
        except (promover.DominioSemDestino, promover.ChaveOrfa) as erro:
            print(f"[ABORTADO] {erro}")
            return 3
        except Exception as erro:  # noqa: BLE001 — a mensagem do banco é o diagnóstico
            print(f"[ABORTADO] {str(erro).splitlines()[0]}")
            return 3
        print(f"  {sum(res.inseridas.values())} linhas promovidas")
        if res.correcoes_aplicadas:
            print(
                f"  {len(res.correcoes_aplicadas)} correcao(oes) de origem aplicadas por cima do "
                f"retrato fiel (dados/correcoes-de-origem.md)"
            )
        if res.vocabulario_semeado:
            print(
                f"  {len(res.vocabulario_semeado)} valores semeados em config_listas "
                f"(usados pelo historico, ausentes da lista)"
            )

    _linha("ETAPA 5 — reconciliação")
    try:
        v = reconciliar.reconciliar(conexao)
    except reconciliar.NaoFoiPossivelReconciliar as erro:
        print(f"[NAO CONFERIDA] {erro}")
        return 2

    caminho = reconciliar.escrever_relatorio(v)
    print(f"  VEREDITO: {'APROVADA' if v.aprovada else 'BLOQUEADA'}")
    for d in v.bloqueantes:
        print(f"    {d}")
    for d in v.informativos:
        print(f"    (informa) {d.verificacao} · {d.tabela} · {d.linha}: {d.obtido}")
    print(f"  relatorio: {caminho}")

    # ⚠️ ETAPA 6 — AS UNIDADES DE ENSINO, e ela existe porque a migration da carga não pode
    #    rodar no `db reset`. Toda migration é aplicada contra uma base VAZIA antes de o ETL
    #    carregar, e ali nenhuma disciplina de destino existe: a migration se abstém, com
    #    aviso. No banco REMOTO ela carrega, porque lá os cadastros já estão. No LOCAL, quem
    #    carrega é esta etapa, aplicando **o mesmo arquivo de migration** logo depois do ETL.
    #    ⚠️ NÃO há segunda cópia do dado — há uma segunda EXECUÇÃO do mesmo SQL. Foi a lição
    #    da marcação `simultaneo` do PR 1 desta fatia, onde dois caminhos com dois textos
    #    fariam local e remoto divergirem em silêncio.
    #    ⚠️ O SQL é idempotente (`on conflict do nothing`, `where not exists`), então rodá-lo
    #    duas vezes não duplica nada — e a asserção dele confere o resultado.
    #    ⚠️ Só no destino LOCAL: contra preview ou produção a carga vem por `db push`, e a
    #    regra de direção proíbe o ETL escrever no remoto (VIRADA-1).
    if conexao == carregar.CONEXAO_LOCAL:
        _linha("ETAPA 6 — unidades de ensino (a migration da carga, aplicada depois do ETL)")
        cargas = sorted(
            (Path(__file__).resolve().parents[2] / "supabase" / "migrations").glob(
                "*_carga_unidades_ensino.sql"
            )
        )
        if not cargas:
            print("  (nenhuma migration de carga de UE encontrada — etapa pulada)")
        else:
            import psycopg

            for arquivo in cargas:
                try:
                    with psycopg.connect(conexao, autocommit=False) as con:
                        # ⚠️ Uma transação por arquivo: a asserção final da migration está
                        #    DENTRO dela, então um número que não fecha desfaz a carga inteira
                        #    em vez de deixar o banco pela metade.
                        con.execute(arquivo.read_text(encoding="utf-8"))
                        con.commit()
                except Exception as erro:  # noqa: BLE001 — o motivo vai para o relatório
                    print(f"[NAO CONFERIDA] a carga de UE falhou em {arquivo.name}: {erro}")
                    return 2
                print(f"  {arquivo.name}: aplicada")
            with psycopg.connect(conexao) as con:
                linhas = con.execute(
                    "select count(*), count(distinct disciplina_id),"
                    " count(*) filter (where fundamento_normativo is null)"
                    " from public.unidades_ensino"
                ).fetchone()
            print(
                f"  unidades_ensino: {linhas[0]} linhas em {linhas[1]} disciplinas, "
                f"{linhas[2]} sem fundamento"
            )

    # ⚠️ A CONTA LOCAL VOLTA SOZINHA AO FIM DA CARGA — decisão de Bernardo Villas Boas,
    #    24/09/2026. Depois da carga o banco tem 5.394 linhas e **nenhuma credencial**: sem
    #    isto, conferir o dado na tela exige um passo manual que ninguém lembra de fazer, e
    #    o custo é alguém deixar de conferir. Só no destino LOCAL, e o script tem porteiro
    #    próprio — aqui a condição é para não tentar sequer.
    if conexao == carregar.CONEXAO_LOCAL:
        try:
            from scripts.manutencao import conta_local

            print()
            conta_local.main([])
        except SystemExit as erro:  # o porteiro do script, ou stack fora do ar
            print(f"  (conta local nao criada: {erro})")
        except Exception as erro:  # noqa: BLE001 — a carga passou; isto é conveniência
            print(f"  (conta local nao criada: {erro})")

    if primeira_carga and v.aprovada:
        print(
            "\n  Primeira carga aprovada. O corte so acontece depois da conferencia "
            "humana dos informativos — a aprovacao aqui e tecnica, nao e a decisao."
        )
    return 0 if v.aprovada else 1


def main() -> int:
    p = argparse.ArgumentParser(
        prog="python -m scripts.etl.executar",
        description="ETL v2.0 → v2.1. As seis etapas, na ordem. Nao ha como rodar uma so.",
    )
    p.add_argument("--ambiente", choices=AMBIENTES, default="local")
    p.add_argument(
        "--primeira-carga",
        action="store_true",
        help="Marca a execucao como a carga inicial. RECUSA (saida 3) se o destino ja tiver "
        "dado com procedencia da v2.0, nomeando tabela e contagem.",
    )
    p.add_argument(
        "--somente-reconciliar",
        action="store_true",
        help="Pula as etapas 3 e 4 e so confere o que ja esta no banco. E por isso que a "
        "staging e truncada no INICIO da carga e nao descartada no fim: sem ela guardada, "
        "esta opcao nao teria contra o que comparar.",
    )
    p.add_argument("--conexao", default=carregar.CONEXAO_LOCAL)
    a = p.parse_args()

    if a.ambiente != "local" and a.conexao == carregar.CONEXAO_LOCAL:
        print(
            f"[RECUSADO] --ambiente {a.ambiente} com a conexao LOCAL padrao. Passe "
            f"--conexao explicitamente: escrever em preview ou producao por engano, "
            f"achando que se esta no Docker, e um erro que nao se desfaz."
        )
        return 3

    return executar(
        conexao=a.conexao,
        primeira_carga=a.primeira_carga,
        somente_reconciliar=a.somente_reconciliar,
    )


if __name__ == "__main__":
    sys.exit(main())
