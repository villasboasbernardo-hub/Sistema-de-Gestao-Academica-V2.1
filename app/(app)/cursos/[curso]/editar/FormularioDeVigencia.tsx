/**
 * Registrar e corrigir vigência de regime — **folha de cliente** (`FR-019`, `FR-021.1`, `FR-022`,
 * `FR-018.1`).
 *
 * ⚠️ **AS DUAS CONFIRMAM SEMPRE** (`FR-018.1`, contrato §4). Registrar muda o que vale dali em
 * diante; corrigir **desfaz** uma vigência e põe outra no lugar. Nenhuma das duas é reversível por
 * outro clique, e é por isso que o diálogo não depende de nenhuma condição — ao contrário do limite
 * de turmas, que só pergunta quando o teto é alcançado.
 *
 * ⚠️ **NA CORREÇÃO, O FORMULÁRIO ABRE PREENCHIDO COM OS VALORES ATUAIS** (`FR-021.1`) — quem decide
 * quais são é `lib/dominio/vigencia-de-regime.ts`. *"Para quem usa, parece edição; para o banco, é
 * append-only."*
 *
 * ⚠️ **O `fundamento_curricular` FICA AO LADO DOS PARÂMETROS** (`FR-022`, B-16): os pares autorizados
 * por currículo **não existem como dado** nesta fatia, e o que a tela pode fazer é mostrar o
 * fundamento de quem vai decidir — não validar contra uma tabela que não existe.
 *
 * ⚠️ **O MOTIVO NASCE VAZIO NA CORREÇÃO.** Ele explica **esta** correção; herdar o texto da anterior
 * faria a nova nascer com a justificativa de outra mudança.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { corrigirVigencia, registrarVigencia } from "@/lib/acoes/vigencia-regime";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import {
  ROTULO_DO_TIPO_DE_REGIME,
  TIPOS_DE_REGIME,
  type ValoresDaVigencia,
} from "@/lib/dominio/vigencia-de-regime";

const VAZIA: ValoresDaVigencia = {
  tipo_regime: "",
  vigente_de: "",
  regime_tempos: "",
  ta_duracao_min: "",
  intervalo_manha_min: "",
  intervalo_tarde_min: "",
  hora_inicio_manha: "",
  hora_inicio_tarde: "",
  limite_diario_ead_horas: "",
  fundamento_curricular: "",
  motivo: "",
};

export type FormularioDeVigenciaProps = {
  readonly modo: "registrar" | "corrigir";
  readonly cursoId: string;
  readonly sigla: string;
  /** Só no modo `corrigir`: a vigência que sai de cena. */
  readonly vigenciaId?: string;
  readonly inicial?: ValoresDaVigencia;
};

