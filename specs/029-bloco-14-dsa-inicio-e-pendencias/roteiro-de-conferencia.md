# Roteiro de conferência — spec 029 (Bloco 14)

No preview, com a sua conta de Admin. ⚠️ **Os passos marcados com ✍️ gravam no banco remoto**, que é a fonte da verdade
dos cadastros: prefira uma semana **futura** de uma turma em que você possa lançar e, ao fim, *Descartar rascunho* ou
excluir pela tela o que lançou. O que é publicado (item 3) fica na trilha imutável — use uma semana de teste sua.

## 1. TFM sem teto (FR-001)
1. *Turmas* → uma turma com TFM (por exemplo **C-Ap-FR 2026**, disciplina X — *TFM.*) → *Abrir o DSA* → uma semana futura.
2. ✍️ Lance **4 tempos** de TFM num dia e **3 tempos** de TFM em outro dia da mesma semana.
3. **Esperado:** os dois lançamentos entram, **sem recusa nem aviso** de TFM ou de teto. *Descartar rascunho* desfaz
   (ou *Salvar minuta*, se quiser ver os 7 TA salvos).

## 2. Estudo Individual sem «O que é» (FR-002)
1. No mesmo DSA, ✍️ *Lançar* → **Estudo Individual** → subtipo *Estudo Individual* → deixe **«O que é (opcional)»** vazio
   → *Lançar*.
2. **Esperado:** entra; no cartão e no papel aparece *ESTUDO INDIVIDUAL*. Faça o mesmo com uma **AEC**: ela continua
   pedindo *"Escreva o que é a atividade."*. *Descartar rascunho* desfaz.

## 3. Salvar alteração (FR-003, RP-9)
1. Numa semana **já publicada** (de teste), ✍️ *Fazer alteração* → lance algo → **Salvar alteração** (o ícone logo antes de
   *Publicar alteração*).
2. **Esperado:** *"Alteração salva…"*; selo **«Em alteração · salva»**; a linha *"Alteração salva: já conta na CH e no
   andamento; o papel publicado continua valendo até «Publicar alteração»."*; no Início e no *Reimprimir* o papel
   continua o publicado.
3. Saia da tela e volte: a alteração continua lá. Lance outra coisa e *Descartar rascunho*: só ela sai.
4. ✍️ *Publicar alteração* com justificativa → **ALT N** no histórico, com o que foi salvo.

## 4. A janela da carga no período da turma (FR-004)
1. *Instrutores* → o instrutor da HIDROGRAFIA da CAHO 2027 (código **40**) → ano **2027** no canto superior direito.
2. **Esperado:** a linha da CAHO 2027 com *Janela prevista* **05/01/2027 a 17/12/2027** (era 11/05 a 16/10/2026), e
   as semanas de 2027 passam a contar a HIDROGRAFIA (10,39 TA por semana). Medido na cópia `remoto-20261028-214051.sql`: o instrutor 40 é de 40h (faixa 16–24) e só tem essa atribuição em 2027, então o alerta lilás **não** dispara para ele — o que muda é a janela e a carga semanal que o alerta enxerga.

## 5. O saldo pelo regime da semana (FR-005)
1. Hoje **nenhuma** turma do remoto tem regime «desde» ou «só esta semana»: os saldos do Início, de *Turmas* e da ficha
   **não mudam** (medido: 0 turmas).
2. Para ver: ✍️ no DSA de uma turma, o relógio → *Desta semana em diante* com outro regime numa semana futura → a ficha
   da turma mostra a capacidade com os dois TA/dia (*"8 a 9 TA/dia"*). Desfaça pelo mesmo relógio.

## 6. O seletor de instrutor vazio (FR-006)
1. *Turmas* → **C-ApA-AuxNav-PR-SP T2 2026** → a linha da disciplina **II — Inglês técnico aplicado aos auxílios à navegação** (sem nenhum habilitado ativo; são 8 linhas assim no remoto) → *Registrar TA fora do DSA*.
2. **Esperado:** o campo de instrutor diz **"Nenhum instrutor habilitado nesta disciplina…"**, não *"Nada cadastrado
   ainda"*. Feche sem gravar.

## 7. RT-8 — a arquivada conta no ano dela (FR-007)
1. *Início*, ano **2026**, sem filtro.
2. **Esperado:** *Concluídas* e *Canceladas* contam as arquivadas — medido na cópia: *Concluídas* **0 → 13** e *Canceladas* **0 → 8** (*Turmas ativas* continua 8); o carrossel das turmas
   continua sem elas.
3. *Turmas*, 2026: as *Estatísticas* contam as arquivadas; a tabela não as mostra, e o cabeçalho diz *"· N arquivadas fora
   da lista"*.

## 8. O Início em nova ordem (FR-008)
1. *Início* numa janela de **1366×768** e outra de **1920×1080** (ou o celular).
2. **Esperado:** sem a frase *"Panorama das turmas…"*; logo abaixo do título, os **DSA publicados da semana**, com o papel
   **inteiro na janela, sem rolar**; rolando, os cartões do ano e o carrossel das turmas. Abrir *Filtros* encolhe o papel.
   Numa semana sem DSA publicado, só a frase do vazio.
