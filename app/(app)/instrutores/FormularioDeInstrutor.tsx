/**
 * O formulário de instrutor, para cadastro e edição — **folha de cliente** (`FR-005`, `FR-011`,
 * `FR-012`, `FR-015`, `FR-030` e `FR-032` da spec 006).
 *
 * ⚠️ OS CINCO OBRIGATÓRIOS SÃO MARCADOS, MAS A RECUSA É DO SERVIDOR E DO BANCO. O atributo `required`
 * só impede o envio vazio; texto só com espaços passa pelo navegador e é recusado pela Server Action,
 * com a mensagem que diz **qual** campo falta — e, por qualquer outro caminho, pelo `CHECK`.
 *
 * ⚠️ SALVAR PEDE CONFIRMAÇÃO (`FR-011`). O botão abre o diálogo; confirmar envia o formulário.
 *
 * ⚠️ NENHUM CAMPO DE CARGA HORÁRIA (`FR-015`). A carga horária é lida na ficha, calculada pelo banco;
 * "permitir ajuste manual" é pedido plausível e é proibido.
 *
 * ⚠️ AO EDITAR, TODO CAMPO VEM COM O VALOR SALVO (`FR-012`), inclusive o posto que a escala não conhece:
 * ele entra como opção, em vez de sumir e virar "Selecione" — que salvaria em branco por engano.
 *
 * ⚠️ AS MÁSCARAS ASSISTEM A DIGITAÇÃO E NÃO DECIDEM NADA (`FR-024`). NIP, CPF, telefone, RETELMA e CEP
 * se formatam a cada tecla; quem recusa quantidade errada de dígitos é o Zod da Server Action. O valor
 * já salvo aparece como está, sem reformatação em lote (spec 025 da v2.0, casos de fronteira).
 *
 * ⚠️ O ESTADO NÃO NASCE COM RJ, E ISTO DIVERGE DA v2.0. Lá, `RJ` vinha pré-selecionado **em modo
 * cadastro**; aqui o cadastro não tem a seção de endereço (ela só existe na ficha, para quem lê a PII).
 * Pré-selecionar `RJ` na edição gravaria um estado em quem nunca informou endereço, a cada vez que
 * alguém salvasse o dado funcional. Registrado em `specs/006-cadastro-de-instrutores/paridade.md`.
 *
 * ⚠️ O PAINEL DE DISCIPLINAS GRAVA DEPOIS DO INSTRUTOR (`FR-022`; spec 019 da v2.0, `FR-007`). Se o
 * cadastro falha, nenhum vínculo é criado; se o cadastro passa, a sincronização vai numa chamada só,
 * e o banco decide o que criar, reativar e inativar.
 *
 * ⚠️ TODO CAMINHO DE GRAVAÇÃO PASSA PELO DIÁLOGO (`FR-011`, anotação de 15/09/2026). O botão abre a
 * confirmação e só ela envia; não há botão de envio no formulário, então `Enter` num campo não grava.
 * A ação de desativar chega pelo `rodape`, ao lado do botão de gravar, com o próprio diálogo.
 *
 * ⚠️ `preferencia` É TEXTO LIVRE nesta fatia — simplificação deliberada do `RF-INSTR-06`, decidida
 * por Bernardo em 15/09/2026 (T061). A grade dia × período com observação não é construída aqui.
 *
 * ⚠️ O DADO PESSOAL SÓ EXISTE NA TELA DE QUEM O LÊ (`FR-032`). A seção aparece quando a ficha conseguiu
 * ler `vw_instrutor_dados_pessoais` — o banco decidiu, não esta folha. No cadastro ela não aparece: a
 * identificação civil é gravada na ficha, depois de o instrutor existir.
 */
"use client";

import { useRouter } from "next/navigation";
import type * as React from "react";
import { useRef, useState } from "react";

import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import {
  criarInstrutor,
  editarInstrutor,
  gravarDadosPessoaisDoInstrutor,
  sincronizarHabilitacoes,
} from "@/lib/acoes/instrutor";
import { ROTULO_DO_REGIME, UFS } from "@/lib/constantes/instrutor";
import {
  mascararCep,
  mascararCpf,
  mascararNip,
  mascararRetelma,
  mascararTelefone,
} from "@/lib/formato/mascaras";
import { Constants } from "@/lib/tipos/database";

