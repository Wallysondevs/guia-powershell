#!/usr/bin/env node
// testar-navegador.js — abre páginas do Guia PowerShell num Chrome headless e confere as missões.
//
//   timeout 600 node tools/testar-navegador.js pagina.html [outra.html…]
//   timeout 3600 node tools/testar-navegador.js --todas          (todas as .html da raiz)
//   --fotos DIR   salva um print de página inteira de cada uma em DIR (claro e escuro)
//   -q            mostra só as páginas com problema (e o resumo)
//   --rode-local  força o plano B: o servidor responde 404 em assets/pssim.js
//                 e as caixas são conferidas no modo rode-local (a273e59)
//
// Sobe um servidor HTTP estático em 127.0.0.1 (porta livre). Em cada página:
// erro de JS/console/HTTP = problema; requisição externa = problema (tem que
// dar zero). O 404 de assets/pssim.js só é ignorado com --rode-local.
// Menu montado; um h1.
//
// Se window.PSSim existir (contrato do simulador):
//   PSSim.caixas[i].testar("inicial"|"solucao") → {ok, metas, saida}
//   missão = o inicial NÃO dá ok e a solução dá ok
//   (se o script inicial já é a solução, os dois podem dar ok).
// Se não existir, cai no modo rode-local (a273e59):
//   campo vazio → "Cole primeiro o que o PowerShell respondeu", zero ✔;
//   colar o script, a solução, ou os mesmos com o prompt "PS C:\Users\ana>"
//     → não dá ✔ nem "Missão cumprida!";
//   "(sem saída)" → semerro vira ☐, sem ✔ automático;
//   quando só sobram ☐ → "Quase lá!", nunca "Missão cumprida!".
//
// puppeteer-core em tools/node_modules (ou PUPPETEER_DIR).
// CHROMIUM=/usr/bin/google-chrome (ou a variável CHROMIUM).
// Código de saída: 0 = tudo ok; 1 = alguma página com problema; 2 = uso errado.
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

const RAIZ = path.join(__dirname, "..");
const PUP = process.env.PUPPETEER_DIR || path.join(__dirname, "node_modules", "puppeteer-core");
const CHROMIUM = process.env.CHROMIUM || "/usr/bin/google-chrome";

const args = process.argv.slice(2);
let fotos = null, quieto = false, forcarRodeLocal = false;
const paginas = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--todas") fs.readdirSync(RAIZ).filter((f) => /\.html$/.test(f)).sort().forEach((f) => paginas.push(f));
  else if (a === "--fotos") fotos = path.resolve(args[++i] || "fotos");
  else if (a === "-q") quieto = true;
  else if (a === "--rode-local") forcarRodeLocal = true;
  else if (a.startsWith("-")) { console.error("opção desconhecida: " + a); process.exit(2); }
  else paginas.push(fs.existsSync(path.join(RAIZ, a)) ? a : path.basename(a));
}
if (!paginas.length) {
  console.error("uso: timeout 600 node tools/testar-navegador.js [--fotos DIR] [-q] [--rode-local] pagina.html…|--todas");
  process.exit(2);
}
if (fotos) fs.mkdirSync(fotos, { recursive: true });

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};
function servidor() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    if (forcarRodeLocal && /\/assets\/pssim\.js$/i.test(p)) { res.writeHead(404); res.end("404"); return; }
    const arq = path.join(RAIZ, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || !fs.statSync(arq).isFile()) {
      res.writeHead(404); res.end("404"); return;
    }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] || "application/octet-stream", "Cache-Control": "max-age=600" });
    fs.createReadStream(arq).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
function ehPssimJs(url) { return /\/assets\/pssim\.js(\?|$)/.test(url); }
function ignoraEsperado(url) { return /favicon/.test(url) || (forcarRodeLocal && ehPssimJs(url)); }
function ehExterna(url, base) {
  if (!url || /^(data:|blob:|about:|chrome:|chrome-extension:)/i.test(url)) return false;
  if (url.startsWith(base)) return false;
  try {
    const u = new URL(url);
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost") return false;
  } catch (e) { return false; }
  return true;
}

