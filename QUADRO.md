# Quadro do Guia PowerShell — Nível 1 (51 páginas)

Legenda: ① saída real colhida (Luna, `_saidas-brutas/`) · ② anonimizada e revisada (Mira) · ③ padrão CONTRIBUINDO + quiz · ④ commit local (sem push).
Versão-alvo: PowerShell 7.7 (`pwsh`). O lote do 5.1 serve de nota "no 5.1 isso dá erro" e alimenta a aula de versões. Marque com `x`. Autor padrão: Zeca. Quem mudar um status atualiza esta linha.

## Começando

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `index.html` Início | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | Escrever por último |
| `introducao.html` O que é PowerShell | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | aula conceitual; sem 'Formas diferentes' de propósito |
| `versoes-powershell.html` Windows PowerShell 5.1 × PowerShell 7 | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | aula conceitual; sem 'Formas diferentes' de propósito |
| `instalar.html` Instalar o PowerShell 7 | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | aula conceitual; sem 'Formas diferentes' de propósito |
| `abrir-terminal.html` Abrindo o PowerShell (e o Terminal do Windows) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | aula conceitual; sem 'Formas diferentes' de propósito |
| `simulador.html` Simulador | Zeca | [x] | [ ] | [ ] | [x] | [x] | 4238feb |
| `primeiro-comando.html` Seu Primeiro Comando | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `cmdlets.html` Cmdlets: Verbo-Substantivo | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `parametros-cmdlet.html` Parâmetros dos Comandos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | b7ab3fc (Formas diferentes) |
| `get-help.html` Get-Help: a Ajuda | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `get-command.html` Get-Command: Achando Comandos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `aliases.html` Apelidos (ls, dir, cd) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `teclado.html` Tab, Histórico e Atalhos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | 50cb961 (Formas diferentes) |

## Pastas e Arquivos

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `get-location.html` Onde Estou (Get-Location) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `set-location.html` Mudando de Pasta (Set-Location) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `get-childitem.html` Listando (Get-ChildItem) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `caminhos.html` Caminhos no Windows e no Linux | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `new-item.html` Criando Arquivos e Pastas (New-Item) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | 1901da7 (Formas diferentes) |
| `copy-move.html` Copiando e Movendo (Copy-Item e Move-Item) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | 541498e (Formas diferentes) |
| `rename-item.html` Renomeando (Rename-Item) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `remove-item.html` Apagando (Remove-Item) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | confirmação de pasta cheia só descrita (não coletável em -NonInteractive) |
| `get-content.html` Lendo Arquivos (Get-Content) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `set-content.html` Escrevendo Arquivos (Set-Content e Add-Content) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `test-path.html` Existe? (Test-Path) | Zeca (rascunho dele, combinado 17:36) | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | 0573e13 + fdeeb0a (Formas diferentes) |
| `provedores.html` Drives e Provedores (Env:, HKCU:) | Zeca (rascunho dele, combinado 17:36) | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | 0573e13 + 46f5cff (Formas diferentes) |

## Variáveis e Tipos

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `variaveis.html` Variáveis ($) | Luna | [x] | [x] | [x] | [x] | [x] | 0b7b1a4 |
| `tipos.html` Tipos de Dados | Luna | [x] | [x] | [x] | [x] | [x] | 9a922b3 |
| `strings.html` Textos: Aspas Simples × Duplas | Luna | [x] | [x] | [x] | [x] | [x] | deb641f |
| `interpolacao.html` Variáveis Dentro do Texto | Luna | [x] | [x] | [x] | [x] | [x] | bd722a3 |
| `here-strings.html` Textos de Várias Linhas (Here-Strings) | Luna | [x] | [x] | [x] | [x] | [x] | 2a871b2 |
| `numeros.html` Números | Luna | [x] | [x] | [x] | [x] | [x] | d0848c9 (+5.1) |
| `conversao.html` Conversão de Tipos ([int], [string]) | Luna | [x] | [x] | [x] | [x] | [x] | 423593f |
| `booleanos-null.html` $true, $false e $null | Luna | [x] | [x] | [x] | [x] | [x] | 23a4b79 (+5.1) |
| `variaveis-automaticas.html` Variáveis Automáticas ($_, $HOME…) | Luna | [x] | [x] | [x] | [x] | [x] | 78bec34 + fb5190d |

