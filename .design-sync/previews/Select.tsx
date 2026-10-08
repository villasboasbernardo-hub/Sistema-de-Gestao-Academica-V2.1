import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "ciaara-11-ds";

function OpcoesDeModalidade() {
  return (
    <>
      <SelectItem value="presencial">Presencial</SelectItem>
      <SelectItem value="ead">EAD</SelectItem>
      <SelectItem value="semipresencial">Semipresencial</SelectItem>
    </>
  );
}

function OpcoesDeClassificacao() {
  return (
    <>
      <SelectItem value="regular">Curso Regular</SelectItem>
      <SelectItem value="expedito">Curso Expedito</SelectItem>
      <SelectItem value="especial">Curso Especial</SelectItem>
      <SelectItem value="aperfeicoamento_avancado">Curso de Aperfeiçoamento Avançado</SelectItem>
      <SelectItem value="estagio_qualificacao">Estágio de Qualificação</SelectItem>
    </>
  );
}

export function Padrao() {
  return (
    <div className="flex max-w-xs flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="selecao-modalidade">Modalidade</Label>
        <Select defaultValue="presencial">
          <SelectTrigger id="selecao-modalidade" className="w-full">
            <SelectValue placeholder="Escolha a modalidade" />
          </SelectTrigger>
          <SelectContent>
            <OpcoesDeModalidade />
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="selecao-sala">Sala</Label>
        <Select>
          <SelectTrigger id="selecao-sala" className="w-full">
            <SelectValue placeholder="Escolha a sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sala-01">Sala 01</SelectItem>
            <SelectItem value="sala-02">Sala 02</SelectItem>
            <SelectItem value="biblioteca">Biblioteca</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ListaAberta() {
  // Aberta, a seleção trava a rolagem da página, e a trava zera o padding do <body> do cartão:
  // o recuo vem deste invólucro, e a altura reservada guarda o lugar da lista.
  return (
    <div className="p-6">
      <div className="flex max-w-xs flex-col gap-1" style={{ minHeight: "20rem" }}>
        <Label htmlFor="selecao-local-da-aula">Local da aula</Label>
        <Select defaultValue="biblioteca" defaultOpen>
          <SelectTrigger id="selecao-local-da-aula" className="w-full">
            <SelectValue placeholder="Escolha o local" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Salas de aula</SelectLabel>
              <SelectItem value="sala-01">Sala 01</SelectItem>
              <SelectItem value="sala-02">Sala 02</SelectItem>
              <SelectItem value="sala-03">Sala 03</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Outros espaços</SelectLabel>
              <SelectItem value="biblioteca">Biblioteca</SelectItem>
              <SelectItem value="laboratorio-hidrografia">Laboratório de Hidrografia</SelectItem>
              <SelectItem value="auditorio" disabled>
                Auditório — reservado neste horário
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function Pequeno() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select defaultValue="regular">
        <SelectTrigger size="sm" aria-label="Classificação do curso">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <OpcoesDeClassificacao />
        </SelectContent>
      </Select>
      <Select defaultValue="presencial">
        <SelectTrigger size="sm" aria-label="Modalidade">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <OpcoesDeModalidade />
        </SelectContent>
      </Select>
      <Select defaultValue="compacta">
        <SelectTrigger size="sm" aria-label="Densidade da tabela">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="compacta">Compacta</SelectItem>
          <SelectItem value="padrao">Padrão</SelectItem>
          <SelectItem value="confortavel">Confortável</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ComErro() {
  return (
    <div className="flex max-w-xs flex-col gap-1">
      <Label htmlFor="selecao-tipo-de-atividade">Tipo de atividade</Label>
      <Select>
        <SelectTrigger
          id="selecao-tipo-de-atividade"
          className="w-full"
          aria-invalid="true"
          aria-describedby="selecao-tipo-de-atividade-motivo"
        >
          <SelectValue placeholder="Escolha o tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aula-teorica">Aula Teórica</SelectItem>
          <SelectItem value="aula-pratica">Aula Prática</SelectItem>
          <SelectItem value="avaliacao">Avaliação</SelectItem>
          <SelectItem value="vista-de-prova">Vista de prova</SelectItem>
        </SelectContent>
      </Select>
      <p id="selecao-tipo-de-atividade-motivo" role="alert" className="text-conflito-tinta text-xs">
        Escolha o tipo de atividade antes de gravar o lançamento.
      </p>
    </div>
  );
}

export function Desabilitado() {
  return (
    <div className="flex max-w-xs flex-col gap-1">
      <Label htmlFor="selecao-classificacao">Classificação do curso</Label>
      <Select defaultValue="aperfeicoamento_avancado" disabled>
        <SelectTrigger id="selecao-classificacao" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <OpcoesDeClassificacao />
        </SelectContent>
      </Select>
    </div>
  );
}
