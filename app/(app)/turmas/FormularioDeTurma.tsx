/**
 * O formulário de turma — **folha de cliente**, nos modos `novo` e `edicao` (`FR-025`, `FR-026.1`,
 * `FR-028`, `FR-029.4`).
 *
 * ⚠️ **NÃO HÁ CAMPO DE CÓDIGO** (`FR-025.1`): ele é carimbado pelo gatilho, e o banco recusa valor
 * divergente. Um campo aqui convidaria alguém a digitá-lo.
 *
 * ⚠️ **ANO, SITUAÇÃO E MODALIDADE ABREM SEM PADRÃO** (`FR-015.1`) — no modo `novo`. Valor que ninguém
 * escolheu é indistinguível de escolha real.
 *
 * ⚠️ **A SALA ATUAL APARECE MESMO DESATIVADA** (`FR-029.4`), e quem decide isso é
 * `lib/dominio/salas.ts`. Sem essa metade, editar o efetivo de uma turma cuja sala foi desativada
 * apagaria a sala sem ninguém pedir.
 *
 * ⚠️ **NA EDIÇÃO, A SITUAÇÃO VOLTOU** (spec 025, Bloco 10, D-2; emenda o `FR-015.4` da spec 016): *"um único
 * diálogo/página edita tudo"* — e, quando ela muda, a **observação da troca** (D-COR-4) aparece logo abaixo. A ação
 * grava os campos e, depois, a troca pela função do banco que anota o histórico.
 *
 * ⚠️ **A NOTA DA SEGUNDA TURMA É NOTA, NÃO DIÁLOGO** (`FR-026.1`): ela aparece junto do campo de
 * rótulo e não confirma nada. Quem confirma são as duas gravações da lista fechada do `FR-018.1` — o
 * limite e a proteção de vigência —, **num diálogo só**.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Input } from "@/components/ui/input";
import { criarTurma, editarTurma } from "@/lib/acoes/turma";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import { passaDoLimite, type TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import {
  linhasDaProtecaoPerdida,
  vigenciasQuePerdemProtecao,
  type JanelaDeTurma,
  type VigenciaProtegida,
} from "@/lib/dominio/protecao-de-vigencia";
import { naturezaDaSala, ROTULO_DA_NATUREZA, type Sala } from "@/lib/dominio/salas";
import { LIMITE_DA_OBSERVACAO_DA_TURMA } from "@/lib/validacao/turma";
import { FRASE_DA_ESCOLHA_TRAVADA, aceitaRegimeNomeado } from "@/lib/dominio/regime-da-turma";

const MODALIDADES = [
  { valor: "presencial", rotulo: "Presencial" },
  { valor: "ead", rotulo: "EAD" },
  { valor: "semipresencial", rotulo: "Semipresencial" },
] as const;

const SITUACOES = [
  { valor: "planejada", rotulo: "Planejada" },
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "concluida", rotulo: "Concluída" },
  { valor: "cancelada", rotulo: "Cancelada" },
] as const;

export type TurmaNoFormulario = {
  readonly ano_letivo: string;
  readonly status: string;
  readonly modalidade: string;
  readonly turma: string;
  readonly data_inicio: string;
  readonly data_termino: string;
  readonly sala_alocada: string;
  readonly alunos: string;
  /** A janela da etapa presencial (`D-DSA-2`) — só aparece, e só vale, em turma semipresencial. */
  readonly inicio_etapa_presencial: string;
  readonly termino_etapa_presencial: string;
  /** Spec 018: o regime nomeado escolhido — vazio = o regime vigente do curso. Só na edição. */
  readonly regime_de_horario_id?: string;
  /** Spec 021 (RC-4): o currículo escolhido — vazio = o vigente na data de início (o banco escolhe). */
  readonly curriculo_id?: string;
};

const VAZIO: TurmaNoFormulario = {
  ano_letivo: "",
  status: "",
  modalidade: "",
  turma: "",
  data_inicio: "",
  data_termino: "",
  sala_alocada: "",
  alunos: "",
  inicio_etapa_presencial: "",
  termino_etapa_presencial: "",
};

