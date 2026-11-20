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
| `simulador.html` Simulador | Zeca | [x] | [ ] | [ ] | [x] | [x] | 4238feb |
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
| `write-outros.html` Write-Warning, Write-Verbose e Companhia | Zeca | [x] | [x] | [x] | [x] | [x] | 5ba714f |

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
| `break-continue.html` break e continue | Zeca | [x] | [x] | [x] | [x] | [x] | 900be27 |

## Lotes de coleta

- **Lote 1** (Começando + Pastas e Arquivos, 24 aulas): colhido no 7.7, anonimizado. Zeca escrevendo.
- **Lote 2** (Variáveis e Tipos, Operadores, Saída e Entrada, Decisões, Repetições, 26 aulas): ① Zeca faz os `cmds/` → ② Mira confere as guardas → ③ Luna coleta num lote só (`pwsh -NoProfile -File`, um card do Wallyson) → ④ Mira anonimiza em `_saidas-anon/7/`. Atenção: `read-host` precisa de janela (entra no roteiro com `Start-Transcript` do Zeca ou fica ilustrativo).


## Nível 3 · Administração (aulas do Zeca)

| Página | Autor | cmds | ① | ② | ③ | ④ | Obs |
|---|---|---|---|---|---|---|---|
| `usuarios-locais.html` Usuários e Grupos Locais | Zeca | [x] | [x] | [x] | [x] | [x] | 8b58f07; o Get-LocalUser final é ilustrativo |
| `registro.html` O Registro do Windows | Zeca | [x] | [x] | [x] | [x] | [x] | e2fc558 |
| `servicos.html` Serviços (Get-Service) | Zeca | [x] | [x] | [x] | [x] | [x] | 668a2ff |

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
