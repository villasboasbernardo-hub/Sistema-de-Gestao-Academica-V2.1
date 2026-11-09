/**
 * A tabela da lista de atividades — do módulo e da aba Atividades da turma (Bloco 18, spec 033, `FR-006.2`,
 * `FR-006.4` e `FR-007.1`).
 *
 * > *"A tabela mostra Data · TA · Turma · Classificação · Tipo · Descrição · Responsável/Palestrante · Local · Vínculo"*
 * > — pedido da frente D do Bloco 18, sobre o `FR-006` da spec 033
 *
 * ⚠️ **A CLASSIFICAÇÃO É COMO A LINHA CONTA** (`rotuloDeComoConta(comoConta(…))`): o «TA da disciplina» (RA-4) aparece
 *    como tal, e não como a categoria do tipo — e o `data-categoria` da célula também (os percursos o leem).
 * ⚠️ **O TIPO PELO RÓTULO** (decisão 4): «Atividade Extraclasse», nunca o valor da chave.
 * ⚠️ **AS AÇÕES SÓ PARA QUEM LANÇA** (`atividades_nao_letivas.editar`), e indisponíveis na turma arquivada (D-COR-5).
 * ⚠️ **E INDISPONÍVEIS NA ATIVIDADE DE TODAS AS TURMAS** (achados da revisão do Bloco 18): a global não passa pelo
 *    rascunho da semana — o DSA a muda NA HORA, para todas as turmas, inclusive em semana publicada (D-14 da spec 024).
 *    O *Desativar* daqui prometeria um rascunho que não existe; o caminho é o DSA de uma turma ou o Calendário, que dizem
 *    o efeito imediato.
 * ⚠️ **O ENDEREÇO DO DSA SAI DE `enderecoDoDsa`** (gotcha 12): o código da turma tem espaços.
 * ⚠️ SEM MARCADOR DE CLIENTE: só as ações da linha são folha.
 */
import { rotuloDeComoConta } from "@/lib/dominio/categoria-pelo-tipo";
import {
  classificacaoDaLinha,
  semanaParaEditar,
  vinculoDaLinha,
  type AtividadeDaLista,
} from "@/lib/dominio/atividades/lista";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

import { AcoesDaAtividade } from "./AcoesDaListaDeAtividades";

export type AcoesDaTabela = {
  readonly excluir: (
    entrada: unknown,
  ) => Promise<{ readonly ok: true } | { readonly ok: false; readonly mensagem: string }>;
  /** As turmas arquivadas: somente leitura (D-COR-5). */
  readonly arquivadas: ReadonlySet<string>;
  readonly desativacaoPendente: ReadonlySet<string>;
};

const MOTIVO_DA_ARQUIVADA = "turma arquivada: somente leitura";
/** A global muda na hora, para todas as turmas: a lista não oferece o rascunho que ela não tem. */
const MOTIVO_DA_GLOBAL =
  "atividade de todas as turmas: muda na hora para todas — edite ou desfaça pelo DSA de uma turma ou pelo Calendário";

/** O motivo de as ações da linha estarem indisponíveis, ou nulo quando valem. */
function motivoDaLinhaIndisponivel(
  turmaId: string | null,
  arquivadas: ReadonlySet<string>,
): string | null {
  if (turmaId === null) return MOTIVO_DA_GLOBAL;
  return arquivadas.has(turmaId) ? MOTIVO_DA_ARQUIVADA : null;
}

function resumoDaLinha(l: AtividadeDaLista): string {
  const tipo = l.tipoRotulo ?? l.tipoValor ?? "Atividade";
  return `${tipo} de ${dataParaLeitura(l.data)}${l.turmaCodigo ? ` (${l.turmaCodigo})` : ""}`;
}

function enderecoParaEditar(l: AtividadeDaLista): string | null {
  if (l.turmaCodigo === null) return null;
  const semana = semanaParaEditar(l.data);
  return enderecoDoDsa(l.turmaCodigo, semana ?? undefined);
}

