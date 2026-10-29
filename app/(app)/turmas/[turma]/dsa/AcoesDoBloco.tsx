/**
 * O CARTÃO ÚNICO de um lançamento já na grade — editar tudo de uma vez, e excluir (`RF-DSA-07`,
 * `FR-029` a `FR-032`, `RNF-USA-03`, `Q-1`, `Q-12` · spec 013; ajustes 1 e 2 do PR #40).
 *
 * > *"UM CARTÃO SÓ. Clicar no cartão de um lançamento abre UM diálogo onde se edita tudo de uma vez:
 * > dia, tempo inicial, quantos tempos, disciplina/UE, tópico, quem ministra, técnica, local. (…) Um
 * > só botão Gravar, uma só Server Action. Excluir continua no mesmo diálogo, com confirmação."*
 * > — Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **TODO CAMPO NASCE COM O VALOR GRAVADO NAQUELE LANÇAMENTO, NUNCA COM O DO CADASTRO** (ajuste 2).
 * O pré-preenchimento é só do lançamento NOVO (`FormularioDeLancamento`). Os valores vêm de
 * `fato.gravado`, cru — e não dos campos de exibição, que na avaliação mostram o tipo no lugar do
 * tópico vazio e o fiscal antes do responsável: reabrir com eles e gravar reescrevia o lançamento.
 *
 * ⚠️ **O GRAVAR MANDA SÓ O QUE MUDOU.** Campo que a pessoa não tocou não viaja, e por isso não pode
 * ser reescrito por engano — é a mesma distinção `undefined`/`null` da Server Action.
 *
 * ⚠️ **NA ATIVIDADE, O INSTRUTOR DO CADASTRO OU O «OUTRO RESPONSÁVEL (NOME LIVRE)»** (`RN-RESP-1`, emenda de
 * 15/10/2026): os dois são exclusivos (`ativ_responsavel_exclusivo`), e trocar um pelo outro manda os dois campos —
 * o novo e o antigo apagado. A Server Action zera o outro lado de qualquer jeito.
 *
 * ⚠️ **A SESSÃO DE APLICAÇÃO (`RN-AV-12`, 16/10/2026) MOVE, CRESCE E SE EXCLUI SOZINHA**: o cartão dela tem dia,
 * tempo, quantos tempos e local — sem quem ministra, porque quem aplica e quem fiscaliza são os da prova —, e excluir
 * inativa SÓ a sessão; a prova continua. E na AVALIAÇÃO sem item do currículo, o «Instrumento» (A2), opcional.
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** As ações chegam por propriedade (Princípio XI); quem decide é a
 * Server Action (`atualizar`), e quem impõe é o banco.
 */
"use client";

import {
  fraseDaListaDaAula,
  instrutoresDaAula,
  type HabilitacaoAtiva,
} from "@/lib/dominio/dsa/instrutores-da-aula";
import * as React from "react";

import { DialogFooter } from "@/components/ui/dialog";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrumentoOferecido } from "@/lib/dominio/dsa/instrumento-da-prova";
import type { DiaDaGrade, ValoresGravados } from "@/lib/dominio/dsa/grade";
import type { OrigemDoFato } from "@/lib/dominio/dsa/posicao-herdada";
import { tituloDoLancamento } from "@/lib/dominio/dsa/rotulos";
import { temposParaEscolher } from "@/lib/dominio/dsa/tempos-do-dia";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { regraDoResponsavel } from "@/lib/dominio/responsavel";
import { dataComDiaDaSemana } from "@/lib/formato/data";

import { EscolhaSimples } from "./EscolhaSimples";
import {
  ALERTA_SEM_UNIDADE,
  type DisciplinaOferecida,
  type ResultadoDaAcao,
  type UnidadeOferecida,
} from "./FormularioDeLancamento";
import { ResponsavelOuNomeLivre } from "./ResponsavelOuNomeLivre";

/** O fato escolhido, como a grade o conhece. */
export type FatoEscolhido = {
  readonly fatoId: string;
  readonly origem: OrigemDoFato;
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly disciplina: string | null;
  readonly conteudo: string | null;
  readonly local: string | null;
  readonly tecnica: string | null;
  readonly instrutor: string | null;
  /** `origem_migracao_v1 != null && editado_em == null` — é o que a catraca da `Q-1` lê. */
  readonly herdado: boolean;
  /** `true` quando o fato está na faixa "Sem posição" (`Q-12`). */
  readonly semPosicao: boolean;
  /** O GRAVADO, cru — a fonte de todo campo deste cartão (ajuste 2). */
  readonly gravado: ValoresGravados | undefined;
};

