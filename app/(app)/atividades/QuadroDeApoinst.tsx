/**
 * O quadro da APOINST planejada — previsto × realizado — **folha de cliente** (Bloco 18, spec 033, RA-6; FR-004,
 * FR-006.6, FR-007.2 e FR-008.1). Um quadro só para a ficha da turma, o acompanhamento do DSA (só leitura) e a aba
 * APOINST do módulo.
 *
 * > *"Situação: Planejada · Em andamento (tem lançamento) · Concluída (TA lançados ≥ previstos ou marcada à mão com
 * > justificativa) · Atrasada (passou o fim previsto sem concluir). Comparar previsto × realizado (datas e TA)."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **ELE NÃO CALCULA NADA**: a situação, os TA lançados, o primeiro e o último lançamento e a diferença chegam prontos
 *    de `quadroDaApoinst` (o veredito único, com o «hoje» de quem chama).
 * ⚠️ **AS AÇÕES DA LINHA** (RT-2): *Editar* (diálogo), *Desativar* e *Reativar* (confirmação), *Excluir* DESABILITADO
 *    (regra 4: não há exceção nominal para a APOINST — *use Desativar*) e *Concluída à mão* e *Desfazer* (a marcação com
 *    justificativa). Só para o trio e com a turma fora do arquivo; a desativada só reativa.
 * ⚠️ **A DESATIVADA APARECE, MARCADA, E NÃO CONTA** (o `porSituacao` do quadro é só das ativas).
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import { desativarApoinst, reativarApoinst } from "@/lib/acoes/apoinst";
import { ROTULO_DA_SITUACAO_DA_APOINST } from "@/lib/dominio/atividades/apoinst";
import type { LinhaDeApoinst } from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { dataParaLeitura, instanteComHoraParaLeitura, intervaloDeDatas } from "@/lib/formato/data";
import {
  enderecoDaAbaDaTurma,
  enderecoDaAbaDaTurmaGravada,
} from "@/lib/navegacao/endereco-de-turma";

import {
  EditarApoinst,
  type GravacaoDaApoinst,
  type OpcoesDoFormularioDeApoinst,
} from "./FormularioDeApoinst";
import { MarcacaoAMao, type GravacaoDaMarcacao } from "./MarcacaoAMao";
import { TOM_DA_SITUACAO_DA_APOINST } from "./tom-do-planejado";

const RESPOSTA: Readonly<Record<GravacaoDaApoinst | GravacaoDaMarcacao, string>> = {
  apoinst: "APOINST gravada",
  "apoinst-desativada": "APOINST desativada",
  "apoinst-reativada": "APOINST reativada",
  marcacao: "Conclusão registrada",
  "marcacao-desfeita": "Marcação desfeita",
};

/** O motivo do *Excluir* indisponível (regra 4; D-COR-6). */
const SEM_EXCLUSAO = "A APOINST é registro: nada se apaga. Use Desativar.";

const LINK =
  "text-marca rounded-ciaara-sm focus-visible:ring-marca underline focus-visible:ring-2 focus-visible:outline-none";

function periodo(de: string | null, ate: string | null): string {
  if (de === null) return "—";
  return intervaloDeDatas(de, ate ?? de) || "—";
}

function diferenca(l: LinhaDeApoinst): string {
  if (l.diferencaDeTa === 0) return "no previsto";
  return l.diferencaDeTa < 0 ? `faltam ${-l.diferencaDeTa}` : `${l.diferencaDeTa} a mais`;
}

