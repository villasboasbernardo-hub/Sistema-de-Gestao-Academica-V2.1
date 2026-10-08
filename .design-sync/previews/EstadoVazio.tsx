import { BotaoLimparFiltros, Button, EstadoVazio } from "ciaara-11-ds";

/** "Não há": o motivo padrão, com os textos do próprio componente. */
export function NaoHa() {
  return <EstadoVazio motivo="sem-dado" />;
}

/** "Você não vê": existe dado, o perfil é que não alcança — texto da grade de disciplinas. */
export function VoceNaoVe() {
  return (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="Nenhum curso ao seu alcance"
      detalhe="A grade de disciplinas mostra os cursos que o seu perfil enxerga. Fale com o Administrador se faltar algum."
    />
  );
}

/** Um vazio que não é beco: o recorte não achou turma, e a saída é desfazer o filtro. */
export function RecorteComAcao() {
  return (
    <EstadoVazio
      motivo="sem-dado"
      titulo="Nenhuma turma neste recorte"
      detalhe="Há turmas cadastradas, mas nenhuma com esta classificação e modalidade. Volte o filtro para Todas."
      acao={<BotaoLimparFiltros haFiltroAtivo aoLimpar={() => {}} />}
    />
  );
}

/** Os dois vazios lado a lado, como na vitrine: o ícone e o texto mudam com o motivo. */
export function LadoALado() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <EstadoVazio motivo="sem-dado" />
      <EstadoVazio motivo="sem-permissao" acao={<Button size="sm">Solicitar acesso</Button>} />
    </div>
  );
}