## Operadores

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `operadores-aritmeticos.html` Operadores Aritméticos | Luna | [x] | [x] | [x] | [x] | [x] | ffab8d5 |
| `operadores-comparacao.html` Comparações (-eq, -ne, -gt, -lt) | Luna | [x] | [x] | [x] | [x] | [x] | 82cf41a |
| `operadores-texto.html` Comparando Textos (-like, -match) | Luna | [x] | [x] | [x] | [x] | [x] | edcab1e |
| `operadores-colecao.html` -contains e -in | Luna | [x] | [x] | [x] | [x] | [x] | 080c735 + correção |
| `operadores-logicos.html` -and, -or e -not | Tito (de Luna, 17:57) | [x] | [x] | [x] | [x] | [x] | fc81784 |
| `operador-formato.html` Formatando Textos (-f) | Tito (de Luna, 17:57) | [x] | [x] | [x] | [x] | [x] | 39da399 |
| `atribuicao.html` Atribuição (+=, ++) | Tito (de Luna, 17:57) | [x] | [x] | [x] | [x] | [x] | 876da13 + 97c46fc (saída real do ++/-- da recoleta) |

## Saída e Entrada

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `write-host-output.html` Write-Host × Write-Output | Tito | [x] | [x] | [x] | [x] | [x] | c66eb98 |
| `read-host.html` Read-Host: Lendo o Teclado | Tito | [x] | [x] | [x] | [x] | [x] | b592d9f+8db4a53; prompt interativo descrito em prosa (não coletado) |
| `write-outros.html` Write-Warning, Write-Verbose e Companhia | Zeca | [x] | [x] | [x] | [x] | [x] | 5ba714f + b0b69d9 (Formas diferentes) |

## Decisões

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `if.html` if | Tito | [x] | [x] | [x] | [x] | [x] | d21400c; formato ParserError do console descrito (não coletado) |
| `elseif-else.html` elseif e else | Tito | [x] | [x] | [x] | [x] | [x] | b1d90b9+f8a39c2 (recoleta) |
| `switch.html` switch | Zeca | [x] | [x] | [x] | [x] | [x] | 9487d32 |

## Repetições

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `foreach.html` foreach | Tito | [x] | [x] | [x] | [x] | [x] | 50d5817+39cf79c |
| `for.html` for | Tito | [x] | [x] | [x] | [x] | [x] | 85ded7d |
| `while.html` while e do | Zeca | [x] | [x] | [x] | [x] | [x] | 19f9722 |
| `break-continue.html` break e continue | Zeca | [x] | [x] | [x] | [x] | [x] | 900be27 + ab46049 (Formas diferentes) |

## Lotes de coleta

- **Lote 1** (Começando + Pastas e Arquivos, 24 aulas): colhido no 7.7, anonimizado. Zeca escrevendo.
- **Lote 2** (Variáveis e Tipos, Operadores, Saída e Entrada, Decisões, Repetições, 26 aulas): ① Zeca faz os `cmds/` → ② Mira confere as guardas → ③ Luna coleta num lote só (`pwsh -NoProfile -File`, um card do Wallyson) → ④ Mira anonimiza em `_saidas-anon/7/`. Atenção: `read-host` precisa de janela (entra no roteiro com `Start-Transcript` do Zeca ou fica ilustrativo).


## Nível 3 · Administração (aulas do Zeca)

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `usuarios-locais.html` Usuários e Grupos Locais | Zeca | [x] | [x] | [x] | [x] | [x] | 8b58f07 + 9d52687 + c17c35b; o Get-LocalUser final é ilustrativo; aviso nas missões: não execute o texto da string |
| `registro.html` O Registro do Windows | Zeca | [x] | [x] | [x] | [x] | [x] | e2fc558 + 9e6f793 (Formas diferentes) |
| `servicos.html` Serviços (Get-Service) | Zeca | [x] | [x] | [x] | [x] | [x] | 668a2ff + 53b2f10 (Formas diferentes) |

## Conferência 18h (Tito)

NIVEIS tem **51** páginas no Nível 1; as 51 existem (`simulador.html` em 4238feb). No menu o rótulo do simulador passou a **Simulador**.

