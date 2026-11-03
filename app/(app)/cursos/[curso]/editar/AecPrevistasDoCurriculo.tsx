/**
 * As **AEC previstas do currículo**, em *Editar curso → Currículo → Atividades e limites* — Bloco 18 (spec 033), RA-2 e
 * FR-002.2 — **folha de cliente**.
 *
 * > *"RA-2 AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional, obrigatória
 * > sim/não. Editadas na aba Atividades de Editar curso → Currículo. Correção em currículo em uso segue RC-6."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **NOVA E EDITAR ABREM UM DIÁLOGO** (RT-3; spec 022, Bloco 7, FR-002): nenhum campo aberto na página. O formulário
 *    fecha quando grava e fica aberto, com o que foi digitado, quando o banco recusa.
 * ⚠️ **NO CURRÍCULO EM USO, INCLUIR, MUDAR E DESATIVAR SÃO CORREÇÃO** (RC-6): o banco pede a justificativa, e o diálogo
 *    ÚNICO a pergunta (`usePedidoDeJustificativa`). Completar o TA «não definido» é livre.
 * ⚠️ **DESATIVAR, NUNCA APAGAR** (regra 4): a tabela não tem exceção nominal — o *Excluir* da RT-2 aparece
 *    desabilitado, com a dica do motivo. *"Inativar"* não aparece (RT-2).
 * ⚠️ **OS BOTÕES SEGUEM A PERMISSÃO DE EDITAR O CURSO** (`podeEditar`, decidido no servidor, como os limites); o banco
 *    recusa de qualquer forma.
 * ⚠️ **A RESPOSTA FICA ACIMA DA TABELA** (`role="status"`/`role="alert"`): a linha pode mudar de lugar sem levar a
 *    mensagem com ela.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  desativarAecPrevista,
  reativarAecPrevista,
  salvarAecPrevista,
} from "@/lib/acoes/aec-previstas";
import {
  opcoesDeDisciplina,
  opcoesDeTipo,
  ROTULO_DA_OBRIGATORIA,
  textoDaDisciplina,
  textoDaFonte,
  textoDosTaPrevistos,
  type AecPrevistaDoCurriculo,
  type DisciplinaDaAecPrevista,
  type TipoParaAecPrevista,
} from "@/lib/dominio/atividades/aec-previstas-no-curriculo";

const CLASSE_DO_SELETOR =
  "border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm";
const CLASSE_DO_TEXTO_LONGO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

/** O motivo de não haver exclusão permanente (regra 4; RT-2): a dica do ícone desabilitado. */
const MOTIVO_SEM_EXCLUSAO = "a AEC prevista não se exclui: use Desativar";