/* ------------------ API do pssim: caixas[i].testar("inicial"|"solucao") */
async function testarCaixa(pg, i, qual, limite = 20000) {
  await pg.evaluate((i, qual) => {
    window.__res = window.__res || {};
    window.__res[i] = null;
    const sim = window.PSSim || window.pssim;
    const r = sim.caixas[i].testar(qual);
    Promise.resolve(r).then((v) => { window.__res[i] = v && typeof v === "object" ? v : { ok: !!v, metas: [], saida: "" }; },
      (e) => { window.__res[i] = { erro: e && e.message ? e.message : String(e) }; });
  }, i, qual);
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    const r = await pg.evaluate((i) => window.__res[i], i);
    if (r) return r;
    await dormir(60);
  }
  return { semResposta: true };
}

function iniciaisIguais(script, solucao) {
  const n = (s) => String(s || "").replace(/^\n+/, "").replace(/\s+$/, "");
  return n(script) === n(solucao);
}

async function testarComPssim(pg, problemas, notas) {
  await pg.waitForFunction(() => {
    const s = window.PSSim || window.pssim;
    return !!(s && Array.isArray(s.caixas));
  }, { timeout: 20000 });
  const n = await pg.evaluate(() => (window.PSSim || window.pssim).caixas.length);
  const nTryps = await pg.evaluate(() => document.querySelectorAll(".tryps").length);
  if (n !== nTryps) problemas.push("PSSim.caixas = " + n + ", .tryps = " + nTryps);
  for (let i = 0; i < n; i++) {
    const c = await pg.evaluate((i) => {
      const sim = window.PSSim || window.pssim;
      const caixa = sim.caixas[i];
      const box = caixa.box || caixa.el || document.querySelectorAll(".tryps")[i];
      const goal = box && box.getAttribute("data-goal");
      const script = box && box.querySelector("pre.script") ? box.querySelector("pre.script").textContent : "";
      const solEl = box && box.querySelector("pre.solucao");
      return { goal: goal || "", temSol: !!solEl, script, solucao: solEl ? solEl.textContent : "" };
    }, i);
    const nome = "caixa " + (i + 1);
    if (!c.goal) { notas.push(nome + ": sem data-goal, não testada como missão"); continue; }
    if (!c.temSol) { problemas.push(nome + ": missão sem pre.solucao"); continue; }
    stats.pssimCaixas++;
    const antes = problemas.length;
    const ini = await testarCaixa(pg, i, "inicial");
    if (ini.semResposta) { problemas.push(nome + ": o inicial não terminou em 20 s"); continue; }
    if (ini.erro) { problemas.push(nome + ": testar(\"inicial\") falhou: " + ini.erro); continue; }
    const sol = await testarCaixa(pg, i, "solucao");
    if (sol.semResposta) { problemas.push(nome + ": a solução não terminou em 20 s"); continue; }
    if (sol.erro) { problemas.push(nome + ": testar(\"solucao\") falhou: " + sol.erro); continue; }
    const jaCompleta = iniciaisIguais(c.script, c.solucao);
    if (ini.ok && !jaCompleta) problemas.push(nome + ": o inicial já cumpre a meta (ok=true)");
    if (jaCompleta && !ini.ok) problemas.push(nome + ": o inicial é a solução, mas testar(\"inicial\") não deu ok");
    if (!sol.ok) {
      const falhas = Array.isArray(sol.metas) ? sol.metas.filter((m) => m && m.ok !== true).map((m) => m.falha || m.desc || m.tipo).join(" ;; ") : "";
      problemas.push(nome + ": a solução não deu ok" + (falhas ? " (" + falhas + ")" : "") +
        (sol.saida != null ? " (saída: " + JSON.stringify(String(sol.saida).slice(0, 200)) + ")" : ""));
    }
    if (problemas.length > antes) stats.pssimFalhou++;
    else stats.pssimOk++;
  }
}

