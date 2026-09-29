/**
 * Os instrutores daquela turma-disciplina, e o **rateio nos cinco casos** (`FR-031`, `FR-041`).
 *
 * ⚠️ **A ESCOLHA DE INSTRUTOR VEM DO COMPONENTE ÚNICO — `SeletorInstrutor`.** A `RN-ANT-01` é de
 * Risco **ALTO** e vale por ponto único: o `SC-002` reprova qualquer arquivo que mencione instrutor
 * e construa uma escolha fora dele. A primeira escrita deste painel tinha caixas de marcar e dois
 * `<select>` próprios, e reprovou — com razão: o canônico **reordena o que recebe** pela escala de
 * antiguidade, e um construtor paralelo devolveria o *"esquecer numa tela nova"* que ele elimina.
 *
 * ⚠️ **SÓ OS HABILITADOS APARECEM** (`RF-MATERIAS-02`). Quando a lista está vazia, a tela **oferece o
 * caminho de habilitar** em vez de mostrar um seletor mudo — são **55** disciplinas reais nessa
 * situação, e um seletor vazio sem saída é o que faz alguém concluir que o sistema está quebrado.
 *
 * ⚠️ **A SOMA É ANTECIPADA PELA FUNÇÃO PURA; quem GARANTE é o banco** (`FR-043`). `ratear` mostra o
 * número e a frase antes de gravar; o gatilho adiado recusa se não fechar. Se um dia discordarem,
 * quem está errada é a tela — a função pura é a referência, e `rateio-da-view.test.ts` amarra os dois.
 *
 * ⚠️ **OS CASOS 4 E 5 NÃO COEXISTEM**, e por isso o modo é uma **escolha entre três**, não dois
 * campos preenchíveis juntos. Deixar os dois abertos produziria o estado que o banco recusa com
 * `rateio_por_ue_com_ta`.
 */
import * as React from "react";
import Link from "next/link";

import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirInstrutoresDaTurma } from "@/lib/acoes/atribuicao";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { explicacaoDoCaso, ratear, type ModoDeAtribuicao } from "@/lib/dominio/rateio-de-carga";

import type { HabilitadoDaLinha, InstrutorDaLinha, UnidadeDaLinha } from "../consulta";

type ModoDaTela = "automatico" | "por_tempos" | "por_unidades";

