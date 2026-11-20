# Como escrever uma página do Guia PowerShell

O guia é uma **escola**, estilo W3Schools, para quem **nunca programou nem usou terminal**. **Uma aula = um assunto.** O dono do projeto já reclamou de outro guia que juntava vários assuntos numa página. Nunca mostre comando "seco":
- explique cada parte (anatomia);
- mostre a **saída real**, colhida no PowerShell de verdade (laboratório);
- mostre o que acontece quando dá errado, com a mensagem **real**;
- deixe o leitor praticar no editor do guia, que roda **o PowerShell 7 de verdade** no navegador.

Antes de tudo, leia o `RECURSOS.md`: onde trabalhar e como.

## 1. Esqueleto do arquivo
Use como modelo a estrutura de uma aula do Guia Lua: `~/guia-lua/print.html` e `~/guia-lua/while.html`, na VPS. Elas têm o cabeçalho, o `<main>`, os blocos, o rodapé, `.exercise`, `.mc`, `dl.anatomy`, `div.cenario`, `div.note` e `table.ref`. Troque:
- `<title>PowerShell TEMA — descrição | Guia PowerShell</title>`;
- `<h1>PowerShell <span class="hl">TEMA</span></h1>` (ou o nome do cmdlet: `<h1><span class="hl">Get-ChildItem</span></h1>`);
- a caixa `.trylua` por **`.tryps`** (seção 3), `main.lua` por `main.ps1`.

Menu, selo e Anterior/Próximo vêm de `assets/site.js` (`NIVEIS`). **Não mude a `NIVEIS`.** Links internos só para páginas que estão nela.

## 2. Ordem de uma aula
1. Intro.
2. "Você vai aprender".
3. A ideia antes do comando, com uma comparação do dia a dia (uma gaveta de arquivos, uma esteira de fábrica para o pipeline, uma ficha de cadastro para o objeto).
4. Do simples ao completo, uma novidade por vez, com `dl.anatomy` ou uma tabela "parte → o que faz".
5. **A saída real** depois de cada exemplo: `pre.term` com o prompt `PS C:\Users\ana>` e o que o PowerShell respondeu no lab.
6. **Pelo menos dois "Experimente"** (`.tryps`) por aula: um no meio e uma missão no fim. Nas aulas de administração do Windows, onde o editor não alcança, pelo menos um (sobre a parte que roda) e o resto em `pre.term`.
7. Formas diferentes de fazer a mesma coisa + tabela "qual usar".
8. **Quando dá errado** (`div.cenario`): o comando errado e a **mensagem de erro real** (colha no lab, nunca de memória), explicada linha por linha em português.
9. Referência (`table.ref`).
10. Exercícios (3 ou mais: `.exercise`, `.mc`).
11. Resumo.

Páginas de **Projetos**: passo a passo (versão 1, 2, 3… do script, cada uma com um `.tryps` quando der). Páginas de **Referência**: tabelas, com poucos `.tryps` (1 ou 2).

## 3. Componentes

### Código para ler
```html
<pre class="file" data-file="ola.ps1">$nome = "Ana"
Write-Output "Olá, $nome!"
</pre>
```
Dentro de `<pre>`, escape `<`, `>` e `&` (`&lt;`, `&gt;`, `&amp;`): `Get-Process &gt; lista.txt`, `2&gt;&amp;1`, `&amp; .\script.ps1`. O testador confere.

### Terminal (`pre.term`)
- `PS C:\Users\ana> ` = o prompt do PowerShell no Windows. É o padrão do guia: o leitor está, na maioria, no Windows;
- `PS /home/ana> ` = o PowerShell 7 no Linux (aulas de instalação, caminhos e comparações);
- `>> ` = a continuação (um bloco `{` ainda aberto);
- `C:\Users\ana>` = o `cmd.exe` antigo (só nas comparações);
- `$ ` = o bash do Linux (para chegar ao `pwsh`);
- `«` = anotação (vira um comentário em cinza à direita).
- Ponha `data-title="Windows PowerShell"` (5.1) ou `data-title="PowerShell 7"` no `pre.term` para o título da janela.

