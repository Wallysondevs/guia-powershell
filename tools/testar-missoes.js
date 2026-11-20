#!/usr/bin/env node
/* =========================================================
   Testador das missões (.tryps) do Guia PowerShell.
   Roda o pre.solucao (deve cumprir o data-goal) e o pre.script
   inicial (não deve cumprir, salvo quando já é igual à solução).

   Uso:
     node tools/testar-missoes.js
     node tools/testar-missoes.js --secao "Começando"
     node tools/testar-missoes.js --secao "Pastas e Arquivos"
     node tools/testar-missoes.js --pssim assets/pssim.js

   O avaliador de data-goal é recortado de assets/rode-local.js
   (trecho psf-avaliador). Contrato do pssim (Zeca): o arquivo define
   o global PSSim (ou pssim) com PSSim.run(codigo) e, no navegador,
   PSSim.caixas[i].testar("inicial"|"solucao") → {ok, metas, saida}.
   O testador em Node usa PSSim.run; o testar-navegador.js usa .testar.
   ========================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MISSOES = path.join(__dirname, "missoes.json");
const DEFAULT_PSSIM = path.join(ROOT, "assets", "pssim.js");
const RODE_LOCAL = path.join(ROOT, "assets", "rode-local.js");

function uso() {
  return [
    "Uso: node tools/testar-missoes.js [--secao NOME] [--pssim CAMINHO] [--missoes CAMINHO]",
    "  --secao     filtra pela seção do NIVEIS (ex.: Começando, \"Pastas e Arquivos\")",
    "  --pssim     caminho do simulador (padrão: assets/pssim.js)",
    "  --missoes   inventário JSON (padrão: tools/missoes.json)"
  ].join("\n");
}

function args() {
  const out = { secao: null, pssim: DEFAULT_PSSIM, missoes: DEFAULT_MISSOES };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--secao" && a[i + 1]) out.secao = a[++i];
    else if (a[i] === "--pssim" && a[i + 1]) out.pssim = path.resolve(a[++i]);
    else if (a[i] === "--missoes" && a[i + 1]) out.missoes = path.resolve(a[++i]);
    else if (a[i] === "--help" || a[i] === "-h") { console.log(uso()); process.exit(0); }
    else {
      console.error("Opção desconhecida: " + a[i] + "\n" + uso());
      process.exit(2);
    }
  }
  return out;
}

function carregarAvaliador() {
  if (!fs.existsSync(RODE_LOCAL)) {
    throw new Error("não achei assets/rode-local.js (preciso do avaliador de data-goal).");
  }
  const src = fs.readFileSync(RODE_LOCAL, "utf8");
  const m = src.match(/\/\* psf-avaliador:inicio[^*]*\*\/\s*([\s\S]*?)\s*\/\* psf-avaliador:fim \*\//);
  if (!m) throw new Error("não achei o trecho psf-avaliador em rode-local.js.");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    m[1] + "\nthis.psfAvaliar = psfAvaliar;\nthis.psfNormaliza = psfNormaliza;\n",
    ctx,
    { filename: "rode-local.js#avaliador" }
  );
  if (typeof ctx.psfAvaliar !== "function") {
    throw new Error("o trecho recortado de rode-local.js não exportou psfAvaliar.");
  }
  return ctx;
}

function shimDocument() {
  function el() {
    return {
      style: {},
      classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
      setAttribute() {},
      getAttribute() { return null; },
      appendChild() { return this; },
      insertBefore() { return this; },
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      textContent: "",
      innerHTML: "",
      value: ""
    };
  }
  return {
    documentElement: el(),
    body: el(),
    head: el(),
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() { return el(); },
    createTextNode() { return el(); },
    addEventListener() {}
  };
}

function carregarPssim(pssimPath) {
  const code = fs.readFileSync(pssimPath, "utf8");
  const sandbox = {
    console,
    setTimeout, clearTimeout,
    setInterval, clearInterval,
    Buffer,
    process: { env: {} }
  };
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.document = shimDocument();
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: pssimPath, displayErrors: true });
  const sim = sandbox.PSSim || sandbox.pssim;
  if (!sim) {
    throw new Error("pssim.js carregou, mas não definiu o global PSSim nem pssim (o site.js procura um dos dois, de forma síncrona).");
  }
  const run = typeof sim.run === "function" ? sim.run.bind(sim)
    : (typeof sim === "function" ? sim : null);
  if (typeof run !== "function") {
    throw new Error("O global PSSim/pssim precisa oferecer run(codigo) — ver o contrato no QUADRO.md.");
  }
  return function rodar(codigo) {
    const r = run(codigo);
    if (r && typeof r.then === "function") {
      throw new Error("PSSim.run deve ser síncrono no testador (sem Promise).");
    }
    if (r == null) return { saida: "", exitCode: 0, arquivos: {} };
    if (typeof r === "string") return { saida: r, exitCode: 0, arquivos: {} };
    return {
      saida: r.saida != null ? String(r.saida) : String(r.stdout || ""),
      exitCode: r.exitCode,
      arquivos: r.arquivos || r.files || {}
    };
  };
}

function nomeArquivo(mapa, nome) {
  if (!mapa || nome == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(mapa, nome)) return mapa[nome];
  const baixo = String(nome).replace(/\\/g, "/").replace(/^\.\//, "");
  for (const k of Object.keys(mapa)) {
    if (String(k).replace(/\\/g, "/").replace(/^\.\//, "") === baixo) return mapa[k];
  }
  return undefined;
}

function avaliarCompleto(avaliador, goal, codigo, resultado) {
  const saida = resultado && resultado.saida != null ? resultado.saida : "";
  const metas = avaliador.psfAvaliar(goal, codigo, saida).map(function (m) {
    const r = { tipo: m.tipo, ok: m.ok, desc: m.desc, falha: m.falha };
    if (m.ok !== null) return r;
    const val = (function () {
      const parts = String(goal || "").split(";;");
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        const k = p.indexOf(":");
        const tipo = (k === -1 ? p : p.slice(0, k)).trim();
        if (tipo === m.tipo) return k === -1 ? "" : p.slice(k + 1);
      }
      return "";
    })();
    // No pssim o comando de fato rodou: saída vazia é sucesso do semerro
    // (New-Item, Copy-Item…). No rode-local a pasta vazia é outro caso
    // (não confere; "(sem saída)" vira ☐) — ver testar-navegador.js.
    if (m.tipo === "semerro") {
      r.ok = true;
      r.desc = m.desc || "rodou sem erros";
      return r;
    }
    if (m.tipo === "exit") {
      const esperado = Number(val);
      r.ok = resultado.exitCode != null && Number(resultado.exitCode) === esperado;
      if (!r.ok) r.falha = "exitCode=" + (resultado.exitCode == null ? "(ausente)" : resultado.exitCode) + ", esperado " + val;
    } else if (m.tipo === "arquivo") {
      const t = val.indexOf("~"), nome = t === -1 ? val : val.slice(0, t), cont = t === -1 ? "" : val.slice(t + 1);
      const achado = nomeArquivo(resultado.arquivos, nome);
      if (achado === undefined || achado === null) {
        r.ok = false;
        r.falha = "não achei o arquivo “" + nome + "” no estado devolvido por PSSim.run";
      } else if (cont) {
        const norm = avaliador.psfNormaliza;
        r.ok = norm(String(achado)).indexOf(norm(cont)) !== -1;
        if (!r.ok) r.falha = "o arquivo “" + nome + "” existe, mas não contém “" + cont + "”";
      } else {
        r.ok = true;
      }
    } else {
      r.ok = false;
      r.falha = "meta manual (“" + m.tipo + "”) sem checagem automática";
    }
    return r;
  });
  const falhas = metas.filter(function (m) { return m.ok !== true; });
  return { metas, ok: falhas.length === 0, falhas };
}

function motivoDe(prefixo, ev, erro) {
  if (erro) return prefixo + "erro ao rodar: " + (erro.message || String(erro));
  if (!ev || ev.ok) return "";
  return ev.falhas.map(function (f) {
    return prefixo + (f.falha || f.desc || f.tipo);
  }).join("; ");
}

function pad(s, n) {
  s = String(s == null ? "" : s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function main() {
  const opt = args();
  if (!fs.existsSync(opt.pssim)) {
    console.error(
      "Não achei " + opt.pssim + ".\n" +
      "O simulador ainda não existe (quem escreve o assets/pssim.js é o Zeca).\n" +
      "Quando o arquivo estiver no lugar e definir o global PSSim (ou pssim) com PSSim.run(codigo), rode de novo:\n" +
      "  node tools/testar-missoes.js\n" +
      "  node tools/testar-missoes.js --secao \"Começando\"\n" +
      "  node tools/testar-missoes.js --secao \"Pastas e Arquivos\""
    );
    process.exit(2);
  }

  let inventario;
  try { inventario = JSON.parse(fs.readFileSync(opt.missoes, "utf8")); }
  catch (e) {
    console.error("Não consegui ler o inventário " + opt.missoes + ": " + e.message);
    process.exit(2);
  }
  let lista = inventario.missoes || inventario;
  if (opt.secao) {
    const alvo = opt.secao.toLowerCase();
    lista = lista.filter(function (m) { return String(m.secao || "").toLowerCase() === alvo; });
    if (!lista.length) {
      console.error("Nenhuma missão na seção “" + opt.secao + "”. Seções: " +
        Object.keys(inventario.por_secao || {}).join(", "));
      process.exit(2);
    }
  }

  const avaliador = carregarAvaliador();
  let rodar;
  try { rodar = carregarPssim(opt.pssim); }
  catch (e) {
    console.error("Falha ao carregar o simulador: " + e.message);
    process.exit(2);
  }

  const linhas = [];
  let passou = 0, falhou = 0;

  lista.forEach(function (m) {
    const inicialIgual = !!m.inicial_igual_solucao || (m.script || "") === (m.solucao || "");
    let evSol, evIni, errSol, errIni;
    try { evSol = avaliarCompleto(avaliador, m.goal, m.solucao, rodar(m.solucao || "")); }
    catch (e) { errSol = e; }
    try { evIni = avaliarCompleto(avaliador, m.goal, m.script, rodar(m.script || "")); }
    catch (e) { errIni = e; }

    const solOk = !errSol && evSol && evSol.ok;
    // O script inicial não deve cumprir a meta — a menos que já seja a solução.
    const iniOkEsperado = inicialIgual ? (!errIni && evIni && evIni.ok)
      : (errIni || (evIni && !evIni.ok));
    const ok = solOk && iniOkEsperado;
    const motivos = [];
    if (!solOk) motivos.push(motivoDe("solução: ", evSol, errSol) || "solução não cumpriu o data-goal");
    if (inicialIgual) {
      if (!iniOkEsperado) motivos.push(motivoDe("inicial (= solução): ", evIni, errIni) || "a inicial é a solução, mas não passou");
    } else if (evIni && evIni.ok && !errIni) {
      motivos.push("inicial cumpriu o data-goal (deveria falhar; é o código incompleto da página)");
    }
    linhas.push({
      id: m.id,
      secao: m.secao,
      ok,
      inicial: inicialIgual ? (iniOkEsperado ? "já completa" : "FALHOU") : (iniOkEsperado ? "não passou" : "PASSOU (ruim)"),
      solucao: solOk ? "passou" : "FALHOU",
      motivo: motivos.join(" · ")
    });
    if (ok) passou++; else falhou++;
  });

  const wId = Math.max(16, ...linhas.map(function (l) { return l.id.length; }));
  const wSec = Math.max(10, ...linhas.map(function (l) { return l.secao.length; }));
  console.log(pad("id", wId) + "  " + pad("seção", wSec) + "  " + pad("inicial", 14) + "  " + pad("solução", 8) + "  motivo");
  console.log("-".repeat(wId + wSec + 14 + 8 + 12));
  linhas.forEach(function (l) {
    const marca = l.ok ? "ok" : "FALHOU";
    console.log(
      pad(l.id, wId) + "  " + pad(l.secao, wSec) + "  " + pad(l.inicial, 14) + "  " + pad(l.solucao, 8) + "  " +
      (l.ok ? marca : (marca + (l.motivo ? " — " + l.motivo : "")))
    );
  });
  console.log("-".repeat(wId + wSec + 14 + 8 + 12));
  console.log(
    "Total: " + linhas.length + " missão(ões)" +
    (opt.secao ? " na seção “" + opt.secao + "”" : "") +
    " — " + passou + " passaram, " + falhou + " falharam."
  );
  console.log("Critério: a solução cumpre o data-goal; o script inicial não cumpre (exceto quando já é igual à solução).");
  process.exit(falhou ? 1 : 0);
}

try { main(); }
catch (e) {
  console.error(e.stack || e.message || String(e));
  process.exit(2);
}
