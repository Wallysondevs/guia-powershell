var NIVEIS = [
  { id: "n1", nome: "Nível 1 · Iniciante", curto: "Iniciante", desc: "PowerShell do zero", grupos: [
    { grupo: "Começando", itens: [
      ["index.html", "Início"],
      ["introducao.html", "O que é PowerShell"],
      ["versoes-powershell.html", "Windows PowerShell 5.1 × PowerShell 7"],
      ["instalar.html", "Instalar o PowerShell 7"],
      ["abrir-terminal.html", "Abrindo o PowerShell (e o Terminal do Windows)"],
      ["simulador.html", "O Editor do Guia"],
      ["primeiro-comando.html", "Seu Primeiro Comando"],
      ["cmdlets.html", "Cmdlets: Verbo-Substantivo"],
      ["parametros-cmdlet.html", "Parâmetros dos Comandos"],
      ["get-help.html", "Get-Help: a Ajuda"],
      ["get-command.html", "Get-Command: Achando Comandos"],
      ["aliases.html", "Apelidos (ls, dir, cd)"],
      ["teclado.html", "Tab, Histórico e Atalhos"]
    ]},
    { grupo: "Pastas e Arquivos", itens: [
      ["get-location.html", "Onde Estou (Get-Location)"],
      ["set-location.html", "Mudando de Pasta (Set-Location)"],
      ["get-childitem.html", "Listando (Get-ChildItem)"],
      ["caminhos.html", "Caminhos no Windows e no Linux"],
      ["new-item.html", "Criando Arquivos e Pastas (New-Item)"],
      ["copy-move.html", "Copiando e Movendo (Copy-Item e Move-Item)"],
      ["rename-item.html", "Renomeando (Rename-Item)"],
      ["remove-item.html", "Apagando (Remove-Item)"],
      ["get-content.html", "Lendo Arquivos (Get-Content)"],
      ["set-content.html", "Escrevendo Arquivos (Set-Content e Add-Content)"],
      ["test-path.html", "Existe? (Test-Path)"],
      ["provedores.html", "Drives e Provedores (Env:, HKCU:)"]
    ]},
    { grupo: "Variáveis e Tipos", itens: [
      ["variaveis.html", "Variáveis ($)"],
      ["tipos.html", "Tipos de Dados"],
      ["strings.html", "Textos: Aspas Simples × Duplas"],
      ["interpolacao.html", "Variáveis Dentro do Texto"],
      ["here-strings.html", "Textos de Várias Linhas (Here-Strings)"],
      ["numeros.html", "Números"],
      ["conversao.html", "Conversão de Tipos ([int], [string])"],
      ["booleanos-null.html", "$true, $false e $null"],
      ["variaveis-automaticas.html", "Variáveis Automáticas ($_, $HOME…)"]
    ]},
    { grupo: "Operadores", itens: [
      ["operadores-aritmeticos.html", "Operadores Aritméticos"],
      ["operadores-comparacao.html", "Comparações (-eq, -ne, -gt, -lt)"],
      ["operadores-texto.html", "Comparando Textos (-like, -match)"],
      ["operadores-colecao.html", "-contains e -in"],
      ["operadores-logicos.html", "-and, -or e -not"],
      ["operador-formato.html", "Formatando Textos (-f)"],
      ["atribuicao.html", "Atribuição (+=, ++)"]
    ]},
    { grupo: "Saída e Entrada", itens: [
      ["write-host-output.html", "Write-Host × Write-Output"],
      ["read-host.html", "Read-Host: Lendo o Teclado"],
      ["write-outros.html", "Write-Warning, Write-Verbose e Companhia"]
    ]},
    { grupo: "Decisões", itens: [
      ["if.html", "if"],
      ["elseif-else.html", "elseif e else"],
      ["switch.html", "switch"]
    ]},
    { grupo: "Repetições", itens: [
      ["foreach.html", "foreach"],
      ["for.html", "for"],
      ["while.html", "while e do"],
      ["break-continue.html", "break e continue"]
    ]}
  ]},
  { id: "n2", nome: "Nível 2 · Intermediário", curto: "Intermediário", desc: "Pipeline, objetos e scripts", grupos: [
    { grupo: "O Pipeline e os Objetos", itens: [
      ["objetos.html", "Tudo É Objeto"],
      ["pipeline.html", "O Pipeline (|)"],
      ["get-member.html", "Get-Member: o que Tem no Objeto"],
      ["select-object.html", "Select-Object"],
      ["where-object.html", "Where-Object: Filtrando"],
      ["sort-object.html", "Sort-Object: Ordenando"],
      ["foreach-object.html", "ForEach-Object"],
      ["group-object.html", "Group-Object: Agrupando"],
      ["measure-object.html", "Measure-Object: Contando e Somando"],
      ["format-table.html", "Format-Table"],
      ["format-list.html", "Format-List"],
      ["out-string-out-file.html", "Out-File, Out-String e o Redirecionamento (>)"]
    ]},
    { grupo: "Coleções", itens: [
      ["arrays.html", "Arrays (Listas)"],
      ["arrays-indices.html", "Índices e Fatias"],
      ["arrays-alterar.html", "Adicionando e Removendo Itens (List)"],
      ["hashtables.html", "Hashtables (@{})"],
      ["hashtables-percorrer.html", "Percorrendo uma Hashtable"],
      ["pscustomobject.html", "Seus Objetos ([pscustomobject])"],
      ["splatting.html", "Splatting (@parametros)"]
    ]},
    { grupo: "Funções", itens: [
      ["funcoes.html", "Funções (function)"],
      ["param.html", "Parâmetros (param)"],
      ["retorno.html", "O que uma Função Devolve"],
      ["cmdletbinding.html", "Funções Avançadas ([CmdletBinding])"],
      ["validacao.html", "Validando Parâmetros"],
      ["funcoes-pipeline.html", "Funções no Pipeline (begin, process, end)"],
      ["escopo.html", "Escopo das Variáveis"],
      ["ajuda-comentarios.html", "Ajuda nas Suas Funções"]
    ]},
    { grupo: "Scripts", itens: [
      ["scripts.html", "Scripts (.ps1)"],
      ["execution-policy.html", "Política de Execução"],
      ["parametros-script.html", "Parâmetros de Script e $args"],
      ["dot-source.html", "Dot-Sourcing (. .\\arquivo.ps1)"],
      ["perfil.html", "O Perfil ($PROFILE)"]
    ]},
    { grupo: "Erros", itens: [
      ["erros.html", "Lendo uma Mensagem de Erro"],
      ["try-catch.html", "try, catch e finally"],
      ["erroraction.html", "-ErrorAction e $ErrorActionPreference"],
      ["throw.html", "throw: Lançando Erros"],
      ["error-variable.html", "$Error e -ErrorVariable"]
    ]},
    { grupo: "Dados e Textos", itens: [
      ["csv.html", "CSV (Import-Csv e Export-Csv)"],
      ["json.html", "JSON (ConvertTo-Json e ConvertFrom-Json)"],
      ["xml.html", "XML"],
      ["get-date.html", "Datas e Horas (Get-Date)"],
      ["regex.html", "Expressões Regulares (-match, -replace)"],
      ["string-metodos.html", "Métodos de Texto (.Split, .Replace…)"],
      ["compress-archive.html", "Arquivos Zip (Compress-Archive)"]
    ]}
  ]},
  { id: "n3", nome: "Nível 3 · Avançado", curto: "Avançado", desc: "Administração e automação", grupos: [
    { grupo: "Módulos", itens: [
      ["modulos.html", "Módulos (Import-Module)"],
      ["psgallery.html", "Instalando Módulos (PowerShell Gallery)"],
      ["modulos-proprios.html", "Criando seu Módulo (.psm1)"]
    ]},
    { grupo: "Administrando o Windows", itens: [
      ["processos.html", "Processos (Get-Process e Stop-Process)"],
      ["start-process.html", "Abrindo Programas (Start-Process)"],
      ["servicos.html", "Serviços (Get-Service)"],
      ["variaveis-ambiente.html", "Variáveis de Ambiente ($env:)"],
      ["registro.html", "O Registro do Windows"],
      ["cim.html", "Informações do Computador (Get-CimInstance)"],
      ["eventos.html", "Logs de Eventos (Get-WinEvent)"],
      ["tarefas-agendadas.html", "Tarefas Agendadas"],
      ["permissoes.html", "Permissões (Get-Acl)"],
      ["usuarios-locais.html", "Usuários e Grupos Locais"],
      ["rede.html", "Rede (Test-Connection e Test-NetConnection)"],
      ["web.html", "Internet (Invoke-WebRequest e Invoke-RestMethod)"]
    ]},
    { grupo: "Recursos Poderosos", itens: [
      ["dotnet.html", "Usando o .NET ([Math], [DateTime])"],
      ["classes.html", "Classes"],
      ["enum.html", "Enum"],
      ["jobs.html", "Tarefas em Segundo Plano (Start-Job)"],
      ["foreach-parallel.html", "ForEach-Object -Parallel"],
      ["remoting.html", "PowerShell Remoto (Enter-PSSession e SSH)"],
      ["add-type.html", "C# Dentro do PowerShell (Add-Type)"]
    ]},
    { grupo: "Boas Práticas", itens: [
      ["estilo.html", "Estilo e Verbos Aprovados"],
      ["pester.html", "Testes com Pester"],
      ["depuracao.html", "Depurando (Set-PSBreakpoint)"],
      ["credenciais.html", "Senhas e Credenciais (SecureString)"],
      ["cmd-para-powershell.html", "Do cmd para o PowerShell"],
      ["bash-para-powershell.html", "Do Bash para o PowerShell"],
      ["novidades.html", "Novidades do PowerShell 7.7"]
    ]}
  ]},
  { id: "pj", nome: "Projetos", curto: "Projetos", desc: "Mão na massa", grupos: [
    { grupo: "Projetos", itens: [
      ["projeto-organizador.html", "Projeto: Organizador de Downloads"],
      ["projeto-backup.html", "Projeto: Backup com Zip"],
      ["projeto-relatorio.html", "Projeto: Relatório de Arquivos em CSV"],
      ["projeto-renomear.html", "Projeto: Renomear Fotos em Lote"],
      ["projeto-tarefas.html", "Projeto: Lista de Tarefas (JSON)"],
      ["projeto-menu.html", "Projeto: Menu Interativo"],
      ["projeto-log.html", "Projeto: Analisador de Log"],
      ["projeto-monitor.html", "Projeto: Monitor de Serviços"],
      ["projeto-api.html", "Projeto: Consultando uma API (CEP)"]
    ]}
  ]},
  { id: "ref", nome: "Referência", curto: "Referência", desc: "Consulta rápida", grupos: [
    { grupo: "Referência", itens: [
      ["ref-cmdlets.html", "Cmdlets Mais Usados"],
      ["ref-verbos.html", "Verbos Aprovados"],
      ["ref-operadores.html", "Operadores"],
      ["ref-variaveis-automaticas.html", "Variáveis Automáticas"],
      ["ref-aliases.html", "Apelidos (Aliases)"],
      ["ref-formatacao.html", "Formatos do -f ({0:N2})"],
      ["ref-tipos.html", "Tipos ([int], [datetime]…)"],
      ["ref-cmd-bash.html", "cmd e Bash × PowerShell"],
      ["ref-erros.html", "Mensagens de Erro Comuns"],
      ["ref-atalhos.html", "Atalhos do Teclado"]
    ]}
  ]}
];
