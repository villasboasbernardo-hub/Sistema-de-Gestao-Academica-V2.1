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
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarDisciplina, editarDisciplina } from "@/lib/acoes/disciplina";
import { MODOS_DE_ATRIBUICAO, ROTULO_DO_MODO } from "@/lib/validacao/disciplina";

export type DisciplinaNoFormulario = {
  readonly disciplinaId: string;
  readonly codDisciplina: string;
  readonly nomeDisciplina: string;
  readonly cargaHorariaTempos: number;
  readonly ordemSugerida: number | null;
  readonly modoAtribuicaoPadrao: string;
};

export function FormularioDeDisciplina({
  cursoId,
  disciplina,
  aoConcluir,
}: {
  readonly cursoId: string;
  /** Ausente = cadastro novo. */
  readonly disciplina?: DisciplinaNoFormulario;
  readonly aoConcluir?: () => void;
}) {
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [gravando, setGravando] = React.useState(false);

  const editando = disciplina !== undefined;

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

    const resultado = editando
      ? await editarDisciplina({ ...comum, disciplinaId: disciplina.disciplinaId })
      : await criarDisciplina({ ...comum, cursoId });

    if (resultado.ok) {
      setMensagem(editando ? "Disciplina atualizada." : "Disciplina criada.");
      aoConcluir?.();
    } else {
      setErro(resultado.erro);
    }
    setGravando(false);
  }

  const id = disciplina?.disciplinaId ?? "nova";

  return (
    <form action={gravar} className="flex flex-col gap-3" data-slot="formulario-de-disciplina">
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
          <Input id={`tecnica-${id}`} name="tecnica" className="w-52" />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`local-${id}`}>Local padrão</Label>
          <Input id={`local-${id}`} name="local" className="w-52" />
        </div>

        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-disciplina">
          {gravando ? "Gravando…" : editando ? "Salvar disciplina" : "Criar disciplina"}
        </Button>
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
