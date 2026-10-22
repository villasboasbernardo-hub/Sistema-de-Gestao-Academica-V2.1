/**
 * As avaliações do currículo da disciplina, no cadastro (spec 014, FR-038, T183).
 *
 * ⚠️ **SEM MARCADOR PRÓPRIO**: o painel vive abaixo de uma folha de cliente (a grade, ou a página da disciplina).
 * ⚠️ **A MESMA PERMISSÃO DAS UEs** (`disciplinas.editar`): sem ela, só a lista. O banco recusa de qualquer forma.
 * ⚠️ **INATIVA CONTINUA NA LISTA** (regra 4), com *Reativar* — sumir da tela seria exclusão com outro nome.
 * ⚠️ **PASSAR DA CH É AVISO** (FR-031, `RN-DEG-02`): grava e avisa.
 * ⚠️ O tempo vazio é *«tempo de avaliação não definido»* — o mesmo texto da ficha da turma.
 * ⚠️ **LEITURA, E A EDIÇÃO EM DIÁLOGO** (spec 022, Bloco 7, FR-002; pedido de Bernardo Villas Boas, 22/10/2026:
 * *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime)"*). Até o Bloco 7, *Editar* abria os
 * campos do item no lugar dele (spec 016, FR-010.3). Gravar fecha o diálogo; a recusa fica nele.
 */
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mudarSituacaoDoItem, salvarItemDoCurriculo } from "@/lib/acoes/itens-do-curriculo";

import type { ItemDoCurriculoDaLinha } from "../consulta";

const INSTRUMENTOS = ["PE", "PM", "PP", "PO", "PD", "TG", "TI", "EC", "PJ", "MN", "OD"] as const;

type Resultado = {
  ok: boolean;
  erro?: string;
  aviso?: string;
  pedeJustificativa?: true | undefined;
};

