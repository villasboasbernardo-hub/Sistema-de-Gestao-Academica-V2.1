"use client";

/**
 * As ações do arbitrado num item de avaliação do currículo (spec 014, FR-031.3, FR-031.4, FR-031.7, T180):
 * **Definir tempo** (no curso ou só nesta turma), **Confirmar sugestão** da planilha e **Nomear a UE**.
 *
 * ⚠️ **SÓ É MONTADA PARA QUEM TEM `avaliacoes_curriculo_arbitrado.editar`** (Admin e Encarregado) — o botão segue a
 *    permissão da ação. Não é a proteção: a ação chamada por fora é recusada pelo banco (`42501`).
 * ⚠️ **AS AÇÕES CHEGAM POR PROPRIEDADE** (Princípio XI).
 * ⚠️ **PASSAR DA CH É AVISO**, nunca recusa (`RN-DEG-02`): a resposta `soma_acima_da_ch` vira `role="status"`.
 * ⚠️ **DEFINIR O TEMPO E NOMEAR A UE ABREM UM DIÁLOGO** (spec 022, Bloco 7, FR-002): até o Bloco 7 os campos abriam no
 *    lugar do item, e o seletor da UE ficava sempre aberto na linha. Gravar fecha o diálogo; a recusa fica nele.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type Resultado =
  | { readonly ok: true; readonly aviso?: "soma_acima_da_ch" }
  | {
      readonly ok: false;
      readonly erro: string;
      /** Spec 021 (RC-6): o banco pediu a justificativa da correção do currículo em uso. */
      readonly pedeJustificativa?: true | undefined;
    };
type Acao = (entrada: unknown) => Promise<Resultado>;

const CAMPO = "border-borda bg-superficie rounded-ciaara h-8 border px-2 text-sm";

export function DefinirTempoArbitrado({
  itemId,
  turmaId,
  tempoDeCurriculo,
  sugestaoAConfirmar,
  unidades,
  definir,
  confirmar,
  nomear,
}: {
  readonly itemId: string;
  /** Vazio = a aba do CURSO sem turma escolhida: só o alcance de curso. */
  readonly turmaId: string;
  /** O tempo do item é do currículo: no curso não se arbitra; só a turma. */
  readonly tempoDeCurriculo: boolean;
  readonly sugestaoAConfirmar: boolean;
  /** As UEs da disciplina, quando o currículo não diz de qual UE a avaliação sai. */
  readonly unidades: readonly { id: string; rotulo: string }[];
  readonly definir: Acao;
  readonly confirmar: Acao;
  readonly nomear: Acao;
}) {
  const router = useRouter();
  const [resposta, setResposta] = useState<Resultado | null>(null);
  const [gravando, iniciar] = useTransition();
  /* Spec 021 (RC-6): mudar o tempo que o currículo em uso já definia é correção — com justificativa. */
  const pedido = usePedidoDeJustificativa();

  /** Roda a ação; `aoGravar` recebe a recusa (ou `null`) — o diálogo decide se fecha. */
  const rodar = (acao: Acao, entrada: unknown, aoGravar?: (recusa: string | null) => void) =>
    iniciar(async () => {
      const r = await pedido.executar((justificativa) =>
        acao(justificativa ? { ...(entrada as object), justificativa } : entrada),
      );
      setResposta(r);
      aoGravar?.(r.ok ? null : r.erro);
      if (r.ok) router.refresh();
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-slot="acoes-do-arbitrado">
      {pedido.dialogo}
      {turmaId === "" && tempoDeCurriculo ? null : (
        <DialogoDeFormulario
          titulo="Definir o tempo da avaliação"
          slot="formulario-do-arbitrado"
          gatilho={
            <Button type="button" size="sm" variant="outline" data-slot="definir-tempo">
              Definir tempo
            </Button>
          }
        >
          {(fechar) => (
            <FormularioDoTempo
              tempoDeCurriculo={tempoDeCurriculo}
              turmaId={turmaId}
              gravando={gravando}
              fechar={fechar}
              gravar={(entrada, aoGravar) => rodar(definir, { itemId, ...entrada }, aoGravar)}
            />
          )}
        </DialogoDeFormulario>
      )}
      {sugestaoAConfirmar ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={gravando}
          onClick={() => rodar(confirmar, { itemId, turmaId })}
          data-slot="confirmar-sugestao"
        >
          Confirmar sugestão
        </Button>
      ) : null}
      {unidades.length > 0 ? (
        <DialogoDeFormulario
          titulo="Nomear a unidade de ensino da avaliação"
          slot="formulario-da-ue-da-avaliacao"
          gatilho={
            <Button type="button" size="sm" variant="outline" data-slot="abrir-nomear-ue">
              Nomear a UE
            </Button>
          }
        >
          {(fechar) => (
            <FormularioDaUe
              unidades={unidades}
              gravando={gravando}
              fechar={fechar}
              gravar={(ue, aoGravar) => rodar(nomear, { itemId, unidadeEnsinoId: ue }, aoGravar)}
            />
          )}
        </DialogoDeFormulario>
      ) : null}
      {resposta && !resposta.ok ? (
        <span role="alert" className="text-conflito-tinta text-xs">
          {resposta.erro}
        </span>
      ) : null}
      {resposta?.ok && resposta.aviso === "soma_acima_da_ch" ? (
        <span role="status" className="text-atrasado-tinta text-xs">
          gravado — a avaliação prevista passa da CH da disciplina
        </span>
      ) : null}
    </span>
  );
}