export function QuadroDeApoinst({
  linhas,
  comTurma,
  podePlanejar,
  turmaDaFicha,
  hoje,
  opcoes,
  observacoes,
}: {
  readonly linhas: readonly LinhaDeApoinst[];
  /** No módulo, as linhas são de várias turmas: a coluna *Turma* aparece. */
  readonly comTurma: boolean;
  /** O trio (`planejamento_de_atividades.editar`), fora do acompanhamento do DSA — decidido no servidor. */
  readonly podePlanejar: boolean;
  /** Na ficha da turma: o código dela, para voltar à aba com a confirmação na URL. */
  readonly turmaDaFicha: string | null;
  readonly hoje: string;
  /** As opções do *Editar* (disciplinas e designados de cada turma); nulas no só-leitura. */
  readonly opcoes: OpcoesDoFormularioDeApoinst | null;
  /** A observação gravada de cada APOINST (por id), para o *Editar*. */
  readonly observacoes: Readonly<Record<string, string | null>>;
}) {
  const router = useRouter();
  const [resposta, definirResposta] = React.useState<{ texto: string; falha: boolean } | null>(
    null,
  );
  const [gravando, iniciar] = React.useTransition();

  function gravou(turmaCodigo: string, oQue: GravacaoDaApoinst | GravacaoDaMarcacao): void {
    if (turmaDaFicha !== null) {
      router.replace(enderecoDaAbaDaTurmaGravada(turmaCodigo, "apoinst", oQue));
      return;
    }
    definirResposta({ texto: `${RESPOSTA[oQue]}: ${turmaCodigo}.`, falha: false });
  }

  function mudarSituacao(l: LinhaDeApoinst): void {
    iniciar(async () => {
      definirResposta(null);
      const r = l.ativa
        ? await desativarApoinst({ id: l.id })
        : await reativarApoinst({ id: l.id });
      if (!r.ok) {
        definirResposta({ texto: r.erro, falha: true });
        return;
      }
      gravou(l.turmaCodigo, l.ativa ? "apoinst-desativada" : "apoinst-reativada");
    });
  }

  const colunas: Coluna<LinhaDeApoinst>[] = [
    {
      chave: "apoinst",
      titulo: "APOINST",
      celula: (l) => (
        <span className="flex flex-col whitespace-normal" data-apoinst={l.codigo}>
          <span
            className={
              l.ativa ? "text-texto font-medium" : "text-texto-suave font-medium line-through"
            }
          >
            {l.nome}
          </span>
          <span className="text-texto-suave text-xs">
            {l.disciplina.codigo} {l.disciplina.nome}
          </span>
          {l.historico.length > 0 ? (
            <ul className="text-texto-suave mt-0.5 text-xs" data-slot="historico-da-marcacao">
              {l.historico.map((h) => (
                <li key={h.em}>
                  {h.situacao === "cumprida" ? "Marcada concluída" : "Marcação desfeita"} em{" "}
                  {instanteComHoraParaLeitura(h.em)}
                  {h.autor ? ` por ${h.autor}` : ""}
                  {h.dataRealizada
                    ? ` (concluída em ${dataParaLeitura(h.dataRealizada)})`
                    : ""}: {h.justificativa}
                </li>
              ))}
            </ul>
          ) : null}
        </span>
      ),
    },
    ...(comTurma
      ? [
          {
            chave: "turma",
            titulo: "Turma",
            celula: (l: LinhaDeApoinst) => (
              <Link href={enderecoDaAbaDaTurma(l.turmaCodigo, "apoinst")} className={LINK}>
                {l.turmaCodigo}
              </Link>
            ),
          } satisfies Coluna<LinhaDeApoinst>,
        ]
      : []),
    {
      chave: "instrutor",
      titulo: "Instrutor responsável",
      celula: (l) => <span className="whitespace-normal">{l.instrutor?.nome || "—"}</span>,
    },
    {
      chave: "previsto",
      titulo: "Previsto",
      celula: (l) => (
        <span data-slot="periodo-previsto">{periodo(l.inicioPrevisto, l.fimPrevisto)}</span>
      ),
    },
    {
      chave: "realizado",
      titulo: "Realizado",
      celula: (l) => (
        <span data-slot="periodo-realizado">
          {periodo(l.primeiroLancamento, l.ultimoLancamento)}
        </span>
      ),
    },
    {
      chave: "ta",
      titulo: "TA",
      celula: (l) => (
        <span className="flex flex-col" data-slot="ta-da-apoinst">
          <span className="tabular-nums">
            {l.taLancados} de {l.taPrevistos} TA
          </span>
          <span className="text-texto-suave text-xs">{diferenca(l)}</span>
        </span>
      ),
    },
    {
      chave: "situacao",
      titulo: "Situação",
      celula: (l) =>
        l.ativa ? (
          <span data-slot="situacao-da-apoinst" data-situacao={l.situacao}>
            <BadgeStatus
              tom={TOM_DA_SITUACAO_DA_APOINST[l.situacao]}
              rotulo={
                l.marcacao !== null
                  ? `${ROTULO_DA_SITUACAO_DA_APOINST[l.situacao]} (à mão)`
                  : ROTULO_DA_SITUACAO_DA_APOINST[l.situacao]
              }
            />
          </span>
        ) : (
          <span data-slot="situacao-da-apoinst" data-situacao="desativada">
            <BadgeStatus tom="inativo" rotulo="Desativada" />
          </span>
        ),
    },
  ];

  if (podePlanejar && opcoes !== null) {
    colunas.push({
      chave: "acoes",
      titulo: "",
      celula: (l) =>
        l.turmaArquivada ? null : (
          <span className="flex items-center gap-1" data-slot="acoes-da-apoinst">
            {l.ativa ? (
              <EditarApoinst
                apoinst={{
                  id: l.id,
                  turmaId: l.turmaId,
                  turmaCodigo: l.turmaCodigo,
                  nome: l.nome,
                  disciplinaId: l.disciplina.id,
                  instrutorId: l.instrutor?.id ?? null,
                  inicioPrevisto: l.inicioPrevisto,
                  fimPrevisto: l.fimPrevisto,
                  taPrevistos: l.taPrevistos,
                  observacao: observacoes[l.id] ?? null,
                }}
                opcoes={opcoes}
                aoGravar={gravou}
              />
            ) : null}
            {l.ativa && l.marcacao !== null ? (
              <MarcacaoAMao
                turmaId={l.turmaId}
                alvo={{ apoinstId: l.id }}
                nome={l.nome}
                desfazer
                rotuloDoCumprido="concluída"
                hoje={hoje}
                aoGravar={(oQue) => gravou(l.turmaCodigo, oQue)}
              />
            ) : l.ativa && l.situacao !== "concluida" ? (
              <MarcacaoAMao
                turmaId={l.turmaId}
                alvo={{ apoinstId: l.id }}
                nome={l.nome}
                desfazer={false}
                rotuloDoCumprido="concluída"
                hoje={hoje}
                aoGravar={(oQue) => gravou(l.turmaCodigo, oQue)}
              />
            ) : null}
            <DialogoConfirmacao
              titulo={l.ativa ? `Desativar ${l.nome}?` : `Reativar ${l.nome}?`}
              consequencia={
                l.ativa
                  ? "A APOINST sai das contas e dos avisos, e os lançamentos do DSA deixam de poder se vincular a ela. Nada é apagado: dá para reativar."
                  : "A APOINST volta às contas e aos avisos, e o DSA volta a oferecê-la como vínculo."
              }
              rotuloConfirmar={l.ativa ? "Desativar" : "Reativar"}
              aoConfirmar={() => mudarSituacao(l)}
            >
              <BotaoDeIcone
                acao={l.ativa ? "desativar" : "reativar"}
                rotulo={l.ativa ? `Desativar ${l.nome}` : `Reativar ${l.nome}`}
                variante="fantasma"
                disabled={gravando}
                data-slot={l.ativa ? "desativar-apoinst" : "reativar-apoinst"}
              />
            </DialogoConfirmacao>
            <BotaoDeIcone
              acao="excluir"
              rotulo={`Excluir ${l.nome}`}
              variante="fantasma"
              indisponivel={SEM_EXCLUSAO}
              data-slot="excluir-apoinst"
            />
          </span>
        ),
    });
  }

  return (
    <div className="flex flex-col gap-3" data-slot="quadro-de-apoinst">
      {resposta ? (
        <p
          role={resposta.falha ? "alert" : "status"}
          className={
            resposta.falha ? "text-conflito-tinta text-sm" : "text-executado-tinta text-sm"
          }
          data-slot="resposta-da-apoinst"
        >
          {resposta.texto}
        </p>
      ) : null}
      {linhas.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-apoinst">
          Nenhuma APOINST planejada neste recorte.
        </p>
      ) : (
        <TabelaDensa
          linhas={linhas}
          colunas={colunas}
          chaveLinha={(l) => l.id}
          rotulo="APOINST planejadas"
          motivoDoVazio="sem-dado"
        />
      )}
    </div>
  );
}
