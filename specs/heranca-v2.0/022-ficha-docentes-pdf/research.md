# Research — Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`

## 1. Reestruturação em 3 abas sem tocar os outros 4 consumidores da taxonomia

**Decision**: `BLOCOS_EDICAO_INSTRUTOR` (``app/(app)/instrutores/page.tsx`:776-815`) ganha uma chave nova `aba`
em cada um dos 4 blocos existentes: `'pessoais'` (Identificação), `'profissionais'` (Vínculo
Institucional), `'complementares'` (Qualificação Docente), e `null`/ausente para "Sistema (somente
leitura)" — que fica fora das 3 abas de conteúdo, exatamente como já decidido em Key Entities do
spec.md. `renderizarPainelEdicaoInstrutor_` passa a agrupar os blocos por `aba` e montar
`.nav-tabs`/`.tab-pane` (3 abas de conteúdo); o bloco sem `aba` continua renderizado como card
avulso, exatamente como hoje, fora da estrutura de abas.

**Rationale**: `coletarValoresFormularioInstrutor_` (linha 1092-1094+),
`renderizarModalFichaInstrutor_` (linha 1200-1206) e `disciplinasHabilitadasHtmlInstrutor_` iteram
`BLOCOS_EDICAO_INSTRUTOR` de forma **achatada** (`forEach`/`.map` sobre todos os blocos, sem
nenhuma lógica de agrupamento visual) — nenhum deles lê a chave `aba`, então nenhum precisa de
qualquer mudança. Adicionar uma chave nova e ignorada pelos consumidores que não precisam dela é a
mudança de menor superfície possível (Princípio VI) — evita duplicar a lista de campos em uma
segunda estrutura "por aba".

**Alternatives considered**:
- *Duplicar a lista de campos em uma estrutura `ABAS_INSTRUTOR = [{titulo, blocos: [...]}]`
  separada de `BLOCOS_EDICAO_INSTRUTOR`* — rejeitado: criaria 2 fontes de verdade para os mesmos 30+
  campos, risco real de divergência (um campo novo adicionado em uma lista e esquecido na outra).
- *Reescrever `BLOCOS_EDICAO_INSTRUTOR` inteiro como uma árvore aninhada `abas → blocos → campos`*
  — rejeitado: obrigaria reescrever os 3 outros consumidores (`coletarValoresFormularioInstrutor_`
  etc.) para navegar 2 níveis em vez de 1, superfície de mudança bem maior para o mesmo resultado
  visual.

## 2. Validação dos 4 campos obrigatórios (client + server)

**Decision**: Client-side — nova função `validarCamposObrigatoriosInstrutor_(valores)` (pura,
recebe o objeto já coletado por `coletarValoresFormularioInstrutor_`), devolve a lista de campos
faltando entre `['Posto_Graduacao', 'Esp_Hab_Obs', 'Nome_Completo', 'Nome_Guerra']`. Chamada no
início de `salvarEdicaoInstrutor_`, antes de montar o payload: se a lista não for vazia, mostra um
aviso citando os rótulos faltando, seleciona programaticamente a aba (`aba`, achado §1) do primeiro
campo faltando (`.tab-pane`/`.nav-link` do Tailwind CSS via API JS nativa, `Tailwind.Tab`), e retorna
sem chamar `gs(...)`. Server-side — `cadastrarInstrutor`/`atualizarInstrutor` (``lib/acoes/instrutores.ts`:
149-158`) ganham a mesma checagem no início da função, lançando `Error` com mensagem citando o(s)
campo(s) faltando antes de qualquer `crudCriar`/`crudAtualizar`.

**Rationale**: Reaproveita a função pura já existente para coletar valores — nenhuma leitura de DOM
duplicada. A defesa em profundidade (Acceptance Scenario 4, US2) exige a checagem no servidor
também, já que qualquer chamada direta a `cadastrarInstrutor`/`atualizarInstrutor` (fora do
formulário) contornaria uma validação só client-side.

**Alternatives considered**:
- *Usar só o atributo HTML `required` nos `<input>`* — rejeitado: não cobre o requisito de "trocar
  automaticamente para a aba correta" (o navegador só foca o campo dentro da aba atualmente visível,
  campos em abas escondidas com `required` não disparam a validação nativa de forma confiável entre
  navegadores) nem a defesa em profundidade server-side.

## 3. `gerarFichaPDF(idInstrutor)` — mecânica de mesclagem e limpeza

