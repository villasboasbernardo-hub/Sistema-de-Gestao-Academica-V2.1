/**
 * O formulário de curso — **folha de cliente**, nos modos `novo` e `edicao` (`FR-013`, `FR-015`,
 * `FR-019.1`, `FR-022`, `FR-048`).
 *
 * ⚠️ **NENHUM CAMPO NASCE ESCOLHIDO** (`FR-015.1`). Classificação e modalidade abrem **sem opção
 * marcada**: *"valor gravado que ninguém escolheu é indistinguível de escolha real — é pior que
 * nulo"*. O nulo o quadro de avisos detecta; o padrão silencioso some para sempre.
 *
 * ⚠️ **O REGIME SÓ APARECE NO MODO `novo`** (`FR-019.5`): curso e vigência `padrao` nascem juntos, e
 * o banco recusa no `COMMIT` quem os separar. Na edição, vigência se registra e se corrige noutro
 * lugar da mesma página (`FR-013.1`) — o formulário de curso não a toca.
 *
 * ⚠️ **A CONFIRMAÇÃO É DA LISTA FECHADA DO `FR-018.1`**, e quem a decide é
 * `lib/dominio/confirmacao-de-gravacao.ts`. Editar o propósito grava **sem** diálogo; trocar a sigla,
 * a classificação ou baixar o limite abre **um** diálogo com todas as mensagens que couberem.
 *
 * ⚠️ **NENHUM CAMPO DE CARGA HORÁRIA** (`FR-045`). A grandeza é view; não há onde gravá-la.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarCurso, editarCurso } from "@/lib/acoes/curso";
import {
  CLASSIFICACOES_DE_CURSO,
  ROTULO_DA_CLASSIFICACAO,
} from "@/lib/dominio/classificacoes-de-curso";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import type { AnoAcimaDoLimite } from "@/lib/dominio/limite-de-turmas";

const MODALIDADES = [
  { valor: "presencial", rotulo: "Presencial" },
  { valor: "ead", rotulo: "EAD" },
  { valor: "semipresencial", rotulo: "Semipresencial" },
] as const;

export type CursoNoFormulario = {
  readonly codigo: string;
  readonly nome_curso: string;
  readonly classificacao: string;
  readonly modalidade: string;
  readonly duracao_dias: string;
  readonly duracao_semanas: string;
  readonly limite_turmas_ano: string;
  readonly proposito: string;
};

const VAZIO: CursoNoFormulario = {
  codigo: "",
  nome_curso: "",
  classificacao: "",
  modalidade: "",
  duracao_dias: "",
  duracao_semanas: "",
  limite_turmas_ano: "",
  proposito: "",
};

const REGIME_INICIAL = {
  regime_tempos: "8",
  ta_duracao_min: "45",
  intervalo_manha_min: "10",
  intervalo_tarde_min: "10",
  hora_inicio_manha: "07:30",
  hora_inicio_tarde: "13:30",
  vigente_de: "",
  fundamento_curricular: "",
};

export type FormularioDeCursoProps = {
  readonly modo: "novo" | "edicao";
  readonly inicial?: CursoNoFormulario;
  /** As turmas do curso, para o diálogo do `FR-014.2`. Zero no modo `novo`. */
  readonly turmasDoCurso?: number;
  readonly exemploDeTurma?: string;
  /** Já resolvido por `limite-de-turmas.ts` na leitura da página. */
  readonly anosAcimaDoLimite?: readonly AnoAcimaDoLimite[];
};