export type FormularioDeTurmaProps = {
  readonly modo: "novo" | "edicao";
  /** No modo `novo`, o curso vem do caminho. Na edição, é o curso atual da turma. */
  readonly cursoId: string;
  readonly codigoAtual?: string;
  readonly inicial?: TurmaNoFormulario;
  readonly salas: readonly Sala[];
  /** As turmas do curso, para o limite e para a nota do rótulo. */
  readonly turmasDoCurso: readonly TurmaParaLimite[];
  readonly limiteDoCurso: number | null;
  /** A turma sem rótulo que já existe no ano — a nota do `FR-026.1`. */
  readonly semRotuloNoAno?: readonly { readonly ano: number; readonly codigo: string }[];
  /** O retrato da RPC de proteção, para o aviso do `FR-021.8`. */
  readonly vigenciasProtegidas?: readonly VigenciaProtegida[];
  readonly janelasDoCurso?: readonly JanelaDeTurma[];
  /**
   * Spec 018 (C-18): o campo *Regime de horário* — os regimes ATIVOS do curso (mais o atual, se inativo) e se a escolha
   * já travou (a turma tem lançamento, `RF-HOR-05`). Ausente = o campo não aparece.
   */
  readonly regimeDeHorario?: {
    readonly opcoes: readonly {
      readonly id: string;
      readonly rotulo: string;
      readonly ativo: boolean;
    }[];
    readonly travado: boolean;
    /**
     * RD-3 (Bloco 11, D-10): o regime que o DSA usa «desta semana em diante», quando alguém o trocou pelo relógio do
     * DSA — só leitura aqui; a troca é pelo DSA, semana a semana.
     */
    readonly noDsaDesde?: { readonly desde: string; readonly rotulo: string } | null;
  };
  /**
   * Spec 021 (RC-4): o campo *Currículo* — os currículos que a turma pode seguir ("Currículo N (vigência AAAA) —
   * vigente/futuro") e se a escolha já travou (a turma tem lançamento). Ausente = o campo não aparece.
   */
  readonly curriculo?: {
    readonly opcoes: readonly { readonly id: string; readonly rotulo: string }[];
    readonly travado: boolean;
    /** Na criação: a primeira opção é "o vigente na data de início", que o banco escolhe. */
    readonly comPadrao: boolean;
  };
};

