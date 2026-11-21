# Guia PowerShell

Site: https://wallysondevs.github.io/guia-powershell/

Curso de PowerShell em português, do zero ao avançado, feito para quem **nunca programou nem usou terminal**. Funciona como uma escola: uma aula para cada assunto, organizadas em **3 níveis + projetos + referência** (120 páginas).

- **Nível 1 · Iniciante** (51 páginas): o que é o PowerShell, instalar e abrir o terminal, cmdlets e a ajuda, pastas e arquivos, variáveis e tipos, operadores, saída e entrada, decisões e repetições.
- **Nível 2 · Intermediário** (40 páginas): o pipeline e os objetos, coleções, funções, scripts, erros, dados e textos.
- **Nível 3 · Avançado** (15 páginas): criar o seu módulo, administrar o Windows (serviços, Registro, usuários e grupos locais, internet), recursos poderosos (o .NET, classes, `enum`, `Start-Job`, `ForEach-Object -Parallel`, `Add-Type`) e boas práticas.
- **Projetos** (4 páginas): lista de tarefas em JSON, menu interativo, analisador de log e consulta a uma API de CEP.
- **Referência** (10 páginas): cmdlets mais usados, verbos aprovados, operadores, variáveis automáticas, apelidos, formatos do `-f`, tipos, cmd e Bash × PowerShell, mensagens de erro comuns e atalhos do teclado.

Cada aula explica cada parte do comando (anatomia), mostra a saída real e o que acontece quando dá errado, com a mensagem como o PowerShell escreveu e a explicação em português. No fim vêm exercícios e perguntas de múltipla escolha. O guia ensina o **PowerShell 7.7**. Quando o Windows PowerShell 5.1 (o que já vem no Windows) responde diferente, uma nota avisa.

**De onde vêm as saídas:** todas foram tiradas do PowerShell 7.7 de verdade, em português (pt-BR), e as aulas dizem onde. Umas foram colhidas num Windows em português, com o prompt `PS C:\Users\ana>`. Outras foram colhidas no PowerShell 7.7 rodando no Linux: essas mostram só o que sai igual nos dois sistemas, e uma saída do Linux nunca aparece como se fosse do Windows. Comandos que só existem no Windows (serviços, Registro, usuários locais) ganham a etiqueta **só Windows**. Nos exemplos, a usuária é sempre a fictícia `ana`.

Para praticar, as páginas trazem **229 missões** no editor **Experimente** (`.tryps`):

- Edite o código, clique em **Rodar** e veja a saída. A caixa confere se você chegou ao resultado pedido.
- O editor usa `assets/pssim.js`, um **PowerShell 7 simulado em JavaScript**, com um disco de mentira (`C:\Users\ana`) recriado a cada **Rodar**. Ele não é o PowerShell de verdade, mas todas as 229 missões funcionam nele. A aula "Simulador" também traz um terminal livre para experimentar.
- Se o simulador não carregar, a caixa vira **"Rode no seu PowerShell"** (`assets/rode-local.js`): você copia o código, roda no seu PowerShell, cola a saída e clica em **Conferir**.

Nos dois modos, nada sai da página e nada é guardado no navegador.

Site 100% estático (HTML + CSS + JS, sem build e sem dependências externas): abre direto no navegador e funciona no GitHub Pages.

## Estrutura

```
index.html                 página inicial
<tema>.html                uma aula por tema
assets/style.css           visual
assets/site.js             níveis/menu (lista NIVEIS), Anterior/Próximo, anatomia, exercícios
assets/pssim.js            o PowerShell simulado do editor "Experimente" (caixas .tryps)
assets/rode-local.js       o modo "Rode no seu PowerShell" (cole a saída e confira)
assets/rode-local.css      visual desse modo
tools/testar-missoes.js    testa todas as missões no simulador
tools/testar-navegador.js  abre as páginas num Chrome sem janela e confere as missões
tools/checar-privacidade.sh  procura dados de máquina real nas páginas e no histórico
tools/missoes.json         contagem das missões por seção
CONTRIBUINDO.md            como escrever uma aula
.nojekyll                  faz o GitHub Pages servir os arquivos como estão
```

## Testes

```bash
node tools/testar-missoes.js                 # todas as missões (229)
node tools/testar-missoes.js --secao "Começando"   # só uma seção do menu
node tools/testar-navegador.js --todas       # todas as páginas num Chrome sem janela (precisa do puppeteer-core em tools/node_modules)
node tools/testar-navegador.js --rode-local --todas   # idem, no modo "Rode no seu PowerShell"
bash tools/checar-privacidade.sh             # privacidade (usa uma lista guardada fora do repositório)
```

## Publicar no GitHub Pages

Envie a pasta para um repositório e ative **Settings → Pages → Deploy from a branch → main / (root)**.

## Adicionar uma aula

Inclua a página na lista `NIVEIS` de `assets/site.js` e rode `node tools/testar-missoes.js` e `bash tools/checar-privacidade.sh` antes do commit. Os blocos de uma aula (anatomia, notas, "Quando dá errado", exercícios) estão descritos em `CONTRIBUINDO.md`.