**Em breve (a67aec5):** as **89** páginas do NIVEIS ainda sem arquivo `.html` (Nível 2, o restante do Nível 3, projetos e referência) entram com `{pronta: false}`. O menu mostra "em breve" sem link; o pager pula as não prontas; os `a[href]` internos para essas páginas viram `span` com "(em breve)". O `simulador.html` fica pronta. Assim os links para aulas futuras deixam de dar 404.

**Editor / missões:** b17ae11, modo "rode no seu PC" (`assets/rode-local.js` e `assets/rode-local.css`), carregados quando o `pssim.js` não existe.

**Luna:** `variaveis-automaticas` 78bec34 + fb5190d (missão final com meta estável em `$IsLinux`).

- `index.html` (Zeca) — página-hub da trilha, sem `.mc`/`.exercise` e sem Resumo. Não é aula; não trato como erro.

**Lote 1:** limpo (conferido pela Mira).

**Pendências da próxima sessão:**
1. `pssim.js` (ainda não existe; o fallback é o rode-local).
2. Textos das missões ainda dizem "clique em Rodar".


## Fechamento do Nível 1 (20/11/2026, 18:50)

**Resumo final:** **51** páginas prontas (Nível 1, incluindo `simulador.html`) e **89** marcadas "em breve" (`{pronta: false}`: Nível 2, restante do Nível 3, projetos e referência).

**Hashes:** conferido. As linhas das aulas prontas (③④ marcados) têm hash no Obs, ou estão sem Obs por terem sido feitas em lote. As 18 linhas do Nível 1 com ③④ pendentes (hub, aulas conceituais e as de coleta ainda não feita) seguem sem hash e não contam como fechadas.

**Varredura final da Mira (18:42):** o checador deu OK nas 131 versões do histórico e nas páginas, sem resto do coletor; as saídas brutas, a lista proibida e os documentos internos ficaram fora do git; o JS passou no `node --check`.

**Pendências da próxima sessão:**
1. `pssim.js` (não existe; fallback é o rode-local).
2. Textos das missões que ainda dizem "clique em Rodar".
3. Cerca de 10 páginas ainda dizem que o editor do guia é um PowerShell de Linux (ex.: `variaveis-automaticas`, que diz que lá o `$IsLinux` dá True, `get-location`, `abrir-terminal`, `versoes-powershell`). Reescrever junto com o pssim.js; não têm dado do Wallyson.


## Simulador pssim.js — etapas

Quem escreve o `assets/pssim.js` é o **Zeca**. Quem revisa é a **Mira**. O Tito testa as missões (Começando e Pastas e Arquivos primeiro). Sem push.

Inventário das 123 missões do Nível 1: `tools/missoes.json`. Testadores: `tools/testar-missoes.js` (Node, `PSSim.run`) e `tools/testar-navegador.js` (Chrome, `PSSim.caixas[i].testar` ou o rode-local).

### Contrato de interface (para o Zeca)

**Como o `site.js` carrega o simulador.** Se a página tem `.tryps`, ele inclui `assets/pssim.js`. No `onload` e no `onerror`, se **não** existirem os globais `window.PSSim` nem `window.pssim`, entra o modo "Rode no seu PowerShell" (`assets/rode-local.js`). O global precisa ser definido de forma síncrona no carregamento; se só aparecer depois de um init assíncrono, o rode-local também é carregado.

**Como o `rode-local.js` sai de cena.** No topo, depois do avaliador: se não há `document`, retorna (o testador em Node recorta só o avaliador); se `window.PSSim` ou `window.pssim` já existe, retorna e não monta a UI. O simulador manda.

**Contrato do `pssim.js` (confirmado pelo Zeca):**

- Global: `window.PSSim` (preferido) ou `window.pssim`.
- `PSSim.run(codigo)` — API em Node (`tools/testar-missoes.js`). Devolve `{ saida, exitCode?, arquivos? }`. `saida` é o texto do terminal (stdout+stderr); `arquivos` é o estado do FS falso depois de rodar, para as metas `arquivo:`.
- `PSSim.caixas[i].testar("inicial"|"solucao")` — API no navegador (`tools/testar-navegador.js`). Devolve `{ ok, metas, saida }`. O inicial **não** pode dar `ok` (salvo quando o script inicial já é a solução); a solução **tem** que dar `ok`.

