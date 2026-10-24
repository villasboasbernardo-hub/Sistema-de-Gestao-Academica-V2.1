/**
 * Cadastro e edição de disciplina — **por painel, nunca em linha** (`Q-15`, `FR-010`, `FR-011`).
 *
 * ⚠️ **EDIÇÃO EM LINHA FOI RECUSADA (`Q-15`).** A disciplina tem sete campos, e três deles — CH,
 * modo e situação — **recalculam a carga horária de gente**. Editar isso numa célula, sem o diálogo
 * que explica a consequência, faria a pessoa mudar a CH de três instrutores achando que corrigiu um
 * número numa tabela.
 *
 * ⚠️ **O MODO OFERECE DOIS VALORES, NUNCA TRÊS.** `herdar` existe no enum e é **proibido** nesta
 * coluna pelo `CHECK` `disciplinas_modo_padrao_concreto` (N-2): ele significa *"usar o padrão da
 * disciplina"*, e a disciplina não herda de si mesma. Oferecê-lo produziria recusa do banco para uma
 * escolha que a tela apresentou.
 *
 * ⚠️ **A UNICIDADE DO CÓDIGO É DO BANCO**, por índice parcial `where status = 'ativo'`. É ele que faz
 * a `Q-04` valer: desativar **libera** o código para outra disciplina no mesmo curso, e reativar a
 * antiga com o código tomado é recusado — com a frase traduzida.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarDisciplina, editarDisciplina } from "@/lib/acoes/disciplina";
import { LIMITE_DO_NOME_NO_DSA, nomeNoCartao } from "@/lib/dominio/nome-no-dsa";
import { MODOS_DE_ATRIBUICAO, ROTULO_DO_MODO } from "@/lib/validacao/disciplina";

export type DisciplinaNoFormulario = {
  readonly disciplinaId: string;
  readonly codDisciplina: string;
  readonly nomeDisciplina: string;
  readonly cargaHorariaTempos: number;
  readonly ordemSugerida: number | null;
  readonly modoAtribuicaoPadrao: string;
  readonly tecnicaEnsinoSugerida: string | null;
  readonly localPadrao: string | null;
  readonly nomeNoDsa: string | null;
  /** Spec 024 (FR-019): da etapa presencial da turma semipresencial. Ausente = desmarcada. */
  readonly presencial?: boolean;
};

