# Como escrever uma página do Guia PowerShell

O guia é uma **escola**, no estilo W3Schools, para quem **nunca programou nem usou terminal**. **Uma aula = um assunto.** Nunca mostre um comando "seco":
- explique cada parte (anatomia);
- mostre a **saída real**, colhida no PowerShell 7.7 de verdade, e diga de onde ela veio (seção 5);
- mostre o que acontece quando dá errado, com a mensagem **real**;
- deixe o leitor praticar no editor do guia (`.tryps`), que roda no simulador `assets/pssim.js`.

## 1. Esqueleto do arquivo
Use como modelo uma aula pronta, por exemplo `variaveis.html`: ela tem o cabeçalho, o `<main>`, os blocos, o rodapé, `.exercise`, `.mc`, `dl.anatomy`, `div.cenario`, `div.note` e as caixas `.tryps`. Troque:
- `<title>PowerShell TEMA — descrição | Guia PowerShell</title>`;
- `<meta name="description" content="…">` com uma frase sobre a aula;
- `<h1>PowerShell <span class="hl">TEMA</span></h1>` (ou o nome do cmdlet: `<h1><span class="hl">Get-ChildItem</span></h1>`).

O menu, o selo do nível e os botões Anterior/Próximo vêm da lista `NIVEIS` de `assets/site.js`. **Toda página nova precisa entrar na `NIVEIS`**, no nível e no grupo certos:
```js
["minha-aula.html", "Título no Menu"],
```
Links internos só para páginas que estão na `NIVEIS`.

## 2. Ordem de uma aula
1. Intro (`p.intro`).
2. "Você vai aprender" (`div.note` com uma lista).
3. **De onde vêm as saídas**: uma frase dizendo onde elas foram colhidas (seção 5).
4. A ideia antes do comando, com uma comparação do dia a dia (uma gaveta de arquivos, uma esteira de fábrica para o pipeline, uma ficha de cadastro para o objeto).
5. Do simples ao completo, uma novidade por vez, com `dl.anatomy` ou uma tabela "parte → o que faz".
6. **A saída real** depois de cada exemplo, num `pre.term`.
7. **Pelo menos dois "Experimente"** (`.tryps`) por aula: um no meio e uma missão no fim. Nas aulas de administração do Windows, onde o simulador não alcança, pelo menos um (sobre a parte que roda) e o resto em `pre.term`.
8. Formas diferentes de fazer a mesma coisa + tabela "qual usar".
9. **Quando dá errado** (`div.cenario`): o comando errado e a **mensagem de erro real** (colhida, nunca de memória), explicada linha por linha em português.
10. Referência (`table.ref`).
11. Exercícios (3 ou mais: `.exercise`, `.mc`).
12. Resumo.

Páginas de **Projetos**: passo a passo (versão 1, 2, 3… do script, cada uma com um `.tryps` quando der). Páginas de **Referência**: tabelas, com poucos `.tryps` (1 ou 2).

## 3. Componentes

### Código para ler
```html
<pre class="file" data-file="ola.ps1">$nome = "Ana"
Write-Output "Olá, $nome!"
</pre>
```
Dentro de `<pre>`, escape `<`, `>` e `&` (`&lt;`, `&gt;`, `&amp;`): `Get-ChildItem &gt; lista.txt`, `2&gt;&amp;1`, `&amp; .\script.ps1`.

### Terminal (`pre.term`)
- `PS C:\Users\ana> ` = o prompt do PowerShell no Windows;
- `PS /home/ana> ` = o prompt do PowerShell 7 no Linux;
- `>> ` = a continuação (um bloco `{` ainda aberto);
- `C:\Users\ana>` = o `cmd.exe` antigo (só nas comparações);
- `«` = anotação (vira um comentário em cinza à direita).
- Ponha `data-title="PowerShell 7"` ou `data-title="Windows PowerShell"` (5.1) no `pre.term` para o título da janela.

```html
<pre class="term" data-title="PowerShell 7">PS C:\Users\ana> $nome = "Ana"
PS C:\Users\ana> $nome
Ana
</pre>
```
O prompt tem de bater com o lugar onde a saída foi colhida (seção 5).

### Editor "Experimente" (`.tryps`)
```html
<div class="tryps" data-goal="out:Olá, Ana!">
<p class="try-task"><strong>Missão:</strong> troque "mundo" por "Ana" e clique em Rodar.</p>
<pre class="script" data-file="main.ps1">Write-Output "Olá, mundo!"
</pre>
<pre class="solucao" data-file="main.ps1">Write-Output "Olá, Ana!"
</pre>
</div>
```
- `pre.script` = o código inicial que o leitor edita; `data-file` dá o nome do arquivo (padrão: `main.ps1`).
- Sem `data-goal`: caixa livre. Com `data-goal`: missão, e o `pre.solucao` é **obrigatório**.
- O leitor tem **Rodar**, **Resetar** (volta ao código inicial) e **Ver solução** (liberado depois do primeiro Rodar).
- O `Read-Host` abre uma janelinha do navegador para o leitor digitar a resposta.
- Cada Rodar parte do zero: o disco de mentira e as variáveis da execução anterior somem.

