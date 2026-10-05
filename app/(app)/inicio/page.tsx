/**
 * Tela Início — o panorama (`RF-INI-01` a `RF-INI-05`, `FR-028` a `FR-033`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O filtro é folha, noutro arquivo. Um `"use client"` aqui mandaria
 * o panorama inteiro para o navegador, e o erro não aparece na checagem de tipos.
 *
 * ⚠️ **SEIS CONSULTAS INDEPENDENTES, EM PARALELO — NUNCA UMA POR TURMA.** O antipadrão de N leituras
 * já foi combatido na v2.0 (spec 017), e o `RF-INI-01` escreve *"por VIEW ou consulta única"*. Os
 * volumes são 24 cursos, 28 turmas e o calendário do ano: a junção acontece em memória, numa passada.
 *
 * ⚠️ **ERAM TRÊS ATÉ 04/10/2026, E AS TRÊS NOVAS SÃO O QUE FALTAVA PARA O VEREDITO EXISTIR**: a
 * turma (pelo `data_termino` e pela `modalidade`, que a view de carga **não** tem), o regime vigente
 * do curso (o TA/dia da `RN-MAT-04`) e os feriados de dia inteiro (`RN-EVT-02`). Sem elas o painel
 * comparava previsto com executado e chamava o excesso de atraso.
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
// ⚠️ O ENDERECO DE TURMA VEM DO MODULO, E NAO DE UM TEMPLATE AQUI (`FR-031.2`). O codigo da
//    turma e `sigla [rotulo] ano` e CONTEM ESPACO — montar a mao produzia um `href` com
//    espaco cru, que o navegador aceita e o servidor recebe diferente. Defeito medido e
//    corrigido em 18/09/2026; a varredura de `endereco-de-turma-unico.test.ts` o impede
//    de voltar.
import { enderecoDaTurmaNoCurso } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { FiltroDoPanorama } from "./FiltroDoPanorama";
import {
  montarPanorama,
  totaisDo,
  type CargaDaTurma,
  type CursoDoRecorte,
  type RegimeDoCursoNoBanco,
  type TurmaDoPanorama,
} from "./panorama";

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

  /*
   * ⚠️ `status = "ativo"` É EXPLÍCITO AQUI, E PRECISA SER (`FR-017.6` da spec 009, R-1). Até a
   * migration 7 desta fatia, `app.cursos_do_usuario()` filtrava a situação, e o panorama nunca via
   * curso inativo — não porque esta tela filtrasse, mas porque o ALCANCE escondia. A migration tirou
   * o filtro de lá de propósito (`FR-017.1`: desativar tira de OFERTA, não de VISTA), e o recorte
   * passou a ser responsabilidade de cada consumidor, explicitamente. **Sem esta linha, turma de
   * curso desativado volta ao panorama sem erro nenhum** — medido em 18/09/2026, pelo caso de
   * `inicio.spec.ts`, que reprovou antes dela existir.
   */
  let consultaDeCursos = supabase
    .from("cursos")
    .select("id, codigo, classificacao, modalidade")
    .eq("status", "ativo");
  if (classificacao !== "") consultaDeCursos = consultaDeCursos.eq("classificacao", classificacao);
  if (modalidade !== "") consultaDeCursos = consultaDeCursos.eq("modalidade", modalidade);

  /*
   * ⚠️ **O "HOJE" É LIDO UMA VEZ, ANTES DA RODADA, E ENTRA NA CONSULTA DOS FERIADOS.** É a mesma
   *    função da ficha da turma e dos avisos (`hojeNaCiaara`): três fórmulas de "hoje" conviveram
   *    neste repositório até 04/10/2026, e uma delas estava em UTC.
   */
  const hoje = hojeNaCiaara();

  const [cursosRes, cargasRes, totalRes, turmasRes, regimesRes, feriadosRes] = await Promise.all([
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
     *
     * ⚠️ **E ELA CONTA TODOS OS CURSOS, INCLUSIVE OS INATIVOS — de propósito** (`FR-017.6`, R-1).
     * A pergunta que ela responde é *"existe curso neste sistema?"*, e curso arquivado existe.
     * Acrescentar `status = "ativo"` aqui, por simetria com a consulta acima, faria a tela anunciar
     * *"ainda não existe no sistema"* numa base com dezenas de cursos arquivados — mentira que manda
     * a pessoa procurar a carga em vez do filtro. As duas consultas fazem perguntas diferentes, e é
     * por isso que só uma delas filtra.
     */
    supabase.from("cursos").select("id", { count: "exact", head: true }),
    /*
     * ⚠️ **AS TRÊS LEITURAS NOVAS NÃO FILTRAM PELO RECORTE, E É DE PROPÓSITO.** O recorte do filtro é
     *    aplicado em memória, sobre `cursos`, e o alcance por perfil é aplicado pela **RLS** — pedir
     *    `in(curso_id, …)` aqui exigiria esperar a consulta de cursos e transformaria uma rodada em
     *    duas (`FR-012`). Os volumes mandam: 28 turmas, 24 regimes e o calendário de um ano.
     */
    supabase.from("turmas").select("id, data_termino, modalidade"),
    supabase
      .from("vw_cursos_regime_vigente")
      .select("curso_id, regime_padrao_tempos, limite_diario_ead_horas"),
    /*
     * ⚠️ **SÓ FERIADO DE DIA INTEIRO E ATIVO DESCONTA CAPACIDADE** (`RN-EVT-02`, regra 4). E o limite
     *    superior é **aberto**: ele seria o maior `data_termino` do recorte, que só se conhece depois
     *    de ler as turmas — uma segunda rodada para cortar uma lista que tem dezenas de linhas. O
     *    piso é `hoje`, que é o que elimina o calendário dos anos passados.
     */
    supabase
      .from("feriados")
      .select("data")
      .eq("impacto", "dia_inteiro")
      .eq("status", "ativo")
      .gte("data", hoje),
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

  /*
   * ⚠️ **ERRO NAS TRÊS LEITURAS NOVAS NÃO DERRUBA A TELA, E TAMBÉM NÃO INVENTA ALERTA** — ele cai no
   *    `?? []`, e turma sem término sai *"sem capacidade calculada"*, sem veredito de atraso
   *    (`RN-DEG-01`). Só `cursos` e a view de carga continuam sendo condição para a tela existir:
   *    sem elas não há panorama nenhum a desenhar.
   */
  const panorama = montarPanorama(
    (cargasRes.data ?? []) as unknown as CargaDaTurma[],
    (cursosRes.data ?? []) as unknown as CursoDoRecorte[],
    (turmasRes.data ?? []) as unknown as TurmaDoPanorama[],
    (regimesRes.data ?? []) as unknown as RegimeDoCursoNoBanco[],
    (feriadosRes.data ?? []).map((f) => f.data as string),
    hoje,
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
                href={enderecoDaTurmaNoCurso(t.cursoCodigo, t.turmaCodigo)}
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
