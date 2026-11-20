/* =========================================================
   Guia PowerShell — pssim.js: um PowerShell 7 SIMULADO, em JavaScript puro.
   Roda as missões (.tryps) e o terminal livre do simulador.html no próprio
   navegador. Não é o PowerShell de verdade: é um interpretador pequeno que
   cobre o que as aulas do Nível 1 usam (variáveis, operadores, if/switch,
   laços, pipeline, Write-*, pastas e arquivos num disco de mentira).
   Privacidade: nada sai da página e nada é guardado. Sem fetch, XHR,
   WebSocket, sendBeacon, localStorage, sessionStorage, cookies ou IndexedDB.
   O "disco" (C:\Users\ana) vive só na memória e é recriado a cada Rodar.
   As saídas imitam as coletas reais (pwsh 7.7, Windows em pt-BR, anonimizadas).
   No Node, o núcleo sai em module.exports (para os testes), sem DOM.
   ========================================================= */
(function (G) {
  "use strict";

  /* ------------------------------------------------------------------
     1. Utilidades e valores
     ------------------------------------------------------------------ */
  var HOME = "C:\\Users\\ana";
  var LIMITE_PASSOS = 100000, LIMITE_MS = 2000;

  function lc(s) { return String(s).toLowerCase(); }
  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isArr(v) { return Array.isArray(v); }
  function rep(s, n) { var r = ""; while (n-- > 0) r += s; return r; }
  function padR(s, n) { s = String(s); return s.length >= n ? s : s + rep(" ", n - s.length); }
  function padL(s, n) { s = String(s); return s.length >= n ? s : rep(" ", n - s.length) + s; }

  // Erro do PowerShell (vira registro de erro na saída). cat: rótulo da vista concisa.
  function PSErr(msg, cat, opts) {
    this.message = msg; this.cat = cat || "RuntimeException"; this.ps = true;
    opts = opts || {}; this.terminating = !!opts.terminating; this.cmd = opts.cmd || null;
    this.parse = opts.parse || null; this.target = opts.target;
  }
  PSErr.prototype = Object.create(Error.prototype);
  function Ctl(kind, label, value) { this.kind = kind; this.label = label; this.value = value; }
  function Limite(msg) { this.message = msg; this.limite = true; }

  // Objeto genérico (PSCustomObject, FileInfo, CommandInfo...): props ordenadas, nomes sem caixa
  function PSObj(typeName, props, extra) {
    this.typeName = typeName || "System.Management.Automation.PSCustomObject";
    this.keys = []; this.vals = {};
    if (props) for (var k in props) if (hasOwn(props, k)) this.set(k, props[k]);
    if (extra) for (var e in extra) if (hasOwn(extra, e)) this[e] = extra[e];
  }
  PSObj.prototype.has = function (k) { return hasOwn(this.vals, lc(k)); };
  PSObj.prototype.get = function (k) { var r = this.vals[lc(k)]; return r ? r.v : undefined; };
  PSObj.prototype.realName = function (k) { var r = this.vals[lc(k)]; return r ? r.n : k; };
  PSObj.prototype.set = function (k, v) {
    var l = lc(k);
    if (!hasOwn(this.vals, l)) { this.keys.push(k); this.vals[l] = { n: k, v: v }; } else this.vals[l].v = v;
  };
  // Hashtable: chaves sem diferenciar maiúsculas, ordem de inserção (a ordem real do .NET é por hash;
  // aqui a [ordered] e a comum ficam iguais, o que é mais fácil de ler)
  function PSHash(ordered) { this.ordered = !!ordered; this.keys = []; this.map = {}; }
  function hkey(k) { return (typeof k === "string" ? "s:" + lc(k) : typeof k === "number" ? "n:" + k : "o:" + toStr(k)); }
  PSHash.prototype.has = function (k) { return hasOwn(this.map, hkey(k)); };
  PSHash.prototype.get = function (k) { var r = this.map[hkey(k)]; return r ? r.v : null; };
  PSHash.prototype.set = function (k, v) {
    var h = hkey(k);
    if (!hasOwn(this.map, h)) { this.keys.push(k); this.map[h] = { k: k, v: v }; } else this.map[h].v = v;
  };
  PSHash.prototype.remove = function (k) {
    var h = hkey(k); if (!hasOwn(this.map, h)) return;
    delete this.map[h]; this.keys = this.keys.filter(function (x) { return hkey(x) !== h; });
  };
  PSHash.prototype.count = function () { return this.keys.length; };
  function ScriptBlock(body, src, params) { this.body = body; this.src = src; this.params = params || null; }
  function PSType(name) { this.name = name; }
  function PSEnum(type, name, num) { this.type = type; this.name = name; this.num = num; }
  PSEnum.prototype.toString = function () { return this.name; };
  function PSDate(d) { this.d = d; }
  function PSVersion(a, b, c, d) { this.p = [a, b, c, d]; }
  PSVersion.prototype.toString = function () {
    var r = [this.p[0], this.p[1]]; if (this.p[2] >= 0) r.push(this.p[2]); if (this.p[3] >= 0) r.push(this.p[3]); return r.join(".");
  };
  function PSSemVer(s) { var m = String(s).split("."); this.major = +m[0]; this.minor = +m[1]; this.patch = +m[2]; this.s = s; }
  PSSemVer.prototype.toString = function () { return this.s; };
  function PSChar(c) { this.c = c; }
  PSChar.prototype.toString = function () { return this.c; };
  function PSTypeInfo(full) { this.full = full; this.name = full.replace(/^.*\./, ""); }
  function Switch(v) { this.v = v; } // valor de parâmetro switch (-Recurse)

  /* ------------------------------------------------------------------
     2. Cultura pt-BR e conversões
     ------------------------------------------------------------------ */
  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  var DIAS_C = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  var DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MESES_C = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

  function trimZeros(m) { return m.indexOf(".") === -1 ? m : m.replace(/0+$/, "").replace(/\.$/, ""); }
  // double -> texto com 15 dígitos significativos (como o PowerShell mostra)
  function fmtDouble(n, dec) {
    if (n !== n) return "NaN";
    if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
    if (n === 0) return "0";
    var e = Math.floor(Math.log10(Math.abs(n))), s;
    if (e >= 15 || e < -5) {
      s = n.toExponential(14); var p = s.split("e"), ex = parseInt(p[1], 10);
      s = trimZeros(p[0]) + "E" + (ex < 0 ? "-" : "+") + padL(String(Math.abs(ex)), 2).replace(/ /g, "0");
    } else {
      s = n.toPrecision(15);
      if (s.indexOf("e") !== -1) s = String(Number(s));
      s = trimZeros(s);
    }
    return dec === "," ? s.replace(".", ",") : s;
  }
  function isInt(n) { return typeof n === "number" && Number.isInteger(n) && Math.abs(n) <= 9007199254740991; }
  function fmtNum(n, dec) { return isInt(n) && Math.abs(n) < 1e15 ? String(n) : fmtDouble(n, dec); }
  function grupo(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  function dateFmt(dt, f) {
    var d = dt, out = "", i = 0;
    function cnt(c) { var n = 0; while (f[i + n] === c) n++; return n; }
    var two = function (x) { return x < 10 ? "0" + x : String(x); };
    if (f.length === 1) { // formatos padrão
      var P = { d: "dd/MM/yyyy", D: "dddd, d 'de' MMMM 'de' yyyy", t: "HH:mm", T: "HH:mm:ss", f: "dddd, d 'de' MMMM 'de' yyyy HH:mm", F: "dddd, d 'de' MMMM 'de' yyyy HH:mm:ss", g: "dd/MM/yyyy HH:mm", G: "dd/MM/yyyy HH:mm:ss", s: "yyyy-MM-ddTHH:mm:ss", u: "yyyy-MM-dd HH:mm:ssZ", M: "d 'de' MMMM", m: "d 'de' MMMM", Y: "MMMM 'de' yyyy", y: "MMMM 'de' yyyy", o: "yyyy-MM-ddTHH:mm:ss.fffffff" };
      if (P[f]) f = P[f]; else throw new PSErr("Input string was not in a correct format.", "InvalidOperation");
    }
    while (i < f.length) {
      var c = f[i], n;
      if (c === "'" || c === '"') { var j = f.indexOf(c, i + 1); if (j === -1) j = f.length; out += f.slice(i + 1, j); i = j + 1; continue; }
      if (c === "\\") { out += f[i + 1] || ""; i += 2; continue; }
      if (c === "%" ) { i++; continue; }
      if ("dMyHhmsftT".indexOf(c) === -1) { out += c; i++; continue; }
      n = cnt(c); i += n;
      switch (c) {
        case "d": out += n === 1 ? d.getDate() : n === 2 ? two(d.getDate()) : n === 3 ? DIAS_C[d.getDay()] : DIAS[d.getDay()]; break;
        case "M": out += n === 1 ? d.getMonth() + 1 : n === 2 ? two(d.getMonth() + 1) : n === 3 ? MESES_C[d.getMonth()] : MESES[d.getMonth()]; break;
        case "y": var y = d.getFullYear(); out += n === 1 ? y % 100 : n === 2 ? two(y % 100) : padL(String(y), n).replace(/ /g, "0"); break;
        case "H": out += n === 1 ? d.getHours() : two(d.getHours()); break;
        case "h": var h = d.getHours() % 12 || 12; out += n === 1 ? h : two(h); break;
        case "m": out += n === 1 ? d.getMinutes() : two(d.getMinutes()); break;
        case "s": out += n === 1 ? d.getSeconds() : two(d.getSeconds()); break;
        case "f": out += padL(String(d.getMilliseconds()), 3).replace(/ /g, "0").concat("0000").slice(0, n); break;
        case "t": out += n === 1 ? (d.getHours() < 12 ? "A" : "P") : (d.getHours() < 12 ? "AM" : "PM"); break;
        case "T": out += "T"; break;
      }
    }
    return out;
  }
  function dateInvariant(d) { // conversão para texto ("$data"): cultura invariante
    var two = function (x) { return x < 10 ? "0" + x : String(x); };
    return two(d.getMonth() + 1) + "/" + two(d.getDate()) + "/" + d.getFullYear() + " " + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
  }
  function parseDate(s) {
    s = String(s).trim(); var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))) return new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))) return new Date(+m[3], m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)); // invariante: MM/dd/yyyy
    return null;
  }

  // Texto "invariante": é o que entra em "$x", em "a" + $x e no [string]
  function toStr(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return fmtNum(v, ".");
    if (typeof v === "boolean") return v ? "True" : "False";
    if (isArr(v)) return v.map(toStr).join(" ");
    if (v instanceof PSDate) return dateInvariant(v.d);
    if (v instanceof PSHash) return v.ordered ? "System.Collections.Specialized.OrderedDictionary" : "System.Collections.Hashtable";
    if (v instanceof ScriptBlock) return v.src;
    if (v instanceof PSType) return v.name;
    if (v instanceof PSTypeInfo) return v.full;
    if (v instanceof PSObj) {
      if (v.toStr) return v.toStr();
      if (v.typeName === "System.Management.Automation.PSCustomObject" || /^Selected\./.test(v.typeName))
        return "@{" + v.keys.map(function (k) { return k + "=" + toStr(v.get(k)); }).join("; ") + "}";
      return v.typeName;
    }
    if (v instanceof Switch) return v.v ? "True" : "False";
    return String(v);
  }
  // Texto "da cultura" (pt-BR): é o que o console mostra para um número solto e o que o -f usa
  function toCult(v) { return typeof v === "number" ? fmtNum(v, ",") : toStr(v); }

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v.length > 0;
    if (isArr(v)) return v.length === 0 ? false : v.length === 1 ? truthy(v[0]) : true;
    if (v instanceof Switch) return v.v;
    return true;
  }

  var TIPOS = {
    int: "System.Int32", int32: "System.Int32", "system.int32": "System.Int32", long: "System.Int64", int64: "System.Int64", "system.int64": "System.Int64",
    double: "System.Double", "system.double": "System.Double", float: "System.Single", single: "System.Single", decimal: "System.Decimal", "system.decimal": "System.Decimal",
    string: "System.String", "system.string": "System.String", bool: "System.Boolean", boolean: "System.Boolean", "system.boolean": "System.Boolean",
    char: "System.Char", "system.char": "System.Char", byte: "System.Byte", datetime: "System.DateTime", "system.datetime": "System.DateTime",
    array: "System.Array", "object[]": "System.Object[]", object: "System.Object", hashtable: "System.Collections.Hashtable", "system.collections.hashtable": "System.Collections.Hashtable",
    ordered: "System.Collections.Specialized.OrderedDictionary", pscustomobject: "System.Management.Automation.PSCustomObject", psobject: "System.Management.Automation.PSObject",
    scriptblock: "System.Management.Automation.ScriptBlock", math: "System.Math", "system.math": "System.Math", version: "System.Version", void: "System.Void",
    regex: "System.Text.RegularExpressions.Regex", "string[]": "System.String[]", "int[]": "System.Int32[]", "system.io.path": "System.IO.Path", "io.path": "System.IO.Path",
    environment: "System.Environment", "system.environment": "System.Environment", timespan: "System.TimeSpan", switch: "System.Management.Automation.SwitchParameter",
    consolecolor: "System.ConsoleColor", "system.consolecolor": "System.ConsoleColor", console: "System.Console", "system.console": "System.Console", semver: "System.Management.Automation.SemanticVersion",
    "system.io.file": "System.IO.File", "io.file": "System.IO.File", "system.io.directory": "System.IO.Directory", convert: "System.Convert", "system.convert": "System.Convert",
    "char[]": "System.Char[]", "double[]": "System.Double[]", "object": "System.Object", sbyte: "System.SByte", uint: "System.UInt32", short: "System.Int16"
  };
  function typeFull(name) {
    var k = lc(name).replace(/\s+/g, "");
    return TIPOS[k] || TIPOS["system." + k] || null;
  }
  function typeOf(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return "System.String";
    if (typeof v === "number") return isInt(v) ? (Math.abs(v) <= 2147483647 ? "System.Int32" : "System.Int64") : "System.Double";
    if (typeof v === "boolean") return "System.Boolean";
    if (isArr(v)) return "System.Object[]";
    if (v instanceof PSHash) return v.ordered ? "System.Collections.Specialized.OrderedDictionary" : "System.Collections.Hashtable";
    if (v instanceof PSDate) return "System.DateTime";
    if (v instanceof ScriptBlock) return "System.Management.Automation.ScriptBlock";
    if (v instanceof PSType) return "System.RuntimeType";
    if (v instanceof PSTypeInfo) return "System.RuntimeType";
    if (v instanceof PSEnum) return v.type;
    if (v instanceof PSVersion) return "System.Version";
    if (v instanceof PSSemVer) return "System.Management.Automation.SemanticVersion";
    if (v instanceof PSChar) return "System.Char";
    if (v instanceof Switch) return "System.Management.Automation.SwitchParameter";
    if (v instanceof PSObj) return v.typeName;
    return "System.Object";
  }

  function convFail(v, full, inner) {
    var shown = isArr(v) ? "System.Object[]" : toStr(v);
    var msg = isArr(v) ? 'Cannot convert the "' + shown + '" value of type "System.Object[]" to type "' + full + '".'
      : 'Cannot convert value "' + shown + '" to type "' + full + '". Error: "' + (inner || "The input string '" + shown + "' was not in a correct format.") + '"';
    return new PSErr(msg, "InvalidArgument");
  }
  function parseNumStr(s) {
    var t = String(s).trim();
    if (t === "") return 0;
    var m;
    if ((m = /^([+-]?)0x([0-9a-f]+)$/i.exec(t))) return (m[1] === "-" ? -1 : 1) * parseInt(m[2], 16);
    if ((m = /^([+-]?)0b([01]+)$/i.exec(t))) return (m[1] === "-" ? -1 : 1) * parseInt(m[2], 2);
    if ((m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?$/i.exec(t))) {
      var mult = { kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776, pb: 1125899906842624 }[lc(m[2] || "")] || 1;
      return parseFloat(m[1]) * mult;
    }
    if (/^[+-]?[\d,]+(\.\d+)?$/.test(t) && t.indexOf(",") !== -1) return parseFloat(t.replace(/,/g, "")); // [double]"3,5" dá 35 (cultura invariante)
    return NaN;
  }
  function roundEven(x) {
    var f = Math.floor(x), diff = x - f;
    if (Math.abs(diff - 0.5) < 1e-12) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }
  function toNumber(v, full) {
    full = full || "System.Int32";
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (v instanceof Switch) return v.v ? 1 : 0;
    if (v instanceof PSChar) return v.c.charCodeAt(0);
    if (v instanceof PSEnum) return v.num;
    if (typeof v === "string") { var n = parseNumStr(v); if (n !== n) throw convFail(v, full); return n; }
    if (isArr(v) && v.length === 1) return toNumber(v[0], full);
    throw convFail(v, full);
  }
  function toInt(v, full) {
    full = full || "System.Int32";
    var n = toNumber(v, full);
    if (!isFinite(n)) throw convFail(v, full, "Value was either too large or too small for an Int32.");
    n = roundEven(n);
    if (full === "System.Int32" && Math.abs(n) > 2147483647) throw convFail(v, full, "Value was either too large or too small for an Int32.");
    if (full === "System.Byte" && (n < 0 || n > 255)) throw convFail(v, full, "Value was either too large or too small for an unsigned byte.");
    return n;
  }

  // [tipo]valor
  function convertTo(full, v) {
    switch (full) {
      case "System.Int32": case "System.Int64": case "System.Byte": case "System.Int16": case "System.UInt32": case "System.SByte":
        if (isArr(v) && v.length !== 1) throw convFail(v, full);
        return toInt(v, full);
      case "System.Double": case "System.Single": case "System.Decimal":
        if (isArr(v) && v.length !== 1) throw convFail(v, full);
        return toNumber(v, full);
      case "System.String": return isArr(v) ? toStr(v) : toStr(v);
      case "System.Boolean":
        if (typeof v === "number" || typeof v === "boolean" || v === null) return truthy(v);
        return truthy(v);
      case "System.Char":
        if (typeof v === "number") return new PSChar(String.fromCharCode(v));
        if (typeof v === "string" && v.length === 1) return new PSChar(v);
        if (v instanceof PSChar) return v;
        throw new PSErr('Cannot convert value "' + toStr(v) + '" to type "System.Char". Error: "String must be exactly one character long."', "InvalidArgument");
      case "System.DateTime":
        if (v instanceof PSDate) return v;
        var d = parseDate(toStr(v));
        if (!d) throw new PSErr('Cannot convert value "' + toStr(v) + '" to type "System.DateTime". Error: "The string \'' + toStr(v) + '\' was not recognized as a valid DateTime. There is an unknown word starting at index \'0\'."', "InvalidArgument");
        return new PSDate(d);
      case "System.Array": case "System.Object[]": return isArr(v) ? v : v === null ? [] : [v];
      case "System.String[]": return (isArr(v) ? v : [v]).map(toStr);
      case "System.Int32[]": return (isArr(v) ? v : [v]).map(function (x) { return toInt(x); });
      case "System.Double[]": return (isArr(v) ? v : [v]).map(function (x) { return toNumber(x, "System.Double"); });
      case "System.Char[]": return (isArr(v) ? v : toStr(v).split("")).map(function (x) { return x instanceof PSChar ? x : new PSChar(toStr(x)); });
      case "System.Version":
        if (v instanceof PSVersion) return v;
        var p = toStr(v).split(".").map(Number);
        if (p.length < 2 || p.some(function (x) { return x !== x; })) throw new PSErr('Cannot convert value "' + toStr(v) + '" to type "System.Version". Error: "Version string portion was too short or too long."', "InvalidArgument");
        return new PSVersion(p[0], p[1], p.length > 2 ? p[2] : -1, p.length > 3 ? p[3] : -1);
      case "System.Collections.Hashtable":
        if (v instanceof PSHash) return v;
        break;
      case "System.Management.Automation.PSCustomObject": case "System.Management.Automation.PSObject":
        if (v instanceof PSHash) { var o = new PSObj(); v.keys.forEach(function (k) { o.set(toStr(k), v.get(k)); }); return o; }
        return v;
      case "System.Object": return v;
      case "System.Void": return undefined;
      case "System.Management.Automation.ScriptBlock": if (v instanceof ScriptBlock) return v; break;
      case "System.ConsoleColor": return consoleColor(v);
      case "System.Management.Automation.SwitchParameter": return new Switch(truthy(v));
      case "System.Text.RegularExpressions.Regex": return toStr(v);
    }
    if (typeOf(v) === full) return v;
    throw new PSErr('Cannot convert the "' + toStr(v) + '" value of type "' + typeOf(v) + '" to type "' + full + '".', "InvalidArgument");
  }
  var CORES = ["Black", "DarkBlue", "DarkGreen", "DarkCyan", "DarkRed", "DarkMagenta", "DarkYellow", "Gray", "DarkGray", "Blue", "Green", "Cyan", "Red", "Magenta", "Yellow", "White"];
  function consoleColor(v) {
    var s = toStr(v);
    for (var i = 0; i < CORES.length; i++) if (lc(CORES[i]) === lc(s) || String(i) === s) return new PSEnum("System.ConsoleColor", CORES[i], i);
    throw new PSErr('Cannot convert value "' + s + '" to type "System.ConsoleColor". Error: "Unable to match the identifier name ' + s + ' to a valid enumerator name. Specify one of the following enumerator names and try again:\n' + CORES.join(", ") + '"', "InvalidArgument");
  }
  function isType(v, full) {
    if (full === "System.Object") return v !== null && v !== undefined;
    if (full === "System.Array" || full === "System.Object[]") return isArr(v);
    if (full === "System.Management.Automation.PSObject") return v !== null && v !== undefined;
    if (full === "System.ValueType") return typeof v === "number" || typeof v === "boolean" || v instanceof PSDate || v instanceof PSChar;
    if (full === "System.Double" && typeof v === "number") return !isInt(v);
    return typeOf(v) === full;
  }

  /* ------------------------------------------------------------------
     3. Operador -f (String.Format com a cultura pt-BR)
     ------------------------------------------------------------------ */
  function fmtInvalid() { return new PSErr("Error formatting a string: Format specifier was invalid..", "InvalidOperation"); }
  function fixedPt(n, d) { // n com d casas, separador ","
    var s = Math.abs(n).toFixed(d), p = s.split(".");
    return (n < 0 && Number(s) !== 0 ? "-" : "") + p[0] + (d > 0 ? "," + p[1] : "");
  }
  function customNum(n, f) {
    // formato personalizado simples: "0.00", "#,##0.00", "000", "0%"
    var sec = f.split(";"); if (sec.length > 1 && n < 0) { f = sec[1]; n = -n; } else f = sec[0];
    var pct = f.indexOf("%") !== -1; if (pct) n *= 100;
    var m = /^([^0#,.]*)([0#,]*)(?:\.([0#]+))?(.*)$/.exec(f);
    if (!m) return f;
    var intPart = m[2], decPart = m[3] || "", group = intPart.indexOf(",") !== -1;
    var minInt = (intPart.match(/0/g) || []).length, maxDec = decPart.length, minDec = (decPart.match(/0/g) || []).length;
    var s = Math.abs(n).toFixed(maxDec), pp = s.split("."), ip = pp[0], dp = pp[1] || "";
    while (dp.length > minDec && dp[dp.length - 1] === "0") dp = dp.slice(0, -1);
    if (ip === "0" && minInt === 0) ip = "";
    while (ip.length < minInt) ip = "0" + ip;
    if (group) ip = grupo(ip);
    return m[1] + (n < 0 && Number(s) !== 0 ? "-" : "") + ip + (dp ? "," + dp : "") + m[4];
  }
  function fmtSpec(v, spec) {
    if (spec === "") return toCult(v);
    if (v instanceof PSDate) return dateFmt(v.d, spec);
    var m = /^([A-Za-z])(\d{0,2})$/.exec(spec);
    var num = typeof v === "number" ? v : null;
    if (num === null && (typeof v === "string" || typeof v === "boolean" || v === null)) {
      if (m || /^[0#.,%]+$/.test(spec)) return toCult(v); // texto ignora o formato numérico
      return toCult(v);
    }
    if (num === null) num = toNumber(v);
    if (m) {
      var c = m[1], d = m[2] === "" ? null : parseInt(m[2], 10), U = c.toUpperCase();
      switch (U) {
        case "N": { var s = fixedPt(num, d === null ? 2 : d), p = s.split(","); var neg = p[0][0] === "-"; var ip = neg ? p[0].slice(1) : p[0]; return (neg ? "-" : "") + grupo(ip) + (p.length > 1 ? "," + p[1] : ""); }
        case "F": return fixedPt(num, d === null ? 2 : d);
        case "D":
          if (!isInt(num)) throw fmtInvalid();
          var a = String(Math.abs(num)); while (a.length < (d || 0)) a = "0" + a; return (num < 0 ? "-" : "") + a;
        case "P": { var t = fixedPt(num * 100, d === null ? 2 : d), q = t.split(","), ng = q[0][0] === "-"; var ii = ng ? q[0].slice(1) : q[0]; return (ng ? "-" : "") + grupo(ii) + (q.length > 1 ? "," + q[1] : "") + "%"; }
        case "C": { var u = fixedPt(Math.abs(num), d === null ? 2 : d), r = u.split(","); return (num < 0 ? "-" : "") + "R$\u00a0" + grupo(r[0]) + (r.length > 1 ? "," + r[1] : ""); }
        case "X":
          if (!isInt(num)) throw fmtInvalid();
          var h = (num < 0 ? (num >>> 0) : num).toString(16); if (c === "X") h = h.toUpperCase(); while (h.length < (d || 0)) h = "0" + h; return h;
        case "E": {
          var e = num.toExponential(d === null ? 6 : d).split("e"), ex = parseInt(e[1], 10);
          return e[0].replace(".", ",") + (c === "E" ? "E" : "e") + (ex < 0 ? "-" : "+") + padL(String(Math.abs(ex)), 3).replace(/ /g, "0");
        }
        case "G": return d ? fmtDouble(Number(num.toPrecision(d)), ",") : toCult(num);
        case "R": return fmtNum(num, ",");
        default: throw fmtInvalid();
      }
    }
    return customNum(num, spec);
  }
  function formatOp(fmt, args) {
    fmt = toStr(fmt); args = isArr(args) ? args : [args];
    var out = "", i = 0;
    while (i < fmt.length) {
      var c = fmt[i];
      if (c === "{") {
        if (fmt[i + 1] === "{") { out += "{"; i += 2; continue; }
        var j = fmt.indexOf("}", i);
        if (j === -1) throw new PSErr("Error formatting a string: Input string was not in a correct format..", "InvalidOperation");
        var body = fmt.slice(i + 1, j), m = /^\s*(\d+)\s*(?:,\s*(-?\d+)\s*)?(?::(.*))?$/.exec(body);
        if (!m) throw new PSErr("Error formatting a string: Input string was not in a correct format..", "InvalidOperation");
        var idx = parseInt(m[1], 10);
        if (idx >= args.length) throw new PSErr("Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of the argument list..", "InvalidOperation");
        var s = fmtSpec(args[idx], m[3] === undefined ? "" : m[3]);
        if (m[2] !== undefined) { var w = parseInt(m[2], 10); s = w < 0 ? padR(s, -w) : padL(s, w); }
        out += s; i = j + 1; continue;
      }
      if (c === "}") { if (fmt[i + 1] === "}") { out += "}"; i += 2; continue; } throw new PSErr("Error formatting a string: Input string was not in a correct format..", "InvalidOperation"); }
      out += c; i++;
    }
    return out;
  }

  /* ------------------------------------------------------------------
     4. Analisador (parser): texto -> árvore
     O PowerShell tem dois modos: "expressão" ($a + 1) e "comando"
     (Get-ChildItem -Name *.txt). O parser decide pelo primeiro caractere.
     ------------------------------------------------------------------ */
  var KW = { "if": 1, "switch": 1, "foreach": 1, "for": 1, "while": 1, "do": 1, "function": 1, "filter": 1, "break": 1, "continue": 1, "return": 1, "exit": 1, "throw": 1, "try": 1, "param": 1, "trap": 1 };
  var BINOPS = {
    eq: 1, ne: 1, gt: 1, ge: 1, lt: 1, le: 1, like: 1, notlike: 1, match: 1, notmatch: 1, replace: 1, contains: 1, notcontains: 1,
    "in": 1, notin: 1, split: 1, join: 1, is: 1, isnot: 1, as: 1, and: 1, or: 1, xor: 1, band: 1, bor: 1, bxor: 1, shl: 1, shr: 1, f: 1
  };
  var CASEOPS = { eq: 1, ne: 1, gt: 1, ge: 1, lt: 1, le: 1, like: 1, notlike: 1, match: 1, notmatch: 1, replace: 1, contains: 1, notcontains: 1, "in": 1, notin: 1, split: 1 };
  var NIVEL = { and: 1, or: 1, xor: 1, band: 2, bor: 2, bxor: 2, shl: 2, shr: 2 }; // o resto (comparações) é nível 3
  var SQ = ["'", "\u2018", "\u2019", "\u201a", "\u201b"], DQ = ['"', "\u201c", "\u201d", "\u201e"];
  function isIdC(c) { return !!c && /[A-Za-z0-9_\u00c0-\u024f]/.test(c); }
  function isIdS(c) { return !!c && /[A-Za-z_\u00c0-\u024f]/.test(c); }

  function Parser(src) { this.s = src; this.i = 0; }
  var PP = Parser.prototype;
  PP.fail = function (msg, pos, len) {
    throw new PSErr(msg, "ParserError", { parse: { pos: pos === undefined ? this.i : pos, len: len || 1 }, terminating: true });
  };
  PP.c = function (k) { return this.s.charAt(this.i + (k || 0)); };
  PP.eof = function () { return this.i >= this.s.length; };
  PP.ws = function () { // espaços, comentários e continuação com crase; não pula quebra de linha
    var s = this.s;
    for (;;) {
      var c = s.charAt(this.i);
      if (c === " " || c === "\t" || c === "\u00a0" || c === "\r") this.i++;
      else if (c === "`" && (s.charAt(this.i + 1) === "\n" || (s.charAt(this.i + 1) === "\r" && s.charAt(this.i + 2) === "\n"))) this.i += s.charAt(this.i + 1) === "\n" ? 2 : 3;
      else if (c === "<" && s.charAt(this.i + 1) === "#") { var j = s.indexOf("#>", this.i + 2); this.i = j === -1 ? s.length : j + 2; }
      else if (c === "#") { while (this.i < s.length && s.charAt(this.i) !== "\n") this.i++; }
      else break;
    }
  };
  PP.wsn = function () { for (;;) { this.ws(); if (this.c() === "\n") this.i++; else break; } };
  PP.word = function () { // palavra-chave/identificador na posição (sem consumir)
    var j = this.i; while (j < this.s.length && /[A-Za-z]/.test(this.s.charAt(j))) j++;
    var w = this.s.slice(this.i, j), nx = this.s.charAt(j);
    if (!w || isIdC(nx) || nx === "-" || nx === ":" && w.length && this.s.charAt(j + 1) !== " " && false) return "";
    return lc(w);
  };
  PP.kw = function (w) { this.i += w.length; };
  PP.endStmt = function () { var c = this.c(); return this.eof() || c === "\n" || c === ";" || c === "}" || c === ")"; };

  PP.parseScript = function () {
    var body = this.statements("");
    if (!this.eof()) this.fail("Unexpected token '" + this.c() + "' in expression or statement.");
    return { t: "script", body: body };
  };
  PP.statements = function (end) {
    var list = [];
    for (;;) {
      this.wsn();
      while (this.c() === ";") { this.i++; this.wsn(); }
      if (this.eof() || (end && this.c() === end)) break;
      if (this.c() === ")" || this.c() === "}") { if (!end) this.fail("Unexpected token '" + this.c() + "' in expression or statement."); break; }
      var st = this.statement(), fimSt = this.i;
      if (st) list.push(st);
      this.ws();
      var c = this.c();
      if (this.eof() || c === "\n" || c === ";" || (end && c === end)) continue;
      if (st && /^(if|while|for|foreach|switch|try|function|do)$/.test(st.t) && this.s.charAt(fimSt - 1) === "}") continue; // após um bloco, outra instrução pode vir na mesma linha
      if (c === "}" || c === ")") { if (!end || c !== end) this.fail("Unexpected token '" + c + "' in expression or statement."); continue; }
      var t = this.tokenAt();
      this.fail("Unexpected token '" + t + "' in expression or statement.", this.i, t.length);
    }
    return list;
  };
  PP.tokenAt = function () {
    var m = /^(-[A-Za-z]+|[A-Za-z_][\w-]*|\$\w+|"[^"\n]*"?|'[^'\n]*'?|\S)/.exec(this.s.slice(this.i));
    return m ? m[0] : this.c();
  };
  PP.block = function (msg, pos) {
    this.wsn();
    if (this.c() !== "{") this.fail(msg, pos === undefined ? this.i : pos);
    var p = this.i; this.i++;
    var body = this.statements("}");
    if (this.c() !== "}") this.fail("Missing closing '}' in statement block or type definition.", p);
    this.i++;
    return body;
  };
  PP.statement = function () {
    var p = this.i, label = null;
    if (this.c() === ":" && isIdS(this.c(1))) {
      var m = /^:(\w+)/.exec(this.s.slice(this.i)); label = m[1]; this.i += m[0].length; this.ws();
    }
    var w = this.word();
    if (w && KW[w]) {
      var st = this.keywordStmt(w, p);
      if (st) { if (label) st.label = label; return st; }
    }
    var pl = this.pipeline();
    return pl;
  };
  PP.cond = function (kwEnd, kwName) { // ( pipeline ) depois de if/while/elseif
    this.ws();
    if (this.c() !== "(") {
      if (kwName === "if" || kwName === "elseif") this.fail("Missing '(' after '" + kwName + "' in " + kwName + " statement.", kwEnd);
      this.fail("Missing opening '(' after keyword '" + kwName + "'.", kwEnd);
    }
    var open = this.i; this.i++; this.wsn();
    if (this.c() === ")") this.fail("Missing condition in " + kwName + " statement after '" + kwName + " ('.", this.i);
    var e = this.pipelineOrStmt();
    this.wsn();
    if (this.c() !== ")") this.fail("Missing closing ')' after expression in '" + kwName + "' statement.", this.i);
    var close = this.i; this.i++;
    return { e: e, close: close, open: open };
  };
  PP.keywordStmt = function (w, p) {
    var s = this, kwEnd;
    switch (w) {
      case "if": {
        s.kw("if"); kwEnd = s.i;
        var clauses = [], els = null, c = s.cond(kwEnd, "if");
        clauses.push({ cond: c.e, body: s.block("Missing statement block after if ( condition ).", c.close) });
        for (;;) {
          var save = s.i; s.wsn();
          var w2 = s.word();
          if (w2 === "elseif") {
            s.kw("elseif"); var k2 = s.i, c2 = s.cond(k2, "elseif");
            clauses.push({ cond: c2.e, body: s.block("Missing statement block after elseif ( condition ).", c2.close) });
          } else if (w2 === "else") {
            s.kw("else"); var k3 = s.i;
            els = s.block("Missing statement block after 'else' keyword.", k3);
            break;
          } else { s.i = save; break; }
        }
        return { t: "if", clauses: clauses, els: els, p: p };
      }
      case "while": {
        s.kw("while"); kwEnd = s.i;
        var cw = s.cond(kwEnd, "while");
        return { t: "while", cond: cw.e, body: s.block("Missing statement body in while loop.", cw.close + 1), p: p };
      }
      case "do": {
        s.kw("do"); kwEnd = s.i;
        var body = s.block("Missing statement body in do loop.", kwEnd);
        s.wsn(); var w3 = s.word();
        if (w3 !== "while" && w3 !== "until") s.fail("Missing 'while' or 'until' in do loop.", s.i);
        s.kw(w3); var k4 = s.i;
        var cd = s.cond(k4, w3);
        return { t: "do", body: body, cond: cd.e, until: w3 === "until", p: p };
      }
      case "for": {
        s.kw("for"); kwEnd = s.i; s.ws();
        if (s.c() !== "(") s.fail("Missing opening '(' after keyword 'for'.", kwEnd);
        s.i++;
        var parts = [null, null, null];
        for (var k = 0; k < 3; k++) {
          s.ws(); while (s.c() === "\n") { s.i++; s.ws(); }
          if (s.c() !== ";" && s.c() !== ")" && s.c() !== "\n") parts[k] = s.pipelineOrStmt();
          s.ws();
          if (k < 2) { if (s.c() === ";" || s.c() === "\n") s.i++; else if (s.c() === ")") { break; } }
        }
        s.wsn();
        if (s.c() !== ")") s.fail("Missing closing ')' after expression in 'for' statement.", s.i);
        var fc = s.i; s.i++;
        return { t: "for", init: parts[0], cond: parts[1], iter: parts[2], body: s.block("Missing statement body in for loop.", fc + 1), p: p };
      }
      case "foreach": {
        s.kw("foreach"); kwEnd = s.i; s.ws();
        while (s.c() === "-") { var mm = /^-\w+/.exec(s.s.slice(s.i)); s.i += mm[0].length; s.ws(); }
        if (s.c() !== "(") s.fail("Missing opening '(' after keyword 'foreach'.", kwEnd);
        s.i++; s.wsn();
        if (s.c() !== "$") s.fail("Missing variable name after foreach.", s.i);
        var v = s.variable(); var afterVar = s.i; s.wsn();
        if (s.word() !== "in") s.fail("Missing 'in' after variable in foreach loop. The correct form is: foreach ($a in $b) {...}", afterVar);
        s.kw("in"); s.wsn();
        var coll = s.pipelineOrStmt(); s.wsn();
        if (s.c() !== ")") s.fail("Missing closing ')' after expression in 'foreach' statement.", s.i);
        var fe = s.i; s.i++;
        return { t: "foreach", v: v.name, coll: coll, body: s.block("Missing statement body in foreach loop.", fe + 1), p: p };
      }
      case "switch": {
        s.kw("switch"); kwEnd = s.i;
        var opts = {}; s.ws();
        while (s.c() === "-") {
          var om = /^-(\w+)/.exec(s.s.slice(s.i)); if (!om) break;
          var on = lc(om[1]);
          if ("wildcard".indexOf(on) === 0 && on) opts.wildcard = true;
          else if ("regex".indexOf(on) === 0) opts.regex = true;
          else if ("exact".indexOf(on) === 0) opts.exact = true;
          else if ("casesensitive".indexOf(on) === 0) opts.cs = true;
          else if ("file".indexOf(on) === 0) s.fail("O simulador não lê arquivos com switch -File.", s.i, om[0].length);
          else s.fail("Unexpected token '" + om[0] + "' in expression or statement.", s.i, om[0].length);
          s.i += om[0].length; kwEnd = s.i; s.ws();
        }
        if (s.c() !== "(") s.fail("A switch statement must have one of the following:  '-file file_name' or '( expression )'.", kwEnd);
        s.i++; s.wsn();
        var sv = s.pipelineOrStmt(); s.wsn();
        if (s.c() !== ")") s.fail("Missing closing ')' after expression in 'switch' statement.", s.i);
        s.i++; s.wsn();
        if (s.c() !== "{") s.fail("Missing condition in switch statement clause.", s.i);
        var bopen = s.i; s.i++;
        var cls = [];
        for (;;) {
          s.wsn(); while (s.c() === ";") { s.i++; s.wsn(); }
          if (s.c() === "}") { s.i++; break; }
          if (s.eof()) s.fail("Missing closing '}' in statement block or type definition.", bopen);
          var pat, cp = s.i;
          if (s.word() === "default" && !isIdC(s.c(7))) { s.kw("default"); pat = "default"; }
          else pat = s.argValue(true);
          var patEnd = s.i; s.ws();
          if (s.c() !== "{") s.fail("Missing statement block in switch statement clause.", patEnd);
          cls.push({ pat: pat, body: s.block("", patEnd), p: cp });
        }
        return { t: "switch", v: sv, opts: opts, clauses: cls, p: p };
      }
      case "function": case "filter": {
        s.kw(w); s.ws();
        var nm = /^[\w-]+/.exec(s.s.slice(s.i));
        if (!nm) s.fail("Missing function name after function keyword.", s.i);
        s.i += nm[0].length; s.ws();
        var params = null;
        if (s.c() === "(") { s.i++; params = s.paramList(")"); }
        s.wsn();
        if (s.c() !== "{") s.fail("Missing function body in function declaration.", s.i);
        var fsrc = s.i, fb = s.scriptBlock();
        if (params) fb.params = params;
        return { t: "function", name: nm[0], sb: fb, p: p };
      }
      case "break": case "continue": {
        s.kw(w); s.ws(); var lb = null;
        var lm = /^:?(\w+)/.exec(s.s.slice(s.i));
        if (lm && !s.endStmt()) { lb = lm[1]; s.i += lm[0].length; }
        return { t: w, label: lb, p: p };
      }
      case "return": case "exit": case "throw": {
        s.kw(w); s.ws(); var val = null;
        if (!s.endStmt()) val = s.pipelineOrStmt();
        return { t: w, value: val, p: p };
      }
      case "try": {
        s.kw("try"); kwEnd = s.i;
        var tb = s.block("Missing statement block after 'try'.", kwEnd), catches = [], fin = null;
        for (;;) {
          var sv2 = s.i; s.wsn(); var w4 = s.word();
          if (w4 === "catch") {
            s.kw("catch"); s.ws(); var types = [];
            while (s.c() === "[") { var tm = /^\[([^\]]+)\]/.exec(s.s.slice(s.i)); types.push(tm[1]); s.i += tm[0].length; s.ws(); if (s.c() === ",") { s.i++; s.ws(); } }
            catches.push({ types: types, body: s.block("Missing statement block in catch block.", s.i) });
          } else if (w4 === "finally") { s.kw("finally"); fin = s.block("Missing statement block in finally block.", s.i); break; }
          else { s.i = sv2; break; }
        }
        if (!catches.length && !fin) s.fail("The Try statement is missing its Catch or Finally block.", s.i);
        return { t: "try", body: tb, catches: catches, fin: fin, p: p };
      }
      case "param": {
        s.kw("param"); s.ws();
        if (s.c() !== "(") return null;
        s.i++;
        return { t: "param", params: s.paramList(")"), p: p };
      }
      case "trap": s.fail("O simulador não tem trap; use try/catch.", p, 4);
    }
    return null;
  };
  PP.paramList = function (end) {
    var ps = [];
    for (;;) {
      this.wsn();
      if (this.c() === end) { this.i++; break; }
      if (this.c() === ",") { this.i++; continue; }
      var type = null;
      while (this.c() === "[") {
        var m = /^\[([^\]]*(?:\[\])?)\]/.exec(this.s.slice(this.i));
        if (!m) this.fail("Missing ']'.");
        if (!/^Parameter|^Validate|^Alias|^CmdletBinding/i.test(m[1])) type = m[1];
        this.i += m[0].length;
        if (this.c() === "(") { var depth = 0; do { if (this.c() === "(") depth++; else if (this.c() === ")") depth--; this.i++; } while (depth > 0 && !this.eof()); }
        this.wsn();
      }
      if (this.c() !== "$") this.fail("Missing ')' in function parameter list.", this.i);
      var v = this.variable(), def = null; this.wsn();
      if (this.c() === "=") { this.i++; this.wsn(); def = this.expr(true); }
      ps.push({ name: v.name, type: type, def: def });
    }
    return ps;
  };
  PP.scriptBlock = function () {
    var start = this.i; this.i++;
    var params = null; this.wsn();
    if (this.word() === "param") { var save = this.i; this.kw("param"); this.ws(); if (this.c() === "(") { this.i++; params = this.paramList(")"); } else this.i = save; }
    var body = this.statements("}");
    if (this.c() !== "}") this.fail("Missing closing '}' in statement block or type definition.", start);
    this.i++;
    return { t: "sb", body: body, params: params, src: this.s.slice(start + 1, this.i - 1) };
  };

  // RHS de atribuição e condições aceitam if/switch/foreach... como valor
  PP.pipelineOrStmt = function () {
    var w = this.word();
    if (w && (w === "if" || w === "switch" || w === "foreach" || w === "for" || w === "while" || w === "do" || w === "try")) {
      var p = this.i, st = this.keywordStmt(w, p); if (st) return st;
    }
    return this.pipeline();
  };
  PP.startsExpr = function () {
    var c = this.c(), c1 = this.c(1);
    if (c === "$" || c === "(" || c === "@" || c === "[" || c === "{" || c === "!" || c === "," || SQ.indexOf(c) !== -1 || DQ.indexOf(c) !== -1) return true;
    if (c === "+" && c1 === "+" || c === "-" && c1 === "-" && this.c(2) === "$") return true;
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(c1))) { var n = this.lexNumber(); return !!n && !isIdC(this.s.charAt(n.end)) && this.s.charAt(n.end) !== "-"; }
    if (c === "-") {
      if (/[0-9.]/.test(c1)) return true;
      var m = /^-(not|bnot|split|join)(?![\w-])/i.exec(this.s.slice(this.i)); if (m) return true;
      if (c1 === "$" || c1 === "(") return true;
    }
    return false;
  };
  PP.pipeline = function () {
    var p = this.i, elems = [], first;
    if (this.startsExpr()) {
      first = this.expr(false);
      this.ws();
      var am = /^(=(?!=)|\+=|-=|\*=|\/=|%=|\?\?=)/.exec(this.s.slice(this.i));
      if (am) {
        if (!(first.t === "var" || first.t === "member" || first.t === "index" || (first.t === "cast" && first.e.t === "var")))
          this.fail("The assignment expression is not valid. The input to an assignment operator must be an object that is able to accept assignments, such as a variable or a property.", first.p, this.i - first.p);
        this.i += am[0].length; this.wsn();
        if (this.endStmt()) this.fail("You must provide a value expression following the '" + am[0] + "' operator.", this.i);
        var rhs = this.pipelineOrStmt();
        return { t: "assign", target: first, op: am[0], value: rhs, p: p };
      }
      elems.push({ t: "exprel", e: first, redirs: this.redirs() });
    } else {
      elems.push(this.command());
    }
    for (;;) {
      this.ws();
      if (this.c() === "|" && this.c(1) !== "|") {
        var bar = this.i; this.i++; this.wsn();
        if (this.endStmt() || this.c() === "|") this.fail("An empty pipe element is not allowed.", bar + 1);
        if (this.startsExpr() && this.c() !== "&") this.fail("Expressions are only allowed as the first element of a pipeline.", this.i);
        elems.push(this.command());
      } else break;
    }
    var node = { t: "pipe", elems: elems, p: p, e: this.i };
    this.ws();
    var chain = /^(&&|\|\|)/.exec(this.s.slice(this.i));
    if (chain) { this.i += 2; this.wsn(); return { t: "chain", op: chain[1], l: node, r: this.pipeline(), p: p }; }
    return node;
  };
  PP.redirs = function () {
    var list = [];
    for (;;) {
      this.ws();
      var m = /^(\*|[1-6])?(>>|>)(&[12])?/.exec(this.s.slice(this.i));
      if (!m) break;
      this.i += m[0].length;
      var r = { stream: m[1] || "1", append: m[2] === ">>", merge: m[3] ? m[3].slice(1) : null };
      if (!r.merge) { this.ws(); if (this.endStmt()) this.fail("Missing file specification after redirection operator.", this.i); r.target = this.argValue(false); }
      list.push(r);
    }
    return list;
  };
  PP.command = function () {
    var p = this.i, name, call = null;
    if (this.c() === "&" || (this.c() === "." && /[ \t]/.test(this.c(1)))) {
      call = this.c() === "&" ? "&" : "."; this.i++; this.ws();
      name = this.argValue(false);
    } else {
      var m = /^[^\s|;&)}(,{]+/.exec(this.s.slice(this.i));
      if (!m) this.fail("Unexpected token '" + this.tokenAt() + "' in expression or statement.");
      var raw = m[0];
      if (SQ.indexOf(raw[0]) !== -1 || DQ.indexOf(raw[0]) !== -1) { name = this.argValue(false); }
      else { this.i += raw.length; name = { t: "str", v: raw }; }
    }
    var nameEnd = this.i, args = [], redirs = [];
    for (;;) {
      this.ws();
      var c = this.c();
      if (this.eof() || c === "\n" || c === ";" || c === ")" || c === "}" || (c === "|") || (c === "&" && this.c(1) === "&")) break;
      if (/^(\*|[1-6])?>/.test(this.s.slice(this.i))) { redirs = redirs.concat(this.redirs()); continue; }
      if (c === "-" && this.c(1) === "-" && this.c(2) === "%") { this.i += 3; continue; }
      var pm = /^-([A-Za-z_?][\w-]*)(:)?/.exec(this.s.slice(this.i));
      if (pm && !/^-\d/.test(this.s.slice(this.i))) {
        var ap = this.i; this.i += pm[0].length;
        var a = { param: pm[1], p: ap, len: pm[0].length };
        if (pm[2]) { this.ws(); a.value = this.argList(); a.colon = true; }
        args.push(a); continue;
      }
      var vp = this.i;
      args.push({ value: this.argList(), p: vp });
    }
    return { t: "cmd", name: name, call: call, args: args, redirs: redirs, p: p, nameEnd: nameEnd };
  };
  PP.argList = function () { // valor de argumento; vírgulas fazem uma lista
    var items = [this.argValue(false)];
    for (;;) {
      var save = this.i; this.ws();
      if (this.c() === ",") { this.i++; this.wsn(); items.push(this.argValue(false)); } else { this.i = save; break; }
    }
    return items.length === 1 ? items[0] : { t: "array", items: items };
  };
  var ARG_END = /[\s|;)},]/;
  PP.argValue = function (inSwitch) {
    var c = this.c(), p = this.i, node;
    if (c === "$" || c === "(" || c === "@" || c === "{" || SQ.indexOf(c) !== -1 || DQ.indexOf(c) !== -1) {
      node = this.postfix(this.primary());
    } else if (/[0-9]/.test(c) || ((c === "-" || c === ".") && /[0-9]/.test(this.c(1)))) {
      var n = this.lexNumber(c === "-" ? 1 : 0);
      if (n && (n.end >= this.s.length || ARG_END.test(this.s.charAt(n.end)) || (inSwitch && this.s.charAt(n.end) === "{"))) { this.i = n.end; node = { t: "num", v: c === "-" ? -n.v : n.v, p: p }; }
    } else if (inSwitch && c === "[") {
      node = this.postfix(this.primary());
    }
    if (!node) {
      var stop = inSwitch ? /[\s|;)}{,]/ : ARG_END, j = this.i, parts = [], buf = "";
      while (j < this.s.length && !stop.test(this.s.charAt(j))) {
        var ch = this.s.charAt(j);
        if (ch === "`" && j + 1 < this.s.length) { buf += this.s.charAt(j + 1); j += 2; continue; }
        if (ch === "$" && (isIdS(this.s.charAt(j + 1)) || this.s.charAt(j + 1) === "(" || this.s.charAt(j + 1) === "{")) {
          if (buf) parts.push(buf); buf = ""; this.i = j;
          if (this.s.charAt(j + 1) === "(") { this.i++; parts.push(this.subExpr()); }
          else parts.push(this.variable());
          j = this.i; continue;
        }
        buf += ch; j++;
      }
      if (buf || !parts.length) parts.push(buf);
      this.i = j;
      node = parts.length === 1 && typeof parts[0] === "string" ? { t: "str", v: parts[0], bare: true, p: p } : { t: "xstr", parts: parts, p: p };
      if (node.t === "str" && node.v === "") this.fail("Unexpected token '" + this.c() + "' in expression or statement.");
      return node;
    }
    // valor colado a um texto: $HOME\docs
    if (this.i < this.s.length && !ARG_END.test(this.c()) && !(inSwitch && this.c() === "{") && this.c() !== "=" ) {
      var rest = this.argValue(inSwitch);
      return { t: "concat", parts: [node, rest], p: p };
    }
    return node;
  };

  // ---------- expressões ----------
  PP.expr = function (noComma) { return this.ternary(noComma); };
  PP.ternary = function (noComma) {
    var c = this.logical(noComma);
    var save = this.i; this.ws();
    if (this.c() === "?" && /[\s]/.test(this.c(1)) && /\s/.test(this.s.charAt(this.i - 1))) {
      this.i++; this.wsn(); var a = this.ternary(noComma); this.wsn();
      if (this.c() !== ":") this.fail("Missing ':' in ternary expression.");
      this.i++; this.wsn(); var b = this.ternary(noComma);
      return { t: "ternary", c: c, a: a, b: b, p: c.p };
    }
    this.i = save; return c;
  };
  PP.binop = function () { // lê o próximo operador binário (sem consumir); devolve {op, len, cs}
    var s = this.s.slice(this.i, this.i + 20), m;
    if ((m = /^-([A-Za-z]+)/.exec(s))) {
      var name = lc(m[1]), base = name, cs = false;
      if (!BINOPS[name] && (name[0] === "c" || name[0] === "i") && CASEOPS[name.slice(1)]) { base = name.slice(1); cs = name[0] === "c"; }
      if (!BINOPS[base]) {
        if (name === "not" || name === "bnot") return null;
        this.fail("Unexpected token '" + m[0] + "' in expression or statement.", this.i, m[0].length);
      }
      return { op: base, len: m[0].length, cs: cs, word: true };
    }
    if ((m = /^(\?\?(?!=)|\.\.|[+*\/%](?!=)|-(?![=\-])(?=[\s\d$(.@'"\[]|$))/.exec(s))) return { op: m[1], len: m[1].length };
    return null;
  };
  PP.binLevel = function (op) {
    if (op === "??") return 0;
    if (NIVEL[op]) return NIVEL[op];
    if (op === "+" || op === "-") return 4;
    if (op === "*" || op === "/" || op === "%") return 5;
    if (op === "f") return 6;
    if (op === "..") return 8;
    return 3;
  };
  PP.logical = function (noComma) { return this.binary(0, noComma); };
  PP.binary = function (min, noComma) {
    var left = min >= 7 ? (min === 7 ? this.comma(noComma) : this.unary()) : this.binary(min + 1, noComma);
    if (min === 7) return left;
    for (;;) {
      var save = this.i; this.ws();
      if (this.eof()) { this.i = save; break; }
      var o = this.binop();
      if (!o || this.binLevel(o.op) !== min) { this.i = save; break; }
      var opPos = this.i;
      this.i += o.len; this.wsn();
      if (this.endStmt() || this.c() === "|") this.fail("You must provide a value expression following the '" + this.s.slice(opPos, opPos + o.len) + "' operator.", this.i);
      var right = min === 8 ? this.unary() : this.binary(min + 1, noComma);
      left = { t: "bin", op: o.op, cs: o.cs, l: left, r: right, p: left.p, opPos: opPos };
      if (min === 8) break;
    }
    return left;
  };
  // níveis: 0 ??, 1 -and/-or, 2 bit, 3 comparação, 4 + -, 5 * / %, 6 -f, 7 vírgula, 8 .., unário
  PP.comma = function (noComma) {
    var first = this.binary(8, noComma);
    if (noComma) return first;
    var items = [first];
    for (;;) {
      var save = this.i; this.ws();
      if (this.c() === ",") { this.i++; this.wsn(); items.push(this.binary(8, true)); } else { this.i = save; break; }
    }
    return items.length === 1 ? first : { t: "array", items: items, p: first.p };
  };
  PP.unary = function () {
    var p = this.i, c = this.c(), m;
    if (c === "!") { this.i++; this.ws(); return { t: "un", op: "not", e: this.unaryReq("!"), p: p }; }
    if ((m = /^-(not|bnot|split|join)(?![\w-])/i.exec(this.s.slice(this.i)))) {
      this.i += m[0].length; this.ws(); return { t: "un", op: lc(m[1]), e: this.unaryReq(m[0]), p: p };
    }
    if (c === "," ) { this.i++; this.ws(); return { t: "un", op: ",", e: this.unaryReq(","), p: p }; }
    if ((c === "+" || c === "-") && this.c(1) === c) { this.i += 2; var t = this.unary(); return { t: "preinc", op: c + c, e: t, p: p }; }
    if (c === "-" && !/[0-9.]/.test(this.c(1))) { this.i++; this.ws(); return { t: "un", op: "neg", e: this.unaryReq("-"), p: p }; }
    if (c === "+" ) { this.i++; this.ws(); return { t: "un", op: "pos", e: this.unaryReq("+"), p: p }; }
    if (c === "-" && /[0-9.]/.test(this.c(1))) {
      var n = this.lexNumber(1);
      if (n) { this.i = n.end; return this.postfix({ t: "num", v: -n.v, p: p }); }
      this.i++; return { t: "un", op: "neg", e: this.unary(), p: p };
    }
    if (c === "[") {
      var tl = this.typeLit();
      if (tl) {
        if (this.c() === ":" && this.c(1) === ":") return this.postfix(tl);
        if (this.c() === "." && isIdS(this.c(1))) return this.postfix(tl);
        var save = this.i; this.ws();
        var c2 = this.c();
        if (c2 && (c2 === "$" || c2 === "(" || c2 === "@" || c2 === "[" || SQ.indexOf(c2) !== -1 || DQ.indexOf(c2) !== -1 || /[0-9]/.test(c2) || (c2 === "-" && /[0-9$(]/.test(this.c(1))) || c2 === "+" || c2 === "!")) {
          return { t: "cast", type: tl.name, e: this.unary(), p: p };
        }
        this.i = save; return tl;
      }
    }
    var e = this.postfix(this.primary());
    return e;
  };
  PP.unaryReq = function (op) {
    if (this.endStmt()) this.fail("Missing expression after unary operator '" + op + "'.", this.i);
    return this.unary();
  };
  PP.typeLit = function () {
    var m = /^\[\s*([A-Za-z_][\w.]*(?:\[\])?)\s*\]/.exec(this.s.slice(this.i));
    if (!m) return null;
    var p = this.i; this.i += m[0].length;
    return { t: "type", name: m[1], p: p };
  };
  PP.lexNumber = function (off) {
    var j = this.i + (off || 0), s = this.s.slice(j, j + 40), m;
    if ((m = /^0x([0-9a-f]+)(l)?/i.exec(s))) return { v: parseInt(m[1], 16), end: j + m[0].length };
    if ((m = /^0b([01]+)/i.exec(s))) return { v: parseInt(m[1], 2), end: j + m[0].length };
    m = /^(\d+(?:\.\d+)?|\.\d+)(e[+-]?\d+)?(ul|uy|us|[ldnusy])?(kb|mb|gb|tb|pb)?/i.exec(s);
    if (!m) return null;
    var v = parseFloat(m[1] + (m[2] || ""));
    if (m[4]) v *= { kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776, pb: 1125899906842624 }[lc(m[4])];
    return { v: v, end: j + m[0].length, dbl: m[1].indexOf(".") !== -1 || !!m[2] };
  };
  PP.variable = function () { // em $ ; devolve {t:'var', name}
    var p = this.i; this.i++;
    var c = this.c(), name;
    if (c === "{") { var j = this.s.indexOf("}", this.i); if (j === -1) this.fail("Missing '}' in variable reference.", p); name = this.s.slice(this.i + 1, j); this.i = j + 1; return { t: "var", name: name, p: p }; }
    if (c === "?" || c === "^" || c === "$") { this.i++; return { t: "var", name: c, p: p }; }
    var m = /^[\w\u00c0-\u024f]+/.exec(this.s.slice(this.i));
    if (!m) return { t: "str", v: "$", p: p };
    name = m[0]; this.i += name.length;
    if (this.c() === ":" && this.c(1) !== ":") {
      if (isIdC(this.c(1))) { var m2 = /^:[\w\u00c0-\u024f]+/.exec(this.s.slice(this.i)); name += m2[0]; this.i += m2[0].length; }
      else this.fail("Variable reference is not valid. ':' was not followed by a valid variable name character. Consider using ${} to delimit the name.", p, this.i + 1 - p);
    }
    return { t: "var", name: name, p: p };
  };
  PP.subExpr = function () { // em ( depois de $
    var p = this.i - 1; this.i++;
    var body = this.statements(")");
    if (this.c() !== ")") this.fail("Missing closing ')' in subexpression.", p);
    this.i++;
    return { t: "sub", body: body, p: p };
  };
  PP.primary = function () {
    var p = this.i, c = this.c(), c1 = this.c(1);
    if (c === "$") {
      if (c1 === "(") { this.i++; return this.subExpr(); }
      return this.variable();
    }
    if (c === "@") {
      if (c1 === "(") { this.i += 2; var b = this.statements(")"); if (this.c() !== ")") this.fail("Missing closing ')' in subexpression.", p); this.i++; return { t: "arrsub", body: b, p: p }; }
      if (c1 === "{") { this.i += 2; return this.hashLit(p); }
      if (c1 === '"' || c1 === "'" || DQ.indexOf(c1) !== -1 || SQ.indexOf(c1) !== -1) return this.hereString();
      var sm = /^@(\w+)/.exec(this.s.slice(this.i));
      if (sm) { this.i += sm[0].length; return { t: "splat", name: sm[1], p: p }; }
    }
    if (c === "(") {
      this.i++; this.wsn();
      var inner = this.c() === ")" ? null : this.pipelineOrStmt();
      this.wsn();
      if (this.c() !== ")") { if (this.eof()) this.fail("Missing closing ')' in expression.", p); this.fail("Missing closing ')' in expression.", this.i); }
      this.i++;
      return { t: "paren", e: inner, p: p };
    }
    if (c === "{") return this.scriptBlock();
    if (SQ.indexOf(c) !== -1) return this.sqString();
    if (DQ.indexOf(c) !== -1) return this.dqString();
    if (c === "[") { var tl = this.typeLit(); if (tl) return tl; }
    if (/[0-9.]/.test(c)) {
      var n = this.lexNumber();
      if (n) {
        if (isIdC(this.s.charAt(n.end))) { var bad = /^[\w.]+/.exec(this.s.slice(this.i))[0]; this.fail("Unexpected token '" + bad + "' in expression or statement.", this.i, bad.length); }
        this.i = n.end; return { t: "num", v: n.v, p: p };
      }
    }
    if (this.eof() || c === "\n") this.fail("You must provide a value expression following the operator.", this.i);
    var tk = this.tokenAt();
    this.fail("Unexpected token '" + tk + "' in expression or statement.", this.i, tk.length);
  };
  PP.hashLit = function (p) {
    var entries = [];
    for (;;) {
      this.wsn(); while (this.c() === ";") { this.i++; this.wsn(); }
      if (this.c() === "}") { this.i++; break; }
      if (this.eof()) this.fail("Missing closing '}' in hash literal.", p);
      var key, c = this.c(), m;
      if (SQ.indexOf(c) !== -1 || DQ.indexOf(c) !== -1 || c === "$" || c === "(") key = this.postfix(this.primary());
      else if ((m = /^[\w\u00c0-\u024f.-]+/.exec(this.s.slice(this.i)))) {
        this.i += m[0].length;
        key = /^\d+$/.test(m[0]) ? { t: "num", v: +m[0] } : { t: "str", v: m[0] };
      } else this.fail("Missing key before '=' in hash literal.", this.i);
      this.ws();
      if (this.c() !== "=") this.fail("Missing '=' operator after key in hash literal.", this.i);
      this.i++; this.wsn();
      var val = this.pipelineOrStmt();
      entries.push({ k: key, v: val });
      this.ws();
      if (this.c() !== ";" && this.c() !== "\n" && this.c() !== "}") this.fail("Missing statement after '=' in hash literal.", this.i);
    }
    return { t: "hash", entries: entries, p: p };
  };
  PP.sqString = function () {
    var p = this.i; this.i++; var out = "";
    for (;;) {
      if (this.eof()) this.fail("The string is missing the terminator: '.", p);
      var c = this.c();
      if (SQ.indexOf(c) !== -1) { if (SQ.indexOf(this.c(1)) !== -1) { out += c; this.i += 2; continue; } this.i++; break; }
      out += c; this.i++;
    }
    return { t: "str", v: out, p: p };
  };
  var ESC = { "0": "\0", a: "\x07", b: "\b", e: "\x1b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" };
  PP.dqString = function () {
    var p = this.i; this.i++;
    var parts = this.xparts(function (s) {
      var c = s.c();
      if (DQ.indexOf(c) !== -1) { if (DQ.indexOf(s.c(1)) !== -1) return 2; return 1; }
      return 0;
    }, p, '"');
    return parts.length === 1 && typeof parts[0] === "string" ? { t: "str", v: parts[0], p: p } : parts.length === 0 ? { t: "str", v: "", p: p } : { t: "xstr", parts: parts, p: p };
  };
  // partes de um texto expansível; fim(s) devolve 1 = terminou, 2 = aspas dobradas (vira uma aspa), 0 = segue
  PP.xparts = function (fim, p, q) {
    var parts = [], buf = "";
    for (;;) {
      if (this.eof()) this.fail("The string is missing the terminator: " + q + ".", p);
      var f = fim(this);
      if (f === 1) { this.i += this.endLen || 1; this.endLen = 0; break; }
      if (f === 2) { buf += this.c(); this.i += 2; continue; }
      var c = this.c();
      if (c === "`") {
        var e = this.c(1);
        if (e === "u" && this.c(2) === "{") { var j = this.s.indexOf("}", this.i); buf += String.fromCodePoint(parseInt(this.s.slice(this.i + 3, j), 16)); this.i = j + 1; continue; }
        buf += hasOwn(ESC, e) ? ESC[e] : e; this.i += 2; continue;
      }
      if (c === "$") {
        var n1 = this.c(1);
        if (n1 === "(") { if (buf) parts.push(buf); buf = ""; this.i++; parts.push(this.subExpr()); continue; }
        if (isIdS(n1) || n1 === "{" || n1 === "?" || n1 === "^" || n1 === "$" || n1 === "_") { if (buf) parts.push(buf); buf = ""; parts.push(this.variable()); continue; }
      }
      buf += c; this.i++;
    }
    if (buf) parts.push(buf);
    return parts;
  };
  PP.hereString = function () {
    var p = this.i, q = this.c(1), dq = DQ.indexOf(q) !== -1; this.i += 2;
    this.ws();
    if (this.c() !== "\n") this.fail("No characters are allowed after a here-string header but before the end of the line.", this.i);
    this.i++;
    var start = this.i, s = this.s, qs = dq ? DQ : SQ;
    // acha o fim: linha que começa com "@
    var j = start, endAt = -1;
    while (j <= s.length) {
      var le = s.indexOf("\n", j); if (le === -1) le = s.length;
      var line = s.slice(j, le);
      if (qs.indexOf(line.charAt(0)) !== -1 && line.charAt(1) === "@") { endAt = j; break; }
      var mm = /^[ \t]+(.)@/.exec(line);
      if (mm && qs.indexOf(mm[1]) !== -1) this.fail("White space is not allowed before the string terminator.", j, line.indexOf("@") + 1);
      if (le >= s.length) break;
      j = le + 1;
    }
    if (endAt === -1) this.fail("The string is missing the terminator: " + (dq ? '"' : "'") + "@.", p, 2);
    var contentEnd = endAt > start ? endAt - 1 : start;
    if (!dq) { this.i = endAt + 2; return { t: "str", v: s.slice(start, contentEnd), p: p }; }
    var self = this;
    this.i = start;
    var parts = endAt > start ? this.xparts(function (ps) { if (ps.i >= contentEnd) { ps.endLen = 0; return 1; } return 0; }, p, '"@') : [];
    this.i = endAt + 2;
    return parts.length === 1 && typeof parts[0] === "string" ? { t: "str", v: parts[0], p: p } : parts.length === 0 ? { t: "str", v: "", p: p } : { t: "xstr", parts: parts, p: p };
  };
  PP.postfix = function (e) {
    for (;;) {
      var c = this.c(), c1 = this.c(1);
      if ((c === "." && c1 !== ".") || (c === ":" && c1 === ":") || (c === "?" && c1 === "." && e.t === "var" )) {
        var stat = c === ":"; this.i += stat ? 2 : c === "?" ? 2 : 1;
        var name, m, np = this.i;
        if ((m = /^[\w\u00c0-\u024f]+/.exec(this.s.slice(this.i)))) { name = m[0]; this.i += name.length; }
        else if (this.c() === "$" || SQ.indexOf(this.c()) !== -1 || DQ.indexOf(this.c()) !== -1 || this.c() === "(") name = this.primary();
        else this.fail("Missing property name after reference operator.", this.i);
        if (this.c() === "(" ) {
          this.i++; var args = [];
          this.wsn();
          if (this.c() !== ")") for (;;) {
            this.wsn(); args.push(this.expr(true)); this.wsn();
            if (this.c() === ",") { this.i++; continue; }
            if (this.c() === ")") break;
            this.fail("Missing ')' in method call.", this.i);
          }
          this.i++;
          e = { t: "invoke", obj: e, name: name, args: args, stat: stat, p: e.p, np: np };
        } else e = { t: "member", obj: e, name: name, stat: stat, p: e.p };
        continue;
      }
      if (c === "[" && e.t !== "type") {
        var ip = this.i; this.i++; this.wsn();
        var idx = this.expr(false); this.wsn();
        if (this.c() !== "]") this.fail("Missing ']' after array index expression.", ip + 1);
        this.i++;
        e = { t: "index", obj: e, idx: idx, p: e.p };
        continue;
      }
      if ((c === "+" && c1 === "+") || (c === "-" && c1 === "-" && !isIdS(this.c(2)))) {
        if (e.t === "var" || e.t === "member" || e.t === "index") { this.i += 2; e = { t: "postinc", op: c + c, e: e, p: e.p }; continue; }
      }
      break;
    }
    return e;
  };
  function parse(src) { return new Parser(String(src).replace(/\r\n?/g, "\n")).parseScript(); }

  /* ------------------------------------------------------------------
     5. Disco de mentira (só na memória)
     ------------------------------------------------------------------ */
  function FSNode(name, dir, parent, now) {
    this.name = name; this.dir = dir; this.parent = parent; this.kids = dir ? {} : null;
    this.content = ""; this.mtime = now; this.hidden = false;
  }
  function FS(now) {
    this.now = now;
    this.root = new FSNode("C:", true, null, now);
    var self = this;
    ["Users\\ana\\Desktop", "Users\\ana\\Documentos", "Users\\ana\\Downloads", "Users\\ana\\Imagens", "Users\\ana\\Músicas", "Users\\ana\\Vídeos",
      "Users\\ana\\AppData\\Local\\Temp", "Users\\Public", "Windows\\System32", "Program Files\\PowerShell\\7"].forEach(function (p) { self.mkdirs(p.split("\\")); });
    this.root.kids["users"].kids["ana"].kids["appdata"].hidden = true;
  }
  FS.prototype.mkdirs = function (segs) {
    var n = this.root;
    for (var i = 0; i < segs.length; i++) {
      var k = lc(segs[i]);
      if (!n.kids[k]) n.kids[k] = new FSNode(segs[i], true, n, this.now);
      n = n.kids[k];
      if (!n.dir) return null;
    }
    return n;
  };
  FS.prototype.node = function (segs) {
    var n = this.root;
    for (var i = 0; i < segs.length; i++) { if (!n.dir) return null; n = n.kids[lc(segs[i])]; if (!n) return null; }
    return n;
  };
  function fullOf(segs) { return "C:\\" + segs.join("\\"); }
  function segsOf(node) { var r = []; while (node && node.parent) { r.unshift(node.name); node = node.parent; } return r; }
  function wildRe(p) {
    var r = "^";
    for (var i = 0; i < p.length; i++) {
      var c = p[i];
      if (c === "*") r += ".*"; else if (c === "?") r += ".";
      else if (c === "[") { var j = p.indexOf("]", i); if (j === -1) r += "\\["; else { r += "[" + p.slice(i + 1, j).replace(/\\/g, "\\\\") + "]"; i = j; } }
      else if (c === "`" && i + 1 < p.length) { r += p[i + 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); i++; }
      else r += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp(r + "$", "i");
  }
  function hasWild(s) { return /[*?[]/.test(s); }
  function fileLen(s) { // bytes em UTF-8
    var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? (i++, 4) : 3; } return n;
  }

  /* ------------------------------------------------------------------
     6. Sessão e avaliador
     ------------------------------------------------------------------ */
  function Scope(parent) { this.parent = parent; this.vars = {}; }
  var ENV0 = {
    USERNAME: "ana", USERPROFILE: HOME, HOMEDRIVE: "C:", HOMEPATH: "\\Users\\ana", COMPUTERNAME: "NOTEBOOK", OS: "Windows_NT",
    TEMP: HOME + "\\AppData\\Local\\Temp", TMP: HOME + "\\AppData\\Local\\Temp", APPDATA: HOME + "\\AppData\\Roaming", LOCALAPPDATA: HOME + "\\AppData\\Local",
    SystemRoot: "C:\\Windows", windir: "C:\\Windows", ProgramFiles: "C:\\Program Files", PSModulePath: HOME + "\\Documents\\PowerShell\\Modules;C:\\Program Files\\PowerShell\\Modules",
    PATH: "C:\\Program Files\\PowerShell\\7;C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;" + HOME + "\\AppData\\Local\\Microsoft\\WindowsApps",
    PATHEXT: ".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSH;.MSC;.CPL", NUMBER_OF_PROCESSORS: "8", PROCESSOR_ARCHITECTURE: "AMD64"
  };

  function Session(opts) {
    opts = opts || {};
    this.opts = opts;
    this.now = opts.now ? opts.now() : new Date();
    this.fs = new FS(this.now);
    this.cwd = ["Users", "ana"];
    if (opts.missao) { this.fs.mkdirs(["Users", "ana", "guia-ps-teste"]); this.cwd = ["Users", "ana", "guia-ps-teste"]; }
    this.base = this.cwd.slice();
    this.stack = [];
    this.global = new Scope(null); this.scope = this.global;
    this.env = {}; for (var k in ENV0) this.env[lc(k)] = { n: k, v: ENV0[k] };
    this.funcs = {};
    this.lines = []; this.open = false;
    this.dq = true; this.okNow = true; this.lastExit = 0; this.exitCode = 0;
    this.errors = []; this.redir = []; this.strict = false; this.tryDepth = 0;
    this.history = [];
    this.view = null; this.pend = null;
    this.prefs = { verbose: "SilentlyContinue", warning: "Continue", information: "SilentlyContinue", debug: "SilentlyContinue", error: "Continue" };
    this.userAliases = {};
  }
  var S = Session.prototype;

  // ---------- saída para a tela ----------
  S.write = function (text, kind, noNewline) {
    var parts = String(text).split("\n");
    for (var i = 0; i < parts.length; i++) {
      if (i === 0 && this.open && this.lines.length) {
        var last = this.lines[this.lines.length - 1];
        if (last.k === (kind || "out") || !parts[0]) last.t += parts[0]; else this.lines.push({ t: parts[0], k: kind || "out", cont: true });
      } else this.lines.push({ t: parts[i], k: kind || "out" });
    }
    this.open = !!noNewline;
  };
  S.hostWrite = function (text, kind, noNewline) { this.closeView(); this.write(text, kind, noNewline); };
  S.text = function () { return this.lines.map(function (l) { return l.t; }).join("\n"); };

  S.tick = function () {
    this.steps = (this.steps || 0) + 1;
    if (this.steps > LIMITE_PASSOS) throw new Limite("O simulador parou o script: passou de " + LIMITE_PASSOS.toLocaleString("pt-BR") + " passos. Será que tem um laço sem fim? (No PowerShell de verdade, Ctrl+C interrompe.)");
    if ((this.steps & 1023) === 0 && Date.now() - this.t0 > LIMITE_MS) throw new Limite("O simulador parou o script: passou de " + (LIMITE_MS / 1000) + " segundos rodando. Será que tem um laço sem fim? (No PowerShell de verdade, Ctrl+C interrompe.)");
  };

  // ---------- erros ----------
  S.errText = function (e) {
    if (e.parse) return this.parseFrame(e);
    var label = this.iexDepth && (e.notFound || !e.cmd) && !e.parse ? "Invoke-Expression" : e.cmd || e.cat || "RuntimeException";
    return label + ": " + e.message;
  };
  S.parseFrame = function (e) {
    var src = this.src || "", pos = Math.min(e.parse.pos, src.length), before = src.slice(0, pos);
    var lineNo = before.split("\n").length, ls = before.lastIndexOf("\n") + 1, le = src.indexOf("\n", ls); if (le === -1) le = src.length;
    var line = src.slice(ls, le), col = pos - ls, len = Math.max(1, Math.min(e.parse.len || 1, Math.max(1, line.length - col)));
    var out = [(e.viaIex ? "" : "") + (e.cmd ? e.cmd + ": " : "ParserError:")];
    if (e.cmd) return e.cmd + ": " + e.message;
    out.push("Line |");
    out.push(padL(String(lineNo), 4) + " |  " + line);
    out.push("     |  " + rep(" ", col) + rep("~", len));
    var words = e.message.split(" "), cur = "";
    words.forEach(function (w) { if (cur && (cur + " " + w).length > 113) { out.push("     | " + cur); cur = w; } else cur = cur ? cur + " " + w : w; });
    if (cur) out.push("     | " + cur);
    return out.join("\n");
  };
  S.writeError = function (e, force) {
    this.okNow = false;
    var top = this.redir.length ? this.redir[this.redir.length - 1] : null;
    this.errors.unshift(e);
    if (!force && top && top.err === "null") return;
    if (!force && top && top.err === "merge" && top.sink) { top.sink.push(new PSObj("System.Management.Automation.ErrorRecord", { Exception: e.message }, { err: e, toStr: function () { return e.message; } })); return; }
    if (!force && top && top.err === "file" && top.file) { top.file.push(this.errText(e)); return; }
    this.hostWrite(this.errText(e), "err");
  };
  S.warn = function (msg) {
    var top = this.redir.length ? this.redir[this.redir.length - 1] : null;
    if (top && top.warn === "null") return;
    if (top && top.warn === "merge" && top.sink) { top.sink.push(msg); return; }
    this.hostWrite("AVISO: " + msg, "warn");
  };

  // ---------- caminhos ----------
  S.resolve = function (p, cmd) {
    p = toStr(p).replace(/\//g, "\\");
    if (p === "") throw new PSErr("Cannot bind argument to parameter 'Path' because it is an empty string.", "InvalidData", { cmd: cmd });
    if (p[0] === "~" && (p.length === 1 || p[1] === "\\")) p = HOME + p.slice(1);
    var m = /^([A-Za-z][\w]*):(.*)$/.exec(p), segs;
    if (m) {
      var drv = lc(m[1]);
      if (drv === "c") { segs = []; p = m[2]; }
      else if (drv === "env") return { drive: "env", name: m[2].replace(/^\\/, ""), full: "Env:" + m[2] };
      else if (drv === "hkcu" || drv === "hklm" || drv === "registry") return { drive: "reg", full: p };
      else if (drv === "alias" || drv === "function" || drv === "variable" || drv === "cert" || drv === "wsman" || drv === "temp") return { drive: drv, name: m[2].replace(/^\\/, ""), full: p };
      else throw new PSErr("Cannot find drive. A drive with the name '" + m[1] + "' does not exist.", "DriveNotFound", { cmd: cmd });
    } else if (p[0] === "\\") segs = [];
    else segs = this.cwd.slice();
    p.split("\\").forEach(function (s) {
      if (s === "" || s === ".") return;
      if (s === "..") { segs.pop(); return; }
      segs.push(s);
    });
    return { drive: "c", segs: segs, full: fullOf(segs) };
  };
  S.cwdFull = function () { return fullOf(this.cwd); };
  // expande curingas: devolve lista de {segs, node}; inexistente sem curinga -> [] e erro
  S.expand = function (p, cmd, quiet, literal) {
    var r = this.resolve(p, cmd);
    if (r.drive !== "c") return [r];
    var segs = r.segs;
    if (literal || !segs.some(hasWild)) {
      var n = this.fs.node(segs);
      if (!n) { if (quiet) return []; throw this.notFound(r.full, cmd); }
      return [{ segs: segs, node: n, full: r.full, drive: "c" }];
    }
    var res = [{ segs: [], node: this.fs.root }];
    for (var i = 0; i < segs.length; i++) {
      var next = [];
      res.forEach(function (x) {
        if (!x.node.dir) return;
        if (hasWild(segs[i])) {
          var re = wildRe(segs[i]);
          Object.keys(x.node.kids).sort().forEach(function (k) { var c = x.node.kids[k]; if (re.test(c.name)) next.push({ segs: x.segs.concat([c.name]), node: c }); });
        } else { var c = x.node.kids[lc(segs[i])]; if (c) next.push({ segs: x.segs.concat([c.name]), node: c }); }
      });
      res = next;
    }
    res.forEach(function (x) { x.full = fullOf(x.segs); x.drive = "c"; });
    return res;
  };
  S.notFound = function (full, cmd) {
    return new PSErr("Não é possível localizar o caminho '" + full + "' porque ele não existe.", "ObjectNotFound", { cmd: cmd });
  };
  S.item = function (node) { // FileInfo / DirectoryInfo
    var segs = segsOf(node), full = fullOf(segs), dot = node.name.lastIndexOf(".");
    var ext = node.dir ? (dot > 0 ? node.name.slice(dot) : "") : (dot >= 0 ? node.name.slice(dot) : "");
    var o = new PSObj(node.dir ? "System.IO.DirectoryInfo" : "System.IO.FileInfo", {});
    var mode = (node.dir ? "d" : "-") + (node.dir ? "-" : "a") + "-" + (node.hidden ? "h" : "-") + "-";
    o.set("Name", node.name);
    if (!node.dir) o.set("Length", fileLen(node.content));
    o.set("FullName", full);
    o.set("Extension", ext);
    o.set("BaseName", node.dir ? node.name : (dot > 0 ? node.name.slice(0, dot) : node.name));
    o.set("Mode", mode);
    o.set("LastWriteTime", new PSDate(node.mtime));
    o.set("CreationTime", new PSDate(node.mtime));
    o.set("Attributes", new PSEnum("System.IO.FileAttributes", (node.dir ? "Directory" : "Archive") + (node.hidden ? ", Hidden" : ""), 0));
    o.set("PSIsContainer", node.dir);
    o.set("Exists", true);
    if (node.dir) { o.set("Parent", node.parent ? node.parent.name : null); o.set("Root", "C:\\"); }
    else { o.set("DirectoryName", fullOf(segsOf(node.parent))); o.set("Directory", fullOf(segsOf(node.parent))); o.set("IsReadOnly", false); }
    o.set("PSPath", "Microsoft.PowerShell.Core\\FileSystem::" + full);
    o.set("PSParentPath", "Microsoft.PowerShell.Core\\FileSystem::" + fullOf(segsOf(node.parent)));
    o.set("PSChildName", node.name);
    o.fsNode = node; o.fsFull = full; o.parentFull = fullOf(segsOf(node.parent));
    o.toStr = function () { return full; };
    return o;
  };
  S.pathArg = function (v) { // aceita texto ou item do disco vindo pelo pipeline
    if (v instanceof PSObj) { if (v.fsFull) return v.fsFull; if (v.has("FullName")) return toStr(v.get("FullName")); if (v.has("Path")) return toStr(v.get("Path")); }
    return toStr(v);
  };
  S.pathInfo = function () {
    var full = this.cwdFull(), cwd = this.cwd.join("\\");
    var drv = new PSObj("System.Management.Automation.PSDriveInfo", { Name: "C", Provider: "Microsoft.PowerShell.Core\\FileSystem", Root: "C:\\", CurrentLocation: cwd, Description: "" });
    drv.toStr = function () { return "C"; }; drv.fmtDrive = true;
    var o = new PSObj("System.Management.Automation.PathInfo", { Drive: drv, Provider: "Microsoft.PowerShell.Core\\FileSystem", ProviderPath: full, Path: full });
    o.toStr = function () { return full; };
    return o;
  };

  // ---------- variáveis ----------
  var CONST = { "true": true, "false": false, "null": null };
  S.findVar = function (name) {
    for (var sc = this.scope; sc; sc = sc.parent) if (hasOwn(sc.vars, name)) return sc.vars[name];
    return null;
  };
  S.getVar = function (raw, node) {
    var name = lc(raw), m = /^(global|script|local|private|using|variable):(.+)$/.exec(name);
    if (m) name = m[2];
    if (/^env:/.test(name)) { var e = this.env[name.slice(4)]; return e ? e.v : null; }
    if (hasOwn(CONST, name)) return CONST[name];
    switch (name) {
      case "?": return this.dq;
      case "psitem": name = "_"; break;
      case "home": return HOME;
      case "pwd": return this.pathInfo();
      case "lastexitcode": return this.lastExit;
      case "psversiontable": return psVersionTable();
      case "psedition": return "Core";
      case "iswindows": return true;
      case "islinux": return false;
      case "ismacos": return false;
      case "iscoreclr": return true;
      case "host": return hostObj();
      case "pid": return 18112;
      case "pshome": return "C:\\Program Files\\PowerShell\\7";
      case "profile": return HOME + "\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1";
      case "pscommandpath": return this.opts.missao ? this.cwdBaseFull() + "\\main.ps1" : null;
      case "psscriptroot": return this.opts.missao ? this.cwdBaseFull() : "";
      case "shellid": return "Microsoft.PowerShell";
      case "psculture": return "pt-BR";
      case "psuiculture": return "pt-BR";
      case "error": return this.errors.map(function (e) { return e.message; });
      case "verbosepreference": return new PSEnum("System.Management.Automation.ActionPreference", this.prefs.verbose, 0);
      case "warningpreference": return new PSEnum("System.Management.Automation.ActionPreference", this.prefs.warning, 0);
      case "informationpreference": return new PSEnum("System.Management.Automation.ActionPreference", this.prefs.information, 0);
      case "debugpreference": return new PSEnum("System.Management.Automation.ActionPreference", this.prefs.debug, 0);
      case "erroractionpreference": return new PSEnum("System.Management.Automation.ActionPreference", this.prefs.error, 0);
      case "maximumhistorycount": return 4096;
      case "nestedpromptlevel": return 0;
      case "ofs": var o = this.findVar("ofs"); return o ? o.v : null;
    }
    var v = this.findVar(name);
    if (v) return v.v;
    if (this.strict && node) throw new PSErr("The variable '$" + raw + "' cannot be retrieved because it has not been set.", "InvalidOperation");
    return null;
  };
  S.cwdBaseFull = function () { return fullOf(this.base); };
  S.setVar = function (raw, v, local) {
    var name = lc(raw), m = /^(global|script|local|private|variable):(.+)$/.exec(name), sc = this.scope;
    if (m) { name = m[2]; if (m[1] === "global" || m[1] === "script") sc = this.global; }
    if (/^env:/.test(name)) { var k = raw.slice(4); if (v === null || v === "") delete this.env[lc(k)]; else this.env[lc(k)] = { n: k, v: toStr(v) }; return; }
    if (hasOwn(CONST, name) || name === "?" || name === "home" || name === "pwd" || name === "host" || name === "pid" || name === "psversiontable" || name === "iswindows" || name === "islinux" || name === "ismacos" || name === "psedition")
      throw new PSErr("Cannot overwrite variable " + raw + " because it is read-only or constant.", "SessionStateUnauthorizedAccessException");
    if (name === "psitem") name = "_";
    var pref = { verbosepreference: "verbose", warningpreference: "warning", informationpreference: "information", debugpreference: "debug", erroractionpreference: "error" }[name];
    if (pref) { this.prefs[pref] = toStr(v); return; }
    if (name === "lastexitcode") { this.lastExit = toNumber(v); return; }
    var ex = !local && !m ? this.findVar(name) : (hasOwn(sc.vars, name) ? sc.vars[name] : null);
    if (ex && ex.type) v = convertTo(ex.type, v);
    if (ex) ex.v = v; else sc.vars[name] = { n: raw, v: v };
  };

  // ---------- execução ----------
  S.runText = function (code, opts) {
    opts = opts || {};
    this.src = String(code).replace(/\r\n?/g, "\n");
    this.t0 = Date.now(); this.steps = 0;
    var ast;
    try { ast = parse(this.src); }
    catch (e) {
      if (e && e.ps) { this.writeError(e, true); this.dq = false; return { parseError: true }; }
      throw e;
    }
    var res = { };
    try { this.execTop(ast.body); }
    catch (e) {
      if (e instanceof Ctl && e.kind === "exit") { this.exitCode = e.value; this.lastExit = e.value; res.exited = true; }
      else if (e instanceof Ctl) { /* break/continue/return fora de laço: termina o script */ }
      else if (e && e.limite) { this.flushView(); this.closeView(); this.hostWrite(e.message, "err"); res.limite = true; }
      else if (e && e.ps) { this.flushView(); this.writeError(e, true); this.dq = false; this.exitCode = 1; }
      else { this.flushView(); this.hostWrite("Erro interno do simulador: " + (e && e.message || e) + ". Avise quem mantém o guia.", "err"); res.interno = String(e && e.stack || e); }
    }
    this.flushView(); this.closeView();
    return res;
  };
  S.execTop = function (stmts) {
    var self = this;
    for (var i = 0; i < stmts.length; i++) {
      this.execStmt(stmts[i], function (v) { self.outDefault(v); });
      this.flushView();
    }
  };
  S.execBlock = function (stmts, emit) {
    for (var i = 0; i < stmts.length; i++) this.execStmt(stmts[i], emit);
  };
  S.execStmt = function (st, emit) {
    this.tick();
    this.okNow = true;
    try {
      this.execStmtInner(st, emit);
    } catch (e) {
      if (e && e.ps && !e.terminating && !this.tryDepth) { this.writeError(e); }
      else throw e;
    }
    if (st.t !== "if" && st.t !== "foreach" && st.t !== "for" && st.t !== "while" && st.t !== "do" && st.t !== "switch" && st.t !== "try") this.dq = this.okNow;
  };
  S.emitVal = function (v, emit) {
    if (v === undefined) return;
    if (isArr(v)) { for (var i = 0; i < v.length; i++) emit(v[i]); return; }
    if (v === null) return;
    emit(v);
  };
  S.collect = function (fn) { var out = []; fn(function (v) { out.push(v); }); return out; };
  function unwrap(a) { return a.length === 0 ? null : a.length === 1 ? a[0] : a; }
  S.valueOf = function (node) { // valor de um "statement" (RHS de atribuição, condição)
    if (node.t === "pipe" && node.elems.length === 1 && node.elems[0].t === "exprel" && !node.elems[0].redirs.length) return this.eval(node.elems[0].e);
    if (node.t === "assign") { this.execStmtInner(node, function () { }); return this.eval(node.target); }
    var self = this;
    return unwrap(this.collect(function (emit) { self.execStmtInner(node, emit); }));
  };
  S.loopBody = function (body, emit, label) { // devolve "break" para parar o laço
    try { this.execBlock(body, emit); }
    catch (e) {
      if (e instanceof Ctl && (e.kind === "break" || e.kind === "continue") && (!e.label || (label && lc(e.label) === lc(label)))) return e.kind;
      throw e;
    }
    return null;
  };
  S.execStmtInner = function (st, emit) {
    var self = this, r, v;
    switch (st.t) {
      case "pipe": this.execPipe(st, emit); return;
      case "chain":
        this.execStmtInner(st.l, emit);
        if (st.op === "&&" ? this.dq && this.okNow : !(this.dq && this.okNow)) { this.okNow = true; this.execStmtInner(st.r, emit); }
        return;
      case "assign": this.assign(st); return;
      case "if":
        for (var i = 0; i < st.clauses.length; i++) {
          if (truthy(this.valueOf(st.clauses[i].cond))) { this.execBlock(st.clauses[i].body, emit); return; }
        }
        if (st.els) this.execBlock(st.els, emit);
        return;
      case "while":
        while (truthy(this.valueOf(st.cond))) { this.tick(); if (this.loopBody(st.body, emit, st.label) === "break") break; }
        return;
      case "do":
        do { this.tick(); if (this.loopBody(st.body, emit, st.label) === "break") break; }
        while (st.until ? !truthy(this.valueOf(st.cond)) : truthy(this.valueOf(st.cond)));
        return;
      case "for":
        if (st.init) this.execStmtInner(st.init, emit);
        for (;;) {
          this.tick();
          if (st.cond && !truthy(this.valueOf(st.cond))) break;
          if (this.loopBody(st.body, emit, st.label) === "break") break;
          if (st.iter) this.execStmtInner(st.iter, function () { });
        }
        return;
      case "foreach":
        v = this.valueOf(st.coll);
        var list = isArr(v) ? v.slice() : v === null ? [] : [v];
        for (var j = 0; j < list.length; j++) {
          this.tick();
          this.setVar(st.v, list[j]);
          if (this.loopBody(st.body, emit, st.label) === "break") break;
        }
        return;
      case "switch": this.execSwitch(st, emit); return;
      case "break": case "continue": throw new Ctl(st.t, st.label);
      case "return":
        if (st.value) { v = this.valueOf(st.value); this.emitVal(v, emit); }
        throw new Ctl("return");
      case "exit":
        v = st.value ? this.valueOf(st.value) : 0;
        throw new Ctl("exit", null, v === null ? 0 : toInt(v));
      case "throw":
        v = st.value ? this.valueOf(st.value) : "ScriptHalted";
        var te = new PSErr(v instanceof PSObj && v.err ? v.err.message : toStr(v), "Exception", { terminating: true });
        te.thrown = v; throw te;
      case "function":
        this.funcs[lc(st.name)] = { name: st.name, sb: st.sb };
        return;
      case "param": return;
      case "try": this.execTry(st, emit); return;
    }
    throw new PSErr("O simulador ainda não sabe executar '" + st.t + "'.", "NotImplemented");
  };
  S.execTry = function (st, emit) {
    var err = null;
    this.tryDepth++;
    try { this.execBlock(st.body, emit); }
    catch (e) { if (e && e.ps) err = e; else { this.tryDepth--; this.tryDepth++; if (st.fin) { this.tryDepth--; this.execBlock(st.fin, emit); this.tryDepth++; } this.tryDepth--; throw e; } }
    this.tryDepth--;
    if (err) {
      var handled = false;
      for (var i = 0; i < st.catches.length && !handled; i++) {
        handled = true;
        var old = this.findVar("_");
        this.setVar("_", new PSObj("System.Management.Automation.ErrorRecord", { Exception: new PSObj("System.Exception", { Message: err.message }) }, { err: err, toStr: function () { return err.message; } }));
        try { this.execBlock(st.catches[i].body, emit); }
        finally { this.setVar("_", old ? old.v : null); }
      }
      if (!handled) { if (st.fin) this.execBlock(st.fin, emit); throw err; }
    }
    if (st.fin) this.execBlock(st.fin, emit);
  };
  S.execSwitch = function (st, emit) {
    var v = this.valueOf(st.v), items = isArr(v) ? v : [v], self = this, o = st.opts;
    for (var k = 0; k < items.length; k++) {
      var it = items[k], matched = false, stop = false;
      var old = this.findVar("_"), oldV = old ? old.v : null;
      this.setVar("_", it);
      try {
        for (var i = 0; i < st.clauses.length && !stop; i++) {
          var c = st.clauses[i];
          if (c.pat === "default") continue;
          var ok;
          if (c.pat.t === "sb") ok = truthy(this.callSB(new ScriptBlock(c.pat.body, c.pat.src), [], it));
          else {
            var pv = this.eval(c.pat);
            if (o.wildcard) ok = wildRe(toStr(pv)).test(toStr(it)) && (!o.cs || new RegExp(wildRe(toStr(pv)).source).test(toStr(it)));
            else if (o.regex) { var re = mkRegex(toStr(pv), o.cs); var mm = re.exec(toStr(it)); ok = !!mm; if (mm) this.setVar("matches", matchesHash(mm)); }
            else ok = o.cs ? toStr(it) === toStr(pv) : eqVals(it, pv, false);
          }
          if (ok) {
            matched = true;
            var r = this.loopBody(c.body, emit, st.label);
            if (r === "break") { stop = true; k = items.length; }
            else if (r === "continue") stop = true;
          }
        }
        if (!matched && !stop) {
          for (var d = 0; d < st.clauses.length; d++) if (st.clauses[d].pat === "default") {
            var r2 = this.loopBody(st.clauses[d].body, emit, st.label);
            if (r2 === "break") k = items.length;
          }
        }
      } finally { this.setVar("_", oldV); }
    }
  };

  // ---------- pipeline ----------
  S.execPipe = function (node, emit) {
    var items = null, self = this;
    for (var i = 0; i < node.elems.length; i++) {
      var el = node.elems[i], last = i === node.elems.length - 1;
      if (el.t === "exprel") {
        var red0 = this.pushRedir(el.redirs, null), v;
        if (node.elems.length === 1 && (el.e.t === "postinc" || el.e.t === "preinc") && !el.redirs.length) { this.popRedir(red0, null); this.eval(el.e); return; }
        try { v = this.eval(el.e); }
        catch (e) { this.popRedir(red0, null); throw e; }
        if (node.elems.length > 1) items = v === undefined ? [] : isArr(v) ? v.slice() : [v];
        else { items = []; this.emitVal(v, function (x) { items.push(x); }); }
        this.popRedir(red0, items);
      } else {
        var out = [], falha = null;
        var red = this.pushRedir(el.redirs, out);
        try { this.runCommand(el, items, function (x) { out.push(x); }, i === 0); }
        catch (e) { falha = e; }
        try { this.popRedir(red, out, null); } catch (e2) { if (!falha) falha = e2; }
        items = out;
        if (falha) { if (last) for (var q = 0; q < out.length; q++) emit(out[q]); throw falha; }
      }
    }
    if (items) for (var j = 0; j < items.length; j++) emit(items[j]);
  };
  S.pushRedir = function (redirs, sink) {
    var top = this.redir.length ? this.redir[this.redir.length - 1] : {};
    var st = { err: top.err, warn: top.warn, sink: top.sink, file: null, fileTarget: null };
    if (!redirs || !redirs.length) { this.redir.push(st); return st; }
    for (var i = 0; i < redirs.length; i++) {
      var r = redirs[i], isNull = r.target && r.target.t === "var" && lc(r.target.name) === "null";
      if (r.stream === "2" || r.stream === "*") {
        if (r.merge === "1") { st.err = "merge"; st.sink = sink; } else if (isNull) st.err = "null"; else { st.err = "file"; st.file = st.file || []; st.fileTarget = r.target; st.append = r.append; }
      }
      if (r.stream === "3" || r.stream === "*") { if (r.merge === "1") { st.warn = "merge"; st.sink = sink; } else st.warn = "null"; }
      if (r.stream === "1" || r.stream === "*") {
        if (!isNull && r.target) { st.file = st.file || []; st.fileTarget = r.target; st.append = r.append; st.outToFile = true; }
        else if (isNull) st.outNull = true;
      }
    }
    this.redir.push(st);
    return st;
  };
  S.popRedir = function (st, out, emit) {
    var i = this.redir.lastIndexOf(st); if (i !== -1) this.redir.splice(i, 1);
    if (!st) return;
    if (st.outNull && out) out.length = 0;
    if (st.fileTarget) {
      var lines = st.file.slice();
      if (st.outToFile && out) { lines = lines.concat(this.formatToLines(out)); out.length = 0; }
      var target = this.pathArg(this.eval(st.fileTarget));
      this.writeFile(target, lines.map(function (l) { return l + "\r\n"; }).join(""), st.append, "Out-File");
    }
  };

  /* ------------------------------------------------------------------
     7. Expressões, operadores, membros e métodos
     ------------------------------------------------------------------ */
  function mkRegex(p, cs, g) {
    var flags = (cs ? "" : "i") + (g ? "g" : "");
    p = String(p);
    var m = /^\(\?([imsx]+)\)/.exec(p);
    if (m) { p = p.slice(m[0].length); if (m[1].indexOf("i") !== -1 && flags.indexOf("i") === -1) flags += "i"; if (m[1].indexOf("s") !== -1) flags += "s"; if (m[1].indexOf("m") !== -1) flags += "m"; }
    p = p.replace(/\\A/g, "^").replace(/\\[Zz]/g, "$").replace(/\(\?'(\w+)'/g, "(?<$1>");
    try { return new RegExp(p, flags + "u"); }
    catch (e) {
      try { return new RegExp(p, flags); }
      catch (e2) {
        var why = /Unterminated character class/i.test(e2.message) ? "Unterminated [] set." : /Unterminated group|missing \)/i.test(e2.message) ? "Not enough )'s." : /Unmatched '\)'|unmatched \)/i.test(e2.message) ? "Too many )'s." : /Nothing to repeat/i.test(e2.message) ? "Quantifier '" + (p.match(/[*+?]/) || ["*"])[0] + "' following nothing." : "Invalid pattern.";
        throw new PSErr("Invalid pattern '" + p + "' at offset " + p.length + ". " + why, "OperationStopped");
      }
    }
  }
  function matchesHash(m) {
    var h = new PSHash();
    if (m.groups) Object.keys(m.groups).forEach(function (k) { if (m.groups[k] !== undefined) h.set(k, m.groups[k]); });
    var nomeados = m.groups ? Object.keys(m.groups).length : 0;
    for (var i = m.length - 1; i >= 0; i--) if (m[i] !== undefined && (i === 0 || i <= m.length - 1 - nomeados)) h.set(i, m[i]);
    var h2 = new PSHash(); // o PowerShell mostra os nomes e depois 0
    h.keys.slice().forEach(function (k) { h2.set(k, h.get(k)); });
    return h2;
  }
  function eqVals(l, r, cs) {
    if (l === null || l === undefined) return r === null || r === undefined;
    if (r === null || r === undefined) return false;
    if (l instanceof Switch) l = l.v;
    if (typeof l === "number") {
      if (typeof r === "number") return l === r;
      if (typeof r === "boolean") return l === (r ? 1 : 0);
      var n = typeof r === "string" ? parseNumStr(r) : (r instanceof PSChar ? NaN : (r instanceof PSEnum ? r.num : NaN));
      return n === n && l === n;
    }
    if (typeof l === "string" || l instanceof PSChar) {
      var a = toStr(l), b = toStr(r);
      return cs ? a === b : a.toLowerCase() === b.toLowerCase();
    }
    if (typeof l === "boolean") return l === truthy(r);
    if (l instanceof PSDate) { var d = r instanceof PSDate ? r : null; try { if (!d) d = convertTo("System.DateTime", r); } catch (e) { return false; } return l.d.getTime() === d.d.getTime(); }
    if (l instanceof PSEnum) return typeof r === "number" ? l.num === r : lc(l.name) === lc(toStr(r));
    if (l instanceof PSVersion || l instanceof PSSemVer) return toStr(l) === toStr(r);
    return l === r;
  }
  function cmpFail(l, r, e) {
    return new PSErr('Could not compare "' + toStr(l) + '" to "' + toStr(r) + '". Error: "' + (e && e.message || "") + '"', "InvalidOperation");
  }
  function cmpVals(l, r, cs) {
    if (l === null || l === undefined) return (r === null || r === undefined) ? 0 : -1;
    if (r === null || r === undefined) return 1;
    if (typeof l === "number" || typeof l === "boolean") {
      var a = toNumber(l), b;
      try { b = typeof r === "number" ? r : toNumber(r, "System.Int32"); } catch (e) { throw cmpFail(l, r, e); }
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (l instanceof PSDate) { var d; try { d = convertTo("System.DateTime", r); } catch (e2) { throw cmpFail(l, r, e2); } return l.d < d.d ? -1 : l.d > d.d ? 1 : 0; }
    if (l instanceof PSVersion) { var o = convertTo("System.Version", r); for (var i = 0; i < 4; i++) { if (l.p[i] !== o.p[i]) return l.p[i] < o.p[i] ? -1 : 1; } return 0; }
    var x = toStr(l), y = toStr(r);
    if (!cs) { var c = x.localeCompare(y, "pt-BR", { sensitivity: "accent" }); return c < 0 ? -1 : c > 0 ? 1 : 0; }
    var c2 = x.localeCompare(y, "pt-BR", { caseFirst: "lower" }); return c2 < 0 ? -1 : c2 > 0 ? 1 : 0;
  }
  function likeVal(l, r, cs) { var re = wildRe(toStr(r)); if (cs) re = new RegExp(re.source); return re.test(toStr(l)); }
  function addVals(l, r) {
    if (l === null || l === undefined) return isArr(r) ? r.slice() : r;
    if (isArr(l)) return l.concat(isArr(r) ? r : [r]);
    if (typeof l === "string") return l + toStr(r);
    if (l instanceof PSChar) return l.c + toStr(r);
    if (l instanceof PSHash) {
      if (!(r instanceof PSHash)) throw new PSErr("A hash table can only be added to another hash table.", "InvalidOperation");
      var h = new PSHash(l.ordered); l.keys.forEach(function (k) { h.set(k, l.get(k)); });
      r.keys.forEach(function (k) { if (h.has(k)) throw new PSErr("Item has already been added. Key in dictionary: '" + toStr(k) + "'  Key being added: '" + toStr(k) + "'", "InvalidOperation"); h.set(k, r.get(k)); });
      return h;
    }
    if (l instanceof PSEnum && /Attributes$/.test(l.type)) { var fl = l.name.split(/,\s*/).concat(toStr(r).split(/,\s*/)).filter(function (x, i, a) { return x && a.indexOf(x) === i; }); return new PSEnum(l.type, fl.join(", "), 0); }
    if (l instanceof PSDate) { if (typeof r === "number") return new PSDate(new Date(l.d.getTime() + r / 10000)); }
    if (typeof l === "number" || typeof l === "boolean") {
      if (r === null) return toNumber(l);
      if (isArr(r)) throw new PSErr('Method invocation failed because [System.Object[]] does not contain a method named \'op_Addition\'.', "InvalidOperation");
      return toNumber(l) + toNumber(r, typeOf(l) === "System.Double" ? "System.Double" : "System.Int32");
    }
    throw new PSErr("Method invocation failed because [" + typeOf(l) + "] does not contain a method named 'op_Addition'.", "InvalidOperation");
  }
  function arith(op, l, r) {
    var nm = { "-": "op_Subtraction", "*": "op_Multiply", "/": "op_Division", "%": "op_Modulus" }[op];
    if (op === "*" && typeof l === "string") { var n = toInt(r); if (n > 1e6) throw new PSErr("O simulador não repete texto tantas vezes.", "InvalidOperation"); return rep(l, Math.max(0, n)); }
    if (op === "*" && isArr(l)) { var k = toInt(r), out = []; for (var i = 0; i < k; i++) out = out.concat(l); return out; }
    if (isArr(l) || (l !== null && typeof l === "object" && !(l instanceof PSChar) && !(l instanceof Switch) && !(l instanceof PSEnum)) || (typeof l === "string" && op !== "-" && op !== "/" && op !== "%"))
      throw new PSErr("Method invocation failed because [" + typeOf(l) + "] does not contain a method named '" + nm + "'.", "InvalidOperation");
    if (typeof l === "string" && isNaN(parseNumStr(l))) throw convFail(l, "System.Int32");
    if (isArr(r)) throw new PSErr("Method invocation failed because [System.Object[]] does not contain a method named '" + nm + "'.", "InvalidOperation");
    var a = toNumber(l), b = toNumber(r);
    switch (op) {
      case "-": return a - b;
      case "*": return a * b;
      case "/": if (b === 0) throw new PSErr("Attempted to divide by zero.", "RuntimeException"); return a / b;
      case "%": if (b === 0) throw new PSErr("Attempted to divide by zero.", "RuntimeException"); return a % b;
    }
  }

  S.eval = function (n) {
    var self = this, v, l, r;
    switch (n.t) {
      case "num": return n.v;
      case "str": return n.v;
      case "xstr": return n.parts.map(function (p) { return typeof p === "string" ? p : self.strPart(self.eval(p)); }).join("");
      case "concat": return n.parts.map(function (p) { return toStr(self.eval(p)); }).join("");
      case "var": return this.getVar(n.name, n);
      case "splat": return this.getVar(n.name, n);
      case "array": return n.items.map(function (x) { return self.eval(x); });
      case "paren":
        if (!n.e) return null;
        if (n.e.t === "assign") { this.assign(n.e); return this.eval(n.e.target.t === "cast" ? n.e.target.e : n.e.target); }
        return this.valueOf(n.e);
      case "sub": return unwrap(this.collect(function (emit) { self.execBlock(n.body, emit); }));
      case "arrsub": return this.collect(function (emit) { self.execBlock(n.body, emit); });
      case "hash": return this.hashOf(n, false);
      case "sb": return new ScriptBlock(n.body, n.src, n.params);
      case "type": return new PSType(n.name);
      case "cast": {
        var tn = lc(n.type);
        if (n.e.t === "hash" && (tn === "ordered")) return this.hashOf(n.e, true);
        if (n.e.t === "hash" && (tn === "pscustomobject")) { var h = this.hashOf(n.e, true), o = new PSObj(); h.keys.forEach(function (k) { o.set(toStr(k), h.get(k)); }); return o; }
        var full = typeFull(n.type);
        if (!full) throw new PSErr("Unable to find type [" + n.type + "].", "InvalidOperation");
        return convertTo(full, this.eval(n.e));
      }
      case "un": {
        v = this.eval(n.e);
        switch (n.op) {
          case "not": return !truthy(v);
          case "neg": if (typeof v === "string" && isNaN(parseNumStr(v))) throw new PSErr('Method invocation failed because [System.String] does not contain a method named \'op_UnaryNegation\'.', "InvalidOperation"); return -toNumber(v);
          case "pos": return toNumber(v);
          case ",": return [v];
          case "bnot": return ~toInt(v);
          case "split": return (isArr(v) ? v : [v]).reduce(function (a, x) { return a.concat(toStr(x).trim().split(/\s+/)); }, []);
          case "join": return (isArr(v) ? v : [v]).map(toStr).join("");
        }
        break;
      }
      case "bin": return this.binary(n);
      case "ternary": return truthy(this.eval(n.c)) ? this.eval(n.a) : this.eval(n.b);
      case "member": {
        if (n.stat) return this.staticMember(this.eval(n.obj), this.memberName(n.name));
        return getMember(this.eval(n.obj), this.memberName(n.name), this);
      }
      case "invoke": {
        var args = n.args.map(function (a) { return self.eval(a); });
        if (n.stat) return this.staticCall(this.eval(n.obj), this.memberName(n.name), args);
        return this.callMethod(this.eval(n.obj), this.memberName(n.name), args);
      }
      case "index": {
        var obj = this.eval(n.obj), idx = this.eval(n.idx);
        return this.indexOf(obj, idx);
      }
      case "postinc": case "preinc": {
        var old = this.eval(n.e), nv = toNumber(old) + (n.op === "++" ? 1 : -1);
        this.assignTo(n.e, nv);
        return n.t === "postinc" ? (old === null ? 0 : old) : nv;
      }
      case "assign": this.assign(n); return undefined;
      case "pipe": case "if": case "switch": case "foreach": case "for": case "while": case "do": case "try":
        return this.valueOf(n);
    }
    throw new PSErr("O simulador não sabe avaliar '" + n.t + "'.", "NotImplemented");
  };
  S.strPart = function (v) { // valor dentro de "...": listas separadas por espaço ($OFS)
    if (isArr(v)) { var ofs = this.findVar("ofs"); return v.map(toStr).join(ofs && ofs.v !== null ? toStr(ofs.v) : " "); }
    return toStr(v);
  };
  S.memberName = function (nm) { return typeof nm === "string" ? nm : toStr(this.eval(nm)); };
  S.hashOf = function (n, ordered) {
    var h = new PSHash(ordered), self = this;
    n.entries.forEach(function (e) {
      var k = self.eval(e.k);
      if (h.has(k)) throw new PSErr("Duplicate keys '" + toStr(k) + "' are not allowed in hash literals.", "ParserError");
      h.set(k, self.valueOf(e.v));
    });
    return h;
  };
  S.indexOf = function (obj, idx) {
    var self = this;
    if (obj === null || obj === undefined) throw new PSErr("Cannot index into a null array.", "InvalidOperation");
    if (obj instanceof PSHash) {
      if (isArr(idx)) return idx.map(function (k) { return obj.get(k); });
      return obj.get(idx);
    }
    if (obj instanceof PSObj) { return obj.get(toStr(idx)) === undefined ? null : obj.get(toStr(idx)); }
    if (isArr(idx)) return idx.map(function (i) { return self.indexOf(obj, i); }).filter(function (x) { return x !== null; });
    var i = toInt(idx);
    if (typeof obj === "string") { if (i < 0) i += obj.length; return i >= 0 && i < obj.length ? new PSChar(obj[i]) : null; }
    if (isArr(obj)) { if (i < 0) i += obj.length; if ((i < 0 || i >= obj.length) && this.strict) throw new PSErr("Index was outside the bounds of the array.", "OperationStopped"); return i >= 0 && i < obj.length ? obj[i] : null; }
    if (i === 0 || i === -1) return obj;
    return null;
  };
  S.binary = function (n) {
    var op = n.op, l = this.eval(n.l), r, self = this;
    if (op === "and") return truthy(l) ? truthy(this.eval(n.r)) : false;
    if (op === "or") return truthy(l) ? true : truthy(this.eval(n.r));
    if (op === "??") return l === null || l === undefined ? this.eval(n.r) : l;
    r = this.eval(n.r);
    switch (op) {
      case "+": return addVals(l, r);
      case "-": case "*": case "/": case "%": return arith(op, l, r);
      case "xor": return truthy(l) !== truthy(r);
      case "band": return toInt(l) & toInt(r);
      case "bor": return toInt(l) | toInt(r);
      case "bxor": return toInt(l) ^ toInt(r);
      case "shl": return toInt(l) << toInt(r);
      case "shr": return toInt(l) >> toInt(r);
      case "f": return formatOp(l, r);
      case "..": {
        if (typeof l === "string" && typeof r === "string" && l.length === 1 && r.length === 1 && isNaN(parseNumStr(l))) {
          var a0 = l.charCodeAt(0), b0 = r.charCodeAt(0), cs = [];
          for (var q = a0; a0 <= b0 ? q <= b0 : q >= b0; q += a0 <= b0 ? 1 : -1) cs.push(new PSChar(String.fromCharCode(q)));
          return cs;
        }
        var a = toInt(l), b = toInt(r), out = [];
        if (Math.abs(b - a) > 1000000) throw new PSErr("O simulador só cria faixas de até 1.000.000 de números.", "InvalidOperation");
        for (var i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1) out.push(i);
        return out;
      }
      case "join": return (isArr(l) ? l : l === null ? [] : [l]).map(toStr).join(toStr(r));
      case "is": case "isnot": {
        if (!(r instanceof PSType)) throw new PSErr("The right operand of '-is' must be a type.", "InvalidOperation");
        var full = typeFull(r.name); if (!full) throw new PSErr("Unable to find type [" + r.name + "].", "InvalidOperation");
        var res = isType(l, full); return op === "is" ? res : !res;
      }
      case "as": {
        var tn = r instanceof PSType ? r.name : toStr(r), f2 = typeFull(tn);
        if (!f2) throw new PSErr("Unable to find type [" + tn + "].", "InvalidOperation");
        try { var cv = convertTo(f2, l); return cv; } catch (e) { return null; }
      }
      case "contains": case "notcontains": {
        var arr = isArr(l) ? l : [l], has = arr.some(function (x) { return eqVals(x, r, n.cs); });
        return op === "contains" ? has : !has;
      }
      case "in": case "notin": {
        var arr2 = isArr(r) ? r : [r], has2 = arr2.some(function (x) { return eqVals(x, l, n.cs); });
        return op === "in" ? has2 : !has2;
      }
      case "split": {
        var pat = isArr(r) ? r[0] : r, max = isArr(r) && r.length > 1 ? toInt(r[1]) : 0;
        var list = isArr(l) ? l : [l], outS = [];
        list.forEach(function (x) {
          var s = toStr(x), re = mkRegex(toStr(pat), n.cs, true), parts = [], last = 0, m;
          if (toStr(pat) === "") { parts = s.split(""); }
          else {
            while ((m = re.exec(s))) {
              if (max > 0 && parts.length >= max - 1) break;
              if (m[0] === "") { re.lastIndex++; continue; }
              parts.push(s.slice(last, m.index));
              for (var g = 1; g < m.length; g++) if (m[g] !== undefined) parts.push(m[g]);
              last = m.index + m[0].length;
            }
            parts.push(s.slice(last));
          }
          outS = outS.concat(parts);
        });
        return outS;
      }
      case "replace": {
        var p2 = isArr(r) ? r[0] : r, rp = isArr(r) && r.length > 1 ? r[1] : "";
        var doRep = function (x) {
          var s = toStr(x), re = mkRegex(toStr(p2), n.cs, true);
          if (rp instanceof ScriptBlock) return s.replace(re, function () { var m = arguments; var mo = new PSObj("System.Text.RegularExpressions.Match", { Value: m[0], Index: m[m.length - 2 - (typeof m[m.length - 1] === "object" ? 1 : 0)] }); mo.toStr = function () { return m[0]; }; return toStr(self.callSB(rp, [], mo)); });
          var js = toStr(rp).replace(/\$\{(\w+)\}/g, function (a, nm) { return /^\d+$/.test(nm) ? "$" + nm : "$<" + nm + ">"; }).replace(/\$0/g, "$&");
          return s.replace(re, js);
        };
        return isArr(l) ? l.map(doRep) : doRep(l);
      }
    }
    // comparações (com listas à esquerda, filtram)
    var cs2 = !!n.cs;
    if (isArr(l)) return l.filter(function (x) { return self.compare(op, x, r, cs2, true) === true; });
    return this.compare(op, l, r, cs2, false);
  };
  S.compare = function (op, l, r, cs, inArr) {
    switch (op) {
      case "eq": return eqVals(l, r, cs);
      case "ne": return !eqVals(l, r, cs);
      case "gt": return cmpVals(l, r, cs) > 0;
      case "ge": return cmpVals(l, r, cs) >= 0;
      case "lt": return cmpVals(l, r, cs) < 0;
      case "le": return cmpVals(l, r, cs) <= 0;
      case "like": return likeVal(l, r, cs);
      case "notlike": return !likeVal(l, r, cs);
      case "match": case "notmatch": {
        var m = mkRegex(toStr(r), cs).exec(toStr(l));
        if (!inArr && m) this.setVar("matches", matchesHash(m));
        return op === "match" ? !!m : !m;
      }
    }
    throw new PSErr("Operador -" + op + " desconhecido.", "InvalidOperation");
  };

  // ---------- atribuição ----------
  S.assign = function (st) {
    var t = st.target, op = st.op, v;
    if (op === "??=") { var cur = this.eval(t.t === "cast" ? t.e : t); if (cur !== null && cur !== undefined) return; }
    v = this.valueOf(st.value);
    if (v === undefined) v = null;
    if (op !== "=" && op !== "??=") {
      var old = this.eval(t.t === "cast" ? t.e : t);
      v = op === "+=" ? addVals(old, v) : arith(op[0], old, v);
    }
    if (t.t === "cast") {
      var full = typeFull(t.type); if (!full) throw new PSErr("Unable to find type [" + t.type + "].", "InvalidOperation");
      v = convertTo(full, v);
      this.setVar(t.e.name, v, true);
      var rec = this.findVar(lc(t.e.name)); if (rec) rec.type = full;
      return;
    }
    this.assignTo(t, v);
  };
  S.assignTo = function (t, v) {
    if (t.t === "var") { this.setVar(t.name, v); return; }
    if (t.t === "member") {
      var obj = this.eval(t.obj), nm = this.memberName(t.name);
      if (obj instanceof PSHash) { obj.set(nm, v); return; }
      if (obj instanceof PSObj && (obj.has(nm) || obj.typeName === "System.Management.Automation.PSCustomObject")) {
        if (obj.fsNode && lc(nm) === "attributes") { obj.fsNode.hidden = /hidden/i.test(toStr(v)); return; }
        obj.set(nm, v); return;
      }
      if (obj === null) throw new PSErr("The property '" + nm + "' cannot be found on this object. Verify that the property exists and can be set.", "InvalidOperation");
      throw new PSErr("'" + nm + "' is a ReadOnly property.", "InvalidOperation");
    }
    if (t.t === "index") {
      var o = this.eval(t.obj), idx = this.eval(t.idx);
      if (o instanceof PSHash) { o.set(idx, v); return; }
      if (isArr(o)) {
        var i = toInt(idx); if (i < 0) i += o.length;
        if (i < 0 || i >= o.length) throw new PSErr("Index was outside the bounds of the array.", "IndexOutOfRangeException");
        o[i] = v; return;
      }
      if (o === null) throw new PSErr("Cannot index into a null array.", "InvalidOperation");
      throw new PSErr("Unable to index into an object of type " + typeOf(o) + ".", "InvalidOperation");
    }
    throw new PSErr("The assignment expression is not valid.", "ParserError");
  };

  // ---------- membros ----------
  function dateMember(d, nm) {
    switch (lc(nm)) {
      case "year": return d.getFullYear(); case "month": return d.getMonth() + 1; case "day": return d.getDate();
      case "hour": return d.getHours(); case "minute": return d.getMinutes(); case "second": return d.getSeconds(); case "millisecond": return d.getMilliseconds();
      case "dayofweek": return new PSEnum("System.DayOfWeek", DIAS_EN[d.getDay()], d.getDay());
      case "dayofyear": var s = new Date(d.getFullYear(), 0, 1); return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - s) / 864e5) + 1;
      case "date": return new PSDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      case "ticks": return d.getTime() * 10000 + 621355968000000000;
      case "kind": return new PSEnum("System.DateTimeKind", "Local", 2);
    }
    return undefined;
  }
  function getMember(o, nm, s) {
    var k = lc(nm);
    if (o === null || o === undefined) return null;
    if (isArr(o)) {
      if (k === "count" || k === "length" || k === "longlength") return o.length;
      if (k === "rank") return 1;
      var out = [];
      o.forEach(function (x) { var v = getMember(x, nm, s); if (v === null || v === undefined) return; if (isArr(v)) out = out.concat(v); else out.push(v); });
      return out.length === 0 ? null : out.length === 1 && o.length === 1 ? out[0] : out;
    }
    if (o instanceof PSHash) {
      if (o.has(nm)) return o.get(nm);
      if (k === "count") return o.count();
      if (k === "keys") return o.keys.slice();
      if (k === "values") return o.keys.map(function (x) { return o.get(x); });
      return null;
    }
    if (o instanceof PSObj) {
      if (o.has(nm)) return o.get(nm);
      if (o.dyn) { var d = o.dyn(k); if (d !== undefined) return d; }
      if (k === "count" || k === "length" && !o.fsNode) return 1;
      return null;
    }
    if (typeof o === "string") { if (k === "length") return o.length; if (k === "count") return 1; return null; }
    if (o instanceof PSDate) { var dm = dateMember(o.d, nm); if (dm !== undefined) return dm; }
    if (o instanceof PSVersion) { var i = ["major", "minor", "build", "revision"].indexOf(k); if (i !== -1) return o.p[i]; }
    if (o instanceof PSSemVer) { if (k === "major") return o.major; if (k === "minor") return o.minor; if (k === "patch") return o.patch; if (k === "prereleaselabel" || k === "buildlabel") return null; }
    if (o instanceof PSTypeInfo) {
      if (k === "name") return o.name; if (k === "fullname") return o.full;
      if (k === "basetype") return new PSTypeInfo(/Int|Double|Boolean|DateTime|Char|Decimal/.test(o.full) ? "System.ValueType" : o.full === "System.Object[]" ? "System.Array" : "System.Object");
      if (k === "ispublic" || k === "isserializable") return true;
      if (k === "namespace") return o.full.replace(/\.[^.]*$/, "");
    }
    if (o instanceof PSEnum) { if (k === "value__") return o.num; }
    if (o instanceof ScriptBlock) { if (k === "ast" || k === "file") return null; }
    if (o instanceof PSChar) { if (k === "length") return 1; }
    if (k === "count" || k === "length") return 1;
    return null;
  }
  S.staticMember = function (t, nm) {
    if (!(t instanceof PSType)) throw new PSErr("Unable to find type.", "InvalidOperation");
    var full = typeFull(t.name), k = lc(nm);
    if (!full) throw new PSErr("Unable to find type [" + t.name + "].", "InvalidOperation");
    switch (full + "::" + k) {
      case "System.Math::pi": return Math.PI;
      case "System.Math::e": return Math.E;
      case "System.Int32::maxvalue": return 2147483647;
      case "System.Int32::minvalue": return -2147483648;
      case "System.Int64::maxvalue": return 9223372036854775807;
      case "System.Byte::maxvalue": return 255;
      case "System.Double::maxvalue": return Number.MAX_VALUE;
      case "System.String::empty": return "";
      case "System.DateTime::now": return new PSDate(new Date());
      case "System.DateTime::today": var d = new Date(); return new PSDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      case "System.Environment::newline": return "\r\n";
      case "System.Environment::username": return "ana";
      case "System.Environment::machinename": return "NOTEBOOK";
      case "System.Environment::osversion": return "Microsoft Windows NT 10.0.19045.0";
      case "System.Environment::processorcount": return 8;
      case "System.Environment::currentdirectory": return HOME;
      case "System.IO.Path::directoryseparatorchar": return new PSChar("\\");
      case "System.IO.Path::pathseparator": return new PSChar(";");
    }
    if (full === "System.ConsoleColor") return consoleColor(nm);
    throw new PSErr("O simulador não conhece [" + t.name + "]::" + nm + ".", "InvalidOperation");
  };
  function mathRound(x, d) {
    d = d || 0; var f = Math.pow(10, d), v = x * f, r = Math.round(v);
    if (Math.abs(v % 1) === 0.5 || Math.abs(Math.abs(v - Math.trunc(v)) - 0.5) < 1e-9) r = roundEven(Number(v.toFixed(9)));
    return r / f;
  }
  S.staticCall = function (t, nm, a) {
    var self = this;
    if (!(t instanceof PSType)) throw new PSErr("Method invocation failed.", "InvalidOperation");
    var full = typeFull(t.name), k = lc(nm), n = function (i) { return toNumber(a[i], "System.Double"); };
    if (!full) throw new PSErr("Unable to find type [" + t.name + "].", "InvalidOperation");
    switch (full) {
      case "System.Math":
        switch (k) {
          case "round": return mathRound(n(0), a.length > 1 ? toInt(a[1]) : 0);
          case "ceiling": return Math.ceil(n(0)); case "floor": return Math.floor(n(0)); case "truncate": return Math.trunc(n(0));
          case "pow": return Math.pow(n(0), n(1)); case "sqrt": return Math.sqrt(n(0)); case "abs": return Math.abs(n(0));
          case "max": return Math.max(n(0), n(1)); case "min": return Math.min(n(0), n(1));
          case "log": return a.length > 1 ? Math.log(n(0)) / Math.log(n(1)) : Math.log(n(0)); case "log10": return Math.log10(n(0)); case "exp": return Math.exp(n(0));
          case "sin": return Math.sin(n(0)); case "cos": return Math.cos(n(0)); case "tan": return Math.tan(n(0)); case "sign": return Math.sign(n(0));
        }
        break;
      case "System.String":
        switch (k) {
          case "isnullorempty": return a[0] === null || toStr(a[0]) === "";
          case "isnullorwhitespace": return a[0] === null || toStr(a[0]).trim() === "";
          case "join": return (isArr(a[1]) ? a[1] : a.slice(1)).map(toStr).join(toStr(a[0]));
          case "format": return formatOp(a[0], a.length === 2 && isArr(a[1]) ? a[1] : a.slice(1));
          case "concat": return a.map(toStr).join("");
          case "new": return a.length === 2 ? rep(toStr(a[0]), toInt(a[1])) : toStr(a[0]);
        }
        break;
      case "System.Int32": case "System.Int64": case "System.Double": case "System.Decimal":
        if (k === "parse") { var v = parseNumStr(toStr(a[0])); if (v !== v) throw new PSErr('Exception calling "Parse" with "1" argument(s): "The input string \'' + toStr(a[0]) + '\' was not in a correct format."', "MethodInvocationException"); return full === "System.Double" ? v : roundEven(v); }
        break;
      case "System.DateTime":
        if (k === "parse") return convertTo("System.DateTime", a[0]);
        if (k === "daysinmonth") return new Date(toInt(a[0]), toInt(a[1]), 0).getDate();
        if (k === "isleapyear") { var y = toInt(a[0]); return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
        break;
      case "System.IO.Path":
        var p = toStr(a[0]), base = p.replace(/^.*[\\/]/, "");
        switch (k) {
          case "getextension": var i = base.lastIndexOf("."); return i >= 0 ? base.slice(i) : "";
          case "getfilename": return base;
          case "getfilenamewithoutextension": var j = base.lastIndexOf("."); return j > 0 ? base.slice(0, j) : base;
          case "getdirectoryname": var q = p.replace(/\//g, "\\"); return q.indexOf("\\") === -1 ? "" : q.slice(0, q.lastIndexOf("\\"));
          case "combine": return a.map(toStr).reduce(function (x, y) { return x === "" ? y : /^[A-Za-z]:|^\\/.test(y) ? y : x.replace(/\\$/, "") + "\\" + y; }, "");
          case "gettemppath": return HOME + "\\AppData\\Local\\Temp\\";
          case "getinvalidfilenamechars": return '"<>|:*?\\/'.split("").map(function (c) { return new PSChar(c); });
        }
        break;
      case "System.Char":
        var c = toStr(a[0]);
        switch (k) {
          case "isdigit": return /^\d$/.test(c); case "isletter": return /^\p{L}$/u.test(c); case "isupper": return c !== c.toLowerCase(); case "islower": return c !== c.toUpperCase();
          case "iswhitespace": return /^\s$/.test(c); case "toupper": return new PSChar(c.toUpperCase()); case "tolower": return new PSChar(c.toLowerCase());
        }
        break;
      case "System.Console":
        if (k === "writeline") { this.hostWrite(a.length ? toCult(a[0]) : "", "out"); return undefined; }
        if (k === "write") { this.hostWrite(toCult(a[0]), "out", true); return undefined; }
        if (k === "clear") { this.clear(); return undefined; }
        break;
      case "System.Convert":
        if (k === "toint32") return toInt(a[0]); if (k === "tostring") return toStr(a[0]); if (k === "todouble") return toNumber(a[0], "System.Double"); if (k === "toboolean") return truthy(a[0]);
        break;
      case "System.Environment":
        if (k === "getenvironmentvariable") { var e = this.env[lc(toStr(a[0]))]; return e ? e.v : null; }
        break;
      case "System.Text.RegularExpressions.Regex":
        if (k === "escape") return toStr(a[0]).replace(/[.*+?^${}()|[\]\\#\s]/g, "\\$&");
        if (k === "ismatch") return mkRegex(toStr(a[1])).test(toStr(a[0]));
        if (k === "replace") return toStr(a[0]).replace(mkRegex(toStr(a[1]), true, true), toStr(a[2]));
        break;
      case "System.IO.File": case "System.IO.Directory":
        if (k === "exists") { var r = this.resolve(toStr(a[0])); var nd = r.drive === "c" && this.fs.node(r.segs); return !!nd && (full === "System.IO.File" ? !nd.dir : nd.dir); }
        if (k === "readalltext") return this.readFile(toStr(a[0]), "Get-Content");
        break;
    }
    throw new PSErr("O simulador ainda não tem [" + t.name + "]::" + nm + "().", "InvalidOperation");
  };
  S.noMethod = function (o, nm) {
    return new PSErr("Method invocation failed because [" + typeOf(o) + "] does not contain a method named '" + nm + "'.", "InvalidOperation");
  };
  S.callMethod = function (o, nm, a) {
    var k = lc(nm), self = this;
    if (o === null || o === undefined) throw new PSErr("You cannot call a method on a null-valued expression.", "InvalidOperation");
    if (k === "gettype" && a.length === 0) return new PSTypeInfo(typeOf(o));
    if (k === "equals") return eqVals(o, a[0], true);
    if (k === "gethashcode") return 0;
    if (typeof o === "string") {
      var s = o, a0 = a.length ? toStr(a[0]) : "";
      switch (k) {
        case "toupper": case "toupperinvariant": return s.toUpperCase();
        case "tolower": case "tolowerinvariant": return s.toLowerCase();
        case "trim": return a.length ? trimChars(s, a.map(toStr).join(""), 3) : s.trim();
        case "trimstart": return a.length ? trimChars(s, a.map(toStr).join(""), 1) : s.replace(/^\s+/, "");
        case "trimend": return a.length ? trimChars(s, a.map(toStr).join(""), 2) : s.replace(/\s+$/, "");
        case "replace": return s.split(a0).join(a.length > 1 ? toStr(a[1]) : "");
        case "contains": return s.indexOf(a0) !== -1;
        case "startswith": return a.length > 1 && /ignorecase/i.test(toStr(a[1])) || a[1] === true ? lc(s).indexOf(lc(a0)) === 0 : s.indexOf(a0) === 0;
        case "endswith": return s.length >= a0.length && s.slice(s.length - a0.length) === a0;
        case "indexof": return s.indexOf(a0, a.length > 1 ? toInt(a[1]) : 0);
        case "lastindexof": return s.lastIndexOf(a0);
        case "substring": {
          var st = toInt(a[0]), ln = a.length > 1 ? toInt(a[1]) : s.length - st;
          if (st < 0 || st > s.length || ln < 0 || st + ln > s.length) throw new PSErr('Exception calling "Substring" with "' + a.length + '" argument(s): "' + (st > s.length ? "startIndex cannot be larger than length of string. (Parameter 'startIndex')" : "Index and length must refer to a location within the string. (Parameter 'length')") + '"', "MethodInvocationException");
          return s.substr(st, ln);
        }
        case "split": {
          if (!a.length) return s.split(/\s/);
          var seps = isArr(a[0]) ? a[0].map(toStr) : (a[0] instanceof PSChar ? [a[0].c] : toStr(a[0]).split(""));
          if (typeof a[0] === "string" && a[0].length > 1 && a.length > 1) seps = [a[0]];
          var out = [], cur = "", i2 = 0;
          while (i2 < s.length) {
            var hit = null;
            for (var q = 0; q < seps.length; q++) if (seps[q] && s.substr(i2, seps[q].length) === seps[q]) { hit = seps[q]; break; }
            if (hit !== null) { out.push(cur); cur = ""; i2 += hit.length; } else { cur += s[i2]; i2++; }
          }
          out.push(cur);
          if (a.length > 1 && /removeemptyentries/i.test(toStr(a[a.length - 1]))) out = out.filter(function (x) { return x !== ""; });
          return out;
        }
        case "padleft": return padL(s, toInt(a[0])).replace(/^ +/, function (m) { return a.length > 1 ? rep(toStr(a[1]), m.length) : m; });
        case "padright": return padR(s, toInt(a[0])).replace(/ +$/, function (m) { return s.length >= toInt(a[0]) ? m : a.length > 1 ? (m.length > toInt(a[0]) - s.length ? m.slice(0, m.length - (toInt(a[0]) - s.length)) + rep(toStr(a[1]), toInt(a[0]) - s.length) : rep(toStr(a[1]), m.length)) : m; });
        case "insert": var ix = toInt(a[0]); return s.slice(0, ix) + toStr(a[1]) + s.slice(ix);
        case "remove": var rx = toInt(a[0]); return a.length > 1 ? s.slice(0, rx) + s.slice(rx + toInt(a[1])) : s.slice(0, rx);
        case "tochararray": return s.split("").map(function (c) { return new PSChar(c); });
        case "tostring": return s;
        case "compareto": return cmpVals(s, a[0], true);
        case "normalize": return s.normalize();
        case "clone": return s;
      }
      throw this.noMethod(o, nm);
    }
    if (typeof o === "number") {
      if (k === "tostring") return a.length ? fmtSpec(o, toStr(a[0])) : toCult(o);
      if (k === "compareto") return cmpVals(o, a[0]);
      throw this.noMethod(o, nm);
    }
    if (typeof o === "boolean") { if (k === "tostring") return toStr(o); throw this.noMethod(o, nm); }
    if (o instanceof PSChar) { if (k === "tostring") return o.c; throw this.noMethod(o, nm); }
    if (o instanceof PSDate) {
      var d = o.d, add = function (ms) { return new PSDate(new Date(d.getTime() + ms)); };
      switch (k) {
        case "tostring": return a.length ? dateFmt(d, toStr(a[0])) : dateFmt(d, "dd/MM/yyyy HH:mm:ss");
        case "adddays": return add(toNumber(a[0]) * 864e5);
        case "addhours": return add(toNumber(a[0]) * 36e5);
        case "addminutes": return add(toNumber(a[0]) * 6e4);
        case "addseconds": return add(toNumber(a[0]) * 1e3);
        case "addmonths": var m = new Date(d); m.setMonth(m.getMonth() + toInt(a[0])); return new PSDate(m);
        case "addyears": var y = new Date(d); y.setFullYear(y.getFullYear() + toInt(a[0])); return new PSDate(y);
        case "toshortdatestring": return dateFmt(d, "d");
        case "tolongdatestring": return dateFmt(d, "D");
        case "toshorttimestring": return dateFmt(d, "t");
        case "tolongtimestring": return dateFmt(d, "T");
        case "touniversaltime": case "tolocaltime": return o;
        case "compareto": return cmpVals(o, a[0]);
      }
      throw this.noMethod(o, nm);
    }
    if (isArr(o)) {
      switch (k) {
        case "contains": return o.some(function (x) { return eqVals(x, a[0], true); });
        case "indexof": for (var i3 = 0; i3 < o.length; i3++) if (eqVals(o[i3], a[0], true)) return i3; return -1;
        case "add": case "remove": case "insert": case "removeat": case "clear":
          throw new PSErr('Exception calling "' + nm + '" with "' + a.length + '" argument(s): "Collection was of a fixed size."', "MethodInvocationException");
        case "foreach": return this.collect(function (emit) { o.forEach(function (x) { self.tick(); self.emitVal(self.callSB(a[0], [], x, false), emit); }); });
        case "where": return o.filter(function (x) { self.tick(); return truthy(self.callSB(a[0], [], x)); });
        case "tostring": return "System.Object[]";
        case "clone": return o.slice();
        case "getvalue": return o[toInt(a[0])];
      }
      // chamada de método em cada item (enumeração de membros)
      return o.map(function (x) { return self.callMethod(x, nm, a); });
    }
    if (o instanceof PSHash) {
      switch (k) {
        case "containskey": return o.has(a[0]);
        case "containsvalue": return o.keys.some(function (x) { return eqVals(o.get(x), a[0]); });
        case "add":
          if (o.has(a[0])) throw new PSErr('Exception calling "Add" with "2" argument(s): "Item has already been added. Key in dictionary: \'' + toStr(a[0]) + '\'  Key being added: \'' + toStr(a[0]) + '\'"', "MethodInvocationException");
          o.set(a[0], a[1]); return undefined;
        case "remove": o.remove(a[0]); return undefined;
        case "clear": o.keys = []; o.map = {}; return undefined;
        case "tostring": return toStr(o);
        case "clone": var h = new PSHash(o.ordered); o.keys.forEach(function (x) { h.set(x, o.get(x)); }); return h;
        case "getenumerator": return o.keys.map(function (x) { return new PSObj("System.Collections.DictionaryEntry", { Name: x, Key: x, Value: o.get(x) }); });
      }
      throw this.noMethod(o, nm);
    }
    if (o instanceof ScriptBlock) {
      if (k === "invoke" || k === "invokereturnasis") return unwrap(this.collect(function (emit) { self.emitVal(self.callSB(o, a, undefined, true), emit); }));
      if (k === "tostring") return o.src;
      throw this.noMethod(o, nm);
    }
    if (o instanceof PSObj) {
      if (o.methods && o.methods[k]) return o.methods[k].apply(o, a);
      if (k === "tostring") return toStr(o);
      if (o.fsNode && k === "delete") { this.removeNode(o.fsNode); return undefined; }
      throw this.noMethod(o, nm);
    }
    if (k === "tostring") return toStr(o);
    throw this.noMethod(o, nm);
  };
  function trimChars(s, chars, mode) {
    var a = 0, b = s.length;
    if (mode & 1) while (a < b && chars.indexOf(s[a]) !== -1) a++;
    if (mode & 2) while (b > a && chars.indexOf(s[b - 1]) !== -1) b--;
    return s.slice(a, b);
  }

  /* ------------------------------------------------------------------
     8. Comandos: resolução, parâmetros, blocos de script e funções
     ------------------------------------------------------------------ */
  var COMMON = ["Verbose", "Debug", "ErrorAction", "WarningAction", "InformationAction", "ProgressAction", "ErrorVariable", "WarningVariable", "InformationVariable", "OutVariable", "OutBuffer", "PipelineVariable"];
  var COMMON_ALIAS = { vb: "Verbose", db: "Debug", ea: "ErrorAction", wa: "WarningAction", infa: "InformationAction", proga: "ProgressAction", ev: "ErrorVariable", wv: "WarningVariable", iv: "InformationVariable", ov: "OutVariable", ob: "OutBuffer", pv: "PipelineVariable" };
  var CMDS = {}, ALIASES = {};
  var NAO_SIMULA = ("Get-LocalUser New-LocalUser Set-LocalUser Remove-LocalUser Rename-LocalUser Disable-LocalUser Enable-LocalUser Get-LocalGroup New-LocalGroup Remove-LocalGroup " +
    "Get-LocalGroupMember Add-LocalGroupMember Remove-LocalGroupMember Get-Service Start-Service Stop-Service Restart-Service Set-Service New-Service Remove-Service Suspend-Service Resume-Service " +
    "Get-ItemProperty Set-ItemProperty New-ItemProperty Remove-ItemProperty Get-ItemPropertyValue Rename-ItemProperty Clear-ItemProperty Copy-ItemProperty Move-ItemProperty " +
    "Get-Process Stop-Process Start-Process Wait-Process Debug-Process Restart-Computer Stop-Computer Rename-Computer Get-CimInstance Get-WmiObject Invoke-CimMethod Get-ComputerInfo Get-HotFix " +
    "Invoke-WebRequest Invoke-RestMethod Test-Connection Test-NetConnection Update-Help Save-Help Install-Module Install-Package Find-Module Update-Module Set-ExecutionPolicy Get-ExecutionPolicy " +
    "Start-Transcript Stop-Transcript Get-PSReadLineOption Set-PSReadLineOption Get-PSReadLineKeyHandler Set-PSReadLineKeyHandler Get-Module Import-Module Get-Acl Set-Acl " +
    "Get-EventLog Get-WinEvent New-PSDrive Remove-PSDrive Enter-PSSession Invoke-Command New-PSSession Get-ScheduledTask Register-ScheduledTask Get-NetIPAddress Get-NetAdapter Get-Disk Get-Volume " +
    "Get-Clipboard Set-Clipboard Get-Credential Get-Printer Get-AppxPackage Set-Date Get-WinHomeLocation Set-WinHomeLocation Get-Counter Start-Job Get-Job Receive-Job Invoke-Item").split(" ");
  var NAO_SIMULA_SET = {}; NAO_SIMULA.forEach(function (n) { NAO_SIMULA_SET[lc(n)] = n; });
  var EXTERNOS = { pwsh: 1, powershell: 1, cmd: 1, winget: 1, notepad: 1, wt: 1, explorer: 1, ping: 1, ipconfig: 1, whoami: 1, hostname: 1, git: 1, python: 1, node: 1, code: 1 };

  function def(name, spec, fn) {
    spec = spec || {}; spec.name = name; spec.fn = fn;
    spec.params = spec.params || []; spec.sw = spec.sw || []; spec.pos = spec.pos || []; spec.alias = spec.alias || {};
    var p = name.split("-"); spec.verb = p[0]; spec.noun = p.slice(1).join("-");
    spec.module = spec.module || "Microsoft.PowerShell.Management";
    CMDS[lc(name)] = spec;
    (spec.aliases || []).forEach(function (a) { ALIASES[lc(a)] = { name: a, def: name }; });
  }
  S.cmdNotFound = function (name, label) {
    var e0 = new PSErr('O termo "' + name + '" não é reconhecido como um nome de um cmdlet, função, arquivo de script ou programa executável.\nVerifique a ortografia do nome ou, se um caminho foi incluído, verifique se o caminho está correto e tente novamente.', "CommandNotFoundException", { cmd: label || name });
    e0.notFound = true; return e0;
  };
  S.lookup = function (name) { // -> {kind: 'function'|'cmdlet'|'alias'|'nao'|'externo', ...}
    var k = lc(name);
    if (this.funcs[k]) return { kind: "function", f: this.funcs[k], name: this.funcs[k].name };
    var al = this.userAliases[k] || ALIASES[k];
    if (al) { var t = this.lookup(al.def); if (t) { t.via = al.name; return t; } }
    if (CMDS[k]) return { kind: "cmdlet", spec: CMDS[k], name: CMDS[k].name };
    if (NAO_SIMULA_SET[k]) return { kind: "nao", name: NAO_SIMULA_SET[k] };
    var base = k.replace(/\.exe$/, "");
    if (EXTERNOS[base]) return { kind: "externo", name: name };
    return null;
  };
  S.evalArgs = function (args) {
    var self = this, out = [];
    args.forEach(function (a) {
      if (a.param !== undefined) { out.push({ param: a.param, colon: !!a.colon, value: a.colon ? self.eval(a.value) : undefined, p: a.p, len: a.len }); return; }
      if (a.value && a.value.t === "splat") {
        var sv = self.getVar(a.value.name);
        if (sv instanceof PSHash) sv.keys.forEach(function (k) { out.push({ param: toStr(k), colon: true, value: sv.get(k) }); });
        else (isArr(sv) ? sv : [sv]).forEach(function (x) { out.push({ value: x }); });
        return;
      }
      var v = self.eval(a.value);
      if (a.value && a.value.t === "str" && a.value.bare && /^-/.test(a.value.v) && false) v = a.value.v;
      out.push({ value: v, bare: a.value && a.value.bare });
    });
    return out;
  };
  function matchParam(spec, given, cmdName) {
    var g = lc(given), all = spec.params.concat(spec.sw), exact = null, hits = [];
    all.concat(COMMON).forEach(function (p) { if (lc(p) === g) exact = p; });
    if (!exact) { for (var a in spec.alias) if (a === g) exact = spec.alias[a]; if (COMMON_ALIAS[g]) exact = COMMON_ALIAS[g]; }
    if (exact) return exact;
    all.forEach(function (p) { if (lc(p).indexOf(g) === 0) hits.push(p); });
    COMMON.forEach(function (p) { if (lc(p).indexOf(g) === 0) hits.push(p); });
    var shown = hits.map(function (h) { return "-" + h; });
    for (var al in spec.alias) if (al.indexOf(g) === 0 && hits.indexOf(spec.alias[al]) === -1) { hits.push(spec.alias[al]); shown.push("-" + spec.alias[al]); }
    if (hits.length > 1 && spec.dyn) { var est = hits.filter(function (h) { return spec.dyn.indexOf(h) === -1; }); if (est.length === 1) return est[0]; }
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) throw new PSErr("O parâmetro não pode ser processado porque o nome do parâmetro '" + given + "' é ambíguo. As possíveis correspondências incluem: " + shown.join(" ") + ".", "InvalidArgument", { cmd: cmdName });
    throw new PSErr("Não foi possível encontrar um parâmetro correspondente ao nome de parâmetro '" + given + "'.", "InvalidArgument", { cmd: cmdName });
  }
  S.bind = function (spec, args) {
    var named = {}, pos = [], i, cmd = spec.name;
    for (i = 0; i < args.length; i++) {
      var a = args[i];
      if (a.param !== undefined) {
        if (spec.livre) { var c0; try { c0 = matchParam(spec, a.param, cmd); } catch (e) { c0 = null; } if (!c0) { pos.push("-" + a.param + (a.colon ? ":" : "")); if (a.colon) pos.push(a.value); continue; } }
        var c = matchParam(spec, a.param, cmd), key = lc(c);
        var isSw = spec.sw.indexOf(c) !== -1 || c === "Verbose" || c === "Debug";
        if (isSw) named[key] = a.colon ? truthy(a.value) : true;
        else if (a.colon) named[key] = a.value;
        else if (i + 1 < args.length && args[i + 1].param === undefined) named[key] = args[++i].value;
        else throw new PSErr("Argumento ausente para o parâmetro '" + c + "'. Especifique um parâmetro do tipo '" + ((spec.types || {})[c] || "System.Object") + "' e tente novamente.", "InvalidArgument", { cmd: cmd });
      } else pos.push(a.value);
    }
    for (i = 0; i < spec.pos.length && pos.length; i++) {
      var pk = lc(spec.pos[i]);
      if (hasOwn(named, pk)) continue;
      if (spec.rest && spec.rest === spec.pos[i]) { named[pk] = pos.length === 1 ? pos[0] : pos.slice(); pos = []; break; }
      named[pk] = pos.shift();
    }
    if (pos.length && spec.rest) { var rk = lc(spec.rest); named[rk] = hasOwn(named, rk) ? [].concat(named[rk], pos) : (pos.length === 1 ? pos[0] : pos); pos = []; }
    if (pos.length) throw new PSErr("Não foi possível encontrar um parâmetro posicional que aceite o argumento '" + toStr(pos[0]) + "'.", "InvalidArgument", { cmd: cmd });
    if (spec.types) for (var tk in spec.types) {
      var nk = lc(tk);
      if (hasOwn(named, nk) && named[nk] !== undefined) {
        try { named[nk] = convertTo(spec.types[tk], named[nk]); }
        catch (e) { if (e && e.ps) throw new PSErr("Não é possível associar o parâmetro '" + tk + "'. " + e.message, "InvalidArgument", { cmd: cmd }); throw e; }
      }
    }
    return named;
  };
  S.runCommand = function (el, input, emit, first) {
    var self = this, name, nv;
    if (el.call) {
      nv = this.eval(el.name);
      if (nv instanceof ScriptBlock) {
        var av = this.evalArgs(el.args).map(function (a) { return a.param !== undefined ? "-" + a.param : a.value; });
        this.callSBList(nv, av, undefined, el.call === "&", input, emit);
        return;
      }
      name = toStr(nv);
    } else name = el.name.t === "str" ? el.name.v : toStr(this.eval(el.name));
    var found = this.lookup(name);
    if (!found) {
      if (/[\\\/]/.test(name) || /\.(ps1|exe|bat|cmd)$/i.test(name)) throw this.cmdNotFound(name);
      throw this.cmdNotFound(name);
    }
    if (found.kind === "nao" || found.kind === "externo") {
      this.hostWrite("(simulador) " + (found.kind === "nao" ? found.name + " mexe no sistema e não é simulado aqui" : "\u201c" + name + "\u201d é um programa do Windows e não roda no simulador") + "; veja a saída real na aula.", "info");
      return;
    }
    var args = this.evalArgs(el.args);
    if (args.some(function (a) { return a.param === "?"; }) && CMDS["get-help"]) {
      var hs = found.kind === "cmdlet" ? found.spec : { name: found.name, params: [], sw: [], pos: [] };
      var hb = { has: function () { return false; }, get: function () { return undefined; } };
      emit(new PSObj("FormatText", {}, { fmtLines: this.helpFor(hs, hb) }));
      return;
    }
    if (found.kind === "function") { this.callFunction(found.f, args, input, emit); return; }
    var spec = found.spec, named = this.bind(spec, args);
    var b = {
      p: named, input: input, out: emit, name: spec.name, s: this, first: first,
      has: function (k) { return hasOwn(named, lc(k)) && named[lc(k)] !== undefined; },
      get: function (k) { return named[lc(k)]; },
      ea: named.erroraction !== undefined ? lc(toStr(named.erroraction)) : lc(this.prefs.error),
      err: function (e) {
        if (!e.cmd) e.cmd = spec.name;
        if (b.ea === "stop") { e.terminating = true; throw e; }
        if (b.ea === "silentlycontinue" || b.ea === "ignore") { self.okNow = false; self.errors.unshift(e); return; }
        self.writeError(e);
      }
    };
    var outVar = named.outvariable !== undefined ? toStr(named.outvariable) : null, captured = outVar ? [] : null;
    if (captured) { var orig = b.out; b.out = function (x) { captured.push(x); orig(x); }; }
    try { spec.fn.call(this, b); }
    catch (e) {
      if (e && e.ps && !e.cmd && !e.parse && !e.keepCat) e.cmd = spec.name;
      if (e && e.ps && b.ea === "stop") e.terminating = true;
      if (e && e.ps && (b.ea === "silentlycontinue" || b.ea === "ignore") && !e.terminating) { this.okNow = false; this.errors.unshift(e); return; }
      throw e;
    }
    if (captured) this.setVar(outVar, unwrap(captured));
    if (named.errorvariable !== undefined) this.setVar(toStr(named.errorvariable), this.okNow ? [] : [this.errors[0] ? this.errors[0].message : null]);
  };
  S.callSB = function (sb, args, under, newScope, input) {
    var self = this;
    return unwrap(this.callSBList(sb, args, under, newScope, input));
  };
  S.callSBList = function (sb, args, under, newScope, input, sink) {
    var self = this, saved = this.scope, oldU = null, hadU = false;
    if (!(sb instanceof ScriptBlock)) throw new PSErr("Esperava um bloco de script { ... }.", "InvalidArgument");
    if (newScope) this.scope = new Scope(this.scope);
    if (under !== undefined) {
      var rec = this.findVar("_"); hadU = !!rec; oldU = rec ? rec.v : null;
      if (newScope) this.scope.vars["_"] = { n: "_", v: under }; else this.setVar("_", under);
    }
    var out = [];
    try {
      if (newScope || sb.params) {
        var rest = this.bindParams(sb.params, (args || []).map(function (a) { return { value: a }; }));
        this.scope.vars["args"] = { n: "args", v: rest };
        if (input) this.scope.vars["input"] = { n: "input", v: input };
      }
      this.execBlock(sb.body, sink || function (v) { out.push(v); });
    } catch (e) {
      if (!(e instanceof Ctl && e.kind === "return")) throw e;
    } finally {
      this.scope = saved;
      if (!newScope && (under !== undefined)) { if (hadU) this.setVar("_", oldU); else if (this.scope.vars["_"]) delete this.scope.vars["_"]; }
    }
    return out;
  };
  S.bindParams = function (params, args) { // args: [{param?, value}] ; devolve sobras ($args)
    var self = this, rest = [], named = {}, pos = [];
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a.param !== undefined && params) {
        var hit = params.filter(function (p) { return lc(p.name).indexOf(lc(a.param)) === 0; });
        if (hit.length === 1) {
          if (lc(hit[0].type || "") === "switch") { named[lc(hit[0].name)] = a.colon ? truthy(a.value) : true; continue; }
          if (a.colon) named[lc(hit[0].name)] = a.value;
          else if (i + 1 < args.length && args[i + 1].param === undefined) named[lc(hit[0].name)] = args[++i].value;
          else throw new PSErr("Argumento ausente para o parâmetro '" + hit[0].name + "'.", "InvalidArgument");
          continue;
        }
        rest.push("-" + a.param); continue;
      }
      if (a.param !== undefined) { rest.push("-" + a.param); continue; }
      pos.push(a.value);
    }
    (params || []).forEach(function (p) {
      var k = lc(p.name), v;
      if (hasOwn(named, k)) v = named[k];
      else if (lc(p.type || "") !== "switch" && pos.length) v = pos.shift();
      else if (p.def) v = self.eval(p.def);
      else v = lc(p.type || "") === "switch" ? false : null;
      if (p.type && v !== null) { var f = typeFull(p.type); if (f) v = convertTo(f, v); }
      self.scope.vars[k] = { n: p.name, v: v };
    });
    return rest.concat(pos);
  };
  S.callFunction = function (f, args, input, emit) {
    var saved = this.scope, self = this;
    this.depth = (this.depth || 0) + 1;
    if (this.depth > 100) { this.depth = 0; throw new PSErr("The script failed due to call depth overflow.", "ScriptCallDepthException", { terminating: true }); }
    this.scope = new Scope(this.scope);
    try {
      var rest = this.bindParams(f.sb.params, args);
      this.scope.vars["args"] = { n: "args", v: rest };
      this.scope.vars["input"] = { n: "input", v: input || [] };
      try { this.execBlock(f.sb.body, emit); }
      catch (e) { if (!(e instanceof Ctl && e.kind === "return")) throw e; }
    } finally { this.scope = saved; this.depth--; }
  };

  /* ------------------------------------------------------------------
     9. Cmdlets simulados
     ------------------------------------------------------------------ */
  function arr(v) { return v === undefined || v === null ? [] : isArr(v) ? v : [v]; }
  function inputOr(b, k) { return b.has(k) ? arr(b.get(k)) : (b.input || []); }
  S.readFile = function (p, cmd) {
    var r = this.resolve(p, cmd);
    if (r.drive === "env") { var e = this.env[lc(r.name)]; if (!e) throw this.notFound(r.full, cmd); return e.v; }
    if (r.drive !== "c") throw this.naoSimulaDrive(r, cmd);
    var n = this.fs.node(r.segs);
    if (!n) throw this.notFound(r.full, cmd);
    if (n.dir) throw new PSErr("Unable to get content because it is a directory: '" + r.full + "'. Please use 'Get-ChildItem' instead.", "InvalidOperation", { cmd: cmd });
    return n.content;
  };
  S.naoSimulaDrive = function (r, cmd) {
    return new PSErr("(simulador) o drive de '" + r.full + "' não é simulado aqui; no simulador só existem C: e Env:. Veja a saída real na aula.", "NotSupported", { cmd: cmd });
  };
  S.writeFile = function (p, text, append, cmd) {
    var r = this.resolve(p, cmd);
    if (r.drive === "env") { var nm = r.name; this.env[lc(nm)] = { n: nm, v: (append && this.env[lc(nm)] ? this.env[lc(nm)].v : "") + text.replace(/\r\n$/, "") }; return null; }
    if (r.drive !== "c") throw this.naoSimulaDrive(r, cmd);
    if (!r.segs.length) throw new PSErr("Access to the path 'C:\\' is denied.", "UnauthorizedAccess", { cmd: cmd });
    var parent = this.fs.node(r.segs.slice(0, -1));
    if (!parent || !parent.dir) throw new PSErr("Could not find a part of the path '" + r.full + "'.", "ObjectNotFound", { cmd: cmd });
    var k = lc(r.segs[r.segs.length - 1]), n = parent.kids[k];
    if (n && n.dir) throw new PSErr("Access to the path '" + r.full + "' is denied.", "PermissionDenied", { cmd: cmd });
    if (!n) { n = new FSNode(r.segs[r.segs.length - 1], false, parent, this.now); parent.kids[k] = n; }
    n.content = append ? n.content + text : text; n.mtime = this.now;
    return n;
  };
  S.removeNode = function (n) { if (n.parent) delete n.parent.kids[lc(n.name)]; };
  S.isInside = function (n, anc) { for (var x = n; x; x = x.parent) if (x === anc) return true; return false; };
  S.cloneNode = function (n, parent, name) {
    var c = new FSNode(name || n.name, n.dir, parent, this.now);
    c.content = n.content; c.hidden = n.hidden;
    if (n.dir) for (var k in n.kids) c.kids[k] = this.cloneNode(n.kids[k], c);
    return c;
  };
  function linesOf(text) { var t = text.replace(/\r\n?/g, "\n"); if (t === "") return []; if (t.slice(-1) === "\n") t = t.slice(0, -1); return t.split("\n"); }
  function joinLines(vals) { return vals.map(function (v) { return toStr(v) + "\r\n"; }).join(""); }
  function whatIf(s, op, target) { s.hostWrite('What If: Executando a operação "' + op + '" no destino "' + target + '".', "out"); }

  def("Write-Output", { params: ["InputObject"], sw: ["NoEnumerate"], pos: ["InputObject"], rest: "InputObject", livre: true, aliases: ["echo", "write"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var v = b.has("InputObject") ? b.get("InputObject") : b.input ? unwrap(b.input) : undefined;
    if (b.get("NoEnumerate")) { b.out(v); return; }
    if (b.input && !b.has("InputObject")) { b.input.forEach(b.out); return; }
    this.emitVal(v, b.out);
  });
  def("Write-Host", { params: ["Object", "Separator", "ForegroundColor", "BackgroundColor"], sw: ["NoNewline"], pos: ["Object"], rest: "Object", livre: true, module: "Microsoft.PowerShell.Utility" }, function (b) {
    ["ForegroundColor", "BackgroundColor"].forEach(function (k) {
      if (b.has(k)) try { consoleColor(b.get(k)); } catch (e) { throw new PSErr("Não é possível associar o parâmetro '" + k + "'. " + e.message, "InvalidArgument", { cmd: "Write-Host" }); }
    });
    var items = b.has("Object") ? b.get("Object") : b.input ? b.input : "";
    var sep = b.has("Separator") ? toStr(b.get("Separator")) : " ";
    var flat = []; (function f(x) { if (isArr(x)) x.forEach(f); else flat.push(x); })(items);
    var txt = flat.map(function (x) { return x instanceof ScriptBlock ? x.src : toStr(x); }).join(sep);
    var cor = b.has("ForegroundColor") ? consoleColor(b.get("ForegroundColor")).name : null;
    this.closeView();
    this.write(txt, cor ? "host c-" + lc(cor) : "host", !!b.get("NoNewline"));
  });
  def("Write-Warning", { params: ["Message"], pos: ["Message"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var wa = b.has("WarningAction") ? lc(toStr(b.get("WarningAction"))) : lc(this.prefs.warning);
    if (wa === "silentlycontinue" || wa === "ignore") return;
    this.warn(toStr(b.get("Message")));
  });
  def("Write-Verbose", { params: ["Message"], pos: ["Message"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    if (b.get("Verbose") || lc(this.prefs.verbose) === "continue") this.hostWrite("DETALHADO: " + toStr(b.get("Message")), "verbose");
  });
  def("Write-Debug", { params: ["Message"], pos: ["Message"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    if (b.get("Debug") || lc(this.prefs.debug) === "continue") this.hostWrite("DEPURAR: " + toStr(b.get("Message")), "verbose");
  });
  def("Write-Information", { params: ["MessageData", "Tags"], pos: ["MessageData", "Tags"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var ia = b.has("InformationAction") ? lc(toStr(b.get("InformationAction"))) : lc(this.prefs.information);
    if (ia === "continue") this.hostWrite(toStr(b.get("MessageData")), "host");
  });
  def("Write-Error", { params: ["Message", "Category", "ErrorId", "TargetObject"], pos: ["Message"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    b.err(new PSErr(toStr(b.get("Message")), "WriteError", { cmd: "Write-Error" }));
  });
  def("Write-Progress", { params: ["Activity", "Status", "PercentComplete", "Id", "CurrentOperation", "SecondsRemaining"], sw: ["Completed"], pos: ["Activity", "Status"], module: "Microsoft.PowerShell.Utility" }, function () { });
  def("Out-Null", { params: ["InputObject"], module: "Microsoft.PowerShell.Core" }, function () { });
  def("Out-Default", { params: ["InputObject"], module: "Microsoft.PowerShell.Core" }, function (b) { var s = this; inputOr(b, "InputObject").forEach(function (x) { s.outDefault(x); }); s.flushView(); s.closeView(); });
  def("Out-Host", { params: ["InputObject"], sw: ["Paging"], module: "Microsoft.PowerShell.Core" }, function (b) { var s = this; s.closeView(); inputOr(b, "InputObject").forEach(function (x) { s.outDefault(x); }); s.flushView(); s.closeView(); });
  def("Out-String", { params: ["InputObject", "Width"], sw: ["Stream", "NoNewline"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var lines = this.formatToLines(inputOr(b, "InputObject"));
    if (b.get("Stream")) lines.forEach(b.out); else b.out(lines.join("\n") + (b.get("NoNewline") ? "" : "\n"));
  });
  def("Out-File", { params: ["FilePath", "Encoding", "InputObject", "Width"], sw: ["Append", "Force", "NoClobber", "NoNewline"], pos: ["FilePath", "Encoding"], alias: { path: "FilePath", literalpath: "FilePath" }, module: "Microsoft.PowerShell.Utility" }, function (b) {
    var lines = this.formatToLines(inputOr(b, "InputObject"));
    this.writeFile(toStr(b.get("FilePath")), b.get("NoNewline") ? lines.join("") : lines.map(function (l) { return l + "\r\n"; }).join(""), !!b.get("Append"), "Out-File");
  });
  def("Read-Host", { params: ["Prompt"], sw: ["AsSecureString", "MaskInput"], pos: ["Prompt"], rest: "Prompt", module: "Microsoft.PowerShell.Utility" }, function (b) {
    var pr = b.has("Prompt") ? toStr(b.get("Prompt")) : "", resp = "";
    var fn = this.opts.readHost;
    if (fn) resp = fn(pr);
    else if (typeof G.prompt === "function") { try { resp = G.prompt(pr ? pr + ":" : "Read-Host", ""); } catch (e) { resp = ""; } }
    if (resp === null || resp === undefined) resp = "";
    resp = String(resp);
    var secret = b.get("AsSecureString") || b.get("MaskInput");
    this.hostWrite((pr ? pr + ": " : "") + (secret ? rep("*", resp.length) : resp), "host");
    b.out(b.get("AsSecureString") ? new PSObj("System.Security.SecureString", { Length: resp.length }, { toStr: function () { return "System.Security.SecureString"; } }) : resp);
  });
  def("Clear-Host", { aliases: ["cls", "clear"], module: "" }, function () { this.clear(); });

  def("Get-Location", { sw: ["Stack"], params: ["PSProvider", "PSDrive", "StackName"], aliases: ["gl", "pwd"] }, function (b) {
    if (b.get("Stack")) { this.stack.slice().reverse().forEach(function (st) { var o = new PSObj("System.Management.Automation.PathInfo", { Path: fullOf(st) }); o.toStr = function () { return fullOf(st); }; b.out(o); }); return; }
    b.out(this.pathInfo());
  });
  S.setLoc = function (p, cmd) {
    var r = this.resolve(p, cmd);
    if (r.drive !== "c") throw new PSErr("(simulador) no simulador não dá para entrar em '" + r.full + "'; só nas pastas do C:.", "NotSupported", { cmd: cmd });
    var n = this.fs.node(r.segs);
    if (!n || !n.dir) throw this.notFound(r.full, cmd);
    this.prevLoc = this.cwd.slice();
    this.cwd = segsOf(n);
  };
  def("Set-Location", { params: ["Path", "LiteralPath", "StackName"], sw: ["PassThru"], pos: ["Path"], alias: { lp: "LiteralPath", pspath: "LiteralPath" }, aliases: ["cd", "sl", "chdir"] }, function (b) {
    var p = b.has("Path") ? b.get("Path") : b.has("LiteralPath") ? b.get("LiteralPath") : (b.input && b.input.length ? b.input[0] : HOME);
    if (isArr(p)) throw new PSErr("Cannot convert 'System.Object[]' to the type 'System.String' required by parameter 'Path'. Specified method is not supported.", "InvalidArgument", { cmd: "Set-Location" });
    p = this.pathArg(p);
    if (p === "-" && this.prevLoc) { var t = this.cwd; this.cwd = this.prevLoc; this.prevLoc = t; }
    else this.setLoc(p, "Set-Location");
    if (b.get("PassThru")) b.out(this.pathInfo());
  });
  def("Push-Location", { params: ["Path", "LiteralPath", "StackName"], sw: ["PassThru"], pos: ["Path"], aliases: ["pushd"] }, function (b) {
    var old = this.cwd.slice();
    if (b.has("Path")) this.setLoc(this.pathArg(b.get("Path")), "Push-Location");
    this.stack.push(old);
  });
  def("Pop-Location", { params: ["StackName"], sw: ["PassThru"], aliases: ["popd"] }, function (b) {
    if (this.stack.length) this.cwd = this.stack.pop();
    if (b.get("PassThru")) b.out(this.pathInfo());
  });

  S.listDir = function (node, opts, rel, out) {
    var self = this, kids = Object.keys(node.kids).map(function (k) { return node.kids[k]; });
    kids.sort(function (a, b) { return a.dir !== b.dir ? (a.dir ? -1 : 1) : (lc(a.name) < lc(b.name) ? -1 : lc(a.name) > lc(b.name) ? 1 : 0); });
    kids.forEach(function (c) {
      if (c.hidden && !opts.force) return;
      var ok = true;
      if (opts.filter && !wildRe(opts.filter).test(c.name)) ok = false;
      if (opts.include && !opts.include.some(function (p) { return wildRe(p).test(c.name); })) ok = false;
      if (opts.exclude && opts.exclude.some(function (p) { return wildRe(p).test(c.name); })) ok = false;
      if (opts.file && c.dir) ok = false;
      if (opts.directory && !c.dir) ok = false;
      if (ok) out.push({ node: c, rel: rel ? rel + "\\" + c.name : c.name });
    });
    if (opts.recurse && (opts.depth === undefined || opts.depth > 0)) {
      kids.forEach(function (c) {
        if (!c.dir || (c.hidden && !opts.force)) return;
        var o2 = {}; for (var k in opts) o2[k] = opts[k];
        if (o2.depth !== undefined) o2.depth--;
        self.tick();
        self.listDir(c, o2, rel ? rel + "\\" + c.name : c.name, out);
      });
    }
  };
  function envEntry(n, v) { var o = new PSObj("System.Collections.DictionaryEntry", { Name: n, Key: n, Value: v }); o.toStr = function () { return "System.Collections.DictionaryEntry"; }; return o; }
  def("Get-ChildItem", { params: ["Path", "LiteralPath", "Filter", "Include", "Exclude", "Depth", "Attributes"], sw: ["Recurse", "Force", "Name", "Directory", "File", "Hidden", "ReadOnly", "System", "FollowSymlink"],
    ordem: ["Path", "LiteralPath", "Filter", "Include", "Exclude", "Recurse", "Depth", "Force", "Name"], dyn: ["Attributes", "FollowSymlink", "Directory", "File", "Hidden", "ReadOnly", "System"], pos: ["Path", "Filter"], alias: { lp: "LiteralPath", pspath: "LiteralPath", s: "Recurse", ad: "Directory", af: "File", ah: "Hidden", h: "Hidden" }, aliases: ["ls", "dir", "gci"] }, function (b) {
    var self = this, paths = b.has("Path") ? arr(b.get("Path")) : b.has("LiteralPath") ? arr(b.get("LiteralPath")) : (b.input && b.input.length ? b.input : ["."]);
    var opts = { filter: b.has("Filter") ? toStr(b.get("Filter")) : null, include: b.has("Include") ? arr(b.get("Include")).map(toStr) : null, exclude: b.has("Exclude") ? arr(b.get("Exclude")).map(toStr) : null,
      recurse: !!b.get("Recurse") || b.has("Depth"), depth: b.has("Depth") ? toInt(b.get("Depth")) : undefined, force: !!b.get("Force") || !!b.get("Hidden"), file: !!b.get("File"), directory: !!b.get("Directory") };
    paths.forEach(function (p) {
      p = self.pathArg(p);
      var r;
      try { r = self.resolve(p, "Get-ChildItem"); } catch (e) { b.err(e); return; }
      if (r.drive === "env") {
        Object.keys(self.env).sort().forEach(function (k) { var e = self.env[k]; if (!r.name || wildRe(r.name).test(e.n)) b.out(b.get("Name") ? e.n : envEntry(e.n, e.v)); });
        return;
      }
      if (r.drive === "alias") { Object.keys(ALIASES).sort().forEach(function (k) { if (!r.name || wildRe(r.name).test(k)) b.out(b.get("Name") ? ALIASES[k].name : aliasInfo(ALIASES[k])); }); return; }
      if (r.drive !== "c") { b.err(self.naoSimulaDrive(r, "Get-ChildItem")); return; }
      var hits;
      try { hits = self.expand(p, "Get-ChildItem"); } catch (e2) { b.err(e2); return; }
      var wildLast = hasWild(r.segs[r.segs.length - 1] || "");
      hits.forEach(function (h) {
        var list = [];
        if (h.node.dir && !wildLast) self.listDir(h.node, opts, "", list);
        else {
          var ok = (!opts.file || !h.node.dir) && (!opts.directory || h.node.dir) && (!opts.filter || wildRe(opts.filter).test(h.node.name));
          if (ok) list.push({ node: h.node, rel: h.node.name });
        }
        list.forEach(function (x) { b.out(b.get("Name") ? x.rel : self.item(x.node)); });
      });
    });
  });
  def("Get-Item", { params: ["Path", "LiteralPath", "Filter", "Include", "Exclude", "Stream"], sw: ["Force"], pos: ["Path"], aliases: ["gi"] }, function (b) {
    var self = this;
    inputOr(b, "Path").concat(b.has("LiteralPath") ? arr(b.get("LiteralPath")) : []).forEach(function (p) {
      p = self.pathArg(p);
      var r; try { r = self.resolve(p, "Get-Item"); } catch (e) { b.err(e); return; }
      if (r.drive === "env") { var keys = Object.keys(self.env).filter(function (k) { return wildRe(r.name || "*").test(self.env[k].n); }); if (!keys.length) { b.err(self.notFound(r.full, "Get-Item")); return; } keys.forEach(function (k) { b.out(envEntry(self.env[k].n, self.env[k].v)); }); return; }
      if (r.drive !== "c") { b.err(self.naoSimulaDrive(r, "Get-Item")); return; }
      try { self.expand(p, "Get-Item").forEach(function (h) { if (h.node.hidden && !b.get("Force") && hasWild(p)) return; b.out(self.item(h.node)); }); } catch (e3) { b.err(e3); }
    });
  });
  def("Resolve-Path", { params: ["Path", "LiteralPath", "RelativeBasePath"], sw: ["Relative"], pos: ["Path"], aliases: ["rvpa"] }, function (b) {
    var self = this;
    inputOr(b, "Path").forEach(function (p) {
      try {
        self.expand(self.pathArg(p), "Resolve-Path").forEach(function (h) {
          if (b.get("Relative")) { b.out(".\\" + h.segs.slice(self.cwd.length).join("\\")); return; }
          var o = new PSObj("System.Management.Automation.PathInfo", { Path: h.full }); o.toStr = function () { return h.full; }; b.out(o);
        });
      } catch (e) { b.err(e); }
    });
  });
  def("Test-Path", { params: ["Path", "LiteralPath", "PathType", "Filter", "Include", "Exclude"], sw: ["IsValid"], pos: ["Path"], alias: { type: "PathType" } }, function (b) {
    var self = this, tipo = b.has("PathType") ? lc(toStr(b.get("PathType"))) : "any";
    if (["any", "leaf", "container"].indexOf(tipo) === -1) throw new PSErr("Não é possível associar o parâmetro 'PathType'. Cannot convert value \"" + toStr(b.get("PathType")) + "\" to type \"Microsoft.PowerShell.Commands.TestPathType\". Error: \"Unable to match the identifier name " + toStr(b.get("PathType")) + " to a valid enumerator name. Specify one of the following enumerator names and try again:\nAny, Container, Leaf\"", "InvalidArgument");
    inputOr(b, "Path").concat(b.has("LiteralPath") ? arr(b.get("LiteralPath")) : []).forEach(function (p) {
      p = self.pathArg(p);
      if (b.get("IsValid")) { b.out(!/[<>|"]/.test(p)); return; }
      var r; try { r = self.resolve(p, "Test-Path"); } catch (e) { b.out(false); return; }
      if (r.drive === "env") { b.out(!r.name ? tipo !== "leaf" : !!self.env[lc(r.name)] && tipo !== "container"); return; }
      if (r.drive === "alias") { b.out(!r.name || !!ALIASES[lc(r.name)]); return; }
      if (r.drive === "variable") { b.out(!r.name || !!self.findVar(lc(r.name))); return; }
      if (r.drive === "function") { b.out(!r.name || !!self.funcs[lc(r.name)]); return; }
      if (r.drive === "reg" && /^(hkcu|hklm):\\?(software|system|control panel|environment)?\\?$/i.test(r.full)) { b.out(true); return; }
      if (r.drive !== "c") { self.hostWrite("(simulador) o registro (HKCU:, HKLM:) não é simulado aqui; veja a saída real na aula.", "info"); return; }
      var hits = self.expand(p, "Test-Path", true);
      b.out(hits.some(function (h) { return tipo === "any" || (tipo === "leaf" ? !h.node.dir : h.node.dir); }));
    });
  });

  def("New-Item", { params: ["Path", "Name", "ItemType", "Value", "Target"], sw: ["Force", "WhatIf", "Confirm"], pos: ["Path"], alias: { type: "ItemType", wi: "WhatIf", cf: "Confirm" }, aliases: ["ni"] }, function (b) {
    var self = this, paths = b.has("Path") ? arr(b.get("Path")) : [b.has("Name") ? "." : null];
    var tipo = b.has("ItemType") ? lc(toStr(b.get("ItemType"))) : "file";
    if (tipo === "dir" || tipo === "folder" || tipo === "d" || "directory".indexOf(tipo) === 0) tipo = "directory";
    else if ("file".indexOf(tipo) === 0 || tipo === "f") tipo = "file";
    else throw new PSErr("(simulador) New-Item -ItemType " + toStr(b.get("ItemType")) + " não é simulado; use File ou Directory.", "NotSupported", { cmd: "New-Item" });
    if (paths[0] === null) throw new PSErr("(simulador) faltou o caminho: use New-Item nome.txt ou New-Item -Name nome.txt.", "InvalidArgument", { cmd: "New-Item" });
    paths.forEach(function (p) {
      p = toStr(p);
      if (b.has("Name")) p = (p === "." || p === "" ? "" : p.replace(/[\\\/]$/, "") + "\\") + toStr(b.get("Name"));
      var r; try { r = self.resolve(p, "New-Item"); } catch (e) { b.err(e); return; }
      if (r.drive === "env") { self.env[lc(r.name)] = { n: r.name, v: b.has("Value") ? toStr(b.get("Value")) : "" }; b.out(envEntry(r.name, self.env[lc(r.name)].v)); return; }
      if (r.drive !== "c") { b.err(self.naoSimulaDrive(r, "New-Item")); return; }
      if (b.get("WhatIf")) { whatIf(self, tipo === "directory" ? "Criar Diretório" : "Criar Arquivo", "Destino: " + r.full); return; }
      var ex = self.fs.node(r.segs);
      if (tipo === "directory") {
        if (ex && ex.dir && b.get("Force")) { b.out(self.item(ex)); return; }
        if (ex) { b.err(new PSErr("An item with the specified name " + r.full + " already exists.", "ResourceExists", { cmd: "New-Item" })); return; }
        var n = self.fs.mkdirs(r.segs);
        if (!n) { b.err(new PSErr("Could not find a part of the path '" + r.full + "'.", "ObjectNotFound", { cmd: "New-Item" })); return; }
        n.mtime = self.now; b.out(self.item(n)); return;
      }
      if (ex && !b.get("Force")) { b.err(new PSErr("The file '" + r.full + "' already exists.", "ResourceExists", { cmd: "New-Item" })); return; }
      if (ex && ex.dir) { b.err(new PSErr("Access to the path '" + r.full + "' is denied.", "PermissionDenied", { cmd: "New-Item" })); return; }
      if (b.get("Force")) self.fs.mkdirs(r.segs.slice(0, -1));
      try { var f = self.writeFile(r.full, b.has("Value") ? toStr(b.get("Value")) : "", false, "New-Item"); b.out(self.item(f)); } catch (e2) { b.err(e2); }
    });
  });
  def("Remove-Item", { params: ["Path", "LiteralPath", "Filter", "Include", "Exclude"], sw: ["Recurse", "Force", "WhatIf", "Confirm"], pos: ["Path"], alias: { wi: "WhatIf", cf: "Confirm", lp: "LiteralPath" }, aliases: ["rm", "del", "erase", "rd", "rmdir", "ri"] }, function (b) {
    var self = this;
    inputOr(b, "Path").concat(b.has("LiteralPath") ? arr(b.get("LiteralPath")) : []).forEach(function (p) {
      p = self.pathArg(p);
      var r; try { r = self.resolve(p, "Remove-Item"); } catch (e) { b.err(e); return; }
      if (r.drive === "env") { if (!self.env[lc(r.name)]) { b.err(self.notFound(r.full, "Remove-Item")); return; } delete self.env[lc(r.name)]; return; }
      if (r.drive === "variable") { for (var sc = self.scope; sc; sc = sc.parent) delete sc.vars[lc(r.name)]; return; }
      if (r.drive !== "c") { if (b.get("WhatIf")) { whatIf(self, "Remover Chave", "Item: " + r.full.replace(/^HKCU:/i, "HKEY_CURRENT_USER").replace(/^HKLM:/i, "HKEY_LOCAL_MACHINE")); return; } b.err(self.naoSimulaDrive(r, "Remove-Item")); return; }
      var hits; try { hits = self.expand(p, "Remove-Item"); } catch (e2) { b.err(e2); return; }
      hits.forEach(function (h) {
        if (b.has("Filter") && !wildRe(toStr(b.get("Filter"))).test(h.node.name)) return;
        if (h.node.hidden && !b.get("Force") && hasWild(p)) return;
        if (b.get("WhatIf")) { whatIf(self, h.node.dir ? "Remover Diretório" : "Remover Arquivo", h.full); return; }
        var cwdNode = self.fs.node(self.cwd);
        if (!h.node.parent || self.isInside(cwdNode, h.node)) { b.err(new PSErr("Cannot remove the item at '" + h.full + "' because it is in use.", "PermissionDenied", { cmd: "Remove-Item" })); return; }
        if (h.node.dir && Object.keys(h.node.kids).length && !b.get("Recurse")) {
          b.err(new PSErr("(simulador) a pasta '" + h.full + "' não está vazia. No seu PowerShell aparece uma confirmação (Sim/Não) antes de apagar tudo; aqui, use -Recurse.", "InvalidOperation", { cmd: "Remove-Item" }));
          return;
        }
        self.removeNode(h.node);
      });
    });
  });
  S.copyMove = function (b, move) {
    var self = this, cmd = move ? "Move-Item" : "Copy-Item";
    var srcs = b.has("Path") ? arr(b.get("Path")) : b.has("LiteralPath") ? arr(b.get("LiteralPath")) : (b.input || []);
    var destV = b.has("Destination") ? b.get("Destination") : ".";
    srcs.forEach(function (sp) {
      var item = sp; sp = self.pathArg(sp);
      var dv = destV instanceof ScriptBlock ? toStr(self.callSB(destV, [], item)) : self.pathArg(destV);
      var hits; try { hits = self.expand(sp, cmd); } catch (e) { b.err(e); return; }
      hits.forEach(function (h) {
        var d; try { d = self.resolve(dv, cmd); } catch (e2) { b.err(e2); return; }
        if (d.drive !== "c") { b.err(self.naoSimulaDrive(d, cmd)); return; }
        var dn = self.fs.node(d.segs), parent, name;
        if (dn && dn.dir) { parent = dn; name = h.node.name; }
        else if (/[\\\/]$/.test(dv) && !dn) { b.err(new PSErr("Could not find a part of the path '" + d.full + "\\" + h.node.name + "'.", "ObjectNotFound", { cmd: cmd })); return; }
        else { parent = self.fs.node(d.segs.slice(0, -1)); name = d.segs[d.segs.length - 1]; }
        if (!parent || !parent.dir) { b.err(new PSErr("Could not find a part of the path '" + d.full + "'.", "ObjectNotFound", { cmd: cmd })); return; }
        var tgtFull = fullOf(segsOf(parent).concat([name]));
        if (b.get("WhatIf")) { whatIf(self, (move ? "Mover " : "Copiar ") + (h.node.dir ? "Diretório" : "Arquivo"), "Item: " + h.full + " Destino: " + tgtFull); return; }
        var ex = parent.kids[lc(name)];
        if (h.node.dir && self.isInside(parent, h.node)) { b.err(new PSErr("Cannot " + (move ? "move" : "copy") + " item '" + h.full + "' into a subdirectory of itself.", "InvalidArgument", { cmd: cmd })); return; }
        if (move) {
          if (ex && ex !== h.node && (!b.get("Force") || ex.dir)) { b.err(new PSErr("Não é possível criar um arquivo já existente.", "WriteError", { cmd: cmd })); return; }
          self.removeNode(h.node); h.node.name = name; h.node.parent = parent; parent.kids[lc(name)] = h.node;
          if (b.get("PassThru")) b.out(self.item(h.node));
          return;
        }
        if (h.node.dir) {
          if (ex && !ex.dir) { b.err(new PSErr("An item with the specified name " + tgtFull + " already exists.", "ResourceExists", { cmd: cmd })); return; }
          var c = ex || new FSNode(name, true, parent, self.now);
          parent.kids[lc(name)] = c;
          if (b.get("Recurse")) for (var k in h.node.kids) c.kids[k] = self.cloneNode(h.node.kids[k], c);
          if (b.get("PassThru")) b.out(self.item(c));
        } else {
          if (ex && ex.dir) { b.err(new PSErr("Não é possível substituir o diretório '" + tgtFull + "' pelo arquivo '" + h.full + "'.", "WriteError", { cmd: cmd })); return; }
          var cf = self.cloneNode(h.node, parent, name); parent.kids[lc(name)] = cf;
          if (b.get("PassThru")) b.out(self.item(cf));
        }
      });
    });
  };
  def("Copy-Item", { params: ["Path", "Destination", "LiteralPath", "Filter", "Include", "Exclude"], sw: ["Recurse", "Force", "PassThru", "Container", "WhatIf", "Confirm"], pos: ["Path", "Destination"], alias: { wi: "WhatIf", cf: "Confirm", lp: "LiteralPath" }, aliases: ["cp", "copy", "cpi"] }, function (b) { this.copyMove(b, false); });
  def("Move-Item", { params: ["Path", "Destination", "LiteralPath", "Filter", "Include", "Exclude"], sw: ["Force", "PassThru", "WhatIf", "Confirm"], pos: ["Path", "Destination"], alias: { wi: "WhatIf", cf: "Confirm", lp: "LiteralPath" }, aliases: ["mv", "move", "mi"] }, function (b) { this.copyMove(b, true); });
  def("Rename-Item", { params: ["Path", "NewName", "LiteralPath"], sw: ["Force", "PassThru", "WhatIf", "Confirm"], pos: ["Path", "NewName"], alias: { wi: "WhatIf", cf: "Confirm", lp: "LiteralPath" }, aliases: ["ren", "rni"] }, function (b) {
    var self = this;
    inputOr(b, "Path").concat(b.has("LiteralPath") ? arr(b.get("LiteralPath")) : []).forEach(function (p) {
      var item = p; p = self.pathArg(p);
      var nnv = b.get("NewName");
      if (nnv === undefined) throw new PSErr("(simulador) faltou o -NewName.", "InvalidArgument", { cmd: "Rename-Item" });
      var nn = nnv instanceof ScriptBlock ? toStr(self.callSB(nnv, [], item)) : toStr(nnv);
      var r; try { r = self.resolve(p, "Rename-Item"); } catch (e) { b.err(e); return; }
      var n = r.drive === "c" ? self.fs.node(r.segs) : null;
      if (!n) { b.err(self.notFound(r.full, "Rename-Item")); return; }
      if (/[\\\/]/.test(nn)) { b.err(new PSErr("Não\u00a0é possível renomear o destino especificado porque ele representa um caminho ou nome de dispositivo.", "InvalidArgument", { cmd: "Rename-Item" })); return; }
      if (b.get("WhatIf")) { whatIf(self, n.dir ? "Renomear Diretório" : "Renomear Arquivo", "Item: " + r.full + " Destino: " + fullOf(segsOf(n.parent).concat([nn]))); return; }
      var ex = n.parent.kids[lc(nn)];
      if (ex && ex !== n) { b.err(new PSErr("Não é possível criar um arquivo já existente.", "WriteError", { cmd: "Rename-Item" })); return; }
      delete n.parent.kids[lc(n.name)]; n.name = nn; n.parent.kids[lc(nn)] = n;
      if (b.get("PassThru")) b.out(self.item(n));
    });
  });
  def("Get-Content", { params: ["Path", "LiteralPath", "TotalCount", "Tail", "Encoding", "Delimiter", "ReadCount"], sw: ["Raw", "Force", "Wait"], pos: ["Path"], alias: { first: "TotalCount", head: "TotalCount", last: "Tail", lp: "LiteralPath" }, aliases: ["gc", "cat", "type"] }, function (b) {
    var self = this;
    inputOr(b, "Path").concat(b.has("LiteralPath") ? arr(b.get("LiteralPath")) : []).forEach(function (p) {
      p = self.pathArg(p);
      var hits;
      try { var r = self.resolve(p, "Get-Content"); hits = r.drive === "c" ? self.expand(p, "Get-Content") : [r]; } catch (e) { b.err(e); return; }
      hits.forEach(function (h) {
        var t; try { t = self.readFile(h.full, "Get-Content"); } catch (e2) { b.err(e2); return; }
        if (b.get("Raw")) { b.out(t); return; }
        var ls = linesOf(t);
        if (b.has("TotalCount")) ls = ls.slice(0, toInt(b.get("TotalCount")));
        if (b.has("Tail")) ls = ls.slice(Math.max(0, ls.length - toInt(b.get("Tail"))));
        ls.forEach(b.out);
      });
    });
  });
  S.setContent = function (b, append) {
    var self = this, cmd = append ? "Add-Content" : "Set-Content";
    var vals = b.has("Value") ? arr(b.get("Value")) : (b.input || []);
    var flat = []; (function f(x) { x.forEach(function (y) { if (isArr(y)) f(y); else flat.push(y); }); })(vals);
    var text = b.get("NoNewline") ? flat.map(toStr).join("") : joinLines(flat);
    if (!b.has("Path")) throw new PSErr("(simulador) faltou o caminho do arquivo (-Path).", "InvalidArgument", { cmd: cmd });
    arr(b.get("Path")).forEach(function (p) {
      p = self.pathArg(p);
      try {
        var r = self.resolve(p, cmd), targets = [p];
        if (r.drive === "c" && r.segs.some(hasWild)) targets = self.expand(p, cmd).map(function (h) { return h.full; });
        targets.forEach(function (t) {
          if (b.get("WhatIf")) { whatIf(self, append ? "Adicionar Conteúdo" : "Definir Conteúdo", "Caminho: " + self.resolve(t).full); return; }
          self.writeFile(t, text, append, cmd);
          if (b.get("PassThru")) flat.forEach(b.out);
        });
      } catch (e) { b.err(e); }
    });
  };
  def("Set-Content", { params: ["Path", "Value", "Encoding", "LiteralPath"], sw: ["Force", "NoNewline", "PassThru", "WhatIf", "Confirm"], pos: ["Path", "Value"], alias: { wi: "WhatIf" } }, function (b) { this.setContent(b, false); });
  def("Add-Content", { params: ["Path", "Value", "Encoding", "LiteralPath"], sw: ["Force", "NoNewline", "PassThru", "WhatIf", "Confirm"], pos: ["Path", "Value"], alias: { wi: "WhatIf" }, aliases: ["ac"] }, function (b) { this.setContent(b, true); });
  def("Clear-Content", { params: ["Path", "LiteralPath"], sw: ["Force", "WhatIf"], pos: ["Path"], aliases: ["clc"] }, function (b) {
    var self = this; arr(b.get("Path")).forEach(function (p) { try { self.readFile(self.pathArg(p), "Clear-Content"); self.writeFile(self.pathArg(p), "", false, "Clear-Content"); } catch (e) { b.err(e); } });
  });
  def("Split-Path", { params: ["Path", "LiteralPath"], sw: ["Leaf", "Parent", "Extension", "LeafBase", "Qualifier", "NoQualifier", "IsAbsolute", "Resolve"], pos: ["Path"] }, function (b) {
    var self = this;
    inputOr(b, "Path").forEach(function (p) {
      p = self.pathArg(p);
      var q = p.replace(/\//g, "\\"), m = /^([A-Za-z]+:)(.*)$/.exec(q), qual = m ? m[1] : "", rest = m ? m[2] : q;
      var trimmed = rest.replace(/\\+$/, "") || rest, i = trimmed.lastIndexOf("\\");
      var leaf = i === -1 ? trimmed : trimmed.slice(i + 1), parent = i === -1 ? (qual && rest[0] === "\\" ? qual + "\\" : qual) : qual + (i === 0 ? "\\" : trimmed.slice(0, i));
      if (rest === "\\" || rest === "") { leaf = ""; parent = ""; }
      if (b.get("IsAbsolute")) { b.out(!!qual && rest[0] === "\\"); return; }
      if (b.get("Qualifier")) { if (!qual) { b.err(new PSErr("Cannot parse path because path '" + p + "' does not have a qualifier specified.", "InvalidArgument", { cmd: "Split-Path" })); return; } b.out(qual); return; }
      if (b.get("NoQualifier")) { b.out(rest); return; }
      var dot = leaf.lastIndexOf(".");
      if (b.get("Extension")) { b.out(dot >= 0 && leaf.length > 1 ? leaf.slice(dot) : ""); return; }
      if (b.get("LeafBase")) { b.out(dot > 0 ? leaf.slice(0, dot) : leaf); return; }
      if (b.get("Leaf")) { b.out(leaf); return; }
      b.out(parent);
    });
  });
  def("Join-Path", { params: ["Path", "ChildPath", "AdditionalChildPath"], sw: ["Resolve"], pos: ["Path", "ChildPath", "AdditionalChildPath"], rest: "AdditionalChildPath" }, function (b) {
    var self = this, extra = arr(b.get("AdditionalChildPath")).map(toStr);
    inputOr(b, "Path").forEach(function (p) {
      var parts = [self.pathArg(p)].concat(b.has("ChildPath") ? [toStr(b.get("ChildPath"))] : []).concat(extra);
      var out = parts.reduce(function (a, c) {
        c = c.replace(/\//g, "\\");
        if (a === "") return c;
        return a.replace(/\\+$/, "") + "\\" + c.replace(/^\\+/, "");
      }, "");
      if (b.get("Resolve")) { try { self.expand(out, "Join-Path").forEach(function (h) { b.out(h.full); }); } catch (e) { b.err(e); } return; }
      b.out(out);
    });
  });

  // ---------- pipeline: ForEach / Where / Select / Sort / Measure / Group / Format ----------
  S.propVal = function (o, p) { // p: nome, ScriptBlock ou hashtable calculada
    if (p instanceof ScriptBlock) return this.callSB(p, [], o);
    if (p instanceof PSHash) { var e = p.get("Expression") || p.get("e"); return e instanceof ScriptBlock ? this.callSB(e, [], o) : getMember(o, toStr(e), this); }
    return getMember(o, toStr(p), this);
  };
  function propLabel(p) { if (p instanceof PSHash) return toStr(p.get("Name") || p.get("Label") || p.get("n") || p.get("l") || (p.get("Expression") || p.get("e")).src); return p instanceof ScriptBlock ? p.src : toStr(p); }
  function propNames(o) {
    if (o instanceof PSObj) return o.keys.slice();
    if (o instanceof PSHash) return ["IsReadOnly", "IsFixedSize", "IsSynchronized", "Keys", "Values", "SyncRoot", "Count"];
    if (typeof o === "string") return ["Length"];
    if (o instanceof PSDate) return ["DisplayHint", "DateTime", "Date", "Day", "DayOfWeek", "DayOfYear", "Hour", "Kind", "Millisecond", "Microsecond", "Nanosecond", "Minute", "Month", "Second", "Ticks", "TimeOfDay", "Year"];
    if (o instanceof PSVersion) return ["Major", "Minor", "Build", "Revision"];
    return [];
  }
  def("ForEach-Object", { params: ["Process", "Begin", "End", "MemberName", "ArgumentList", "InputObject", "RemainingScripts"], pos: ["Process"], rest: "Process", aliases: ["foreach", "%"], module: "Microsoft.PowerShell.Core" }, function (b) {
    var self = this, items = inputOr(b, "InputObject"), pr = b.get("Process");
    if (b.has("MemberName") || (pr !== undefined && !(pr instanceof ScriptBlock) && !isArr(pr))) {
      var mn = toStr(b.has("MemberName") ? b.get("MemberName") : pr), margs = arr(b.get("ArgumentList"));
      items.forEach(function (it) {
        var v = getMember(it, mn, self);
        if (v === null && !(it instanceof PSObj && it.has(mn))) { try { v = self.callMethod(it, mn, margs); } catch (e) { v = null; } }
        self.emitVal(v, b.out);
      });
      return;
    }
    var blocks = isArr(pr) ? pr.slice() : pr ? [pr] : [], begin = b.get("Begin"), end = b.get("End");
    if (blocks.length === 3 && !begin && !end) { begin = blocks[0]; end = blocks[2]; blocks = [blocks[1]]; }
    else if (blocks.length === 2 && !begin && !end) { begin = blocks[0]; blocks = [blocks[1]]; }
    var run = function (sb, u) { self.callSBList(sb, [], u, false).forEach(function (x) { self.emitVal(x, b.out); }); };
    if (begin) run(begin, undefined);
    items.forEach(function (it) { self.tick(); blocks.forEach(function (sb) { run(sb, it); }); });
    if (end) run(end, undefined);
  });
  var WOPS = ["EQ", "NE", "GT", "GE", "LT", "LE", "Like", "NotLike", "Match", "NotMatch", "Contains", "NotContains", "In", "NotIn", "Is", "IsNot",
    "CEQ", "CNE", "CGT", "CGE", "CLT", "CLE", "CLike", "CNotLike", "CMatch", "CNotMatch", "CContains", "CNotContains", "CIn", "CNotIn", "Not"];
  def("Where-Object", { params: ["FilterScript", "Property", "Value", "InputObject"], sw: WOPS, pos: ["Property", "Value"], aliases: ["where", "?"], module: "Microsoft.PowerShell.Core" }, function (b) {
    var self = this, items = inputOr(b, "InputObject");
    var fs = b.get("FilterScript") || (b.get("Property") instanceof ScriptBlock ? b.get("Property") : null);
    if (fs) { items.forEach(function (it) { self.tick(); if (truthy(self.callSB(fs, [], it))) b.out(it); }); return; }
    var prop = toStr(b.get("Property")), op = null;
    WOPS.forEach(function (o) { if (b.get(o)) op = o; });
    var val = b.get("Value");
    items.forEach(function (it) {
      var pv = getMember(it, prop, self), ok;
      if (!op) ok = truthy(pv);
      else if (op === "Not") ok = !truthy(pv);
      else { var cs = op[0] === "C" && op[1] === op[1].toUpperCase(), o2 = lc(cs ? op.slice(1) : op); ok = truthy(self.binary({ t: "bin", op: o2, cs: cs, l: { t: "num", v: pv }, r: { t: "num", v: val } })); }
      if (ok) b.out(it);
    });
  });
  S.selectProps = function (o, props) {
    var self = this, out = new PSObj("Selected." + (typeOf(o) || "System.Object"), {});
    props.forEach(function (p) {
      if (!(p instanceof PSHash) && !(p instanceof ScriptBlock) && hasWild(toStr(p))) { var re = wildRe(toStr(p)); propNames(o).forEach(function (n) { if (re.test(n)) out.set(n, getMember(o, n, self)); }); return; }
      var nm = propLabel(p); out.set(o instanceof PSObj && !(p instanceof PSHash) ? o.realName(nm) : nm, self.propVal(o, p));
    });
    if (o instanceof PSObj && o.fsNode) { out.fsFull = o.fsFull; }
    return out;
  };
  def("Select-Object", { params: ["Property", "ExpandProperty", "First", "Last", "Skip", "SkipLast", "Index", "ExcludeProperty", "InputObject"], sw: ["Unique", "Wait", "CaseInsensitive"], pos: ["Property"], aliases: ["select"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, items = inputOr(b, "InputObject");
    if (b.has("Skip")) items = items.slice(toInt(b.get("Skip")));
    if (b.has("SkipLast")) items = items.slice(0, Math.max(0, items.length - toInt(b.get("SkipLast"))));
    if (b.has("Index")) { var ix = arr(b.get("Index")).map(toInt); items = items.filter(function (x, i) { return ix.indexOf(i) !== -1; }); }
    if (b.has("First") || b.has("Last")) {
      var f = b.has("First") ? items.slice(0, toInt(b.get("First"))) : [], l = b.has("Last") ? items.slice(Math.max(0, items.length - toInt(b.get("Last")))) : [];
      items = b.has("First") && b.has("Last") ? f.concat(l) : b.has("First") ? f : l;
    }
    if (b.get("Unique")) { var seen = []; items = items.filter(function (x) { if (seen.some(function (y) { return eqVals(x, y, !b.get("CaseInsensitive")); })) return false; seen.push(x); return true; }); }
    if (b.has("ExpandProperty")) {
      var ep = toStr(b.get("ExpandProperty"));
      items.forEach(function (it) {
        if (!(it instanceof PSObj ? it.has(ep) || it.dyn : getMember(it, ep, self) !== null)) { b.err(new PSErr('A propriedade "' + ep + '" não pode ser encontrada.', "InvalidArgument", { cmd: "Select-Object" })); return; }
        self.emitVal(getMember(it, ep, self), b.out);
      });
      return;
    }
    if (b.has("Property")) { var props = arr(b.get("Property")); items.forEach(function (it) { b.out(self.selectProps(it, props)); }); return; }
    items.forEach(b.out);
  });
  def("Sort-Object", { params: ["Property", "Top", "Bottom", "InputObject", "Culture"], sw: ["Descending", "Unique", "CaseSensitive", "Stable"], pos: ["Property"], aliases: ["sort"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, items = inputOr(b, "InputObject").map(function (x, i) { return { v: x, i: i }; });
    var props = b.has("Property") ? arr(b.get("Property")) : [null], desc = !!b.get("Descending"), cs = !!b.get("CaseSensitive");
    var keys = items.map(function (it) { return props.map(function (p) { return p === null ? it.v : self.propVal(it.v, p); }); });
    items.sort(function (x, y) {
      for (var k = 0; k < props.length; k++) {
        var d = props[k] instanceof PSHash && props[k].has("Descending") ? truthy(props[k].get("Descending")) : desc;
        var c; try { c = cmpVals(keys[x.i][k], keys[y.i][k], cs); } catch (e) { c = toStr(keys[x.i][k]) < toStr(keys[y.i][k]) ? -1 : 1; }
        if (c) return d ? -c : c;
      }
      return x.i - y.i;
    });
    var out = items.map(function (x) { return x.v; });
    if (b.get("Unique")) { var u = []; out = out.filter(function (x) { if (u.some(function (y) { return eqVals(x, y, cs); })) return false; u.push(x); return true; }); }
    if (b.has("Top")) out = out.slice(0, toInt(b.get("Top")));
    if (b.has("Bottom")) out = out.slice(Math.max(0, out.length - toInt(b.get("Bottom"))));
    out.forEach(b.out);
  });
  def("Measure-Object", { params: ["Property", "InputObject"], sw: ["Sum", "Average", "Maximum", "Minimum", "StandardDeviation", "AllStats", "Line", "Word", "Character", "IgnoreWhiteSpace"], pos: ["Property"], aliases: ["measure"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, items = inputOr(b, "InputObject");
    if (b.get("Line") || b.get("Word") || b.get("Character")) {
      var t = new PSObj("Microsoft.PowerShell.Commands.TextMeasureInfo", { Lines: null, Words: null, Characters: null }, { numCols: ["Lines", "Words", "Characters"] });
      var txt = items.map(toStr);
      if (b.get("Line")) t.set("Lines", txt.reduce(function (a, s) { return a + linesOf(s).length; }, 0));
      if (b.get("Word")) t.set("Words", txt.reduce(function (a, s) { return a + (s.trim() ? s.trim().split(/\s+/).length : 0); }, 0));
      if (b.get("Character")) t.set("Characters", txt.reduce(function (a, s) { return a + s.length; }, 0));
      t.set("Property", null); b.out(t); return;
    }
    var props = b.has("Property") ? arr(b.get("Property")) : [null], all = !!b.get("AllStats");
    props.forEach(function (p) {
      var vals = [];
      items.forEach(function (it) { var v = p === null ? it : self.propVal(it, p); if (v !== null && v !== undefined) vals.push(v); });
      var o = new PSObj("Microsoft.PowerShell.Commands.GenericMeasureInfo", {});
      var num = function () { return vals.map(function (v) { try { return toNumber(v); } catch (e) { throw new PSErr('Input object "' + toStr(v) + '" is not numeric.', "InvalidType", { cmd: "Measure-Object" }); } }); };
      var ns = (b.get("Sum") || b.get("Average") || b.get("StandardDeviation") || all) ? num() : null;
      var sum = ns ? ns.reduce(function (a, x) { return a + x; }, 0) : null;
      o.set("Count", vals.length);
      o.set("Average", (b.get("Average") || all) && vals.length ? sum / vals.length : null);
      o.set("Sum", b.get("Sum") || all ? sum : null);
      var mx = null, mn = null;
      if (b.get("Maximum") || b.get("Minimum") || all) vals.forEach(function (v) { if (mx === null || cmpVals(v, mx) > 0) mx = v; if (mn === null || cmpVals(v, mn) < 0) mn = v; });
      var asN = function (v) { if (v === null) return null; try { return toNumber(v); } catch (e) { return v; } };
      o.set("Maximum", b.get("Maximum") || all ? asN(mx) : null);
      o.set("Minimum", b.get("Minimum") || all ? asN(mn) : null);
      var sd = null;
      if ((b.get("StandardDeviation") || all) && vals.length > 1) { var av = sum / vals.length; sd = Math.sqrt(ns.reduce(function (a, x) { return a + (x - av) * (x - av); }, 0) / (vals.length - 1)); }
      o.set("StandardDeviation", sd);
      o.set("Property", p === null ? null : propLabel(p));
      b.out(o);
    });
  });
  def("Group-Object", { params: ["Property", "InputObject", "Culture"], sw: ["NoElement", "AsHashTable", "AsString", "CaseSensitive"], pos: ["Property"], aliases: ["group"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, props = b.has("Property") ? arr(b.get("Property")) : [null], groups = [], cs = !!b.get("CaseSensitive");
    inputOr(b, "InputObject").forEach(function (it) {
      var kv = props.map(function (p) { return p === null ? it : self.propVal(it, p); }), name = kv.map(toStr).join(", ");
      var g = groups.filter(function (x) { return cs ? x.name === name : lc(x.name) === lc(name); })[0];
      if (!g) { g = { name: name, key: kv, items: [] }; groups.push(g); }
      g.items.push(it);
    });
    if (b.get("AsHashTable")) { var h = new PSHash(); groups.forEach(function (g) { h.set(b.get("AsString") ? g.name : unwrap(g.key), g.items); }); b.out(h); return; }
    groups.forEach(function (g) {
      var o = new PSObj("Microsoft.PowerShell.Commands.GroupInfo" + (b.get("NoElement") ? "NoElement" : ""), { Count: g.items.length, Name: g.name });
      if (!b.get("NoElement")) { o.set("Group", g.items); o.set("Values", g.key); }
      b.out(o);
    });
  });
  function fmtText(lines) { return new PSObj("FormatText", {}, { fmtLines: lines, toStr: function () { return lines.join("\n"); } }); }
  def("Format-Table", { params: ["Property", "GroupBy", "View", "InputObject"], sw: ["AutoSize", "Wrap", "HideTableHeaders", "Force"], pos: ["Property"], aliases: ["ft"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var items = inputOr(b, "InputObject"); if (!items.length) return;
    var lines = this.tableObj(items, b.has("Property") ? arr(b.get("Property")) : null, { hide: !!b.get("HideTableHeaders") });
    b.out(fmtText(lines));
  });
  def("Format-List", { params: ["Property", "GroupBy", "View", "InputObject"], sw: ["Force"], pos: ["Property"], aliases: ["fl"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var items = inputOr(b, "InputObject"); if (!items.length) return;
    b.out(fmtText(this.listObj(items, b.has("Property") ? arr(b.get("Property")) : null)));
  });
  def("Format-Wide", { params: ["Property", "Column", "InputObject"], sw: ["AutoSize"], pos: ["Property"], aliases: ["fw"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, items = inputOr(b, "InputObject"), p = b.get("Property");
    var names = items.map(function (it) { return toCult(p ? self.propVal(it, p) : it instanceof PSObj && it.has("Name") ? it.get("Name") : it); });
    var cols = b.has("Column") ? toInt(b.get("Column")) : 2, w = Math.floor(120 / cols) - 1, lines = [""];
    for (var i = 0; i < names.length; i += cols) lines.push(names.slice(i, i + cols).map(function (n, j, a) { return j === a.length - 1 ? n : padR(n, w); }).join(" ").replace(/\s+$/, ""));
    lines.push(""); b.out(fmtText(lines));
  });
  def("Get-Member", { params: ["Name", "MemberType", "InputObject"], sw: ["Static", "Force"], pos: ["Name"], aliases: ["gm"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, items = inputOr(b, "InputObject"), seen = {}, lines = [];
    if (!items.length) throw new PSErr("You must specify an object for the Get-Member cmdlet.", "InvalidOperation", { cmd: "Get-Member" });
    items.forEach(function (it) {
      var tn = typeOf(it); if (seen[tn]) return; seen[tn] = 1;
      var rows = [];
      propNames(it).forEach(function (n) { var v = getMember(it, n, self); rows.push([n, it instanceof PSObj && it.typeName === "System.Management.Automation.PSCustomObject" ? "NoteProperty" : "Property", (typeOf(v) || "System.Object").replace(/^System\./, "") + " " + n + " {get;}"]); });
      (typeof it === "string" ? ["Contains", "EndsWith", "IndexOf", "Replace", "Split", "StartsWith", "Substring", "ToLower", "ToUpper", "Trim"] : ["Equals", "GetHashCode", "GetType", "ToString"]).forEach(function (m) { rows.push([m, "Method", m + "(...)"]); });
      rows.sort(function (x, y) { return x[1] === y[1] ? (lc(x[0]) < lc(y[0]) ? -1 : 1) : x[1] < y[1] ? -1 : 1; });
      if (b.has("Name")) { var re = wildRe(toStr(b.get("Name"))); rows = rows.filter(function (r) { return re.test(r[0]); }); }
      var w0 = Math.max(4, rows.reduce(function (a, r) { return Math.max(a, r[0].length); }, 0)), w1 = Math.max(10, rows.reduce(function (a, r) { return Math.max(a, r[1].length); }, 0));
      lines.push("", "   TypeName: " + tn, "", padR("Name", w0) + " " + padR("MemberType", w1) + " Definition", padR("----", w0) + " " + padR("----------", w1) + " ----------");
      rows.forEach(function (r) { lines.push(padR(r[0], w0) + " " + padR(r[1], w1) + " " + r[2]); });
      lines.push("");
    });
    b.out(fmtText(lines));
  });

  // ---------- data, hora e utilidades ----------
  S.clock = function () { return new Date(this.now.getTime() + (this.slept || 0)); };
  function uformat(d, f) {
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    return f.replace(/%(.)/g, function (a, c) {
      switch (c) {
        case "Y": return String(d.getFullYear()); case "y": return p2(d.getFullYear() % 100);
        case "m": return p2(d.getMonth() + 1); case "d": return p2(d.getDate()); case "e": return padL(String(d.getDate()), 2);
        case "H": return p2(d.getHours()); case "M": return p2(d.getMinutes()); case "S": return p2(d.getSeconds());
        case "I": return p2(d.getHours() % 12 || 12); case "p": return d.getHours() < 12 ? "AM" : "PM";
        case "A": return DIAS[d.getDay()]; case "a": return DIAS_C[d.getDay()]; case "B": return MESES[d.getMonth()]; case "b": case "h": return MESES_C[d.getMonth()];
        case "u": return String(d.getDay() || 7); case "w": return String(d.getDay());
        case "j": var s = new Date(d.getFullYear(), 0, 1); return padL(String(Math.floor((d - s) / 864e5) + 1), 3).replace(/ /g, "0");
        case "D": return p2(d.getMonth() + 1) + "/" + p2(d.getDate()) + "/" + p2(d.getFullYear() % 100);
        case "F": return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
        case "T": case "X": return p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
        case "R": return p2(d.getHours()) + ":" + p2(d.getMinutes());
        case "s": return String(Math.floor(d.getTime() / 1000));
        case "%": return "%"; case "n": return "\n"; case "t": return "\t";
      }
      return a;
    });
  }
  def("Get-Date", { params: ["Date", "Year", "Month", "Day", "Hour", "Minute", "Second", "Millisecond", "Format", "UFormat", "DisplayHint", "UnixTimeSeconds"], sw: ["AsUTC"], pos: ["Date"], types: { Year: "System.Int32", Month: "System.Int32", Day: "System.Int32", Hour: "System.Int32", Minute: "System.Int32", Second: "System.Int32", Millisecond: "System.Int32" }, module: "Microsoft.PowerShell.Utility" }, function (b) {
    var d;
    if (b.has("UnixTimeSeconds")) d = new Date(toNumber(b.get("UnixTimeSeconds")) * 1000);
    else if (b.has("Date")) { var dv = b.get("Date"); d = new Date((dv instanceof PSDate ? dv : convertTo("System.DateTime", dv)).d.getTime()); }
    else if (b.input && b.input.length) d = new Date(convertTo("System.DateTime", b.input[0]).d.getTime());
    else d = this.clock();
    if (b.has("Year")) d.setFullYear(toInt(b.get("Year")));
    if (b.has("Month")) d.setMonth(toInt(b.get("Month")) - 1);
    if (b.has("Day")) d.setDate(toInt(b.get("Day")));
    if (b.has("Hour")) d.setHours(toInt(b.get("Hour")));
    if (b.has("Minute")) d.setMinutes(toInt(b.get("Minute")));
    if (b.has("Second")) d.setSeconds(toInt(b.get("Second")));
    if (b.has("Millisecond")) d.setMilliseconds(toInt(b.get("Millisecond")));
    if (b.has("Format")) { b.out(dateFmt(d, toStr(b.get("Format")))); return; }
    if (b.has("UFormat")) { b.out(uformat(d, toStr(b.get("UFormat")))); return; }
    var o = new PSDate(d);
    if (b.has("DisplayHint")) o.hint = lc(toStr(b.get("DisplayHint")));
    b.out(o);
  });
  def("Start-Sleep", { params: ["Seconds", "Milliseconds", "Duration"], pos: ["Seconds"], alias: { s: "Seconds", ms: "Milliseconds" }, aliases: ["sleep"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var ms = b.has("Milliseconds") ? toNumber(b.get("Milliseconds")) : b.has("Seconds") ? toNumber(b.get("Seconds")) * 1000 : 0;
    this.slept = (this.slept || 0) + ms; // o simulador não espera de verdade: só adianta o relógio
  });
  def("Get-Random", { params: ["Minimum", "Maximum", "InputObject", "Count", "SetSeed"], sw: ["Shuffle"], pos: ["Maximum"], rest: null, module: "Microsoft.PowerShell.Utility" }, function (b) {
    var items = b.has("InputObject") ? arr(b.get("InputObject")) : b.input && b.input.length ? b.input : null;
    if (items) {
      var pool = items.slice(), n = b.get("Shuffle") ? pool.length : b.has("Count") ? Math.min(toInt(b.get("Count")), pool.length) : 1;
      for (var i = 0; i < n; i++) { var j = i + Math.floor(Math.random() * (pool.length - i)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; b.out(pool[i]); }
      return;
    }
    var mn = b.has("Minimum") ? toNumber(b.get("Minimum")) : 0, mx = b.has("Maximum") ? toNumber(b.get("Maximum")) : 2147483647;
    if (mn >= mx) throw new PSErr("Não é possível validar o argumento no parâmetro 'Maximum'. O argumento " + mx + " é menor ou igual ao valor do parâmetro Minimum (" + mn + "). Forneça um argumento maior que o valor do parâmetro Minimum e execute o comando novamente.", "InvalidArgument", { cmd: "Get-Random" });
    var isI = isInt(mn) && isInt(mx);
    var cnt = b.has("Count") ? toInt(b.get("Count")) : 1;
    for (var k = 0; k < cnt; k++) b.out(isI ? mn + Math.floor(Math.random() * (mx - mn)) : mn + Math.random() * (mx - mn));
  });
  def("Invoke-Expression", { params: ["Command"], pos: ["Command"], aliases: ["iex"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var code = toStr(b.has("Command") ? b.get("Command") : b.input && b.input[0]), ast;
    try { ast = parse(code.replace(/\r\n?/g, "\n")); }
    catch (e) { if (e && e.ps) { var e2 = new PSErr(e.message, "ParserError", { cmd: "Invoke-Expression" }); e2.keepCat = true; throw e2; } throw e; }
    this.iexDepth = (this.iexDepth || 0) + 1;
    try { this.execBlock(ast.body, b.out); } finally { this.iexDepth--; }
  });
  def("Set-StrictMode", { params: ["Version"], sw: ["Off"], alias: { v: "Version" }, module: "Microsoft.PowerShell.Core" }, function (b) { this.strict = !b.get("Off"); });
  def("Get-Host", { module: "Microsoft.PowerShell.Utility" }, function (b) { b.out(hostObj()); });
  function cultureObj(ui) {
    var o = new PSObj("System.Globalization.CultureInfo", { LCID: 1046, Name: "pt-BR", DisplayName: "Português (Brasil)" });
    o.toStr = function () { return "pt-BR"; }; o.ui = ui; return o;
  }
  def("Get-Culture", { params: ["Name"], sw: ["ListAvailable", "NoUserOverrides"], module: "Microsoft.PowerShell.Utility" }, function (b) { b.out(cultureObj(false)); });
  def("Get-UICulture", { module: "Microsoft.PowerShell.Utility" }, function (b) { b.out(cultureObj(true)); });

  // ---------- variáveis ----------
  function varObj(n, v) { var o = new PSObj("System.Management.Automation.PSVariable", { Name: n, Value: v }); o.toStr = function () { return "System.Management.Automation.PSVariable"; }; return o; }
  S.allVars = function () {
    var seen = {}, out = [];
    for (var sc = this.scope; sc; sc = sc.parent) for (var k in sc.vars) if (!seen[k]) { seen[k] = 1; out.push(sc.vars[k]); }
    ["HOME", "PID", "PSHOME", "PSVersionTable", "PWD", "true", "false", "null"].forEach(function (n) { if (!seen[lc(n)]) out.push({ n: n, auto: true }); });
    var self = this;
    return out.map(function (r) { return { n: r.n, v: r.auto ? self.getVar(r.n) : r.v }; }).sort(function (a, b) { return lc(a.n) < lc(b.n) ? -1 : 1; });
  };
  def("Get-Variable", { params: ["Name", "Scope", "Include", "Exclude"], sw: ["ValueOnly"], pos: ["Name"], aliases: ["gv"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, names = b.has("Name") ? arr(b.get("Name")).map(toStr) : ["*"], all = this.allVars();
    names.forEach(function (nm) {
      var re = wildRe(nm), hits = all.filter(function (r) { return re.test(r.n); });
      if (!hits.length && !hasWild(nm)) { b.err(new PSErr("Cannot find a variable with the name '" + nm + "'.", "ObjectNotFound", { cmd: "Get-Variable" })); return; }
      hits.forEach(function (r) { if (b.get("ValueOnly")) self.emitVal(r.v, b.out); else b.out(varObj(r.n, r.v)); });
    });
  });
  def("Set-Variable", { params: ["Name", "Value", "Scope", "Option", "Description"], sw: ["PassThru", "Force"], pos: ["Name", "Value"], aliases: ["set"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, v = b.has("Value") ? b.get("Value") : b.input ? unwrap(b.input) : null;
    arr(b.get("Name")).forEach(function (n) { self.setVar(toStr(n), v); if (b.get("PassThru")) b.out(varObj(toStr(n), v)); });
  });
  def("New-Variable", { params: ["Name", "Value", "Scope", "Option", "Description"], sw: ["PassThru", "Force"], pos: ["Name", "Value"], aliases: ["nv"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var n = toStr(b.get("Name"));
    if (hasOwn(this.scope.vars, lc(n)) && !b.get("Force")) throw new PSErr("Já existe uma variável com o nome '" + n + "'.", "ResourceExists", { cmd: "New-Variable" });
    this.setVar(n, b.has("Value") ? b.get("Value") : null, true);
    if (b.get("PassThru")) b.out(varObj(n, b.get("Value")));
  });
  def("Remove-Variable", { params: ["Name", "Scope"], sw: ["Force"], pos: ["Name"], aliases: ["rv"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this;
    arr(b.get("Name")).forEach(function (n) {
      var k = lc(toStr(n)), found = false;
      for (var sc = self.scope; sc; sc = sc.parent) if (hasOwn(sc.vars, k)) { delete sc.vars[k]; found = true; break; }
      if (!found) b.err(new PSErr("Cannot find a variable with the name '" + toStr(n) + "'.", "ObjectNotFound", { cmd: "Remove-Variable" }));
    });
  });
  def("Clear-Variable", { params: ["Name", "Scope"], sw: ["Force", "PassThru"], pos: ["Name"], aliases: ["clv"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this; arr(b.get("Name")).forEach(function (n) { var r = self.findVar(lc(toStr(n))); if (r) r.v = null; });
  });
  def("Get-History", { params: ["Id", "Count"], pos: ["Id", "Count"], aliases: ["h", "history", "ghy"], module: "Microsoft.PowerShell.Core" }, function (b) {
    var hist = this.history.slice();
    if (b.has("Count")) hist = hist.slice(Math.max(0, hist.length - toInt(b.get("Count"))));
    hist.forEach(function (h) { var o = new PSObj("Microsoft.PowerShell.Commands.HistoryInfo", { Id: h.id, Duration: "00:00:00.0010000", CommandLine: h.cmd }); o.toStr = function () { return h.cmd; }; b.out(o); });
  });
  def("New-Object", { params: ["TypeName", "ArgumentList", "Property", "ComObject"], pos: ["TypeName", "ArgumentList"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var tn = lc(toStr(b.get("TypeName"))).replace(/^system\.management\.automation\./, "");
    if (tn === "psobject" || tn === "pscustomobject" || tn === "object" || tn === "system.object") {
      var o = new PSObj(), pr = b.get("Property");
      if (pr instanceof PSHash) pr.keys.forEach(function (k) { o.set(toStr(k), pr.get(k)); });
      b.out(o); return;
    }
    if (tn === "system.collections.hashtable" || tn === "hashtable") { b.out(new PSHash()); return; }
    if (tn === "datetime" || tn === "system.datetime") { var a = arr(b.get("ArgumentList")).map(toInt); b.out(new PSDate(new Date(a[0] || 1, (a[1] || 1) - 1, a[2] || 1, a[3] || 0, a[4] || 0, a[5] || 0))); return; }
    if (tn === "version" || tn === "system.version") { b.out(convertTo("System.Version", unwrap(arr(b.get("ArgumentList"))))); return; }
    throw new PSErr("(simulador) New-Object " + toStr(b.get("TypeName")) + " não é simulado aqui; veja a saída real na aula.", "NotSupported", { cmd: "New-Object" });
  });
  def("Select-String", { params: ["Pattern", "Path", "InputObject", "Context", "Encoding", "Include", "Exclude"], sw: ["SimpleMatch", "CaseSensitive", "NotMatch", "AllMatches", "Quiet", "List", "Raw"], pos: ["Pattern", "Path"], aliases: ["sls"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, pats = arr(b.get("Pattern")).map(toStr), cs = !!b.get("CaseSensitive"), any = false;
    var test = function (line) { return pats.some(function (p) { return b.get("SimpleMatch") ? (cs ? line.indexOf(p) !== -1 : lc(line).indexOf(lc(p)) !== -1) : mkRegex(p, cs).test(line); }) !== !!b.get("NotMatch"); };
    var emit = function (line, path, n) {
      any = true; if (b.get("Quiet")) return;
      if (b.get("Raw")) { b.out(line); return; }
      var o = new PSObj("Microsoft.PowerShell.Commands.MatchInfo", { LineNumber: n, Line: line, Filename: path ? path.replace(/^.*\\/, "") : "InputStream", Path: path || "InputStream", Pattern: pats[0] });
      var rel = path ? (path.indexOf(self.cwdFull() + "\\") === 0 ? path.slice(self.cwdFull().length + 1) : path) : null;
      o.toStr = function () { return rel ? rel + ":" + n + ":" + line : line; };
      b.out(o);
    };
    if (b.has("Path")) {
      arr(b.get("Path")).forEach(function (p) {
        var hits; try { hits = self.expand(self.pathArg(p), "Select-String"); } catch (e) { b.err(e); return; }
        hits.forEach(function (h) { if (h.node.dir) return; linesOf(h.node.content).forEach(function (l, i) { if (test(l)) emit(l, h.full, i + 1); }); });
      });
    } else {
      inputOr(b, "InputObject").forEach(function (it, i) {
        if (it instanceof PSObj && it.fsNode && !it.fsNode.dir) { linesOf(it.fsNode.content).forEach(function (l, j) { if (test(l)) emit(l, it.fsFull, j + 1); }); return; }
        var s = toStr(it); if (test(s)) emit(s, null, i + 1);
      });
    }
    if (b.get("Quiet")) b.out(any);
  });
  def("Measure-Command", { params: ["Expression", "InputObject"], pos: ["Expression"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var t0 = Date.now(); this.callSBList(b.get("Expression"), [], undefined, false);
    var ms = Date.now() - t0;
    b.out(new PSObj("System.TimeSpan", { Days: 0, Hours: 0, Minutes: 0, Seconds: Math.floor(ms / 1000), Milliseconds: ms % 1000, Ticks: ms * 10000, TotalDays: ms / 864e5, TotalHours: ms / 36e5, TotalMinutes: ms / 6e4, TotalSeconds: ms / 1000, TotalMilliseconds: ms }));
  });
  def("Get-Unique", { params: ["InputObject"], sw: ["AsString", "OnType", "CaseInsensitive"], aliases: ["gu"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var last; var first = true; inputOr(b, "InputObject").forEach(function (x) { if (first || !eqVals(x, last, true)) b.out(x); last = x; first = false; });
  });
  def("Tee-Object", { params: ["FilePath", "Variable", "InputObject"], sw: ["Append"], pos: ["FilePath"], aliases: ["tee"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var items = inputOr(b, "InputObject");
    if (b.has("Variable")) this.setVar(toStr(b.get("Variable")), unwrap(items.slice()));
    if (b.has("FilePath")) this.writeFile(toStr(b.get("FilePath")), this.formatToLines(items).map(function (l) { return l + "\r\n"; }).join(""), !!b.get("Append"), "Tee-Object");
    items.forEach(b.out);
  });
  def("ConvertTo-Json", { params: ["InputObject", "Depth"], sw: ["Compress", "AsArray", "EnumsAsStrings"], pos: ["InputObject"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var items = inputOr(b, "InputObject"), comp = !!b.get("Compress");
    function j(v, ind) {
      var pad = comp ? "" : rep("  ", ind + 1), end = comp ? "" : rep("  ", ind), nl = comp ? "" : "\n", sep = comp ? ":" : ": ";
      if (v === null || v === undefined) return "null";
      if (typeof v === "number") return String(v);
      if (typeof v === "boolean") return v ? "true" : "false";
      if (isArr(v)) return v.length ? "[" + nl + v.map(function (x) { return pad + j(x, ind + 1); }).join("," + nl) + nl + end + "]" : "[]";
      if (v instanceof PSHash || (v instanceof PSObj && !v.fsNode && !v.toStr)) {
        var ks = v instanceof PSHash ? v.keys : v.keys;
        return ks.length ? "{" + nl + ks.map(function (k) { return pad + JSON.stringify(toStr(k)) + sep + j(v.get(k), ind + 1); }).join("," + nl) + nl + end + "}" : "{}";
      }
      return JSON.stringify(toStr(v));
    }
    var v = items.length === 1 && !b.get("AsArray") ? items[0] : items;
    b.out(j(v, 0));
  });

  // ---------- Get-Member (definições com nomes curtos de tipo, como o PowerShell) ----------
  var CURTO = { "System.String": "string", "System.Int32": "int", "System.Int64": "long", "System.Double": "double", "System.Boolean": "bool", "System.DateTime": "datetime", "System.Object": "System.Object",
    "System.Char": "char", "System.Object[]": "System.Object[]", "System.Decimal": "decimal", "System.TimeSpan": "timespan" };
  function curto(t) { return CURTO[t] || t; }
  var MEMBROS = {
    "System.DateTime": { props: [["Date", "datetime"], ["Day", "int"], ["DayOfWeek", "System.DayOfWeek"], ["DayOfYear", "int"], ["Hour", "int"], ["Kind", "System.DateTimeKind"], ["Microsecond", "int"], ["Millisecond", "int"], ["Minute", "int"], ["Month", "int"], ["Nanosecond", "int"], ["Second", "int"], ["Ticks", "long"], ["TimeOfDay", "timespan"], ["Year", "int"]],
      extra: [["DisplayHint", "NoteProperty", "DisplayHintType DisplayHint=DateTime"], ["DateTime", "ScriptProperty", "System.Object DateTime {get=if ((& { Set-StrictMode -Version 1; $this.DisplayHint }) -ieq  \"Date\")…"]],
      metodos: ["Add", "AddDays", "AddHours", "AddMinutes", "AddMonths", "AddSeconds", "AddYears", "CompareTo", "Equals", "GetHashCode", "GetType", "Subtract", "ToLongDateString", "ToLongTimeString", "ToShortDateString", "ToShortTimeString", "ToString", "ToUniversalTime"] },
    "System.String": { props: [["Length", "int"]], metodos: ["Clone", "CompareTo", "Contains", "EndsWith", "Equals", "GetHashCode", "GetType", "IndexOf", "Insert", "LastIndexOf", "PadLeft", "PadRight", "Remove", "Replace", "Split", "StartsWith", "Substring", "ToCharArray", "ToLower", "ToString", "ToUpper", "Trim", "TrimEnd", "TrimStart"] },
    "System.Int32": { props: [], metodos: ["CompareTo", "Equals", "GetHashCode", "GetType", "GetTypeCode", "ToString"] }
  };
  def("Get-Member", { params: ["Name", "MemberType", "InputObject", "View"], sw: ["Static", "Force"], pos: ["Name"], alias: { type: "MemberType" }, aliases: ["gm"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, items = inputOr(b, "InputObject"), seen = {};
    if (!items.length) throw new PSErr("You must specify an object for the Get-Member cmdlet.", "InvalidOperation", { cmd: "Get-Member" });
    var tipos = b.has("MemberType") ? arr(b.get("MemberType")).map(function (t) { return lc(toStr(t)); }) : null;
    var nomes = b.has("Name") ? arr(b.get("Name")).map(function (n) { return wildRe(toStr(n)); }) : null;
    items.forEach(function (it) {
      var tn = typeOf(it); if (seen[tn]) return; seen[tn] = 1;
      var rows = [], cat = MEMBROS[tn];
      if (cat) {
        cat.metodos.forEach(function (m) { rows.push([m, "Method", m + "(...)"]); });
        (cat.extra || []).forEach(function (x) { rows.push(x); });
        cat.props.forEach(function (p) { rows.push([p[0], "Property", p[1] + " " + p[0] + " {get;}"]); });
      } else {
        ["Equals", "GetHashCode", "GetType", "ToString"].forEach(function (m) { rows.push([m, "Method", m + "(...)"]); });
        var custom = it instanceof PSObj && it.typeName === "System.Management.Automation.PSCustomObject";
        propNames(it).forEach(function (n) { var v = getMember(it, n, self), t = curto(typeOf(v) || "System.Object"); rows.push([n, custom ? "NoteProperty" : "Property", custom ? t + " " + n + "=" + cellStr(v) : t + " " + n + " {get;}"]); });
      }
      var ordemTipo = { AliasProperty: 0, CodeProperty: 1, Property: 2, NoteProperty: 3, ScriptProperty: 4, Method: -1 };
      rows.sort(function (x, y) { var a = ordemTipo[x[1]], c = ordemTipo[y[1]]; if (a !== c) return a - c; return lc(x[0]) < lc(y[0]) ? -1 : 1; });
      rows.forEach(function (r) {
        if (tipos && tipos.indexOf(lc(r[1])) === -1 && !(tipos.indexOf("properties") !== -1 && /Property$/.test(r[1]))) return;
        if (nomes && !nomes.some(function (re) { return re.test(r[0]); })) return;
        var o = new PSObj("Microsoft.PowerShell.Commands.MemberDefinition", { TypeName: tn, Name: r[0], MemberType: r[1], Definition: r[2] });
        o.toStr = function () { return r[2]; }; o.membro = true;
        b.out(o);
      });
    });
  });

  // ---------- Format-Hex (arquivos e textos) ----------
  function utf8Bytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.codePointAt(i); if (c > 0xffff) i++;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return out;
  }
  function hexLines(label, bytes) {
    var h2 = function (n) { return (n < 16 ? "0" : "") + n.toString(16).toUpperCase(); };
    var out = ["", "   Label: " + label, "", "          Offset Bytes                                           Ascii",
      "                 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F", "          ------ ----------------------------------------------- -----"];
    for (var i = 0; i < bytes.length; i += 16) {
      var ch = bytes.slice(i, i + 16), off = i.toString(16).toUpperCase();
      out.push(rep("0", 16 - off.length) + off + " " + padR(ch.map(h2).join(" "), 47) + " " + ch.map(function (x) { return x < 0x20 || x === 0x7f || (x >= 0x80 && x < 0xa0) ? "\ufffd" : String.fromCharCode(x); }).join(""));
    }
    out.push("");
    return out;
  }
  def("Format-Hex", { params: ["Path", "LiteralPath", "InputObject", "Encoding", "Count", "Offset"], sw: ["Raw"], pos: ["Path"], aliases: ["fhx"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this;
    if (b.has("Path") || b.has("LiteralPath")) {
      arr(b.get("Path") || b.get("LiteralPath")).forEach(function (p) {
        var hits; try { hits = self.expand(self.pathArg(p), "Format-Hex"); } catch (e) { b.err(e); return; }
        hits.forEach(function (h) { if (h.node.dir) return; b.out(fmtText(hexLines(h.full, utf8Bytes(h.node.content)))); });
      });
      return;
    }
    inputOr(b, "InputObject").forEach(function (it) {
      if (it instanceof PSObj && it.fsNode && !it.fsNode.dir) { b.out(fmtText(hexLines(it.fsFull, utf8Bytes(it.fsNode.content)))); return; }
      var t = typeOf(it);
      b.out(fmtText(hexLines(t.replace(/^System\./, "") + " (" + t + ") <00000000>", utf8Bytes(toStr(it)))));
    });
  });

  /* ------------------------------------------------------------------
     10. Formatação da saída (Out-Default)
     ------------------------------------------------------------------ */
  function cellStr(v) { // valor dentro de uma tabela/lista
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return fmtNum(v, ",");
    if (v instanceof PSDate) return dateFmt(v.d, "dd/MM/yyyy HH:mm:ss");
    if (isArr(v)) { var p = v.slice(0, 4).map(cellStr); return "{" + p.join(", ") + (v.length > 4 ? "…" : "") + "}"; }
    if (v instanceof ScriptBlock) return v.src;
    return toStr(v);
  }
  function isNumLike(v) { return typeof v === "number" || v instanceof PSEnum; }
  S.tableLines = function (heads, rows, right, opts) {
    opts = opts || {};
    var n = heads.length, w = heads.map(function (h, i) { return rows.reduce(function (a, r) { return Math.max(a, r[i].length); }, h.length); });
    var fmt = function (cells) {
      var l = cells.map(function (c, i) { if (i === n - 1 && !right[i]) return c; return right[i] ? padL(c, w[i]) : padR(c, w[i]); }).join(" ");
      return l.length > 118 ? l.slice(0, 117) + "…" : l;
    };
    var out = [""];
    if (!opts.hide) { out.push(fmt(heads)); out.push(fmt(heads.map(function (h) { return rep("-", h.length); }))); }
    rows.forEach(function (r) { out.push(fmt(r)); });
    return out;
  };
  S.defaultProps = function (o) {
    if (o instanceof PSObj) {
      var t = o.typeName;
      if (/^System\.IO\.(File|Directory)Info$/.test(t)) return ["Mode", "LastWriteTime", "Length", "Name"];
      if (t === "System.Management.Automation.PathInfo") return ["Path"];
      if (t === "System.Collections.DictionaryEntry" || t === "System.Management.Automation.PSVariable") return ["Name", "Value"];
      if (/GroupInfo$/.test(t)) return t.slice(-9) === "NoElement" ? ["Count", "Name"] : ["Count", "Name", "Group"];
      if (t === "System.Globalization.CultureInfo") return ["LCID", "Name", "DisplayName"];
      if (t === "Microsoft.PowerShell.Commands.HistoryInfo") return ["Id", "CommandLine"];
      if (t === "Microsoft.PowerShell.Commands.MatchInfo") return null;
      return o.keys.slice();
    }
    if (o instanceof PSDate) return ["DisplayHint", "DateTime", "Date", "Day", "DayOfWeek", "DayOfYear", "Hour", "Kind", "Millisecond", "Minute", "Month", "Second", "Ticks", "TimeOfDay", "Year"];
    return propNames(o);
  };
  S.tableObj = function (items, props, opts) {
    var self = this;
    if (!props) props = this.defaultProps(items[0]) || ["Value"];
    var flat = [];
    props.forEach(function (p) {
      if (!(p instanceof PSHash) && !(p instanceof ScriptBlock) && hasWild(toStr(p))) { var re = wildRe(toStr(p)); (self.defaultProps(items[0]) || []).concat(propNames(items[0])).forEach(function (n) { if (re.test(n) && flat.indexOf(n) === -1) flat.push(n); }); }
      else flat.push(p);
    });
    var heads = flat.map(function (p) { return p instanceof PSHash || p instanceof ScriptBlock ? propLabel(p) : items[0] instanceof PSObj ? items[0].realName(toStr(p)) : toStr(p); });
    var raw = items.map(function (it) { return flat.map(function (p) { return self.propVal(it, p); }); });
    var right = raw[0].map(function (x, i) { return isNumLike(x) || !!(items[0] && items[0].numCols && items[0].numCols.indexOf(heads[i]) !== -1); });
    var rows = raw.map(function (r) { return r.map(cellStr); });
    var out = this.tableLines(heads, rows, right, opts); out.push("");
    return out;
  };
  S.listObj = function (items, props) {
    var self = this, out = [""];
    items.forEach(function (it) {
      var ps = props, names;
      if (!ps) ps = it instanceof PSObj && /^System\.IO\.(File|Directory)Info$/.test(it.typeName) ? ["Name", "Length", "CreationTime", "LastWriteTime", "LastAccessTime", "Mode", "LinkType", "Target", "VersionInfo"].filter(function (n) { return n !== "Length" || it.has("Length"); }) : self.defaultProps(it) || propNames(it);
      var pairs = [];
      ps.forEach(function (p) {
        if (!(p instanceof PSHash) && !(p instanceof ScriptBlock) && hasWild(toStr(p))) { var re = wildRe(toStr(p)); propNames(it).forEach(function (n) { if (re.test(n)) pairs.push([n, getMember(it, n, self)]); }); }
        else pairs.push([p instanceof PSHash || p instanceof ScriptBlock ? propLabel(p) : it instanceof PSObj ? it.realName(toStr(p)) : toStr(p), self.propVal(it, p)]);
      });
      names = pairs.map(function (x) { return x[0]; });
      var w = names.reduce(function (a, n) { return Math.max(a, n.length); }, 0);
      pairs.forEach(function (x) { out.push(padR(x[0], w) + " : " + cellStr(x[1])); });
      out.push("");
    });
    return out;
  };
  // tipo de vista de um valor solto
  function viewOf(v) {
    if (v instanceof PSObj) {
      var t = v.typeName;
      if (t === "FormatText") return "text";
      if (t === "System.Management.Automation.ErrorRecord") return "errrec";
      if (/^System\.IO\.(File|Directory)Info$/.test(t)) return "fs";
      if (v.cmdInfo) return "cmd";
      if (v.membro) return "membro";
      if (v.fmtDrive) return "drive";
      if (t === "System.Collections.DictionaryEntry" || t === "System.Management.Automation.PSVariable") return "hash";
      if (t === "Microsoft.PowerShell.Commands.MatchInfo") return "plain";
      if (v.fmtList) return "list";
      if (t === "System.Management.Automation.PathInfo") return "table:" + t;
      var ks = v.keys.length;
      if (/GenericMeasureInfo|System.TimeSpan|Internal.Host.InternalHost/.test(t) || ks >= 5) return "list";
      return "table:" + (/^Selected\./.test(t) ? "Selected" : t) + "|" + v.keys.join(",");
    }
    if (v instanceof PSHash) return "hash";
    if (v instanceof PSDate) return "date";
    if (v instanceof PSVersion) return "version";
    if (v instanceof PSSemVer) return "semver";
    if (v instanceof PSType || v instanceof PSTypeInfo) return "typeinfo";
    return "plain";
  }
  S.closeView = function () {
    if (!this.view) return;
    this.flushView();
    var v = this.view; this.view = null;
    if (v.k !== "list" && v.k !== "plain" && v.k !== "text" && v.k !== "errrec") this.write("", "out");
  };
  S.flushView = function () {
    var v = this.view; if (!v || !v.pend || !v.pend.length) return;
    var items = v.pend; v.pend = [];
    if (v.k === "membro" && !v.started) this.write("", "out"), this.write("   TypeName: " + v.tn, "out");
    var lines = this.tableObj(items, v.k === "membro" ? ["Name", "MemberType", "Definition"] : null);
    lines.pop(); // a linha em branco final só sai no closeView
    if (v.started) lines = lines.slice(3); else v.started = true;
    var self = this; lines.forEach(function (l) { self.write(l, "out"); });
  };
  S.outDefault = function (v) {
    var self = this;
    if (v === undefined || v === null) return;
    if (isArr(v)) { v.forEach(function (x) { self.outDefault(x); }); return; }
    var k = viewOf(v);
    if (this.view && this.view.k !== k) this.closeView();
    if (this.open && k !== "plain") { this.open = false; }
    switch (k) {
      case "plain":
        if (this.view) this.closeView();
        var txt = v instanceof PSObj && v.toStr ? v.toStr() : typeof v === "number" ? fmtNum(v, ",") : v instanceof PSChar ? v.c : toStr(v);
        if (typeof v === "boolean") txt = v ? "True" : "False";
        this.write(txt, "out");
        return;
      case "text": v.fmtLines.forEach(function (l) { self.write(l, "out"); }); return;
      case "errrec": this.write(this.errText(v.err), "err"); return;
      case "date":
        if (!this.view) { this.view = { k: k }; this.write("", "out"); }
        var d = v.d, h = v.hint || "datetime";
        this.write(h === "date" ? dateFmt(d, "D") : h === "time" ? dateFmt(d, "T") : dateFmt(d, "F"), "out");
        return;
      case "fs": {
        var par = v.parentFull;
        if (!this.view || this.view.dir !== par) {
          if (this.view) { this.flushView(); this.write("", "out"); }
          else this.write("", "out");
          this.view = { k: k, dir: par };
          this.write("    Diretório: " + par, "out"); this.write("", "out");
          this.write(padR("Mode", 21) + "LastWriteTime" + padL("Length", 15) + " Name", "out");
          this.write(padR("----", 21) + "-------------" + padL("------", 15) + " ----", "out");
        }
        var dt = v.get("LastWriteTime").d, len = v.has("Length") ? String(v.get("Length")) : "";
        this.write(padR(v.get("Mode"), 15) + dateFmt(dt, "dd/MM/yyyy") + " " + padL(dateFmt(dt, "HH:mm"), 8) + padL(len, 15) + " " + v.get("Name"), "out");
        return;
      }
      case "cmd":
        if (!this.view) {
          this.view = { k: k }; this.write("", "out");
          this.write(padR("CommandType", 15) + " " + padR("Name", 50) + " " + padR("Version", 10) + " Source", "out");
          this.write(padR("-----------", 15) + " " + padR("----", 50) + " " + padR("-------", 10) + " ------", "out");
        }
        this.write(padR(toStr(v.get("CommandType")), 15) + " " + padR(v.cmdInfo.display, 50) + " " + padR(v.cmdInfo.ver.length > 10 ? v.cmdInfo.ver.slice(0, 9) + "…" : v.cmdInfo.ver, 10) + " " + toStr(v.get("Source")), "out");
        return;
      case "drive":
        if (!this.view) {
          this.view = { k: k }; this.write("", "out");
          this.write(padR("Name", 14) + " " + padL("Used (GB)", 9) + " " + padL("Free (GB)", 13) + " " + padR("Provider", 13) + " " + padR("Root", 51) + " CurrentLocation", "out");
          this.write(padR("----", 14) + " " + padL("---------", 9) + " " + padL("---------", 13) + " " + padR("--------", 13) + " " + padR("----", 51) + " ---------------", "out");
        }
        this.write((padR(v.get("Name"), 14) + " " + padL("", 9) + " " + padL("", 13) + " " + padR(toStr(v.get("Provider")).replace(/^.*\\/, ""), 13) + " " + padR(v.get("Root"), 51) + " " + v.get("CurrentLocation")).replace(/\s+$/, ""), "out");
        return;
      case "hash": {
        if (!this.view) { this.view = { k: k }; this.write("", "out"); this.write(padR("Name", 30) + " Value", "out"); this.write(padR("----", 30) + " -----", "out"); }
        var pairs = v instanceof PSHash ? v.keys.map(function (x) { return [toStr(x), v.get(x)]; }) : [[toStr(v.get("Name")), v.get("Value")]];
        pairs.forEach(function (p) { self.write(padR(p[0], 30) + " " + cellStr(p[1]), "out"); });
        return;
      }
      case "version": case "semver": {
        var heads = k === "version" ? ["Major", "Minor", "Build", "Revision"] : ["Major", "Minor", "Patch", "PreReleaseLabel", "BuildLabel"];
        if (!this.view) {
          this.view = { k: k }; this.write("", "out");
          this.write(k === "version" ? "Major  Minor  Build  Revision" : "Major  Minor  Patch  PreReleaseLabel BuildLabel", "out");
          this.write(k === "version" ? "-----  -----  -----  --------" : "-----  -----  -----  --------------- ----------", "out");
        }
        var vals = k === "version" ? v.p.map(function (x) { return x === undefined || x === null ? -1 : x; }) : [v.major, v.minor, v.patch];
        this.write(k === "version" ? vals.map(function (x, i) { return i < 3 ? padR(String(x), 6) : String(x); }).join(" ") : vals.map(function (x) { return padR(String(x), 6); }).join(" ").replace(/\s+$/, ""), "out");
        return;
      }
      case "typeinfo": {
        var full = v instanceof PSTypeInfo ? v.full : typeFull(v.name) || v.name, ti = new PSTypeInfo(full), bt = getMember(ti, "BaseType", this);
        if (!this.view) {
          this.view = { k: k }; this.write("", "out");
          this.write("IsPublic IsSerial " + padR("Name", 40) + " BaseType", "out");
          this.write("-------- -------- " + padR("----", 40) + " --------", "out");
        }
        this.write(padR("True", 8) + " " + padR(/Object\[\]|String|Int|Double|Boolean|Hashtable|DateTime|Char/.test(full) ? "True" : "False", 8) + " " + padR(ti.name, 40) + " " + (full === "System.Object" ? "" : bt.full), "out");
        return;
      }
      case "list": {
        if (!this.view) this.view = { k: k };
        var ls = this.listObj([v], v.fmtList || null);
        if (this.view.started) ls = ls.slice(1);
        this.view.started = true;
        ls.forEach(function (l) { self.write(l, "out"); });
        return;
      }
      case "membro":
        if (!this.view || this.view.tn !== v.get("TypeName")) {
          if (this.view) this.closeView();
          this.view = { k: "membro", tn: v.get("TypeName"), pend: [] };
        }
        this.view.pend.push(v);
        return;
      default: // tabela genérica
        if (!this.view) this.view = { k: k, pend: [] };
        this.view.pend.push(v);
    }
  };
  S.formatToLines = function (items) {
    var saved = { lines: this.lines, open: this.open, view: this.view };
    this.lines = []; this.open = false; this.view = null;
    var self = this;
    try {
      items.forEach(function (x) {
        if (typeof x === "string") { self.closeView(); self.write(x, "out"); return; }
        self.outDefault(x);
      });
      this.flushView(); this.closeView();
      return this.lines.map(function (l) { return l.t; });
    } finally { this.lines = saved.lines; this.open = saved.open; this.view = saved.view; }
  };
  S.clear = function () { this.lines = []; this.open = false; this.view = null; this.cleared = true; };

  /* ------------------------------------------------------------------
     11. Descoberta: $PSVersionTable, $Host, Get-Command, Get-Alias, Get-Help...
     ------------------------------------------------------------------ */
  function psVersionTable() {
    var h = new PSHash(true);
    h.set("PSVersion", new PSSemVer("7.7.0")); h.set("PSEdition", "Core"); h.set("GitCommitId", "7.7.0");
    h.set("OS", "Microsoft Windows 10.0.19045"); h.set("Platform", "Win32NT");
    h.set("PSCompatibleVersions", [new PSVersion(1, 0), new PSVersion(2, 0), new PSVersion(3, 0), new PSVersion(4, 0), new PSVersion(5, 0, 0, 0), new PSVersion(5, 1, 0, 0), new PSVersion(6, 0, 0), new PSVersion(7, 0, 0)]);
    h.set("PSRemotingProtocolVersion", new PSVersion(2, 4)); h.set("SerializationVersion", new PSVersion(1, 1, 0, 1)); h.set("WSManStackVersion", new PSVersion(3, 0));
    h.toStrName = "System.Management.Automation.PSVersionHashTable";
    return h;
  }
  function hostObj() {
    var o = new PSObj("System.Management.Automation.Internal.Host.InternalHost", {
      Name: "ConsoleHost", Version: new PSVersion(7, 7, 0, -1), InstanceId: "00000000-0000-0000-0000-000000000000", UI: "System.Management.Automation.Internal.Host.InternalHostUserInterface",
      CurrentCulture: "pt-BR", CurrentUICulture: "pt-BR", PrivateData: "Microsoft.PowerShell.ConsoleHost+ConsoleColorProxy", DebuggerEnabled: true, IsRunspacePushed: false, Runspace: "System.Management.Automation.Runspaces.LocalRunspace"
    });
    o.toStr = function () { return "System.Management.Automation.Internal.Host.InternalHost"; };
    return o;
  }
  var VER_MOD = { "Microsoft.PowerShell.Core": "7.7.0", "Microsoft.PowerShell.LocalAccounts": "1.0.0.0", "CimCmdlets": "7.0.0.0", "International": "2.1.0.0", "PSReadLine": "2.4.5" };
  // comandos que só aparecem na descoberta (Get-Command), sem simulação
  var CATALOGO = {
    "Microsoft.PowerShell.Management": "Set-Item Clear-Item Invoke-Item Get-ItemProperty Set-ItemProperty New-ItemProperty Remove-ItemProperty Get-Service New-Service Remove-Service Restart-Service Resume-Service Set-Service Start-Service Stop-Service Suspend-Service Get-Process Stop-Process Start-Process Wait-Process Debug-Process Restart-Computer Stop-Computer Rename-Computer Get-ComputerInfo Get-HotFix Get-Clipboard Set-Clipboard Get-PSProvider Get-PSDrive New-PSDrive Remove-PSDrive Get-TimeZone Set-TimeZone Get-EventLog Get-WinEvent",
    "Microsoft.PowerShell.Utility": "Set-Date Invoke-WebRequest Invoke-RestMethod Format-Hex Get-Verb Get-Alias Set-Alias New-Alias Export-Csv Import-Csv ConvertTo-Csv ConvertFrom-Csv ConvertFrom-Json Compare-Object Get-Uptime New-Guid Get-FileHash",
    "Microsoft.PowerShell.Core": "Get-Command Get-Help Update-Help Save-Help Get-Module Import-Module Start-Job Get-Job Receive-Job Invoke-Command Enter-PSSession New-PSSession",
    "Microsoft.PowerShell.LocalAccounts": "Get-LocalUser New-LocalUser Set-LocalUser Remove-LocalUser Rename-LocalUser Disable-LocalUser Enable-LocalUser Get-LocalGroup New-LocalGroup Remove-LocalGroup Get-LocalGroupMember Add-LocalGroupMember Remove-LocalGroupMember",
    "Microsoft.PowerShell.Security": "Get-ExecutionPolicy Set-ExecutionPolicy Get-Acl Set-Acl Get-Credential",
    "CimCmdlets": "Get-CimInstance Invoke-CimMethod",
    "International": "Get-WinHomeLocation Set-WinHomeLocation",
    "PSReadLine": "Get-PSReadLineOption Set-PSReadLineOption Get-PSReadLineKeyHandler Set-PSReadLineKeyHandler",
    "Microsoft.PowerShell.Host": "Start-Transcript Stop-Transcript"
  };
  var CAT_MOD = {};
  for (var cm in CATALOGO) CATALOGO[cm].split(" ").forEach(function (n) { CAT_MOD[lc(n)] = { name: n, module: cm }; });
  function cmdInfo(type, name, display, ver, source, extra) {
    var o = new PSObj("System.Management.Automation." + (type === "Alias" ? "AliasInfo" : type === "Function" ? "FunctionInfo" : type === "Application" ? "ApplicationInfo" : "CmdletInfo"),
      { CommandType: new PSEnum("System.Management.Automation.CommandTypes", type, 0), Name: name, Version: ver, Source: source });
    if (extra) for (var k in extra) o.set(k, extra[k]);
    o.cmdInfo = { display: display, ver: ver };
    o.toStr = function () { return name; };
    return o;
  }
  var APPS = { pwsh: ["pwsh.exe", "0.0.0.0", HOME + "\\AppData\\Local\\Microsoft\\WindowsApps\\Microsoft.PowerShell_8wekyb3d8bbwe\\pwsh.exe"],
    powershell: ["powershell.exe", "10.0.19041.3996", "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"], ping: ["PING.EXE", "10.0.19041.1", "C:\\Windows\\system32\\PING.EXE"],
    winget: ["winget.exe", "1.29.380.0", HOME + "\\AppData\\Local\\Microsoft\\WindowsApps\\winget.exe"], wt: ["wt.exe", "0.0.0.0", HOME + "\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe"] };
  function appInfo(n) { return APPS[n] || [n + ".exe", "10.0.19041.1", "C:\\Windows\\system32\\" + n + ".exe"]; }
  function paramsDe(spec) { // (Get-Command X).Parameters: dicionário na ordem do PowerShell
    var h = new PSHash(true), base = spec.ordem || spec.params.concat(spec.sw);
    base.concat(spec.params.concat(spec.sw).filter(function (p) { return base.indexOf(p) === -1 && (!spec.dyn || spec.dyn.indexOf(p) === -1); }))
      .concat(COMMON).concat(spec.dyn || []).forEach(function (p) { if (!h.has(p)) h.set(p, new PSObj("System.Management.Automation.ParameterMetadata", { Name: p })); });
    return h;
  }
  function cmdletObj(name, module) {
    var p = name.split("-"), ver = VER_MOD[module] || "7.0.0.0";
    var o = cmdInfo("Cmdlet", name, name, ver, module, { Verb: p[0], Noun: p.slice(1).join("-"), ModuleName: module, Definition: name });
    var sp = CMDS[lc(name)]; if (sp) o.set("Parameters", paramsDe(sp));
    return o;
  }
  function aliasInfo(a) {
    return cmdInfo("Alias", a.name, a.name + " -> " + a.def, "", "", { Definition: a.def, ReferencedCommand: a.def, ResolvedCommandName: a.def, DisplayName: a.name + " -> " + a.def });
  }
  S.allCommands = function () { // [{name, obj()}] cmdlets + catálogo + funções
    var out = {}, self = this;
    for (var k in CMDS) out[k] = { name: CMDS[k].name, kind: CMDS[k].isFunc ? "Function" : "Cmdlet", module: CMDS[k].module || "" };
    for (var c in CAT_MOD) if (!out[c]) out[c] = { name: CAT_MOD[c].name, kind: "Cmdlet", module: CAT_MOD[c].module };
    for (var f in this.funcs) out[f] = { name: this.funcs[f].name, kind: "Function", module: "" };
    ["prompt", "cd..", "cd\\"].forEach(function (n) { out[lc(n)] = { name: n, kind: "Function", module: "" }; });
    return Object.keys(out).map(function (k) { return out[k]; });
  };
  function infoOf(c) { return c.kind === "Function" ? cmdInfo("Function", c.name, c.name, "", "", { Definition: "" }) : cmdletObj(c.name, c.module); }
  def("Get-Command", { params: ["Name", "Verb", "Noun", "Module", "CommandType", "TotalCount", "ParameterName"], sw: ["Syntax", "All", "ListImported"], pos: ["Name"], rest: "Name", alias: { type: "CommandType" }, aliases: ["gcm"], module: "Microsoft.PowerShell.Core" }, function (b) {
    var self = this, all = this.allCommands().sort(function (x, y) { return lc(x.name) < lc(y.name) ? -1 : 1; }), res = [];
    var tipo = b.has("CommandType") ? lc(toStr(b.get("CommandType"))) : null;
    var verbs = b.has("Verb") ? arr(b.get("Verb")).map(function (v) { return wildRe(toStr(v)); }) : null, nouns = b.has("Noun") ? arr(b.get("Noun")).map(function (v) { return wildRe(toStr(v)); }) : null;
    var mods = b.has("Module") ? arr(b.get("Module")).map(function (v) { return wildRe(toStr(v)); }) : null;
    var filt = function (c) {
      var p = c.name.split("-");
      if (verbs && (p.length < 2 || !verbs.some(function (r) { return r.test(p[0]); }))) return false;
      if (nouns && (p.length < 2 || !nouns.some(function (r) { return r.test(p.slice(1).join("-")); }))) return false;
      if (mods && !mods.some(function (r) { return r.test(c.module); })) return false;
      if (tipo && lc(c.kind) !== tipo && !(tipo === "all")) return false;
      return true;
    };
    if (!b.has("Name")) {
      if (!tipo || tipo === "alias") if (!verbs && !nouns && !mods && tipo === "alias") { Object.keys(ALIASES).sort().forEach(function (k) { res.push(aliasInfo(ALIASES[k])); }); }
      all.filter(filt).forEach(function (c) { res.push(infoOf(c)); });
    } else {
      arr(b.get("Name")).forEach(function (n) {
        n = toStr(n); var k = lc(n), hits = [];
        if (hasWild(n)) {
          var re = wildRe(n);
          all.forEach(function (c) { if (re.test(c.name) && filt(c)) hits.push(infoOf(c)); });
          if (!tipo || tipo === "alias") Object.keys(self.userAliases).concat(Object.keys(ALIASES)).forEach(function (a) { var al = self.userAliases[a] || ALIASES[a]; if (re.test(al.name) && !hits.some(function (h) { return lc(h.get("Name")) === a; })) hits.push(aliasInfo(al)); });
          hits.sort(function (x, y) { return lc(x.get("Name")) < lc(y.get("Name")) ? -1 : 1; });
        } else {
          var al = self.userAliases[k] || ALIASES[k];
          if (self.funcs[k]) hits.push(cmdInfo("Function", self.funcs[k].name, self.funcs[k].name, "", "", { Definition: self.funcs[k].sb ? self.funcs[k].sb.src : "" }));
          else if (al) hits.push(aliasInfo(al));
          else if (CMDS[k] && CMDS[k].isFunc) hits.push(cmdInfo("Function", CMDS[k].name, CMDS[k].name, "", "", { Definition: "" }));
          else if (CMDS[k] || CAT_MOD[k]) hits.push(cmdletObj(CMDS[k] ? CMDS[k].name : CAT_MOD[k].name, CMDS[k] ? CMDS[k].module : CAT_MOD[k].module));
          else if (APPS[k.replace(/\.exe$/, "")] || /^(cmd|notepad|explorer|ipconfig|whoami|hostname)(\.exe)?$/.test(k)) { var ap = appInfo(k.replace(/\.exe$/, "")); hits.push(cmdInfo("Application", ap[0], ap[0], ap[1], ap[2], { Path: ap[2], Definition: ap[2] })); }
          if (!hits.length) { b.err(self.cmdNotFound(n, "Get-Command")); return; }
        }
        hits.forEach(function (h) { res.push(h); });
      });
    }
    if (b.has("TotalCount")) res = res.slice(0, toInt(b.get("TotalCount")));
    if (b.get("Syntax")) { res.forEach(function (r) { b.out(r.get("Name") + " [<CommonParameters>]"); }); return; }
    res.forEach(b.out);
  });
  def("Get-Alias", { params: ["Name", "Definition", "Exclude", "Scope"], pos: ["Name"], aliases: ["gal"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var self = this, all = {}, k;
    for (k in ALIASES) all[k] = ALIASES[k];
    for (k in this.userAliases) all[k] = this.userAliases[k];
    var keys = Object.keys(all).sort();
    if (b.has("Definition")) {
      arr(b.get("Definition")).forEach(function (d) { var re = wildRe(toStr(d)); keys.forEach(function (a) { if (re.test(all[a].def)) b.out(aliasInfo(all[a])); }); });
      return;
    }
    if (!b.has("Name")) { keys.forEach(function (a) { b.out(aliasInfo(all[a])); }); return; }
    arr(b.get("Name")).forEach(function (n) {
      n = toStr(n);
      if (hasWild(n)) { var re = wildRe(n); keys.forEach(function (a) { if (re.test(all[a].name)) b.out(aliasInfo(all[a])); }); return; }
      if (all[lc(n)]) b.out(aliasInfo(all[lc(n)]));
      else b.err(new PSErr("This command cannot find a matching alias because an alias with the name '" + n + "' does not exist.", "ObjectNotFound", { cmd: "Get-Alias" }));
    });
  });
  function setAlias(b, isNew) {
    var n = toStr(b.get("Name")), v = toStr(b.get("Value"));
    if (isNew && (this.userAliases[lc(n)] || ALIASES[lc(n)]) && !b.get("Force")) throw new PSErr("Não é possível criar o apelido " + n + " porque já existe um apelido com esse nome.", "ResourceExists");
    if (!this.userAliases[lc(n)] && ALIASES[lc(n)] && ["cd", "ls", "dir", "echo", "gci", "cat", "rm", "cp", "mv", "pwd", "cls"].indexOf(lc(n)) !== -1 && !b.get("Force") && false) return;
    this.userAliases[lc(n)] = { name: n, def: v };
    if (b.get("PassThru")) b.out(aliasInfo(this.userAliases[lc(n)]));
  }
  def("Set-Alias", { params: ["Name", "Value", "Description", "Option", "Scope"], sw: ["PassThru", "Force"], pos: ["Name", "Value"], aliases: ["sal"], module: "Microsoft.PowerShell.Utility" }, function (b) { setAlias.call(this, b, false); });
  def("New-Alias", { params: ["Name", "Value", "Description", "Option", "Scope"], sw: ["PassThru", "Force"], pos: ["Name", "Value"], aliases: ["nal"], module: "Microsoft.PowerShell.Utility" }, function (b) { setAlias.call(this, b, true); });
  var VERBOS = [
    ["Add", "a", "Common", "Adds a resource to a container, or attaches an item to another item"], ["Clear", "cl", "Common", "Removes all the resources from a container but does not delete the container"],
    ["Close", "cs", "Common", "Changes the state of a resource to make it inaccessible, unavailable, or unusable"], ["Copy", "cp", "Common", "Copies a resource to another name or to another container"],
    ["Enter", "et", "Common", "Specifies an action that allows the user to move into a resource"], ["Exit", "ex", "Common", "Sets the current environment or context to the most recently used context"],
    ["Find", "fd", "Common", "Looks for an object in a container that is unknown, implied, optional, or specified"], ["Format", "f", "Common", "Arranges objects in a specified form or layout"],
    ["Get", "g", "Common", "Specifies an action that retrieves a resource"], ["Hide", "h", "Common", "Makes a resource undetectable"],
    ["Join", "j", "Common", "Combines resources into one resource"], ["Lock", "lk", "Common", "Secures a resource"],
    ["Move", "m", "Common", "Moves a resource from one location to another"], ["New", "n", "Common", "Creates a resource"],
    ["Open", "op", "Common", "Changes the state of a resource to make it accessible, available, or usable"], ["Optimize", "om", "Common", "Increases the effectiveness of a resource"],
    ["Pop", "pop", "Common", "Removes an item from the top of a stack"], ["Push", "pu", "Common", "Adds an item to the top of a stack"],
    ["Redo", "re", "Common", "Resets a resource to the state that was undone"], ["Remove", "r", "Common", "Deletes a resource from a container"],
    ["Rename", "rn", "Common", "Changes the name of a resource"], ["Reset", "rs", "Common", "Sets a resource back to its original state"],
    ["Resize", "rz", "Common", "Changes the size of a resource"], ["Search", "sr", "Common", "Creates a reference to a resource in a container"],
    ["Select", "sc", "Common", "Locates a resource in a container"], ["Set", "s", "Common", "Replaces data on an existing resource or creates a resource that contains some data"],
    ["Show", "sh", "Common", "Makes a resource visible to the user"], ["Skip", "sk", "Common", "Bypasses one or more resources or points in a sequence"],
    ["Split", "sl", "Common", "Separates parts of a resource"], ["Step", "st", "Common", "Moves to the next point or resource in a sequence"],
    ["Switch", "sw", "Common", "Specifies an action that alternates between two resources, such as to change between two locations, responsibilities, or states"],
    ["Undo", "un", "Common", "Sets a resource to its previous state"], ["Unlock", "uk", "Common", "Releases a resource that was locked"], ["Watch", "wc", "Common", "Continually inspects or monitors a resource for changes"],
    ["Connect", "cc", "Communications", "Creates a link between a source and a destination"], ["Disconnect", "dc", "Communications", "Breaks the link between a source and a destination"],
    ["Read", "rd", "Communications", "Acquires information from a source"], ["Receive", "rc", "Communications", "Accepts information sent from a source"],
    ["Send", "sd", "Communications", "Delivers information to a destination"], ["Write", "wr", "Communications", "Sends information to a target"],
    ["Backup", "ba", "Data", "Stores data by replicating it"], ["Compare", "cr", "Data", "Evaluates the data from one resource against the data from another resource"],
    ["Convert", "cv", "Data", "Changes the data from one representation to another when the cmdlet supports bidirectional conversion or conversion of multiple data types"],
    ["ConvertFrom", "cf", "Data", "Converts one primary type of input (the cmdlet noun indicates the input) to one or more supported output types"],
    ["ConvertTo", "ct", "Data", "Converts from one or more types of input to a primary output type (the cmdlet noun indicates the output type)"],
    ["Export", "ep", "Data", "Encapsulates the primary input into a persistent data store, such as a file, or into an interchange format"],
    ["Import", "ip", "Data", "Creates a resource from data that is stored in a persistent data store (such as a file) or in an interchange format"],
    ["Out", "o", "Data", "Sends data out of the environment"], ["Update", "ud", "Data", "Brings a resource up-to-date to maintain its state, accuracy, conformance, or compliance"],
    ["Measure", "ms", "Diagnostic", "Identifies resources that are consumed by a specified operation, or retrieves statistics about a resource"],
    ["Test", "t", "Diagnostic", "Verifies the operation or consistency of a resource"], ["Trace", "tr", "Diagnostic", "Tracks the activities of a resource"],
    ["Disable", "d", "Lifecycle", "Configures a resource to an unavailable or inactive state"], ["Enable", "e", "Lifecycle", "Configures a resource to an available or active state"],
    ["Install", "is", "Lifecycle", "Places a resource in a location, and optionally initializes it"], ["Invoke", "i", "Lifecycle", "Performs an action, such as running a command or a method"],
    ["Restart", "rt", "Lifecycle", "Stops an operation and then starts it again"], ["Resume", "ru", "Lifecycle", "Starts an operation that has been suspended"],
    ["Start", "sa", "Lifecycle", "Initiates an operation"], ["Stop", "sp", "Lifecycle", "Discontinues an activity"], ["Suspend", "ss", "Lifecycle", "Pauses an activity"],
    ["Uninstall", "us", "Lifecycle", "Removes a resource from an indicated location"], ["Wait", "w", "Lifecycle", "Pauses an operation until a specified event occurs"],
    ["Use", "u", "Other", "Uses or includes a resource to do something"],
    ["Grant", "gr", "Security", "Allows access to a resource"], ["Protect", "pt", "Security", "Safeguards a resource from attack or loss"], ["Revoke", "rk", "Security", "Specifies an action that does not allow access to a resource"]
  ];
  def("Get-Verb", { params: ["Verb", "Group"], pos: ["Verb"], module: "Microsoft.PowerShell.Utility" }, function (b) {
    var vs = b.has("Verb") ? arr(b.get("Verb")).map(function (v) { return wildRe(toStr(v)); }) : null, gs = b.has("Group") ? arr(b.get("Group")).map(lc) : null;
    VERBOS.forEach(function (v) {
      if (vs && !vs.some(function (r) { return r.test(v[0]); })) return;
      if (gs && gs.indexOf(lc(v[2])) === -1) return;
      var o = new PSObj("System.Management.Automation.VerbInfo", { Verb: v[0], AliasPrefix: v[1], Group: v[2], Description: v[3] });
      o.toStr = function () { return v[0]; };
      b.out(o);
    });
  });
  var HELP_DATE = [
    "", "NOME", "    Get-Date", "    ", "SYNTAX",
    "    Get-Date [[-Date] <datetime>] [-Year <int>] [-Month <int>] [-Day <int>] [-Hour <int>] [-Minute <int>] [-Second ",
    "    <int>] [-Millisecond <int>] [-DisplayHint {Date | Time | DateTime}] [-Format <string>] [-AsUTC] [<CommonParameters>]", "    ",
    "    Get-Date [[-Date] <datetime>] -UFormat <string> [-Year <int>] [-Month <int>] [-Day <int>] [-Hour <int>] [-Minute ",
    "    <int>] [-Second <int>] [-Millisecond <int>] [-DisplayHint {Date | Time | DateTime}] [-AsUTC] [<CommonParameters>]", "    ",
    "    Get-Date -UnixTimeSeconds <long> [-Year <int>] [-Month <int>] [-Day <int>] [-Hour <int>] [-Minute <int>] [-Second ",
    "    <int>] [-Millisecond <int>] [-DisplayHint {Date | Time | DateTime}] [-Format <string>] [-AsUTC] [<CommonParameters>]", "    ",
    "    Get-Date -UnixTimeSeconds <long> -UFormat <string> [-Year <int>] [-Month <int>] [-Day <int>] [-Hour <int>] [-Minute ",
    "    <int>] [-Second <int>] [-Millisecond <int>] [-DisplayHint {Date | Time | DateTime}] [-AsUTC] [<CommonParameters>]", "    ", ""];
  function helpRemarks(name, link) {
    return ["REMARKS",
      "    Get-Help cannot find the Help files for this cmdlet on this computer. It is displaying only partial help.",
      "        -- To download and install Help files for the module that includes this cmdlet, use Update-Help.",
      "        -- To view the Help topic for this cmdlet online, type: \"Get-Help " + name + " -Online\" or",
      "           go to " + (link || "https://learn.microsoft.com/powershell") + ".", "", ""];
  }
  function wrapSyntax(s) { // quebra em 116 colunas, com 4 de recuo, como o console
    var out = [], words = s.split(" "), cur = "    ";
    words.forEach(function (w) { if (cur.length + w.length + 1 > 120 && cur.trim()) { out.push(cur + " "); cur = "    " + w; } else cur += (cur === "    " ? "" : " ") + w; });
    out.push(cur); return out;
  }
  S.helpFor = function (spec, b) {
    var name = spec.name, als = [];
    for (var a in ALIASES) if (ALIASES[a].def === name) als.push(ALIASES[a].name);
    als.sort(function (x, y) { return lc(x) < lc(y) ? -1 : 1; });
    if (lc(name) === "get-date") {
      if (b.has("Parameter") && lc(toStr(b.get("Parameter"))) === "format")
        return ["", "-Format <string>", "    ", "    Required?                    false", "    Position?                    Named", "    Accept pipeline input?       false",
          "    Parameter set name           DateAndFormat, UnixTimeSecondsAndFormat", "    Aliases                      Nenhum", "    Dynamic?                     false",
          "    Accept wildcard characters?  false", "    ", "", ""];
      var base = b.get("Examples") ? ["", "NOME", "    Get-Date", ""] : HELP_DATE.slice();
      return base.concat(["ALIASES", "    Nenhum", "    ", ""], helpRemarks("Get-Date", "https://go.microsoft.com/fwlink/?LinkID=2096615"));
    }
    if (b.has("Parameter")) {
      var pn = toStr(b.get("Parameter")), all = (spec.params || []).concat(spec.sw || []), hit = all.filter(function (p) { return lc(p) === lc(pn); })[0];
      if (!hit) throw new PSErr("Nenhum parâmetro corresponde ao critério " + pn + ".", "ObjectNotFound", { cmd: "Get-Help" });
      var isSw = (spec.sw || []).indexOf(hit) !== -1, pi = (spec.pos || []).indexOf(hit);
      return ["", "-" + hit + (isSw ? "" : " <Object>"), "    ", "    Required?                    false", "    Position?                    " + (pi === -1 ? "Named" : pi),
        "    Accept pipeline input?       false", "    Parameter set name           (All)", "    Aliases                      Nenhum", "    Dynamic?                     false",
        "    Accept wildcard characters?  false", "    ", "", ""];
    }
    var syn = name + " " + (spec.params || []).map(function (p) { var i = (spec.pos || []).indexOf(p); return i !== -1 ? "[[-" + p + "] <Object>]" : "[-" + p + " <Object>]"; }).concat((spec.sw || []).map(function (s) { return "[-" + s + "]"; })).concat(["[<CommonParameters>]"]).join(" ");
    var out = ["", "NOME", "    " + name, "    ", "SYNTAX"].concat(wrapSyntax(syn), ["    ", "", "ALIASES"]);
    out = out.concat(als.length ? als.map(function (a) { return "    " + a; }) : ["    Nenhum"], ["    ", ""]);
    return out.concat(helpRemarks(name));
  };
  def("Get-Help", { params: ["Name", "Parameter", "Category", "Component"], sw: ["Examples", "Detailed", "Full", "Online", "ShowWindow"], pos: ["Name"], aliases: [], module: "Microsoft.PowerShell.Core" }, function (b) {
    var self = this, n = b.has("Name") ? toStr(b.get("Name")) : "";
    if (b.get("Online") || b.get("ShowWindow")) { this.hostWrite("(simulador) a ajuda on-line abre o navegador e não é simulada aqui; veja a saída real na aula.", "info"); return; }
    if (!n) { b.out(fmtText(["", "TÓPICO", "    Sistema de Ajuda do Windows PowerShell", "", "DESCRIÇÃO BREVE", "    Exibe ajuda sobre cmdlets e conceitos do PowerShell.", "", "    (simulador) use Get-Help <nome-do-cmdlet>, por exemplo: Get-Help Get-Date", ""])); return; }
    if (hasWild(n)) {
      if (lc(n) === "*location*") {
        b.out(fmtText(["", "Name                              Category  Module                    Synopsis", "----                              --------  ------                    --------",
          "Get-Location                      Cmdlet    Microsoft.PowerShell.Man… …", "Pop-Location                      Cmdlet    Microsoft.PowerShell.Man… …",
          "Push-Location                     Cmdlet    Microsoft.PowerShell.Man… …", "Set-Location                      Cmdlet    Microsoft.PowerShell.Man… …",
          "Get-WinHomeLocation               Cmdlet    International             Get-WinHomeLocation…", "Set-WinHomeLocation               Cmdlet    International             Set-WinHomeLocation…", ""]));
        return;
      }
      var re = wildRe(n), hits = this.allCommands().filter(function (c) { return c.kind === "Cmdlet" && re.test(c.name); });
      if (!hits.length) { b.err(new PSErr("Get-Help could not find " + n + " in a help file in this session. To download updated help topics type: \"Update-Help\". To get help online, search for the help topic in the TechNet library at https:/go.microsoft.com/fwlink/?LinkID=107116.", "ResourceUnavailable", { cmd: "Get-Help" })); return; }
      var trunc = function (s, w) { return s.length > w ? s.slice(0, w - 1) + "…" : padR(s, w); };
      b.out(fmtText(["", "Name                              Category  Module                    Synopsis", "----                              --------  ------                    --------"]
        .concat(hits.map(function (c) { return padR(c.name, 33) + " " + padR("Cmdlet", 9) + " " + trunc(c.module, 25) + " …"; }), [""])));
      return;
    }
    var f = this.lookup(n);
    if (!f) { b.err(new PSErr("Get-Help could not find " + n + " in a help file in this session. To download updated help topics type: \"Update-Help\". To get help online, search for the help topic in the TechNet library at https:/go.microsoft.com/fwlink/?LinkID=107116.", "ResourceUnavailable", { cmd: "Get-Help" })); return; }
    var spec = f.kind === "cmdlet" ? f.spec : { name: f.name, params: [], sw: [], pos: [] };
    b.out(fmtText(this.helpFor(spec, b)));
  });
  var PROVS = [["Registry", "ShouldProcess", "{HKLM, HKCU}"], ["Alias", "ShouldProcess", "{Alias}"], ["Environment", "ShouldProcess", "{Env}"],
    ["FileSystem", "Filter, ShouldProcess, Credentials", "{C, Temp}"], ["Function", "ShouldProcess", "{Function}"], ["Variable", "ShouldProcess", "{Variable}"]];
  def("Get-PSProvider", { params: ["PSProvider"], pos: ["PSProvider"] }, function (b) {
    var ps = PROVS;
    if (b.has("PSProvider")) { var re = wildRe(toStr(b.get("PSProvider"))); ps = ps.filter(function (p) { return re.test(p[0]); }); }
    b.out(fmtText(["", padR("Name", 20) + " " + padR("Capabilities", 49) + " Drives", padR("----", 20) + " " + padR("------------", 49) + " ------"]
      .concat(ps.map(function (p) { return padR(p[0], 20) + " " + padR(p[1], 49) + " " + p[2]; }), [""])));
  });
  var DRIVES = [["Alias", "Microsoft.PowerShell.Core\\Alias", ""], ["C", "Microsoft.PowerShell.Core\\FileSystem", "C:\\"], ["Cert", "Microsoft.PowerShell.Security\\Certificate", "\\"],
    ["Env", "Microsoft.PowerShell.Core\\Environment", ""], ["Function", "Microsoft.PowerShell.Core\\Function", ""], ["HKCU", "Microsoft.PowerShell.Core\\Registry", "HKEY_CURRENT_USER"],
    ["HKLM", "Microsoft.PowerShell.Core\\Registry", "HKEY_LOCAL_MACHINE"], ["Temp", "Microsoft.PowerShell.Core\\FileSystem", HOME + "\\AppData\\Local\\Temp\\"],
    ["Variable", "Microsoft.PowerShell.Core\\Variable", ""], ["WSMan", "Microsoft.WSMan.Management\\WSMan", ""]];
  def("Get-PSDrive", { params: ["Name", "PSProvider", "Scope"], sw: ["UseTransaction"], pos: ["Name"], aliases: ["gdr"] }, function (b) {
    var self = this, ds = DRIVES;
    if (b.has("Name")) { var re = wildRe(toStr(b.get("Name"))); ds = ds.filter(function (d) { return re.test(d[0]); }); if (!ds.length) throw new PSErr("Cannot find drive. A drive with the name '" + toStr(b.get("Name")) + "' does not exist.", "ObjectNotFound", { cmd: "Get-PSDrive" }); }
    if (b.has("PSProvider")) { var rp = wildRe(toStr(b.get("PSProvider"))); ds = ds.filter(function (d) { return rp.test(d[1].replace(/^.*\\/, "")); }); }
    var objs = ds.map(function (d) {
      var o = new PSObj("System.Management.Automation.PSDriveInfo", { Name: d[0], Provider: d[1], Root: d[2], CurrentLocation: d[0] === "C" ? self.cwd.join("\\") : "", Description: "" });
      o.toStr = function () { return d[0]; }; o.fmtDrive = true; return o;
    });
    if (b.first === false || (b.input && b.input.length)) { objs.forEach(b.out); return; }
    objs.forEach(b.out);
  });
  def("mkdir", { params: ["Path", "Name", "Value"], sw: ["Force", "WhatIf"], pos: ["Path"], rest: "Path", isFunc: true, module: "" }, function (b) {
    b.p.itemtype = "Directory"; CMDS["new-item"].fn.call(this, b);
  });
  def("help", { params: ["Name", "Parameter"], sw: ["Examples", "Full", "Detailed", "Online"], pos: ["Name"], isFunc: true, module: "" }, function (b) { CMDS["get-help"].fn.call(this, b); });
  CMDS["clear-host"].isFunc = true;

  /* ------------------------------------------------------------------
     12. API: rodar um código e avaliar a missão (data-goal)
     ------------------------------------------------------------------ */
  function arquivosDe(s) { // mapa caminho -> conteúdo; relativo à pasta da missão, com "/" (pastas valem "")
    var out = {}, base = s.fs.node(s.base), baseFull = fullOf(s.base);
    (function walk(n, rel) {
      for (var k in n.kids) {
        var c = n.kids[k], r = rel ? rel + "/" + c.name : c.name;
        out[r] = c.dir ? "" : c.content;
        if (c.dir) walk(c, r);
      }
    })(base || s.fs.root, "");
    return out;
  }
  function textoDe(s) { return s.lines.map(function (l) { return l.t; }).join("\n").replace(/\n+$/, ""); }
  function novaSessao(opts) { opts = opts || {}; var s = new Session({ missao: opts.missao !== false, readHost: opts.readHost || function () { return ""; }, now: opts.now }); return s; }
  function executar(codigo, opts) {
    var s = novaSessao(opts);
    var res = s.runText(codigo || "");
    s.flushView(); s.closeView();
    var erros = s.lines.filter(function (l) { return l.k === "err"; }).map(function (l) { return l.t; });
    return {
      saida: textoDe(s), linhas: s.lines.slice(), exit: s.exitCode, exitCode: s.exitCode,
      fs: s.fs, arquivos: arquivosDe(s), erro: erros.length ? erros[0] : undefined, erros: erros,
      naoSimulado: s.lines.some(function (l) { return l.k === "info"; }), interno: res.interno, limite: !!res.limite, sessao: s
    };
  }

  // Avaliador de data-goal: mesmas regras do rode-local.js (psfAvaliar), mas aqui
  // "semerro" usa os erros de verdade do simulador, e "exit"/"arquivo" são conferidos.
  function normaliza(s) {
    return String(s == null ? "" : s).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")
      .split("\n").map(function (l) { return l.replace(/[ \t]+$/, ""); }).join("\n");
  }
  function curto(s) { s = String(s); return s.length > 60 ? s.slice(0, 57) + "…" : s; }
  function avaliar(goal, codigo, r) {
    var saida = normaliza(r.saida), cod = normaliza(codigo), res = [];
    String(goal || "").split(";;").forEach(function (meta) {
      if (!meta.trim()) return;
      var k = meta.indexOf(":"), tipo = (k === -1 ? meta : meta.slice(0, k)).trim(), val = k === -1 ? "" : meta.slice(k + 1);
      var m = { tipo: tipo, val: val, ok: false, desc: "" };
      function rx(flags, alvo, rotulo) {
        try { m.ok = new RegExp(val, flags).test(alvo); }
        catch (e) { m.ok = false; m.falha = "regra inválida nesta missão (" + e.message + "); avise quem mantém o guia"; }
        m.desc = rotulo;
      }
      if (tipo === "out") { var alvo = normaliza(val); m.ok = alvo !== "" && saida.indexOf(alvo) !== -1; m.desc = "a saída mostra \u201c" + curto(val) + "\u201d"; }
      else if (tipo === "outre") rx("m", saida, "a saída tem o padrão esperado (" + curto(val) + ")");
      else if (tipo === "src") rx("mi", cod, "o código usa " + curto(val.replace(/\\b/g, "").replace(/\\(.)/g, "$1")));
      else if (tipo === "semerro") {
        if (r.erros.length) { m.ok = false; m.desc = "rodar sem erros (apareceu: \u201c" + curto(r.erros[0].split("\n")[0]) + "\u201d)"; }
        else if (r.naoSimulado) { m.ok = null; m.desc = "este comando não é simulado: confira no seu terminal se rodou sem erros"; }
        else { m.ok = true; m.desc = "rodou sem erros"; }
      } else if (tipo === "erro") { m.ok = val !== "" && saida.indexOf(normaliza(val)) !== -1; m.desc = "aparece o erro \u201c" + curto(val) + "\u201d"; }
      else if (tipo === "exit") { m.ok = Number(r.exitCode) === Number(val); m.desc = "o código de saída é " + val + (m.ok ? "" : " (saiu " + r.exitCode + ")"); }
      else if (tipo === "arquivo") {
        var t = val.indexOf("~"), nome = t === -1 ? val : val.slice(0, t), cont = t === -1 ? "" : val.slice(t + 1);
        var chave = nome.replace(/\\/g, "/").replace(/^\.\//, ""), achado;
        for (var a in r.arquivos) if (lc(a) === lc(chave)) achado = r.arquivos[a];
        m.ok = achado !== undefined && (!cont || normaliza(achado).indexOf(normaliza(cont)) !== -1);
        m.desc = "existe \u201c" + nome + "\u201d" + (cont ? " com o texto \u201c" + curto(cont) + "\u201d" : "");
      } else { m.ok = null; m.desc = "confira você mesmo: " + meta; }
      res.push(m);
    });
    return res;
  }
  function testarCodigo(goal, codigo, opts) {
    var r = executar(codigo, opts), metas = avaliar(goal, codigo, r);
    return { ok: metas.length > 0 && metas.every(function (m) { return m.ok === true; }), metas: metas, saida: r.saida, resultado: r };
  }

  var core = {
    Session: Session, parse: parse, run: executar, avaliar: avaliar, testar: testarCodigo, normaliza: normaliza,
    CMDS: CMDS, ALIASES: ALIASES, NAO_SIMULA: NAO_SIMULA, LIMITE_PASSOS: LIMITE_PASSOS, LIMITE_MS: LIMITE_MS
  };
  var PSSim = {
    versao: "1.0", version: "1.0",
    /* run(codigo) -> {saida, exit, exitCode, fs, arquivos, erro?} — síncrono; disco novo a cada chamada */
    run: function (codigo, opts) { var r = executar(codigo, opts); return { saida: r.saida, exit: r.exit, exitCode: r.exitCode, fs: r.fs, arquivos: r.arquivos, erro: r.erro, linhas: r.linhas }; },
    avaliar: function (goal, codigo, r) { return avaliar(goal, codigo, r && r.erros ? r : executar(codigo)); },
    testar: function (goal, codigo) { var t = testarCodigo(goal, codigo); return { ok: t.ok, metas: t.metas, saida: t.saida }; },
    caixas: [],
    core: core
  };

  // Etapa "núcleo": ainda sem interface. Numa página com caixas .tryps o global não é
  // publicado, para o site.js continuar caindo no rode-local.js (a interface vem na próxima etapa).
  var temCaixas = G.document && G.document.querySelector && G.document.querySelector(".tryps");
  if (!temCaixas) G.PSSim = PSSim;
  if (typeof module !== "undefined" && module && module.exports) module.exports = PSSim;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