### Metas (`data-goal`)
Várias metas se separam com **`;;`** (ex.: `data-goal="out:Total: 30;;semerro"`); **todas** precisam passar.

| Meta | Verdade quando… |
| --- | --- |
| `out:TEXTO` | a saída do script (tudo o que aparece no terminal, inclusive os erros, na ordem) **contém** o texto, exatamente (maiúsculas importam) |
| `outre:REGEX` | a saída casa com a regex (flag `m`: `^`/`$` valem para cada linha) |
| `semerro` | o script não escreveu nenhum erro |
| `erro:TEXTO` | a saída contém o texto do erro (ex.: `erro:Cannot find path`) |
| `exit:N` | o código de saída foi N (`exit 3`; erro que para o script = 1; normal = 0) |
| `src:REGEX` | o código do leitor casa com a regex, **sem diferenciar maiúsculas** (flags `mi`, como o próprio PowerShell) — ex.: `src:\bWhere-Object\b` |
| `arquivo:NOME` | depois de rodar, o arquivo NOME existe no disco do simulador |
| `arquivo:NOME~TEXTO` | …e contém o texto |

**Regras:**
- A regex é a do JavaScript. Dentro do `data-goal`, só os escapes do HTML (`&quot;`, `&lt;`, `&amp;`).
- O **código inicial não pode cumprir a meta**, e a **solução tem de cumprir**. O `tools/testar-missoes.js` confere os dois.
- **Prefira metas tolerantes** (`out:` com um trecho que só a resposta certa produz, `semerro`, `src:`). A formatação automática de tabelas muda com a largura: em `out:`, prefira um valor a uma linha inteira de tabela.
- **A meta não pode depender** do que muda entre execuções: `Get-Random` sem `-SetSeed`, data e hora, `New-Guid`, a ordem das chaves de uma `@{}` comum (use `[ordered]@{}`), nomes de máquina e de usuário, processos, versão exata do sistema.
- Uma meta com nome desconhecido não é avaliada: a caixa só pede ao leitor que confira sozinho. Use só as da tabela.

### Outros blocos
`dl.anatomy`, `div.note/.tip/.warning/.cenario`, `ol.passo`, `div.table-wrap > table.ref`, `.exercise`, `.mc`, `figure` e as etiquetas `<span class="versao">7.7</span>` (novidade do 7.7), `<span class="versao">só no 7</span>` (não existe no 5.1) e `<span class="versao">só Windows</span>` (cmdlet que só existe no Windows).

### Exercícios
- **Completar** (`.exercise`): um `<input data-answer="…">` dentro de `.ex-code`. `data-answer="a|b"` aceita respostas alternativas; para uma barra vertical dentro da resposta, escreva `\|`. A comparação **não diferencia maiúsculas** (`get-childitem` = `Get-ChildItem`), exceto texto entre aspas.
  ```html
  <div class="exercise"><div class="ex-code"><input data-answer="Get-ChildItem|gci"> -Path .</div></div>
  ```
- **Múltipla escolha** (`.mc`): `data-answer` é o número da alternativa certa, começando em 1.
  ```html
  <div class="mc" data-answer="2"><p class="mc-q">Qual cmdlet lista uma pasta?</p>
  <label><input type="radio" name="q1"> Get-Content</label>
  <label><input type="radio" name="q1"> Get-ChildItem</label>
  </div>
  ```

## 4. O editor do guia: o simulador `assets/pssim.js`
O "Experimente" roda num **PowerShell 7 simulado, escrito em JavaScript puro**. Não é o PowerShell de verdade: é um interpretador que imita o PowerShell 7.7 de um Windows em português, com um disco de mentira em `C:\Users\ana`, criado de novo a cada Rodar.
- **Funciona:** variáveis, tipos, operadores, `if`/`switch`, laços, funções, o pipeline e os objetos, coleções, `Write-*`, pastas e arquivos no disco de mentira, classes, `enum`, `Start-Job`, `ForEach-Object -Parallel` e módulos.
- **Não funciona** (o simulador avisa que o comando "não é simulado" e manda ver a saída real na aula): serviços, Registro, usuários e grupos locais, processos, CIM/WMI, rede e internet (`Invoke-WebRequest`, `Invoke-RestMethod`, `Test-Connection`), instalar módulos e programas do Windows. Use `pre.term` para esses.
- Laço infinito não trava a página: o simulador para a execução depois de um limite de passos e de tempo.
- Nada sai da página e nada é guardado (sem rede, `localStorage`, cookies).
- Se o `pssim.js` não carregar, a caixa vira **"Rode no seu PowerShell"** (`assets/rode-local.js`): o leitor copia o código, roda no próprio PowerShell, cola a saída e clica em **Conferir**. A caixa confere a saída colada com as mesmas metas; `semerro` vira uma checagem do texto, e `exit:` e `arquivo:` ficam para o leitor conferir.