/* ------------------ modo rode-local (pssim ausente), critérios a273e59 */
async function conferir(pg, i, textoOut, codigo) {
  return pg.evaluate((i, textoOut, codigo) => {
    const box = document.querySelectorAll(".tryps")[i];
    const out = box.querySelector(".psf-out");
    const btn = box.querySelector(".psf-conferir");
    const res = box.querySelector(".psf-res");
    const cod = box.querySelector(".psf-cod");
    if (codigo != null && cod) {
      cod.value = codigo;
      if (typeof Event === "function") cod.dispatchEvent(new Event("input"));
    }
    if (!out || !btn || !res) return { erro: "caixa rode-local incompleta (.psf-out / .psf-conferir / .psf-res)" };
    out.value = textoOut;
    btn.click();
    const html = res.innerHTML || "";
    const texto = (res.innerText || res.textContent || "").replace(/\s+/g, " ").trim();
    return {
      html, texto,
      ticks: (html.match(/✔/g) || []).length,
      manuais: (html.match(/☐/g) || []).length,
      falhas: (html.match(/✘/g) || []).length
    };
  }, i, textoOut, codigo == null ? null : codigo);
}

function soSrcOuSemerro(goal) {
  const partes = String(goal || "").split(";;").map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return false;
  return partes.every((p) => {
    const tipo = (p.indexOf(":") === -1 ? p : p.slice(0, p.indexOf(":"))).trim();
    return tipo === "semerro" || tipo === "src";
  });
}

const stats = {
  caixas: 0,
  negativos: 0,
  falsoPositivo: 0,
  quaseLa: 0,
  quaseLaFalhou: 0,
  pssimCaixas: 0,
  pssimOk: 0,
  pssimFalhou: 0,
  console: 0,
  externas: 0
};

function casoNegativo(nome, caso, r, problemas) {
  stats.negativos++;
  if (r.erro) {
    problemas.push(nome + ": " + caso + ": " + r.erro);
    return;
  }
  const ticks = r.ticks || 0;
  const cumpriu = /Missão cumprida/.test(r.texto);
  if (ticks !== 0 || cumpriu) {
    stats.falsoPositivo++;
    const det = [];
    if (ticks) det.push(ticks + " ✔");
    if (cumpriu) det.push("“Missão cumprida!”");
    problemas.push(nome + ": caso negativo “" + caso + "” deu " + det.join(" e ") +
      " (viu: " + JSON.stringify(r.texto).slice(0, 160) + ")");
  }
}

