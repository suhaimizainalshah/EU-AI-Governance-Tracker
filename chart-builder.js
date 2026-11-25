/* Chart builder, shared by the ASEAN and EU AI Governance Trackers.
 * For an event that several places responded to (such as Grok's image tool),
 * it charts how many days each place took to act, from the tracker's own data.
 * Every chart carries its source line and the event's caution, so a downloaded
 * chart cannot travel without its context. No network, no dependencies.
 *
 * ChartBuilder.mount(element, { data, names, tracker, region }) */
(function () {
  "use strict";
  var DAY = 864e5;
  var TYPES = { statement: "Public statement", advisory: "Advisory", engagement: "Engaged the platform", block_takedown: "Access blocked or content taken down",
    enforcement: "Enforcement action", legislation: "Legislation", restriction_lifted: "Restriction lifted" };
  // A fixed, print-friendly palette, so the chart on screen is exactly the chart you download.
  var C = { ink: "#16202a", muted: "#55626f", grid: "#d5dbe1", bind: "#0d5e57", non: "#9fb8b4", one: "#2f6f95", second: "#c98a1b", bg: "#ffffff" };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var ts = function (d) { return Date.parse(String(d).slice(0, 10) + "T00:00:00Z"); };
  var fmtDate = function (d) { return new Date(ts(d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); };
  var days = function (n) { return n === 0 ? "Same day" : n + (n === 1 ? " day" : " days"); };

  /* Which events can be charted: those with dated responses in at least two places. */
  function chartable(data) {
    return (data.events || []).map(function (ev) {
      var rows = placesFor(data, ev);
      return { ev: ev, rows: rows, n: rows.filter(function (r) { return r.first; }).length };
    }).filter(function (x) { return x.n >= 2; });
  }
  function placesFor(data, ev) {
    var incs = (data.incidents || []).filter(function (i) { return i.event_id === ev.id; }), byPlace = {};
    incs.forEach(function (i) { (byPlace[i.country] = byPlace[i.country] || []).push(i.id); });
    var t0 = ts(ev.onset);
    return Object.keys(byPlace).map(function (code) {
      var all = (data.responses || []).filter(function (r) { return byPlace[code].indexOf(r.incident_id) >= 0 && r.date; }).sort(function (a, b) { return ts(a.date) - ts(b.date); });
      var rs = all.filter(function (r) { return r.type !== "restriction_lifted"; });
      var first = rs[0] || null, fb = rs.filter(function (r) { return r.binding === "yes"; })[0] || null;
      var d = function (r) { return r ? Math.max(0, Math.round((ts(r.date) - t0) / DAY)) : null; };
      var approx = function (r) { return r ? r.date_precision && r.date_precision !== "day" : false; };
      return { code: code, first: first, firstBinding: fb, dFirst: d(first), dBinding: d(fb), approxFirst: approx(first), approxBinding: approx(fb), nResponses: rs.length,
        all: all.map(function (r) { return { r: r, day: d(r), approx: approx(r) }; }) };
    });
  }

  function mount(el, opt) {
    var data = opt.data, names = opt.names || {}, list = chartable(data);
    var name = function (c) { return names[c] || c; };
    if (!list.length) {
      el.innerHTML = '<p class="cb-empty">Charts appear here when an event has official responses in at least two places. ' +
        ((data.events || []).length ? "This tracker’s events so far have responses in only one place each." : "This tracker has no shared events yet.") + "</p>";
      return;
    }
    var S = { kind: "bars", ev: list[0].ev.id, measure: "first", sort: "fast", colour: "binding", labels: true, max: "auto", title: "", off: {}, show: "all", tlLabels: "short", bands: true };
    el.innerHTML = '<div class="cb">' +
      '<div class="cb-controls">' +
        '<label class="cb-f">Event <select data-k="ev">' + list.map(function (x) { return '<option value="' + esc(x.ev.id) + '">' + esc(x.ev.title) + " (" + x.n + " places)</option>"; }).join("") + "</select></label>" +
        '<fieldset class="cb-f"><legend>Chart type</legend>' + radio("kind", [["bars", "Bars: the first action"], ["timeline", "Timeline: every action"]]) + "</fieldset>" +
        '<fieldset class="cb-f cb-bars"><legend>Measure</legend>' + radio("measure", [["first", "First official response"], ["binding", "First binding action"], ["both", "Both"]]) + "</fieldset>" +
        '<fieldset class="cb-f cb-tl" hidden><legend>Show</legend>' + radio("show", [["all", "All actions"], ["binding", "Binding actions only"]]) + "</fieldset>" +
        '<label class="cb-f cb-tl" hidden>Labels <select data-k="tlLabels"><option value="short">Short, such as “Block”</option><option value="dated">Short, with dates</option><option value="none">None</option></select></label>' +
        '<fieldset class="cb-f"><legend>Order</legend>' + radio("sort", [["fast", "Fastest first"], ["slow", "Slowest first"], ["az", "A to Z"]]) + "</fieldset>" +
        '<fieldset class="cb-f"><legend>Colour</legend>' + radio("colour", [["binding", "By binding status"], ["one", "One colour"]]) + "</fieldset>" +
        '<label class="cb-f">Scale <select data-k="max"><option value="auto">Automatic</option><option value="30">0 to 30 days</option><option value="60">0 to 60 days</option><option value="90">0 to 90 days</option></select></label>' +
        '<label class="cb-f cb-wide">Title <input data-k="title" type="text" maxlength="110" placeholder=""></label>' +
        '<fieldset class="cb-f cb-wide"><legend>Places</legend><div class="cb-places"></div></fieldset>' +
        '<label class="cb-chk cb-bars"><input type="checkbox" data-k="labels" checked> Show action labels</label>' +
        '<label class="cb-chk cb-tl" hidden><input type="checkbox" data-k="bands" checked> Shade periods when access was restricted</label>' +
      "</div>" +
      '<div class="cb-figure"></div>' +
      '<div class="cb-actions"><button type="button" class="cb-btn" data-dl="png">Download PNG</button><button type="button" class="cb-btn" data-dl="svg">Download SVG</button><button type="button" class="cb-btn" data-dl="csv">Download the numbers (CSV)</button><span class="cb-msg" role="status" aria-live="polite"></span></div>' +
      '<details class="cb-table"><summary>The numbers behind the chart</summary><div class="cb-tablewrap"></div></details>' +
    "</div>";
    function radio(k, opts) { return opts.map(function (o, i) { return '<label class="cb-r"><input type="radio" name="cb-' + k + '" data-k="' + k + '" value="' + o[0] + '"' + (i ? "" : " checked") + "> " + o[1] + "</label>"; }).join(""); }
    var $ = function (s) { return el.querySelector(s); };

    function current() { return list.filter(function (x) { return x.ev.id === S.ev; })[0]; }
    function defaultTitle(ev) {
      var short = ev.title.replace(/\s+(and|with)\s+(regional|official|national)\s+responses?$/i, "");
      if (S.kind === "timeline") return "Same incident, different paths: every official action on " + short;
      return S.measure === "binding" ? "Same incident, different responses: first binding action on " + short : "Same incident, different responses: first official action on " + short;
    }
    function drawPlaces() {
      var x = current();
      $(".cb-places").innerHTML = x.rows.slice().sort(function (a, b) { return name(a.code).localeCompare(name(b.code)); }).map(function (r) {
        return '<label class="cb-chk"><input type="checkbox" data-place="' + esc(r.code) + '"' + (S.off[r.code] ? "" : " checked") + "> " + esc(name(r.code)) + "</label>"; }).join("");
      $('[data-k="title"]').placeholder = defaultTitle(x.ev);
    }

    function rowsShown() {
      var x = current(), key = S.measure === "binding" ? "dBinding" : "dFirst";
      var rows = x.rows.filter(function (r) { return !S.off[r.code]; });
      return rows.sort(function (a, b) {
        if (S.sort === "az") return name(a.code).localeCompare(name(b.code));
        var av = a[key] == null ? 1e9 : a[key], bv = b[key] == null ? 1e9 : b[key];
        return S.sort === "fast" ? av - bv : bv - av;
      });
    }
    function label(r) {
      if (S.measure === "binding") return r.firstBinding ? (r.approxBinding ? "About " : "") + days(r.dBinding) + ". " + (TYPES[r.firstBinding.type] || r.firstBinding.type) : "No binding action recorded";
      if (!r.first) return "No response recorded";
      var t = (r.approxFirst ? "About " : "") + days(r.dFirst) + ". " + (TYPES[r.first.type] || r.first.type) + (r.first.binding === "yes" ? " (binding)" : "");
      if (r.first.binding !== "yes") t += r.firstBinding ? "; first binding action " + (r.dBinding - r.dFirst === 0 ? "the same day" : r.dBinding - r.dFirst === 1 ? "the next day" : r.dBinding - r.dFirst + " days later") : "; no binding action recorded";
      return t;
    }

    /* the figure: an SVG drawn to the same proportions on screen and on download */
    function svg() {
      var x = current(), ev = x.ev, rows = rowsShown(), both = S.measure === "both";
      var vals = []; rows.forEach(function (r) { if (r.dFirst != null) vals.push(r.dFirst); if (r.dBinding != null) vals.push(r.dBinding); });
      var tw = function (t) { return t.length * 7.9; }, plotW = 1000 - 150 - 30;
      var needs = []; rows.forEach(function (r) {
        if (both) { if (r.dFirst != null) needs.push([r.dFirst, 270]); if (r.dBinding != null) needs.push([r.dBinding, 230]); }
        else { var v0 = S.measure === "binding" ? r.dBinding : r.dFirst; if (v0 != null) needs.push([v0, S.labels ? tw(label(r)) + 14 : 0]); } });
      // the smallest round scale at which every bar and its label fit beside each other
      var fit = Math.max.apply(null, [10].concat(needs.map(function (n) { return n[1] >= plotW - 40 ? n[0] * 2 : n[0] * plotW / (plotW - n[1]); })));
      var max = S.max === "auto" ? Math.ceil(fit / 10) * 10 : +S.max;
      var over = vals.some(function (v) { return v > max; });
      var W = 1000, L = 150, R = 30, top = 118, extra = 0, rowH = both ? 84 : 66, barH = both ? 24 : 36, H = top + rows.length * rowH + 112;
      var X = function (v) { return L + Math.min(v, max) / max * (W - L - R); };
      var title = S.title.trim() || defaultTitle(ev), g = [];
      g.push('<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>');
      g.push('<text x="24" y="40" font-size="' + (title.length > 74 ? 19 : title.length > 62 ? 21 : 23) + '" font-weight="700" fill="' + C.ink + '">' + esc(title) + "</text>");
      // legend
      var leg = S.colour === "one" ? (both ? [[C.one, "First official response"], [C.second, "First binding action"]] : [[C.one, S.measure === "binding" ? "First binding action" : "First official response"]])
        : both ? [[C.bind, "Binding"], [C.non, "Non-binding"]] : [[C.bind, S.measure === "binding" ? "Binding action" : "First response binding"], [C.non, "First response non-binding"]];
      if (S.measure === "binding" && S.colour !== "one") leg = [[C.bind, "First binding action"]];
      var lx = 30; leg.forEach(function (l) { g.push('<rect x="' + lx + '" y="62" width="34" height="14" rx="2" fill="' + l[0] + '"/><text x="' + (lx + 44) + '" y="74" font-size="15" fill="' + C.ink + '">' + esc(l[1]) + "</text>"); lx += 64 + l[1].length * 8.4; });
      // gridlines and axis
      var step = max <= 30 ? 5 : 10, axisY = top + rows.length * rowH + 6;
      for (var t = 0; t <= max; t += step) g.push('<line x1="' + X(t) + '" y1="' + (top - 8) + '" x2="' + X(t) + '" y2="' + axisY + '" stroke="' + C.grid + '" stroke-width="1"' + (t ? ' stroke-dasharray="2 4"' : "") + '/><text x="' + X(t) + '" y="' + (axisY + 24) + '" font-size="14" fill="' + C.muted + '" text-anchor="middle">' + t + "</text>");
      g.push('<line x1="' + L + '" y1="' + axisY + '" x2="' + (W - R) + '" y2="' + axisY + '" stroke="' + C.grid + '" stroke-width="1.5"/>');
      g.push('<text x="' + ((L + W - R) / 2) + '" y="' + (axisY + 52) + '" font-size="15" fill="' + C.muted + '" text-anchor="middle">Days from the first public reports (about ' + esc(fmtDate(ev.onset)) + ") to the " + (S.measure === "binding" ? "first binding action" : S.measure === "both" ? "first official response and first binding action" : "first official response") + "</text>");
      // bars
      rows.forEach(function (r, i) {
        var y = top + i * rowH, mid = y + rowH / 2 - 6;
        g.push('<text x="' + (L - 12) + '" y="' + (mid + 6) + '" font-size="17" fill="' + C.ink + '" text-anchor="end">' + esc(name(r.code)) + "</text>");
        var bar = function (v, by, colour, text) {
          if (v == null) { g.push('<text x="' + (L + 8) + '" y="' + (by + barH / 2 + 5) + '" font-size="15" fill="' + C.muted + '" font-style="italic">' + esc(text) + "</text>"); return; }
          var w = Math.max(3, X(v) - L);
          g.push('<rect x="' + L + '" y="' + by + '" width="' + w + '" height="' + barH + '" fill="' + colour + '"><title>' + esc(name(r.code) + ": " + text) + "</title></rect>");
          if (S.labels) { var lxx = L + w + 10, anchor = "start", fill = C.ink, len = tw(text);
            if (lxx + len > W - 6) {
              if (len + 24 <= w) { lxx = L + w - 10; anchor = "end"; fill = colour === C.non ? C.ink : "#fff"; }   // inside the bar only if it truly fits, in a readable colour
              else extra = Math.max(extra, lxx + len + 16 - W);                                                       // otherwise beside it, widening the chart
            }
            g.push('<text x="' + lxx + '" y="' + (by + barH / 2 + 5) + '" font-size="15" fill="' + fill + '" text-anchor="' + anchor + '">' + esc(text) + "</text>"); }
        };
        if (both) {
          bar(r.dFirst, mid - barH, S.colour === "one" ? C.one : (r.first && r.first.binding === "yes" ? C.bind : C.non), r.first ? (r.approxFirst ? "About " : "") + days(r.dFirst) + ". " + (TYPES[r.first.type] || r.first.type) : "No response recorded");
          bar(r.dBinding, mid + 2, S.colour === "one" ? C.second : C.bind, r.firstBinding ? (r.approxBinding ? "About " : "") + days(r.dBinding) + ". First binding action" : "No binding action recorded");
        } else {
          var v = S.measure === "binding" ? r.dBinding : r.dFirst, colour = S.colour === "one" ? C.one : S.measure === "binding" ? C.bind : (r.first && r.first.binding === "yes" ? C.bind : C.non);
          bar(v, mid - barH / 2, colour, label(r));
        }
      });
      // the source line, always part of the figure
      var src = "Source: " + opt.tracker + ", version " + ((data.meta || {}).version || "") + ", verified " + fmtDate((data.meta || {}).verified || new Date().toISOString()) + "." + (over ? " Some bars run past the scale and are cut at " + max + " days." : "");
      g.push('<text x="24" y="' + (H - 34) + '" font-size="13" fill="' + C.muted + '">' + esc(src) + "</text>");
      if (ev.caution) g.push('<text x="24" y="' + (H - 14) + '" font-size="13" fill="' + C.muted + '">' + esc(ev.caution.length > 150 ? ev.caution.slice(0, 147) + "…" : ev.caution) + "</text>");
      var summary = title + ". " + rows.map(function (r) { return name(r.code) + ": " + (both ? (r.first ? days(r.dFirst) + " to first response" : "no response") + ", " + (r.firstBinding ? days(r.dBinding) + " to first binding action" : "no binding action") : label(r)); }).join("; ") + ".";
      W += Math.ceil(extra); g[0] = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(summary) + '" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">' + g.join("") + "</svg>";
    }
    var SHORT = { statement: "Statement", advisory: "Advisory", engagement: "Engagement", block_takedown: "Block", enforcement: "Enforcement", legislation: "Law", restriction_lifted: "Lifted" };
    var shape = function (type) { return type === "block_takedown" ? "square" : type === "restriction_lifted" ? "open" : (type === "enforcement" || type === "legislation") ? "diamond" : "circle"; };
    function mark(kind, x, y, fill) {
      if (kind === "square") return '<rect x="' + (x - 7) + '" y="' + (y - 7) + '" width="14" height="14" fill="' + fill + '" stroke="#fff" stroke-width="1.5"/>';
      if (kind === "open") return '<rect x="' + (x - 6) + '" y="' + (y - 6) + '" width="12" height="12" fill="#fff" stroke="' + C.muted + '" stroke-width="2"/>';
      if (kind === "diamond") return '<path d="M' + x + " " + (y - 9) + "L" + (x + 9) + " " + y + "L" + x + " " + (y + 9) + "L" + (x - 9) + " " + y + 'Z" fill="' + fill + '" stroke="#fff" stroke-width="1.5"/>';
      return '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + fill + '" stroke="#fff" stroke-width="1.5"/>';
    }
    function tlActions(r) { return r.all.filter(function (a) { return a.day != null && (S.show === "all" || a.r.binding === "yes" || (a.r.type === "restriction_lifted" && S.bands)); }); }
    function timeline() {
      var x = current(), ev = x.ev, rows = rowsShown();
      var allDays = []; rows.forEach(function (r) { tlActions(r).forEach(function (a) { allDays.push(a.day); }); });
      var max = S.max === "auto" ? Math.max(10, Math.ceil(Math.max.apply(null, allDays.concat([1])) * 1.12 / 10) * 10) : +S.max;
      var over = allDays.some(function (v) { return v > max; });
      var W = 1000, L = 150, R = 40, top = 122, laneH = 86, H = top + rows.length * laneH + 118, g = [];
      var X = function (v) { return L + Math.min(v, max) / max * (W - L - R); };
      var title = S.title.trim() || defaultTitle(ev);
      g.push('<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>');
      g.push('<text x="24" y="40" font-size="' + (title.length > 74 ? 19 : title.length > 62 ? 21 : 23) + '" font-weight="700" fill="' + C.ink + '">' + esc(title) + "</text>");
      // legend: shape is the kind of action, colour is whether it was binding, so it reads in black and white too
      var lx = 30, ly = 70, item = function (svgMark, text) { g.push(svgMark + '<text x="' + (lx + 14) + '" y="' + (ly + 5) + '" font-size="14" fill="' + C.ink + '">' + esc(text) + "</text>"); lx += 30 + text.length * 7.6; };
      var fillB = S.colour === "one" ? C.one : C.bind, fillN = S.colour === "one" ? C.one : C.non;
      item(mark("circle", lx, ly, fillN), "Statement, advisory or engagement"); item(mark("diamond", lx, ly, fillB), "Enforcement or law"); item(mark("square", lx, ly, fillB), "Block or takedown"); item(mark("open", lx, ly), "Restriction lifted");
      if (S.colour !== "one") { lx = 30; ly = 94; g.push('<text x="' + lx + '" y="' + (ly + 5) + '" font-size="13" fill="' + C.muted + '">Dark marks are binding; pale marks are not.' + (S.bands ? " Shaded bands show periods when access was restricted." : "") + "</text>"); }
      var step = max <= 30 ? 5 : 10, axisY = top + rows.length * laneH + 4;
      for (var t = 0; t <= max; t += step) g.push('<line x1="' + X(t) + '" y1="' + (top - 4) + '" x2="' + X(t) + '" y2="' + axisY + '" stroke="' + C.grid + '" stroke-width="1"' + (t ? ' stroke-dasharray="2 4"' : "") + '/><text x="' + X(t) + '" y="' + (axisY + 24) + '" font-size="14" fill="' + C.muted + '" text-anchor="middle">' + t + "</text>");
      g.push('<line x1="' + L + '" y1="' + axisY + '" x2="' + (W - R) + '" y2="' + axisY + '" stroke="' + C.grid + '" stroke-width="1.5"/>');
      g.push('<text x="' + ((L + W - R) / 2) + '" y="' + (axisY + 52) + '" font-size="15" fill="' + C.muted + '" text-anchor="middle">Days from the first public reports (about ' + esc(fmtDate(ev.onset)) + "). Each mark is one official action.</text>");
      rows.forEach(function (r, i) {
        var y = top + i * laneH + 50, acts = tlActions(r);
        g.push('<text x="' + (L - 14) + '" y="' + (y + 6) + '" font-size="17" fill="' + C.ink + '" text-anchor="end">' + esc(name(r.code)) + "</text>");
        if (S.bands) r.all.forEach(function (a) { if (a.r.type !== "block_takedown" || a.day == null) return;
          var lift = r.all.filter(function (b) { return b.r.type === "restriction_lifted" && b.day != null && b.day >= a.day; })[0], end = lift ? lift.day : max;
          g.push('<rect x="' + X(a.day) + '" y="' + (y - 11) + '" width="' + Math.max(2, X(end) - X(a.day)) + '" height="22" fill="#e9b44c" opacity="' + (lift ? .28 : .16) + '"/>'); });
        if (acts.length) g.push('<line x1="' + X(acts[0].day) + '" y1="' + y + '" x2="' + X(acts[acts.length - 1].day) + '" y2="' + y + '" stroke="' + C.muted + '" stroke-width="2"/>');
        else g.push('<text x="' + (L + 8) + '" y="' + (y + 5) + '" font-size="15" fill="' + C.muted + '" font-style="italic">' + (S.show === "binding" ? "No binding action recorded" : "No response recorded") + "</text>");
        // labels take turns above and below the line, so marks close together don't collide
        var ends = [-1e9, -1e9, -1e9];
        acts.forEach(function (a) {
          var xx = X(a.day), fill = a.r.binding === "yes" ? fillB : fillN;
          g.push('<g>' + mark(shape(a.r.type), xx, y, fill) + "<title>" + esc(name(r.code) + ", day " + a.day + " (" + a.r.date + "): " + (TYPES[a.r.type] || a.r.type) + (a.r.binding === "yes" ? ", binding" : ", non-binding") + (a.r.actor ? ". " + a.r.actor : "")) + "</title></g>");
          if (S.tlLabels === "none") return;
          var text = (SHORT[a.r.type] || a.r.type) + (S.tlLabels === "dated" ? ", " + new Date(ts(a.r.date)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : ""), wdt = text.length * 7.2 + 8;
          var lvl = [0, 1, 2].filter(function (k) { return ends[k] < xx - wdt / 2; })[0]; if (lvl == null) lvl = 0;
          ends[lvl] = xx + wdt / 2; var ly2 = lvl === 0 ? y - 16 : lvl === 1 ? y + 28 : y - 32;
          g.push('<text x="' + xx + '" y="' + ly2 + '" font-size="13" fill="' + C.ink + '" text-anchor="middle">' + esc(text) + "</text>");
        });
      });
      var src = "Source: " + opt.tracker + ", version " + ((data.meta || {}).version || "") + ", verified " + fmtDate((data.meta || {}).verified || new Date().toISOString()) + "." + (over ? " Some actions fall past the scale and are drawn at " + max + " days." : "");
      g.push('<text x="24" y="' + (H - 34) + '" font-size="13" fill="' + C.muted + '">' + esc(src) + "</text>");
      if (ev.caution) g.push('<text x="24" y="' + (H - 14) + '" font-size="13" fill="' + C.muted + '">' + esc(ev.caution.length > 150 ? ev.caution.slice(0, 147) + "…" : ev.caution) + "</text>");
      var summary = title + ". " + rows.map(function (r) { var a = tlActions(r); return name(r.code) + ": " + (a.length ? a.map(function (b) { return (SHORT[b.r.type] || b.r.type) + " on day " + b.day; }).join(", ") : "no action recorded"); }).join("; ") + ".";
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(summary) + '" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">' + g.join("") + "</svg>";
    }
    function tlTable() {
      return '<table class="cb-tbl"><thead><tr><th scope="col">Place</th><th scope="col">Day</th><th scope="col">Date</th><th scope="col">Action</th><th scope="col">Binding</th><th scope="col">By</th></tr></thead><tbody>' +
        rowsShown().map(function (r) { return tlActions(r).map(function (a, k) { return "<tr>" + (k ? "<td></td>" : '<th scope="row">' + esc(name(r.code)) + "</th>") + "<td>" + a.day + "</td><td>" + esc(a.r.date) + "</td><td>" + esc(TYPES[a.r.type] || a.r.type) + "</td><td>" + (a.r.binding === "yes" ? "Yes" : "No") + "</td><td>" + esc(a.r.actor || "") + "</td></tr>"; }).join(""); }).join("") + "</tbody></table>";
    }
    function table() {
      var rows = rowsShown();
      return '<table class="cb-tbl"><thead><tr><th scope="col">Place</th><th scope="col">First official response</th><th scope="col">Days</th><th scope="col">First binding action</th><th scope="col">Days</th></tr></thead><tbody>' +
        rows.map(function (r) { return "<tr><th scope=\"row\">" + esc(name(r.code)) + "</th><td>" + (r.first ? esc(r.first.date + " · " + (TYPES[r.first.type] || r.first.type) + " (" + (r.first.binding === "yes" ? "binding" : "non-binding") + ")") : "None recorded") + "</td><td>" + (r.dFirst == null ? "–" : r.dFirst) + "</td><td>" + (r.firstBinding ? esc(r.firstBinding.date + " · " + (TYPES[r.firstBinding.type] || r.firstBinding.type)) : "None recorded") + "</td><td>" + (r.dBinding == null ? "–" : r.dBinding) + "</td></tr>"; }).join("") + "</tbody></table>";
    }
    function figure() { return S.kind === "timeline" ? timeline() : svg(); }
    function draw() {
      [].forEach.call(el.querySelectorAll(".cb-bars"), function (n) { n.hidden = S.kind !== "bars"; });
      [].forEach.call(el.querySelectorAll(".cb-tl"), function (n) { n.hidden = S.kind !== "timeline"; });
      $(".cb-figure").innerHTML = rowsShown().length ? figure() : '<p class="cb-empty">Choose at least one place.</p>';
      $(".cb-tablewrap").innerHTML = S.kind === "timeline" ? tlTable() : table(); }

    /* downloads: the picture as SVG or PNG, and the numbers as CSV */
    var say = function (t) { var m = $(".cb-msg"); m.textContent = t; setTimeout(function () { m.textContent = ""; }, 3500); };
    var fname = function (ext) { return (opt.region || "tracker").toLowerCase() + "-" + S.ev + "-" + (S.kind === "timeline" ? "timeline" : S.measure) + "." + ext; };
    function save(blob, n) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = n; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dl]"); if (!b) return; var kind = b.getAttribute("data-dl"), s = figure();
      if (kind === "svg") { save(new Blob([s], { type: "image/svg+xml" }), fname("svg")); say("SVG downloaded."); }
      if (kind === "csv") { var cell = function (v) { v = String(v == null ? "" : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        var lines = S.kind === "timeline" ? [["place", "day", "date", "action", "binding", "actor"]].concat([].concat.apply([], rowsShown().map(function (r) { return tlActions(r).map(function (a) { return [name(r.code), a.day, a.r.date, a.r.type, a.r.binding, a.r.actor]; }); })))
          : [["place", "first_response_date", "first_response_type", "first_response_binding", "days_to_first_response", "first_binding_date", "first_binding_type", "days_to_first_binding"]].concat(rowsShown().map(function (r) {
          return [name(r.code), r.first && r.first.date, r.first && r.first.type, r.first && r.first.binding, r.dFirst, r.firstBinding && r.firstBinding.date, r.firstBinding && r.firstBinding.type, r.dBinding]; }));
        save(new Blob(["\ufeff" + lines.map(function (l) { return l.map(cell).join(","); }).join("\r\n")], { type: "text/csv" }), fname("csv")); say("Numbers downloaded."); }
      if (kind === "png") { var img = new Image(); img.onload = function () { var c = document.createElement("canvas"), k = 2; c.width = img.width * k; c.height = img.height * k; var x = c.getContext("2d"); x.scale(k, k); x.drawImage(img, 0, 0); c.toBlob(function (bl) { save(bl, fname("png")); say("PNG downloaded."); }); };
        img.onerror = function () { say("This browser couldn’t make a PNG: use Download SVG."); }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }
    });
    el.addEventListener("input", function (e) {
      var t = e.target, k = t.getAttribute("data-k"), p = t.getAttribute("data-place");
      if (p) S.off[p] = !t.checked;
      else if (k === "labels") S.labels = t.checked;
      else if (k === "bands") S.bands = t.checked;
      else if (k) S[k] = t.value;
      if (k === "ev") { S.off = {}; drawPlaces(); }
      if (k === "measure" || k === "kind") $('[data-k="title"]').placeholder = defaultTitle(current().ev);
      draw();
    });
    drawPlaces(); draw();
  }
  window.ChartBuilder = { mount: mount, chartable: chartable };
})();