## 5. Saída real: de onde veio
**Nenhuma saída é inventada.** Tudo o que aparece num `pre.term` foi colhido no **PowerShell 7.7 de verdade**, em português (pt-BR), e **toda aula diz de onde veio**, logo depois do "Você vai aprender". Use uma destas frases:
- `<p>As saídas desta aula foram colhidas no <strong>PowerShell 7.7 de um Windows em português</strong>.</p>`
- `<p>As saídas desta aula foram colhidas no <strong>PowerShell 7.7 rodando no Linux</strong>, com o idioma em português (pt-BR), num console de 80 colunas. Os comandos funcionam do mesmo jeito no PowerShell 7 do Windows; a aula só mostra saídas que não dependem do sistema operacional.</p>`

Regras:
- **Saída do Linux nunca aparece como se fosse do Windows.** Uma saída colhida no Linux não leva o prompt `PS C:\Users\ana>`, nem caminhos `C:\…`, nem é chamada de "Windows" no texto. Se a aula precisa mostrar caminho, prompt, mensagem de erro com caminho ou um cmdlet que só existe no Windows, a saída tem de vir de um Windows em português.
- Numa aula do Linux, mostre só o que sai igual nos dois sistemas (valores, objetos, textos). Se mostrar um prompt, ele é `PS /home/ana>`.
- **As mensagens de erro saem como saíram** (em inglês ou em português): copie igual e explique em português.
- Quando o Windows PowerShell 5.1 responde diferente, mostre a saída real dos dois numa `div.note`, colhida no mesmo Windows.
- O que não deu para rodar é marcado como **ilustrativo** no texto.
- **Privacidade:** só a usuária fictícia `ana`, com as pastas `C:\Users\ana` e `/home/ana`. Nada da máquina real: nome do computador ou do usuário, CPU, memória, discos, placa de rede, MAC, IP, número de série, chave do Windows, ID da máquina. Se a aula precisar disso, mostre valores inventados de um notebook comum e diga que são ilustrativos.

## 6. Versão
O guia ensina o **PowerShell 7.7**. O **Windows PowerShell 5.1**, que já vem no Windows, aparece sempre que for diferente, numa `div.note`. Novidades do 7.7 ficam marcadas com `<span class="versao">7.7</span>` e reunidas em `novidades.html`. Nunca afirme algo de uma versão sem conferir na documentação oficial (learn.microsoft.com/powershell) ou rodando de verdade.

## 7. Escrita
- Português do Brasil, frases curtas, "você". O leitor nunca usou terminal.
- Termos em inglês ganham tradução na primeira vez: `Get` = "obter", `Item` = "item", `pipeline` = "esteira".
- Exemplos com a vida da Ana: as fotos do celular, a pasta Downloads bagunçada, a planilha de gastos, o estoque da lojinha, as notas da turma.
- Boas práticas desde o começo, sempre com o porquê:
  - nos scripts, o **nome completo** dos comandos (`Get-ChildItem`, não `ls`/`gci`); apelidos só no terminal;
  - os nomes dos cmdlets como a Microsoft escreve (`Get-ChildItem`), mesmo o PowerShell aceitando `get-childitem`;
  - 4 espaços de indentação e a chave `{` na mesma linha;
  - aspas simples quando não há variável dentro.
- Nomes de variáveis em português e sem acento (`$preco`, `$totalGeral`). Conte uma vez que acentos funcionam, mas não são o costume.

## 8. Antes do commit
1. A página está na lista `NIVEIS` de `assets/site.js`.
2. As missões passam:
   ```bash
   node tools/testar-missoes.js                       # todas
   node tools/testar-missoes.js --secao "Começando"   # só uma seção do menu
   ```
3. As páginas abrem sem erro num Chrome sem janela (precisa do `puppeteer-core` em `tools/node_modules`, ou da variável `PUPPETEER_DIR`):
   ```bash
   node tools/testar-navegador.js --todas
   ```
4. Nenhum dado de máquina real nas páginas nem no histórico:
   ```bash
   PROIBIDO=lista.txt bash tools/checar-privacidade.sh
   ```
   A lista tem uma linha por texto proibido (nomes reais do computador, do usuário, pastas); `re:` no começo da linha faz dela uma expressão regular. O caminho é lido a partir da raiz do guia. Guarde a lista **fora do repositório** (por exemplo `PROIBIDO=../lista.txt`) e nunca faça commit dela.