**Metas do `data-goal`** (avaliador `psfAvaliar` em `rode-local.js`, recortado pelo testador). Várias metas se separam com `;;`; todas precisam passar.

| Meta | No pssim (comando de fato rodou) | No rode-local (a pessoa cola a saída) |
|---|---|---|
| `out:TEXTO` | a saída contém o texto | idem, se houver cola |
| `outre:REGEX` | a saída casa com a regex (`m`) | idem |
| `src:REGEX` | o código casa com a regex (`mi`, sem diferenciar maiúsculas) | idem (olha o editor) |
| `semerro` | não há cara de erro na saída; **saída vazia conta como sucesso** (New-Item, Copy-Item etc. não imprimem nada quando dão certo) | ver regras do campo vazio / `(sem saída)` abaixo |
| `erro:TEXTO` | a saída contém o erro | idem |
| `exit:N` | `exitCode === N` | conferência manual (☐) |
| `arquivo:NOME` / `arquivo:NOME~TEXTO` | o arquivo existe no FS devolvido (e contém o texto, se pedido) | conferência manual (☐) |

**Campo vazio e `(sem saída)` no rode-local (a273e59) — não é falha do `semerro` automático no simulador.**

- Campo vazio: não confere nada. Aparece “Cole primeiro o que o PowerShell respondeu” e **zero ✔**, inclusive no `semerro`.
- Com `(sem saída)`: o `semerro` vira ☐ “confirme que o comando executou sem erros no seu terminal”, **sem ✔ automático**.
- Quando não há ✘ e só sobram ☐, a mensagem é **“Quase lá!”** — nunca “Missão cumprida!”.
- No positivo das missões só com `semerro` (no Nível 1 não há nenhuma só com `semerro`), o esperado também é “Quase lá!”. As 13 missões cujas metas são só `src:` e `semerro` (com a solução no editor e `(sem saída)`): `src` pode dar ✔, `semerro` fica ☐, a mensagem é “Quase lá!”: `introducao-1`, `introducao-2`, `instalar-1`, `instalar-2`, `abrir-terminal-1`, `abrir-terminal-2`, `abrir-terminal-3`, `cmdlets-1`, `get-help-1`, `get-help-2`, `get-location-1`, `get-location-2`, `get-location-3`.

### Como testar

```
node tools/testar-missoes.js
node tools/testar-missoes.js --secao "Começando"
node tools/testar-missoes.js --secao "Pastas e Arquivos"
# se o pssim.js ainda não existe, o testador avisa e sai com código 2

timeout 600 node tools/testar-navegador.js primeiro-comando.html
timeout 3600 node tools/testar-navegador.js --todas
timeout 600 node tools/testar-navegador.js --todas -q
timeout 600 node tools/testar-navegador.js --fotos /tmp/fotos-guia-ps primeiro-comando.html
```

O testador do navegador usa `puppeteer-core` em `tools/node_modules` (ou `PUPPETEER_DIR`) e `CHROMIUM=/usr/bin/google-chrome`. Sem `PSSim`, ele exerce o rode-local. O 404 de `assets/pssim.js` não conta como erro da página.

### Etapas (ordenadas; cada uma soma às anteriores)

Critério de pronto: as missões destravadas na etapa (e nas anteriores) passam no testador. Começando e Pastas e Arquivos entram primeiro. Dono: Zeca (a Mira revisa; o Tito testa). Status inicial: pendente.

