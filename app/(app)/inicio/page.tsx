/**
 * Tela Início — o panorama (`RF-INI-01` a `RF-INI-05`, `FR-028` a `FR-033`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O filtro é folha, noutro arquivo. Um `"use client"` aqui mandaria
 * o panorama inteiro para o navegador, e o erro não aparece na checagem de tipos.
 *
 * ⚠️ **DUAS CONSULTAS INDEPENDENTES, EM PARALELO — NUNCA UMA POR TURMA.** O antipadrão de N leituras
 * já foi combatido na v2.0 (spec 017), e o `RF-INI-01` escreve *"por VIEW ou consulta única"*. Os
 * volumes são 24 cursos e 29 turmas: a junção acontece em memória, numa passada.
 *
 * ⚠️ **O ESCOPO POR PERFIL NÃO É FILTRADO AQUI** (`RF-INI-02`). Quem nega é a **RLS**: o usuário fora
 * de escopo não recebe a linha, ainda que troque o parâmetro na URL à mão. Filtrar por disciplina de
 * código seria uma segunda fronteira — e a segunda é a que alguém esquece.
 *
 * ⚠️ **TRÊS VAZIOS DIFERENTES, E O TERCEIRO É O QUE FALTAVA** (`FR-033`). *"Não há"* e *"você não
 * vê"* já eram distinguidos desde o Épico 1. O terceiro é *"ainda não existe no sistema"* — a base
 * ainda não recebeu a carga —, e é o único dos três que **some sozinho com o tempo**. Tratá-lo como
 * "não há" faria a tela afirmar, com todas as letras, que a CIAARA-11 não tem turma nenhuma.
 */
import Link from "next/link";

import { AlertaConformidade } from "@/components/ciaara/alerta-conformidade";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { CardKpi } from "@/components/ciaara/card-kpi";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { FiltroDoPanorama } from "./FiltroDoPanorama";
import { montarPanorama, totaisDo, type CargaDaTurma, type CursoDoRecorte } from "./panorama";