export type AcoesDoBlocoProps = {
  readonly fato: FatoEscolhido;
  /** Os dias da semana aberta, com o relógio — o destino possível e os tempos de cada um. */
  readonly diasDaSemana: readonly DiaDaGrade[];
  /** Quantos Tempos de Aula a grade tem. */
  readonly linhas: number;
  readonly unidades: readonly UnidadeOferecida[];
  readonly disciplinas: readonly DisciplinaOferecida[];
  readonly instrutores: readonly InstrutorParaExibir[];
  /** RD-1 (Bloco 11): na aula, a lista de quem ministra é só dos habilitados na disciplina escolhida. */
  readonly habilitacoes?: readonly HabilitacaoAtiva[];
  /**
   * O perfil tem `instrutores.ler`? Decidido no servidor. Sem ele as listas chegam vazias pela RLS, e o vazio diz
   * «o seu perfil não os alcança» — também na aula (FR-006.3 da spec 029).
   */
  readonly podeLerInstrutores: boolean;
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  /** A2 (16/10/2026): os instrumentos da prova sem item — os ativos, menos a OD. */
  readonly instrumentos?: readonly InstrumentoOferecido[];
  readonly atualizar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly excluir: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly aoFechar: () => void;
};

const texto = (v: string): string | null => (v.trim() === "" ? null : v.trim());

