# Quadro do Guia PowerShell — Nível 1 (51 páginas)

Legenda: ① saída real colhida (Luna, `_saidas-brutas/`) · ② anonimizada e revisada (Mira) · ③ padrão CONTRIBUINDO + quiz · ④ commit local (sem push).
Versão-alvo: PowerShell 7.7 (`pwsh`). O lote do 5.1 serve de nota "no 5.1 isso dá erro" e alimenta a aula de versões. Marque com `x`. Autor padrão: Zeca. Quem mudar um status atualiza esta linha.

## Começando

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `index.html` Início | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] | Escrever por último |
| `introducao.html` O que é PowerShell | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `versoes-powershell.html` Windows PowerShell 5.1 × PowerShell 7 | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `instalar.html` Instalar o PowerShell 7 | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `abrir-terminal.html` Abrindo o PowerShell (e o Terminal do Windows) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `simulador.html` O Editor do Guia | Zeca | [x] | [ ] | [ ] | [ ] | [ ] | Adiada: editor wasm ficou na VPS |
| `primeiro-comando.html` Seu Primeiro Comando | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `cmdlets.html` Cmdlets: Verbo-Substantivo | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `parametros-cmdlet.html` Parâmetros dos Comandos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `get-help.html` Get-Help: a Ajuda | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `get-command.html` Get-Command: Achando Comandos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `aliases.html` Apelidos (ls, dir, cd) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `teclado.html` Tab, Histórico e Atalhos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |

## Pastas e Arquivos

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `get-location.html` Onde Estou (Get-Location) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `set-location.html` Mudando de Pasta (Set-Location) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `get-childitem.html` Listando (Get-ChildItem) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `caminhos.html` Caminhos no Windows e no Linux | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `new-item.html` Criando Arquivos e Pastas (New-Item) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `copy-move.html` Copiando e Movendo (Copy-Item e Move-Item) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `rename-item.html` Renomeando (Rename-Item) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `remove-item.html` Apagando (Remove-Item) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `get-content.html` Lendo Arquivos (Get-Content) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `set-content.html` Escrevendo Arquivos (Set-Content e Add-Content) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `test-path.html` Existe? (Test-Path) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |
| `provedores.html` Drives e Provedores (Env:, HKCU:) | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [ ] | [ ] |  |

## Variáveis e Tipos

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `variaveis.html` Variáveis ($) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `tipos.html` Tipos de Dados | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `strings.html` Textos: Aspas Simples × Duplas | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `interpolacao.html` Variáveis Dentro do Texto | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `here-strings.html` Textos de Várias Linhas (Here-Strings) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `numeros.html` Números | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `conversao.html` Conversão de Tipos ([int], [string]) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `booleanos-null.html` $true, $false e $null | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `variaveis-automaticas.html` Variáveis Automáticas ($_, $HOME…) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Operadores

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `operadores-aritmeticos.html` Operadores Aritméticos | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-comparacao.html` Comparações (-eq, -ne, -gt, -lt) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-texto.html` Comparando Textos (-like, -match) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-colecao.html` -contains e -in | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-logicos.html` -and, -or e -not | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operador-formato.html` Formatando Textos (-f) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `atribuicao.html` Atribuição (+=, ++) | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Saída e Entrada

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `write-host-output.html` Write-Host × Write-Output | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `read-host.html` Read-Host: Lendo o Teclado | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `write-outros.html` Write-Warning, Write-Verbose e Companhia | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Decisões

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `if.html` if | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `elseif-else.html` elseif e else | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `switch.html` switch | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Repetições

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `foreach.html` foreach | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `for.html` for | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `while.html` while e do | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `break-continue.html` break e continue | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
