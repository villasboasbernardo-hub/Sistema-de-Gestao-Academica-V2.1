/**
 * Cursos — o catálogo (`RF-CURSOS-01`, `RF-CURSOS-02`, `FR-001` a `FR-005`, `FR-047`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Os cartões e os indicadores são servidor; só a barra de filtros é
 * folha. Um `"use client"` aqui mandaria o catálogo inteiro para o navegador, e o erro **não aparece
 * no `tsc`** — aparece no `next build`.
 *
 * ⚠️ **UMA CONSULTA PARA A TELA INTEIRA** (`FR-012`). Cartões e indicadores saem das **mesmas** linhas.
 * Se os agregados tivessem leitura própria, a tela mostraria "3 cursos regulares" ao lado de dois
 * cartões e ninguém saberia qual dos dois recortes mudou.
 *
 * ⚠️ **ERRO DE LEITURA NÃO ESTOURA** (`RN-DEG-01`): vira o vazio de "você não vê", que é o que uma
 * negativa da RLS de fato significa.
 *
 * ⚠️ **TRÊS VAZIOS, TRÊS FRASES** (`FR-047`). "Não há para estes filtros", "você não alcança nenhum
 * curso" e "ainda não existe curso no sistema" são fatos diferentes. A Production hoje é o terceiro,
 * e mostrar-lhe o primeiro ensinaria a concluir que a migração falhou.
 *
 * ⚠️ **FILTROS E ESTATÍSTICAS SÃO ÍCONES NA LINHA DE *NOVO CURSO*** (RT-4 do Bloco 10, spec 025, D-18 e D-19): cada um
 * abre o seu painel abaixo do cabeçalho, recolhido ao chegar; o número de filtros fora do padrão aparece no ícone.
 */

import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { curriculoVigenteEm, type CurriculoParaVigencia } from "@/lib/dominio/curriculos";
import { curriculoDeReferencia } from "@/lib/dominio/ano-escolhido";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { SeletorDeAno } from "@/components/ciaara/seletor-de-ano";
import { indicadoresDoCatalogo } from "@/lib/dominio/indicadores-do-catalogo";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { lerParametros } from "@/lib/navegacao/esquema";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { CatalogoDeCursos, type CartaoDeCurso } from "./CatalogoDeCursos";
import {
  alcanceDoPerfil,
  COLUNAS_DO_CATALOGO,
  montarConsultaDeCursos,
  motivoDoVazio,
  PARAMETROS_SEM_RECORTE,
  type ParametrosDoCatalogo,
} from "./consulta";
import { FiltrosDoCatalogo } from "./FiltrosDoCatalogo";
import { IndicadoresDoCatalogo } from "./IndicadoresDoCatalogo";

/** O texto de cada um dos três vazios do `FR-047`. */
const TEXTO_DO_VAZIO = {
  "nao-ha": {
    motivo: "sem-dado" as const,
    titulo: "Nenhum curso com estes filtros",
    detalhe: "Há cursos no sistema — nenhum deles atende ao recorte atual. Limpe um filtro.",
  },
  "nao-ve": {
    motivo: "sem-permissao" as const,
    titulo: "Você não alcança nenhum curso",
    detalhe:
      "O seu perfil enxerga um recorte do catálogo, e ele está vazio. Fale com o Admin se " +
      "precisar de outro escopo.",
  },
  "ainda-nao-existe": {
    motivo: "sem-dado" as const,
    titulo: "Ainda não há curso no sistema",
    detalhe: "Nenhum curso foi cadastrado neste ambiente até agora.",
  },
};