Toda saída vem do lab. Exemplo:
```html
<pre class="term" data-title="PowerShell 7">PS C:\Users\ana> Get-Date -Format "dd/MM/yyyy"
18/10/2026
</pre>
```

### Editor "Experimente" (`.tryps`), com o PowerShell de verdade
```html
<div class="tryps" data-goal="out:Olá, Ana!">
<p class="try-task"><strong>Missão:</strong> troque "mundo" por "Ana" e clique em Rodar.</p>
<pre class="script" data-file="main.ps1">Write-Output "Olá, mundo!"
</pre>
<pre class="solucao" data-file="main.ps1">Write-Output "Olá, Ana!"
</pre>
</div>
```
- **Rodar** executa o script no **PowerShell 7 de verdade** (o mesmo código da Microsoft, compilado para WebAssembly), carregado na primeira vez que o leitor clica em Rodar. A caixa mostra a saída, os erros em vermelho e o código de saída.
- **Atenção: o editor é um PowerShell 7 "de Linux"** (pasta `/home/ana`, `$IsLinux` verdadeiro). O mesmo script roda igual no Windows; só mudam os caminhos e o que é exclusivo do Windows (serviços, Registro, CIM…), que não existe no editor. As missões **não podem depender** de caminho nem de recurso do Windows.
- **Vários arquivos** (`dados.csv`, `config.json`, `funcoes.ps1`, um módulo `.psm1`): vários `<pre class="script" data-file="…">` na mesma caixa viram abas; o primeiro é o que roda, os outros ficam na mesma pasta.
- `data-stdin="linha1\nlinha2"`: o que o `Read-Host` vai ler. Sem `data-stdin`, o script **pede e o leitor digita** na caixa.
- `data-args="a b"`: o que chega em `$args` (e nos parâmetros do `param()` do script).
- Sem `data-goal`: caixa livre. Com `data-goal`: missão, e o `pre.solucao` é **obrigatório** (um por aba que muda).
- Cada Rodar parte do zero: arquivos e variáveis da execução anterior somem.

### Metas (`data-goal`) — regras fixas, não invente outras
Várias metas se separam com **`;;`** (ex.: `data-goal="out:Total: 30;;semerro"`); **todas** precisam passar. (O agente do simulador pode afinar a definição exata de `semerro`/`erro:`/`exit:` na §4; vale o que estiver lá.)

| Meta | Verdade quando… |
| --- | --- |
| `out:TEXTO` | a saída do script (tudo o que aparece no terminal, inclusive os erros, na ordem) **contém** o texto, exatamente (maiúsculas importam) |
| `outre:REGEX` | a saída inteira casa com a regex |
| `semerro` | o script não escreveu nenhum erro (nem os que param o script, nem os que só avisam e seguem) |
| `erro:TEXTO` ou `erro:/REGEX/` | o script escreveu algum erro e a mensagem contém o texto (ou casa) — ex.: `erro:Cannot find path` |
| `exit:N` | o código de saída foi N (`exit 3`; erro que para o script = 1; normal = 0) |
| `src:REGEX` | o código do leitor (todas as abas) casa com a regex, **sem diferenciar maiúsculas** (como o próprio PowerShell) — ex.: `src:\bWhere-Object\b` |
| `arquivo:NOME` | depois de rodar, o arquivo NOME existe na pasta do script |
| `arquivo:NOME~TEXTO` | …e contém o texto |

**Regras exatas:**
- Regex é a do JavaScript. `outre:` aplica **sem flags** à saída inteira (`^`/`$` = começo e fim da saída toda; `\n` para as quebras). `src:` aplica com as flags `mi`. `erro:/…/` aceita flags.
- Dentro de regex, `|` é alternativa e `\|` é a barra vertical literal. Não há outros escapes no `data-goal` além do HTML (`&quot;`, `&lt;`, `&amp;`).
- `out:`/`outre:` olham só a saída do script, nunca mensagens do editor.
- O **código inicial não pode cumprir a meta**, e a **solução tem de cumprir** (o testador confere os dois).
- **Prefira metas tolerantes** (`out:` com um trecho que só a resposta certa produz, `semerro`, `src:`). A formatação automática de tabelas (`Format-Table`) muda com a largura: em `out:`, prefira um valor a uma linha inteira de tabela.
- **A meta não pode depender** do que muda entre execuções ou entre o editor e o lab: `Get-Random` sem `-SetSeed`, data e hora, `New-Guid`, a ordem das chaves de uma `@{}` comum (use `[ordered]@{}`), caminhos de pasta, nomes de máquina e de usuário, processos, versão exata do sistema.

