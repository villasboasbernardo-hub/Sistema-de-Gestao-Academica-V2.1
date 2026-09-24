/**
 * O formulário de turma — **folha de cliente**, nos modos `novo` e `edicao` (`FR-025`, `FR-026.1`,
 * `FR-028`, `FR-029.4`).
 *
 * ⚠️ **NÃO HÁ CAMPO DE CÓDIGO** (`FR-025.1`): ele é carimbado pelo gatilho, e o banco recusa valor
 * divergente. Um campo aqui convidaria alguém a digitá-lo.
 *
 * ⚠️ **ANO, SITUAÇÃO E MODALIDADE ABREM SEM PADRÃO** (`FR-015.1`) — no modo `novo`. Valor que ninguém
 * escolheu é indistinguível de escolha real.
 *
 * ⚠️ **A SALA ATUAL APARECE MESMO DESATIVADA** (`FR-029.4`), e quem decide isso é
 * `lib/dominio/salas.ts`. Sem essa metade, editar o efetivo de uma turma cuja sala foi desativada
 * apagaria a sala sem ninguém pedir.
 *
 * ⚠️ **A NOTA DA SEGUNDA TURMA É NOTA, NÃO DIÁLOGO** (`FR-026.1`): ela aparece junto do campo de
 * rótulo e não confirma nada. Quem confirma são as duas gravações da lista fechada do `FR-018.1` — o
 * limite e a proteção de vigência —, **num diálogo só**.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarTurma, editarTurma } from "@/lib/acoes/turma";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import { passaDoLimite, type TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import {
  linhasDaProtecaoPerdida,
  vigenciasQuePerdemProtecao,
  type JanelaDeTurma,
  type VigenciaProtegida,
} from "@/lib/dominio/protecao-de-vigencia";
import { naturezaDaSala, ROTULO_DA_NATUREZA, type Sala } from "@/lib/dominio/salas";

const MODALIDADES = [
  { valor: "presencial", rotulo: "Presencial" },
  { valor: "ead", rotulo: "EAD" },
  { valor: "semipresencial", rotulo: "Semipresencial" },
] as const;

const SITUACOES = [
  { valor: "planejada", rotulo: "Planejada" },
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "concluida", rotulo: "Concluída" },
  { valor: "cancelada", rotulo: "Cancelada" },
] as const;

export type TurmaNoFormulario = {
  readonly ano_letivo: string;
  readonly status: string;
  readonly modalidade: string;
  readonly turma: string;
  readonly data_inicio: string;
  readonly data_termino: string;
  readonly sala_alocada: string;
  readonly alunos: string;
};

const VAZIO: TurmaNoFormulario = {
  ano_letivo: "",
  status: "",
  modalidade: "",
  turma: "",
  data_inicio: "",
  data_termino: "",
  sala_alocada: "",
  alunos: "",
};

export type FormularioDeTurmaProps = {
  readonly modo: "novo" | "edicao";
  /** No modo `novo`, o curso vem do caminho. Na edição, é o curso atual da turma. */
  readonly cursoId: string;
  readonly codigoAtual?: string;
  readonly inicial?: TurmaNoFormulario;
  readonly salas: readonly Sala[];
  /** As turmas do curso, para o limite e para a nota do rótulo. */
  readonly turmasDoCurso: readonly TurmaParaLimite[];
  readonly limiteDoCurso: number | null;
  /** A turma sem rótulo que já existe no ano — a nota do `FR-026.1`. */
  readonly semRotuloNoAno?: readonly { readonly ano: number; readonly codigo: string }[];
  /** O retrato da RPC de proteção, para o aviso do `FR-021.8`. */
  readonly vigenciasProtegidas?: readonly VigenciaProtegida[];
  readonly janelasDoCurso?: readonly JanelaDeTurma[];
};

