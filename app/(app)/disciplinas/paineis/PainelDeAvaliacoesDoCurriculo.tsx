/**
 * As avaliações do currículo da disciplina, no cadastro (spec 014, FR-038, T183).
 *
 * ⚠️ **SEM MARCADOR PRÓPRIO**: o painel vive abaixo de `GradeDeDisciplinas.tsx`, que é a folha de cliente.
 * ⚠️ **A MESMA PERMISSÃO DAS UEs** (`disciplinas.editar`): sem ela, só a lista. O banco recusa de qualquer forma.
 * ⚠️ **INATIVA CONTINUA NA LISTA** (regra 4), com *Reativar* — sumir da tela seria exclusão com outro nome.
 * ⚠️ **PASSAR DA CH É AVISO** (FR-031, `RN-DEG-02`): grava e avisa.
 * ⚠️ O tempo vazio é *«tempo de avaliação não definido»* — o mesmo texto da ficha da turma.
 * ⚠️ **ABRE EM LEITURA desde 17/10/2026** (spec 016, FR-010.3; Q-13): cada item é texto, com **Editar**
 * abrindo os campos só daquele item, e a avaliação nova fica atrás de um botão — o padrão das UEs
 * (FR-007.1). Qual item está aberto é estado efêmero, e mora no componente.
 */
import * as React from "react";

import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mudarSituacaoDoItem, salvarItemDoCurriculo } from "@/lib/acoes/itens-do-curriculo";

import type { ItemDoCurriculoDaLinha } from "../consulta";

const INSTRUMENTOS = ["PE", "PM", "PP", "PO", "PD", "TG", "TI", "EC", "PJ", "MN", "OD"] as const;

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
  /** O item cujos campos estão abertos — um por vez. */
  const [editando, setEditando] = React.useState<string | null>(null);
  const [acrescentando, setAcrescentando] = React.useState(false);

  /* Spec 021 (RC-6): no currículo em uso, a correção pede justificativa — e só o banco sabe quando. */
  const pedido = usePedidoDeJustificativa();

  async function executar(
    acao: (j: { justificativa?: string }) => Promise<{
      ok: boolean;
      erro?: string;
      aviso?: string;
      pedeJustificativa?: true | undefined;
    }>,
    feito: string,
  ): Promise<boolean> {
    setErro(null);
    setMensagem(null);
    setOcupado(true);
    const r = await pedido.executar((justificativa) =>
      acao(justificativa ? { justificativa } : {}),
    );
    if (r.ok) {
      setMensagem(
        r.aviso === "soma_acima_da_ch"
          ? `${feito} A avaliação prevista passa da CH da disciplina.`
          : feito,
      );
    } else setErro(r.erro ?? "Não foi possível concluir.");
    setOcupado(false);
    return r.ok;
  }

  const vazio = (n: FormDataEntryValue | null) => (n === null || n === "" ? undefined : String(n));

  return (
    <section
      className="flex flex-col gap-2"
      aria-labelledby={`avc-${disciplinaId}`}
      data-slot="avaliacoes-do-curriculo"
    >
      {pedido.dialogo}
      <h3 id={`avc-${disciplinaId}`} className="text-texto text-sm font-semibold">
        Avaliações do currículo
      </h3>
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
              {podeEditar && editando === i.id ? (
                <form
                  className="inline-flex items-center gap-1 text-xs"
                  data-slot="formulario-do-item"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void executar(
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
                    ).then((ok) => {
                      if (ok) setEditando(null);
                    });
                  }}
                >
                  <Input
                    name="aplicacao"
                    type="number"
                    min={0}
                    defaultValue={i.taAplicacao ?? ""}
                    aria-label={`TA de aplicação de ${i.rotulo}`}
                    className="h-7 w-16"
                  />
                  <Input
                    name="vista"
                    type="number"
                    min={0}
                    defaultValue={i.taVista ?? ""}
                    aria-label={`TA de vista de ${i.rotulo}`}
                    className="h-7 w-16"
                  />
                  <Button type="submit" size="sm" disabled={ocupado} data-slot="gravar-item">
                    Gravar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={ocupado}
                    onClick={() => setEditando(null)}
                  >
                    Cancelar
                  </Button>
                </form>
              ) : null}
              {podeEditar && editando !== i.id ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={ocupado}
                  data-slot="editar-avaliacao-do-curriculo"
                  aria-label={`Editar ${i.rotulo}`}
                  onClick={() => {
                    setAcrescentando(false);
                    setEditando(i.id);
                  }}
                >
                  Editar
                </Button>
              ) : null}
              {podeEditar ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={ocupado}
                  data-acao={i.ativo ? "inativar-item" : "reativar-item"}
                  onClick={() =>
                    void executar(
                      (j) => mudarSituacaoDoItem({ ...j, itemId: i.id, ativo: !i.ativo }),
                      i.ativo ? `${i.rotulo} inativada.` : `${i.rotulo} reativada.`,
                    )
                  }
                >
                  {i.ativo ? "Inativar" : "Reativar"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && !acrescentando ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={ocupado}
            data-slot="acrescentar-avaliacao-do-curriculo"
            onClick={() => {
              setEditando(null);
              setAcrescentando(true);
            }}
          >
            Acrescentar avaliação
          </Button>
        </div>
      ) : null}

      {podeEditar && acrescentando ? (
        <form
          className="flex flex-wrap items-end gap-2 text-sm"
          data-slot="nova-avaliacao-do-curriculo"
          onSubmit={(e) => {
            e.preventDefault();
            const formulario = e.currentTarget;
            const f = new FormData(formulario);
            void executar(
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
            ).then((ok) => {
              if (ok) setAcrescentando(false);
            });
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={`avc-inst-${disciplinaId}`}>Instrumento</Label>
            <select
              id={`avc-inst-${disciplinaId}`}
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
          <div className="flex flex-col gap-1">
            <Label htmlFor={`avc-ta-${disciplinaId}`}>TA de aplicação</Label>
            <Input
              id={`avc-ta-${disciplinaId}`}
              name="aplicacao"
              type="number"
              min={0}
              className="w-20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`avc-vista-${disciplinaId}`}>TA de vista</Label>
            <Input
              id={`avc-vista-${disciplinaId}`}
              name="vista"
              type="number"
              min={0}
              className="w-20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`avc-arq-${disciplinaId}`}>Arquivo do currículo</Label>
            <Input id={`avc-arq-${disciplinaId}`} name="arquivo" required className="w-56" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`avc-pag-${disciplinaId}`}>Página</Label>
            <Input
              id={`avc-pag-${disciplinaId}`}
              name="pagina"
              type="number"
              min={1}
              required
              className="w-20"
            />
          </div>
          <Button type="submit" size="sm" disabled={ocupado}>
            Acrescentar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={ocupado}
            onClick={() => setAcrescentando(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : null}

      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
    </section>
  );
}
