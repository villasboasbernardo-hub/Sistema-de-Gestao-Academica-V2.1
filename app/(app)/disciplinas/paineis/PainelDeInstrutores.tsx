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
 * caminho de habilitar** em vez de mostrar um seletor mudo — um seletor vazio sem saída é o que faz
 * alguém concluir que o sistema está quebrado. *(O comentário dizia "55 disciplinas reais", sem data
 * nem artefato — regra 9.2; o número não foi remedido.)*
 *
 * ⚠️ **E O VAZIO DIZ O MOTIVO CERTO** (spec 029, `FR-006.3`): sem `instrutores.ler`, a RLS devolve a
 * lista vazia e a frase seria *"Nenhum instrutor habilitado"* — o «não há» onde o motivo é «você não
 * vê». Com a leitura dos habilitados em falha, a frase diz que ela falhou (D-16). No rateio por UE, a
 * lista de cada unidade é a dos ATRIBUÍDOS, e vazia ela pede para acrescentar instrutor — não a caixa
 * *"Nada cadastrado ainda"* repetida em cada UE, que era o que aparecia.
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

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirInstrutoresDaTurma } from "@/lib/acoes/atribuicao";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import {
  fraseDaListaDeInstrutoresVazia,
  vazioDaListaDeInstrutores,
} from "@/lib/dominio/dsa/instrutores-da-aula";
import { explicacaoDoCaso, ratear, type ModoDeAtribuicao } from "@/lib/dominio/rateio-de-carga";

import type { HabilitadoDaLinha, InstrutorDaLinha, UnidadeDaLinha } from "../consulta";

type ModoDaTela = "automatico" | "por_tempos" | "por_unidades";

type PropsDoPainel = {
  readonly turmaDisciplinaId: string;
  readonly cargaHorariaTempos: number;
  readonly modoDaDisciplina: string;
  readonly atribuidos: readonly InstrutorDaLinha[];
  readonly habilitados: readonly HabilitadoDaLinha[];
  readonly unidades: readonly UnidadeDaLinha[];
  readonly escala: EscalaDeAntiguidade;
  readonly podeEditar: boolean;
  /** O perfil tem `instrutores.ler`? Decidido no servidor (FR-006 da spec 029). */
  readonly podeLerInstrutores: boolean;
  /** A leitura dos habilitados deu certo? Falha não é «nenhum habilitado» (D-16 da spec 029). */
  readonly habilitadosLidos: boolean;
};

/**
 * ⚠️ **A LISTA É LEITURA; ATRIBUIR ABRE UM DIÁLOGO** (spec 022, Bloco 7, FR-002; *"nunca campos abertos na página"*).
 *    Até o Bloco 7 o seletor, o modo do rateio e os tempos ficavam abertos no detalhe da disciplina. A lista mostra quem
 *    está atribuído e a parcela de cada um pela mesma conta de antes (`ratear`); o editor inteiro mora no diálogo.
 */