async function testarComRodeLocal(pg, problemas, notas) {
  const okUi = await pg.waitForFunction(() => {
    const caixas = document.querySelectorAll(".tryps");
    if (!caixas.length) return true;
    return !!document.querySelector(".tryps .psf");
  }, { timeout: 15000 }).then(() => true, () => false);
  const n = await pg.evaluate(() => document.querySelectorAll(".tryps").length);
  const montadas = await pg.evaluate(() => document.querySelectorAll(".tryps .psf").length);
  if (n && !okUi) { problemas.push("rode-local não montou as caixas .tryps em 15 s"); return; }
  if (montadas !== n) problemas.push("caixas rode-local montadas " + montadas + "/" + n);
  if (!n) { notas.push("página sem .tryps"); return; }
  notas.push("modo rode-local (PSSim ausente); " + n + " caixa(s)");

  for (let i = 0; i < n; i++) {
    const c = await pg.evaluate((i) => {
      const box = document.querySelectorAll(".tryps")[i];
      const pre = box.querySelector("pre.script");
      const sol = box.querySelector("pre.solucao");
      const trim = (s) => String(s || "").replace(/^\n+/, "").replace(/\s+$/, "");
      return {
        goal: box.getAttribute("data-goal") || "",
        script: pre ? trim(pre.textContent) : "",
        solucao: sol ? trim(sol.textContent) : ""
      };
    }, i);
    const nome = "caixa " + (i + 1);
    stats.caixas++;
    const prompt = "PS C:\\Users\\ana> ";

    const vazio = await conferir(pg, i, "");
    if (vazio.erro) { problemas.push(nome + ": " + vazio.erro); continue; }
    casoNegativo(nome, "campo vazio", vazio, problemas);
    if (!/Cole primeiro o que o PowerShell respondeu/.test(vazio.texto)) {
      problemas.push(nome + ": campo vazio deveria pedir para colar a resposta (viu: " + JSON.stringify(vazio.texto).slice(0, 160) + ")");
    }

    casoNegativo(nome, "só o prompt", await conferir(pg, i, "PS C:\\Users\\ana>"), problemas);
    if (c.script) {
      casoNegativo(nome, "colar o script", await conferir(pg, i, c.script), problemas);
      casoNegativo(nome, "colar o script com prompt", await conferir(pg, i, prompt + c.script), problemas);
    }
    if (c.solucao) {
      casoNegativo(nome, "colar a solução", await conferir(pg, i, c.solucao), problemas);
      casoNegativo(nome, "colar a solução com prompt", await conferir(pg, i, prompt + c.solucao), problemas);
    }

    const marc = await conferir(pg, i, "(sem saída)", c.solucao || null);
    if (marc.erro) { problemas.push(nome + ": " + marc.erro); continue; }
    const semerroManual = /confirme que o comando executou sem erros no seu terminal/.test(marc.texto);
    const temSemerro = /(^|;;)\s*semerro\b/.test(c.goal);
    if (temSemerro) {
      if (!semerroManual) problemas.push(nome + ": com “(sem saída)” o semerro deveria virar ☐ “confirme que o comando executou sem erros no seu terminal”");
    }
    if (/Missão cumprida/.test(marc.texto)) {
      problemas.push(nome + ": com “(sem saída)” apareceu “Missão cumprida!” (o esperado, se só sobram ☐, é “Quase lá!”)");
    }
    if (soSrcOuSemerro(c.goal) && c.solucao) {
      if (marc.falhas) problemas.push(nome + ": missão só src/semerro com a solução e “(sem saída)” ainda tem ✘: " + JSON.stringify(marc.texto).slice(0, 160));
      if (/Quase lá!/.test(marc.texto) && !marc.falhas) stats.quaseLa++;
      else {
        stats.quaseLaFalhou++;
        if (!/Quase lá!/.test(marc.texto)) {
          problemas.push(nome + ": no positivo (só src/semerro) o esperado é “Quase lá!”, viu: " + JSON.stringify(marc.texto).slice(0, 160));
        }
      }
    }
  }
}

async function testarPagina(nav, base, pagina) {
  const pg = await nav.newPage();
  const erros = [], problemas = [], notas = [];
  await pg.setViewport({ width: 1280, height: 900 });
  pg.on("pageerror", (e) => { stats.console++; erros.push("JS: " + e.message); });
  pg.on("console", (m) => {
    if (m.type() !== "error") return;
    if (ignoraEsperado(m.text()) || /Failed to load resource/.test(m.text())) return;
    stats.console++;
    erros.push("console: " + m.text());
  });
  pg.on("request", (r) => {
    if (ehExterna(r.url(), base)) {
      stats.externas++;
      erros.push("requisição externa: " + r.url());
    }
  });
  pg.on("requestfailed", (r) => {
    if (!ignoraEsperado(r.url())) erros.push("falhou: " + r.url().replace(base, "") + " " + ((r.failure() || {}).errorText || ""));
  });
  pg.on("response", (r) => {
    if (r.status() >= 400 && !ignoraEsperado(r.url())) erros.push("HTTP " + r.status() + ": " + r.url().replace(base, ""));
  });
  pg.on("dialog", (d) => { erros.push("diálogo inesperado: " + d.message()); d.dismiss().catch(() => {}); });
  try {
    await pg.goto(base + pagina, { waitUntil: "load", timeout: 30000 });
    const info = await pg.evaluate(() => ({
      menu: document.querySelectorAll(".sidebar a").length,
      h1: document.querySelectorAll("h1").length,
      caixas: document.querySelectorAll(".tryps").length,
      pssim: !!(window.PSSim || window.pssim)
    }));
    if (!info.menu) problemas.push("menu lateral sem links (site.js não montou?)");
    if (info.h1 !== 1) problemas.push(info.h1 + " h1 na página");

    if (info.pssim) {
      notas.push("modo PSSim");
      try { await testarComPssim(pg, problemas, notas); }
      catch (e) { problemas.push("falha no caminho PSSim: " + e.message); }
    } else if (info.caixas) {
      try { await testarComRodeLocal(pg, problemas, notas); }
      catch (e) { problemas.push("falha no caminho rode-local: " + e.message); }
    } else {
      notas.push("página sem .tryps e sem PSSim");
    }

    if (fotos) {
      const nome = pagina.replace(/\.html$/, "");
      await pg.evaluate(() => window.scrollTo(0, 0));
      await pg.screenshot({ path: path.join(fotos, nome + ".png"), fullPage: true });
      await pg.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await pg.screenshot({ path: path.join(fotos, nome + "-escuro.png"), fullPage: true });
    }
    return { info, erros, problemas, notas };
  } finally { await pg.close(); }
}

