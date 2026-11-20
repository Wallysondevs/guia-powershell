/* =========================================================
   Guia PowerShell — modo "Rode no seu PowerShell"
   Carregado pelo site.js só quando assets/pssim.js (o simulador)
   não existe ou não definiu o global. Se o simulador chegar, este
   arquivo nem é carregado.
   Em cada .tryps: editor com o script inicial, "Copiar código",
   caixa para colar a saída do terminal, "Conferir" (avalia as metas
   do data-goal) e "Ver solução" (liberado depois do 1º Conferir).
   Privacidade: o código e a saída colada ficam só na página. Nada
   é enviado (sem fetch/XHR/beacon) nem guardado (sem localStorage,
   sessionStorage, cookies ou IndexedDB).
   ========================================================= */
(function () {
  "use strict";

  /* psf-avaliador:inicio (o teste em Node recorta este trecho) */
  function psfNormaliza(s) {
    return String(s == null ? "" : s)
      .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "") // cores ANSI, se vierem na cópia
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .split("\n").map(function (l) { return l.replace(/[ \t]+$/, ""); }).join("\n");
  }
  /* Heurística do "semerro": a saída tem cara de erro do PowerShell se alguma linha
     - começa com "Verbo-Substantivo: " (vista concisa do 7: "Get-Item: Cannot find path…",
       "Write-Error: …"); "Total: 35" não conta, porque não tem hífen;
     - começa com "<Algo>Error:"/"<Algo>Exception:" ou "InvalidOperation:"/"InvalidArgument:"
       (ex.: "ParserError:", "RuntimeException:");
     - é a moldura do 7 ("Line |", "     | ~~~~") ou do 5.1 ("At line:", "No linha:",
       "+ CategoryInfo", "+ FullyQualifiedErrorId");
     - traz frases típicas: "não é reconhecido", "is not recognized", "não foi possível",
       "não é possível localizar", "Cannot find", "Exception" (palavra solta).
     WARNING:/AVISO: e VERBOSE: não são erro. Pode dar falso positivo se o próprio
     programa escrever uma dessas frases. */
  var PSF_ERRO = [
    /^[A-Za-z]+-[A-Za-z]+: /,
    /^\w*(Error|Exception): ?/,
    /^(InvalidOperation|InvalidArgument|ObjectNotFound|PermissionDenied): /,
    /^\s*Line \|/,
    /^\s+\| *~+/,
    /^(At|No) (line|linha) ?:/i,
    /^\s*\+ (CategoryInfo|FullyQualifiedErrorId)/,
    /não é reconhecido|is not recognized|não foi possível|não é possível localizar|Cannot find/i,
    /\bException\b/
  ];
  function psfTemErro(saida) {
    var linhas = saida.split("\n");
    for (var i = 0; i < linhas.length; i++) {
      for (var j = 0; j < PSF_ERRO.length; j++) if (PSF_ERRO[j].test(linhas[i])) return linhas[i];
    }
    return null;
  }
  function psfCurto(s) { s = String(s); return s.length > 60 ? s.slice(0, 57) + "…" : s; }
  /* Devolve [{tipo, ok: true|false|null (manual), desc, falha?}] */
  function psfAvaliar(goal, codigo, saidaBruta) {
    var saida = psfNormaliza(saidaBruta), cod = psfNormaliza(codigo), res = [];
    String(goal || "").split(";;").forEach(function (meta) {
      if (!meta.trim()) return;
      var k = meta.indexOf(":"), tipo = (k === -1 ? meta : meta.slice(0, k)).trim(), val = k === -1 ? "" : meta.slice(k + 1);
      var r = { tipo: tipo, ok: false, desc: "" };
      function rx(flags, alvo, rotulo) {
        try { r.ok = new RegExp(val, flags).test(alvo); }
        catch (e) { r.ok = false; r.falha = "regra inválida nesta missão (" + e.message + "); avise quem mantém o guia"; }
        r.desc = rotulo;
      }
      if (tipo === "out") {
        var alvo = psfNormaliza(val);
        r.ok = alvo !== "" && saida.indexOf(alvo) !== -1;
        r.desc = "a saída mostra \u201c" + psfCurto(val) + "\u201d";
      } else if (tipo === "outre") {
        rx("m", saida, "a saída tem o padrão esperado (" + psfCurto(val) + ")");
      } else if (tipo === "src") {
        // no PowerShell maiúsculas não importam nos comandos, então o código é comparado sem diferenciar
        rx("mi", cod, "o código usa " + psfCurto(val.replace(/\\b/g, "").replace(/\\(.)/g, "$1")));
      } else if (tipo === "semerro") {
        // saída vazia conta como "sem erro": Copy-Item, New-Item etc. não mostram nada quando dão certo
        var linha = psfTemErro(saida);
        r.ok = !linha;
        r.desc = linha ? "rodar sem erros (achei: \u201c" + psfCurto(linha.trim()) + "\u201d)" : saida.trim() === "" ? "rodou sem erros (nenhuma saída colada: tudo bem se o comando não mostra nada)" : "rodou sem erros";
      } else if (tipo === "erro") {
        r.ok = val !== "" && saida.indexOf(psfNormaliza(val)) !== -1;
        r.desc = "aparece o erro \u201c" + psfCurto(val) + "\u201d";
      } else if (tipo === "exit") {
        r.ok = null; r.desc = "confira você mesmo: o código de saída é " + val + " (digite $LASTEXITCODE depois de rodar)";
      } else if (tipo === "arquivo") {
        var t = val.indexOf("~"), nome = t === -1 ? val : val.slice(0, t), cont = t === -1 ? "" : val.slice(t + 1);
        r.ok = null; r.desc = "confira você mesmo: existe \u201c" + nome + "\u201d" + (cont ? " com o texto \u201c" + psfCurto(cont) + "\u201d" : "") + " (use Test-Path / Get-Content)";
      } else {
        r.ok = null; r.desc = "confira você mesmo: " + meta;
      }
      res.push(r);
    });
    return res;
  }
  /* psf-avaliador:fim */

  if (typeof document === "undefined") return;
  if (window.PSSim || window.pssim) return; // o simulador apareceu: ele manda

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function copiar(texto, botao) {
    var rot = botao.textContent;
    var feito = function () { botao.textContent = "Copiado!"; setTimeout(function () { botao.textContent = rot; }, 1500); };
    var antigo = function () {
      var t = el("textarea", { "aria-hidden": "true" });
      t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); feito(); } catch (e) { botao.textContent = "Selecione e copie (Ctrl+C)"; }
      document.body.removeChild(t);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(feito, antigo);
    else antigo();
  }

  // o CSS do modo fica num arquivo próprio
  if (!document.querySelector('link[href$="rode-local.css"]')) {
    document.head.appendChild(el("link", { rel: "stylesheet", href: "assets/rode-local.css" }));
  }

  var n = 0;
  document.querySelectorAll(".tryps").forEach(function (box) {
    if (box.querySelector(".psf")) return;
    n++;
    var pre = box.querySelector("pre.script"), sol = box.querySelector("pre.solucao");
    var inicial = pre ? pre.textContent.replace(/^\n+/, "").replace(/\s+$/, "") : "";
    var arq = (pre && pre.getAttribute("data-file")) || "main.ps1";
    var goal = box.getAttribute("data-goal") || "";
    var id = "psf" + n;
    var head = box.querySelector(".try-head");
    if (head && /clique em Rodar/.test(head.textContent)) head.textContent = "Experimente: edite o código e rode no seu PowerShell";
    if (pre) pre.hidden = true;
    if (sol) sol.hidden = true;

    var w = el("div", { "class": "psf ts" });
    w.innerHTML =
      '<p class="psf-aviso">Este guia ainda não roda PowerShell no navegador. Copie o código, rode no seu PowerShell 7 (<code>pwsh</code>) e cole a saída abaixo. (Onde a missão diz “clique em Rodar”, rode no seu terminal.)</p>' +
      '<div class="ts-bar"><span class="ts-arq">' + esc(arq) + '</span><span class="ts-sp"></span>' +
      '<button type="button" class="sim-btn psf-copiar">Copiar código</button>' +
      '<button type="button" class="sim-btn psf-reset">Voltar ao original</button></div>' +
      '<div class="ts-editor"><label class="psf-sr" for="' + id + '-cod">Código do script ' + esc(arq) + '</label>' +
      '<textarea class="ts-code psf-cod" id="' + id + '-cod" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div>' +
      '<ol class="psf-passos"><li>Clique em <strong>Copiar código</strong>.</li><li>Cole no seu PowerShell 7 e aperte Enter.</li><li>Copie o que o PowerShell <strong>respondeu</strong> (não o comando) e cole abaixo.</li></ol>' +
      '<label class="psf-rot" for="' + id + '-out">Cole aqui o que o PowerShell respondeu (não o comando)</label>' +
      '<textarea class="psf-out" id="' + id + '-out" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Ex.: o texto que apareceu no terminal depois de você apertar Enter"></textarea>' +
      '<div class="ex-actions psf-acoes"><button type="button" class="psf-conferir">Conferir</button>' +
      '<button type="button" class="secondary psf-ver" disabled title="Liberado depois do primeiro Conferir">Ver solução</button></div>' +
      '<div class="psf-res" aria-live="polite"></div>';
    if (pre) pre.parentNode.insertBefore(w, pre); else box.appendChild(w);

    var cod = w.querySelector(".psf-cod"), out = w.querySelector(".psf-out"), resDiv = w.querySelector(".psf-res");
    var verBtn = w.querySelector(".psf-ver");
    function ajusta() { cod.rows = Math.max(3, cod.value.split("\n").length + 1); }
    cod.value = inicial; ajusta();
    cod.addEventListener("input", ajusta);
    cod.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey) { // Tab insere espaços; Esc + Tab sai do editor
        if (cod.dataset.sair) { delete cod.dataset.sair; return; }
        e.preventDefault();
        var a = cod.selectionStart, b = cod.selectionEnd;
        cod.value = cod.value.slice(0, a) + "    " + cod.value.slice(b);
        cod.selectionStart = cod.selectionEnd = a + 4; ajusta();
      } else if (e.key === "Escape") cod.dataset.sair = "1";
    });
    w.querySelector(".psf-copiar").addEventListener("click", function () { copiar(cod.value, this); });
    w.querySelector(".psf-reset").addEventListener("click", function () { cod.value = inicial; ajusta(); cod.focus(); });

    w.querySelector(".psf-conferir").addEventListener("click", function () {
      verBtn.disabled = false; verBtn.removeAttribute("title");
      // Detecta quando a pessoa colou o código em vez da saída
      var norm = function (t) { return t.replace(/\r\n?/g, "\n").replace(/^PS [^>\n]*>\s*/gm, "").replace(/\s+/g, " ").trim().toLowerCase(); };
      var colado = norm(out.value);
      if (!colado) {
        resDiv.innerHTML = '<p class="ex-result bad">Cole primeiro o que o PowerShell respondeu. Se ele não mostrou nada (alguns comandos são silenciosos quando dão certo), escreva <code>(sem saída)</code> na caixa.</p>';
        out.focus(); return;
      }
      var linhasCod = [cod.value, inicial, sol ? sol.textContent : ""].join("\n").split("\n").map(norm).filter(function (l) { return l && l.charAt(0) !== "#"; });
      var linhasCol = out.value.split("\n").map(norm).filter(Boolean);
      var soCodigo = linhasCol.length && linhasCol.every(function (l) { return linhasCod.indexOf(l) >= 0; });
      if (soCodigo || colado === norm(cod.value) || colado === norm(inicial) || (sol && colado === norm(sol.textContent))) {
        resDiv.innerHTML = '<p class="ex-result bad">Parece que você colou o <strong>código</strong>, não a saída. Rode esse código no seu PowerShell 7 e cole aqui o que ele <strong>respondeu</strong>.</p>';
        out.focus(); return;
      }
      var metas;
      try { metas = psfAvaliar(goal, cod.value, /^\s*\(sem sa[ií]da\)\s*$/i.test(out.value) ? "" : out.value); }
      catch (e) { resDiv.innerHTML = '<p class="ex-result bad">Não consegui conferir esta missão (' + esc(e.message) + ').</p>'; return; }
      var faltam = 0, manuais = 0, html = '<ul class="psf-metas">';
      metas.forEach(function (m) {
        var cls = m.ok === null ? "manual" : m.ok ? "ok" : "bad", sinal = m.ok === null ? "☐" : m.ok ? "✔" : "✘";
        if (m.ok === false) faltam++;
        if (m.ok === null) manuais++;
        html += '<li class="' + cls + '"><span class="psf-sinal" aria-hidden="true">' + sinal + "</span> " +
          '<span class="psf-sr">' + (m.ok === null ? "Conferir à mão: " : m.ok ? "Cumprida: " : "Falta: ") + "</span>" +
          esc(m.desc) + (m.falha ? ' <em class="psf-falha">(' + esc(m.falha) + ")</em>" : "") + "</li>";
      });
      html += "</ul>";
      if (!metas.length) html = "";
      var fim = faltam ? '<p class="ex-result bad">Ainda não: falta' + (faltam > 1 ? "m " + faltam + " metas" : " 1 meta") + ' (marcada' + (faltam > 1 ? "s" : "") + " com ✘). Ajuste e rode de novo." + (out.value.trim() ? "" : " Você colou a saída do terminal na caixa acima?") + "</p>"
        : '<p class="ex-result ok">Missão cumprida!' + (manuais ? " Só falta você conferir o" + (manuais > 1 ? "s itens marcados" : " item marcado") + " com ☐." : "") + "</p>";
      resDiv.innerHTML = html + fim;
    });

    verBtn.addEventListener("click", function () {
      if (!sol) return;
      var caixa = w.querySelector(".sim-sol");
      if (caixa) { caixa.hidden = !caixa.hidden; verBtn.textContent = caixa.hidden ? "Ver solução" : "Esconder solução"; return; }
      var txt = sol.textContent.replace(/^\n+/, "").replace(/\s+$/, "");
      caixa = el("div", { "class": "sim-sol" },
        '<p class="sim-sol-tit">Uma solução possível</p><pre class="sim-sol-cmd">' + esc(txt) + "</pre>" +
        '<button type="button" class="sim-btn2 secundario psf-usar">Colocar no editor</button>');
      resDiv.parentNode.insertBefore(caixa, resDiv.nextSibling);
      caixa.querySelector(".psf-usar").addEventListener("click", function () { cod.value = txt; ajusta(); cod.focus(); });
      verBtn.textContent = "Esconder solução";
    });
  });
})();
