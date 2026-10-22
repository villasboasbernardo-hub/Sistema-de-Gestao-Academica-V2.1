/**
 * *TA fora do DSA* no detalhe da disciplina da turma — **folha de cliente** (D-COR-3; spec 017, FR-001).
 *
 * > *"TA fora do DSA, com observação (…) com quantidade, disciplina, instrutor quando houver e observação
 * > obrigatória. Esses TA somam na CH executada e no saldo, e a tela mostra separado."* — D-COR-3, Bernardo Villas
 * > Boas, 16/10/2026
 *
 * ⚠️ **A LISTA É DE QUEM LÊ LANÇAMENTO; O FORMULÁRIO, DO TRIO** (Admin, Encarregado e Ajudante da Administração
 *    Acadêmica — `ta_fora_do_dsa.editar`). Quem decide é o banco; a folha só não oferece o que seria recusado.
 * ⚠️ **SEM AJUSTE NEGATIVO E SEM EDIÇÃO**: corrigir é *Desfazer* o registro e registrar de novo. O desfeito continua
 *    listado, marcado — o rastro de quem errou é parte do registro.
 * ⚠️ **A DATA ABRE COM HOJE, O DE SÃO PAULO**, passado pelo servidor (`hojeNaCiaara()`), e o campo não aceita o
 *    futuro: o executado já aconteceu. O Zod da ação confere de novo.
 * ⚠️ **O INSTRUTOR VEM DO SELETOR ÚNICO** (`SeletorInstrutor`, `RN-ANT-01` de Risco Alto) e é opcional.
 * ⚠️ **O FORMULÁRIO ABRE NUM DIÁLOGO** (spec 022, Bloco 7, FR-002): até o Bloco 7 ele abria no detalhe da disciplina. A
 *    recusa fica no diálogo, com o que foi digitado.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { desfazerTaForaDoDsa, registrarTaForaDoDsa } from "@/lib/acoes/ta-fora-do-dsa";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { dataParaLeitura } from "@/lib/formato/data";
import { LIMITE_DA_OBSERVACAO_FORA_DO_DSA } from "@/lib/validacao/ta-fora-do-dsa";

import type { HabilitadoDaLinha } from "../../disciplinas/consulta";
import type { RegistroForaDoDsaDaTela } from "./consulta";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

type PropsDoTaFora = {
  readonly turmaCodigo: string;
  readonly turmaDisciplinaId: string;
  readonly registros: readonly RegistroForaDoDsaDaTela[];
  /** Os instrutores atribuídos e habilitados da linha — o seletor único os reordena pela antiguidade. */
  readonly instrutores: readonly HabilitadoDaLinha[];
  readonly escala: EscalaDeAntiguidade;
  readonly podeGravar: boolean;
  readonly hoje: string;
};

export function TaForaDoDsa(props: PropsDoTaFora) {
  const { turmaCodigo, registros, podeGravar } = props;
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();

  function desfazer(codigo: string) {
    iniciar(async () => {
      definirErro(null);
      const resultado = await desfazerTaForaDoDsa({ turmaCodigo, codigo });
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      router.replace(resultado.destino);
    });
  }

  return (
    <section className="flex flex-col gap-2" data-slot="ta-fora-do-dsa">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-texto text-sm font-semibold">TA fora do DSA</h3>
        {podeGravar ? (
          <DialogoDeFormulario
            titulo="Registrar TA fora do DSA"
            largo
            slot="dialogo-ta-fora"
            gatilho={
              <BotaoDeIcone
                acao="registrar"
                rotulo="Registrar TA fora do DSA"
                data-slot="registrar-ta-fora"
              />
            }
          >
            {(fechar) => <FormularioDoTaFora {...props} fechar={fechar} />}
          </DialogoDeFormulario>
        ) : null}
      </div>

      {registros.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-ta-fora">
          Nenhum TA registrado fora do DSA nesta disciplina.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {registros.map((r) => (
            <li
              key={r.codigo}
              className="border-borda flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-1"
              data-slot="registro-fora-do-dsa"
              data-ativo={r.ativo ? "sim" : "nao"}
            >
              <span className={r.ativo ? "text-texto" : "text-texto-suave line-through"}>
                {dataParaLeitura(r.data)} · {r.tempos} TA
                {r.instrutor ? ` · ${r.instrutor}` : ""}
              </span>
              <span className="text-texto-suave">{r.observacao}</span>
              <span className="text-texto-suave text-xs">registrado por {r.autor}</span>
              {r.ativo ? (
                podeGravar ? (
                  <BotaoDeIcone
                    acao="desfazer"
                    rotulo="Desfazer"
                    variante="fantasma"
                    disabled={gravando}
                    onClick={() => desfazer(r.codigo)}
                    data-slot="desfazer-ta-fora"
                  />
                ) : null
              ) : (
                <span className="text-atrasado-tinta text-xs" data-slot="ta-fora-desfeito">
                  desfeito
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-ta-fora">
          {erro}
        </p>
      ) : null}
    </section>
  );
}

function FormularioDoTaFora({
  turmaCodigo,
  turmaDisciplinaId,
  instrutores,
  escala,
  hoje,
  fechar,
}: PropsDoTaFora & { readonly fechar: () => void }) {
  const router = useRouter();
  const [instrutorId, definirInstrutorId] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();

  function gravar(formulario: FormData) {
    iniciar(async () => {
      definirErro(null);
      const resultado = await registrarTaForaDoDsa({
        turmaCodigo,
        turmaDisciplinaId,
        data: formulario.get("data"),
        tempos: formulario.get("tempos"),
        instrutorId,
        observacao: formulario.get("observacao"),
      });
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      fechar();
      router.replace(resultado.destino);
    });
  }

  return (
    <form action={gravar} className="flex flex-col gap-3" data-slot="formulario-ta-fora">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`ta-fora-tempos-${turmaDisciplinaId}`}>Quantos TA</Label>
          <Input
            id={`ta-fora-tempos-${turmaDisciplinaId}`}
            name="tempos"
            type="number"
            min={1}
            step={1}
            required
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`ta-fora-data-${turmaDisciplinaId}`}>Data</Label>
          <Input
            id={`ta-fora-data-${turmaDisciplinaId}`}
            name="data"
            type="date"
            defaultValue={hoje}
            max={hoje}
            required
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-texto text-sm font-medium">Instrutor (opcional)</span>
          <div className="flex items-center gap-2">
            <SeletorInstrutor
              instrutores={instrutores.map((h) => ({
                id: h.instrutorId,
                pg: h.pg,
                especialidade: h.especialidade,
                nomeCompleto: h.nomeCompleto,
                nomeDeGuerra: h.nomeDeGuerra,
              }))}
              escala={escala}
              valor={instrutorId}
              aoMudar={definirInstrutorId}
              rotulo="Instrutor do TA fora do DSA"
              className="w-72"
            />
            {instrutorId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => definirInstrutorId("")}
              >
                Sem instrutor
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`ta-fora-observacao-${turmaDisciplinaId}`}>Observação</Label>
        <textarea
          id={`ta-fora-observacao-${turmaDisciplinaId}`}
          name="observacao"
          rows={2}
          maxLength={LIMITE_DA_OBSERVACAO_FORA_DO_DSA}
          className={CAMPO}
        />
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-ta-fora">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" size="sm" variant="ghost" disabled={gravando} onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-ta-fora">
          {gravando ? "Gravando…" : "Gravar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