export function PainelDeInstrutores(props: PropsDoPainel) {
  const {
    turmaDisciplinaId,
    cargaHorariaTempos,
    modoDaDisciplina,
    atribuidos,
    habilitados,
    escala,
    podeEditar,
    podeLerInstrutores,
    habilitadosLidos,
  } = props;
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const atribuidosEmOrdem = habilitados.filter((h) =>
    atribuidos.some((a) => a.instrutorId === h.instrutorId),
  );
  const previsao = ratear({
    cargaHorariaTempos,
    modo: (modoDaDisciplina === "simultaneo" ? "simultaneo" : "dividido") as ModoDeAtribuicao,
    temAtribuicaoPorUnidade: false,
    instrutores: atribuidosEmOrdem.map((h) => ({
      instrutorId: h.instrutorId,
      temposDigitados: null,
      temposDasUnidades: null,
    })),
  });

  return (
    <section aria-labelledby={`instrutores-${turmaDisciplinaId}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`instrutores-${turmaDisciplinaId}`} className="text-texto text-sm font-semibold">
          Instrutores nesta turma
        </h3>
        {podeEditar && habilitados.length > 0 ? (
          <DialogoDeFormulario
            titulo="Instrutores nesta turma"
            largo
            slot="dialogo-dos-instrutores"
            gatilho={
              <BotaoDeIcone
                acao="editar"
                rotulo="Editar instrutores"
                data-slot="editar-instrutores"
              />
            }
          >
            {(fechar) => (
              <EditorDeInstrutores
                {...props}
                fechar={fechar}
                aoGravar={() => {
                  setMensagem("Instrutores gravados nesta turma.");
                  fechar();
                }}
              />
            )}
          </DialogoDeFormulario>
        ) : null}
      </div>

      {habilitados.length === 0 && (!podeLerInstrutores || !habilitadosLidos) ? (
        /*
         * ⚠️ **A LISTA VAZIA QUE NÃO É «NÃO HÁ»** (FR-006.3 e D-16 da spec 029): sem `instrutores.ler`, o «você não vê»;
         *    com a leitura em falha, que ela falhou. As duas frases saem do vazio do seletor único — a do «você não vê» é
         *    dele, e o desenho (`role="status"`, `data-motivo`) é o mesmo dos campos.
         */
        <SeletorInstrutor
          instrutores={[]}
          escala={escala}
          aoMudar={() => undefined}
          rotulo="Instrutores habilitados nesta disciplina"
          vazio={vazioDaListaDeInstrutores(podeLerInstrutores, "sem-leitura")}
        />
      ) : habilitados.length === 0 ? (
        /*
         * ⚠️ **CAMINHO CLICÁVEL, e não um beco.** A frase é a do dono único (`sem-habilitado`, a mesma da aula do DSA e
         *    do TA fora do DSA); o vínculo é da tela.
         */
        <p className="text-texto-suave text-sm" data-slot="sem-habilitado">
          {fraseDaListaDeInstrutoresVazia("sem-habilitado")}{" "}
          <Link
            href="/instrutores"
            className="text-marca rounded-ciaara-sm underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Abrir a lista de instrutores
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-1" data-slot="atribuidos-em-leitura">
          {atribuidosEmOrdem.length === 0 ? (
            <li className="text-conflito-tinta text-sm">Nenhum instrutor atribuído nesta turma.</li>
          ) : (
            atribuidosEmOrdem.map((h) => (
              <li key={h.instrutorId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-texto">{h.nome}</span>
                <span className="text-texto-suave text-xs tabular-nums" data-slot="parcela-gravada">
                  {previsao.parcelas.find((p) => p.instrutorId === h.instrutorId)?.tempos ?? 0}{" "}
                  tempos
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
    </section>
  );
}

function EditorDeInstrutores({
  turmaDisciplinaId,
  cargaHorariaTempos,
  modoDaDisciplina,
  atribuidos,
  habilitados,
  unidades,
  escala,
  podeEditar,
  podeLerInstrutores,
  fechar,
  aoGravar,
}: PropsDoPainel & { readonly fechar: () => void; readonly aoGravar: () => void }) {
  const unidadesAtivas = unidades.filter((u) => u.ativa);

  const [marcados, setMarcados] = React.useState<readonly string[]>(
    atribuidos.map((a) => a.instrutorId),
  );
  const [tempos, setTempos] = React.useState<Readonly<Record<string, string>>>({});
  const [donoDaUnidade, setDonoDaUnidade] = React.useState<Readonly<Record<string, string>>>({});
  const [modo, setModo] = React.useState<ModoDaTela>("automatico");
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
    setGravando(false);
    if (resultado.ok) aoGravar();
    else setErro(resultado.erro);
  }

  return (
    <div className="flex flex-col gap-3" data-slot="editor-de-instrutores">
      {habilitados.length === 0 ? null : (
        <>
          {/* ── quem já está ─────────────────────────────────────────────────────────────────── */}
          <ul className="flex flex-col gap-1" data-slot="atribuidos">
            {emOrdem.length === 0 ? (
              <li className="text-conflito-tinta text-sm">
                Nenhum instrutor atribuído nesta turma.
              </li>
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
                /*
                 * ⚠️ Inalcançável pelo `naoMarcados.length > 0` acima, que esconde o campo quando todos os
                 *    habilitados já estão marcados; o vazio declarado é o da lista de onde ele sai.
                 */
                vazio={vazioDaListaDeInstrutores(podeLerInstrutores, "sem-habilitado")}
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
                    /*
                     * ⚠️ A lista de cada UE é a dos ATRIBUÍDOS (`emOrdem`): vazia, ninguém foi acrescentado ainda —
                     *    FILTRO de atribuição, não falta de cadastro (FR-006 da spec 029).
                     */
                    vazio={vazioDaListaDeInstrutores(podeLerInstrutores, "sem-atribuido")}
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
            <p role="alert" className="text-conflito-tinta text-xs" data-slot="rateio-nao-fecha">
              {previsao.motivo}
            </p>
          ) : null}
        </>
      )}

      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        {podeEditar ? (
          <Button
            type="button"
            size="sm"
            onClick={gravar}
            disabled={gravando}
            data-slot="gravar-instrutores"
          >
            {gravando ? "Gravando…" : "Gravar instrutores"}
          </Button>
        ) : null}
      </DialogFooter>
    </div>
  );
}
