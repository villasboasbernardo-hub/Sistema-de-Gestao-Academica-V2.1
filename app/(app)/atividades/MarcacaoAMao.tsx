/**
 * A marcação À MÃO — *Registrar cumprimento* e *Desfazer* — da AEC prevista e da APOINST: **folha de cliente**
 * (Bloco 18, spec 033, RA-5 e RA-6; FR-005.2).
 *
 * > *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (…) OU marcada à mão pelo trio
 * > (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha, como os ajustes de avaliação do Bloco 16."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **EM DIÁLOGO** (RT-3): o gatilho é o ícone (`registrar` ou `desfazer`, a dica é só o verbo — RT-1); a justificativa
 *    (10 a 1.000) é obrigatória nos dois, e a data só no *Registrar* (opcional, nunca no futuro). A recusa fica no
 *    diálogo, com o que foi digitado.
 * ⚠️ **SÓ PARA QUEM PODE**: quem chama só desenha este componente para o trio (`planejamento_de_atividades.editar`)
 *    e com a turma fora do arquivo — o banco decide de qualquer jeito.
 * ⚠️ **NÃO MUDA CH**: o diálogo diz isso.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarMarcacao } from "@/lib/acoes/marcacoes-de-atividade";
import {
  MAXIMO_DA_JUSTIFICATIVA_DA_MARCACAO,
  MINIMO_DA_JUSTIFICATIVA_DA_MARCACAO,
} from "@/lib/validacao/marcacao-de-atividade";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export type AlvoDaMarcacao =
  | { readonly atividadePrevistaId: string; readonly apoinstId?: undefined }
  | { readonly apoinstId: string; readonly atividadePrevistaId?: undefined };

export type GravacaoDaMarcacao = "marcacao" | "marcacao-desfeita";

export function MarcacaoAMao({
  turmaId,
  alvo,
  nome,
  desfazer,
  rotuloDoCumprido,
  hoje,
  aoGravar,
}: {
  readonly turmaId: string;
  readonly alvo: AlvoDaMarcacao;
  /** O nome da AEC prevista ou da APOINST — vai no nome acessível do ícone e no título do diálogo. */
  readonly nome: string;
  /** `true` = a marcação à mão vale e o ícone a desfaz; `false` = o ícone registra. */
  readonly desfazer: boolean;
  /** «cumprida» (AEC prevista) ou «concluída» (APOINST). */
  readonly rotuloDoCumprido: string;
  readonly hoje: string;
  readonly aoGravar: (oQue: GravacaoDaMarcacao) => void;
}) {
  const titulo = desfazer
    ? `Desfazer a marcação de ${nome}`
    : `Registrar ${rotuloDoCumprido === "concluída" ? "conclusão" : "cumprimento"} de ${nome}`;
  return (
    <DialogoDeFormulario
      titulo={titulo}
      descricao={
        desfazer
          ? `A linha volta ao que os lançamentos do DSA dizem. A marcação continua no histórico.`
          : `Marca a linha como ${rotuloDoCumprido} à mão, com a justificativa no histórico. Não muda a carga horária.`
      }
      slot={desfazer ? "dialogo-de-desfazer-marcacao" : "dialogo-de-marcacao"}
      gatilho={
        <BotaoDeIcone
          acao={desfazer ? "desfazer" : "registrar"}
          rotulo={titulo}
          variante="fantasma"
          data-slot={desfazer ? "desfazer-marcacao" : "registrar-marcacao"}
        />
      }
    >
      {(fechar) => (
        <FormularioDaMarcacao
          turmaId={turmaId}
          alvo={alvo}
          desfazer={desfazer}
          hoje={hoje}
          fechar={fechar}
          aoGravar={aoGravar}
        />
      )}
    </DialogoDeFormulario>
  );
}

function FormularioDaMarcacao({
  turmaId,
  alvo,
  desfazer,
  hoje,
  fechar,
  aoGravar,
}: {
  readonly turmaId: string;
  readonly alvo: AlvoDaMarcacao;
  readonly desfazer: boolean;
  readonly hoje: string;
  readonly fechar: () => void;
  readonly aoGravar: (oQue: GravacaoDaMarcacao) => void;
}) {
  const id = React.useId();
  const [justificativa, definirJustificativa] = React.useState("");
  const [data, definirData] = React.useState("");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();

  function gravar(evento: React.FormEvent): void {
    evento.preventDefault();
    iniciar(async () => {
      definirRecusa(null);
      const resposta = await registrarMarcacao({
        turmaId,
        atividadePrevistaId: alvo.atividadePrevistaId ?? null,
        apoinstId: alvo.apoinstId ?? null,
        situacao: desfazer ? "a_cumprir" : "cumprida",
        dataRealizada: desfazer || data === "" ? null : data,
        justificativa,
      });
      if (!resposta.ok) {
        definirRecusa(resposta.erro);
        return;
      }
      fechar();
      aoGravar(desfazer ? "marcacao-desfeita" : "marcacao");
    });
  }

  return (
    <form onSubmit={gravar} className="flex flex-col gap-3" data-slot="formulario-da-marcacao">
      {desfazer ? null : (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-data`}>Data em que aconteceu (opcional)</Label>
          <Input
            id={`${id}-data`}
            type="date"
            value={data}
            max={hoje}
            onChange={(e) => definirData(e.target.value)}
            className="w-44"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-justificativa`}>
          Justificativa (ao menos {MINIMO_DA_JUSTIFICATIVA_DA_MARCACAO} caracteres)
        </Label>
        <textarea
          id={`${id}-justificativa`}
          required
          minLength={MINIMO_DA_JUSTIFICATIVA_DA_MARCACAO}
          maxLength={MAXIMO_DA_JUSTIFICATIVA_DA_MARCACAO}
          rows={3}
          value={justificativa}
          onChange={(e) => definirJustificativa(e.target.value)}
          className={CAMPO}
          data-slot="justificativa-da-marcacao"
        />
      </div>
      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-marcacao">
          {recusa}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" size="sm" variant="ghost" disabled={gravando} onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-marcacao">
          {gravando ? "Gravando…" : desfazer ? "Desfazer" : "Registrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
