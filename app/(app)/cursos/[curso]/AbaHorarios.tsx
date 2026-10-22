/**
 * A aba **Horários** da página do curso (spec 018, FR-004, C-7; spec 022, FR-005.3) — componente de servidor.
 *
 * ⚠️ **SÓ OS REGIMES NOMEADOS, SEM AS VIGÊNCIAS** (Bloco 7; pedido de Bernardo Villas Boas, 22/10/2026: *"Horários
 *    mostra e edita os regimes, sem exibir vigências"*). As vigências do regime do curso (`curso_regime_historico`), o
 *    padrão de toda turma que não escolheu, continuam em *Editar curso*, que é onde se registram (`RF-HOR-05`); o regime
 *    vigente hoje segue no cabeçalho do curso.
 * ⚠️ **"EDITA" PELO ÍCONE** (A-3 da spec 022): a página do curso continua só leitura (A-1 da spec 021), e o ícone
 *    *Editar* leva a *Editar curso* → *Horários*, onde cada regime se edita em diálogo. Segue a mesma permissão da
 *    barra do curso.
 * ⚠️ **CURSO SÓ EAD NÃO TEM TEMPOS PRESENCIAIS** (regime de 0 TA): a aba diz isso, e a turma EAD não escolhe regime
 *    (C-15) — a capacidade dela é o limite EAD (`RN-MAT-04`).
 * ⚠️ SEM MARCADOR DE CLIENTE: a lista de regimes é a folha.
 */
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { enderecoDaEdicaoDoCurso } from "@/lib/navegacao/endereco-de-turma";

import type { HorariosDoCurso } from "./consulta-de-horarios";
import { RegimesDoCurso } from "./RegimesDoCurso";

export function AbaHorarios({
  sigla,
  cursoId,
  curriculoId,
  cursoAtivo,
  horarios,
  permissoes,
}: {
  readonly sigla: string;
  readonly cursoId: string;
  /** Spec 021 (emenda à RC-1): os regimes nomeados mostrados são os deste currículo — na página, o vigente. */
  readonly curriculoId: string;
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-horarios-do-curso" className="text-texto text-base font-semibold">
          Horários
        </h2>
        {permissoes.abrirEdicaoDoCurso && cursoAtivo ? (
          <BotaoDeIcone
            acao="editar"
            rotulo="Editar os horários do curso"
            href={enderecoDaEdicaoDoCurso(sigla, undefined, "horarios")}
            data-slot="editar-horarios-do-curso"
          />
        ) : null}
      </div>
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
        curriculoId={curriculoId}
        regimes={horarios.regimes}
        configuracoes={horarios.configuracoes}
        permissoes={{
          criar: cursoAtivo && permissoes.criar,
          editar: cursoAtivo && permissoes.editar,
          desativar: cursoAtivo && permissoes.desativar,
        }}
      />
    </section>
  );
}