export function FormularioDeTurma({
  modo,
  cursoId,
  codigoAtual,
  inicial,
  salas,
  turmasDoCurso,
  limiteDoCurso,
  semRotuloNoAno = [],
  vigenciasProtegidas = [],
  janelasDoCurso = [],
  regimeDeHorario,
  curriculo,
}: FormularioDeTurmaProps) {
  const router = useRouter();
  const [valores, definirValores] = React.useState<TurmaNoFormulario>(inicial ?? VAZIO);
  /* D-2: a observação da troca de situação, na edição — só vai quando a situação muda. */
  const [observacaoDaSituacao, definirObservacaoDaSituacao] = React.useState("");
  const situacaoMudou = modo === "edicao" && valores.status !== (inicial?.status ?? "");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  const trocar =
    (campo: keyof TurmaNoFormulario) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      definirValores((v) => ({ ...v, [campo]: e.target.value }));

  const nulo = (v: string) => (v.trim() === "" ? null : v.trim());
  /* C-15: a turma EAD pura não tem tempos presenciais, e o campo some. */
  const campoDoRegime =
    regimeDeHorario !== undefined && aceitaRegimeNomeado(valores.modalidade)
      ? regimeDeHorario
      : null;
  const ano = valores.ano_letivo.trim() === "" ? NaN : Number(valores.ano_letivo);

  const corpo = {
    ano_letivo: valores.ano_letivo === "" ? undefined : Number(valores.ano_letivo),
    status: valores.status,
    modalidade: valores.modalidade,
    turma: valores.turma,
    data_inicio: valores.data_inicio,
    data_termino: valores.data_termino,
    sala_alocada: valores.sala_alocada,
    alunos: valores.alunos === "" ? undefined : Number(valores.alunos),
    /* ⚠️ Fora de semipresencial o esquema as grava vazias — ver `lib/validacao/turma.ts`. */
    inicio_etapa_presencial: valores.inicio_etapa_presencial,
    termino_etapa_presencial: valores.termino_etapa_presencial,
    /*
     * ⚠️ O REGIME SÓ VAI QUANDO O CAMPO EXISTE E PODE MUDAR (spec 018): fora disso a chave fica fora, e a coluna não é
     *    tocada — um nulo por omissão trocaria o regime de quem não pediu, e o banco recusaria na turma com lançamento.
     */
    ...(campoDoRegime && !campoDoRegime.travado
      ? { regime_de_horario_id: valores.regime_de_horario_id ?? "" }
      : {}),
    /* RC-4: o currículo só vai quando o campo existe e pode mudar — e vazio não vai (o banco escolhe o padrão). */
    ...(curriculo && !curriculo.travado && (valores.curriculo_id ?? "") !== ""
      ? { curriculo_id: valores.curriculo_id }
      : {}),
    /* D-2: na edição, a observação da troca — a ação só troca a situação quando ela mudou. */
    ...(situacaoMudou ? { observacao_da_situacao: observacaoDaSituacao } : {}),
  };

  /*
   * ⚠️ `turmasDoCurso` JÁ CHEGA SEM A TURMA EDITADA — quem a exclui é a página, que sabe qual é.
   *    Contá-la aqui faria salvar uma turma sem mexer no ano acusar o próprio lugar dela como
   *    excesso, e o diálogo apareceria em toda gravação.
   */
  const acimaDoLimite =
    Number.isNaN(ano) || valores.status === ""
      ? null
      : passaDoLimite(turmasDoCurso, ano, limiteDoCurso);

  const perdidas = vigenciasQuePerdemProtecao(vigenciasProtegidas, janelasDoCurso, {
    codigo: codigoAtual ?? "(nova)",
    janelaNova: { dataInicio: nulo(valores.data_inicio), dataTermino: nulo(valores.data_termino) },
  });

  const confirmacao = confirmacaoDaGravacao(modo === "novo" ? "criar_turma" : "editar_turma", {
    ...(acimaDoLimite ? { anosAcimaDoLimite: [acimaDoLimite] } : {}),
    /*
     * ⚠️ **AS LINHAS, NÃO A FRASE.** Quem escreve *"Com esta janela, deixam de estar
     *    protegidas: …"* é `confirmacao-de-gravacao.ts`; mandar-lhe a frase pronta a aninhava e o
     *    diálogo saía com o texto duas vezes.
     */
    ...(perdidas.length > 0 ? { vigenciasDesprotegidas: linhasDaProtecaoPerdida(perdidas) } : {}),
  });

  /** A nota do `FR-026.1`: já há turma sem rótulo neste ano. */
  const notaDoRotulo = semRotuloNoAno.find((t) => t.ano === ano && valores.turma.trim() === "");

  async function gravar() {
    definirGravando(true);
    definirErro(null);
    const resultado =
      modo === "novo"
        ? await criarTurma(cursoId, corpo)
        : await editarTurma(codigoAtual ?? "", corpo);
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    // ⚠️ A edição volta à ficha COM A CONFIRMAÇÃO (spec 016, FR-015.2): até 17/10/2026 gravar não
    //    mostrava aviso nenhum, e a pessoa não sabia se tinha dado certo.
    //    Desde o Bloco 10 (D-2) quem escolhe a confirmação é a ação — *turma* ou *situação*, se ela trocou.
    router.push(resultado.destino);
  }

  const botaoGravar = (
    <BotaoDeIcone
      acao="salvar"
      rotulo={modo === "novo" ? "Criar turma" : "Salvar alterações"}
      variante="padrao"
      type="submit"
      ocupado={gravando}
      data-slot="gravar-turma"
    />
  );

  return (
    <form
      data-slot="formulario-de-turma"
      data-modo={modo}
      className="flex max-w-3xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmacao.confirma) void gravar();
      }}
    >
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-do-formulario">
          {erro}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-ano" rotulo="Ano letivo" obrigatorio />
          <Input
            {...propsDoControle("turma-ano", true)}
            name="ano_letivo"
            inputMode="numeric"
            value={valores.ano_letivo}
            onChange={trocar("ano_letivo")}
          />
        </div>

        {/*
          ⚠️ NOS DOIS MODOS desde 24/10/2026 (spec 025, D-2): *"um único Editar edita tudo"*. De 17/10 a 24/10/2026 a
             situação só se trocava pelo botão *"Trocar situação"* da ficha (FR-015.4 da spec 016, emendado).
        */}
        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-situacao" rotulo="Situação" obrigatorio />
          <select
            {...propsDoControle("turma-situacao", true)}
            name="status"
            value={valores.status}
            onChange={trocar("status")}
            className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            {modo === "novo" ? <option value="">Escolha a situação</option> : null}
            {SITUACOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>

        {situacaoMudou ? (
          <div className="flex flex-col gap-1 sm:col-span-2" data-slot="observacao-da-troca">
            <label
              htmlFor="turma-observacao-da-situacao"
              className="text-texto text-sm font-medium"
            >
              Observação da troca de situação (opcional)
            </label>
            <textarea
              id="turma-observacao-da-situacao"
              name="observacao_da_situacao"
              rows={2}
              maxLength={LIMITE_DA_OBSERVACAO_DA_TURMA}
              value={observacaoDaSituacao}
              onChange={(e) => definirObservacaoDaSituacao(e.target.value)}
              className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
              data-slot="observacao-da-situacao"
            />
            {/* veste: dica do campo */}
            <p className="text-texto-tenue text-xs">
              Vai para o histórico da situação da turma, com quem trocou e quando.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-modalidade" rotulo="Modalidade" obrigatorio />
          <select
            {...propsDoControle("turma-modalidade", true)}
            name="modalidade"
            value={valores.modalidade}
            onChange={trocar("modalidade")}
            className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Escolha a modalidade</option>
            {MODALIDADES.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-rotulo" rotulo="Rótulo (T1, T2…)" />
          <Input
            {...propsDoControle("turma-rotulo", false)}
            name="turma"
            value={valores.turma}
            onChange={trocar("turma")}
            placeholder="deixe vazio na turma única"
          />
          {notaDoRotulo ? (
            /* veste: a nota do FR-026.1, ao lado do campo — nota, nunca diálogo */
            <p className="text-texto-tenue text-xs" data-slot="nota-do-rotulo">
              A turma {notaDoRotulo.codigo} está sem rótulo. Dê rótulo a esta (T2, por exemplo); a
              outra pode ser editada para T1 — o código dela não muda.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-inicio" rotulo="Início" />
          <Input
            {...propsDoControle("turma-inicio", false)}
            name="data_inicio"
            type="date"
            lang="pt-BR"
            value={valores.data_inicio}
            onChange={trocar("data_inicio")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-termino" rotulo="Término" />
          <Input
            {...propsDoControle("turma-termino", false)}
            name="data_termino"
            type="date"
            lang="pt-BR"
            value={valores.data_termino}
            onChange={trocar("data_termino")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-sala" rotulo="Sala" />
          <select
            {...propsDoControle("turma-sala", false)}
            name="sala_alocada"
            value={valores.sala_alocada}
            onChange={trocar("sala_alocada")}
            className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Sem sala</option>
            {salas.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.valor} — {ROTULO_DA_NATUREZA[naturezaDaSala(s)]}
                {s.ativo ? "" : " (desativada)"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para="turma-alunos" rotulo="Efetivo" />
          <Input
            {...propsDoControle("turma-alunos", false)}
            name="alunos"
            inputMode="numeric"
            value={valores.alunos}
            onChange={trocar("alunos")}
          />
        </div>

        {curriculo ? (
          <div className="flex flex-col gap-1" data-slot="curriculo-da-turma-no-formulario">
            <CampoObrigatorio para="turma-curriculo" rotulo="Currículo" />
            <select
              {...propsDoControle("turma-curriculo", false)}
              name="curriculo_id"
              value={valores.curriculo_id ?? ""}
              onChange={trocar("curriculo_id")}
              disabled={curriculo.travado}
              className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
            >
              {curriculo.comPadrao ? (
                <option value="">O vigente na data de início da turma</option>
              ) : null}
              {curriculo.opcoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
            {curriculo.travado ? (
              /* veste: dica do campo — por que ele está travado */
              <p className="text-texto-tenue text-xs" data-slot="curriculo-travado">
                A turma já tem lançamento: o currículo não muda mais (nada reinterpreta o passado).
              </p>
            ) : (
              /* veste: dica do campo */
              <p className="text-texto-tenue text-xs">
                As disciplinas, o DSA, a planilha e o andamento seguem este currículo. Trava no
                primeiro lançamento.
              </p>
            )}
          </div>
        ) : null}

        {campoDoRegime ? (
          <div className="flex flex-col gap-1" data-slot="regime-da-turma">
            <CampoObrigatorio para="turma-regime" rotulo="Regime de horário" />
            <select
              {...propsDoControle("turma-regime", false)}
              name="regime_de_horario_id"
              value={valores.regime_de_horario_id ?? ""}
              onChange={trocar("regime_de_horario_id")}
              disabled={campoDoRegime.travado}
              className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
            >
              <option value="">Regime vigente do curso</option>
              {campoDoRegime.opcoes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rotulo}
                  {r.ativo ? "" : " (inativo)"}
                </option>
              ))}
            </select>
            {campoDoRegime.travado ? (
              /* veste: dica do campo — por que ele está travado */
              <p className="text-texto-tenue text-xs" data-slot="regime-travado">
                {FRASE_DA_ESCOLHA_TRAVADA}
              </p>
            ) : (
              /*
                veste: dica do campo. Spec 029 (`FR-005.5`): o relógio do DSA troca o regime semana a semana, e o
                saldo segue o regime de cada semana — este é o de partida, o das semanas que o relógio não trocou.
              */
              <p className="text-texto-tenue text-xs">
                O DSA, o alerta do tempo excepcional e o saldo usam este regime nas semanas em que o
                relógio do DSA não o trocou. Trava no primeiro lançamento.
              </p>
            )}
            {campoDoRegime.noDsaDesde ? (
              <p className="text-texto-suave text-xs" data-slot="regime-no-dsa-desde">
                No DSA, desde a semana de {campoDoRegime.noDsaDesde.desde}:{" "}
                {campoDoRegime.noDsaDesde.rotulo} — trocado pelo relógio do DSA, semana a semana.
              </p>
            ) : null}
          </div>
        ) : null}

        {/*
          ⚠️ **A ETAPA PRESENCIAL SÓ EXISTE NA SEMIPRESENCIAL** (`D-DSA-2`, decisão de Bernardo Villas
             Boas de 08/10/2026): é ela que decide em que semanas a turma tem DSA. Fora dessa
             modalidade os dois campos somem, e o esquema grava a janela vazia.
        */}
        {valores.modalidade === "semipresencial" ? (
          <div
            className="grid gap-3 sm:col-span-2 sm:grid-cols-2"
            data-slot="etapa-presencial-da-turma"
          >
            <p className="text-texto-suave text-xs sm:col-span-2">
              Etapa presencial: o DSA só existe nas semanas que tocam esta janela. Sem ela, todas as
              semanas mostram o DSA, com aviso.
            </p>
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="turma-etapa-inicio" rotulo="Início da etapa presencial" />
              <Input
                {...propsDoControle("turma-etapa-inicio", false)}
                name="inicio_etapa_presencial"
                type="date"
                lang="pt-BR"
                value={valores.inicio_etapa_presencial}
                onChange={trocar("inicio_etapa_presencial")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <CampoObrigatorio para="turma-etapa-termino" rotulo="Término da etapa presencial" />
              <Input
                {...propsDoControle("turma-etapa-termino", false)}
                name="termino_etapa_presencial"
                type="date"
                lang="pt-BR"
                value={valores.termino_etapa_presencial}
                onChange={trocar("termino_etapa_presencial")}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div data-slot="rodape-do-formulario">
        {confirmacao.confirma ? (
          <DialogoConfirmacao
            titulo={confirmacao.titulo}
            consequencia={confirmacao.mensagens.join(" ")}
            rotuloConfirmar={confirmacao.rotuloConfirmar}
            aoConfirmar={() => void gravar()}
          >
            {botaoGravar}
          </DialogoConfirmacao>
        ) : (
          botaoGravar
        )}
      </div>
    </form>
  );
}
