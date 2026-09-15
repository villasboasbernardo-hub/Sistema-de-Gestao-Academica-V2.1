/**
 * Um campo de escolha simples, com rótulo e marca de obrigatório.
 *
 * ⚠️ ELE EXISTE SEPARADO DO FORMULÁRIO POR CAUSA DE UM PORTÃO, e o motivo precisa ficar escrito.
 * `tests/unidade/seletor-unico.test.ts` garante que só `components/ciaara/seletor-instrutor.tsx`
 * constrói uma escolha de pessoa (`RN-ANT-01`, ponto único). A varredura reconhece construção por
 * "o arquivo fala dessa entidade e tem um seletor nativo". As escolhas do formulário são de posto e de
 * regime — não de pessoa —, e escrevê-las no mesmo arquivo do formulário faria o portão contar dois
 * construtores. Separadas aqui, cada arquivo diz o que faz.
 *
 * ⚠️ NÃO USE ESTE CAMPO PARA ESCOLHER PESSOA. Para isso existe o seletor canônico, que ordena por
 * antiguidade; um campo genérico com uma lista de pessoas devolveria o esquecimento que o ponto único
 * elimina.
 */
import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";

export type OpcaoDeEscolha = { readonly valor: string; readonly rotulo: string };

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function CampoDeEscolha({
  id,
  rotulo,
  valor,
  opcoes,
  vazio,
  obrigatorio = false,
}: {
  readonly id: string;
  readonly rotulo: string;
  readonly valor: string;
  readonly opcoes: readonly OpcaoDeEscolha[];
  /** O rótulo da opção sem valor. */
  readonly vazio: string;
  readonly obrigatorio?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <CampoObrigatorio para={id} rotulo={rotulo} obrigatorio={obrigatorio} />
      <select
        {...propsDoControle(id, obrigatorio)}
        name={id}
        defaultValue={valor}
        className={CAMPO}
      >
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