export default async function Cursos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário; valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/cursos", await searchParams);
  const parametros: ParametrosDoCatalogo = {
    classificacao: String(valores.classificacao),
    modalidade: String(valores.modalidade),
    situacao: String(valores.situacao),
    estrangeiros: String(valores.estrangeiros),
  };

  /*
   * ⚠️ RT-6 (Bloco 10, conferência de 24/10/2026): a duração e o propósito são os do currículo vigente NO ANO ESCOLHIDO
   *    — hoje, no ano corrente; 1º de janeiro, nos outros (D-27, a mesma régua da página do curso). As estatísticas de
   *    duração saem dos mesmos cartões.
   */
  const hoje = hojeNaCiaara();
  const escolha = await anoEscolhido(String(valores.ano), hoje);
  const referencia = curriculoDeReferencia(escolha.ano, hoje);

  const supabase = await criarClienteDeServidor();
  const [usuario, { data, error }] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeCursos(supabase.from("cursos").select(COLUNAS_DO_CATALOGO), parametros),
  ]);
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const ativos = filtrosForaDoPadrao("/cursos", parametros);

  /*
   * ⚠️ **A ÚNICA ENTRADA CLICÁVEL PARA `/cursos/novo`** — e até 24/09/2026 não havia nenhuma:
   *    a tela existia e só se chegava nela digitando o endereço. A conferência de Bernardo
   *    encontrou, e a causa foi a suíte: os percursos chegavam por `page.goto`, que prova que a
   *    tela funciona e **não** prova que alguém a alcança. **Tela sem caminho clicável é tela não
   *    entregue** (regra do `CLAUDE.md`).
   *
   * ⚠️ **ELE SEGUE A PERMISSÃO DA PÁGINA, e não uma regra própria.** `/cursos/novo` recusa quem
   *    não tem `cursos.criar`; oferecer o botão a quem vai ser recusado é ensinar a bater na
   *    porta. Esconder **não** é a proteção — quem protege é a policy `cursos_criar`.
   */
  const cabecalho = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Cursos</h1>
        <p className="text-texto-suave text-sm">
          O catálogo agrupado por classificação. Clique num curso para abrir a página dele.
        </p>
      </div>
      <BarraDeAcoes rotulo="Ações do catálogo">
        <SeletorDeAno
          ano={escolha.ano}
          vigente={escolha.vigente}
          origem={escolha.origem}
          rota="/cursos"
        />
        <GatilhoDePainel painel="filtros" contagem={ativos} />
        {error ? null : <GatilhoDePainel painel="estatisticas" />}
        <SePodeVer permissoes={permissoes} recurso="cursos" acao="criar">
          <BotaoDeIcone
            acao="novo"
            rotulo="Novo curso"
            variante="padrao"
            href="/cursos/novo"
            data-slot="ir-para-novo-curso"
          />
        </SePodeVer>
      </BarraDeAcoes>
    </div>
  );
  const filtros = (
    <ConteudoDePainel painel="filtros">
      <FiltrosDoCatalogo />
    </ConteudoDePainel>
  );

  if (error) {
    return (
      <ProvedorDePaineis>
        <section className="flex flex-col gap-4">
          {cabecalho}
          {filtros}
          <EstadoVazio motivo="sem-permissao" />
        </section>
      </ProvedorDePaineis>
    );
  }

  const linhas = data ?? [];
  /* Spec 021 (RC-1) e RT-6: o propósito e a duração vêm do currículo vigente NO ANO ESCOLHIDO de cada curso. */
  const cursos: CartaoDeCurso[] = linhas.map((c) => {
    const curriculo = curriculoVigenteEm(
      (c.curriculos ?? []) as unknown as CurriculoDoCatalogo[],
      referencia,
    );
    return {
      codigo: c.codigo as string,
      nome: c.nome_curso as string,
      classificacao: c.classificacao as string,
      modalidade: c.modalidade,
      proposito: curriculo?.proposito ?? null,
      duracaoDias: curriculo === null ? null : Number(curriculo.duracao_dias),
      duracaoSemanas:
        curriculo?.duracao_semanas === null || curriculo?.duracao_semanas === undefined
          ? null
          : Number(curriculo.duracao_semanas),
      ativo: c.status === "ativo",
    };
  });

  const agregados = indicadoresDoCatalogo(
    cursos.map((c) => ({
      codigo: c.codigo,
      classificacao: c.classificacao,
      duracaoSemanas: c.duracaoSemanas,
    })),
  );

  /*
   * ⚠️ O RECORTE É MEDIDO CONTRA O PADRÃO DO CONTRATO, e não contra "a URL tem parâmetro". `/cursos`
   * limpo já manda `situacao=ativo` à consulta; tratá-lo como recorte faria a tela vazia de uma base
   * vazia dizer "nenhum curso com estes filtros".
   */
  const haRecorte = (Object.keys(PARAMETROS_SEM_RECORTE) as (keyof ParametrosDoCatalogo)[]).some(
    (chave) => parametros[chave] !== PARAMETROS_SEM_RECORTE[chave],
  );

  const vazio = motivoDoVazio({
    cursosMostrados: cursos.length,
    haRecorte,
    alcanceDoPerfil: alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
  });

  return (
    <ProvedorDePaineis>
      <section className="flex flex-col gap-5">
        {cabecalho}
        {filtros}
        <ConteudoDePainel painel="estatisticas">
          <IndicadoresDoCatalogo agregados={agregados} recorte={haRecorte} />
        </ConteudoDePainel>

        {vazio ? (
          <EstadoVazio
            motivo={TEXTO_DO_VAZIO[vazio].motivo}
            titulo={TEXTO_DO_VAZIO[vazio].titulo}
            detalhe={TEXTO_DO_VAZIO[vazio].detalhe}
          />
        ) : (
          <CatalogoDeCursos cursos={cursos} />
        )}
      </section>
    </ProvedorDePaineis>
  );
}

/** O currículo embutido na linha do catálogo (spec 021, RC-1). */
type CurriculoDoCatalogo = CurriculoParaVigencia & {
  readonly proposito: string | null;
  readonly duracao_dias: number;
  readonly duracao_semanas: number | null;
};