**Decision**:
```
function gerarFichaPDF(idInstrutor) {
  exigirFuncao(CRUD_CONFIG['instrutores'].leitura);
  var instrutor = lerAbaComoObjetos_('instrutores').find(i => String(i.ID_Instrutor) === String(idInstrutor));
  if (!instrutor) throw new Error('Instrutor não encontrado.');
  var idTemplate = lerConfigParametros_()['ID_TEMPLATE_FICHA_INSTRUTOR'];
  if (!idTemplate) throw new Error('Template da Ficha não configurado em config_parametros.');
  var copia = o Supabase Storage.getFileById(idTemplate).makeCopy('Ficha - ' + (instrutor.Nome_Completo || idInstrutor));
  try {
    var doc = a rota de impressão `/print/*`.openById(copia.getId());
    var corpo = doc.getBody();
    Object.keys(MAPA_TAGS_FICHA_PDF).forEach(function (tag) {
      corpo.replaceText('{{' + tag + '}}', String(instrutor[MAPA_TAGS_FICHA_PDF[tag]] || ''));
    });
    doc.saveAndClose();
    var pdf = o Supabase Storage.getFileById(copia.getId()).getAs('application/pdf');
    var arquivoPdf = o Supabase Storage.createFile(pdf).setName('Ficha_' + idInstrutor + '.pdf');
    return arquivoPdf.getUrl();
  } finally {
    o Supabase Storage.getFileById(copia.getId()).setTrashed(true);
  }
}
```
`MAPA_TAGS_FICHA_PDF` (novo, `lib/acoes/instrutores.ts`) é um objeto simples `{ 'NOME_COMPLETO':
'Nome_Completo', 'POSTO_GRADUACAO': 'Posto_Graduacao', ... }` cobrindo os campos do formulário —
contrato completo em `data-model.md`. `corpo.replaceText` já ignora silenciosamente uma tag sem
ocorrência no documento (comportamento nativo do `Body.replaceText`, nenhum código extra
necessário) — satisfaz FR-009 sem lógica adicional.

**Rationale**: `try/finally` garante que o documento temporário (`copia`) seja sempre movido para a
lixeira, inclusive se `replaceText`/`getAs` lançar exceção no meio do caminho (FR-007d, Acceptance
Scenario 4 da US3). `exigirFuncao(CRUD_CONFIG['instrutores'].leitura)` é o mesmo mecanismo já
usado por `crudListar` (``lib/acoes/crud.ts`:49`) — reaproveitado, não reinventado, para aplicar FR-011 (alcance
de leitura, não escrita).

**Alternatives considered**:
- *Usar `o Supabase Storage.createFile(pdf)` na mesma pasta do Template, sem mover para uma pasta
  específica* — aceito como padrão (pasta raiz do usuário executor), já que o pedido não especificou
  destino; revisitável em uma spec futura se um local fixo for necessário.
- *Deletar (`.setTrashed`) em vez de excluir permanentemente* — escolhido deliberadamente:
  `o Supabase Storage` não oferece exclusão permanente direta sem risco de erro silencioso; a lixeira do Supabase Storage
  já resolve "não deixar artefato visível no fluxo normal" (FR-007d) sem risco de apagar algo por
  engano de forma irreversível.

## 4. `MAPA_TAGS_FICHA_PDF` — contrato de tags do Template

**Decision**: Mapear exatamente os campos hoje exibidos em `BLOCOS_EDICAO_INSTRUTOR` (exceto
`oculto`/`calculado-frontend` sem persistência) + os 12 campos novos do FR-001, usando o padrão de
tag `{{NOME_DO_CAMPO_EM_MAIUSCULAS}}` já citado no pedido original (`{{NOME_COMPLETO}}`). Tabela
completa em `data-model.md`.

**Rationale**: Mesma convenção já sugerida no pedido original (`{{NOME_COMPLETO}}`), sem inventar um
formato de tag novo — reduz o trabalho de Bernardo ao editar o Template para bater com o mapeamento.

## 5. Botão "Gerar PDF" — onde entra na tela

**Decision**: Dentro do modal já existente da Ficha (`renderizarModalFichaInstrutor_`/
`abrirModalFichaInstrutor_`, ``app/(app)/instrutores/page.tsx`:1190+`), ao lado do botão "Imprimir" já presente
no `modal-footer`. Novo botão "Gerar PDF" chama `gs('gerarFichaPDF', idInstrutor)` e, no sucesso,
abre a URL retornada em nova aba (`window.open(url, '_blank')`) — mesmo padrão de abrir conteúdo
externo já usado pelo deep-link de edição de instrutor (`abrirPainelEdicaoInstrutor_`, embora esse
navegue dentro da mesma SPA; aqui é uma URL externa do Supabase Storage, `window.open` é o mecanismo correto,
sem o risco de quebrar a sincronização do página já documentado para `window.location.hash` — abrir
uma nova aba não mexe na URL da aba atual).

**Rationale**: O modal já reúne os dados formatados de leitura da Ficha — colocar o botão ali,
ao lado de "Imprimir", é o local que already comunica "gerar uma versão portátil desta Ficha",
sem exigir um novo ponto de entrada na tela (FR-010, coexistência com `window.print()`).

**Alternatives considered**:
- *Botão na linha da tabela de listagem, ao lado de "Imprimir Ficha"* — rejeitado: duplicaria o
  ponto de entrada (o modal já existe e já é o fluxo de "ver a Ficha"), sem ganho de UX que
  justifique 2 botões fazendo pedidos parecidos em 2 lugares diferentes da tela.

## 6. Migração de schema — 12 colunas + 1 linha de configuração

**Decision**: Script novo em `migracao/` (mesmo padrão de todo script anterior — `openpyxl` contra
a cópia de trabalho local primeiro, depois execução real contra a banco de produção como pendência de
implantação): acrescenta as 12 colunas ao final de `instrutores` (nunca insere no meio, nunca
reordena) e uma linha nova em `config_parametros` (`Chave='ID_TEMPLATE_FICHA_INSTRUTOR'`,
`Valor='1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg'`, `Tipo='TEXTO'`, `Descricao='ID do Template
do a rota de impressão `/print/*` da Ficha do Instrutor (spec 022)'`).

**Rationale**: Mesmo padrão de toda migração anterior desta sessão — aditivo, nunca destrutivo,
rastreável. `lerConfigParametros_` (``lib/dominio/regras-normativas.ts`:94-103`) já lê `Tipo` para decidir se
converte o `Valor` para número — um ID de documento é `Tipo='TEXTO'` (ou qualquer valor diferente de
`'DECIMAL'`/`'INTEIRO'`), permanece string sem conversão.
