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
 * ⚠️ **O DADO PESSOAL SÓ É LIDO PELA VISÃO COM PORTEIRO.** Se ela entrega a linha, a sessão é de um
 * dos três perfis que leem a PII, e só então a seção existe no formulário. Quem decidiu foi o banco.
 */
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { rotuloDoRegime } from "@/lib/constantes/instrutor";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { COLUNAS_PESSOAIS, valoresFuncionaisDe, valoresPessoaisDe } from "../campos";
import { FormularioDeInstrutor } from "../FormularioDeInstrutor";

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

  const { data: pessoal } = await supabase
    .from("vw_instrutor_dados_pessoais")
    .select(COLUNAS_PESSOAIS)
    .eq("id", instrutor.id)
    .maybeSingle();

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
      </header>

      <dl className="border-borda rounded-ciaara grid gap-x-6 gap-y-2 border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-texto-suave">Categoria</dt>
          <dd className="text-texto">{instrutor.categoria}</dd>
        </div>
        <div>
          <dt className="text-texto-suave">Organização militar</dt>
          <dd className="text-texto">{instrutor.om}</dd>
        </div>
        <div>
          <dt className="text-texto-suave">Regime de trabalho</dt>
          <dd className="text-texto">{rotuloDoRegime(instrutor.regime_trabalho)}</dd>
        </div>
        <div>
          <dt className="text-texto-suave">Capacitação didática</dt>
          <dd className="text-texto">{instrutor.capacitacao_didatica ?? "—"}</dd>
        </div>
      </dl>

      <SePodeVer permissoes={permissoes} recurso="instrutores" acao="editar">
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