export function FormularioDeVigencia({
  modo,
  cursoId,
  sigla,
  vigenciaId,
  inicial,
}: FormularioDeVigenciaProps) {
  const router = useRouter();
  const [valores, definirValores] = React.useState<ValoresDaVigencia>(inicial ?? VAZIA);
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  const trocar =
    (campo: keyof ValoresDaVigencia) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      definirValores((v) => ({ ...v, [campo]: e.target.value }));

  const confirmacao = confirmacaoDaGravacao(
    modo === "registrar" ? "registrar_vigencia" : "corrigir_vigencia",
    { sigla, vigenteDe: valores.vigente_de },
  );

  async function gravar() {
    definirGravando(true);
    definirErro(null);
    const resultado =
      modo === "registrar"
        ? await registrarVigencia(cursoId, sigla, valores)
        : await corrigirVigencia(vigenciaId ?? "", sigla, valores);
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    if (modo === "corrigir") definirValores({ ...valores, motivo: "" });
    router.refresh();
  }

  const botao = (
    <Button
      type="submit"
      size="sm"
      disabled={gravando}
      data-slot={modo === "registrar" ? "registrar-vigencia" : "gravar-correcao"}
    >
      {modo === "registrar" ? "Registrar vigência" : "Salvar correção"}
    </Button>
  );

  return (
    <form
      data-slot="formulario-de-vigencia"
      data-modo={modo}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmacao.confirma) void gravar();
      }}
    >
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-da-vigencia">
          {erro}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-tipo`} rotulo="Tipo de regime" obrigatorio />
          <select
            {...propsDoControle(`${modo}-tipo`, true)}
            name="tipo_regime"
            value={valores.tipo_regime}
            onChange={trocar("tipo_regime")}
            className="border-borda bg-superficie-1 text-texto rounded-ciaara h-9 border px-2 text-sm"
          >
            <option value="">Escolha o tipo</option>
            {TIPOS_DE_REGIME.map((t) => (
              <option key={t} value={t}>
                {ROTULO_DO_TIPO_DE_REGIME[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-de`} rotulo="Vale a partir de" obrigatorio />
          <Input
            {...propsDoControle(`${modo}-de`, true)}
            name="vigente_de"
            type="date"
            value={valores.vigente_de}
            onChange={trocar("vigente_de")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-tempos`} rotulo="TA por dia" obrigatorio />
          <Input
            {...propsDoControle(`${modo}-tempos`, true)}
            name="regime_tempos"
            inputMode="numeric"
            value={valores.regime_tempos}
            onChange={trocar("regime_tempos")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-duracao`} rotulo="Duração do TA (min)" obrigatorio />
          <Input
            {...propsDoControle(`${modo}-duracao`, true)}
            name="ta_duracao_min"
            inputMode="numeric"
            value={valores.ta_duracao_min}
            onChange={trocar("ta_duracao_min")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio
            para={`${modo}-int-manha`}
            rotulo="Intervalo da manhã (min)"
            obrigatorio
          />
          <Input
            {...propsDoControle(`${modo}-int-manha`, true)}
            name="intervalo_manha_min"
            inputMode="numeric"
            value={valores.intervalo_manha_min}
            onChange={trocar("intervalo_manha_min")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio
            para={`${modo}-int-tarde`}
            rotulo="Intervalo da tarde (min)"
            obrigatorio
          />
          <Input
            {...propsDoControle(`${modo}-int-tarde`, true)}
            name="intervalo_tarde_min"
            inputMode="numeric"
            value={valores.intervalo_tarde_min}
            onChange={trocar("intervalo_tarde_min")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-manha`} rotulo="Início da manhã" />
          <Input
            {...propsDoControle(`${modo}-manha`, false)}
            name="hora_inicio_manha"
            type="time"
            value={valores.hora_inicio_manha}
            onChange={trocar("hora_inicio_manha")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-tarde`} rotulo="Início da tarde" />
          <Input
            {...propsDoControle(`${modo}-tarde`, false)}
            name="hora_inicio_tarde"
            type="time"
            value={valores.hora_inicio_tarde}
            onChange={trocar("hora_inicio_tarde")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-ead`} rotulo="Limite diário EAD (h)" />
          <Input
            {...propsDoControle(`${modo}-ead`, false)}
            name="limite_diario_ead_horas"
            inputMode="decimal"
            value={valores.limite_diario_ead_horas}
            onChange={trocar("limite_diario_ead_horas")}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-fundamento`} rotulo="Fundamento curricular" />
          <Input
            {...propsDoControle(`${modo}-fundamento`, false)}
            name="fundamento_curricular"
            value={valores.fundamento_curricular}
            onChange={trocar("fundamento_curricular")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <CampoObrigatorio para={`${modo}-motivo`} rotulo="Motivo" />
          <Input
            {...propsDoControle(`${modo}-motivo`, false)}
            name="motivo"
            value={valores.motivo}
            onChange={trocar("motivo")}
            placeholder={modo === "corrigir" ? "o que esta correção arruma" : "o que mudou"}
          />
        </div>
      </div>

      <div data-slot="rodape-da-vigencia">
        {confirmacao.confirma ? (
          <DialogoConfirmacao
            titulo={confirmacao.titulo}
            consequencia={confirmacao.mensagens.join(" ")}
            rotuloConfirmar={confirmacao.rotuloConfirmar}
            aoConfirmar={() => void gravar()}
          >
            {botao}
          </DialogoConfirmacao>
        ) : (
          botao
        )}
      </div>
    </form>
  );
}
