/* ══════════════════════════════════════════════════════
   CONTROL DE QUÓRUM — MULTIFAMILIARES LA POSADA
   quorum.js  |  100% local, localStorage
   ══════════════════════════════════════════════════════ */

/* ── Persistencia ── */
const LS_KEY = "quorum_asamblea_posada";

function loadAttendance() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveAttendance(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/* ── Estado ── */
let attendance = loadAttendance();

let state = {
  searchQuery:    "",
  suggestions:    [],
  selectedApt:    null,
  representative: "",
  listFilter:     "todos",
  listSearch:     "",
  activeTab:      "registro",
};

/* ══════════════════════════════════════════════════════
   TOASTS
   ══════════════════════════════════════════════════════ */
const toastWrap = document.createElement("div");
toastWrap.className = "toast-wrap";
document.body.appendChild(toastWrap);

function toast(msg, type = "success", duration = 3000) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${{success:"✅",danger:"❌",warning:"⚠️"}[type]||"ℹ️"}</span> ${msg}`;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("hiding");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════
   UTILIDADES
   ══════════════════════════════════════════════════════ */
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  } catch { return iso; }
}
function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"})
      + " " + d.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  } catch { return iso; }
}
function getStats() {
  const total        = APARTMENTS.length;
  const present      = Object.keys(attendance).length;
  const absent       = total - present;
  const pctApt       = total ? ((present/total)*100).toFixed(1) : 0;
  const presentCoeff = APARTMENTS
    .filter(a => attendance[a.code])
    .reduce((s,a) => s + a.coefficient, 0);
  const pctCoeff = TOTAL_COEFF ? ((presentCoeff/TOTAL_COEFF)*100).toFixed(2) : 0;
  const quorum   = parseFloat(pctCoeff) >= QUORUM_MIN_PCT;
  return { total, present, absent, pctApt, presentCoeff, pctCoeff, quorum };
}

/* ══════════════════════════════════════════════════════
   RENDER COMPLETO — solo al cambiar de tab o acción real
   ══════════════════════════════════════════════════════ */
function render() {
  document.getElementById("app").innerHTML = `
    ${renderHeader()}
    <div class="container">
      ${renderQuorumBanner()}
      ${renderStats()}
      <div class="tabs">
        ${["registro","lista","resumen"].map(t => `
          <div class="tab ${state.activeTab===t?"active":""}" onclick="setTab('${t}')">
            ${{registro:"📋 Registro",lista:"🏠 Lista Completa",resumen:"📊 Resumen"}[t]}
          </div>`).join("")}
      </div>
      ${ state.activeTab==="registro" ? renderRegistro()
       : state.activeTab==="lista"    ? renderLista()
       : renderResumen() }
    </div>`;
}

/* ── Actualización parcial del banner y stats sin tocar inputs ── */
function refreshStats() {
  setHTML("quorumBanner", renderQuorumBannerInner());
  setHTML("statsArea",    renderStatsInner());
}

/* ══════════════════════════════════════════════════════
   HEADER
   ══════════════════════════════════════════════════════ */
function renderHeader() {
  return `
  <div class="header">
    <div>
      <h1>🏢 Control de Quórum — Multifamiliares La Posada</h1>
      <p>Registro de asistencia a asamblea</p>
    </div>
    <div class="header-right">
      <span class="live-clock" id="liveClock">--:--:--</span>
      <button class="btn btn-sm"
        style="background:rgba(255,255,255,0.15);color:white"
        onclick="exportCSV()">📥 Exportar</button>
      <button class="btn btn-sm"
        style="background:rgba(220,38,38,0.25);color:white"
        onclick="confirmReset()">🗑️ Reset</button>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   QUÓRUM BANNER
   ══════════════════════════════════════════════════════ */
function renderQuorumBannerInner() {
  const s = getStats();
  return `
  <div class="quorum-banner ${s.quorum?"si":"no"}" id="quorumBanner">
    <div>
      <div class="qtext">
        ${s.quorum ? "✅ QUÓRUM ALCANZADO" : "⏳ SIN QUÓRUM AÚN"}
      </div>
      <div class="qsub">
        Se requiere ≥ ${QUORUM_MIN_PCT}% del coeficiente total
        — actualmente: <strong>${s.pctCoeff}%</strong>
        (${s.presentCoeff.toFixed(2)} de ${TOTAL_COEFF.toFixed(2)})
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:2rem;font-weight:800;line-height:1">${s.pctCoeff}%</div>
      <div style="font-size:0.8rem;opacity:0.75">del coeficiente</div>
    </div>
  </div>`;
}
function renderQuorumBanner() {
  return `<div id="quorumBanner">${renderQuorumBannerInner()}</div>`;
}

/* ══════════════════════════════════════════════════════
   STATS
   ══════════════════════════════════════════════════════ */
function renderStatsInner() {
  const s = getStats();
  return `
  <div class="stats-grid">
    <div class="stat-card">
      <div><div class="val">${s.total}</div><div class="lbl">Total Apts.</div></div>
      <div class="ico">🏠</div>
    </div>
    <div class="stat-card green">
      <div><div class="val">${s.present}</div><div class="lbl">Presentes</div></div>
      <div class="ico">✅</div>
    </div>
    <div class="stat-card orange">
      <div><div class="val">${s.absent}</div><div class="lbl">Ausentes</div></div>
      <div class="ico">⏳</div>
    </div>
    <div class="stat-card purple">
      <div><div class="val">${s.pctApt}%</div><div class="lbl">% Aptos.</div></div>
      <div class="ico">📊</div>
    </div>
    <div class="stat-card ${s.quorum?"green":"red"}">
      <div><div class="val">${s.pctCoeff}%</div><div class="lbl">% Coeficiente</div></div>
      <div class="ico">${s.quorum?"🎉":"📈"}</div>
    </div>
  </div>
  <div class="card mb-4" style="margin-bottom:20px">
    <div class="card-body" style="padding:16px 20px">
      <div class="flex justify-between" style="margin-bottom:6px">
        <span class="font-bold text-sm">Progreso de quórum</span>
        <span class="text-sm text-gray">${s.present} / ${s.total} apartamentos</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar ${s.quorum?"green":""}"
          style="width:${Math.min(s.pctCoeff,100)}%"></div>
      </div>
      <div class="progress-lbl">
        Falta: ${Math.max(0,(QUORUM_MIN_PCT - parseFloat(s.pctCoeff)).toFixed(2))}%
        del coeficiente para alcanzar quórum
      </div>
    </div>
  </div>`;
}
function renderStats() {
  return `<div id="statsArea">${renderStatsInner()}</div>`;
}

/* ══════════════════════════════════════════════════════
   TAB: REGISTRO
   ══════════════════════════════════════════════════════ */
function renderRegistro() {
  return `
  <div class="main-grid">
    <!-- Izquierda: búsqueda -->
    <div>
      <div class="card">
        <div class="card-header"><h2>📋 Registrar Asistencia</h2></div>
        <div class="card-body">

          <!-- Input de búsqueda — SIN oninput que llame render() -->
          <div class="search-box">
            <span class="ico">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Buscar apartamento o propietario..."
              value="${esc(state.searchQuery)}"
              autocomplete="off"
            />
          </div>

          <!-- Zona de sugerencias: actualización parcial -->
          <div id="suggestionsWrap">${renderSuggestions()}</div>

          <!-- Zona de confirmación: actualización parcial -->
          <div id="confirmWrap">${renderConfirmArea()}</div>

          <hr class="divider"/>

          <!-- Últimos registros: actualización parcial -->
          <div id="recentWrap">${renderRecent()}</div>
        </div>
      </div>
    </div>

    <!-- Derecha: tabla de presentes -->
    <div>
      <div class="card">
        <div class="card-header">
          <h2>✅ Presentes (<span id="presentCount">${Object.keys(attendance).length}</span>)</h2>
          <span class="tag" id="presentCoeffTag">${getStats().pctCoeff}% coeficiente</span>
        </div>
        <div class="card-body" style="padding:0">
          <div id="presentTableWrap">${renderPresentTable()}</div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── Sugerencias (parcial) ── */
function renderSuggestions() {
  if (state.suggestions.length === 0) return "";
  return `
  <div class="suggestions" id="suggestionsBox">
    ${state.suggestions.map(a => {
      const ya = !!attendance[a.code];
      return `
      <div class="suggestion-item ${ya?"ya-registrado":""}"
        onclick="${ya
          ? "toast('Este apartamento ya está registrado.','warning')"
          : `selectApt('${a.code}')`}">
        <div class="apt-code">
          ${a.code}
          ${ya ? `<span class="badge badge-success" style="margin-left:6px">✅ Presente</span>` : ""}
        </div>
        <div class="apt-name">${esc(a.owner)}</div>
        <div class="apt-coeff">Coeficiente: ${a.coefficient}%</div>
      </div>`;
    }).join("")}
  </div>`;
}

/* ── Área de confirmación (parcial) ── */
function renderConfirmArea() {
  const apt = state.selectedApt;
  if (!apt) return `
    <div style="text-align:center;padding:24px 0;color:var(--gray-400)">
      <div style="font-size:2.5rem;margin-bottom:8px">🔍</div>
      <div class="text-sm">Busque un apartamento para registrar su asistencia</div>
    </div>`;
  return `
  <div class="confirm-card">
    <div class="apt">🏠 ${apt.code}</div>
    <div class="name">${esc(apt.owner)}</div>
    <div class="coeff">Coeficiente: ${apt.coefficient}%</div>
  </div>
  <div style="margin-bottom:12px">
    <label style="display:block;font-weight:600;font-size:0.875rem;
                  margin-bottom:6px;color:var(--gray-700)">
      Representante / Delegado
      <span style="font-weight:400;color:var(--gray-500)">(opcional)</span>
    </label>
    <input type="text" id="repInput"
      style="width:100%;padding:9px 12px;border:2px solid var(--gray-200);
             border-radius:8px;font-size:0.95rem;box-sizing:border-box"
      placeholder="Nombre de quien asiste..."
      value="${esc(state.representative)}"
      onkeydown="if(event.key==='Enter')registerAttendance()"
    />
  </div>
  <div class="flex gap-2">
    <button class="btn btn-success btn-lg" style="flex:1" onclick="registerAttendance()">
      ✅ Confirmar Asistencia
    </button>
    <button class="btn btn-gray" onclick="clearSelection()">✕</button>
  </div>`;
}

/* ── Últimos registros (parcial) ── */
function renderRecent() {
  const recent = APARTMENTS
    .filter(a => attendance[a.code])
    .sort((a,b) => new Date(attendance[b.code].registeredAt) - new Date(attendance[a.code].registeredAt))
    .slice(0, 6);

  return `
  <div class="font-bold text-sm" style="margin-bottom:10px">🕐 Últimos registros</div>
  ${recent.length === 0
    ? `<div class="text-center text-gray text-sm" style="padding:12px">Sin registros aún.</div>`
    : recent.map(a => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:8px 0;border-bottom:1px solid var(--gray-100)">
        <div>
          <span class="font-bold text-sm">${a.code}</span>
          <span class="text-xs text-gray" style="margin-left:6px">
            ${esc(a.owner.split(" ").slice(0,2).join(" "))}
          </span>
          ${attendance[a.code].representative
            ? `<span class="text-xs text-gray"> · ${esc(attendance[a.code].representative)}</span>`
            : ""}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray">${formatTime(attendance[a.code].registeredAt)}</span>
          <button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:0.72rem"
            onclick="removeAttendance('${a.code}')">✕</button>
        </div>
      </div>`).join("")}`;
}

/* ── Tabla de presentes (parcial) ── */
function renderPresentTable() {
  const rows = APARTMENTS
    .filter(a => attendance[a.code])
    .sort((a,b) => new Date(attendance[b.code].registeredAt) - new Date(attendance[a.code].registeredAt));

  if (rows.length === 0) return `
    <div class="table-wrap">
      <table><tbody>
        <tr><td colspan="6" class="text-center text-gray" style="padding:30px">
          Ningún apartamento registrado aún.
        </td></tr>
      </tbody></table>
    </div>`;

  return `
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Apartamento</th><th>Propietario</th><th>Representante</th>
          <th>Coef.</th><th>Hora</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(a => `
          <tr>
            <td><span class="font-mono font-bold">${a.code}</span></td>
            <td class="text-sm">${esc(a.owner)}</td>
            <td class="text-sm text-gray">
              ${attendance[a.code].representative
                ? esc(attendance[a.code].representative)
                : `<span style="color:var(--gray-300)">—</span>`}
            </td>
            <td><span class="tag">${a.coefficient}</span></td>
            <td class="text-xs text-gray">${formatTime(attendance[a.code].registeredAt)}</td>
            <td>
              <button class="btn btn-sm btn-danger" style="padding:3px 8px"
                onclick="removeAttendance('${a.code}')">✕</button>
            </td>
          </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   TAB: LISTA COMPLETA
   ══════════════════════════════════════════════════════ */
function renderLista() {
  return `
  <div class="card">
    <div class="card-header">
      <h2>🏠 Lista Completa</h2>
      <button class="btn btn-success btn-sm" onclick="exportCSV()">📥 CSV</button>
    </div>
    <div class="card-body">
      <div class="filter-wrap mb-3">
        ${["todos","presentes","ausentes"].map(f => `
          <button class="filter-btn ${state.listFilter===f?"active":""}"
            onclick="setListFilter('${f}')">
            ${{todos:"Todos",presentes:"✅ Presentes",ausentes:"⏳ Ausentes"}[f]}
          </button>`).join("")}
      </div>

      <!-- Input de búsqueda SIN render() en oninput -->
      <div class="search-box" style="margin-bottom:12px">
        <span class="ico">🔍</span>
        <input type="text" id="listSearchInput"
          placeholder="Buscar en la lista..."
          value="${esc(state.listSearch)}"/>
      </div>

      <!-- Tabla en contenedor propio para actualización parcial -->
      <div id="listaTableWrap">${renderListaTable()}</div>
    </div>
  </div>`;
}

function renderListaTable() {
  const f = state.listSearch.toLowerCase().trim();
  const filtered = APARTMENTS.filter(a => {
    if (state.listFilter === "presentes" && !attendance[a.code]) return false;
    if (state.listFilter === "ausentes"  &&  attendance[a.code]) return false;
    if (f) return a.code.toLowerCase().includes(f) || a.owner.toLowerCase().includes(f);
    return true;
  });

  return `
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th><th>Apartamento</th><th>Propietario</th><th>Coeficiente</th>
          <th>Estado</th><th>Hora Registro</th><th>Representante</th><th>Acción</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((a,i) => {
          const rec = attendance[a.code];
          return `
          <tr>
            <td class="text-gray text-xs">${i+1}</td>
            <td><span class="font-mono font-bold">${a.code}</span></td>
            <td class="text-sm">${esc(a.owner)}</td>
            <td><span class="tag">${a.coefficient}%</span></td>
            <td>${rec
              ? `<span class="badge badge-success">✅ Presente</span>`
              : `<span class="badge badge-gray">⏳ Ausente</span>`}</td>
            <td class="text-xs text-gray">${rec ? formatTime(rec.registeredAt) : "—"}</td>
            <td class="text-xs text-gray">${rec?.representative ? esc(rec.representative) : "—"}</td>
            <td>${rec
              ? `<button class="btn btn-sm btn-danger"
                   onclick="removeAttendance('${a.code}')">✕ Quitar</button>`
              : `<button class="btn btn-sm btn-success"
                   onclick="quickRegister('${a.code}')">+ Registrar</button>`}
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>
  <div class="text-sm text-gray" style="margin-top:12px">
    Mostrando ${filtered.length} de ${APARTMENTS.length} apartamentos
  </div>`;
}

/* ══════════════════════════════════════════════════════
   TAB: RESUMEN
   ══════════════════════════════════════════════════════ */
function renderResumen() {
  const s = getStats();
  const bloques = {};
  APARTMENTS.forEach(a => {
    const bloque = a.code.split("-")[0];
    if (!bloques[bloque]) bloques[bloque] = {total:0,present:0,coeff:0,coeffTotal:0};
    bloques[bloque].total++;
    bloques[bloque].coeffTotal += a.coefficient;
    if (attendance[a.code]) {
      bloques[bloque].present++;
      bloques[bloque].coeff += a.coefficient;
    }
  });

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    <div class="card">
      <div class="card-header"><h2>📊 Resumen General</h2></div>
      <div class="card-body">
        <table>
          <tbody>
            <tr><td class="font-bold">Total apartamentos</td>
                <td style="text-align:right;font-weight:700">${s.total}</td></tr>
            <tr><td style="color:var(--success)">✅ Presentes</td>
                <td style="text-align:right;font-weight:700">${s.present}</td></tr>
            <tr><td style="color:var(--warning)">⏳ Ausentes</td>
                <td style="text-align:right;font-weight:700">${s.absent}</td></tr>
            <tr><td>% por apartamentos</td>
                <td style="text-align:right;font-weight:700">${s.pctApt}%</td></tr>
            <tr style="border-top:2px solid var(--gray-200)">
              <td class="font-bold">Coeficiente total</td>
              <td style="text-align:right;font-weight:700">${TOTAL_COEFF.toFixed(2)}</td></tr>
            <tr><td style="color:var(--success)">Coeficiente presente</td>
                <td style="text-align:right;font-weight:700">${s.presentCoeff.toFixed(2)}</td></tr>
            <tr><td class="font-bold">% Coeficiente</td>
                <td style="text-align:right;font-weight:800;font-size:1.1rem;
                           color:${s.quorum?"var(--success)":"var(--danger)"}">
                  ${s.pctCoeff}%</td></tr>
            <tr style="border-top:2px solid var(--gray-200)">
              <td class="font-bold">¿Quórum?</td>
              <td style="text-align:right">
                ${s.quorum
                  ? `<span class="badge badge-success">✅ SÍ</span>`
                  : `<span class="badge badge-danger">❌ NO</span>`}
              </td>
            </tr>
            <tr><td>Falta para quórum</td>
                <td style="text-align:right;font-weight:700">
                  ${s.quorum ? "—"
                    : (QUORUM_MIN_PCT - parseFloat(s.pctCoeff)).toFixed(2) + "%"}
                </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>🏗️ Por Bloque</h2></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Bloque</th><th>Aptos.</th><th>Presentes</th><th>%</th><th>Coef.</th></tr>
            </thead>
            <tbody>
              ${Object.entries(bloques)
                .sort((a,b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([bloque,d]) => `
                <tr>
                  <td><span class="font-mono font-bold">Bloque ${bloque}</span></td>
                  <td>${d.total}</td>
                  <td style="color:${d.present===d.total?"var(--success)":"var(--gray-800)"}">
                    ${d.present}/${d.total}
                  </td>
                  <td><span class="tag">
                    ${d.total ? ((d.present/d.total)*100).toFixed(0) : 0}%
                  </span></td>
                  <td>${d.coeff.toFixed(2)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>🕐 Historial de Registros (orden de llegada)</h2>
      <button class="btn btn-success btn-sm" onclick="exportCSV()">📥 Exportar CSV</button>
    </div>
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Apartamento</th><th>Propietario</th>
                <th>Representante</th><th>Coeficiente</th><th>Fecha y Hora</th></tr>
          </thead>
          <tbody>
            ${(() => {
              const rows = APARTMENTS
                .filter(a => attendance[a.code])
                .sort((a,b) =>
                  new Date(attendance[a.code].registeredAt) -
                  new Date(attendance[b.code].registeredAt));
              if (!rows.length) return `
                <tr><td colspan="6" class="text-center text-gray" style="padding:24px">
                  Sin registros aún.
                </td></tr>`;
              return rows.map((a,i) => `
                <tr>
                  <td class="text-gray text-xs">${i+1}</td>
                  <td><span class="font-mono font-bold">${a.code}</span></td>
                  <td class="text-sm">${esc(a.owner)}</td>
                  <td class="text-sm text-gray">
                    ${attendance[a.code].representative
                      ? esc(attendance[a.code].representative) : "—"}
                  </td>
                  <td><span class="tag">${a.coefficient}</span></td>
                  <td class="text-sm">${formatDateTime(attendance[a.code].registeredAt)}</td>
                </tr>`).join("");
            })()}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   ACCIONES DE BÚSQUEDA — actualización PARCIAL
   ══════════════════════════════════════════════════════ */

/* Búsqueda principal (tab registro) — NO llama render() */
function onSearchMain(value) {
  state.searchQuery = value;
  const q = value.toLowerCase().trim();
  if (q.length < 1) {
    state.suggestions = [];
  } else {
    state.suggestions = APARTMENTS.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.owner.toLowerCase().includes(q)
    ).slice(0, 8);
  }
  // Solo actualiza la caja de sugerencias
  setHTML("suggestionsWrap", renderSuggestions());
}

/* Búsqueda en lista completa — NO llama render() */
function onListSearchInput(value) {
  state.listSearch = value;
  setHTML("listaTableWrap", renderListaTable());
}

/* ══════════════════════════════════════════════════════
   ACCIONES DE REGISTRO
   ══════════════════════════════════════════════════════ */
function selectApt(code) {
  const apt = APARTMENTS.find(a => a.code === code);
  if (!apt) return;
  if (attendance[code]) { toast("Este apartamento ya está registrado.", "warning"); return; }
  state.selectedApt    = apt;
  state.suggestions    = [];
  state.searchQuery    = `${apt.code} — ${apt.owner}`;
  state.representative = "";

  // Actualizar input de búsqueda
  const si = document.getElementById("searchInput");
  if (si) si.value = state.searchQuery;

  // Actualizar parcialmente sugerencias y área de confirmación
  setHTML("suggestionsWrap", renderSuggestions());
  setHTML("confirmWrap", renderConfirmArea());

  setTimeout(() => document.getElementById("repInput")?.focus(), 30);
}

function clearSelection() {
  state.selectedApt    = null;
  state.suggestions    = [];
  state.searchQuery    = "";
  state.representative = "";

  const si = document.getElementById("searchInput");
  if (si) { si.value = ""; si.focus(); }

  setHTML("suggestionsWrap", renderSuggestions());
  setHTML("confirmWrap",     renderConfirmArea());
}

function registerAttendance() {
  const apt = state.selectedApt;
  if (!apt) return;
  if (attendance[apt.code]) { toast("Ya está registrado.", "warning"); return; }

  // Leer representante del input en vivo
  const repEl = document.getElementById("repInput");
  const rep   = repEl ? repEl.value.trim() : state.representative;

  attendance[apt.code] = {
    registeredAt:   new Date().toISOString(),
    representative: rep,
  };
  saveAttendance(attendance);
  toast(`${apt.code} — ${apt.owner.split(" ").slice(0,2).join(" ")} registrado`, "success");

  // Resetear estado
  state.selectedApt    = null;
  state.searchQuery    = "";
  state.suggestions    = [];
  state.representative = "";

  // Limpiar input
  const si = document.getElementById("searchInput");
  if (si) { si.value = ""; }

  // Actualizar todas las zonas parciales
  setHTML("suggestionsWrap",  renderSuggestions());
  setHTML("confirmWrap",      renderConfirmArea());
  setHTML("recentWrap",       renderRecent());
  setHTML("presentTableWrap", renderPresentTable());
  refreshStats();

  // Actualizar contador del header de la tabla
  setHTML("presentCount", Object.keys(attendance).length);
  setHTML("presentCoeffTag", `${getStats().pctCoeff}% coeficiente`);

  setTimeout(() => document.getElementById("searchInput")?.focus(), 30);
}

function quickRegister(code) {
  const apt = APARTMENTS.find(a => a.code === code);
  if (!apt || attendance[code]) return;
  attendance[code] = { registeredAt: new Date().toISOString(), representative: "" };
  saveAttendance(attendance);
  toast(`${apt.code} registrado`, "success");
  // Re-render completo porque estamos en lista
  render();
  setTimeout(() => {
    const el = document.getElementById("listSearchInput");
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 30);
}

function removeAttendance(code) {
  const apt = APARTMENTS.find(a => a.code === code);
  if (!apt) return;
  if (!confirm(`¿Quitar la asistencia de:\n${apt.code} — ${apt.owner}?`)) return;
  delete attendance[code];
  saveAttendance(attendance);
  toast(`${apt.code} removido`, "warning");

  if (state.activeTab === "registro") {
    // Actualización parcial
    setHTML("recentWrap",       renderRecent());
    setHTML("presentTableWrap", renderPresentTable());
    setHTML("presentCount",     Object.keys(attendance).length);
    setHTML("presentCoeffTag",  `${getStats().pctCoeff}% coeficiente`);
    refreshStats();
  } else {
    render();
  }
}

function confirmReset() {
  if (!confirm("⚠️ ¿Resetear TODOS los registros?\nEsta acción no se puede deshacer.")) return;
  attendance = {};
  saveAttendance(attendance);
  toast("Registros limpiados", "warning");
  render();
}

function setTab(tab) {
  state.activeTab  = tab;
  state.listSearch = "";
  render();
}

function setListFilter(f) {
  state.listFilter = f;
  // Solo actualizar la tabla, no el input de búsqueda
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
  setHTML("listaTableWrap", renderListaTable());
}

/* ══════════════════════════════════════════════════════
   EXPORTAR CSV
   ══════════════════════════════════════════════════════ */
function exportCSV() {
  const s  = getStats();
  let csv  = `REGISTRO DE ASISTENCIA — MULTIFAMILIARES LA POSADA\n`;
  csv     += `Fecha:,${new Date().toLocaleDateString("es-CO")}\n`;
  csv     += `Presentes:,${s.present},de,${s.total}\n`;
  csv     += `Coeficiente presente:,${s.presentCoeff.toFixed(2)},de,${TOTAL_COEFF.toFixed(2)}\n`;
  csv     += `% Coeficiente:,${s.pctCoeff}%\n`;
  csv     += `Quórum:,${s.quorum?"SÍ":"NO"}\n\n`;
  csv     += `#,Apartamento,Propietario,Representante,Coeficiente,Estado,Hora Registro\n`;
  APARTMENTS
    .sort((a,b) => a.code.localeCompare(b.code))
    .forEach((a,i) => {
      const rec = attendance[a.code];
      csv += `${i+1},"${a.code}","${a.owner}","${rec?.representative||""}",` +
             `"${a.coefficient}","${rec?"Presente":"Ausente"}","${rec?formatDateTime(rec.registeredAt):""}"\n`;
    });
  const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `quorum_posada_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast("CSV exportado correctamente", "success");
}

/* ══════════════════════════════════════════════════════
   EVENTOS GLOBALES — delegación desde el documento
   ══════════════════════════════════════════════════════ */
document.addEventListener("input", e => {
  // Búsqueda principal (registro)
  if (e.target.id === "searchInput") {
    onSearchMain(e.target.value);
  }
  // Búsqueda en lista completa
  if (e.target.id === "listSearchInput") {
    onListSearchInput(e.target.value);
  }
  // Representante
  if (e.target.id === "repInput") {
    state.representative = e.target.value;
  }
});

document.addEventListener("keydown", e => {
  if (e.target.id === "searchInput" && e.key === "Enter") {
    // Si hay una sola sugerencia no registrada, seleccionarla
    const disponibles = state.suggestions.filter(a => !attendance[a.code]);
    if (disponibles.length === 1) selectApt(disponibles[0].code);
  }
  if (e.target.id === "repInput" && e.key === "Enter") {
    registerAttendance();
  }
});

// Cerrar sugerencias al clicar fuera
document.addEventListener("click", e => {
  if (!e.target.closest("#suggestionsWrap") &&
      e.target.id !== "searchInput") {
    if (state.suggestions.length > 0) {
      state.suggestions = [];
      setHTML("suggestionsWrap", "");
    }
  }
});

/* ══════════════════════════════════════════════════════
   RELOJ EN VIVO
   ══════════════════════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById("liveClock");
  if (el) el.textContent = new Date().toLocaleTimeString("es-CO",{
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  });
}
setInterval(updateClock, 1000);

/* ══════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════ */
render();
updateClock();
