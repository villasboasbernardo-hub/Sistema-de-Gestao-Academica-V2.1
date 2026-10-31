/**
 * A aba **Avaliações** do acompanhamento do DSA — folha de cliente (Bloco 16, spec 031, `FR-009`; colunas e *Editar* do
 * ajuste D da conferência de 31/10/2026).
 *
 * > *"colunas Avaliação · Situação · Data de aplicação · Data da vista (sair as semanas). Ícone Editar por linha
 * > (diálogo): situação (…), data de aplicação e data da vista, com JUSTIFICATIVA OBRIGATÓRIA (mín. 10 caracteres),
 * > gravando autor e data num histórico visível na linha. Edita quem lança o DSA da turma."* — Bernardo Villas Boas,
 * > 31/10/2026
 *
 * ⚠️ **NO MESMO ESTILO DO PAINEL DAS DISCIPLINAS**: a tabela única (`TabelaDensa`, cujas colunas são funções — por isso
 *    folha de cliente), a situação como selo com a palavra (`RNF-USA-05`).
 * ⚠️ **ELE NÃO CALCULA NADA**: as linhas chegam prontas de `linhasDoAcompanhamentoDeAvaliacoes`, já com o ajuste mais
 *    recente aplicado (`comAjustes`). A ação chega por propriedade (Princípio XI) e só existe para quem lança o DSA.
 * ⚠️ **O AJUSTE NÃO MUDA A CH** — o diálogo diz isso, e o TA fora do DSA continua pelo fluxo próprio da ficha.
 */
"use client";

import * as React from "react";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROTULO_DA_SITUACAO, type SituacaoDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";
import type { LinhaDoAcompanhamentoDeAvaliacoes } from "@/lib/dominio/dsa/acompanhamento-de-avaliacoes";
import { dataParaLeitura, instanteComHoraParaLeitura } from "@/lib/formato/data";

import { TOM_DA_SITUACAO_DA_AVALIACAO } from "../tom-da-situacao";
import { EscolhaSimples } from "./EscolhaSimples";

/** A ordem do pedido: *Pendente / Em andamento / Concluída / Cancelada* e as que já existiam. */
const SITUACOES: readonly SituacaoDaAvaliacao[] = [
  "pendente",
  "em_andamento",
  "concluida",
  "cancelada",
  "atrasada",
  "sem_correspondencia",
];

type ResultadoDoAjuste = { readonly ok: true } | { readonly ok: false; readonly erro: string };

const data = (d: string | null) => (d === null ? "—" : dataParaLeitura(d));

