# Reconferência — só a foto do avatar (PR 1 da spec 011)

> **Para Bernardo Villas Boas.** Roteiro curto: você já aprovou cadastros intactos, Sair/entrar pelo
> avatar e a troca de nome. **Aqui só a foto**, que era o defeito.
>
> ⚠️ **O GESTO MUDOU, e é o conserto.** O botão **Enviar foto** agora **abre a janela de arquivos do
> computador**, e **escolher já envia**. O campo cinza que havia ao lado dele saiu da tela — era ele
> a única porta para a janela, e ninguém o lê como sendo o caminho.
>
> ⚠️ **ERAM DOIS DEFEITOS, NÃO UM.** O segundo não aparecia com imagem pequena: a tela promete *até
> 2 MB*, e a Server Action aceitava **1 MB**. Toda foto de câmera de celular cai entre 1 e 2 MB — e
> era recusada com um `413` que **derrubava a tela** em vez de dar mensagem. Por isso o passo **F.4**
> existe, e ele é o que importa mais.
>
> ⚠️ **NADA NOVO FOI AO REMOTO.** Este conserto é de tela e de configuração; a migration já estava
> aplicada desde 29/09/2026, e o balde segue com os mesmos 2 MB e os mesmos dois tipos.

**Onde:** `https://sistema-de-gestao-academica-v2-1-git-feat-epic-c06a4c-ciaara-11.vercel.app`
(pede o login da **Vercel** antes do login da aplicação), menu do avatar → **Meu perfil**.

**O que ter à mão:** três arquivos — um **JPG ou PNG pequeno**, um **JPG de celular entre 1 e 2 MB**
(qualquer foto tirada com o telefone serve) e um **acima de 2 MB**.

| #   | Passo                                                                              | Resultado esperado                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F.1 | No bloco **Foto**, olhar a tela antes de clicar em nada                             | Há **o avatar**, o texto *"A foto precisa ser JPG ou PNG, de até 2 MB."* e **um** botão, **Enviar foto**. ⚠️ O campo cinza de arquivo **não está mais lá** |
| F.2 | Clicar **Enviar foto**                                                              | **A janela de arquivos do computador abre** — era exatamente isto que não acontecia                                                                       |
| F.3 | Escolher o **arquivo pequeno** e confirmar na janela                                 | Sem clicar em mais nada: *"Foto atualizada."* e a foto aparece **no bloco e no cabeçalho**, no lugar das iniciais                                          |
| F.4 | **O passo que importa:** repetir F.2 e escolher a **foto de celular (1 a 2 MB)**     | **Também é aceita** — *"Foto atualizada."*, e ela aparece. ⚠️ **Antes, aqui a tela quebrava** com *"Algo falhou nesta tela"*                               |
| F.5 | Repetir F.2 e escolher o arquivo **acima de 2 MB**                                   | **Recusado** com *"A foto passou de 2 MB."*, **sem** subir o arquivo e **sem** quebrar a tela. A foto de F.4 continua no lugar                             |
| F.6 | Repetir F.2 e escolher um arquivo que **não** seja JPG nem PNG (um PDF serve)         | A janela já **filtra** para imagem; se você forçar *"Todos os arquivos"* e escolher, vem *"A foto precisa ser JPG ou PNG."*                                |
| F.7 | Clicar **Remover foto**                                                              | *"Foto removida. O avatar voltou às iniciais."*, e o cabeçalho volta a mostrar as **iniciais**                                                             |
| F.8 | Recarregar a página (F5)                                                              | O que você deixou por último **persiste** — se removeu, iniciais; se enviou, a foto                                                                        |
| F.9 | Sair pelo menu do avatar, entrar de novo                                             | A foto (ou as iniciais) continua como estava. ⚠️ Ela está no banco, não no navegador                                                                        |

---

## O que eu medi, para você não precisar conferir de novo

| Causa que você mandou investigar                                 | Veredito    | A medição                                                                                                                                                         |
| ---------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** o botão não aciona o campo de arquivo                      | **ERA ISTO** | O botão era `type="submit"`: clicar enviava o formulário **vazio**. O e2e novo espera o evento `filechooser` do navegador e estourava o prazo — *"waiting for event"* |
| **(b)** limite de corpo da Server Action menor que os 2 MB          | **ERA ISTO TAMBÉM** | `Error: Body exceeded 1 MB limit. statusCode: 413`, lido do servidor. O padrão do Next 16.3.3 é `1024 * 1024` — e o 413 **derrubava a tela** (React #441)            |
| **(c)** configuração do Storage / variáveis no preview             | **não era**  | Balde `avatares` no remoto: privado, `file_size_limit = 2097152`, `{image/jpeg,image/png}`. As **cinco** variáveis do escopo Preview estão na Vercel                  |

**E o motivo de a suíte não ter visto:** os casos de ponta a ponta mandavam o arquivo com
`setInputFiles` **direto no campo**. Isso prova que o campo funciona — que nunca esteve em dúvida — e
**nunca pergunta se alguém chega nele clicando**. É a mesma forma de erro que criou esta spec:
`encerrarSessao()` tinha teste e nenhum consumidor.

**Os dois casos novos, e cada um reprova só pela sua causa** — medido nos dois sentidos:

| Defeito reposto no lugar          | `filechooser`  | `~1,5 MB`     |
| --------------------------------- | -------------- | ------------- |
| botão de volta a `type="submit"`  | **reprova**    | passa         |
| `bodySizeLimit` retirado          | passa          | **reprova**   |

---

## Depois do seu "de acordo"

Abro o PR 1. Nada mais da spec 011 muda; o PR 2 não começou.