import { CampoDeEscolha } from "./CampoDeEscolha";
import { PainelDeDisciplinas, type DisciplinaDoPainel } from "./PainelDeDisciplinas";
import {
  CAMPOS_FUNCIONAIS,
  CAMPOS_PESSOAIS,
  type ValoresFuncionais,
  type ValoresPessoais,
} from "./campos";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

type Tipo = "texto" | "data" | "email" | "area";

function Campo({
  id,
  rotulo,
  valor,
  obrigatorio = false,
  tipo = "texto",
  mascara,
}: {
  readonly id: string;
  readonly rotulo: string;
  readonly valor: string;
  readonly obrigatorio?: boolean;
  readonly tipo?: Tipo;
  /** Formata enquanto se digita. O campo continua sem estado: a máscara reescreve o próprio valor. */
  readonly mascara?: (valor: string) => string;
}) {
  const controle = propsDoControle(id, obrigatorio);
  return (
    <div className="flex flex-col gap-1">
      <CampoObrigatorio para={id} rotulo={rotulo} obrigatorio={obrigatorio} />
      {tipo === "area" ? (
        <textarea {...controle} name={id} defaultValue={valor} rows={3} className={CAMPO} />
      ) : (
        <input
          {...controle}
          name={id}
          type={tipo === "data" ? "date" : tipo === "email" ? "email" : "text"}
          defaultValue={valor}
          className={CAMPO}
          {...(mascara
            ? {
                inputMode: "numeric" as const,
                onInput: (e: React.FormEvent<HTMLInputElement>) => {
                  e.currentTarget.value = mascara(e.currentTarget.value);
                },
              }
            : {})}
        />
      )}
    </div>
  );
}

