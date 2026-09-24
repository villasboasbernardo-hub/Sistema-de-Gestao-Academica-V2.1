/**
 * A ficha da turma (`FR-031`, `FR-031.4` a `FR-031.6`, `FR-041`).
 *
 * ⚠️ **NÃO HÁ `/editar`** (`FR-031.5`). A ficha **é** o formulário, no modo `edicao`, para quem pode
 * editar; quem só consulta vê os mesmos dados sem campos. Uma rota de edição separada faria a pessoa
 * navegar duas vezes para mudar um efetivo.
 *
 * ⚠️ **O CAMINHO DE VOLTA É O CURSO** (`FR-031.6`): a turma se alcança pela página dele, e é para lá
 * que se volta.
 *
 * ⚠️ **A RPC DE PROTEÇÃO SÓ É LIDA PARA QUEM PODE EDITAR** (`FR-021.8`) — ela tem porteiro próprio, e
 * quem consulta não vai mudar janela nenhuma.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 */
import Link from "next/link";

import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { avisosDaTurma } from "@/lib/dominio/avisos-da-turma";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import type { JanelaDeTurma, VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { salasParaEscolher, type Sala } from "@/lib/dominio/salas";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../cursos/consulta";
import { FormularioDeTurma } from "../FormularioDeTurma";
import {
  codigoDaFicha,
  COLUNAS_DA_FICHA_DA_TURMA,
  deveLerProtecao,
  mensagemDeTurmaNaoEncontrada,
  protecoesDoBanco,
} from "./consulta";
import { QuadroDeAvisosDaTurma } from "./QuadroDeAvisosDaTurma";

/**
 * O termo da ficha somente-leitura.
 *
 * ⚠️ **O TOKEN FICA NUM LUGAR SÓ, e é por isso que ele é componente.** `--texto-tenue` veste
 * **rótulo**, nunca valor (`FR-031`), e a invariante cobra a declaração **na linha de cima de cada
 * uso** — quatro `<dt>` soltos são quatro declarações a manter em dia. ⚠️ E ele **não** se renderiza:
 * o elemento aqui é `<dt>`, não `<Rotulo>`, que foi o defeito de recursão medido em 22/09/2026.
 */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  // veste: o rótulo do termo, à esquerda; o valor ao lado é dado
  return <dt className="text-texto-tenue">{children}</dt>;
}