export function PainelDeInstrutores({
  turmaDisciplinaId,
  cargaHorariaTempos,
  modoDaDisciplina,
  atribuidos,
  habilitados,
  unidades,
  escala,
  podeEditar,
}: {
  readonly turmaDisciplinaId: string;
  readonly cargaHorariaTempos: number;
  readonly modoDaDisciplina: string;
  readonly atribuidos: readonly InstrutorDaLinha[];
  readonly habilitados: readonly HabilitadoDaLinha[];
  readonly unidades: readonly UnidadeDaLinha[];
  readonly escala: EscalaDeAntiguidade;
  readonly podeEditar: boolean;
}) {
  const unidadesAtivas = unidades.filter((u) => u.ativa);

  const [marcados, setMarcados] = React.useState<readonly string[]>(
    atribuidos.map((a) => a.instrutorId),
  );
  const [tempos, setTempos] = React.useState<Readonly<Record<string, string>>>({});
  const [donoDaUnidade, setDonoDaUnidade] = React.useState<Readonly<Record<string, string>>>({});
  const [modo, setModo] = React.useState<ModoDaTela>("automatico");
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [gravando, setGravando] = React.useState(false);

  /** ⚠️ A ordem é a da lista de habilitados, que chega **ordenada pelo banco** por antiguidade. */
  const emOrdem = habilitados.filter((h) => marcados.includes(h.instrutorId));

  /** O que o `SeletorInstrutor` precisa — ele reordena o que recebe, e por isso recebe os campos. */
  const paraOSeletor = (lista: readonly HabilitadoDaLinha[]) =>
    lista.map((h) => ({
      id: h.instrutorId,
      pg: h.pg,
      especialidade: h.especialidade,
      nomeCompleto: h.nomeCompleto,
      nomeDeGuerra: h.nomeDeGuerra,
    }));

  const naoMarcados = habilitados.filter((h) => !marcados.includes(h.instrutorId));

  const previsao = ratear({
    cargaHorariaTempos,
    modo: (modoDaDisciplina === "simultaneo" ? "simultaneo" : "dividido") as ModoDeAtribuicao,
    temAtribuicaoPorUnidade: modo === "por_unidades",
    instrutores: emOrdem.map((h) => ({
      instrutorId: h.instrutorId,
      temposDigitados:
        modo === "por_tempos" && (tempos[h.instrutorId] ?? "") !== ""
          ? Number(tempos[h.instrutorId])
          : null,
      temposDasUnidades:
        modo === "por_unidades"
          ? unidadesAtivas
              .filter((u) => donoDaUnidade[u.id] === h.instrutorId)
              .reduce((total, u) => total + u.chPrevistaTempos, 0)
          : null,
    })),
  });

  const temposPrevistosDe = (instrutorId: string) =>
    previsao.parcelas.find((p) => p.instrutorId === instrutorId)?.tempos ?? 0;

  async function gravar() {
    setMensagem(null);
    setErro(null);
    setGravando(true);
    const resultado = await definirInstrutoresDaTurma({
      turmaDisciplinaId,
      instrutores: emOrdem.map((h) => ({
        instrutorId: h.instrutorId,
        chPrevistaTempos:
          modo === "por_tempos" && (tempos[h.instrutorId] ?? "") !== ""
            ? Number(tempos[h.instrutorId])
            : null,
      })),
      unidades:
        modo === "por_unidades"
          ? unidadesAtivas
              .filter((u) => (donoDaUnidade[u.id] ?? "") !== "")
              .map((u) => ({ unidadeEnsinoId: u.id, instrutorId: donoDaUnidade[u.id]! }))
          : null,
    });
    if (resultado.ok) setMensagem("Instrutores gravados nesta turma.");
    else setErro(resultado.erro);
    setGravando(false);
  }

  return (
    <section aria-labelledby={`instrutores-${turmaDisciplinaId}`} className="flex flex-col gap-2">
      <h3 id={`instrutores-${turmaDisciplinaId}`} className="text-texto text-sm font-semibold">
        Instrutores nesta turma
      </h3>

      {habilitados.length === 0 ? (
        /* ⚠️ **CAMINHO CLICÁVEL, e não um beco.** São 55 disciplinas reais sem ninguém habilitado. */
        <p className="text-texto-suave text-sm" data-slot="sem-habilitado">
          Nenhum instrutor habilitado nesta disciplina. A habilitação é feita na ficha do instrutor,
          no painel de disciplinas —{" "}
          <Link
            href="/instrutores"
            className="text-marca rounded-ciaara-sm underline focus-visible:ring-2 focus-visible:outline-none"
          >
            abrir a lista de instrutores
          </Link>
          .
        </p>
      ) : (
        <>
          {/* ── quem já está ─────────────────────────────────────────────────────────────────── */}
          <ul className="flex flex-col gap-1" data-slot="atribuidos">
            {emOrdem.length === 0 ? (
              <li className="text-erro text-sm">Nenhum instrutor atribuído nesta turma.</li>
            ) : (
              emOrdem.map((h) => (
                <li key={h.instrutorId} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-texto">{h.nome}</span>
                  <span className="text-texto-suave text-xs tabular-nums" data-slot="parcela">
                    {temposPrevistosDe(h.instrutorId)} tempos
                  </span>

                  {modo === "por_tempos" ? (
                    <Input
                      aria-label={`Tempos de ${h.nome}`}
                      type="number"
                      min={0}
                      step={1}
                      className="w-20"
                      value={tempos[h.instrutorId] ?? ""}
                      onChange={(e) =>
                        setTempos((atuais) => ({ ...atuais, [h.instrutorId]: e.target.value }))
                      }
                    />
                  ) : null}

                  {podeEditar ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMarcados((atuais) => atuais.filter((id) => id !== h.instrutorId))
                      }
                    >
                      Tirar
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          {/* ── acrescentar, pelo seletor único ──────────────────────────────────────────────── */}
          {podeEditar && naoMarcados.length > 0 ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`acrescentar-${turmaDisciplinaId}`}>Acrescentar instrutor</Label>
              <SeletorInstrutor
                instrutores={paraOSeletor(naoMarcados)}
                escala={escala}
                valor=""
                aoMudar={(id) => setMarcados((atuais) => [...atuais, id])}
                className="w-80"
              />
            </div>
          ) : null}

          {/* ── o modo do rateio ─────────────────────────────────────────────────────────────── */}
          {podeEditar ? (
            <fieldset className="flex flex-col gap-1" data-slot="modo-do-rateio">
              {/* veste: rótulo do grupo de opções */}
              <legend className="text-texto-suave text-xs">Como dividir a carga horária</legend>
              {(
                [
                  [
                    "automatico",
                    modoDaDisciplina === "simultaneo"
                      ? "Simultâneo — carga integral para cada um"
                      : "Dividir igualmente (resto aos mais antigos)",
                  ],
                  ["por_tempos", "Informar os tempos de cada um"],
                  // ⚠️ Só em disciplina COM unidade (`FR-041.5`).
                  ...(unidadesAtivas.length > 0
                    ? [["por_unidades", "Dividir pelas unidades de ensino"] as const]
                    : []),
                ] as ReadonlyArray<readonly [ModoDaTela, string]>
              ).map(([valor, rotulo]) => (
                <label key={valor} className="text-texto flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`modo-${turmaDisciplinaId}`}
                    value={valor}
                    checked={modo === valor}
                    onChange={() => setModo(valor)}
                  />
                  {rotulo}
                </label>
              ))}
            </fieldset>
          ) : null}

          {/* ── caso 5: quem fica com cada UE ────────────────────────────────────────────────── */}
          {modo === "por_unidades" ? (
            <ul className="flex flex-col gap-1" data-slot="unidades-por-instrutor">
              {unidadesAtivas.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-texto">
                    {u.numeroUe} — {u.topico} ({u.chPrevistaTempos} tempos)
                  </span>
                  <SeletorInstrutor
                    instrutores={paraOSeletor(emOrdem)}
                    escala={escala}
                    valor={donoDaUnidade[u.id] ?? ""}
                    aoMudar={(id) => setDonoDaUnidade((atuais) => ({ ...atuais, [u.id]: id }))}
                    rotulo={`Instrutor da unidade ${u.numeroUe}`}
                    className="w-72"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {/* ── a soma, antecipada ───────────────────────────────────────────────────────────── */}
          <p className="text-texto-suave text-xs" data-slot="soma-do-rateio">
            {explicacaoDoCaso(previsao.caso)} Soma: <strong>{previsao.soma}</strong> de{" "}
            {cargaHorariaTempos} tempos.
          </p>
          {previsao.motivo !== null ? (
            <p role="alert" className="text-erro text-xs" data-slot="rateio-nao-fecha">
              {previsao.motivo}
            </p>
          ) : null}

          {podeEditar ? (
            <div>
              <Button
                type="button"
                size="sm"
                onClick={gravar}
                disabled={gravando}
                data-slot="gravar-instrutores"
              >
                {gravando ? "Gravando…" : "Gravar instrutores"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-erro text-sm">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
