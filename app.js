/* 엇갈린 시계 — 인터랙션 */
(function () {
  const D = window.PLAN_DATA;
  const M = D.meta;
  const YEARS = [];
  for (let y = 2021; y <= 2035; y++) YEARS.push(y);
  // 정부 임기 밴드 — 취임·퇴임 시점을 연도 소수(월/12)로 비례 배치
  const SPAN0 = 2021, SPANN = 15; // 2021~2035 (막대 15개)
  const TERM_FROM = 2025.42, TERM_TO = 2030.42; // 이재명 정부 2025.6~2030.6
  const TERMS = [
    { from: 2021.0, to: 2022.36, name: "문재인 정부", dates: "~2022.5", cls: "past" },
    { from: 2022.36, to: 2025.26, name: "윤석열 정부", dates: "2022.5~2025.4", cls: "past" },
    { from: 2025.26, to: 2025.42, name: "", dates: "", cls: "prev", title: "대통령 권한대행 (2025.4~6)" },
    { from: TERM_FROM, to: TERM_TO, name: "이재명 정부", dates: "2025.6~2030.6", cls: "" },
    { from: TERM_TO, to: 2036.0, name: "차기 정부", dates: "2030.6~", cls: "alt" },
  ];
  const TERM_STARTS = new Set([2025, 2030, 2035]);
  const LAST_ACTUAL = 2025; // ~2025 = 실제 수립연도, 2026~ = 투영

  /* 히어로 카운트업 */
  const nums = document.querySelectorAll(".stat-num");
  const io0 = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      io0.unobserve(e.target);
      const t = parseFloat(e.target.dataset.count);
      const suf = e.target.dataset.suffix || "";
      const dec = String(e.target.dataset.count).includes(".") ? 1 : 0;
      const t0 = performance.now();
      (function tick(now) {
        const p = Math.min(1, (now - t0) / 1200);
        const v = t * (1 - Math.pow(1 - p, 3));
        e.target.textContent = v.toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.4 });
  nums.forEach((n) => io0.observe(n));

  /* 챕터 리빌 */
  const io1 = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io1.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".chapter").forEach((c) => io1.observe(c));

  /* ① 타임라인 */
  const bands = document.getElementById("termBands");
  TERMS.forEach((t) => {
    const el = document.createElement("div");
    el.className = "term-band " + t.cls;
    el.style.left = ((t.from - SPAN0) / SPANN * 100) + "%";
    el.style.width = (Math.min(t.to, SPAN0 + SPANN) - t.from) / SPANN * 100 + "%";
    el.innerHTML = t.name ? `<span class="tname">${t.name}</span><span class="tdates">${t.dates}</span>` : "";
    if (t.title) el.title = t.title;
    bands.appendChild(el);
  });
  // 폭이 좁으면 날짜부터, 그래도 좁으면 이름까지 숨김 (툴팁으로 유지)
  function fitBandLabels() {
    bands.querySelectorAll(".term-band").forEach((el) => {
      const nm = el.querySelector(".tname"), dt = el.querySelector(".tdates");
      if (!nm) return;
      nm.style.display = ""; if (dt) dt.style.display = "";
      if (el.scrollWidth > el.clientWidth + 2 && dt) dt.style.display = "none";
      if (el.scrollWidth > el.clientWidth + 2) { el.title = (nm.textContent + (dt ? " " + dt.textContent : "")).trim(); nm.style.display = "none"; }
    });
  }
  requestAnimationFrame(fitBandLabels);
  window.addEventListener("resize", fitBandLabels);
  // 이재명 정부 임기 창(통제 구간) 배경 워시 + 취임·퇴임 점선
  const win = document.createElement("div");
  win.className = "term-window";
  win.style.left = ((TERM_FROM - SPAN0) / SPANN * 100) + "%";
  win.style.width = ((TERM_TO - TERM_FROM) / SPANN * 100) + "%";
  document.querySelector(".timeline-wrap").appendChild(win);
  [TERM_FROM, TERM_TO].forEach((x) => {
    const ln = document.createElement("div");
    ln.className = "inaug-line";
    ln.style.left = ((x - SPAN0) / SPANN * 100) + "%";
    document.querySelector(".timeline-wrap").appendChild(ln);
  });
  const wrap = document.getElementById("yearBars");
  const valOf = (y) => (y <= LAST_ACTUAL ? (M.estYearDist[y] || 0) : (M.projYears[y] || 0));
  const maxN = Math.max(...YEARS.map(valOf));
  const detail = document.getElementById("yearDetail");
  const dTitle = document.getElementById("yearDetailTitle");
  const dList = document.getElementById("yearDetailList");
  let selBtn = null;
  YEARS.forEach((y) => {
    const n = valOf(y);
    // 임기 창 대비: 완전 포함(2026~2029)=in, 경계 연도(2025·2030)=부분, 그 외=out
    let pos = "out";
    if (y > TERM_FROM && y + 1 < TERM_TO + 0.01) pos = "in";
    if (y === 2025) pos = "edge-start";
    if (y === 2030) pos = "edge-end";
    const b = document.createElement("button");
    b.className = "ybar pos-" + pos + (TERM_STARTS.has(y) ? " term-start" : "") + (y > LAST_ACTUAL ? " proj" : "");
    b.innerHTML = `<span class="cnt">${n}</span><div class="barzone"><div class="bar" style="height:0"></div></div><span class="yr"><span class="y4">${y}</span><span class="y2">'${String(y).slice(2)}</span></span>`;
    b.addEventListener("click", () => {
      if (selBtn) selBtn.classList.remove("sel");
      selBtn = b; b.classList.add("sel");
      const items = y <= LAST_ACTUAL
        ? D.plans.filter((p) => p.year === y)
        : D.plans.filter((p) => p.proj.includes(y));
      dTitle.textContent = y <= LAST_ACTUAL
        ? `${y}년 수립 — ${items.length}건 (수립연도 기준)`
        : `${y}년 수립 예정 — ${items.length}건 (주기 투영)`;
      dList.innerHTML = items
        .sort((a, b2) => a.ministry.localeCompare(b2.ministry, "ko"))
        .map((p) => `<li><span class="m">${p.ministry}</span> ${p.name}<span class="c">${p.cycle ? p.cycle + "년 주기" : ""}</span></li>`)
        .join("");
      detail.hidden = false;
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    wrap.appendChild(b);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      b.querySelector(".bar").style.height = (n / maxN * 100) + "%";
    }));
  });
  document.getElementById("yearDetailClose").addEventListener("click", () => {
    detail.hidden = true;
    if (selBtn) { selBtn.classList.remove("sel"); selBtn = null; }
  });

  /* ② 주기 분포 */
  const cyc = M.cycleDist;
  const order = Object.keys(cyc).map(Number).sort((a, b) => a - b);
  const cmax = Math.max(...Object.values(cyc), M.noCycle);
  const cc = document.getElementById("cycleChart");
  const rows = order.map((k) => ({ label: k + "년 주기", n: cyc[k], hot: k === 5 }));
  rows.push({ label: "주기 미확인", n: M.noCycle, hot: false });
  rows.forEach((r) => {
    const el = document.createElement("div");
    el.className = "crow" + (r.hot ? " hot" : "");
    el.innerHTML = `<span class="cl">${r.label}</span><div class="cbarwrap"><div class="cbar"></div></div><span class="cv">${r.n}</span>`;
    cc.appendChild(el);
  });
  const io2 = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return; io2.unobserve(e.target);
      cc.querySelectorAll(".crow").forEach((el, i) => {
        el.querySelector(".cbar").style.width = (rows[i].n / cmax * 100) + "%";
      });
    });
  }, { threshold: 0.3 });
  io2.observe(cc);
  document.getElementById("cycle5num").textContent = M.cycle5;
  document.getElementById("alignedNum").textContent = M.termAligned;

  /* ③ 위원회 */
  const kc = document.getElementById("committeeChart");
  const top = M.committeeTop.slice(0, 15);
  const kmax = top[0][1];
  top.forEach(([name, n]) => {
    const el = document.createElement("div");
    el.className = "krow";
    el.innerHTML = `<span class="kl" title="${name}">${name}</span><div class="kbarwrap"><div class="kbar"></div></div><span class="kv">${n}</span>`;
    kc.appendChild(el);
  });
  const io3 = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return; io3.unobserve(e.target);
      kc.querySelectorAll(".krow").forEach((el, i) => {
        el.querySelector(".kbar").style.width = (top[i][1] / kmax * 100) + "%";
      });
    });
  }, { threshold: 0.3 });
  io3.observe(kc);
  const single = M.committeeTop.length ? null : null;
  const singles = (function () {
    let c = 0;
    const seen = {};
    D.plans.forEach((p) => p.committee.forEach((k) => { seen[k] = (seen[k] || 0) + 1; }));
    Object.values(seen).forEach((v) => { if (v === 1) c++; });
    return c;
  })();
  document.getElementById("committeeTail").textContent =
    `확인된 위원회 ${M.committees}종 중 ${singles}종은 단 하나의 계획만 심의한다. 상위 15개 위원회가 전체 심의 연결의 상당 부분을 감당하는 반면, 꼬리는 길고 얇다.`;

  /* ④ 히트맵 */
  const hm = document.getElementById("heatmap");
  const perMin = {};
  D.plans.forEach((p) => {
    if (!perMin[p.ministry]) perMin[p.ministry] = { total: 0, years: {} };
    perMin[p.ministry].total++;
    p.proj.forEach((y) => { perMin[p.ministry].years[y] = (perMin[p.ministry].years[y] || 0) + 1; });
  });
  const minOrder = Object.entries(perMin).sort((a, b) => b[1].total - a[1].total);
  let html = "<thead><tr><th style='text-align:left;padding-left:12px'>부처 (계획 수)</th>" +
    YEARS.map((y) => `<th class="${TERM_STARTS.has(y) ? "term-start" : ""}">${String(y).slice(2)}</th>`).join("") + "</tr></thead><tbody>";
  const hmMax = Math.max(...minOrder.flatMap(([, v]) => YEARS.map((y) => v.years[y] || 0)));
  minOrder.forEach(([name, v], idx) => {
    html += `<tr class="${idx >= 15 ? "hidden-row" : ""}"><td class="mname">${name} (${v.total})</td>`;
    YEARS.forEach((y) => {
      const n = v.years[y] || 0;
      const a = n ? (0.12 + 0.78 * n / hmMax).toFixed(2) : 0;
      html += `<td class="${TERM_STARTS.has(y) ? "term-start" : ""}" style="background:rgba(216,67,21,${a})${n && n / hmMax > 0.55 ? ";color:#fff;font-weight:700" : ""}">${n || ""}</td>`;
    });
    html += "</tr>";
  });
  hm.innerHTML = html + "</tbody>";
  const moreBtn = document.getElementById("heatmapMore");
  moreBtn.addEventListener("click", () => {
    const hidden = hm.querySelectorAll("tr.hidden-row");
    if (hidden.length) { hidden.forEach((r) => r.classList.remove("hidden-row")); moreBtn.textContent = "접기 ▴"; }
    else {
      hm.querySelectorAll("tbody tr").forEach((r, i) => { if (i >= 15) r.classList.add("hidden-row"); });
      moreBtn.textContent = "부처 전체 보기 ▾";
    }
  });

  /* ⑤ 테이블 */
  const tbody = document.getElementById("tbody");
  const q = document.getElementById("q");
  const fM = document.getElementById("fMinistry");
  const fC = document.getElementById("fCycle");
  const fA = document.getElementById("fAlign");
  const hit = document.getElementById("hitCount");
  const tMore = document.getElementById("tableMore");
  Object.keys(M.ministryCount).forEach((m) => {
    const o = document.createElement("option");
    o.value = m; o.textContent = `${m} (${M.ministryCount[m]})`;
    fM.appendChild(o);
  });
  let shown = 60;
  function alignBadge(v) {
    if (v === 1) return '<span class="badge ok">일치</span>';
    if (v === 0) return '<span class="badge no">불일치</span>';
    return '<span class="badge unk">미확인</span>';
  }
  function filtered() {
    const kw = q.value.trim().toLowerCase();
    return D.plans.filter((p) => {
      if (fM.value && p.ministry !== fM.value) return false;
      if (fC.value === "none") { if (p.cycle) return false; }
      else if (fC.value && p.cycle !== Number(fC.value)) return false;
      if (fA.value === "1" && p.termAligned !== 1) return false;
      if (fA.value === "0" && p.termAligned !== 0) return false;
      if (fA.value === "u" && p.termAligned !== null) return false;
      if (kw && !(p.name + p.law + p.ministry + p.dept).toLowerCase().includes(kw)) return false;
      return true;
    });
  }
  function render() {
    const rows2 = filtered();
    hit.textContent = `${rows2.length}건`;
    tbody.innerHTML = rows2.slice(0, shown).map((p) => `
      <tr>
        <td class="num">${p.no}</td>
        <td class="name">${p.name}</td>
        <td>${p.ministry}</td>
        <td class="law">${p.law}</td>
        <td class="num">${p.cycle ? p.cycle + "년" : "—"}</td>
        <td class="num">${p.year || "—"}</td>
        <td class="num">${p.proj[0] || "—"}</td>
        <td>${alignBadge(p.termAligned)}</td>
      </tr>`).join("");
    tMore.style.display = rows2.length > shown ? "block" : "none";
  }
  [q, fM, fC, fA].forEach((el) => el.addEventListener("input", () => { shown = 60; render(); }));
  tMore.addEventListener("click", () => { shown += 120; render(); });
  render();
})();

