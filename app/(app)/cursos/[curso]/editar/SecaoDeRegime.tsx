/**
 * O histórico de vigências de regime, por tipo (`FR-011`, `FR-019.1`, `FR-021.1`).
 *
 * ⚠️ **AS CANCELADAS FICAM À VISTA** (A-5). Elas são o registro de que houve correção; escondê-las
 * faria a correção parecer edição — exatamente o que o append-only existe para impedir.
 *
 * ⚠️ **"CORRIGIR ESTA VIGÊNCIA" SÓ APARECE ONDE O BANCO DISSE QUE NÃO HÁ LANÇAMENTO** (`FR-021.1`).
 * Quem responde é `public.vigencias_do_curso`, que envolve `app.lancamentos_que_travam_vigencia`;
 * quem decide o que a tela mostra é `lib/dominio/vigencia-de-regime.ts`. Onde a ação não cabe, a tela
 * **diz por quê** e diz o caminho (`FR-021.4`) — em vez de calar ou de oferecer uma recusa.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Os dois formulários é que são folhas, e o de correção nasce dentro
 * de um `<details>` — fechado, porque corrigir é exceção, não o caminho comum.
 */
import {
  historicoDoTipo,
  marcaDaCancelada,
  mensagemDaTrava,
  podeCorrigir,
  ROTULO_DO_TIPO_DE_REGIME,
  TIPOS_DE_REGIME,
  travaDe,
  valoresDaVigencia,
  type TravaDaVigencia,
  type VigenciaDoHistorico,
} from "@/lib/dominio/vigencia-de-regime";

import { FormularioDeVigencia } from "./FormularioDeVigencia";

/** O rótulo de um parâmetro no resumo da vigência. */
function Parametro({ nome, valor }: { readonly nome: string; readonly valor: string }) {
  // veste: o nome do parâmetro; o número ao lado é dado
  return (
    <span className="inline-flex gap-1">
      <span className="text-texto-tenue">{nome}</span>
      <span className="text-texto-suave">{valor}</span>
    </span>
  );
}

function resumoDe(v: VigenciaDoHistorico): { readonly nome: string; readonly valor: string }[] {
  const itens = [
    { nome: "TA/dia", valor: String(v.regimeTempos) },
    { nome: "TA", valor: `${v.taDuracaoMin} min` },
    { nome: "intervalos", valor: `${v.intervaloManhaMin}/${v.intervaloTardeMin} min` },
  ];
  if (v.horaInicioManha) itens.push({ nome: "manhã", valor: v.horaInicioManha });
  if (v.horaInicioTarde) itens.push({ nome: "tarde", valor: v.horaInicioTarde });
  if (v.limiteDiarioEadHoras !== null) {
    itens.push({ nome: "EAD/dia", valor: `${v.limiteDiarioEadHoras} h` });
  }
  return itens;
}

export function SecaoDeRegime({
  cursoId,
  sigla,
  vigencias,
  travas,
  podeRegistrar,
}: {
  readonly cursoId: string;
  readonly sigla: string;
  readonly vigencias: readonly VigenciaDoHistorico[];
  readonly travas: readonly TravaDaVigencia[];
  /** `horarios.criar` — a permissão que o banco exige para escrever vigência. */
  readonly podeRegistrar: boolean;
}) {
  return (
    <section className="flex flex-col gap-4" data-slot="secao-de-regime">
      <h2 className="text-texto text-base font-semibold">Regime de horário</h2>

      {TIPOS_DE_REGIME.map((tipo) => {
        const historico = historicoDoTipo(vigencias, tipo);
        return (
          <div key={tipo} className="flex flex-col gap-2" data-slot={`historico-${tipo}`}>
            <h3 className="text-texto-suave text-sm font-medium">
              {ROTULO_DO_TIPO_DE_REGIME[tipo]}
            </h3>

            {historico.length === 0 ? (
              <p className="text-texto-suave text-sm" role="status">
                Nenhuma vigência de {ROTULO_DO_TIPO_DE_REGIME[tipo].toLowerCase()} registrada.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {historico.map((v) => {
                  const trava = travaDe(v, travas);
                  const corrigivel = podeCorrigir(v, travas);
                  const marca = marcaDaCancelada(v);
                  return (
                    <li
                      key={v.id}
                      data-vigencia={v.codigo}
                      data-status={v.status}
                      data-corrigivel={corrigivel}
                      className="border-borda rounded-ciaara flex flex-col gap-1 border p-2 text-sm"
                    >
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {/* veste: o rótulo do período; as datas ao lado são dado */}
                        <span className="text-texto-tenue">de</span>
                        <span className="text-texto font-medium">{v.vigenteDe}</span>
                        <span className="text-texto-tenue">até</span>
                        <span className="text-texto">{v.vigenteAte ?? "—"}</span>
                        {marca ? (
                          <span className="text-atrasado-tinta" data-slot="marca-da-cancelada">
                            {marca}
                          </span>
                        ) : null}
                      </p>

                      <p className="flex flex-wrap gap-x-3 gap-y-1">
                        {resumoDe(v).map((p) => (
                          <Parametro key={p.nome} nome={p.nome} valor={p.valor} />
                        ))}
                      </p>

                      {v.fundamentoCurricular ? (
                        <p className="text-xs">
                          {/* veste: o rótulo do fundamento; o texto ao lado é dado */}
                          <span className="text-texto-tenue">Fundamento:</span>{" "}
                          <span className="text-texto-suave">{v.fundamentoCurricular}</span>
                        </p>
                      ) : null}

                      {trava ? (
                        <p className="text-texto-suave text-xs" data-slot="motivo-da-trava">
                          {mensagemDaTrava(trava)}
                        </p>
                      ) : null}

                      {podeRegistrar && corrigivel ? (
                        <details data-slot="corrigir-vigencia">
                          <summary className="text-texto cursor-pointer text-sm">
                            Corrigir esta vigência
                          </summary>
                          <div className="pt-2">
                            <FormularioDeVigencia
                              modo="corrigir"
                              cursoId={cursoId}
                              sigla={sigla}
                              vigenciaId={v.id}
                              inicial={valoresDaVigencia(v)}
                            />
                          </div>
                        </details>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      {podeRegistrar ? (
        <details data-slot="registrar-nova-vigencia">
          <summary className="text-texto cursor-pointer text-sm font-medium">
            Registrar nova vigência
          </summary>
          <div className="pt-2">
            <FormularioDeVigencia modo="registrar" cursoId={cursoId} sigla={sigla} />
          </div>
        </details>
      ) : (
        <p className="text-texto-suave text-sm" role="status" data-slot="sem-permissao-de-regime">
          O seu perfil consulta o regime, mas não registra vigência.
        </p>
      )}
    </section>
  );
}
