/**
 * O quadro das PALESTRAS — as AEC previstas do currículo e as avulsas — **folha de cliente** (Bloco 18, spec 033, RA-3
 * e RA-5; FR-002.4, FR-002.5, FR-005, FR-006.5, FR-007.2 e FR-008.1). Um quadro só para a ficha da turma, o
 * acompanhamento do DSA (só leitura) e a aba Palestras do módulo.
 *
 * > *"A turma herda as AEC previstas do seu currículo como 'a cumprir'. Palestra fora do currículo entra sem vínculo e
 * > CONTA no limite de AEC do currículo (…). Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (data,
 * > palestrante, local vêm do lançamento) OU marcada à mão pelo trio (…) com justificativa obrigatória e trilha."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **ELE NÃO CALCULA NADA**: as linhas chegam prontas (`quadroDasPrevistas` + `linhasDePalestras`), com a situação, os
 *    TA, as datas, o palestrante, o local e o histórico da marcação.
 * ⚠️ **A AVULSA FICA EM BLOCO PRÓPRIO** (*"fora do currículo — contam no limite de AEC"*): não tem situação, e quem a
 *    soma no limite é a categoria (a view), não este quadro.
 * ⚠️ **AS AÇÕES SÃO DO TRIO E DA TURMA FORA DO ARQUIVO**: `podeMarcar` decide no servidor; a linha da turma arquivada
 *    não ganha ícone (RT-8: ela conta, mas não grava).
 * ⚠️ **A CONFIRMAÇÃO**: na ficha, pela URL (`?gravada=`, que sobrevive à remontagem); no módulo, acima do quadro.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import {
  ROTULO_DA_SITUACAO_DA_PREVISTA,
  ehCumprida,
} from "@/lib/dominio/atividades/previstas";
import type {
  AvulsaDaAba,
  LinhaDePalestra,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { dataParaLeitura, instanteComHoraParaLeitura, intervaloDeDatas } from "@/lib/formato/data";
import {
  enderecoDaAbaDaTurma,
  enderecoDaAbaDaTurmaGravada,
} from "@/lib/navegacao/endereco-de-turma";

import { MarcacaoAMao, type GravacaoDaMarcacao } from "./MarcacaoAMao";
import { TOM_DA_SITUACAO_DA_PREVISTA } from "./tom-do-planejado";

const RESPOSTA: Readonly<Record<GravacaoDaMarcacao, string>> = {
  marcacao: "Cumprimento registrado.",
  "marcacao-desfeita": "Marcação desfeita.",
};

const lista = (valores: readonly string[]) => (valores.length === 0 ? "—" : valores.join("; "));

function datas(l: LinhaDePalestra): string {
  if (l.primeiraData === null) return "—";
  return intervaloDeDatas(l.primeiraData, l.ultimaData ?? l.primeiraData) || "—";
}

function tempos(l: LinhaDePalestra): string {
  return l.taPrevistos === null
    ? `${l.taLancados} TA · previsto não definido`
    : `${l.taLancados} de ${l.taPrevistos} TA`;
}

export function QuadroDePalestras({
  linhas,
  avulsas,
  comTurma,
  podeMarcar,
  turmaDaFicha,
  hoje,
}: {
  readonly linhas: readonly LinhaDePalestra[];
  readonly avulsas: readonly AvulsaDaAba[];
  /** No módulo, as linhas são de várias turmas: a coluna *Turma* aparece. */
  readonly comTurma: boolean;
  /** O trio (`planejamento_de_atividades.editar`), fora do acompanhamento do DSA — decidido no servidor. */
  readonly podeMarcar: boolean;
  /** Na ficha da turma: o código dela, para voltar à aba com a confirmação na URL. */
  readonly turmaDaFicha: string | null;
  readonly hoje: string;
}) {
  const router = useRouter();
  const [resposta, definirResposta] = React.useState<string | null>(null);

  function gravou(turmaCodigo: string, oQue: GravacaoDaMarcacao): void {
    if (turmaDaFicha !== null) {
      router.replace(enderecoDaAbaDaTurmaGravada(turmaCodigo, "palestras", oQue));
      return;
    }
    definirResposta(`${RESPOSTA[oQue]} ${turmaCodigo}.`);
  }

  const colunaDaTurma: Coluna<{ readonly turmaCodigo: string }> = {
    chave: "turma",
    titulo: "Turma",
    celula: (l) => (
      <Link
        href={enderecoDaAbaDaTurma(l.turmaCodigo, "palestras")}
        className="text-marca underline-offset-2 hover:underline"
      >
        {l.turmaCodigo}
      </Link>
    ),
  };

  const colunas: Coluna<LinhaDePalestra>[] = [
    {
      chave: "prevista",
      titulo: "AEC prevista",
      celula: (l) => (
        <span className="flex flex-col whitespace-normal" data-prevista={l.codigo}>
          <span className="text-texto font-medium">{l.nome}</span>
          <span className="text-texto-suave text-xs">
            {l.tipoRotulo}
            {l.disciplina ? ` · ${l.disciplina.codigo} ${l.disciplina.nome}` : ""}
            {l.obrigatoria ? " · obrigatória" : " · facultativa"}
          </span>
          {/* O histórico da marcação à mão, na própria linha: do mais novo ao mais velho (RA-5). */}
          {l.historico.length > 0 ? (
            <ul className="text-texto-suave mt-0.5 text-xs" data-slot="historico-da-marcacao">
              {l.historico.map((h) => (
                <li key={h.em}>
                  {h.situacao === "cumprida" ? "Marcada cumprida" : "Marcação desfeita"} em{" "}
                  {instanteComHoraParaLeitura(h.em)}
                  {h.autor ? ` por ${h.autor}` : ""}
                  {h.dataRealizada ? ` (realizada em ${dataParaLeitura(h.dataRealizada)})` : ""}:{" "}
                  {h.justificativa}
                </li>
              ))}
            </ul>
          ) : null}
        </span>
      ),
    },
    ...(comTurma ? [colunaDaTurma as Coluna<LinhaDePalestra>] : []),
    { chave: "ta", titulo: "TA", celula: (l) => tempos(l) },
    {
      chave: "situacao",
      titulo: "Situação",
      celula: (l) => (
        <span data-slot="situacao-da-prevista" data-situacao={l.situacao}>
          <BadgeStatus
            tom={TOM_DA_SITUACAO_DA_PREVISTA[l.situacao]}
            rotulo={ROTULO_DA_SITUACAO_DA_PREVISTA[l.situacao]}
          />
        </span>
      ),
    },
    { chave: "data", titulo: "Data", celula: (l) => datas(l) },
    { chave: "palestrante", titulo: "Palestrante", celula: (l) => lista(l.responsaveis) },
    { chave: "local", titulo: "Local", celula: (l) => lista(l.locais) },
  ];
  if (podeMarcar) {
    colunas.push({
      chave: "marcar",
      titulo: "",
      celula: (l) =>
        l.turmaArquivada ? null : l.marcacao !== null ? (
          <MarcacaoAMao
            turmaId={l.turmaId}
            alvo={{ atividadePrevistaId: l.id }}
            nome={l.nome}
            desfazer
            rotuloDoCumprido="cumprida"
            hoje={hoje}
            aoGravar={(oQue) => gravou(l.turmaCodigo, oQue)}
          />
        ) : ehCumprida(l.situacao) ? null : (
          <MarcacaoAMao
            turmaId={l.turmaId}
            alvo={{ atividadePrevistaId: l.id }}
            nome={l.nome}
            desfazer={false}
            rotuloDoCumprido="cumprida"
            hoje={hoje}
            aoGravar={(oQue) => gravou(l.turmaCodigo, oQue)}
          />
        ),
    });
  }

  const colunasDasAvulsas: Coluna<AvulsaDaAba>[] = [
    { chave: "data", titulo: "Data", celula: (a) => dataParaLeitura(a.data) },
    ...(comTurma ? [colunaDaTurma as Coluna<AvulsaDaAba>] : []),
    { chave: "ta", titulo: "TA", celula: (a) => `${a.ta} TA` },
    {
      chave: "descricao",
      titulo: "Descrição",
      celula: (a) => (
        <span className="whitespace-normal" data-avulsa={a.codigo}>
          {a.descricao ?? "—"}
        </span>
      ),
    },
    { chave: "palestrante", titulo: "Palestrante", celula: (a) => a.responsavel ?? "—" },
    { chave: "local", titulo: "Local", celula: (a) => a.local ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-4" data-slot="quadro-de-palestras">
      {resposta ? (
        <p role="status" className="text-executado-tinta text-sm" data-slot="resposta-das-palestras">
          {resposta}
        </p>
      ) : null}
      <section aria-label="AEC previstas do currículo" className="flex flex-col gap-2">
        <h2 className="text-texto text-sm font-semibold">AEC previstas do currículo</h2>
        {linhas.length === 0 ? (
          <p className="text-texto-suave text-sm" data-slot="sem-aec-prevista">
            Nenhuma AEC prevista neste recorte.
          </p>
        ) : (
          <TabelaDensa
            linhas={linhas}
            colunas={colunas}
            chaveLinha={(l) => l.chave}
            rotulo="AEC previstas do currículo"
            motivoDoVazio="sem-dado"
          />
        )}
      </section>
      <section aria-label="Palestras fora do currículo" className="flex flex-col gap-2" data-slot="palestras-avulsas">
        <header className="flex flex-col">
          <h2 className="text-texto text-sm font-semibold">Fora do currículo</h2>
          <p className="text-texto-suave text-xs">
            Palestras lançadas sem vínculo com uma AEC prevista — contam no limite de AEC do currículo.
          </p>
        </header>
        {avulsas.length === 0 ? (
          <p className="text-texto-suave text-sm" data-slot="sem-palestra-avulsa">
            Nenhuma palestra fora do currículo neste recorte.
          </p>
        ) : (
          <TabelaDensa
            linhas={avulsas}
            colunas={colunasDasAvulsas}
            chaveLinha={(a) => a.codigo}
            rotulo="Palestras fora do currículo"
            motivoDoVazio="sem-dado"
          />
        )}
      </section>
    </div>
  );
}
