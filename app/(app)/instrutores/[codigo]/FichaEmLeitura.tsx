/**
 * A ficha do instrutor em leitura, com as seções da v2.0 (`RF-INSTR-10`, `FR-023`, `FR-027.2` e
 * `FR-031` da spec 006; specs 016 e 025 da v2.0).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE, e sem campo nenhum. É a ficha que **todo** perfil que lê instrutor vê;
 * o formulário de edição vem abaixo, na página, só para quem edita. A saída em PDF e a rota de
 * impressão ficam para o Épico 11 (`FR-031`).
 *
 * ⚠️ AS QUATRO SEÇÕES SÃO AS DO FORMULÁRIO — identificação, lotação e vínculo, formação e
 * capacitação, avaliação e preferências —, na mesma ordem. Ler numa ordem e editar noutra faria a
 * pessoa procurar o campo duas vezes.
 *
 * ⚠️ SEM DADO PESSOAL. Identificação civil e residência aparecem só no formulário, e só para quem o
 * banco entrega a visão com porteiro (`FR-032`).
 *
 * ⚠️ O NOME SAI POR `NomeInstrutor`, com o nome de guerra em negrito dentro do nome completo
 * (`FR-019`, `FR-027.2`). Campo vazio é "—", nunca espaço em branco que pareça dado faltando na tela.
 */
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { rotuloDoRegime } from "@/lib/constantes/instrutor";
import { dataParaLeitura } from "@/lib/formato/data";

import type { ValoresFuncionais } from "../campos";

type Item = { readonly rotulo: string; readonly valor: React.ReactNode };

const texto = (v: string) => (v.trim() === "" ? "—" : v);

function Secao({ titulo, itens }: { readonly titulo: string; readonly itens: readonly Item[] }) {
  return (
    <section className="border-borda rounded-ciaara flex flex-col gap-2 border p-4 text-sm">
      <h2 className="text-texto font-semibold">{titulo}</h2>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {itens.map((item) => (
          <div key={item.rotulo}>
            <dt className="text-texto-suave">{item.rotulo}</dt>
            <dd className="text-texto whitespace-pre-line">{item.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FichaEmLeitura({
  id,
  valores: v,
}: {
  readonly id: string;
  readonly valores: ValoresFuncionais;
}) {
  return (
    <div className="flex flex-col gap-3" data-slot="ficha-do-instrutor">
      <Secao
        titulo="Identificação"
        itens={[
          {
            rotulo: "Nome",
            valor: (
              <NomeInstrutor
                instrutor={{
                  id,
                  pg: v.posto_graduacao,
                  especialidade: v.esp_hab_obs,
                  nomeCompleto: v.nome_completo,
                  nomeDeGuerra: v.nome_guerra === "" ? null : v.nome_guerra,
                }}
              />
            ),
          },
          { rotulo: "Posto/Graduação", valor: texto(v.posto_graduacao) },
          { rotulo: "Especialidade/Habilitação", valor: texto(v.esp_hab_obs) },
          { rotulo: "Nome de guerra", valor: texto(v.nome_guerra) },
          { rotulo: "Categoria", valor: texto(v.categoria) },
          { rotulo: "NIP", valor: texto(v.nip) },
          { rotulo: "Data de nascimento", valor: dataParaLeitura(v.data_nascimento) },
          { rotulo: "E-mail", valor: texto(v.email) },
        ]}
      />
      <Secao
        titulo="Lotação e vínculo"
        itens={[
          { rotulo: "Organização militar", valor: texto(v.om) },
          { rotulo: "Departamento/Divisão", valor: texto(v.dep_divisao) },
          { rotulo: "Assunção no setor", valor: dataParaLeitura(v.data_assuncao_setor) },
          { rotulo: "Regime de trabalho", valor: rotuloDoRegime(v.regime_trabalho) },
          { rotulo: "Antiguidade declarada", valor: texto(v.antiguidade_declarada) },
        ]}
      />
      <Secao
        titulo="Formação e capacitação"
        itens={[
          { rotulo: "Escolaridade", valor: texto(v.nivel_escolaridade) },
          { rotulo: "Área de conhecimento", valor: texto(v.area_conhecimento) },
          {
            rotulo: "Formação principal e secundária",
            valor: texto(v.formacao_principal_secundaria),
          },
          { rotulo: "Capacitação didática", valor: texto(v.capacitacao_didatica) },
          {
            rotulo: "Início da docência na MB",
            valor: dataParaLeitura(v.data_inicio_docencia_mb),
          },
          {
            rotulo: "Início da docência no CIAARA",
            valor: dataParaLeitura(v.data_inicio_docencia_ciaara),
          },
        ]}
      />
      <Secao
        titulo="Avaliação e preferências"
        itens={[
          {
            rotulo: "Última avaliação de desempenho",
            valor: texto(v.ultima_avaliacao_desempenho),
          },
          { rotulo: "Data da avaliação", valor: dataParaLeitura(v.data_avaliacao_desempenho) },
          { rotulo: "Preferências e restrições gerais", valor: texto(v.preferencia) },
        ]}
      />
    </div>
  );
}
