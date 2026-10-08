import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EsqueletoTabela,
} from "ciaara-11-ds";

/** O padrão: 8 linhas e 4 colunas, a silhueta que o `<Suspense>` mostra enquanto a lista chega. */
export function Padrao() {
  return <EsqueletoTabela />;
}

/** Como o segmento de instrutores carrega (`loading.tsx`): faixa do título + a tabela que vem. */
export function CarregandoListagem() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Carregando os instrutores…</span>
      <div className="bg-superficie-2 rounded-ciaara h-7 w-48" />
      <EsqueletoTabela />
    </div>
  );
}

/** A proporção acompanha o conteúdo real: 4 linhas e 5 colunas, como na vitrine. */
export function QuatroLinhasCincoColunas() {
  return <EsqueletoTabela linhas={4} colunas={5} />;
}

/** Dentro de um cartão: o cabeçalho já está na tela, só a grade ainda está chegando. */
export function DentroDeCartao() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disciplinas da turma C-Ap-HN 2026</CardTitle>
        <CardDescription>
          Carga horária prevista, cumprida e situação de cada disciplina
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EsqueletoTabela linhas={5} colunas={6} />
      </CardContent>
    </Card>
  );
}