export function AcoesDoBloco({
  fato,
  diasDaSemana,
  linhas,
  unidades,
  disciplinas,
  instrutores,
  habilitacoes = [],
  podeLerInstrutores,
  escala,
  tecnicas,
  instrumentos = [],
  atualizar,
  excluir,
  aoFechar,
}: AcoesDoBlocoProps) {
  const g: ValoresGravados = fato.gravado ?? {
    instrutorId: null,
    unidadeEnsinoId: null,
    disciplinaId: null,
    conteudo: fato.conteudo,
    tecnica: fato.tecnica,
    local: fato.local,
    responsavelExterno: null,
  };
  const ehAula = fato.origem === "aula";
  const ehAtividade = fato.origem === "atividade_nao_letiva";
  /* `RN-AV-12`: a 2ª, 3ª… sessão da MESMA prova — sem tópico, técnica nem quem ministra próprios. */
  const ehSessaoDeAplicacao = fato.origem === "sessao_aplicacao";
  /* `RN-RESP-1`: a regra do papel de quem responde. A categoria da atividade não chega ao cartão — vale o comum. */
  const regra = regraDoResponsavel(
    ehAula
      ? { tipo: "aula" }
      : fato.origem === "avaliacao" || ehSessaoDeAplicacao
        ? { tipo: "avaliacao", papel: "aplicador" }
        : { tipo: "atividade", categoria: null },
  );
  const temTopico = fato.origem === "aula" || fato.origem === "avaliacao";
  const temQuemMinistra = fato.origem !== "vista_prova" && !ehSessaoDeAplicacao;
  /* A2: o instrumento só na AVALIAÇÃO sem item do currículo — com item, é o do item. */
  const temInstrumento =
    fato.origem === "avaliacao" &&
    (g.avaliacaoCurriculoId ?? null) === null &&
    instrumentos.length > 0;

  /* A disciplina gravada: a da UE, quando há UE; senão a da coluna. */
  const disciplinaGravada =
    (g.unidadeEnsinoId === null
      ? null
      : (unidades.find((u) => u.id === g.unidadeEnsinoId)?.disciplinaId ?? null)) ?? g.disciplinaId;

  const [dia, definirDia] = React.useState(fato.data);
  const [ta, definirTa] = React.useState(String(fato.taInicial ?? 1));
  const [tempos, definirTempos] = React.useState(String(fato.tempos ?? 1));
  const [disciplinaId, definirDisciplina] = React.useState(disciplinaGravada ?? "");
  const [unidadeId, definirUnidade] = React.useState(g.unidadeEnsinoId ?? "");
  const [conteudo, definirConteudo] = React.useState(g.conteudo ?? "");
  const [tecnica, definirTecnica] = React.useState(g.tecnica ?? "");
  const [instrutorId, definirInstrutor] = React.useState(g.instrutorId ?? "");
  const [nomeLivre, definirNomeLivre] = React.useState(g.responsavelExterno ?? "");
  const [local, definirLocal] = React.useState(g.local ?? "");
  const [instrumentoId, definirInstrumento] = React.useState(g.instrumentoId ?? "");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [avisos, definirAvisos] = React.useState<readonly { codigo: string; texto: string }[]>([]);
  const [agindo, definirAgindo] = React.useState(false);

  const unidadesDaDisciplina = unidades.filter((u) => u.disciplinaId === disciplinaId);
  /*
   * RD-1 (Bloco 11): na aula, só os habilitados na disciplina escolhida; o gravado que não é habilitado não aparece, e a
   * tela diz — sem mudar quem ministra nem a disciplina, nada se confere (D-4).
   */
  const listaDeQuemMinistra = ehAula
    ? instrutoresDaAula(instrutores, habilitacoes, disciplinaId === "" ? null : disciplinaId)
    : instrutores;
  /*
   * ⚠️ Sem `instrutores.ler` a lista é vazia pela RLS, e o gravado sairia "não habilitado" sem ter sido conferido — o
   *    «não há» onde o motivo é «você não vê» (FR-006.3 da spec 029). A Server Action confere o par de qualquer jeito.
   */
  const gravadoForaDaLista =
    podeLerInstrutores &&
    ehAula &&
    instrutorId !== "" &&
    disciplinaId !== "" &&
    !listaDeQuemMinistra.some((i) => i.id === instrutorId);
  const semUnidade = ehAula && disciplinaId !== "" && unidadeId === "";
  const diaEscolhido = diasDaSemana.find((d) => d.data === dia);

  async function executar(acao: () => Promise<ResultadoDaAcao>): Promise<void> {
    definirRecusa(null);
    definirAvisos([]);
    definirAgindo(true);
    const resposta = await acao();
    definirAgindo(false);
    if (!resposta.ok) {
      definirRecusa(resposta.mensagem);
      return;
    }
    definirAvisos(resposta.avisos);
    /* Sem aviso, o cartão fecha; com aviso, ele fica para a pessoa LER (`RN-DEG-02`). */
    if (resposta.avisos.length === 0) aoFechar();
  }

  /** Só o que mudou em relação ao GRAVADO. */
  function mudancas(): Record<string, unknown> {
    const m: Record<string, unknown> = {};
    if (dia !== fato.data) m["data"] = dia;
    if (Number(ta) !== fato.taInicial) m["taInicial"] = Number(ta);
    if (Number(tempos) !== fato.tempos) m["tempos"] = Number(tempos);
    if (texto(local) !== g.local) m["local"] = texto(local);
    if (ehAula) {
      const novaUe = unidadeId === "" ? null : unidadeId;
      if (novaUe !== g.unidadeEnsinoId) m["unidadeEnsinoId"] = novaUe;
      const novaDisciplina = novaUe === null && disciplinaId !== "" ? disciplinaId : null;
      if (novaUe === null && novaDisciplina !== g.disciplinaId) m["disciplinaId"] = novaDisciplina;
    }
    if (temTopico || fato.origem === "atividade_nao_letiva") {
      if (texto(conteudo) !== g.conteudo) m["conteudo"] = texto(conteudo);
    }
    if (temTopico && texto(tecnica) !== g.tecnica) m["tecnica"] = texto(tecnica);
    if (temInstrumento) {
      const novo = instrumentoId === "" ? null : instrumentoId;
      if (novo !== (g.instrumentoId ?? null)) m["instrumentoId"] = novo;
    }
    if (ehAtividade) {
      /*
       * `RN-RESP-1`: na atividade o responsável é OPCIONAL — «Tirar o instrutor» apaga (`null`), e o nome livre só
       * viaja sem instrutor. Mandar os dois (um novo, o outro apagado) é o que troca um pelo outro sem `23514`.
       */
      const novoInstrutor = instrutorId === "" ? null : instrutorId;
      const novoLivre = novoInstrutor === null ? texto(nomeLivre) : null;
      if (novoInstrutor !== g.instrutorId) m["instrutorId"] = novoInstrutor;
      if (novoLivre !== (g.responsavelExterno ?? null)) m["responsavelExterno"] = novoLivre;
    } else if (temQuemMinistra && instrutorId !== "" && instrutorId !== g.instrutorId) {
      /* Quem ministra não se apaga por aqui: vazio é "não mexi". */
      m["instrutorId"] = instrutorId;
    }
    return m;
  }

  /* Spec 029, D-6: o Estudo Individual sem «O que é» se nomeia pelo subtipo, e não «Lançamento». */
  const titulo = tituloDoLancamento(fato);

  return (
    <section
      data-slot="acoes-do-bloco"
      aria-label={`Lançamento: ${titulo}`}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-texto" data-slot="bloco-escolhido">
        <strong>{titulo}</strong>
        <span className="block text-xs text-texto-suave">
          {fato.semPosicao
            ? `${dataComDiaDaSemana(fato.data)} · sem posição`
            : `${dataComDiaDaSemana(fato.data)} · a partir do tempo ${fato.taInicial ?? "—"}`}
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <EscolhaSimples
          id="dsa-mover-dia"
          rotulo="Dia"
          valor={dia}
          aoMudar={definirDia}
          opcoes={diasDaSemana.map((d) => ({ valor: d.data, rotulo: dataComDiaDaSemana(d.data) }))}
        />
        <EscolhaSimples
          id="dsa-mover-ta"
          rotulo="Em qual tempo começa"
          valor={ta}
          aoMudar={definirTa}
          opcoes={temposParaEscolher(diaEscolhido, Math.max(linhas, 1)).map((t) => ({
            valor: String(t.ta),
            rotulo: t.rotulo,
          }))}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="dsa-editar-tempos">Quantos tempos</Label>
          <Input
            id="dsa-editar-tempos"
            type="number"
            min={1}
            max={12}
            value={tempos}
            onChange={(e) => definirTempos(e.target.value)}
            className="w-24 tabular-nums"
          />
        </div>
      </div>

      {ehAula ? (
        <>
          {/*
            ⚠️ **DISCIPLINA E UE, COMO NO LANÇAMENTO** (`D-DSA-1`): a UE é opcional; sem ela, o alerta e o
               tópico obrigatório. É também o que satisfaz a catraca da linha histórica sem UE (`Q-1`).
          */}
          <EscolhaSimples
            id="dsa-editar-disciplina"
            rotulo="Disciplina"
            textoVazio="Escolha a disciplina…"
            valor={disciplinaId}
            aoMudar={(v) => {
              definirDisciplina(v);
              definirUnidade("");
            }}
            opcoes={disciplinas.map((d) => ({ valor: d.id, rotulo: `${d.codigo} — ${d.nome}` }))}
          />
          {disciplinaId !== "" ? (
            <EscolhaSimples
              id="dsa-editar-unidade"
              rotulo="Unidade de ensino (opcional)"
              textoVazio="Sem unidade de ensino"
              valor={unidadeId}
              aoMudar={definirUnidade}
              opcoes={unidadesDaDisciplina.map((u) => ({
                valor: u.id,
                rotulo: `UE ${u.numero} — ${u.topico} (${u.lancada}/${u.prevista} TA, restam ${u.restante})`,
              }))}
            />
          ) : null}
          {semUnidade ? (
            <p
              role="status"
              data-slot="alerta-sem-unidade"
              className="rounded-ciaara border-atrasado-borda bg-atrasado-fundo text-atrasado-tinta border px-2 py-1 text-sm"
            >
              {ALERTA_SEM_UNIDADE}
            </p>
          ) : null}
        </>
      ) : null}

      {temTopico ? (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dsa-editar-conteudo">Tópico{semUnidade ? " (obrigatório)" : ""}</Label>
            <Input
              id="dsa-editar-conteudo"
              value={conteudo}
              onChange={(e) => definirConteudo(e.target.value)}
            />
          </div>
          <EscolhaSimples
            id="dsa-editar-tecnica"
            rotulo="Técnica de ensino"
            textoVazio="—"
            valor={tecnica}
            aoMudar={definirTecnica}
            opcoes={tecnicas.map((t) => ({ valor: t, rotulo: t }))}
          />
        </>
      ) : null}

      {temInstrumento ? (
        <EscolhaSimples
          id="dsa-editar-instrumento"
          rotulo="Instrumento (opcional)"
          textoVazio="Sem instrumento"
          valor={instrumentoId}
          aoMudar={definirInstrumento}
          opcoes={instrumentos.map((i) => ({ valor: i.id, rotulo: i.rotulo }))}
        />
      ) : null}

      {ehSessaoDeAplicacao ? (
        <p className="text-texto-suave text-sm" data-slot="responsavel-da-sessao">
          Quem aplica e quem fiscaliza esta sessão são os da prova: troque-os no lançamento da 1ª
          sessão.
        </p>
      ) : null}

      {fato.origem === "atividade_nao_letiva" ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor="dsa-editar-conteudo">O que é</Label>
          <Input
            id="dsa-editar-conteudo"
            value={conteudo}
            onChange={(e) => definirConteudo(e.target.value)}
          />
        </div>
      ) : null}

      {temQuemMinistra && ehAula && listaDeQuemMinistra.length === 0 ? (
        /*
         * RD-1 (Bloco 11): a disciplina escolhida não tem habilitado — a frase, no lugar do seletor vazio. ⚠️ Sem
         * `instrutores.ler`, o «você não vê» do seletor único, não "nenhum habilitado" (FR-006.3 da spec 029).
         */
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto">Quem ministra</span>
          {podeLerInstrutores ? (
            <p className="text-xs text-atrasado-tinta" data-slot="aula-sem-habilitado">
              {fraseDaListaDaAula(disciplinaId === "" ? null : disciplinaId, listaDeQuemMinistra)}
            </p>
          ) : (
            <SeletorInstrutor
              instrutores={listaDeQuemMinistra}
              escala={escala}
              aoMudar={definirInstrutor}
              rotulo="Quem ministra"
              vazio={{ motivo: "sem-permissao" }}
            />
          )}
        </div>
      ) : temQuemMinistra ? (
        /*
         * ⚠️ Trocar quem ministra passa pelo porteiro da habilitação (`RN-INST-01`, Risco: Alto). Na atividade, o
         *    «outro responsável (nome livre)» aparece porque a regra o aceita (`RN-RESP-1`).
         */
        <ResponsavelOuNomeLivre
          regra={regra}
          instrutores={listaDeQuemMinistra}
          podeLerInstrutores={podeLerInstrutores}
          escala={escala}
          rotuloDoCadastro={
            fato.origem === "avaliacao"
              ? "Responsável pela avaliação"
              : ehAtividade
                ? "Instrutor do cadastro (opcional)"
                : "Quem ministra"
          }
          idDoNomeLivre="dsa-editar-responsavel-externo"
          exemplo="DOEP, CIAARA-30, palestrante…"
          instrutorId={instrutorId}
          aoMudarInstrutor={definirInstrutor}
          nomeLivre={nomeLivre}
          aoMudarNomeLivre={definirNomeLivre}
          slot="responsavel-do-lancamento"
        />
      ) : null}
      {gravadoForaDaLista ? (
        <p className="text-xs text-atrasado-tinta" data-slot="instrutor-nao-habilitado">
          {fato.instrutor ?? "O instrutor gravado"} não está habilitado nesta disciplina: escolha um
          habilitado (a habilitação é feita na ficha do instrutor).
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="dsa-editar-local">Local</Label>
        <Input id="dsa-editar-local" value={local} onChange={(e) => definirLocal(e.target.value)} />
      </div>

      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-acao">
          {recusa}
        </p>
      ) : null}

      {avisos.length > 0 ? (
        <div role="status" data-slot="avisos-da-acao" className="flex flex-col gap-1">
          <p className="text-sm font-medium text-atrasado-tinta">
            Gravado, com {avisos.length} aviso(s):
          </p>
          <ul className="list-disc pl-5 text-sm text-atrasado-tinta">
            {avisos.map((a) => (
              <li key={a.codigo}>{a.texto}</li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={aoFechar}>
            Entendi
          </Button>
        </div>
      ) : null}

      {/* Spec 022 (D-3): é o rodapé do diálogo do lançamento — os botões continuam com texto. */}
      <DialogFooter className="border-borda flex-row flex-wrap items-center gap-2 border-t pt-2 sm:justify-start">
        <Button
          type="button"
          size="sm"
          disabled={agindo}
          data-slot="gravar-edicao"
          onClick={() =>
            executar(() => atualizar({ fatoId: fato.fatoId, origem: fato.origem, ...mudancas() }))
          }
        >
          {agindo ? "Gravando…" : "Gravar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
        <span className="flex-1" />
        <DialogoConfirmacao
          titulo="Excluir este lançamento?"
          /*
           * ⚠️ **A CONSEQUÊNCIA DIZ A VERDADE, e a verdade é que a exclusão é LÓGICA** (regra 4).
           */
          consequencia={
            fato.origem === "vista_prova"
              ? "A segunda data (a vista de prova) sai do DSA. A avaliação em si continua lançada — elas são o mesmo fato."
              : ehSessaoDeAplicacao
                ? "Só esta sessão de aplicação sai da grade, do DSA impresso e da carga horária. A prova continua lançada, com as outras sessões. A sessão não é apagada do banco: fica inativa, e pode voltar."
                : "O lançamento sai da grade e do DSA impresso, e deixa de contar na carga horária. Ele não é apagado do banco: fica inativo, e pode voltar."
          }
          rotuloConfirmar="Excluir"
          aoConfirmar={() =>
            void executar(() => excluir({ fatoId: fato.fatoId, origem: fato.origem }))
          }
        >
          <Button type="button" size="sm" variant="outline" data-slot="excluir-bloco">
            Excluir
          </Button>
        </DialogoConfirmacao>
      </DialogFooter>
    </section>
  );
}