/** O tom de cada status de turma. */
const TOM_DA_TURMA = {
  planejada: "planejado",
  ativa: "executado",
  concluida: "inativo",
  cancelada: "conflito",
} as const;

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE **ANTES** DE O VALOR ALCANÇAR A CONSULTA (`FR-041`). Com o `RF-NAV-01`, a
   * barra de endereço é entrada de usuário: quem cola um link não é sempre quem o escreveu. Valor
   * fora do domínio cai para o padrão e a tela abre — nunca vira predicado.
   */
  const { valores } = lerParametros("/inicio", await searchParams);
  const classificacao = String(valores.classificacao);
  const modalidade = String(valores.modalidade);

  const supabase = await criarClienteDeServidor();

  let consultaDeCursos = supabase.from("cursos").select("id, codigo, classificacao, modalidade");
  if (classificacao !== "") consultaDeCursos = consultaDeCursos.eq("classificacao", classificacao);
  if (modalidade !== "") consultaDeCursos = consultaDeCursos.eq("modalidade", modalidade);

  const [cursosRes, cargasRes, totalRes] = await Promise.all([
    consultaDeCursos,
    supabase
      .from("vw_carga_horaria_turma")
      .select(
        "turma_id, turma_codigo, curso_id, curso_codigo, nome_curso, ano_letivo, status_turma, chr_curricular, chd_executada",
      ),
    /*
     * ⚠️ ESTA TERCEIRA CONSULTA EXISTE SÓ PARA DISTINGUIR OS VAZIOS, e é uma contagem — não traz
     * linha. Sem ela não há como separar *"o recorte não achou nada"* de *"a base ainda não recebeu
     * a carga"*, e as duas frases levam a pessoa a lugares opostos.
     */
    supabase.from("cursos").select("id", { count: "exact", head: true }),
  ]);

  /*
   * ⚠️ ERRO DE LEITURA NÃO ESTOURA (`RN-DEG-01`). Ele vira o vazio de "você não vê", que é o que uma
   * negativa da RLS de fato significa — e o gotcha nº 4 do BRIEF manda distinguir isso de "não há".
   */
  if (cursosRes.error || cargasRes.error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Início</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const panorama = montarPanorama(
    (cargasRes.data ?? []) as unknown as CargaDaTurma[],
    (cursosRes.data ?? []) as unknown as CursoDoRecorte[],
  );
  const totais = totaisDo(panorama);
  const temRecorte = classificacao !== "" || modalidade !== "";
  const baseVazia = (totalRes.count ?? 0) === 0;

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Início</h1>
        {/* veste: a dica que explica o alcance do panorama — texto fixo, nunca dado */}
        <p className="text-texto-tenue text-xs">
          Panorama das turmas sob a CIAARA-11. O recorte vai para o endereço: este link abre com
          ele.
        </p>
      </header>

      <FiltroDoPanorama />

      {/*
        ⚠️ A REGIÃO DE ALERTAS É SEMPRE VISÍVEL (`RF-INI-04`, `RNF-USA-04`), inclusive quando não há
        o que alertar. Uma região que some quando está tudo bem ensina a não procurá-la — e quando
        ela reaparecer, ninguém vai saber onde ela ficava.

        ⚠️ SÓ UM PREDICADO EXISTE HOJE, e os demais do `RF-INI-04` — disciplina sem instrutor, vista
        de prova vencida, regime de horário perto de mudar — são dos Épicos 5 a 9. A região entra
        agora para eles terem onde chegar.
      */}
      <AlertaConformidade
        tom={totais.emAtraso > 0 ? "atrasado" : "conformidade"}
        titulo={totais.emAtraso > 0 ? "Turmas exigindo atenção" : "Nada exigindo atenção"}
        avisos={
          totais.emAtraso > 0
            ? [`${totais.emAtraso} turma(s) em andamento com saldo de carga horária negativo.`]
            : ["Nenhuma turma em andamento com saldo negativo no recorte atual."]
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CardKpi rotulo="Turmas no recorte" valor={totais.turmas} />
        <CardKpi rotulo="Em andamento" valor={totais.ativas} />
        <CardKpi rotulo="Carga executada" valor={totais.executada} unidade="TA" />
        <CardKpi rotulo="Progresso do recorte" valor={`${totais.percentual}%`} />
      </div>

      {panorama.length === 0 ? (
        baseVazia ? (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Ainda não existe no sistema"
            detalhe="A carga de cursos e turmas ainda não foi feita nesta base. Não é ausência de cadastro na CIAARA-11: é dado que ainda não chegou aqui."
          />
        ) : temRecorte ? (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Nenhuma turma neste recorte"
            detalhe="Há turmas cadastradas, mas nenhuma com esta classificação e modalidade. Volte o filtro para Todas."
          />
        ) : (
          <EstadoVazio motivo="sem-dado" />
        )
      ) : (
        <ul data-slot="panorama-de-turmas" className="flex flex-col gap-2">
          {panorama.map((t) => (
            <li key={t.turmaId}>
              {/*
                ⚠️ CADA TURMA É PONTO DE ENTRADA PARA A TELA DO CURSO (`RF-INI-03`, `FR-030`), com
                URL própria — navegação de verdade, e não troca de conteúdo em memória. A tela de
                destino é do Épico 7; o link já carrega o recorte que ela vai ler.
              */}
              <Link
                href={`/cursos/${t.cursoCodigo}?turma=${t.turmaCodigo}`}
                data-turma={t.turmaCodigo}
                className="border-borda bg-superficie rounded-ciaara hover:bg-marca-suave focus-visible:ring-marca flex flex-wrap items-center justify-between gap-3 border p-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-texto text-sm font-medium">
                    {t.cursoCodigo} · {t.turmaCodigo}
                  </span>
                  <span className="text-texto-suave text-xs">
                    {t.nomeCurso} — {t.anoLetivo}
                  </span>
                </span>

                <span className="flex items-center gap-3">
                  <BadgeStatus
                    tom={TOM_DA_TURMA[t.status as keyof typeof TOM_DA_TURMA] ?? "planejado"}
                    rotulo={t.status}
                  />
                  <span className="text-texto text-sm tabular-nums" data-progresso={t.percentual}>
                    {t.executada}/{t.prevista} TA · {t.percentual}%
                  </span>
                  {t.emAtraso ? <BadgeStatus tom="atrasado" rotulo="em atraso" /> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