/** O formulário de um item, dentro do diálogo: a recusa fica nele, com o que foi digitado. */
function FormularioDoItem({
  id,
  item,
  gravar,
  fechar,
}: {
  readonly id: string;
  /** Ausente = avaliação nova. */
  readonly item?: ItemDoCurriculoDaLinha;
  readonly gravar: (dados: FormData) => Promise<string | null>;
  readonly fechar: () => void;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [gravando, setGravando] = React.useState(false);

  async function enviar(dados: FormData) {
    setErro(null);
    setGravando(true);
    const recusa = await gravar(dados);
    setGravando(false);
    if (recusa === null) fechar();
    else setErro(recusa);
  }

  return (
    <form
      action={enviar}
      className="flex flex-col gap-3 text-sm"
      data-slot={item ? "formulario-do-item" : "nova-avaliacao-do-curriculo"}
    >
      <div className="flex flex-wrap items-end gap-3">
        {item ? null : (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`avc-inst-${id}`}>Instrumento</Label>
            <select
              id={`avc-inst-${id}`}
              name="instrumento"
              className="border-borda bg-superficie rounded-ciaara h-8 border px-2"
            >
              {INSTRUMENTOS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor={`avc-ta-${id}`}>TA de aplicação</Label>
          <Input
            id={`avc-ta-${id}`}
            name="aplicacao"
            type="number"
            min={0}
            defaultValue={item?.taAplicacao ?? ""}
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`avc-vista-${id}`}>TA de vista</Label>
          <Input
            id={`avc-vista-${id}`}
            name="vista"
            type="number"
            min={0}
            defaultValue={item?.taVista ?? ""}
            className="w-24"
          />
        </div>
        {item ? null : (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`avc-arq-${id}`}>Arquivo do currículo</Label>
              <Input id={`avc-arq-${id}`} name="arquivo" required className="w-56" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`avc-pag-${id}`}>Página</Label>
              <Input
                id={`avc-pag-${id}`}
                name="pagina"
                type="number"
                min={1}
                required
                className="w-20"
              />
            </div>
          </>
        )}
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-do-item">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={gravando}
          data-slot={item ? "gravar-item" : "gravar-avaliacao-nova"}
        >
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PainelDeAvaliacoesDoCurriculo({
  disciplinaId,
  itens,
  podeEditar,
}: {
  readonly disciplinaId: string;
  readonly itens: readonly ItemDoCurriculoDaLinha[];
  readonly podeEditar: boolean;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);

  /* Spec 021 (RC-6): no currículo em uso, a correção pede justificativa — e só o banco sabe quando. */
  const pedido = usePedidoDeJustificativa();

  /** Executa; devolve a recusa (ou `null`). A mensagem de sucesso fica abaixo da lista. */
  async function executar(
    acao: (j: { justificativa?: string }) => Promise<Resultado>,
    feito: string,
  ): Promise<string | null> {
    setErro(null);
    setMensagem(null);
    setOcupado(true);
    const r = await pedido.executar((justificativa) =>
      acao(justificativa ? { justificativa } : {}),
    );
    setOcupado(false);
    if (r.ok) {
      setMensagem(
        r.aviso === "soma_acima_da_ch"
          ? `${feito} A avaliação prevista passa da CH da disciplina.`
          : feito,
      );
      return null;
    }
    return r.erro ?? "Não foi possível concluir.";
  }

  const vazio = (n: FormDataEntryValue | null) => (n === null || n === "" ? undefined : String(n));

  return (
    <section
      className="flex flex-col gap-2"
      aria-labelledby={`avc-${disciplinaId}`}
      data-slot="avaliacoes-do-curriculo"
    >
      {pedido.dialogo}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`avc-${disciplinaId}`} className="text-texto text-sm font-semibold">
          Avaliações do currículo
        </h3>
        {podeEditar ? (
          <DialogoDeFormulario
            titulo="Acrescentar avaliação do currículo"
            slot="dialogo-do-item"
            largo
            gatilho={
              <BotaoDeIcone
                acao="acrescentar"
                rotulo="Acrescentar avaliação"
                disabled={ocupado}
                data-slot="acrescentar-avaliacao-do-curriculo"
              />
            }
          >
            {(fechar) => (
              <FormularioDoItem
                id={`nova-${disciplinaId}`}
                fechar={fechar}
                gravar={(f) =>
                  executar(
                    (j) =>
                      salvarItemDoCurriculo({
                        ...j,
                        disciplinaId,
                        instrumento: String(f.get("instrumento") ?? ""),
                        taAplicacao: vazio(f.get("aplicacao")),
                        taVista: vazio(f.get("vista")),
                        fonteArquivo: vazio(f.get("arquivo")),
                        fontePagina: vazio(f.get("pagina")),
                      }),
                    "Avaliação do currículo acrescentada.",
                  )
                }
              />
            )}
          </DialogoDeFormulario>
        ) : null}
      </div>
      {itens.length === 0 ? (
        <p className="text-texto-suave text-sm">Nenhuma avaliação transcrita do currículo.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {itens.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-2"
              data-item-do-curriculo={i.rotulo}
              data-ativo={i.ativo}
            >
              <span
                className={i.ativo ? "text-texto font-medium" : "text-texto-suave line-through"}
              >
                {i.rotulo}
              </span>
              <span className="text-texto-suave text-xs">
                {i.taAplicacao === null
                  ? "tempo de avaliação não definido"
                  : `${i.taAplicacao} TA${i.taVista ? ` + vista ${i.taVista} TA` : ""}`}
                {i.origemItem === "arbitrado" ? " · arbitrado pela Divisão" : ""}
                {i.ativo ? "" : " · inativa"}
              </span>
              {podeEditar ? (
                <span className="ml-auto flex items-center gap-1">
                  <DialogoDeFormulario
                    titulo={`Editar ${i.rotulo}`}
                    slot="dialogo-do-item"
                    gatilho={
                      <BotaoDeIcone
                        acao="editar"
                        rotulo={`Editar ${i.rotulo}`}
                        disabled={ocupado}
                        data-slot="editar-avaliacao-do-curriculo"
                      />
                    }
                  >
                    {(fechar) => (
                      <FormularioDoItem
                        id={i.id}
                        item={i}
                        fechar={fechar}
                        gravar={(f) =>
                          executar(
                            (j) =>
                              salvarItemDoCurriculo({
                                ...j,
                                itemId: i.id,
                                disciplinaId,
                                instrumento: i.instrumento,
                                taAplicacao: vazio(f.get("aplicacao")),
                                taVista: vazio(f.get("vista")),
                              }),
                            `${i.rotulo} gravada.`,
                          )
                        }
                      />
                    )}
                  </DialogoDeFormulario>
                  <BotaoDeIcone
                    acao={i.ativo ? "desativar" : "reativar"}
                    rotulo={`${i.ativo ? "Inativar" : "Reativar"} ${i.rotulo}`}
                    variante="fantasma"
                    disabled={ocupado}
                    data-acao={i.ativo ? "inativar-item" : "reativar-item"}
                    onClick={() =>
                      void executar(
                        (j) => mudarSituacaoDoItem({ ...j, itemId: i.id, ativo: !i.ativo }),
                        i.ativo ? `${i.rotulo} inativada.` : `${i.rotulo} reativada.`,
                      ).then((recusa) => setErro(recusa))
                    }
                  />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm" data-slot="resposta-dos-itens">
          {mensagem}
        </p>
      ) : null}
    </section>
  );
}