/** Hoje em `yyyy-mm-dd`, no fuso de apresentação — argumento das funções puras. */
function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function FichaDaTurma({ params }: { params: Promise<{ turma: string }> }) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_FICHA_DA_TURMA)
    .eq("codigo", codigo)
    .maybeSingle();

  if (!turma) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Turma</h1>
        <p role="status" className="text-texto" data-slot="turma-nao-encontrada">
          {mensagemDeTurmaNaoEncontrada(
            codigo,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const podeEditar = pode(permissoes, "turmas", "editar");
  const cursoId = turma.curso_id as string;

  /*
   * ⚠️ A RPC É PROMESSA CONDICIONAL, NÃO `await` SOLTO — ela entra na MESMA rodada das outras três.
   *    Lê-la depois custaria uma ida a mais ao banco por abertura de ficha (`FR-012`).
   */
  const protecaoPromessa = deveLerProtecao(podeEditar)
    ? supabase.rpc("protecao_das_vigencias_por_atividade_global", { p_curso_id: cursoId })
    : null;

  const [cursoRes, turmasRes, salasRes, protecaoRes] = await Promise.all([
    supabase
      .from("cursos")
      .select("codigo, nome_curso, limite_turmas_ano")
      .eq("id", cursoId)
      .maybeSingle(),
    supabase
      .from("turmas")
      .select("codigo, turma, ano_letivo, status, data_inicio, data_termino")
      .eq("curso_id", cursoId),
    supabase
      .from("config_listas")
      .select("valor, ativo, metadados")
      .eq("lista", "salas")
      .order("ordem"),
    protecaoPromessa,
  ]);

  const hoje = hojeEmSaoPaulo();
  const avisos = avisosDaTurma(
    {
      status: turma.status as string,
      dataInicio: turma.data_inicio,
      dataTermino: turma.data_termino,
      sala: turma.sala_alocada,
      alunos: turma.alunos === null ? null : Number(turma.alunos),
      // ⚠️ A grade da turma é do Épico 6 — declarar 1 mantém o aviso silencioso (ver `AbaGrade`).
      disciplinasAtivas: 1,
    },
    hoje,
  );

  const todas = turmasRes.data ?? [];
  /* ⚠️ A TURMA EDITADA SAI DA CONTA DO LIMITE — senão o próprio lugar dela viraria excesso. */
  const outras: TurmaParaLimite[] = todas
    .filter((t) => t.codigo !== codigo)
    .map((t) => ({ ano: Number(t.ano_letivo), status: t.status as string }));

  const janelas: JanelaDeTurma[] = todas.map((t) => ({
    codigo: t.codigo as string,
    dataInicio: t.data_inicio,
    dataTermino: t.data_termino,
  }));

  const semRotuloNoAno = todas
    .filter((t) => t.turma === null && t.codigo !== codigo)
    .map((t) => ({ ano: Number(t.ano_letivo), codigo: t.codigo as string }));

  const todasAsSalas: Sala[] = (salasRes.data ?? []).map((s) => ({
    valor: s.valor as string,
    ativo: s.ativo !== false,
    metadados: s.metadados,
  }));
  /* ⚠️ A SALA ATUAL ENTRA MESMO DESATIVADA (`FR-029.4`) — quem decide é `lib/dominio/salas.ts`. */
  const salas = salasParaEscolher(todasAsSalas, turma.sala_alocada);

  const protegidas: VigenciaProtegida[] = protecoesDoBanco(protecaoRes?.data ?? []);

  const texto = (v: string | number | null) => (v === null ? "" : String(v));
  const sigla = (cursoRes.data?.codigo as string | undefined) ?? "";

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold" data-slot="codigo-da-turma">
          {turma.codigo}
        </h1>
        {sigla ? (
          <p className="text-texto-suave text-sm">
            <Link
              href={`/cursos/${encodeURIComponent(sigla)}`}
              className="text-texto underline-offset-2 hover:underline"
              data-slot="voltar-ao-curso"
            >
              {sigla} — {cursoRes.data?.nome_curso as string}
            </Link>
          </p>
        ) : null}
      </header>

      <QuadroDeAvisosDaTurma avisos={avisos} />

      {podeEditar ? (
        <FormularioDeTurma
          modo="edicao"
          cursoId={cursoId}
          codigoAtual={turma.codigo as string}
          inicial={{
            ano_letivo: texto(turma.ano_letivo),
            status: turma.status as string,
            modalidade: turma.modalidade as string,
            turma: texto(turma.turma),
            data_inicio: texto(turma.data_inicio),
            data_termino: texto(turma.data_termino),
            sala_alocada: texto(turma.sala_alocada),
            alunos: texto(turma.alunos),
          }}
          salas={salas}
          turmasDoCurso={outras}
          limiteDoCurso={
            cursoRes.data?.limite_turmas_ano === null ||
            cursoRes.data?.limite_turmas_ano === undefined
              ? null
              : Number(cursoRes.data.limite_turmas_ano)
          }
          semRotuloNoAno={semRotuloNoAno}
          vigenciasProtegidas={protegidas}
          janelasDoCurso={janelas}
        />
      ) : (
        <dl
          className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2"
          data-slot="ficha-somente-leitura"
        >
          <Rotulo>Ano letivo</Rotulo>
          <dd className="text-texto">{texto(turma.ano_letivo)}</dd>
          <Rotulo>Situação</Rotulo>
          <dd className="text-texto">{turma.status as string}</dd>
          <Rotulo>Sala</Rotulo>
          <dd className="text-texto">{texto(turma.sala_alocada) || "—"}</dd>
          <Rotulo>Efetivo</Rotulo>
          <dd className="text-texto">{texto(turma.alunos) || "—"}</dd>
        </dl>
      )}
    </section>
  );
}
