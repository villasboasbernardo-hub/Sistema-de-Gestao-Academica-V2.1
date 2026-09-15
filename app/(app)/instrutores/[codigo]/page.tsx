/**
 * A ficha do instrutor (`RF-INSTR-10`, `FR-012`, `FR-027.3`, `FR-027.4`, `FR-031` e `FR-032` da spec
 * 006).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário é folha, noutro arquivo.
 *
 * ⚠️ **A IDENTIDADE É O CÓDIGO NO CAMINHO**, o número que a pessoa reconhece. O `id` uuid nunca
 * aparece na URL nem na tela (`FR-027.3`).
 *
 * ⚠️ **"NÃO HÁ" E "VOCÊ NÃO VÊ" SÃO RESPOSTAS DIFERENTES** (`FR-027.4`, gotcha nº 4 do BRIEF). Sem
 * permissão de ler instrutor, a tela diz que o perfil não alcança; com permissão e sem linha, diz
 * que o código não existe.
 *
 * ⚠️ **A CARGA HORÁRIA É SÓ LEITURA** (`FR-014`, `FR-015`, `RF-INSTR-13`). A ministrada e a prevista
 * vêm de `vw_instrutor_carga_anual`, em TA; a view só tem linha de ano com fato ou previsão, e
 * ausência é zero. As atribuições, com a média semanal de cada uma, vêm de
 * `vw_instrutor_carga_prevista` (T011, decisão de Bernardo Villas Boas, 15/09/2026).
 *
 * ⚠️ **O DADO PESSOAL SÓ É LIDO PELA VISÃO COM PORTEIRO.** Se ela entrega a linha, a sessão é de um
 * dos três perfis que leem a PII, e só então a seção existe no formulário. Quem decidiu foi o banco.
 */
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { AlertaConformidade } from "@/components/ciaara/alerta-conformidade";
import { alertaForaDaFaixa, alertaSemCapacitacao } from "@/lib/dominio/alertas-instrutor";
import {
  cargaPorSemana,
  limitesDoAnoIso,
  semanasDoAno,
  semanasForaDaFaixa,
} from "@/lib/dominio/carga-semanal";
import { anoCorrente, hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { COLUNAS_PESSOAIS, valoresFuncionaisDe, valoresPessoaisDe } from "../campos";
import { FormularioDeInstrutor } from "../FormularioDeInstrutor";
import { comSigla } from "../catalogo";
import { AcoesDeInstrutor } from "./AcoesDeInstrutor";
import { CargaDoInstrutor } from "./CargaDoInstrutor";
import { FichaEmLeitura } from "./FichaEmLeitura";

const COLUNAS_DA_FICHA =
  "id, codigo, status, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, nome_guerra, nip, data_nascimento, dep_divisao, data_assuncao_setor, email, regime_trabalho, nivel_escolaridade, formacao_principal_secundaria, capacitacao_didatica, data_inicio_docencia_mb, data_inicio_docencia_ciaara, ultima_avaliacao_desempenho, data_avaliacao_desempenho, preferencia, antiguidade_declarada, area_conhecimento";

export default async function FichaDoInstrutor({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (!pode(permissoes, "instrutores", "ler")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const supabase = await criarClienteDeServidor();
  const [instrutorRes, disciplinasRes, cursosRes, escalaRes] = await Promise.all([
    supabase.from("vw_instrutores").select(COLUNAS_DA_FICHA).eq("codigo", codigo).maybeSingle(),
    supabase
      .from("disciplinas")
      .select("id, nome_disciplina, curso_id, status")
      .order("nome_disciplina"),
    supabase.from("cursos").select("id, codigo"),
    supabase
      .from("config_listas")
      .select("valor, ordem")
      .eq("lista", "escala_antiguidade")
      .eq("ativo", true)
      .order("ordem"),
  ]);

  if (instrutorRes.error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const instrutor = instrutorRes.data;
  if (!instrutor) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio
          motivo="sem-dado"
          titulo="Instrutor não encontrado"
          detalhe={`Não há instrutor com o código ${codigo}. O seu perfil lê o cadastro inteiro: não é falta de acesso.`}
        />
      </section>
    );
  }

  const ano = anoCorrente();
  const limitesDoAno = limitesDoAnoIso(ano);
  const [{ data: pessoal }, cargaRes, atribuicoesRes, vinculosRes] = await Promise.all([
    supabase
      .from("vw_instrutor_dados_pessoais")
      .select(COLUNAS_PESSOAIS)
      .eq("id", instrutor.id)
      .maybeSingle(),
    supabase
      .from("vw_instrutor_carga_anual")
      .select("ta_ministrado_ano, ta_previsto_ano, faixa_semanal_min, faixa_semanal_max")
      .eq("instrutor_id", instrutor.id)
      .eq("ano", ano)
      .maybeSingle(),
    supabase
      .from("vw_instrutor_carga_prevista")
      .select(
        "atribuicao_id, ano, nome_disciplina, curso_codigo, turma_codigo, previsao_inicio, previsao_termino, tempos_previstos, semanas, media_semanal",
      )
      .eq("instrutor_id", instrutor.id)
      /*
       * ⚠️ DUAS PERGUNTAS NA MESMA CONSULTA (CHK005, decisão de Bernardo Villas Boas, 15/09/2026). A seção
       * de carga lista as atribuições **do ano** pela data de início (T011 c); o alerta de faixa precisa
       * de toda janela que toca o ano ISO corrente, inclusive a que começou no ano anterior. Vêm as duas,
       * e a lista é recortada abaixo, em memória.
       */
      .or(
        `ano.eq.${ano},and(previsao_inicio.lte.${limitesDoAno.fim},previsao_termino.gte.${limitesDoAno.inicio})`,
      )
      .order("previsao_inicio"),
    supabase
      .from("instrutor_disciplina")
      .select("disciplina_id")
      .eq("instrutor_id", instrutor.id)
      .eq("status", "ativo"),
  ]);

  const catalogo = comSigla(disciplinasRes.data ?? [], cursosRes.data ?? []);
  const habilitadas = (vinculosRes.data ?? []).flatMap((v) =>
    v.disciplina_id ? [v.disciplina_id] : [],
  );
  const doCatalogo = new Map(catalogo.map((d) => [d.id, d]));
  const habilitadasEmLeitura = vinculosRes.error
    ? null
    : habilitadas.flatMap((id) => {
        const d = doCatalogo.get(id);
        return d ? [{ nome: d.nome, sigla: d.sigla }] : [];
      });
  // ⚠️ Falha de leitura é "—", não zero (`RN-DEG-01`): zero afirmaria que não houve aula.
  const ministrada = cargaRes.error ? null : Number(cargaRes.data?.ta_ministrado_ano ?? 0);
  const prevista = cargaRes.error ? null : Number(cargaRes.data?.ta_previsto_ano ?? 0);

  /*
   * ⚠️ OS ALERTAS DA US4 AVISAM E NÃO BLOQUEIAM (`FR-018`, `RN-DEG-02`). Nenhum deles condiciona o botão
   * de gravar, o de desativar ou o painel. A carga semanal é somada **por semana ISO** — nunca o ano
   * inteiro — pela decisão de Bernardo Villas Boas de 15/09/2026, e a faixa vem de `config_parametros`.
   */
  const faixa =
    cargaRes.data?.faixa_semanal_min != null && cargaRes.data?.faixa_semanal_max != null
      ? {
          minimo: Number(cargaRes.data.faixa_semanal_min),
          maximo: Number(cargaRes.data.faixa_semanal_max),
        }
      : null;
  const janelasDoAno = atribuicoesRes.error ? null : (atribuicoesRes.data ?? []);
  const atribuicoes =
    janelasDoAno === null
      ? null
      : janelasDoAno
          .filter((a) => a.ano === ano)
          .map((a) => ({
            id: a.atribuicao_id as string,
            disciplina: a.nome_disciplina as string,
            curso: a.curso_codigo as string,
            turma: a.turma_codigo as string,
            inicio: a.previsao_inicio,
            termino: a.previsao_termino,
            tempos: Number(a.tempos_previstos ?? 0),
            semanas: a.semanas,
            mediaSemanal: a.media_semanal === null ? null : Number(a.media_semanal),
          }));
  const alertas = [
    alertaForaDaFaixa(
      semanasForaDaFaixa(
        semanasDoAno(
          cargaPorSemana(
            (janelasDoAno ?? []).map((a) => ({
              inicio: a.previsao_inicio,
              termino: a.previsao_termino,
              mediaSemanal: a.media_semanal === null ? null : Number(a.media_semanal),
            })),
          ),
          ano,
        ),
        faixa,
      ),
      faixa,
    ),
    alertaSemCapacitacao(
      {
        dataInicioDocenciaCiaara: instrutor.data_inicio_docencia_ciaara,
        capacitacaoDidatica: instrutor.capacitacao_didatica,
      },
      hojeNaCiaara(),
    ),
  ].flatMap((a) => (a ? [a] : []));

  const ativo = instrutor.status === "ativo";

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-texto text-lg font-semibold">
          <NomeInstrutor
            instrutor={{
              id: instrutor.id,
              pg: instrutor.posto_graduacao,
              especialidade: instrutor.esp_hab_obs,
              nomeCompleto: instrutor.nome_completo,
              nomeDeGuerra: instrutor.nome_guerra,
            }}
          />
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-texto-suave" data-slot="codigo-do-instrutor">
            Código {instrutor.codigo}
          </span>
          <BadgeStatus tom={ativo ? "executado" : "inativo"} rotulo={ativo ? "ativo" : "inativo"} />
        </div>
      </header>

      {alertas.map((a) => (
        <AlertaConformidade
          key={a.chave}
          tom="conformidade"
          titulo={a.titulo}
          avisos={a.detalhes}
          className="static"
        />
      ))}

      <FichaEmLeitura
        id={instrutor.id}
        valores={valoresFuncionaisDe(instrutor)}
        habilitadas={habilitadasEmLeitura}
      />

      <CargaDoInstrutor
        ano={ano}
        ministrada={ministrada}
        prevista={prevista}
        atribuicoes={atribuicoes}
      />

      <SePodeVer permissoes={permissoes} recurso="instrutores" acao="editar">
        <h2 className="text-texto text-base font-semibold">Editar cadastro</h2>
        <FormularioDeInstrutor
          modo="edicao"
          instrutorId={instrutor.id}
          iniciais={valoresFuncionaisDe(instrutor)}
          pessoais={
            pessoal ? valoresPessoaisDe(pessoal as unknown as Record<string, unknown>) : null
          }
          postos={(escalaRes.data ?? []).map((e) => e.valor)}
          disciplinas={catalogo.filter((d) => d.ativa)}
          habilitadas={habilitadas}
          // ⚠️ Desativar fica no fim, ao lado de gravar, longe do caminho habitual (anotação de
          // 15/09/2026 ao `FR-011`). Oculto para quem não edita, como o formulário inteiro.
          rodape={<AcoesDeInstrutor instrutorId={instrutor.id} ativo={ativo} />}
        />
      </SePodeVer>
    </section>
  );
}