(async () => {
  let puppeteer;
  try { puppeteer = require(PUP); }
  catch (e) {
    console.error("não achei o puppeteer-core em " + PUP + " (instale em tools/node_modules ou defina PUPPETEER_DIR)");
    process.exit(2);
  }
  if (!fs.existsSync(CHROMIUM)) {
    console.error("não achei o Chrome em " + CHROMIUM + " (defina CHROMIUM)");
    process.exit(2);
  }
  const srv = await servidor();
  const base = "http://127.0.0.1:" + srv.address().port + "/";
  const nav = await puppeteer.launch({ executablePath: CHROMIUM, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  let ruins = 0;
  try {
    for (const p of paginas) {
      if (!fs.existsSync(path.join(RAIZ, p))) { console.log("✗ " + p + "  página não existe"); ruins++; continue; }
      const t0 = Date.now();
      let r;
      try { r = await testarPagina(nav, base, p); }
      catch (e) { r = { info: {}, erros: [], problemas: ["o teste quebrou: " + e.message], notas: [] }; }
      const ruim = r.erros.length || r.problemas.length;
      if (ruim) ruins++;
      if (ruim || !quieto) {
        const i = r.info || {};
        const modo = i.pssim ? "PSSim" : (i.caixas ? "rode-local" : "sem caixas");
        console.log((ruim ? "✗ " : "✓ ") + p + "  caixas=" + (i.caixas ?? "?") + "  " + modo + "  (" + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
        r.erros.concat(r.problemas).forEach((x) => console.log("    " + x));
        if (!quieto) r.notas.forEach((x) => console.log("    · " + x));
      }
    }
  } finally {
    await nav.close();
    srv.close();
  }
  const linhas = [
    paginas.length + " página(s), " + ruins + " com problema" + (fotos ? "; prints em " + fotos : "") +
      (forcarRodeLocal ? "; modo forçado: rode-local" : ""),
    "caixas PSSim.caixas.testar: " + stats.pssimCaixas + " — " + stats.pssimOk + " ok, " + stats.pssimFalhou + " falha(s)",
    "caixas testadas (rode-local): " + stats.caixas,
    "casos negativos (campo vazio, colar script, colar solução, com prompt PS C:\\Users\\ana>): " +
      stats.negativos + " conferidos, " + stats.falsoPositivo + " falso(s) positivo(s)",
    "positivo com “(sem saída)” nas missões só src/semerro: " +
      stats.quaseLa + " “Quase lá!”, " + stats.quaseLaFalhou + " falha(s)",
    "erros de console: " + stats.console + "; requisições externas: " + stats.externas
  ];
  console.log("\n" + linhas.join("\n"));
  process.exitCode = ruins ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; process.exit(1); });