export function FormularioDeDisciplina({
  cursoId,
  curriculoId = null,
  disciplina,
  aoConcluir,
  destinoAoConcluir,
}: {
  readonly cursoId: string;
  /** Spec 021 (RC-5): o currículo em que a disciplina nova nasce — o selecionado na página do curso. */
  readonly curriculoId?: string | null;
  /** Ausente = cadastro novo. */
  readonly disciplina?: DisciplinaNoFormulario;
  readonly aoConcluir?: () => void;
  /** Spec 022 (D-2): na página do cadastro, para onde ir depois de criar — de volta às disciplinas do curso. */
  readonly destinoAoConcluir?: string;
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [gravando, setGravando] = React.useState(false);
  /* Spec 021 (RC-6): no currículo em uso, a correção pede justificativa — e só o banco sabe quando. */
  const { executar, dialogo } = usePedidoDeJustificativa();

  const editando = disciplina !== undefined;
  /* Spec 017 (FR-007.1): o *Nome no DSA* e a prévia do que o cartão vai mostrar. */
  const [nomeNoDsa, setNomeNoDsa] = React.useState(disciplina?.nomeNoDsa ?? "");

  async function gravar(dados: FormData) {
    setMensagem(null);
    setErro(null);
    setGravando(true);

    const comum = {
      codDisciplina: String(dados.get("cod_disciplina") ?? ""),
      nomeDisciplina: String(dados.get("nome_disciplina") ?? ""),
      cargaHorariaTempos: Number(dados.get("carga_horaria_tempos") ?? 0),
      ordemSugerida:
        String(dados.get("ordem_sugerida") ?? "") === ""
          ? null
          : Number(dados.get("ordem_sugerida")),
      modoAtribuicaoPadrao: String(dados.get("modo_atribuicao_padrao") ?? "dividido"),
      tecnicaEnsinoSugerida: String(dados.get("tecnica") ?? "") || null,
      localPadrao: String(dados.get("local") ?? "") || null,
    };

    const resultado = await executar((justificativa) =>
      editando
        ? editarDisciplina({
            ...comum,
            disciplinaId: disciplina.disciplinaId,
            nomeNoDsa: String(dados.get("nome_no_dsa") ?? ""),
            presencial: dados.get("presencial") === "on",
            ...(justificativa ? { justificativa } : {}),
          })
        : criarDisciplina({
            ...comum,
            cursoId,
            ...(curriculoId ? { curriculoId } : {}),
            ...(justificativa ? { justificativa } : {}),
          }),
    );

    if (resultado.ok) {
      setMensagem(editando ? "Disciplina atualizada." : "Disciplina criada.");
      aoConcluir?.();
      if (destinoAoConcluir) router.push(destinoAoConcluir);
    } else {
      setErro(resultado.erro);
    }
    setGravando(false);
  }

  const id = disciplina?.disciplinaId ?? "nova";

  return (
    <form action={gravar} className="flex flex-col gap-3" data-slot="formulario-de-disciplina">
      {dialogo}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`cod-${id}`}>Código</Label>
          <Input
            id={`cod-${id}`}
            name="cod_disciplina"
            defaultValue={disciplina?.codDisciplina ?? ""}
            required
            className="w-28"
          />
        </div>

        <div className="flex min-w-72 flex-1 flex-col gap-1">
          <Label htmlFor={`nome-${id}`}>Nome</Label>
          <Input
            id={`nome-${id}`}
            name="nome_disciplina"
            defaultValue={disciplina?.nomeDisciplina ?? ""}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`ch-${id}`}>Carga horária (tempos)</Label>
          <Input
            id={`ch-${id}`}
            name="carga_horaria_tempos"
            type="number"
            min={1}
            step={1}
            defaultValue={disciplina?.cargaHorariaTempos ?? ""}
            required
            className="w-32"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`ordem-${id}`}>Ordem</Label>
          <Input
            id={`ordem-${id}`}
            name="ordem_sugerida"
            type="number"
            min={1}
            step={1}
            defaultValue={disciplina?.ordemSugerida ?? ""}
            className="w-20"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`modo-padrao-${id}`}>Modo de atribuição</Label>
          <select
            id={`modo-padrao-${id}`}
            name="modo_atribuicao_padrao"
            defaultValue={disciplina?.modoAtribuicaoPadrao ?? "dividido"}
            className="border-borda-forte bg-superficie text-texto rounded-ciaara w-80 border px-2 py-1 text-sm"
          >
            {MODOS_DE_ATRIBUICAO.map((m) => (
              <option key={m} value={m}>
                {ROTULO_DO_MODO[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`tecnica-${id}`}>Técnica de ensino</Label>
          {/* ⚠️ PREENCHIDO com o gravado (FR-007.5): vazio, a edição apagava a técnica de quem não a mexeu. */}
          <Input
            id={`tecnica-${id}`}
            name="tecnica"
            defaultValue={disciplina?.tecnicaEnsinoSugerida ?? ""}
            className="w-52"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`local-${id}`}>Local padrão</Label>
          <Input
            id={`local-${id}`}
            name="local"
            defaultValue={disciplina?.localPadrao ?? ""}
            className="w-52"
          />
        </div>

        {/*
          ⚠️ **SÓ NA EDIÇÃO** (C-19): na criação vale a abreviação automática, e o campo nasce quando há o que ajustar.
             A prévia mostra o que o cartão do DSA vai trazer — o cadastrado ou a abreviação de reserva.
        */}
        {editando ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`nome-no-dsa-${id}`}>Nome no DSA (até {LIMITE_DO_NOME_NO_DSA})</Label>
            <Input
              id={`nome-no-dsa-${id}`}
              name="nome_no_dsa"
              value={nomeNoDsa}
              onChange={(e) => setNomeNoDsa(e.target.value)}
              className="w-64"
              data-slot="campo-nome-no-dsa"
            />
            <span className="text-texto-suave text-xs" data-slot="previa-do-cartao">
              No cartão: {nomeNoCartao({ nomeNoDsa, nome: disciplina.nomeDisciplina })}
            </span>
          </div>
        ) : null}
        {/*
          Spec 024 (FR-019): a marca da etapa presencial. Com alguma marcada no currículo, a turma semipresencial conta
          só as marcadas e o lançado na etapa presencial; sem nenhuma, conta tudo, como antes.
        */}
        {editando ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="presencial"
              defaultChecked={disciplina.presencial === true}
              data-slot="campo-presencial"
            />
            Presencial — conta na etapa presencial da turma semipresencial
          </label>
        ) : null}

        {/* Spec 022 (FR-001): o verbo é o ícone, com o nome de antes na dica e no nome acessível. */}
        <BotaoDeIcone
          acao="salvar"
          rotulo={editando ? "Salvar disciplina" : "Criar disciplina"}
          variante="padrao"
          type="submit"
          ocupado={gravando}
          data-slot="gravar-disciplina"
        />
      </div>

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-disciplina">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