/* ② 신설 추이 */
(function () {
  const M = window.PLAN_DATA.meta;
  const gc = document.getElementById("growthChart");
  if (!gc) return;
  const dist = M.lawYearDist;
  const y0 = 1961, y1 = 2026;
  let gmax = 0;
  for (let y = y0; y <= y1; y++) gmax = Math.max(gmax, dist[y] || 0);
  const frag = document.createDocumentFragment();
  const bars = [];
  for (let y = y0; y <= y1; y++) {
    const n = dist[y] || 0;
    const el = document.createElement("div");
    el.className = "gbar" + (y % 10 === 0 ? " decade" : "");
    el.innerHTML = `<span class="gtip">${y}년 · ${n}건</span>`;
    el.style.height = "0px";
    frag.appendChild(el);
    bars.push([el, n]);
  }
  gc.appendChild(frag);
  const axis = document.createElement("div");
  axis.className = "growth-axis";
  axis.innerHTML = "<span>1961</span><span>1970</span><span>1980</span><span>1990</span><span>2000</span><span>2010</span><span>2020</span><span>2026</span>";
  gc.after(axis);
  const ioG = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return; ioG.unobserve(e.target);
      bars.forEach(([el, n]) => { el.style.height = (n / gmax * 190) + "px"; });
    });
  }, { threshold: 0.3 });
  ioG.observe(gc);
})();

