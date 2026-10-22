/**
 * O formulário do regime de horário nomeado — novo e edição (spec 018, FR-003, C-7).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE**: é importado por `RegimesDoCurso.tsx`, a fronteira — e o que vem a partir dela já está
 *    no pacote do navegador.
 * ⚠️ **NA EDIÇÃO, TA POR DIA E DURAÇÃO SÃO SÓ LEITURA** (`RF-HOR-02`: imutáveis pelo usuário). O texto diz o caminho:
 *    para outro par, outro regime.
 * ⚠️ **COM LANÇAMENTO, O RELÓGIO TAMBÉM TRAVA** (`RF-HOR-05`): os campos ficam desabilitados com a frase do porquê;
 *    o banco recusa de qualquer forma.
 */
import * as React from "react";

import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarRegimeDeHorario, editarRegimeDeHorario } from "@/lib/acoes/regime-de-horario";

import type { ConfiguracaoDoCatalogo, RegimeNaTela } from "./consulta-de-horarios";

const CLASSE_DO_SELETOR =
  "border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm";

export function FormularioDeRegime({
  cursoId,
  curriculoId,
  regime,
  configuracoes,
  aoConcluir,
}: {
  readonly cursoId: string;
  /** Spec 021 (emenda à RC-1): o currículo em que o regime novo nasce. */
  readonly curriculoId: string | null;
  /** Ausente = regime novo. */
  readonly regime?: RegimeNaTela;
  readonly configuracoes: readonly ConfiguracaoDoCatalogo[];
  readonly aoConcluir: (mensagem: string) => void;
}) {
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);
  /* Spec 021 (RC-6): no currículo em uso, mudar o regime é correção — o banco pede a justificativa. */
  const { executar, dialogo } = usePedidoDeJustificativa();
  const editando = regime !== undefined;
  const relogioTravado = regime?.relogioTravado ?? false;
  const id = regime?.id ?? "novo";

  async function gravar(dados: FormData) {
    definirErro(null);
    definirGravando(true);
    const relogio = {
      nome: String(dados.get("nome") ?? ""),
      hora_inicio_manha: String(dados.get("hora_inicio_manha") ?? regime?.horaInicioManha ?? ""),
      hora_inicio_tarde: String(dados.get("hora_inicio_tarde") ?? regime?.horaInicioTarde ?? ""),
      intervalo_manha_min: String(
        dados.get("intervalo_manha_min") ?? regime?.intervaloManhaMin ?? "",
      ),
      intervalo_tarde_min: String(
        dados.get("intervalo_tarde_min") ?? regime?.intervaloTardeMin ?? "",
      ),
      configuracao_horario_id: String(
        dados.get("configuracao_horario_id") ?? regime?.configuracaoHorarioId ?? "",
      ),
      observacao: String(dados.get("observacao") ?? ""),
    };
    const resultado = await executar((justificativa) => {
      const j = justificativa ? { justificativa } : {};
      return editando
        ? editarRegimeDeHorario({ ...relogio, ...j, id: regime.id })
        : criarRegimeDeHorario({
            ...relogio,
            ...j,
            curso_id: cursoId,
            ...(curriculoId ? { curriculo_id: curriculoId } : {}),
            regime_tempos: String(dados.get("regime_tempos") ?? ""),
            ta_duracao_min: String(dados.get("ta_duracao_min") ?? ""),
          });
    });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    aoConcluir(editando ? "Regime atualizado." : "Regime cadastrado.");
  }

  return (
    <form action={gravar} className="flex flex-col gap-3" data-slot="formulario-de-regime">
      {dialogo}
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-do-regime">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <Label htmlFor={`regime-nome-${id}`}>Nome</Label>
          <Input
            id={`regime-nome-${id}`}
            name="nome"
            defaultValue={regime?.nome ?? ""}
            placeholder="Regime B"
            required
          />
        </div>
        {editando ? (
          <p className="text-texto-suave text-sm" data-slot="par-curricular">
            {regime.regimeTempos} TA de {regime.taDuracaoMin} min — decorrem do currículo e não
            mudam; para outro par, cadastre outro regime.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`regime-tempos-${id}`}>TA por dia</Label>
              <Input
                id={`regime-tempos-${id}`}
                name="regime_tempos"
                type="number"
                min={1}
                max={12}
                step={1}
                required
                className="w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`regime-duracao-${id}`}>Duração do TA (min)</Label>
              <select
                id={`regime-duracao-${id}`}
                name="ta_duracao_min"
                defaultValue=""
                required
                className={CLASSE_DO_SELETOR}
              >
                <option value="">Escolha</option>
                <option value="45">45</option>
                <option value="50">50</option>
              </select>
            </div>
          </>
        )}
      </div>

      {relogioTravado ? (
        <p className="text-texto-suave text-xs" data-slot="relogio-travado">
          O horário deste regime não muda mais: uma turma que o usa já tem lançamento no DSA. Para
          outro horário, cadastre outro regime.
        </p>
      ) : null}
      <fieldset disabled={relogioTravado} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`regime-manha-${id}`}>Início da manhã</Label>
          <Input
            id={`regime-manha-${id}`}
            name="hora_inicio_manha"
            type="time"
            defaultValue={regime?.horaInicioManha ?? ""}
            required
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`regime-int-manha-${id}`}>Intervalo da manhã (min)</Label>
          <Input
            id={`regime-int-manha-${id}`}
            name="intervalo_manha_min"
            type="number"
            min={0}
            max={120}
            defaultValue={regime?.intervaloManhaMin ?? ""}
            required
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`regime-tarde-${id}`}>Início da tarde</Label>
          <Input
            id={`regime-tarde-${id}`}
            name="hora_inicio_tarde"
            type="time"
            defaultValue={regime?.horaInicioTarde ?? ""}
            required
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`regime-int-tarde-${id}`}>Intervalo da tarde (min)</Label>
          <Input
            id={`regime-int-tarde-${id}`}
            name="intervalo_tarde_min"
            type="number"
            min={0}
            max={120}
            defaultValue={regime?.intervaloTardeMin ?? ""}
            required
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`regime-catalogo-${id}`}>Relógio do catálogo (opcional)</Label>
          <select
            id={`regime-catalogo-${id}`}
            name="configuracao_horario_id"
            defaultValue={regime?.configuracaoHorarioId ?? ""}
            className={CLASSE_DO_SELETOR}
          >
            <option value="">Nenhum — calcular pelos horários acima</option>
            {configuracoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`regime-obs-${id}`}>Observação</Label>
        <Input
          id={`regime-obs-${id}`}
          name="observacao"
          defaultValue={regime?.observacao ?? ""}
          placeholder="ex.: intervalos menores para o estágio"
        />
      </div>

      <div>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-regime">
          {editando ? "Salvar regime" : "Cadastrar regime"}
        </Button>
      </div>
    </form>
  );
}
