# Contrato de telas — Bloco 5

## Editar curso (`/cursos/[curso]/editar`)

- O formulário ganha, só no modo de edição, o grupo **Estrangeiros** (`name="ofertavel_estrangeiros"`: *Não informado*,
  *Sim*, *Não*; `#curso-estrangeiros-observacao`) e o grupo **Custo** (`#curso-custo-total`, em reais com vírgula;
  `#curso-custo-composicao`).
- A seção **Currículo em PDF** (`data-slot="envio-do-curriculo"`), para quem edita: estado (*"Carregado em
  dd/mm/aaaa às hh:mm"* ou *"Nenhum currículo carregado"*), botão **Carregar PDF** / **Substituir PDF** (`type="button"`,
  abre a janela de arquivo), mensagem em `role="status"` ou `role="alert"`.

## Sobre o Curso (`?aba=sobre`)

- No bloco *Catálogo do curso*: **Ofertável a estrangeiros** (*Sim*, *Não*, *Não informado*) e a observação; **Custo
  total** (*R$ 12.345,67* ou *Não informado*) e a composição; **Currículo (PDF)**: link **Baixar o currículo (PDF)**
  (`data-slot="baixar-curriculo"`, para `/cursos/<sigla>/curriculo`) com a data, ou *"Currículo ainda não carregado."*

## Catálogo (`/cursos`)

- Filtro **Estrangeiros** (`estrangeiros`: `sim`, `nao`, `nao_informado`; padrão vazio = todos), no mesmo
  `FiltroAvancado`, com o *Limpar filtros* de sempre.

## Instrutor

- Formulário: **Capacitação didática** vira três caixas de marcar (`name="capacitacoes_didaticas"`), na ordem da lista;
  se houver texto a corrigir, o campo **Texto antigo a corrigir** (`#capacitacao_didatica_a_corrigir`) aparece abaixo.
- Ficha: as capacitações marcadas, separadas por vírgula, ou *"Nenhuma"*; com texto a corrigir, o aviso
  (`data-slot="capacitacao-a-corrigir"`): *"Capacitação a corrigir: «…» — não está na lista (C-Esp-DID, C-Exp-TE,
  Licenciatura). Marque as capacitações em Editar e apague o texto."*
- Lista: o filtro de capacitação oferece as três e *Nenhuma*.

## Administração → Usuários (`/admin/usuarios`)

- Coluna **Acessos** (`data-slot="acessos-da-conta"`) depois de *Último acesso*.
- Acima da tabela, o quadro **Acessos ao sistema** (`data-slot="quadro-de-acessos"`), *"contados desde dd/mm/aaaa"*:
  **Quem mais acessou** (5 contas, com o total) e **Acessos recentes** (10, conta e data com hora). Sem acesso nenhum:
  *"Nenhum acesso registrado ainda."*
