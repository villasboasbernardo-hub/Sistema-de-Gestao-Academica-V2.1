/**
 * As avaliações da turma, por disciplina (FR-031.3, FR-031.9, FR-031.11, FR-056.1, FR-057, FR-058 da spec 014):
 * CH do currículo · aula · avaliação; cada item com a origem do tempo (o arbitrado em destaque) e a situação;
 * a projeção, com o estouro em ALERTA; e as avaliações lançadas sem item do currículo ligado.
 *
 * ⚠️ **AQUI NÃO SE CALCULA NADA** — tudo vem de `quadroDeAvaliacoesDaTurma`. Esta folha escolhe frases.
 * ⚠️ **ESTOURO É ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`): `role="status"`.
 * ⚠️ Nota, média e aprovação NÃO aparecem (escopo de outra divisão, `RNF-NORM-06`).
 * ⚠️ SEM MARCADOR DE CLIENTE: `<details>` nativo abre a disciplina.
 * ⚠️ **A PROVA A MAIS É INFORMAÇÃO** (`RN-AV-14`, emenda de 15/10/2026: *"vira alerta informativo na aba Avaliações da
 *    turma ("currículo prevê 1 PP; aplicadas 2")"*): a frase vem pronta de `alemDoPrevisto`, sem cor de erro.
 * ⚠️ **A PROVA EM N SESSÕES É UMA** (`RN-AV-12`): a linha diz «em N sessões», e «Juntar como sessão de outra prova» só
 *    aparece para o Admin e o Encarregado (decisão de 16/10/2026), com as candidatas prontas do quadro.
 */