export function FormularioDeTurma({
  modo,
  cursoId,
  codigoAtual,
  inicial,
  salas,
  turmasDoCurso,
  limiteDoCurso,
  semRotuloNoAno = [],
  vigenciasProtegidas = [],
  janelasDoCurso = [],
}: FormularioDeTurmaProps) {
  const router = useRouter();
  const [valores, definirValores] = React.useState<TurmaNoFormulario>(inicial ?? VAZIO);
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  const trocar =
    (campo: keyof TurmaNoFormulario) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      definirValores((v) => ({ ...v, [campo]: e.target.value }));

  const nulo = (v: string) => (v.trim() === "" ? null : v.trim());
  const ano = valores.ano_letivo.trim() === "" ? NaN : Number(valores.ano_letivo);

  const corpo = {
    ano_letivo: valores.ano_letivo === "" ? undefined : Number(valores.ano_letivo),
    status: valores.status,
    modalidade: valores.modalidade,
    turma: valores.turma,
    data_inicio: valores.data_inicio,
    data_termino: valores.data_termino,
    sala_alocada: valores.sala_alocada,
    alunos: valores.alunos === "" ? undefined : Number(valores.alunos),
  };

  /*
   * ⚠️ `turmasDoCurso` JÁ CHEGA SEM A TURMA EDITADA — quem a exclui é a página, que sabe qual é.
   *    Contá-la aqui faria salvar uma turma sem mexer no ano acusar o próprio lugar dela como
   *    excesso, e o diálogo apareceria em toda gravação.
   */
  const acimaDoLimite =
    Number.isNaN(ano) || valores.status === ""
      ? null
      : passaDoLimite(turmasDoCurso, ano, limiteDoCurso);

  const perdidas = vigenciasQuePerdemProtecao(vigenciasProtegidas, janelasDoCurso, {
    codigo: codigoAtual ?? "(nova)",
    janelaNova: { dataInicio: nulo(valores.data_inicio), dataTermino: nulo(valores.data_termino) },
  });

  const confirmacao = confirmacaoDaGravacao(modo === "novo" ? "criar_turma" : "editar_turma", {
    ...(acimaDoLimite ? { anosAcimaDoLimite: [acimaDoLimite] } : {}),
    /*
     * ⚠️ **AS LINHAS, NÃO A FRASE.** Quem escreve *"Com esta janela, deixam de estar
     *    protegidas: …"* é `confirmacao-de-gravacao.ts`; mandar-lhe a frase pronta a aninhava e o
     *    diálogo saía com o texto duas vezes.
     */
    ...(perdidas.length > 0 ? { vigenciasDesprotegidas: linhasDaProtecaoPerdida(perdidas) } : {}),
  });

  /** A nota do `FR-026.1`: já há turma sem rótulo neste ano. */
  const notaDoRotulo = semRotuloNoAno.find((t) => t.ano === ano && valores.turma.trim() === "");

  async function gravar() {
    definirGravando(true);
    definirErro(null);
    const resultado =
      modo === "novo"
        ? await criarTurma(cursoId, corpo)
        : await editarTurma(codigoAtual ?? "", corpo);
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.push(resultado.destino);
  }

  const botaoGravar = (
    <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-turma">
      {modo === "novo" ? "Criar turma" : "Salvar alterações"}
    </Button>
  );

  return (
    <form
      data-slot="formulario-de-turma"
      data-modo={modo}
      className="flex max-w-3xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmacao.confirma) void gravar();
      }}
    >
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-do-formulario">
          {erro}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-ano" rotulo="Ano letivo" obrigatorio />
          <Input
            {...propsDoControle("turma-ano", true)}
            name="ano_letivo"
            inputMode="numeric"
            value={valores.ano_letivo}
            onChange={trocar("ano_letivo")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-situacao" rotulo="Situação" obrigatorio />
          <select
            {...propsDoControle("turma-situacao", true)}
            name="status"
            value={valores.status}
            onChange={trocar("status")}
            className="border-borda bg-superficie-1 text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Escolha a situação</option>
            {SITUACOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-modalidade" rotulo="Modalidade" obrigatorio />
          <select
            {...propsDoControle("turma-modalidade", true)}
            name="modalidade"
            value={valores.modalidade}
            onChange={trocar("modalidade")}
            className="border-borda bg-superficie-1 text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Escolha a modalidade</option>
            {MODALIDADES.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-rotulo" rotulo="Rótulo (T1, T2…)" />
          <Input
            {...propsDoControle("turma-rotulo", false)}
            name="turma"
            value={valores.turma}
            onChange={trocar("turma")}
            placeholder="deixe vazio na turma única"
          />
          {notaDoRotulo ? (
            /* veste: a nota do FR-026.1, ao lado do campo — nota, nunca diálogo */
            <p className="text-texto-tenue text-xs" data-slot="nota-do-rotulo">
              A turma {notaDoRotulo.codigo} está sem rótulo. Dê rótulo a esta (T2, por exemplo); a
              outra pode ser editada para T1 — o código dela não muda.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-inicio" rotulo="Início" />
          <Input
            {...propsDoControle("turma-inicio", false)}
            name="data_inicio"
            type="date"
            value={valores.data_inicio}
            onChange={trocar("data_inicio")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-termino" rotulo="Término" />
          <Input
            {...propsDoControle("turma-termino", false)}
            name="data_termino"
            type="date"
            value={valores.data_termino}
            onChange={trocar("data_termino")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-sala" rotulo="Sala" />
          <select
            {...propsDoControle("turma-sala", false)}
            name="sala_alocada"
            value={valores.sala_alocada}
            onChange={trocar("sala_alocada")}
            className="border-borda bg-superficie-1 text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Sem sala</option>
            {salas.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.valor} — {ROTULO_DA_NATUREZA[naturezaDaSala(s)]}
                {s.ativo ? "" : " (desativada)"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-alunos" rotulo="Efetivo" />
          <Input
            {...propsDoControle("turma-alunos", false)}
            name="alunos"
            inputMode="numeric"
            value={valores.alunos}
            onChange={trocar("alunos")}
          />
        </div>
      </div>

      <div data-slot="rodape-do-formulario">
        {confirmacao.confirma ? (
          <DialogoConfirmacao
            titulo={confirmacao.titulo}
            consequencia={confirmacao.mensagens.join(" ")}
            rotuloConfirmar={confirmacao.rotuloConfirmar}
            aoConfirmar={() => void gravar()}
          >
            {botaoGravar}
          </DialogoConfirmacao>
        ) : (
          botaoGravar
        )}
      </div>
    </form>
  );
}
