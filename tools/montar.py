#!/usr/bin/env python3
# Menu do guia: a lista NIVEIS de assets/site.js é a ÚNICA fonte (menu, selo de nível, pager).
# tools/niveis.js é só uma cópia dela, usada quando a base é montada do zero.
#   python3 tools/montar.py --niveis   copia a NIVEIS de assets/site.js para tools/niveis.js
#   python3 tools/montar.py --conferir sai com erro se tools/niveis.js estiver diferente de assets/site.js
#   python3 tools/montar.py            monta a base do zero a partir do Guia Lua, usando tools/niveis.js
#                                      (só na criação do guia; o Guia Lua fica ao lado desta pasta, ou em GUIA_LUA)
# Caminhos relativos a este arquivo: o guia é a pasta acima de tools/.
import os, re, shutil, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
DST = os.path.abspath(os.path.join(AQUI, ".."))
SRC = os.environ.get("GUIA_LUA", os.path.join(DST, "..", "guia-lua"))
NIVEIS_JS = os.path.join(AQUI, "niveis.js")

def com_niveis(js):
    niveis = open(NIVEIS_JS, encoding="utf-8").read().strip()
    a = js.index("var NIVEIS = ["); b = js.index("\n];", a) + 3
    return js[:a] + niveis + js[b:]

def niveis_do_site():
    js = open(os.path.join(DST, "assets", "site.js"), encoding="utf-8").read()
    a = js.index("var NIVEIS = ["); b = js.index("\n];", a) + 3
    return js[a:b] + "\n"

if len(sys.argv) > 1 and sys.argv[1] in ("--niveis", "--conferir"):
    do_site = niveis_do_site()
    if sys.argv[1] == "--conferir":
        if not os.path.exists(NIVEIS_JS) or open(NIVEIS_JS, encoding="utf-8").read() != do_site:
            sys.exit("tools/niveis.js está diferente da NIVEIS de assets/site.js: rode python3 tools/montar.py --niveis")
        print("ok: tools/niveis.js é igual à NIVEIS de assets/site.js"); sys.exit(0)
    open(NIVEIS_JS, "w", encoding="utf-8").write(do_site)
    print("ok", len(re.findall(r'\["[a-z0-9-]+\.html"', do_site)), "páginas na NIVEIS"); sys.exit(0)

os.makedirs(DST + "/assets", exist_ok=True)
os.makedirs(DST + "/tools", exist_ok=True)
shutil.copy(SRC + "/assets/style.css", DST + "/assets/style.css")

js = open(SRC + "/assets/site.js").read()
js = com_niveis(js)
niveis = open(NIVEIS_JS, encoding="utf-8").read()

def troca(old, new):
    global js
    assert old in js, "não achei: " + old[:80]
    js = js.replace(old, new)

troca("Guia Lua — navegação e componentes", "Guia PowerShell — navegação e componentes")
js = js.replace("</span>Guia Lua</a>", "</span>Guia PowerShell</a>")
js = re.sub(r'"Guia Lua · [^"]*"', '"Guia PowerShell · PowerShell 7.7 · As saídas das aulas foram colhidas no PowerShell 7 de verdade · Os exercícios rodam num simulador de PowerShell no navegador"', js)

# o modo interativo do Lua sai; entra o prompt do PowerShell:
#   "PS C:\Users\ana> comando"  (Windows)   "PS /home/ana> comando"  (Linux)   ">> " = continuação
#   "C:\Users\ana>comando"      (cmd.exe, para as comparações)
troca("    var modoLua = false, ultimoCmd = false, sessao", "    var modoPS = false, ultimoCmd = false, sessao")
troca("      var mc = ultimoCmd && !modoLua && /^> ?(.*)$/.exec(l);", "      var mc = ultimoCmd && !modoPS && /^> ?(.*)$/.exec(l);")
troca('''      // o prompt do modo interativo do Lua ("> ") e a continuação dele (">> "), só depois de "$ lua"
      var ms = modoLua && /^(>>?)(?: (.*)|())$/.exec(l);''', '''      // o prompt do PowerShell ("PS C:\\Users\\ana> ", "PS /home/ana> "), a continuação dele (">> ")
      // e o do cmd.exe ("C:\\Users\\ana>dir"); "$ pwsh" (Linux) também liga o modo PowerShell
      var ms = /^(PS (?:[A-Za-z]:\\\\|\\/|[A-Za-z]+:)[^>]*>)(?: (.*)|())$/.exec(l) || (modoPS && /^(>>)(?: (.*)|())$/.exec(l)) || /^([A-Z]:\\\\[^>]*>)(.*)$/.exec(l);
      if (ms) { if (ms[1] !== ">>") { modoPS = true; cmds.push((ms[2] || "").replace(/\\s*«.*$/, "")); } else if (cmds.length) cmds[cmds.length - 1] += "\\n" + (ms[2] || "").replace(/\\s*«.*$/, ""); }''')
troca('''        modoLua = /^\\s*lua(?:5\\.\\d)?\\s*$/.test(m[2]) || /^\\s*lua(?:5\\.\\d)?\\s(?:.*\\s)?-i(?:\\s|$)/.test(m[2]);''',
      '''        modoPS = /^\\s*pwsh\\s*$/.test(m[2]);''')

troca('var tries = document.querySelectorAll(".try, .trylua");', 'var tries = document.querySelectorAll(".try, .tryps");')
troca('t.classList.contains("trylua") ? "Experimente: edite o código e clique em Rodar"', 't.classList.contains("tryps") ? "Experimente: edite o código e clique em Rodar"')
troca('''  // o editor (assets/luasim.js): o Lua de verdade (lua.c oficial em WebAssembly), carregado no primeiro Rodar
  if (document.querySelector(".trylua")) body.appendChild(el("script", { src: "assets/luasim.js" }));''', '''  // o editor (assets/pssim.js): um simulador de PowerShell escrito em JavaScript (não é o PowerShell de verdade), carregado no primeiro Rodar
  if (document.querySelector(".tryps")) body.appendChild(el("script", { src: "assets/pssim.js" }));''')
# no PowerShell maiúsculas não importam nos nomes (Get-ChildItem = get-childitem); dentro de aspas, sim
troca('''        // no Lua maiúsculas importam (true ≠ True): a comparação é exata
        var ok = certas.indexOf(norm(i.value)) !== -1;''', '''        // no PowerShell maiúsculas não importam (Get-ChildItem = get-childitem); texto entre aspas, sim
        var v = norm(i.value);
        var ok = certas.some(function (c) { return c === v || (!/['"]/.test(c) && c.toLowerCase() === v.toLowerCase()); });''')
assert "Lua" not in js.replace("Lua.org", ""), [l for l in js.split("\n") if "Lua" in l][:5]
open(DST + "/assets/site.js", "w").write(js)
open(DST + "/.nojekyll", "w").close()
print("ok", len(re.findall(r'\["[a-z0-9-]+\.html"', niveis)), "páginas na NIVEIS")