export function TabelaDeAtividades({
  linhas,
  mostrarTurma,
  acoes,
}: {
  readonly linhas: readonly AtividadeDaLista[];
  /** Na aba da turma a coluna é redundante. */
  readonly mostrarTurma: boolean;
  /** Nulo para quem não lança o DSA: a coluna de ações não existe. */
  readonly acoes: AcoesDaTabela | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="text-texto w-full text-sm" data-slot="tabela-de-atividades">
        <thead className="text-texto-suave text-left text-xs">
          <tr className="border-borda border-b">
            <th className="py-1 pr-3 font-medium">Data</th>
            <th className="py-1 pr-3 font-medium">TA</th>
            {mostrarTurma ? <th className="py-1 pr-3 font-medium">Turma</th> : null}
            <th className="py-1 pr-3 font-medium">Classificação</th>
            <th className="py-1 pr-3 font-medium">Tipo</th>
            <th className="py-1 pr-3 font-medium">Descrição</th>
            <th className="py-1 pr-3 font-medium">Responsável/Palestrante</th>
            <th className="py-1 pr-3 font-medium">Local</th>
            <th className="py-1 pr-3 font-medium">Vínculo</th>
            {acoes ? (
              <th className="py-1 pr-3 font-medium">
                <span className="sr-only">Ações</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const como = classificacaoDaLinha(l);
            const vinculo = vinculoDaLinha(l);
            const pendente = acoes?.desativacaoPendente.has(l.id) ?? false;
            return (
              <tr
                key={l.id}
                className="border-borda border-b"
                data-atividade={l.codigo}
                data-vinculo={vinculo}
                data-desativacao-pendente={pendente ? "sim" : undefined}
              >
                <td className="py-1 pr-3 tabular-nums">{dataParaLeitura(l.data)}</td>
                <td className="py-1 pr-3 tabular-nums">
                  {l.taInicial === null ? "—" : `${l.taInicial}º`}
                  {l.tempos === null ? "" : ` · ${l.tempos} TA`}
                </td>
                {mostrarTurma ? (
                  <td className="py-1 pr-3">{l.turmaCodigo ?? "Todas as turmas com DSA"}</td>
                ) : null}
                <td className="py-1 pr-3" data-categoria={como}>
                  {rotuloDeComoConta(como)}
                  {como === "CHD" && l.disciplinaRotulo ? (
                    <span className="text-texto-suave block text-xs">{l.disciplinaRotulo}</span>
                  ) : null}
                </td>
                <td className="py-1 pr-3">{l.tipoRotulo ?? l.tipoValor ?? "—"}</td>
                <td className="py-1 pr-3">
                  {/* Spec 029, D-6: a descrição ausente mostra «—», nunca a célula vazia. */}
                  {l.descricao ?? "—"}
                  {l.alunos === null ? "" : ` (${l.alunos} aluno${l.alunos === 1 ? "" : "s"})`}
                  {pendente ? (
                    <span
                      className="text-atrasado-tinta block text-xs font-medium"
                      data-slot="desativacao-pendente"
                    >
                      Desativação pedida — conta ao salvar a semana no DSA
                    </span>
                  ) : null}
                </td>
                <td className="py-1 pr-3">{l.responsavel ?? "—"}</td>
                <td className="py-1 pr-3">{l.local ?? "—"}</td>
                <td className="py-1 pr-3" data-slot="vinculo-da-atividade">
                  {vinculo === "avulsa" ? "Avulsa" : (l.vinculoNome ?? "Do currículo")}
                </td>
                {acoes ? (
                  <td className="py-1 pr-3">
                    <AcoesDaAtividade
                      atividadeId={l.id}
                      resumo={resumoDaLinha(l)}
                      dataLegivel={dataParaLeitura(l.data)}
                      hrefDoDsa={enderecoParaEditar(l)}
                      indisponivel={motivoDaLinhaIndisponivel(l.turmaId, acoes.arquivadas)}
                      pendente={pendente}
                      excluir={acoes.excluir}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
