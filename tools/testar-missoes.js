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

   Quando o pssim está carregado, as metas são avaliadas pelo próprio
   simulador: PSSim.testar(goal, codigo) (ou PSSim.avaliar). O semerro
   usa os erros reais do pssim e o exitCode — não uma heurística no
   texto da saída (o aviso "cannot find the Help files" do Get-Help
   não é erro). Contrato do simulador: PSSim.run(codigo); no navegador,
   PSSim.caixas[i].testar("inicial"|"solucao") → {ok, metas, saida}.
   ========================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MISSOES = path.join(__dirname, "missoes.json");
const DEFAULT_PSSIM = path.join(ROOT, "assets", "pssim.js");

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
  const resolved = path.resolve(pssimPath);
  let sim = null;
  try {
    delete require.cache[resolved];
    sim = require(resolved);
  } catch (e) {
    const code = fs.readFileSync(resolved, "utf8");
    const sandbox = {
      console,
      setTimeout, clearTimeout,
      setInterval, clearInterval,
      Buffer,
      process: { env: {} },
      module: { exports: {} },
      exports: {}
    };
    sandbox.module.exports = sandbox.exports;
    sandbox.globalThis = sandbox;
    sandbox.global = sandbox;
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.document = shimDocument();
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: resolved, displayErrors: true });
    sim = sandbox.PSSim || sandbox.pssim || sandbox.module.exports;
  }
  if (!sim || (typeof sim !== "object" && typeof sim !== "function")) {
    throw new Error("pssim.js carregou, mas não definiu o global PSSim nem pssim (o site.js procura um dos dois, de forma síncrona).");
  }
  if (typeof sim.testar !== "function" && typeof sim.avaliar !== "function" && typeof sim.run !== "function") {
    throw new Error("O global PSSim/pssim precisa oferecer testar(goal, codigo) ou avaliar(goal, codigo) — ver o contrato no começo deste arquivo.");
  }
  return sim;
}

function textoSaida(s, n) {
  s = s == null ? "" : String(s);
  n = n || 200;
  s = s.replace(/\s+$/, "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function avaliarComPssim(sim, goal, codigo) {
  let t;
  if (typeof sim.testar === "function") {
    t = sim.testar(goal, codigo);
    if (t && typeof t.then === "function") {
      throw new Error("PSSim.testar deve ser síncrono no testador (sem Promise).");
    }
  } else if (typeof sim.avaliar === "function") {
    const metas = sim.avaliar(goal, codigo);
    t = {
      metas: metas || [],
      ok: !!(metas && metas.length && metas.every(function (m) { return m.ok === true; })),
      saida: undefined
    };
  } else {
    // último recurso: PSSim.run + erros/exitCode que o pssim reporta (sem olhar /Cannot find/ na saída)
    const run = typeof sim.run === "function" ? sim.run.bind(sim) : sim;
    const r = run(codigo);
    if (r && typeof r.then === "function") {
      throw new Error("PSSim.run deve ser síncrono no testador (sem Promise).");
    }
    const erros = (r && r.erros) || (r && r.erro != null && r.erro !== "" ? [r.erro] : []);
    const metas = String(goal || "").split(";;").map(function (meta) {
      meta = meta.trim();
      if (!meta) return null;
      const k = meta.indexOf(":"), tipo = (k === -1 ? meta : meta.slice(0, k)).trim();
      if (tipo === "semerro") {
        return { tipo: tipo, ok: erros.length === 0, desc: erros.length ? ("rodar sem erros (apareceu: " + erros[0] + ")") : "rodou sem erros", falha: erros.length ? String(erros[0]).split("\n")[0] : undefined };
      }
      if (tipo === "exit") {
        const val = k === -1 ? "" : meta.slice(k + 1);
        const ok = r && r.exitCode != null && Number(r.exitCode) === Number(val);
        return { tipo: tipo, ok: ok, desc: "o código de saída é " + val, falha: ok ? undefined : "exitCode=" + (r && r.exitCode) };
      }
      return { tipo: tipo, ok: false, desc: tipo, falha: "sem PSSim.testar/avaliar, não avalio a meta “" + tipo + "”" };
    }).filter(Boolean);
    t = { metas: metas, ok: metas.length > 0 && metas.every(function (m) { return m.ok === true; }), saida: r && r.saida };
  }
  const metas = (t && t.metas) || [];
  const falhas = metas.filter(function (m) { return m.ok !== true; });
  return { metas: metas, ok: !!(t && t.ok) && falhas.length === 0, falhas: falhas, saida: t && t.saida };
}

function motivoDe(prefixo, ev, erro) {
  if (erro) return prefixo + "erro ao rodar: " + (erro.message || String(erro));
  if (!ev || ev.ok) return "";
  const metas = ev.falhas.map(function (f) {
    return prefixo + (f.falha || f.desc || f.tipo);
  }).join("; ");
  const saida = ev.saida != null && String(ev.saida).length ? prefixo + "saída: " + JSON.stringify(textoSaida(ev.saida, 160)) : "";
  return saida ? metas + (metas ? "; " : "") + saida : metas;
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
      "O simulador (assets/pssim.js) não foi encontrado.\n" +
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

  let sim;
  try { sim = carregarPssim(opt.pssim); }
  catch (e) {
    console.error("Falha ao carregar o simulador: " + e.message);
    process.exit(2);
  }

  const linhas = [];
  let passou = 0, falhou = 0;

  lista.forEach(function (m) {
    const inicialIgual = !!m.inicial_igual_solucao || (m.script || "") === (m.solucao || "");
    let evSol, evIni, errSol, errIni;
    try { evSol = avaliarComPssim(sim, m.goal, m.solucao || ""); }
    catch (e) { errSol = e; }
    try { evIni = avaliarComPssim(sim, m.goal, m.script || ""); }
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