export function FormularioDeCurso({
  modo,
  inicial,
  turmasDoCurso = 0,
  exemploDeTurma,
  anosAcimaDoLimite = [],
}: FormularioDeCursoProps) {
  const router = useRouter();
  const [valores, definirValores] = React.useState<CursoNoFormulario>(inicial ?? VAZIO);
  const [regime, definirRegime] = React.useState(REGIME_INICIAL);
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  const trocar = (campo: keyof CursoNoFormulario) => (e: React.ChangeEvent<HTMLInputElement>) =>
    definirValores((v) => ({ ...v, [campo]: e.target.value }));

  const nulo = (v: string) => (v.trim() === "" ? null : v.trim());
  const numero = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const corpo = {
    codigo: valores.codigo,
    nome_curso: valores.nome_curso,
    classificacao: valores.classificacao,
    modalidade: valores.modalidade,
    duracao_dias: numero(valores.duracao_dias),
    duracao_semanas: numero(valores.duracao_semanas),
    limite_turmas_ano: numero(valores.limite_turmas_ano),
    proposito: nulo(valores.proposito),
  };

  /*
   * ⚠️ O LIMITE QUE A PESSOA ESTÁ DIGITANDO É O QUE VALE PARA O AVISO, e não o que está gravado. Os
   * anos afetados chegam prontos da página, calculados sobre a contagem real de turmas; aqui só se
   * pergunta se o número novo é menor que o de algum deles.
   */
  const limiteNovo = numero(valores.limite_turmas_ano);
  const anosAfetados =
    limiteNovo === undefined
      ? []
      : anosAcimaDoLimite
          .filter((a) => a.turmas > limiteNovo)
          .map((a) => ({ ...a, limite: limiteNovo }));

  const confirmacao = confirmacaoDaGravacao(
    modo === "novo" ? "criar_curso" : "editar_curso",
    modo === "novo"
      ? {}
      : {
          ...(inicial ? { siglaAntiga: inicial.codigo } : {}),
          siglaNova: valores.codigo,
          turmasComSiglaAntiga: turmasDoCurso,
          ...(exemploDeTurma ? { exemploDeTurmaAntiga: exemploDeTurma } : {}),
          ...(inicial
            ? {
                classificacaoAntiga:
                  ROTULO_DA_CLASSIFICACAO[
                    inicial.classificacao as keyof typeof ROTULO_DA_CLASSIFICACAO
                  ] ?? inicial.classificacao,
              }
            : {}),
          classificacaoNova:
            ROTULO_DA_CLASSIFICACAO[
              valores.classificacao as keyof typeof ROTULO_DA_CLASSIFICACAO
            ] ?? valores.classificacao,
          anosAcimaDoLimite: anosAfetados,
        },
  );

  async function gravar() {
    definirGravando(true);
    definirErro(null);
    const resultado =
      modo === "novo"
        ? await criarCurso({
            ...corpo,
            regime: {
              ...regime,
              regime_tempos: Number(regime.regime_tempos),
              ta_duracao_min: Number(regime.ta_duracao_min),
              intervalo_manha_min: Number(regime.intervalo_manha_min),
              intervalo_tarde_min: Number(regime.intervalo_tarde_min),
              fundamento_curricular: nulo(regime.fundamento_curricular),
            },
          })
        : await editarCurso(inicial?.codigo ?? "", corpo);
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    // ⚠️ O DESTINO É A SIGLA QUE A AÇÃO DEVOLVEU — depois de uma troca, a antiga não existe mais.
    router.push(`/cursos/${encodeURIComponent(resultado.sigla)}`);
  }

  const botaoGravar = (
    <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-curso">
      {modo === "novo" ? "Criar curso" : "Salvar alterações"}
    </Button>
  );

  return (
    <form
      data-slot="formulario-de-curso"
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
          <CampoObrigatorio para="curso-codigo" rotulo="Sigla" obrigatorio />
          <Input
            {...propsDoControle("curso-codigo", true)}
            name="codigo"
            value={valores.codigo}
            onChange={trocar("codigo")}
            placeholder="C-Ap-FR"
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="curso-nome" rotulo="Nome do curso" obrigatorio />
          <Input
            {...propsDoControle("curso-nome", true)}
            name="nome_curso"
            value={valores.nome_curso}
            onChange={trocar("nome_curso")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="curso-classificacao" rotulo="Classificação" obrigatorio />
          {/* ⚠️ SEM OPÇÃO MARCADA: a primeira é o convite a escolher, não um valor (`FR-015.1`). */}
          <select
            {...propsDoControle("curso-classificacao", true)}
            name="classificacao"
            value={valores.classificacao}
            onChange={(e) => definirValores((v) => ({ ...v, classificacao: e.target.value }))}
            className="border-borda bg-superficie-1 text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Escolha a classificação</option>
            {CLASSIFICACOES_DE_CURSO.map((c) => (
              <option key={c} value={c}>
                {ROTULO_DA_CLASSIFICACAO[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="curso-modalidade" rotulo="Modalidade" obrigatorio />
          <select
            {...propsDoControle("curso-modalidade", true)}
            name="modalidade"
            value={valores.modalidade}
            onChange={(e) => definirValores((v) => ({ ...v, modalidade: e.target.value }))}
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
          <CampoObrigatorio para="curso-dias" rotulo="Duração em dias" obrigatorio />
          <Input
            {...propsDoControle("curso-dias", true)}
            name="duracao_dias"
            inputMode="numeric"
            value={valores.duracao_dias}
            onChange={trocar("duracao_dias")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="curso-semanas" rotulo="Duração em semanas" />
          <Input
            {...propsDoControle("curso-semanas", false)}
            name="duracao_semanas"
            inputMode="numeric"
            value={valores.duracao_semanas}
            onChange={trocar("duracao_semanas")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="curso-limite" rotulo="Limite de turmas por ano" />
          <Input
            {...propsDoControle("curso-limite", false)}
            name="limite_turmas_ano"
            inputMode="numeric"
            value={valores.limite_turmas_ano}
            onChange={trocar("limite_turmas_ano")}
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <CampoObrigatorio para="curso-proposito" rotulo="Propósito" />
          <Input
            {...propsDoControle("curso-proposito", false)}
            name="proposito"
            value={valores.proposito}
            onChange={trocar("proposito")}
          />
        </div>
      </div>

      {modo === "novo" ? (
        <fieldset className="border-borda rounded-ciaara flex flex-col gap-3 border p-3">
          <legend className="text-texto px-1 text-sm font-semibold">
            Regime de horário padrão
          </legend>
          {/* veste: a nota que explica por que o regime é obrigatório aqui */}
          <p className="text-texto-tenue text-xs">
            Todo curso nasce com um regime padrão: os dois são gravados na mesma transação
            (`FR-019.5`).
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="regime-tempos" rotulo="Tempos de aula por dia" obrigatorio />
              <Input
                {...propsDoControle("regime-tempos", true)}
                name="regime_tempos"
                inputMode="numeric"
                value={regime.regime_tempos}
                onChange={(e) => definirRegime((r) => ({ ...r, regime_tempos: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="regime-ta" rotulo="Duração do TA (min)" obrigatorio />
              <Input
                {...propsDoControle("regime-ta", true)}
                name="ta_duracao_min"
                inputMode="numeric"
                value={regime.ta_duracao_min}
                onChange={(e) => definirRegime((r) => ({ ...r, ta_duracao_min: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="regime-de" rotulo="Vale a partir de" obrigatorio />
              <Input
                {...propsDoControle("regime-de", true)}
                name="vigente_de"
                type="date"
                value={regime.vigente_de}
                onChange={(e) => definirRegime((r) => ({ ...r, vigente_de: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="regime-manha" rotulo="Início da manhã" obrigatorio />
              <Input
                {...propsDoControle("regime-manha", true)}
                name="hora_inicio_manha"
                type="time"
                value={regime.hora_inicio_manha}
                onChange={(e) =>
                  definirRegime((r) => ({ ...r, hora_inicio_manha: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="regime-tarde" rotulo="Início da tarde" obrigatorio />
              <Input
                {...propsDoControle("regime-tarde", true)}
                name="hora_inicio_tarde"
                type="time"
                value={regime.hora_inicio_tarde}
                onChange={(e) =>
                  definirRegime((r) => ({ ...r, hora_inicio_tarde: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-3">
              {/* ⚠️ O FUNDAMENTO FICA AO LADO DOS PARÂMETROS (`FR-022`): a norma que os sustenta */}
              <CampoObrigatorio para="regime-fundamento" rotulo="Fundamento curricular" />
              <Input
                {...propsDoControle("regime-fundamento", false)}
                name="fundamento_curricular"
                value={regime.fundamento_curricular}
                onChange={(e) =>
                  definirRegime((r) => ({ ...r, fundamento_curricular: e.target.value }))
                }
              />
            </div>
          </div>
        </fieldset>
      ) : null}

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