### Outros blocos
`dl.anatomy`, `div.note/.tip/.warning/.cenario`, `ol.passo`, `div.table-wrap > table.ref`, `.exercise`, `.mc`, `figure`, `<span class="versao">7.6</span>` (novidade) e `<span class="versao">só Windows</span>` (cmdlet que só existe no Windows).

No `.exercise`, `data-answer="a|b"` aceita respostas alternativas. A comparação **não diferencia maiúsculas** (`get-childitem` = `Get-ChildItem`), exceto texto entre aspas. Para uma barra vertical dentro da resposta, escreva `\|`.

## 4. O editor do guia: o PowerShell real no navegador (`assets/pssim.js`)
> **Esta seção é mantida pelo agente do simulador.** Antes de escrever uma frase do tipo "no editor…" que não esteja aqui, confira com as ferramentas dele (`tools/sim.js`).

(em construção: o que funciona e o que não funciona — Start-Job, -Parallel, processos, comandos externos, rede, cmdlets só do Windows —, diferenças editor × labs, as ferramentas `tools/testar-missoes.js` e `tools/sim.js`.)

## 5. Fidelidade: os laboratórios
São dois, ambos com a usuária `ana` e o computador `notebook`/`NOTEBOOK`. Os detalhes estão no `COMO-USAR.md` de cada um.
- **Windows (o principal):** o Windows de verdade, com o **PowerShell 7.6** (`pwsh`) e o **Windows PowerShell 5.1** (`powershell`). Toda saída com `PS C:\Users\ana>` vem daqui. Formato de data e número pt-BR, fuso de Brasília.
- **Linux:** o `pwsh` 7.6 num Ubuntu 26.04. Toda saída com `PS /home/ana>` vem daqui.

Regras para os dois:
- **As mensagens de erro saem como saíram** (em inglês ou português, conforme o lab): copie igual e explique em português.
- **Privacidade:** nada da máquina real. Só `C:\Users\ana`, `/home/ana`, `NOTEBOOK`. Não colha nada que mostre o hardware real: CPU, memória total, discos, placa de rede, MAC, IP, número de série, chave do Windows, ID da máquina. Se a aula precisar (`Get-CimInstance Win32_Processor`, `Get-NetIPAddress`…), mostre como ilustrativo com valores inventados de um notebook comum, e diga que é ilustrativo.

## 6. Versão
O guia ensina o **PowerShell 7.6** (LTS). O **Windows PowerShell 5.1**, que já vem no Windows, aparece sempre que for diferente, numa `div.note`, com a saída real dos dois. Novidades do 7.x ficam marcadas com `<span class="versao">7.6</span>` e reunidas em `novidades.html`. Nunca afirme algo de uma versão sem conferir na documentação oficial (learn.microsoft.com/powershell) ou no lab. Marque como **ilustrativo** o que não deu para rodar.

## 7. Escrita
- Português do Brasil, frases curtas, "você". O leitor nunca usou terminal.
- Termos em inglês ganham tradução na primeira vez: `Get` = "obter", `Item` = "item", `pipeline` = "esteira/encanamento".
- Exemplos com a vida da Ana: as fotos do celular, a pasta Downloads bagunçada, a planilha de gastos, o estoque da lojinha, as notas da turma.
- Boas práticas desde o começo, sempre com o porquê:
  - nos scripts, o **nome completo** dos comandos (`Get-ChildItem`, não `ls`/`gci`); apelidos só no terminal;
  - os nomes dos cmdlets como a Microsoft escreve (`Get-ChildItem`), mesmo o PowerShell aceitando `get-childitem`;
  - 4 espaços de indentação e a chave `{` na mesma linha;
  - aspas simples quando não há variável dentro.
- Nomes de variáveis em português e sem acento (`$preco`, `$totalGeral`). Conte uma vez que acentos funcionam, mas não são o costume.