import { MARCA_ARBITRADO, MARCA_SUGESTAO } from "@/lib/dominio/avaliacoes/previsto";
import type { QuadroDeAvaliacoes } from "@/lib/dominio/avaliacoes/quadro-da-turma";
import { ROTULO_DA_SITUACAO, type SituacaoDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";
import { dataParaLeitura } from "@/lib/formato/data";
import { BadgeStatus } from "@/components/ciaara/badge-status";

import { DefinirTempoArbitrado } from "./DefinirTempoArbitrado";
import { JuntarComoSessao } from "./JuntarComoSessao";

type Acao = (
  entrada: unknown,
) => Promise<
  | { readonly ok: true; readonly aviso?: "soma_acima_da_ch" }
  | { readonly ok: false; readonly erro: string }
>;
type AcaoDeJuntar = (
  entrada: unknown,
) => Promise<{ readonly ok: true } | { readonly ok: false; readonly erro: string }>;

/** «em N sessões» — só quando a prova tem mais de uma (RN-AV-12). */
function Sessoes({ sessoes }: { readonly sessoes: number }) {
  if (sessoes <= 1) return null;
  return (
    <span className="text-texto-suave text-xs" data-avaliacoes="sessoes">
      em {sessoes} sessões
    </span>
  );
}

const TOM: Record<
  SituacaoDaAvaliacao,
  "executado" | "planejado" | "atrasado" | "conflito" | "adiantado"
> = {
  concluida: "executado",
  em_andamento: "adiantado",
  pendente: "planejado",
  atrasada: "atrasado",
  sem_correspondencia: "conflito",
};

function Situacao({ situacao }: { readonly situacao: SituacaoDaAvaliacao | null }) {
  if (situacao === null) return null;
  return <BadgeStatus tom={TOM[situacao]} rotulo={ROTULO_DA_SITUACAO[situacao]} />;
}

export function AvaliacoesDaTurma({
  quadro,
  aviso,
  turmaId,
  arbitrado,
  juntar,
}: {
  readonly quadro: QuadroDeAvaliacoes | null;
  readonly aviso: string | null;
  /** Vazio = a aba Avaliações do CURSO sem turma: só o previsto, sem projeção nem situação. */
  readonly turmaId: string;
  /** As ações do arbitrado — montadas pela página SÓ para quem tem `avaliacoes_curriculo_arbitrado.editar`. */
  readonly arbitrado?: { readonly definir: Acao; readonly confirmar: Acao; readonly nomear: Acao };
  /** «Juntar como sessão» — montada pela página SÓ para quem tem `avaliacoes_juntar_sessao.editar`. */
  readonly juntar?: AcaoDeJuntar;
}) {
  return (
    <section
      aria-labelledby="titulo-das-avaliacoes"
      className="flex flex-col gap-2"
      data-slot="avaliacoes-da-turma"
    >
      <h2 id="titulo-das-avaliacoes" className="text-texto text-base font-semibold">
        Avaliações
      </h2>
      {aviso ? (
        <p role="status" className="text-atrasado-tinta text-sm">
          {aviso}
        </p>
      ) : null}
      {quadro && quadro.disciplinas.length === 0 ? (
        <p className="text-texto-suave text-sm">Este curso ainda não tem disciplinas com CH.</p>
      ) : null}
      {quadro?.disciplinas.map(
        ({
          disciplina,
          previsto,
          projecao,
          itens,
          semItem,
          aplicadas,
          previstas,
          alemDoPrevisto,
        }) => (
          <details
            key={disciplina.id}
            className="border-borda rounded-ciaara border p-2"
            data-avaliacoes-disciplina={disciplina.cod}
          >
            <summary className="text-texto flex cursor-pointer flex-wrap items-baseline gap-x-3 text-sm">
              <span className="font-medium">
                {disciplina.cod} — {disciplina.nome}
              </span>
              <span className="text-texto-suave" data-avaliacoes="divisao">
                CH {previsto.ch} = {previsto.taAula} aula + {previsto.taAvaliacao} avaliação
              </span>
              <span className="text-texto-suave" data-avaliacoes="x-de-y">
                {aplicadas} de {previstas} avaliações aplicadas
              </span>
            </summary>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {alemDoPrevisto.length > 0 ? (
                <p className="text-texto-suave text-xs" data-avaliacoes="alem-do-previsto">
                  {alemDoPrevisto.map((a) => a.frase).join(" · ")} — informação, não é erro de
                  planilha
                </p>
              ) : null}
              {previsto.avisos.length > 0 ? (
                <p
                  role="status"
                  className="text-atrasado-tinta text-xs font-medium"
                  data-avaliacoes="avisos"
                >
                  {previsto.avisos.join(" · ")}
                </p>
              ) : null}
              {itens.length === 0 ? (
                <p className="text-texto-suave text-xs">
                  Nenhuma avaliação do currículo carregada para esta disciplina.
                </p>
              ) : (
                <ul className="flex flex-col gap-1" data-avaliacoes="itens">
                  {itens.map((item) => (
                    <li
                      key={item.rotulo}
                      className="flex flex-wrap items-center gap-2"
                      data-avaliacoes-item={item.rotulo}
                    >
                      <span className="font-medium">
                        {item.natureza === "od"
                          ? `${item.rotulo} — avaliação contínua (OD)`
                          : item.rotulo}
                      </span>
                      {item.natureza === "od" ? null : (
                        <span className="text-texto-suave text-xs">
                          {item.tempo === null
                            ? "tempo de avaliação não definido"
                            : `${item.tempo} TA`}
                        </span>
                      )}
                      {item.origemDaUe ? (
                        <span className="text-texto-suave text-xs">{item.origemDaUe}</span>
                      ) : null}
                      {item.marca === "nao_consta_do_curriculo" ? (
                        <span
                          className="text-atrasado-tinta text-xs font-medium"
                          data-avaliacoes="arbitrado"
                        >
                          {MARCA_ARBITRADO}
                        </span>
                      ) : null}
                      {item.marca === "sugestao_a_confirmar" ? (
                        <span
                          className="text-atrasado-tinta text-xs font-medium"
                          data-avaliacoes="sugestao"
                        >
                          {MARCA_SUGESTAO}
                        </span>
                      ) : null}
                      <Situacao situacao={item.situacao} />
                      {item.aplicacao ? (
                        <span className="text-texto-suave text-xs">
                          {dataParaLeitura(item.aplicacao)}
                        </span>
                      ) : null}
                      <Sessoes sessoes={item.sessoes} />
                      {juntar && item.avaliacaoId ? (
                        <JuntarComoSessao
                          avaliacaoId={item.avaliacaoId}
                          opcoes={item.juntarEm}
                          juntar={juntar}
                        />
                      ) : null}
                      {arbitrado && item.natureza !== "od" ? (
                        <DefinirTempoArbitrado
                          itemId={item.itemId}
                          turmaId={turmaId}
                          tempoDeCurriculo={item.tempoDeCurriculo}
                          sugestaoAConfirmar={item.marca === "sugestao_a_confirmar"}
                          unidades={item.semUe ? disciplina.unidades : []}
                          definir={arbitrado.definir}
                          confirmar={arbitrado.confirmar}
                          nomear={arbitrado.nomear}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {semItem.length > 0 ? (
                <div data-avaliacoes="sem-item">
                  <p className="text-texto-suave text-xs">
                    Lançadas no DSA sem avaliação do currículo ligada:
                  </p>
                  <ul className="flex flex-col gap-1">
                    {semItem.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center gap-2 text-xs"
                        data-avaliacoes-sem-item={a.instrumento ?? a.tipo}
                      >
                        <span>{a.instrumento ? `${a.tipo} (${a.instrumento})` : a.tipo}</span>
                        {a.aplicacao ? (
                          <span className="text-texto-suave">{dataParaLeitura(a.aplicacao)}</span>
                        ) : null}
                        <Situacao situacao={a.situacao} />
                        <Sessoes sessoes={a.sessoes} />
                        {juntar ? (
                          <JuntarComoSessao
                            avaliacaoId={a.id}
                            opcoes={a.juntarEm}
                            juntar={juntar}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {turmaId === "" ? null : (
                <p
                  className={
                    projecao.estouro
                      ? "text-atrasado-tinta text-xs font-medium"
                      : "text-texto-suave text-xs"
                  }
                  {...(projecao.estouro ? { role: "status" } : {})}
                  data-avaliacoes="projecao"
                  data-estouro={projecao.estouro}
                >
                  {projecao.frase}
                </p>
              )}
            </div>
          </details>
        ),
      )}
    </section>
  );
}
