# Roteiro de conferência — Bloco 5 (spec 020, PR #79)

No **preview** do ramo, com perfil **Admin** (ou Encarregado da Administração Acadêmica nos itens 1 a 4).
⚠️ **O preview grava no banco remoto**, que é a fonte da verdade dos cadastros: os passos marcados **[grava]** mudam
dado de verdade. Use um curso e um instrutor que você possa deixar como ficarem (ou desfaça no fim).

## 1. Curso ofertável a estrangeiros

1. *Cursos* → um curso → *Editar curso* → bloco **Estrangeiros e custo**.
2. *Ofertável a estrangeiros* = **Sim**; *Observação* = um texto qualquer → **Salvar alterações** **[grava]**.
   → volta à página do curso.
3. Aba **Sobre o Curso** → *Ofertável a estrangeiros: Sim* e a observação.
4. *Cursos* → **Filtros** → *Estrangeiros* = **Ofertável** → o curso aparece; **Não informado** → ele some (os outros
   23 aparecem: ninguém respondeu ainda). *Limpar filtros* volta tudo.

## 2. Custo total do curso

1. *Editar curso* → *Custo total (R$)* = `doze mil` → **Salvar** → recusa: *"Custo total: use reais com vírgula, como
   12.345,67."* Nada grava.
2. *Custo total* = `12.345,67`; *Composição do custo* = um texto → **Salvar** **[grava]**.
3. *Sobre o Curso* → *Custo total: R$ 12.345,67* e a composição. Nada mais no sistema usa o valor.

⚠️ **Confirme, por favor: custo de curso é processo da CIAARA-11 (regra 2)?** Se não for, a coluna fica sem uso.

## 3. Currículo em PDF

1. *Editar curso* → bloco **Currículo em PDF** → *Nenhum currículo carregado.* → **Carregar PDF** → a janela de arquivos
   abre → escolha um PDF (até 20 MB) **[grava]** → *Currículo carregado.* e o botão vira **Substituir PDF**.
2. Escolha um arquivo que não seja PDF → *"O currículo tem de ser um arquivo PDF — só PDF é aceito."*
3. *Sobre o Curso* → **Baixar o currículo (PDF)** → baixa `Curriculo <sigla>.pdf`, o mesmo arquivo.
4. *Editar curso* → **Substituir PDF** com outro arquivo **[grava]** → *Sobre o Curso* → baixar → é o novo.
5. Com um perfil que só lê (Visualização, se houver conta): *Sobre o Curso* baixa; *Editar curso* não aparece.
6. Um curso sem PDF → *Sobre o Curso* diz *"Currículo ainda não carregado."*

## 4. Capacitação didática em lista

1. *Instrutores* → um instrutor que tinha **duas** capacitações (no remoto há 4: `C-Exp-TE, C-Esp-DID` ×2,
   `Licenciatura, C-Esp-DID`, `Licenciatura, C-Exp-TE`) → a ficha mostra as duas, em ordem fixa.
2. *Editar instrutor* → *Capacitação didática* são **três caixas de marcar** (C-Esp-DID, C-Exp-TE, Licenciatura), com as
   dele marcadas. Marque/desmarque → **Gravar alterações** → **Gravar** **[grava]** → a ficha mostra a lista nova.
3. *Instrutores* → **Filtros** → *Capacitação didática* = **C-Esp-DID** → só quem tem; **Nenhuma** → só quem não tem.
4. O aviso *"Capacitação a corrigir: «…»"* **não aparece para ninguém**: na conversão, os **31** textos do remoto
   casaram com a lista (`antes-depois.md`). Ele só nasceria de um texto fora da lista.

## 5. Contagem de acessos

1. Saia e entre de novo.
2. *Administração* → a lista de usuários tem a coluna **Acessos**; a sua conta mostra pelo menos **1**.
3. Acima da lista, o quadro **Acessos ao sistema** *"contados desde 20/10/2026"* (a contagem começa com a tabela):
   **Quem mais acessou** e **Acessos recentes** (conta, data e hora).
4. Com outro perfil (Encarregado, por exemplo): *Administração* recusa, como antes — ninguém além do Admin vê acesso.

## 6. `PEND-019-3`

Só teste; nada a conferir na tela. As quatro sementes do Início passam a usar o ano de hoje, e uma guarda impede 2026
escrito à mão nelas.

O papel do DSA **não mudou** — o merge não precisa esperar a virada de semana.