| Etapa | O que entra | Destrava | C+P | Critério de pronto | Dono | Status |
|---|---|---|---|---|---|---|
| E1 Intérprete básico | linhas, comentários, variáveis, strings, interpolação, `$()`, aritmética básica, arrays simples, métodos/propriedades simples, Write-Output (e saída implícita), Write-Host | 15 | 4 | 15/15 (4 de Começando+Pastas) | Zeca | pendente |
| E2 Data, host e caminhos de texto | Get-Date (`-Format`, `.Year`, `.Day`), `$PSVersionTable` / `$PSEdition` / `$Host` / `$PWD` / `$IsLinux`, Get-Location (cwd fixo), Join-Path, Split-Path | 21 | 19 | 36/36 acumuladas (23 de C+P) | Zeca | pendente |
| E3 Sistema de arquivos falso | cwd mutável, pipeline, Out-Null, New-Item, Get-ChildItem, Set/Get/Add-Content, Copy/Move/Rename/Remove-Item, Test-Path, Set-Location, Push/Pop-Location, Format-List, `if` simples, `$_` / `-replace` | 29 | 27 | 65/65 acumuladas (50 de C+P) | Zeca | pendente |
| E4 Descoberta e apelidos | Get-Command, Get-Verb, Get-Help, Get-Alias, Select-Object, apelidos (`echo`, `ls`, `pwd`, `dir`, `cd`) | 12 | 12 | 77/77 acumuladas (62 de C+P) | Zeca | pendente |
| E5 Provedores | Get-PSProvider, Get-PSDrive, drives fake (Env:, Alias:, FileSystem), só leitura | 3 | 3 | 80/80 acumuladas (**65/65 de C+P**) | Zeca | pendente |
| E6 Tipos, operadores e `-f` | tipos e conversão (`[int]`, `-as`, `[math]`), `$true`/`$false`/`$null`/`??`, here-strings, faixa `1..n`, operadores de comparação/coleção/lógicos, `-f`, `+=`/`++`/`--`, Measure-Object | 25 | 0 | 105/105 acumuladas | Zeca | pendente |
| E7 Outros fluxos de saída | Write-Warning, Write-Verbose, Write-Information (`-Verbose`, `-InformationAction`). Read-Host fica ilustrativo ou com a resposta já no script | 3 | 0 | 108/108 acumuladas | Zeca | pendente |
| E8 Decisões e repetições | else/elseif, switch (`-Wildcard`, default), foreach, for, while/do/until, break, continue | 15 | 0 | 123/123 acumuladas | Zeca | pendente |

**E1** destrava: `primeiro-comando-2`, `teclado-1`, `teclado-2`, `teclado-3`, `interpolacao-1`, `interpolacao-2`, `numeros-1`, `strings-1`, `strings-2`, `variaveis-1`, `variaveis-2`, `operadores-aritmeticos-1`, `read-host-1`, `write-host-output-1`, `write-host-output-2`.

**E2** destrava: `abrir-terminal-1` a `3`, `instalar-1` e `2`, `introducao-1` e `2`, `parametros-cmdlet-3`, `primeiro-comando-1` e `3`, `versoes-powershell-1` a `4`, `caminhos-1` a `3`, `get-location-1` e `2`, `variaveis-automaticas-1` e `2`.

**E3** destrava: `parametros-cmdlet-1` e `2`, `copy-move-1` a `3`, `get-childitem-1` a `3`, `get-content-1` a `3`, `get-location-3`, `new-item-1` a `3`, `remove-item-1` e `2`, `rename-item-1` e `2`, `set-content-1` e `2`, `set-location-1` a `3`, `test-path-1` a `3`, `operadores-texto-1` e `2`.

**E4** destrava: `aliases-1` a `3`, `cmdlets-1` a `3`, `get-command-1` a `3`, `get-help-1` a `3`.

**E5** destrava: `provedores-1` a `3`.

**E6** destrava: `booleanos-null-1` e `2`, `conversao-1` e `2`, `here-strings-1` e `2`, `numeros-2`, `tipos-1` e `2`, `atribuicao-1` e `2`, `operador-formato-1` e `2`, `operadores-aritmeticos-2`, `operadores-colecao-1` e `2`, `operadores-comparacao-1` e `2`, `operadores-logicos-1` e `2`, `read-host-2`, `write-host-output-3`, `elseif-else-1`, `if-1` e `2`.

**E7** destrava: `write-outros-1` a `3`.

**E8** destrava: `elseif-else-2` e `3`, `switch-1` a `3`, `break-continue-1` a `3`, `for-1` e `2`, `foreach-1` e `2`, `while-1` a `3`.

Frequência de cmdlets e recursos (quantas missões cada um destrava, com Começando e Pastas primeiro nos `ids`): ver `tools/missoes.json`, chave `frequencia`.