function Secao({
  titulo,
  children,
}: {
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <fieldset className="border-borda rounded-ciaara flex flex-col gap-3 border p-4">
      <legend className="text-texto px-1 text-sm font-medium">{titulo}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export type FormularioDeInstrutorProps = {
  readonly modo: "novo" | "edicao";
  readonly instrutorId?: string;
  readonly iniciais: ValoresFuncionais;
  /** `null` quando o banco não entregou o dado pessoal a esta sessão — a seção não existe. */
  readonly pessoais: ValoresPessoais | null;
  /** Os postos da escala de antiguidade, como `config_listas` os entrega. */
  readonly postos: readonly string[];
  /** O catálogo de disciplinas ativas do painel (`FR-022`). */
  readonly disciplinas: readonly DisciplinaDoPainel[];
  /** As disciplinas com vínculo ativo — o painel nasce com elas marcadas. */
  readonly habilitadas: readonly string[];
  /** Ações que ficam ao lado de "Gravar alterações", no fim do formulário. */
  readonly rodape?: React.ReactNode;
};

export function FormularioDeInstrutor({
  modo,
  instrutorId,
  iniciais,
  pessoais,
  postos,
  disciplinas,
  habilitadas,
  rodape,
}: FormularioDeInstrutorProps) {
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);
  const [mensagem, setMensagem] = useState<{ tom: "erro" | "ok"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(() => new Set(habilitadas));

  const opcoesDePosto =
    iniciais.posto_graduacao !== "" && !postos.includes(iniciais.posto_graduacao)
      ? [...postos, iniciais.posto_graduacao]
      : postos;

  async function enviar(dados: FormData) {
    setEnviando(true);
    setMensagem(null);

    const ler = (campo: string) => String(dados.get(campo) ?? "");
    const funcional = Object.fromEntries(CAMPOS_FUNCIONAIS.map((c) => [c, ler(c)]));
    const resultado =
      modo === "novo"
        ? await criarInstrutor({ funcional })
        : await editarInstrutor({ id: instrutorId, funcional });

    if (!resultado.ok) {
      setMensagem({ tom: "erro", texto: resultado.erro });
      setEnviando(false);
      return;
    }

    if (modo === "edicao" && pessoais !== null) {
      const pessoal = Object.fromEntries(CAMPOS_PESSOAIS.map((c) => [c, ler(c)]));
      const gravado = await gravarDadosPessoaisDoInstrutor({ id: instrutorId, pessoal });
      if (!gravado.ok) {
        setMensagem({ tom: "erro", texto: `Dado funcional gravado. ${gravado.erro}` });
        setEnviando(false);
        return;
      }
    }

    const idGravado = modo === "novo" ? resultado.id : instrutorId;
    const sincronizado = await sincronizarHabilitacoes({
      instrutorId: idGravado,
      disciplinas: [...marcadas],
    });
    if (!sincronizado.ok) {
      setMensagem({ tom: "erro", texto: `Cadastro gravado. ${sincronizado.erro}` });
      setEnviando(false);
      if (modo === "novo") router.push(`/instrutores/${resultado.codigo}`);
      return;
    }

    setEnviando(false);
    if (modo === "novo") {
      router.push(`/instrutores/${resultado.codigo}`);
      return;
    }
    setMensagem({ tom: "ok", texto: "Alterações gravadas." });
    router.refresh();
  }

  const v = iniciais;

  return (
    <form
      ref={formulario}
      action={enviar}
      data-slot="formulario-de-instrutor"
      className="flex flex-col gap-4"
    >
      <Secao titulo="Identificação">
        {opcoesDePosto.length > 0 ? (
          <CampoDeEscolha
            id="posto_graduacao"
            rotulo="Posto/Graduação"
            valor={v.posto_graduacao}
            opcoes={opcoesDePosto.map((p) => ({ valor: p, rotulo: p }))}
            vazio="Selecione"
            obrigatorio
          />
        ) : (
          <Campo
            id="posto_graduacao"
            rotulo="Posto/Graduação"
            valor={v.posto_graduacao}
            obrigatorio
          />
        )}
        <Campo
          id="esp_hab_obs"
          rotulo="Especialidade/Habilitação"
          valor={v.esp_hab_obs}
          obrigatorio
        />
        <Campo id="nome_completo" rotulo="Nome completo" valor={v.nome_completo} obrigatorio />
        <Campo id="nome_guerra" rotulo="Nome de guerra" valor={v.nome_guerra} />
        <Campo id="categoria" rotulo="Categoria" valor={v.categoria} obrigatorio />
        <Campo id="nip" rotulo="NIP" valor={v.nip} mascara={mascararNip} />
        <Campo
          id="data_nascimento"
          rotulo="Data de nascimento"
          valor={v.data_nascimento}
          tipo="data"
        />
        <Campo id="email" rotulo="E-mail" valor={v.email} tipo="email" />
      </Secao>

      <Secao titulo="Lotação e vínculo">
        <Campo id="om" rotulo="Organização militar" valor={v.om} obrigatorio />
        <Campo id="dep_divisao" rotulo="Departamento/Divisão" valor={v.dep_divisao} />
        <Campo
          id="data_assuncao_setor"
          rotulo="Assunção no setor"
          valor={v.data_assuncao_setor}
          tipo="data"
        />
        <CampoDeEscolha
          id="regime_trabalho"
          rotulo="Regime de trabalho"
          valor={v.regime_trabalho}
          opcoes={Constants.public.Enums.regime_trabalho_docente.map((r) => ({
            valor: r,
            rotulo: ROTULO_DO_REGIME[r],
          }))}
          vazio="Não informado"
        />
        <Campo
          id="antiguidade_declarada"
          rotulo="Antiguidade declarada"
          valor={v.antiguidade_declarada}
        />
      </Secao>

      <Secao titulo="Formação e capacitação">
        <Campo id="nivel_escolaridade" rotulo="Escolaridade" valor={v.nivel_escolaridade} />
        <Campo id="area_conhecimento" rotulo="Área de conhecimento" valor={v.area_conhecimento} />
        <Campo
          id="formacao_principal_secundaria"
          rotulo="Formação principal e secundária"
          valor={v.formacao_principal_secundaria}
        />
        <Campo
          id="capacitacao_didatica"
          rotulo="Capacitação didática"
          valor={v.capacitacao_didatica}
        />
        <Campo
          id="data_inicio_docencia_mb"
          rotulo="Início da docência na MB"
          valor={v.data_inicio_docencia_mb}
          tipo="data"
        />
        <Campo
          id="data_inicio_docencia_ciaara"
          rotulo="Início da docência no CIAARA"
          valor={v.data_inicio_docencia_ciaara}
          tipo="data"
        />
      </Secao>

      <Secao titulo="Avaliação e preferências">
        <Campo
          id="ultima_avaliacao_desempenho"
          rotulo="Última avaliação de desempenho"
          valor={v.ultima_avaliacao_desempenho}
        />
        <Campo
          id="data_avaliacao_desempenho"
          rotulo="Data da avaliação"
          valor={v.data_avaliacao_desempenho}
          tipo="data"
        />
        <Campo
          id="preferencia"
          rotulo="Preferências e restrições gerais"
          valor={v.preferencia}
          tipo="area"
        />
      </Secao>

      {pessoais !== null ? (
        <Secao titulo="Identificação civil e residência">
          <Campo id="cpf" rotulo="CPF" valor={pessoais.cpf} mascara={mascararCpf} />
          <Campo id="rg" rotulo="RG" valor={pessoais.rg} />
          <Campo id="orgao_emissor" rotulo="Órgão emissor" valor={pessoais.orgao_emissor} />
          <Campo
            id="telefone"
            rotulo="Telefone"
            valor={pessoais.telefone}
            mascara={mascararTelefone}
          />
          <Campo id="retelma" rotulo="RETELMA" valor={pessoais.retelma} mascara={mascararRetelma} />
          <Campo
            id="endereco_logradouro"
            rotulo="Logradouro"
            valor={pessoais.endereco_logradouro}
          />
          <Campo id="endereco_numero" rotulo="Número" valor={pessoais.endereco_numero} />
          <Campo
            id="endereco_complemento"
            rotulo="Complemento"
            valor={pessoais.endereco_complemento}
          />
          <Campo id="endereco_bairro" rotulo="Bairro" valor={pessoais.endereco_bairro} />
          <Campo id="endereco_cidade" rotulo="Cidade" valor={pessoais.endereco_cidade} />
          <CampoDeEscolha
            id="endereco_estado"
            rotulo="Estado"
            valor={pessoais.endereco_estado}
            opcoes={[
              ...UFS,
              // Valor legado fora da lista entra como opção, em vez de sumir e salvar em branco.
              ...(pessoais.endereco_estado !== "" &&
              !(UFS as readonly string[]).includes(pessoais.endereco_estado)
                ? [pessoais.endereco_estado]
                : []),
            ].map((uf) => ({ valor: uf, rotulo: uf }))}
            vazio="Não informado"
          />
          <Campo
            id="endereco_cep"
            rotulo="CEP"
            valor={pessoais.endereco_cep}
            mascara={mascararCep}
          />
        </Secao>
      ) : null}

      <PainelDeDisciplinas disciplinas={disciplinas} marcadas={marcadas} aoMudar={setMarcadas} />

      {mensagem ? (
        <p
          role={mensagem.tom === "erro" ? "alert" : "status"}
          data-tom={mensagem.tom}
          className={mensagem.tom === "erro" ? "text-conflito-tinta text-sm" : "text-texto text-sm"}
        >
          {mensagem.texto}
        </p>
      ) : null}

      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-slot="rodape-do-formulario"
      >
        <DialogoConfirmacao
          titulo={modo === "novo" ? "Cadastrar este instrutor?" : "Gravar as alterações?"}
          consequencia={
            modo === "novo"
              ? "O instrutor passa a existir no cadastro e recebe um código gerado pelo sistema."
              : "Os valores atuais substituem os gravados. A autoria e o momento ficam registrados."
          }
          rotuloConfirmar={modo === "novo" ? "Cadastrar" : "Gravar"}
          aoConfirmar={() => formulario.current?.requestSubmit()}
        >
          <Button type="button" disabled={enviando}>
            {enviando ? "Gravando…" : modo === "novo" ? "Cadastrar instrutor" : "Gravar alterações"}
          </Button>
        </DialogoConfirmacao>
        {rodape}
      </div>
    </form>
  );
}
