/**
 * A aba **Horários** da página do curso (spec 018, FR-003, C-7, C-12) — componente de servidor.
 *
 * ⚠️ **DUAS COISAS DIFERENTES, E A TELA AS SEPARA:**
 *    1. **os regimes nomeados** (*Regime A, B, C…*), cadastrados e editados aqui, que a TURMA escolhe;
 *    2. **as vigências do regime do curso** (`curso_regime_historico`), o padrão de toda turma que não escolheu —
 *       **só para ler** aqui (C-12): elas mudam pela edição do curso, com a trava de lançamento da vigência
 *       (`RF-HOR-05`), e duas telas gravando a mesma vigência seriam dois lugares a divergir.
 * ⚠️ **CURSO SÓ EAD NÃO TEM TEMPOS PRESENCIAIS** (regime de 0 TA): a aba diz isso, e a turma EAD não escolhe regime
 *    (C-15) — a capacidade dela é o limite EAD (`RN-MAT-04`).
 * ⚠️ SEM MARCADOR DE CLIENTE: a lista de regimes é a folha.
 */
import Link from "next/link";

import { dataParaLeitura } from "@/lib/formato/data";

import type { HorariosDoCurso } from "./consulta-de-horarios";
import { RegimesDoCurso } from "./RegimesDoCurso";

export function AbaHorarios({
  sigla,
  cursoId,
  cursoAtivo,
  horarios,
  permissoes,
}: {
  readonly sigla: string;
  readonly cursoId: string;
  readonly cursoAtivo: boolean;
  readonly horarios: HorariosDoCurso;
  readonly permissoes: {
    readonly criar: boolean;
    readonly editar: boolean;
    readonly desativar: boolean;
    /** O caminho para *Editar curso* — a mesma regra da barra do curso. */
    readonly abrirEdicaoDoCurso: boolean;
  };
}) {
  const soEad =
    horarios.vigencias.length > 0 && horarios.vigencias.every((v) => v.regimeTempos === 0);

  return (
    <section
      aria-labelledby="titulo-horarios-do-curso"
      className="flex flex-col gap-4"
      data-slot="aba-horarios"
    >
      <h2 id="titulo-horarios-do-curso" className="text-texto text-base font-semibold">
        Horários
      </h2>
      {horarios.erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm">
          Não foi possível ler os horários do curso agora. Recarregue a página.
        </p>
      ) : null}
      {soEad ? (
        <p className="text-texto-suave text-sm" data-slot="curso-so-ead">
          O regime vigente deste curso é só EAD: não há tempos presenciais. Uma turma presencial ou
          semipresencial dele ainda pode escolher um regime nomeado.
        </p>
      ) : null}
      {!cursoAtivo ? (
        <p className="text-texto-suave text-sm" data-slot="curso-fora-de-oferta">
          Curso fora de oferta: os regimes ficam para consulta e não recebem cadastro nem edição.
        </p>
      ) : null}

      <RegimesDoCurso
        cursoId={cursoId}
        regimes={horarios.regimes}
        configuracoes={horarios.configuracoes}
        permissoes={{
          criar: cursoAtivo && permissoes.criar,
          editar: cursoAtivo && permissoes.editar,
          desativar: cursoAtivo && permissoes.desativar,
        }}
      />

      <section
        aria-labelledby="titulo-vigencias-do-curso"
        className="flex flex-col gap-2"
        data-slot="vigencias-do-curso"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="titulo-vigencias-do-curso" className="text-texto text-sm font-semibold">
            Regime vigente do curso (o padrão das turmas que não escolheram)
          </h3>
          {permissoes.abrirEdicaoDoCurso ? (
            <Link
              href={`/cursos/${encodeURIComponent(sigla)}/editar`}
              className="text-marca text-sm underline-offset-2 hover:underline"
              data-slot="editar-regime-do-curso"
            >
              Editar o regime do curso
            </Link>
          ) : null}
        </div>
        {horarios.vigencias.length === 0 ? (
          <p className="text-texto-suave text-sm">
            Este curso não tem vigência de regime cadastrada.
          </p>
        ) : (
          <ul className="text-texto flex flex-col gap-0.5 text-sm">
            {horarios.vigencias.map((v) => (
              <li key={v.codigo} data-vigencia={v.tipo}>
                <span className="font-medium">{v.tipo === "excecao" ? "Exceção" : "Padrão"}</span> ·
                de {dataParaLeitura(v.vigenteDe)}
                {v.vigenteAte ? ` a ${dataParaLeitura(v.vigenteAte)}` : " em diante"} ·{" "}
                {v.regimeTempos === 0
                  ? `só EAD${v.limiteDiarioEadHoras !== null ? `, ${v.limiteDiarioEadHoras} h por dia` : ""}`
                  : `${v.regimeTempos} TA de ${v.taDuracaoMin} min${v.horaInicioManha ? `, manhã ${v.horaInicioManha}` : ""}${v.horaInicioTarde ? `, tarde ${v.horaInicioTarde}` : ""}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
