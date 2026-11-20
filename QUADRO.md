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
| `primeiro-comando.html` Seu Primeiro Comando | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `cmdlets.html` Cmdlets: Verbo-Substantivo | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `parametros-cmdlet.html` Parâmetros dos Comandos | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `get-help.html` Get-Help: a Ajuda | Zeca | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
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
| `rename-item.html` Renomeando (Rename-Item) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `remove-item.html` Apagando (Remove-Item) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | confirmação de pasta cheia só descrita (não coletável em -NonInteractive) |
| `get-content.html` Lendo Arquivos (Get-Content) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `set-content.html` Escrevendo Arquivos (Set-Content e Add-Content) | Tito | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] |  |
| `test-path.html` Existe? (Test-Path) | Zeca (rascunho dele, combinado 17:36) | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | 0573e13 |
| `provedores.html` Drives e Provedores (Env:, HKCU:) | Zeca (rascunho dele, combinado 17:36) | [x] | [x] 7.7 (+5.1) | [x] | [x] | [x] | 0573e13 |

## Variáveis e Tipos

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `variaveis.html` Variáveis ($) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `tipos.html` Tipos de Dados | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `strings.html` Textos: Aspas Simples × Duplas | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `interpolacao.html` Variáveis Dentro do Texto | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `here-strings.html` Textos de Várias Linhas (Here-Strings) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `numeros.html` Números | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `conversao.html` Conversão de Tipos ([int], [string]) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `booleanos-null.html` $true, $false e $null | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `variaveis-automaticas.html` Variáveis Automáticas ($_, $HOME…) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Operadores

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `operadores-aritmeticos.html` Operadores Aritméticos | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-comparacao.html` Comparações (-eq, -ne, -gt, -lt) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-texto.html` Comparando Textos (-like, -match) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-colecao.html` -contains e -in | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operadores-logicos.html` -and, -or e -not | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `operador-formato.html` Formatando Textos (-f) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `atribuicao.html` Atribuição (+=, ++) | Luna | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Saída e Entrada

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `write-host-output.html` Write-Host × Write-Output | Tito | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `read-host.html` Read-Host: Lendo o Teclado | Tito | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `write-outros.html` Write-Warning, Write-Verbose e Companhia | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Decisões

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `if.html` if | Tito | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `elseif-else.html` elseif e else | Tito | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `switch.html` switch | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Repetições

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `foreach.html` foreach | Tito | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `for.html` for | Tito | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `while.html` while e do | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| `break-continue.html` break e continue | Zeca | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Lotes de coleta

- **Lote 1** (Começando + Pastas e Arquivos, 24 aulas): colhido no 7.7, anonimizado. Zeca escrevendo.
- **Lote 2** (Variáveis e Tipos, Operadores, Saída e Entrada, Decisões, Repetições, 26 aulas): ① Zeca faz os `cmds/` → ② Mira confere as guardas → ③ Luna coleta num lote só (`pwsh -NoProfile -File`, um card do Wallyson) → ④ Mira anonimiza em `_saidas-anon/7/`. Atenção: `read-host` precisa de janela (entra no roteiro com `Start-Transcript` do Zeca ou fica ilustrativo).