/* ④ 절차·환류 */
(function () {
  const M = window.PLAN_DATA.meta;
  const pc = document.getElementById("procChart");
  if (!pc) return;
  const TOTAL = M.total;
  const PROC = [
    ["관계 중앙기관 협의", M.procCounts.consult],
    ["위원회 심의", M.procCounts.committee],
    ["지자체 협의·자료제출", M.procCounts.local],
    ["공청회 등 의견수렴", M.procCounts.hearing],
    ["국무회의 심의", M.procCounts.cabinet],
  ];
  const FOLLOW = [
    ["시행계획 수립", M.followup.implPlan],
    ["변경 근거 규정", M.followup.changeProvision],
    ["시행계획 실적 평가", M.followup.implEval],
    ["국회 보고", M.followup.assemblyReport],
  ];
  function fill(el, rows, hotIdx) {
    rows.forEach(([label, n], i) => {
      const r = document.createElement("div");
      r.className = "krow";
      r.innerHTML = `<span class="kl" title="${label}">${label}</span><div class="kbarwrap"><div class="kbar" style="${i === hotIdx ? "background:var(--signal)" : ""}"></div></div><span class="kv">${n}</span>`;
      el.appendChild(r);
    });
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        el.querySelectorAll(".krow").forEach((row, i) => {
          row.querySelector(".kbar").style.width = (rows[i][1] / TOTAL * 100) + "%";
        });
      });
    }, { threshold: 0.3 });
    io.observe(el);
  }
  fill(pc, PROC, 4);
  fill(document.getElementById("followChart"), FOLLOW, 2);
})();
