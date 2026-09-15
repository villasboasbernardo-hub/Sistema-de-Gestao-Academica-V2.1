/**
 * A ficha do instrutor (`RF-INSTR-10`, `FR-012`, `FR-027.3`, `FR-027.4`, `FR-031` e `FR-032` da spec
 * 006).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário é folha, noutro arquivo.
 *
 * ⚠️ **A IDENTIDADE É O CÓDIGO NO CAMINHO**, o número que a pessoa reconhece. O `id` uuid nunca
 * aparece na URL nem na tela (`FR-027.3`).
 *
 * ⚠️ **"NÃO HÁ" E "VOCÊ NÃO VÊ" SÃO RESPOSTAS DIFERENTES** (`FR-027.4`, gotcha nº 4 do BRIEF). Sem
 * permissão de ler instrutor, a tela diz que o perfil não alcança; com permissão e sem linha, diz
 * que o código não existe.
 *
 * ⚠️ **A CARGA HORÁRIA É SÓ LEITURA** (`FR-014`, `FR-015`, `RF-INSTR-13`). A ministrada vem de
 * `vw_instrutor_carga_anual`, em TA, que é a unidade que a view entrega; a view só tem linha de ano
 * com fato, e ausência é zero. **A prevista ainda não existe no banco**: ela espera a T011 da spec
 * 006 — qual data põe uma atribuição num ano —, e a ficha diz isso em vez de mostrar zero.
 *
 * ⚠️ **O DADO PESSOAL SÓ É LIDO PELA VISÃO COM PORTEIRO.** Se ela entrega a linha, a sessão é de um
 * dos três perfis que leem a PII, e só então a seção existe no formulário. Quem decidiu foi o banco.
 */
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { anoCorrente } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { COLUNAS_PESSOAIS, valoresFuncionaisDe, valoresPessoaisDe } from "../campos";
import { FormularioDeInstrutor } from "../FormularioDeInstrutor";
import { AcoesDeInstrutor } from "./AcoesDeInstrutor";
import { FichaEmLeitura } from "./FichaEmLeitura";

const COLUNAS_DA_FICHA =
  "id, codigo, status, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, nome_guerra, nip, data_nascimento, dep_divisao, data_assuncao_setor, email, regime_trabalho, nivel_escolaridade, formacao_principal_secundaria, capacitacao_didatica, data_inicio_docencia_mb, data_inicio_docencia_ciaara, ultima_avaliacao_desempenho, data_avaliacao_desempenho, preferencia, antiguidade_declarada, area_conhecimento";

export default async function FichaDoInstrutor({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (!pode(permissoes, "instrutores", "ler")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const supabase = await criarClienteDeServidor();
  const [instrutorRes, escalaRes] = await Promise.all([
    supabase.from("vw_instrutores").select(COLUNAS_DA_FICHA).eq("codigo", codigo).maybeSingle(),
    supabase
      .from("config_listas")
      .select("valor, ordem")
      .eq("lista", "escala_antiguidade")
      .eq("ativo", true)
      .order("ordem"),
  ]);

  if (instrutorRes.error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const instrutor = instrutorRes.data;
  if (!instrutor) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio
          motivo="sem-dado"
          titulo="Instrutor não encontrado"
          detalhe={`Não há instrutor com o código ${codigo}. O seu perfil lê o cadastro inteiro: não é falta de acesso.`}
        />
      </section>
    );
  }

  const ano = anoCorrente();
  const [{ data: pessoal }, cargaRes] = await Promise.all([
    supabase
      .from("vw_instrutor_dados_pessoais")
      .select(COLUNAS_PESSOAIS)
      .eq("id", instrutor.id)
      .maybeSingle(),
    supabase
      .from("vw_instrutor_carga_anual")
      .select("ta_ministrado_ano")
      .eq("instrutor_id", instrutor.id)
      .eq("ano", ano)
      .maybeSingle(),
  ]);
  // ⚠️ Falha de leitura é "—", não zero (`RN-DEG-01`): zero afirmaria que não houve aula.
  const ministrada = cargaRes.error ? null : Number(cargaRes.data?.ta_ministrado_ano ?? 0);

  const ativo = instrutor.status === "ativo";

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-texto text-lg font-semibold">
          <NomeInstrutor
            instrutor={{
              id: instrutor.id,
              pg: instrutor.posto_graduacao,
              especialidade: instrutor.esp_hab_obs,
              nomeCompleto: instrutor.nome_completo,
              nomeDeGuerra: instrutor.nome_guerra,
            }}
          />
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-texto-suave" data-slot="codigo-do-instrutor">
            Código {instrutor.codigo}
          </span>
          <BadgeStatus tom={ativo ? "executado" : "inativo"} rotulo={ativo ? "ativo" : "inativo"} />
        </div>
        {/* ⚠️ Oculto para quem não pode editar — e a RLS nega se a ação vier por fora da tela. */}
        <SePodeVer permissoes={permissoes} recurso="instrutores" acao="editar">
          <AcoesDeInstrutor instrutorId={instrutor.id} ativo={ativo} />
        </SePodeVer>
      </header>

      <FichaEmLeitura id={instrutor.id} valores={valoresFuncionaisDe(instrutor)} />

      <section
        aria-labelledby="carga-do-instrutor"
        className="border-borda rounded-ciaara flex flex-col gap-2 border p-4 text-sm"
        data-slot="carga-do-instrutor"
      >
        <h2 id="carga-do-instrutor" className="text-texto font-semibold">
          Carga horária de {ano}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-texto-suave">Ministrada no ano</dt>
            <dd className="text-texto" data-slot="carga-ministrada">
              {ministrada === null ? "—" : `${ministrada} TA`}
            </dd>
          </div>
          <div>
            <dt className="text-texto-suave">Prevista no ano</dt>
            <dd className="text-texto-suave" data-slot="carga-prevista">
              ainda não calculada
            </dd>
          </div>
        </dl>
        {/* veste: a dica que diz de onde vêm os números — texto fixo, nunca dado */}
        <p className="text-texto-tenue text-xs">
          Calculada a partir das aulas e avaliações lançadas; não é digitada.
        </p>
      </section>

      <SePodeVer permissoes={permissoes} recurso="instrutores" acao="editar">
        <h2 className="text-texto text-base font-semibold">Editar cadastro</h2>
        <FormularioDeInstrutor
          modo="edicao"
          instrutorId={instrutor.id}
          iniciais={valoresFuncionaisDe(instrutor)}
          pessoais={
            pessoal ? valoresPessoaisDe(pessoal as unknown as Record<string, unknown>) : null
          }
          postos={(escalaRes.data ?? []).map((e) => e.valor)}
        />
      </SePodeVer>
    </section>
  );
}