function FormularioDoAjuste({
  turmaId,
  linha,
  ajustar,
  fechar,
}: {
  readonly turmaId: string;
  readonly linha: LinhaDoAcompanhamentoDeAvaliacoes;
  readonly ajustar: (entrada: unknown) => Promise<ResultadoDoAjuste>;
  readonly fechar: () => void;
}) {
  const [situacao, definirSituacao] = React.useState<string>(linha.situacao ?? "pendente");
  const [aplicacao, definirAplicacao] = React.useState(linha.aplicacao ?? "");
  const [vista, definirVista] = React.useState(linha.vista ?? "");
  const [justificativa, definirJustificativa] = React.useState("");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function gravar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    definirRecusa(null);
    definirGravando(true);
    const resposta = await ajustar({
      turmaId,
      avaliacaoCurriculoId: linha.alvo.avaliacaoCurriculoId,
      avaliacaoId: linha.alvo.avaliacaoId,
      situacao,
      dataAplicacao: aplicacao === "" ? null : aplicacao,
      dataVista: vista === "" ? null : vista,
      justificativa,
    });
    definirGravando(false);
    if (!resposta.ok) {
      definirRecusa(resposta.erro);
      return;
    }
    fechar();
  }

  return (
    <form onSubmit={gravar} className="flex flex-col gap-3" data-slot="formulario-do-ajuste">
      <p className="text-texto-suave text-xs">
        O ajuste muda o que a linha diz — não muda a carga horária. Para tempos dados fora do DSA,
        use o *TA fora do DSA* da ficha da turma.
      </p>
      <EscolhaSimples
        id="ajuste-situacao"
        rotulo="Situação"
        obrigatorio
        valor={situacao}
        aoMudar={definirSituacao}
        opcoes={SITUACOES.map((s) => ({ valor: s, rotulo: ROTULO_DA_SITUACAO[s] }))}
      />
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ajuste-aplicacao">Data de aplicação</Label>
          <Input
            id="ajuste-aplicacao"
            type="date"
            value={aplicacao}
            onChange={(e) => definirAplicacao(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ajuste-vista">Data da vista</Label>
          <Input
            id="ajuste-vista"
            type="date"
            value={vista}
            onChange={(e) => definirVista(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ajuste-justificativa">Justificativa (ao menos 10 caracteres)</Label>
        <textarea
          id="ajuste-justificativa"
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          value={justificativa}
          onChange={(e) => definirJustificativa(e.target.value)}
          className="border-borda-forte bg-superficie text-texto rounded-md border px-2 py-1 text-sm"
        />
      </div>
      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-do-ajuste">
          {recusa}
        </p>
      ) : null}
      <div className="border-borda flex items-center gap-2 border-t pt-2">
        <BotaoDeIcone
          acao="salvar"
          rotulo="Gravar o ajuste"
          type="submit"
          variante="padrao"
          ocupado={gravando}
          data-slot="gravar-ajuste"
        />
        <BotaoDeIcone acao="cancelar" rotulo="Cancelar" type="button" onClick={fechar} />
      </div>
    </form>
  );
}

export function AcompanhamentoDeAvaliacoes({
  turmaId,
  linhas,
  rotuloDaSemana,
  aviso,
  ajustar,
}: {
  readonly turmaId: string;
  readonly linhas: readonly LinhaDoAcompanhamentoDeAvaliacoes[];
  readonly rotuloDaSemana: string;
  /** A falha de leitura do quadro (`RN-DEG-01`): a tabela sai vazia, com o motivo. */
  readonly aviso: string | null;
  /** Só para quem lança o DSA da turma — sem ela, nenhum *Editar*. */
  readonly ajustar?: ((entrada: unknown) => Promise<ResultadoDoAjuste>) | undefined;
}) {
  const colunas: Coluna<LinhaDoAcompanhamentoDeAvaliacoes>[] = [
    {
      chave: "avaliacao",
      titulo: "Avaliação",
      celula: (l) => (
        <span className="flex flex-col whitespace-normal" data-avaliacao={l.avaliacao}>
          <span>
            <span className="text-texto font-medium">{l.disciplina}</span>{" "}
            <span className="text-texto">{l.avaliacao}</span>{" "}
            <span className="text-texto-suave">{l.nomeDaDisciplina}</span>
          </span>
          {/* O histórico do ajuste, na própria linha: autor, data e justificativa, do mais novo ao mais velho. */}
          {l.historico.length > 0 ? (
            <ul className="text-texto-suave mt-0.5 text-xs" data-slot="historico-do-ajuste">
              {l.historico.map((h) => (
                <li key={h.em}>
                  Ajustada para {ROTULO_DA_SITUACAO[h.situacao]} em{" "}
                  {instanteComHoraParaLeitura(h.em)}
                  {h.autor ? ` por ${h.autor}` : ""}: {h.justificativa}
                </li>
              ))}
            </ul>
          ) : null}
        </span>
      ),
    },
    {
      chave: "situacao",
      titulo: "Situação",
      celula: (l) =>
        l.situacao === null ? (
          "—"
        ) : (
          <span data-slot="situacao-da-avaliacao" data-situacao={l.situacao}>
            <BadgeStatus
              tom={TOM_DA_SITUACAO_DA_AVALIACAO[l.situacao]}
              rotulo={ROTULO_DA_SITUACAO[l.situacao]}
            />
          </span>
        ),
    },
    { chave: "aplicacao", titulo: "Data de aplicação", celula: (l) => data(l.aplicacao) },
    { chave: "vista", titulo: "Data da vista", celula: (l) => data(l.vista) },
  ];
  if (ajustar) {
    colunas.push({
      chave: "editar",
      titulo: "",
      celula: (l) => (
        <DialogoDeFormulario
          titulo={`Ajustar ${l.disciplina} ${l.avaliacao}`}
          descricao="Situação, datas e a justificativa — vai para o histórico da linha."
          slot="dialogo-do-ajuste"
          gatilho={
            <BotaoDeIcone
              acao="editar"
              rotulo={`Editar ${l.avaliacao}`}
              data-slot="editar-avaliacao"
            />
          }
        >
          {(fechar) => (
            <FormularioDoAjuste turmaId={turmaId} linha={l} ajustar={ajustar} fechar={fechar} />
          )}
        </DialogoDeFormulario>
      ),
    });
  }

  return (
    <section
      data-slot="acompanhamento-de-avaliacoes"
      aria-label="Situação das avaliações da turma"
      className="rounded-ciaara border-borda bg-superficie flex min-w-0 flex-col gap-3 border p-3"
    >
      <header className="flex flex-col">
        <h2 className="text-texto text-sm font-semibold">Situação das avaliações</h2>
        <p className="text-texto-suave text-xs">
          Até a semana de {rotuloDaSemana}. A situação ajustada à mão traz o histórico na linha.
        </p>
      </header>
      {aviso ? (
        <p role="status" className="text-atrasado-tinta text-sm">
          {aviso}
        </p>
      ) : null}
      <TabelaDensa
        linhas={linhas}
        colunas={colunas}
        chaveLinha={(l) => l.chave}
        rotulo="Avaliações da turma"
        motivoDoVazio="sem-dado"
      />
    </section>
  );
}