export function AecPrevistasDoCurriculo({
  sigla,
  versao,
  previstas,
  erro,
  tipos,
  disciplinas,
  avisoDoCatalogo = null,
  podeEditar,
}: {
  readonly sigla: string;
  readonly versao: number;
  readonly previstas: readonly AecPrevistaDoCurriculo[];
  /** A falha de leitura: a lista não foi lida (não é «não há»). */
  readonly erro: string | null;
  /** Os tipos de classificação AEC do catálogo, ativos e desativados (`tiposDeAec`). */
  readonly tipos: readonly TipoParaAecPrevista[];
  /** As disciplinas ativas do currículo. */
  readonly disciplinas: readonly DisciplinaDaAecPrevista[];
  /** O catálogo de tipos não foi lido: sem ele não há como escolher o tipo, e as ações ficam fora. */
  readonly avisoDoCatalogo?: string | null;
  readonly podeEditar: boolean;
}) {
  const router = useRouter();
  const [resposta, definirResposta] = React.useState<{ ok: boolean; texto: string } | null>(null);
  const [gravando, definirGravando] = React.useState(false);
  /* RC-6: desativar ou reativar no currículo em uso é correção — o pedido vem depois da confirmação. */
  const pedido = usePedidoDeJustificativa();

  const concluir = (texto: string) => {
    definirResposta({ ok: true, texto });
    router.refresh();
  };

  async function mudarSituacao(p: AecPrevistaDoCurriculo) {
    definirGravando(true);
    definirResposta(null);
    const r = await pedido.executar((justificativa) => {
      const entrada = { sigla, versao, id: p.id, ...(justificativa ? { justificativa } : {}) };
      return p.ativa ? desativarAecPrevista(entrada) : reativarAecPrevista(entrada);
    });
    definirGravando(false);
    if (r.ok) concluir(p.ativa ? "AEC prevista desativada." : "AEC prevista reativada.");
    else definirResposta({ ok: false, texto: r.erro });
  }

  return (
    <section
      aria-labelledby="titulo-aec-previstas-do-curriculo"
      className="flex flex-col gap-3"
      data-slot="aec-previstas-do-curriculo"
    >
      {pedido.dialogo}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-aec-previstas-do-curriculo" className="text-texto text-sm font-semibold">
          AEC previstas no currículo
        </h3>
        {podeEditar ? (
          <DialogoDeFormulario
            titulo="Nova AEC prevista"
            descricao="A palestra ou visita que o currículo nomeia. Cada turma que segue este currículo a herda como «a cumprir»."
            largo
            slot="dialogo-da-aec-prevista"
            gatilho={
              <BotaoDeIcone
                acao="novo"
                rotulo="Nova AEC prevista"
                variante="padrao"
                data-slot="nova-aec-prevista"
              />
            }
          >
            {(fechar) => (
              <FormularioDaAecPrevista
                sigla={sigla}
                versao={versao}
                prevista={null}
                tipos={tipos}
                disciplinas={disciplinas}
                fechar={fechar}
                aoConcluir={(texto) => {
                  fechar();
                  concluir(texto);
                }}
              />
            )}
          </DialogoDeFormulario>
        ) : null}
      </div>
      <p className="text-texto-suave text-xs">
        As palestras e visitas que o currículo nomeia, com os TA (vazio quando o currículo não diz).
        Cada turma as herda como «a cumprir»; o lançamento no DSA vinculado a elas é o que as
        cumpre.
      </p>

      {resposta ? (
        <p
          role={resposta.ok ? "status" : "alert"}
          className={resposta.ok ? "text-texto text-sm" : "text-atrasado-tinta text-sm"}
          data-slot="resposta-das-aec-previstas"
        >
          {resposta.texto}
        </p>
      ) : null}

      {avisoDoCatalogo ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="tipos-sem-leitura">
          {avisoDoCatalogo}
        </p>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="text-atrasado-tinta text-sm"
          data-slot="aec-previstas-sem-leitura"
        >
          {erro}
        </p>
      ) : previstas.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-aec-previstas">
          Nenhuma AEC prevista cadastrada neste currículo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-sm"
            aria-label="AEC previstas no currículo"
            data-slot="tabela-de-aec-previstas"
          >
            <thead>
              <tr className="border-borda border-b text-left">
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>TA previstos</Th>
                <Th>Disciplina</Th>
                <Th>Obrigatória</Th>
                <Th>Fonte</Th>
                <Th>Situação</Th>
                {podeEditar ? <Th>Ações</Th> : null}
              </tr>
            </thead>
            <tbody>
              {previstas.map((p) => (
                <tr
                  key={p.id}
                  className="border-borda border-b align-top"
                  data-slot="aec-prevista"
                  data-codigo={p.codigo}
                  data-ativa={p.ativa ? "sim" : "nao"}
                >
                  <td className="text-texto py-1 pr-3">
                    {p.nome}
                    {p.observacao ? (
                      <span className="text-texto-suave block text-xs">{p.observacao}</span>
                    ) : null}
                  </td>
                  <td className="text-texto py-1 pr-3">{p.tipoRotulo}</td>
                  <td className="text-texto py-1 pr-3" data-slot="ta-previstos">
                    {textoDosTaPrevistos(p.taPrevistos)}
                  </td>
                  <td className="text-texto py-1 pr-3">
                    {p.disciplina ? textoDaDisciplina(p.disciplina) : "—"}
                  </td>
                  <td className="text-texto py-1 pr-3">
                    {ROTULO_DA_OBRIGATORIA[p.obrigatoria ? "sim" : "nao"]}
                  </td>
                  <td className="text-texto-suave py-1 pr-3">
                    {textoDaFonte(p.fonteArquivo, p.fontePagina) ?? "—"}
                  </td>
                  <td className="text-texto py-1 pr-3" data-slot="situacao-da-aec-prevista">
                    {p.ativa ? "Ativa" : "Inativa"}
                  </td>
                  {podeEditar ? (
                    <td className="py-1">
                      <div className="flex justify-end gap-1">
                        <DialogoDeFormulario
                          titulo={`Editar ${p.nome}`}
                          largo
                          slot="dialogo-da-aec-prevista"
                          gatilho={
                            <BotaoDeIcone
                              acao="editar"
                              rotulo={`Editar a AEC prevista ${p.nome}`}
                              variante="fantasma"
                              data-slot="editar-aec-prevista"
                            />
                          }
                        >
                          {(fechar) => (
                            <FormularioDaAecPrevista
                              sigla={sigla}
                              versao={versao}
                              prevista={p}
                              tipos={tipos}
                              disciplinas={disciplinas}
                              fechar={fechar}
                              aoConcluir={(texto) => {
                                fechar();
                                concluir(texto);
                              }}
                            />
                          )}
                        </DialogoDeFormulario>
                        <DialogoConfirmacao
                          titulo={
                            p.ativa
                              ? `Desativar a AEC prevista «${p.nome}»?`
                              : `Reativar a AEC prevista «${p.nome}»?`
                          }
                          consequencia={
                            p.ativa
                              ? "Ela sai das turmas que seguem este currículo como «a cumprir». O registro fica guardado como inativo e pode ser reativado."
                              : "Ela volta às turmas que seguem este currículo como «a cumprir»."
                          }
                          rotuloConfirmar={p.ativa ? "Desativar" : "Reativar"}
                          aoConfirmar={() => void mudarSituacao(p)}
                        >
                          <BotaoDeIcone
                            acao={p.ativa ? "desativar" : "reativar"}
                            rotulo={`${p.ativa ? "Desativar" : "Reativar"} a AEC prevista ${p.nome}`}
                            variante="fantasma"
                            ocupado={gravando}
                            data-slot={p.ativa ? "desativar-aec-prevista" : "reativar-aec-prevista"}
                          />
                        </DialogoConfirmacao>
                        <BotaoDeIcone
                          acao="excluir"
                          rotulo={`Excluir a AEC prevista ${p.nome}`}
                          variante="fantasma"
                          indisponivel={MOTIVO_SEM_EXCLUSAO}
                          data-slot="excluir-aec-prevista"
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 pr-3 font-normal">
      {children}
    </th>
  );
}

/**
 * O formulário da AEC prevista, dentro do diálogo. Sem `prevista`, inclui; com ela, edita — começando do valor gravado.
 *
 * ⚠️ O PEDIDO DE JUSTIFICATIVA MORA AQUI DENTRO (como no formulário do regime): ele abre sobre o diálogo, e cancelar
 *    devolve a recusa — o formulário continua aberto, com o que foi digitado.
 */
function FormularioDaAecPrevista({
  sigla,
  versao,
  prevista,
  tipos,
  disciplinas,
  fechar,
  aoConcluir,
}: {
  readonly sigla: string;
  readonly versao: number;
  readonly prevista: AecPrevistaDoCurriculo | null;
  readonly tipos: readonly TipoParaAecPrevista[];
  readonly disciplinas: readonly DisciplinaDaAecPrevista[];
  /** Fecha o diálogo sem gravar (o *Cancelar*). */
  readonly fechar: () => void;
  /** Gravou: fecha o diálogo e publica a resposta acima da tabela. */
  readonly aoConcluir: (mensagem: string) => void;
}) {
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);
  const { executar, dialogo } = usePedidoDeJustificativa();
  const id = prevista?.id ?? "nova";
  const opcoesDoTipo = opcoesDeTipo(tipos, prevista?.tipoId ?? null);
  const opcoesDaDisciplina = opcoesDeDisciplina(disciplinas, prevista?.disciplina ?? null);

  async function gravar(dados: FormData) {
    definirErro(null);
    definirGravando(true);
    const resultado = await executar((justificativa) =>
      salvarAecPrevista({
        sigla,
        versao,
        ...(prevista ? { id: prevista.id } : {}),
        nome: String(dados.get("nome") ?? ""),
        tipoAtividadeId: String(dados.get("tipo") ?? ""),
        taPrevistos: String(dados.get("ta_previstos") ?? ""),
        disciplinaId: String(dados.get("disciplina") ?? ""),
        obrigatoria: dados.get("obrigatoria") !== "nao",
        fonteArquivo: String(dados.get("fonte_arquivo") ?? ""),
        fontePagina: String(dados.get("fonte_pagina") ?? ""),
        observacao: String(dados.get("observacao") ?? ""),
        ...(justificativa ? { justificativa } : {}),
      }),
    );
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    aoConcluir(prevista ? "AEC prevista gravada." : "AEC prevista incluída.");
  }

  return (
    <form action={gravar} className="flex flex-col gap-3" data-slot="formulario-da-aec-prevista">
      {dialogo}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`aec-${id}-nome`}>Nome</Label>
        <Input
          id={`aec-${id}-nome`}
          name="nome"
          required
          maxLength={200}
          defaultValue={prevista?.nome ?? ""}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label htmlFor={`aec-${id}-tipo`}>Tipo</Label>
          <select
            id={`aec-${id}-tipo`}
            name="tipo"
            required
            defaultValue={prevista?.tipoId ?? ""}
            className={CLASSE_DO_SELETOR}
          >
            <option value="">Escolha</option>
            {opcoesDoTipo.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ativo ? t.rotulo : `${t.rotulo} (desativado)`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`aec-${id}-ta`}>TA previstos</Label>
          <Input
            id={`aec-${id}-ta`}
            name="ta_previstos"
            inputMode="numeric"
            defaultValue={prevista?.taPrevistos ?? ""}
            aria-describedby={`aec-${id}-ta-dica`}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`aec-${id}-obrigatoria`}>Obrigatória</Label>
          <select
            id={`aec-${id}-obrigatoria`}
            name="obrigatoria"
            defaultValue={prevista === null || prevista.obrigatoria ? "sim" : "nao"}
            className={CLASSE_DO_SELETOR}
          >
            <option value="sim">{ROTULO_DA_OBRIGATORIA.sim}</option>
            <option value="nao">{ROTULO_DA_OBRIGATORIA.nao}</option>
          </select>
        </div>
      </div>
      <p id={`aec-${id}-ta-dica`} className="text-texto-suave text-xs">
        Deixe os TA vazios quando o currículo não diz quantos são: fica «não definido», nunca zero.
      </p>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`aec-${id}-disciplina`}>Disciplina (opcional)</Label>
        <select
          id={`aec-${id}-disciplina`}
          name="disciplina"
          defaultValue={prevista?.disciplina?.id ?? ""}
          className={CLASSE_DO_SELETOR}
        >
          <option value="">Nenhuma</option>
          {opcoesDaDisciplina.map((d) => (
            <option key={d.id} value={d.id}>
              {d.ativa === false ? `${textoDaDisciplina(d)} (inativa)` : textoDaDisciplina(d)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <Label htmlFor={`aec-${id}-arquivo`}>Arquivo do currículo (opcional)</Label>
          <Input
            id={`aec-${id}-arquivo`}
            name="fonte_arquivo"
            maxLength={200}
            defaultValue={prevista?.fonteArquivo ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`aec-${id}-pagina`}>Página (opcional)</Label>
          <Input
            id={`aec-${id}-pagina`}
            name="fonte_pagina"
            maxLength={100}
            defaultValue={prevista?.fontePagina ?? ""}
            className="w-40"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`aec-${id}-observacao`}>Observação (opcional)</Label>
        <textarea
          id={`aec-${id}-observacao`}
          name="observacao"
          rows={2}
          maxLength={1000}
          defaultValue={prevista?.observacao ?? ""}
          className={CLASSE_DO_TEXTO_LONGO}
        />
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-da-aec-prevista">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-aec-prevista">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