function FormularioDoTempo({
  tempoDeCurriculo,
  turmaId,
  gravando,
  fechar,
  gravar,
}: {
  readonly tempoDeCurriculo: boolean;
  readonly turmaId: string;
  readonly gravando: boolean;
  readonly fechar: () => void;
  readonly gravar: (entrada: object, aoGravar: (recusa: string | null) => void) => void;
}) {
  const [aplicacao, setAplicacao] = useState("");
  const [vista, setVista] = useState("");
  const [alcance, setAlcance] = useState<"curso" | "turma">(
    tempoDeCurriculo && turmaId !== "" ? "turma" : "curso",
  );
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        gravar(
          {
            alcance,
            ...(alcance === "turma" ? { turmaId } : {}),
            taAplicacao: aplicacao,
            ...(vista === "" ? {} : { taVista: vista }),
          },
          (recusa) => (recusa === null ? fechar() : setErro(recusa)),
        );
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          TA de aplicação
          <input
            type="number"
            min={0}
            required
            value={aplicacao}
            onChange={(e) => setAplicacao(e.target.value)}
            className={`${CAMPO} w-24`}
            aria-label="TA de aplicação"
          />
        </label>
        <label className="flex flex-col gap-1">
          TA de vista
          <input
            type="number"
            min={0}
            value={vista}
            onChange={(e) => setVista(e.target.value)}
            className={`${CAMPO} w-24`}
            aria-label="TA de vista"
          />
        </label>
        <label className="flex flex-col gap-1">
          Vale para
          <select
            value={alcance}
            onChange={(e) => setAlcance(e.target.value as "curso" | "turma")}
            className={CAMPO}
            aria-label="Alcance do arbitrado"
          >
            {tempoDeCurriculo ? null : <option value="curso">o curso</option>}
            {turmaId === "" ? null : <option value="turma">só esta turma</option>}
          </select>
        </label>
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-arbitrado">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormularioDaUe({
  unidades,
  gravando,
  fechar,
  gravar,
}: {
  readonly unidades: readonly { id: string; rotulo: string }[];
  readonly gravando: boolean;
  readonly fechar: () => void;
  readonly gravar: (ue: string, aoGravar: (recusa: string | null) => void) => void;
}) {
  const [ue, setUe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        gravar(ue, (recusa) => (recusa === null ? fechar() : setErro(recusa)));
      }}
    >
      <select
        value={ue}
        onChange={(e) => setUe(e.target.value)}
        className={CAMPO}
        aria-label="Unidade de ensino da avaliação"
      >
        <option value="">Escolha a UE…</option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.rotulo}
          </option>
        ))}
      </select>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando || ue === ""} data-slot="nomear-ue">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
