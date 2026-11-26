/* EU AI Governance Tracker: the Compute tab (version 0.2).
   Draws from DATA.compute (data/compute_measures.csv, compute_sites.csv and compute_profile.csv, checked by build.py).
   Three parts, kept deliberately lean: the rules that use compute, public compute projects, and whether compute could be checked.
   Every row has an official source and the date it was checked. "Not checked yet" is a gap in this tracker, not a judgement. */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const when = (d, p) => { if (!d) return ""; const [y, m, dd] = d.split("-"); return p === "day" && dd ? `${+dd} ${MON[+m - 1]} ${y}` : m ? `${MON[+m - 1]} ${y}` : y; };
  const NAMES = { EU: "European Union", AT: "Austria", BG: "Bulgaria", CZ: "Czechia", DE: "Germany", ES: "Spain", FI: "Finland", FR: "France", GR: "Greece",
    IE: "Ireland", IT: "Italy", LT: "Lithuania", LU: "Luxembourg", NL: "Netherlands", PL: "Poland", RO: "Romania", SE: "Sweden", SI: "Slovenia" };
  const KIND = { ai_rule: "AI law", guidance: "Guidance", data_centre_rule: "Data-centre rule", public_investment: "Public investment", publication: "Official data" };
  const PLACES = ["EU", "DE", "FR", "IE", "NL"];
  const PQ = [["public_list", "Public list", "Is there a public list of data centres, with names and places?"],
              ["energy_reporting", "Energy reporting", "Must data centres report their energy use?"],
              ["official_figures", "Official figures", "Does an official body publish figures on data centres' electricity use or capacity?"]];
  const PS = { yes: ["Yes", "✓"], partly: ["Partly", "◐"], checked_not_found: ["Checked, not found", "✕"], none: ["Not checked yet", "–"] };
  const AIF_TOTAL = 19;
  const link = (u, t) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t || "Source")}</a>` : "";

  function measures(rows, k) {
    const list = rows.filter(r => !k || r.kind === k);
    if (!list.length) return '<li class="muted">Nothing of this kind yet.</li>';
    return list.map(r => `<li class="cp-m">
      <div class="cp-mh"><span class="cp-date">${esc(when(r.date, r.date_precision))}</span>
        <span class="cp-kind">${esc(KIND[r.kind] || r.kind)}</span>${r.binding === "yes" ? '<span class="cp-bind" title="A legal obligation">Binding</span>' : ""}
        <span class="muted small">${esc(NAMES[r.jurisdiction] || r.jurisdiction)}</span></div>
      <strong>${esc(r.title)}</strong><p>${esc(r.summary)}</p>
      <p class="small muted">${link(r.source_url, r.source_title)}${r.more_sources ? ` · ${link(r.more_sources, "More")}` : ""} · checked ${esc(when(r.verified_on, "day"))}</p></li>`).join("");
  }
  function sites(rows) {
    const body = rows.map(r => `<tr><th scope="row">${esc(r.name)}</th><td>${esc(NAMES[r.country] || r.country)}</td><td>${r.operator ? esc(r.operator) : '<span class="muted">Not published here</span>'}</td>
      <td>${r.announced ? esc(when(r.announced, "month")) : '<span class="muted">See note</span>'}</td><td>${link(r.source_url, "Source")}${r.notes ? `<div class="small muted">${esc(r.notes)}</div>` : ""}</td></tr>`).join("");
    return `<div class="tablewrap"><table class="cp-t"><caption class="sr">AI Factories selected by the EuroHPC Joint Undertaking</caption>
      <thead><tr><th scope="col">AI Factory</th><th scope="col">Country</th><th scope="col">Who runs it</th><th scope="col">Selected</th><th scope="col">Source and notes</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function profile(rows) {
    const at = (c, q) => rows.find(r => r.country === c && r.question === q);
    const cell = (c, q) => { const r = at(c, q), st = r ? r.status : "none", [l, ic] = PS[st];
      const chip = st === "none" ? `<span class="pf-dash" aria-hidden="true">–</span><span class="sr">Not checked yet</span>` : `<span class="pf-chip pf-${st}"><span aria-hidden="true">${ic}</span> ${l}</span>`;
      return `<td>${r ? `<a class="pf-link" href="#pf-${esc(r.id)}" aria-label="${esc(NAMES[c])}, ${esc(PQ.find(x => x[0] === q)[1])}: ${l}. See the evidence">${chip}</a>` : chip}</td>`; };
    const notes = PLACES.filter(c => rows.some(r => r.country === c)).map(c => `<li><h4>${esc(NAMES[c])}</h4><ul>${PQ.filter(([q]) => at(c, q)).map(([q, short]) => { const r = at(c, q);
      return `<li id="pf-${esc(r.id)}" class="pf-note" tabindex="-1"><span class="pf-chip pf-${esc(r.status)}"><span aria-hidden="true">${PS[r.status][1]}</span> ${PS[r.status][0]}</span> <strong>${esc(short)}.</strong> ${esc(r.detail)}
        <span class="small muted">${link(r.source_url, r.source_title)} · checked ${esc(when(r.checked_on, "day"))} · ${esc(r.confidence)} confidence</span></li>`; }).join("")}</ul></li>`).join("");
    return `<p>Three questions about whether what happens with compute <strong>could be checked</strong>, at EU level and in four large data-centre markets. There is <strong>no total and no ranking</strong>: the gaps are the point.</p>
      <div class="pf-legend" aria-label="What the marks mean">${Object.entries(PS).map(([k, [l, ic]]) => `<span class="pf-chip pf-${k}"><span aria-hidden="true">${ic}</span> ${l}</span>`).join("")}</div>
      <div class="tablewrap pf-wrap"><table class="pf"><caption class="sr">Can it be checked? Three questions for the EU and four member states</caption>
        <thead><tr><th scope="col">Where</th>${PQ.map(([, short, full]) => `<th scope="col"><span title="${esc(full)}">${esc(short)}</span></th>`).join("")}</tr></thead>
        <tbody>${PLACES.map(c => `<tr><th scope="row">${esc(NAMES[c])}</th>${PQ.map(([q]) => cell(c, q)).join("")}</tr>`).join("")}</tbody></table></div>
      <ol class="pf-q small">${PQ.map(([, short, full]) => `<li><strong>${esc(short)}:</strong> ${esc(full)}</li>`).join("")}</ol>
      <p class="pf-cover"><strong>Checked so far: ${rows.length} of ${PLACES.length * PQ.length}.</strong> EU rules apply in every member state; a country's row records what was checked <em>nationally</em>. "Not checked yet" is a gap in this tracker, not a judgement about the country.</p>
      ${notes ? `<h4 class="pf-h">What was found</h4><ul class="pf-notes">${notes}</ul>` : ""}`;
  }
  function csv(rows) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]), q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    return [cols.join(","), ...rows.map(r => cols.map(c => q(r[c] == null ? "" : r[c])).join(","))].join("\n") + "\n";
  }
  function download(name, rows) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function render(panel, D) {
    const C = (D && D.compute) || { measures: [], sites: [], profile: [] };
    const card = (n, l, href) => `<a class="cp-card" href="${href}"><span class="cp-n">${n}</span><span class="cp-l">${l}</span></a>`;
    const kinds = [...new Set(C.measures.map(m => m.kind))];
    panel.innerHTML = `<div class="cp">
      <header class="cp-head"><h2>Compute: chips, data centres and verification</h2>
        <p>AI governance and safety depend on <strong>compute</strong>: the chips and data centres that train and run AI. In the EU, compute is written into law:
        the AI Act uses the amount of computing used to train a model as a trigger for extra safety duties. This tab records what is <strong>published</strong>,
        says what is <strong>not</strong>, and shows what <strong>could be checked</strong>.</p>
        <div class="cp-glance" aria-label="At a glance">
          ${card(String(C.measures.length), "Rules and milestones about compute", "#cp-rules")}
          ${card(`${C.sites.length} of ${AIF_TOTAL}`, "AI Factories listed so far", "#cp-sites")}
          ${card(`${C.profile.length} of ${PLACES.length * PQ.length}`, "Questions checked in the profile", "#cp-profile")}</div>
        <nav class="cp-toc" aria-label="On this tab">${[["cp-rules", "Rules"], ["cp-sites", "Public projects"], ["cp-profile", "Can it be checked?"], ["cp-faq", "Questions people ask"], ["cp-data", "Data"]]
          .map(([h, l]) => `<a href="#${h}">${l}</a>`).join("")}</nav></header>

      <section id="cp-rules" tabindex="-1" aria-labelledby="cp-h1"><h3 id="cp-h1">The rules: compute in EU law</h3>
        <div class="cp-key"><p class="cp-big">10<sup>25</sup> <span>floating-point operations</span></p>
          <p>Above this amount of training compute, a general-purpose AI model is <strong>presumed to carry systemic risk</strong>, and its provider must notify the Commission
          and assess and reduce those risks. <strong>The Commission says this threshold is under review.</strong> ${link("https://digital-strategy.ec.europa.eu/en/factpages/general-purpose-ai-obligations-under-ai-act", "Commission fact page")}</p>
          <details class="cp-more"><summary>What is a floating-point operation?</summary><p>One arithmetic step on a computer chip, such as multiplying two numbers.
          "Training compute" is the total number of these steps used to train a model. 10<sup>25</sup> is ten million billion billion. Models trained with more than
          10<sup>23</sup> that can generate language, images or video count as general-purpose AI models in the first place.</p></details></div>
        <div class="cp-filter" role="group" aria-label="Show"><button type="button" aria-pressed="true" data-k="">All</button>${kinds.map(k => `<button type="button" aria-pressed="false" data-k="${esc(k)}">${esc(KIND[k] || k)}</button>`).join("")}</div>
        <ol class="cp-ml" reversed>${measures(C.measures, "")}</ol></section>

      <section id="cp-sites" tabindex="-1" aria-labelledby="cp-h2"><h3 id="cp-h2">Public compute projects</h3>
        <p>The EU's <strong>AI Factories</strong> are publicly funded AI supercomputers with support services, run by national consortia through the EuroHPC Joint Undertaking.
        <strong>19</strong> have been selected across 16 member states, with 13 smaller AI Factory Antennas. This table lists the <strong>${C.sites.length}</strong> whose names
        could be confirmed from official pages; the others will be added once checked. Selection is not the same as operation: they are coming into service gradually during 2026.</p>
        ${C.sites.length ? sites(C.sites) : '<p class="muted">No projects recorded yet.</p>'}
        <div class="cp-note"><h4>AI Gigafactories: no site chosen yet</h4><p>A call for tenders for up to seven much larger <strong>AI Gigafactories</strong> opened on 30 July 2026.
          Lot 2 closes on <strong>3 December 2026</strong> and Lot 1 on <strong>4 February 2027</strong>; selection is expected in early 2027. They will be added here when sites are named.
          ${link("https://eurohpc-ju.europa.eu/call-tenders-selection-artificial-intelligence-gigafactory-consortia-and-establishment-ai_en", "EuroHPC call page")}</p></div></section>

      <section id="cp-profile" tabindex="-1" aria-labelledby="cp-h3"><h3 id="cp-h3">Can it be checked?</h3>${profile(C.profile)}</section>

      <section id="cp-faq" tabindex="-1" aria-labelledby="cp-h4"><h3 id="cp-h4">Questions people ask</h3>
        <details class="cp-more"><summary>Why are there no capacity figures in megawatts?</summary><p>Most published figures for data-centre capacity come from paid consultancy reports that cannot be checked row by row.
          This tab adds capacity only from sources a reader can open and verify. The official EU and national figures above are the starting point.</p></details>
        <details class="cp-more"><summary>Does the EU database show where each data centre is?</summary><p>Not yet. The European database publishes figures only in aggregated form, by member state and EU-wide.
          A rating scheme adopted in September 2026 would put each data centre's name, operator and location on a label, once it is in force.</p></details>
        <details class="cp-more"><summary>Why these five places?</summary><p>The EU level, because its rules apply everywhere, and four of the largest data-centre markets. More member states will be added; an empty cell means "not checked yet".</p></details>
        <details class="cp-more"><summary>Is training compute a good measure of risk?</summary><p>It is a simple, checkable proxy, which is why the AI Act uses it as a <em>presumption</em>, not a verdict.
          Providers can contest it with evidence, the Commission can designate models below it, and the Commission is reviewing the number itself.</p></details>
        <details class="cp-more"><summary>How does this compare with Southeast Asia?</summary><p>The <a href="https://suhaimizainalshah.github.io/ASEAN-AI-Governance-Tracker/#compute">ASEAN tracker's Compute tab</a>
          asks similar "can it be checked?" questions for ASEAN's eleven members. Comparing the two shows how much more of the EU's compute is reported by law, and what that still leaves out.</p></details></section>

      <section id="cp-data" tabindex="-1" aria-labelledby="cp-h5"><h3 id="cp-h5">Data</h3>
        <div class="cp-dl"><button type="button" class="cp-btn" data-dl="measures">Rules and milestones (CSV)</button><button type="button" class="cp-btn" data-dl="sites">AI Factories (CSV)</button>
          <button type="button" class="cp-btn" data-dl="profile">Profile (CSV)</button><a class="cp-btn" href="tracker-data.json">All data (JSON)</a></div>
        <p class="small muted">Free to reuse with credit (see the data licence). Corrections and new official sources are welcome.</p></section>
    </div>`;
    panel.querySelectorAll('a[href^="#cp-"], a[href^="#pf-"]').forEach(a => a.addEventListener("click", e => {
      const t = panel.querySelector(a.getAttribute("href")); if (!t) return; e.preventDefault();   // in-page jump: never changes the tracker's address
      t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); t.focus({ preventScroll: true }); }));
    panel.querySelectorAll(".cp-filter button").forEach(b => b.addEventListener("click", () => {
      panel.querySelectorAll(".cp-filter button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      panel.querySelector(".cp-ml").innerHTML = measures(C.measures, b.dataset.k); }));
    panel.querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", () => download(`eu-compute-${b.dataset.dl}.csv`, C[b.dataset.dl] || [])));
  }
  window.ComputeTab = { render };
})();
